import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../server/config/env.js'

async function testGemini() {
  console.log('🧪 Testing Gemini API Connection...')
  console.log(`🔑 Key length: ${env.GOOGLE_API_KEY?.length}`)
  console.log(`🔑 Key prefix: ${env.GOOGLE_API_KEY?.substring(0, 10)}...`)
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY)
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest'
    })

    const prompt = 'Return a JSON object with a key "status" and value "ok".'
    const result = await model.generateContent(prompt)
    console.log('✅ Gemini Response:', result.response.text())
  } catch (error) {
    console.error('❌ Gemini API Error:', error)
  }
  process.exit(0)
}

testGemini()
