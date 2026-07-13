import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getFaq,
  createFaq,
  updateFaq,
  listCategories,
  listUnits,
  logActivity,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Field, PageLoader } from '../../components/ui';
import { validateFaq, hasErrors, type ValidationErrors } from '../../lib/validation';

interface FormState {
  question: string;
  answer: string;
  category_id: string;
  unit_id: string;
  keywords: string;
  reference: string;
  priority: number;
  is_active: boolean;
  effective_date: string;
  expiry_date: string;
}

const empty: FormState = {
  question: '',
  answer: '',
  category_id: '',
  unit_id: '',
  keywords: '',
  reference: '',
  priority: 0,
  is_active: true,
  effective_date: '',
  expiry_date: '',
};

export default function AdminFaqForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<ValidationErrors<FormState>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);

  const categoriesQ = useQuery({ queryKey: ['categories-all'], queryFn: () => listCategories(false) });
  const unitsQ = useQuery({ queryKey: ['units-all'], queryFn: () => listUnits(false) });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const f = await getFaq(id!);
        if (f) {
          setForm({
            question: f.question,
            answer: f.answer,
            category_id: f.category_id ?? '',
            unit_id: f.unit_id ?? '',
            keywords: f.keywords.join(', '),
            reference: f.reference ?? '',
            priority: f.priority,
            is_active: f.is_active,
            effective_date: f.effective_date ?? '',
            expiry_date: f.expiry_date ?? '',
          });
        }
      } catch {
        toast.error('Gagal memuat FAQ.');
      } finally {
        setLoaded(true);
      }
    })();
  }, [id, isEdit, toast]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFaq(form);
    setErrors(validation);
    if (hasErrors(validation)) return;

    setSaving(true);
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category_id: form.category_id || null,
      unit_id: form.unit_id || null,
      keywords: form.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      reference: form.reference.trim(),
      priority: Number(form.priority) || 0,
      is_active: form.is_active,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
      updated_by: profile?.id ?? null,
    };
    try {
      if (isEdit) {
        await updateFaq(id!, payload);
        if (profile) await logActivity(profile.id, 'update', 'faq', id);
        toast.success('FAQ diperbarui.');
      } else {
        const created = await createFaq({ ...payload, created_by: profile?.id ?? null });
        if (profile) await logActivity(profile.id, 'create', 'faq', created.id);
        toast.success('FAQ ditambahkan.');
      }
      navigate('/admin/faqs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan FAQ.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <PageLoader />;

  return (
    <PageContainer
      title={isEdit ? 'Edit FAQ' : 'Tambah FAQ'}
      description="Lengkapi informasi pertanyaan dan jawaban."
    >
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <Field label="Pertanyaan" error={errors.question}>
          <input
            className="input"
            value={form.question}
            onChange={(e) => update('question', e.target.value)}
            placeholder="mis. Apa syarat mengajukan seminar proposal?"
          />
        </Field>
        <Field label="Jawaban" error={errors.answer}>
          <textarea
            className="input min-h-[160px] resize-y"
            value={form.answer}
            onChange={(e) => update('answer', e.target.value)}
            placeholder="Tulis jawaban resmi. Gunakan poin bila perlu."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori" error={errors.category_id}>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => update('category_id', e.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categoriesQ.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit Terkait">
            <select
              className="input"
              value={form.unit_id}
              onChange={(e) => update('unit_id', e.target.value)}
            >
              <option value="">Tidak ada</option>
              {unitsQ.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Kata kunci" hint="Pisahkan dengan koma. Membantu pencarian.">
          <input
            className="input"
            value={form.keywords}
            onChange={(e) => update('keywords', e.target.value)}
            placeholder="seminar, proposal, syarat"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sumber / Referensi">
            <input
              className="input"
              value={form.reference}
              onChange={(e) => update('reference', e.target.value)}
              placeholder="mis. SOP Seminar Proposal"
            />
          </Field>
          <Field label="Prioritas" hint="Angka lebih tinggi tampil lebih dulu.">
            <input
              type="number"
              className="input"
              value={form.priority}
              onChange={(e) => update('priority', Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal berlaku">
            <input
              type="date"
              className="input"
              value={form.effective_date}
              onChange={(e) => update('effective_date', e.target.value)}
            />
          </Field>
          <Field label="Tanggal kedaluwarsa">
            <input
              type="date"
              className="input"
              value={form.expiry_date}
              onChange={(e) => update('expiry_date', e.target.value)}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Aktif (tampil untuk pengguna dan digunakan asisten)
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/faqs')}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Simpan Perubahan' : 'Tambah FAQ'}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
