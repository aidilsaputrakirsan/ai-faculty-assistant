import { ContactsList } from '../../components/features/ContactsList';
import { PageContainer } from '../../components/layout/PageContainer';

export default function ContactsPage({ embedded = false }: { embedded?: boolean }) {
  if (embedded) {
    return (
      <PageContainer
        title="Kontak Unit Pelayanan"
        description="Hubungi unit terkait untuk konfirmasi atau layanan langsung."
      >
        <ContactsList />
      </PageContainer>
    );
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Kontak Unit Pelayanan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hubungi unit terkait untuk konfirmasi atau layanan langsung.
      </p>
      <div className="mt-6">
        <ContactsList />
      </div>
    </div>
  );
}
