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
- [ ] Document local development prerequisites (Node.js version, npm, Python)
- [x] Create `.env.example` files for frontend and backend
- [x] Set up Docker Compose for Postgres (optional but recommended)
- [x] Configure VS Code workspace settings (recommended extensions, settings)

---

## Phase 1: Core Genealogy Engine (`packages/family-tree-core`)

### 1.1 Package Initialization
- [ ] Create `packages/family-tree-core` directory
- [ ] Initialize `package.json` with TypeScript dependencies
- [ ] Configure `tsconfig.json` for library build
- [ ] Set up build scripts (compile to `dist/`)
- [ ] Configure Jest for unit testing

### 1.2 Core Type Definitions
- [ ] Define `MemberId` type (string UUID)
- [ ] Define `MemberInput` interface (name, email, dob, gender, deceased, notes)
- [ ] Define `Member` interface extending `MemberInput` (add id, spouseIds, parentIds, childIds)
- [ ] Define `TreeSettings` interface (allowSameSex, monogamy, allowPolygamy, maxSpousesPerMember, allowSingleParent, allowMultiParentChildren, maxParentsPerChild)
- [ ] Define `Tree` interface (id, name, description, settings)
- [ ] Define relationship types enum/union (spouse, parent, child, sibling, etc.)

### 1.3 Member Management
- [ ] Implement `addMember(input: MemberInput): Member`
- [ ] Implement `getMember(id: MemberId): Member | undefined`
- [ ] Implement `updateMember(id: MemberId, updates: Partial<MemberInput>): Member`
- [ ] Implement `removeMember(id: MemberId): void` (with orphan handling)
- [ ] Implement `findMemberByName(name: string): Member | undefined` (case-insensitive)
- [ ] Implement `listMembers(): Member[]`

### 1.4 Relationship Management
- [ ] Implement `addSpouse(memberId: MemberId, spouseInput: MemberInput): Member`
  - [ ] Validate monogamy constraint when `settings.monogamy === true`
  - [ ] Validate max spouses when `settings.maxSpousesPerMember` is set
  - [ ] Support same-sex spouses (no gender validation)
- [ ] Implement `removeSpouse(memberId: MemberId, spouseId: MemberId): void`
- [ ] Implement `addChild(parentId: MemberId, childInput: MemberInput, secondParentId?: MemberId): Member`
  - [ ] Support single-parent children when `settings.allowSingleParent === true`
  - [ ] Validate parent count against `settings.maxParentsPerChild`
  - [ ] Handle bidirectional parent-child edges
- [ ] Implement `removeChild(parentId: MemberId, childId: MemberId): void`

### 1.5 Relationship Computation
- [ ] Implement `computeRelationship(a: MemberId, b: MemberId): string`
  - [ ] Direct relations: spouse, parent, child
  - [ ] Sibling detection (shared parents)
  - [ ] Grandparent/grandchild with recursive "great-" prefix
  - [ ] Aunt/uncle with recursive "great-" prefix
  - [ ] Niece/nephew with recursive "great-" prefix
  - [ ] Cousin degree calculation (1st, 2nd, 3rd, etc.)
  - [ ] Cousin removal calculation (once removed, twice removed, etc.)
  - [ ] In-law relations through spouse edges
  - [ ] Step-relations (optional, future enhancement)
- [ ] Implement `listRelations(memberId: MemberId, type: string): MemberId[]`
- [ ] Implement `findPath(fromId: MemberId, toId: MemberId): MemberId[]` (shortest path)

### 1.6 Serialization & Validation
- [ ] Implement `serialize(): { tree: Tree; members: Member[] }`
- [ ] Implement `static fromSerialized(payload): FamilyTreeCore`
- [ ] Implement validation rules (circular relationships, orphan detection)
- [ ] Implement data integrity checks (referential integrity for IDs)

### 1.7 Testing
- [ ] Unit tests for member CRUD operations
- [ ] Unit tests for relationship additions/removals
- [ ] Unit tests for monogamy enforcement
- [ ] Unit tests for polygamy support
- [ ] Unit tests for single-parent children
- [ ] Unit tests for multi-parent children
- [ ] Unit tests for direct relationship computation
- [ ] Unit tests for cousin degree/remove calculation
- [ ] Unit tests for "great-" prefix recursion
- [ ] Unit tests for in-law relationships
- [ ] Unit tests for serialization round-trip
- [ ] Edge case tests (empty tree, self-relations, etc.)
- [ ] Achieve >90% code coverage

---

## Phase 2: Backend API (`apps/backend`)

