import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { checkDuplicates, deleteCv, getCv, listCvs, updateCv, uploadCv } from '../controllers/cvController.js'
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

// Expose profile status endpoint (accessible to pending/suspended users to verify authorization state)
cvRouter.get('/profile', asyncHandler(async (req: any, res) => {
  if (!req.authUser) {
    throw new HttpError(401, 'Unauthorized')
  }
  res.json({
    uid: req.authUser.uid,
    email: req.authUser.email || '',
    displayName: req.authUser.name || '',
    photoURL: req.authUser.picture || '',
    isAdmin: req.authUser.isAdmin,
    role: req.authUser.role || 'user',
    status: req.authUser.status || 'active',
  })
}))

// Middleware to ensure user status is 'active' for all subsequent data read/write endpoints
const requireActiveUser = (req: any, res: any, next: any) => {
  if (req.authUser?.status !== 'active') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access restricted. Ask developer to allow you.',
      status: req.authUser?.status || 'pending'
    })
  }
  next()
}

cvRouter.use(requireActiveUser)

cvRouter.get('/', asyncHandler(listCvs))
cvRouter.post('/check-duplicates', asyncHandler(checkDuplicates))
cvRouter.get('/:id', asyncHandler(getCv))
cvRouter.post('/upload', upload.single('file'), asyncHandler(uploadCv))
cvRouter.patch('/:id', asyncHandler(updateCv))
cvRouter.delete('/:id', asyncHandler(deleteCv))
