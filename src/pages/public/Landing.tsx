import { Link } from 'react-router-dom';
import {
  MessageSquare,
  ShieldCheck,
  FileSearch,
  BadgeCheck,
  Clock,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Tanya Jawab Cerdas',
    desc: 'Ajukan pertanyaan akademik dan administrasi, dapatkan jawaban ringkas berbahasa Indonesia.',
  },
  {
    icon: FileSearch,
    title: 'Berbasis Data Resmi',
    desc: 'Jawaban diambil dari FAQ dan dokumen resmi fakultas, lengkap dengan sumbernya.',
  },
  {
    icon: ShieldCheck,
    title: 'Tidak Mengarang',
    desc: 'Bila informasi belum pasti, sistem mengarahkan Anda ke unit terkait, bukan menebak.',
  },
  {
    icon: BadgeCheck,
    title: 'Sumber Transparan',
    desc: 'Setiap jawaban menampilkan FAQ, dokumen, atau unit yang menjadi rujukan.',
  },
  {
    icon: Clock,
    title: 'Layanan 24 Jam',
    desc: 'Akses informasi kapan saja tanpa menunggu jam kerja loket.',
  },
  {
    icon: Users,
    title: 'Untuk Seluruh Civitas',
    desc: 'Mahasiswa, dosen, tenaga kependidikan, dan admin dalam satu portal.',
  },
];

export default function Landing() {
  const { session } = useAuth();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-slate-50" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="badge bg-brand-100 text-brand-700">Asisten AI Fakultas</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Informasi akademik & layanan fakultas, dalam satu percakapan
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            AI Faculty Assistant membantu Anda menemukan informasi seputar akademik, administrasi,
            SOP, jadwal, hingga kontak unit — cepat, jelas, dan berdasarkan data resmi.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={session ? '/app/chat' : '/login'} className="btn-primary px-6 py-3 text-base">
              Mulai Bertanya
            </Link>
            <Link to="/info" className="btn-secondary px-6 py-3 text-base">
              Lihat Informasi Umum
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-800">Kenapa menggunakan asisten ini?</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-slate-800">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold text-slate-800">Cara kerja</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Ajukan pertanyaan', 'Tulis pertanyaan seputar layanan fakultas.'],
              ['2', 'Sistem mencari data', 'FAQ dan dokumen resmi ditelusuri sebagai konteks.'],
              ['3', 'Jawaban + sumber', 'Dapatkan jawaban ringkas dengan rujukannya.'],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-800">{t}</h3>
                <p className="mt-1 text-sm text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to={session ? '/app' : '/login'} className="btn-primary px-6 py-3">
              {session ? 'Buka Dashboard' : 'Masuk untuk mulai'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
