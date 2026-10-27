import { Coins, Download, Edit2, Eye, LoaderCircle, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
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
  onDownload?: (cv: CVRecord) => void
  downloadingCvId?: string | null
}

export function CvTable({
  items,
  selectedId,
  query,
  onSelect,
  onDelete,
  onEdit,
  onDoubleClick,
  onDownload,
  downloadingCvId,
}: CvTableProps) {
  return (
    <div className="glass-panel overflow-hidden border-none shadow-panel">
      {/* Mobile Card List */}
      <div className="space-y-3 p-4 md:hidden">
        {items.map((cv) => {
          const canDownload = Boolean(cv.isOwner || cv.canDownload || cv.hasUnlockedDownload)
          const canView = Boolean(cv.isOwner || cv.canView || cv.hasUnlockedView || cv.hasUnlockedDownload)

          return (
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(cv)}
                      className="block text-left text-lg font-bold text-slate-900 transition-colors hover:text-brand-600"
                    >
                      {highlightText(cv.name || 'Unnamed candidate', query)}
                    </button>
                    {cv.isOwner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                        <ShieldCheck className="h-3 w-3" />
                        Your Upload
                      </span>
                    )}
                    {!cv.isOwner && canView && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-brand-600/20">
                        <Sparkles className="h-3 w-3" />
                        Unlocked
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                    {cv.relevancy && (
                      <div className="mb-1.5 w-fit inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                        {cv.relevancy}% Relevancy
                      </div>
                    )}
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
                  {onEdit && (cv.isOwner || canView) && (
                    <button
                      type="button"
                      onClick={() => onEdit(cv)}
                      className="btn-secondary h-10 w-10 p-0 text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                      aria-label={`Edit ${cv.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={downloadingCvId === cv.id}
                    onClick={() => {
                      if (onDownload) {
                        onDownload(cv)
                      } else if (cv.downloadUrl) {
                        window.open(cv.downloadUrl, '_blank')
                      }
                    }}
                    className={`btn-secondary h-10 w-10 p-0 ${
                      canDownload
                        ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                        : 'text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                    }`}
                    title={canDownload ? 'Download PDF (Free/Unlocked)' : 'Download PDF (5 Coins)'}
                    aria-label={`Download ${cv.fileName}`}
                  >
                    {downloadingCvId === cv.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
                    ) : canDownload ? (
                      <Download className="h-4 w-4" />
                    ) : (
                      <Coins className="h-4 w-4" />
                    )}
                  </button>
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
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-6 py-4 min-w-[240px]">Candidate</th>
              {query && <th className="px-6 py-4 min-w-[150px]">Relevancy</th>}
              <th className="px-6 py-4 min-w-[120px]">Indexed</th>
              <th className="px-6 py-4 min-w-[160px]">File Spec</th>
              <th className="sticky right-0 z-10 bg-slate-50/90 px-6 py-4 text-right backdrop-blur-sm shadow-[-12px_0_15px_-3px_rgba(15,23,42,0.02)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white/40 text-sm">
            {items.map((cv) => {
              const canDownload = Boolean(cv.isOwner || cv.canDownload || cv.hasUnlockedDownload)
              const canView = Boolean(cv.isOwner || cv.canView || cv.hasUnlockedView || cv.hasUnlockedDownload)

              return (
                <tr
                  key={cv.id}
                  className={`group transition-all duration-300 hover:bg-white/80 cursor-pointer ${
                    selectedId === cv.id ? 'bg-brand-500/5' : ''
                  }`}
                  onDoubleClick={() => onDoubleClick?.(cv)}
                >
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelect(cv)}
                          className="w-fit text-left text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600"
                        >
                          {highlightText(cv.name || 'Unnamed candidate', query)}
                        </button>
                        {cv.isOwner && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                            <ShieldCheck className="h-3 w-3" />
                            Your Upload
                          </span>
                        )}
                        {!cv.isOwner && canView && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-700 ring-1 ring-brand-600/20">
                            <Sparkles className="h-3 w-3" />
                            Unlocked
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        uploaded by : - {highlightText(cv.uploaderEmail || 'Unknown', query)}
                      </span>
                    </div>
                  </td>
                  {query && (
                    <td className="px-6 py-5">
                      {cv.relevancy ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/10 shadow-sm">
                          {cv.relevancy}% Match
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">N/A</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-slate-500">{formatDate(cv.createdAt)}</span>
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
                      {onEdit && (cv.isOwner || canView) && (
                        <button
                          type="button"
                          onClick={() => onEdit(cv)}
                          className="btn-secondary h-9 w-9 p-0 text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                          aria-label={`Edit ${cv.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={downloadingCvId === cv.id}
                        onClick={() => {
                          if (onDownload) {
                            onDownload(cv)
                          } else if (cv.downloadUrl) {
                            window.open(cv.downloadUrl, '_blank')
                          }
                        }}
                        className={`btn-secondary h-9 w-9 p-0 ${
                          canDownload
                            ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                            : 'text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                        }`}
                        title={canDownload ? 'Download PDF (Free/Unlocked)' : 'Download PDF (5 Coins)'}
                        aria-label={`Download ${cv.fileName}`}
                      >
                        {downloadingCvId === cv.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
                        ) : canDownload ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <Coins className="h-4 w-4" />
                        )}
                      </button>
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
