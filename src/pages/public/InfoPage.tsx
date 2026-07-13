import { FaqBrowser } from '../../components/features/FaqBrowser';
import { PageContainer } from '../../components/layout/PageContainer';

export default function InfoPage({ embedded = false }: { embedded?: boolean }) {
  const content = (
    <>
      <FaqBrowser />
    </>
  );

  if (embedded) {
    return (
      <PageContainer
        title="Informasi Umum"
        description="Kumpulan pertanyaan yang sering diajukan seputar layanan fakultas."
      >
        {content}
      </PageContainer>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Informasi Umum</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kumpulan pertanyaan yang sering diajukan seputar layanan fakultas.
      </p>
      <div className="mt-6">{content}</div>
    </div>
  );
}
