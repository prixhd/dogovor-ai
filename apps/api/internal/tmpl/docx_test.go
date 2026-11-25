package tmpl

import (
	"archive/zip"
	"bytes"
	"io"
	"strings"
	"testing"
)

func TestDOCX(t *testing.T) {
	tp := validTemplate()
	tp.Body = append(tp.Body, Block{ID: "sig", Style: "cols", Cols: []string{"Работодатель\n{{a.name}}", "Работник"}})
	doc := Render(tp, Data{"a.name": "ООО «Р&Ко» <x>", "flag": true, "months": 1}, Edits{})
	var buf bytes.Buffer
	if err := WriteDOCX(&buf, doc); err != nil {
		t.Fatal(err)
	}
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	files := map[string]string{}
	for _, f := range zr.File {
		rc, _ := f.Open()
		b, _ := io.ReadAll(rc)
		_ = rc.Close()
		files[f.Name] = string(b)
	}
	for _, name := range []string{"[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml"} {
		if _, ok := files[name]; !ok {
			t.Fatalf("missing %s", name)
		}
	}
	body := files["word/document.xml"]
	if !strings.Contains(body, "ООО «Р&amp;Ко» &lt;x&gt;") {
		t.Fatal("user data must be XML-escaped")
	}
	if !strings.Contains(body, "<w:tbl>") {
		t.Fatal("cols block should render as a table")
	}
	// Deterministic output: same input, same bytes.
	var buf2 bytes.Buffer
	_ = WriteDOCX(&buf2, doc)
	if !bytes.Equal(buf.Bytes(), buf2.Bytes()) {
		t.Fatal("DOCX output is not deterministic")
	}
}
