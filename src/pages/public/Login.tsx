import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Brand } from '../../components/layout/Brand';
import { Button, Field } from '../../components/ui';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  validateLogin,
  validateSignup,
  hasErrors,
  type ValidationErrors,
} from '../../lib/validation';

type Mode = 'login' | 'signup';

export default function Login() {
  const { signIn, signUp, session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/app';

  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<ValidationErrors<typeof form>>({});
  const [loading, setLoading] = useState(false);

  if (session) navigate(from, { replace: true });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation =
      mode === 'login'
        ? validateLogin(form)
        : validateSignup(form);
    setErrors(validation);
    if (hasErrors(validation)) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        toast.success('Berhasil masuk.');
        navigate(from, { replace: true });
      } else {
        await signUp(form.email, form.password, form.fullName);
        toast.success('Akun berhasil dibuat. Silakan masuk.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/">
            <Brand />
          </Link>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-800">
            {mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun baru'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login'
              ? 'Gunakan email civitas untuk mengakses asisten.'
              : 'Daftar untuk mulai menggunakan asisten fakultas.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Supabase belum dikonfigurasi. Salin <code>.env.example</code> ke <code>.env</code> dan
              isi kredensial.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {mode === 'signup' && (
              <Field label="Nama lengkap" error={errors.fullName}>
                <input
                  className="input"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  placeholder="Nama sesuai data akademik"
                />
              </Field>
            )}
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="nama@fakultas.ac.id"
                autoComplete="email"
              />
            </Field>
            <Field label="Kata sandi" error={errors.password}>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>
            {mode === 'signup' && (
              <Field label="Konfirmasi kata sandi" error={errors.confirmPassword}>
                <input
                  type="password"
                  className="input"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {mode === 'login' ? 'Masuk' : 'Daftar'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  className="font-medium text-brand-600 hover:underline"
                  onClick={() => {
                    setMode('signup');
                    setErrors({});
                  }}
                >
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button
                  className="font-medium text-brand-600 hover:underline"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                  }}
                >
                  Masuk
                </button>
              </>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Akun pertama yang mendaftar otomatis menjadi admin.
        </p>
      </div>
    </div>
  );
}
