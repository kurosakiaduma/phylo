"""Test script for authentication endpoints.

This script demonstrates the authentication flow:
1. Request OTP code
2. Verify OTP code (simulated)
3. Get current user info
4. Refresh token
5. Logout

Run with: python -m pytest test_auth_flow.py -v
or: python test_auth_flow.py
"""

import requests
import time
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8050"
TEST_EMAIL = "tevin74@live.com"


class AuthClient:
    """Helper class for authentication testing."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token: Optional[str] = None
    
    def request_otp(self, email: str) -> dict:
        """Request OTP code for email."""
        response = self.session.post(
            f"{self.base_url}/api/auth/otp/request",
            json={"email": email}
        )
        response.raise_for_status()
        return response.json()
    
    def verify_otp(self, email: str, code: str) -> dict:
        """Verify OTP code and get session token."""
        response = self.session.post(
            f"{self.base_url}/api/auth/otp/verify",
            json={"email": email, "code": code}
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data.get("access_token")
        return data
    
    def get_current_user(self) -> dict:
        """Get current authenticated user."""
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        response = self.session.get(
            f"{self.base_url}/api/auth/me",
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    
    def refresh_token(self) -> dict:
        """Refresh authentication token."""
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        response = self.session.post(
            f"{self.base_url}/api/auth/refresh",
            headers=headers
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data.get("access_token")
        return data
    
    def logout(self) -> dict:
        """Logout and clear session."""
        response = self.session.post(f"{self.base_url}/api/auth/logout")
        response.raise_for_status()
        self.access_token = None
        return response.json()


def test_auth_flow():
    """Test complete authentication flow."""
    print("=" * 60)
    print("Authentication Flow Test")
    print("=" * 60)
    
    client = AuthClient(BASE_URL)
    
    # Step 1: Request OTP
    print("\n1. Requesting OTP code...")
    try:
        result = client.request_otp(TEST_EMAIL)
        print(f"   ✓ OTP requested successfully")
        print(f"   Remaining requests: {result.get('remaining_requests')}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to request OTP: {e}")
        return False
    
    # Step 2: Get OTP from database (manual step)
    print("\n2. Verify OTP code...")
    print("   ⚠ In a real test, retrieve OTP from database or email")
    print("   For manual testing, check your Mailtrap inbox")
    otp_code = input("   Enter OTP code: ").strip()
    
    if not otp_code:
        print("   ✗ No OTP code provided, skipping verification")
        return False
    
    try:
        result = client.verify_otp(TEST_EMAIL, otp_code)
        print(f"   ✓ OTP verified successfully")
        print(f"   User ID: {result['user']['id']}")
        print(f"   Email: {result['user']['email']}")
        print(f"   Token type: {result['token_type']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to verify OTP: {e}")
        return False
    
    # Step 3: Get current user
    print("\n3. Getting current user info...")
    try:
        user = client.get_current_user()
        print(f"   ✓ Retrieved user info")
        print(f"   Display name: {user.get('display_name')}")
        print(f"   Created at: {user.get('created_at')}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to get user info: {e}")
        return False
    
    # Step 4: Refresh token
    print("\n4. Refreshing authentication token...")
    try:
        result = client.refresh_token()
        print(f"   ✓ Token refreshed successfully")
        print(f"   New token expires in: {result.get('expires_in')} seconds")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to refresh token: {e}")
        return False
    
    # Step 5: Logout
    print("\n5. Logging out...")
    try:
        result = client.logout()
        print(f"   ✓ Logged out successfully")
        print(f"   Message: {result.get('message')}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to logout: {e}")
        return False
    
    # Step 6: Verify logged out (should fail)
    print("\n6. Verifying logout (should fail)...")
    try:
        client.get_current_user()
        print(f"   ✗ Still authenticated (unexpected)")
        return False
    except requests.exceptions.RequestException:
        print(f"   ✓ Not authenticated (expected)")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)
    return True


def test_rate_limiting():
    """Test rate limiting on OTP requests."""
    print("\n" + "=" * 60)
    print("Rate Limiting Test")
    print("=" * 60)
    
    client = AuthClient(BASE_URL)
    test_email = "ratelimit.test@example.com"
    
    print(f"\nTesting rate limit (max 3 requests per 15 minutes)...")
    
    for i in range(5):
        try:
            result = client.request_otp(test_email)
            remaining = result.get('remaining_requests', 'N/A')
            print(f"   Request {i+1}: ✓ Success (remaining: {remaining})")
            time.sleep(0.5)  # Small delay between requests
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                print(f"   Request {i+1}: ✓ Rate limited (expected)")
                break
            else:
                print(f"   Request {i+1}: ✗ Unexpected error: {e}")
        except Exception as e:
            print(f"   Request {i+1}: ✗ Error: {e}")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    print("\n🌳 Family Tree Authentication Test Suite\n")
    
    # Test basic auth flow
    test_auth_flow()
    
    # Test rate limiting (optional)
    test_rate_limit = input("\nTest rate limiting? (y/N): ").strip().lower()
    if test_rate_limit == 'y':
        test_rate_limiting()
    
    print("\n✨ Testing complete!\n")
