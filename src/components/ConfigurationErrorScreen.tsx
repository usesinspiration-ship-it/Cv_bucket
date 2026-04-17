import { AlertTriangle, Copy } from 'lucide-react'

export function ConfigurationErrorScreen({ message }: { message: string }) {
  const envTemplate = `VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456`

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="glass-panel w-full max-w-3xl p-8 sm:p-10">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-3xl text-slate-900">
              Frontend Firebase config is missing
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-sm text-slate-100">
          <div className="mb-4 flex items-center gap-2 text-slate-300">
            <Copy className="h-4 w-4" />
            Create <code className="rounded bg-slate-800 px-2 py-0.5">.env</code> in the project
            root with:
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-emerald-200">
            {envTemplate}
          </pre>
        </div>

        <div className="mt-6 text-sm leading-7 text-slate-600">
          Get these values from Firebase Console at{' '}
          <span className="font-semibold text-slate-800">
            Project settings &gt; General &gt; Your apps &gt; SDK setup and configuration
          </span>
          . After saving <code className="rounded bg-slate-100 px-2 py-0.5">.env</code>, restart{' '}
          <code className="rounded bg-slate-100 px-2 py-0.5">npm run dev</code>.
        </div>
      </div>
    </main>
  )
}
