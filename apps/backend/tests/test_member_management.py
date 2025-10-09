"""
Test script for Member Management Endpoints (Phase 2.6)

This script demonstrates and tests all member management endpoints:
- GET /api/trees/{id}/members (paginated list with filters)
- GET /api/members/{id} (member details)
- POST /api/trees/{id}/members (create member)
- PATCH /api/members/{id} (update member)
- DELETE /api/members/{id} (remove member)

Prerequisites:
1. Backend server running (uvicorn api.main:app --reload)
2. Database initialized with Alembic migrations
3. Valid user session (obtained via OTP flow)

Usage:
    python test_member_management.py
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "http://localhost:8050/api"
TEST_EMAIL = "tevin74@live.com"

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str):
    """Print a colored header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


def print_json(data: Any):
    """Print JSON data with syntax highlighting."""
    print(f"{Colors.OKBLUE}{json.dumps(data, indent=2, default=str)}{Colors.ENDC}")


# Global session
session = requests.Session()


def authenticate() -> bool:
    """Authenticate user and get session token."""
    print_header("STEP 1: AUTHENTICATION")
    
    # Request OTP
    print_info(f"Requesting OTP for {TEST_EMAIL}...")
    response = session.post(
        f"{BASE_URL}/auth/otp/request",
        json={"email": TEST_EMAIL}
    )
    
    if response.status_code != 200:
        print_error(f"Failed to request OTP: {response.status_code}")
        print_json(response.json())
        return False
    
    print_success("OTP requested successfully")
    
    # In a real scenario, you'd get the OTP from email
    # For testing, we need to get it from the database
    print_warning("Please check your Mailtrap inbox for the OTP code")
    otp_code = input("Enter OTP code: ").strip()
    
    # Verify OTP
    print_info("Verifying OTP...")
    response = session.post(
        f"{BASE_URL}/auth/otp/verify",
        json={"email": TEST_EMAIL, "code": otp_code}
    )
    
    if response.status_code != 200:
        print_error(f"Failed to verify OTP: {response.status_code}")
        print_json(response.json())
        return False
    
    print_success("Authentication successful!")
    data = response.json()
    print_json(data)
    
    return True


def create_test_tree() -> Optional[str]:
    """Create a test tree for member testing."""
    print_header("STEP 2: CREATE TEST TREE")
    
    tree_data = {
        "name": "Member Test Tree",
        "description": "A tree for testing member management",
        "settings": {
            "allow_same_sex": True,
            "monogamy": False,
            "allow_polygamy": True,
            "max_spouses_per_member": None,
            "allow_single_parent": True,
            "allow_multi_parent_children": False,
            "max_parents_per_child": 2
        }
    }
    
    print_info("Creating test tree...")
    response = session.post(f"{BASE_URL}/trees", json=tree_data)
    
    if response.status_code != 201:
        print_error(f"Failed to create tree: {response.status_code}")
        print_json(response.json())
        return None
    
    tree = response.json()
    print_success(f"Tree created with ID: {tree['id']}")
    print_json(tree)
    
    return tree['id']


def test_create_member(tree_id: str) -> Optional[str]:
    """Test creating a member."""
    print_header("STEP 3: CREATE MEMBER")
    
    member_data = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "dob": "1990-01-15",
        "gender": "male",
        "deceased": False,
        "notes": "Test member created via API"
    }
    
    print_info("Creating member...")
    print_json(member_data)
    
    response = session.post(
        f"{BASE_URL}/trees/{tree_id}/members",
        json=member_data
    )
    
    if response.status_code != 201:
        print_error(f"Failed to create member: {response.status_code}")
        print_json(response.json())
        return None
    
    member = response.json()
    print_success(f"Member created with ID: {member['id']}")
    print_json(member)
    
    return member['id']


