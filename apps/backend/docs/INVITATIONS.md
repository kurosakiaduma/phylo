# Invitation System Documentation

## Overview

The invitation system allows tree custodians to invite new members to join family trees. It provides elegant UX for non-tech-savvy users with features like email resending and automatic cleanup.

## Features

- 🔐 **Custodian-Only Authorization**: Only custodians can send invitations
- 📧 **Elegant Email Templates**: Beautiful HTML emails with tree context
- 🔄 **Resend Functionality**: Easy resending for lost emails
- ⏰ **Automatic Expiry**: Invites expire after 7 days
- 🧹 **Background Cleanup**: Celery task removes expired invites daily
- ✅ **Validation**: Prevents duplicate invites and existing member invitations

## Endpoints

### 1. Send Invitation

Send an invitation to join a tree.

**Endpoint:** `POST /api/invites`  
**Authentication:** Required (Custodian only)

**Request Body:**

```json
{
  "tree_id": "uuid",
  "email": "user@example.com",
  "role": "viewer" // "custodian", "contributor", or "viewer"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "tree_id": "uuid",
  "email": "user@example.com",
  "role": "viewer",
  "token": "secure-random-token",
  "expires_at": "2024-01-15T12:00:00Z",
  "accepted_at": null,
  "created_at": "2024-01-08T12:00:00Z"
}
```

**Errors:**

- `403 Forbidden`: Not a custodian
- `400 Bad Request`: User already a member
- `409 Conflict`: Active invite already exists
- `404 Not Found`: Tree not found

**Example:**

```bash
curl -X POST http://localhost:8000/api/invites \
  -H "Content-Type: application/json" \
  -b "access_token=YOUR_TOKEN" \
  -d '{
    "tree_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "newmember@example.com",
    "role": "contributor"
  }'
```

---

### 2. Resend Invitation

Resend invitation email for lost or expired invites.

**Endpoint:** `POST /api/invites/{token}/resend`  
**Authentication:** Required (Custodian only)

**Response (200 OK):**

```json
{
  "id": "uuid",
  "tree_id": "uuid",
  "email": "user@example.com",
  "role": "viewer",
  "token": "new-token-if-expired",
  "expires_at": "2024-01-22T12:00:00Z",
  "accepted_at": null,
  "created_at": "2024-01-15T12:00:00Z"
}
```

**Behavior:**

- If invite is still valid: Resends email with same token
- If invite is expired: Creates new invite with new token and new expiry
- Tracks resend count (max 3 resends to prevent abuse)

**Errors:**

- `404 Not Found`: Invite not found
- `403 Forbidden`: Not a custodian
- `400 Bad Request`: Already accepted or max resends reached

**Example:**

```bash
curl -X POST http://localhost:8000/api/invites/secure-token-123/resend \
  -b "access_token=YOUR_TOKEN"
```

---

### 3. View Invitation Details

View invitation details before accepting.

**Endpoint:** `GET /api/invites/{token}`  
**Authentication:** **Not required** (public endpoint)

**Response (200 OK):**

```json
{
  "id": "uuid",
  "tree_id": "uuid",
  "tree_name": "Smith Family Tree",
  "tree_description": "Our family history spanning 5 generations",
  "email": "user@example.com",
  "role": "viewer",
  "token": "secure-token",
  "expires_at": "2024-01-15T12:00:00Z",
  "created_at": "2024-01-08T12:00:00Z",
  "inviter_name": "John Smith"
}
```

**Errors:**

- `404 Not Found`: Invite not found
- `400 Bad Request`: Invite expired or already accepted

**Example:**

```bash
curl http://localhost:3000/invites/secure-token-123
```

---

### 4. Accept Invitation

Accept an invitation and join the tree.

**Endpoint:** `POST /api/invites/{token}/accept`  
**Authentication:** Required

**Response (200 OK):**

```json
{
  "user_id": "uuid",
  "user_email": "user@example.com",
  "user_display_name": "Jane Doe",
  "role": "viewer",
  "joined_at": "2024-01-08T14:30:00Z"
}
```

**Behavior:**

- Creates membership record with specified role
- Marks invitation as accepted
- Verifies email matches authenticated user

**Errors:**

- `404 Not Found`: Invite not found
- `400 Bad Request`: Expired, already accepted, email mismatch, or already member
- `401 Unauthorized`: Not authenticated

**Example:**

```bash
curl -X POST http://localhost:8000/api/invites/secure-token-123/accept \
  -b "access_token=YOUR_TOKEN"
```

---

### 5. List Tree Invitations

List all invitations for a tree.

**Endpoint:** `GET /api/trees/{tree_id}/invites`  
**Authentication:** Required (Custodian only)

**Query Parameters:**

- `include_expired` (bool, default: false): Include expired invites
- `include_accepted` (bool, default: false): Include accepted invites

**Response (200 OK):**

