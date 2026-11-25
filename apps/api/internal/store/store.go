// Package store contains all Postgres queries. Every query on user-owned
// rows filters by owner_id, so other users' rows look like "not found".
package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dogovor-ai/api/internal/auth"
)

// Errors returned by the store.
var (
	ErrNotFound   = errors.New("not found")
	ErrEmailTaken = errors.New("email taken")
)

// Store wraps the connection pool.
type Store struct{ DB *pgxpool.Pool }

// New creates a Store.
func New(db *pgxpool.Pool) *Store { return &Store{DB: db} }

func newID() uuid.UUID { return uuid.Must(uuid.NewV7()) }

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// ---------- users ----------

// User is an account.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash *string   `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

const userCols = "id, email, name, password_hash, created_at"

func scanUser(r pgx.Row) (User, error) {
	var u User
	err := r.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt)
	return u, notFound(err)
}

// NormalizeEmail lowercases and trims an address.
func NormalizeEmail(e string) string { return strings.ToLower(strings.TrimSpace(e)) }

// CreateUser inserts a password user.
func (s *Store) CreateUser(ctx context.Context, email, name, hash string) (User, error) {
	u, err := scanUser(s.DB.QueryRow(ctx,
		`INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4) RETURNING `+userCols,
		newID(), NormalizeEmail(email), strings.TrimSpace(name), hash))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrEmailTaken
	}
	return u, err
}

// UserByEmail finds a user by email.
func (s *Store) UserByEmail(ctx context.Context, email string) (User, error) {
	return scanUser(s.DB.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE email = $1`, NormalizeEmail(email)))
}

// UpsertYandexUser links or creates an account for a Yandex ID login.
func (s *Store) UpsertYandexUser(ctx context.Context, yandexID, email, name string) (User, error) {
	email = NormalizeEmail(email)
	if u, err := scanUser(s.DB.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE yandex_id = $1`, yandexID)); err == nil {
		return u, nil
	}
	// Link to an existing email account (Yandex verifies email ownership).
	if email != "" {
		u, err := scanUser(s.DB.QueryRow(ctx,
			`UPDATE users SET yandex_id = $1 WHERE email = $2 AND yandex_id IS NULL RETURNING `+userCols, yandexID, email))
		if err == nil {
			return u, nil
		}
	}
	if email == "" {
		email = "yandex-" + yandexID + "@users.dogovor.ai"
	}
	return scanUser(s.DB.QueryRow(ctx,
		`INSERT INTO users (id, email, name, yandex_id) VALUES ($1, $2, $3, $4) RETURNING `+userCols,
		newID(), email, name, yandexID))
}

// ---------- sessions ----------

// SessionTTL is how long a session lives.
const SessionTTL = 30 * 24 * time.Hour

// Session describes an authenticated browser session.
type Session struct {
	User User
	CSRF string
}

// CreateSession issues a new session and returns the raw token and CSRF token.
func (s *Store) CreateSession(ctx context.Context, userID uuid.UUID) (token, csrf string, err error) {
	token, csrf = auth.NewToken(), auth.NewToken()
	_, err = s.DB.Exec(ctx, `INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)`,
		auth.HashToken(token), userID, csrf, time.Now().Add(SessionTTL))
	return token, csrf, err
}

// SessionByToken resolves a raw token to its user.
func (s *Store) SessionByToken(ctx context.Context, token string) (Session, error) {
	var sess Session
	err := s.DB.QueryRow(ctx, `SELECT u.id, u.email, u.name, u.password_hash, u.created_at, s.csrf_token
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`, auth.HashToken(token)).
		Scan(&sess.User.ID, &sess.User.Email, &sess.User.Name, &sess.User.PasswordHash, &sess.User.CreatedAt, &sess.CSRF)
	return sess, notFound(err)
}

// DeleteSession logs a session out.
func (s *Store) DeleteSession(ctx context.Context, token string) error {
	_, err := s.DB.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, auth.HashToken(token))
	return err
}

