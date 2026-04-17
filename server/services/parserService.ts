import pdfParse from 'pdf-parse'
import { extractCvData } from '../utils/extractCvData.js'

export async function parseCvBuffer(buffer: Buffer) {
  const parsed = await pdfParse(buffer)
  return extractCvData(parsed.text)
}
