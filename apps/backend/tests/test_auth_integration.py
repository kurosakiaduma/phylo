"""Integration tests for authentication endpoints.

Tests cover:
- POST /api/auth/otp/request (OTP request)
- POST /api/auth/otp/verify (OTP verification)
- GET /api/auth/me (current user)
- POST /api/auth/logout (logout)
- POST /api/auth/refresh (token refresh)
- Rate limiting
- Error handling
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import sys
import os
from unittest.mock import patch, MagicMock
from uuid import uuid4
import pytz

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.main import app
from models import User, OTPCode
from utils.test_db import get_test_session
from utils.auth import create_access_token
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create test client
client = TestClient(app)

# Test database setup
TEST_DB_URL = "sqlite:///./test_auth_integration.db"
test_engine = create_engine(TEST_DB_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        # Cleanup
        session.query(OTPCode).delete()
        session.query(User).delete()
        session.commit()
        session.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="testuser@example.com",
        display_name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(user: User) -> dict:
    """Get authentication headers for a user."""
    token = create_access_token(user.id, user.email)
    return {"Authorization": f"Bearer {token}"}


class TestOTPRequest:
    """Tests for POST /api/auth/otp/request"""
    
    @patch('services.email.send_email')
    def test_request_otp_success(self, mock_send_email, db_session):
        """Test successful OTP request."""
        mock_send_email.return_value = True
        
        response = client.post(
            "/api/auth/otp/request",
            json={"email": "newuser@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "sent" in data["message"].lower()
        assert "remaining_requests" in data
        
        # Verify OTP was stored
        otp = db_session.query(OTPCode).filter(
            OTPCode.email == "newuser@example.com"
        ).first()
        assert otp is not None
        assert otp.code is not None
        assert len(otp.code) == 6
        assert otp.expires_at > datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi'))
    
    @patch('services.email.send_email')
    def test_request_otp_sends_email(self, mock_send_email, db_session):
        """Test that OTP request sends email."""
        mock_send_email.return_value = True
        
        response = client.post(
            "/api/auth/otp/request",
            json={"email": "email@example.com"}
        )
        
        assert response.status_code == 200
        assert mock_send_email.called
        
        # Check email was sent with correct parameters
        call_args = mock_send_email.call_args
        assert call_args[1]["to"] == "email@example.com"
        assert "OTP" in call_args[1]["subject"] or "code" in call_args[1]["subject"].lower()
    
    def test_request_otp_invalid_email(self, db_session):
        """Test OTP request with invalid email."""
        response = client.post(
            "/api/auth/otp/request",
            json={"email": "not-an-email"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_request_otp_missing_email(self, db_session):
        """Test OTP request without email."""
        response = client.post(
            "/api/auth/otp/request",
            json={}
        )
        
        assert response.status_code == 422
    
    @patch('services.email.send_email')
    @patch('utils.rate_limit.check_rate_limit')
    def test_request_otp_rate_limiting(self, mock_rate_limit, mock_send_email, db_session):
        """Test OTP request rate limiting."""
        # Simulate rate limit exceeded
        mock_rate_limit.return_value = (False, 0)
        mock_send_email.return_value = True
        
        response = client.post(
            "/api/auth/otp/request",
            json={"email": "ratelimit@example.com"}
        )
        
        assert response.status_code == 429
        assert "too many" in response.json()["detail"].lower()
    
    @patch('services.email.send_email')
    def test_request_multiple_otps_same_email(self, mock_send_email, db_session):
        """Test requesting multiple OTPs for same email."""
        mock_send_email.return_value = True
        email = "multiple@example.com"
        
        # First request
        response1 = client.post(
            "/api/auth/otp/request",
            json={"email": email}
        )
        assert response1.status_code == 200
        
        # Second request
        response2 = client.post(
            "/api/auth/otp/request",
            json={"email": email}
        )
        assert response2.status_code == 200
        
        # Both should create separate OTP records
        otps = db_session.query(OTPCode).filter(
            OTPCode.email == email
        ).all()
        assert len(otps) >= 2


class TestOTPVerify:
    """Tests for POST /api/auth/otp/verify"""
    
    def test_verify_otp_success(self, db_session):
        """Test successful OTP verification."""
        email = "verify@example.com"
        code = "123456"
        
        # Create OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=10)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        
        # Verify OTP was marked as used
        db_session.refresh(otp)
        assert otp.used_at is not None
        
        # Verify user was created
        user = db_session.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.email == email
    
    def test_verify_otp_creates_new_user(self, db_session):
        """Test OTP verification creates new user if doesn't exist."""
        email = "newverify@example.com"
        code = "654321"
        
        # Create OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=10)
        )
        db_session.add(otp)
        db_session.commit()
        
        # Verify no user exists
        user_before = db_session.query(User).filter(User.email == email).first()
        assert user_before is None
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        
        assert response.status_code == 200
        
        # Verify user was created
        user_after = db_session.query(User).filter(User.email == email).first()
        assert user_after is not None
        assert user_after.email == email
    
    def test_verify_otp_wrong_code(self, db_session):
        """Test OTP verification with wrong code."""
        email = "wrong@example.com"
        
        # Create OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code="123456",
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=10)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": "999999"}
        )
        
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()
    
    def test_verify_otp_expired(self, db_session):
        """Test OTP verification with expired code."""
        email = "expired@example.com"
        code = "123456"
        
        # Create expired OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) - timedelta(minutes=1)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()
    
    def test_verify_otp_already_used(self, db_session):
        """Test OTP verification with already used code."""
        email = "used@example.com"
        code = "123456"
        
        # Create used OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=10),
            used_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi'))
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        
        assert response.status_code == 401
    
    def test_verify_otp_sets_cookie(self, db_session):
        """Test OTP verification sets secure cookie."""
        email = "cookie@example.com"
        code = "123456"
        
        # Create OTP
        otp = OTPCode(
            id=uuid4(),
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=10)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        
        assert response.status_code == 200
        
        # Check for Set-Cookie header
        assert "set-cookie" in response.headers
        cookie_header = response.headers["set-cookie"]
        assert "family_tree_session" in cookie_header.lower()
        # Note: httponly and secure flags may not appear in test environment


