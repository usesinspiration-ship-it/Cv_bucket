import axios from 'axios'
import type { CVRecord, PaginatedCvResponse, SearchFilters } from '../types/cv'

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
): Promise<PaginatedCvResponse> {
  const response = await api.get<PaginatedCvResponse>('/cvs', {
    headers: authHeaders(token),
    params: filters,
  })

  return response.data
}

export async function uploadCV(
  file: File,
  token: string,
  onProgress?: (progress: number) => void,
): Promise<CVRecord> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<CVRecord>('/cvs/upload', formData, {
    headers: authHeaders(token),
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded * 100) / event.total))
    },
  })

  return response.data
}

export async function deleteCV(id: string, token: string): Promise<void> {
  await api.delete(`/cvs/${id}`, {
    headers: authHeaders(token),
  })
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

    return (
      responseMessage ?? error.message ?? 'Unexpected API request error.'
    )
  }

  return error instanceof Error ? error.message : 'Unexpected application error.'
}
