import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import { BarChart } from '../../components/features/StatCard';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function AdminStats() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data)
    return (
      <PageContainer title="Statistik Penggunaan">
        <ErrorState message="Gagal memuat statistik." onRetry={() => q.refetch()} />
      </PageContainer>
    );

  const s = q.data;
  const totalFeedback = s.feedback_positive + s.feedback_negative;
  const positivePct = totalFeedback ? Math.round((s.feedback_positive / totalFeedback) * 100) : 0;
  const usageData = s.usage_last_7_days.map((d) => ({
    label: WEEKDAYS[new Date(d.day).getDay()] + ' ' + new Date(d.day).getDate(),
    value: d.count,
  }));
  const totalWeek = usageData.reduce((a, b) => a + b.value, 0);

  return (
    <PageContainer
      title="Statistik Penggunaan"
      description="Analisis penggunaan asisten dan kualitas jawaban."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-semibold text-slate-800">Volume Pertanyaan (7 hari)</h3>
            <span className="text-sm text-slate-500">Total: {totalWeek}</span>
          </div>
          <BarChart data={usageData} />
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800">Kepuasan Jawaban</h3>
          {totalFeedback === 0 ? (
            <EmptyState title="Belum ada feedback" />
          ) : (
            <div>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-bold text-green-600">{positivePct}%</span>
                <span className="text-sm text-slate-500">{totalFeedback} feedback</span>
              </div>
              <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-green-500" style={{ width: `${positivePct}%` }} />
                <div className="bg-red-400" style={{ width: `${100 - positivePct}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-green-600">Positif: {s.feedback_positive}</span>
                <span className="text-red-500">Negatif: {s.feedback_negative}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800">Kategori Terbanyak Ditanyakan</h3>
          {s.top_categories.length ? (
            <BarChart
              data={s.top_categories.map((c) => ({ label: c.name, value: c.count }))}
              color="bg-brand-500"
            />
          ) : (
            <EmptyState title="Belum ada data kategori" />
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-slate-800">Ringkasan</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Total Pengguna', s.total_users],
              ['FAQ Aktif', s.active_faqs],
              ['Dokumen', s.total_documents],
              ['Percakapan', s.total_conversations],
              ['Pertanyaan Hari Ini', s.questions_today],
              ['Tidak Terjawab', s.unanswered],
            ].map(([label, val]) => (
              <div key={label as string}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-xl font-bold text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </PageContainer>
  );
}
