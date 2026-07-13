import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Plus, Bot, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  listMessages,
  sendChat,
  submitFeedback,
  getFeedbackForMessages,
} from '../../lib/api';
import type { Message } from '../../lib/types';
import { MessageBubble } from '../../components/features/MessageBubble';
import { Modal } from '../../components/ui/Modal';
import { Button, Spinner } from '../../components/ui';

const SUGGESTIONS = [
  'Apa syarat mengajukan seminar proposal?',
  'Bagaimana cara mengisi KRS?',
  'Bagaimana cara mengajukan surat aktif kuliah?',
  'Kapan batas pembayaran UKT?',
];

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<Record<string, -1 | 1>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fbModal, setFbModal] = useState<{ messageId: string; rating: -1 | 1 } | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbSaving, setFbSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  // Load existing conversation messages when navigating to one.
  useEffect(() => {
    let active = true;
    if (!conversationId) {
      setMessages([]);
      setFeedback({});
      return;
    }
    setLoadingHistory(true);
    (async () => {
      try {
        const msgs = await listMessages(conversationId);
        if (!active) return;
        setMessages(msgs);
        const fb = await getFeedbackForMessages(msgs.map((m) => m.id));
        if (!active) return;
        const map: Record<string, -1 | 1> = {};
        fb.forEach((f) => (map[f.message_id] = f.rating));
        setFeedback(map);
      } catch {
        toast.error('Gagal memuat percakapan.');
      } finally {
        if (active) setLoadingHistory(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, toast]);

  useEffect(scrollToBottom, [messages, sending, scrollToBottom]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setInput('');

    // Optimistic user bubble.
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: conversationId ?? '',
      role: 'user',
      content: question,
      sources: [],
      needs_human: false,
      referred_unit_id: null,
      model: '',
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);

    try {
      const res = await sendChat(question, conversationId);
      // Reload from server to get canonical user + assistant messages.
      const msgs = await listMessages(res.conversationId);
      setMessages(msgs);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (!conversationId) {
        navigate(`/app/chat/${res.conversationId}`, { replace: true });
      }
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim pertanyaan.');
      setInput(question);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const openFeedback = (messageId: string, rating: -1 | 1) => {
    setFbComment('');
    setFbModal({ messageId, rating });
  };

  const saveFeedback = async () => {
    if (!fbModal || !profile) return;
    setFbSaving(true);
    try {
      await submitFeedback(fbModal.messageId, profile.id, fbModal.rating, fbComment.trim());
      setFeedback((f) => ({ ...f, [fbModal.messageId]: fbModal.rating }));
      toast.success('Terima kasih atas masukannya.');
      setFbModal(null);
    } catch {
      toast.error('Gagal menyimpan feedback.');
    } finally {
      setFbSaving(false);
    }
  };

  const empty = messages.length === 0 && !loadingHistory;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Bot size={18} />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Asisten Fakultas</h1>
            <p className="text-xs text-slate-400">Jawaban berdasarkan data resmi</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/app/chat')}>
          <Plus size={16} /> Baru
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-thin bg-slate-50 px-4 py-6 lg:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {loadingHistory && (
            <div className="flex justify-center py-10">
              <Spinner className="text-brand-600" />
            </div>
          )}

          {empty && (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <Sparkles size={26} />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                Halo, {profile?.full_name?.split(' ')[0]} 👋
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Tanyakan seputar akademik, administrasi, jadwal, atau layanan fakultas. Jawaban akan
                menyertakan sumber resminya.
              </p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="card px-4 py-3 text-left text-sm text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              feedbackRating={feedback[m.id] ?? null}
              onFeedback={
                m.role === 'assistant' && !m.id.startsWith('tmp-')
                  ? (rating) => openFeedback(m.id, rating)
                  : undefined
              }
            />
          ))}

          {sending && (
            <div className="flex gap-3">
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Bot size={16} />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 lg:px-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            className="input max-h-40 min-h-[44px] flex-1 resize-none py-2.5"
            placeholder="Tulis pertanyaan Anda..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            disabled={sending}
          />
          <Button type="submit" loading={sending} disabled={!input.trim()} className="h-11">
            <Send size={16} />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
          Jawaban dapat mengandung ketidakakuratan. Konfirmasi hal penting ke unit terkait.
        </p>
      </div>

      {/* Feedback modal */}
      <Modal
        open={!!fbModal}
        onClose={() => setFbModal(null)}
        title={fbModal?.rating === 1 ? 'Jawaban membantu' : 'Beri masukan'}
      >
        <p className="text-sm text-slate-600">
          {fbModal?.rating === 1
            ? 'Senang jawaban ini membantu. Anda dapat menambahkan komentar (opsional).'
            : 'Mohon maaf jika kurang membantu. Ceritakan apa yang bisa diperbaiki (opsional).'}
        </p>
        <textarea
          className="input mt-3 min-h-[90px] resize-none"
          placeholder="Komentar (opsional)"
          value={fbComment}
          onChange={(e) => setFbComment(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFbModal(null)} disabled={fbSaving}>
            Batal
          </Button>
          <Button onClick={saveFeedback} loading={fbSaving}>
            Kirim Feedback
          </Button>
        </div>
      </Modal>
    </div>
  );
}
