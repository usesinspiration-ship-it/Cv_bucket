import { existsSync, readFileSync } from 'node:fs'
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { env } from '../config/env.js'

function getServiceAccount(): ServiceAccount | null {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    if (!existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      console.error(
        `\x1b[31mFirebase service account file not found at: ${env.FIREBASE_SERVICE_ACCOUNT_PATH}\x1b[0m`
      )
      return null
    }
    try {
      return JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')) as ServiceAccount
    } catch (error) {
      console.error(`\x1b[31mFailed to parse Firebase service account file: ${error}\x1b[0m`)
      return null
    }
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount
      if (sa.privateKey) {
        sa.privateKey = sa.privateKey.replace(/\\n/g, '\n')
      }
      return sa
    } catch (error) {
      console.error(`\x1b[31mFailed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${error}\x1b[0m`)
      return null
    }
  }

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  console.warn(
    '\x1b[33mNo Firebase credentials provided. Provide FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_KEY, or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.\x1b[0m'
  )
  return null
}

let firebaseApp = getApps()[0]
let auth: Auth | undefined
let db: Firestore | undefined

const serviceAccount = getServiceAccount()

if (serviceAccount || getApps().length > 0) {
  try {
    if (!firebaseApp && serviceAccount) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: env.FIREBASE_PROJECT_ID,
      })
    }
    
    if (firebaseApp) {
      auth = getAuth(firebaseApp)
      db = getFirestore(firebaseApp)
    }
  } catch (error) {
    console.error(`\x1b[31mFailed to initialize Firebase Admin SDK: ${error}\x1b[0m`)
  }
} else {
  console.error('\x1b[31mFirebase Admin SDK NOT initialized. Authentication and Database features will be unavailable.\x1b[0m')
}

// Exported as undefined if initialization failed, rather than throwing during module load
export const adminAuth = auth!
export const firestore = db!
