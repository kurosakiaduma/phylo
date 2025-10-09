# Authentication Testing Guide

## Prerequisites

- Backend server running on `http://localhost:8000`
- Frontend dev server running on `http://localhost:3001`
- Valid email service configured on backend for OTP delivery

## Quick Start Testing

### 1. Start the Development Server

```bash
cd apps/frontend/family-tree
npm run dev
```

The application will be available at `http://localhost:3001`

### 2. Test Login Flow

#### Step-by-Step:

1. Open browser to `http://localhost:3001`
2. Click the **"Sign In"** button (gradient blue-green button)
3. **Email Input Step:**

   - Enter a valid email address
   - Click "Send Code" button
   - Should see toast: "Code Sent! 📧 Check your email for the verification code."
   - Modal should transition to OTP input step

4. **OTP Verification Step:**
   - Check the email inbox for the 6-digit code
   - Enter the code in the input field
   - Click "Verify & Sign In" button
   - Should see toast: "Login Successful! 🎉 Welcome back!"
   - Should redirect to `/trees` page (or saved location)

#### Expected Behaviors:

- ✅ Empty email → Toast error: "Invalid Email - Please enter a valid email address"
- ✅ Invalid email format → Same validation error
- ✅ Valid email → Success toast + step transition
- ✅ Wrong OTP code → Toast error from backend
- ✅ Correct OTP → Success + redirect
- ✅ Loading spinner shows during API calls
- ✅ Buttons disabled during loading

### 3. Test Registration Flow

#### Step-by-Step:

1. From landing page, click **"Get Started"** button (outlined button)
2. **Registration Step:**

   - Enter display name (e.g., "John Doe")
   - Enter email address
   - Click "Create Account" button
   - Should see toast: "Code Sent! 📧"
   - Modal should transition to OTP input step

3. **OTP Verification Step:**
   - Check email for 6-digit code
   - Enter the code
   - Click "Verify & Continue" button
   - Should see toast: "Account Created! 🎉"
   - Should redirect to `/onboarding` page

#### Expected Behaviors:

- ✅ Empty display name → Toast error: "Invalid Input"
- ✅ Whitespace-only name → Same validation error
- ✅ Name > 50 chars → Validation error
- ✅ Invalid email → Toast error: "Invalid Email"
- ✅ Valid inputs → Success toast + step transition
- ✅ Existing email → Backend error toast
- ✅ Correct OTP → Success + redirect to onboarding

### 4. Test Navigation & Back Button

#### In Login Modal:

1. Enter email, send code
2. Click "Back" button in OTP step
3. Should return to email input step
4. Email field should still have previous value

#### In Register Modal:

1. Enter name + email, send code
2. Click "Back" button in OTP step
3. Should return to registration form
4. Both fields should retain previous values

### 5. Test Error Handling

#### Invalid OTP Code:

- Enter wrong 6-digit code
- Should show toast with backend error message
- Should NOT redirect
- Should allow retry

#### Network Error:

- Stop backend server
- Try to send OTP code
- Should show toast: "Failed to send code. Please try again."

#### Session Expiry (Future):

- After JWT expires, API calls return 401
- Should clear auth state
- Should redirect to login

## Manual Test Checklist

### Landing Page

- [ ] "Sign In" button renders correctly
- [ ] "Get Started" button renders correctly
- [ ] Clicking "Sign In" opens LoginModal
- [ ] Clicking "Get Started" opens RegisterModal
- [ ] Modal backdrop blurs content behind
- [ ] Dark mode toggle works on modals

### LoginModal

- [ ] Modal opens with email input visible
- [ ] Email validation works (format check)
- [ ] "Send Code" triggers OTP request
- [ ] Success toast appears after sending
- [ ] Modal transitions to OTP step
- [ ] OTP input accepts 6 digits
- [ ] "Back" button returns to email step
- [ ] "Verify & Sign In" validates OTP
- [ ] Success redirects to `/trees`
- [ ] Loading spinners appear during API calls
- [ ] Buttons disable during loading
- [ ] Error toasts show on failure

### RegisterModal

- [ ] Modal opens with name + email inputs
- [ ] Display name validation (1-50 chars, not empty)
- [ ] Email format validation
- [ ] "Create Account" sends OTP
- [ ] Success toast appears
- [ ] Modal transitions to OTP step
- [ ] "Back" button returns to registration form
- [ ] "Verify & Continue" validates OTP
- [ ] Success redirects to `/onboarding`
- [ ] Loading states work correctly
- [ ] Error handling works

### Auth State (Zustand)

- [ ] After login, `useAuth().user` is populated
- [ ] `useAuth().isAuthenticated` is `true`
- [ ] User data persists after page refresh
- [ ] Logout clears user state
- [ ] localStorage cleared on logout

## API Integration Tests

### Backend Endpoints to Verify:

#### 1. Request OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "OTP sent to email"
}
```

#### 2. Verify OTP (Login)

```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp_code": "123456"}'
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "test@example.com",
    "display_name": "Test User",
    "is_active": true,
    "created_at": "2025-01-10T12:00:00Z"
  }
}
```

**Expected Headers:**

```
Set-Cookie: jwt=eyJ...; Path=/; HttpOnly; Secure; SameSite=Lax
```

#### 3. Get Current User

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Cookie: jwt=eyJ..." \
  --cookie-jar cookies.txt
```

