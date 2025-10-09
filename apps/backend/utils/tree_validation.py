"""Tree settings validation utilities.

This module provides validation functions to ensure tree settings changes
don't violate existing relationships and maintain data integrity.
"""

from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from uuid import UUID
import models
from schemas import TreeSettings
import logging

logger = logging.getLogger(__name__)


def validate_settings_change(
    db_session: Session,
    tree_id: UUID,
    current_settings: TreeSettings,
    new_settings: TreeSettings
) -> Tuple[bool, Optional[List[str]]]:
    """Validate that new settings don't violate existing relationships.
    
    This prevents destructive changes like:
    - Disabling polygamy when members have multiple spouses
    - Disabling same-sex unions when such unions exist
    - Disabling single parents when single-parent children exist
    - Reducing max_spouses_per_member below current maximum
    - Reducing max_parents_per_child below current maximum
    
    Args:
        db_session: Database session
        tree_id: UUID of the tree being updated
        current_settings: Current tree settings
        new_settings: Proposed new settings
        
    Returns:
        Tuple of (is_valid, error_messages)
        - is_valid: True if change is safe, False otherwise
        - error_messages: List of specific violation messages if invalid
    """
    errors = []
    
    # Get all members in the tree
    members = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    ).all()
    
    if not members:
        # Empty tree, all changes are safe
        return True, None
    
    # Get all relationships in the tree
    relationships = db_session.query(models.Relationship).filter(
        models.Relationship.tree_id == tree_id
    ).all()
    
    # 1. Check polygamy constraints
    if new_settings.monogamy and not current_settings.monogamy:
        # Trying to enable monogamy (disable polygamy)
        violations = _check_monogamy_violations(members, relationships)
        if violations:
            errors.append(
                f"Cannot enable monogamy: {len(violations)} member(s) have multiple spouses. "
                f"Members affected: {', '.join(violations[:5])}"
                + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
            )
    
    # 2. Check max spouses constraint
    if new_settings.max_spouses_per_member is not None:
        current_max = current_settings.max_spouses_per_member
        if current_max is None or new_settings.max_spouses_per_member < current_max:
            violations = _check_max_spouses_violations(
                members, relationships, new_settings.max_spouses_per_member
            )
            if violations:
                max_found = max(count for _, count in violations)
                errors.append(
                    f"Cannot reduce max_spouses_per_member to {new_settings.max_spouses_per_member}: "
                    f"{len(violations)} member(s) currently have more spouses (up to {max_found}). "
                    f"Members affected: {', '.join(name for name, _ in violations[:5])}"
                    + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
                )
    
    # 3. Check same-sex unions
    if not new_settings.allow_same_sex and current_settings.allow_same_sex:
        violations = _check_same_sex_violations(members, relationships)
        if violations:
            errors.append(
                f"Cannot disable same-sex unions: {len(violations)} same-sex spouse relationship(s) exist. "
                f"Relationships: {', '.join(violations[:5])}"
                + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
            )
    
    # 4. Check single parent constraint
    if not new_settings.allow_single_parent and current_settings.allow_single_parent:
        violations = _check_single_parent_violations(members, relationships)
        if violations:
            errors.append(
                f"Cannot disable single parents: {len(violations)} child(ren) have only one parent. "
                f"Children affected: {', '.join(violations[:5])}"
                + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
            )
    
    # 5. Check multi-parent children constraint
    if not new_settings.allow_multi_parent_children and current_settings.allow_multi_parent_children:
        violations = _check_multi_parent_violations(members, relationships)
        if violations:
            errors.append(
                f"Cannot disable multi-parent children: {len(violations)} child(ren) have more than 2 parents. "
                f"Children affected: {', '.join(violations[:5])}"
                + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
            )
    
    # 6. Check max parents per child constraint
    if new_settings.max_parents_per_child is not None:
        current_max = current_settings.max_parents_per_child
        if current_max is None or new_settings.max_parents_per_child < current_max:
            violations = _check_max_parents_violations(
                members, relationships, new_settings.max_parents_per_child
            )
            if violations:
                max_found = max(count for _, count in violations)
                errors.append(
                    f"Cannot reduce max_parents_per_child to {new_settings.max_parents_per_child}: "
                    f"{len(violations)} child(ren) currently have more parents (up to {max_found}). "
                    f"Children affected: {', '.join(name for name, _ in violations[:5])}"
                    + (f" and {len(violations) - 5} more" if len(violations) > 5 else "")
                )
    
    if errors:
        logger.warning(f"Settings validation failed for tree {tree_id}: {errors}")
        return False, errors
    
    logger.info(f"Settings validation passed for tree {tree_id}")
    return True, None


