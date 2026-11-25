package httpx

import (
	"net/http/httptest"
	"testing"
)

func TestClientIP(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:1234"
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.7")
	if got := ClientIP(r, true); got != "203.0.113.7" {
		t.Fatalf("trusted: %s", got)
	}
	if got := ClientIP(r, false); got != "10.0.0.1" {
		t.Fatalf("untrusted: %s", got)
	}
}
