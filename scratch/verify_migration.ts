import { supabase } from '../server/config/supabase.js'

async function verify() {
  const { count, error } = await supabase
    .from('cvs')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error fetching count:', error)
  } else {
    console.log(`✅ Supabase record count: ${count}`)
  }
  process.exit(0)
}

verify()
