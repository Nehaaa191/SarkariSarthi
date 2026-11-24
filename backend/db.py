import os
import sqlite3
import uuid
import time
import logging
from typing import Optional, Dict, Any
from werkzeug.security import generate_password_hash, check_password_hash

logger = logging.getLogger("sarkari-saathi-db")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "sarkari_saathi.db")


def get_db_connection():
    """Get a database connection with Row factory."""
    db_path = os.getenv("SQLITE_DB_PATH", DEFAULT_DB_PATH)
    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(app=None):
    """Initialize database tables for users and OTPs."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                name TEXT,
                phone TEXT,
                avatar TEXT,
                auth_provider TEXT DEFAULT 'local',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
            """)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS otps (
                identifier TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at REAL NOT NULL,
                attempts INTEGER DEFAULT 0,
                created_at REAL NOT NULL
            )
            """)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Look up a user by lowercase email."""
    if not email:
        return None
    normalized_email = email.strip().lower()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = ?", (normalized_email,))
        row = cur.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Look up a user by ID."""
    if not user_id:
        return None
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", (str(user_id),))
        row = cur.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def create_user(
    email: str,
    password: Optional[str] = None,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    avatar: Optional[str] = None,
    auth_provider: str = "local"
) -> Dict[str, Any]:
    """Create a new user with secure password hashing."""
    normalized_email = email.strip().lower()
    user_id = str(uuid.uuid4())
    pw_hash = generate_password_hash(password) if password else None
    display_name = name.strip() if name else ""

    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, name, phone, avatar, auth_provider)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, normalized_email, pw_hash, display_name, phone, avatar, auth_provider)
            )
        return {
            "id": user_id,
            "email": normalized_email,
            "name": display_name,
            "phone": phone,
            "avatar": avatar,
            "auth_provider": auth_provider,
        }
    finally:
        conn.close()


def verify_user_password(user: Dict[str, Any], password: str) -> bool:
    """Check if password matches user's password_hash."""
    pw_hash = user.get("password_hash")
    if not pw_hash or not password:
        return False
    return check_password_hash(pw_hash, password)


def store_otp(identifier: str, code: str, ttl: int = 300):
    """Store or update OTP for an identifier in database."""
    key = identifier.strip().lower()
    now = time.time()
    expires_at = now + ttl
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO otps (identifier, code, expires_at, attempts, created_at)
                VALUES (?, ?, ?, 0, ?)
                ON CONFLICT(identifier) DO UPDATE SET
                    code = excluded.code,
                    expires_at = excluded.expires_at,
                    attempts = 0,
                    created_at = excluded.created_at
                """,
                (key, code, expires_at, now)
            )
    finally:
        conn.close()


def verify_otp(identifier: str, code: str) -> bool:
    """Verify OTP and delete upon successful verification."""
    key = identifier.strip().lower()
    now = time.time()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM otps WHERE identifier = ?", (key,))
        row = cur.fetchone()
        if not row:
            return False
        
        record = dict(row)
        if now > record["expires_at"] or record["attempts"] >= 5:
            with conn:
                conn.execute("DELETE FROM otps WHERE identifier = ?", (key,))
            return False

        if record["code"] != code.strip():
            with conn:
                conn.execute("UPDATE otps SET attempts = attempts + 1 WHERE identifier = ?", (key,))
            return False

        # Success - clean up OTP
        with conn:
            conn.execute("DELETE FROM otps WHERE identifier = ?", (key,))
        return True
    finally:
        conn.close()
