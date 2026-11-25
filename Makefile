SHELL := /bin/bash
-include .env
export

COMPOSE := docker compose -f infra/docker-compose.yml

.PHONY: dev db up down stop clean ports-free test test-api test-web lint lint-api lint-web e2e build

## ports-free: fail early with a clear message if 3000/8080 are taken
ports-free:
	@for p in 3000 8080; do \
	  if lsof -nP -iTCP:$$p -sTCP:LISTEN >/dev/null 2>&1; then \
	    echo "Порт $$p занят:"; lsof -nP -iTCP:$$p -sTCP:LISTEN | tail -n +2; \
	    echo "Остановите процесс (make stop для локального dev, make down для контейнеров)."; exit 1; \
	  fi; \
	done

## stop: kill locally running dev servers on 3000/8080
stop:
	-@lsof -ti tcp:3000 -sTCP:LISTEN | xargs kill 2>/dev/null; true
	-@lsof -ti tcp:8080 -sTCP:LISTEN | xargs kill 2>/dev/null; true
	@echo "Локальные dev-серверы остановлены"

## clean: remove Next.js build caches (fixes ENOENT .next/... errors)
clean:
	rm -rf apps/web/.next apps/web/.next-dev

## dev: start postgres in Docker, api and web locally with hot reload
dev: ports-free db
	@trap 'kill 0' EXIT; \
	(cd apps/api && go run ./cmd/api) & \
	(cd apps/web && npm run dev) & \
	wait

db:
	$(COMPOSE) up -d --wait postgres

## up: run the whole stack in containers
up: ports-free
	$(COMPOSE) --profile full up -d --build --wait
	@echo "Готово: сайт http://localhost:3000, API http://localhost:8080/healthz"

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
