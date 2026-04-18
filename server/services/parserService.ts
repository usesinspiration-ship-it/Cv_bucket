import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { extractCvData } from '../utils/extractCvData.js'

export async function parseCvBuffer(buffer: Buffer, mimetype?: string, fileName?: string) {
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

  return extractCvData(text)
}
