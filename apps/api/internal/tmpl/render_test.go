package tmpl

import (
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var update = flag.Bool("update", false, "update golden files")

// templatesDir points at the repository templates directory.
func templatesDir() string {
	if d := os.Getenv("TEMPLATES_DIR"); d != "" {
		return d
	}
	return filepath.Join("..", "..", "..", "..", "templates")
}

func TestRenderInlineAndConditions(t *testing.T) {
	tp := validTemplate()
	doc := Render(tp, Data{"a.name": "ООО <Ромашка>", "flag": true, "months": 3}, Edits{})
	if got := doc.Blocks[0].Plain(); got != "Hi ООО <Ромашка>" {
		t.Fatalf("block 0: %q", got)
	}
	if len(doc.Blocks) != 2 || doc.Blocks[1].Plain() != "1. 3" {
		t.Fatalf("conditional clause: %+v", doc.Blocks)
	}
	doc = Render(tp, Data{"flag": false}, Edits{})
	if len(doc.Blocks) != 1 {
		t.Fatal("hidden block rendered")
	}
	if !doc.Blocks[0].Segments[1].Missing {
		t.Fatal("empty field should be marked missing")
	}
}

func TestRenderNoDoubleDot(t *testing.T) {
	tp := validTemplate()
	tp.Steps[0].Fields = append(tp.Steps[0].Fields, Field{ID: "d", Label: "D", Type: TypeDate})
	tp.Body[0].Text = "С {{d}}."
	if got := Render(tp, Data{"d": "2026-12-01"}, Edits{}).Blocks[0].Plain(); got != "С «01» декабря 2026 г." {
		t.Fatalf("got %q", got)
	}
}

func TestRenderEdits(t *testing.T) {
	tp := validTemplate()
	edits := Edits{
		Replaced: map[string]string{"b1": "Новый заголовок"},
		Inserted: []InsertedBlock{{ID: "ai-1", After: "b1", Style: "clause", Text: "Вставленный пункт"}},
	}
	doc := Render(tp, Data{"flag": true, "months": 2}, edits)
	var lines []string
	for _, b := range doc.Blocks {
		lines = append(lines, b.Plain())
	}
	want := "Новый заголовок|1. Вставленный пункт|2. 2"
	if got := strings.Join(lines, "|"); got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	doc = Render(tp, Data{"flag": true}, Edits{Deleted: []string{"b2"}})
	if len(doc.Blocks) != 1 {
		t.Fatal("deleted block rendered")
	}
}

// TestGolden renders every template with its fixture and compares with the
// golden text file. Run `go test ./internal/tmpl -update` to refresh.
func TestGolden(t *testing.T) {
	dir := templatesDir()
	reg, err := LoadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(reg.List()) == 0 {
		t.Fatal("no templates loaded")
	}
	for _, tp := range reg.List() {
		t.Run(tp.Slug, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(dir, "testdata", tp.Slug+".json"))
			if err != nil {
				t.Fatalf("fixture: %v", err)
			}
			var data Data
			if err := json.Unmarshal(raw, &data); err != nil {
				t.Fatal(err)
			}
			if errs := ValidateData(tp, data); len(errs) > 0 {
				t.Fatalf("fixture invalid: %v", errs)
			}
			got := Render(tp, data, Edits{}).Text()
			golden := filepath.Join(dir, "testdata", tp.Slug+".golden.txt")
			if *update {
				if err := os.WriteFile(golden, []byte(got), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			want, err := os.ReadFile(golden)
			if err != nil {
				t.Fatalf("golden: %v (run with -update)", err)
			}
			if got != string(want) {
				t.Fatalf("render differs from golden %s\n--- got ---\n%s", golden, got)
			}
			if strings.Contains(got, "{{") {
				t.Fatal("unrendered placeholder")
			}
		})
	}
}