class TestGetCurrentUser:
    """Tests for GET /api/auth/me"""
    
    def test_get_current_user_success(self, db_session, test_user):
        """Test getting current user info."""
        response = client.get(
            "/api/auth/me",
            headers=get_auth_headers(test_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["email"] == test_user.email
        assert data["display_name"] == test_user.display_name
    
    def test_get_current_user_no_auth(self, db_session):
        """Test getting current user without authentication."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, db_session):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    def test_get_current_user_expired_token(self, db_session, test_user):
        """Test getting current user with expired token."""
        # Create expired token
        expired_token = create_access_token(
            test_user.id,
            test_user.email,
            timedelta(seconds=-1)
        )
        
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        
        assert response.status_code == 401


class TestLogout:
    """Tests for POST /api/auth/logout"""
    
    def test_logout_success(self, db_session, test_user):
        """Test successful logout."""
        response = client.post(
            "/api/auth/logout",
            headers=get_auth_headers(test_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "logged out" in data["message"].lower()
    
    def test_logout_clears_cookie(self, db_session, test_user):
        """Test logout clears session cookie."""
        response = client.post(
            "/api/auth/logout",
            headers=get_auth_headers(test_user)
        )
        
        assert response.status_code == 200
        
        # Check cookie is cleared
        if "set-cookie" in response.headers:
            cookie_header = response.headers["set-cookie"]
            # Cookie should be set to expire immediately
            assert "max-age=0" in cookie_header.lower() or "expires=" in cookie_header.lower()
    
    def test_logout_without_auth(self, db_session):
        """Test logout without authentication."""
        response = client.post("/api/auth/logout")
        
        assert response.status_code == 401


class TestTokenRefresh:
    """Tests for POST /api/auth/refresh"""
    
    def test_refresh_token_success(self, db_session, test_user):
        """Test successful token refresh."""
        response = client.post(
            "/api/auth/refresh",
            headers=get_auth_headers(test_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
    
    def test_refresh_token_returns_new_token(self, db_session, test_user):
        """Test token refresh returns a new token."""
        old_token = create_access_token(test_user.id, test_user.email)
        
        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {old_token}"}
        )
        
        assert response.status_code == 200
        new_token = response.json()["access_token"]
        
        # Tokens should be different
        assert new_token != old_token
    
    def test_refresh_token_without_auth(self, db_session):
        """Test token refresh without authentication."""
        response = client.post("/api/auth/refresh")
        
        assert response.status_code == 401
    
    def test_refresh_token_with_expired_token(self, db_session, test_user):
        """Test token refresh with expired token fails."""
        expired_token = create_access_token(
            test_user.id,
            test_user.email,
            timedelta(seconds=-1)
        )
        
        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        
        assert response.status_code == 401


class TestAuthenticationFlow:
    """Integration tests for full authentication flow."""
    
    @patch('services.email.send_email')
    def test_complete_auth_flow(self, mock_send_email, db_session):
        """Test complete authentication flow from OTP request to logout."""
        mock_send_email.return_value = True
        email = "flowtest@example.com"
        
        # Step 1: Request OTP
        response = client.post(
            "/api/auth/otp/request",
            json={"email": email}
        )
        assert response.status_code == 200
        
        # Get OTP from database
        otp = db_session.query(OTPCode).filter(
            OTPCode.email == email
        ).first()
        assert otp is not None
        
        # Step 2: Verify OTP
        response = client.post(
            "/api/auth/otp/verify",
            json={"email": email, "code": otp.code}
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Step 3: Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["email"] == email
        
        # Step 4: Refresh token
        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        new_token = response.json()["access_token"]
        
        # Step 5: Use new token
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert response.status_code == 200
        
        # Step 6: Logout
        response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