### 2.1 FastAPI Project Setup
- [ ] Create `apps/backend` directory
- [ ] Initialize Python virtual environment
- [ ] Create `requirements.txt` with dependencies (fastapi, uvicorn, sqlalchemy, psycopg2, pydantic, python-jose, etc.)
- [ ] Set up project structure (`/api`, `/models`, `/schemas`, `/services`, `/utils`)
- [ ] Configure `.env` file for database, email, secrets
- [ ] Create `main.py` FastAPI app entry point
- [ ] Configure CORS middleware for Next.js integration

### 2.2 Database Schema & Models
- [ ] Set up SQLAlchemy with Postgres connection
- [ ] Create `users` table model (id, email, display_name, created_at)
- [ ] Create `trees` table model (id, name, description, settings_json, created_by, created_at)
- [ ] Create `memberships` table model (user_id, tree_id, role, joined_at)
- [ ] Create `members` table model (id, tree_id, name, email, dob, gender, deceased, notes, created_at, updated_at, updated_by)
- [ ] Create `relationships` table model (id, tree_id, type, a_member_id, b_member_id, created_at)
- [ ] Create `invites` table model (id, tree_id, email, role, token, expires_at, accepted_at, created_at)
- [ ] Create `otp_codes` table model (id, email, code, expires_at, used_at, created_at)
- [ ] Create Alembic migrations for all tables
- [ ] Add indexes for performance (email, tree_id, member relationships)

### 2.3 Pydantic Schemas
- [ ] Create `UserSchema` (input/output)
- [ ] Create `TreeSchema` (input/output with settings)
- [ ] Create `MemberSchema` (input/output)
- [ ] Create `RelationshipSchema`
- [ ] Create `InviteSchema`
- [ ] Create `OTPRequestSchema`, `OTPVerifySchema`
- [ ] Create `TokenSchema` for session management

### 2.4 Authentication System
- [ ] Implement OTP generation utility (6-digit code, 10-min expiry)
- [ ] Implement email service integration (configure SMTP or SendGrid/Mailgun)
- [ ] Implement `POST /api/auth/otp/request` endpoint
  - [ ] Rate limiting (max 3 requests per email per 15 minutes)
  - [ ] Store OTP in database with expiry
  - [ ] Send OTP email
- [ ] Implement `POST /api/auth/otp/verify` endpoint
  - [ ] Validate OTP code and expiry
  - [ ] Mark OTP as used
  - [ ] Create/update user record
  - [ ] Generate JWT session token
  - [ ] Set HttpOnly secure cookie
- [ ] Implement JWT token generation/verification utilities
- [ ] Implement session middleware for protected routes
- [ ] Implement `GET /api/auth/me` endpoint (current user)
- [ ] Implement `POST /api/auth/logout` endpoint

