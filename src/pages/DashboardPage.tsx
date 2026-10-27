import { AlertCircle, FileText, RefreshCw, SearchCheck, TrendingUp, Upload, UserRoundSearch, Users } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { useDeferredValue, useEffect, useCallback, useMemo, useState, useRef } from 'react'
import { CvDetailPanel } from '../components/CvDetailPanel'
import { CvTable } from '../components/CvTable'
import { EmptyState } from '../components/EmptyState'
import { ProfileMenu } from '../components/ProfileMenu'
import { CoinBadge } from '../components/CoinBadge'
import { SearchToolbar } from '../components/SearchToolbar'
import { UploadCard } from '../components/UploadCard'
import {
  WorkspaceTabs,
  type WorkspaceTabItem,
} from '../components/WorkspaceTabs'
import { useAuth } from '../hooks/useAuth'
import { useUploadQueue } from '../hooks/useUploadQueue'
import { deleteCV, fetchCVs, getApiError, unlockCvDownload } from '../services/api'
import type { CVRecord, SearchFilters } from '../types/cv'
import { formatFileSize } from '../utils/format'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useWakeLock } from '../hooks/useWakeLock'

const initialFilters: SearchFilters = {
  query: '',
  name: '',
  skill: '',
  page: 1,
  pageSize: 10,
}

type DashboardTab = 'library' | 'upload' | 'review'

