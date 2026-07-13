import { Link, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Brand } from './Brand';

export function PublicLayout() {
  const { session } = useAuth();
  const links = [
    { to: '/', label: 'Beranda', end: true },
    { to: '/info', label: 'Informasi Umum' },
    { to: '/contacts', label: 'Kontak Unit' },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link to={session ? '/app' : '/login'} className="btn-primary">
            {session ? 'Buka Aplikasi' : 'Masuk'}
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
          <p>AI Faculty Assistant — Asisten informasi resmi fakultas.</p>
          <p className="mt-1 text-xs text-slate-400">
            Jawaban AI berdasarkan data resmi. Konfirmasi hal penting ke unit terkait.
          </p>
        </div>
      </footer>
    </div>
  );
}
