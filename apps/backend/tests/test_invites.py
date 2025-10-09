"""Tests for invitation system (Phase 2.8).

Tests:
1. Send invite (custodian-only)
2. Resend invite
3. View invite details (public)
4. Accept invite
5. List tree invites
6. Cancel invite
7. Expiry validation
8. Authorization checks
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from uuid import uuid4
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.main import app
from models import User, Tree, Membership, Invite
from utils.test_db import get_test_session, get_test_db_url
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create test client
client = TestClient(app)

# Test database setup
TEST_DB_URL = get_test_db_url()
test_engine = create_engine(TEST_DB_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def test_db():
    """Create a test database session."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        # Cleanup
        session.query(Invite).delete()
        session.query(Membership).delete()
        session.query(Tree).delete()
        session.query(User).delete()
        session.commit()
        session.close()


@pytest.fixture
def test_users(test_db):
    """Create test users with authentication tokens."""
    # Custodian user
    custodian = User(
        id=uuid4(),
        email="custodian@test.com",
        display_name="Custodian User"
    )
    test_db.add(custodian)
    
    # Contributor user
    contributor = User(
        id=uuid4(),
        email="contributor@test.com",
        display_name="Contributor User"
    )
    test_db.add(contributor)
    
    # Invitee user (will accept invite)
    invitee = User(
        id=uuid4(),
        email="invitee@test.com",
        display_name="Invitee User"
    )
    test_db.add(invitee)
    
    test_db.commit()
    test_db.refresh(custodian)
    test_db.refresh(contributor)
    test_db.refresh(invitee)
    
    # Generate tokens (simplified - in real tests you'd use auth flow)
    from utils.auth import create_access_token
    
    custodian_token = create_access_token({"sub": str(custodian.id), "email": custodian.email})
    contributor_token = create_access_token({"sub": str(contributor.id), "email": contributor.email})
    invitee_token = create_access_token({"sub": str(invitee.id), "email": invitee.email})
    
    return {
        "custodian": (custodian, custodian_token),
        "contributor": (contributor, contributor_token),
        "invitee": (invitee, invitee_token)
    }


@pytest.fixture
def test_tree(test_db, test_users):
    """Create a test tree with memberships."""
    custodian, _ = test_users["custodian"]
    contributor, _ = test_users["contributor"]
    
    tree = Tree(
        id=uuid4(),
        name="Test Family Tree",
        description="A test family tree for invitation testing",
        created_by=custodian.id
    )
    test_db.add(tree)
    test_db.commit()
    test_db.refresh(tree)
    
    # Add custodian membership
    custodian_membership = Membership(
        user_id=custodian.id,
        tree_id=tree.id,
        role="custodian"
    )
    test_db.add(custodian_membership)
    
    # Add contributor membership
    contributor_membership = Membership(
        user_id=contributor.id,
        tree_id=tree.id,
        role="contributor"
    )
    test_db.add(contributor_membership)
    
    test_db.commit()
    
    return tree


