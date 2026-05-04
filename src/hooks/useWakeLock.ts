import { useEffect, useRef, useCallback } from 'react'

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<any>(null)

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        console.log('🔒 Screen Wake Lock is active')
      } catch (err: any) {
        console.warn(`Failed to request Wake Lock: ${err.name}, ${err.message}`)
      }
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        console.log('🔓 Screen Wake Lock was released')
      } catch (err: any) {
        console.error(`Failed to release Wake Lock: ${err.name}, ${err.message}`)
      }
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }

    return () => {
      releaseWakeLock()
    }
  }, [enabled, requestWakeLock, releaseWakeLock])

  // Re-request wake lock if tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (enabled && wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, requestWakeLock])
}