def _check_monogamy_violations(
    members: List[models.Member],
    relationships: List[models.Relationship]
) -> List[str]:
    """Check for members with multiple spouses."""
    spouse_counts = {}
    
    for rel in relationships:
        if rel.type == 'spouse':
            spouse_counts[rel.a_member_id] = spouse_counts.get(rel.a_member_id, 0) + 1
            spouse_counts[rel.b_member_id] = spouse_counts.get(rel.b_member_id, 0) + 1
    
    # Find members with more than 1 spouse
    violations = []
    member_map = {m.id: m for m in members}
    
    for member_id, count in spouse_counts.items():
        if count > 1:
            member = member_map.get(member_id)
            if member:
                violations.append(member.name)
    
    return violations


def _check_max_spouses_violations(
    members: List[models.Member],
    relationships: List[models.Relationship],
    max_spouses: int
) -> List[Tuple[str, int]]:
    """Check for members exceeding max spouse limit."""
    spouse_counts = {}
    
    for rel in relationships:
        if rel.type == 'spouse':
            spouse_counts[rel.a_member_id] = spouse_counts.get(rel.a_member_id, 0) + 1
            spouse_counts[rel.b_member_id] = spouse_counts.get(rel.b_member_id, 0) + 1
    
    violations = []
    member_map = {m.id: m for m in members}
    
    for member_id, count in spouse_counts.items():
        if count > max_spouses:
            member = member_map.get(member_id)
            if member:
                violations.append((member.name, count))
    
    return violations


def _check_same_sex_violations(
    members: List[models.Member],
    relationships: List[models.Relationship]
) -> List[str]:
    """Check for same-sex spouse relationships."""
    violations = []
    member_map = {m.id: m for m in members}
    
    for rel in relationships:
        if rel.type == 'spouse':
            member_a = member_map.get(rel.a_member_id)
            member_b = member_map.get(rel.b_member_id)
            
            if member_a and member_b:
                # Check if both have gender specified and are the same
                if (member_a.gender and member_b.gender and 
                    member_a.gender.lower() == member_b.gender.lower()):
                    violations.append(f"{member_a.name} & {member_b.name}")
    
    return violations


def _check_single_parent_violations(
    members: List[models.Member],
    relationships: List[models.Relationship]
) -> List[str]:
    """Check for children with only one parent."""
    # Count parents for each child
    parent_counts = {}
    
    for rel in relationships:
        if rel.type == 'parent-child':
            # b_member is the child in parent-child relationships
            child_id = rel.b_member_id
            parent_counts[child_id] = parent_counts.get(child_id, 0) + 1
    
    violations = []
    member_map = {m.id: m for m in members}
    
    for child_id, count in parent_counts.items():
        if count == 1:
            child = member_map.get(child_id)
            if child:
                violations.append(child.name)
    
    return violations


def _check_multi_parent_violations(
    members: List[models.Member],
    relationships: List[models.Relationship]
) -> List[str]:
    """Check for children with more than 2 parents."""
    parent_counts = {}
    
    for rel in relationships:
        if rel.type == 'parent-child':
            child_id = rel.b_member_id
            parent_counts[child_id] = parent_counts.get(child_id, 0) + 1
    
    violations = []
    member_map = {m.id: m for m in members}
    
    for child_id, count in parent_counts.items():
        if count > 2:
            child = member_map.get(child_id)
            if child:
                violations.append(child.name)
    
    return violations


def _check_max_parents_violations(
    members: List[models.Member],
    relationships: List[models.Relationship],
    max_parents: int
) -> List[Tuple[str, int]]:
    """Check for children exceeding max parent limit."""
    parent_counts = {}
    
    for rel in relationships:
        if rel.type == 'parent-child':
            child_id = rel.b_member_id
            parent_counts[child_id] = parent_counts.get(child_id, 0) + 1
    
    violations = []
    member_map = {m.id: m for m in members}
    
    for child_id, count in parent_counts.items():
        if count > max_parents:
            child = member_map.get(child_id)
            if child:
                violations.append((child.name, count))
    
    return violations


