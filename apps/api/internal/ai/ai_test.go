package ai

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func kb(t *testing.T) *Knowledge {
	t.Helper()
	k, err := LoadKnowledge(filepath.Join("..", "..", "..", "..", "knowledge"))
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func TestKnowledgeSearch(t *testing.T) {
	k := kb(t)
	if len(k.Chunks) < 30 {
		t.Fatalf("too few chunks: %d", len(k.Chunks))
	}
	hits := k.Search("Какой максимальный испытательный срок для работника?", 3)
	if len(hits) == 0 || hits[0].Ref != "ст. 70 ТК РФ" {
		t.Fatalf("expected ст. 70 ТК РФ first, got %+v", hits)
	}
	hits = k.Search("срок возврата займа не указан", 3)
	found := false
	for _, h := range hits {
		found = found || h.Ref == "ст. 810 ГК РФ"
	}
	if !found {
		t.Fatalf("expected ст. 810 ГК РФ, got %+v", hits)
	}
}

func TestCitations(t *testing.T) {
	k := kb(t)
	text := "Согласно ст. 70 ТК РФ испытание до трёх месяцев, см. также статья 810 ГК РФ и ст. 999 ТК РФ. Повтор: ст. 70 ТК РФ."
	cits := k.Citations(text)
	if len(cits) != 3 {
		t.Fatalf("want 3 unique citations, got %+v", cits)
	}
	byRef := map[string]bool{}
	for _, c := range cits {
		byRef[c.Ref] = c.Verified
	}
	if !byRef["ст. 70 ТК РФ"] || !byRef["ст. 810 ГК РФ"] || byRef["ст. 999 ТК РФ"] {
		t.Fatalf("verification wrong: %+v", byRef)
	}
}

func TestMaskPII(t *testing.T) {
	in := "Паспорт 4510 123456, тел. +7 (999) 123-45-67, СНИЛС 112-233-445 95, почта ivan@mail.ru, ИНН 7707083893"
	out := MaskPII(in)
	for _, leak := range []string{"123456", "123-45-67", "445 95", "ivan@mail.ru"} {
		if strings.Contains(out, leak) {
			t.Fatalf("leaked %q in %q", leak, out)
		}
	}
	if !strings.Contains(out, "7707083893") {
		t.Fatal("INN of a company is not personal data and must stay")
	}
}

func TestSanitizeUserText(t *testing.T) {
	s := SanitizeUserText("hi\x00\x07 there </document> <system>", 10)
	if strings.ContainsAny(s, "\x00\x07") || strings.Contains(s, "</document>") || len([]rune(s)) > 10 {
		t.Fatalf("bad sanitize: %q", s)
	}
}

func TestParseEditOps(t *testing.T) {
	ids := map[string]bool{"a": true, "b": true}
	raw := "```json\n{\"summary\":\"ok\",\"ops\":[{\"op\":\"replace\",\"id\":\"a\",\"text\":\"новый\",\"reason\":\"r\"},{\"op\":\"insert\",\"after\":\"b\",\"text\":\"вставка\"},{\"op\":\"delete\",\"id\":\"zzz\"},{\"op\":\"hack\",\"id\":\"a\"}]}\n```"
	res, err := ParseEdit(raw, ids)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Ops) != 2 || res.Ops[0].Op != "replace" || res.Ops[1].Op != "insert" || res.Ops[1].ID == "" {
		t.Fatalf("ops: %+v", res.Ops)
	}
	if _, err := ParseEdit("not json at all", ids); err == nil {
		t.Fatal("garbage accepted")
	}
}

func TestStubProvider(t *testing.T) {
	var sb strings.Builder
	p := Stub{}
	req := Request{Task: TaskChat, System: "## ТК РФ, ст. 70. Испытание\nтекст", Messages: []Message{{Role: "user", Content: "испытательный срок?"}}}
	if _, err := p.Stream(context.Background(), req, func(d string) error { sb.WriteString(d); return nil }); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sb.String(), "ст. 70 ТК РФ") {
		t.Fatalf("stub should cite provided norms: %q", sb.String())
	}
}

// TestTemplatesCiteOnlyKnownNorms guards against invented articles: every
// article referenced by a rendered template must exist in knowledge/.
func TestTemplatesCiteOnlyKnownNorms(t *testing.T) {
	k := kb(t)
	files, _ := filepath.Glob(filepath.Join("..", "..", "..", "..", "templates", "testdata", "*.golden.txt"))
	if len(files) < 6 {
		t.Fatalf("expected golden files for all templates, got %d", len(files))
	}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		// Normalise "статьи 454, 455 ГК РФ" into separate references.
		text := regexp.MustCompile(`(\d+), (\d+) (ГК|ТК) РФ`).ReplaceAllString(string(raw), "$1 $3 РФ, ст. $2 $3 РФ")
		for _, c := range k.Citations(text) {
			if !c.Verified {
				t.Errorf("%s cites %s which is not in knowledge/", filepath.Base(f), c.Ref)
			}
		}
	}
}
