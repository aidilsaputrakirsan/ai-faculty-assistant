// Lightweight, dependency-free validation helpers used by forms.

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function required(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): ValidationErrors<LoginInput> {
  const errors: ValidationErrors<LoginInput> = {};
  if (!required(input.email)) errors.email = 'Email wajib diisi.';
  else if (!isEmail(input.email)) errors.email = 'Format email tidak valid.';
  if (!required(input.password)) errors.password = 'Kata sandi wajib diisi.';
  else if (input.password.length < 6) errors.password = 'Kata sandi minimal 6 karakter.';
  return errors;
}

export interface SignupInput extends LoginInput {
  fullName: string;
  confirmPassword: string;
}

export function validateSignup(input: SignupInput): ValidationErrors<SignupInput> {
  const errors: ValidationErrors<SignupInput> = validateLogin(input);
  if (!required(input.fullName)) errors.fullName = 'Nama lengkap wajib diisi.';
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
  }
  return errors;
}

export interface FaqInput {
  question: string;
  answer: string;
  category_id: string;
}

export function validateFaq(input: FaqInput): ValidationErrors<FaqInput> {
  const errors: ValidationErrors<FaqInput> = {};
  if (!required(input.question)) errors.question = 'Pertanyaan wajib diisi.';
  if (!required(input.answer)) errors.answer = 'Jawaban wajib diisi.';
  if (!required(input.category_id)) errors.category_id = 'Kategori wajib dipilih.';
  return errors;
}

export interface DocumentInput {
  title: string;
  category_id: string;
}

export function validateDocument(input: DocumentInput): ValidationErrors<DocumentInput> {
  const errors: ValidationErrors<DocumentInput> = {};
  if (!required(input.title)) errors.title = 'Judul wajib diisi.';
  if (!required(input.category_id)) errors.category_id = 'Kategori wajib dipilih.';
  return errors;
}

export function hasErrors<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateDocumentFile(file: File): string | null {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return 'Hanya berkas PDF yang diperbolehkan.';
  }
  if (file.size > MAX_DOC_SIZE) {
    return 'Ukuran berkas maksimal 10 MB.';
  }
  return null;
}
