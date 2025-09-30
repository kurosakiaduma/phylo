# Frontend Design

## Monorepo Structure (npm workspaces)

```text
/ (repo root)
  package.json (workspaces config)
  apps/
    frontend/ (Next.js app; proxies API calls to `/api`)
    backend/ (FastAPI; mounted under `/api` path via Next.js reverse proxy in dev and prod)
  packages/
    family-tree-core/ (TS-only headless genealogy engine)
    family-tree-react/ (optional React adapters: hooks/selectors)
```

- Use npm workspaces for `packages/*` and `apps/frontend`.
- Backend lives in `apps/backend` but is managed with Python tooling; keep API contracts documented here.

## Pluginization Plan

- Start from donor repo `frontend/family-tree/src/models`:
  - Extract `Member` and `FamilyTree` logic into `packages/family-tree-core`.
  - Remove constraints:
    - Heterosexual-only marriage → allow any gender pairing.
    - UI dependencies → none in core.
  - Add relationship engines:
    - Cousin degree and remove computation.
    - Recursive “great-” for aunts/uncles/grand relations.
- Provide a stable API surface:

```ts
// packages/family-tree-core
export type MemberId = string;
export interface MemberInput { name: string; email?: string; dob?: string; gender?: 'male'|'female'|'unspecified'; deceased?: boolean; notes?: string; }
export interface Member extends MemberInput { id: MemberId; spouseIds: MemberId[]; parentIds: MemberId[]; childIds: MemberId[]; }
export interface Tree { id: string; name: string; description?: string; settings: { allowSameSex: boolean; monogamy: boolean; allowPolygamy: boolean; maxSpousesPerMember?: number; allowSingleParent: boolean; allowMultiParentChildren: boolean; maxParentsPerChild?: number; }; }

export class FamilyTreeCore {
  constructor(tree: Tree, members?: Member[])
  addMember(input: MemberInput): Member
  addSpouse(memberId: MemberId, spouseInput: MemberInput): Member
  addChild(parentId: MemberId, childInput: MemberInput, secondParentId?: MemberId): Member
  findMemberByName(name: string): Member | undefined
  getMember(id: MemberId): Member | undefined
  computeRelationship(a: MemberId, b: MemberId): string
  listRelations(memberId: MemberId, type: string): MemberId[]
  serialize(): { tree: Tree; members: Member[] }
  static fromSerialized(payload: { tree: Tree; members: Member[] }): FamilyTreeCore
}
```

- Optional React adapters (`family-tree-react`):
  - `useFamilyTree(treeId)` → returns core instance bound to backend data.
  - `useMember(memberId)` → reactive member data.

## State Management

- Client-side: lightweight Zustand or React context for UI state (drawers, selections, pan/zoom), server data via React Query (or Next.js fetch with SWR).
- Server is source of truth. Core runs on client for interactions but persists changes via API calls; server validates.

## Data Model (Backend-facing)

- Postgres tables (sketch):
  - users(id, email, display_name, created_at)
  - trees(id, name, description, settings_json, created_by)
  - memberships(user_id, tree_id, role)
  - members(id, tree_id, name, email, dob, gender, deceased, notes)
  - relationships(id, tree_id, type, a_member_id, b_member_id) // spouse, parent-child edges; multiple spouse edges allowed if settings.allowPolygamy; multiple parent->child edges allowed if settings.allowMultiParentChildren
  - invites(id, tree_id, email, role, token, expires_at, accepted_at)

- Relationship edges:
  - spouse: undirected (store two directed rows or a single undirected represented by two rows); permit multiple spouse edges per member when `settings.allowPolygamy` (enforce `maxSpousesPerMember` if set).
  - parent-child: directed parent -> child; allow single-parent by default when `settings.allowSingleParent`; allow >2 parents only if `settings.allowMultiParentChildren` (enforce `maxParentsPerChild`).

## API Contracts (FastAPI)

- Base path: all API routes are served under the `/api` prefix from the frontend. Next.js will proxy `/api/*` to the FastAPI server.

- Auth
  - POST `/api/auth/otp/request` { email } → 200 (always), sends OTP email
  - POST `/api/auth/otp/verify` { email, code } → 200, sets cookie/session

- Trees
  - GET `/api/trees` → [{ id, name, role }]
  - POST `/api/trees` { name, description, settings } → { id }
  - GET `/api/trees/{id}` → { id, name, description, settings }

- Members
  - GET `/api/trees/{id}/members?after=&limit=` → { items: Member[], next?: cursor }
  - POST `/api/trees/{id}/members` MemberInput → Member
  - PATCH `/api/members/{id}` Partial<MemberInput> → Member

- Relations
  - POST `/api/members/{id}/spouse` { input: MemberInput } → Member (spouse)
    - If polygamy is disabled and member has a spouse, return 409/validation error.
  - POST `/api/members/{id}/children` { input: MemberInput, secondParentId?, additionalParentIds?: MemberId[] } → Member (child)
    - If additional parents exceed `maxParentsPerChild` or multi-parent disabled, return validation error.
  - GET `/api/relations/{treeId}/between?from=&to=` → { label: string, path: MemberId[] }

- Invites
  - POST `/api/invites` { treeId, email, role } → 200 (sends OTP-based invite)

## Next.js proxy configuration

- In `apps/frontend`, configure a dev proxy so that requests to `/api/*` forward to the FastAPI server (e.g., `http://localhost:8000`).
- For production (Vercel/Nginx), configure a rewrite rule mapping `/api/*` to the FastAPI app.

## UI Composition

- Use shadcn components for forms, drawers, dialogs, menus, toasts.
- Member Card → click → Drawer with tabs: Overview, Relations, Actions.
- Canvas for tree: integrate gsap/ripple for pan/zoom/transitions; separate layout engine from rendering.

## Layout & Rendering Strategy

- Layout: compute positions from graph produced by `family-tree-core` (DAG with spouse pairing); simple layered layout first, improve later.
- Rendering: DOM + CSS transforms; consider canvas/SVG later for performance.

## Security & Privacy

- Store auth session in HttpOnly cookies.
- Rate-limit magic link requests; tokens short-lived and single-use.
- Minimize exposure of emails; show to custodians only.

## Testing Strategy

- Unit tests in `family-tree-core` for relationship math, including cousin degree/remove.
- Component tests for drawers/forms.
- E2E smoke: login, create tree, add spouse/child, switch trees.

## Migration Notes from Donor Repo

- Remove assumptions in `src/models/FamilyTree.ts` and `Member.ts` that enforce heterosexual marriage and unique-case-sensitive names only (retain unique by tree, case-insensitive search for UX while IDs enforce uniqueness).
- Move tests under `packages/family-tree-core/__tests__` and adapt to new API.
