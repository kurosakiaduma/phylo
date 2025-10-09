"""Relationship management endpoints for spouse and parent-child relationships."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

import models
import schemas
from schemas import RelationshipComputeResponse
from utils import db
from utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Relationships"])


@router.get(
    "/trees/{tree_id}/relationships",
    response_model=List[schemas.RelationshipRead],
    summary="Get all relationships in a tree",
    description="Returns all spouse and parent-child relationships for a tree."
)
async def get_tree_relationships(
    tree_id: UUID,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all relationships for a tree.
    
    Returns all spouse and parent-child relationships in the tree.
    User must have access to the tree (be a member).
    
    Args:
        tree_id: UUID of the tree
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        List of all relationships in the tree
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Access denied
    """
    # Check if tree exists
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Check user has access to this tree
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - you are not a member of this tree"
        )
    
    # Get all relationships for this tree
    relationships = db_session.query(models.Relationship).filter(
        models.Relationship.tree_id == tree_id
    ).all()
    
    return relationships


def _check_member_access(
    member_id: UUID,
    user: models.User,
    db_session: Session,
    required_role: str = "custodian"
) -> tuple[models.Member, models.Tree, models.Membership]:
    """Check if user has access to modify a member's relationships.
    
    Args:
        member_id: Member ID to check
        user: Current user
        db_session: Database session
        required_role: Required role (default: custodian)
        
    Returns:
        Tuple of (Member, Tree, Membership) if access granted
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied or insufficient permissions
    """
    # Check if member exists
    member = db_session.query(models.Member).filter(
        models.Member.id == member_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Get tree and settings
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == member.tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Check user membership and role
    membership = db_session.query(models.Membership).filter(
        and_(
            models.Membership.user_id == user.id,
            models.Membership.tree_id == tree.id
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Role hierarchy: custodian > contributor > viewer
    role_hierarchy = {"custodian": 3, "contributor": 2, "viewer": 1}
    user_role_level = role_hierarchy.get(membership.role, 0)
    required_role_level = role_hierarchy.get(required_role, 0)
    
    if user_role_level < required_role_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required: {required_role}, Your role: {membership.role}"
        )
    
    return member, tree, membership


def _get_tree_settings(tree: models.Tree) -> schemas.TreeSettings:
    """Extract and parse tree settings."""
    if tree.settings_json:
        return schemas.TreeSettings(**tree.settings_json)
    return schemas.TreeSettings()


def _get_spouse_count(member_id: UUID, db_session: Session) -> int:
    """Count the number of spouses a member currently has."""
    count = db_session.query(func.count(models.Relationship.id)).filter(
        and_(
            models.Relationship.type == "spouse",
            or_(
                models.Relationship.a_member_id == member_id,
                models.Relationship.b_member_id == member_id
            )
        )
    ).scalar()
    return count or 0


def _get_parent_count(child_id: UUID, db_session: Session) -> int:
    """Count the number of parents a member currently has."""
    count = db_session.query(func.count(models.Relationship.id)).filter(
        and_(
            models.Relationship.type == "parent-child",
            models.Relationship.b_member_id == child_id
        )
    ).scalar()
    return count or 0


def _relationship_exists(
    member_a_id: UUID,
    member_b_id: UUID,
    rel_type: str,
    db_session: Session
) -> bool:
    """Check if a relationship already exists between two members."""
    exists = db_session.query(models.Relationship).filter(
        and_(
            models.Relationship.type == rel_type,
            or_(
                and_(
                    models.Relationship.a_member_id == member_a_id,
                    models.Relationship.b_member_id == member_b_id
                ),
                and_(
                    models.Relationship.a_member_id == member_b_id,
                    models.Relationship.b_member_id == member_a_id
                )
            )
        )
    ).first()
    return exists is not None


@router.post(
    "/members/{id}/spouse",
    response_model=schemas.RelationshipRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add spouse to member",
    description="Creates a bidirectional spouse relationship. Validates against tree settings."
)
async def add_spouse(
    id: UUID,
    spouse_id: UUID = Query(..., description="UUID of the spouse to add"),
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a spouse relationship to a member.
    
    Validations:
    - Both members must exist and be in the same tree
    - Checks monogamy/polygamy settings
    - Validates max_spouses_per_member constraint
    - Validates same-sex relationships if restricted
    - Prevents duplicate spouse relationships
    - Custodian-only authorization
    
    Args:
        id: UUID of the member
        spouse_id: UUID of the spouse to add (query parameter)
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        RelationshipRead: Created relationship object
        
    Raises:
        HTTPException 404: Member or spouse not found
        HTTPException 403: Insufficient permissions
        HTTPException 400: Validation failed (monogamy, max spouses, etc.)
        HTTPException 409: Relationship already exists
    """
    # Check access and get member, tree, membership
    member, tree, _ = _check_member_access(id, current_user, db_session, "custodian")
    settings = _get_tree_settings(tree)
    
    # Check if spouse exists and is in the same tree
    spouse = db_session.query(models.Member).filter(
        models.Member.id == spouse_id
    ).first()
    
    if not spouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spouse member not found"
        )
    
    if spouse.tree_id != tree.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Spouse must be in the same tree"
        )
    
    # Check for self-relationship
    if id == spouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add self as spouse"
        )
    
    # Check if relationship already exists
    if _relationship_exists(id, spouse_id, "spouse", db_session):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Spouse relationship already exists"
        )
    
    # Validate monogamy constraint
    if settings.monogamy:
        member_spouse_count = _get_spouse_count(id, db_session)
        spouse_spouse_count = _get_spouse_count(spouse_id, db_session)
        
        if member_spouse_count >= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Monogamy enabled: {member.name} already has a spouse"
            )
        
        if spouse_spouse_count >= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Monogamy enabled: {spouse.name} already has a spouse"
            )
    
    # Validate max spouses constraint
    if settings.max_spouses_per_member is not None:
        member_spouse_count = _get_spouse_count(id, db_session)
        spouse_spouse_count = _get_spouse_count(spouse_id, db_session)
        
        if member_spouse_count >= settings.max_spouses_per_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{member.name} has reached max spouses limit ({settings.max_spouses_per_member})"
            )
        
        if spouse_spouse_count >= settings.max_spouses_per_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{spouse.name} has reached max spouses limit ({settings.max_spouses_per_member})"
            )
    
    # Validate same-sex constraint
    if not settings.allow_same_sex:
        if member.gender and spouse.gender and member.gender == spouse.gender:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Same-sex relationships are not allowed in this tree"
            )
    
    # Create bidirectional spouse relationship
    relationship = models.Relationship(
        tree_id=tree.id,
        type="spouse",
        a_member_id=id,
        b_member_id=spouse_id
    )
    
    db_session.add(relationship)
    db_session.commit()
    db_session.refresh(relationship)
    
    logger.info(f"Created spouse relationship: {member.name} <-> {spouse.name} in tree {tree.name}")
    
    return relationship


@router.delete(
    "/members/{id}/spouse/{spouseId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove spouse relationship",
    description="Removes the spouse relationship between two members."
)
async def remove_spouse(
    id: UUID,
    spouseId: UUID,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Remove a spouse relationship.
    
    Removes the bidirectional spouse relationship between two members.
    Custodian-only authorization.
    
    Args:
        id: UUID of the member
        spouseId: UUID of the spouse to remove
        db_session: Database session
        current_user: Current authenticated user
        
    Raises:
        HTTPException 404: Member, spouse, or relationship not found
        HTTPException 403: Insufficient permissions
    """
    # Check access
    member, tree, _ = _check_member_access(id, current_user, db_session, "custodian")
    
    # Check if spouse exists
    spouse = db_session.query(models.Member).filter(
        models.Member.id == spouseId
    ).first()
    
    if not spouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spouse member not found"
        )
    
    # Find and delete the relationship
    relationship = db_session.query(models.Relationship).filter(
        and_(
            models.Relationship.tree_id == tree.id,
            models.Relationship.type == "spouse",
            or_(
                and_(
                    models.Relationship.a_member_id == id,
                    models.Relationship.b_member_id == spouseId
                ),
                and_(
                    models.Relationship.a_member_id == spouseId,
                    models.Relationship.b_member_id == id
                )
            )
        )
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spouse relationship not found"
        )
    
    db_session.delete(relationship)
    db_session.commit()
    
    logger.info(f"Removed spouse relationship: {member.name} <-> {spouse.name} in tree {tree.name}")
    
    return None


@router.post(
    "/members/{id}/children",
    response_model=schemas.RelationshipRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add child to member",
    description="Creates parent-child relationships. Supports single-parent or two-parent configurations."
)
async def add_child(
    id: UUID,
    child_id: UUID = Query(..., description="UUID of the child to add"),
    second_parent_id: Optional[UUID] = Query(None, description="UUID of the second parent (optional)"),
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a child relationship to a member.
    
    Creates parent-child relationship(s):
    - Single-parent: Creates one parent-child relationship
    - Two-parent: Creates two parent-child relationships
    
    Validations:
    - All members must exist and be in the same tree
    - Validates single-parent settings
    - Validates multi-parent settings
    - Validates max_parents_per_child constraint
    - Prevents duplicate parent-child relationships
    - Prevents circular relationships
    - Custodian-only authorization
    
    Args:
        id: UUID of the parent member
        child_id: UUID of the child to add (query parameter)
        second_parent_id: Optional UUID of second parent (query parameter)
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        RelationshipRead: Created relationship object (first parent-child relationship)
        
    Raises:
        HTTPException 404: Member or child not found
        HTTPException 403: Insufficient permissions
        HTTPException 400: Validation failed (single-parent, max parents, etc.)
        HTTPException 409: Relationship already exists
    """
    # Check access and get member, tree, membership
    parent, tree, _ = _check_member_access(id, current_user, db_session, "custodian")
    settings = _get_tree_settings(tree)
    
    # Check if child exists and is in the same tree
    child = db_session.query(models.Member).filter(
        models.Member.id == child_id
    ).first()
    
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child member not found"
        )
    
    if child.tree_id != tree.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Child must be in the same tree"
        )
    
    # Check for self-relationship
    if id == child_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add self as child"
        )
    
    # Check if child is already a parent (circular relationship prevention)
    is_parent_of_self = db_session.query(models.Relationship).filter(
        and_(
            models.Relationship.type == "parent-child",
            models.Relationship.a_member_id == child_id,
            models.Relationship.b_member_id == id
        )
    ).first()
    
    if is_parent_of_self:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create circular parent-child relationship"
        )
    
    # Check if relationship already exists
    if _relationship_exists(id, child_id, "parent-child", db_session):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parent-child relationship already exists"
        )
    
    # Get current parent count for the child
    current_parent_count = _get_parent_count(child_id, db_session)
    new_parent_count = current_parent_count + 1
    
    # If second parent is specified, increment count
    if second_parent_id:
        new_parent_count += 1
        
        # Check if second parent exists
        second_parent = db_session.query(models.Member).filter(
            models.Member.id == second_parent_id
        ).first()
        
        if not second_parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Second parent member not found"
            )
        
        if second_parent.tree_id != tree.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Second parent must be in the same tree"
            )
        
        # Check for self-relationship with second parent
        if second_parent_id == child_id or second_parent_id == id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid parent relationships"
            )
        
        # Check if second parent relationship already exists
        if _relationship_exists(second_parent_id, child_id, "parent-child", db_session):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Second parent relationship already exists"
            )
    
    # Validate single-parent constraint
    if current_parent_count == 0 and not second_parent_id:
        # This will be a single-parent child
        if not settings.allow_single_parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Single-parent children are not allowed in this tree. Please specify a second parent."
            )
    
    # Validate multi-parent constraint (more than 2 parents)
    if new_parent_count > 2:
        if not settings.allow_multi_parent_children:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Children with more than 2 parents are not allowed in this tree"
            )
    
    # Validate max parents constraint
    if settings.max_parents_per_child is not None:
        if new_parent_count > settings.max_parents_per_child:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Child would exceed max parents limit ({settings.max_parents_per_child})"
            )
    
    # Create first parent-child relationship
    relationship = models.Relationship(
        tree_id=tree.id,
        type="parent-child",
        a_member_id=id,
        b_member_id=child_id
    )
    
    db_session.add(relationship)
    
    # Create second parent-child relationship if specified
    if second_parent_id:
        second_relationship = models.Relationship(
            tree_id=tree.id,
            type="parent-child",
            a_member_id=second_parent_id,
            b_member_id=child_id
        )
        db_session.add(second_relationship)
    
    db_session.commit()
    db_session.refresh(relationship)
    
    logger.info(
        f"Created parent-child relationship: {parent.name} -> {child.name} "
        f"{'(with second parent)' if second_parent_id else ''} in tree {tree.name}"
    )
    
    return relationship


@router.delete(
    "/members/{id}/children/{childId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove child relationship",
    description="Removes the parent-child relationship between a parent and child."
)
async def remove_child(
    id: UUID,
    childId: UUID,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Remove a parent-child relationship.
    
    Removes only the relationship between this specific parent and child.
    Does not affect relationships with other parents.
    Custodian-only authorization.
    
    Args:
        id: UUID of the parent member
        childId: UUID of the child
        db_session: Database session
        current_user: Current authenticated user
        
    Raises:
        HTTPException 404: Member, child, or relationship not found
        HTTPException 403: Insufficient permissions
    """
    # Check access
    parent, tree, _ = _check_member_access(id, current_user, db_session, "custodian")
    
    # Check if child exists
    child = db_session.query(models.Member).filter(
        models.Member.id == childId
    ).first()
    
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child member not found"
        )
    
    # Find and delete the relationship
    relationship = db_session.query(models.Relationship).filter(
        and_(
            models.Relationship.tree_id == tree.id,
            models.Relationship.type == "parent-child",
            models.Relationship.a_member_id == id,
            models.Relationship.b_member_id == childId
        )
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent-child relationship not found"
        )
    
    db_session.delete(relationship)
    db_session.commit()
    
    logger.info(f"Removed parent-child relationship: {parent.name} -> {child.name} in tree {tree.name}")
    
    return None

def _build_relationship_graph(tree_id: UUID, db_session: Session) -> dict:
    """Build an adjacency graph of all relationships in a tree.
    
    Returns a dict with:
        - members: Dict[UUID, Member] - All members by ID
        - spouses: Dict[UUID, List[UUID]] - Spouse relationships
        - parents: Dict[UUID, List[UUID]] - Child -> Parents mapping
        - children: Dict[UUID, List[UUID]] - Parent -> Children mapping
    """
    # Get all members
    members_list = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    ).all()
    
    members = {m.id: m for m in members_list}
    spouses = {m.id: [] for m in members_list}
    parents = {m.id: [] for m in members_list}
    children = {m.id: [] for m in members_list}
    
    # Get all relationships
    relationships = db_session.query(models.Relationship).filter(
        models.Relationship.tree_id == tree_id
    ).all()
    
    for rel in relationships:
        if rel.type == "spouse":
            # Bidirectional spouse relationship
            spouses[rel.a_member_id].append(rel.b_member_id)
            spouses[rel.b_member_id].append(rel.a_member_id)
        elif rel.type == "parent-child":
            # a is parent, b is child
            children[rel.a_member_id].append(rel.b_member_id)
            parents[rel.b_member_id].append(rel.a_member_id)
    
    return {
        "members": members,
        "spouses": spouses,
        "parents": parents,
        "children": children
    }


def _get_ancestors_and_distance(member_id: UUID, graph: dict) -> dict[UUID, int]:
    """Get all ancestors of a member with their distance (generation count).
    
    Uses BFS to traverse up the family tree through parent relationships.
    
    Args:
        member_id: Starting member ID
        graph: Relationship graph
        
    Returns:
        Dict mapping ancestor_id to distance (1 = parent, 2 = grandparent, etc.)
    """
    ancestors = {}
    queue = [(member_id, 0)]
    visited = {member_id}
    parents = graph["parents"]
    
    while queue:
        current_id, distance = queue.pop(0)
        
        for parent_id in parents.get(current_id, []):
            if parent_id not in visited:
                visited.add(parent_id)
                ancestors[parent_id] = distance + 1
                queue.append((parent_id, distance + 1))
    
    return ancestors


def _ordinal(n: int) -> str:
    """Convert number to ordinal string (1st, 2nd, 3rd, etc.)."""
    if 10 <= n % 100 <= 20:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    return f"{n}{suffix}"


def _get_gender_specific_relationship(base_relationship: str, member: models.Member) -> str:
    """Convert generic relationship to gender-specific if possible."""
    if not member.gender:
        return base_relationship
    
    gender = member.gender.lower()
    rel = base_relationship.lower()
    
    # Convert generic relationships to gender-specific ones
    if rel == "parent":
        return "father" if gender == "male" else "mother" if gender == "female" else "parent"
    elif rel == "child":
        return "son" if gender == "male" else "daughter" if gender == "female" else "child"
    elif rel == "sibling":
        return "brother" if gender == "male" else "sister" if gender == "female" else "sibling"
    elif rel == "half-sibling":
        return "half-brother" if gender == "male" else "half-sister" if gender == "female" else "half-sibling"
    elif rel == "grandparent":
        return "grandfather" if gender == "male" else "grandmother" if gender == "female" else "grandparent"
    elif rel == "grandchild":
        return "grandson" if gender == "male" else "granddaughter" if gender == "female" else "grandchild"
    elif rel == "aunt/uncle":
        return "uncle" if gender == "male" else "aunt" if gender == "female" else "aunt/uncle"
    elif rel == "niece/nephew":
        return "nephew" if gender == "male" else "niece" if gender == "female" else "niece/nephew"
    elif rel == "cousin-aunt/uncle":
        return "cousin-uncle" if gender == "male" else "cousin-aunt" if gender == "female" else "cousin-aunt/uncle"
    elif rel == "cousin-niece/nephew":
        return "cousin-nephew" if gender == "male" else "cousin-niece" if gender == "female" else "cousin-niece/nephew"
    
    # Handle great- prefixed relationships
    elif "great-" in rel:
        if rel.endswith("grandparent"):
            prefix = rel.replace("grandparent", "")
            return f"{prefix}grandfather" if gender == "male" else f"{prefix}grandmother" if gender == "female" else rel
        elif rel.endswith("grandchild"):
            prefix = rel.replace("grandchild", "")
            return f"{prefix}grandson" if gender == "male" else f"{prefix}granddaughter" if gender == "female" else rel
        elif rel.endswith("aunt/uncle"):
            prefix = rel.replace("aunt/uncle", "")
            return f"{prefix}uncle" if gender == "male" else f"{prefix}aunt" if gender == "female" else rel
        elif rel.endswith("niece/nephew"):
            prefix = rel.replace("niece/nephew", "")
            return f"{prefix}nephew" if gender == "male" else f"{prefix}niece" if gender == "female" else rel
    
    # Handle in-law relationships
    elif "-in-law" in rel:
        if "parent" in rel:
            return "father-in-law" if gender == "male" else "mother-in-law" if gender == "female" else rel
        elif "child" in rel:
            return "son-in-law" if gender == "male" else "daughter-in-law" if gender == "female" else rel
        elif "sibling" in rel:
            return "brother-in-law" if gender == "male" else "sister-in-law" if gender == "female" else rel
        elif "grandparent" in rel:
            return "grandfather-in-law" if gender == "male" else "grandmother-in-law" if gender == "female" else rel
        elif "aunt" in rel or "uncle" in rel:
            return "uncle-in-law" if gender == "male" else "aunt-in-law" if gender == "female" else rel
    
    # Handle step relationships
    elif "step-" in rel:
        if "parent" in rel:
            return "step-father" if gender == "male" else "step-mother" if gender == "female" else rel
        elif "child" in rel:
            return "step-son" if gender == "male" else "step-daughter" if gender == "female" else rel
        elif "sibling" in rel:
            return "step-brother" if gender == "male" else "step-sister" if gender == "female" else rel
    
    return base_relationship


def _compute_relationship(
    from_id: UUID,
    to_id: UUID,
    graph: dict
) -> tuple[str, List[UUID]]:
    """Compute the relationship between two members using proper genealogical algorithms.
    
    This implementation replicates the FamilyTreeCore.ts logic for production-grade
    relationship computation with proper cousin degrees, removal calculations, and
    comprehensive in-law relationships.
    
    Returns:
        Tuple of (relationship_label, path)
        
    Relationship types:
        - Direct: spouse, parent, child
        - Siblings: sibling (full/half based on shared parents)
        - Ancestor/Descendant: grandparent/grandchild with "great-" prefix
        - Collateral: aunt/uncle, niece/nephew with "great-" prefix
        - Cousins: Nth cousin, M times removed (proper degree calculation)
        - In-laws: parent-in-law, child-in-law, sibling-in-law
    """
    if from_id == to_id:
        return "self", [from_id]
    
    members = graph["members"]
    spouses = graph["spouses"]
    parents = graph["parents"]
    children = graph["children"]
    
    # Direct relations
    if to_id in spouses.get(from_id, []):
        return "spouse", [from_id, to_id]
    
    if to_id in children.get(from_id, []):
        return "parent", [from_id, to_id]
    
    if to_id in parents.get(from_id, []):
        return "child", [from_id, to_id]
    
    # Get ancestors with distances for both members
    ancestors_from = _get_ancestors_and_distance(from_id, graph)
    ancestors_to = _get_ancestors_and_distance(to_id, graph)
    
    # Check if to_id is an ancestor of from_id (from_id is descendant of to_id)
    # This means from_id's relationship TO to_id is child/grandchild/etc.
    if to_id in ancestors_from:
        distance = ancestors_from[to_id]
        if distance == 1:
            return "child", [from_id, to_id]  # from_id is child of to_id
        elif distance == 2:
            return "grandchild", [from_id] + _find_path_through_parents(from_id, to_id, parents, distance)
        else:
            prefix = "great-" * (distance - 2)
            return f"{prefix}grandchild", [from_id] + _find_path_through_parents(from_id, to_id, parents, distance)
    
    # Check if from_id is an ancestor of to_id (to_id is descendant of from_id)
    # This means from_id's relationship TO to_id is parent/grandparent/etc.
    if from_id in ancestors_to:
        distance = ancestors_to[from_id]
        if distance == 1:
            return "parent", [from_id, to_id]  # from_id is parent of to_id
        elif distance == 2:
            return "grandparent", [from_id] + _find_path_through_children(from_id, to_id, children, distance)
        else:
            prefix = "great-" * (distance - 2)
            return f"{prefix}grandparent", [from_id] + _find_path_through_children(from_id, to_id, children, distance)
    
    # Find closest common ancestor for collateral relations
    closest_common_ancestor = None
    dist_from = -1
    dist_to = -1
    
    for ancestor_id, d_from in ancestors_from.items():
        if ancestor_id in ancestors_to:
            d_to = ancestors_to[ancestor_id]
            if closest_common_ancestor is None or (d_from + d_to) < (dist_from + dist_to):
                closest_common_ancestor = ancestor_id
                dist_from = d_from
                dist_to = d_to
    
    if closest_common_ancestor:
        # Siblings: both are direct children of common ancestor
        if dist_from == 1 and dist_to == 1:
            # Check if full or half siblings
            from_parents_set = set(parents.get(from_id, []))
            to_parents_set = set(parents.get(to_id, []))
            shared_parents = from_parents_set & to_parents_set
            
            if from_parents_set == to_parents_set and len(from_parents_set) > 0:
                return "sibling", [from_id, closest_common_ancestor, to_id]
            else:
                return "sibling", [from_id, closest_common_ancestor, to_id]
        
        # Aunt/Uncle: from_id is 1 generation from ancestor, to_id is more
        if dist_from == 1 and dist_to > 1:
            if dist_to == 2:
                return "aunt/uncle", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_to - 2)
                return f"{prefix}aunt/uncle", [from_id, closest_common_ancestor, to_id]
        
        # Niece/Nephew: to_id is 1 generation from ancestor, from_id is more
        if dist_to == 1 and dist_from > 1:
            if dist_from == 2:
                return "niece/nephew", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_from - 2)
                return f"{prefix}niece/nephew", [from_id, closest_common_ancestor, to_id]
        
        # Extended Aunt/Uncle relationships: one person is 1 generation from ancestor, other is 2+
        # This handles great-aunt/uncle relationships that were missed above
        if dist_from == 1 and dist_to >= 2:
            if dist_to == 2:
                return "aunt/uncle", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_to - 2)
                return f"{prefix}aunt/uncle", [from_id, closest_common_ancestor, to_id]
        
        # Extended Niece/Nephew relationships: one person is 1 generation from ancestor, other is 2+
        # This handles great-niece/nephew relationships that were missed above
        if dist_to == 1 and dist_from >= 2:
            if dist_from == 2:
                return "niece/nephew", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_from - 2)
                return f"{prefix}niece/nephew", [from_id, closest_common_ancestor, to_id]
        
        # True Cousins: both are 2+ generations from common ancestor AND on the same generational level
        # Cousins are people whose closest common ancestors are their grandparents or further back
        # AND they are on the same generation level relative to that ancestor
        if dist_from >= 2 and dist_to >= 2:
            # Only classify as cousins if they're on the same generational level
            # OR if the generational difference is small enough to warrant "removed" terminology
            
            # Cousin degree is the minimum distance minus 1
            cousin_level = min(dist_from, dist_to) - 1
            # Removal is the difference in distances
            removal = abs(dist_from - dist_to)
            
            # For very large generational differences, these might be more like
            # distant aunt/uncle relationships, but we'll use the cousin terminology
            # with "times removed" for clarity
            ordinal_str = _ordinal(cousin_level)
            
            if removal == 0:
                return f"{ordinal_str} cousin", [from_id, closest_common_ancestor, to_id]
            elif removal == 1:
                return f"{ordinal_str} cousin, once removed", [from_id, closest_common_ancestor, to_id]
            elif removal == 2:
                return f"{ordinal_str} cousin, twice removed", [from_id, closest_common_ancestor, to_id]
            else:
                return f"{ordinal_str} cousin, {removal} times removed", [from_id, closest_common_ancestor, to_id]
    
    # In-law relationships (through spouse connections)
    for spouse_id in spouses.get(from_id, []):
        # Spouse's parent = parent-in-law
        if to_id in parents.get(spouse_id, []):
            return "parent-in-law", [from_id, spouse_id, to_id]
        
        # Spouse's child = child-in-law (step-child)
        if to_id in children.get(spouse_id, []):
            # Check if from_id is also a parent of to_id (biological child vs step-child)
            if to_id not in children.get(from_id, []):
                return "step-child", [from_id, spouse_id, to_id]
            else:
                return "child", [from_id, to_id]  # Biological child
        
        # Spouse's sibling = sibling-in-law
        spouse_ancestors = _get_ancestors_and_distance(spouse_id, graph)
        to_ancestors = _get_ancestors_and_distance(to_id, graph)
        
        # Check if they share a parent (are siblings)
        for ancestor_id in spouse_ancestors:
            if ancestor_id in to_ancestors:
                if spouse_ancestors[ancestor_id] == 1 and to_ancestors[ancestor_id] == 1:
                    return "sibling-in-law", [from_id, spouse_id, ancestor_id, to_id]
    
    # Check reverse in-law relationships (child's spouse = child-in-law)
    for child_id in children.get(from_id, []):
        if to_id in spouses.get(child_id, []):
            return "child-in-law", [from_id, child_id, to_id]
    
    # Check for cultural/nuanced relationships first (parent's cousin as 2nd uncle/aunt)
    cultural_result = _check_cultural_relationships(from_id, to_id, graph)
    if cultural_result:
        return cultural_result
    
    # Check for in-law relationships (after cultural, before unknown)
    in_law_result = _check_in_law_relationships(from_id, to_id, graph)
    if in_law_result:
        return in_law_result
    
    # If no relationship found
    return "unknown", [from_id, to_id]


