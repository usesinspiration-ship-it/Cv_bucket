import { randomUUID } from 'node:crypto'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  balanceAfter: number
  type:
    | 'signup_bonus'
    | 'upload_reward'
    | 'view_cost'
    | 'download_cost'
    | 'download_reward'
    | 'topup_dummy'
    | 'topup_gateway'
  cvId?: string
  targetUserId?: string
  description: string
  createdAt: string
}

export interface UserCvAccess {
  isOwner: boolean
  hasUnlockedView: boolean
  hasUnlockedDownload: boolean
  canView: boolean
  canDownload: boolean
}

const DEFAULT_INITIAL_CREDITS = 10
const VIEW_COST = 1
const DOWNLOAD_COST = 5
const UPLOAD_REWARD = 1
const DOWNLOAD_OWNER_REWARD = 1

/**
 * Ensures user has credits initialized in Supabase (default 10) and logs a signup bonus if first time.
 */
export async function ensureUserCreditsInitialized(uid: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', uid)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('[Supabase Credits] Error checking credits:', error.message)
    }

    if (data && typeof data.credits === 'number') {
      return data.credits
    }

    // Insert initial credits record
    const { error: insertError } = await supabase
      .from('user_credits')
      .upsert(
        { user_id: uid, credits: DEFAULT_INITIAL_CREDITS, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (insertError) {
      console.error('[Supabase Credits] Error initializing credits:', insertError.message)
    }

    // Record signup bonus in transaction ledger
    await supabase.from('credit_transactions').insert({
      id: randomUUID(),
      user_id: uid,
      amount: DEFAULT_INITIAL_CREDITS,
      balance_after: DEFAULT_INITIAL_CREDITS,
      type: 'signup_bonus',
      description: 'Welcome bonus on signup / first login',
      created_at: new Date().toISOString(),
    })

    return DEFAULT_INITIAL_CREDITS
  } catch (err: any) {
    console.error('[Supabase Credits] ensureUserCreditsInitialized error:', err?.message || err)
    return DEFAULT_INITIAL_CREDITS
  }
}

/**
 * Gets the current credit balance of a user from Supabase.
 */
export async function getUserCredits(uid: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', uid)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.warn('[Supabase Credits] getUserCredits warning:', error.message)
  }

  if (data && typeof data.credits === 'number') {
    return data.credits
  }

  return ensureUserCreditsInitialized(uid)
}

/**
 * Checks a user's access rights for a specific CV.
 */
export async function checkCvAccess(
  uid: string,
  cvId: string,
  cvOwnerId?: string
): Promise<UserCvAccess> {
  const isOwner = Boolean(cvOwnerId && cvOwnerId === uid)
  if (isOwner) {
    return {
      isOwner: true,
      hasUnlockedView: true,
      hasUnlockedDownload: true,
      canView: true,
      canDownload: true,
    }
  }

  const compositeId = `${uid}_${cvId}`
  const { data } = await supabase
    .from('user_unlocked_cvs')
    .select('unlocked_view, unlocked_download')
    .eq('id', compositeId)
    .maybeSingle()

  const hasUnlockedDownload = Boolean(data?.unlocked_download)
  const hasUnlockedView = Boolean(data?.unlocked_view || hasUnlockedDownload)

  return {
    isOwner: false,
    hasUnlockedView,
    hasUnlockedDownload,
    canView: hasUnlockedView,
    canDownload: hasUnlockedDownload,
  }
}

/**
 * Checks access rights for a batch of CVs in a single Supabase query.
 */
export async function getBatchCvAccess(
  uid: string,
  cvs: Array<{ id: string; userId: string }>
): Promise<Map<string, UserCvAccess>> {
  const result = new Map<string, UserCvAccess>()
  const nonOwnerCvIds: string[] = []

  for (const cv of cvs) {
    if (cv.userId === uid) {
      result.set(cv.id, {
        isOwner: true,
        hasUnlockedView: true,
        hasUnlockedDownload: true,
        canView: true,
        canDownload: true,
      })
    } else {
      nonOwnerCvIds.push(cv.id)
    }
  }

  if (nonOwnerCvIds.length === 0) {
    return result
  }

  const compositeIds = nonOwnerCvIds.map((id) => `${uid}_${id}`)
  const { data } = await supabase
    .from('user_unlocked_cvs')
    .select('id, cv_id, unlocked_view, unlocked_download')
    .in('id', compositeIds)

  const lookup = new Map<string, any>()
  if (data) {
    for (const row of data) {
      lookup.set(row.cv_id, row)
    }
  }

  for (const cvId of nonOwnerCvIds) {
    const row = lookup.get(cvId)
    const hasUnlockedDownload = Boolean(row?.unlocked_download)
    const hasUnlockedView = Boolean(row?.unlocked_view || hasUnlockedDownload)

    result.set(cvId, {
      isOwner: false,
      hasUnlockedView,
      hasUnlockedDownload,
      canView: hasUnlockedView,
      canDownload: hasUnlockedDownload,
    })
  }

  return result
}

