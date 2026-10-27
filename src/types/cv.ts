export interface CVRecord {
  id: string
  userId: string
  fileUrl: string
  downloadUrl?: string
  objectKey: string
  fileName: string
  fileSize: number
  name: string
  email: string
  phone: string
  skills: string[]
  experience: string
  education: string
  rawText: string
  salary?: string
  location?: string
  uploaderEmail?: string
  createdAt: string
  relevancy?: number
  isOwner?: boolean
  hasUnlockedView?: boolean
  hasUnlockedDownload?: boolean
  canView?: boolean
  canDownload?: boolean
}

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  balanceAfter: number
  type: string
  cvId?: string
  targetUserId?: string
  description: string
  createdAt: string
}

export interface CvAccessResponse {
  access: {
    isOwner: boolean
    hasUnlockedView: boolean
    hasUnlockedDownload: boolean
    canView: boolean
    canDownload: boolean
  }
  userCredits: number
}

export interface UnlockViewResponse {
  cv: CVRecord
  currentCredits: number
  alreadyUnlocked: boolean
}

export interface UnlockDownloadResponse {
  downloadUrl: string
  currentCredits: number
  alreadyUnlocked: boolean
  ownerRewarded?: boolean
}

export interface SearchFilters {
  query: string
  name: string
  skill: string
  page: number
  pageSize: number
}

export interface PaginatedCvResponse {
  items: CVRecord[]
  total: number
  page: number
  pageSize: number
  totalStorageBytes: number
  isLimited?: boolean
  globalTotal?: number
}
