import axios from 'axios'
import type {
  CVRecord,
  CvAccessResponse,
  CreditTransaction,
  PaginatedCvResponse,
  SearchFilters,
  UnlockDownloadResponse,
  UnlockViewResponse,
} from '../types/cv'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30000,
})

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function fetchCVs(
  filters: SearchFilters,
  token: string,
  signal?: AbortSignal,
  refresh = false,
): Promise<PaginatedCvResponse> {
  const response = await api.get<PaginatedCvResponse>('/cvs', {
    headers: authHeaders(token),
    params: { ...filters, refresh },
    signal,
  })

  return response.data
}

export async function checkDuplicates(
  hashes: string[],
  token: string,
): Promise<string[]> {
  const response = await api.post<{ duplicates: string[] }>('/cvs/check-duplicates', { hashes }, {
    headers: authHeaders(token),
  })

  return response.data.duplicates
}

export async function uploadCV(
  file: File,
  token: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<CVRecord> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<CVRecord>('/cvs/upload', formData, {
    headers: authHeaders(token),
    signal,
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded * 100) / event.total))
    },
  })

  return response.data
}

export async function updateCV(
  id: string,
  updates: Partial<CVRecord>,
  token: string,
): Promise<CVRecord> {
  const response = await api.patch<CVRecord>(`/cvs/${id}`, updates, {
    headers: authHeaders(token),
  })

  return response.data
}

export async function deleteCV(id: string, token: string): Promise<{ success: boolean; currentCredits?: number }> {
  const response = await api.delete<{ success: boolean; currentCredits?: number }>(`/cvs/${id}`, {
    headers: authHeaders(token),
  })
  return response.data
}

export async function getCvAccess(id: string, token: string): Promise<CvAccessResponse> {
  const response = await api.get<CvAccessResponse>(`/cvs/${id}/access`, {
    headers: authHeaders(token),
  })
  return response.data
}

export async function unlockCvView(id: string, token: string): Promise<UnlockViewResponse> {
  const response = await api.post<UnlockViewResponse>(
    `/cvs/${id}/unlock-view`,
    {},
    {
      headers: authHeaders(token),
    }
  )
  return response.data
}

export async function unlockCvDownload(id: string, token: string): Promise<UnlockDownloadResponse> {
  const response = await api.post<UnlockDownloadResponse>(
    `/cvs/${id}/unlock-download`,
    {},
    {
      headers: authHeaders(token),
    }
  )
  return response.data
}

export async function getWalletBalance(token: string): Promise<{ credits: number }> {
  const response = await api.get<{ credits: number }>('/cvs/credits/balance', {
    headers: authHeaders(token),
  })
  return response.data
}

export async function topupCredits(
  amount: number,
  token: string
): Promise<{ credits: number; transaction: CreditTransaction }> {
  const response = await api.post<{ credits: number; transaction: CreditTransaction }>(
    '/cvs/credits/topup',
    { amount },
    {
      headers: authHeaders(token),
    }
  )
  return response.data
}

export async function getWalletTransactions(
  token: string
): Promise<{ transactions: CreditTransaction[] }> {
  const response = await api.get<{ transactions: CreditTransaction[] }>(
    '/cvs/credits/transactions',
    {
      headers: authHeaders(token),
    }
  )
  return response.data
}

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === 'object' &&
        error.response?.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
        ? error.response.data.message
        : undefined

    if (responseMessage?.includes('RESOURCE_EXHAUSTED') || responseMessage?.includes('Quota exceeded')) {
      return 'Firebase Free Tier Limit Reached (Daily Quota Exhausted). Please wait for the daily reset (Midnight UTC) or upgrade to Blaze plan.'
    }

    return (
      responseMessage ?? error.message ?? 'Unexpected API request error.'
    )
  }

  if (error instanceof Error && error.name === 'CanceledError') {
    return 'STALE_REQUEST' // Sentinel for canceled requests
  }

  return error instanceof Error ? error.message : 'Unexpected application error.'
}
