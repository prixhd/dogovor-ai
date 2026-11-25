package tmpl

import (
	"fmt"
	"strings"
)

// Edits are user-accepted modifications on top of the rendered template
// (produced by AI suggestions). Text in edits is plain, without placeholders.
type Edits struct {
	Replaced map[string]string `json:"replaced,omitempty"`
	Deleted  []string          `json:"deleted,omitempty"`
	Inserted []InsertedBlock   `json:"inserted,omitempty"`
}

// InsertedBlock is a new paragraph placed after an existing block.
type InsertedBlock struct {
	ID    string `json:"id"`
	After string `json:"after"`
	Style string `json:"style"`
	Text  string `json:"text"`
}

// Segment is a run of text; Field marks text substituted from user data.
type Segment struct {
	Text    string `json:"t"`
	Field   string `json:"f,omitempty"`
	Missing bool   `json:"m,omitempty"`
}

// RenderedBlock is a paragraph ready for preview or export.
type RenderedBlock struct {
	ID       string      `json:"id"`
	Style    string      `json:"style"`
	Num      string      `json:"num,omitempty"`
	Segments []Segment   `json:"segments,omitempty"`
	Cols     [][]Segment `json:"cols,omitempty"`
	Edited   bool        `json:"edited,omitempty"`
	Inserted bool        `json:"inserted,omitempty"`
}

// Document is a fully rendered template.
type Document struct {
	Title  string          `json:"title"`
	Blocks []RenderedBlock `json:"blocks"`
}

const blank = "____________"

func segText(segs []Segment) string {
	var b strings.Builder
	for _, s := range segs {
		b.WriteString(s.Text)
	}
	return b.String()
}

// Plain returns the block as plain text including its number.
func (b RenderedBlock) Plain() string {
	if b.Style == "cols" {
		parts := make([]string, len(b.Cols))
		for i, c := range b.Cols {
			parts[i] = segText(c)
		}
		return strings.Join(parts, "\n\n")
	}
	if b.Num != "" {
		return b.Num + " " + segText(b.Segments)
	}
	return segText(b.Segments)
}

// Text renders the whole document as plain text (used for golden tests and AI).
func (d Document) Text() string {
	parts := make([]string, len(d.Blocks))
	for i, b := range d.Blocks {
		parts[i] = b.Plain()
	}
	return strings.Join(parts, "\n\n") + "\n"
}

// Render produces a document from template, data and accepted edits.
func Render(t *Template, in Data, e Edits) Document {
	d := withDefaults(t, in)
	deleted := map[string]bool{}
	for _, id := range e.Deleted {
		deleted[id] = true
	}
	inserts := map[string][]InsertedBlock{}
	for _, ib := range e.Inserted {
		inserts[ib.After] = append(inserts[ib.After], ib)
	}

	doc := Document{Title: t.Title}
	var section, clause int
	emit := func(b RenderedBlock) {
		switch b.Style {
		case "heading":
			section++
			clause = 0
			b.Num = fmt.Sprintf("%d.", section)
		case "clause":
			clause++
			if section > 0 {
				b.Num = fmt.Sprintf("%d.%d.", section, clause)
			} else {
				b.Num = fmt.Sprintf("%d.", clause)
			}
		}
		doc.Blocks = append(doc.Blocks, b)
	}
	var emitInserts func(after string)
	emitInserts = func(after string) {
		for _, ib := range inserts[after] {
			if deleted[ib.ID] {
				continue
			}
			text := ib.Text
			if r, ok := e.Replaced[ib.ID]; ok {
				text = r
			}
			style := ib.Style
			if !blockStyles[style] || style == "cols" {
				style = "clause"
			}
			emit(RenderedBlock{ID: ib.ID, Style: style, Segments: []Segment{{Text: text}}, Inserted: true})
			emitInserts(ib.ID)
		}
	}

	for _, b := range t.Body {
		if evalCond(b.If, d) && !deleted[b.ID] {
			rb := RenderedBlock{ID: b.ID, Style: b.Style}
			if r, ok := e.Replaced[b.ID]; ok && b.Style != "cols" {
				rb.Segments = []Segment{{Text: r}}
				rb.Edited = true
			} else if b.Style == "cols" {
				for _, c := range b.Cols {
					rb.Cols = append(rb.Cols, expand(t, c, d))
				}
			} else {
				rb.Segments = expand(t, b.Text, d)
			}
			emit(rb)
		}
		emitInserts(b.ID)
	}
	return doc
}

// expand resolves inline conditions and placeholders into segments.
func expand(t *Template, text string, d Data) []Segment {
	text = inlineIfRe.ReplaceAllStringFunc(text, func(m string) string {
		sm := inlineIfRe.FindStringSubmatch(m)
		if evalCond(sm[1], d) {
			return sm[2]
		}
		return sm[3]
	})
	var segs []Segment
	last := 0
	for _, loc := range placeholderRe.FindAllStringSubmatchIndex(text, -1) {
		if loc[0] > last {
			segs = append(segs, Segment{Text: text[last:loc[0]]})
		}
		id := text[loc[2]:loc[3]]
		filter := ""
		if loc[4] >= 0 {
			filter = text[loc[4]:loc[5]]
		}
		val, ok := formatValue(t, id, filter, d[id])
		if !ok {
			segs = append(segs, Segment{Text: blank, Field: id, Missing: true})
		} else {
			segs = append(segs, Segment{Text: val, Field: id})
		}
		last = loc[1]
	}
	if last < len(text) {
		segs = append(segs, Segment{Text: text[last:]})
	}
	// Avoid "г.." when a sentence ends right after a value ending with a dot.
	for i := 0; i+1 < len(segs); i++ {
		if segs[i].Field != "" && strings.HasSuffix(segs[i].Text, ".") && segs[i+1].Field == "" && strings.HasPrefix(segs[i+1].Text, ".") {
			segs[i+1].Text = segs[i+1].Text[1:]
		}
	}
	return mergeSegments(segs)
}

func mergeSegments(in []Segment) []Segment {
	var out []Segment
	for _, s := range in {
		if s.Text == "" {
			continue
		}
		if n := len(out); n > 0 && out[n-1].Field == "" && s.Field == "" {
			out[n-1].Text += s.Text
			continue
		}
		out = append(out, s)
	}
	return out
}

func formatValue(t *Template, id, filter string, v any) (string, bool) {
	s := valueString(v)
	if s == "" {
		return "", false
	}
	f, _ := t.Field(id)
	if f.Type == TypeSelect {
		for _, o := range f.Options {
			if o.Value == s {
				s = o.Label
			}
		}
	}
	if f.Type == TypeToggle {
		if truthy(v) {
			s = "да"
		} else {
			s = "нет"
		}
	}
	if filter == "" {
		switch f.Type {
		case TypeDate:
			filter = "date"
		case TypeMoney:
			filter = "money"
		}
	}
	switch filter {
	case "date":
		s = formatDate(s)
	case "money":
		s = formatMoney(s)
	case "num":
		s = formatNumber(s)
	case "upper":
		s = strings.ToUpper(s)
	case "lower":
		s = strings.ToLower(s)
	}
	return s, true
}
