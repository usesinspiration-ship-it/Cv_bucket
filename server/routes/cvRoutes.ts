import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { deleteCv, getCv, listCvs, uploadCv } from '../controllers/cvController.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      callback(new HttpError(400, 'Only PDF files are allowed.'))
      return
    }

    callback(null, true)
  },
})

export const cvRouter = Router()

cvRouter.use(requireAuth)
cvRouter.get('/', asyncHandler(listCvs))
cvRouter.get('/:id', asyncHandler(getCv))
cvRouter.post('/upload', upload.single('file'), asyncHandler(uploadCv))
cvRouter.delete('/:id', asyncHandler(deleteCv))
