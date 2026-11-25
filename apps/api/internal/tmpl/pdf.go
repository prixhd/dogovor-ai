package tmpl

import (
	"bytes"
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// ErrPDFUnavailable is returned when LibreOffice is not installed.
var ErrPDFUnavailable = errors.New("pdf export unavailable: libreoffice not installed")

// PDFAvailable reports whether LibreOffice is on PATH.
func PDFAvailable() bool {
	_, err := soffice()
	return err == nil
}

func soffice() (string, error) {
	for _, name := range []string{"soffice", "libreoffice"} {
		if p, err := exec.LookPath(name); err == nil {
			return p, nil
		}
	}
	return "", ErrPDFUnavailable
}

// ConvertPDF converts DOCX bytes to PDF via headless LibreOffice in a
// throwaway directory with a hard timeout.
func ConvertPDF(ctx context.Context, docx []byte) ([]byte, error) {
	bin, err := soffice()
	if err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp("", "dogovor-pdf-*")
	if err != nil {
		return nil, err
	}
	defer func() { _ = os.RemoveAll(dir) }()
	in := filepath.Join(dir, "doc.docx")
	if err := os.WriteFile(in, docx, 0o600); err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, "--headless", "--norestore", "-env:UserInstallation=file://"+dir+"/profile",
		"--convert-to", "pdf", "--outdir", dir, in)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, errors.New("pdf conversion failed")
	}
	return os.ReadFile(filepath.Join(dir, "doc.pdf"))
}
