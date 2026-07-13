import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateProfile } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Field, Badge } from '../../components/ui';
import { initials, formatDate } from '../../lib/format';

export default function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [programStudi, setProgramStudi] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setProgramStudi(profile?.program_studi ?? '');
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!fullName.trim()) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        program_studi: programStudi.trim(),
      });
      await refreshProfile();
      toast.success('Profil diperbarui.');
    } catch {
      toast.error('Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Profil Saya" description="Kelola informasi akun Anda.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 text-center lg:col-span-1">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {initials(profile?.full_name || 'U')}
          </span>
          <h2 className="mt-3 font-semibold text-slate-800">{profile?.full_name}</h2>
          <p className="text-sm text-slate-500">{session?.user.email}</p>
          <div className="mt-3">
            <Badge color={profile?.role === 'admin' ? 'brand' : 'slate'}>
              {profile?.role === 'admin' ? 'Administrator' : 'Pengguna'}
            </Badge>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Bergabung {formatDate(profile?.created_at)}
          </p>
        </div>

        <form onSubmit={handleSave} className="card space-y-4 p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-800">Informasi Pribadi</h3>
          <Field label="Nama lengkap">
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Email tidak dapat diubah dari halaman ini.">
            <input className="input bg-slate-50" value={session?.user.email ?? ''} disabled />
          </Field>
          <Field label="Program Studi">
            <input
              className="input"
              value={programStudi}
              onChange={(e) => setProgramStudi(e.target.value)}
              placeholder="mis. Teknik Informatika"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
