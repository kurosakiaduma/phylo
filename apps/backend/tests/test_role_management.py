"""Tests for role management and membership endpoints."""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.main import app
from models import User, Tree, Membership
from utils.test_db import get_test_session, get_test_db_url
from utils.auth import create_access_token
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from uuid import uuid4

# Create test client
client = TestClient(app)

# Test database setup
TEST_DB_URL = get_test_db_url()
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
        session.query(Membership).delete()
        session.query(Tree).delete()
        session.query(User).delete()
        session.commit()
        session.close()


@pytest.fixture
def custodian_user(db_session):
    """Create a custodian user."""
    user = User(
        id=uuid4(),
        email="custodian@example.com",
        display_name="Custodian User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def contributor_user(db_session):
    """Create a contributor user."""
    user = User(
        id=uuid4(),
        email="contributor@example.com",
        display_name="Contributor User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def viewer_user(db_session):
    """Create a viewer user."""
    user = User(
        id=uuid4(),
        email="viewer@example.com",
        display_name="Viewer User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_tree(db_session, custodian_user):
    """Create a test tree with custodian."""
    tree = Tree(
        id=uuid4(),
        name="Test Family Tree",
        description="A test tree",
        settings_json={
            "allow_same_sex": True,
            "monogamy": True,
            "allow_polygamy": False,
            "allow_single_parent": True,
            "allow_multi_parent_children": False,
            "max_parents_per_child": 2
        },
        created_by=custodian_user.id
    )
    db_session.add(tree)
    
    # Add custodian membership
    membership = Membership(
        id=uuid4(),
        user_id=custodian_user.id,
        tree_id=tree.id,
        role="custodian"
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(tree)
    
    return tree


def get_auth_headers(user: User) -> dict:
    """Get authentication headers for a user."""
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}"}


class TestListTreeMemberships:
    """Tests for GET /api/trees/{tree_id}/memberships"""
    
    def test_list_memberships_as_custodian(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Custodian can list all memberships."""
        # Add contributor to tree
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.get(
            f"/api/trees/{test_tree.id}/memberships",
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Custodian + contributor
        
        # Check custodian is in list
        custodian_data = [m for m in data if m["role"] == "custodian"][0]
        assert custodian_data["user_email"] == custodian_user.email
        
        # Check contributor is in list
        contributor_data = [m for m in data if m["role"] == "contributor"][0]
        assert contributor_data["user_email"] == contributor_user.email
    
    def test_list_memberships_as_contributor(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Contributor can also list memberships."""
        # Add contributor to tree
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.get(
            f"/api/trees/{test_tree.id}/memberships",
            headers=get_auth_headers(contributor_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    
    def test_list_memberships_not_a_member(self, db_session, viewer_user, test_tree):
        """Non-member cannot list memberships."""
        response = client.get(
            f"/api/trees/{test_tree.id}/memberships",
            headers=get_auth_headers(viewer_user)
        )
        
        assert response.status_code == 403
        assert "do not have access" in response.json()["detail"]


class TestUpdateMembershipRole:
    """Tests for PATCH /api/memberships/{user_id}/{tree_id}"""
    
    def test_promote_contributor_to_custodian(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Custodian can promote contributor to custodian."""
        # Add contributor to tree
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.patch(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            json={"role": "custodian"},
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "custodian"
        assert data["user_id"] == str(contributor_user.id)
        
        # Verify in database
        updated_membership = db_session.query(Membership).filter(
            Membership.user_id == contributor_user.id,
            Membership.tree_id == test_tree.id
        ).first()
        assert updated_membership.role == "custodian"
    
    def test_demote_custodian_to_contributor(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Can demote custodian when there are multiple custodians."""
        # Add second custodian
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="custodian"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.patch(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            json={"role": "contributor"},
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "contributor"
    
    def test_cannot_remove_last_custodian(
        self, db_session, custodian_user, test_tree
    ):
        """Cannot demote the last custodian."""
        response = client.patch(
            f"/api/memberships/{custodian_user.id}/{test_tree.id}",
            json={"role": "viewer"},
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 400
        assert "last custodian" in response.json()["detail"].lower()
    
    def test_invalid_role(self, db_session, custodian_user, contributor_user, test_tree):
        """Cannot set invalid role."""
        # Add contributor
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.patch(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            json={"role": "admin"},  # Invalid role
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 400
        assert "invalid role" in response.json()["detail"].lower()
    
    def test_contributor_cannot_update_roles(
        self, db_session, custodian_user, contributor_user, viewer_user, test_tree
    ):
        """Contributor cannot update roles (custodian-only)."""
        # Add contributor and viewer
        for user, role in [(contributor_user, "contributor"), (viewer_user, "viewer")]:
            membership = Membership(
                id=uuid4(),
                user_id=user.id,
                tree_id=test_tree.id,
                role=role
            )
            db_session.add(membership)
        db_session.commit()
        
        response = client.patch(
            f"/api/memberships/{viewer_user.id}/{test_tree.id}",
            json={"role": "contributor"},
            headers=get_auth_headers(contributor_user)
        )
        
        assert response.status_code == 403
        assert "custodian" in response.json()["detail"].lower()
    
    def test_update_nonexistent_membership(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Cannot update membership that doesn't exist."""
        response = client.patch(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            json={"role": "custodian"},
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestRemoveMembership:
    """Tests for DELETE /api/memberships/{user_id}/{tree_id}"""
    
    def test_remove_contributor(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Custodian can remove contributor."""
        # Add contributor
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.delete(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 200
        assert "removed successfully" in response.json()["message"]
        
        # Verify membership is gone
        removed = db_session.query(Membership).filter(
            Membership.user_id == contributor_user.id,
            Membership.tree_id == test_tree.id
        ).first()
        assert removed is None
    
    def test_cannot_remove_last_custodian(
        self, db_session, custodian_user, test_tree
    ):
        """Cannot remove the last custodian."""
        response = client.delete(
            f"/api/memberships/{custodian_user.id}/{test_tree.id}",
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 400
        assert "last custodian" in response.json()["detail"].lower()
    
    def test_remove_custodian_when_multiple_exist(
        self, db_session, custodian_user, contributor_user, test_tree
    ):
        """Can remove custodian when there are multiple."""
        # Add second custodian
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="custodian"
        )
        db_session.add(membership)
        db_session.commit()
        
        response = client.delete(
            f"/api/memberships/{contributor_user.id}/{test_tree.id}",
            headers=get_auth_headers(custodian_user)
        )
        
        assert response.status_code == 200
    
    def test_contributor_cannot_remove_members(
        self, db_session, custodian_user, contributor_user, viewer_user, test_tree
    ):
        """Contributor cannot remove members (custodian-only)."""
        # Add contributor and viewer
        for user, role in [(contributor_user, "contributor"), (viewer_user, "viewer")]:
            membership = Membership(
                id=uuid4(),
                user_id=user.id,
                tree_id=test_tree.id,
                role=role
            )
            db_session.add(membership)
        db_session.commit()
        
        response = client.delete(
            f"/api/memberships/{viewer_user.id}/{test_tree.id}",
            headers=get_auth_headers(contributor_user)
        )
        
        assert response.status_code == 403
        assert "custodian" in response.json()["detail"].lower()


class TestPermissionUtilities:
    """Tests for permission utility functions."""
    
    def test_has_role_function(self, db_session, custodian_user, test_tree):
        """Test has_role utility function."""
        from utils.permissions import has_role
        
        # Custodian has custodian role
        assert has_role(custodian_user.id, test_tree.id, "custodian", db_session)
        
        # Custodian also satisfies contributor and viewer
        assert has_role(custodian_user.id, test_tree.id, "contributor", db_session)
        assert has_role(custodian_user.id, test_tree.id, "viewer", db_session)
    
    def test_is_custodian_function(self, db_session, custodian_user, contributor_user, test_tree):
        """Test is_custodian utility function."""
        from utils.permissions import is_custodian
        
        # Add contributor
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="contributor"
        )
        db_session.add(membership)
        db_session.commit()
        
        # Custodian should return True
        assert is_custodian(custodian_user.id, test_tree.id, db_session)
        
        # Contributor should return False
        assert not is_custodian(contributor_user.id, test_tree.id, db_session)
    
    def test_count_custodians_function(self, db_session, custodian_user, contributor_user, test_tree):
        """Test count_custodians utility function."""
        from utils.permissions import count_custodians
        
        # Initially one custodian
        assert count_custodians(test_tree.id, db_session) == 1
        
        # Add second custodian
        membership = Membership(
            id=uuid4(),
            user_id=contributor_user.id,
            tree_id=test_tree.id,
            role="custodian"
        )
        db_session.add(membership)
        db_session.commit()
        
        assert count_custodians(test_tree.id, db_session) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