**Expected Response:**

```json
{
  "id": 1,
  "email": "test@example.com",
  "display_name": "Test User",
  "is_active": true,
  "created_at": "2025-01-10T12:00:00Z"
}
```

#### 4. Logout

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Cookie: jwt=eyJ..." \
  --cookie-jar cookies.txt
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Expected Headers:**

```
Set-Cookie: jwt=; Path=/; Max-Age=0
```

## Browser DevTools Checks

### 1. Network Tab

- Check that OTP requests go to `/api/v1/auth/otp/request`
- Verify `credentials: 'include'` sends cookies
- Check response status codes (200 for success, 400/401/500 for errors)

### 2. Application Tab (Storage)

- **Cookies:** Look for `jwt` cookie after successful login
  - Should be `HttpOnly`
  - Should be `Secure` (in production)
  - Path: `/`
- **localStorage:** Look for `auth-storage` key
  - Contains: `{ state: { user, isAuthenticated }, version: 0 }`

### 3. Console Tab

- No errors or warnings (except expected API errors during testing)
- Zustand DevTools (if installed) shows auth state updates

## Performance Checks

### Loading States

- [ ] Spinners appear immediately on button click
- [ ] Buttons disable during loading
- [ ] No double-submissions possible

### Transitions

- [ ] Modal step transitions are smooth
- [ ] No flash of wrong content
- [ ] Back button works instantly

### Toast Notifications

- [ ] Toasts appear promptly
- [ ] Toasts auto-dismiss after timeout
- [ ] Multiple toasts stack properly
- [ ] Toasts readable in both light/dark mode

## Edge Cases to Test

### 1. Rapid Clicking

- Click "Send Code" multiple times quickly
- Should only trigger one request (loading state prevents)

### 2. Modal Closing

- Open LoginModal, close it, reopen
- Should reset to email step
- Previous email should be cleared

### 3. Browser Back Button

- Login successfully, navigate to /trees
- Press browser back button
- Should stay on /trees (logged in)

### 4. Direct URL Access

- While logged out, navigate to `/trees`
- Should redirect to `/login?returnUrl=/trees`

### 5. Session Persistence

- Login successfully
- Refresh page
- Should remain logged in (localStorage rehydration)

### 6. Multiple Tabs

- Login in Tab 1
- Open Tab 2
- Tab 2 should also show logged-in state (localStorage sync)

## Accessibility Testing

### Keyboard Navigation

- [ ] Tab through all form inputs
- [ ] Enter key submits forms
- [ ] Escape key closes modals

### Screen Reader

- [ ] Form labels properly associated
- [ ] Error messages announced
- [ ] Loading states announced

### Focus Management

- [ ] Focus trapped within modal
- [ ] Focus returns to trigger after modal closes
- [ ] First input auto-focused when modal opens

## Dark Mode Testing

- [ ] Toggle dark mode on landing page
- [ ] Open LoginModal → text readable
- [ ] Input fields visible in dark mode
- [ ] Buttons have proper contrast
- [ ] Toast notifications readable
- [ ] Modal backdrop appropriate opacity

## Responsive Design Testing

### Mobile (375px width)

- [ ] Modals fit screen width
- [ ] Buttons not too small
- [ ] Text readable size
- [ ] Inputs usable

### Tablet (768px width)

- [ ] Layout looks good
- [ ] No weird spacing

### Desktop (1920px width)

- [ ] Modal centered
- [ ] Not too wide
- [ ] Comfortable reading

## Common Issues & Solutions

### Issue: "Failed to send code"

**Cause:** Backend not running or wrong URL
**Fix:** Check backend server on port 8000

### Issue: "Invalid credentials"

**Cause:** Wrong OTP code or expired
**Fix:** Request new code, check email

### Issue: "Network error"

**Cause:** CORS, API proxy misconfigured
**Fix:** Check `next.config.js` rewrites

### Issue: "Cookie not set"

**Cause:** Backend not sending Set-Cookie header
**Fix:** Check backend auth endpoint

### Issue: State not persisting

**Cause:** localStorage disabled or cleared
**Fix:** Check browser settings, incognito mode blocks localStorage

## Automated Testing (Future)

### Unit Tests (Jest + React Testing Library)

```typescript
// src/components/auth/__tests__/login-modal.test.tsx
describe('LoginModal', () => {
  it('validates email format', () => { ... })
  it('shows OTP step after sending code', () => { ... })
  it('calls verifyOTP with correct params', () => { ... })
})
```

### Integration Tests (Playwright/Cypress)

```typescript
// e2e/auth.spec.ts
test('user can login with OTP', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Sign In')
  await page.fill('input[type=email]', 'test@example.com')
  await page.click('text=Send Code')
  // ... check email for code, enter it
})
```

---

**Testing Status:** Ready for manual testing
**Prerequisites:** Backend OTP service configured and running
**Next Steps:** Test each flow, report bugs, iterate on UX
