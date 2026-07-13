import { useQuery } from '@tanstack/react-query';
import { listActivityLogs } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Badge } from '../../components/ui';
import { formatDateTime } from '../../lib/format';

const ACTION_COLOR: Record<string, 'green' | 'amber' | 'red' | 'brand'> = {
  create: 'green',
  update: 'brand',
  activate: 'green',
  deactivate: 'amber',
  delete: 'red',
};

export default function AdminLogs() {
  const q = useQuery({ queryKey: ['activity-logs'], queryFn: () => listActivityLogs(200) });

  return (
    <PageContainer title="Log Aktivitas" description="Riwayat perubahan yang dilakukan admin.">
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat log." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada aktivitas tercatat" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium">Entitas</th>
                <th className="px-4 py-3 font-medium">ID Entitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={ACTION_COLOR[log.action] ?? 'slate'}>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{log.entity}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {log.entity_id?.slice(0, 8) ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