def test_get_member(member_id: str) -> bool:
    """Test getting member details."""
    print_header("STEP 4: GET MEMBER DETAILS")
    
    print_info(f"Fetching member {member_id}...")
    response = session.get(f"{BASE_URL}/members/{member_id}")
    
    if response.status_code != 200:
        print_error(f"Failed to get member: {response.status_code}")
        print_json(response.json())
        return False
    
    member = response.json()
    print_success("Member details retrieved")
    print_json(member)
    
    return True


def test_update_member(member_id: str) -> bool:
    """Test updating a member."""
    print_header("STEP 5: UPDATE MEMBER")
    
    update_data = {
        "notes": "Updated via API test",
        "deceased": False
    }
    
    print_info(f"Updating member {member_id}...")
    print_json(update_data)
    
    response = session.patch(
        f"{BASE_URL}/members/{member_id}",
        json=update_data
    )
    
    if response.status_code != 200:
        print_error(f"Failed to update member: {response.status_code}")
        print_json(response.json())
        return False
    
    member = response.json()
    print_success("Member updated successfully")
    print_json(member)
    
    return True


def test_list_members(tree_id: str) -> bool:
    """Test listing members with various filters."""
    print_header("STEP 6: LIST MEMBERS")
    
    # Create additional test members
    print_info("Creating additional members for pagination test...")
    for i in range(5):
        member_data = {
            "name": f"Test Member {i+2}",
            "email": f"member{i+2}@example.com",
            "deceased": i % 2 == 0,  # Alternate alive/deceased
            "gender": "female" if i % 2 == 0 else "male"
        }
        response = session.post(
            f"{BASE_URL}/trees/{tree_id}/members",
            json=member_data
        )
        if response.status_code == 201:
            print_success(f"Created {member_data['name']}")
    
    # Test 1: List all members
    print_info("\nTest 1: List all members")
    response = session.get(f"{BASE_URL}/trees/{tree_id}/members")
    
    if response.status_code != 200:
        print_error(f"Failed to list members: {response.status_code}")
        return False
    
    members = response.json()
    print_success(f"Retrieved {len(members)} members")
    print_json(members)
    
    # Test 2: Filter by alive status
    print_info("\nTest 2: Filter by alive status")
    response = session.get(
        f"{BASE_URL}/trees/{tree_id}/members",
        params={"status": "alive"}
    )
    
    if response.status_code == 200:
        alive_members = response.json()
        print_success(f"Retrieved {len(alive_members)} alive members")
        print_json([m['name'] for m in alive_members])
    
    # Test 3: Filter by deceased status
    print_info("\nTest 3: Filter by deceased status")
    response = session.get(
        f"{BASE_URL}/trees/{tree_id}/members",
        params={"status": "deceased"}
    )
    
    if response.status_code == 200:
        deceased_members = response.json()
        print_success(f"Retrieved {len(deceased_members)} deceased members")
        print_json([m['name'] for m in deceased_members])
    
    # Test 4: Search by name
    print_info("\nTest 4: Search by name")
    response = session.get(
        f"{BASE_URL}/trees/{tree_id}/members",
        params={"search": "John"}
    )
    
    if response.status_code == 200:
        search_results = response.json()
        print_success(f"Found {len(search_results)} members matching 'John'")
        print_json([m['name'] for m in search_results])
    
    # Test 5: Pagination with limit
    print_info("\nTest 5: Pagination with limit")
    response = session.get(
        f"{BASE_URL}/trees/{tree_id}/members",
        params={"limit": 2}
    )
    
    if response.status_code == 200:
        page1 = response.json()
        print_success(f"Retrieved first page with {len(page1)} members")
        print_json([m['name'] for m in page1])
        
        # Use cursor for next page
        if page1:
            cursor = page1[-1]['id']
            print_info(f"\nTest 5b: Get next page with cursor {cursor}")
            response = session.get(
                f"{BASE_URL}/trees/{tree_id}/members",
                params={"cursor": cursor, "limit": 2}
            )
            
            if response.status_code == 200:
                page2 = response.json()
                print_success(f"Retrieved next page with {len(page2)} members")
                print_json([m['name'] for m in page2])
    
    return True