```json
[
  {
    "id": "uuid",
    "tree_id": "uuid",
    "email": "user1@example.com",
    "role": "contributor",
    "token": "token-1",
    "expires_at": "2024-01-15T12:00:00Z",
    "accepted_at": null,
    "created_at": "2024-01-08T12:00:00Z"
  },
  {
    "id": "uuid",
    "tree_id": "uuid",
    "email": "user2@example.com",
    "role": "viewer",
    "token": "token-2",
    "expires_at": "2024-01-20T12:00:00Z",
    "accepted_at": "2024-01-10T08:00:00Z",
    "created_at": "2024-01-05T12:00:00Z"
  }
]
```

**Errors:**

- `404 Not Found`: Tree not found
- `403 Forbidden`: Not a custodian

**Example:**

```bash
curl http://localhost:8000/api/trees/123e4567-e89b-12d3-a456-426614174000/invites?include_expired=true \
  -b "access_token=YOUR_TOKEN"
```

---

### 6. Cancel Invitation

Cancel/revoke an invitation.

**Endpoint:** `DELETE /api/invites/{token}`  
**Authentication:** Required (Custodian only)

**Response:** `204 No Content`

**Errors:**

- `404 Not Found`: Invite not found
- `403 Forbidden`: Not a custodian
- `400 Bad Request`: Already accepted (cannot cancel accepted invites)

**Example:**

```bash
curl -X DELETE http://localhost:8000/api/invites/secure-token-123 \
  -b "access_token=YOUR_TOKEN"
```

---

## Email Templates

The invitation system sends elegant HTML emails with:

- **Tree Context**: Name, description, and inviter information
- **Role Description**: Clear explanation of permissions
- **Expiry Information**: When the invite expires
- **Call-to-Action**: Prominent "Accept Invitation" button
- **Resend Instructions**: Help text for lost emails
- **Responsive Design**: Works on all devices

### Email Preview

```
🌳 Family Tree Invitation

Hello! 👋

John Smith has invited you to join the "Smith Family Tree" family tree.

┌─────────────────────────────────────┐
│ Tree Name: Smith Family Tree        │
│ Your Role: Contributor              │
│ Invitation Expires: Jan 15, 2024    │
└─────────────────────────────────────┘

[Accept Invitation]

📩 Lost this email?
Contact John Smith to resend the invitation.
```

---

## Background Cleanup

The system includes a Celery task that runs daily at 2 AM UTC to clean up expired invitations.

### Cleanup Task

**Task:** `cleanup_expired_invites`  
**Schedule:** Daily at 2:00 AM UTC  
**Removes:**

- Invites that have expired and not been accepted
- Invites older than 30 days (regardless of expiry)

### Manual Cleanup

You can manually trigger cleanup:

```python
from tasks.celery_tasks import cleanup_expired_invites

result = cleanup_expired_invites.delay()
print(result.get())  # {'success': True, 'expired_removed': 5, 'old_removed': 2}
```

### Accepted Invites Cleanup

Optional task to remove old accepted invites:

```python
from tasks.celery_tasks import cleanup_accepted_invites

# Remove accepted invites older than 90 days
result = cleanup_accepted_invites.delay(days_old=90)
```

---

## Configuration

### Environment Variables

```bash
# Email Service
MAILTRAP_API_KEY=your_api_key
FROM_EMAIL=noreply@familytree.app
FROM_NAME="Family Tree"

# Frontend URL (for invite links)
FRONTEND_URL=http://localhost:3000

# Celery (for background tasks)
REDIS_URL=redis://localhost:6379/0

# Database
DATABASE_URL=postgresql://user:pass@localhost/family_tree_dev
```

### Invite Settings

Configure in `api/invites.py`:

```python
INVITE_EXPIRY_DAYS = 7  # Invite expiry duration
MAX_RESENDS = 3          # Maximum resend attempts
```

---

## Frontend Integration

### Accept Invite Flow

1. **Receive Email**: User receives invitation email
2. **Click Link**: Email contains link to `/invites/{token}`
3. **View Details**: Frontend calls `GET /api/invites/{token}` (no auth)
4. **Display Info**: Show tree name, description, role, inviter
5. **Sign In/Up**: Prompt user to sign in or create account
6. **Accept**: Frontend calls `POST /api/invites/{token}/accept` (with auth)
7. **Redirect**: Redirect to tree page

### Frontend Components

```typescript
// invites/[token].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AcceptInvite() {
  const router = useRouter();
  const { token } = router.query;
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    // Fetch invite details (no auth required)
    fetch(`/api/invites/${token}`)
      .then(res => res.json())
      .then(setInvite);
  }, [token]);

  const handleAccept = async () => {
    // User must be logged in
    const response = await fetch(`/api/invites/${token}/accept`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      const membership = await response.json();
      router.push(`/trees/${membership.tree_id}`);
    }
  };

  return (
    <div>
      <h1>Invitation to {invite?.tree_name}</h1>
      <p>{invite?.tree_description}</p>
      <p>Role: {invite?.role}</p>
      <button onClick={handleAccept}>Accept Invitation</button>
    </div>
  );
}
```