export function DashboardPage() {
  const { user, profile, setCredits, refreshProfile } = useAuth()
  const [items, setItems] = useState<CVRecord[]>([])
  const [total, setTotal] = useState(0)
  const [selectedCv, setSelectedCv] = useState<CVRecord | null>(null)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const deferredQuery = useDeferredValue(filters.query)
  const deferredName = useDeferredValue(filters.name)
  const deferredSkill = useDeferredValue(filters.skill)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null)
  const [activeTab, setActiveTabState] = useState<DashboardTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'upload' || tabParam === 'library' || tabParam === 'review') {
        return tabParam as DashboardTab
      }
    } catch {}
    return 'library'
  })

  const setActiveTab = useCallback((tab: DashboardTab) => {
    setActiveTabState(tab)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())
    } catch {}
  }, [])

  // Prevent browser default behavior of opening dropped files when dropped outside dropzones
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const [totalStorageBytes, setTotalStorageBytes] = useState(0)
  const [globalTotal, setGlobalTotal] = useState(0)
  const [isLimited, setIsLimited] = useState(false)
  const [pendingEdit, setPendingEdit] = useState(false)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [localHistory, setLocalHistory] = useState<{ fileName: string, fileSize: number, timestamp: string }[]>([])
  const { toast, showToast, hideToast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  const loadCVs = useCallback(async (signal?: AbortSignal, refresh = false) => {
    if (!user || loadingRef.current) {
      return
    }

    if (Date.now() < cooldownTime) {
      return
    }

    setLoading(true)
    loadingRef.current = true
    setError('')

    try {
      const token = await user.getIdToken()
      const response = await fetchCVs(
        {
          query: deferredQuery,
          name: deferredName,
          skill: deferredSkill,
          page: filters.page,
          pageSize: filters.pageSize,
        },
        token,
        signal,
        refresh,
      )

      const items = response?.items ?? []
      setItems(items)
      setTotal(response?.total ?? 0)
      setTotalStorageBytes(response?.totalStorageBytes ?? 0)
      setGlobalTotal(response?.globalTotal ?? response?.total ?? 0)
      setIsLimited(!!response?.isLimited)
      setSelectedCv((current) =>
        items.find((item) => item.id === current?.id) ??
        items[0] ??
        null,
      )
    } catch (loadError) {
      const msg = getApiError(loadError)
      if (msg === 'STALE_REQUEST') return
      
      setError(msg)
      
      // If it's a quota error, trigger 30s cooldown
      if (msg.includes('Quota Exhausted')) {
        setCooldownTime(Date.now() + 30000)
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
      setSyncing(false)
    }
  }, [deferredName, deferredQuery, deferredSkill, filters.page, filters.pageSize, user?.uid])

  // Initialize the bulk upload queue hook
  const uploadQueue = useUploadQueue(
    useCallback((cv: CVRecord) => {
      // 1. Add to local upload history registry
      const newRecord = {
        fileName: cv.fileName,
        fileSize: cv.fileSize,
        timestamp: new Date().toISOString(),
      }
      setLocalHistory((prev) => {
        const next = [newRecord, ...prev].slice(0, 50)
        localStorage.setItem('cv_upload_history', JSON.stringify(next))
        return next
      })

      // 2. Optimistic UI update for immediate list feedback
      setItems((current) => [cv, ...current].slice(0, filters.pageSize))
      setTotal((current) => current + 1)
      setTotalStorageBytes((current) => current + cv.fileSize)
      setSelectedCv(cv)

      // 3. Update coin balance (+1 coin earned for upload)
      if ((cv as any).currentCredits !== undefined) {
        setCredits((cv as any).currentCredits)
      } else if (profile?.credits !== undefined) {
        setCredits(profile.credits + 1)
      }
      showToast(`Uploaded "${cv.fileName}"! +1 Coin earned.`, 'success')
    }, [filters.pageSize, profile?.credits, setCredits, showToast])
  )

  // Trigger a full index refresh when the upload queue finishes all items
  const prevIsUploadingRef = useRef(false)
  useEffect(() => {
    if (prevIsUploadingRef.current && !uploadQueue.isUploading) {
      // Session processing completed or cancelled
      void refreshProfile()
      void loadCVs(undefined, true)
    }
    prevIsUploadingRef.current = uploadQueue.isUploading
  }, [uploadQueue.isUploading, loadCVs, refreshProfile])
  
  // Prevent sleep during uploads
  useWakeLock(uploadQueue.isUploading)

  useEffect(() => {
    const saved = localStorage.getItem('cv_upload_history')
    if (saved) {
      try {
        setLocalHistory(JSON.parse(saved))
      } catch {
        console.error('Failed to parse upload history')
      }
    }
  }, [])

  async function handleManualSync() {
    if (loading || syncing) return
    setSyncing(true)
    await loadCVs(undefined, true)
  }

  useEffect(() => {
    // Cancel any in-flight requests before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Don't even try to load if we are in a quota cooldown
    if (Date.now() < cooldownTime) {
      return
    }

    const handle = window.setTimeout(() => {
      void loadCVs(abortControllerRef.current?.signal)
    }, 250)

    return () => {
      window.clearTimeout(handle)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadCVs]) // loadCVs no longer depends on cooldownTime directly in a way that loops

  useEffect(() => {
    // Warn user before leaving during upload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadQueue.isUploading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [uploadQueue.isUploading])

  async function handleDelete(cv: CVRecord) {
    if (!user || !window.confirm(`Delete ${cv.fileName}?`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      await deleteCV(cv.id, token)
      setItems((current) => current.filter((item) => item.id !== cv.id))
      setTotal((current) => Math.max(0, current - 1))
      setTotalStorageBytes((current) => Math.max(0, current - cv.fileSize))
      setSelectedCv((current) => (current?.id === cv.id ? null : current))
      await loadCVs()
    } catch (deleteError) {
      setError(getApiError(deleteError))
    }
  }

  async function handleQuickEdit(cv: CVRecord) {
    setSelectedCv(cv)
    setPendingEdit(true)
    setActiveTab('review')
  }

  async function handleDownloadCv(cv: CVRecord) {
    if (!user || downloadingCvId) return
    const isOwner = Boolean(cv.isOwner || cv.userId === user.uid)
    const canDownload = Boolean(isOwner || cv.canDownload || cv.hasUnlockedDownload)

    if (canDownload && cv.downloadUrl) {
      window.open(cv.downloadUrl, '_blank')
      return
    }

    // Only prompt for 5 coins if user does NOT already own or have it unlocked
    if (!canDownload) {
      const currentCredits = profile?.credits ?? 10
      if (currentCredits < 5) {
        alert(`Insufficient coins! Downloading this CV requires 5 coins (current balance: ${currentCredits}). Please top up.`)
        return
      }

      const confirmed = window.confirm(
        `Download ${cv.fileName || 'this CV'} for 5 coins?\n(The uploader will receive 1 coin. You can re-download this CV unlimited times once unlocked.)`
      )
      if (!confirmed) return
    }

    setDownloadingCvId(cv.id)
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
      setItems((curr) => curr.map((item) => (item.id === cv.id ? updated : item)))
      if (selectedCv?.id === cv.id) {
        setSelectedCv(updated)
      }
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank')
      }
    } catch (downloadErr) {
      setError(getApiError(downloadErr))
    } finally {
      setDownloadingCvId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))

  const tabs = useMemo<WorkspaceTabItem[]>(
    () => [
      {
        id: 'library',
        label: 'Library',
        description: 'Search and browse CVs',
        icon: <SearchCheck className="h-4 w-4" />,
      },
      {
        id: 'upload',
        label: 'Upload',
        description: 'Add a new PDF',
        icon: <Upload className="h-4 w-4" />,
      },
      {
        id: 'review',
        label: 'Review',
        description: 'Inspect selected CV',
        icon: <UserRoundSearch className="h-4 w-4" />,
      },
    ],
    [],
  )

  return (
    <main className="min-h-screen px-2 py-4 sm:px-3 lg:px-4">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="glass-panel border-none p-5 shadow-panel animate-fade-in">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight text-slate-900">
                  Jobusiness
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Candidate Intelligence Workspace
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CoinBadge />
              <button
                type="button"
                onClick={handleManualSync}
                className="btn-secondary h-12 px-5"
                disabled={loading || syncing}
              >
                <RefreshCw className={`h-4 w-4 ${loading || syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
              <div className="h-10 w-px bg-slate-200 hidden sm:block mx-2" />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
          <StatCard
            label="Total Resumes"
            value={total.toString()}
            icon={<Users className="h-5 w-5" />}
            trend={{ value: '12%', positive: true }}
          />
          <StatCard
            label="Verified Talent"
            value={Math.floor(total * 0.8).toString()}
            icon={<SearchCheck className="h-5 w-5" />}
            tone="brand"
            trend={{ value: '5%', positive: true }}
          />
          <StatCard
            label="Extraction Rate"
            value="98.2%"
            icon={<TrendingUp className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label="Storage Used"
            value={formatFileSize(totalStorageBytes)}
            icon={<Upload className="h-5 w-5" />}
            tone="neutral"
          />
        </section>

        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as DashboardTab)}
        />

        {error ? (
          <div className="glass-panel flex items-start gap-3 border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {activeTab === 'upload' ? (
          <section className="mx-auto max-w-4xl">
            <UploadCard
              queue={uploadQueue.queue}
              isPaused={uploadQueue.isPaused}
              isUploading={uploadQueue.isUploading}
              stats={uploadQueue.stats}
              addFiles={uploadQueue.addFiles}
              pause={uploadQueue.pause}
              resume={uploadQueue.resume}
              cancel={uploadQueue.cancel}
              retryFailed={uploadQueue.retryFailed}
              history={localHistory}
              onClearHistory={() => {
                setLocalHistory([])
                localStorage.removeItem('cv_upload_history')
              }}
            />
          </section>
        ) : null}

        {activeTab === 'library' ? (
          <section className="space-y-4">
            <SearchToolbar
              filters={filters}
              onChange={(patch) =>
                setFilters((current) => ({
                  ...current,
                  ...patch,
                }))
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-4">
                <div className="glass-panel flex flex-wrap items-center justify-between gap-4 border-none p-6 shadow-panel">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-1 rounded-full bg-brand-500" />
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Candidate Library</h3>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {loading ? (
                          'Refreshing index...'
                        ) : isLimited ? (
                          <>
                            Showing {total.toLocaleString()} of {globalTotal.toLocaleString()} profiles
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              View Limited
                            </span>
                          </>
                        ) : (
                          `${total.toLocaleString()} profiles available`
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="btn-primary h-11 px-6 text-xs uppercase tracking-widest"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Upload
                  </button>
                </div>

                {loading ? (
                  <div className="glass-panel flex min-h-72 items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
                  </div>
                ) : items.length > 0 ? (
                  <>
                    <CvTable
                      items={items}
                      selectedId={selectedCv?.id}
                      query={filters.query}
                      onSelect={(cv) => {
                        setSelectedCv(cv)
                        if (window.innerWidth < 1280) {
                          setActiveTab('review')
                        }
                      }}
                      onDoubleClick={(cv) => {
                        setSelectedCv(cv)
                        setActiveTab('review')
                      }}
                      onDelete={handleDelete}
                      onEdit={handleQuickEdit}
                      onDownload={handleDownloadCv}
                      downloadingCvId={downloadingCvId}
                    />
                    <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <p className="text-slate-500">
                        Page {filters.page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={filters.page <= 1}
                          onClick={() =>
                            setFilters((current) => ({
                              ...current,
                              page: current.page - 1,
                            }))
                          }
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={filters.page >= totalPages}
                          onClick={() =>
                            setFilters((current) => ({
                              ...current,
                              page: current.page + 1,
                            }))
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No CVs found"
                    description="Upload a CV or adjust the search filters."
                  />
                )}
              </div>

              <div className="hidden xl:block">
                <CvDetailPanel
                  cv={selectedCv}
                  autoEdit={pendingEdit}
                  onUpdate={(updated) => {
                    setItems((current) =>
                      current.map((item) => (item.id === updated.id ? updated : item)),
                    )
                    setSelectedCv(updated)
                    setPendingEdit(false)
                  }}
                  onCancel={() => setPendingEdit(false)}
                />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'review' ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <CvDetailPanel
              cv={selectedCv}
              autoEdit={pendingEdit}
              onUpdate={(updated) => {
                setItems((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                )
                setSelectedCv(updated)
                setPendingEdit(false)
              }}
              onCancel={() => setPendingEdit(false)}
            />
            <div className="space-y-4">
              <div className="glass-panel p-4">
                <p className="text-sm font-semibold text-slate-900">Actions</p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="btn-secondary w-full justify-center"
                  >
                    Back to library
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="btn-secondary w-full justify-center"
                  >
                    Upload new CV
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <Toast
          message={toast?.message ?? null}
          type={toast?.type ?? 'info'}
          onClose={hideToast}
        />
      </div>
    </main>
  )
}
