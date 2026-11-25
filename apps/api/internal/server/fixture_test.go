package server

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func mustFixture(t *testing.T) map[string]any {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", "..", "..", "templates", "testdata", "trudovoy-dogovor.json"))
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	return m
}
