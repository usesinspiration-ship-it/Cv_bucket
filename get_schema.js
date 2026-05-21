const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.server' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data, error } = await supabase.from('cvs').select('*').limit(1)
  console.log(data)
}
run()
