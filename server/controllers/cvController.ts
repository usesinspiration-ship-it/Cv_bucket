import { randomUUID, createHash } from 'node:crypto'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import {
  createCvDocument,
  deleteCvById,
  findCvByHash,
  findCvByPhone,
  getCvById,
  listAllCvs,
  searchCvs,
  updateCvDocument,
  type CvRecord,
} from '../services/cvRepository.js'
import { parseCvBuffer } from '../services/parserService.js'
import {
  createDownloadUrl,
  createStoredFileUrl,
  deletePdfFromR2,
  uploadPdfToR2,
} from '../services/r2Service.js'
import { HttpError } from '../utils/httpError.js'

const listQuerySchema = z.object({
  query: z.string().optional().default(''),
  name: z.string().optional().default(''),
  skill: z.string().optional().default(''),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
})

const paramsSchema = z.object({
  id: z.string().min(1),
})

export async function uploadCv(request: Request, response: Response) {
  if (!request.authUser) {
    throw new HttpError(401, 'Authentication required.')
  }

  if (!request.file) {
    throw new HttpError(400, 'Attach a PDF or Word file under the "file" field.')
  }

  const documentId = randomUUID()
  const sanitizedName = request.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')
  const objectKey = `${request.authUser.uid}/${documentId}-${sanitizedName}`

  // Calculate file hash for duplicate detection
  const fileHash = createHash('sha256').update(request.file.buffer).digest('hex')

  try {
    // Check if this file already exists
    const existing = await findCvByHash(fileHash)
    if (existing) {
      throw new HttpError(400, `This CV has already been uploaded as "${existing.fileName}".`)
    }

    await uploadPdfToR2({
      key: objectKey,
      file: request.file.buffer,
      contentType: request.file.mimetype,
    })

    const parsed = await parseCvBuffer(
      request.file.buffer,
      request.file.mimetype,
      request.file.originalname
    )

    // Check if this phone number already exists
    if (parsed.phone) {
      const normalizedPhone = parsed.phone.replace(/\D/g, '')
      if (normalizedPhone) {
        const existingByPhone = await findCvByPhone(parsed.phone)
        if (existingByPhone) {
          throw new HttpError(400, `A CV for this phone number (${parsed.phone}) already exists: "${existingByPhone.fileName}".`)
        }
      }
    }

    const created = await createCvDocument({
      id: documentId,
      userId: request.authUser.uid,
      fileUrl: createStoredFileUrl(objectKey),
      objectKey,
      fileName: request.file.originalname,
      fileSize: request.file.size,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      rawText: parsed.rawText,
      fileHash,
    })

    if (!created) {
      throw new HttpError(500, 'Failed to create CV record.')
    }

    response.status(201).json(await serializeCv(created))
  } catch (error) {
    await deletePdfFromR2(objectKey).catch(() => undefined)
    throw error
  }
}

export async function listCvs(request: Request, response: Response) {
  if (!request.authUser) {
    throw new HttpError(401, 'Authentication required.')
  }

  const { isAdmin } = request.authUser
  const filters = listQuerySchema.parse(request.query)
  const allCvs = await listAllCvs()
  const filtered = searchCvs(allCvs, filters)

  // Apply limit for non-admins
  let viewable = filtered
  let isLimited = false

  if (!isAdmin) {
    const userSpecificLimit = request.authUser.viewLimit
    const globalLimit = env.USER_VIEW_LIMIT
    
    // Use user-specific limit if set (> 0), otherwise use global default
    const limit = userSpecificLimit > 0 ? userSpecificLimit : globalLimit
    
    if (limit > 0) {
      console.log(`[View Limit] User ${request.authUser.email} (${request.authUser.uid}) is NOT admin. Limit of ${limit} applied.`)
      if (filtered.length > limit) {
        viewable = filtered.slice(0, limit)
        isLimited = true
      }
    } else {
      console.log(`[View Limit] User ${request.authUser.email} (${request.authUser.uid}) is NOT admin, but has NO limit (unlimited).`)
    }
  } else {
    console.log(`[View Limit] User ${request.authUser.email} (${request.authUser.uid}) IS admin. No limit applied.`)
  }

  const start = (filters.page - 1) * filters.pageSize
  const paginated = viewable.slice(start, start + filters.pageSize)

  response.json({
    items: await Promise.all(paginated.map((cv) => serializeCv(cv))),
    total: viewable.length,
    page: filters.page,
    pageSize: filters.pageSize,
    totalStorageBytes: viewable.reduce((sum, cv) => sum + cv.fileSize, 0),
    isLimited,
    globalTotal: filtered.length,
  })
}

export async function getCv(request: Request, response: Response) {
  if (!request.authUser) {
    throw new HttpError(401, 'Authentication required.')
  }

  const { id } = paramsSchema.parse(request.params)
  const cv = await getCvById(id)
  if (!cv) {
    throw new HttpError(404, 'CV not found.')
  }

  // Optional: Check if non-admin can access this specific CV if it was beyond their list limit
  // For now, we allow access if they have the ID, but listing is restricted.

  response.json(await serializeCv(cv))
}

export async function deleteCv(request: Request, response: Response) {
  if (!request.authUser) {
    throw new HttpError(401, 'Authentication required.')
  }

  const { id } = paramsSchema.parse(request.params)
  const cv = await getCvById(id)
  if (!cv) {
    throw new HttpError(404, 'CV not found.')
  }

  // Only the owner or an admin can delete
  const isOwner = cv.userId === request.authUser.uid
  const isAdmin = !!request.authUser.isAdmin

  if (!isOwner && !isAdmin) {
    console.warn(`[Permission Denied] Delete attempt by ${request.authUser.email} (${request.authUser.uid}, admin:${isAdmin}) on CV ${cv.id} (Owner: ${cv.userId})`)
    throw new HttpError(403, 'You do not have permission to delete this CV.')
  }

  await deletePdfFromR2(cv.objectKey)
  await deleteCvById(cv.id)

  response.status(204).send()
}

async function serializeCv(cv: CvRecord) {
  return {
    ...cv,
    createdAt: toIsoString(cv.createdAt),
    downloadUrl: await createDownloadUrl(cv.objectKey, cv.fileName),
  }
}

function toIsoString(value: CvRecord['createdAt']) {
  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }

  if (value && typeof value === 'object' && '_seconds' in value) {
    const seconds = value._seconds ?? 0
    const nanoseconds = value._nanoseconds ?? 0
    return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000)).toISOString()
  }

  return new Date().toISOString()
}

const updateCvSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
})

export async function updateCv(request: Request, response: Response) {
  if (!request.authUser) {
    throw new HttpError(401, 'Authentication required.')
  }

  const { id } = z.object({ id: z.string() }).parse(request.params)
  const updates = updateCvSchema.parse(request.body)

  const existing = await getCvById(id)
  if (!existing) {
    throw new HttpError(404, 'CV not found.')
  }

  // Ensure user owns this CV or is admin
  if (!request.authUser.isAdmin && existing.userId !== request.authUser.uid) {
    console.warn(`[Permission Denied] Update attempt by ${request.authUser.email} (${request.authUser.uid}, admin:${request.authUser.isAdmin}) on CV ${id} (Owner: ${existing.userId})`)
    throw new HttpError(403, 'You do not have permission to edit this CV.')
  }

  const updated = await updateCvDocument(id, updates)
  if (!updated) {
    throw new HttpError(500, 'Failed to update CV.')
  }

  response.json(await serializeCv(updated))
}
