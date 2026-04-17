import { LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function ProfileMenu() {
  const { user, logout } = useAuth()

  return (
    <div className="glass-panel flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-800">
          {(user?.displayName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user?.displayName ?? 'Recruiting workspace'}
          </p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 md:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          Secure
        </span>
        <button
          type="button"
          onClick={() => logout()}
          className="btn-secondary px-3 py-2"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
