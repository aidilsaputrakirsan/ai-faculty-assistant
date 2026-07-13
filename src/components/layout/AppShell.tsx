import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  History,
  User,
  FileText,
  Info,
  Phone,
  HelpCircle,
  FolderKanban,
  Tags,
  Building2,
  MessageSquareHeart,
  BarChart3,
  ScrollText,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/format';
import { Brand } from './Brand';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const userNav: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/app/chat', label: 'Chatbot', icon: <MessageSquare size={18} /> },
  { to: '/app/history', label: 'Riwayat', icon: <History size={18} /> },
  { to: '/app/documents', label: 'Sumber & Dokumen', icon: <FileText size={18} /> },
  { to: '/app/info', label: 'Informasi Umum', icon: <Info size={18} /> },
  { to: '/app/contacts', label: 'Kontak Unit', icon: <Phone size={18} /> },
  { to: '/app/profile', label: 'Profil', icon: <User size={18} /> },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard Admin', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/admin/faqs', label: 'FAQ', icon: <HelpCircle size={18} /> },
  { to: '/admin/categories', label: 'Kategori', icon: <Tags size={18} /> },
  { to: '/admin/documents', label: 'Dokumen', icon: <FolderKanban size={18} /> },
  { to: '/admin/units', label: 'Kontak Unit', icon: <Building2 size={18} /> },
  { to: '/admin/feedback', label: 'Feedback', icon: <MessageSquareHeart size={18} /> },
  { to: '/admin/stats', label: 'Statistik', icon: <BarChart3 size={18} /> },
  { to: '/admin/users', label: 'Pengguna', icon: <Users size={18} /> },
  { to: '/admin/logs', label: 'Log Aktivitas', icon: <ScrollText size={18} /> },
];

export function AppShell({ variant }: { variant: 'user' | 'admin' }) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = variant === 'admin' ? adminNav : userNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavList = () => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}

      {/* Cross-link between areas */}
      <div className="my-2 border-t border-slate-200" />
      {variant === 'user' && isAdmin && (
        <NavLink
          to="/admin"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          <ShieldCheck size={18} />
          Panel Admin
        </NavLink>
      )}
      {variant === 'admin' && (
        <NavLink
          to="/app"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <MessageSquare size={18} />
          Ke Aplikasi User
        </NavLink>
      )}
    </nav>
  );

  const UserFooter = () => (
    <div className="border-t border-slate-200 p-3">
      <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(profile?.full_name || 'U')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{profile?.full_name}</p>
          <p className="truncate text-xs capitalize text-slate-400">{profile?.role}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut size={18} />
        Keluar
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Brand />
        </div>
        <NavList />
        <UserFooter />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <Brand />
              <button onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <NavList />
            <UserFooter />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {variant === 'admin' ? 'Panel Administrasi' : 'Portal Civitas'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              Halo, {profile?.full_name?.split(' ')[0]}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials(profile?.full_name || 'U')}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scroll-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
