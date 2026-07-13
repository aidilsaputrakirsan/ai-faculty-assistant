import { describe, it, expect } from 'vitest';
import {
  isEmail,
  validateLogin,
  validateSignup,
  validateFaq,
  validateDocument,
  validateDocumentFile,
  hasErrors,
} from './validation';

describe('isEmail', () => {
  it('accepts valid emails', () => {
    expect(isEmail('a@b.ac.id')).toBe(true);
  });
  it('rejects invalid emails', () => {
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });
});

describe('validateLogin', () => {
  it('flags empty fields', () => {
    const e = validateLogin({ email: '', password: '' });
    expect(e.email).toBeDefined();
    expect(e.password).toBeDefined();
    expect(hasErrors(e)).toBe(true);
  });
  it('flags short passwords', () => {
    const e = validateLogin({ email: 'a@b.com', password: '123' });
    expect(e.password).toBeDefined();
  });
  it('passes valid input', () => {
    const e = validateLogin({ email: 'a@b.com', password: 'secret1' });
    expect(hasErrors(e)).toBe(false);
  });
});

describe('validateSignup', () => {
  it('requires matching passwords and name', () => {
    const e = validateSignup({
      email: 'a@b.com',
      password: 'secret1',
      confirmPassword: 'secret2',
      fullName: '',
    });
    expect(e.confirmPassword).toBeDefined();
    expect(e.fullName).toBeDefined();
  });
});

describe('validateFaq', () => {
  it('requires question, answer, category', () => {
    const e = validateFaq({ question: '', answer: '', category_id: '' });
    expect(Object.keys(e)).toHaveLength(3);
  });
  it('passes complete input', () => {
    const e = validateFaq({ question: 'q', answer: 'a', category_id: 'c' });
    expect(hasErrors(e)).toBe(false);
  });
});

describe('validateDocument', () => {
  it('requires title and category', () => {
    const e = validateDocument({ title: '', category_id: '' });
    expect(e.title).toBeDefined();
    expect(e.category_id).toBeDefined();
  });
});

describe('validateDocumentFile', () => {
  const mk = (type: string, size: number) => ({ type, size, name: 'x' }) as File;
  it('rejects non-pdf', () => {
    expect(validateDocumentFile(mk('image/png', 100))).toMatch(/PDF/);
  });
  it('rejects oversized files', () => {
    expect(validateDocumentFile(mk('application/pdf', 20 * 1024 * 1024))).toMatch(/10 MB/);
  });
  it('accepts valid pdf', () => {
    expect(validateDocumentFile(mk('application/pdf', 1000))).toBeNull();
  });
});
