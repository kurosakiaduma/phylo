# Authentication System Documentation

## Overview

The Family Tree application uses a **passwordless OTP (One-Time Password)** authentication system. Users receive a 6-digit code via email, which they use to sign in securely without needing to remember passwords.

## Features

✅ **Passwordless Authentication** - No passwords to remember or manage  
✅ **Email-based OTP** - 6-digit codes sent via Mailtrap API  
✅ **Rate Limiting** - Protection against abuse (3 requests per 15 minutes)  
✅ **JWT Session Tokens** - Secure, stateless authentication  
✅ **HttpOnly Cookies** - Protected against XSS attacks  
✅ **Elegant Email Templates** - Tailwind-inspired responsive HTML emails  
✅ **Auto User Creation** - Users created on first successful login

## Architecture

### Components

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │
         │ HTTP/JSON
         │
┌────────▼────────┐
│   FastAPI       │
│   Backend       │
├─────────────────┤
│ • Auth Routes   │
│ • JWT Utils     │
│ • Rate Limiter  │
│ • Dependencies  │
└────────┬────────┘
         │
    ┌────┴─────┬─────────┐
    │          │         │
┌───▼───┐  ┌──▼──┐  ┌──▼──────┐
│ DB    │  │Email│  │Templates│
│(PG)   │  │(MT) │  │ (HTML)  │
└───────┘  └─────┘  └─────────┘
```

### File Structure

```
apps/backend/
├── api/
│   └── auth.py              # Authentication endpoints
├── utils/
│   ├── auth.py              # JWT token utilities
│   ├── rate_limit.py        # Rate limiting logic
│   └── dependencies.py      # FastAPI dependencies
├── services/
│   ├── email.py             # Mailtrap email sender
│   └── templates.py         # HTML email templates
├── models/__init__.py       # OTPCode and User models
├── schemas/__init__.py      # Pydantic schemas
└── test_auth_flow.py        # Test script
```

## API Endpoints

### 1. Request OTP

**POST** `/api/auth/otp/request`

Request a verification code to be sent to your email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "status": "ok",
  "message": "Verification code sent to your email",
  "remaining_requests": 2
}
```

**Response (429 Too Many Requests):**

```json
{
  "detail": "Too many OTP requests. Please try again in 15 minutes."
}
```

**Rate Limit:** 3 requests per email per 15 minutes

---

### 2. Verify OTP

**POST** `/api/auth/otp/verify`

Verify the OTP code and receive a session token.

**Request:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200 OK):**

```json
{
  "status": "verified",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "user",
    "created_at": "2025-10-01T12:00:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 2592000
}
```

**Response (400 Bad Request):**

```json
{
  "detail": "Invalid verification code"
}
```

**Cookie Set:**

- Name: `family_tree_session`
- HttpOnly: `true`
- Secure: `true` (production)
- SameSite: `lax`
- Max-Age: 30 days

---

### 3. Get Current User

**GET** `/api/auth/me`

Get information about the currently authenticated user.

**Authentication Required:** Yes (Cookie or Bearer token)

**Response (200 OK):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "display_name": "user",
  "created_at": "2025-10-01T12:00:00"
}
```

**Response (401 Unauthorized):**

```json
{
  "detail": "Could not validate credentials"
}
```

---

### 4. Refresh Token

**POST** `/api/auth/refresh`

Refresh the authentication token with a new expiration time.

**Authentication Required:** Yes

**Response (200 OK):**

```json
{
  "status": "ok",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 2592000
}
```

---

### 5. Logout

**POST** `/api/auth/logout`

Logout the current user by clearing the session cookie.

**Response (200 OK):**

```json
{
  "status": "ok",
  "message": "Logged out successfully"
}
```

## Email Templates

### OTP Email

**Subject:** "Your Verification Code - Family Tree"

Features:

- Large, easy-to-read 6-digit code
- 10-minute expiration notice
- Gradient purple header
- Responsive design
- Security notice

### Invite Email

**Subject:** "Join Our Family Tree"

Features:

- Tree name and inviter information
- Role badge with color coding
- Call-to-action button
- Expiration notice (7 days)
- Responsive design

## Security Features

### JWT Tokens

- **Algorithm:** HS256
- **Expiration:** 30 days (configurable)
- **Payload:**
  ```json
  {
    "sub": "user-id",
    "email": "user@example.com",
    "iat": 1633024800,
    "exp": 1635616800
  }
  ```

### Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 3 per email
- **Storage:** In-memory (use Redis in production)
- **Auto Cleanup:** Expired entries removed periodically

### OTP Security

- **Format:** 6-digit numeric code
- **Expiration:** 10 minutes
- **Single Use:** Marked as used after verification
- **Generation:** Cryptographically random via UUID

### Cookie Security

- **HttpOnly:** Prevents JavaScript access (XSS protection)
- **Secure:** HTTPS only in production
- **SameSite:** `lax` (CSRF protection)
- **Max-Age:** 30 days

## Environment Variables

Required variables in `.env`:

```bash
# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# Mailtrap API
MAILTRAP_API_TOKEN=your-token-here
MAILTRAP_SENDER_EMAIL=no-reply@yourdomain.com
MAILTRAP_INBOX_ID=your-inbox-id

