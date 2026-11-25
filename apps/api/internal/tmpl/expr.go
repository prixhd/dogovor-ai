package tmpl

import (
	"fmt"
	"regexp"
	"strings"
)

// Conditions are deliberately tiny: `field`, `!field`, `field == value`,
// `field != value`, joined by `&&` or `||` (no parentheses, && binds first).

var condTermRe = regexp.MustCompile(`^(!?)\s*([A-Za-z0-9_.]+)\s*(?:(==|!=)\s*'?([^']*?)'?)?$`)

// evalCond evaluates a condition against data. Empty condition is true.
func evalCond(expr string, d Data) bool {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return true
	}
	for _, or := range strings.Split(expr, "||") {
		all := true
		for _, term := range strings.Split(or, "&&") {
			if !evalTerm(strings.TrimSpace(term), d) {
				all = false
				break
			}
		}
		if all {
			return true
		}
	}
	return false
}

func evalTerm(term string, d Data) bool {
	m := condTermRe.FindStringSubmatch(term)
	if m == nil {
		return false
	}
	neg, field, op, val := m[1] == "!", m[2], m[3], strings.TrimSpace(m[4])
	v := d[field]
	if op == "" {
		return truthy(v) != neg
	}
	eq := valueString(v) == val
	if op == "==" {
		return eq
	}
	return !eq
}

// condFields lists the field ids referenced by a condition.
func condFields(expr string) ([]string, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return nil, nil
	}
	var out []string
	for _, or := range strings.Split(expr, "||") {
		for _, term := range strings.Split(or, "&&") {
			m := condTermRe.FindStringSubmatch(strings.TrimSpace(term))
			if m == nil {
				return nil, fmt.Errorf("bad condition term %q", term)
			}
			out = append(out, m[2])
		}
	}
	return out, nil
}

func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return strings.TrimSpace(x) != "" && x != "false"
	case float64:
		return x != 0
	case int:
		return x != 0
	}
	return true
}

func valueString(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(x)
	case float64:
		if x == float64(int64(x)) {
			return fmt.Sprintf("%d", int64(x))
		}
		return fmt.Sprintf("%v", x)
	case bool:
		if x {
			return "true"
		}
		return "false"
	}
	return fmt.Sprint(v)
}
