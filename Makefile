# MuleTrace Development Makefile

.PHONY: help install test dev seed demo clean evaluate

help:
	@echo "MuleTrace Development Commands:"
	@echo "  make install   Install backend dependencies"
	@echo "  make dev       Run backend FastAPI development server"
	@echo "  make test      Execute pytest test suite"
	@echo "  make seed      Generate synthetic dataset and seed database"
	@echo "  make evaluate  Run precision/recall and evasion benchmark suite"
	@echo "  make demo      Reset demo sandbox and launch backend"

install:
	pip install -r backend/requirements.txt

test:
	pytest backend/tests -v

dev:
	uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

seed:
	python scripts/generate_data.py --seed 42 --evasion 0.0 --output-dir data
	python scripts/seed_demo.py

evaluate:
	python scripts/evaluate.py
	python scripts/evaluate_evasion.py

demo: seed
	uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

clean:
	rm -f muletrace.db data/muletrace.db
	find . -type d -name __pycache__ -exec rm -rf {} +