/**
 * Unlocks full CV details view for 1 credit (or 0 if already unlocked / owner).
 */
export async function unlockCvView(
  uid: string,
  cvId: string,
  cvOwnerId?: string,
  candidateName?: string
): Promise<{ credits: number; alreadyUnlocked: boolean }> {
  const isOwner = Boolean(cvOwnerId && cvOwnerId === uid)
  if (isOwner) {
    const credits = await getUserCredits(uid)
    return { credits, alreadyUnlocked: true }
  }

  // 1. Try atomic PostgreSQL RPC function if installed
  const { data: rpcData, error: rpcError } = await supabase.rpc('unlock_cv_view', {
    p_user_id: uid,
    p_cv_id: cvId,
    p_cv_owner_id: cvOwnerId || '',
    p_candidate_name: candidateName || '',
  })

  if (!rpcError && rpcData) {
    return {
      credits: Number(rpcData.credits),
      alreadyUnlocked: Boolean(rpcData.already_unlocked),
    }
  }

  // 2. Direct table fallback if RPC is not installed
  const compositeId = `${uid}_${cvId}`
  const { data: existingUnlock } = await supabase
    .from('user_unlocked_cvs')
    .select('unlocked_view, unlocked_download')
    .eq('id', compositeId)
    .maybeSingle()

  const currentCredits = await getUserCredits(uid)

  if (existingUnlock?.unlocked_view || existingUnlock?.unlocked_download) {
    return { credits: currentCredits, alreadyUnlocked: true }
  }

  if (currentCredits < VIEW_COST) {
    throw new HttpError(
      402,
      `Insufficient credits. Viewing full candidate details requires ${VIEW_COST} credit (Current balance: ${currentCredits}).`
    )
  }

  const newCredits = currentCredits - VIEW_COST

  // Update credits
  await supabase
    .from('user_credits')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('user_id', uid)

  // Upsert unlock record
  await supabase.from('user_unlocked_cvs').upsert(
    {
      id: compositeId,
      user_id: uid,
      cv_id: cvId,
      unlocked_view: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  // Record audit transaction
  await supabase.from('credit_transactions').insert({
    id: randomUUID(),
    user_id: uid,
    amount: -VIEW_COST,
    balance_after: newCredits,
    type: 'view_cost',
    cv_id: cvId,
    description: `Viewed details of candidate${candidateName ? ` "${candidateName}"` : ''}`,
    created_at: new Date().toISOString(),
  })

  return { credits: newCredits, alreadyUnlocked: false }
}

/**
 * Unlocks CV download for 5 credits (or 0 if already unlocked / owner).
 * If new unlock and owner != downloader: owner receives +1 credit (once only).
 */
export async function unlockCvDownload(
  uid: string,
  cvId: string,
  cvOwnerId?: string,
  candidateName?: string
): Promise<{ credits: number; alreadyUnlocked: boolean; ownerRewarded: boolean }> {
  const isOwner = Boolean(cvOwnerId && cvOwnerId === uid)
  if (isOwner) {
    const credits = await getUserCredits(uid)
    return { credits, alreadyUnlocked: true, ownerRewarded: false }
  }

  // 1. Try atomic PostgreSQL RPC function if installed
  const { data: rpcData, error: rpcError } = await supabase.rpc('unlock_cv_download', {
    p_user_id: uid,
    p_cv_id: cvId,
    p_cv_owner_id: cvOwnerId || '',
    p_candidate_name: candidateName || '',
  })

  if (!rpcError && rpcData) {
    return {
      credits: Number(rpcData.credits),
      alreadyUnlocked: Boolean(rpcData.already_unlocked),
      ownerRewarded: Boolean(rpcData.owner_rewarded),
    }
  }

  // 2. Direct table fallback if RPC is not installed
  const compositeId = `${uid}_${cvId}`
  const { data: existingUnlock } = await supabase
    .from('user_unlocked_cvs')
    .select('unlocked_view, unlocked_download, owner_rewarded')
    .eq('id', compositeId)
    .maybeSingle()

  const currentCredits = await getUserCredits(uid)

  // If already unlocked for download, allow unlimited re-download
  if (existingUnlock?.unlocked_download) {
    return { credits: currentCredits, alreadyUnlocked: true, ownerRewarded: false }
  }

  if (currentCredits < DOWNLOAD_COST) {
    throw new HttpError(
      402,
      `Insufficient credits. Downloading this CV requires ${DOWNLOAD_COST} credits (Current balance: ${currentCredits}).`
    )
  }

  const newCredits = currentCredits - DOWNLOAD_COST

  // Deduct from downloader
  await supabase
    .from('user_credits')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('user_id', uid)

  // Reward owner (+1 credit once)
  let ownerRewarded = false
  if (cvOwnerId && cvOwnerId !== uid && !existingUnlock?.owner_rewarded) {
    const ownerCurrentCredits = await getUserCredits(cvOwnerId)
    const ownerNewCredits = ownerCurrentCredits + DOWNLOAD_OWNER_REWARD

    await supabase
      .from('user_credits')
      .update({ credits: ownerNewCredits, updated_at: new Date().toISOString() })
      .eq('user_id', cvOwnerId)

    await supabase.from('credit_transactions').insert({
      id: randomUUID(),
      user_id: cvOwnerId,
      amount: DOWNLOAD_OWNER_REWARD,
      balance_after: ownerNewCredits,
      type: 'download_reward',
      cv_id: cvId,
      target_user_id: uid,
      description: `Credit earned: Your uploaded CV${candidateName ? ` ("${candidateName}")` : ''} was downloaded`,
      created_at: new Date().toISOString(),
    })

    ownerRewarded = true
  }

  // Upsert unlock record with view + download unlocked and ownerRewarded
  await supabase.from('user_unlocked_cvs').upsert(
    {
      id: compositeId,
      user_id: uid,
      cv_id: cvId,
      unlocked_view: true,
      unlocked_download: true,
      owner_rewarded: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  // Record downloader transaction
  await supabase.from('credit_transactions').insert({
    id: randomUUID(),
    user_id: uid,
    amount: -DOWNLOAD_COST,
    balance_after: newCredits,
    type: 'download_cost',
    cv_id: cvId,
    description: `Unlocked and downloaded CV${candidateName ? ` "${candidateName}"` : ''}`,
    created_at: new Date().toISOString(),
  })

  return { credits: newCredits, alreadyUnlocked: false, ownerRewarded }
}

/**
 * Rewards +1 credit to the user upon a successful, verified CV upload.
 * Also automatically unlocks the CV for the uploader (isOwner = true).
 */
export async function rewardCvUpload(
  uid: string,
  cvId: string,
  fileName: string
): Promise<number> {
  const currentCredits = await getUserCredits(uid)
  const newCredits = currentCredits + UPLOAD_REWARD

  const compositeId = `${uid}_${cvId}`

  // Execute credit update, owner unlock upsert, and transaction audit log concurrently
  await Promise.all([
    supabase
      .from('user_credits')
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('user_id', uid),
    supabase.from('user_unlocked_cvs').upsert(
      {
        id: compositeId,
        user_id: uid,
        cv_id: cvId,
        unlocked_view: true,
        unlocked_download: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    ),
    supabase.from('credit_transactions').insert({
      id: randomUUID(),
      user_id: uid,
      amount: UPLOAD_REWARD,
      balance_after: newCredits,
      type: 'upload_reward',
      cv_id: cvId,
      description: `Earned +1 credit for uploading CV: ${fileName}`,
      created_at: new Date().toISOString(),
    }),
  ])

  return newCredits
}

/**
 * Adds credits via dummy top-up (simulates payment gateway).
 */
export async function topupCredits(
  uid: string,
  amount: number,
  method = 'dummy'
): Promise<{ credits: number; transaction: CreditTransaction }> {
  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new HttpError(400, 'Top-up amount must be a positive integer.')
  }

  if (amount > 1000) {
    throw new HttpError(400, 'Maximum test top-up limit is 1,000 coins.')
  }

  const currentCredits = await getUserCredits(uid)
  const newCredits = currentCredits + amount

  await supabase
    .from('user_credits')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('user_id', uid)

  const txData: CreditTransaction = {
    id: randomUUID(),
    userId: uid,
    amount,
    balanceAfter: newCredits,
    type: method === 'dummy' ? 'topup_dummy' : 'topup_gateway',
    description: `Topped up ${amount} coins (${method === 'dummy' ? 'Test Simulator' : 'Razorpay'})`,
    createdAt: new Date().toISOString(),
  }

  await supabase.from('credit_transactions').insert({
    id: txData.id,
    user_id: uid,
    amount,
    balance_after: newCredits,
    type: txData.type,
    description: txData.description,
    created_at: txData.createdAt,
  })

  return { credits: newCredits, transaction: txData }
}

/**
 * Fetches recent credit transactions for a user from Supabase.
 */
export async function getCreditTransactions(
  uid: string,
  limitCount = 30
): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limitCount)

  if (error) {
    console.warn('[Supabase Credits] getCreditTransactions warning:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    type: row.type,
    cvId: row.cv_id,
    targetUserId: row.target_user_id,
    description: row.description,
    createdAt: row.created_at,
  }))
}
