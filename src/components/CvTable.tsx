import { Edit2, ExternalLink, Eye, Trash2 } from 'lucide-react'
import type { CVRecord } from '../types/cv'
import { formatDate, formatFileSize, highlightText } from '../utils/format'

interface CvTableProps {
  items: CVRecord[]
  selectedId?: string
  query: string
  onSelect: (cv: CVRecord) => void
  onDelete: (cv: CVRecord) => Promise<void>
  onEdit?: (cv: CVRecord) => void
  onDoubleClick?: (cv: CVRecord) => void
}

export function CvTable({ items, selectedId, query, onSelect, onDelete, onEdit, onDoubleClick }: CvTableProps) {
  return (
    <div className="glass-panel overflow-hidden border-none shadow-panel">
      <div className="space-y-3 p-4 md:hidden">
        {items.map((cv) => (
          <article
            key={cv.id}
            className={`rounded-3xl border p-5 transition-all duration-300 cursor-pointer ${
              selectedId === cv.id
                ? 'border-brand-500/30 bg-brand-500/5 shadow-glow'
                : 'border-slate-100 bg-white/50 hover:bg-white hover:shadow-card'
            }`}
            onDoubleClick={() => onDoubleClick?.(cv)}
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
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-400">
                    uploaded by : - {highlightText(cv.uploaderEmail || 'Unknown', query)}
                  </span>
                  <span className="whitespace-nowrap">{formatDate(cv.createdAt)}</span>
                </div>
              </div>
            </div>


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
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(cv)}
                    className="btn-secondary h-10 w-10 p-0 text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                    aria-label={`Edit ${cv.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
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
              <th className="sticky right-0 z-10 bg-slate-50/90 px-6 py-4 text-right backdrop-blur-sm shadow-[-12px_0_15px_-3px_rgba(15,23,42,0.02)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white/40 text-sm">
            {items.map((cv) => (
              <tr
                key={cv.id}
                className={`group transition-all duration-300 hover:bg-white/80 cursor-pointer ${
                  selectedId === cv.id ? 'bg-brand-500/5' : ''
                }`}
                onDoubleClick={() => onDoubleClick?.(cv)}
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(cv)}
                      className="w-fit text-left text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600"
                    >
                      {highlightText(cv.name || 'Unnamed candidate', query)}
                    </button>
                    <span className="text-[11px] font-medium text-slate-400">
                      uploaded by : - {highlightText(cv.uploaderEmail || 'Unknown', query)}
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
                <td className="sticky right-0 z-10 bg-white/90 px-6 py-5 backdrop-blur-sm shadow-[-12px_0_15px_-3px_rgba(15,23,42,0.02)] group-hover:bg-white">
                  <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onSelect(cv)}
                      className="btn-secondary h-9 w-9 p-0"
                      aria-label={`View ${cv.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(cv)}
                        className="btn-secondary h-9 w-9 p-0 text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                        aria-label={`Edit ${cv.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
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
