package mailer_test

import (
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer"
)

// BuildMIME is exposed for tests via an internal alias; see export_test.go.
func TestBuildMIME_ParsesAsMultipartAlternativeWithBothParts(t *testing.T) {
	body, err := mailer.BuildMIME(mailer.Message{
		From:    "noreply@example.com",
		To:      "user@example.com",
		Subject: "hello",
		HTML:    "<p>hi</p>",
		Text:    "hi",
	})
	if err != nil {
		t.Fatalf("BuildMIME: %v", err)
	}

	msg, err := mail.ReadMessage(strings.NewReader(string(body)))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if got := msg.Header.Get("Subject"); got != "hello" {
		t.Errorf("subject: got %q", got)
	}
	mediaType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if err != nil {
		t.Fatalf("parse content-type: %v", err)
	}
	if mediaType != "multipart/alternative" {
		t.Errorf("media type: got %q want multipart/alternative", mediaType)
	}

	mr := multipart.NewReader(msg.Body, params["boundary"])
	var types []string
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("next part: %v", err)
		}
		types = append(types, part.Header.Get("Content-Type"))
	}
	if len(types) != 2 {
		t.Fatalf("parts: got %d want 2 (%v)", len(types), types)
	}
	if !strings.HasPrefix(types[0], "text/plain") {
		t.Errorf("part 0: got %q want text/plain", types[0])
	}
	if !strings.HasPrefix(types[1], "text/html") {
		t.Errorf("part 1: got %q want text/html", types[1])
	}
}
