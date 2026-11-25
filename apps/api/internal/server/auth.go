package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/dogovor-ai/api/internal/auth"
	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/store"
	"github.com/dogovor-ai/api/internal/validate"
)

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type publicUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func toPublic(u store.User) publicUser { return publicUser{u.ID.String(), u.Email, u.Name} }

// limit applies a fixed-window rate limit; it writes 429 and returns false
// when exceeded. Fails open on DB errors (logged) to keep login available.
func (s *Server) limit(w http.ResponseWriter, r *http.Request, key string, n int, window time.Duration) bool {
	ok, err := s.Store.Hit(r.Context(), key, n, window)
	if err != nil {
		s.Log.Error("rate limit", "err", err)
		return true
	}
	if !ok {
		httpx.Error(w, http.StatusTooManyRequests, "rate_limited", "Слишком много попыток. Попробуйте позже")
	}
	return ok
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if err := httpx.Decode(w, r, &c); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return
	}
	ip := httpx.ClientIP(r, s.Cfg.TrustProxy)
	if !s.limit(w, r, "register:"+ip, 10, time.Hour) {
		return
	}
	fieldErrs := map[string]string{}
	if validate.Email(c.Email) != nil || len(c.Email) > 254 {
		fieldErrs["email"] = "Введите корректный адрес почты"
	}
	if err := auth.CheckPasswordPolicy(c.Password); err != nil {
		fieldErrs["password"] = capitalize(err.Error())
	}
	if len([]rune(c.Name)) > 100 {
		fieldErrs["name"] = "Слишком длинное имя"
	}
	if len(fieldErrs) > 0 {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation", "message": "Проверьте поля формы", "fields": fieldErrs})
		return
	}
	hash, err := auth.HashPassword(c.Password)
	if err != nil {
		s.fail(w, err)
		return
	}
	u, err := s.Store.CreateUser(r.Context(), c.Email, c.Name, hash)
	if errors.Is(err, store.ErrEmailTaken) {
		httpx.JSON(w, http.StatusConflict, map[string]any{"error": "email_taken", "message": "Этот адрес уже зарегистрирован", "fields": map[string]string{"email": "Этот адрес уже зарегистрирован. Войдите"}})
		return
	}
	if err != nil {
		s.fail(w, err)
		return
	}
	s.startSession(w, r, u)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if err := httpx.Decode(w, r, &c); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return
	}
	ip := httpx.ClientIP(r, s.Cfg.TrustProxy)
	if !s.limit(w, r, "login-ip:"+ip, 30, 15*time.Minute) ||
		!s.limit(w, r, "login-email:"+store.NormalizeEmail(c.Email), 10, 15*time.Minute) {
		return
	}
	u, err := s.Store.UserByEmail(r.Context(), c.Email)
	if err != nil || u.PasswordHash == nil {
		auth.DummyVerify(c.Password)
		httpx.Error(w, http.StatusUnauthorized, "invalid_credentials", "Неверная почта или пароль")
		return
	}
	if !auth.VerifyPassword(*u.PasswordHash, c.Password) {
		httpx.Error(w, http.StatusUnauthorized, "invalid_credentials", "Неверная почта или пароль")
		return
	}
	s.startSession(w, r, u)
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request, u store.User) {
	// A fresh token on every login (session fixation protection).
	if c, err := r.Cookie(sessionCookie); err == nil {
		_ = s.Store.DeleteSession(r.Context(), c.Value)
	}
	tok, csrf, err := s.Store.CreateSession(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	s.setSessionCookies(w, tok, csrf)
	httpx.JSON(w, http.StatusOK, map[string]any{"user": toPublic(u)})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		_ = s.Store.DeleteSession(r.Context(), c.Value)
	}
	s.clearSessionCookies(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	sess := sessionFrom(r)
	if sess == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": toPublic(sess.User)})
}

func (s *Server) fail(w http.ResponseWriter, err error) {
	s.Log.Error("internal", "err", err)
	httpx.Error(w, http.StatusInternalServerError, "internal", "Внутренняя ошибка. Попробуйте ещё раз")
}

// ---------- Yandex ID (OAuth 2.0 authorization code) ----------

// YandexEndpoints are overridable in tests.
type YandexEndpoints struct{ Authorize, Token, Info string }

var defaultYandex = YandexEndpoints{
	Authorize: "https://oauth.yandex.ru/authorize",
	Token:     "https://oauth.yandex.ru/token",
	Info:      "https://login.yandex.ru/info?format=json",
}

func (s *Server) yandexRedirectURI() string {
	return strings.TrimRight(s.Cfg.AppURL, "/") + "/api/auth/yandex/callback"
}

func (s *Server) yandexStart(w http.ResponseWriter, r *http.Request) {
	if s.Cfg.YandexClientID == "" {
		http.Redirect(w, r, s.Cfg.AppURL+"/login?error=yandex_not_configured", http.StatusFound)
		return
	}
	state := auth.NewToken()
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", Value: state, Path: "/", MaxAge: 600, HttpOnly: true, Secure: s.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	if next := safeNext(r.URL.Query().Get("next")); next != "" {
		http.SetCookie(w, &http.Cookie{Name: "oauth_next", Value: next, Path: "/", MaxAge: 600, HttpOnly: true, Secure: s.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	}
	q := url.Values{"response_type": {"code"}, "client_id": {s.Cfg.YandexClientID}, "redirect_uri": {s.yandexRedirectURI()}, "state": {state}}
	http.Redirect(w, r, s.Yandex.Authorize+"?"+q.Encode(), http.StatusFound)
}

func (s *Server) yandexCallback(w http.ResponseWriter, r *http.Request) {
	fail := func() { http.Redirect(w, r, s.Cfg.AppURL+"/login?error=yandex_failed", http.StatusFound) }
	c, err := r.Cookie("oauth_state")
	if err != nil || c.Value == "" || r.URL.Query().Get("state") != c.Value {
		fail()
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", Value: "", Path: "/", MaxAge: -1})
	code := r.URL.Query().Get("code")
	if code == "" {
		fail()
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	form := url.Values{"grant_type": {"authorization_code"}, "code": {code}, "client_id": {s.Cfg.YandexClientID}, "client_secret": {s.Cfg.YandexClientSecret}}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, s.Yandex.Token, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := doJSON(req, &tok); err != nil || tok.AccessToken == "" {
		s.Log.Warn("yandex token exchange failed")
		fail()
		return
	}
	req, _ = http.NewRequestWithContext(ctx, http.MethodGet, s.Yandex.Info, nil)
	req.Header.Set("Authorization", "OAuth "+tok.AccessToken)
	var info struct {
		ID           string `json:"id"`
		DefaultEmail string `json:"default_email"`
		RealName     string `json:"real_name"`
		DisplayName  string `json:"display_name"`
	}
	if err := doJSON(req, &info); err != nil || info.ID == "" {
		fail()
		return
	}
	name := info.RealName
	if name == "" {
		name = info.DisplayName
	}
	u, err := s.Store.UpsertYandexUser(r.Context(), info.ID, info.DefaultEmail, name)
	if err != nil {
		s.Log.Error("yandex upsert", "err", err)
		fail()
		return
	}
	token, csrf, err := s.Store.CreateSession(r.Context(), u.ID)
	if err != nil {
		fail()
		return
	}
	s.setSessionCookies(w, token, csrf)
	next := "/account"
	if c, err := r.Cookie("oauth_next"); err == nil && safeNext(c.Value) != "" {
		next = c.Value
	}
	http.Redirect(w, r, s.Cfg.AppURL+next, http.StatusFound)
}

// safeNext only allows local paths (open-redirect protection).
func safeNext(p string) string {
	if strings.HasPrefix(p, "/") && !strings.HasPrefix(p, "//") && !strings.Contains(p, "\\") && len(p) < 500 {
		return p
	}
	return ""
}

var httpClient = &http.Client{Timeout: 15 * time.Second}

func doJSON(req *http.Request, out any) error {
	res, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		return errors.New(res.Status)
	}
	return json.NewDecoder(http.MaxBytesReader(nil, res.Body, 1<<20)).Decode(out)
}

func capitalize(s string) string {
	r := []rune(s)
	if len(r) == 0 {
		return s
	}
	return strings.ToUpper(string(r[0])) + string(r[1:])
}
