import { useQuery } from '@tanstack/react-query';
import { MapPin, Mail, Phone, MessageCircle, Clock, Building2 } from 'lucide-react';
import { listUnits } from '../../lib/api';
import { PageLoader, EmptyState, ErrorState } from '../ui';

export function ContactsList() {
  const unitsQ = useQuery({ queryKey: ['units-public'], queryFn: () => listUnits(true) });

  if (unitsQ.isLoading) return <PageLoader />;
  if (unitsQ.isError)
    return <ErrorState message="Gagal memuat kontak unit." onRetry={() => unitsQ.refetch()} />;
  if (!unitsQ.data?.length)
    return <EmptyState title="Belum ada data kontak unit" />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {unitsQ.data.map((u) => (
        <div key={u.id} className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Building2 size={18} />
            </span>
            <h3 className="font-semibold text-slate-800">{u.name}</h3>
          </div>
          {u.description && <p className="mb-3 text-sm text-slate-500">{u.description}</p>}
          <ul className="space-y-1.5 text-sm text-slate-600">
            {u.location && (
              <li className="flex items-center gap-2">
                <MapPin size={15} className="text-slate-400" /> {u.location}
              </li>
            )}
            {u.email && (
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-slate-400" />
                <a href={`mailto:${u.email}`} className="text-brand-600 hover:underline">
                  {u.email}
                </a>
              </li>
            )}
            {u.phone && (
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-slate-400" /> {u.phone}
              </li>
            )}
            {u.whatsapp && (
              <li className="flex items-center gap-2">
                <MessageCircle size={15} className="text-slate-400" /> WhatsApp: {u.whatsapp}
              </li>
            )}
            {u.office_hours && (
              <li className="flex items-center gap-2">
                <Clock size={15} className="text-slate-400" /> {u.office_hours}
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
