const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.server' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  try {
    console.log("Fetching 150 most recent uploads...")
    const { data: cvs, error } = await supabase
      .from('cvs')
      .select('id, fileName, fileHash, phone, email, createdAt')
      .order('createdAt', { ascending: false })
      .limit(150)
      
    if (error) throw error
    
    console.log(`Fetched ${cvs.length} recent uploads.`)
    for (const cv of cvs.slice(0, 50)) {
      console.log(`- ID: ${cv.id}, Name: ${cv.fileName}, Phone: ${cv.phone}, Created: ${cv.createdAt}, Hash: ${cv.fileHash}`)
    }
  } catch (err) {
    console.error("Error:", err)
  }
}

run()
