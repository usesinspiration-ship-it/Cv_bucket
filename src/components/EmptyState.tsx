import { FileSearch } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="rounded-3xl bg-brand-50 p-4 text-brand-700">
        <FileSearch className="h-8 w-8" />
      </div>
      <p className="mt-5 font-display text-2xl text-slate-900">{title}</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  )
}
