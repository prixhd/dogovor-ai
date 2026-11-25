// Package validate checks Russian requisites (INN, OGRN, BIK, account).
package validate

import (
	"errors"
	"net/mail"
	"strings"
)

func digits(s string, n ...int) ([]int, error) {
	s = strings.TrimSpace(s)
	out := make([]int, 0, len(s))
	for _, c := range s {
		if c < '0' || c > '9' {
			return nil, errors.New("допустимы только цифры")
		}
		out = append(out, int(c-'0'))
	}
	for _, l := range n {
		if len(out) == l {
			return out, nil
		}
	}
	return nil, errors.New("неверная длина")
}

func weighted(d []int, w []int) int {
	sum := 0
	for i, k := range w {
		sum += d[i] * k
	}
	return sum % 11 % 10
}

// INN validates a 10-digit (company) or 12-digit (person/IP) taxpayer number.
func INN(s string) error {
	d, err := digits(s, 10, 12)
	if err != nil {
		return errors.New("ИНН должен содержать 10 или 12 цифр")
	}
	if len(d) == 10 {
		if weighted(d, []int{2, 4, 10, 3, 5, 9, 4, 6, 8}) != d[9] {
			return errors.New("неверная контрольная сумма ИНН")
		}
		return nil
	}
	if weighted(d, []int{7, 2, 4, 10, 3, 5, 9, 4, 6, 8}) != d[10] ||
		weighted(d, []int{3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8}) != d[11] {
		return errors.New("неверная контрольная сумма ИНН")
	}
	return nil
}

// OGRN validates a 13-digit OGRN or 15-digit OGRNIP.
func OGRN(s string) error {
	d, err := digits(s, 13, 15)
	if err != nil {
		return errors.New("ОГРН содержит 13 цифр, ОГРНИП 15 цифр")
	}
	var n, mod int64
	for _, x := range d[:len(d)-1] {
		n = n*10 + int64(x)
	}
	if len(d) == 13 {
		mod = n % 11 % 10
	} else {
		mod = n % 13 % 10
	}
	if int(mod) != d[len(d)-1] {
		return errors.New("неверная контрольная цифра ОГРН")
	}
	return nil
}

// BIK validates a Russian bank identifier code (9 digits starting with 04).
func BIK(s string) error {
	d, err := digits(s, 9)
	if err != nil || d[0] != 0 || d[1] != 4 {
		return errors.New("БИК: 9 цифр, начинается с 04")
	}
	return nil
}

// Account validates a 20-digit settlement account against the bank BIK.
func Account(acc, bik string) error {
	d, err := digits(acc, 20)
	if err != nil {
		return errors.New("расчётный счёт должен содержать 20 цифр")
	}
	b, err := digits(bik, 9)
	if err != nil {
		return nil // BIK checked separately
	}
	full := append(append([]int{}, b[6:]...), d...)
	w := []int{7, 1, 3}
	sum := 0
	for i, x := range full {
		sum += x * w[i%3] % 10
	}
	if sum%10 != 0 {
		return errors.New("счёт не соответствует БИК")
	}
	return nil
}

// Email performs a basic address syntax check.
func Email(s string) error {
	a, err := mail.ParseAddress(strings.TrimSpace(s))
	if err != nil || a.Address != strings.TrimSpace(s) || !strings.Contains(a.Address, ".") {
		return errors.New("неверный адрес почты")
	}
	return nil
}

// Phone accepts Russian numbers with 10-11 digits in any common format.
func Phone(s string) error {
	n := 0
	for _, c := range s {
		switch {
		case c >= '0' && c <= '9':
			n++
		case strings.ContainsRune("+()- ", c):
		default:
			return errors.New("неверный номер телефона")
		}
	}
	if n < 10 || n > 11 {
		return errors.New("неверный номер телефона")
	}
	return nil
}
