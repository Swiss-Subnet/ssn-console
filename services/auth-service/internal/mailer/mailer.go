package mailer

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"mime/multipart"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"time"
)

// Mailer abstracts email delivery so tests can substitute a fake.
type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

type Message struct {
	From    string
	To      string
	Subject string
	HTML    string
	Text    string
}

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
}

// sendTimeout bounds the entire SMTP transaction (dial + handshake + send).
// Independent of any client-side request context.
const sendTimeout = 30 * time.Second

// smtpSubmissionsPort is the implicit-TLS submission port (RFC 8314).
// On this port the connection is TLS from the first byte, so no STARTTLS.
const smtpSubmissionsPort = 465

// dialFunc lets tests inject a fake transport.
type dialFunc func(ctx context.Context, cfg SMTPConfig) (smtpClient, error)

// smtpClient is the subset of *smtp.Client we use, narrowed for fakeability.
type smtpClient interface {
	StartTLS(*tls.Config) error
	Extension(string) (bool, string)
	Auth(smtp.Auth) error
	Mail(string) error
	Rcpt(string) error
	Data() (writeCloser, error)
	Quit() error
	Close() error
}

type writeCloser interface {
	Write([]byte) (int, error)
	Close() error
}

type smtpMailer struct {
	cfg  SMTPConfig
	dial dialFunc
}

func NewSMTP(cfg SMTPConfig) Mailer {
	return &smtpMailer{cfg: cfg, dial: dialReal}
}

func (m *smtpMailer) Send(ctx context.Context, msg Message) error {
	body, err := buildMIME(msg)
	if err != nil {
		return fmt.Errorf("build mime: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()

	// Run the blocking SMTP exchange in a goroutine so ctx.Done() can unblock
	// us on cancellation or timeout. The connection is closed from the outer
	// goroutine, which forces the inner one to error out and return.
	// done is buffered so the goroutine can exit even after we've returned
	// via ctx.Done() with no receiver waiting.
	done := make(chan error, 1)
	var client smtpClient
	client, err = m.dial(ctx, m.cfg)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}

	go func() {
		done <- sendVia(client, m.cfg, msg, body)
	}()

	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		// Closing the connection unblocks the goroutine; we don't wait for it.
		_ = client.Close()
		return ctx.Err()
	}
}

func sendVia(c smtpClient, cfg SMTPConfig, msg Message, body []byte) error {
	defer func() { _ = c.Close() }()

	// On the submissions port the connection is already TLS (implicit);
	// otherwise upgrade via STARTTLS when the server advertises it.
	if cfg.Port != smtpSubmissionsPort {
		if ok, _ := c.Extension("STARTTLS"); ok {
			if err := c.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
				return fmt.Errorf("starttls: %w", err)
			}
		}
	}

	if cfg.User != "" {
		auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
		if err := c.Auth(auth); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}
	fromAddr, err := envelopeAddress(msg.From)
	if err != nil {
		return fmt.Errorf("parse from: %w", err)
	}
	toAddr, err := envelopeAddress(msg.To)
	if err != nil {
		return fmt.Errorf("parse to: %w", err)
	}
	if err := c.Mail(fromAddr); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	if err := c.Rcpt(toAddr); err != nil {
		return fmt.Errorf("rcpt to: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err := w.Write(body); err != nil {
		_ = w.Close()
		return fmt.Errorf("write body: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}
	return c.Quit()
}

// dialReal opens a TCP (or TLS, on port 465) connection bound to ctx and
// wraps it in *smtp.Client. The returned client owns the connection.
func dialReal(ctx context.Context, cfg SMTPConfig) (smtpClient, error) {
	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	var conn net.Conn
	var err error

	if cfg.Port == smtpSubmissionsPort {
		d := tls.Dialer{
			NetDialer: &net.Dialer{},
			Config:    &tls.Config{ServerName: cfg.Host},
		}
		conn, err = d.DialContext(ctx, "tcp", addr)
	} else {
		d := net.Dialer{}
		conn, err = d.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return nil, err
	}

	c, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	return realClient{c}, nil
}

// realClient adapts *smtp.Client to our smtpClient interface.
type realClient struct{ c *smtp.Client }

func (r realClient) StartTLS(cfg *tls.Config) error       { return r.c.StartTLS(cfg) }
func (r realClient) Extension(name string) (bool, string) { return r.c.Extension(name) }
func (r realClient) Auth(a smtp.Auth) error               { return r.c.Auth(a) }
func (r realClient) Mail(from string) error               { return r.c.Mail(from) }
func (r realClient) Rcpt(to string) error                 { return r.c.Rcpt(to) }
func (r realClient) Data() (writeCloser, error)           { return r.c.Data() }
func (r realClient) Quit() error                          { return r.c.Quit() }
func (r realClient) Close() error                         { return r.c.Close() }

// envelopeAddress strips any display name so SMTP MAIL FROM / RCPT TO
// receive a bare address, while the message headers keep the original form.
func envelopeAddress(s string) (string, error) {
	addr, err := mail.ParseAddress(s)
	if err != nil {
		return "", err
	}
	return addr.Address, nil
}

func buildMIME(msg Message) ([]byte, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)

	fmt.Fprintf(&buf, "From: %s\r\n", msg.From)
	fmt.Fprintf(&buf, "To: %s\r\n", msg.To)
	fmt.Fprintf(&buf, "Subject: %s\r\n", msg.Subject)
	buf.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&buf, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", mw.Boundary())

	if err := writePart(mw, "text/plain; charset=utf-8", msg.Text); err != nil {
		return nil, err
	}
	if err := writePart(mw, "text/html; charset=utf-8", msg.HTML); err != nil {
		return nil, err
	}
	if err := mw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func writePart(mw *multipart.Writer, contentType, body string) error {
	h := textproto.MIMEHeader{}
	h.Set("Content-Type", contentType)
	w, err := mw.CreatePart(h)
	if err != nil {
		return err
	}
	_, err = w.Write([]byte(body))
	return err
}
