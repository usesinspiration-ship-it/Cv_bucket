import axios from 'axios'
import { env } from '../config/env.js'

interface OcrSpaceParsedResult {
  ParsedText?: string
  ErrorMessage?: string
  ErrorDetails?: string
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[]
  OCRExitCode?: number
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
  ErrorDetails?: string
}

/**
 * Performs OCR using OCR.space API for scanned documents, images, and Canva PDFs.
 */
export async function performOcrSpace(
  buffer: Buffer,
  mimetype: string = 'application/pdf',
  fileName: string = 'document.pdf'
): Promise<string> {
  const apiKey = env.OCR_SPACE_API_KEY
  if (!apiKey) {
    console.warn('⚠️ [OCR.space] OCR_SPACE_API_KEY is not configured in environment.')
    return ''
  }

  try {
    console.log(`🔍 [OCR.space] Starting OCR processing for ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)...`)

    const base64Data = buffer.toString('base64')
    const mime = mimetype || 'application/pdf'
    const base64Image = `data:${mime};base64,${base64Data}`

    const formData = new FormData()
    formData.append('apikey', apiKey)
    formData.append('base64Image', base64Image)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('isTable', 'true')
    formData.append('OCREngine', '2') // Engine 2 is optimized for multi-page, numbers, special characters, and varied layouts

    const response = await axios.post<OcrSpaceResponse>('https://api.ocr.space/parse/image', formData, {
      headers: {
        apikey: apiKey,
      },
      timeout: 30000,
    })

    const data = response.data

    if (data.IsErroredOnProcessing || (data.OCRExitCode !== 1 && data.OCRExitCode !== 2)) {
      const errorMsg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : data.ErrorMessage || 'Unknown OCR error'
      console.warn(`⚠️ [OCR.space] Parsing returned exit code ${data.OCRExitCode}: ${errorMsg}`)
      
      // If Engine 2 failed, attempt Engine 1 as fallback
      if (data.OCRExitCode === 99 || data.IsErroredOnProcessing) {
        console.log('🔄 [OCR.space] Retrying with OCR Engine 1...')
        const retryFormData = new FormData()
        retryFormData.append('apikey', apiKey)
        retryFormData.append('base64Image', base64Image)
        retryFormData.append('language', 'eng')
        retryFormData.append('isOverlayRequired', 'false')
        retryFormData.append('scale', 'true')
        retryFormData.append('OCREngine', '1')

        const retryResponse = await axios.post<OcrSpaceResponse>('https://api.ocr.space/parse/image', retryFormData, {
          headers: { apikey: apiKey },
          timeout: 30000,
        })
        
        const retryData = retryResponse.data
        if (!retryData.IsErroredOnProcessing && retryData.ParsedResults && retryData.ParsedResults.length > 0) {
          const extracted = retryData.ParsedResults.map((r) => r.ParsedText || '').join('\n').trim()
          console.log(`✅ [OCR.space] Extracted ${extracted.length} characters with Engine 1.`)
          return extracted.replace(/\u0000/g, '')
        }
      }
      return ''
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      console.warn('⚠️ [OCR.space] No parsed results returned.')
      return ''
    }

    const fullText = data.ParsedResults.map((result) => result.ParsedText || '')
      .join('\n')
      .trim()
      .replace(/\u0000/g, '')

    console.log(`✅ [OCR.space] Successfully extracted ${fullText.length} characters from ${fileName}`)
    return fullText
  } catch (error: any) {
    console.error('❌ [OCR.space] Request failed:', error.response?.data || error.message)
    return ''
  }
}
