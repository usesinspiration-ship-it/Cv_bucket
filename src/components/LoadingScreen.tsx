export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel flex max-w-sm flex-col items-center gap-4 px-8 py-10 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <div>
          <p className="font-display text-2xl text-slate-900">CV Bucket</p>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  )
}
