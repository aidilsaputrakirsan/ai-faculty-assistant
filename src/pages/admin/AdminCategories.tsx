import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  logActivity,
} from '../../lib/api';
import type { Category } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Button, Field, StatusBadge } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function AdminCategories() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['categories-all'], queryFn: () => listCategories(false) });

  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories-all'] });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', is_active: true });
    setError('');
    setShowForm(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '', is_active: c.is_active });
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Nama kategori wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim(),
        is_active: form.is_active,
      };
      if (editing) {
        await updateCategory(editing.id, payload);
        if (profile) await logActivity(profile.id, 'update', 'category', editing.id);
        toast.success('Kategori diperbarui.');
      } else {
        const c = await createCategory(payload);
        if (profile) await logActivity(profile.id, 'create', 'category', c.id);
        toast.success('Kategori ditambahkan.');
      }
      invalidate();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(toDelete);
      if (profile) await logActivity(profile.id, 'delete', 'category', toDelete);
      toast.success('Kategori dihapus.');
      invalidate();
      setToDelete(null);
    } catch {
      toast.error('Gagal menghapus. Kategori mungkin masih dipakai FAQ/dokumen.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Manajemen Kategori"
      description="Kategori mengelompokkan FAQ dan dokumen."
      actions={
        <Button onClick={openNew}>
          <Plus size={16} /> Tambah Kategori
        </Button>
      }
    >
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat kategori." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada kategori" action={<Button onClick={openNew}>Tambah Kategori</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{c.name}</h3>
                <StatusBadge active={c.is_active} />
              </div>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                {c.description || '—'}
              </p>
              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                <Button variant="ghost" onClick={() => openEdit(c)} aria-label="Edit">
                  <Pencil size={15} className="text-slate-500" />
                </Button>
                <Button variant="ghost" onClick={() => setToDelete(c.id)} aria-label="Hapus">
                  <Trash2 size={15} className="text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <div className="space-y-4">
          <Field label="Nama kategori" error={error}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="mis. Akademik"
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Aktif
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button onClick={save} loading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        message="Yakin ingin menghapus kategori ini?"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </PageContainer>
  );
}
