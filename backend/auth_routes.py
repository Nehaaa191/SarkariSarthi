import os
import random
import time
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app

logger = logging.getLogger("sarkari-saathi-auth")

# ---------------------------------------------------------
# Supabase client (lazy init so missing vars don't crash startup)
# ---------------------------------------------------------
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is not None:
        return _supabase
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_ANON_KEY", "").strip()
        if url and key:
            _supabase = create_client(url, key)
            logger.info("Supabase client initialised.")
        else:
            logger.warning("SUPABASE_URL or SUPABASE_ANON_KEY not set – Supabase disabled.")
    except Exception as e:
        logger.warning(f"Supabase init failed: {e}")
    return _supabase


# ---------------------------------------------------------
# JWT helpers (stateless tokens, no DB required)
# ---------------------------------------------------------
def _create_token(user_id: str) -> str:
    try:
        import jwt
        secret = os.getenv("JWT_SECRET", "sarkari-saathi-secret-key-change-in-prod")
        payload = {
            "sub": str(user_id),
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        }
        return jwt.encode(payload, secret, algorithm="HS256")
    except Exception as e:
        logger.error(f"Token creation error: {e}")
        return ""


def _verify_token(token: str):
    try:
        import jwt
        secret = os.getenv("JWT_SECRET", "sarkari-saathi-secret-key-change-in-prod")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None


# ---------------------------------------------------------
# In-memory OTP store (dev/fallback – expires after 5 min)
# ---------------------------------------------------------
_otp_store: dict = {}


def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def _store_otp(identifier: str, otp: str):
    _otp_store[identifier] = {"code": otp, "expires": time.time() + 300}


def _verify_otp(identifier: str, code: str) -> bool:
    data = _otp_store.get(identifier)
    if not data:
        return False
    if time.time() > data["expires"]:
        _otp_store.pop(identifier, None)
        return False
    if data["code"] != code:
        return False
    _otp_store.pop(identifier, None)
    return True


# ---------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------
api = Blueprint("auth", __name__)


# ---------------------------------------------------------
# /auth/send-otp
# ---------------------------------------------------------
@api.post("/auth/send-otp")
def send_otp():
    data = request.get_json(silent=True) or {}
    identifier = data.get("identifier", "").strip()
    if not identifier:
        return jsonify({"error": "identifier required"}), 400

    # Try Supabase OTP first
    supabase = get_supabase()
    if supabase:
        try:
            if "@" in identifier:
                supabase.auth.sign_in_with_otp({"email": identifier})
            else:
                supabase.auth.sign_in_with_otp({"phone": identifier})
            logger.info(f"Supabase OTP sent to {identifier}")
            return jsonify({"success": True, "message": "OTP sent via Supabase"}), 200
        except Exception as e:
            logger.info(f"Supabase OTP send failed ({e}); falling back to dev OTP")

    # Dev fallback – generate a 6-digit code and return it
    otp = _generate_otp()
    _store_otp(identifier, otp)
    logger.info(f"Dev OTP generated for {identifier}")
    return jsonify({"success": True, "message": "OTP sent", "devOtp": otp}), 200


# ---------------------------------------------------------
# /auth/verify-otp
# ---------------------------------------------------------
@api.post("/auth/verify-otp")
def verify_otp():
    data = request.get_json(silent=True) or {}
    identifier = data.get("identifier", "").strip()
    otp = data.get("otp", "").strip()
    if not identifier or not otp:
        return jsonify({"error": "identifier and otp required"}), 400

    # Try Supabase verification first
    supabase = get_supabase()
    if supabase:
        try:
            payload = {
                "type": "email" if "@" in identifier else "sms",
                "token": otp,
            }
            if "@" in identifier:
                payload["email"] = identifier
            else:
                payload["phone"] = identifier
            res = supabase.auth.verify_otp(payload)
            if res and res.user:
                user = res.user
                token = _create_token(user.id)
                return jsonify({
                    "accessToken": token,
                    "user": {
                        "id": str(user.id),
                        "email": getattr(user, "email", identifier),
                        "name": (user.user_metadata or {}).get("full_name", ""),
                    }
                }), 200
        except Exception as e:
            logger.info(f"Supabase OTP verify failed ({e}); falling back to dev store")

    # Dev fallback
    if not _verify_otp(identifier, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 401

    fake_id = str(abs(hash(identifier)))[:16]
    token = _create_token(fake_id)
    return jsonify({
        "accessToken": token,
        "user": {"id": fake_id, "email": identifier, "name": ""},
    }), 200


# ---------------------------------------------------------
# /auth/google
# ---------------------------------------------------------
@api.post("/auth/google")
def google_auth():
    """Exchange a Supabase Google OAuth token for an app JWT."""
    data = request.get_json(silent=True) or {}
    access_token = data.get("access_token", "").strip()
    refresh_token = data.get("refresh_token", "").strip()

    supabase = get_supabase()
    if not supabase:
        return jsonify({"error": "Auth service unavailable"}), 503

    try:
        if access_token and refresh_token:
            res = supabase.auth.set_session(access_token, refresh_token)
        else:
            return jsonify({"error": "access_token and refresh_token required"}), 400

        if res and res.user:
            user = res.user
            token = _create_token(user.id)
            return jsonify({
                "accessToken": token,
                "user": {
                    "id": str(user.id),
                    "email": getattr(user, "email", ""),
                    "name": (user.user_metadata or {}).get("full_name", ""),
                }
            }), 200
        return jsonify({"error": "Could not authenticate with Google"}), 401
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        return jsonify({"error": "Google authentication failed"}), 401


# ---------------------------------------------------------
# /auth/refresh
# ---------------------------------------------------------
@api.post("/auth/refresh")
def refresh():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    token = auth.split(" ", 1)[1]
    uid = _verify_token(token)
    if not uid:
        return jsonify({"error": "Invalid or expired token"}), 401
    new_token = _create_token(uid)
    return jsonify({"accessToken": new_token}), 200


# ---------------------------------------------------------
# /auth/logout
# ---------------------------------------------------------
@api.post("/auth/logout")
def logout():
    # Stateless JWT – client simply discards the token
    return jsonify({"success": True}), 200
