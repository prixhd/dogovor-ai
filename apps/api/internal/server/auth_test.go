package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRegisterLoginLogout(t *testing.T) {
	ts, _ := newTestServer(t)
	c := newClient(t, ts)

	if r := c.do("POST", "/auth/register", map[string]string{"email": "bad", "password": "123"}); r.Code != 422 {
		t.Fatalf("validation: %d", r.Code)
	}
	email := c.register()
	var me struct{ User *publicUser }
	c.do("GET", "/auth/me", nil).JSON(t, &me)
	if me.User == nil || me.User.Email != email {
		t.Fatalf("me after register: %+v", me)
	}
	if r := c.do("POST", "/auth/register", map[string]string{"email": email, "password": "надёжный-пароль"}); r.Code != 409 {
		t.Fatalf("duplicate: %d", r.Code)
	}
	if r := c.do("POST", "/auth/logout", nil); r.Code != 204 {
		t.Fatalf("logout: %d", r.Code)
	}
	c.do("GET", "/auth/me", nil).JSON(t, &me)
	if me.User != nil {
		t.Fatal("still logged in after logout")
	}
	if r := c.do("POST", "/auth/login", map[string]string{"email": email, "password": "wrong-password"}); r.Code != 401 {
		t.Fatalf("wrong password: %d", r.Code)
	}
	if r := c.do("POST", "/auth/login", map[string]string{"email": strings.ToUpper(email), "password": "надёжный-пароль"}); r.Code != 200 {
		t.Fatalf("login: %d %s", r.Code, r.Body)
	}
	r := c.do("POST", "/auth/login", map[string]string{"email": email, "password": "надёжный-пароль"})
	if sc := r.Header.Get("Set-Cookie"); !strings.Contains(sc, "HttpOnly") || !strings.Contains(sc, "SameSite=Lax") {
		t.Fatalf("cookie flags: %s", sc)
	}
}

func TestLoginBruteForceLimited(t *testing.T) {
	ts, _ := newTestServer(t)
	c := newClient(t, ts)
	email := c.register()
	var last int
	for i := 0; i < 12; i++ {
		last = c.do("POST", "/auth/login", map[string]string{"email": email, "password": "wrong-password"}).Code
	}
	if last != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after many failures, got %d", last)
	}
}

func TestCSRFAndOrigin(t *testing.T) {
	ts, _ := newTestServer(t)
	c := newClient(t, ts)
	c.register()
	body := map[string]any{"templateSlug": "trudovoy-dogovor", "data": map[string]any{}}
	if r := c.do("POST", "/documents", body, "X-CSRF-Token", "forged"); r.Code != 403 {
		t.Fatalf("missing CSRF accepted: %d", r.Code)
	}
	if r := c.do("POST", "/documents", body, "Origin", "https://evil.example"); r.Code != 403 {
		t.Fatalf("foreign origin accepted: %d", r.Code)
	}
	if r := c.do("POST", "/documents", body, "Origin", "http://app.test"); r.Code != 201 {
		t.Fatalf("same origin rejected: %d %s", r.Code, r.Body)
	}
}

func TestDocumentsRequireAuthAndOwnership(t *testing.T) {
	ts, _ := newTestServer(t)
	anon := newClient(t, ts)
	if r := anon.do("POST", "/documents", map[string]any{"templateSlug": "trudovoy-dogovor"}); r.Code != 401 {
		t.Fatalf("anonymous create: %d", r.Code)
	}
	alice, bob := newClient(t, ts), newClient(t, ts)
	alice.register()
	bob.register()
	raw := mustFixture(t)
	r := alice.do("POST", "/documents", map[string]any{"templateSlug": "trudovoy-dogovor", "title": "Мой договор", "data": raw, "edits": map[string]any{}})
	if r.Code != 201 {
		t.Fatalf("create: %d %s", r.Code, r.Body)
	}
	var created struct{ Document struct{ ID string } }
	r.JSON(t, &created)
	id := created.Document.ID

	for _, path := range []string{"/documents/" + id, "/documents/" + id + "/export?format=docx"} {
		if r := bob.do("GET", path, nil); r.Code != 404 {
			t.Fatalf("bob GET %s: %d", path, r.Code)
		}
	}
	if r := bob.do("PATCH", "/documents/"+id, map[string]any{"title": "x"}); r.Code != 404 {
		t.Fatalf("bob PATCH: %d", r.Code)
	}
	r = alice.do("GET", "/documents/"+id+"/export?format=docx", nil)
	if r.Code != 200 || !strings.HasPrefix(r.Body, "PK") || !strings.Contains(r.Header.Get("Content-Disposition"), "attachment") {
		t.Fatalf("export: %d %s", r.Code, r.Header)
	}
	if r := alice.do("PATCH", "/documents/"+id, map[string]any{"data": map[string]any{"number": 7, "unknown": "drop me"}}); r.Code != 200 || strings.Contains(r.Body, "drop me") {
		t.Fatalf("patch sanitize: %d %s", r.Code, r.Body)
	}
}

func TestYandexOAuthFlow(t *testing.T) {
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			_ = r.ParseForm()
			if r.Form.Get("code") != "good" {
				w.WriteHeader(400)
				return
			}
			_, _ = w.Write([]byte(`{"access_token":"tok"}`))
		case "/info":
			if r.Header.Get("Authorization") != "OAuth tok" {
				w.WriteHeader(401)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"id": "ya-" + uniqueEmail(), "default_email": uniqueEmail(), "real_name": "Яндекс Пользователь"})
		}
	}))
	defer fake.Close()
	ts, _ := newTestServer(t, func(s *Server) {
		s.Cfg.YandexClientID, s.Cfg.YandexClientSecret = "id", "secret"
		s.Yandex = YandexEndpoints{Authorize: fake.URL + "/authorize", Token: fake.URL + "/token", Info: fake.URL + "/info"}
	})
	c := newClient(t, ts)
	r := c.do("GET", "/auth/yandex/start?next=/account/cards", nil)
	if r.Code != 302 || !strings.HasPrefix(r.Header.Get("Location"), fake.URL+"/authorize") {
		t.Fatalf("start: %d %s", r.Code, r.Header.Get("Location"))
	}
	if r := c.do("GET", "/auth/yandex/callback?code=good&state=forged", nil); !strings.Contains(r.Header.Get("Location"), "error=yandex_failed") {
		t.Fatal("forged state accepted")
	}
	// state cookie was cleared by the failed attempt; restart the flow.
	r = c.do("GET", "/auth/yandex/start?next=/account/cards", nil)
	loc := r.Header.Get("Location")
	state := loc[strings.Index(loc, "state=")+6:]
	r = c.do("GET", "/auth/yandex/callback?code=good&state="+state, nil)
	if r.Code != 302 || r.Header.Get("Location") != "http://app.test/account/cards" {
		t.Fatalf("callback: %d %s", r.Code, r.Header.Get("Location"))
	}
	var me struct{ User *publicUser }
	c.do("GET", "/auth/me", nil).JSON(t, &me)
	if me.User == nil || me.User.Name != "Яндекс Пользователь" {
		t.Fatalf("yandex user: %+v", me.User)
	}
}

func TestSafeNext(t *testing.T) {
	for in, want := range map[string]string{"/account": "/account", "//evil.com": "", "https://evil.com": "", "/\\evil": ""} {
		if got := safeNext(in); got != want {
			t.Errorf("safeNext(%q)=%q", in, got)
		}
	}
}