def get_settings_change_impact(
    db_session: Session,
    tree_id: UUID,
    current_settings: TreeSettings,
    new_settings: TreeSettings
) -> Dict[str, any]:
    """Get a detailed report of how settings changes would impact the tree.
    
    This is useful for showing users what would be affected before they
    confirm a destructive settings change.
    
    Args:
        db_session: Database session
        tree_id: UUID of the tree
        current_settings: Current settings
        new_settings: Proposed new settings
        
    Returns:
        Dictionary with impact analysis
    """
    # Get all members and relationships
    members = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    ).all()
    
    relationships = db_session.query(models.Relationship).filter(
        models.Relationship.tree_id == tree_id
    ).all()
    
    impact = {
        "total_members": len(members),
        "total_relationships": len(relationships),
        "changes": [],
        "warnings": [],
        "safe": True
    }
    
    # Analyze each setting change
    if new_settings.monogamy != current_settings.monogamy:
        impact["changes"].append({
            "setting": "monogamy",
            "old_value": current_settings.monogamy,
            "new_value": new_settings.monogamy
        })
        if new_settings.monogamy:
            violations = _check_monogamy_violations(members, relationships)
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "monogamy_violation",
                    "count": len(violations),
                    "members": violations[:10]
                })
    
    if new_settings.allow_same_sex != current_settings.allow_same_sex:
        impact["changes"].append({
            "setting": "allow_same_sex",
            "old_value": current_settings.allow_same_sex,
            "new_value": new_settings.allow_same_sex
        })
        if not new_settings.allow_same_sex:
            violations = _check_same_sex_violations(members, relationships)
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "same_sex_violation",
                    "count": len(violations),
                    "relationships": violations[:10]
                })
    
    if new_settings.allow_single_parent != current_settings.allow_single_parent:
        impact["changes"].append({
            "setting": "allow_single_parent",
            "old_value": current_settings.allow_single_parent,
            "new_value": new_settings.allow_single_parent
        })
        if not new_settings.allow_single_parent:
            violations = _check_single_parent_violations(members, relationships)
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "single_parent_violation",
                    "count": len(violations),
                    "children": violations[:10]
                })
    
    if new_settings.allow_multi_parent_children != current_settings.allow_multi_parent_children:
        impact["changes"].append({
            "setting": "allow_multi_parent_children",
            "old_value": current_settings.allow_multi_parent_children,
            "new_value": new_settings.allow_multi_parent_children
        })
        if not new_settings.allow_multi_parent_children:
            violations = _check_multi_parent_violations(members, relationships)
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "multi_parent_violation",
                    "count": len(violations),
                    "children": violations[:10]
                })
    
    if new_settings.max_spouses_per_member != current_settings.max_spouses_per_member:
        impact["changes"].append({
            "setting": "max_spouses_per_member",
            "old_value": current_settings.max_spouses_per_member,
            "new_value": new_settings.max_spouses_per_member
        })
        if (new_settings.max_spouses_per_member is not None and 
            (current_settings.max_spouses_per_member is None or 
             new_settings.max_spouses_per_member < current_settings.max_spouses_per_member)):
            violations = _check_max_spouses_violations(
                members, relationships, new_settings.max_spouses_per_member
            )
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "max_spouses_violation",
                    "count": len(violations),
                    "members": [(name, count) for name, count in violations[:10]]
                })
    
    if new_settings.max_parents_per_child != current_settings.max_parents_per_child:
        impact["changes"].append({
            "setting": "max_parents_per_child",
            "old_value": current_settings.max_parents_per_child,
            "new_value": new_settings.max_parents_per_child
        })
        if (new_settings.max_parents_per_child is not None and 
            (current_settings.max_parents_per_child is None or 
             new_settings.max_parents_per_child < current_settings.max_parents_per_child)):
            violations = _check_max_parents_violations(
                members, relationships, new_settings.max_parents_per_child
            )
            if violations:
                impact["safe"] = False
                impact["warnings"].append({
                    "type": "max_parents_violation",
                    "count": len(violations),
                    "children": [(name, count) for name, count in violations[:10]]
                })
    
    return impact
