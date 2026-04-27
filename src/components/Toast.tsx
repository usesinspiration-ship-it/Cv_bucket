import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string | null
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for exit animation
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [message, duration, onClose])

  if (!message && !isVisible) return null

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-brand-500" />,
  }

  const styles = {
    success: 'border-emerald-100 bg-emerald-50/90 text-emerald-900 shadow-emerald-500/10',
    error: 'border-rose-100 bg-rose-50/90 text-rose-900 shadow-rose-500/10',
    info: 'border-brand-100 bg-brand-50/90 text-brand-900 shadow-brand-500/10',
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-3 rounded-2xl border p-4 backdrop-blur-md shadow-2xl transition-all duration-300 ease-out sm:min-w-[320px] ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
      } ${styles[type]}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        {icons[type]}
      </div>
      <div className="flex-1 pr-2">
        <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-0.5">{type}</p>
        <p className="text-sm font-bold leading-tight">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="rounded-lg p-1.5 opacity-40 hover:bg-black/5 hover:opacity-100 transition-all"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
