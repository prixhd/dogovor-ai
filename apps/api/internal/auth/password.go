// Package auth implements password hashing (argon2id) and session tokens.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

// OWASP-recommended argon2id parameters (19 MiB, t=2, p=1).
const (
	argonTime    = 2
	argonMemory  = 19 * 1024
	argonThreads = 1
	argonKeyLen  = 32
	saltLen      = 16
)

// HashPassword returns a PHC-formatted argon2id hash.
func HashPassword(pw string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(pw), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	b64 := base64.RawStdEncoding
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, argonMemory, argonTime, argonThreads,
		b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// VerifyPassword checks pw against a PHC argon2id hash in constant time.
func VerifyPassword(hash, pw string) bool {
	parts := strings.Split(hash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	b64 := base64.RawStdEncoding
	salt, err1 := b64.DecodeString(parts[4])
	want, err2 := b64.DecodeString(parts[5])
	if err1 != nil || err2 != nil || m > 256*1024 || t > 10 {
		return false
	}
	got := argon2.IDKey([]byte(pw), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// DummyVerify burns the same CPU as a real check so that unknown emails do
// not respond faster than wrong passwords (user enumeration via timing).
func DummyVerify(pw string) {
	_ = argon2.IDKey([]byte(pw), make([]byte, saltLen), argonTime, argonMemory, argonThreads, argonKeyLen)
}

// CheckPasswordPolicy enforces a minimal length (NIST 800-63B style).
func CheckPasswordPolicy(pw string) error {
	n := utf8.RuneCountInString(pw)
	if n < 8 {
		return errors.New("пароль должен быть не короче 8 символов")
	}
	if n > 128 {
		return errors.New("пароль слишком длинный")
	}
	return nil
}

// NewToken returns a random URL-safe 256-bit token.
func NewToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// HashToken hashes a session token for storage (the DB never sees raw tokens).
func HashToken(tok string) []byte {
	h := sha256.Sum256([]byte(tok))
	return h[:]
}
