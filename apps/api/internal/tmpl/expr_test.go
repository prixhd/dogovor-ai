package tmpl

import "testing"

func TestEvalCond(t *testing.T) {
	d := Data{"probation": true, "kind": "remote", "empty": "", "n": 3.0, "off": false}
	cases := map[string]bool{
		"":                            true,
		"probation":                   true,
		"!probation":                  false,
		"off":                         false,
		"!off":                        true,
		"missing":                     false,
		"empty":                       false,
		"kind == remote":              true,
		"kind != remote":              false,
		"kind == 'office'":            false,
		"n == 3":                      true,
		"probation && kind == remote": true,
		"off || kind == remote":       true,
		"off && probation":            false,
	}
	for expr, want := range cases {
		if got := evalCond(expr, d); got != want {
			t.Errorf("evalCond(%q) = %v, want %v", expr, got, want)
		}
	}
}
