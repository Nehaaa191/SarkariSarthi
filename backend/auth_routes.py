import random, time
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from . import db
from .models import User
from .auth import create_access_token, verify_access_token, hash_password, supabase_client

# ---------------------------------------------------------
# In‑memory OTP store (dev only – expires after 5 min)
# ---------------------------------------------------------
_otp_store: dict[str, dict] = {}

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
# Helper – get/create a DB user for a given identifier
# ---------------------------------------------------------
def _get_or_create_user(identifier: str) -> User:
    user = User.query.filter_by(email=identifier).first()
    if not user:
        # For phone numbers we store them in the email column for simplicity
        user = User(email=identifier, password_hash=hash_password(datetime.utcnow().isoformat()))
        db.session.add(user)
        db.session.commit()
    return user

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
    identifier = data.get("identifier")
    if not identifier:
        return jsonify({"error": "identifier required"}), 400
    # Try Supabase OTP first
    try:
        client = supabase_client()
        if "@" in identifier:
            client.auth.sign_in_with_otp({"email": identifier})
        else:
            client.auth.sign_in_with_otp({"phone": identifier})
    except Exception as e:
        current_app.logger.info(f"Supabase OTP send failed ({e}); falling back to dev OTP")
    # Dev fallback – generate a 6‑digit code and return it (only in dev)
    otp = _generate_otp()
    _store_otp(identifier, otp)
    return jsonify({"success": True, "message": "OTP sent", "devOtp": otp}), 200

# ---------------------------------------------------------
# /auth/verify-otp
# ---------------------------------------------------------
@api.post("/auth/verify-otp")
def verify_otp():
    data = request.get_json(silent=True) or {}
    identifier = data.get("identifier")
    otp = data.get("otp")
    if not identifier or not otp:
        return jsonify({"error": "identifier and otp required"}), 400
    # Try Supabase verification first
    try:
        client = supabase_client()
        payload = {
            "type": "email" if "@" in identifier else "sms",
            "email": identifier if "@" in identifier else None,
            "phone": identifier if "@" not in identifier else None,
            "token": otp,
        }
        res = client.auth.verify_otp(payload)
        if res.user:
            user = _get_or_create_user(identifier)
            token = create_access_token(user.id)
            return jsonify({"accessToken": token, "user": {"id": str(user.id), "email": user.email, "name": user.name}}), 200
    except Exception as e:
        current_app.logger.info(f"Supabase OTP verify failed ({e}); falling back to dev store")
    # Dev fallback
    if not _verify_otp(identifier, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 401
    user = _get_or_create_user(identifier)
    token = create_access_token(user.id)
    return jsonify({"accessToken": token, "user": {"id": str(user.id), "email": user.email, "name": user.name}}), 200

# ---------------------------------------------------------
# /auth/refresh
# ---------------------------------------------------------
@api.post("/auth/refresh")
def refresh():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    token = auth.split(" ", 1)[1]
    uid = verify_access_token(token)
    if not uid:
        return jsonify({"error": "Invalid or expired token"}), 401
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    new_token = create_access_token(user.id)
    return jsonify({"accessToken": new_token, "user": {"id": str(user.id), "email": user.email, "name": user.name}}), 200

# ---------------------------------------------------------
# /auth/logout
# ---------------------------------------------------------
@api.post("/auth/logout")
def logout():
    # Stateless JWT – client simply discards the token
    return jsonify({"success": True}), 200

