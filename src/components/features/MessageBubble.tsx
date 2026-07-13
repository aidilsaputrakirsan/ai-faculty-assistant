import { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown, FileText, HelpCircle, Building2, Bot, User } from 'lucide-react';
import type { Message, MessageSource } from '../../lib/types';
import { useToast } from '../../context/ToastContext';

const SOURCE_ICON = {
  faq: HelpCircle,
  document: FileText,
  unit: Building2,
};
const SOURCE_LABEL = {
  faq: 'FAQ',
  document: 'Dokumen',
  unit: 'Unit',
};

export function MessageBubble({
  message,
  feedbackRating,
  onFeedback,
}: {
  message: Message;
  feedbackRating?: -1 | 1 | null;
  onFeedback?: (rating: -1 | 1) => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Jawaban disalin.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Gagal menyalin.');
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
          <p className="whitespace-pre-line">{message.content}</p>
        </div>
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <User size={16} />
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <Bot size={16} />
      </span>
      <div className="max-w-[85%] space-y-3">
        <div
          className={`rounded-2xl rounded-tl-sm border px-4 py-3 text-sm ${
            message.needs_human
              ? 'border-amber-200 bg-amber-50 text-slate-700'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {message.needs_human && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <Building2 size={14} /> Perlu konfirmasi ke petugas
            </p>
          )}
          <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
        </div>

        {message.sources.length > 0 && <SourceList sources={message.sources} />}

        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Disalin' : 'Salin'}
          </button>
          {onFeedback && (
            <>
              <button
                onClick={() => onFeedback(1)}
                aria-label="Jawaban membantu"
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-slate-100 ${
                  feedbackRating === 1 ? 'text-green-600' : 'text-slate-500'
                }`}
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={() => onFeedback(-1)}
                aria-label="Jawaban kurang membantu"
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-slate-100 ${
                  feedbackRating === -1 ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                <ThumbsDown size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: MessageSource[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1.5 text-xs font-semibold text-slate-500">Sumber informasi</p>
      <ul className="space-y-1">
        {sources.map((s, i) => {
          const Icon = SOURCE_ICON[s.type];
          return (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <Icon size={13} className="shrink-0 text-slate-400" />
              <span className="font-medium text-slate-400">{SOURCE_LABEL[s.type]}:</span>
              <span className="truncate">{s.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
