import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { extractCvData } from '../utils/extractCvData.js'

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY)

export async function parseCvBuffer(buffer: Buffer, mimetype?: string, fileName?: string) {
  console.log(`[Parser] Processing file: ${fileName || 'unknown'} (${mimetype || 'unknown type'})...`)
  let text = ''

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
    // PDF or fallback
    const parsed = await pdfParse(buffer)
    text = parsed.text
  }

  // ─── AI Extraction ───────────────────────────────────────────────────────────
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json' }
    })

    const prompt = `
      Extract professional details from the following resume text. 
      
      Extraction Rules:
      - name: Full name (usually at the very top)
      - email: Email address
      - phone: Phone number
      - skills: Array of top 10-15 technical skills or core competencies
      - experience: A concise summary of work history (2-3 sentences max)
      - education: A concise summary of educational background
      - salary: Any mentioned current salary or CTC (or empty string if not found)
      - location: Look for city names (e.g. Mumbai, Delhi, Bangalore), pin codes (6 digits), or address strings. Check the header AND the 'Place' section at the bottom. Clean up squashed words like 'MUMBAISIGNATURE' to just 'Mumbai'.
      
      Return the data strictly in JSON format.
      
      Resume Text:
      ${text.slice(0, 30000)}
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const aiData = JSON.parse(response.text())

    console.log('\x1b[32m%s\x1b[0m', `✨ [AI Parser] Gemini successfully extracted data for: ${aiData.name || 'Unnamed'}`)

    return {
      ...aiData,
      rawText: text, // Always keep the full raw text for searching
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ [AI Parser] Gemini failed, falling back to regex extraction:', error)
    const fallbackData = extractCvData(text)
    console.log('\x1b[33m%s\x1b[0m', '⚠️ [Parser] Local regex extraction complete.')
    return fallbackData
  }
}
