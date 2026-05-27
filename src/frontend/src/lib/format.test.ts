import { describe, expect, it } from 'vitest';
import { maskEmail } from './format';

describe('maskEmail', () => {
  it('keeps the first char of local part and domain label', () => {
    expect(maskEmail('jane.doe@example.com')).toBe('j***@e***.com');
  });

  it('handles single-char local parts and short domains', () => {
    expect(maskEmail('q@subnet.ch')).toBe('q***@s***.ch');
  });

  it('masks a domain with no dot', () => {
    expect(maskEmail('user@localhost')).toBe('u***@l***');
  });

  it('masks subdomains keeping only the public suffix', () => {
    expect(maskEmail('a@mail.corp.example.com')).toBe('a***@m***.com');
  });

  it('returns the input unchanged when it is not an email', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});
