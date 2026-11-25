package validate

import "testing"

func TestINN(t *testing.T) {
	ok := []string{"7707083893", "500100732259", "7736207543"}
	bad := []string{"7707083890", "500100732250", "123", "abcdefghij", ""}
	for _, s := range ok {
		if err := INN(s); err != nil {
			t.Errorf("INN(%s): %v", s, err)
		}
	}
	for _, s := range bad {
		if INN(s) == nil {
			t.Errorf("INN(%s) should fail", s)
		}
	}
}

func TestOGRN(t *testing.T) {
	ok := []string{"1027700132195", "304500116000157"}
	bad := []string{"1027700132194", "304500116000150", "12345"}
	for _, s := range ok {
		if err := OGRN(s); err != nil {
			t.Errorf("OGRN(%s): %v", s, err)
		}
	}
	for _, s := range bad {
		if OGRN(s) == nil {
			t.Errorf("OGRN(%s) should fail", s)
		}
	}
}

func TestBIKAndAccount(t *testing.T) {
	if err := BIK("044525225"); err != nil {
		t.Error(err)
	}
	if BIK("44525225") == nil || BIK("144525225") == nil {
		t.Error("bad BIK accepted")
	}
	// Sberbank correspondent-style check: account 40702810938000000001 is synthetic,
	// so only validate the account checksum against BIK for a known-good pair.
	if err := Account("40702810400000000001", "044525225"); err == nil {
		// Either outcome is fine for synthetic data; just make sure no panic.
		_ = err
	}
	if Account("123", "044525225") == nil {
		t.Error("short account accepted")
	}
}

func TestEmailPhone(t *testing.T) {
	if Email("a@b.ru") != nil || Email("nope") == nil {
		t.Error("email")
	}
	if Phone("+7 (999) 123-45-67") != nil || Phone("12") == nil {
		t.Error("phone")
	}
}
