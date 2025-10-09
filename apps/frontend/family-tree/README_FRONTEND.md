# Phylo Frontend

**Last Updated: October 2, 2025 - Phase 3.3 Complete + Critical Fixes**

A modern Next.js frontend application for the Phylo family tree platform, built with TypeScript, Tailwind CSS, and shadcn/ui components. Features a complete email OTP authentication system with session persistence, dark mode support, and responsive design.

> 📚 **Documentation**: See [docs/README.md](./docs/README.md) for detailed documentation including phase summaries, design specs, and requirements.

## 🚀 Technology Stack

### Core Framework

- **Framework**: Next.js 14.1.3 - React framework with App Router
- **Language**: TypeScript 5.3.3 (strict mode)
- **React**: 18.2.0

### Styling & UI

- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: GSAP

### State Management & Data

- **State Management**: Zustand 4.x (with persist middleware)
- **Theme**: next-themes (dark mode support with system preference)
- **API Communication**: Native Fetch with Next.js rewrites

## 📋 Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Family Tree Backend API running on `http://localhost:8000`

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd apps/frontend/family-tree
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your environment:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Environment
NODE_ENV=development
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3001`.

## 🎨 Current Features (Phase 3.3 Complete)

### Landing Page (Phase 3.2.1) ✅

- ✅ Animated SVG tree logo with gradients, glow effects, and CSS animations
- ✅ Responsive two-column layout (logo + hero text | action buttons)
- ✅ Dark mode toggle with next-themes (hydration-safe)
- ✅ Gallery slideshow in About modal
- ✅ Modal-based navigation (About, Contact, Privacy)
- ✅ Fully responsive design

### Authentication System (Phase 3.3) ✅

- ✅ **Email OTP Flow**: Passwordless authentication with one-time codes via Mailtrap
- ✅ **Login Flow**: Email → OTP verification → Session established
- ✅ **Registration Flow**: Name + Email → OTP verification → Account created
- ✅ **Auth State Management**: Zustand store with localStorage persistence
- ✅ **Session Persistence**: Auth state maintained across page refreshes
- ✅ **Protected Routes**: Automatic redirects for authenticated/unauthenticated users
- ✅ **JWT Cookies**: HttpOnly, Secure cookies for session management
- ✅ **User Existence Validation**: Prevents wasteful OTP sending to non-existent users during login
- ✅ **Logout Functionality**: Complete state cleanup and session termination
- ✅ **Toast Notifications**: User feedback for all actions
- ✅ **Loading States**: Spinners and disabled buttons during API calls

### Bug Fixes & Improvements ✅

- ✅ **Email Service Integration**: Fixed Mailtrap API parameters (sender, no inbox_id)
- ✅ **OTP Field Mapping**: Fixed backend/frontend field name mismatch (code vs otp_code)
- ✅ **Timezone Handling**: Fixed naive vs aware datetime comparison errors (naive UTC throughout)
- ✅ **Auth Persistence Fix**: Fixed getCurrentUser response structure parsing
- ✅ **Auth Initialization**: Added AuthProvider component for session restoration on app mount
- ✅ **Hydration Warning Fix**: Resolved React hydration warnings with next-themes (suppressHydrationWarning)

### Current Pages

- **Landing Page** (`/`) - Marketing page with auth modals, auto-redirect for authenticated users
- **Dashboard** (`/trees`) - Protected page for authenticated users with logout
- **Onboarding** (`/onboarding`) - Welcome page for new users

### Components

- **Authentication**:
  - `LoginModal` - Two-step OTP login flow with user validation
  - `RegisterModal` - Registration with display name and OTP verification
  - `AuthProvider` - Session initialization on app mount
- **Theme**:
  - `ThemeProvider` - Dark mode support with system preference detection
  - `ThemeToggle` - Toggle button for light/dark mode
- **Layout**:
  - `Header` - Navigation header with theme toggle
- **UI Components**: Full shadcn/ui component library (Button, Dialog, Input, Label, Toast, etc.)

## 📁 Project Structure

```
apps/frontend/family-tree/

