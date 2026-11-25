// Package ai is the server-side AI layer: providers behind the LLMProvider
// interface, the norms knowledge base, PII masking and structured outputs.
// API keys never leave the server.
package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/dogovor-ai/api/internal/config"
)

// Task tells providers (and the stub) what kind of output is expected.
type Task string

// Tasks.
const (
	TaskChat    Task = "chat"
	TaskEdit    Task = "edit"
	TaskExtract Task = "extract"
)

// Message is a chat turn.
type Message struct {
	Role    string `json:"role"` // user | assistant
	Content string `json:"content"`
}

// Request is a provider-agnostic completion request.
type Request struct {
	Task      Task
	System    string
	Messages  []Message
	MaxTokens int
	// Meta carries structured hints for the stub provider only.
	Meta map[string]string
}

// Usage reports token consumption (0 when the provider does not say).
type Usage struct{ PromptTokens, CompletionTokens int }

// LLMProvider streams a completion, calling onDelta for each text chunk.
type LLMProvider interface {
	Name() string
	Stream(ctx context.Context, req Request, onDelta func(string) error) (Usage, error)
}

// Complete runs a request and returns the whole text.
func Complete(ctx context.Context, p LLMProvider, req Request) (string, Usage, error) {
	var b strings.Builder
	u, err := p.Stream(ctx, req, func(d string) error { b.WriteString(d); return nil })
	return b.String(), u, err
}

// NewProvider picks the provider from configuration.
func NewProvider(cfg config.Config) (LLMProvider, error) {
	switch cfg.LLMProvider {
	case "", "stub":
		return Stub{}, nil
	case "gigachat":
		if cfg.GigaChatAuthKey == "" {
			return nil, fmt.Errorf("LLM_PROVIDER=gigachat requires GIGACHAT_AUTH_KEY")
		}
		return NewGigaChat(cfg)
	case "openrouter":
		if cfg.OpenRouterKey == "" || cfg.OpenRouterModel == "" {
			return nil, fmt.Errorf("LLM_PROVIDER=openrouter requires OPENROUTER_API_KEY and OPENROUTER_MODEL")
		}
		return NewOpenRouter(cfg), nil
	}
	return nil, fmt.Errorf("unknown LLM_PROVIDER %q (stub | gigachat | openrouter)", cfg.LLMProvider)
}
