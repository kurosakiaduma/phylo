# Development setup

This document describes a recommended local development setup for the Family Tree monorepo.

Supported tool versions (minimum / recommended)
- Node.js: >= 18.0.0 (recommended 18.x or 20.x LTS)
- npm: >= 9.0.0
- Python: 3.10+ (recommended 3.11)
- Docker (optional): latest stable for running Postgres locally

Basic principles
- The repository is an npm workspace (root `package.json` uses `apps/*` and `packages/*`).
- The backend is a FastAPI app (in `apps/backend`) and uses Python tooling. The frontend is a Next.js app (in `apps/frontend`). Shared TypeScript libraries live under `packages/`.

Quickstart (fish shell)

1) Clone the repo and change directory

    git clone https://github.com/kurosakiaduma/family_tree
    cd family_tree

2) Install Node dependencies (root workspace)

# Installs workspace dependencies
npm install

3) Start local Postgres (optional but recommended)

# Uses docker compose; will create a DB named `family_tree_dev`
docker compose up -d
# Check logs
docker compose logs -f postgres

4) Backend Python environment

# Create and activate a virtualenv (example using python -m venv)
python -m venv .venv
source .venv/bin/activate.fish
# Install Python dependencies (the backend should provide requirements.txt)
# cd into the backend app first
cd apps/backend
# If a requirements.txt exists
if test -f requirements.txt
  pip install -r requirements.txt
else
  echo "Add a requirements.txt in apps/backend with FastAPI and dependencies"
end
# return to repo root
cd -

5) Run package tests (example: core package)

cd packages/family-tree-core
npm test
cd -

6) Run frontend (Next.js) in development

cd apps/frontend
npm install
npm run dev
# open http://localhost:3000
cd -

7) Run backend (FastAPI) in development

# from repo root
cd apps/backend
# activate virtualenv created earlier
source ../.venv/bin/activate.fish
# run uvicorn if app entrypoint is main:app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd -

Notes & troubleshooting
- Environment variables: copy `.env.example` to `.env` in the appropriate app folder and fill secrets. The repo includes `apps/frontend/.env.example` and `apps/backend/.env.example` as starting points.
- If you use a different shell (bash/zsh) adjust the `source` commands accordingly.
- If `docker compose` is not available, you can run Postgres locally or use a managed dev DB.
- To run all workspace tests at once you can run `npm run test` from the repo root (root script proxies into workspaces). Depending on workspace packages this may run many tests.

Editor & tooling
- Recommended VS Code extensions (the repo recommends them in `.vscode/extensions.json`): Prettier, ESLint, Docker, Python tools.
- Formatting: run `npm run format` from the repo root (root `package.json` maps to `prettier --write .`).
- Linting: run `npm run lint` from the repo root to run ESLint across the workspace.

Contributing notes
- Use the existing workspace layout: apps/* for runnable apps and packages/* for shared libraries.
- When adding new packages, add them under `packages/` and update root `package.json` workspaces if necessary.
- Tests: add unit tests next to code under `__tests__` and use Jest for TypeScript packages.
