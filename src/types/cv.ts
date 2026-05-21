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
