SHELL := /bin/sh

.PHONY: help install dev build docker-build docker-up docker-down docker-logs

help:
	@echo "make install       # Install Ruby gems"
	@echo "make dev           # Run local Jekyll dev server"
	@echo "make build         # Build static site to _site"
	@echo "make docker-build  # Build Docker image"
	@echo "make docker-up     # Run Docker Compose (detached)"
	@echo "make docker-down   # Stop Docker Compose"
	@echo "make docker-logs   # Tail Docker Compose logs"

install:
	bundle install

dev:
	bundle exec jekyll serve --livereload

build:
	bundle exec jekyll build

docker-build:
	docker compose build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=200
