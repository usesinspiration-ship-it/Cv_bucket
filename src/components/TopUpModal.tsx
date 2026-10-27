import { useState, useEffect } from 'react'
import { Check, Coins, History, Loader2, Sparkles, X, Zap } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getApiError, getWalletTransactions, topupCredits } from '../services/api'
import type { CreditTransaction } from '../types/cv'
import { formatDate } from '../utils/format'

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newCredits: number) => void
}

const PACKAGES = [
  { coins: 10, price: '₹10', tag: 'Starter', popular: false },
  { coins: 50, price: '₹45', tag: '10% OFF', popular: true },
  { coins: 100, price: '₹80', tag: '20% OFF', popular: false },
  { coins: 250, price: '₹180', tag: 'Best Value', popular: false },
]

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const { user, profile, setCredits } = useAuth()
  const [selectedCoins, setSelectedCoins] = useState<number>(50)
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const currentCredits = profile?.credits ?? 10

  useEffect(() => {
    if (!isOpen) {
      setError('')
      setSuccessMsg('')
      return
    }
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [isOpen, activeTab])

  async function loadHistory() {
    if (!user) return
    setHistoryLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await getWalletTransactions(token)
      setTransactions(res.transactions || [])
    } catch (err) {
      console.error('Failed to load transaction history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleTopUp() {
    if (!user || loading) return
    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const token = await user.getIdToken()
      const res = await topupCredits(selectedCoins, token)
      setCredits(res.credits)
      setSuccessMsg(`Successfully added ${selectedCoins} coins to your wallet!`)
      onSuccess?.(res.credits)
      setTimeout(() => {
        setSuccessMsg('')
      }, 4000)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 px-6 py-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-200">
            <Coins className="h-4 w-4" />
            Wallet & Coin Economy
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-black tracking-tight">{currentCredits.toLocaleString()}</p>
              <p className="text-xs font-medium text-amber-100/90">Available Coins</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              10 Coins Free on Sign-in
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2 border-t border-white/15 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('topup')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'topup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Top Up Coins
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Ledger History
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {activeTab === 'topup' ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Coin Package
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PACKAGES.map((pkg) => (
                    <button
                      key={pkg.coins}
                      type="button"
                      onClick={() => setSelectedCoins(pkg.coins)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                        selectedCoins === pkg.coins
                          ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                          Popular
                        </span>
                      )}
                      <p className="text-xl font-black text-slate-900">{pkg.coins}</p>
                      <p className="text-[11px] font-bold text-slate-500">Coins</p>
                      <div className="mt-2 text-xs font-extrabold text-amber-600">{pkg.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Economy Rules Cheat Sheet */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Coin Rates & Rules:
                </p>
                <ul className="grid grid-cols-2 gap-2 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <strong>1 Coin:</strong> View CV details
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <strong>5 Coins:</strong> Download CV PDF
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <strong>+1 Coin:</strong> Upload a new CV
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <strong>+1 Coin:</strong> Someone downloads your CV
                  </li>
                  <li className="flex items-center gap-1.5 col-span-2 text-slate-500">
                    ✨ Your own uploaded CVs are 100% free to view & download forever.
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTopUp}
                  disabled={loading}
                  className="btn-primary w-full justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 h-12 text-sm font-bold shadow-lg shadow-amber-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Top-Up...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4" />
                      Add {selectedCoins} Coins (Test Mode)
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  Razorpay payment gateway ready • Test simulator active
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Credit Activity
              </p>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : transactions.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
                  {transactions.map((tx) => {
                    const isPositive = tx.amount > 0
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center font-black text-xs ${
                              isPositive ? 'text-emerald-600' : 'text-slate-700'
                            }`}
                          >
                            {isPositive ? `+${tx.amount}` : tx.amount} Coins
                          </span>
                          <p className="text-[10px] text-slate-400">Bal: {tx.balanceAfter}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">No transactions recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
