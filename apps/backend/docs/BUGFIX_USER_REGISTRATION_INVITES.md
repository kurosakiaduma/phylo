# Bug Fix: User Role Assignment & Invites Management

**Date:** October 2, 2025  
**Status:** ✅ Fixed

## Issues Fixed

### Issue 1: Display Name Not Saved During Registration

**Problem:**

- Frontend registration form collected `displayName` but didn't send it to backend
- Backend defaulted to email prefix (e.g., "john" from "john@example.com")
- Users couldn't set their preferred display name during sign-up

**Solution:**

1. Updated `OTPVerify` schema to accept optional `display_name` parameter
2. Modified `verify_otp` endpoint to use provided display name
3. Updated frontend `authApi.verifyOTP()` to accept and send `displayName`
4. Modified RegisterModal to pass `displayName` to verify call

**Files Modified:**

- `apps/backend/schemas/__init__.py` - Added `display_name` to OTPVerify
- `apps/backend/api/auth.py` - Use provided display_name in user creation
- `apps/frontend/family-tree/src/lib/auth-api.ts` - Added displayName parameter
- `apps/frontend/family-tree/src/components/auth/register-modal.tsx` - Pass displayName

### Issue 2: Custodian Role Assignment

**Verification:**

- Checked tree creation endpoint (`POST /api/trees`)
- **Already correctly implemented** - Lines 217-222 in `api/trees.py`
- Creates custodian membership automatically when user creates a tree

```python
# Create custodian membership for creator
membership = models.Membership(
    user_id=current_user.id,
    tree_id=new_tree.id,
    role='custodian'
)
db_session.add(membership)
db_session.commit()
```

**Status:** ✅ No fix needed - working as designed

### Issue 3: Missing Invites Management Section

**Problem:**

- No UI for custodians to view, manage, and track invitations
- Custodians couldn't see pending/accepted/expired invites
- No way to resend or cancel invitations from dashboard

**Solution:**
Created comprehensive Invites page with full CRUD functionality:

1. **Added Invites to Navigation**
   - Added Mail icon import to dashboard-layout.tsx
   - Added "Invites" navigation item with Mail icon
   - Links to `/invites` route

2. **Created Invites Management Page** (`/app/(dashboard)/invites/page.tsx`)
   - **View Invites:** List all invitations for custodian's trees
   - **Filter by Tree:** Dropdown to select which tree's invites to view
   - **Send New Invites:** Dialog form with email, role, and tree selection
   - **Manage Invites:** Copy link, resend, or cancel pending invites
   - **Status Tracking:** Visual badges for Pending/Accepted/Expired status
   - **Role Display:** Color-coded badges for Custodian/Contributor/Viewer

**Features:**

✅ **Tree Selection**

- Automatically loads all trees where user is custodian
- Dropdown to switch between trees
- Only custodians can access this page

✅ **Send Invitation Dialog**

- Email validation
- Role selection (Custodian/Contributor/Viewer)
- Tree selection
- Success/error toasts

✅ **Invitations Table**

- Email address
- Assigned role
- Status badge (Pending/Accepted/Expired)
- Sent by (creator name)
- Creation date
- Action buttons

✅ **Actions**

- **Copy Link:** Copy invite URL to clipboard
- **Resend:** Resend invitation email
- **Cancel:** Cancel pending invitation (only for non-accepted, non-expired)

✅ **Empty States**

- No trees: Prompt to create or join a tree
- No invites: Friendly message with icon

---

## API Endpoints Used

### Existing Endpoints (Already Implemented)

- `POST /api/invites` - Send new invitation
- `GET /api/trees/{tree_id}/invites` - List tree invitations
- `POST /api/invites/{token}/resend` - Resend invitation
- `DELETE /api/invites/{token}` - Cancel invitation

All endpoints require custodian authorization and are fully documented in:

