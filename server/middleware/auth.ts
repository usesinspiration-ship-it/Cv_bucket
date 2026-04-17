import type { NextFunction, Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from '../config/env.js'
import { adminAuth } from '../services/firebaseAdmin.js'
import { HttpError } from '../utils/httpError.js'

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  if (!adminAuth) {
    next(
      new HttpError(
        503,
        'Authentication service is uninitialized. Please check server logs for configuration errors.'
      )
    )
    return
  }

  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing bearer token.'))
    return
  }

  const idToken = authorization.replace('Bearer ', '')

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    
    // Fetch and sync profile in Firestore
    const db = getFirestore()
    const userDocRef = db.collection('users').doc(decodedToken.uid)
    const userDoc = await userDocRef.get()
    
    let profile = userDoc.exists ? userDoc.data() : null

    // Auto-create/sync user record
    if (!profile || !profile.email) {
      const adminEmails = env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase())
      const isConfiguredAdmin = !!decodedToken.email && adminEmails.includes(decodedToken.email.toLowerCase())
      
      const newProfile = {
        email: decodedToken.email || '',
        displayName: decodedToken.name || '',
        photoURL: decodedToken.picture || '',
        role: profile?.role || (isConfiguredAdmin ? 'admin' : 'user'),
        status: profile?.status || 'active',
        permissions: {
          canUpload: true,
          canDownload: true,
          canDelete: false,
        },
        visibility: {
          level: 'own',
        },
        viewLimit: 0,
        lastLogin: new Date().toISOString(),
      }
      
      await userDocRef.set(newProfile, { merge: true })
      profile = { ...(profile || {}), ...newProfile }
    }

    // Determine admin status (Database first, then .env fallback)
    const isAdmin = profile?.role === 'admin'

    request.authUser = {
      ...decodedToken,
      isAdmin,
      viewLimit: profile?.viewLimit || 0, // 0 means use global fallback
    }
    next()
  } catch (error: any) {
    console.error('[Auth Error] Firebase token verification failed:', error.code || error.message || error);
    next(new HttpError(401, `Invalid or expired Firebase token: ${error.code || 'unknown'}`))
  }
}
