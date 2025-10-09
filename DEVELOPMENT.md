# Development setup

This document describes a recommended local development setup for the Family Tree monorepo.

Supported tool versions (minimum / recommended)

- Node.js: >= 18.0.0 (recommended 18.x or 20.x LTS)
- npm: >= 9.0.0
- Python: 3.10+ (recommended 3.11)
- Docker (optional): latest stable for running Postgres (optional/can opt to use user-installed postgres) and Redis locally

Basic principles

- The repository is an npm workspace (root `package.json` uses `apps/*` and `packages/*`).
- The backend is a FastAPI app (in `apps/backend`) and uses Python tooling. The frontend is a Next.js app (in `apps/frontend`). Shared TypeScript libraries live under `packages/`.

Quickstart (fish shell)

1. Clone the repo and change directory

   git clone https://github.com/kurosakiaduma/phylo
   cd family_tree

2. Install Node dependencies (root workspace)

# Installs workspace dependencies

npm install

3. Start local Postgres (optional but recommended)

# Uses docker compose; will create a DB named `family_tree_dev`

docker compose up -d

# Check logs

docker compose logs -f postgres

4. Backend Python environment

The project supports using uv (the extremely fast Rust-based Python project manager) to create and manage the venv, or the standard `python -m venv` flow.

If you already have `uv` installed (recommended for speed and reproducibility), the Makefile helper will prefer it. Otherwise the Makefile falls back to `python -m venv`.

Option A) Use the Makefile helper (non-interactive, CI-friendly, prefers `uv`):

```fish
# From repo root
make backend-venv
```

This will create `apps/backend/.venv` and install `apps/backend/requirements.txt` using the venv's pip. If `uv` is installed, the Makefile will use `uv run python -m venv ...` under the hood.

Option B) Manual (fish shell) — uv flow

If you prefer to use `uv` directly in your shell, do this from the repo root:

```fish
cd apps/backend
# Create the venv using uv (requires uv to be installed)
uv run python -m venv .venv
# Activate the venv for the current fish shell session
source .venv/bin/activate.fish
pip install -e .
cd -
```

Option C) Manual (fish shell) — fallback to python

If you don't have `uv` available, use the standard venv flow:

```fish
cd apps/backend
python -m venv .venv
source .venv/bin/activate.fish
pip install -e .
cd -
```

If creating the venv fails on your system (some distros lack ensurepip), you can use a system Python, `pipx`, or a Dockerized workflow instead.

5. Run package tests (example: core package)

cd packages/family-tree-core
npm test
cd -

6. Run frontend (Next.js) in development

cd apps/frontend/family-tree
npm install
npm run dev

# open http://localhost:3000 - Advanced Tree Visualization System
# Features: Intelligent clustering, Bezier curves, real-time validation

cd -

7. Run backend (FastAPI) in development

# from repo root

cd apps/backend

# activate virtualenv created earlier

source .venv/bin/activate.fish

# run uvicorn with API main module

uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs

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

- Use the existing workspace layout: apps/_ for runnable apps and packages/_ for shared libraries.
- When adding new packages, add them under `packages/` and update root `package.json` workspaces if necessary.
- Tests: add unit tests next to code under `__tests__` and use Jest for TypeScript packages.

Troubleshooting pydantic-core / build failures

Pydantic v2 depends on a native Rust-backed package (pydantic-core). On some systems pip will download a prebuilt wheel, but in other environments pip will attempt to build pydantic-core from source. If that happens and the build fails, you'll see errors mentioning "pydantic-core" or "maturin" during `pip install`.

Quick remedies:

- Install Rust (recommended when developing with pydantic v2):

```fish
# Linux / macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# follow the prompts, then reopen your shell
```

- Or use a Python version with many prebuilt wheels available (3.11 or 3.12 are safest right now). If you are on a cutting-edge Python (3.13+) pip may need to build many wheels locally.

Note: our Makefile now prefers Python 3.11/3.12/3.10 when creating the backend venv to increase the chance of pip downloading prebuilt pydantic-core wheels. If you use Python 3.13 and still see pydantic-core build failures, either install Rust or switch to a supported Python version.

- If you cannot install Rust or prefer not to, pin pydantic to a 1.x series temporarily (not recommended long-term). The project supports pydantic v2, so installing Rust or using a Python version with prebuilt wheels is the best route.
