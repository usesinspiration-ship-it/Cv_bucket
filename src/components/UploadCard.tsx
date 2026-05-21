import {
  CheckCircle2,
  Clock,
  FileUp,
  LoaderCircle,
  Trash2,
  UploadCloud,
  Play,
  Pause,
  XCircle,
  AlertCircle,
  RefreshCw,
  CopyMinus,
  FileText
} from 'lucide-react'
import { useRef, useState } from 'react'
import { formatFileSize, formatDate } from '../utils/format'
import type { QueueItem, QueueStats } from '../hooks/useUploadQueue'

interface UploadCardProps {
  queue: QueueItem[]
  isPaused: boolean
  isUploading: boolean
  stats: QueueStats
  addFiles: (files: File[]) => void
  pause: () => void
  resume: () => void
  cancel: () => void
  retryFailed: () => void
  history?: { fileName: string; fileSize: number; timestamp: string }[]
  onClearHistory?: () => void
}

export function UploadCard({
  queue,
  isPaused,
  isUploading,
  stats,
  addFiles,
  pause,
  resume,
  cancel,
  retryFailed,
  history = [],
  onClearHistory,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const submitFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    addFiles(Array.from(files))
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = history.filter((item) =>
    new Date(item.timestamp).toISOString().split('T')[0] === todayStr
  ).length

  // Calculate total progress across uploadable files
  const activeQueueFiles = queue.filter(
    (item) => item.status !== 'skipped' && item.status !== 'failed'
  )
  const overallProgress =
    activeQueueFiles.length > 0
      ? Math.round(
          activeQueueFiles.reduce((acc, item) => acc + item.progress, 0) /
            activeQueueFiles.length
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Upload Panel */}
      <div className="glass-panel p-6 border-none shadow-panel animate-fade-in relative overflow-hidden">
        {/* Decorative backdrop glows */}
        <div className="absolute top-0 right-0 -w-64 -h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -w-64 -h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight">Upload Candidate Resumes</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500 font-medium">
              Parse, index, and query resumes with instant key skill extraction.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <span className="tag bg-emerald-50 text-emerald-700 border-emerald-100 font-bold shadow-sm">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Today (Local): {todayCount} • Total (Local): {history.length}
              </span>
            )}
            <span className="tag font-bold shadow-sm">
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              PDF, DOC, DOCX
            </span>
          </div>
        </div>

        {queue.length === 0 ? (
          /* Empty / Drag & Drop State */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              submitFiles(event.dataTransfer.files)
            }}
            className={`group mt-6 flex min-h-72 w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed transition-all duration-300 relative z-10 ${
              isDragging
                ? 'border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/10'
                : 'border-slate-200 bg-slate-50/30 hover:border-brand-300 hover:bg-white hover:shadow-glow'
            }`}
          >
            <div
              className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                isDragging
                  ? 'scale-110 bg-brand-500 text-white'
                  : 'bg-white text-brand-600 shadow-sm group-hover:bg-brand-50 group-hover:scale-105'
              }`}
            >
              <UploadCloud className="h-8 w-8 animate-pulse-subtle" />
            </div>
            <p className="text-lg font-black text-slate-900">
              {isDragging ? 'Drop it now!' : 'Drop CVs here or click to browse'}
            </p>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Drop one or thousands of resumes up to 10 MB each
            </p>
          </button>
        ) : (
          /* Active Queue Manager Dashboard */
          <div className="mt-6 space-y-6 relative z-10">
            {/* Live Queue Progress Banner */}
            <div className="glass-panel border-none p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg shadow-slate-950/20 relative overflow-hidden rounded-[1.75rem]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      Bulk Queue Session Active
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight">
                    {isPaused ? 'Session Paused' : 'Processing Uploads...'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Queue Completion: {stats.completed + stats.skipped} of {stats.total} files ({overallProgress}% complete)
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {!isPaused && isUploading ? (
                    <button
                      type="button"
                      onClick={pause}
                      className="btn-secondary bg-white/10 border-white/5 text-white hover:bg-white/20 h-10 px-4 text-xs font-black uppercase tracking-wider transition-all"
                    >
                      <Pause className="h-3.5 w-3.5 mr-1.5" />
                      Pause Session
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resume}
                      className="btn-primary bg-emerald-500 border-none text-white hover:bg-emerald-600 shadow-glow shadow-emerald-500/20 h-10 px-4 text-xs font-black uppercase tracking-wider transition-all"
                      disabled={stats.pending === 0 && stats.failed === 0}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Resume Session
                    </button>
                  )}
                  {stats.failed > 0 && (
                    <button
                      type="button"
                      onClick={retryFailed}
                      className="btn-secondary bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/25 h-10 px-4 text-xs font-black uppercase tracking-wider transition-all animate-pulse-subtle"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Retry Failed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancel}
                    className="btn-secondary bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/25 h-10 px-4 text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Cancel Session
                  </button>
                </div>
              </div>

              {/* Progress Slider Track */}
              <div className="mt-4">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 via-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="glass-panel border-none p-3.5 bg-slate-50/50 flex flex-col justify-between h-20 shadow-sm rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</span>
                <span className="text-xl font-black text-slate-900">{stats.total}</span>
              </div>
              <div className="glass-panel border-none p-3.5 bg-emerald-50/30 flex flex-col justify-between h-20 shadow-sm rounded-2xl border-l-2 border-emerald-500">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" /> Uploaded
                </span>
                <span className="text-xl font-black text-emerald-700">{stats.completed}</span>
              </div>
              <div className="glass-panel border-none p-3.5 bg-sky-50/30 flex flex-col justify-between h-20 shadow-sm rounded-2xl border-l-2 border-sky-500">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 flex items-center gap-1">
                  <CopyMinus className="h-3 w-3 shrink-0" /> Skipped
                </span>
                <span className="text-xl font-black text-sky-700">{stats.skipped}</span>
              </div>
              <div className="glass-panel border-none p-3.5 bg-rose-50/30 flex flex-col justify-between h-20 shadow-sm rounded-2xl border-l-2 border-rose-500">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> Failed
                </span>
                <span className="text-xl font-black text-rose-700">{stats.failed}</span>
              </div>
              <div className="glass-panel border-none p-3.5 bg-violet-50/30 flex flex-col justify-between h-20 shadow-sm rounded-2xl border-l-2 border-violet-500 col-span-2 md:col-span-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 flex items-center gap-1">
                  {stats.processing > 0 && !isPaused ? (
                    <LoaderCircle className="h-3 w-3 shrink-0 animate-spin text-violet-500" />
                  ) : (
                    <Clock className="h-3 w-3 shrink-0" />
                  )}
                  In Progress
                </span>
                <span className="text-xl font-black text-violet-700">
                  {isPaused ? 0 : stats.processing}
                </span>
              </div>
            </div>

            {/* Scrollable File Queue Registry */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                File Queue Registry ({queue.length})
              </h4>
              <div className="max-h-96 overflow-y-auto pr-1 space-y-2 rounded-2xl border border-slate-100 p-2 bg-slate-50/20 shadow-inner">
                {queue.map((item) => {
                  let statusBadge = null
                  let bgClass = 'bg-white border-slate-100 hover:border-slate-200'

                  switch (item.status) {
                    case 'hashing':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-inset ring-violet-600/10 shadow-sm animate-pulse-subtle">
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          HASHING
                        </span>
                      )
                      bgClass = 'bg-violet-50/10 border-violet-200/50 shadow-sm ring-1 ring-violet-500/5'
                      break
                    case 'checking':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700 ring-1 ring-inset ring-sky-600/10 shadow-sm animate-pulse-subtle">
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          CHECKING
                        </span>
                      )
                      bgClass = 'bg-sky-50/10 border-sky-200/50 shadow-sm ring-1 ring-sky-500/5'
                      break
                    case 'uploading':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/10 shadow-sm">
                          <LoaderCircle className="h-3 w-3 animate-spin text-emerald-500" />
                          UPLOADING ({item.progress}%)
                        </span>
                      )
                      bgClass = 'bg-emerald-50/10 border-emerald-200/50 shadow-sm ring-1 ring-emerald-500/5'
                      break
                    case 'success':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800 border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          SUCCESS
                        </span>
                      )
                      bgClass = 'bg-white/80 border-emerald-100 shadow-sm/5 hover:border-emerald-200/60'
                      break
                    case 'skipped':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 border border-slate-200 shadow-sm">
                          <CopyMinus className="h-3 w-3 text-slate-500" />
                          DUPLICATE SKIPPED
                        </span>
                      )
                      bgClass = 'bg-slate-50/40 border-slate-100 opacity-80'
                      break
                    case 'failed':
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-800 border border-rose-200 shadow-sm animate-bounce-subtle">
                          <AlertCircle className="h-3 w-3 text-rose-600" />
                          FAILED
                        </span>
                      )
                      bgClass = 'bg-rose-50/10 border-rose-200/60 shadow-sm ring-1 ring-rose-500/5'
                      break
                    case 'pending':
                    default:
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-inset ring-slate-600/10">
                          <Clock className="h-3 w-3" />
                          PENDING
                        </span>
                      )
                      bgClass = 'bg-white border-slate-100'
                      break
                  }

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 ${bgClass}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            item.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                            item.status === 'failed' ? 'bg-rose-50 text-rose-600' :
                            item.status === 'skipped' ? 'bg-slate-50 text-slate-600' : 'bg-brand-50 text-brand-600'
                          }`}>
                            {item.status === 'success' ? (
                              <CheckCircle2 className="h-5 w-5 animate-scale-in" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {item.file.name}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {formatFileSize(item.file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">{statusBadge}</div>
                      </div>

                      {/* Warning/Retry Error Display */}
                      {item.error && (
                        <div className="mt-2 text-xs font-bold text-rose-600 bg-rose-50/50 p-2 rounded-xl border border-rose-100 flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{item.error}</span>
                        </div>
                      )}

                      {/* File specific upload progress bar */}
                      {item.status === 'uploading' && (
                        <div className="mt-3">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Action to enqueue additional files while current batch is active */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full btn-secondary h-11 border-dashed hover:border-brand-500 hover:bg-brand-50/30 flex items-center justify-center gap-2 rounded-2xl transition-all"
              >
                <UploadCloud className="h-4 w-4 text-slate-500 group-hover:text-brand-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Enqueue More Files
                </span>
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            submitFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {/* Local Upload History Panel */}
      {history.length > 0 && (
        <div className="glass-panel animate-slide-up p-6 border-none shadow-panel relative">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                Recent Local History
              </h3>
              {history.length > 0 && (
                <p className="mt-1 text-[10px] font-bold text-slate-400">
                  Local Summary:{' '}
                  {Object.entries(
                    history.reduce((acc, item) => {
                      const d = new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                      acc[d] = (acc[d] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  )
                    .map(([date, count]) => `${date}: ${count}`)
                    .join(' • ')}
                </p>
              )}
            </div>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear History
            </button>
          </div>
          <div className="grid gap-3 max-h-[340px] overflow-y-auto pr-1">
            {history.map((item, i) => (
              <div
                key={`${item.timestamp}-${i}`}
                className="flex items-center justify-between rounded-2xl bg-white/50 p-4 border border-slate-100 hover:border-brand-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                      {item.fileName}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
