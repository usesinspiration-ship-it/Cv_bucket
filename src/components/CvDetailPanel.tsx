import type { ReactNode } from 'react'
import { Download, Mail, Phone, UserRound } from 'lucide-react'
import type { CVRecord } from '../types/cv'
import { formatDate } from '../utils/format'

export function CvDetailPanel({ cv }: { cv: CVRecord | null }) {
  if (!cv) {
    return (
      <div className="glass-panel flex min-h-full items-center justify-center p-6 text-center text-sm text-slate-500 sm:p-8">
        Select a CV to review extracted details, experience, and education.
      </div>
    )
  }

  return (
    <div className="glass-panel h-full p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl text-slate-900 sm:text-3xl">
            {cv.name || 'Unnamed candidate'}
          </p>
          <p className="mt-2 text-sm text-slate-500">Indexed on {formatDate(cv.createdAt)}</p>
        </div>
        <a
          href={cv.downloadUrl ?? cv.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          <Download className="mr-2 h-4 w-4" />
          Open PDF
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <InfoCard icon={<UserRound className="h-4 w-4" />} label="Name" value={cv.name} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={cv.email} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard icon={<Phone className="h-4 w-4" />} label="Phone" value={cv.phone} />
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Skills</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {cv.skills.length} detected
          </span>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          {cv.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cv.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400">No skills extracted from the PDF.</span>
          )}
        </div>
      </section>

      <SectionBlock title="Experience" body={cv.experience} />
      <SectionBlock title="Education" body={cv.education} />
      <SectionBlock title="Parsed Text" body={cv.rawText} />
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-slate-900" title={value || ''}>
        {value || `No ${label.toLowerCase()} detected`}
      </p>
    </div>
  )
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {body || `No ${title.toLowerCase()} section detected.`}
      </div>
    </section>
  )
}
