import { AlertCircle, FileText, RefreshCw, SearchCheck, TrendingUp, Upload, UserRoundSearch, Users } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { useDeferredValue, useEffect, useCallback, useMemo, useState } from 'react'
import { CvDetailPanel } from '../components/CvDetailPanel'
import { CvTable } from '../components/CvTable'
import { EmptyState } from '../components/EmptyState'
import { ProfileMenu } from '../components/ProfileMenu'
import { SearchToolbar } from '../components/SearchToolbar'
import { UploadCard } from '../components/UploadCard'
import {
  WorkspaceTabs,
  type WorkspaceTabItem,
} from '../components/WorkspaceTabs'
import { useAuth } from '../hooks/useAuth'
import { deleteCV, fetchCVs, getApiError, uploadCV } from '../services/api'
import type { CVRecord, SearchFilters } from '../types/cv'
import { formatFileSize } from '../utils/format'

const initialFilters: SearchFilters = {
  query: '',
  name: '',
  skill: '',
  page: 1,
  pageSize: 10,
}

type DashboardTab = 'library' | 'upload' | 'review'

export function DashboardPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<CVRecord[]>([])
  const [total, setTotal] = useState(0)
  const [selectedCv, setSelectedCv] = useState<CVRecord | null>(null)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const deferredQuery = useDeferredValue(filters.query)
  const deferredName = useDeferredValue(filters.name)
  const deferredSkill = useDeferredValue(filters.skill)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<DashboardTab>('library')
  const [totalStorageBytes, setTotalStorageBytes] = useState(0)
  const [globalTotal, setGlobalTotal] = useState(0)
  const [isLimited, setIsLimited] = useState(false)

  const loadCVs = useCallback(async () => {
    if (!user) {
      return
    }

    setLoading(true)
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
      setError(getApiError(loadError))
    } finally {
      setLoading(false)
    }
  }, [deferredName, deferredQuery, deferredSkill, filters.page, filters.pageSize, user])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCVs()
    }, 250)

    return () => window.clearTimeout(handle)
  }, [loadCVs])

  async function handleUpload(files: File[]) {
    if (!user || files.length === 0) {
      return
    }

    setUploading(true)
    setError('')
    
    let successCount = 0
    let failureCount = 0

    try {
      const token = await user.getIdToken()
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const displayIndex = i + 1
        setUploadStatus(`Uploading ${file.name} (${displayIndex}/${files.length})`)
        setUploadProgress(0)

        try {
          const created = await uploadCV(file, token, setUploadProgress)
          successCount++
          
          // Optionally update local list for immediate feedback
          if (files.length === 1) {
            setItems((current) => [created, ...current].slice(0, filters.pageSize))
            setTotal((current) => current + 1)
            setTotalStorageBytes((current) => current + created.fileSize)
            setSelectedCv(created)
          }
        } catch (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError)
          failureCount++
        }
      }

      if (failureCount > 0) {
        setError(`Completed with issues: ${successCount} successful, ${failureCount} failed.`)
      } else if (files.length > 1) {
        // Success message for bulk
        setUploadStatus(`Successfully uploaded ${successCount} files.`)
      }

      if (successCount > 0 && files.length > 1) {
        setActiveTab('library')
      } else if (successCount > 0) {
        setActiveTab('review')
      }

    } catch (generalError) {
      setError(getApiError(generalError))
    } finally {
      setUploading(false)
      setUploadStatus('')
      window.setTimeout(() => setUploadProgress(0), 400)
      await loadCVs()
    }
  }

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
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <header className="glass-panel border-none p-5 shadow-panel animate-fade-in">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight text-slate-900">
                  CV Bucket
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Candidate Intelligence Workspace
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void loadCVs()}
                className="btn-secondary h-12 px-5"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Sync Data
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
              busy={uploading}
              progress={uploadProgress}
              status={uploadStatus}
              onUpload={handleUpload}
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
                      onDelete={handleDelete}
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
                <CvDetailPanel cv={selectedCv} />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'review' ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <CvDetailPanel cv={selectedCv} />
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
      </div>
    </main>
  )
}
