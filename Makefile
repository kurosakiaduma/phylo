.PHONY: install deps backend frontend test format lint up down

install:
	npm install

deps: install

backend:
	@echo "Start backend (uvicorn) from apps/backend"
	cd apps/backend && uvicorn main:app --reload --host 0.0.0.0 --port 8020

frontend:
	@echo "Start frontend (next) from apps/frontend"
	cd apps/frontend && npm run dev

test:
	@echo "Run workspace tests"
	npm test

format:
	npm run format

lint:
	npm run lint

up:
	docker compose up -d

down:
	docker compose down

backend-venv:
	@echo "Create Python venv for backend and install requirements"
	python -m venv apps/backend/.venv
	# Use the venv's pip directly so activation isn't required in CI
	apps/backend/.venv/bin/python -m pip install --upgrade pip
	apps/backend/.venv/bin/pip install -r apps/backend/requirements.txt
