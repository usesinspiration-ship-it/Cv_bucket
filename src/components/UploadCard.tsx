import { FileUp, LoaderCircle, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

interface UploadCardProps {
  busy: boolean
  progress: number
  onUpload: (file: File) => Promise<void>
}

export function UploadCard({ busy, progress, onUpload }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function submitFile(file: File | undefined) {
    if (!file || busy) {
      return
    }

    await onUpload(file)
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl text-slate-900">Upload CV</p>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Add a PDF resume to parse and index it.
          </p>
        </div>
        <span className="tag">
          <FileUp className="mr-1.5 h-3.5 w-3.5" />
          PDF only
        </span>
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
          await submitFile(event.dataTransfer.files[0])
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
            ? 'Processing your CV'
            : isDragging
              ? 'Drop it now!'
              : 'Drop CVs here or click to browse'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {busy ? 'Parsing content and extracting skills...' : 'We support PDF resumes up to 10 MB'}
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          await submitFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {busy && (
        <div className="mt-6 animate-fade-in">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-slate-400">Processing Progress</span>
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
  )
}
