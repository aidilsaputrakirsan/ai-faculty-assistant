import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { listUnits, createUnit, updateUnit, deleteUnit, logActivity } from '../../lib/api';
import type { Unit } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Button, Field, StatusBadge } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';

const emptyForm = {
  name: '',
  description: '',
  location: '',
  email: '',
  phone: '',
  whatsapp: '',
  office_hours: '',
  is_active: true,
};

export default function AdminUnits() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['units-all'], queryFn: () => listUnits(false) });

  const [editing, setEditing] = useState<Unit | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['units-all'] });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };
  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({
      name: u.name,
      description: u.description ?? '',
      location: u.location ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      whatsapp: u.whatsapp ?? '',
      office_hours: u.office_hours ?? '',
      is_active: u.is_active,
    });
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Nama unit wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editing) {
        await updateUnit(editing.id, payload);
        if (profile) await logActivity(profile.id, 'update', 'unit', editing.id);
        toast.success('Unit diperbarui.');
      } else {
        const u = await createUnit(payload);
        if (profile) await logActivity(profile.id, 'create', 'unit', u.id);
        toast.success('Unit ditambahkan.');
      }
      invalidate();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan unit.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteUnit(toDelete);
      if (profile) await logActivity(profile.id, 'delete', 'unit', toDelete);
      toast.success('Unit dihapus.');
      invalidate();
      setToDelete(null);
    } catch {
      toast.error('Gagal menghapus unit.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Manajemen Kontak Unit"
      description="Kelola data unit pelayanan fakultas."
      actions={
        <Button onClick={openNew}>
          <Plus size={16} /> Tambah Unit
        </Button>
      }
    >
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat unit." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada unit" action={<Button onClick={openNew}>Tambah Unit</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 size={17} />
                  </span>
                  <h3 className="font-semibold text-slate-800">{u.name}</h3>
                </div>
                <StatusBadge active={u.is_active} />
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                {u.email && <p>{u.email}</p>}
                {u.phone && <p>{u.phone}</p>}
                {u.office_hours && <p className="text-xs">{u.office_hours}</p>}
              </div>
              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                <Button variant="ghost" onClick={() => openEdit(u)} aria-label="Edit">
                  <Pencil size={15} className="text-slate-500" />
                </Button>
                <Button variant="ghost" onClick={() => setToDelete(u.id)} aria-label="Hapus">
                  <Trash2 size={15} className="text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Unit' : 'Tambah Unit'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nama unit" error={error}>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Deskripsi">
              <textarea
                className="input min-h-[60px] resize-none"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Lokasi">
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Jam layanan">
            <input
              className="input"
              value={form.office_hours}
              onChange={(e) => set('office_hours', e.target.value)}
              placeholder="Senin-Jumat 08.00-15.00"
            />
          </Field>
          <Field label="Email">
            <input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Telepon">
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <input className="input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Aktif
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowForm(false)}>
            Batal
          </Button>
          <Button onClick={save} loading={saving}>
            Simpan
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        message="Yakin ingin menghapus unit ini?"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </PageContainer>
  );
}
