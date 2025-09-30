backend-run:
	@echo "Run backend (uvicorn) using the backend venv if available"
	@if [ -x $(BACKEND_DIR)/.venv/bin/uvicorn ]; then \
		echo "Using venv uvicorn"; \
		cd $(BACKEND_DIR) && exec ./.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8020; \
	elif command -v uvicorn >/dev/null 2>&1; then \
		echo "Using system uvicorn"; \
		cd $(BACKEND_DIR) && exec uvicorn main:app --reload --host 0.0.0.0 --port 8020; \
	else \
		echo "uvicorn not found. Run 'make backend-venv' to create the venv or install uvicorn system-wide."; \
		exit 1; \
	fi
.PHONY: install deps backend frontend test format lint up down

# Detect backend directory: prefer apps/backend, otherwise use repo root
BACKEND_DIR := $(shell [ -d apps/backend ] && echo apps/backend || echo .)


install:
	npm install

.PHONY: backend-smoke
backend-smoke:
	@echo "Run backend smoke test (start backend, curl /api/health, stop backend)"
	@sh -c ' \
	if [ -x apps/backend/.venv/bin/python ]; then \
	  PYTHON=.venv/bin/python; \
	elif command -v python3 >/dev/null 2>&1; then \
	  PYTHON=$$(command -v python3); \
	elif command -v python >/dev/null 2>&1; then \
	  PYTHON=$$(command -v python); \
	else \
	  echo "No Python interpreter found. Please run '\''make backend-venv'\'' or install python3."; \
	  exit 1; \
	fi; \
	echo "Using interpreter: $$PYTHON"; \
	if [ "$$PYTHON" = ".venv/bin/python" ]; then \
	  apps/backend/.venv/bin/python --version || { echo "ERROR: Unable to execute venv python. Try recreating the venv with '\''make backend-venv'\''."; exit 1; }; \
	else \
	  $$PYTHON --version || { echo "ERROR: Unable to execute $$PYTHON. Try recreating the venv with '\''make backend-venv'\''."; exit 1; }; \
	fi; \
	cd apps/backend; \
	nohup $$PYTHON -m uvicorn main:app --host 127.0.0.1 --port 8020 > /tmp/family_tree_backend.log 2>&1 & echo $$! > /tmp/family_tree_backend.pid; \
	i=0; OK=0; while [ $$i -lt 30 ]; do \
	  if curl -sS http://127.0.0.1:8020/api/health >/dev/null 2>&1; then OK=1; break; fi; \
	  sleep 0.5; i=$$((i+1)); \
	done; \
	if [ $$OK -ne 1 ]; then \
	  echo "smoke test: backend did not start in time"; \
	  cat /tmp/family_tree_backend.log || true; \
	  kill $$(cat /tmp/family_tree_backend.pid) 2>/dev/null || true; \
	  rm -f /tmp/family_tree_backend.pid || true; \
	  exit 2; \
	fi; \
	echo "smoke test: hitting /api/health"; \
	curl -sS http://127.0.0.1:8020/api/health || true; \
	echo "\nStopping backend"; \
	kill $$(cat /tmp/family_tree_backend.pid) 2>/dev/null || true; \
	rm -f /tmp/family_tree_backend.pid || true; \
	echo "backend-smoke: OK"; \
	'
