import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const envPath = fileURLToPath(new URL('../../.env.test', import.meta.url))
const result = dotenv.config({ path: envPath, override: true })

if (result.error) {
  throw new Error(`Kunne ikke laste .env.test fra ${envPath}`, { cause: result.error })
}
