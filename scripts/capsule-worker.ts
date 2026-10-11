import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function fillEnv(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

const root = process.cwd()
fillEnv(join(root, '.env'))
fillEnv(join(root, '.env.local'))
fillEnv(join(process.env.GACHA_BOT_DIR?.trim() || 'C:\\Users\\main\\collector-gacha-bot', '.env'))

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl && !databaseUrl.includes('connection_limit=')) {
  const joinChar = databaseUrl.includes('?') ? '&' : '?'
  process.env.DATABASE_URL = `${databaseUrl}${joinChar}connection_limit=1&pool_timeout=20`
}

async function main() {
  const { runWorker } = await import('../lib/gacha/worker-run.ts')
  await runWorker()
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Worker failed'
  console.error(message.slice(0, 240))
  process.exit(1)
})
