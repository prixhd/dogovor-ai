package ai

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	passportRe = regexp.MustCompile(`\b\d{2}\s?\d{2}\s\d{6}\b`)
	phoneRe    = regexp.MustCompile(`(?:\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b`)
	snilsRe    = regexp.MustCompile(`\b\d{3}-\d{3}-\d{3}[\s-]?\d{2}\b`)
	emailRe    = regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`)
	tagRe      = regexp.MustCompile(`(?i)</?\s*(document|system|instructions?|norms|user|assistant)[^>]*>`)
)

// MaskPII replaces personal identifiers that the model never needs:
// passport numbers, phones, SNILS and emails.
func MaskPII(s string) string {
	s = snilsRe.ReplaceAllString(s, "[СНИЛС скрыт]")
	s = passportRe.ReplaceAllString(s, "[паспорт скрыт]")
	s = phoneRe.ReplaceAllString(s, "[телефон скрыт]")
	s = emailRe.ReplaceAllString(s, "[почта скрыта]")
	return s
}

// SanitizeUserText strips control characters and our prompt delimiters from
// untrusted text and caps its length (prompt-injection hygiene: user and
// document content is always data inside delimiters, never instructions).
func SanitizeUserText(s string, maxRunes int) string {
	s = tagRe.ReplaceAllString(s, "")
	s = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' || !unicode.IsControl(r) {
			return r
		}
		return -1
	}, s)
	if r := []rune(s); len(r) > maxRunes {
		s = string(r[:maxRunes])
	}
	return strings.TrimSpace(s)
}
