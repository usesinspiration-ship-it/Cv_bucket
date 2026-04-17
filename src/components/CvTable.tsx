import { ExternalLink, Eye, Trash2 } from 'lucide-react'
import type { CVRecord } from '../types/cv'
import { formatDate, formatFileSize, highlightText } from '../utils/format'

interface CvTableProps {
  items: CVRecord[]
  selectedId?: string
  query: string
  onSelect: (cv: CVRecord) => void
  onDelete: (cv: CVRecord) => Promise<void>
}

export function CvTable({ items, selectedId, query, onSelect, onDelete }: CvTableProps) {
  return (
    <div className="glass-panel overflow-hidden border-none shadow-panel">
      <div className="space-y-3 p-4 md:hidden">
        {items.map((cv) => (
          <article
            key={cv.id}
            className={`rounded-3xl border p-5 transition-all duration-300 ${
              selectedId === cv.id
                ? 'border-brand-500/30 bg-brand-500/5 shadow-glow'
                : 'border-slate-100 bg-white/50 hover:bg-white hover:shadow-card'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(cv)}
                  className="block text-left text-lg font-bold text-slate-900 transition-colors hover:text-brand-600"
                >
                  {highlightText(cv.name || 'Unnamed candidate', query)}
                </button>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <span className="truncate">{cv.email || 'No email found'}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="whitespace-nowrap">{formatDate(cv.createdAt)}</span>
                </div>
              </div>
            </div>

            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
              {highlightText(cv.rawText.slice(0, 160) || 'No preview available', query)}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="max-w-[120px] truncate text-xs font-bold text-slate-400">
                  {cv.fileName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                  {formatFileSize(cv.fileSize)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(cv)}
                  className="btn-secondary h-10 w-10 p-0"
                  aria-label={`View ${cv.name}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <a
                  href={cv.downloadUrl ?? cv.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary h-10 w-10 p-0"
                  aria-label={`Open ${cv.fileName}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onDelete(cv)}
                  className="btn-secondary h-10 w-10 p-0 text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Delete ${cv.fileName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-6 py-4 min-w-[240px]">Candidate</th>
              <th className="px-6 py-4 min-w-[120px]">Indexed</th>
              <th className="px-6 py-4 min-w-[160px]">File Spec</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white/40 text-sm">
            {items.map((cv) => (
              <tr
                key={cv.id}
                className={`group transition-all duration-300 hover:bg-white/80 ${
                  selectedId === cv.id ? 'bg-brand-500/5' : ''
                }`}
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelect(cv)}
                      className="w-fit text-left text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600"
                    >
                      {highlightText(cv.name || 'Unnamed candidate', query)}
                    </button>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <span>{cv.email || 'No email found'}</span>
                    </div>
                    <span className="line-clamp-1 max-w-md text-xs leading-relaxed text-slate-500">
                      {highlightText(cv.rawText.slice(0, 120) || 'No preview available', query)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs font-bold text-slate-500">
                    {formatDate(cv.createdAt)}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="max-w-[150px] truncate text-xs font-bold text-slate-700">
                      {cv.fileName}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {formatFileSize(cv.fileSize)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onSelect(cv)}
                      className="btn-secondary h-9 w-9 p-0"
                      aria-label={`View ${cv.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <a
                      href={cv.downloadUrl ?? cv.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary h-9 w-9 p-0"
                      aria-label={`Open ${cv.fileName}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDelete(cv)}
                      className="btn-secondary h-9 w-9 p-0 text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${cv.fileName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
