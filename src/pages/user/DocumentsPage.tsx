import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Search } from 'lucide-react';
import { listDocuments, getDocumentUrl } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, EmptyState, ErrorState, Badge, Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/format';

export default function DocumentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['documents-public'], queryFn: () => listDocuments(false) });

  const openDoc = async (storagePath: string | null) => {
    if (!storagePath) {
      toast.info('Berkas dokumen belum tersedia untuk diunduh.');
      return;
    }
    const url = await getDocumentUrl(storagePath);
    if (url) window.open(url, '_blank');
    else toast.error('Gagal membuka dokumen.');
  };

  const filtered = (q.data ?? []).filter((d) =>
    d.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <PageContainer
      title="Sumber & Dokumen"
      description="Dokumen resmi fakultas yang dapat diakses publik."
    >
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Cari dokumen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {q.isLoading ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState message="Gagal memuat dokumen." onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Tidak ada dokumen ditemukan" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((d) => (
            <div key={d.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800">{d.title}</h3>
                  {d.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{d.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {d.category && <Badge color="brand">{d.category.name}</Badge>}
                {d.year && <Badge>{d.year}</Badge>}
                {d.doc_number && <Badge>No. {d.doc_number}</Badge>}
                {d.version && <Badge>v{d.version}</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">Berlaku {formatDate(d.effective_date)}</span>
                <Button variant="secondary" onClick={() => openDoc(d.storage_path)}>
                  <Download size={15} /> Buka
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