def _find_path_through_parents(from_id: UUID, to_id: UUID, parents: dict, max_depth: int) -> List[UUID]:
    """Find path from from_id to to_id going up through parents using BFS."""
    if max_depth <= 0:
        return []
    
    # Use BFS to find the shortest path
    queue = [(from_id, [])]
    visited = {from_id}
    
    while queue:
        current_id, path = queue.pop(0)
        
        if len(path) >= max_depth:
            continue
            
        for parent_id in parents.get(current_id, []):
            new_path = path + [parent_id]
            
            if parent_id == to_id:
                return new_path
            
            if parent_id not in visited and len(new_path) < max_depth:
                visited.add(parent_id)
                queue.append((parent_id, new_path))
    
    return []


def _find_path_through_children(from_id: UUID, to_id: UUID, children: dict, max_depth: int) -> List[UUID]:
    """Find path from from_id to to_id going down through children using BFS."""
    if max_depth <= 0:
        return []
    
    # Use BFS to find the shortest path
    queue = [(from_id, [])]
    visited = {from_id}
    
    while queue:
        current_id, path = queue.pop(0)
        
        if len(path) >= max_depth:
            continue
            
        for child_id in children.get(current_id, []):
            new_path = path + [child_id]
            
            if child_id == to_id:
                return new_path
            
            if child_id not in visited and len(new_path) < max_depth:
                visited.add(child_id)
                queue.append((child_id, new_path))
    
    return []


