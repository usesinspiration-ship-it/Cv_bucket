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
      setUser(nextUser)
      setLoading(false)
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
        await signInWithPopup(auth, googleProvider)
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
