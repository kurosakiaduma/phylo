# Frontend Requirements

## Scope

- **Monorepo:** npm workspaces with `apps/frontend`, `apps/backend` (FastAPI in separate folder) and `packages/family-tree-core` (+ optional `packages/family-tree-react`).
- **UI Stack:** Next.js, shadcn UI, tailwindcss, lucide icons, ripple/gsap.
- **Pluginization:** Use `packages/family-tree-core` as headless genealogy engine, expose React hooks/selectors via optional `packages/family-tree-react`.

## Functional Requirements

- **Auth (Email OTP):**
  - Email input → request OTP → email sent → submit OTP → session established.
  - After login, show tree picker when user has multiple memberships.

- **Roles:** Custodian, Contributor, Viewer.
  - Custodian minimum age: 12+.
  - Per-tree roles; user may differ by tree.
  - Only custodians can create a new family tree and add/edit member details. Contributors/viewers are read-only by default; contributors can optionally propose changes (custodian review) if enabled per tree.

- **Family Registration:**
  - Wizard: tree name, description, initial members (optional), inclusive options (same-sex allowed default ON; optional polygamy; single-parent children).
  - Creator becomes Custodian.
  - Invite via email (OTP-based login per tree).

- **Member Management:**
  - Create/edit member with minimal data: name, email (optional for invitations), gender identity (optional), DOB (optional but recommended), status (alive/deceased), notes.
  - Add relationships:
    - Spouse: same-sex allowed. Monogamy is default; if polygamy is enabled for the tree, allow multiple spouses per member (UI must make this explicit).
    - Child: support single-parent creation; if a partner exists, allow two-parent edge. Additional legal parents only if the tree enables them.
  - Set profile avatar (URL initially).
  - Permissions: Only custodians can add/edit members or relationships; others view-only unless “propose changes” is enabled.

- **Tree Visualization:**
  - Pan/zoom, center on selected member, expand/collapse branches.
  - Click member card to open details drawer with actions (permissioned): add spouse, add child, edit, invite, assign custodian (custodians only).

- **Search & Relations:**
  - Search by name.
  - Query relationships: parent/child/sibling/spouse; aunt/uncle (with great- prefixes); grand relations; cousins with degree and removes; in-laws.
  - Show relation path/highlight between two members.

- **Multi-tree:**
  - Global tree switcher; remember last selected tree.

- **Auditing (MVP-light):**
  - Show “last updated by” on members or tree metadata.

## Non-Functional Requirements

- A11y: keyboard support, ARIA/labels, color contrast.
- Performance: 60fps pan/zoom for typical trees (<= 800 nodes), virtualization for lists.
- Internationalization ready: text via i18n keys.
- Privacy: minimal PII, hide emails by default except custodians.

## UI Flows

- **Login (Email OTP):**
  1) Enter email → POST /auth/otp/request
  2) Check email → retrieve code → POST /auth/otp/verify { email, code }
  3) Redirect to tree picker or last active tree

- **Create Tree:**
  1) New Tree → form → options (same-sex allowed default on) → submit (custodians only)
  2) Backend creates tree; user assigned Custodian

- **Add Spouse:**
  1) Open member → Add spouse → form (name, email optional) → submit (custodians only)
  2) If polygamy is disabled and member already has a spouse, show disabled state/explanation.
  3) If polygamy is enabled, allow adding additional spouses with safeguards (confirmation copy).

- **Add Child:**
  1) Open member → Add child → optionally select second parent (if any) → submit (single-parent allowed) (custodians only).

- **Invite Member:**
  1) Open member or tree settings → Invite → email → send OTP-based invite (custodians only)

- **Assign Custodian:**
  1) Open member → Manage roles (custodian only) → set role

## Integration Points

- `packages/family-tree-core` functions used by frontend:
  - `createTree`, `addMember`, `addSpouse`, `addChild`, `findMember`, `computeRelationship(a,b)`, `listRelations(member, type)`.
  - Core must be pure TS (no DOM) and serializable to/from backend payloads.

- Backend API (FastAPI) endpoints used by frontend:
  - POST `/auth/otp/request` → 200
  - POST `/auth/otp/verify` → 200 + sets cookie/session
  - GET `/trees` (list memberships)
  - POST `/trees` (create tree)
  - GET `/trees/{id}` (metadata)
  - GET `/trees/{id}/members` (paged)
  - POST `/trees/{id}/members` (create)
  - PATCH `/members/{id}` (update)
  - POST `/members/{id}/spouse`
  - POST `/members/{id}/children`
  - GET `/relations/{treeId}/between?from=&to=`
  - POST `/invites` (send invite for tree)

## Acceptance Criteria (MVP)

- Email OTP login end-to-end in dev.
- Create tree wizard; creator = custodian.
- View tree; click member to open details drawer.
- Add spouse (same-sex allowed) and child from drawer.
- Support adding a child with a single parent.
- If tree setting enables polygamy, allow multiple spouses per member; otherwise enforce monogamy.
- Relation query shows cousin degree/remove for simple cases.
- Roles enforced in UI; non-permitted actions hidden/disabled.
