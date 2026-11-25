// Package server wires HTTP routes to their handlers.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dogovor-ai/api/internal/config"
	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/store"
	"github.com/dogovor-ai/api/internal/tmpl"
)

// Server holds shared dependencies of all handlers.
type Server struct {
	Cfg       config.Config
	DB        *pgxpool.Pool
	Store     *store.Store
	Log       *slog.Logger
	Templates *tmpl.Registry
	Yandex    YandexEndpoints
}

// Router builds the chi router with all routes.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer, httpx.SecurityHeaders, httpx.Logger(s.Log))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.DB.Ping(ctx); err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "db_unavailable", "База данных недоступна")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	r.Get("/templates", s.listTemplates)
	r.Get("/templates/{slug}", s.getTemplate)

	r.Group(func(r chi.Router) {
		r.Use(s.withSession, s.csrfProtect)
		r.Post("/templates/{slug}/preview", s.previewTemplate)

		r.Get("/auth/me", s.me)
		r.Post("/auth/register", s.register)
		r.Post("/auth/login", s.login)
		r.Post("/auth/logout", s.logout)
		r.Get("/auth/yandex/start", s.yandexStart)
		r.Get("/auth/yandex/callback", s.yandexCallback)

		r.Group(func(r chi.Router) {
			r.Use(requireUser)
			r.Post("/documents", s.createDocument)
			r.Get("/documents/{id}", s.getDocument)
			r.Patch("/documents/{id}", s.updateDocument)
			r.Get("/documents/{id}/export", s.exportDocument)
		})
	})
	return r
}

// New constructs a Server.
func New(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (*Server, error) {
	reg, err := tmpl.LoadDir(cfg.TemplatesDir)
	if err != nil {
		return nil, err
	}
	log.Info("templates loaded", "count", len(reg.List()), "pdf", tmpl.PDFAvailable())
	return &Server{Cfg: cfg, DB: pool, Store: store.New(pool), Log: log, Templates: reg, Yandex: defaultYandex}, nil
}
