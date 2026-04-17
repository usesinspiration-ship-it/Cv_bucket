import type { DecodedIdToken } from 'firebase-admin/auth'

declare global {
  namespace Express {
    interface Request {
      authUser?: DecodedIdToken & { isAdmin: boolean; viewLimit: number }
    }
  }
}

export {}
