"""Test script for tree management endpoints.

This script demonstrates the tree management flow:
1. Authenticate user
2. Create a new tree
3. List user's trees
4. Get tree details
5. Update tree metadata
6. Archive (soft delete) tree
7. Restore archived tree
8. Permanently delete tree

Run with: python test_tree_management.py
"""

import requests
from typing import Optional
import json

# Configuration
BASE_URL = "http://localhost:8050"
TEST_EMAIL = "tree.admin@example.com"


class TreeManagementClient:
    """Helper class for tree management testing."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.current_user = None
    
    def authenticate(self, email: str, otp_code: str) -> dict:
        """Authenticate and get session token."""
        # Request OTP
        response = self.session.post(
            f"{self.base_url}/api/auth/otp/request",
            json={"email": email}
        )
        response.raise_for_status()
        print(f"✓ OTP requested for {email}")
        
        # Verify OTP
        response = self.session.post(
            f"{self.base_url}/api/auth/otp/verify",
            json={"email": email, "code": otp_code}
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data.get("access_token")
        self.current_user = data.get("user")
        print(f"✓ Authenticated as {email}")
        return data
    
    def _get_headers(self):
        """Get authorization headers."""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}
    
    def create_tree(self, name: str, description: str = None, settings: dict = None) -> dict:
        """Create a new tree."""
        payload = {"name": name}
        if description:
            payload["description"] = description
        if settings:
            payload["settings"] = settings
        
        response = self.session.post(
            f"{self.base_url}/api/trees",
            json=payload,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def list_trees(self) -> list:
        """List all trees user has access to."""
        response = self.session.get(
            f"{self.base_url}/api/trees",
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def get_tree(self, tree_id: str) -> dict:
        """Get detailed tree information."""
        response = self.session.get(
            f"{self.base_url}/api/trees/{tree_id}",
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def update_tree(self, tree_id: str, name: str = None, description: str = None, settings: dict = None) -> dict:
        """Update tree metadata."""
        payload = {}
        if name is not None:
            payload["name"] = name
        if description is not None:
            payload["description"] = description
        if settings is not None:
            payload["settings"] = settings
        
        response = self.session.patch(
            f"{self.base_url}/api/trees/{tree_id}",
            json=payload,
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def delete_tree(self, tree_id: str, permanent: bool = False) -> dict:
        """Delete or archive a tree."""
        response = self.session.delete(
            f"{self.base_url}/api/trees/{tree_id}",
            params={"permanent": permanent},
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()


def test_tree_management():
    """Test complete tree management flow."""
    print("=" * 70)
    print("Tree Management Test")
    print("=" * 70)
    
    client = TreeManagementClient(BASE_URL)
    
    # Step 1: Authenticate
    print("\n1. Authenticating...")
    print(f"   Request OTP for {TEST_EMAIL}")
    print("   Check your Mailtrap inbox for the code")
    otp_code = input("   Enter OTP code: ").strip()
    
    if not otp_code:
        print("   ✗ No OTP code provided")
        return False
    
    try:
        client.authenticate(TEST_EMAIL, otp_code)
        print(f"   ✓ Authenticated as {client.current_user['email']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Authentication failed: {e}")
        return False
    
    # Step 2: Create a tree
    print("\n2. Creating a new tree...")
    try:
        tree_data = {
            "monogamy": True,
            "allowPolygamy": False,
            "allowSameSex": True,
            "allowSingleParent": True,
            "allowMultiParentChildren": False,
            "maxParentsPerChild": 2
        }
        
        tree = client.create_tree(
            name="Smith Family Tree",
            description="Our wonderful family history",
            settings=tree_data
        )
        tree_id = tree["id"]
        print(f"   ✓ Tree created successfully")
        print(f"   Tree ID: {tree_id}")
        print(f"   Name: {tree['name']}")
        print(f"   Created by: {tree['created_by']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to create tree: {e}")
        return False
    
    # Step 3: List trees
    print("\n3. Listing user's trees...")
    try:
        trees = client.list_trees()
        print(f"   ✓ Found {len(trees)} tree(s)")
        for t in trees:
            print(f"     - {t['name']} (Role: {t['role']}, Members: {t['member_count']})")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to list trees: {e}")
        return False
    
    # Step 4: Get tree details
    print("\n4. Getting tree details...")
    try:
        details = client.get_tree(tree_id)
        print(f"   ✓ Retrieved tree details")
        print(f"   Name: {details['name']}")
        print(f"   Description: {details['description']}")
        print(f"   Your role: {details['user_role']}")
        print(f"   Members: {details['member_count']}")
        print(f"   Relationships: {details['relationship_count']}")
        print(f"   Memberships: {len(details['memberships'])}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to get tree details: {e}")
        return False
    
    # Step 5: Update tree
    print("\n5. Updating tree metadata...")
    try:
        updated = client.update_tree(
            tree_id,
            name="Smith Family Tree (Updated)",
            description="Our amazing family history - updated!"
        )
        print(f"   ✓ Tree updated successfully")
        print(f"   New name: {updated['name']}")
        print(f"   New description: {updated['description']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to update tree: {e}")
        return False
    
    # Step 6: Update settings to allow polygamy
    print("\n6. Updating tree settings...")
    try:
        updated = client.update_tree(
            tree_id,
            settings={
                "monogamy": False,
                "allowPolygamy": True,
                "maxSpousesPerMember": 3,
                "allowSameSex": True,
                "allowSingleParent": True,
                "allowMultiParentChildren": True,
                "maxParentsPerChild": 3
            }
        )
        print(f"   ✓ Settings updated successfully")
        print(f"   Monogamy: {updated['settings']['monogamy']}")
        print(f"   Allow polygamy: {updated['settings']['allowPolygamy']}")
        print(f"   Max spouses: {updated['settings']['maxSpousesPerMember']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to update settings: {e}")
        return False
    
    # Step 7: Archive tree (soft delete)
    print("\n7. Archiving tree (soft delete)...")
    try:
        result = client.delete_tree(tree_id, permanent=False)
        print(f"   ✓ Tree archived successfully")
        print(f"   Status: {result['status']}")
        print(f"   Message: {result['message']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to archive tree: {e}")
        return False
    
    # Step 8: Restore tree (remove archive marker)
    print("\n8. Restoring archived tree...")
    try:
        restored = client.update_tree(
            tree_id,
            description="Our amazing family history - restored!"
        )
        print(f"   ✓ Tree restored successfully")
        print(f"   Description: {restored['description']}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Failed to restore tree: {e}")
        return False
    
    # Step 9: Permanent delete (optional)
    delete_perm = input("\n9. Permanently delete tree? (y/N): ").strip().lower()
    if delete_perm == 'y':
        try:
            result = client.delete_tree(tree_id, permanent=True)
            print(f"   ✓ Tree permanently deleted")
            print(f"   Status: {result['status']}")
            print(f"   Message: {result['message']}")
        except requests.exceptions.RequestException as e:
            print(f"   ✗ Failed to permanently delete tree: {e}")
            return False
    else:
        print("   ⊘ Skipped permanent deletion")
    
    print("\n" + "=" * 70)
    print("✓ All tests passed!")
    print("=" * 70)
    return True


def test_validation():
    """Test tree validation rules."""
    print("\n" + "=" * 70)
    print("Validation Tests")
    print("=" * 70)
    
    client = TreeManagementClient(BASE_URL)
    
    # Authenticate
    print("\nAuthenticating...")
    otp_code = input(f"Enter OTP for {TEST_EMAIL}: ").strip()
    if not otp_code:
        print("Skipping validation tests")
        return
    
    client.authenticate(TEST_EMAIL, otp_code)
    
    # Test 1: Invalid settings (monogamy + polygamy)
    print("\nTest 1: Try to create tree with conflicting settings...")
    try:
        tree = client.create_tree(
            name="Invalid Tree",
            settings={
                "monogamy": True,
                "allowPolygamy": True  # Conflict!
            }
        )
        print("   ✗ Should have failed (allowed conflicting settings)")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            print("   ✓ Correctly rejected conflicting settings")
        else:
            print(f"   ✗ Unexpected error: {e}")
    
    # Test 2: Invalid max spouses
    print("\nTest 2: Try to create tree with invalid maxSpousesPerMember...")
    try:
        tree = client.create_tree(
            name="Invalid Tree 2",
            settings={
                "maxSpousesPerMember": 0  # Must be at least 1
            }
        )
        print("   ✗ Should have failed (invalid maxSpousesPerMember)")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            print("   ✓ Correctly rejected invalid maxSpousesPerMember")
        else:
            print(f"   ✗ Unexpected error: {e}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    print("\n🌳 Family Tree Management Test Suite\n")
    
    # Test basic tree management
    test_tree_management()
    
    # Test validation (optional)
    test_validation_run = input("\nRun validation tests? (y/N): ").strip().lower()
    if test_validation_run == 'y':
        test_validation()
    
    print("\n✨ Testing complete!\n")