// ---------- documents ----------

// Document is a saved, user-owned filled template.
type Document struct {
	ID              uuid.UUID       `json:"id"`
	TemplateSlug    string          `json:"templateSlug"`
	TemplateVersion int             `json:"templateVersion"`
	Title           string          `json:"title"`
	Data            json.RawMessage `json:"data"`
	Edits           json.RawMessage `json:"edits"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

const docCols = "id, template_slug, template_version, title, data, edits, created_at, updated_at"

func scanDoc(r pgx.Row) (Document, error) {
	var d Document
	err := r.Scan(&d.ID, &d.TemplateSlug, &d.TemplateVersion, &d.Title, &d.Data, &d.Edits, &d.CreatedAt, &d.UpdatedAt)
	return d, notFound(err)
}

// CreateDocument stores a new document.
func (s *Store) CreateDocument(ctx context.Context, owner uuid.UUID, slug string, version int, title string, data, edits json.RawMessage) (Document, error) {
	return scanDoc(s.DB.QueryRow(ctx, `INSERT INTO documents (id, owner_id, template_slug, template_version, title, data, edits)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING `+docCols, newID(), owner, slug, version, title, data, edits))
}

// GetDocument returns a document owned by owner.
func (s *Store) GetDocument(ctx context.Context, owner, id uuid.UUID) (Document, error) {
	return scanDoc(s.DB.QueryRow(ctx, `SELECT `+docCols+` FROM documents WHERE id = $1 AND owner_id = $2`, id, owner))
}

// UpdateDocument patches non-nil fields.
func (s *Store) UpdateDocument(ctx context.Context, owner, id uuid.UUID, title *string, data, edits json.RawMessage) (Document, error) {
	return scanDoc(s.DB.QueryRow(ctx, `UPDATE documents SET
		title = COALESCE($3, title), data = COALESCE($4, data), edits = COALESCE($5, edits), updated_at = now()
		WHERE id = $1 AND owner_id = $2 RETURNING `+docCols, id, owner, title, nullJSON(data), nullJSON(edits)))
}

// ListDocuments returns the owner's documents, newest first.
func (s *Store) ListDocuments(ctx context.Context, owner uuid.UUID) ([]Document, error) {
	rows, err := s.DB.Query(ctx, `SELECT `+docCols+` FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 500`, owner)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Document, error) { return scanDoc(r) })
}

// DuplicateDocument copies a document of the same owner.
func (s *Store) DuplicateDocument(ctx context.Context, owner, id uuid.UUID) (Document, error) {
	return scanDoc(s.DB.QueryRow(ctx, `INSERT INTO documents (id, owner_id, template_slug, template_version, title, data, edits)
		SELECT $3, owner_id, template_slug, template_version, title || ' (копия)', data, edits FROM documents
		WHERE id = $1 AND owner_id = $2 RETURNING `+docCols, id, owner, newID()))
}

// DeleteDocument removes a document of the owner.
func (s *Store) DeleteDocument(ctx context.Context, owner, id uuid.UUID) error {
	tag, err := s.DB.Exec(ctx, `DELETE FROM documents WHERE id = $1 AND owner_id = $2`, id, owner)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

func nullJSON(b json.RawMessage) any {
	if len(b) == 0 {
		return nil
	}
	return []byte(b)
}

// ---------- parties (cards) ----------

// Party is a saved set of requisites for a person, IP or organisation.
type Party struct {
	ID        uuid.UUID         `json:"id"`
	Kind      string            `json:"kind"`
	Title     string            `json:"title"`
	Data      map[string]string `json:"data"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

const partyCols = "id, kind, title, data, created_at, updated_at"

func scanParty(r pgx.Row) (Party, error) {
	var p Party
	err := r.Scan(&p.ID, &p.Kind, &p.Title, &p.Data, &p.CreatedAt, &p.UpdatedAt)
	return p, notFound(err)
}

// CreateParty stores a card.
func (s *Store) CreateParty(ctx context.Context, owner uuid.UUID, kind, title string, data map[string]string) (Party, error) {
	return scanParty(s.DB.QueryRow(ctx, `INSERT INTO parties (id, owner_id, kind, title, data) VALUES ($1, $2, $3, $4, $5) RETURNING `+partyCols,
		newID(), owner, kind, title, data))
}

// GetParty returns a card of the owner.
func (s *Store) GetParty(ctx context.Context, owner, id uuid.UUID) (Party, error) {
	return scanParty(s.DB.QueryRow(ctx, `SELECT `+partyCols+` FROM parties WHERE id = $1 AND owner_id = $2`, id, owner))
}

// UpdateParty replaces a card's fields.
func (s *Store) UpdateParty(ctx context.Context, owner, id uuid.UUID, kind, title string, data map[string]string) (Party, error) {
	return scanParty(s.DB.QueryRow(ctx, `UPDATE parties SET kind = $3, title = $4, data = $5, updated_at = now()
		WHERE id = $1 AND owner_id = $2 RETURNING `+partyCols, id, owner, kind, title, data))
}

// ListParties returns the owner's cards.
func (s *Store) ListParties(ctx context.Context, owner uuid.UUID) ([]Party, error) {
	rows, err := s.DB.Query(ctx, `SELECT `+partyCols+` FROM parties WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 500`, owner)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Party, error) { return scanParty(r) })
}

