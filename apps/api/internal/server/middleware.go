package server

import (
	"context"
	"crypto/subtle"
	"net/http"
	"net/url"
	"time"

	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/store"
)

type ctxKey int

const sessionKey ctxKey = 1

const (
	sessionCookie = "sid"
	csrfCookie    = "csrf_token"
)

// withSession resolves the session cookie (if any) into the request context.
func (s *Server) withSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" && s.Store != nil {
			if sess, err := s.Store.SessionByToken(r.Context(), c.Value); err == nil {
				r = r.WithContext(context.WithValue(r.Context(), sessionKey, &sess))
			}
		}
		next.ServeHTTP(w, r)
	})
}

func sessionFrom(r *http.Request) *store.Session {
	s, _ := r.Context().Value(sessionKey).(*store.Session)
	return s
}

// csrfProtect rejects cross-site state-changing requests: the Origin must
// match APP_URL, and authenticated requests must echo the session CSRF token
// (double submit: cookie readable by our JS, header set by our JS).
func (s *Server) csrfProtect(next http.Handler) http.Handler {
	appOrigin := ""
	if u, err := url.Parse(s.Cfg.AppURL); err == nil {
		appOrigin = u.Scheme + "://" + u.Host
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		if o := r.Header.Get("Origin"); o != "" && appOrigin != "" && o != appOrigin {
			httpx.Error(w, http.StatusForbidden, "bad_origin", "Запрос отклонён")
			return
		}
		if sess := sessionFrom(r); sess != nil {
			got := r.Header.Get("X-CSRF-Token")
			if subtle.ConstantTimeCompare([]byte(got), []byte(sess.CSRF)) != 1 {
				httpx.Error(w, http.StatusForbidden, "csrf", "Сессия устарела, обновите страницу")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// requireUser returns 401 for anonymous requests.
func requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if sessionFrom(r) == nil {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Войдите в аккаунт")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) setSessionCookies(w http.ResponseWriter, token, csrf string) {
	exp := time.Now().Add(store.SessionTTL)
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: token, Path: "/", Expires: exp, HttpOnly: true, Secure: s.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: csrfCookie, Value: csrf, Path: "/", Expires: exp, HttpOnly: false, Secure: s.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (s *Server) clearSessionCookies(w http.ResponseWriter) {
	for _, n := range []string{sessionCookie, csrfCookie} {
		http.SetCookie(w, &http.Cookie{Name: n, Value: "", Path: "/", MaxAge: -1, HttpOnly: n == sessionCookie, Secure: s.Cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	}
}
