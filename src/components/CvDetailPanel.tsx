import { useEffect, useState, type ReactNode } from 'react'
import {
  Banknote,
  Check,
  Coins,
  Download,
  Edit2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import type { CVRecord } from '../types/cv'
import { formatDate } from '../utils/format'
import { getApiError, unlockCvDownload, unlockCvView, updateCV } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { TopUpModal } from './TopUpModal'

interface CvDetailPanelProps {
  cv: CVRecord | null
  autoEdit?: boolean
  onUpdate?: (updated: CVRecord) => void
  onCancel?: () => void
}

export function CvDetailPanel({ cv, autoEdit, onUpdate, onCancel }: CvDetailPanelProps) {
  const { user, profile, setCredits } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unlockingView, setUnlockingView] = useState(false)
  const [unlockingDownload, setUnlockingDownload] = useState(false)
  const [topUpModalOpen, setTopUpModalOpen] = useState(false)
  const [editedData, setEditedData] = useState<Partial<CVRecord>>({})
  const [newSkill, setNewSkill] = useState('')
  const [panelError, setPanelError] = useState('')

  const isOwner = Boolean(cv?.isOwner || (user && cv?.userId === user.uid))
  const canView = Boolean(isOwner || cv?.canView || cv?.hasUnlockedView || cv?.hasUnlockedDownload)
  const canDownload = Boolean(isOwner || cv?.canDownload || cv?.hasUnlockedDownload)
  const userCredits = profile?.credits ?? 10

  useEffect(() => {
    if (autoEdit && cv && !isEditing && canView) {
      handleEdit()
    }
  }, [autoEdit, cv, canView])

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
      salary: cv.salary || '',
      location: cv.location || '',
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedData({})
    onCancel?.()
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

  const handleUnlockView = async () => {
    if (!user || unlockingView) return
    if (userCredits < 1) {
      setTopUpModalOpen(true)
      return
    }

    setUnlockingView(true)
    setPanelError('')
    try {
      const token = await user.getIdToken()
      const res = await unlockCvView(cv.id, token)
      setCredits(res.currentCredits)
      onUpdate?.({
        ...cv,
        ...res.cv,
        canView: true,
        hasUnlockedView: true,
      })
    } catch (err) {
      const msg = getApiError(err)
      if (msg.includes('Insufficient credits')) {
        setTopUpModalOpen(true)
      } else {
        setPanelError(msg)
      }
    } finally {
      setUnlockingView(false)
    }
  }

  const handleDownload = async () => {
    if (!user || unlockingDownload) return

    // If already unlocked or owned and valid download URL is present, open directly
    if (canDownload && cv.downloadUrl) {
      window.open(cv.downloadUrl, '_blank')
      return
    }

    // Only prompt for 5 coins if not already unlocked / owned
    if (!canDownload) {
      if (userCredits < 5) {
        setTopUpModalOpen(true)
        return
      }

      const confirmed = window.confirm(
        `Download ${cv.fileName || 'this CV'} for 5 coins?\n(The uploader will receive 1 coin. You can re-download this CV unlimited times once unlocked.)`
      )
      if (!confirmed) return
    }

    setUnlockingDownload(true)
    setPanelError('')
    try {
      const token = await user.getIdToken()
      const res = await unlockCvDownload(cv.id, token)
      setCredits(res.currentCredits)

      const updated: CVRecord = {
        ...cv,
        downloadUrl: res.downloadUrl,
        canDownload: true,
        canView: true,
        hasUnlockedDownload: true,
        hasUnlockedView: true,
      }
      onUpdate?.(updated)

      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank')
      }
    } catch (err) {
      const msg = getApiError(err)
      if (msg.includes('Insufficient credits')) {
        setTopUpModalOpen(true)
      } else {
        setPanelError(msg)
      }
    } finally {
      setUnlockingDownload(false)
    }
  }

  const addSkill = () => {
    if (!newSkill.trim()) return
    const addedSkills = newSkill
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')

    const currentSkills = [...(editedData.skills || [])]
    const updatedSkills = [...currentSkills]

    addedSkills.forEach((skill) => {
      if (!updatedSkills.includes(skill)) {
        updatedSkills.push(skill)
      }
    })

    setEditedData({ ...editedData, skills: updatedSkills })
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
      {/* Top Banner & Candidate Title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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

            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your Upload
              </span>
            )}
            {!isOwner && canView && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-600/20">
                <Sparkles className="h-3.5 w-3.5" />
                Unlocked
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Indexed on {formatDate(cv.createdAt)}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-700/20"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save
              </button>
              <button onClick={handleCancel} disabled={loading} className="btn-secondary">
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          ) : (
            <>
              {(isOwner || profile?.isAdmin) && canView && (
                <button onClick={handleEdit} className="btn-secondary">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              )}

              {canDownload ? (
                <button onClick={handleDownload} className="btn-primary">
                  <Download className="mr-2 h-4 w-4" />
                  Open PDF
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  disabled={unlockingDownload}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 border-none shadow-md shadow-amber-600/20"
                >
                  {unlockingDownload ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="mr-2 h-4 w-4" />
                  )}
                  Download PDF (5 Coins)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {panelError && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {panelError}
        </div>
      )}

      {/* Locked View Card if not unlocked and not owner */}
      {!canView && (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-6 text-center shadow-panel">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-inner">
            <Lock className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-black text-slate-900">
            Candidate Details are Locked
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Full contact information, experience history, education, and extracted text are protected.
            Unlock candidate details for 1 coin, or download the original PDF for 5 coins.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleUnlockView}
              disabled={unlockingView}
              className="btn-primary bg-amber-600 hover:bg-amber-700 border-none shadow-md shadow-amber-600/20 px-5"
            >
              {unlockingView ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Coins className="h-4 w-4 mr-2" />
              )}
              Unlock Details (1 Coin)
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={unlockingDownload}
              className="btn-secondary border-amber-300 text-amber-900 hover:bg-amber-100/60 px-5"
            >
              {unlockingDownload ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF (5 Coins)
            </button>
          </div>
        </div>
      )}

      {/* Candidate Key Information Cards */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <InfoCard
            icon={<UserRound className="h-4 w-4" />}
            label="Name"
            value={isEditing ? editedData.name : cv.name}
            isEditing={isEditing}
            isLocked={false}
            onChange={(val) => setEditedData({ ...editedData, name: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={isEditing ? editedData.email : cv.email}
            isEditing={isEditing}
            isLocked={!canView}
            onUnlock={handleUnlockView}
            onChange={(val) => setEditedData({ ...editedData, email: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={isEditing ? editedData.phone : cv.phone}
            isEditing={isEditing}
            isLocked={!canView}
            onUnlock={handleUnlockView}
            onChange={(val) => setEditedData({ ...editedData, phone: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={isEditing ? editedData.location : cv.location}
            isEditing={isEditing}
            isLocked={false}
            onChange={(val) => setEditedData({ ...editedData, location: val })}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <InfoCard
            icon={<Banknote className="h-4 w-4" />}
            label="Current Salary"
            value={isEditing ? editedData.salary : cv.salary}
            isEditing={isEditing}
            isLocked={!canView}
            onUnlock={handleUnlockView}
            onChange={(val) => setEditedData({ ...editedData, salary: val })}
          />
        </div>
      </div>

      {/* Skills Section (ALWAYS VISIBLE & UNBLURRED) */}
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

      {/* Experience & Education (BLURRED WITH GLASS LOCK OVERLAY IF NOT UNLOCKED) */}
      <SectionBlock
        title="Experience"
        body={isEditing ? editedData.experience : cv.experience}
        isEditing={isEditing}
        isLocked={!canView}
        onUnlock={handleUnlockView}
        onChange={(val) => setEditedData({ ...editedData, experience: val })}
      />
      <SectionBlock
        title="Education"
        body={isEditing ? editedData.education : cv.education}
        isEditing={isEditing}
        isLocked={!canView}
        onUnlock={handleUnlockView}
        onChange={(val) => setEditedData({ ...editedData, education: val })}
      />

      {/* Parsed Raw Text (BLURRED WITH GLASS LOCK OVERLAY IF NOT UNLOCKED) */}
      <SectionBlock
        title="Parsed Text"
        body={cv.rawText}
        isLocked={!canView}
        onUnlock={handleUnlockView}
      />

      <TopUpModal isOpen={topUpModalOpen} onClose={() => setTopUpModalOpen(false)} />
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
  isEditing,
  isLocked,
  onUnlock,
  onChange,
}: {
  icon: ReactNode
  label: string
  value?: string
  isEditing?: boolean
  isLocked?: boolean
  onUnlock?: () => void
  onChange?: (val: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {icon}
          {label}
        </div>
        {isLocked && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
            <Lock className="h-2.5 w-2.5" />
            Locked
          </span>
        )}
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
      ) : isLocked ? (
        <div
          onClick={onUnlock}
          className="mt-2 flex items-center justify-between cursor-pointer group"
          title="Click to unlock full details for 1 coin"
        >
          <span className="truncate text-sm font-bold text-slate-400 filter blur-[5px] select-none pointer-events-none">
            {value || 'Confidential Data'}
          </span>
          <span className="text-[10px] font-bold text-amber-600 group-hover:underline shrink-0 ml-1">
            Unlock (1 🪙)
          </span>
        </div>
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
  isLocked,
  onUnlock,
  onChange,
}: {
  title: string
  body?: string
  isEditing?: boolean
  isLocked?: boolean
  onUnlock?: () => void
  onChange?: (val: string) => void
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
        {isLocked && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      {isEditing && title !== 'Parsed Text' ? (
        <textarea
          value={body || ''}
          onChange={(e) => onChange?.(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder={`Enter ${title.toLowerCase()} details...`}
        />
      ) : isLocked ? (
        <div className="relative mt-3 min-h-[140px] overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-4">
          {/* Blurred Background text */}
          <div className="filter blur-[6px] select-none pointer-events-none opacity-40 text-sm leading-7 text-slate-700">
            {body || 'Comprehensive candidate achievements, project details, and employment history...'}
          </div>

          {/* Centered Glass Unlock Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[2px] p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-900">{title} is Protected</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unlock candidate profile for 1 coin to reveal full details
            </p>
            <button
              type="button"
              onClick={onUnlock}
              className="mt-3 btn-primary bg-amber-600 hover:bg-amber-700 border-none text-xs py-1.5 px-4 shadow-sm"
            >
              <Coins className="h-3.5 w-3.5 mr-1.5" />
              Unlock Details (1 Coin)
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-7 text-slate-700">
          {body || `No ${title.toLowerCase()} section detected.`}
        </div>
      )}
    </section>
  )
}
