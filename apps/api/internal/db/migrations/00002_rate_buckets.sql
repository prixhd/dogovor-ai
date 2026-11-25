-- +goose Up
-- Fixed-window rate limiting buckets (login attempts, AI bursts).
CREATE TABLE rate_buckets (
    key     text   NOT NULL,
    bucket  bigint NOT NULL,
    count   int    NOT NULL DEFAULT 0,
    PRIMARY KEY (key, bucket)
);

-- +goose Down
DROP TABLE rate_buckets;
