import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { listConversations, deleteConversation } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Button } from '../../components/ui';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { relativeTime } from '../../lib/format';

export default function HistoryPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['conversations'], queryFn: listConversations });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteConversation(toDelete);
      toast.success('Percakapan dihapus.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setToDelete(null);
    } catch {
      toast.error('Gagal menghapus percakapan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Riwayat Percakapan"
      description="Percakapan Anda dengan asisten fakultas."
      actions={
        <Link to="/app/chat" className="btn-primary">
          <Plus size={16} /> Percakapan Baru
        </Link>
      }
    >
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat riwayat." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          title="Belum ada percakapan"
          description="Mulai bertanya kepada asisten untuk melihat riwayat di sini."
          action={
            <Link to="/app/chat" className="btn-primary">
              Mulai Chat
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {q.data.map((c) => (
            <div key={c.id} className="card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <MessageSquare size={18} />
              </span>
              <Link to={`/app/history/${c.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-400">Diperbarui {relativeTime(c.updated_at)}</p>
              </Link>
              <Button variant="ghost" onClick={() => setToDelete(c.id)} aria-label="Hapus">
                <Trash2 size={16} className="text-slate-400" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        message="Yakin ingin menghapus percakapan ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </PageContainer>
  );
}
