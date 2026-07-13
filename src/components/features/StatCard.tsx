import { type ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: 'brand' | 'green' | 'red' | 'amber' | 'slate';
}) {
  const accentMap = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accentMap[accent]}`}>
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// Minimal dependency-free bar chart for the 7-day usage and top categories.
export function BarChart({
  data,
  color = 'bg-brand-500',
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-slate-500">{d.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className={`h-full rounded ${color}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-600">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}
