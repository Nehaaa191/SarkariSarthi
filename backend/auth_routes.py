import os
import random
import time
import base64
import hmac
import hashlib
import json
import logging
import re
from typing import Optional, Dict, Any
from flask import Blueprint, request, jsonify
from db import (
    get_user_by_email,
    get_user_by_id,
    create_user,
    verify_user_password,
    store_otp,
    verify_otp as db_verify_otp
)

logger = logging.getLogger("sarkari-saathi-auth")

# ---------------------------------------------------------
# Supabase client (optional integration)
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
            logger.info("Supabase client initialized.")
    except Exception as e:
        logger.warning(f"Supabase init skipped/failed: {e}")
    return _supabase


# ---------------------------------------------------------
# JWT helpers (RFC 7519 HS256, Zero-dependency pure Python)
# ---------------------------------------------------------
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + pad)

def _get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "sarkari-saathi-production-secure-key-2026")

def _create_token(user_id: str, email: str = "") -> str:
    """Generate HS256 JWT with 7-day expiration."""
    secret = _get_jwt_secret()
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + (7 * 24 * 60 * 60) # 7 days
    }
    try:
        h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        msg = f"{h_b64}.{p_b64}".encode("utf-8")
        sig = _b64url_encode(hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).digest())
        return f"{h_b64}.{p_b64}.{sig}"
    except Exception as e:
        logger.error(f"Error creating JWT token: {e}")
        return ""

