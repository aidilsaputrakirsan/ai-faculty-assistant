import { GraduationCap } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
        <GraduationCap size={20} />
      </span>
      {!compact && (
        <span className="text-sm font-bold leading-tight text-slate-800">
          AI Faculty
          <br />
          <span className="font-medium text-slate-500">Assistant</span>
        </span>
      )}
    </div>
  );
}
