import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  HelpCircle,
  FileText,
  MessageSquare,
  CalendarClock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
} from 'lucide-react';
import { getAdminStats } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, ErrorState } from '../../components/ui';
import { StatCard, BarChart } from '../../components/features/StatCard';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data)
    return (
      <PageContainer title="Dashboard Admin">
        <ErrorState message="Gagal memuat statistik." onRetry={() => q.refetch()} />
      </PageContainer>
    );

  const s = q.data;
  const usageData = s.usage_last_7_days.map((d) => ({
    label: WEEKDAYS[new Date(d.day).getDay()] + ' ' + new Date(d.day).getDate(),
    value: d.count,
  }));
  const catData = s.top_categories.map((c) => ({ label: c.name, value: c.count }));

  return (
    <PageContainer title="Dashboard Admin" description="Ringkasan penggunaan sistem.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pengguna" value={s.total_users} icon={<Users size={22} />} />
        <StatCard label="FAQ Aktif" value={s.active_faqs} icon={<HelpCircle size={22} />} accent="green" />
        <StatCard label="Dokumen" value={s.total_documents} icon={<FileText size={22} />} accent="amber" />
        <StatCard
          label="Total Percakapan"
          value={s.total_conversations}
          icon={<MessageSquare size={22} />}
          accent="slate"
        />
        <StatCard
          label="Pertanyaan Hari Ini"
          value={s.questions_today}
          icon={<CalendarClock size={22} />}
        />
        <StatCard
          label="Feedback Positif"
          value={s.feedback_positive}
          icon={<ThumbsUp size={22} />}
          accent="green"
        />
        <StatCard
          label="Feedback Negatif"
          value={s.feedback_negative}
          icon={<ThumbsDown size={22} />}
          accent="red"
        />
        <StatCard
          label="Tidak Terjawab"
          value={s.unanswered}
          icon={<AlertCircle size={22} />}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800">Penggunaan 7 Hari Terakhir</h3>
          <BarChart data={usageData} />
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800">Kategori Terbanyak Ditanyakan</h3>
          {catData.length ? (
            <BarChart data={catData} color="bg-green-500" />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada data kategori.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/faqs/new" className="btn-primary">
          Tambah FAQ
        </Link>
        <Link to="/admin/documents" className="btn-secondary">
          Kelola Dokumen
        </Link>
        <Link to="/admin/feedback" className="btn-secondary">
          Lihat Feedback
        </Link>
      </div>
    </PageContainer>
  );
}
