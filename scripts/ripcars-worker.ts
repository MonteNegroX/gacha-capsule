import { loadWorkerEnv } from './worker-env.ts'

loadWorkerEnv()

async function main() {
  const { runRipCarsWorker } = await import('../lib/gacha/worker-run.ts')
  await runRipCarsWorker()
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Worker failed'
  console.error(message.slice(0, 240))
  process.exit(1)
})
