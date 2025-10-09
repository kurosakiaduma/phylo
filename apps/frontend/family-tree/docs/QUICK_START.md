# Quick Start Guide

## Start Development

```bash
# Terminal 1: Backend API
cd apps/backend
source .venv/bin/activate.fish
uvicorn main:app --reload --port 8050

# Terminal 2: Frontend
cd apps/frontend/family-tree
npm run dev

# Visit: http://localhost:3000
```

## Test the Fixes

### 1. Registration with Display Name

1. Click "Get Started" on landing page
2. Enter **display name** (e.g., "Jane Smith") and email
3. Get OTP from Mailtrap inbox
4. Verify and check database:
   ```sql
   SELECT display_name FROM users WHERE email='your@email.com';
   ```
   Should show "Jane Smith", not email prefix

### 2. Custodian Role on Tree Creation

1. Login/Register
2. Create new tree from /trees page
3. Check database:
   ```sql
   SELECT role FROM memberships
   WHERE user_id=(SELECT id FROM users WHERE email='your@email.com');
   ```
   Should show `role='custodian'`

### 3. Invites Management

1. Login as custodian
2. Navigate to `/invites` (Mail icon in sidebar)
3. Click "Send Invite"
4. Fill form and send
5. Check invite appears in table
6. Test actions: Copy link, Resend, Cancel

## Database Quick Checks

```bash
psql -U postgres -d family_tree_dev
```

```sql
-- Check users
SELECT id, email, display_name, created_at FROM users;

-- Check trees and custodians
SELECT t.name, u.email, m.role
FROM trees t
JOIN memberships m ON t.id = m.tree_id
JOIN users u ON m.user_id = u.id;

-- Check invites
SELECT email, role, token, accepted_at, expires_at
FROM invites
ORDER BY created_at DESC;
```

## What's Fixed

✅ **Display Name:** Properly saved during registration  
✅ **Custodian Role:** Auto-assigned when creating tree (was already working)  
✅ **Invites Page:** Full management UI for custodians  
✅ **TreeSettings:** Supports both camelCase (frontend) and snake_case (backend)

## Troubleshooting

**Build failed?**

```bash
cd apps/frontend/family-tree
npm install
npx shadcn@latest add select table
npm run build
```

**Database errors?**

```bash
cd apps/backend
alembic upgrade head
```

**Import errors?**

```bash
cd apps/backend
source .venv/bin/activate.fish
python -c "from models import User, Tree, Member, Event, Photo; print('✅ OK')"
```

## Files to Check

- Backend: `apps/backend/api/auth.py` (display_name handling)
- Frontend: `apps/frontend/family-tree/src/app/(dashboard)/invites/page.tsx`
- Docs: `IMPLEMENTATION_COMPLETE.md`, `BUGFIX_USER_REGISTRATION_INVITES.md`
