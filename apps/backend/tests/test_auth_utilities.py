"""Unit tests for authentication utilities (JWT, OTP).

Tests cover:
- JWT token creation
- JWT token verification
- Token expiration handling
- Token payload decoding
- Invalid token handling
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import jwt
import pytz

from utils.auth import (
    create_access_token,
    verify_access_token,
    decode_token_payload,
    SECRET_KEY,
    ALGORITHM
)


class TestJWTTokenCreation:
    """Tests for JWT token creation."""
    
    def test_create_access_token_basic(self):
        """Test creating a basic access token."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_with_custom_expiry(self):
        """Test creating token with custom expiration."""
        user_id = uuid4()
        email = "test@example.com"
        expires_delta = timedelta(minutes=30)
        
        token = create_access_token(user_id, email, expires_delta)
        
        # Decode and verify expiration
        payload = decode_token_payload(token)
        assert payload is not None
        
        exp_time = datetime.fromtimestamp(payload["exp"], tz=pytz.timezone('Africa/Nairobi'))
        iat_time = datetime.fromtimestamp(payload["iat"], tz=pytz.timezone('Africa/Nairobi'))
        
        # Should be approximately 30 minutes
        time_diff = (exp_time - iat_time).total_seconds() / 60
        assert 29 <= time_diff <= 31  # Allow 1 minute tolerance
    
    def test_token_contains_correct_payload(self):
        """Test that token contains expected payload data."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        payload = decode_token_payload(token)
        
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
        assert "exp" in payload
        assert "iat" in payload
    
    def test_create_token_with_different_users(self):
        """Test creating tokens for different users produces different tokens."""
        user1_id = uuid4()
        user2_id = uuid4()
        
        token1 = create_access_token(user1_id, "user1@example.com")
        token2 = create_access_token(user2_id, "user2@example.com")
        
        assert token1 != token2
        
        payload1 = decode_token_payload(token1)
        payload2 = decode_token_payload(token2)
        
        assert payload1["sub"] != payload2["sub"]
        assert payload1["email"] != payload2["email"]


class TestJWTTokenVerification:
    """Tests for JWT token verification."""
    
    def test_verify_valid_token(self):
        """Test verifying a valid token."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        payload = verify_access_token(token)
        
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
    
    def test_verify_expired_token(self):
        """Test verifying an expired token returns None."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create token that expires immediately
        token = create_access_token(user_id, email, timedelta(seconds=-1))
        payload = verify_access_token(token)
        
        assert payload is None
    
    def test_verify_invalid_token(self):
        """Test verifying an invalid token returns None."""
        invalid_token = "invalid.token.string"
        payload = verify_access_token(invalid_token)
        
        assert payload is None
    
    def test_verify_tampered_token(self):
        """Test verifying a tampered token returns None."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        # Tamper with token
        parts = token.split('.')
        if len(parts) == 3:
            # Change one character in the signature
            tampered_token = f"{parts[0]}.{parts[1]}.{parts[2][:-1]}X"
            payload = verify_access_token(tampered_token)
            
            assert payload is None
    
    def test_verify_token_with_wrong_signature(self):
        """Test token signed with different secret is rejected."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create token with wrong secret
        payload_data = {
            "sub": str(user_id),
            "email": email,
            "exp": datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(hours=1)
        }
        wrong_token = jwt.encode(payload_data, "wrong-secret", algorithm=ALGORITHM)
        
        payload = verify_access_token(wrong_token)
        assert payload is None
    
    def test_verify_token_missing_required_fields(self):
        """Test token missing required fields."""
        # Create token without required fields
        payload_data = {
            "exp": datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(hours=1)
        }
        incomplete_token = jwt.encode(payload_data, SECRET_KEY, algorithm=ALGORITHM)
        
        payload = verify_access_token(incomplete_token)
        
        # Token is technically valid but missing expected fields
        assert payload is not None
        assert "sub" not in payload
        assert "email" not in payload


class TestTokenPayloadDecoding:
    """Tests for token payload decoding."""
    
    def test_decode_valid_token(self):
        """Test decoding a valid token payload."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        payload = decode_token_payload(token)
        
        assert payload is not None
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
    
    def test_decode_expired_token(self):
        """Test decoding an expired token (should still work without verification)."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create expired token
        token = create_access_token(user_id, email, timedelta(seconds=-1))
        payload = decode_token_payload(token)
        
        # Should still decode without verification
        assert payload is not None
        assert payload["sub"] == str(user_id)
    
    def test_decode_invalid_token(self):
        """Test decoding an invalid token returns None."""
        invalid_token = "not.a.valid.token"
        payload = decode_token_payload(invalid_token)
        
        assert payload is None
    
    def test_decode_tampered_token(self):
        """Test decoding a tampered token (signature not verified)."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        # Tamper with signature only (payload should still decode)
        parts = token.split('.')
        if len(parts) == 3:
            tampered_token = f"{parts[0]}.{parts[1]}.tampered_signature"
            payload = decode_token_payload(tampered_token)
            
            # Should still decode the payload (signature not checked)
            assert payload is not None
            assert payload["sub"] == str(user_id)


class TestTokenEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_token_with_very_long_expiration(self):
        """Test creating token with very long expiration."""
        user_id = uuid4()
        email = "test@example.com"
        
        # 10 years
        long_expiry = timedelta(days=3650)
        token = create_access_token(user_id, email, long_expiry)
        
        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == str(user_id)
    
    def test_token_with_special_characters_in_email(self):
        """Test token with special characters in email."""
        user_id = uuid4()
        email = "test+special@example.co.uk"
        
        token = create_access_token(user_id, email)
        payload = verify_access_token(token)
        
        assert payload is not None
        assert payload["email"] == email
    
    def test_empty_string_token(self):
        """Test verifying empty string token."""
        payload = verify_access_token("")
        assert payload is None
    
    def test_none_token(self):
        """Test verifying None token raises appropriate error."""
        with pytest.raises(Exception):
            verify_access_token(None)
    
    def test_token_lifecycle(self):
        """Test full token lifecycle: create, verify, decode."""
        user_id = uuid4()
        email = "lifecycle@example.com"
        
        # Step 1: Create token
        token = create_access_token(user_id, email)
        assert token is not None
        
        # Step 2: Verify token
        verified_payload = verify_access_token(token)
        assert verified_payload is not None
        assert verified_payload["sub"] == str(user_id)
        assert verified_payload["email"] == email
        
        # Step 3: Decode payload
        decoded_payload = decode_token_payload(token)
        assert decoded_payload is not None
        assert decoded_payload["sub"] == verified_payload["sub"]
        assert decoded_payload["email"] == verified_payload["email"]
        
        # Step 4: Verify token is still valid
        second_verification = verify_access_token(token)
        assert second_verification is not None
        assert second_verification["sub"] == str(user_id)


class TestTokenSecurity:
    """Tests for token security features."""
    
    def test_tokens_are_unique(self):
        """Test that multiple tokens for same user are unique."""
        user_id = uuid4()
        email = "test@example.com"
        
        token1 = create_access_token(user_id, email)
        token2 = create_access_token(user_id, email)
        
        # Tokens should be different due to different iat times
        assert token1 != token2
    
    def test_algorithm_is_secure(self):
        """Test that algorithm used is HS256."""
        from utils.auth import ALGORITHM
        assert ALGORITHM == "HS256"
    
    def test_secret_key_is_configured(self):
        """Test that secret key is configured."""
        from utils.auth import SECRET_KEY
        assert SECRET_KEY is not None
        assert len(SECRET_KEY) > 0
    
    def test_token_cannot_be_reused_after_expiry(self):
        """Test that expired tokens are rejected."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create token that expires in 1 second
        token = create_access_token(user_id, email, timedelta(seconds=1))
        
        # Verify it's valid initially
        payload = verify_access_token(token)
        assert payload is not None
        
        # Wait for expiration
        import time
        time.sleep(2)
        
        # Verify it's now invalid
        payload = verify_access_token(token)
        assert payload is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
