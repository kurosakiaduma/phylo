# Family Tree Monorepo – Product Spec (GEMINI)

## Vision

Build a modern, inclusive family tree platform as a monorepo with a Next.js frontend and a FastAPI backend. Use the open-source `family-tree` project for core genealogy logic as a pluggable, headless module while delivering a custom UI and contemporary auth, roles, and multi-tree management.

## Objectives

- **Plugin architecture:** Extract and consume the `family-tree` domain logic as a headless library, integrate with a custom UI (shadcn/radix, tailwind, lucide, ripple, gsap).
- **Inclusive relationships:** Support same-sex unions and accurately compute extended relations (e.g., cousin degrees and removes, aunts/uncles with great/great-great, grandparents, in-laws).
- **Account & access:** Email OTP login, multi-family-tree membership, and role-based access control with custodianship.
- **Family registration:** Guided workflow to create a family tree; the registrant becomes the initial custodian.
- **Member UX:** Click a member card to view profile/details, edit permissions (if allowed), and perform actions (add spouse/child, invite, mark deceased, notes, media links later).

## Roles & Permissions

- **Custodian**
  - Full administrative control over a specific family tree (structure edits, role assignments, invitations).
  - Can create new families (trees) and add/edit details for members. Default minimum age for custodianship: 12+.
- **Contributor**
  - View-only by default. Optional “propose changes” mode can be enabled per tree (custodians review and apply changes).
- **Viewer**
  - Read-only access to a family tree they belong to or is shared with them.

Note: A user may have different roles across different family trees.

## Authentication & Account Model

- **Email OTP login**
  - User enters email → backend issues a single-use, time-bound verification code (OTP) via email.
  - User submits OTP to verify and establish a session.
- **Multi-tree membership**
  - A single email can belong to multiple trees (e.g., their birth family and in-law family). After login, users select which tree to view.
- **Minimum data collection**
  - Email address, display name, and optional demographic basics (DOB for relation accuracy, gender identity for UI pronouns if desired). Keep PII minimal.

## Family Registration Workflow

1. Visitor authenticates (email OTP).
2. Visitor starts “Create Family Tree” wizard:
   - Tree name, optional description, initial progenitors or initial members.
   - Inclusive options: allow same-sex spouses (enabled by default), allow polygamous unions (optional, configurable per tree), and allow single-parent children; monogamy is default unless polygamy is enabled.
3. On finish, creator is assigned **Custodian** role for that tree.
4. Invite flows: add emails for family members; they receive OTP-based login emails scoped to the tree.

## Inclusivity & Relationship Semantics

- **Same-sex unions:** Allow spouse pairing independent of gender. Keep monogamy as default rule; surface a setting for custodians to configure future policies.
- **Children constraints:** Support single-parent families. A child may be added with one parent; if a partnership exists, allow two legal parents regardless of sex. Additional legal parents are not supported unless explicitly enabled per tree.
- **Polygamous unions (optional):** When enabled per tree, allow a member to have multiple spouses, with clear UI affordances and constraints (e.g., max spouses, consent prompts, audit trail).
- **Extended relations:**
  - Cousin degrees (1st, 2nd, 3rd, …) and removes (once, twice, … removed).
  - Aunts/uncles and their great-/great-great- prefixes.
  - Grandparents and great-/great-great- prefixes.
  - In-laws computed via marriage edges.
- **Deceased and unknown:** Mark members as deceased; allow unknown/missing parent placeholders that can be filled later.

## Core Member Experience

- **Member card interactions**
  - Clicking opens a details panel/drawer: name, photo/avatar, DOB/DOD, notes, relationships, links.
  - Actions (permissioned): add spouse, add child, edit details, invite, set as custodian (custodians only).
- **Search & discovery**
  - Search by name and relationship.
  - Quick-jump to direct relatives; highlight path between two members.
- **Multi-tree switcher**
  - App-level dropdown to switch active tree context.

## Non-Functional Requirements (NFRs)

- **Performance:** Smooth pan/zoom of large trees; incremental loading; virtualization for lists.
- **Accessibility:** Keyboard navigation, ARIA semantics, high-contrast theme.
- **Privacy & Security:** Minimal PII, secure tokens, audit basic changes (who/when), custodial controls for visibility.
- **Internationalization:** Copy and date formats ready for locale support.
- **Scalability:** Postgres for persistence; API endpoints stateless; plan for background jobs (email).

## Tech & Monorepo Setup

- **Frontend:** Next.js, shadcn UI, tailwindcss, lucide icons, ripple/gsap for motion.
- **Backend:** FastAPI + Postgres. Email via a free provider plugged into FastAPI (choice TBD).
- **Headless core:** Extract from `frontend/family-tree/src/models` into `packages/family-tree-core` with TS-only API and no UI. Optionally a thin `packages/family-tree-react` for hooks.
- **Package management:** npm workspaces; shared TS configs and ESLint.

## Migration from OSS Repo

- Treat `frontend/family-tree` as a donor. Extract `Member` and `FamilyTree` logic, remove assumptions that block inclusivity:
  - Remove enforced heterosexual spouse rule.
  - Preserve monogamy, but make configurable.
  - Expand relationship calculators to handle cousin degrees/removes and recursive great- relations.
- Wrap in a clean API consumed by the app. Build new UI with shadcn components and custom flows.

## Milestones

1. Headless core package ready with inclusive data model and tests.
2. FastAPI auth (magic links) + basic user/tree schema in Postgres.
3. Next.js app shell with tree switcher, member details drawer, and add spouse/child flows.
4. Role management and invitations.
5. Extended relationship search and path-highlighting.

## Open Questions

- Should we support non-monogamous relationships in the initial release? Default is no; keep a flag for future.
- Media attachments (photos/docs) now or later? Likely later with object storage.
