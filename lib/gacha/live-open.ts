import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { SpinResult } from '@/lib/gacha/types'

function botDir(): string {
  return process.env.GACHA_BOT_DIR?.trim() || 'C:\\Users\\main\\collector-gacha-bot'
}

function readAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

/** Runs the existing Collector Crypt opener. Spends the bot wallet's USDC. */
export function openPackLive(packType: string, turbo: boolean): Promise<SpinResult> {
  const cwd = botDir()
  if (!existsSync(cwd)) {
    return Promise.reject(new Error(`Opener not found at ${cwd}`))
  }

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'src/cli.ts', 'open', '--pack', packType, '--paid'], {
      cwd,
      shell: true,
      env: {
        ...process.env,
        TURBO: turbo ? 'true' : 'false',
        AUTO_BUYBACK: 'true',
        OPEN_MODE: 'paid',
      },
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Live open timed out after 90s'))
    }, 90_000)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Opener exited ${code}`))
        return
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>
        const buybackAmount = readAmount(parsed.buybackAmount)
        resolve({
          mode: 'live',
          packType,
          rarity: typeof parsed.rarity === 'string' ? parsed.rarity : 'unknown',
          nftName: typeof parsed.nftName === 'string' ? parsed.nftName : 'Opened card',
          insuredValue: null,
          buybackAmount,
          buybackPct: 0,
          turboBuyback: parsed.turboBuyback === true,
          memo: typeof parsed.memo === 'string' ? parsed.memo : null,
          nftAddress: typeof parsed.nftAddress === 'string' ? parsed.nftAddress : null,
        })
      } catch {
        reject(new Error('Opener did not return JSON'))
      }
    })
  })
}
