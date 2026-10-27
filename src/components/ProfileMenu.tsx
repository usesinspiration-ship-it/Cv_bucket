import { Check, Edit2, Loader2, LogOut, Sparkles, User, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function ProfileMenu() {
  const { user, profile, logout, updateName } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const currentDisplayName = user?.displayName || profile?.displayName || ''
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleOpenEdit() {
    setNameInput(currentDisplayName)
    setError('')
    setIsEditing(true)
  }

  function handleCloseEdit() {
    if (saving) return
    setIsEditing(false)
    setError('')
  }

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) {
      setError('Please enter a valid name.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateName(trimmed)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name.')
    } finally {
      setSaving(false)
    }
  }

  const initialLetter = (
    currentDisplayName?.[0] ??
    user?.email?.[0] ??
    'U'
  ).toUpperCase()

  return (
    <>
      <div className="glass-panel flex items-center justify-between gap-4 p-3 sm:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-800 shadow-sm">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentDisplayName || (
                  <span className="text-slate-400 italic">No name set</span>
                )}
              </p>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Edit your name"
                aria-label="Edit your name"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentDisplayName && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 transition-all"
            >
              <User className="h-3 w-3" />
              Set name
            </button>
          )}

          <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 md:inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            Secure
          </span>

          <button
            type="button"
            onClick={() => logout()}
            className="btn-secondary px-3 py-2"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8 animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-name-title"
          >
            <button
              type="button"
              onClick={handleCloseEdit}
              className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 id="edit-name-title" className="font-display text-lg font-bold text-slate-900">
                  Update Your Name
                </h3>
                <p className="text-xs text-slate-500">
                  Set how your name appears across Jobusiness.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="field w-full"
                  disabled={saving}
                  maxLength={60}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="btn-secondary px-4 py-2 text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-sm"
                  disabled={saving || !nameInput.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Name
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
