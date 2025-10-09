"""Test tree settings validation logic.

Run with: pytest test_tree_validation.py -v
"""

import pytest
from uuid import uuid4
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mock imports for testing
class MockMember:
    def __init__(self, id, tree_id, name, gender=None):
        self.id = id
        self.tree_id = tree_id
        self.name = name
        self.gender = gender


class MockRelationship:
    def __init__(self, id, tree_id, type, a_member_id, b_member_id):
        self.id = id
        self.tree_id = tree_id
        self.type = type
        self.a_member_id = a_member_id
        self.b_member_id = b_member_id


def test_monogamy_violation_detection():
    """Test detection of monogamy violations."""
    from utils.tree_validation import _check_monogamy_violations
    
    # Setup: Member with multiple spouses
    member1 = MockMember(uuid4(), uuid4(), "John Smith")
    member2 = MockMember(uuid4(), member1.tree_id, "Wife 1")
    member3 = MockMember(uuid4(), member1.tree_id, "Wife 2")
    
    members = [member1, member2, member3]
    
    relationships = [
        MockRelationship(uuid4(), member1.tree_id, 'spouse', member1.id, member2.id),
        MockRelationship(uuid4(), member1.tree_id, 'spouse', member1.id, member3.id),
    ]
    
    violations = _check_monogamy_violations(members, relationships)
    
    assert len(violations) > 0
    assert "John Smith" in violations
    print(f"✓ Monogamy violations detected: {violations}")


def test_same_sex_violation_detection():
    """Test detection of same-sex union violations."""
    from utils.tree_validation import _check_same_sex_violations
    
    # Setup: Same-sex couple
    alice = MockMember(uuid4(), uuid4(), "Alice", gender="female")
    amy = MockMember(uuid4(), alice.tree_id, "Amy", gender="female")
    
    members = [alice, amy]
    
    relationships = [
        MockRelationship(uuid4(), alice.tree_id, 'spouse', alice.id, amy.id),
    ]
    
    violations = _check_same_sex_violations(members, relationships)
    
    assert len(violations) > 0
    assert "Alice & Amy" in violations[0]
    print(f"✓ Same-sex violations detected: {violations}")


def test_single_parent_violation_detection():
    """Test detection of single parent violations."""
    from utils.tree_validation import _check_single_parent_violations
    
    # Setup: Child with one parent
    parent = MockMember(uuid4(), uuid4(), "Single Parent")
    child = MockMember(uuid4(), parent.tree_id, "Child")
    
    members = [parent, child]
    
    relationships = [
        MockRelationship(uuid4(), parent.tree_id, 'parent-child', parent.id, child.id),
    ]
    
    violations = _check_single_parent_violations(members, relationships)
    
    assert len(violations) > 0
    assert "Child" in violations
    print(f"✓ Single parent violations detected: {violations}")


def test_multi_parent_violation_detection():
    """Test detection of multi-parent violations."""
    from utils.tree_validation import _check_multi_parent_violations
    
    # Setup: Child with 3 parents
    tree_id = uuid4()
    parent1 = MockMember(uuid4(), tree_id, "Parent 1")
    parent2 = MockMember(uuid4(), tree_id, "Parent 2")
    parent3 = MockMember(uuid4(), tree_id, "Parent 3")
    child = MockMember(uuid4(), tree_id, "Child with 3 parents")
    
    members = [parent1, parent2, parent3, child]
    
    relationships = [
        MockRelationship(uuid4(), tree_id, 'parent-child', parent1.id, child.id),
        MockRelationship(uuid4(), tree_id, 'parent-child', parent2.id, child.id),
        MockRelationship(uuid4(), tree_id, 'parent-child', parent3.id, child.id),
    ]
    
    violations = _check_multi_parent_violations(members, relationships)
    
    assert len(violations) > 0
    assert "Child with 3 parents" in violations
    print(f"✓ Multi-parent violations detected: {violations}")


def test_max_spouses_violation_detection():
    """Test detection of max spouses violations."""
    from utils.tree_validation import _check_max_spouses_violations
    
    # Setup: Member with 4 spouses
    tree_id = uuid4()
    king = MockMember(uuid4(), tree_id, "King Henry")
    spouse1 = MockMember(uuid4(), tree_id, "Spouse 1")
    spouse2 = MockMember(uuid4(), tree_id, "Spouse 2")
    spouse3 = MockMember(uuid4(), tree_id, "Spouse 3")
    spouse4 = MockMember(uuid4(), tree_id, "Spouse 4")
    
    members = [king, spouse1, spouse2, spouse3, spouse4]
    
    relationships = [
        MockRelationship(uuid4(), tree_id, 'spouse', king.id, spouse1.id),
        MockRelationship(uuid4(), tree_id, 'spouse', king.id, spouse2.id),
        MockRelationship(uuid4(), tree_id, 'spouse', king.id, spouse3.id),
        MockRelationship(uuid4(), tree_id, 'spouse', king.id, spouse4.id),
    ]
    
    max_spouses = 2
    violations = _check_max_spouses_violations(members, relationships, max_spouses)
    
    assert len(violations) > 0
    assert any(name == "King Henry" and count == 4 for name, count in violations)
    print(f"✓ Max spouses violations detected: {violations}")


def test_max_parents_violation_detection():
    """Test detection of max parents violations."""
    from utils.tree_validation import _check_max_parents_violations
    
    # Setup: Child with 4 parents
    tree_id = uuid4()
    parents = [MockMember(uuid4(), tree_id, f"Parent {i}") for i in range(1, 5)]
    child = MockMember(uuid4(), tree_id, "Shared custody child")
    
    members = parents + [child]
    
    relationships = [
        MockRelationship(uuid4(), tree_id, 'parent-child', parent.id, child.id)
        for parent in parents
    ]
    
    max_parents = 2
    violations = _check_max_parents_violations(members, relationships, max_parents)
    
    assert len(violations) > 0
    assert any(name == "Shared custody child" and count == 4 for name, count in violations)
    print(f"✓ Max parents violations detected: {violations}")


def test_no_violations_on_empty_tree():
    """Test that empty trees have no violations."""
    from utils.tree_validation import (
        _check_monogamy_violations,
        _check_same_sex_violations,
        _check_single_parent_violations,
    )
    
    members = []
    relationships = []
    
    assert len(_check_monogamy_violations(members, relationships)) == 0
    assert len(_check_same_sex_violations(members, relationships)) == 0
    assert len(_check_single_parent_violations(members, relationships)) == 0
    
    print("✓ Empty tree has no violations")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Tree Settings Validation Tests")
    print("="*60 + "\n")
    
    test_monogamy_violation_detection()
    test_same_sex_violation_detection()
    test_single_parent_violation_detection()
    test_multi_parent_violation_detection()
    test_max_spouses_violation_detection()
    test_max_parents_violation_detection()
    test_no_violations_on_empty_tree()
    
    print("\n" + "="*60)
    print("✅ All tests passed!")
    print("="*60 + "\n")
