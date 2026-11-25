package ai

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"unicode/utf8"
)

// EditOp is one structured change proposed by the model.
type EditOp struct {
	Op     string `json:"op"` // replace | insert | delete
	ID     string `json:"id,omitempty"`
	After  string `json:"after,omitempty"`
	Text   string `json:"text,omitempty"`
	Reason string `json:"reason,omitempty"`
}

// EditResult is the parsed and validated model answer.
type EditResult struct {
	Summary string   `json:"summary"`
	Ops     []EditOp `json:"ops"`
}

// extractJSON pulls the outermost JSON object out of a model reply
// (models like to wrap JSON in prose or code fences).
func extractJSON(raw string) (string, error) {
	i, j := strings.Index(raw, "{"), strings.LastIndex(raw, "}")
	if i < 0 || j <= i {
		return "", errors.New("no JSON object in model output")
	}
	return raw[i : j+1], nil
}

func newBlockID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return "ai-" + hex.EncodeToString(b)
}

// ParseEdit validates model output against the real block ids: unknown ids,
// unknown operations and oversize texts are dropped, never applied.
func ParseEdit(raw string, ids map[string]bool) (EditResult, error) {
	js, err := extractJSON(raw)
	if err != nil {
		return EditResult{}, err
	}
	var in EditResult
	if err := json.Unmarshal([]byte(js), &in); err != nil {
		return EditResult{}, err
	}
	out := EditResult{Summary: truncate(in.Summary, 600)}
	for _, op := range in.Ops {
		if len(out.Ops) >= 10 {
			break
		}
		op.Text = strings.TrimSpace(op.Text)
		op.Reason = truncate(op.Reason, 300)
		if utf8.RuneCountInString(op.Text) > 2000 {
			continue
		}
		switch op.Op {
		case "replace":
			if !ids[op.ID] || op.Text == "" {
				continue
			}
			op.After = ""
		case "delete":
			if !ids[op.ID] {
				continue
			}
			op.Text, op.After = "", ""
		case "insert":
			if !ids[op.After] || op.Text == "" {
				continue
			}
			op.ID = newBlockID()
		default:
			continue
		}
		out.Ops = append(out.Ops, op)
	}
	return out, nil
}

// ParseExtract parses {"fields": {...}} keeping only allowed keys.
func ParseExtract(raw string, allowed map[string]bool) (map[string]string, error) {
	js, err := extractJSON(raw)
	if err != nil {
		return nil, err
	}
	var in struct {
		Fields map[string]any `json:"fields"`
	}
	if err := json.Unmarshal([]byte(js), &in); err != nil {
		return nil, err
	}
	out := map[string]string{}
	for k, v := range in.Fields {
		s, ok := v.(string)
		if !ok || !allowed[k] {
			continue
		}
		if s = strings.TrimSpace(s); s != "" && utf8.RuneCountInString(s) <= 300 {
			out[k] = s
		}
	}
	return out, nil
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}
