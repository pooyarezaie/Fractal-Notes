SHELL := /bin/sh

.PHONY: help install install-node install-deps dev build prerender build-prerender serve docker-build docker-up docker-down docker-logs

help:
	@echo "Dependencies:"
	@echo "  make install       # Install Ruby gems (Bundler)"
	@echo "  make install-node  # Install npm deps + Playwright Chromium"
	@echo "  make install-deps  # Install all (Ruby + Node)"
	@echo ""
	@echo "Develop & build:"
	@echo "  make dev           # Run local Jekyll dev server"
	@echo "  make build         # Build static site to _site"
	@echo "  make prerender     # Prerender _site (KaTeX + JS); run after build"
	@echo "  make build-prerender  # Build then prerender (full pipeline)"
	@echo "  make serve         # Serve _site at http://localhost:4000 (test prerendered)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build  # Build Docker image"
	@echo "  make docker-up     # Run Docker Compose (detached)"
	@echo "  make docker-down   # Stop Docker Compose"
	@echo "  make docker-logs   # Tail Docker Compose logs"

install:
	bundle install

install-node:
	npm install
	npx playwright install --with-deps chromium

install-deps: install install-node

dev:
	bundle exec jekyll serve --livereload

build:
	bundle exec jekyll build

prerender:
	npm run prerender

build-prerender: build prerender

serve:
	npm run serve

docker-build:
	docker compose build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=200
