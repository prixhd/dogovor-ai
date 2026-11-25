-- +goose Up
CREATE TABLE users (
    id            uuid PRIMARY KEY,
    email         text NOT NULL UNIQUE,
    name          text NOT NULL DEFAULT '',
    password_hash text,
    yandex_id     text UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    token_hash  bytea PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token  text NOT NULL,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE parties (
    id          uuid PRIMARY KEY,
    owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        text NOT NULL CHECK (kind IN ('person','ip','org')),
    title       text NOT NULL,
    data        jsonb NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parties_owner_idx ON parties(owner_id);

CREATE TABLE documents (
    id               uuid PRIMARY KEY,
    owner_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_slug    text NOT NULL,
    template_version int  NOT NULL,
    title            text NOT NULL,
    data             jsonb NOT NULL DEFAULT '{}',
    edits            jsonb NOT NULL DEFAULT '{}',
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_owner_idx ON documents(owner_id, updated_at DESC);

CREATE TABLE plans (
    id               text PRIMARY KEY,
    ai_daily_limit   int NOT NULL
);
INSERT INTO plans (id, ai_daily_limit) VALUES ('free', 30);

-- Generic per-subject daily counters (AI requests, logins, ...).
CREATE TABLE usage_counters (
    subject  text NOT NULL,
    kind     text NOT NULL,
    day      date NOT NULL,
    count    int  NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, kind, day)
);

-- +goose Down
DROP TABLE usage_counters;
DROP TABLE plans;
DROP TABLE documents;
DROP TABLE parties;
DROP TABLE sessions;
DROP TABLE users;
