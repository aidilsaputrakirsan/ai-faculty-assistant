import { useQuery } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { listAllFeedback } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Badge } from '../../components/ui';
import { formatDateTime } from '../../lib/format';

export default function AdminFeedback() {
  const q = useQuery({ queryKey: ['admin-feedback'], queryFn: listAllFeedback });

  return (
    <PageContainer title="Feedback Pengguna" description="Masukan pengguna terhadap jawaban asisten.">
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat feedback." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada feedback" description="Feedback pengguna akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {q.data.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {f.message?.content ?? '(pesan tidak tersedia)'}
                  </p>
                  {f.comment && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                      “{f.comment}”
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(f.created_at)}</p>
                </div>
                <div className="shrink-0">
                  {f.rating === 1 ? (
                    <Badge color="green">
                      <ThumbsUp size={12} className="mr-1" /> Positif
                    </Badge>
                  ) : (
                    <Badge color="red">
                      <ThumbsDown size={12} className="mr-1" /> Negatif
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
