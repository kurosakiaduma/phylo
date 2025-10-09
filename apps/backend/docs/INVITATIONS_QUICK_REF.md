# Invitation System - Quick Reference

## Endpoints

| Method | Endpoint                       | Auth      | Description         |
| ------ | ------------------------------ | --------- | ------------------- |
| POST   | `/api/invites`                 | Custodian | Send invitation     |
| POST   | `/api/invites/{token}/resend`  | Custodian | Resend invitation   |
| GET    | `/api/invites/{token}`         | None      | View invite details |
| POST   | `/api/invites/{token}/accept`  | Required  | Accept invitation   |
| GET    | `/api/trees/{tree_id}/invites` | Custodian | List tree invites   |
| DELETE | `/api/invites/{token}`         | Custodian | Cancel invitation   |

## Quick Examples

### Send Invite

```bash
curl -X POST http://localhost:8000/api/invites \
  -H "Content-Type: application/json" \
  -b "access_token=TOKEN" \
  -d '{"tree_id":"UUID","email":"user@test.com","role":"viewer"}'
```

### Resend Invite

```bash
curl -X POST http://localhost:8000/api/invites/TOKEN/resend \
  -b "access_token=TOKEN"
```

### View Invite (No Auth)

```bash
curl http://localhost:8000/api/invites/TOKEN
```

### Accept Invite

```bash
curl -X POST http://localhost:8000/api/invites/TOKEN/accept \
  -b "access_token=TOKEN"
```

### List Invites

```bash
curl http://localhost:8000/api/trees/UUID/invites \
  -b "access_token=TOKEN"
```

### Cancel Invite

```bash
curl -X DELETE http://localhost:8000/api/invites/TOKEN \
  -b "access_token=TOKEN"
```

## Roles

- **custodian**: Full admin access
- **contributor**: Can add/edit members
- **viewer**: Read-only access

## Key Features

- ✅ **7-day expiry**: Invites expire automatically
- ✅ **Max 3 resends**: Prevents abuse
- ✅ **Auto-cleanup**: Celery task runs daily at 2 AM UTC
- ✅ **Email validation**: Must match invited email
- ✅ **Duplicate prevention**: Can't invite existing members

## Error Codes

- `201`: Invite created
- `200`: Success
- `204`: Deleted
- `400`: Bad request (expired, wrong email, already member)
- `401`: Unauthorized
- `403`: Forbidden (not custodian)
- `404`: Not found
- `409`: Conflict (duplicate invite)

## Environment Variables

```bash
MAILTRAP_API_KEY=your_key
FROM_EMAIL=noreply@familytree.app
FROM_NAME="Family Tree"
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379/0
```

## Background Tasks

### Start Celery Worker

```bash
celery -A tasks.celery_tasks worker --loglevel=info
```

### Start Celery Beat (Scheduler)

```bash
celery -A tasks.celery_tasks beat --loglevel=info
```

### Manual Cleanup

```python
from tasks.celery_tasks import cleanup_expired_invites
result = cleanup_expired_invites.delay()
```

## Testing

```bash
pytest tests/test_invites.py -v
```

## Frontend Flow

1. User receives email with token
2. Frontend shows invite details (no auth)
3. User signs in/up
4. User accepts invite (auth required)
5. Redirect to tree

## Common Issues

### Emails not sending?

- Check `MAILTRAP_API_KEY`
- Verify Mailtrap dashboard
- Check logs: `tail -f logs/app.log | grep "invitation"`

### Cleanup not running?

- Start Celery worker and beat
- Check Redis connection
- Test manually: `python -c "from tasks.celery_tasks import cleanup_expired_invites; cleanup_expired_invites()"`

### Can't accept invite?

- Check email matches invited email
- Verify invite not expired
- Ensure user is authenticated

## Documentation

Full documentation: `docs/INVITATIONS.md`
