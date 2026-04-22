import { firestore } from '../server/services/firebaseAdmin.js'
import { supabase } from '../server/config/supabase.js'
import { Timestamp } from 'firebase-admin/firestore'

async function migrate() {
  console.log('🚀 Starting migration from Firestore to Supabase...')

  try {
    // 1. Fetch all records from Firestore
    console.log('Reading from Firestore COLLECTION: cvs...')
    const snapshot = await firestore.collection('cvs').get()
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log(`Found ${docs.length} records in Firestore.`)

    if (docs.length === 0) {
      console.log('No records to migrate.')
      return
    }

    // 2. Transform records for Supabase
    const cleanData = (val: any): any => {
      if (typeof val === 'string') {
        return val.replace(/\u0000/g, '')
      }
      if (Array.isArray(val)) {
        return val.map(cleanData)
      }
      if (val !== null && typeof val === 'object' && !(val instanceof Timestamp)) {
        const cleaned: any = {}
        for (const [k, v] of Object.entries(val)) {
          cleaned[k] = cleanData(v)
        }
        return cleaned
      }
      return val
    }

    const transformed = docs.map((doc: any) => {
      const { createdAt, ...rest } = cleanData(doc)

      // Convert Firestore Timestamp to ISO string for PostgreSQL timestamptz
      let isoDate: string
      if (createdAt instanceof Timestamp) {
        isoDate = createdAt.toDate().toISOString()
      } else if (createdAt && typeof createdAt === 'object' && '_seconds' in createdAt) {
        isoDate = new Date(createdAt._seconds * 1000).toISOString()
      } else if (typeof createdAt === 'string') {
        isoDate = new Date(createdAt).toISOString()
      } else {
        isoDate = new Date().toISOString()
      }

      return {
        id: rest.id,
        userId: rest.userId,
        fileUrl: rest.fileUrl,
        objectKey: rest.objectKey,
        fileName: rest.fileName,
        fileSize: rest.fileSize || 0,
        name: rest.name || 'Unnamed',
        email: rest.email || '',
        phone: rest.phone || '',
        skills: Array.isArray(rest.skills) ? rest.skills : [],
        experience: rest.experience || '',
        education: rest.education || '',
        rawText: rest.rawText || '',
        fileHash: rest.fileHash || 'legacy-' + rest.id,
        salary: rest.salary || null,
        location: rest.location || null,
        createdAt: isoDate,
      }
    })

    // 3. Batch Insert into Supabase
    // Supabase handles batch inserts natively. Since we have ~1138 records, 
    // we might want to chunk it just in case, but 1000 is usually fine.
    const chunkSize = 500
    for (let i = 0; i < transformed.length; i += chunkSize) {
      const chunk = transformed.slice(i, i + chunkSize)
      console.log(`Inserting chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} records)...`)
      
      const { error } = await supabase
        .from('cvs')
        .upsert(chunk, { onConflict: 'id' })

      if (error) {
        console.error('Error inserting chunk:', error)
        throw error
      }
    }

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

migrate()
