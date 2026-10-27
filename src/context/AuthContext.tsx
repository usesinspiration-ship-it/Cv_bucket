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
  updateProfile,
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
  const data = await res.json()
  return {
    ...data,
    credits: typeof data.credits === 'number' ? data.credits : 10,
  }
}

const updateServerProfile = async (token: string, displayName: string): Promise<UserProfile> => {
  const baseUrl = import.meta.env.VITE_API_URL ?? '/api'
  const res = await fetch(`${baseUrl}/cvs/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName }),
  })
  if (!res.ok) {
    throw new Error('Failed to update profile on server')
  }
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [profileLoading, setProfileLoading] = useState(false)

  const syncProfile = useCallback(async (firebaseUser: any, isInitial = false) => {
    if (!firebaseUser) {
      setProfile(null)
      return
    }

    if (isInitial) {
      setProfileLoading(true)
    }
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
      if (isInitial) {
        setProfileLoading(false)
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!auth?.currentUser) return
    await syncProfile(auth.currentUser, false)
  }, [syncProfile])

  useEffect(() => {
    if (!auth) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        setUser(nextUser)
        await syncProfile(nextUser, true)
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
      async register(email, password, name) {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured.')
        }
        setProfileLoading(true)
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const trimmedName = name?.trim()
          if (trimmedName) {
            try {
              await updateProfile(userCredential.user, { displayName: trimmedName })
            } catch (profileError) {
              console.warn('Failed to set initial displayName in Firebase Auth:', profileError)
            }
          }
          const token = await userCredential.user.getIdToken(true)
          const data = await fetchProfile(token)
          
          let finalProfile = data
          if (trimmedName && (!data.displayName || data.displayName !== trimmedName)) {
            try {
              finalProfile = await updateServerProfile(token, trimmedName)
            } catch (syncErr) {
              console.warn('Initial server profile update notice:', syncErr)
            }
          }
          
          if (finalProfile.status !== 'active') {
            await signOut(auth)
            setProfile(null)
            setUser(null)
            throw new Error(
              finalProfile.status === 'suspended'
                ? 'Your account is suspended. Please contact the administrator.'
                : 'Access restricted. Ask developer to allow you.'
            )
          }
          
          setProfile(finalProfile)
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
      async updateName(name: string) {
        if (!auth?.currentUser) {
          throw new Error('You must be signed in to update your name.')
        }
        const trimmedName = name.trim()
        if (!trimmedName) {
          throw new Error('Name cannot be empty.')
        }

        setProfileLoading(true)
        try {
          await updateProfile(auth.currentUser, { displayName: trimmedName })
          const token = await auth.currentUser.getIdToken(true)

          try {
            const updated = await updateServerProfile(token, trimmedName)
            setProfile(updated)
          } catch {
            setProfile((prev) => (prev ? { ...prev, displayName: trimmedName } : null))
          }

          // Trigger a new user reference to notify components of displayName update
          const updatedUser = Object.assign(
            Object.create(Object.getPrototypeOf(auth.currentUser)),
            auth.currentUser,
            { displayName: trimmedName }
          )
          setUser(updatedUser)
        } finally {
          setProfileLoading(false)
        }
      },
      setCredits: (credits: number) => {
        setProfile((prev) => (prev ? { ...prev, credits } : null))
      },
    }),
    [loading, user, profile, profileLoading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
