import { existsSync, readFileSync } from 'node:fs'
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { env } from '../config/env.js'

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  // Remove surrounding quotes if present
  let cleaned = key.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  // Replace literal \\n with actual newlines
  return cleaned.replace(/\\n/g, '\n');
}

function getServiceAccount(): ServiceAccount | null {
  console.log(`[Firebase Init] Environment: ${env.NODE_ENV}`);
  console.log(`[Firebase Init] Project ID: ${env.FIREBASE_PROJECT_ID}`);

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    if (!existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      console.warn(`[Firebase Init] Service account file not found: ${env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
    } else {
      try {
        console.log('[Firebase Init] Using Service Account File');
        return JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')) as ServiceAccount;
      } catch (error) {
        console.error(`[Firebase Init] File Parse Error: ${error}`);
      }
    }
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      console.log('[Firebase Init] Using FIREBASE_SERVICE_ACCOUNT_KEY JSON');
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
      if (sa.privateKey) sa.privateKey = cleanPrivateKey(sa.privateKey)!;
      return sa;
    } catch (error) {
      console.error(`[Firebase Init] JSON Key Parse Error: ${error}`);
    }
  }

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    console.log(`[Firebase Init] Using CLIENT_EMAIL: ${env.FIREBASE_CLIENT_EMAIL}`);
    const key = cleanPrivateKey(env.FIREBASE_PRIVATE_KEY);
    if (!key || !key.includes('BEGIN PRIVATE KEY')) {
      console.error('[Firebase Init] ERROR: PRIVATE_KEY format looks invalid (missing BEGIN header)');
    }
    
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: key,
    };
  }

  console.warn('[Firebase Init] WARNING: No matching credentials found in environment variables.');
  return null;
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
