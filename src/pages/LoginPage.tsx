import {
  AlertCircle,
  ArrowRight,
  LockKeyhole,
  Mail,
  SearchCheck,
  UserRoundSearch,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const { user, login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-2 py-12 sm:px-3 lg:px-5">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-mesh opacity-40" />
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-subtle" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 grid w-full max-w-[1600px] gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel group overflow-hidden border-none p-10 shadow-panel transition-all duration-500 hover:shadow-glow lg:p-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-700 shadow-sm ring-1 ring-inset ring-brand-500/20">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            CV Bucket v2.0
          </div>
          <h1 className="mt-8 max-w-2xl font-display text-5xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Intelligent pipeline for{' '}
            <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">
              high-volume
            </span>{' '}
            hiring.
          </h1>
          <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-slate-500/90">
            Securely upload, parse, and index candidate resumes. Find top talent in seconds with our
            deep extraction engine.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PromoCard
              icon={
                <div className="h-5 w-5 text-brand-600">
                  <LockKeyhole />
                </div>
              }
              title="Encrypted Vault"
              text="R2-backed storage with end-to-end encryption."
            />
            <PromoCard
              icon={
                <div className="h-5 w-5 text-emerald-600">
                  <SearchCheck />
                </div>
              }
              title="Fast Indexing"
              text="Instant full-text and semantic search."
            />
            <PromoCard
              icon={
                <div className="h-5 w-5 text-orange-600">
                  <UserRoundSearch />
                </div>
              }
              title="Deep Extraction"
              text="ML-powered skill and experience parsing."
            />
          </div>
        </section>

        <section className="glass-panel flex flex-col items-stretch border-none p-10 shadow-panel sm:p-12">
          <div className="flex rounded-2xl bg-slate-100/80 p-1.5 shadow-inner ring-1 ring-inset ring-slate-200/50">
            <button
              type="button"
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold tracking-tight transition-all duration-300 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold tracking-tight transition-all duration-300 ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>

          <div className="mt-10">
            <h2 className="font-display text-4xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back.' : 'Join the elite.'}
            </h2>
            <p className="mt-3 text-sm font-medium text-slate-400">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                Email Address
              </label>
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">
                <LockKeyhole className="h-3.5 w-3.5" />
                Password
              </label>
              <input
                className="field"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-4 text-sm font-bold text-rose-600 ring-1 ring-inset ring-rose-200/50 animate-fade-in">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary mt-4 w-full" disabled={loading}>
              {loading
                ? mode === 'login'
                  ? 'Authenticating...'
                  : 'Creating...'
                : mode === 'login'
                  ? 'Sign in to Dashboard'
                  : 'Initialize Workspace'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100/80" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              Fast Pass
            </span>
            <div className="h-px flex-1 bg-slate-100/80" />
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true)
              setError('')
              try {
                await loginWithGoogle()
              } catch (googleError) {
                setError(
                  googleError instanceof Error ? googleError.message : 'Google sign-in failed.'
                )
              } finally {
                setLoading(false)
              }
            }}
            className="btn-secondary group relative w-full overflow-hidden"
            disabled={loading}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-50 to-emerald-50 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </span>
          </button>
        </section>
      </div>
    </main>
  )
}

function PromoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-3xl border border-slate-100 bg-white/40 p-6 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-card">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <p className="font-display font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}
