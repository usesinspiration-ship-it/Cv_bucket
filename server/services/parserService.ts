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

    // If PDF text extraction is empty or sparse (< 250 chars or < 40 words), it's likely a Canva, image, or scanned PDF
    const initialWordCount = text.trim().split(/\s+/).filter(Boolean).length
    if (text.trim().length < 250 || initialWordCount < 40) {
      console.log(`📷 [Parser] Sparse text layer detected (${text.trim().length} chars, ${initialWordCount} words). Invoking OCR.space...`)
      const ocrText = await performOcrSpace(buffer, mimetype || 'application/pdf', fileName)
      const ocrWords = ocrText.trim().split(/\s+/).filter(Boolean).length
      if (ocrWords >= 40 && ocrText.trim().length >= 200) {
        console.log(`✅ [Parser] OCR.space successfully extracted ${ocrText.trim().length} characters (${ocrWords} words).`)
        text = ocrText
        isPdfFailed = false
      } else {
        console.warn('⚠️ [Parser] OCR.space did not yield sufficient text. Delegating to Gemini Vision Multimodal.')
        isPdfFailed = true
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

  const effectiveWordCount = text.trim().split(/\s+/).filter(Boolean).length

  // ─── Tiered AI Strategy ──────────────────────────────────────────────────
  
  // Tier 1: Groq (if text is extracted and available)
  if (groq && !isPdfFailed && effectiveWordCount >= 40) {
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound']
    for (const groqModel of groqModels) {
      try {
        console.log(`⚡ [Parser] Groq Attempt: ${groqModel}...`)
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: groqModel,
          response_format: { type: 'json_object' },
        })

        const aiData = JSON.parse(completion.choices[0]?.message?.content || '{}')
        return logAndReturn(aiData, text, `Groq-${groqModel}`)
      } catch (error: any) {
        console.warn(`⚠️ [Parser] Groq (${groqModel}) failed:`, error.message)
      }
    }
  }

  // Tier 2: Gemini
  const isMultimodalNeeded =
    (isPdfFailed || text.trim().length < 250 || effectiveWordCount < 40) &&
    (mimetype === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf'))

  const geminiModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest']
  for (const modelName of geminiModels) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
      })

      if (isMultimodalNeeded) {
        console.log(`♊ [Parser] Attempting Gemini native PDF extraction with ${modelName}...`)
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
        
        return logAndReturn(aiData, aiData.rawText || '', `Gemini-Vision-${modelName}`)
      } else {
        console.log(`♊ [Parser] Attempting standard Gemini text extraction with ${modelName}...`)
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const jsonString = responseText.replace(/```json|```/g, '').trim()
        const aiData = JSON.parse(jsonString)

        return logAndReturn(aiData, text, `Gemini-${modelName}`)
      }
    } catch (error: any) {
      console.warn(`⚠️ [Parser] Gemini (${modelName}) failed:`, error.message)
    }
  }

  // Fallback to local regex extraction if all AI models fail
  console.error('❌ [Parser] All AI Tiers failed, falling back to regex extraction')
  const fallbackData = extractCvData(text)
  console.log('\x1b[33m%s\x1b[0m', '⚠️ [Parser] Local regex extraction complete.')
  return fallbackData
}

function formatField(val: any): string {
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item)
            .filter(([_, v]) => Boolean(v))
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        }
        return String(item)
      })
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }
  return String(val || '').trim()
}

function logAndReturn(aiData: any, rawText: string, provider: string) {
  // Normalize AI data to ensure no nulls are passed to the database
  const normalized = {
    isResume: typeof aiData.isResume === 'boolean' ? aiData.isResume : true,
    invalidReason: String(aiData.invalidReason || '').trim(),
    name: String(aiData.name || '').trim(),
    email: String(aiData.email || '').trim(),
    phone: String(aiData.phone || '').trim(),
    skills: Array.isArray(aiData.skills) ? aiData.skills.map((s: any) => String(s).trim()) : [],
    experience: formatField(aiData.experience),
    education: formatField(aiData.education),
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