### 2.5 Tree Management Endpoints
- [ ] Implement `GET /api/trees` (list user's tree memberships with roles)
- [ ] Implement `POST /api/trees` (create new tree, assign creator as custodian)
  - [ ] Validate custodian minimum age (12+)
  - [ ] Validate settings schema
- [ ] Implement `GET /api/trees/{id}` (tree details)
  - [ ] Check user membership/permissions
- [ ] Implement `PATCH /api/trees/{id}` (update tree metadata/settings)
  - [ ] Custodian-only authorization
- [ ] Implement `DELETE /api/trees/{id}` (soft delete or archive)
  - [ ] Custodian-only authorization

### 2.6 Member Management Endpoints
- [ ] Implement `GET /api/trees/{id}/members` (paginated list)
  - [ ] Cursor-based pagination
  - [ ] Filter by alive/deceased status
  - [ ] Search by name (case-insensitive)
- [ ] Implement `GET /api/members/{id}` (member details)
- [ ] Implement `POST /api/trees/{id}/members` (create member)
  - [ ] Custodian-only authorization
  - [ ] Validate input against tree settings
- [ ] Implement `PATCH /api/members/{id}` (update member)
  - [ ] Custodian-only authorization
  - [ ] Track updated_by user
- [ ] Implement `DELETE /api/members/{id}` (remove member)
  - [ ] Custodian-only authorization
  - [ ] Handle orphaned relationships

### 2.7 Relationship Endpoints
- [ ] Implement `POST /api/members/{id}/spouse` (add spouse)
  - [ ] Validate monogamy/polygamy settings
  - [ ] Validate max spouses constraint
  - [ ] Create bidirectional spouse relationship
  - [ ] Custodian-only authorization
- [ ] Implement `DELETE /api/members/{id}/spouse/{spouseId}` (remove spouse)
  - [ ] Custodian-only authorization
- [ ] Implement `POST /api/members/{id}/children` (add child)
  - [ ] Support single-parent or two-parent
  - [ ] Validate parent count against settings
  - [ ] Create parent-child relationships
  - [ ] Custodian-only authorization
- [ ] Implement `DELETE /api/members/{id}/children/{childId}` (remove child relationship)
  - [ ] Custodian-only authorization
- [ ] Implement `GET /api/relations/{treeId}/between?from=&to=` (compute relationship)
  - [ ] Load tree data
  - [ ] Use `family-tree-core` to compute relationship
  - [ ] Return relationship label and path

### 2.8 Invitation System
- [ ] Implement `POST /api/invites` (send invite)
  - [ ] Generate unique invite token
  - [ ] Store invite record with expiry
  - [ ] Send OTP-based invitation email with tree context
  - [ ] Custodian-only authorization
- [ ] Implement `GET /api/invites/{token}` (view invite details)
- [ ] Implement `POST /api/invites/{token}/accept` (accept invite)
  - [ ] Validate token and expiry
  - [ ] Create membership record
  - [ ] Mark invite as accepted

### 2.9 Role Management
- [ ] Implement permission checking utility (has_role, is_custodian)
- [ ] Implement `PATCH /api/memberships/{userId}/{treeId}` (update role)
  - [ ] Custodian-only authorization
  - [ ] Prevent removing last custodian
- [ ] Implement role-based authorization decorator for endpoints

### 2.10 Testing & Documentation
- [ ] Write unit tests for auth utilities (OTP, JWT)
- [ ] Write integration tests for auth endpoints
- [ ] Write integration tests for tree CRUD
- [ ] Write integration tests for member CRUD
- [ ] Write integration tests for relationship endpoints
- [ ] Write integration tests for invite flow
- [ ] Document API with OpenAPI/Swagger (auto-generated by FastAPI)
- [ ] Create Postman/Insomnia collection for manual testing

---

## Phase 3: Frontend Application (`apps/frontend`)

### 3.1 Next.js Project Setup
- [ ] Create `apps/frontend` with Next.js (App Router)
- [ ] Install dependencies (shadcn/ui, tailwindcss, lucide-react, gsap, etc.)
- [ ] Configure `tailwind.config.js` with shadcn/ui
- [ ] Set up shadcn/ui components (init CLI tool)
- [ ] Configure Next.js proxy for `/api/*` to FastAPI backend
- [ ] Set up environment variables (`.env.local`)
- [ ] Configure TypeScript with strict mode

### 3.2 UI Component Library
- [ ] Install/configure shadcn components:
  - [ ] Button, Input, Label, Form
  - [ ] Dialog, Drawer, Sheet
  - [ ] Card, Tabs, Separator
  - [ ] Select, Dropdown Menu
  - [ ] Toast/Sonner for notifications
  - [ ] Avatar, Badge
  - [ ] Tooltip, Popover
- [ ] Create custom theme with CSS variables (colors, spacing)
- [ ] Set up dark mode toggle (optional)

### 3.3 Authentication Pages
- [ ] Create `/login` page
  - [ ] Email input form
  - [ ] "Send code" button → POST /api/auth/otp/request
  - [ ] OTP input form (6 digits)
  - [ ] "Verify" button → POST /api/auth/otp/verify
  - [ ] Error handling and loading states
  - [ ] Redirect to tree picker on success
- [ ] Create auth utilities (client-side)
  - [ ] `useAuth()` hook (check session, user data)
  - [ ] `logout()` function
- [ ] Implement protected route wrapper (redirect to /login if not authenticated)

### 3.4 Tree Management UI
- [ ] Create `/trees` page (tree picker/dashboard)
  - [ ] Fetch GET /api/trees
  - [ ] Display tree cards with name, description, role badge
  - [ ] "Create New Tree" button (custodians only)
  - [ ] Click card to navigate to `/trees/{id}`
- [ ] Create tree creation wizard (`/trees/new`)
  - [ ] Step 1: Tree name and description
  - [ ] Step 2: Inclusive settings (checkboxes for same-sex, polygamy, single-parent)
  - [ ] Step 3: Optional initial members
  - [ ] Submit → POST /api/trees
  - [ ] Redirect to new tree view
- [ ] Create tree settings page (`/trees/{id}/settings`)
  - [ ] View/edit tree metadata
  - [ ] View/edit settings (custodians only)
  - [ ] Member role management table
  - [ ] Invite member form

### 3.5 Member List & Search
- [ ] Create member list view (`/trees/{id}/members`)
  - [ ] Fetch GET /api/trees/{id}/members with pagination
  - [ ] Display member cards in grid or list
  - [ ] Search input (filter by name)
  - [ ] Filter by status (alive/deceased)
  - [ ] Virtual scrolling for large lists (optional)
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
- [ ] Form fields: name, email (optional), gender (optional), DOB (optional)
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