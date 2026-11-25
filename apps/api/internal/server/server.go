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
)

// Server holds shared dependencies of all handlers.
type Server struct {
	Cfg config.Config
	DB  *pgxpool.Pool
	Log *slog.Logger
}

// Router builds the chi router with all routes.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP, middleware.Recoverer, httpx.SecurityHeaders, httpx.Logger(s.Log))

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
	return r
}

// New constructs a Server.
func New(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (*Server, error) {
	return &Server{Cfg: cfg, DB: pool, Log: log}, nil
}
