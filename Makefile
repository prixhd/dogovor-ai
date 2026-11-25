SHELL := /bin/bash
-include .env
export

COMPOSE := docker compose -f infra/docker-compose.yml

.PHONY: dev db up down stop clean ports-free test test-api test-web lint lint-api lint-web e2e build

# Is our own container stack (api/web) running?
STACK_UP = [ -n "$$($(COMPOSE) --profile full ps --status running -q api web 2>/dev/null)" ]

## ports-free: fail early with a clear message if 3000/8080 are taken.
## With ALLOW_STACK=1 (used by `up`), ports held by our own containers are fine.
ports-free:
	@if [ "$(ALLOW_STACK)" = "1" ] && $(STACK_UP); then exit 0; fi; \
	for p in 3000 8080; do \
	  if lsof -nP -iTCP:$$p -sTCP:LISTEN >/dev/null 2>&1; then \
	    echo "Порт $$p занят:"; lsof -nP -iTCP:$$p -sTCP:LISTEN | tail -n +2; \
	    if $(STACK_UP); then echo "Это запущенные контейнеры договор.ai: сайт уже работает на http://localhost:3000. Остановить: make down"; \
	    else echo "Остановите процесс: make stop (локальный dev) или make down (контейнеры)."; fi; \
	    exit 1; \
	  fi; \
	done

## stop: kill locally running dev servers on 3000/8080 (never Docker itself)
stop:
	@for p in 3000 8080; do \
	  for pid in $$(lsof -ti tcp:$$p -sTCP:LISTEN 2>/dev/null); do \
	    case "$$(ps -p $$pid -o comm= 2>/dev/null)" in *[Dd]ocker*|*vpnkit*) ;; *) kill $$pid 2>/dev/null ;; esac; \
	  done; \
	done; \
	echo "Локальные dev-серверы остановлены"; \
	if $(STACK_UP); then echo "Контейнеры договор.ai ещё работают (остановить: make down)"; fi

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
up:
	@$(MAKE) --no-print-directory ports-free ALLOW_STACK=1
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
