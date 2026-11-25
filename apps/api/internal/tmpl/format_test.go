package tmpl

import "testing"

func TestFormatDate(t *testing.T) {
	cases := map[string]string{
		"2026-11-25": "«25» ноября 2026 г.",
		"2026-01-01": "«01» января 2026 г.",
		"bad":        "bad",
	}
	for in, want := range cases {
		if got := formatDate(in); got != want {
			t.Errorf("formatDate(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestFormatMoney(t *testing.T) {
	cases := map[string]string{
		"50000":     "50 000 (пятьдесят тысяч) рублей",
		"1":         "1 (один) рубль",
		"2":         "2 (два) рубля",
		"21000":     "21 000 (двадцать одна тысяча) рублей",
		"1250000":   "1 250 000 (один миллион двести пятьдесят тысяч) рублей",
		"112":       "112 (сто двенадцать) рублей",
		"3500.50":   "3 500 (три тысячи пятьсот) рублей 50 копеек",
		"0":         "0 (ноль) рублей",
		"not money": "not money",
	}
	for in, want := range cases {
		if got := formatMoney(in); got != want {
			t.Errorf("formatMoney(%q) = %q, want %q", in, got, want)
		}
	}
}
