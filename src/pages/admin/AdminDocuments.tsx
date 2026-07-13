import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileText, Upload, ExternalLink } from 'lucide-react';
import {
  listDocuments,
  listCategories,
  listUnits,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  replaceDocumentContent,
  getDocumentContent,
  getDocumentUrl,
  logActivity,
} from '../../lib/api';
import type { FacultyDocument } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Button, Field, StatusBadge, Badge } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { validateDocument, validateDocumentFile, hasErrors, type ValidationErrors } from '../../lib/validation';

const emptyForm = {
  title: '',
  description: '',
  category_id: '',
  unit_id: '',
  year: new Date().getFullYear(),
  doc_number: '',
  version: '1.0',
  is_public: true,
  is_active: true,
  effective_date: '',
  content: '',
};
type FormState = typeof emptyForm;

export default function AdminDocuments() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const q = useQuery({ queryKey: ['documents-all'], queryFn: () => listDocuments(true) });
  const categoriesQ = useQuery({ queryKey: ['categories-all'], queryFn: () => listCategories(false) });
  const unitsQ = useQuery({ queryKey: ['units-all'], queryFn: () => listUnits(false) });

  const [editing, setEditing] = useState<FacultyDocument | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ValidationErrors<FormState>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents-all'] });
    queryClient.invalidateQueries({ queryKey: ['documents-public'] });
  };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setErrors({});
    setShowForm(true);
  };
  const openEdit = async (d: FacultyDocument) => {
    setEditing(d);
    setFile(null);
    setErrors({});
    setForm({
      title: d.title,
      description: d.description ?? '',
      category_id: d.category_id ?? '',
      unit_id: d.unit_id ?? '',
      year: d.year ?? new Date().getFullYear(),
      doc_number: d.doc_number ?? '',
      version: d.version ?? '1.0',
      is_public: d.is_public,
      is_active: d.is_active,
      effective_date: d.effective_date ?? '',
      content: '',
    });
    setShowForm(true);
    try {
      const content = await getDocumentContent(d.id);
      setForm((f) => ({ ...f, content }));
    } catch {
      /* non-blocking */
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateDocumentFile(f);
    if (err) {
      toast.error(err);
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const save = async () => {
    const v = validateDocument(form);
    setErrors(v);
    if (hasErrors(v)) return;
    setSaving(true);
    try {
      let storagePath: string | undefined;
      if (file) storagePath = await uploadDocumentFile(file);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        year: Number(form.year) || null,
        doc_number: form.doc_number.trim(),
        version: form.version.trim(),
        is_public: form.is_public,
        is_active: form.is_active,
        effective_date: form.effective_date || null,
        updated_by: profile?.id ?? null,
        ...(storagePath ? { storage_path: storagePath } : {}),
      };

      let docId: string;
      if (editing) {
        const updated = await updateDocument(editing.id, payload);
        docId = updated.id;
        if (profile) await logActivity(profile.id, 'update', 'document', docId);
      } else {
        const created = await createDocument({ ...payload, created_by: profile?.id ?? null });
        docId = created.id;
        if (profile) await logActivity(profile.id, 'create', 'document', docId);
      }
      await replaceDocumentContent(docId, form.content);
      toast.success(editing ? 'Dokumen diperbarui.' : 'Dokumen ditambahkan.');
      invalidate();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan dokumen.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(toDelete);
      if (profile) await logActivity(profile.id, 'delete', 'document', toDelete);
      toast.success('Dokumen dihapus.');
      invalidate();
      setToDelete(null);
    } catch {
      toast.error('Gagal menghapus dokumen.');
    } finally {
      setDeleting(false);
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await getDocumentUrl(path);
    if (url) window.open(url, '_blank');
  };

  return (
    <PageContainer
      title="Manajemen Dokumen"
      description="Kelola dokumen resmi dan konten pengetahuan untuk asisten."
      actions={
        <Button onClick={openNew}>
          <Plus size={16} /> Tambah Dokumen
        </Button>
      }
    >
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat dokumen." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada dokumen" action={<Button onClick={openNew}>Tambah Dokumen</Button>} />
      ) : (
        <div className="card divide-y divide-slate-100">
          {q.data.map((d) => (
            <div key={d.id} className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileText size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{d.title}</p>
                <p className="line-clamp-1 text-sm text-slate-500">{d.description || '—'}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {d.category && <Badge color="brand">{d.category.name}</Badge>}
                  <StatusBadge active={d.is_active} />
                  <Badge color={d.is_public ? 'green' : 'amber'}>
                    {d.is_public ? 'Publik' : 'Internal'}
                  </Badge>
                  {d.version && <Badge>v{d.version}</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {d.storage_path && (
                  <Button variant="ghost" onClick={() => openFile(d.storage_path)} aria-label="Buka berkas">
                    <ExternalLink size={16} className="text-slate-500" />
                  </Button>
                )}
                <Button variant="ghost" onClick={() => openEdit(d)} aria-label="Edit">
                  <Pencil size={16} className="text-slate-500" />
                </Button>
                <Button variant="ghost" onClick={() => setToDelete(d.id)} aria-label="Hapus">
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Dokumen' : 'Tambah Dokumen'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Judul" error={errors.title}>
              <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
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
          <Field label="Kategori" error={errors.category_id}>
            <select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Pilih kategori</option>
              {categoriesQ.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit pemilik">
            <select className="input" value={form.unit_id} onChange={(e) => set('unit_id', e.target.value)}>
              <option value="">Tidak ada</option>
              {unitsQ.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tahun">
            <input
              type="number"
              className="input"
              value={form.year}
              onChange={(e) => set('year', Number(e.target.value))}
            />
          </Field>
          <Field label="Nomor dokumen">
            <input className="input" value={form.doc_number} onChange={(e) => set('doc_number', e.target.value)} />
          </Field>
          <Field label="Versi">
            <input className="input" value={form.version} onChange={(e) => set('version', e.target.value)} />
          </Field>
          <Field label="Tanggal berlaku">
            <input
              type="date"
              className="input"
              value={form.effective_date}
              onChange={(e) => set('effective_date', e.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Konten untuk pencarian AI"
              hint="Ringkasan/isi dokumen. Digunakan asisten sebagai konteks jawaban."
            >
              <textarea
                className="input min-h-[110px] resize-y"
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder="Tempel poin-poin penting dari dokumen di sini."
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Berkas PDF" hint="Maksimal 10 MB. Opsional saat mengedit.">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                <Upload size={16} />
                {file ? file.name : editing?.storage_path ? 'Ganti berkas (opsional)' : 'Pilih berkas PDF'}
                <input type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
              </label>
            </Field>
          </div>

          <div className="flex gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => set('is_public', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Publik
            </label>
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
        message="Yakin ingin menghapus dokumen ini beserta kontennya?"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </PageContainer>
  );
}
