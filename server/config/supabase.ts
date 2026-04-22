import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// We use the Service Role Key here because the server needs administrative access
// (Bypassing RLS) to perform migration and global record management.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
