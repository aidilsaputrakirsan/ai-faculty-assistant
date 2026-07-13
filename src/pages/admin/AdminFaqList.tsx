import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Power } from 'lucide-react';
import { listFaqs, listCategories, deleteFaq, updateFaq, logActivity } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Button, StatusBadge, Badge } from '../../components/ui';
import { ConfirmDialog } from '../../components/ui/Modal';

export default function AdminFaqList() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoriesQ = useQuery({ queryKey: ['categories-all'], queryFn: () => listCategories(false) });
  const faqsQ = useQuery({
    queryKey: ['admin-faqs', search, categoryId, status],
    queryFn: () => listFaqs({ search, categoryId, status }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    queryClient.invalidateQueries({ queryKey: ['faqs-public'] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await updateFaq(id, { is_active: !current });
      if (profile) await logActivity(profile.id, current ? 'deactivate' : 'activate', 'faq', id);
      toast.success(current ? 'FAQ dinonaktifkan.' : 'FAQ diaktifkan.');
      invalidate();
    } catch {
      toast.error('Gagal mengubah status.');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFaq(toDelete);
      if (profile) await logActivity(profile.id, 'delete', 'faq', toDelete);
      toast.success('FAQ dihapus.');
      invalidate();
      setToDelete(null);
    } catch {
      toast.error('Gagal menghapus FAQ.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Manajemen FAQ"
      description="Kelola pertanyaan dan jawaban resmi fakultas."
      actions={
        <Link to="/admin/faqs/new" className="btn-primary">
          <Plus size={16} /> Tambah FAQ
        </Link>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari pertanyaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Semua kategori</option>
          {categoriesQ.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {faqsQ.isLoading ? (
        <PageLoader />
      ) : faqsQ.isError ? (
        <ErrorState message="Gagal memuat FAQ." onRetry={() => faqsQ.refetch()} />
      ) : !faqsQ.data?.length ? (
        <EmptyState
          title="Belum ada FAQ"
          description="Tambahkan FAQ pertama untuk mulai membangun basis pengetahuan."
          action={
            <Link to="/admin/faqs/new" className="btn-primary">
              Tambah FAQ
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {faqsQ.data.map((f) => (
            <div key={f.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{f.question}</p>
                <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{f.answer}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {f.category && <Badge color="brand">{f.category.name}</Badge>}
                  <StatusBadge active={f.is_active} />
                  <Badge>Prioritas {f.priority}</Badge>
                  {f.unit && <Badge>{f.unit.name}</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  onClick={() => toggleActive(f.id, f.is_active)}
                  aria-label="Aktif/Nonaktif"
                >
                  <Power size={16} className={f.is_active ? 'text-green-600' : 'text-slate-400'} />
                </Button>
                <Link to={`/admin/faqs/${f.id}`} className="btn-ghost" aria-label="Edit">
                  <Pencil size={16} className="text-slate-500" />
                </Link>
                <Button variant="ghost" onClick={() => setToDelete(f.id)} aria-label="Hapus">
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        message="Yakin ingin menghapus FAQ ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </PageContainer>
  );
}
