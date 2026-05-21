import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { checkDuplicates, uploadCV, getApiError } from '../services/api'
import { computeFileHash } from '../utils/hash'
import { playSuccessSound, playErrorSound } from '../utils/audio'
import type { CVRecord } from '../types/cv'

export interface QueueItem {
  id: string
  file: File
  status: 'pending' | 'hashing' | 'checking' | 'uploading' | 'success' | 'failed' | 'skipped'
  progress: number
  retries: number
  error?: string
}

export interface QueueStats {
  total: number
  completed: number
  failed: number
  skipped: number
  processing: number
  pending: number
}

const CONCURRENCY_LIMIT = 3
const MAX_RETRIES = 3

export function useUploadQueue(onUploadSuccess?: (cv: CVRecord) => void) {
  const { user } = useAuth()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Ref locks to avoid stale state in asynchronous recursion loop
  const queueRef = useRef<QueueItem[]>([])
  const isPausedRef = useRef(false)
  const activeCountRef = useRef(0)
  const abortControllersRef = useRef<Record<string, AbortController>>({})
  const retryTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const processNextRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Update refs when state changes
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Sync isUploading state based on active processes
  useEffect(() => {
    const active = queue.some(
      (item) => ['hashing', 'checking', 'uploading'].includes(item.status)
    )
    setIsUploading(active || activeCountRef.current > 0)
  }, [queue])

  // Clear timers and controllers on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach((ctrl) => ctrl.abort())
      Object.values(retryTimersRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Helper to update a single item's state in state list
  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }, [])

  // The core asynchronous execution loop
  const processNext = useCallback(async () => {
    if (isPausedRef.current || !user) return

    const pendingItem = queueRef.current.find((item) => item.status === 'pending')

    // Stop if we hit concurrency limit or have no pending items
    if (activeCountRef.current >= CONCURRENCY_LIMIT || !pendingItem) {
      return
    }

    const { id, file, retries } = pendingItem
    activeCountRef.current += 1
    
    // Step 1: Client Hashing
    updateItem(id, { status: 'hashing', error: undefined })

    try {
      // Abort-sensitive hash generation
      const hash = await computeFileHash(file)

      if (isPausedRef.current) {
        activeCountRef.current -= 1
        updateItem(id, { status: 'pending' })
        return
      }

      // Step 2: Check Duplicate
      updateItem(id, { status: 'checking' })
      let token = await user.getIdToken()
      let duplicates: string[] = []

      try {
        duplicates = await checkDuplicates([hash], token)
      } catch (checkErr) {
        const checkErrMsg = getApiError(checkErr)
        if (
          checkErrMsg.includes('expired') ||
          checkErrMsg.includes('token') ||
          checkErrMsg.includes('401') ||
          checkErrMsg.includes('auth/')
        ) {
          console.warn('🔄 ID token expired during check. Refreshing...')
          token = await user.getIdToken(true)
          duplicates = await checkDuplicates([hash], token)
        } else {
          throw checkErr
        }
      }

      if (duplicates.includes(hash)) {
        // Skipped duplicate
        updateItem(id, { status: 'skipped', progress: 100 })
        activeCountRef.current -= 1
        playSuccessSound()
        // Process next available item in parallel
        processNextRef.current()
        return
      }

      // Step 3: Network Upload
      updateItem(id, { status: 'uploading', progress: 0 })
      
      const controller = new AbortController()
      abortControllersRef.current[id] = controller

      let freshToken = await user.getIdToken()
      let uploadedRecord: CVRecord

      try {
        uploadedRecord = await uploadCV(
          file,
          freshToken,
          (progress) => {
            updateItem(id, { progress })
          },
          controller.signal
        )
      } catch (uploadErr) {
        const uploadErrMsg = getApiError(uploadErr)
        if (
          uploadErrMsg.includes('expired') ||
          uploadErrMsg.includes('token') ||
          uploadErrMsg.includes('401') ||
          uploadErrMsg.includes('auth/')
        ) {
          console.warn('🔄 Token expired during upload. Refreshing token and retrying upload...')
          freshToken = await user.getIdToken(true)
          uploadedRecord = await uploadCV(
            file,
            freshToken,
            (progress) => {
              updateItem(id, { progress })
            },
            controller.signal
          )
        } else {
          throw uploadErr
        }
      }

      // Success
      updateItem(id, { status: 'success', progress: 100 })
      delete abortControllersRef.current[id]
      activeCountRef.current -= 1
      playSuccessSound()

      if (onUploadSuccess) {
        onUploadSuccess(uploadedRecord)
      }

      // Continue queue
      processNextRef.current()

    } catch (err) {
      delete abortControllersRef.current[id]

      const errName = err && typeof err === 'object' && 'name' in err ? String((err as Record<string, unknown>).name) : ''
      const errMessage = err && typeof err === 'object' && 'message' in err ? String((err as Record<string, unknown>).message) : ''

      if (errName === 'CanceledError' || errMessage === 'canceled' || errName === 'AbortError') {
        // Canceled. Reset state to pending so it can be resumed later, or just return
        activeCountRef.current -= 1
        updateItem(id, { status: 'pending', progress: 0 })
        return
      }

      const errorMsg = getApiError(err)
      console.error(`Queue upload failed for ${file.name}:`, errorMsg)

      if (retries < MAX_RETRIES) {
        // Schedule auto-retry with exponential backoff
        const nextAttempt = retries + 1
        const backoffMs = Math.pow(2, retries) * 1000
        
        updateItem(id, {
          status: 'pending',
          retries: nextAttempt,
          progress: 0,
          error: `Retrying (Attempt ${nextAttempt}/${MAX_RETRIES}) in ${backoffMs / 1000}s...`
        })

        activeCountRef.current -= 1

        const timer = setTimeout(() => {
          delete retryTimersRef.current[id]
          processNextRef.current()
        }, backoffMs)

        retryTimersRef.current[id] = timer

      } else {
        // Hard fail
        updateItem(id, { status: 'failed', error: errorMsg })
        activeCountRef.current -= 1
        playErrorSound()
        processNextRef.current()
      }
    }
  }, [user, updateItem, onUploadSuccess])

  // Sync the loop ref
  useEffect(() => {
    processNextRef.current = processNext
  }, [processNext])

  // Monitor concurrency and spin up streams
  useEffect(() => {
    if (isPaused || !user || queue.length === 0) return

    const running = queue.filter((item) =>
      ['hashing', 'checking', 'uploading'].includes(item.status)
    ).length

    if (running < CONCURRENCY_LIMIT) {
      const pending = queue.some((item) => item.status === 'pending')
      if (pending) {
        processNextRef.current()
      }
    }
  }, [queue, isPaused, user])

  // Public control APIs
  const addFiles = useCallback((files: File[]) => {
    const newItems = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0,
      retries: 0,
    }))

    setQueue((prev) => [...prev, ...newItems])
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const cancel = useCallback(() => {
    // Graceful reset
    setIsPaused(true)
    
    // Abort in-flights
    Object.values(abortControllersRef.current).forEach((ctrl) => ctrl.abort())
    abortControllersRef.current = {}

    // Clear timers
    Object.values(retryTimersRef.current).forEach((timer) => clearTimeout(timer))
    retryTimersRef.current = {}

    activeCountRef.current = 0
    setQueue([])
  }, [])

  const retryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'failed'
          ? { ...item, status: 'pending', progress: 0, retries: 0, error: undefined }
          : item
      )
    )
    setIsPaused(false)
  }, [])

  // Calculate live statistics
  const stats: QueueStats = {
    total: queue.length,
    completed: queue.filter((item) => item.status === 'success').length,
    failed: queue.filter((item) => item.status === 'failed').length,
    skipped: queue.filter((item) => item.status === 'skipped').length,
    processing: queue.filter((item) =>
      ['hashing', 'checking', 'uploading'].includes(item.status)
    ).length,
    pending: queue.filter((item) => item.status === 'pending').length,
  }

  return {
    queue,
    isPaused,
    isUploading,
    stats,
    addFiles,
    pause,
    resume,
    cancel,
    retryFailed,
  }
}
