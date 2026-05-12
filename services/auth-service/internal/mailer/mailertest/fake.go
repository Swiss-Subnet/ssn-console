// Package mailertest provides test doubles for the mailer package.
package mailertest

import (
	"context"
	"sync"

	"github.com/swiss-subnet/ssn-console/services/auth-service/internal/mailer"
)

// Fake is a mailer.Mailer that records every Send call in memory.
type Fake struct {
	mu   sync.Mutex
	Sent []mailer.Message
	Err  error
}

func (f *Fake) Send(_ context.Context, msg mailer.Message) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Err != nil {
		return f.Err
	}
	f.Sent = append(f.Sent, msg)
	return nil
}

func (f *Fake) LastSent() (mailer.Message, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.Sent) == 0 {
		return mailer.Message{}, false
	}
	return f.Sent[len(f.Sent)-1], true
}
