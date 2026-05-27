const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.server' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  try {
    console.log("Starting full database duplicate scan...")
    
    let allCvs = []
    let page = 0
    const pageSize = 1000
    
    while (true) {
      console.log(`Fetching records ${page * pageSize} to ${(page + 1) * pageSize}...`)
      const { data, error } = await supabase
        .from('cvs')
        .select('id, fileName, fileHash, phone, email, createdAt')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('createdAt', { ascending: false })
        
      if (error) throw error
      if (!data || data.length === 0) break
      
      allCvs = allCvs.concat(data)
      if (data.length < pageSize) break
      page++
    }
    
    console.log(`Fetched total of ${allCvs.length} records. Analyzing duplicates...`)
    
    const byHash = new Map()
    const byPhone = new Map()
    
    for (const cv of allCvs) {
      if (cv.fileHash) {
        if (!byHash.has(cv.fileHash)) byHash.set(cv.fileHash, [])
        byHash.get(cv.fileHash).push(cv)
      }
      if (cv.phone) {
        const norm = cv.phone.replace(/\D/g, '')
        if (norm) {
          if (!byPhone.has(norm)) byPhone.set(norm, [])
          byPhone.get(norm).push(cv)
        }
      }
    }
    
    const dupHashes = Array.from(byHash.entries()).filter(([_, list]) => list.length > 1)
    console.log(`\n--- Duplicate File Hashes in DB (${dupHashes.length} groups) ---`)
    for (const [hash, list] of dupHashes.slice(0, 5)) {
      console.log(`Hash ${hash}:`)
      list.forEach(cv => console.log(`  - Name: ${cv.fileName}, Uploaded: ${cv.createdAt}`))
    }
    
    const dupPhones = Array.from(byPhone.entries()).filter(([_, list]) => list.length > 1)
    console.log(`\n--- Duplicate Phone Numbers in DB (${dupPhones.length} groups) ---`)
    for (const [phone, list] of dupPhones.slice(0, 10)) {
      console.log(`Phone ${phone}:`)
      list.forEach(cv => console.log(`  - Name: ${cv.fileName}, Uploaded: ${cv.createdAt}`))
    }
    
  } catch (err) {
    console.error("Scan failed:", err)
  }
}

run()