├── public/                         # Static assets
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Landing page with auth
│   │   ├── trees/
│   │   │   └── page.tsx           # Dashboard (protected)
│   │   └── onboarding/
│   │       └── page.tsx           # Welcome page (protected)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-modal.tsx    # Login with OTP flow
│   │   │   └── register-modal.tsx # Registration with OTP
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── auth-provider.tsx      # Auth initialization
│   │   ├── header.tsx             # Navigation header
│   │   ├── theme-provider.tsx     # Dark mode provider
│   │   └── theme-toggle.tsx       # Dark mode toggle button
│   ├── hooks/
│   │   ├── use-auth.ts            # Auth state (Zustand)
│   │   └── use-toast.ts           # Toast notifications
│   ├── lib/
│   │   ├── auth-api.ts            # Auth API functions
│   │   └── utils.ts               # Utility functions (cn, etc.)
│   ├── types/
│   │   └── auth.ts                # Authentication types
│   └── styles/
│       └── globals.css            # Global styles + CSS variables
├── .env.local                      # Environment variables (git-ignored)
├── .env.example                    # Environment template
├── next.config.js                  # Next.js configuration (API proxy)
├── tailwind.config.js              # Tailwind + shadcn theme
├── tsconfig.json                   # TypeScript strict mode
└── package.json                    # Dependencies
```

## 🔐 Authentication

The application uses a secure OTP (One-Time Password) authentication system with Mailtrap email delivery.

### Login Flow

1. User enters email address
2. Backend validates user exists (prevents wasteful OTP sending)
3. Backend sends 6-digit OTP to email via Mailtrap
4. User enters OTP code
5. Backend verifies OTP (timezone-safe with naive UTC)
6. Backend sets JWT cookie
7. Frontend stores user
8. User redirected to `/trees` dashboard

### Registration Flow

1. User enters display name and email
2. Backend sends OTP to email via Mailtrap
3. User enters OTP code
4. Backend creates account and sets JWT cookie
5. Frontend stores user data
6. User redirected to `/onboarding` for welcome

### Session Persistence

- **AuthProvider** component runs on app mount
- Calls `checkAuth()` to verify JWT cookie validity
- If valid: loads user data into Zustand store
- If invalid: clears state and shows login
- User stays logged in across page refreshes

### Logout Flow

1. User clicks logout button
2. Frontend calls `POST /api/auth/logout`
3. Backend clears JWT cookie
4. Frontend clears Zustand store and localStorage
5. User redirected to landing page

### Protected Routes

Pages check authentication status from `useAuth()` hook:

```typescript
const { isAuthenticated, isLoading } = useAuth()

if (isLoading) return <LoadingSpinner />
if (!isAuthenticated) redirect('/')
```

Authenticated users on landing page are auto-redirected to `/trees`.

### Security Features

- **HttpOnly Cookies**: JWT stored in HttpOnly cookie (not accessible to JavaScript)
- **Secure Flag**: Cookies only sent over HTTPS in production
- **SameSite**: CSRF protection
- **User Validation**: Login checks user existence before sending OTP
- **Timezone Safety**: All datetime operations use naive UTC to prevent comparison errors

## 🧪 Testing

### Manual Testing (Current)

All authentication flows have been manually tested and verified:

- ✅ Registration with OTP delivery
- ✅ Login with user validation
- ✅ Session persistence across page refreshes
- ✅ Protected route redirects
- ✅ Logout with state cleanup
- ✅ Dark mode toggle (no hydration warnings)
- ✅ Toast notifications for all actions
- ✅ Loading states during API calls

### Quick Test

1. Start backend: `cd apps/backend && uvicorn api.main:app --reload`
2. Start frontend: `npm run dev`
3. Open `http://localhost:3050`
4. Click "Sign In" or "Get Started"
5. Test OTP flow with valid email
6. Check session persistence by refreshing page

### Future Testing

- Unit tests for components (Jest + React Testing Library)
- Integration tests for auth flows
- E2E tests with Playwright/Cypress

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🎯 Development Roadmap

### ✅ Completed Phases

- **Phase 3.1**: Next.js project setup with TypeScript, Tailwind, shadcn/ui
- **Phase 3.2**: Custom theme with CSS variables, dark mode toggle
- **Phase 3.2.1**: Landing page with animated SVG tree, responsive layout, modals
- **Phase 3.3**: Complete authentication system with OTP flow, session persistence, protected routes

### ✅ Critical Fixes (October 2025)

- **Email Service**: Fixed Mailtrap API integration (sender parameter, removed inbox_id)
- **OTP Verification**: Fixed field name mismatch between frontend and backend
- **User Validation**: Added login check to prevent OTP sending to non-existent users
- **Timezone Handling**: Fixed naive vs aware datetime comparison errors
- **Auth Persistence**: Fixed session restoration on page refresh (getCurrentUser parsing)
- **Auth Initialization**: Added AuthProvider for automatic session restoration
- **Hydration Warnings**: Fixed React hydration warnings with next-themes

### 🚧 In Progress

- **Phase 3.4**: Dashboard structure design (awaiting user specs)
- **Phase 3.4**: Tree Management Dashboard design and implementation (awaiting user specs)

### 📅 Upcoming

- **Phase 3.5**: Tree picker/switcher for users with multiple tree memberships
- **Phase 3.6**: Member management interface (add, edit, delete members)
- **Phase 3.7**: Tree visualization with pan/zoom/expand/collapse
- **Phase 3.8**: Relationship management (add spouse, add child, etc.)
- **Phase 3.9**: Role-based access control UI (custodian, contributor, viewer)
- **Phase 3.10**: Invitations and sharing system

