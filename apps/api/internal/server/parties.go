package server

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dogovor-ai/api/internal/httpx"
	"github.com/dogovor-ai/api/internal/validate"
)

// partyKeys whitelists card fields per kind. Keys match template `bind`.
var partyKeys = map[string][]string{
	"org":    {"name", "short_name", "inn", "kpp", "ogrn", "address", "signer_name", "signer_position", "signer_basis", "bank", "bik", "account", "corr_account", "phone", "email"},
	"ip":     {"name", "inn", "ogrn", "address", "bank", "bik", "account", "corr_account", "phone", "email"},
	"person": {"name", "birth_date", "passport", "passport_issued", "address", "inn", "phone", "email"},
}

type partyReq struct {
	Kind  string            `json:"kind"`
	Title string            `json:"title"`
	Data  map[string]string `json:"data"`
}

// validateParty cleans card data and returns field errors (Russian).
func validateParty(req *partyReq) map[string]string {
	errs := map[string]string{}
	keys, ok := partyKeys[req.Kind]
	if !ok {
		errs["kind"] = "Выберите тип: организация, ИП или физлицо"
		return errs
	}
	clean := map[string]string{}
	for _, k := range keys {
		v := strings.TrimSpace(req.Data[k])
		if v == "" {
			continue
		}
		if utf8.RuneCountInString(v) > 500 {
			errs[k] = "Слишком длинное значение"
			continue
		}
		clean[k] = v
	}
	req.Data = clean
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		req.Title = clean["short_name"]
	}
	if req.Title == "" {
		req.Title = clean["name"]
	}
	if req.Title == "" {
		errs["name"] = "Укажите наименование или ФИО"
	}
	if utf8.RuneCountInString(req.Title) > 200 {
		errs["title"] = "Слишком длинное название"
	}
	check := func(key string, fn func(string) error) {
		if v, ok := clean[key]; ok {
			if err := fn(v); err != nil {
				errs[key] = capitalize(err.Error())
			}
		}
	}
	check("inn", validate.INN)
	check("ogrn", validate.OGRN)
	check("bik", validate.BIK)
	check("email", validate.Email)
	check("phone", validate.Phone)
	if inn, ok := clean["inn"]; ok && errs["inn"] == "" {
		if req.Kind == "org" && len(inn) != 10 {
			errs["inn"] = "ИНН организации содержит 10 цифр"
		}
		if req.Kind != "org" && len(inn) != 12 {
			errs["inn"] = "ИНН физлица и ИП содержит 12 цифр"
		}
	}
	if acc, ok := clean["account"]; ok {
		if err := validate.Account(acc, clean["bik"]); err != nil {
			errs["account"] = capitalize(err.Error())
		}
	}
	return errs
}

func (s *Server) partyID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "not_found", "Карточка не найдена")
		return uuid.Nil, false
	}
	return id, true
}

func (s *Server) decodeParty(w http.ResponseWriter, r *http.Request) (*partyReq, bool) {
	var req partyReq
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "Некорректный запрос")
		return nil, false
	}
	if errs := validateParty(&req); len(errs) > 0 {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "validation", "message": "Проверьте реквизиты", "fields": errs})
		return nil, false
	}
	return &req, true
}

func (s *Server) listParties(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListParties(r.Context(), sessionFrom(r).User.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	httpx.JSON(w, http.StatusOK, map[string]any{"parties": list})
}

func (s *Server) createParty(w http.ResponseWriter, r *http.Request) {
	req, ok := s.decodeParty(w, r)
	if !ok {
		return
	}
	p, err := s.Store.CreateParty(r.Context(), sessionFrom(r).User.ID, req.Kind, req.Title, req.Data)
	if err != nil {
		s.fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"party": p})
}

func (s *Server) updateParty(w http.ResponseWriter, r *http.Request) {
	id, ok := s.partyID(w, r)
	if !ok {
		return
	}
	req, ok := s.decodeParty(w, r)
	if !ok {
		return
	}
	p, err := s.Store.UpdateParty(r.Context(), sessionFrom(r).User.ID, id, req.Kind, req.Title, req.Data)
	if s.storeErr(w, err, "Карточка не найдена") {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"party": p})
}

func (s *Server) deleteParty(w http.ResponseWriter, r *http.Request) {
	id, ok := s.partyID(w, r)
	if !ok {
		return
	}
	if s.storeErr(w, s.Store.DeleteParty(r.Context(), sessionFrom(r).User.ID, id), "Карточка не найдена") {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listDocuments(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListDocuments(r.Context(), sessionFrom(r).User.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	type item struct {
		ID            string `json:"id"`
		Title         string `json:"title"`
		TemplateSlug  string `json:"templateSlug"`
		TemplateTitle string `json:"templateTitle"`
		Category      string `json:"category"`
		CreatedAt     string `json:"createdAt"`
		UpdatedAt     string `json:"updatedAt"`
	}
	out := make([]item, 0, len(list))
	for _, d := range list {
		it := item{ID: d.ID.String(), Title: d.Title, TemplateSlug: d.TemplateSlug, CreatedAt: d.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"), UpdatedAt: d.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")}
		if t, ok := s.Templates.Get(d.TemplateSlug); ok {
			it.TemplateTitle, it.Category = t.Title, t.Category
		}
		out = append(out, it)
	}
	w.Header().Set("Cache-Control", "no-store")
	httpx.JSON(w, http.StatusOK, map[string]any{"documents": out})
}

func (s *Server) duplicateDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := s.docID(w, r)
	if !ok {
		return
	}
	d, err := s.Store.DuplicateDocument(r.Context(), sessionFrom(r).User.ID, id)
	if s.storeErr(w, err, "Документ не найден") {
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"document": d})
}

func (s *Server) deleteDocument(w http.ResponseWriter, r *http.Request) {
	id, ok := s.docID(w, r)
	if !ok {
		return
	}
	if s.storeErr(w, s.Store.DeleteDocument(r.Context(), sessionFrom(r).User.ID, id), "Документ не найден") {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
