import type { ReactNode } from 'react'

export function StatCard({
  icon,
  label,
  value,
  trend,
  tone = 'brand',
}: {
  icon: ReactNode
  label: string
  value: string
  trend?: {
    value: string
    positive: boolean
  }
  tone?: 'brand' | 'accent' | 'neutral'
}) {
  return (
    <div className="glass-panel group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-500/5 transition-transform duration-500 group-hover:scale-150" />

      <div className="flex items-start justify-between">
        <div
          className={`rounded-2xl p-3 shadow-sm ring-1 ring-inset ${
            tone === 'brand'
              ? 'bg-brand-50 text-brand-600 ring-brand-600/10'
              : tone === 'accent'
                ? 'bg-orange-50 text-orange-600 ring-orange-600/10'
                : 'bg-slate-50 text-slate-600 ring-slate-600/10'
          }`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
              trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.positive ? '+' : '-'}
            {trend.value}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="font-display text-3xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
