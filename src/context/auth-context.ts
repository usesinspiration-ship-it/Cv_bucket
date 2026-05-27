import { createContext } from 'react'
import type { User } from 'firebase/auth'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  isAdmin: boolean
  role: string
  status: string
}

export interface AuthContextValue {
  user: User | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  configError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