## 🎯 Design Assumptions - Status Update

### Original Donor Repo Limitations

The original donor repository ([ooanishoo/family-tree](https://github.com/ooanishoo/family-tree)) had several restrictive assumptions that we have successfully overcome in our implementation:

#### ❌ Overcome - Inclusivity Features

1. **Heterosexual marriage only** → ✅ **OVERCOME**

   - Our design spec explicitly supports same-sex marriage
   - `allowSameSex` setting enabled by default in tree settings
   - Gender-neutral spouse relationship modeling
   - See: `.specs/design.md` and `.specs/requirements.md`

2. **Monogamy only** → ✅ **OVERCOME**

   - Our design supports optional polygamy per tree
   - `allowPolygamy` setting with `maxSpousesPerMember` limit
   - Multiple spouse edges allowed in relationship database model
   - See: `.specs/design.md` - Relationship edges section

3. **Two-parent requirement for children** → ✅ **OVERCOME**

   - Single-parent children supported by default
   - `allowSingleParent` setting in tree configuration
   - Optional multi-parent support with `allowMultiParentChildren`
   - See: `.specs/requirements.md` - Member Management

4. **Unique case-sensitive names only** → ✅ **OVERCOME**
   - Database IDs enforce true uniqueness (not names)
   - Case-insensitive name search for better UX
   - Names can be duplicated across family members
   - Backend uses UUID primary keys

#### ✅ Retained By Design Choice

1. **Email OTP Authentication** → ✅ **CONFIRMED & WORKING**

   - Passwordless authentication via Mailtrap API
   - Production-ready with proper error handling
   - All bugs fixed (email service, timezone, persistence)
   - See: `docs/PHASE_3.3_COMPLETE.md`

2. **Role-based Permissions** → ✅ **CONFIRMED IN BACKEND**

   - Three roles: Custodian, Contributor, Viewer
   - Per-tree role assignments (user can have different roles per tree)
   - Backend implementation complete
   - Frontend UI pending (Phase 3.9)
   - See: `apps/backend/docs/ROLE_MANAGEMENT.md`

3. **Tree-level Settings** → ✅ **CONFIRMED IN BACKEND**
   - Settings stored in `trees.settings_json` column
   - Includes all inclusivity flags (allowSameSex, allowPolygamy, etc.)
   - Backend validation enforces settings
   - See: `apps/backend/models/` and `.specs/design.md`

### Technical Assumptions - Validation Status

#### ✅ Validated & Production-Ready

- **Next.js 14 App Router** → Stable, performant, excellent DX
- **Email OTP Flow** → Fully functional with Mailtrap
- **JWT HttpOnly Cookies** → Secure, persistent, working perfectly
- **Zustand Persist** → Reliable state management across refreshes
- **Dark Mode (next-themes)** → No hydration issues
- **shadcn/ui Components** → Excellent component library, highly customizable
- **TypeScript Strict Mode** → Catches type errors early, great developer experience

#### 🔄 To Be Validated (Upcoming Phases)

- **Tree Visualization Performance** → Target: smooth 60fps with 800+ nodes
- **Relationship Computation** → Cousin degree/remove algorithms (to be implemented)
- **Multi-tree Switching** → UX for users with multiple tree memberships
- **Mobile Canvas Responsiveness** → Touch gestures for tree pan/zoom

### Migration from Donor Repo - Completed

✅ **Successfully migrated and improved**:

- Removed all restrictive marriage assumptions
- Removed two-parent requirement
- Replaced name-based uniqueness with ID-based system
- Added proper email OTP authentication (donor had none)
- Added dark mode support (donor had none)
- Added session persistence (donor had none)
- Modernized to Next.js 14 App Router (donor used Pages Router)

### Documentation References

For detailed specifications:

- **Design Spec**: `.specs/design.md` - Architecture, API contracts, data models
- **Requirements**: `.specs/requirements.md` - Functional requirements, acceptance criteria
- **Backend Schema**: `apps/backend/models/` - Database models with settings support

## 🤝 Contributing

This is a private project. For development guidelines, see [DEVELOPMENT.md](../../../DEVELOPMENT.md).

## � Additional Documentation

- **Backend API Docs**: `apps/backend/docs/` - Comprehensive API documentation
- **Backend Auth Guide**: `apps/backend/docs/AUTHENTICATION.md` - Backend auth implementation
- **Backend Testing**: `apps/backend/docs/TESTING_QUICK_REFERENCE.md` - Backend test suite
- **Project Roadmap**: `family_tree_tasks.md` - Overall project tasks and milestones
- **Design Specs**: `.specs/design.md` - System architecture and design
- **Requirements**: `.specs/requirements.md` - Functional and non-functional requirements

## �📄 License

Proprietary - All rights reserved

---

**Last Updated**: October 2, 2025 - Phase 3.3 Complete + Critical Fixes
