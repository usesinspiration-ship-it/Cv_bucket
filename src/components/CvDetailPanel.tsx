import { useState, type ReactNode } from 'react'
import { Check, Download, Edit2, Mail, Phone, Plus, UserRound, X } from 'lucide-react'
import type { CVRecord } from '../types/cv'
import { formatDate } from '../utils/format'
import { updateCV } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface CvDetailPanelProps {
  cv: CVRecord | null
  onUpdate?: (updated: CVRecord) => void
}

export function CvDetailPanel({ cv, onUpdate }: CvDetailPanelProps) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editedData, setEditedData] = useState<Partial<CVRecord>>({})
  const [newSkill, setNewSkill] = useState('')

  if (!cv) {
    return (
      <div className="glass-panel flex min-h-full items-center justify-center p-6 text-center text-sm text-slate-500 sm:p-8">
        Select a CV to review extracted details, experience, and education.
      </div>
    )
  }

  const handleEdit = () => {
    setEditedData({
      name: cv.name || '',
      email: cv.email || '',
      phone: cv.phone || '',
      skills: [...(cv.skills || [])],
      experience: cv.experience || '',
      education: cv.education || '',
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedData({})
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const updated = await updateCV(cv.id, editedData, token)
      onUpdate?.(updated)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update CV:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (!newSkill.trim()) return
    const skills = [...(editedData.skills || [])]
    if (!skills.includes(newSkill.trim())) {
      setEditedData({ ...editedData, skills: [...skills, newSkill.trim()] })
    }
    setNewSkill('')
  }

  const removeSkill = (skillToRemove: string) => {
    setEditedData({
      ...editedData,
      skills: (editedData.skills || []).filter((s) => s !== skillToRemove),
    })
  }

  return (
    <div className="glass-panel h-full p-5 sm:p-6 overflow-y-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={editedData.name}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              className="font-display text-2xl text-slate-900 sm:text-3xl bg-white border border-slate-200 rounded-xl px-3 py-1 outline-none ring-2 ring-brand-500/20 w-full"
              placeholder="Candidate Name"
            />
          ) : (
            <p className="font-display text-2xl text-slate-900 sm:text-3xl">
              {cv.name || 'Unnamed candidate'}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500">Indexed on {formatDate(cv.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-700/20"
              >
                {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={handleEdit} className="btn-secondary">
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <a
                href={cv.downloadUrl ?? cv.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <Download className="mr-2 h-4 w-4" />
                Open PDF
              </a>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <InfoCard 
            icon={<UserRound className="h-4 w-4" />} 
            label="Name" 
            value={isEditing ? editedData.name : cv.name}
            isEditing={isEditing}
            onChange={(val) => setEditedData({ ...editedData, name: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard 
            icon={<Mail className="h-4 w-4" />} 
            label="Email" 
            value={isEditing ? editedData.email : cv.email}
            isEditing={isEditing}
            onChange={(val) => setEditedData({ ...editedData, email: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard 
            icon={<Phone className="h-4 w-4" />} 
            label="Phone" 
            value={isEditing ? editedData.phone : cv.phone}
            isEditing={isEditing}
            onChange={(val) => setEditedData({ ...editedData, phone: val })}
          />
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Skills</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {(isEditing ? editedData.skills?.length : cv.skills?.length) || 0} detected
          </span>
        </div>
        
        {isEditing && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add skill..."
              className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={addSkill}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap gap-2">
            {(isEditing ? editedData.skills : cv.skills)?.length ? (
              (isEditing ? editedData.skills : cv.skills)?.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No skills identified.</span>
            )}
          </div>
        </div>
      </section>

      <SectionBlock 
        title="Experience" 
        body={isEditing ? editedData.experience : cv.experience} 
        isEditing={isEditing}
        onChange={(val) => setEditedData({ ...editedData, experience: val })}
      />
      <SectionBlock 
        title="Education" 
        body={isEditing ? editedData.education : cv.education} 
        isEditing={isEditing}
        onChange={(val) => setEditedData({ ...editedData, education: val })}
      />
      <SectionBlock title="Parsed Text" body={cv.rawText} />
    </div>
  )
}

function InfoCard({ 
  icon, 
  label, 
  value, 
  isEditing, 
  onChange 
}: { 
  icon: ReactNode; 
  label: string; 
  value?: string;
  isEditing?: boolean;
  onChange?: (val: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {label}
      </div>
      {isEditing ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="mt-2 w-full truncate bg-transparent text-sm font-bold text-slate-900 outline-none focus:text-brand-600"
          placeholder={`Enter ${label}...`}
          title={value || ''}
        />
      ) : (
        <p className="mt-2 truncate text-sm font-bold text-slate-900" title={value || ''}>
          {value || `No ${label.toLowerCase()} detected`}
        </p>
      )}
    </div>
  )
}

function SectionBlock({ 
  title, 
  body, 
  isEditing, 
  onChange 
}: { 
  title: string; 
  body?: string;
  isEditing?: boolean;
  onChange?: (val: string) => void;
}) {
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
      {isEditing && title !== 'Parsed Text' ? (
        <textarea
          value={body || ''}
          onChange={(e) => onChange?.(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder={`Enter ${title.toLowerCase()} details...`}
        />
      ) : (
        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-7 text-slate-700">
          {body || `No ${title.toLowerCase()} section detected.`}
        </div>
      )}
    </section>
  )
}

