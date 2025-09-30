# Family Tree Monorepo

This repository is a monorepo for the Family Tree project. It uses npm workspaces and contains frontend and backend apps and shared packages.

Quickstart (development)

1. Requirements
   - Node >= 18, npm >= 9, Docker (optional for Postgres), Python 3.10+ for backend

2. Install dependencies

```fish
cd /mnt/win3/work/family_tree
npm install
```

3. Run Postgres (optional)

```fish
docker compose up -d
```

4. Run tests in a package (example)

```fish
cd packages/family-tree-core
npm test
```

Notes
- The repo expects workspace folders under `apps/` and `packages/`. If you have existing top-level `frontend/` or `backend/` folders, move them under `apps/` (e.g. `mv frontend apps/frontend`).
- See `tsconfig.base.json` for shared TypeScript settings.
