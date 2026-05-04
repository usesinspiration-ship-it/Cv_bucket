import { CheckCircle2, Clock, FileUp, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatFileSize, formatDate } from '../utils/format'

interface LocalHistoryItem {
  fileName: string
  fileSize: number
  timestamp: string
}

interface UploadCardProps {
  busy: boolean
  progress: number
  status?: string
  onUpload: (files: File[]) => Promise<void>
  history?: LocalHistoryItem[]
  onClearHistory?: () => void
}

export function UploadCard({ busy, progress, status, onUpload, history = [], onClearHistory }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function submitFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) {
      return
    }
    await onUpload(Array.from(files))
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = history.filter(item => 
    new Date(item.timestamp).toISOString().split('T')[0] === todayStr
  ).length

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-slate-900">Upload CV</p>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Add a PDF resume to parse and index it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <span className="tag bg-emerald-50 text-emerald-700 border-emerald-100">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Today (Local): {todayCount} • Total (Local): {history.length}
              </span>
            )}
            <span className="tag">
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              PDF, DOC, DOCX
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (event) => {
            event.preventDefault()
            setIsDragging(false)
            await submitFiles(event.dataTransfer.files)
          }}
          className={`group mt-6 flex min-h-64 w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed transition-all duration-300 ${
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
            {busy ? (
              <LoaderCircle className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>
          <p className="text-lg font-bold text-slate-900">
            {busy
              ? (status || 'Processing your CV')
              : isDragging
                ? 'Drop it now!'
                : 'Drop CVs here or click to browse'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {busy ? 'Parsing content and extracting skills...' : 'Drop one or more resumes up to 10 MB each'}
          </p>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={async (event) => {
            await submitFiles(event.target.files)
            event.target.value = ''
          }}
        />

        {busy && (
          <div className="mt-6 animate-fade-in">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="text-slate-400">{status || 'Processing Progress'}</span>
              <span className="text-brand-600">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 via-emerald-400 to-brand-500 bg-[length:200%_100%] animate-pulse-subtle transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="glass-panel animate-slide-up p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                Recent Local History
              </h3>
              {history.length > 0 && (
                <p className="mt-1 text-[10px] font-bold text-slate-400">
                  Local Summary: {Object.entries(
                    history.reduce((acc, item) => {
                      const d = new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
          <div className="grid gap-3">
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
                    <p className="text-xs text-slate-500">
                      {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
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
