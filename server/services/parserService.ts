import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { env } from '../config/env.js'
import { extractCvData } from '../utils/extractCvData.js'
import { performOcrSpace } from './ocrService.js'

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY)
const groq = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY }) : null

export async function parseCvBuffer(buffer: Buffer, mimetype?: string, fileName?: string) {
  console.log(`[Parser] Processing file: ${fileName || 'unknown'} (${mimetype || 'unknown type'})...`)
  let text = ''
  let isPdfFailed = false

  const isDocx =
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName?.toLowerCase().endsWith('.docx')
    
  const isDoc = 
    mimetype === 'application/msword' || 
    fileName?.toLowerCase().endsWith('.doc')

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } else if (isDoc) {
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buffer)
    text = doc.getBody()
  } else {
    // PDF using robust pdfjs-dist
    try {
      const data = new Uint8Array(buffer)
      const loadingTask = pdfjsLib.getDocument({ 
        data, 
        useSystemFonts: true 
      })
      const pdfDocument = await loadingTask.promise
      
      let extractedText = ''
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        extractedText += pageText + '\n'
      }
      text = extractedText
    } catch (pdfError) {
      console.warn('⚠️ [Parser] pdfjs-dist failed to parse PDF (possibly corrupted or image-only):', (pdfError as Error).message)
      text = ''
      isPdfFailed = true
    }

    // If PDF text extraction is empty or sparse (< 50 chars), it's likely a Canva, image, or scanned PDF
    if (text.trim().length < 50) {
      console.log(`📷 [Parser] Sparse or empty text layer (${text.trim().length} chars). Invoking OCR.space...`)
      const ocrText = await performOcrSpace(buffer, mimetype || 'application/pdf', fileName)
      if (ocrText.trim().length >= 30) {
        console.log(`✅ [Parser] OCR.space successfully extracted ${ocrText.trim().length} characters.`)
        text = ocrText
        isPdfFailed = false
      } else {
        console.warn('⚠️ [Parser] OCR.space did not return sufficient text. Will fall back to Gemini Vision if available.')
        if (text.trim().length === 0) {
          isPdfFailed = true
        }
      }
    }
  }

  // Clean the text immediately (remove null bytes and other illegal Postgres characters)
  text = text.replace(/\u0000/g, '')


  const prompt = `
    Extract professional details from the following resume text. 
    
    Extraction Rules:
    - isResume: Boolean (Set to true only if this text represents a professional resume, CV, biodata, or portfolio. Set to false if it is a general document like a lease agreement, utility bill, ticket, receipt, cover letter, book chapter, project document, invoice, ID card, or unrelated text.)
    - invalidReason: String (If isResume is false, provide a short 1-sentence reason why it is not a resume)
    - name: Full name (usually at the very top)
    - email: Email address
    - phone: Phone number
    - skills: Array of top 10-15 technical skills or core competencies
    - experience: A concise summary of work history (2-3 sentences max)
    - education: A concise summary of educational background
    - salary: Any mentioned current salary or CTC (or empty string if not found)
    - location: Find ANY mention of a city, town, or residence. If no clear address is present, scan the whole text for city names (e.g., Mumbai, Pune, Delhi, etc.) and use the most prominent one. Clean up any squashed text like 'MUMBAISIGNATURE'.
    
    Return the data strictly in JSON format.
    
    Resume Text:
    ${text.slice(0, 30000)}
  `

  // ─── Tiered AI Strategy ──────────────────────────────────────────────────
  
  // Tier 1: Groq Instant (Llama 3.1 8B) - 14.4k limit
  if (groq && !isPdfFailed && text.trim().length > 0) {
    try {
      console.log('⚡ [Parser] Tier 1: Attempting Groq Instant (Llama 3.1 8B)...')
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
      })

      const aiData = JSON.parse(completion.choices[0]?.message?.content || '{}')
      return logAndReturn(aiData, text, 'Groq-Instant')
    } catch (error) {
      console.warn('⚠️ [Parser] Tier 1 (Instant) failed, moving to Tier 2...', (error as any).message)
    }

    // Tier 2: Groq Versatile (Llama 3.3 70B)
    try {
      console.log('🚀 [Parser] Tier 2: Attempting Groq Versatile (Llama 3.3 70B)...')
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
      })

      const aiData = JSON.parse(completion.choices[0]?.message?.content || '{}')
      return logAndReturn(aiData, text, 'Groq-Versatile')
    } catch (error) {
      console.warn('⚠️ [Parser] Tier 2 (Versatile) failed, moving to Tier 3...', (error as any).message)
    }

    // Tier 3: Groq Mixtral (Extra Quota)
    try {
      console.log('🌪️ [Parser] Tier 3: Attempting Groq Mixtral (8x7B)...')
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        response_format: { type: 'json_object' },
      })

      const aiData = JSON.parse(completion.choices[0]?.message?.content || '{}')
      return logAndReturn(aiData, text, 'Groq-Mixtral')
    } catch (error) {
      console.warn('⚠️ [Parser] Tier 3 (Mixtral) failed, moving to Tier 4...', (error as any).message)
    }
  }

  // Tier 4: Gemini (Fallback)
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    })

    if ((isPdfFailed || text.trim().length < 30) && (mimetype === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf'))) {
      console.log('♊ [Parser] Tier 4: Text is empty or sparse. Attempting Gemini native PDF extraction...')
      const multimodalPrompt = `
        Extract professional details from the attached resume document. 
        
        Extraction Rules:
        - isResume: Boolean (Set to true only if this document represents a professional resume, CV, biodata, or portfolio. Set to false if it is a general document like a lease agreement, utility bill, ticket, receipt, cover letter, book chapter, project document, invoice, ID card, or unrelated text.)
        - invalidReason: String (If isResume is false, provide a short 1-sentence reason why it is not a resume)
        - name: Full name (usually at the very top)
        - email: Email address
        - phone: Phone number
        - skills: Array of top 10-15 technical skills or core competencies
        - experience: A concise summary of work history (2-3 sentences max)
        - education: A concise summary of educational background
        - salary: Any mentioned current salary or CTC (or empty string if not found)
        - location: Find ANY mention of a city, town, or residence.
        - rawText: String (The complete, raw text content of the entire document extracted as a single string. This is extremely important.)
        
        Return the data strictly in JSON format.
      `
      const result = await model.generateContent([
        { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } },
        multimodalPrompt
      ])
      
      const responseText = result.response.text()
      const jsonString = responseText.replace(/```json|```/g, '').trim()
      const aiData = JSON.parse(jsonString)
      
      return logAndReturn(aiData, aiData.rawText || '', 'Gemini-Vision')
    } else {
      console.log('♊ [Parser] Tier 4: Attempting standard Gemini text extraction...')
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      const jsonString = responseText.replace(/```json|```/g, '').trim()
      const aiData = JSON.parse(jsonString)

      return logAndReturn(aiData, text, 'Gemini')
    }
  } catch (error) {
    console.error('❌ [Parser] All AI Tiers failed, falling back to regex extraction:', (error as any).message)
    const fallbackData = extractCvData(text)
    console.log('\x1b[33m%s\x1b[0m', '⚠️ [Parser] Local regex extraction complete.')
    return fallbackData
  }
}

function logAndReturn(aiData: any, rawText: string, provider: string) {
  // Normalize AI data to ensure no nulls are passed to the database
  const normalized = {
    isResume: typeof aiData.isResume === 'boolean' ? aiData.isResume : true,
    invalidReason: String(aiData.invalidReason || '').trim(),
    name: String(aiData.name || '').trim(),
    email: String(aiData.email || '').trim(),
    phone: String(aiData.phone || '').trim(),
    skills: Array.isArray(aiData.skills) ? aiData.skills : [],
    experience: String(aiData.experience || '').trim(),
    education: String(aiData.education || '').trim(),
    location: String(aiData.location || '').trim(),
    salary: String(aiData.salary || '').trim(),
  }

  console.log('\x1b[32m%s\x1b[0m', `✨ [${provider} Parser] Extracted for: ${normalized.name || 'Unnamed'}`)
  console.log('\x1b[36m%s\x1b[0m', `📍 Location: ${normalized.location || 'None'}`)
  console.log('\x1b[36m%s\x1b[0m', `🛠️ Skills: ${normalized.skills?.length || 0} detected`)

  return {
    ...normalized,
    rawText,
  }
}
