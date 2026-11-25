package tmpl

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

var monthsGen = [...]string{"января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"}

// formatDate renders an ISO date (YYYY-MM-DD) the way Russian contracts do.
func formatDate(s string) string {
	d, err := time.Parse("2006-01-02", s)
	if err != nil {
		return s
	}
	return fmt.Sprintf("«%02d» %s %d г.", d.Day(), monthsGen[d.Month()-1], d.Year())
}

// groupThousands formats 1250000 as "1 250 000" (non-breaking spaces avoided
// to keep DOCX/text simple).
func groupThousands(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(' ')
		}
		b.WriteRune(c)
	}
	return b.String()
}

func parseNumber(s string) (float64, bool) {
	s = strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(s), " ", ""), ",", ".")
	f, err := strconv.ParseFloat(s, 64)
	if err != nil || math.IsNaN(f) || math.IsInf(f, 0) {
		return 0, false
	}
	return f, true
}

// formatMoney renders "50 000 (пятьдесят тысяч) рублей [NN копеек]".
func formatMoney(s string) string {
	f, ok := parseNumber(s)
	if !ok || f < 0 || f >= 1e15 {
		return s
	}
	rub := int64(f)
	kop := int64(math.Round((f - float64(rub)) * 100))
	out := fmt.Sprintf("%s (%s) %s", groupThousands(rub), numberWords(rub, false), plural(rub, "рубль", "рубля", "рублей"))
	if kop > 0 {
		out += fmt.Sprintf(" %02d %s", kop, plural(kop, "копейка", "копейки", "копеек"))
	}
	return out
}

func plural(n int64, one, few, many string) string {
	n %= 100
	if n >= 11 && n <= 14 {
		return many
	}
	switch n % 10 {
	case 1:
		return one
	case 2, 3, 4:
		return few
	}
	return many
}

var (
	unitsM   = [...]string{"", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"}
	unitsF   = [...]string{"", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"}
	teens    = [...]string{"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"}
	tens     = [...]string{"", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"}
	hundreds = [...]string{"", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"}
)

// triad spells a number 0..999.
func triad(n int64, feminine bool) []string {
	var w []string
	if h := n / 100; h > 0 {
		w = append(w, hundreds[h])
	}
	r := n % 100
	switch {
	case r >= 10 && r < 20:
		w = append(w, teens[r-10])
	default:
		if t := r / 10; t > 0 {
			w = append(w, tens[t])
		}
		if u := r % 10; u > 0 {
			if feminine {
				w = append(w, unitsF[u])
			} else {
				w = append(w, unitsM[u])
			}
		}
	}
	return w
}

// numberWords spells a non-negative integer in Russian (masculine by default).
func numberWords(n int64, feminine bool) string {
	if n == 0 {
		return "ноль"
	}
	scales := []struct {
		div            int64
		one, few, many string
		fem            bool
	}{
		{1e12, "триллион", "триллиона", "триллионов", false},
		{1e9, "миллиард", "миллиарда", "миллиардов", false},
		{1e6, "миллион", "миллиона", "миллионов", false},
		{1e3, "тысяча", "тысячи", "тысяч", true},
	}
	var words []string
	for _, s := range scales {
		if q := n / s.div; q > 0 {
			words = append(words, triad(q, s.fem)...)
			words = append(words, plural(q, s.one, s.few, s.many))
			n %= s.div
		}
	}
	words = append(words, triad(n, feminine)...)
	return strings.Join(words, " ")
}

// formatNumber groups thousands for integers, keeps decimals otherwise.
func formatNumber(s string) string {
	f, ok := parseNumber(s)
	if !ok {
		return s
	}
	if f == math.Trunc(f) && math.Abs(f) < 1e15 {
		return groupThousands(int64(f))
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
}
