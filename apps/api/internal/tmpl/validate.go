package tmpl

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/dogovor-ai/api/internal/validate"
)

var (
	placeholderRe = regexp.MustCompile(`\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|\s*([a-z]+))?\s*\}\}`)
	inlineIfRe    = regexp.MustCompile(`(?s)\{\{#if\s+([^}]+?)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{/if\}\}`)
	slugRe        = regexp.MustCompile(`^[a-z0-9-]+$`)
	filters       = map[string]bool{"date": true, "money": true, "upper": true, "lower": true, "num": true}
)

// Validate checks template structure and cross references.
func Validate(t *Template) error {
	var errs []error
	add := func(format string, a ...any) { errs = append(errs, fmt.Errorf(format, a...)) }

	if !slugRe.MatchString(t.Slug) {
		add("slug %q: lowercase latin, digits and dashes only", t.Slug)
	}
	if t.Version < 1 {
		add("version must be >= 1")
	}
	if t.Title == "" || t.Category == "" {
		add("title and category are required")
	}
	switch t.Status {
	case "draft":
	case "reviewed":
		if _, err := time.Parse("2006-01-02", t.ReviewedAt); err != nil {
			add("reviewed template needs reviewed_at date")
		}
	default:
		add("status %q: must be draft or reviewed", t.Status)
	}

	roles := map[string]bool{}
	for _, r := range t.Roles {
		if roles[r.ID] {
			add("duplicate role %q", r.ID)
		}
		roles[r.ID] = true
	}

	fields := map[string]Field{}
	for _, s := range t.Steps {
		if s.Role != "" && !roles[s.Role] {
			add("step %q: unknown role %q", s.ID, s.Role)
		}
		for _, f := range s.Fields {
			if _, dup := fields[f.ID]; dup {
				add("duplicate field id %q", f.ID)
			}
			fields[f.ID] = f
			if !fieldTypes[f.Type] {
				add("field %q: unknown type %q", f.ID, f.Type)
			}
			if f.Label == "" {
				add("field %q: label required", f.ID)
			}
			if f.Role != "" && !roles[f.Role] {
				add("field %q: unknown role %q", f.ID, f.Role)
			}
			if f.Type == TypeSelect && len(f.Options) == 0 {
				add("field %q: select needs options", f.ID)
			}
		}
	}
	checkCond := func(where, expr string) {
		ids, err := condFields(expr)
		if err != nil {
			add("%s: %v", where, err)
		}
		for _, id := range ids {
			if _, ok := fields[id]; !ok {
				add("%s: unknown field %q in condition", where, id)
			}
		}
	}
	for id, f := range fields {
		checkCond("field "+id, f.ShowIf)
	}

	blocks := map[string]bool{}
	for _, b := range t.Body {
		if b.ID == "" || blocks[b.ID] {
			add("block id %q empty or duplicate", b.ID)
		}
		blocks[b.ID] = true
		if !blockStyles[b.Style] {
			add("block %q: unknown style %q", b.ID, b.Style)
		}
		checkCond("block "+b.ID, b.If)
		texts := append([]string{b.Text}, b.Cols...)
		for _, txt := range texts {
			for _, m := range inlineIfRe.FindAllStringSubmatch(txt, -1) {
				checkCond("block "+b.ID+" inline if", m[1])
			}
			for _, m := range placeholderRe.FindAllStringSubmatch(txt, -1) {
				if _, ok := fields[m[1]]; !ok {
					add("block %q: unknown field %q", b.ID, m[1])
				}
				if m[2] != "" && !filters[m[2]] {
					add("block %q: unknown filter %q", b.ID, m[2])
				}
			}
			if strings.Contains(placeholderRe.ReplaceAllString(inlineIfRe.ReplaceAllString(txt, ""), ""), "{{") {
				add("block %q: malformed placeholder", b.ID)
			}
		}
	}
	return errors.Join(errs...)
}

// withDefaults returns data with field defaults filled for absent keys.
func withDefaults(t *Template, d Data) Data {
	out := make(Data, len(d))
	for k, v := range d {
		out[k] = v
	}
	for _, f := range t.Fields() {
		if _, ok := out[f.ID]; !ok && f.Default != nil {
			out[f.ID] = f.Default
		}
	}
	return out
}

// Visible reports whether a field is shown for the given data.
func Visible(f Field, d Data) bool { return evalCond(f.ShowIf, d) }

// ValidateData checks user input; returns field id -> message (Russian).
// Hidden fields are skipped, unknown keys are ignored by the caller.
func ValidateData(t *Template, in Data) map[string]string {
	d := withDefaults(t, in)
	errs := map[string]string{}
	for _, f := range t.Fields() {
		if !Visible(f, d) {
			continue
		}
		v := d[f.ID]
		s := valueString(v)
		if s == "" || (f.Type == TypeToggle && !truthy(v)) {
			if f.Required && f.Type != TypeToggle {
				errs[f.ID] = "Обязательное поле"
			}
			continue
		}
		if len(s) > 5000 {
			errs[f.ID] = "Слишком длинное значение"
			continue
		}
		var err error
		switch f.Type {
		case TypeNumber, TypeMoney:
			n, ok := parseNumber(s)
			switch {
			case !ok:
				err = errors.New("введите число")
			case f.Min != nil && n < *f.Min:
				err = fmt.Errorf("не меньше %v", *f.Min)
			case f.Max != nil && n > *f.Max:
				err = fmt.Errorf("не больше %v", *f.Max)
			case n < 0:
				err = errors.New("не может быть отрицательным")
			}
		case TypeDate:
			if _, e := time.Parse("2006-01-02", s); e != nil {
				err = errors.New("неверная дата")
			}
		case TypeSelect:
			ok := false
			for _, o := range f.Options {
				ok = ok || o.Value == s
			}
			if !ok {
				err = errors.New("выберите вариант из списка")
			}
		case TypeINN:
			err = validate.INN(s)
		case TypeOGRN:
			err = validate.OGRN(s)
		case TypeBIK:
			err = validate.BIK(s)
		case TypeAccount:
			if len(strings.TrimSpace(s)) != 20 {
				err = errors.New("счёт содержит 20 цифр")
			}
		case TypeEmail:
			err = validate.Email(s)
		case TypePhone:
			err = validate.Phone(s)
		}
		if err != nil {
			r := []rune(err.Error())
			errs[f.ID] = strings.ToUpper(string(r[0])) + string(r[1:])
		}
	}
	return errs
}
