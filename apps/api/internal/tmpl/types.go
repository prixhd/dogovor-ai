// Package tmpl implements the document template format: loading, validation,
// rendering to structured blocks / plain text, and DOCX/PDF export.
//
// Templates never execute code: the body is a list of blocks with
// {{placeholders}}, filters and simple conditions only.
package tmpl

// Template is a parsed document template.
type Template struct {
	Slug        string   `yaml:"slug" json:"slug"`
	Version     int      `yaml:"version" json:"version"`
	Title       string   `yaml:"title" json:"title"`
	Category    string   `yaml:"category" json:"category"`
	Description string   `yaml:"description" json:"description"`
	Status      string   `yaml:"status" json:"status"` // draft | reviewed
	ReviewedAt  string   `yaml:"reviewed_at,omitempty" json:"reviewedAt,omitempty"`
	Minutes     int      `yaml:"minutes" json:"minutes"`
	Order       int      `yaml:"order" json:"-"`
	Keywords    []string `yaml:"keywords" json:"keywords,omitempty"`
	Roles       []Role   `yaml:"roles" json:"roles"`
	Steps       []Step   `yaml:"steps" json:"steps"`
	Body        []Block  `yaml:"body" json:"-"`
}

// Role is a contract party that can be filled from a party card.
type Role struct {
	ID    string   `yaml:"id" json:"id"`
	Label string   `yaml:"label" json:"label"`
	Kinds []string `yaml:"kinds" json:"kinds"` // person | ip | org
}

// Step groups questionnaire fields.
type Step struct {
	ID     string  `yaml:"id" json:"id"`
	Title  string  `yaml:"title" json:"title"`
	Hint   string  `yaml:"hint,omitempty" json:"hint,omitempty"`
	Role   string  `yaml:"role,omitempty" json:"role,omitempty"`
	Fields []Field `yaml:"fields" json:"fields"`
}

// Field is a single questionnaire input.
type Field struct {
	ID          string   `yaml:"id" json:"id"`
	Label       string   `yaml:"label" json:"label"`
	Type        string   `yaml:"type" json:"type"`
	Required    bool     `yaml:"required,omitempty" json:"required,omitempty"`
	Placeholder string   `yaml:"placeholder,omitempty" json:"placeholder,omitempty"`
	Hint        string   `yaml:"hint,omitempty" json:"hint,omitempty"`
	ShowIf      string   `yaml:"show_if,omitempty" json:"showIf,omitempty"`
	Role        string   `yaml:"role,omitempty" json:"role,omitempty"`
	Bind        string   `yaml:"bind,omitempty" json:"bind,omitempty"` // party card key
	Options     []Option `yaml:"options,omitempty" json:"options,omitempty"`
	Min         *float64 `yaml:"min,omitempty" json:"min,omitempty"`
	Max         *float64 `yaml:"max,omitempty" json:"max,omitempty"`
	Default     any      `yaml:"default,omitempty" json:"default,omitempty"`
	Sensitive   bool     `yaml:"sensitive,omitempty" json:"sensitive,omitempty"` // never sent to AI
}

// Option is a choice for select fields.
type Option struct {
	Value string `yaml:"value" json:"value"`
	Label string `yaml:"label" json:"label"`
}

// Block is a body paragraph.
type Block struct {
	ID    string   `yaml:"id" json:"id"`
	Style string   `yaml:"style" json:"style"` // title | subtitle | heading | clause | para | right | cols
	Text  string   `yaml:"text,omitempty" json:"text,omitempty"`
	Cols  []string `yaml:"cols,omitempty" json:"cols,omitempty"`
	If    string   `yaml:"if,omitempty" json:"if,omitempty"`
}

// Field types.
const (
	TypeText     = "text"
	TypeTextarea = "textarea"
	TypeNumber   = "number"
	TypeMoney    = "money"
	TypeDate     = "date"
	TypeSelect   = "select"
	TypeToggle   = "toggle"
	TypeINN      = "inn"
	TypeOGRN     = "ogrn"
	TypeBIK      = "bik"
	TypeAccount  = "account"
	TypePhone    = "phone"
	TypeEmail    = "email"
)

var fieldTypes = map[string]bool{
	TypeText: true, TypeTextarea: true, TypeNumber: true, TypeMoney: true, TypeDate: true,
	TypeSelect: true, TypeToggle: true, TypeINN: true, TypeOGRN: true, TypeBIK: true,
	TypeAccount: true, TypePhone: true, TypeEmail: true,
}

var blockStyles = map[string]bool{
	"title": true, "subtitle": true, "heading": true, "clause": true, "para": true, "right": true, "cols": true,
}

// Data is questionnaire input keyed by field id.
type Data map[string]any

// Fields returns all fields of the template in order.
func (t *Template) Fields() []Field {
	var out []Field
	for _, s := range t.Steps {
		out = append(out, s.Fields...)
	}
	return out
}

// Field finds a field by id.
func (t *Template) Field(id string) (Field, bool) {
	for _, s := range t.Steps {
		for _, f := range s.Fields {
			if f.ID == id {
				return f, true
			}
		}
	}
	return Field{}, false
}
