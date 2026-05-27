import {
  useEffect,
  useMemo,
  useState,
  useCallback,
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
import { AuthContext, type AuthContextValue, type UserProfile } from './auth-context'

const fetchProfile = async (token: string): Promise<UserProfile> => {
  const baseUrl = import.meta.env.VITE_API_URL ?? '/api'
  const res = await fetch(`${baseUrl}/cvs/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || 'Access restricted. Ask developer to allow you.')
    }
    throw new Error('Failed to fetch user profile')
  }
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [profileLoading, setProfileLoading] = useState(false)

  const syncProfile = useCallback(async (firebaseUser: any) => {
    if (!firebaseUser) {
      setProfile(null)
      return
    }

    setProfileLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const data = await fetchProfile(token)
      
      if (data.status !== 'active') {
        await signOut(auth!)
        setProfile(null)
        setUser(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Session validation failed:', err)
      await signOut(auth!).catch(() => {})
      setProfile(null)
      setUser(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!auth?.currentUser) return
    await syncProfile(auth.currentUser)
  }, [syncProfile])

  useEffect(() => {
    if (!auth) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        setUser(nextUser)
        await syncProfile(nextUser)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [syncProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      profile,
      profileLoading,
      configError: firebaseConfigError,
      async login(email, password) {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        setProfileLoading(true)
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const token = await userCredential.user.getIdToken()
          const data = await fetchProfile(token)
          
          if (data.status !== 'active') {
            await signOut(auth)
            setProfile(null)
            setUser(null)
            throw new Error(
              data.status === 'suspended'
                ? 'Your account is suspended. Please contact the administrator.'
                : 'Access restricted. Ask developer to allow you.'
            )
          }
          
          setProfile(data)
          setUser(userCredential.user)
        } catch (err: any) {
          await signOut(auth).catch(() => {})
          setProfile(null)
          setUser(null)
          throw err
        } finally {
          setProfileLoading(false)
        }
      },
      async register(email, password) {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        setProfileLoading(true)
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const token = await userCredential.user.getIdToken()
          const data = await fetchProfile(token)
          
          if (data.status !== 'active') {
            await signOut(auth)
            setProfile(null)
            setUser(null)
            throw new Error(
              data.status === 'suspended'
                ? 'Your account is suspended. Please contact the administrator.'
                : 'Access restricted. Ask developer to allow you.'
            )
          }
          
          setProfile(data)
          setUser(userCredential.user)
        } catch (err: any) {
          await signOut(auth).catch(() => {})
          setProfile(null)
          setUser(null)
          throw err
        } finally {
          setProfileLoading(false)
        }
      },
      async loginWithGoogle() {
        if (!auth || !googleProvider) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        setProfileLoading(true)
        try {
          const userCredential = await signInWithPopup(auth, googleProvider)
          const token = await userCredential.user.getIdToken()
          const data = await fetchProfile(token)
          
          if (data.status !== 'active') {
            await signOut(auth)
            setProfile(null)
            setUser(null)
            throw new Error(
              data.status === 'suspended'
                ? 'Your account is suspended. Please contact the administrator.'
                : 'Access restricted. Ask developer to allow you.'
            )
          }
          
          setProfile(data)
          setUser(userCredential.user)
        } catch (err: any) {
          await signOut(auth).catch(() => {})
          setProfile(null)
          setUser(null)
          throw err
        } finally {
          setProfileLoading(false)
        }
      },
      async logout() {
        if (!auth) {
          return
        }
        await signOut(auth)
        setProfile(null)
        setUser(null)
      },
      refreshProfile,
    }),
    [loading, user, profile, profileLoading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
