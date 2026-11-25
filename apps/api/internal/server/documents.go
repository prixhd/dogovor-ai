package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/store"
	"github.com/dogovor-ai/api/internal/tmpl"
)

var blockIDRe = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,64}$`)

// sanitizeData keeps only known template fields with scalar values.
func sanitizeData(t *tmpl.Template, in tmpl.Data) (tmpl.Data, error) {
	out := tmpl.Data{}
	for k, v := range in {
		if _, ok := t.Field(k); !ok {
			continue
		}
		switch x := v.(type) {
		case string:
			if utf8.RuneCountInString(x) > 5000 {
				return nil, fmt.Errorf("field %s too long", k)
			}
			out[k] = x
		case float64, bool, nil:
			out[k] = x
		default:
			return nil, fmt.Errorf("field %s: unsupported value", k)
		}
	}
	return out, nil
}

// ValidateEdits bounds AI/user edits so they cannot bloat or break documents.
func ValidateEdits(e tmpl.Edits) error {
	if len(e.Replaced) > 200 || len(e.Deleted) > 200 || len(e.Inserted) > 100 {
		return errors.New("too many edits")
	}
	for id, txt := range e.Replaced {
		if !blockIDRe.MatchString(id) || utf8.RuneCountInString(txt) > 5000 {
			return errors.New("bad replaced edit")
		}
	}
	for _, id := range e.Deleted {
		if !blockIDRe.MatchString(id) {
			return errors.New("bad deleted edit")
		}
	}
	for _, ib := range e.Inserted {
		if !blockIDRe.MatchString(ib.ID) || !blockIDRe.MatchString(ib.After) || utf8.RuneCountInString(ib.Text) > 5000 {
			return errors.New("bad inserted edit")
		}
	}
	return nil
}

type docReq struct {
	TemplateSlug string      `json:"templateSlug"`
	Title        *string     `json:"title"`
	Data         *tmpl.Data  `json:"data"`
	Edits        *tmpl.Edits `json:"edits"`
}

func (s *Server) docID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "not_found", "Документ не найден")
		return uuid.Nil, false
	}
	return id, true
}

func cleanTitle(p *string, def string) (string, error) {
	if p == nil {
		return def, nil
	}
	t := strings.TrimSpace(*p)
	if t == "" {
		return def, nil
	}
	if utf8.RuneCountInString(t) > 200 {
		return "", errors.New("title too long")
	}
	return t, nil
}

func (s *Server) createDocument(w http.ResponseWriter, r *http.Request) {
	var req docReq
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return
	}
	t, ok := s.Templates.Get(req.TemplateSlug)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "unknown_template", "Шаблон не найден")
		return
	}
	var data tmpl.Data
	if req.Data != nil {
		data = *req.Data
	}
	clean, err := sanitizeData(t, data)
	var edits tmpl.Edits
	if req.Edits != nil {
		edits = *req.Edits
	}
	title, terr := cleanTitle(req.Title, t.Title)
	if err != nil || terr != nil || ValidateEdits(edits) != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректные данные документа")
		return
	}
	dj, _ := json.Marshal(clean)
	ej, _ := json.Marshal(edits)
	doc, err := s.Store.CreateDocument(r.Context(), sessionFrom(r).User.ID, t.Slug, t.Version, title, dj, ej)
	if err != nil {
		s.fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"document": doc})
}

func (s *Server) getDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := s.docID(w, r)
	if !ok {
		return
	}
	doc, err := s.Store.GetDocument(r.Context(), sessionFrom(r).User.ID, id)
	if s.storeErr(w, err, "Документ не найден") {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	httpx.JSON(w, http.StatusOK, map[string]any{"document": doc})
}

func (s *Server) updateDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := s.docID(w, r)
	if !ok {
		return
	}
	owner := sessionFrom(r).User.ID
	cur, err := s.Store.GetDocument(r.Context(), owner, id)
	if s.storeErr(w, err, "Документ не найден") {
		return
	}
	var req docReq
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return
	}
	t, ok := s.Templates.Get(cur.TemplateSlug)
	if !ok {
		httpx.Error(w, http.StatusConflict, "unknown_template", "Шаблон документа больше не доступен")
		return
	}
	var dj, ej []byte
	if req.Data != nil {
		clean, err := sanitizeData(t, *req.Data)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректные данные документа")
			return
		}
		dj, _ = json.Marshal(clean)
	}
	if req.Edits != nil {
		if ValidateEdits(*req.Edits) != nil {
			httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректные правки")
			return
		}
		ej, _ = json.Marshal(req.Edits)
	}
	var title *string
	if req.Title != nil {
		tt, err := cleanTitle(req.Title, cur.Title)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "bad_request", "Слишком длинное название")
			return
		}
		title = &tt
	}
	doc, err := s.Store.UpdateDocument(r.Context(), owner, id, title, dj, ej)
	if s.storeErr(w, err, "Документ не найден") {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"document": doc})
}

func (s *Server) exportDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := s.docID(w, r)
	if !ok {
		return
	}
	doc, err := s.Store.GetDocument(r.Context(), sessionFrom(r).User.ID, id)
	if s.storeErr(w, err, "Документ не найден") {
		return
	}
	t, ok := s.Templates.Get(doc.TemplateSlug)
	if !ok {
		httpx.Error(w, http.StatusConflict, "unknown_template", "Шаблон документа больше не доступен")
		return
	}
	var data tmpl.Data
	var edits tmpl.Edits
	_ = json.Unmarshal(doc.Data, &data)
	_ = json.Unmarshal(doc.Edits, &edits)
	if errs := tmpl.ValidateData(t, data); len(errs) > 0 {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "incomplete", "message": "Заполните обязательные поля", "fields": errs})
		return
	}
	rendered := tmpl.Render(t, data, edits)
	var buf bytes.Buffer
	if err := tmpl.WriteDOCX(&buf, rendered); err != nil {
		s.fail(w, err)
		return
	}
	format := r.URL.Query().Get("format")
	body, ctype, ext := buf.Bytes(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"
	if format == "pdf" {
		pdf, err := tmpl.ConvertPDF(r.Context(), body)
		if errors.Is(err, tmpl.ErrPDFUnavailable) {
			httpx.Error(w, http.StatusNotImplemented, "pdf_unavailable", "PDF пока недоступен на этом сервере. Скачайте DOCX")
			return
		}
		if err != nil {
			s.fail(w, err)
			return
		}
		body, ctype, ext = pdf, "application/pdf", "pdf"
	}
	name := doc.Title + "." + ext
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="document.%s"; filename*=UTF-8''%s`, ext, url.PathEscape(name)))
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}

// storeErr maps store errors to HTTP; returns true if a response was written.
func (s *Server) storeErr(w http.ResponseWriter, err error, notFoundMsg string) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, store.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "not_found", notFoundMsg)
	default:
		s.fail(w, err)
	}
	return true
}
