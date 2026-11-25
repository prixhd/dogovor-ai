SHELL := /bin/bash
-include .env
export

COMPOSE := docker compose -f infra/docker-compose.yml

.PHONY: dev db up down test test-api test-web lint lint-api lint-web e2e build

## dev: start postgres in Docker, api and web locally with hot reload
dev: db
	@trap 'kill 0' EXIT; \
	(cd apps/api && go run ./cmd/api) & \
	(cd apps/web && npm run dev) & \
	wait

db:
	$(COMPOSE) up -d --wait postgres

## up: run the whole stack in containers
up:
	$(COMPOSE) --profile full up -d --build --wait

down:
	$(COMPOSE) --profile full down

test: test-api test-web

test-api: db
	cd apps/api && TEST_DATABASE_URL=$(DATABASE_URL) go test ./... -count=1

test-web:
	cd apps/web && npm test --silent

lint: lint-api lint-web

lint-api:
	cd apps/api && gofmt -l . | (! grep .) && go vet ./... && golangci-lint run ./...

lint-web:
	cd apps/web && npm run lint && npx tsc --noEmit

e2e:
	cd apps/web && npx playwright test

build:
	cd apps/api && go build -o bin/api ./cmd/api
	cd apps/web && npm run build
