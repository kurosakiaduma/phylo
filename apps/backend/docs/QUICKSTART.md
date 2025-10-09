# 🚀 Quick Start Guide - Authentication System

## Prerequisites

- Python 3.11+ installed
- PostgreSQL database running
- Mailtrap account (free tier works)

## Step 1: Environment Setup

1. **Get Mailtrap Credentials:**
   - Sign up at [mailtrap.io](https://mailtrap.io)
   - Go to Email Testing → Inboxes
   - Click on your inbox
   - Copy your Inbox ID
   - Go to Settings → API Tokens
   - Generate a new token

2. **Configure Environment Variables:**

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` and set:

```bash
# Mailtrap (from your dashboard)
MAILTRAP_API_TOKEN=your_actual_token_here
MAILTRAP_SENDER_EMAIL=no-reply@yourdomain.com
MAILTRAP_INBOX_ID=your_inbox_id_here

# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)

# Database (update if needed)
DATABASE_URL=postgresql+psycopg://postgres:@localhost:5432/family_tree_dev
```

## Step 2: Install Dependencies

```bash
# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate     # Windows

# Install/upgrade packages (already done if following main setup)
pip install -r requirements.txt
```

## Step 3: Run Database Migrations

```bash
# Make sure migrations are up to date
alembic upgrade head
```

You should see:

```
INFO  [alembic.runtime.migration] Running upgrade 92f6e9468cb4 -> 996fe3ad69c3, add_composite_indexes_to_memberships_and_relationships
```

## Step 4: Start the Server

```bash
uvicorn api.main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

## Step 5: Test Authentication

### Option A: Using the Test Script (Recommended)

In a new terminal:

```bash
cd apps/backend
source .venv/bin/activate
python test_auth_flow.py
```

Follow the prompts:

1. Enter email when requested
2. Check your Mailtrap inbox for the OTP code
3. Enter the code when prompted
4. Verify all tests pass ✅

### Option B: Using cURL

**Request OTP:**

```bash
curl -X POST http://localhost:8000/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Check Mailtrap Inbox** for the 6-digit code, then:

**Verify OTP:**

```bash
curl -X POST http://localhost:8000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}' \
  -c cookies.txt
```

**Get Current User:**

```bash
curl http://localhost:8000/api/auth/me \
  -b cookies.txt
```

**Logout:**

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -b cookies.txt
```

### Option C: Using the API Docs (Swagger UI)

1. Open browser to: http://localhost:8000/docs
2. Try out the endpoints interactively
3. Check Mailtrap for OTP codes

## Step 6: Verify Email Templates

1. Request an OTP through any method above
2. Open your Mailtrap inbox
3. You should see a beautiful email with:
   - Purple gradient header
   - Large 6-digit code
   - Professional styling
   - Responsive design

## Troubleshooting

### "mailtrap-credentials-missing"

- Check that all three Mailtrap env vars are set
- Restart the server after changing .env

### "Invalid verification code"

- OTP codes expire in 10 minutes
- Each code can only be used once
- Make sure email matches

### "Too many OTP requests"

- Wait 15 minutes before retrying
- Or reset with: `python -c "from utils.rate_limit import reset_rate_limit; reset_rate_limit('otp_request:your@email.com')"`

### Email not received

- Check Mailtrap inbox (not your real inbox!)
- Verify MAILTRAP_INBOX_ID is correct
- Check server logs for errors

### Connection errors

- Verify database is running: `psql -U postgres -c "SELECT 1"`
- Check DATABASE_URL is correct
- Ensure port 8000 is available

## Next Steps

### Frontend Integration

See `docs/AUTHENTICATION.md` for:

- React/Next.js integration examples
- API usage patterns
- Error handling strategies

### Production Deployment

Before going to production:

1. ✅ Use a strong, random SECRET_KEY
2. ✅ Switch to production Mailtrap account
3. ✅ Enable HTTPS (secure cookies)
4. ✅ Use Redis for rate limiting
5. ✅ Set up monitoring/alerts
6. ✅ Configure CORS properly

### Development Workflow

```bash
# Terminal 1: Backend server
cd apps/backend
source .venv/bin/activate
uvicorn api.main:app --reload

# Terminal 2: Run tests
cd apps/backend
python test_auth_flow.py

# Terminal 3: Check logs
tail -f logs/api.log  # if logging to file
```

## Useful Commands

```bash
# Check if server is running
curl http://localhost:8000/api/health

# View all routes
curl http://localhost:8000/openapi.json | jq '.paths | keys'

# Reset rate limit for an email
python -c "from utils.rate_limit import reset_rate_limit; reset_rate_limit('otp_request:email@example.com')"

# Generate a new secret key
openssl rand -hex 32

# Check database connection
python -c "from utils.db import engine; print(engine.url)"
```

## Support

If you encounter issues:

1. Check the logs
2. Read `docs/AUTHENTICATION.md`
3. Try the test script: `python test_auth_flow.py`
4. Verify environment variables
5. Check Mailtrap dashboard for API status

---

**You're all set!** 🎉

The authentication system is now ready to use. You can proceed to implement the Tree Management endpoints (Phase 2.5) or integrate with the frontend.
