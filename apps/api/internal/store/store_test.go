package store

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/dogovor-ai/api/internal/testutil"
)

func uniqueEmail() string { return uuid.NewString()[:8] + "@test.ru" }

func TestUsersAndSessions(t *testing.T) {
	s := New(testutil.DB(t))
	ctx := context.Background()
	email := uniqueEmail()
	u, err := s.CreateUser(ctx, "  "+email+" ", "Анна", "hash")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateUser(ctx, email, "Дубль", "hash"); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("duplicate email: %v", err)
	}
	tok, csrf, err := s.CreateSession(ctx, u.ID)
	if err != nil {
		t.Fatal(err)
	}
	sess, err := s.SessionByToken(ctx, tok)
	if err != nil || sess.User.ID != u.ID || sess.CSRF != csrf {
		t.Fatalf("session: %v %+v", err, sess)
	}
	_ = s.DeleteSession(ctx, tok)
	if _, err := s.SessionByToken(ctx, tok); !errors.Is(err, ErrNotFound) {
		t.Fatal("session should be gone")
	}
}

// TestDocumentOwnership: a user must never read, change or delete another
// user's document (IDOR).
func TestDocumentOwnership(t *testing.T) {
	s := New(testutil.DB(t))
	ctx := context.Background()
	alice, _ := s.CreateUser(ctx, uniqueEmail(), "A", "h")
	bob, _ := s.CreateUser(ctx, uniqueEmail(), "B", "h")
	doc, err := s.CreateDocument(ctx, alice.ID, "trudovoy-dogovor", 1, "Договор", json.RawMessage(`{"a":1}`), json.RawMessage(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetDocument(ctx, bob.ID, doc.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob read alice's document")
	}
	title := "взлом"
	if _, err := s.UpdateDocument(ctx, bob.ID, doc.ID, &title, nil, nil); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob updated alice's document")
	}
	if _, err := s.DuplicateDocument(ctx, bob.ID, doc.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob duplicated alice's document")
	}
	if err := s.DeleteDocument(ctx, bob.ID, doc.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob deleted alice's document")
	}
	list, _ := s.ListDocuments(ctx, bob.ID)
	if len(list) != 0 {
		t.Fatal("bob sees alice's documents")
	}
	newTitle := "Договор 2"
	upd, err := s.UpdateDocument(ctx, alice.ID, doc.ID, &newTitle, nil, json.RawMessage(`{"deleted":["x"]}`))
	if err != nil || upd.Title != newTitle || string(upd.Data) != `{"a": 1}` {
		t.Fatalf("alice update: %v %s %s", err, upd.Title, upd.Data)
	}
	dup, err := s.DuplicateDocument(ctx, alice.ID, doc.ID)
	if err != nil || dup.Title != "Договор 2 (копия)" {
		t.Fatalf("duplicate: %v %s", err, dup.Title)
	}
}

func TestPartyOwnership(t *testing.T) {
	s := New(testutil.DB(t))
	ctx := context.Background()
	alice, _ := s.CreateUser(ctx, uniqueEmail(), "A", "h")
	bob, _ := s.CreateUser(ctx, uniqueEmail(), "B", "h")
	p, err := s.CreateParty(ctx, alice.ID, "org", "Ромашка", map[string]string{"inn": "7707083893"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetParty(ctx, bob.ID, p.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob read alice's card")
	}
	if _, err := s.UpdateParty(ctx, bob.ID, p.ID, "org", "x", nil); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob updated alice's card")
	}
	if err := s.DeleteParty(ctx, bob.ID, p.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("bob deleted alice's card")
	}
}

func TestTakeDailyAndHit(t *testing.T) {
	s := New(testutil.DB(t))
	ctx := context.Background()
	subj := "test:" + uuid.NewString()
	for i := 1; i <= 3; i++ {
		n, ok, err := s.TakeDaily(ctx, subj, "ai", 3)
		if err != nil || !ok || n != i {
			t.Fatalf("take %d: %v %v %d", i, err, ok, n)
		}
	}
	if _, ok, _ := s.TakeDaily(ctx, subj, "ai", 3); ok {
		t.Fatal("limit not enforced")
	}
	_ = s.RefundDaily(ctx, subj, "ai")
	if n, _ := s.UsedDaily(ctx, subj, "ai"); n != 2 {
		t.Fatalf("refund: %d", n)
	}
	key := "login:" + uuid.NewString()
	for i := 0; i < 5; i++ {
		ok, err := s.Hit(ctx, key, 5, time.Hour)
		if err != nil || !ok {
			t.Fatal("hit within limit rejected")
		}
	}
	if ok, _ := s.Hit(ctx, key, 5, time.Hour); ok {
		t.Fatal("rate limit not enforced")
	}
}
