import { parseCvBuffer } from '../server/services/parserService.js'
import { readFileSync } from 'node:fs'

async function testParser() {
  console.log('🧪 Starting manual parser test...')
  
  // Create a dummy buffer that looks like a text file
  const dummyBuffer = Buffer.from('John Doe\nEmail: john@example.com\nExperience: 5 years at Google as a Software Engineer.')
  
  try {
    const result = await parseCvBuffer(dummyBuffer, 'text/plain', 'test_resume.txt')
    console.log('✅ Parser test result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Parser test failed:', error)
  }
  process.exit(0)
}

testParser()
