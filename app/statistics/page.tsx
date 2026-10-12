import { RecordTable } from '@/components/record-table'
import { SiteFrame } from '@/components/site-frame'
import { choiceLabel } from '@/lib/gacha/open-label'
import { loadProtocolStats, type ProtocolStats } from '@/lib/gacha/stats'
import { formatUnits } from '@/lib/gacha/units'
import { pageMeta } from '@/lib/site-meta'

export const dynamic = 'force-dynamic'

export const metadata = pageMeta({
  path: '/statistics',
  title: 'Vault Totals | Capsule',
  description:
    'Opens, payouts, and funded loans from the current vault records. If a source does not load, that number is left blank.',
})

function usd(raw: string | null, unit: string): string {
  if (raw == null || !/^\d+$/.test(raw)) return 'Unavailable'
  return `${formatUnits(BigInt(raw))} ${unit}`
}

function tvl(stats: ProtocolStats): { text: string; partial: boolean } {
  const parts = [stats.vaultUsdcRaw, stats.treasuryUsdgRaw, stats.fundedRaw]
  let total = BigInt(0)
  let partial = false
  for (const part of parts) {
    if (part == null || !/^\d+$/.test(part)) {
      partial = true
      continue
    }
    total += BigInt(part)
  }
  return { text: `${formatUnits(total)} USD`, partial }
}

export default async function StatisticsPage() {
  let stats: ProtocolStats | null = null
  let failed = false
  try {
    stats = await loadProtocolStats()
  } catch {
    failed = true
  }
  const locked = stats ? tvl(stats) : null

  return (
    <SiteFrame>
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Statistics</p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">Vault Totals</h1>
        <p className="text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
          Opens, payouts, and loans from the current records. If a source fails, that number is left blank.
        </p>
      </header>

      {failed || !stats || !locked ? (
        <p className="rounded-2xl border border-white/10 bg-[#14171e] p-6 text-sm text-[#b1b7c3]">Statistics are unavailable right now.</p>
      ) : (
        <>
          <section aria-label="Vault balances" className="grid gap-3 sm:grid-cols-3">
            <Pot label="Vault USDC" value={usd(stats.vaultUsdcRaw, 'USDC')} note="Solana opener" />
            <Pot label="Treasury USDG" value={usd(stats.treasuryUsdgRaw, 'USDG')} note="Robinhood payouts" />
            <Pot label="Cards at quote" value={usd(stats.cardQuoteRaw, 'USDG')} note="Buyback of cards still held" />
          </section>

          <p className="font-heading text-2xl font-bold text-white">
            TVL {locked.text}
            <span className="mt-1 block text-sm font-normal text-[#b1b7c3]">
              Vault USDC, treasury USDG, and principal in funded loans.
              {locked.partial ? ' One balance did not load, so this total is short.' : ''}
            </span>
          </p>

          <section aria-label="Activity" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Pot label="Opens" value={String(stats.opens)} note={`${usd(stats.volumeRaw, 'USDG')} paid in`} />
            <Pot label="Paid to players" value={usd(stats.paidRaw, 'USDG')} note={`${stats.buybacks} buybacks`} />
            <Pot label="Double" value={`${stats.wins} wins`} note={`${stats.losses} losses`} />
            <Pot label="Loans" value={usd(stats.fundedRaw, 'USDG')} note={`${usd(stats.fundingRaw, 'USDG')} still funding`} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl font-bold text-white">Recent Opens</h2>
            {stats.recent.length === 0 ? (
              <p className="text-sm text-[#b1b7c3]">No pack has been opened yet.</p>
            ) : (
              <RecordTable
                caption="Recent pack openings"
                columns={['Card', 'Rarity', 'Insured', 'Buyback', 'Choice', 'Status']}
                rows={stats.recent.map((row) => ({
                  key: row.id,
                  cells: [
                    { label: 'Card', value: row.card },
                    { label: 'Rarity', value: row.rarity },
                    { label: 'Insured', value: row.insured ? `$${row.insured}` : '—' },
                    { label: 'Buyback', value: row.buybackRaw ? usd(row.buybackRaw, 'USDG') : '—' },
                    { label: 'Choice', value: choiceLabel(row.choice, row.draw) },
                    { label: 'Status', value: row.status.replaceAll('_', ' ').toLowerCase() },
                  ],
                }))}
              />
            )}
          </section>
        </>
      )}
    </SiteFrame>
  )
}

function Pot({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#14171e] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#717886]">{label}</p>
      <p className="mt-2 font-heading text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-[#b1b7c3]">{note}</p>
    </div>
  )
}