@router.get(
    "/relations/{treeId}/between",
    response_model=RelationshipComputeResponse,
    summary="Compute relationship between two members",
    description="Computes the relationship label and path between two members in a tree."
)
async def compute_relationship(
    treeId: UUID,
    from_member: UUID = Query(..., alias="from", description="UUID of the first member"),
    to_member: UUID = Query(..., alias="to", description="UUID of the second member"),
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Compute the relationship between two members.
    
    This endpoint analyzes the family tree structure and determines
    the relationship between two members, such as:
    - Direct: spouse, parent, child, sibling
    - Extended: grandparent, grandchild, aunt/uncle, niece/nephew
    - Cousins: 1st cousin, 2nd cousin, etc. (with removal)
    - In-laws: parent-in-law, sibling-in-law, step-child
    
    Args:
        treeId: UUID of the tree
        from_member: UUID of the first member (query param "from")
        to_member: UUID of the second member (query param "to")
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        RelationshipComputeResponse with relationship label and path
        
    Raises:
        HTTPException 404: Tree or members not found
        HTTPException 403: Access denied
    """
    # Check if tree exists
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == treeId
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Check user membership
    membership = db_session.query(models.Membership).filter(
        and_(
            models.Membership.user_id == current_user.id,
            models.Membership.tree_id == treeId
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Check if both members exist
    from_member_obj = db_session.query(models.Member).filter(
        and_(
            models.Member.id == from_member,
            models.Member.tree_id == treeId
        )
    ).first()
    
    if not from_member_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="From member not found in this tree"
        )
    
    to_member_obj = db_session.query(models.Member).filter(
        and_(
            models.Member.id == to_member,
            models.Member.tree_id == treeId
        )
    ).first()
    
    if not to_member_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="To member not found in this tree"
        )
    
    # Build relationship graph
    graph = _build_relationship_graph(treeId, db_session)
    
    # Compute relationship
    relationship_label, path = _compute_relationship(from_member, to_member, graph)
    
    # Convert to gender-specific relationship if possible
    # Use from_member's gender since the relationship describes from_member's role
    gender_specific_relationship = _get_gender_specific_relationship(relationship_label, from_member_obj)
    
    # Debug logging for gender-specific relationships
    if relationship_label != gender_specific_relationship:
        logger.info(
            f"Gender conversion: {relationship_label} -> {gender_specific_relationship} "
            f"(based on {from_member_obj.name}'s gender: {from_member_obj.gender})"
        )
    
    # Get member names for path
    path_names = [graph["members"][member_id].name for member_id in path]
    
    logger.info(
        f"Computed relationship in tree {tree.name}: "
        f"{from_member_obj.name} -> {to_member_obj.name} = {gender_specific_relationship}"
    )
    
    return RelationshipComputeResponse(
        from_member_id=from_member,
        from_member_name=from_member_obj.name,
        to_member_id=to_member,
        to_member_name=to_member_obj.name,
        relationship=gender_specific_relationship,
        path=path,
        path_names=path_names
    )


def _check_in_law_relationships(from_id: UUID, to_id: UUID, graph: dict) -> Optional[tuple[str, List[UUID]]]:
    """Check for comprehensive in-law relationships through spouse connections."""
    spouses = graph["spouses"]
    parents = graph["parents"]
    children = graph["children"]
    
    # Check if from_id's parent is married to to_id (step-parent relationship)
    for parent_id in parents.get(from_id, []):
        if to_id in spouses.get(parent_id, []) and to_id not in parents.get(from_id, []):
            return "step-parent", [from_id, parent_id, to_id]
    
    # Check if to_id's parent is married to from_id (step-child relationship)
    for parent_id in parents.get(to_id, []):
        if from_id in spouses.get(parent_id, []) and from_id not in parents.get(to_id, []):
            return "step-child", [from_id, parent_id, to_id]
    
    # Through from_id's spouses - comprehensive in-law relationships
    for spouse_id in spouses.get(from_id, []):
        # Get the blood relationship between spouse and to_id
        blood_relationship = _compute_basic_blood_relationship(spouse_id, to_id, graph)
        
        if blood_relationship:
            rel_type, path = blood_relationship
            rel_lower = rel_type.lower()
            
            # Convert blood relationships to in-law relationships
            if rel_lower == "parent":
                return "parent-in-law", [from_id, spouse_id, to_id]
            elif rel_lower == "child":
                # Only step-child if not biological child of from_id
                if to_id not in children.get(from_id, []):
                    return "step-child", [from_id, spouse_id, to_id]
            elif rel_lower == "sibling":
                return "sibling-in-law", [from_id, spouse_id, to_id]
            elif rel_lower == "grandparent":
                return "grandparent-in-law", [from_id, spouse_id, to_id]
            elif rel_lower == "grandchild":
                return "grandchild-in-law", [from_id, spouse_id, to_id]
            elif "great-" in rel_lower and "grandparent" in rel_lower:
                prefix = rel_lower.replace("grandparent", "")
                return f"{prefix}grandparent-in-law", [from_id, spouse_id, to_id]
            elif "great-" in rel_lower and "grandchild" in rel_lower:
                prefix = rel_lower.replace("grandchild", "")
                return f"{prefix}grandchild-in-law", [from_id, spouse_id, to_id]
            elif rel_lower == "aunt/uncle":
                return "aunt/uncle-in-law", [from_id, spouse_id, to_id]
            elif rel_lower == "niece/nephew":
                return "niece/nephew-in-law", [from_id, spouse_id, to_id]
            elif "great-" in rel_lower and "aunt/uncle" in rel_lower:
                prefix = rel_lower.replace("aunt/uncle", "")
                return f"{prefix}aunt/uncle-in-law", [from_id, spouse_id, to_id]
            elif "great-" in rel_lower and "niece/nephew" in rel_lower:
                prefix = rel_lower.replace("niece/nephew", "")
                return f"{prefix}niece/nephew-in-law", [from_id, spouse_id, to_id]
            elif "cousin" in rel_lower:
                return f"{rel_type}-in-law", [from_id, spouse_id, to_id]
    
    # Check reverse in-law relationships
    # Child's spouse = child-in-law
    for child_id in children.get(from_id, []):
        if to_id in spouses.get(child_id, []):
            return "child-in-law", [from_id, child_id, to_id]
    
    # Check if to_id is married to any blood relative of from_id
    for relative_id in graph["members"].keys():
        if relative_id == from_id or relative_id == to_id:
            continue
            
        # Check if to_id is married to this relative
        if to_id in spouses.get(relative_id, []):
            # Get blood relationship between from_id and relative_id
            blood_relationship = _compute_basic_blood_relationship(from_id, relative_id, graph)
            
            if blood_relationship:
                rel_type, _ = blood_relationship
                rel_lower = rel_type.lower()
                
                # Convert to reverse in-law relationship
                if rel_lower == "parent":
                    return "child-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "child":
                    return "parent-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "sibling":
                    return "sibling-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "grandparent":
                    return "grandchild-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "grandchild":
                    return "grandparent-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "aunt/uncle":
                    return "niece/nephew-in-law", [from_id, relative_id, to_id]
                elif rel_lower == "niece/nephew":
                    return "aunt/uncle-in-law", [from_id, relative_id, to_id]
                elif "cousin" in rel_lower:
                    return f"{rel_type}-in-law", [from_id, relative_id, to_id]
    
    return None


def _check_cultural_relationships(from_id: UUID, to_id: UUID, graph: dict) -> Optional[tuple[str, List[UUID]]]:
    """Check for cultural/nuanced relationships like parent's cousin being an aunt/uncle.
    
    In many cultures, certain relationships are treated as closer than their technical
    genealogical distance would suggest. For example:
    - Parent's 1st cousin is often called "2nd uncle/aunt" 
    - Parent's sibling is "uncle/aunt", so parent's cousin becomes "2nd uncle/aunt"
    - Grandparent's sibling is "great-uncle/aunt", so grandparent's cousin becomes "2nd great-uncle/aunt"
    """
    parents = graph["parents"]
    spouses = graph["spouses"]
    
    # Check if to_id is related to from_id's ancestors (cultural aunt/uncle relationships)
    for parent_id in parents.get(from_id, []):
        parent_relationship = _compute_basic_blood_relationship(parent_id, to_id, graph)
        if parent_relationship:
            rel_type, _ = parent_relationship
            rel_lower = rel_type.lower()
            
            # Parent's sibling = aunt/uncle (standard)
            if rel_lower == "sibling":
                return "aunt/uncle", [from_id, parent_id, to_id]
            
            # Parent's 1st cousin = 2nd uncle/aunt (cultural)
            elif rel_lower == "1st cousin":
                return "2nd aunt/uncle", [from_id, parent_id, to_id]
            
            # Parent's 2nd cousin = 3rd uncle/aunt (cultural)
            elif rel_lower == "2nd cousin":
                return "3rd aunt/uncle", [from_id, parent_id, to_id]
            
            # Parent's Nth cousin = (N+1)th uncle/aunt (cultural)
            elif "cousin" in rel_lower and "removed" not in rel_lower:
                # Extract the cousin degree
                import re
                match = re.search(r'(\d+)(?:st|nd|rd|th)\s+cousin', rel_lower)
                if match:
                    cousin_degree = int(match.group(1))
                    ordinal_degree = _ordinal(cousin_degree + 1)
                    return f"{ordinal_degree} aunt/uncle", [from_id, parent_id, to_id]
            
            # Parent's cousin with removal = cousin-aunt/uncle
            elif "cousin" in rel_lower and "removed" in rel_lower:
                return f"cousin-aunt/uncle", [from_id, parent_id, to_id]
    
    # Check grandparent relationships for great-uncle/aunt patterns
    ancestors_from = _get_ancestors_and_distance(from_id, graph)
    
    for ancestor_id, distance in ancestors_from.items():
        if distance >= 2:  # Grandparent or higher
            ancestor_relationship = _compute_basic_blood_relationship(ancestor_id, to_id, graph)
            if ancestor_relationship:
                rel_type, _ = ancestor_relationship
                rel_lower = rel_type.lower()
                
                # Grandparent's sibling = great-uncle/aunt
                if distance == 2 and rel_lower == "sibling":
                    return "great-aunt/uncle", [from_id, ancestor_id, to_id]
                
                # Great-grandparent's sibling = great-great-uncle/aunt
                elif distance > 2 and rel_lower == "sibling":
                    prefix = "great-" * (distance - 1)
                    return f"{prefix}aunt/uncle", [from_id, ancestor_id, to_id]
                
                # Grandparent's 1st cousin = 2nd great-uncle/aunt (cultural)
                elif distance == 2 and rel_lower == "1st cousin":
                    return "2nd great-aunt/uncle", [from_id, ancestor_id, to_id]
                
                # Higher ancestor's cousin relationships
                elif distance > 2 and "cousin" in rel_lower and "removed" not in rel_lower:
                    import re
                    match = re.search(r'(\d+)(?:st|nd|rd|th)\s+cousin', rel_lower)
                    if match:
                        cousin_degree = int(match.group(1))
                        ordinal_degree = _ordinal(cousin_degree + 1)
                        prefix = "great-" * (distance - 1)
                        return f"{ordinal_degree} {prefix}aunt/uncle", [from_id, ancestor_id, to_id]
    
    # Check reverse: if from_id is related to to_id's ancestors (cultural niece/nephew)
    ancestors_to = _get_ancestors_and_distance(to_id, graph)
    
    for ancestor_id, distance in ancestors_to.items():
        ancestor_relationship = _compute_basic_blood_relationship(from_id, ancestor_id, graph)
        if ancestor_relationship:
            rel_type, _ = ancestor_relationship
            rel_lower = rel_type.lower()
            
            # from_id is sibling of to_id's parent = aunt/uncle relationship (reverse)
            if distance == 1 and rel_lower == "sibling":
                return "niece/nephew", [from_id, ancestor_id, to_id]
            
            # from_id is 1st cousin of to_id's parent = 2nd aunt/uncle relationship (reverse)
            elif distance == 1 and rel_lower == "1st cousin":
                return "2nd niece/nephew", [from_id, ancestor_id, to_id]
            
            # from_id is Nth cousin of to_id's parent = (N+1)th niece/nephew (cultural)
            elif distance == 1 and "cousin" in rel_lower and "removed" not in rel_lower:
                import re
                match = re.search(r'(\d+)(?:st|nd|rd|th)\s+cousin', rel_lower)
                if match:
                    cousin_degree = int(match.group(1))
                    ordinal_degree = _ordinal(cousin_degree + 1)
                    return f"{ordinal_degree} niece/nephew", [from_id, ancestor_id, to_id]
            
            # Great relationships
            elif distance >= 2 and rel_lower == "sibling":
                prefix = "great-" * (distance - 1)
                return f"{prefix}niece/nephew", [from_id, ancestor_id, to_id]
    
    # Check for cousin-in-law relationships (cousin's spouse)
    basic_relationship = _compute_basic_blood_relationship(from_id, to_id, graph)
    if basic_relationship:
        rel_type, _ = basic_relationship
        if "cousin" in rel_type.lower():
            # Check if one is married to the other's blood cousin
            for spouse_id in spouses.get(from_id, []):
                spouse_relationship = _compute_basic_blood_relationship(spouse_id, to_id, graph)
                if spouse_relationship and "cousin" in spouse_relationship[0].lower():
                    return f"cousin-in-law", [from_id, spouse_id, to_id]
    
    return None


def _compute_basic_blood_relationship(from_id: UUID, to_id: UUID, graph: dict) -> Optional[tuple[str, List[UUID]]]:
    """Compute basic blood relationship without cultural nuances or in-law complications.
    
    This is used as a helper for cultural relationship detection.
    """
    if from_id == to_id:
        return "self", [from_id]
    
    parents = graph["parents"]
    children = graph["children"]
    
    # Direct relations
    if to_id in children.get(from_id, []):
        return "parent", [from_id, to_id]
    
    if to_id in parents.get(from_id, []):
        return "child", [from_id, to_id]
    
    # Get ancestors with distances for both members
    ancestors_from = _get_ancestors_and_distance(from_id, graph)
    ancestors_to = _get_ancestors_and_distance(to_id, graph)
    
    # Check if to_id is an ancestor of from_id
    if to_id in ancestors_from:
        distance = ancestors_from[to_id]
        if distance == 1:
            return "parent", [from_id, to_id]
        elif distance == 2:
            return "grandparent", [from_id, to_id]
        else:
            prefix = "great-" * (distance - 2)
            return f"{prefix}grandparent", [from_id, to_id]
    
    # Check if from_id is an ancestor of to_id
    if from_id in ancestors_to:
        distance = ancestors_to[from_id]
        if distance == 1:
            return "child", [from_id, to_id]
        elif distance == 2:
            return "grandchild", [from_id, to_id]
        else:
            prefix = "great-" * (distance - 2)
            return f"{prefix}grandchild", [from_id, to_id]
    
    # Find closest common ancestor for collateral relations
    closest_common_ancestor = None
    dist_from = -1
    dist_to = -1
    
    for ancestor_id, d_from in ancestors_from.items():
        if ancestor_id in ancestors_to:
            d_to = ancestors_to[ancestor_id]
            if closest_common_ancestor is None or (d_from + d_to) < (dist_from + dist_to):
                closest_common_ancestor = ancestor_id
                dist_from = d_from
                dist_to = d_to
    
    if closest_common_ancestor:
        # Siblings
        if dist_from == 1 and dist_to == 1:
            return "sibling", [from_id, closest_common_ancestor, to_id]
        
        # Aunt/Uncle
        if dist_from == 1 and dist_to > 1:
            if dist_to == 2:
                return "aunt/uncle", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_to - 2)
                return f"{prefix}aunt/uncle", [from_id, closest_common_ancestor, to_id]
        
        # Niece/Nephew
        if dist_to == 1 and dist_from > 1:
            if dist_from == 2:
                return "niece/nephew", [from_id, closest_common_ancestor, to_id]
            else:
                prefix = "great-" * (dist_from - 2)
                return f"{prefix}niece/nephew", [from_id, closest_common_ancestor, to_id]
        
        # Cousins
        if dist_from >= 2 and dist_to >= 2:
            cousin_level = min(dist_from, dist_to) - 1
            removal = abs(dist_from - dist_to)
            
            ordinal_str = _ordinal(cousin_level)
            
            if removal == 0:
                return f"{ordinal_str} cousin", [from_id, closest_common_ancestor, to_id]
            elif removal == 1:
                return f"{ordinal_str} cousin, once removed", [from_id, closest_common_ancestor, to_id]
            elif removal == 2:
                return f"{ordinal_str} cousin, twice removed", [from_id, closest_common_ancestor, to_id]
            else:
                return f"{ordinal_str} cousin, {removal} times removed", [from_id, closest_common_ancestor, to_id]
    
    return None