- `apps/backend/docs/INVITATIONS.md`
- `apps/backend/docs/INVITATIONS_QUICK_REF.md`

---

## Testing Checklist

### Registration Flow

- [ ] New user registers with display name "John Doe"
- [ ] Verify user.display_name is "John Doe" (not email prefix)
- [ ] Check database: `SELECT display_name FROM users WHERE email='...'`

### Custodian Role

- [ ] New user creates a tree
- [ ] Verify membership record created with role='custodian'
- [ ] Check API: `GET /api/trees` returns tree with role='custodian'
- [ ] Check database: `SELECT role FROM memberships WHERE user_id='...' AND tree_id='...'`

### Invites Page

- [ ] Navigate to /invites as custodian
- [ ] See all trees where user is custodian
- [ ] Send invite to test@example.com as viewer
- [ ] Verify invite appears in table with "Pending" status
- [ ] Copy invite link and verify format
- [ ] Resend invite (check email sent)
- [ ] Cancel invite (verify removed from list)
- [ ] Navigate to /invites as non-custodian (should show "No Trees" message)

---

## Files Created/Modified

### Backend (2 files modified)

1. `apps/backend/schemas/__init__.py`
   - Added `display_name: Optional[str]` to `OTPVerify` class

2. `apps/backend/api/auth.py`
   - Modified `verify_otp()` to accept and use `display_name`
   - Logs display_name on user creation
   - Allows updating display_name on subsequent logins

### Frontend (3 files modified, 1 created)

1. `apps/frontend/family-tree/src/lib/auth-api.ts`
   - Added `display_name?: string` to `OTPVerifyBody` interface
   - Updated `verifyOTP()` signature to accept `displayName` parameter
   - Sends `display_name` in verify request body

2. `apps/frontend/family-tree/src/components/auth/register-modal.tsx`
   - Passes `displayName` to `authApi.verifyOTP()` call
   - Shows displayName in success toast

3. `apps/frontend/family-tree/src/components/dashboard-layout.tsx`
   - Imported `Mail` icon from lucide-react
   - Added "Invites" navigation item

4. **NEW:** `apps/frontend/family-tree/src/app/(dashboard)/invites/page.tsx`
   - Complete invites management page (470+ lines)
   - Tree selection, invitation table, send invite dialog
   - Copy/resend/cancel actions

---

## Database Schema

No schema changes required. Uses existing tables:

**users table:**

- `display_name` field already exists (just wasn't being populated correctly)

**memberships table:**

- Already has `role` field with values: 'custodian', 'contributor', 'viewer'
- Automatically populated on tree creation

**invites table:**

- Already exists with all required fields
- Managed through existing API endpoints

---

## Impact

### User Experience

✅ Users can set their preferred name during registration  
✅ Tree creators automatically become custodians (already working)  
✅ Custodians have full invite management interface  
✅ Easy to track invitation status and resend if needed  
✅ Clear role assignment during invitation

### Security

✅ Only custodians can access /invites page  
✅ All API calls require authentication  
✅ Tree-level authorization enforced by backend

### Data Quality

✅ Display names are meaningful (not email prefixes)  
✅ Role assignments are explicit and tracked  
✅ Invitation lifecycle is fully managed

---

## Next Steps

1. **Test registration flow** with new display_name handling
2. **Test tree creation** to confirm custodian role assignment
3. **Test invites page** with multiple trees and invitations
4. **Update task list** to mark completed items:
   - [x] User registration with display_name
   - [x] Custodian role auto-assignment (already working)
   - [x] Invites management interface

5. **Optional Enhancements:**
   - Add invite analytics (acceptance rate, pending count)
   - Email notification preferences
   - Bulk invite functionality
   - Invite templates for common roles

---

## Status

✅ **All issues resolved and ready for testing**

The registration flow now properly captures and saves display names, custodian roles are automatically assigned on tree creation (already working), and custodians have a full-featured interface to manage family tree invitations.
