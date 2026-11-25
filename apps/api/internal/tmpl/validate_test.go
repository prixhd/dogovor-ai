package tmpl

import (
	"strings"
	"testing"
)

func validTemplate() *Template {
	return &Template{
		Slug: "t", Version: 1, Title: "T", Category: "labor", Status: "draft", Minutes: 5,
		Roles: []Role{{ID: "a", Label: "A", Kinds: []string{"org"}}},
		Steps: []Step{{ID: "s", Title: "S", Fields: []Field{
			{ID: "a.name", Label: "Name", Type: TypeText, Role: "a", Bind: "name", Required: true},
			{ID: "flag", Label: "Flag", Type: TypeToggle},
			{ID: "months", Label: "Months", Type: TypeNumber, ShowIf: "flag"},
			{ID: "mode", Label: "Mode", Type: TypeSelect, Options: []Option{{Value: "x", Label: "X"}}},
		}}},
		Body: []Block{{ID: "b1", Style: "title", Text: "Hi {{a.name}}"}, {ID: "b2", Style: "clause", Text: "{{months}}", If: "flag"}},
	}
}

func TestValidateOK(t *testing.T) {
	if err := Validate(validTemplate()); err != nil {
		t.Fatal(err)
	}
}

func TestValidateErrors(t *testing.T) {
	cases := map[string]func(*Template){
		"unknown field type":         func(t *Template) { t.Steps[0].Fields[1].Type = "blob" },
		"duplicate field id":         func(t *Template) { t.Steps[0].Fields[1].ID = "a.name" },
		"unknown field in body":      func(t *Template) { t.Body[0].Text = "{{nope}}" },
		"unknown field in condition": func(t *Template) { t.Body[1].If = "ghost" },
		"unknown role":               func(t *Template) { t.Steps[0].Fields[0].Role = "zzz" },
		"select without options":     func(t *Template) { t.Steps[0].Fields[3].Options = nil },
		"invalid status":             func(t *Template) { t.Status = "approved" },
		"reviewed without date":      func(t *Template) { t.Status = "reviewed" },
		"duplicate block id":         func(t *Template) { t.Body[1].ID = "b1" },
		"unknown block style":        func(t *Template) { t.Body[1].Style = "fancy" },
		"unknown filter":             func(t *Template) { t.Body[0].Text = "{{a.name|shout}}" },
		"missing slug":               func(t *Template) { t.Slug = "" },
	}
	for name, mutate := range cases {
		tp := validTemplate()
		mutate(tp)
		if err := Validate(tp); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
}

func TestValidateDataRequiredAndHidden(t *testing.T) {
	tp := validTemplate()
	errs := ValidateData(tp, Data{"flag": false, "months": "abc"})
	if _, ok := errs["a.name"]; !ok {
		t.Error("required field must be reported")
	}
	if _, ok := errs["months"]; ok {
		t.Error("hidden field must not be validated")
	}
	errs = ValidateData(tp, Data{"a.name": "X", "flag": true, "months": "abc"})
	if !strings.Contains(errs["months"], "число") {
		t.Errorf("number validation: %v", errs)
	}
}
