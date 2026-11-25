package ai

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/dogovor-ai/api/internal/config"
)

// gigaToken caches the OAuth access token (valid ~30 minutes).
type gigaToken struct {
	mu      sync.Mutex
	token   string
	expires time.Time
}

// NewGigaChat builds the GigaChat provider. Sber's endpoints use certificates
// issued by the Russian Ministry of Digital Development CA: put the CA bundle
// path into GIGACHAT_CA_FILE (or install it into the system trust store).
func NewGigaChat(cfg config.Config) (LLMProvider, error) {
	tlsCfg := &tls.Config{MinVersion: tls.VersionTLS12}
	if ca := os.Getenv("GIGACHAT_CA_FILE"); ca != "" {
		pem, err := os.ReadFile(ca)
		if err != nil {
			return nil, fmt.Errorf("GIGACHAT_CA_FILE: %w", err)
		}
		pool, _ := x509.SystemCertPool()
		if pool == nil {
			pool = x509.NewCertPool()
		}
		pool.AppendCertsFromPEM(pem)
		tlsCfg.RootCAs = pool
	}
	client := &http.Client{Timeout: 90 * time.Second, Transport: &http.Transport{TLSClientConfig: tlsCfg, Proxy: http.ProxyFromEnvironment}}
	authURL := envOr("GIGACHAT_AUTH_URL", "https://ngw.devices.sberbank.ru:9443/api/v2/oauth")
	base := strings.TrimRight(cfg.GigaChatURL, "/")
	model := envOr("GIGACHAT_MODEL", "GigaChat")
	tok := &gigaToken{}
	auth := func(ctx context.Context) (string, error) {
		tok.mu.Lock()
		defer tok.mu.Unlock()
		if tok.token != "" && time.Until(tok.expires) > time.Minute {
			return "Bearer " + tok.token, nil
		}
		form := url.Values{"scope": {cfg.GigaChatScope}}
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, authURL, strings.NewReader(form.Encode()))
		req.Header.Set("Authorization", "Basic "+cfg.GigaChatAuthKey)
		req.Header.Set("RqUID", uuid.NewString())
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Accept", "application/json")
		res, err := client.Do(req)
		if err != nil {
			return "", fmt.Errorf("gigachat oauth: %w", err)
		}
		defer func() { _ = res.Body.Close() }()
		var body struct {
			AccessToken string `json:"access_token"`
			ExpiresAt   int64  `json:"expires_at"` // unix ms
		}
		if res.StatusCode != http.StatusOK || json.NewDecoder(res.Body).Decode(&body) != nil || body.AccessToken == "" {
			return "", fmt.Errorf("gigachat oauth: status %d", res.StatusCode)
		}
		tok.token = body.AccessToken
		tok.expires = time.UnixMilli(body.ExpiresAt)
		if body.ExpiresAt == 0 {
			tok.expires = time.Now().Add(25 * time.Minute)
		}
		return "Bearer " + tok.token, nil
	}
	return &openAICompat{name: "gigachat", url: base + "/api/v1/chat/completions", model: model, auth: auth, client: client}, nil
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}
