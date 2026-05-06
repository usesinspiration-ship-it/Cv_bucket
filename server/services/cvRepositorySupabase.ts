import { supabase } from '../config/supabase.js'
import { calculateR2BucketUsage } from './r2Service.js'

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
  uploaderEmail?: string
  createdAt: string
}

export interface SearchFilters {
  query: string
  name: string
  skill: string
  page: number
  pageSize: number
}

// Storage stats cache (same logic as before to save R2 API calls)
let cachedStorageBytes = 0
let lastStorageUpdate = 0
const DATA_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Sanitizes a value by removing null bytes (\u0000) which PostgreSQL does not support in text/jsonb fields.
 */
function sanitizeForPostgres(val: any): any {
  if (typeof val === 'string') {
    return val.replace(/\u0000/g, '')
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeForPostgres)
  }
  if (typeof val === 'object' && val !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(val)) {
      sanitized[key] = sanitizeForPostgres(value)
    }
    return sanitized
  }
  return val
}

export async function createCvDocument(data: Omit<CvRecord, 'createdAt'>): Promise<CvRecord | null> {
  try {
    const sanitizedData = sanitizeForPostgres(data)
    const { data: record, error } = await supabase
      .from('cvs')
      .insert({ ...sanitizedData, createdAt: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return record as CvRecord
  } catch (error) {
    console.error('Error creating CV document in Supabase:', error)
    return null
  }
}

export async function getCvById(id: string): Promise<CvRecord | null> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as CvRecord
  } catch (error) {
    console.error('Error getting CV by ID from Supabase:', error)
    return null
  }
}

export async function findCvByHash(hash: string): Promise<CvRecord | null> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('fileHash', hash)
      .limit(1)
      .maybeSingle()

    if (error) return null
    return data as CvRecord
  } catch (error) {
    console.error('Error finding CV by hash from Supabase:', error)
    return null
  }
}

export async function findCvByPhone(phone: string): Promise<CvRecord | null> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle()

    if (error) return null
    return data as CvRecord
  } catch (error) {
    console.error('Error finding CV by phone from Supabase:', error)
    return null
  }
}

export async function listUserCvs(userId: string): Promise<CvRecord[]> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })

    if (error) throw error
    return data as CvRecord[]
  } catch (error) {
    console.error('Error listing user CVs from Supabase:', error)
    return []
  }
}

export async function listCvsPaginated(
  filters: SearchFilters,
  forceRefresh = false
): Promise<{ items: CvRecord[]; total: number; totalStorageBytes: number }> {
  try {
    const now = Date.now()
    
    // 1. Build Search Query
    let queryBuilder = supabase
      .from('cvs')
      .select('id, userId, uploaderEmail, fileUrl, objectKey, fileName, fileSize, name, email, phone, skills, experience, education, fileHash, salary, location, createdAt, rawText', { count: 'exact' })

    if (filters.query) {
      // Use PostgreSQL Full-Text Search on the generated search_vector column
      // 'plainto_tsquery' handles multi-word queries gracefully
      queryBuilder = queryBuilder.textSearch('search_vector', filters.query, {
        type: 'plain',
        config: 'english'
      })
    }

    if (filters.name) {
      queryBuilder = queryBuilder.ilike('name', `%${filters.name}%`)
    }

    if (filters.skill) {
      queryBuilder = queryBuilder.contains('skills', [filters.skill])
    }

    // 2. Add Pagination & Sorting
    const from = (filters.page - 1) * filters.pageSize
    const to = from + filters.pageSize - 1

    const startTime = performance.now()
    const { data, count, error } = await queryBuilder
      .order('createdAt', { ascending: false })
      .range(from, to)
    const duration = (performance.now() - startTime).toFixed(2)

    if (error) throw error

    console.log(`⏱️ [Supabase] listCvsPaginated took ${duration}ms (total: ${count})`)

    // 3. Handle Storage Calculation (Shared R2 Logic)
    const useStorageCache = !forceRefresh && lastStorageUpdate > 0 && (now - lastStorageUpdate < DATA_CACHE_TTL)
    if (!useStorageCache) {
      cachedStorageBytes = await calculateR2BucketUsage()
      lastStorageUpdate = now
    }

    return {
      items: (data || []) as CvRecord[],
      total: count || 0,
      totalStorageBytes: cachedStorageBytes,
    }
  } catch (error) {
    console.error('Error listing paginated CVs from Supabase:', error)
    return { items: [], total: 0, totalStorageBytes: 0 }
  }
}

export async function listAllCvs(): Promise<CvRecord[]> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .limit(100)
    
    if (error) throw error
    return data as CvRecord[]
  } catch (error) {
    console.error('Error listing all CVs from Supabase:', error)
    return []
  }
}

export async function updateCvDocument(id: string, updates: Partial<CvRecord>): Promise<CvRecord | null> {
  try {
    const sanitizedUpdates = sanitizeForPostgres(updates)
    const { data, error } = await supabase
      .from('cvs')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as CvRecord
  } catch (error) {
    console.error('Error updating CV in Supabase:', error)
    return null
  }
}

export async function deleteCvById(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('cvs')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting CV from Supabase:', error)
    throw error
  }
}