# Database
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
```

## Usage Examples

### Frontend Integration (Next.js)

```typescript
// Request OTP
const requestOtp = async (email: string) => {
  const response = await fetch('/api/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// Verify OTP
const verifyOtp = async (email: string, code: string) => {
  const response = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
    credentials: 'include', // Important for cookies
  });
  return response.json();
};

// Get current user
const getCurrentUser = async () => {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
  });
  if (!response.ok) return null;
  return response.json();
};

// Logout
const logout = async () => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
};
```

### Protected Routes

Use the `get_current_user` dependency:

```python
from fastapi import Depends
from utils.dependencies import get_current_user
import models

@router.get('/protected-resource')
async def protected_route(
    current_user: models.User = Depends(get_current_user)
):
    return {"message": f"Hello {current_user.email}"}
```

### Role-Based Authorization

```python
from fastapi import Depends
from utils.dependencies import require_role
from uuid import UUID

@router.patch('/trees/{tree_id}')
async def update_tree(
    tree_id: UUID,
    current_user = Depends(require_role(tree_id, 'custodian'))
):
    # Only custodians can update tree settings
    return {"message": "Tree updated"}
```

## Testing

### Manual Testing

1. Start the backend server:

   ```bash
   cd apps/backend
   uvicorn api.main:app --reload
   ```

2. Run the test script:

   ```bash
   python test_auth_flow.py
   ```

3. Check your Mailtrap inbox for the OTP code

### Automated Testing

```bash
pytest test_auth_flow.py -v
```

## Migration to Production

### 1. Use Redis for Rate Limiting

Replace in-memory storage with Redis:

```python
import redis
from datetime import timedelta

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def check_rate_limit(key: str, max_requests: int, window_minutes: int):
    pipe = redis_client.pipeline()
    now = time.time()
    window_start = now - (window_minutes * 60)

    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_minutes * 60)

    results = pipe.execute()
    count = results[2]

    return count <= max_requests, max_requests - count
```

### 2. Enable HTTPS Cookie Security

Update cookie settings:

```python
import os

ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')

response.set_cookie(
    key=SESSION_COOKIE_NAME,
    value=access_token,
    httponly=True,
    secure=ENVIRONMENT == 'production',  # True in production
    samesite='lax',
    max_age=cookie_max_age,
    domain='.yourdomain.com'  # Add domain in production
)
```

### 3. Rotate Secret Keys

Use environment-specific secrets:

```bash
# Production
SECRET_KEY=$(openssl rand -hex 32)
```

### 4. Monitor Rate Limits

Set up alerts for suspicious activity:

```python
if not is_allowed:
    logger.warning(f"Rate limit exceeded for {email}", extra={
        'security_event': 'rate_limit_exceeded',
        'email': email,
        'ip': request.client.host
    })
```

## Troubleshooting

### "Invalid verification code"

- Check if code has expired (10 minutes)
- Verify code hasn't been used already
- Ensure correct email address

### "Too many OTP requests"

- Wait 15 minutes before retrying
- Check rate limiter configuration
- Consider resetting rate limit in development

### "Could not validate credentials"

- Check if token has expired
- Verify SECRET_KEY matches between token creation and verification
- Ensure cookie is being sent with requests

### Email not received

- Check Mailtrap inbox
- Verify MAILTRAP_API_TOKEN is correct
- Check MAILTRAP_INBOX_ID matches your inbox
- Review email service logs

## Future Enhancements

- [ ] SMS-based OTP (Twilio integration)
- [ ] Remember device functionality
- [ ] 2FA for custodian accounts
- [ ] Biometric authentication (WebAuthn)
- [ ] Social login (Google, GitHub)
- [ ] Session management dashboard
- [ ] IP-based rate limiting
- [ ] Suspicious login detection

## Support

For issues or questions:

- Check the logs: `tail -f api.log`
- Review Mailtrap inbox activity
- Test with `test_auth_flow.py`
- Check environment variables

---

**Last Updated:** October 1, 2025  
**Version:** 1.0.0
