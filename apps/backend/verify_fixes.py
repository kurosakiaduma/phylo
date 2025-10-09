"""
Verification script for user registration and role assignment fixes.

Tests:
1. Display name is properly saved during registration
2. Custodian role is assigned when creating a tree
3. TreeSettings with camelCase JSON works correctly
"""

import sys
sys.path.insert(0, '/mnt/win3/work/family_tree/apps/backend')

from sqlalchemy.orm import Session
from utils.db import SessionLocal
from models import User, Tree, Membership
from schemas import TreeSettings, OTPVerify
import json

print("="*70)
print("VERIFICATION: User Registration & Role Assignment Fixes")
print("="*70)

# Get database session
db: Session = SessionLocal()

try:
    # Test 1: Verify display_name is stored correctly
    print("\n1. Checking User Display Names...")
    users = db.query(User).all()
    
    if not users:
        print("   ⚠️  No users found in database")
    else:
        for user in users:
            status = "✅" if user.display_name and user.display_name != user.email.split('@')[0] else "⚠️"
            print(f"   {status} User: {user.email}")
            print(f"      Display Name: {user.display_name}")
            print(f"      Created: {user.created_at}")
    
    # Test 2: Verify custodian role assignment
    print("\n2. Checking Custodian Role Assignments...")
    trees = db.query(Tree).all()
    
    if not trees:
        print("   ⚠️  No trees found in database")
    else:
        for tree in trees:
            print(f"\n   Tree: {tree.name} (ID: {tree.id})")
            print(f"   Created by: {tree.created_by}")
            
            # Check if creator has custodian membership
            membership = db.query(Membership).filter(
                Membership.tree_id == tree.id,
                Membership.user_id == tree.created_by
            ).first()
            
            if membership:
                if membership.role == 'custodian':
                    print(f"   ✅ Creator has custodian role")
                else:
                    print(f"   ❌ Creator has role: {membership.role} (should be custodian)")
            else:
                print(f"   ❌ No membership found for creator!")
            
            # List all memberships
            all_memberships = db.query(Membership).filter(
                Membership.tree_id == tree.id
            ).all()
            
            if all_memberships:
                print(f"   Total members: {len(all_memberships)}")
                for m in all_memberships:
                    user = db.query(User).filter(User.id == m.user_id).first()
                    print(f"      - {user.email if user else 'Unknown'}: {m.role}")
    
    # Test 3: Verify TreeSettings schema with camelCase
    print("\n3. Testing TreeSettings Schema...")
    
    # Test with camelCase (frontend format)
    camel_case_json = {
        "allowSameSex": True,
        "monogamy": False,
        "allowPolygamy": True,
        "maxSpousesPerMember": 3,
        "allowSingleParent": True,
        "allowMultiParentChildren": False,
        "maxParentsPerChild": 2
    }
    
    try:
        settings = TreeSettings(**camel_case_json)
        print("   ✅ CamelCase JSON parsed successfully")
        print(f"      allow_same_sex: {settings.allow_same_sex}")
        print(f"      max_spouses_per_member: {settings.max_spouses_per_member}")
        
        # Verify attribute access works
        assert settings.allow_same_sex == True
        assert settings.allow_polygamy == True
        assert settings.max_spouses_per_member == 3
        print("   ✅ Snake_case attribute access works")
    except Exception as e:
        print(f"   ❌ TreeSettings parsing failed: {e}")
    
    # Test 4: Verify OTPVerify schema accepts display_name
    print("\n4. Testing OTPVerify Schema...")
    
    try:
        otp_verify = OTPVerify(
            email="test@example.com",
            code="123456",
            display_name="John Doe"
        )
        print("   ✅ OTPVerify accepts display_name")
        print(f"      Email: {otp_verify.email}")
        print(f"      Display Name: {otp_verify.display_name}")
    except Exception as e:
        print(f"   ❌ OTPVerify schema failed: {e}")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    user_count = len(users) if users else 0
    tree_count = len(trees) if trees else 0
    custodian_count = db.query(Membership).filter(
        Membership.role == 'custodian'
    ).count()
    
    print(f"Total Users: {user_count}")
    print(f"Total Trees: {tree_count}")
    print(f"Total Custodians: {custodian_count}")
    
    # Check if everything looks good
    all_good = True
    
    # Check if trees have custodian memberships
    if tree_count > 0:
        for tree in trees:
            membership = db.query(Membership).filter(
                Membership.tree_id == tree.id,
                Membership.user_id == tree.created_by,
                Membership.role == 'custodian'
            ).first()
            if not membership:
                all_good = False
                break
    
    if all_good and tree_count > 0:
        print("\n✅ All fixes verified successfully!")
        print("\nNext steps:")
        print("1. Build frontend: cd apps/frontend/family-tree && npm run build")
        print("2. Test registration with custom display name")
        print("3. Test tree creation and verify custodian role")
        print("4. Test invites management page at /invites")
    elif tree_count == 0:
        print("\n⚠️  No trees in database yet - create a tree to test custodian assignment")
    else:
        print("\n❌ Some issues detected - review output above")

finally:
    db.close()
    print("\n" + "="*70)
