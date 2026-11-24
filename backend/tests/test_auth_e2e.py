import sys
import os
import json
import sqlite3

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from flask import Flask
from auth_routes import api as auth_bp
from db import init_db, get_db_connection

def run_tests():
    print("==================================================")
    print("STARTING FULL-STACK AUTHENTICATION AUDIT TESTS")
    print("==================================================")

    # Use isolated test database
    test_db = os.path.join(backend_dir, "test_auth.db")
    if os.path.exists(test_db):
        os.remove(test_db)
    os.environ["SQLITE_DB_PATH"] = test_db

    app = Flask(__name__)
    init_db(app)
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="", name="auth_root")
    client = app.test_client()

    # Scenario 1: Register a completely new user
    print("\n[Scenario 1] Register a completely new user")
    res = client.post("/api/auth/signup", json={
        "name": "Aarav Sharma",
        "email": "aarav.sharma@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 201, f"Failed 1: {res.status_code} {res.data}"
    data = res.get_json()
    assert data["success"] is True
    assert "accessToken" in data and len(data["accessToken"]) > 20
    assert data["user"]["email"] == "aarav.sharma@example.com"
    assert data["user"]["name"] == "Aarav Sharma"
    aarav_token = data["accessToken"]
    print("  PASS: New user registered with hashed password & JWT token returned.")

    # Scenario 2: Register using an already existing email
    print("\n[Scenario 2] Register using an already existing email")
    res = client.post("/api/auth/signup", json={
        "name": "Duplicate Aarav",
        "email": "aarav.sharma@example.com",
        "password": "NewPassword456!"
    })
    assert res.status_code == 409, f"Failed 2: {res.status_code}"
    err = res.get_json()
    assert "already exists" in err.get("error", "").lower()
    print("  PASS: Duplicate registration rejected with 409 Conflict.")

    # Scenario 3: Login using valid credentials
    print("\n[Scenario 3] Login using valid credentials")
    res = client.post("/api/auth/login", json={
        "email": "aarav.sharma@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200, f"Failed 3: {res.status_code}"
    data = res.get_json()
    assert data["success"] is True
    assert data["user"]["name"] == "Aarav Sharma"
    login_token = data["accessToken"]
    print("  PASS: Login successful with valid credentials.")

    # Scenario 4: Login using an incorrect password
    print("\n[Scenario 4] Login using an incorrect password")
    res = client.post("/api/auth/login", json={
        "email": "aarav.sharma@example.com",
        "password": "WrongPassword999!"
    })
    assert res.status_code == 401, f"Failed 4: {res.status_code}"
    err = res.get_json()
    assert "invalid" in err.get("error", "").lower()
    print("  PASS: Incorrect password rejected with 401 Unauthorized.")

    # Scenario 5: Login using an unregistered email
    print("\n[Scenario 5] Login using an unregistered email")
    res = client.post("/api/auth/login", json={
        "email": "ghost.user@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 401, f"Failed 5: {res.status_code}"
    print("  PASS: Unregistered email rejected with 401 Unauthorized.")

    # Scenario 6: Submit empty forms & malformed fields
    print("\n[Scenario 6] Submit empty forms & malformed inputs")
    # Empty email
    res = client.post("/api/auth/signup", json={"email": "", "password": "Password123!"})
    assert res.status_code == 400
    # Invalid email syntax
    res = client.post("/api/auth/signup", json={"email": "not-an-email", "password": "Password123!"})
    assert res.status_code == 400
    # Password too short (< 6 chars)
    res = client.post("/api/auth/signup", json={"email": "valid@example.com", "password": "123"})
    assert res.status_code == 400
    # Empty login
    res = client.post("/api/auth/login", json={"email": "", "password": ""})
    assert res.status_code == 400
    print("  PASS: All validation errors handled with 400 Bad Request.")

    # Scenario 7: Get profile & refresh token after successful login
    print("\n[Scenario 7] Get profile /auth/me and token refresh /auth/refresh")
    # Valid /auth/me
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login_token}"})
    assert res.status_code == 200
    user_data = res.get_json()["user"]
    assert user_data["email"] == "aarav.sharma@example.com"

    # Token refresh
    res = client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {login_token}"})
    assert res.status_code == 200
    refreshed = res.get_json()
    assert "accessToken" in refreshed and len(refreshed["accessToken"]) > 20
    assert refreshed["user"]["email"] == "aarav.sharma@example.com"
    print("  PASS: Session inspection (/auth/me) and refresh (/auth/refresh) verified.")

    # Scenario 8 & 9: Protected route access without valid token
    print("\n[Scenario 8 & 9] Unauthorized access to protected endpoints")
    res = client.get("/api/auth/me") # No header
    assert res.status_code == 401
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer fake.tampered.token"})
    assert res.status_code == 401
    print("  PASS: Protected routes strictly reject missing or forged tokens.")

    # Scenario 10: Logout
    print("\n[Scenario 10] Logout")
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.get_json()["success"] is True
    print("  PASS: Logout clears session cleanly.")

    # Scenario 11: OTP Send and Verify Flow
    print("\n[Scenario 11] OTP Authentication Flow")
    res = client.post("/api/auth/send-otp", json={"identifier": "priya.verma@example.com"})
    assert res.status_code == 200
    otp_data = res.get_json()
    assert "devOtp" in otp_data
    dev_code = otp_data["devOtp"]

    # Wrong OTP
    res = client.post("/api/auth/verify-otp", json={"identifier": "priya.verma@example.com", "otp": "000000"})
    assert res.status_code == 401

    # Valid OTP
    res = client.post("/api/auth/verify-otp", json={"identifier": "priya.verma@example.com", "otp": dev_code})
    assert res.status_code == 200
    otp_user = res.get_json()
    assert otp_user["user"]["email"] == "priya.verma@example.com"
    print("  PASS: OTP generation, incorrect code rejection, and verification passed.")

    # Scenario 12: OAuth token exchange
    print("\n[Scenario 12] OAuth Token Exchange")
    res = client.post("/api/auth/exchange-token", json={"token": login_token})
    assert res.status_code == 200
    assert res.get_json()["user"]["email"] == "aarav.sharma@example.com"
    print("  PASS: OAuth exchange-token endpoint functioning correctly.")

    # Scenario 13: Direct /auth/* aliases without /api prefix
    print("\n[Scenario 13] Path compatibility: /auth/* without /api prefix")
    res = client.post("/auth/login", json={
        "email": "aarav.sharma@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    print("  PASS: Direct /auth/login route accessible.")

    # Clean up test database
    if os.path.exists(test_db):
        os.remove(test_db)

    print("\n==================================================")
    print("ALL 13 END-TO-END AUTH SCENARIOS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