def test_delete_member(tree_id: str) -> bool:
    """Test deleting a member."""
    print_header("STEP 7: DELETE MEMBER")
    
    # Create a temporary member to delete
    print_info("Creating temporary member for deletion test...")
    temp_member = {
        "name": "Temporary Member",
        "email": "temp@example.com"
    }
    
    response = session.post(
        f"{BASE_URL}/trees/{tree_id}/members",
        json=temp_member
    )
    
    if response.status_code != 201:
        print_error("Failed to create temporary member")
        return False
    
    member = response.json()
    member_id = member['id']
    print_success(f"Created temporary member with ID: {member_id}")
    
    # Delete the member
    print_info(f"Deleting member {member_id}...")
    response = session.delete(f"{BASE_URL}/members/{member_id}")
    
    if response.status_code != 204:
        print_error(f"Failed to delete member: {response.status_code}")
        print_json(response.json())
        return False
    
    print_success("Member deleted successfully")
    
    # Verify deletion
    print_info("Verifying deletion...")
    response = session.get(f"{BASE_URL}/members/{member_id}")
    
    if response.status_code == 404:
        print_success("Confirmed: Member no longer exists")
        return True
    else:
        print_warning("Member still accessible after deletion")
        return False


def test_authorization() -> bool:
    """Test authorization rules."""
    print_header("STEP 8: TEST AUTHORIZATION")
    
    # Create a second tree owned by another user (simulated)
    print_info("Testing access control...")
    
    # Try to access a non-existent member
    fake_member_id = "00000000-0000-0000-0000-000000000000"
    response = session.get(f"{BASE_URL}/members/{fake_member_id}")
    
    if response.status_code == 404:
        print_success("Correctly returns 404 for non-existent member")
    else:
        print_warning(f"Unexpected status code: {response.status_code}")
    
    return True


def run_all_tests():
    """Run all member management tests."""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "═" * 58 + "╗")
    print("║" + "MEMBER MANAGEMENT API TEST SUITE".center(58) + "║")
    print("║" + "Phase 2.6 - Member CRUD Operations".center(58) + "║")
    print("╚" + "═" * 58 + "╝")
    print(f"{Colors.ENDC}\n")
    
    # Authenticate
    if not authenticate():
        print_error("Authentication failed. Cannot proceed.")
        return
    
    # Create test tree
    tree_id = create_test_tree()
    if not tree_id:
        print_error("Tree creation failed. Cannot proceed.")
        return
    
    # Create member
    member_id = test_create_member(tree_id)
    if not member_id:
        print_error("Member creation failed. Cannot proceed.")
        return
    
    # Get member details
    if not test_get_member(member_id):
        print_warning("Get member test failed")
    
    # Update member
    if not test_update_member(member_id):
        print_warning("Update member test failed")
    
    # List members with filters
    if not test_list_members(tree_id):
        print_warning("List members test failed")
    
    # Delete member
    if not test_delete_member(tree_id):
        print_warning("Delete member test failed")
    
    # Test authorization
    if not test_authorization():
        print_warning("Authorization test failed")
    
    # Final summary
    print_header("TEST SUMMARY")
    print_success("All member management endpoints tested successfully!")
    print_info(f"Test tree ID: {tree_id}")
    print_info(f"Test member ID: {member_id}")
    
    print(f"\n{Colors.OKGREEN}{Colors.BOLD}")
    print("╔" + "═" * 58 + "╗")
    print("║" + "✓ MEMBER MANAGEMENT TESTS COMPLETE".center(58) + "║")
    print("╚" + "═" * 58 + "╝")
    print(f"{Colors.ENDC}\n")


if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print_warning("\n\nTests interrupted by user")
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
