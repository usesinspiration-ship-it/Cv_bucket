import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../server/config/env.js'

async function listModels() {
  console.log('🧪 Listing Available Models...')
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY)
  
  try {
    // The standard way to list models is via a fetch or another method if the SDK doesn't expose it directly
    // But the SDK usually doesn't have a simple 'listModels' in the top-level.
    // We can try to hit the endpoint manually.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GOOGLE_API_KEY}`)
    const data = await response.json()
    console.log('✅ Models List:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Error listing models:', error)
  }
  process.exit(0)
}

listModels()
