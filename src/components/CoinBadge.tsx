import { useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { TopUpModal } from './TopUpModal'

export function CoinBadge() {
  const { profile } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)

  const credits = profile?.credits ?? 10

  return (
    <>
      <div className="flex items-center gap-1 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/80 p-1 pl-3 shadow-sm">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-black text-amber-900 transition-opacity hover:opacity-80"
          title="Click to view wallet & top up coins"
        >
          <Coins className="h-4 w-4 text-amber-600 animate-pulse" />
          <span>{credits.toLocaleString()}</span>
          <span className="hidden sm:inline font-bold text-amber-700/80">Coins</span>
        </button>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 ml-1"
          title="Top up coins"
          aria-label="Top up coins"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>

      <TopUpModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
