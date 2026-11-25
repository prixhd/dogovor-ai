package tmpl

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"gopkg.in/yaml.v3"
)

// Registry holds loaded templates (immutable after load, safe for concurrent reads).
type Registry struct {
	bySlug map[string]*Template
	list   []*Template
}

// Parse decodes and validates a single YAML template.
func Parse(raw []byte) (*Template, error) {
	dec := yaml.NewDecoder(bytes.NewReader(raw))
	dec.KnownFields(true)
	var t Template
	if err := dec.Decode(&t); err != nil {
		return nil, err
	}
	if err := Validate(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

// LoadDir loads every *.yaml template in dir.
func LoadDir(dir string) (*Registry, error) {
	paths, err := filepath.Glob(filepath.Join(dir, "*.yaml"))
	if err != nil {
		return nil, err
	}
	r := &Registry{bySlug: map[string]*Template{}}
	for _, p := range paths {
		raw, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		t, err := Parse(raw)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(p), err)
		}
		if _, dup := r.bySlug[t.Slug]; dup {
			return nil, fmt.Errorf("duplicate slug %q", t.Slug)
		}
		r.bySlug[t.Slug] = t
		r.list = append(r.list, t)
	}
	sort.SliceStable(r.list, func(i, j int) bool { return r.list[i].Order < r.list[j].Order })
	return r, nil
}

// Get returns a template by slug.
func (r *Registry) Get(slug string) (*Template, bool) {
	t, ok := r.bySlug[slug]
	return t, ok
}

// List returns templates in catalog order.
func (r *Registry) List() []*Template { return r.list }
