import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { listUsers, adminUpdateUser, logActivity } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Badge, Button } from '../../components/ui';
import { formatDate, initials } from '../../lib/format';

export default function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['admin-users'], queryFn: listUsers });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const toggleRole = async (id: string, current: 'admin' | 'user') => {
    if (id === profile?.id) {
      toast.error('Anda tidak dapat mengubah peran akun sendiri.');
      return;
    }
    const next = current === 'admin' ? 'user' : 'admin';
    try {
      await adminUpdateUser(id, { role: next });
      if (profile) await logActivity(profile.id, 'update', 'user_role', id, { role: next });
      toast.success(`Peran diubah menjadi ${next}.`);
      invalidate();
    } catch {
      toast.error('Gagal mengubah peran.');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (id === profile?.id) {
      toast.error('Anda tidak dapat menonaktifkan akun sendiri.');
      return;
    }
    try {
      await adminUpdateUser(id, { is_active: !current });
      if (profile) await logActivity(profile.id, current ? 'deactivate' : 'activate', 'user', id);
      toast.success(current ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan.');
      invalidate();
    } catch {
      toast.error('Gagal mengubah status.');
    }
  };

  return (
    <PageContainer title="Manajemen Pengguna" description="Kelola peran dan status akun civitas.">
      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat pengguna." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="Belum ada pengguna" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {q.data.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(u.full_name || 'U')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">
                  {u.full_name}
                  {u.id === profile?.id && <span className="ml-2 text-xs text-slate-400">(Anda)</span>}
                </p>
                <p className="text-xs text-slate-400">
                  {u.program_studi || 'Program studi belum diisi'} • Bergabung {formatDate(u.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={u.role === 'admin' ? 'brand' : 'slate'}>
                  {u.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  onClick={() => toggleRole(u.id, u.role)}
                  aria-label="Ubah peran"
                  title="Ubah peran"
                >
                  {u.role === 'admin' ? (
                    <UserIcon size={16} className="text-slate-500" />
                  ) : (
                    <ShieldCheck size={16} className="text-brand-600" />
                  )}
                </Button>
                <Button variant="ghost" onClick={() => toggleActive(u.id, u.is_active)}>
                  <span className="text-xs">{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
