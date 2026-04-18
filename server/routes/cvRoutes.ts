import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { deleteCv, getCv, listCvs, updateCv, uploadCv } from '../controllers/cvController.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    const isAllowed =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|doc|docx)$/i.test(file.originalname)

    if (!isAllowed) {
      callback(new HttpError(400, 'Only PDF and Word files (.doc, .docx) are allowed.'))
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
cvRouter.patch('/:id', asyncHandler(updateCv))
cvRouter.delete('/:id', asyncHandler(deleteCv))
