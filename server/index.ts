import { app } from './app.js'
import { env } from './config/env.js'

app.listen(env.PORT, () => {
  console.log(`CV Bucket API listening on http://localhost:${env.PORT}`)
})
