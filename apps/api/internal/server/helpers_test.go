package server

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/dogovor-ai/api/internal/ai"
	"github.com/dogovor-ai/api/internal/config"
	"github.com/dogovor-ai/api/internal/store"
	"github.com/dogovor-ai/api/internal/testutil"
	"github.com/dogovor-ai/api/internal/tmpl"
)

// newTestServer starts the full router against the test database.
func newTestServer(t *testing.T, mutate ...func(*Server)) (*httptest.Server, *Server) {
	t.Helper()
	pool := testutil.DB(t)
	reg, err := tmpl.LoadDir(filepath.Join("..", "..", "..", "..", "templates"))
	if err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{AppURL: "http://app.test", TrustProxy: true, LLMProvider: "stub", AIGuestLimit: 3, AIUserLimit: 5, AIGlobalLimit: 1000,
		KnowledgeDir: filepath.Join("..", "..", "..", "..", "knowledge")}
	s := &Server{Cfg: cfg, DB: pool, Store: store.New(pool), Log: slog.New(slog.NewTextHandler(io.Discard, nil)), Templates: reg, Yandex: defaultYandex}
	s.AI.Provider = ai.Stub{}
	for _, m := range mutate {
		m(s)
	}
	if err := s.initAI(); err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(s.Router())
	t.Cleanup(ts.Close)
	return ts, s
}

// client is a browser-like test client with cookies and CSRF header.
type client struct {
	t    *testing.T
	base string
	http *http.Client
	ip   string
}

func newClient(t *testing.T, ts *httptest.Server) *client {
	jar, _ := cookiejar.New(nil)
	return &client{t: t, base: ts.URL, http: &http.Client{Jar: jar, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, ip: fmt.Sprintf("10.%d.%d.%d", rand.IntN(250), rand.IntN(250), rand.IntN(250)+1)}
}

func (c *client) csrf() string {
	req, _ := http.NewRequest("GET", c.base, nil)
	for _, ck := range c.http.Jar.Cookies(req.URL) {
		if ck.Name == csrfCookie {
			return ck.Value
		}
	}
	return ""
}

type resp struct {
	Code   int
	Body   string
	Header http.Header
}

func (r resp) JSON(t *testing.T, v any) {
	t.Helper()
	if err := json.Unmarshal([]byte(r.Body), v); err != nil {
		t.Fatalf("json: %v: %s", err, r.Body)
	}
}

func (c *client) do(method, path string, body any, headers ...string) resp {
	c.t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = strings.NewReader(string(b))
	}
	req, _ := http.NewRequest(method, c.base+path, rd)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", c.csrf())
	req.Header.Set("X-Forwarded-For", c.ip)
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	b, _ := io.ReadAll(res.Body)
	return resp{res.StatusCode, string(b), res.Header}
}

func uniqueEmail() string { return "u" + uuid.NewString()[:8] + "@test.ru" }

func (c *client) register() string {
	c.t.Helper()
	email := uniqueEmail()
	r := c.do("POST", "/auth/register", map[string]string{"email": email, "password": "надёжный-пароль", "name": "Тест"})
	if r.Code != 200 {
		c.t.Fatalf("register: %d %s", r.Code, r.Body)
	}
	return email
}
