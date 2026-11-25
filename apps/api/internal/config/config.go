// Package config loads 12-factor configuration from environment variables.
package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds all runtime settings of the API service.
type Config struct {
	Addr               string
	AppURL             string
	DatabaseURL        string
	SessionSecret      string
	TemplatesDir       string
	KnowledgeDir       string
	CookieSecure       bool
	LLMProvider        string
	GigaChatAuthKey    string
	GigaChatScope      string
	GigaChatURL        string
	OpenRouterKey      string
	OpenRouterModel    string
	YandexClientID     string
	YandexClientSecret string
	AIGuestLimit       int
	AIUserLimit        int
	AIGlobalLimit      int
}

// Load reads configuration from the environment with sane local defaults.
func Load() Config {
	appURL := env("APP_URL", "http://localhost:3000")
	return Config{
		Addr:               env("API_ADDR", ":8080"),
		AppURL:             appURL,
		DatabaseURL:        env("DATABASE_URL", "postgres://dogovor:dogovor@localhost:5432/dogovor?sslmode=disable"),
		SessionSecret:      env("SESSION_SECRET", "change-me"),
		TemplatesDir:       env("TEMPLATES_DIR", "../../templates"),
		KnowledgeDir:       env("KNOWLEDGE_DIR", "../../knowledge"),
		CookieSecure:       envBool("COOKIE_SECURE", strings.HasPrefix(appURL, "https://")),
		LLMProvider:        env("LLM_PROVIDER", "stub"),
		GigaChatAuthKey:    os.Getenv("GIGACHAT_AUTH_KEY"),
		GigaChatScope:      env("GIGACHAT_SCOPE", "GIGACHAT_API_PERS"),
		GigaChatURL:        env("GIGACHAT_URL", "https://api.giga.chat"),
		OpenRouterKey:      os.Getenv("OPENROUTER_API_KEY"),
		OpenRouterModel:    os.Getenv("OPENROUTER_MODEL"),
		YandexClientID:     os.Getenv("YANDEX_CLIENT_ID"),
		YandexClientSecret: os.Getenv("YANDEX_CLIENT_SECRET"),
		AIGuestLimit:       envInt("AI_DAILY_GUEST_LIMIT", 5),
		AIUserLimit:        envInt("AI_DAILY_USER_LIMIT", 30),
		AIGlobalLimit:      envInt("AI_DAILY_GLOBAL_LIMIT", 500),
	}
}

func env(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		// Allow inline comments in .env values ("stub   # comment").
		if i := strings.Index(v, " #"); i >= 0 {
			v = strings.TrimSpace(v[:i])
		}
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if n, err := strconv.Atoi(env(key, "")); err == nil {
		return n
	}
	return def
}

func envBool(key string, def bool) bool {
	if b, err := strconv.ParseBool(env(key, "")); err == nil {
		return b
	}
	return def
}