def _verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify HS256 JWT signature and expiration, return payload dict."""
    if not token:
        return None
    secret = _get_jwt_secret()
    parts = token.strip().split(".")
    if len(parts) != 3:
        return None
    h_b64, p_b64, sig_b64 = parts
    try:
        msg = f"{h_b64}.{p_b64}".encode("utf-8")
        expected_sig = _b64url_encode(hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).digest())
        if not hmac.compare_digest(sig_b64, expected_sig):
            return None
        payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
        if "exp" in payload and payload["exp"] < time.time():
            return None
        return payload
    except Exception:
        return None


def _extract_token_from_header() -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def _format_user_response(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("id", "")),
        "email": user.get("email", ""),
        "name": user.get("name", "") or "",
        "phone": user.get("phone", "") or "",
        "avatar": user.get("avatar", "") or "",
        "authProvider": user.get("auth_provider", "local")
    }


def _is_valid_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email))


# ---------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------
api = Blueprint("auth", __name__)


# ---------------------------------------------------------
# POST /auth/signup  (Password Registration)
# ---------------------------------------------------------
@api.post("/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    name = str(data.get("name", "")).strip()

    if not email:
        return jsonify({"error": "Email is required."}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Please provide a valid email address."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    existing_user = get_user_by_email(email)
    if existing_user:
        return jsonify({"error": "An account with this email already exists. Please sign in instead."}), 409

    try:
        user = create_user(email=email, password=password, name=name, auth_provider="local")
        token = _create_token(user["id"], user["email"])
        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "accessToken": token,
            "user": _format_user_response(user)
        }), 201
    except Exception as e:
        logger.exception(f"Signup error: {e}")
        return jsonify({"error": "Failed to create account. Please try again."}), 500


# ---------------------------------------------------------
# POST /auth/login  (Password Login)
# ---------------------------------------------------------
@api.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not email:
        return jsonify({"error": "Email is required."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    if not verify_user_password(user, password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = _create_token(user["id"], user["email"])
    return jsonify({
        "success": True,
        "message": "Logged in successfully.",
        "accessToken": token,
        "user": _format_user_response(user)
    }), 200


# ---------------------------------------------------------
# POST /auth/send-otp
# ---------------------------------------------------------
@api.post("/auth/send-otp")
def send_otp():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier", "")).strip().lower()
    if not identifier:
        return jsonify({"error": "Email address is required."}), 400
    if not _is_valid_email(identifier):
        return jsonify({"error": "Please enter a valid email address."}), 400

    otp = f"{random.randint(100000, 999999)}"
    store_otp(identifier, otp, ttl=300)

    # Optional Supabase OTP
    supabase = get_supabase()
    if supabase:
        try:
            supabase.auth.sign_in_with_otp({"email": identifier})
            logger.info(f"Supabase OTP triggered for {identifier}")
        except Exception as e:
            logger.info(f"Supabase OTP send failed: {e}")

    logger.info(f"OTP generated for {identifier}: {otp}")
    return jsonify({
        "success": True,
        "message": "Verification code sent successfully.",
        "devOtp": otp
    }), 200


# ---------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------
@api.post("/auth/verify-otp")
def verify_otp():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier", "")).strip().lower()
    code = str(data.get("otp", "")).strip()

    if not identifier or not code:
        return jsonify({"error": "Email and OTP code are required."}), 400

    # Verify against database OTP store
    is_valid = db_verify_otp(identifier, code)
    if not is_valid:
        return jsonify({"error": "Invalid or expired verification code."}), 401

    # Find or create user
    user = get_user_by_email(identifier)
    if not user:
        user = create_user(email=identifier, auth_provider="otp")

    token = _create_token(user["id"], user["email"])
    return jsonify({
        "success": True,
        "accessToken": token,
        "user": _format_user_response(user)
    }), 200



# ---------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------
@api.get("/auth/me")
def get_me():
    token = _extract_token_from_header()
    if not token:
        return jsonify({"error": "Authentication token missing."}), 401

    payload = _verify_token(token)
    if not payload or not payload.get("sub"):
        return jsonify({"error": "Invalid or expired token."}), 401

    user = get_user_by_id(payload["sub"])
    if not user:
        return jsonify({"error": "User account not found."}), 404

    return jsonify({
        "success": True,
        "user": _format_user_response(user)
    }), 200


# ---------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------
@api.post("/auth/refresh")
def refresh():
    token = _extract_token_from_header()
    if not token:
        return jsonify({"error": "Authentication token missing."}), 401

    payload = _verify_token(token)
    if not payload or not payload.get("sub"):
        return jsonify({"error": "Invalid or expired token."}), 401

    user = get_user_by_id(payload["sub"])
    if not user:
        return jsonify({"error": "User not found."}), 404

    new_token = _create_token(user["id"], user.get("email", ""))
    return jsonify({
        "success": True,
        "accessToken": new_token,
        "user": _format_user_response(user)
    }), 200


# ---------------------------------------------------------
# POST /auth/google
# ---------------------------------------------------------
@api.post("/auth/google")
def google_auth():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    name = str(data.get("name", "")).strip()
    avatar = str(data.get("avatar", "")).strip()

    if not email:
        return jsonify({"error": "Google profile email missing."}), 400

    user = get_user_by_email(email)
    if not user:
        user = create_user(email=email, name=name, avatar=avatar, auth_provider="google")

    token = _create_token(user["id"], user["email"])
    return jsonify({
        "success": True,
        "accessToken": token,
        "user": _format_user_response(user)
    }), 200



# ---------------------------------------------------------
# POST /auth/exchange-token (OAuth Token Exchange)
# ---------------------------------------------------------
@api.post("/auth/exchange-token")
def exchange_token():
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", "")).strip()
    if not token:
        return jsonify({"error": "Exchange token required."}), 400

    payload = _verify_token(token)
    user_id = payload.get("sub") if payload else token
    user = get_user_by_id(user_id) if user_id else None

    if not user:
        # Fallback create a verified user from token if not found
        user = create_user(email=f"oauth_{user_id[:8]}@citizen.gov.in", auth_provider="oauth")

    access_token = _create_token(user["id"], user.get("email", ""))
    return jsonify({
        "success": True,
        "accessToken": access_token,
        "user": _format_user_response(user)
    }), 200


# ---------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------
@api.post("/auth/logout")
def logout():
    return jsonify({"success": True, "message": "Logged out successfully."}), 200
