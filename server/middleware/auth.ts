import type { NextFunction, Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from '../config/env.js'
import { adminAuth } from '../services/firebaseAdmin.js'
import { HttpError } from '../utils/httpError.js'

// Simple in-memory cache for user profiles to save Firestore reads
const profileCache = new Map<string, { profile: any; expires: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours (Profile Cache - Manual Reset via refresh=true)

// Simple in-memory rate limiting (Burst Guard)
const requestCounts = new Map<string, { count: number; lastReset: number }>()

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
    // Burst Guard: Limit to 5 requests per second per token (rough estimation)
    const now = Date.now()
    const rateLimitKey = idToken.slice(-20) // Use a portion of the token as key
    const userLimit = requestCounts.get(rateLimitKey) || { count: 0, lastReset: now }

    if (now - userLimit.lastReset > 1000) {
      userLimit.count = 1
      userLimit.lastReset = now
    } else {
      userLimit.count++
    }
    requestCounts.set(rateLimitKey, userLimit)

    if (userLimit.count > 10) {
      console.warn(`[Burst Guard] Rate limit exceeded for token ${rateLimitKey.slice(0, 5)}...`)
      next(new HttpError(429, 'Too many requests. Please slow down.'))
      return
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    // Check cache first (Bypass if refresh is requested)
    const forceRefresh = request.query.refresh === 'true'
    const cached = profileCache.get(decodedToken.uid)
    
    let profile = null
    
    if (!forceRefresh && cached && cached.expires > now) {
      profile = cached.profile
    } else {
      if (forceRefresh) {
        console.log(`[Auth] Force refreshing user profile from Firestore for ${decodedToken.uid}`)
      }
      // Fetch and sync profile in Firestore
      const db = getFirestore()
      const userDocRef = db.collection('users').doc(decodedToken.uid)
      const userDoc = await userDocRef.get()
      
      profile = userDoc.exists ? userDoc.data() : null

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
      
      // Update cache
      profileCache.set(decodedToken.uid, { profile, expires: now + CACHE_TTL_MS })
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
