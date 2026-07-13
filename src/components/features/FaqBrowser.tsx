import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search } from 'lucide-react';
import { listFaqs, listCategories } from '../../lib/api';
import { PageLoader, EmptyState, ErrorState, Badge } from '../ui';

// Public/read-only FAQ browser with search + category filter and accordion.
export function FaqBrowser() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: () => listCategories(true) });
  const faqsQ = useQuery({
    queryKey: ['faqs-public'],
    queryFn: () => listFaqs({ activeOnly: true }),
  });

  const filtered = useMemo(() => {
    const list = faqsQ.data ?? [];
    return list.filter((f) => {
      const matchCat = !categoryId || f.category_id === categoryId;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [faqsQ.data, categoryId, search]);

  if (faqsQ.isLoading) return <PageLoader />;
  if (faqsQ.isError) return <ErrorState message="Gagal memuat informasi." onRetry={() => faqsQ.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari pertanyaan atau kata kunci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-64"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Semua kategori</option>
          {categoriesQ.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada informasi ditemukan"
          description="Coba ubah kata kunci atau kategori pencarian Anda."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="card overflow-hidden">
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : f.id)}
                  aria-expanded={open}
                >
                  <span className="flex-1 text-sm font-medium text-slate-800">{f.question}</span>
                  <div className="flex items-center gap-2">
                    {f.category && <Badge color="brand">{f.category.name}</Badge>}
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <p className="whitespace-pre-line text-sm text-slate-600">{f.answer}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {f.reference && <span>Sumber: {f.reference}</span>}
                      {f.unit && (
                        <span className="text-slate-500">• Unit: {f.unit.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
