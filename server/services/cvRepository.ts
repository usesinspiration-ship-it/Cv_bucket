import { Timestamp, getFirestore } from 'firebase-admin/firestore'

export interface CvRecord {
  id: string
  userId: string
  fileUrl: string
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
  fileHash: string
  salary?: string
  location?: string
  createdAt: Timestamp | Date | string | { _seconds?: number; _nanoseconds?: number }
}

const COLLECTION_NAME = 'cvs'

// Cache for CV records to save Firestore reads
let cvCache: CvRecord[] | null = null
let lastCacheUpdate = 0
const DATA_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function invalidateCache() {
  cvCache = null
  lastCacheUpdate = 0
}

export async function createCvDocument(data: Omit<CvRecord, 'createdAt'>): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const docRef = db.collection(COLLECTION_NAME).doc(data.id)
    const createdAt = Timestamp.now()
    await docRef.set({
      ...data,
      createdAt,
    })
    invalidateCache()
    return { ...data, createdAt }
  } catch (error) {
    console.error('Error creating CV document:', error)
    return null
  }
}

export async function getCvById(id: string): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const doc = await db.collection(COLLECTION_NAME).doc(id).get()
    if (!doc.exists) {
      return null
    }
    return { id: doc.id, ...doc.data() } as CvRecord
  } catch (error) {
    console.error('Error getting CV by ID:', error)
    return null
  }
}

export async function findCvByHash(hash: string): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const snapshot = await db.collection(COLLECTION_NAME).where('fileHash', '==', hash).limit(1).get()
    if (snapshot.empty) {
      return null
    }
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as CvRecord
  } catch (error) {
    console.error('Error finding CV by hash:', error)
    return null
  }
}

export async function findCvByPhone(phone: string): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const snapshot = await db.collection(COLLECTION_NAME).where('phone', '==', phone).limit(1).get()
    if (snapshot.empty) {
      return null
    }
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as CvRecord
  } catch (error) {
    console.error('Error finding CV by phone:', error)
    return null
  }
}

export async function listUserCvs(userId: string): Promise<CvRecord[]> {
  try {
    const db = getFirestore()
    const snapshot = await db.collection(COLLECTION_NAME).where('userId', '==', userId).get()

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as CvRecord)
      .sort((left, right) => getCreatedAtMs(right.createdAt) - getCreatedAtMs(left.createdAt))
  } catch (error) {
    console.error('Error listing user CVs:', error)
    return []
  }
}

export async function listCvsPaginated(
  filters: SearchFilters, 
  forceRefresh = false
): Promise<{ items: CvRecord[]; total: number; totalStorageBytes: number; globalStorageBytes: number; globalTotal: number }> {
  try {
    const db = getFirestore()
    const now = Date.now()

    // Decide if we should use the cache or re-fetch from Firestore
    const useCache = !forceRefresh && cvCache && (now - lastCacheUpdate < DATA_CACHE_TTL)
    
    let allItems: CvRecord[] = []

    if (useCache && cvCache) {
      console.log('[Cache] Serving CVs from memory cache')
      allItems = cvCache
    } else {
      console.log(`[Cache] Fetching CVs from Firestore (ForceRefresh: ${forceRefresh})`)
      const snapshot = await db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').get()
      allItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CvRecord)
      
      // Update cache
      cvCache = allItems
      lastCacheUpdate = now
    }

    // Calculate global storage (of every item in the library)
    // Heuristic: If fileSize is missing (legacy data), assume 500KB average per CV
    const LEGACY_FILE_SIZE_BYTES = 500 * 1024
    const globalStorageBytes = allItems.reduce((sum, cv) => sum + Number(cv.fileSize || LEGACY_FILE_SIZE_BYTES), 0)

    // In-memory filtering (always safe now that we have all items in cache or fresh fetch)
    const filtered = searchCvs(allItems, filters)
    
    // Calculate storage of only the filtered items
    const filteredStorageBytes = filtered.reduce((sum, cv) => sum + Number(cv.fileSize || LEGACY_FILE_SIZE_BYTES), 0)

    const start = (filters.page - 1) * filters.pageSize
    const paginated = filtered.slice(start, start + filters.pageSize)

    return {
      items: paginated,
      total: filtered.length,
      totalStorageBytes: filteredStorageBytes,
      globalStorageBytes,
      globalTotal: allItems.length,
    }
  } catch (error) {
    console.error('Error listing paginated CVs:', error)
    return { items: [], total: 0, totalStorageBytes: 0, globalStorageBytes: 0, globalTotal: 0 }
  }
}

export async function listAllCvs(): Promise<CvRecord[]> {
  // Still keep this but we should avoid using it in controllers
  try {
    const db = getFirestore()
    const snapshot = await db.collection(COLLECTION_NAME).limit(100).get()

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as CvRecord)
      .sort((left, right) => getCreatedAtMs(right.createdAt) - getCreatedAtMs(left.createdAt))
  } catch (error) {
    console.error('Error listing all CVs:', error)
    return []
  }
}

export interface SearchFilters {
  query: string
  name: string
  skill: string
  page: number
  pageSize: number
}

export function searchCvs(cvs: CvRecord[], filters: SearchFilters): CvRecord[] {
  return cvs.filter((cv) => {
    const queryMatch =
      !filters.query ||
      cv.rawText.toLowerCase().includes(filters.query.toLowerCase()) ||
      cv.name.toLowerCase().includes(filters.query.toLowerCase()) ||
      cv.email.toLowerCase().includes(filters.query.toLowerCase())

    const nameMatch =
      !filters.name || cv.name.toLowerCase().includes(filters.name.toLowerCase())

    const skillMatch =
      !filters.skill ||
      cv.skills.some((skill) => skill.toLowerCase().includes(filters.skill.toLowerCase()))

    return queryMatch && nameMatch && skillMatch
  })
}

export async function updateCvDocument(id: string, updates: Partial<CvRecord>): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const docRef = db.collection(COLLECTION_NAME).doc(id)
    
    // We don't want to allow updating certain fields like createdAt or id via this method
    const { createdAt, id: _id, ...cleanUpdates } = updates as any
    
    await docRef.update(cleanUpdates)
    invalidateCache()
    const updatedDoc = await docRef.get()
    
    if (!updatedDoc.exists) {
      return null
    }
    
    return { id: updatedDoc.id, ...updatedDoc.data() } as CvRecord
  } catch (error) {
    console.error('Error updating CV:', error)
    return null
  }
}

export async function deleteCvById(id: string): Promise<void> {
  try {
    const db = getFirestore()
    await db.collection(COLLECTION_NAME).doc(id).delete()
    invalidateCache()
  } catch (error) {
    console.error('Error deleting CV:', error)
    throw error
  }
}

function getCreatedAtMs(value: CvRecord['createdAt']): number {
  if (typeof value === 'string') {
    return new Date(value).getTime()
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  if (value instanceof Timestamp) {
    return value.toMillis()
  }

  if (value && typeof value === 'object' && '_seconds' in value) {
    const seconds = value._seconds ?? 0
    const nanoseconds = value._nanoseconds ?? 0
    return seconds * 1000 + Math.floor(nanoseconds / 1_000_000)
  }

  return 0
}
