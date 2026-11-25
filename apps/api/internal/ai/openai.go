package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/dogovor-ai/api/internal/config"
)

// openAICompat talks to any OpenAI-compatible /chat/completions endpoint
// with streaming (OpenRouter, GigaChat).
type openAICompat struct {
	name   string
	url    string
	model  string
	auth   func(ctx context.Context) (string, error) // returns Authorization header
	client *http.Client
	extra  map[string]string
}

func (o *openAICompat) Name() string { return o.name }

func (o *openAICompat) Stream(ctx context.Context, req Request, onDelta func(string) error) (Usage, error) {
	msgs := []map[string]string{{"role": "system", "content": req.System}}
	for _, m := range req.Messages {
		msgs = append(msgs, map[string]string{"role": m.Role, "content": m.Content})
	}
	maxTok := req.MaxTokens
	if maxTok == 0 {
		maxTok = 800
	}
	body, _ := json.Marshal(map[string]any{"model": o.model, "messages": msgs, "stream": true, "max_tokens": maxTok, "temperature": 0.2})
	hreq, err := http.NewRequestWithContext(ctx, http.MethodPost, o.url, bytes.NewReader(body))
	if err != nil {
		return Usage{}, err
	}
	authz, err := o.auth(ctx)
	if err != nil {
		return Usage{}, err
	}
	hreq.Header.Set("Authorization", authz)
	hreq.Header.Set("Content-Type", "application/json")
	hreq.Header.Set("Accept", "text/event-stream")
	for k, v := range o.extra {
		hreq.Header.Set(k, v)
	}
	res, err := o.client.Do(hreq)
	if err != nil {
		return Usage{}, fmt.Errorf("%s: %w", o.name, err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return Usage{}, fmt.Errorf("%s: status %d: %s", o.name, res.StatusCode, strings.TrimSpace(string(b)))
	}
	var usage Usage
	sc := bufio.NewScanner(res.Body)
	sc.Buffer(make([]byte, 64*1024), 1<<20)
	for sc.Scan() {
		line := sc.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}
		var ev struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
			Usage *struct {
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
			} `json:"usage"`
		}
		if json.Unmarshal([]byte(data), &ev) != nil {
			continue
		}
		if ev.Usage != nil {
			usage = Usage{ev.Usage.PromptTokens, ev.Usage.CompletionTokens}
		}
		for _, c := range ev.Choices {
			if c.Delta.Content != "" {
				if err := onDelta(c.Delta.Content); err != nil {
					return usage, err
				}
			}
		}
	}
	if err := sc.Err(); err != nil && !errors.Is(err, context.Canceled) {
		return usage, err
	}
	return usage, nil
}

// NewOpenRouter builds the OpenRouter provider (OpenAI-compatible API).
func NewOpenRouter(cfg config.Config) LLMProvider {
	key := cfg.OpenRouterKey
	return &openAICompat{
		name:   "openrouter",
		url:    "https://openrouter.ai/api/v1/chat/completions",
		model:  cfg.OpenRouterModel,
		auth:   func(context.Context) (string, error) { return "Bearer " + key, nil },
		client: &http.Client{Timeout: 90 * time.Second},
		extra:  map[string]string{"X-Title": "dogovor.ai"},
	}
}