// DeleteParty removes a card.
func (s *Store) DeleteParty(ctx context.Context, owner, id uuid.UUID) error {
	tag, err := s.DB.Exec(ctx, `DELETE FROM parties WHERE id = $1 AND owner_id = $2`, id, owner)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// ---------- usage & rate limits ----------

// TakeDaily atomically increments today's (UTC) counter if it is below
// limit. It returns the new count and false when the limit is reached.
func (s *Store) TakeDaily(ctx context.Context, subject, kind string, limit int) (int, bool, error) {
	var n int
	err := s.DB.QueryRow(ctx, `INSERT INTO usage_counters (subject, kind, day, count) VALUES ($1, $2, (now() AT TIME ZONE 'utc')::date, 1)
		ON CONFLICT (subject, kind, day) DO UPDATE SET count = usage_counters.count + 1
		WHERE usage_counters.count < $3 RETURNING count`, subject, kind, limit).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return limit, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	if n > limit { // limit <= 0
		return n, false, nil
	}
	return n, true, nil
}

// RefundDaily gives back one unit (e.g. the AI provider failed).
func (s *Store) RefundDaily(ctx context.Context, subject, kind string) error {
	_, err := s.DB.Exec(ctx, `UPDATE usage_counters SET count = GREATEST(count - 1, 0)
		WHERE subject = $1 AND kind = $2 AND day = (now() AT TIME ZONE 'utc')::date`, subject, kind)
	return err
}

// UsedDaily returns today's counter value.
func (s *Store) UsedDaily(ctx context.Context, subject, kind string) (int, error) {
	var n int
	err := s.DB.QueryRow(ctx, `SELECT count FROM usage_counters WHERE subject = $1 AND kind = $2 AND day = (now() AT TIME ZONE 'utc')::date`,
		subject, kind).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return n, err
}

// Hit registers an event in a fixed time window and reports whether the
// caller is still within limit.
func (s *Store) Hit(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	bucket := time.Now().Unix() / int64(window.Seconds())
	var n int
	err := s.DB.QueryRow(ctx, `INSERT INTO rate_buckets (key, bucket, count) VALUES ($1, $2, 1)
		ON CONFLICT (key, bucket) DO UPDATE SET count = rate_buckets.count + 1 RETURNING count`, key, bucket).Scan(&n)
	if err != nil {
		return false, err
	}
	if n == 1 && bucket%50 == 0 {
		// Opportunistic cleanup of old buckets.
		_, _ = s.DB.Exec(ctx, `DELETE FROM rate_buckets WHERE bucket < $1`, bucket-1000)
	}
	return n <= limit, nil
}