### Resend Functionality (Custodian UI)

```typescript
// components/InviteList.tsx
const handleResend = async (token: string) => {
  const response = await fetch(`/api/invites/${token}/resend`, {
    method: 'POST',
    credentials: 'include'
  });

  if (response.ok) {
    alert('Invitation resent successfully!');
  }
};

return (
  <div>
    {invites.map(invite => (
      <div key={invite.id}>
        <span>{invite.email} - {invite.role}</span>
        <button onClick={() => handleResend(invite.token)}>
          Resend
        </button>
      </div>
    ))}
  </div>
);
```

---

## Error Handling

### Common Errors

**1. Email Mismatch**

```json
{
  "detail": "This invitation is for user@example.com, but you are logged in as other@example.com"
}
```

**Solution**: User must log in with the invited email address.

**2. Invite Expired**

```json
{
  "detail": "This invitation has expired. Please contact the tree custodian for a new invite."
}
```

**Solution**: Contact tree custodian to resend invitation.

**3. Already Member**

```json
{
  "detail": "You are already a member of this tree"
}
```

**Solution**: User is already a member, no action needed.

**4. Max Resends Reached**

```json
{
  "detail": "Maximum resend limit (3) reached for this invitation"
}
```

**Solution**: Create a new invitation instead of resending.

---

## Testing

Run invitation tests:

```bash
cd apps/backend
pytest tests/test_invites.py -v
```

Test coverage includes:

- ✅ Send invite (custodian-only)
- ✅ Non-custodian authorization check
- ✅ Duplicate invite prevention
- ✅ Already-member check
- ✅ View invite details
- ✅ Expired invite handling
- ✅ Accept invite
- ✅ Email mismatch validation
- ✅ Resend functionality
- ✅ Expired invite resend (creates new)
- ✅ List tree invites
- ✅ Cancel invite

---

## Best Practices

### For Custodians

1. **Use Descriptive Roles**: Choose appropriate roles (viewer/contributor/custodian)
2. **Resend Lost Emails**: Use resend button if user didn't receive email
3. **Monitor Invites**: Check invite list regularly to see pending invitations
4. **Cancel Unused**: Cancel invitations that won't be used

### For Developers

1. **Public View Endpoint**: `/invites/{token}` requires no auth for UX
2. **Email Validation**: Always verify email matches authenticated user
3. **Error Messages**: Provide clear, actionable error messages
4. **Logging**: Log all invite actions for audit trail
5. **Rate Limiting**: Consider rate limiting resend to prevent abuse

### For Users

1. **Check Spam**: Invitation emails may end up in spam folder
2. **Correct Email**: Must sign in with invited email address
3. **Expiry**: Accept invites within 7 days
4. **Lost Email**: Contact tree custodian to resend

---

## Security Considerations

1. **Token Security**: Uses `secrets.token_urlsafe(32)` for cryptographically secure tokens
2. **Custodian-Only**: Only custodians can send/resend/cancel invites
3. **Email Verification**: Accept endpoint verifies email matches
4. **Rate Limiting**: Max 3 resends per invite to prevent abuse
5. **Expiry**: All invites expire after 7 days
6. **Public View**: View endpoint is public but only shows non-sensitive info

---

## Troubleshooting

### Emails Not Sending

**Check:**

1. `MAILTRAP_API_KEY` is set in `.env`
2. API key is valid (check Mailtrap dashboard)
3. Check logs for email service errors
4. Verify background tasks are running

**Solution:**

```bash
# Check logs
tail -f logs/app.log | grep "invitation email"

# Test email manually
python -c "from services.email_service import send_invite_email; send_invite_email(...)"
```

### Cleanup Task Not Running

**Check:**

1. Celery worker is running
2. Redis is accessible
3. `REDIS_URL` is set in `.env`
4. Celery beat scheduler is running

**Solution:**

```bash
# Start Celery worker
celery -A tasks.celery_tasks worker --loglevel=info

# Start Celery beat (scheduler)
celery -A tasks.celery_tasks beat --loglevel=info

# Test cleanup manually
python -c "from tasks.celery_tasks import cleanup_expired_invites; cleanup_expired_invites()"
```

### Database Issues

**Check:**

1. `Invite` model exists in database
2. Migrations are up to date
3. Database connection is working

**Solution:**

```bash
# Run migrations
alembic upgrade head

# Check database
python tools/check_schema.py
```

---

## Summary

The invitation system provides:

- ✅ Custodian-only authorization
- ✅ Elegant email templates
- ✅ Resend functionality for UX
- ✅ Public view endpoint (no auth)
- ✅ Automatic expiry (7 days)
- ✅ Background cleanup (Celery)
- ✅ Comprehensive validation
- ✅ Full test coverage

For questions or issues, check logs and refer to this documentation.