def test_send_invite_success(test_db, test_tree, test_users):
    """Test 1: Send invitation successfully (custodian)."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    invite_data = {
        "tree_id": str(tree.id),
        "email": "newuser@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "viewer"
    assert data["tree_id"] == str(tree.id)
    assert "token" in data
    assert "expires_at" in data
    assert data["accepted_at"] is None
    
    # Verify invite in database
    invite = test_db.query(Invite).filter(Invite.token == data["token"]).first()
    assert invite is not None
    assert invite.email == "newuser@test.com"


def test_send_invite_non_custodian_fails(test_db, test_tree, test_users):
    """Test 2: Non-custodian cannot send invites."""
    tree = test_tree
    contributor, contributor_token = test_users["contributor"]
    
    invite_data = {
        "tree_id": str(tree.id),
        "email": "newuser@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": contributor_token}
    )
    
    assert response.status_code == 403
    assert "custodian" in response.json()["detail"].lower()


def test_send_invite_already_member_fails(test_db, test_tree, test_users):
    """Test 3: Cannot invite existing member."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    contributor, _ = test_users["contributor"]
    
    invite_data = {
        "tree_id": str(tree.id),
        "email": contributor.email,  # Already a member
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 400
    assert "already a member" in response.json()["detail"].lower()


def test_send_invite_duplicate_active_fails(test_db, test_tree, test_users):
    """Test 4: Cannot send duplicate active invite."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    invite_data = {
        "tree_id": str(tree.id),
        "email": "newuser@test.com",
        "role": "viewer"
    }
    
    # Send first invite
    response1 = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    assert response1.status_code == 201
    
    # Try to send duplicate
    response2 = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    assert response2.status_code == 409
    assert "already exists" in response2.json()["detail"].lower()


def test_view_invite_success(test_db, test_tree, test_users):
    """Test 5: View invite details (public endpoint)."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    # Create invite
    invite_data = {
        "tree_id": str(tree.id),
        "email": "newuser@test.com",
        "role": "contributor"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # View invite (no auth required)
    response = client.get(f"/api/invites/{token}")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "contributor"
    assert data["tree_name"] == tree.name
    assert data["tree_description"] == tree.description
    assert "inviter_name" in data


def test_view_invite_expired_fails(test_db, test_tree, test_users):
    """Test 6: Cannot view expired invite."""
    tree = test_tree
    custodian, _ = test_users["custodian"]
    
    # Create expired invite directly in database
    expired_invite = Invite(
        id=uuid4(),
        tree_id=tree.id,
        email="expired@test.com",
        role="viewer",
        token="expired-token-12345",
        expires_at=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
    )
    test_db.add(expired_invite)
    test_db.commit()
    
    response = client.get(f"/api/invites/{expired_invite.token}")
    
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_accept_invite_success(test_db, test_tree, test_users):
    """Test 7: Accept invitation successfully."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    invitee, invitee_token = test_users["invitee"]
    
    # Create invite for invitee
    invite_data = {
        "tree_id": str(tree.id),
        "email": invitee.email,
        "role": "contributor"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # Accept invite
    response = client.post(
        f"/api/invites/{token}/accept",
        cookies={"access_token": invitee_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["user_email"] == invitee.email
    assert data["role"] == "contributor"
    
    # Verify membership created
    membership = test_db.query(Membership).filter(
        Membership.user_id == invitee.id,
        Membership.tree_id == tree.id
    ).first()
    
    assert membership is not None
    assert membership.role == "contributor"
    
    # Verify invite marked as accepted
    invite = test_db.query(Invite).filter(Invite.token == token).first()
    assert invite.accepted_at is not None


def test_accept_invite_wrong_email_fails(test_db, test_tree, test_users):
    """Test 8: Cannot accept invite with wrong email."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    contributor, contributor_token = test_users["contributor"]
    
    # Create invite for different email
    invite_data = {
        "tree_id": str(tree.id),
        "email": "different@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # Try to accept with wrong user
    response = client.post(
        f"/api/invites/{token}/accept",
        cookies={"access_token": contributor_token}  # Wrong user
    )
    
    assert response.status_code == 400
    assert "invitation is for" in response.json()["detail"].lower()


def test_resend_invite_success(test_db, test_tree, test_users):
    """Test 9: Resend invitation successfully."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    # Create invite
    invite_data = {
        "tree_id": str(tree.id),
        "email": "newuser@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # Resend invite
    response = client.post(
        f"/api/invites/{token}/resend",
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["email"] == "newuser@test.com"
    assert data["token"] == token  # Same token for non-expired


def test_resend_expired_creates_new(test_db, test_tree, test_users):
    """Test 10: Resending expired invite creates new invite."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    # Create expired invite
    expired_invite = Invite(
        id=uuid4(),
        tree_id=tree.id,
        email="expired@test.com",
        role="viewer",
        token="expired-token-12345",
        expires_at=datetime.utcnow() - timedelta(days=1)
    )
    test_db.add(expired_invite)
    test_db.commit()
    
    old_token = expired_invite.token
    
    # Resend expired invite
    response = client.post(
        f"/api/invites/{old_token}/resend",
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["email"] == "expired@test.com"
    assert data["token"] != old_token  # New token generated
    assert data["expires_at"] > datetime.utcnow().isoformat()  # New expiry


def test_list_tree_invites_success(test_db, test_tree, test_users):
    """Test 11: List all invites for a tree."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    # Create multiple invites
    for i in range(3):
        invite_data = {
            "tree_id": str(tree.id),
            "email": f"user{i}@test.com",
            "role": "viewer"
        }
        client.post(
            "/api/invites",
            json=invite_data,
            cookies={"access_token": custodian_token}
        )
    
    # List invites
    response = client.get(
        f"/api/trees/{tree.id}/invites",
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 3
    assert all(invite["tree_id"] == str(tree.id) for invite in data)


def test_cancel_invite_success(test_db, test_tree, test_users):
    """Test 12: Cancel invitation successfully."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    
    # Create invite
    invite_data = {
        "tree_id": str(tree.id),
        "email": "cancel@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # Cancel invite
    response = client.delete(
        f"/api/invites/{token}",
        cookies={"access_token": custodian_token}
    )
    
    assert response.status_code == 204
    
    # Verify invite deleted
    invite = test_db.query(Invite).filter(Invite.token == token).first()
    assert invite is None


def test_cancel_invite_non_custodian_fails(test_db, test_tree, test_users):
    """Test 13: Non-custodian cannot cancel invites."""
    tree = test_tree
    custodian, custodian_token = test_users["custodian"]
    contributor, contributor_token = test_users["contributor"]
    
    # Create invite as custodian
    invite_data = {
        "tree_id": str(tree.id),
        "email": "cancel@test.com",
        "role": "viewer"
    }
    
    response = client.post(
        "/api/invites",
        json=invite_data,
        cookies={"access_token": custodian_token}
    )
    
    token = response.json()["token"]
    
    # Try to cancel as contributor
    response = client.delete(
        f"/api/invites/{token}",
        cookies={"access_token": contributor_token}
    )
    
    assert response.status_code == 403


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
