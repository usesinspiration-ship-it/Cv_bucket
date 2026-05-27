const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.server' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  try {
    console.log("Fetching database stats...")
    
    // 1. Total count
    const { count: totalCount, error: countErr } = await supabase
      .from('cvs')
      .select('*', { count: 'exact', head: true })
      
    if (countErr) throw countErr
    console.log(`Total CVs in database: ${totalCount}`)
    
    // 2. Fetch all CVs to do group analysis
    const { data: cvs, error: fetchErr } = await supabase
      .from('cvs')
      .select('id, fileName, fileHash, phone, email, createdAt')
      
    if (fetchErr) throw fetchErr
    
    console.log(`Successfully fetched ${cvs.length} records. Analyzing duplicates...`)
    
    // Group by fileHash
    const byHash = new Map()
    // Group by normalized phone
    const byPhone = new Map()
    
    for (const cv of cvs) {
      // Hash
      if (cv.fileHash) {
        if (!byHash.has(cv.fileHash)) byHash.set(cv.fileHash, [])
        byHash.get(cv.fileHash).push(cv)
      }
      // Phone
      if (cv.phone) {
        const norm = cv.phone.replace(/\D/g, '')
        if (norm) {
          if (!byPhone.has(norm)) byPhone.set(norm, [])
          byPhone.get(norm).push(cv)
        }
      }
    }
    
    // Find duplicate hashes in DB
    const dupHashes = Array.from(byHash.entries()).filter(([_, list]) => list.length > 1)
    console.log(`\n--- Duplicate File Hashes in DB (${dupHashes.length} groups) ---`)
    for (const [hash, list] of dupHashes.slice(0, 5)) {
      console.log(`Hash ${hash}:`)
      list.forEach(cv => console.log(`  - ID: ${cv.id}, Name: ${cv.fileName}, Uploaded: ${cv.createdAt}`))
    }
    if (dupHashes.length > 5) console.log(`  ... and ${dupHashes.length - 5} more`)
    
    // Find duplicate phones in DB
    const dupPhones = Array.from(byPhone.entries()).filter(([_, list]) => list.length > 1)
    console.log(`\n--- Duplicate Phone Numbers in DB (${dupPhones.length} groups) ---`)
    for (const [phone, list] of dupPhones.slice(0, 10)) {
      console.log(`Phone ${phone}:`)
      list.forEach(cv => console.log(`  - ID: ${cv.id}, Name: ${cv.fileName}, Uploaded: ${cv.createdAt}`))
    }
    if (dupPhones.length > 10) console.log(`  ... and ${dupPhones.length - 10} more`)
    
  } catch (err) {
    console.error("Analysis failed:", err)
  }
}

run()
