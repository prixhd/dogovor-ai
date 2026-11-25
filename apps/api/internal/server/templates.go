package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/tmpl"
)

type templateSummary struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	FieldsCount int      `json:"fieldsCount"`
	Minutes     int      `json:"minutes"`
	Keywords    []string `json:"keywords,omitempty"`
}

func summarize(t *tmpl.Template) templateSummary {
	return templateSummary{t.Slug, t.Title, t.Category, t.Description, t.Status, len(t.Fields()), t.Minutes, t.Keywords}
}

func (s *Server) listTemplates(w http.ResponseWriter, _ *http.Request) {
	out := make([]templateSummary, 0, len(s.Templates.List()))
	for _, t := range s.Templates.List() {
		out = append(out, summarize(t))
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	httpx.JSON(w, http.StatusOK, map[string]any{"templates": out})
}

func (s *Server) getTemplate(w http.ResponseWriter, r *http.Request) {
	t, ok := s.Templates.Get(chi.URLParam(r, "slug"))
	if !ok {
		httpx.Error(w, http.StatusNotFound, "not_found", "Шаблон не найден")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	httpx.JSON(w, http.StatusOK, map[string]any{"template": t})
}

type previewReq struct {
	Data  tmpl.Data  `json:"data"`
	Edits tmpl.Edits `json:"edits"`
}

// previewTemplate renders the document for the live sheet (no auth needed:
// nothing is stored).
func (s *Server) previewTemplate(w http.ResponseWriter, r *http.Request) {
	t, ok := s.Templates.Get(chi.URLParam(r, "slug"))
	if !ok {
		httpx.Error(w, http.StatusNotFound, "not_found", "Шаблон не найден")
		return
	}
	var req previewReq
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"document": tmpl.Render(t, req.Data, req.Edits),
		"errors":   tmpl.ValidateData(t, req.Data),
	})
}
