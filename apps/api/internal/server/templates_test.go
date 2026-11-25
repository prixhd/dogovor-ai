package server

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dogovor-ai/api/internal/tmpl"
)

func templatesServer(t *testing.T) *Server {
	t.Helper()
	reg, err := tmpl.LoadDir(filepath.Join("..", "..", "..", "..", "templates"))
	if err != nil {
		t.Fatal(err)
	}
	return &Server{Log: slog.New(slog.NewTextHandler(io.Discard, nil)), Templates: reg}
}

func TestTemplatesListAndPreview(t *testing.T) {
	h := templatesServer(t).Router()

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/templates", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "trudovoy-dogovor") {
		t.Fatalf("list: %d %s", rec.Code, rec.Body)
	}

	body := `{"data":{"number":"7","position":"инженера"},"edits":{}}`
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/templates/trudovoy-dogovor/preview", strings.NewReader(body)))
	if rec.Code != 200 {
		t.Fatalf("preview: %d %s", rec.Code, rec.Body)
	}
	var resp struct {
		Document tmpl.Document     `json:"document"`
		Errors   map[string]string `json:"errors"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(resp.Document.Text(), "№ 7") || resp.Errors["employer.name"] == "" {
		t.Fatalf("unexpected preview: %v", resp.Errors)
	}

	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/templates/nope", nil))
	if rec.Code != 404 {
		t.Fatalf("missing template: %d", rec.Code)
	}
}
