import { DealFund } from '@/components/deal-fund'
import { LendPledge } from '@/components/lend-pledge'
import { SiteFrame } from '@/components/site-frame'
import { listListedDeals, listPledgedDeals } from '@/lib/gacha/pull-store'
import { VAULT_ADDRESS } from '@/lib/gacha/vault-stock'
import { treasuryAddress } from '@/lib/gacha/verify-payment'
import { pageMeta } from '@/lib/site-meta'

export const dynamic = 'force-dynamic'

export const metadata = pageMeta({
  path: '/lend',
  title: 'Fund a Card, or Pawn Yours | Capsule',
  description:
    'Fund a listed card in USDG, or list your own from a Solana wallet. Repay within 7 days, or the funder receives the card. The card stays in the Capsule vault.',
})

export default async function LendPage() {
  const treasury = treasuryAddress()
  let deals: Awaited<ReturnType<typeof listListedDeals>> = []
  let dealsUnavailable = false
  try {
    const [listed, pledged] = await Promise.all([listListedDeals(), listPledgedDeals()])
    deals = [...listed, ...pledged]
  } catch {
    dealsUnavailable = true
  }

  return (
    <SiteFrame>
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Lend</p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">Fund a Card, or Pawn Yours.</h1>
        <p className="text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
          A funder deposits the buyback. The owner can repay within 7 days. If the term ends unpaid, the funder gives a Solana address and receives the card. Confirm an unverified mint before you fund it.
        </p>
      </header>

      <LendPledge vault={VAULT_ADDRESS} />

      <section className="flex flex-col gap-6" aria-label="Listed cards">
        <h2 className="font-heading text-2xl font-bold text-white">Listed Now</h2>
        {dealsUnavailable ? <p className="text-sm text-[#b1b7c3]">Listed cards are unavailable right now.</p> : null}
        {!dealsUnavailable && deals.length === 0 ? <p className="text-sm text-[#b1b7c3]">No card is listed yet.</p> : null}
        {deals.map((deal) => (
          <DealFund key={deal.orderId} {...deal} treasury={treasury} />
        ))}
      </section>
    </SiteFrame>
  )
}
