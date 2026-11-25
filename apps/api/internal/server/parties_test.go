package server

import (
	"strings"
	"testing"
)

func TestPartiesCRUDAndValidation(t *testing.T) {
	ts, _ := newTestServer(t)
	alice, bob := newClient(t, ts), newClient(t, ts)
	alice.register()
	bob.register()

	bad := alice.do("POST", "/parties", map[string]any{"kind": "org", "data": map[string]string{"name": "ООО Х", "inn": "7707083890", "bik": "123"}})
	if bad.Code != 422 || !strings.Contains(bad.Body, "inn") || !strings.Contains(bad.Body, "bik") {
		t.Fatalf("validation: %d %s", bad.Code, bad.Body)
	}
	if r := alice.do("POST", "/parties", map[string]any{"kind": "org", "data": map[string]string{"name": "ООО Х", "inn": "500100732259"}}); r.Code != 422 {
		t.Fatalf("12-digit INN for org accepted: %d", r.Code)
	}
	r := alice.do("POST", "/parties", map[string]any{"kind": "org", "data": map[string]string{"name": "ООО «Ромашка»", "inn": "7707083893", "ogrn": "1027700132195", "secret": "dropped"}})
	if r.Code != 201 || strings.Contains(r.Body, "dropped") {
		t.Fatalf("create: %d %s", r.Code, r.Body)
	}
	var created struct{ Party struct{ ID, Title string } }
	r.JSON(t, &created)
	if created.Party.Title != "ООО «Ромашка»" {
		t.Fatalf("title fallback: %q", created.Party.Title)
	}
	id := created.Party.ID
	if r := bob.do("PUT", "/parties/"+id, map[string]any{"kind": "org", "data": map[string]string{"name": "взлом"}}); r.Code != 404 {
		t.Fatalf("bob update: %d", r.Code)
	}
	if r := bob.do("DELETE", "/parties/"+id, nil); r.Code != 404 {
		t.Fatalf("bob delete: %d", r.Code)
	}
	if r := bob.do("GET", "/parties", nil); strings.Contains(r.Body, id) {
		t.Fatal("bob lists alice's card")
	}
	if r := alice.do("DELETE", "/parties/"+id, nil); r.Code != 204 {
		t.Fatalf("delete: %d", r.Code)
	}
}

func TestDocumentListDuplicateDelete(t *testing.T) {
	ts, _ := newTestServer(t)
	c, other := newClient(t, ts), newClient(t, ts)
	c.register()
	other.register()
	r := c.do("POST", "/documents", map[string]any{"templateSlug": "trudovoy-dogovor", "title": "Д1"})
	var created struct{ Document struct{ ID string } }
	r.JSON(t, &created)
	id := created.Document.ID
	if r := other.do("POST", "/documents/"+id+"/duplicate", nil); r.Code != 404 {
		t.Fatalf("other duplicate: %d", r.Code)
	}
	if r := other.do("DELETE", "/documents/"+id, nil); r.Code != 404 {
		t.Fatalf("other delete: %d", r.Code)
	}
	if r := c.do("POST", "/documents/"+id+"/duplicate", nil); r.Code != 201 {
		t.Fatalf("duplicate: %d", r.Code)
	}
	var list struct {
		Documents []struct{ Title, TemplateTitle string }
	}
	c.do("GET", "/documents", nil).JSON(t, &list)
	if len(list.Documents) != 2 || list.Documents[0].TemplateTitle != "Трудовой договор" {
		t.Fatalf("list: %+v", list)
	}
	if r := c.do("DELETE", "/documents/"+id, nil); r.Code != 204 {
		t.Fatalf("delete: %d", r.Code)
	}
}
