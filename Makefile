.PHONY: dev seed test demo lint typecheck clean build

# Development
dev:
	docker compose up --build

dev-api:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd web && npm run dev

# Database
seed:
	cd backend && python -m app.seed

migrate:
	cd backend && alembic upgrade head

# Testing
test:
	cd backend && python -m pytest tests/ -v --tb=short
	cd web && npm run test

test-backend:
	cd backend && python -m pytest tests/ -v --tb=short

test-web:
	cd web && npm run test

test-e2e:
	cd web && npx playwright test

# Quality
lint:
	cd backend && ruff check . && ruff format --check .
	cd web && npm run lint

typecheck:
	cd backend && mypy app/
	cd web && npm run typecheck

# Benchmark
benchmark:
	cd backend && python -m synthetic.benchmark

# Build
build:
	docker compose build

# Demo (one command)
demo: build
	docker compose up -d
	@echo "Seeding demo data..."
	docker compose exec api python -m app.seed
	@echo ""
	@echo "✓ MuleTrace is running!"
	@echo "  Web:  http://localhost:5173"
	@echo "  API:  http://localhost:8000/docs"
	@echo ""
	@echo "Demo credentials:"
	@echo "  analyst@muletrace.dev / analyst123"
	@echo "  lead@muletrace.dev    / lead123"
	@echo "  admin@muletrace.dev   / admin123"

# Cleanup
clean:
	docker compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/data/ web/dist/
