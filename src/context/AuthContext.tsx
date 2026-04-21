import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, firebaseConfigError, googleProvider } from '../services/firebase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const checkAndSetUser = async () => {
        // Frontend Whitelist Check
        if (nextUser?.email) {
          const allowedStr = import.meta.env.VITE_ALLOWED_EMAILS || ''
          if (allowedStr) {
            const allowed = allowedStr.split(',').map((e: string) => e.trim().toLowerCase())
            if (!allowed.includes(nextUser.email.toLowerCase())) {
              console.warn('[Auth] Redirecting unauthorized user:', nextUser.email)
              await signOut(auth!)
              setUser(null)
              setLoading(false)
              return
            }
          }
        }
        
        setUser(nextUser)
        setLoading(false)
      }

      void checkAndSetUser()
    })

    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configError: firebaseConfigError,
      async login(email, password) {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        await signInWithEmailAndPassword(auth, email, password)
      },
      async register(email, password) {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        await createUserWithEmailAndPassword(auth, email, password)
      },
      async loginWithGoogle() {
        if (!auth || !googleProvider) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        const result = await signInWithPopup(auth, googleProvider)
        
        // Immediate check for better UX
        const userEmail = result.user.email?.toLowerCase() || ''
        const allowedStr = import.meta.env.VITE_ALLOWED_EMAILS || ''
        if (allowedStr) {
          const allowed = allowedStr.split(',').map((e: string) => e.trim().toLowerCase())
          if (!allowed.includes(userEmail)) {
            await signOut(auth)
            throw new Error('Your email is not authorized to access this system.')
          }
        }
      },
      async logout() {
        if (!auth) {
          return
        }
        await signOut(auth)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
