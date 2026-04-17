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
  createdAt: Timestamp | Date | string | { _seconds?: number; _nanoseconds?: number }
}

const COLLECTION_NAME = 'cvs'

export async function createCvDocument(data: Omit<CvRecord, 'createdAt'>): Promise<CvRecord | null> {
  try {
    const db = getFirestore()
    const docRef = db.collection(COLLECTION_NAME).doc(data.id)
    const createdAt = Timestamp.now()
    await docRef.set({
      ...data,
      createdAt,
    })
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

export async function listAllCvs(): Promise<CvRecord[]> {
  try {
    const db = getFirestore()
    const snapshot = await db.collection(COLLECTION_NAME).get()

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

export async function deleteCvById(id: string): Promise<void> {
  try {
    const db = getFirestore()
    await db.collection(COLLECTION_NAME).doc(id).delete()
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
