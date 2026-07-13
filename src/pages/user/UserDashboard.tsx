import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, History, FileText, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listConversations, listFaqs } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { relativeTime } from '../../lib/format';
import { Skeleton } from '../../components/ui';

const shortcuts = [
  { to: '/app/chat', icon: MessageSquare, title: 'Mulai Chat', desc: 'Tanya asisten fakultas' },
  { to: '/app/history', icon: History, title: 'Riwayat', desc: 'Percakapan sebelumnya' },
  { to: '/app/documents', icon: FileText, title: 'Dokumen', desc: 'Dokumen resmi fakultas' },
  { to: '/app/contacts', icon: Phone, title: 'Kontak Unit', desc: 'Hubungi unit terkait' },
];

export default function UserDashboard() {
  const { profile } = useAuth();
  const convQ = useQuery({ queryKey: ['conversations'], queryFn: listConversations });
  const faqQ = useQuery({ queryKey: ['faqs-public'], queryFn: () => listFaqs({ activeOnly: true }) });

  return (
    <PageContainer
      title={`Selamat datang, ${profile?.full_name?.split(' ')[0] ?? ''}`}
      description="Akses cepat ke asisten dan informasi fakultas."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="card group p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <s.icon size={22} />
            </span>
            <h3 className="mt-3 font-semibold text-slate-800">{s.title}</h3>
            <p className="text-sm text-slate-500">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent conversations */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Percakapan Terbaru</h3>
            <Link to="/app/history" className="text-sm font-medium text-brand-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          {convQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : convQ.data && convQ.data.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {convQ.data.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/app/history/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-600"
                  >
                    <span className="truncate text-sm text-slate-700">{c.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {relativeTime(c.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada percakapan. Mulai bertanya sekarang.
            </p>
          )}
        </div>

        {/* Popular FAQ */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Pertanyaan Populer</h3>
            <Link to="/app/info" className="text-sm font-medium text-brand-600 hover:underline">
              Semua FAQ
            </Link>
          </div>
          {faqQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <ul className="space-y-1">
              {faqQ.data?.slice(0, 5).map((f) => (
                <li key={f.id}>
                  <Link
                    to="/app/chat"
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600"
                  >
                    <ArrowRight size={14} className="shrink-0 text-slate-300" />
                    <span className="truncate">{f.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
