type Shot = {
  name: string
  imageUrl: string
}

const STEPS = [
  {
    title: 'Open a Pack',
    body: 'Pay 25 USDG on Robinhood, or 25 USDC on Hyperliquid. The pack opens in the vault.',
    href: '#packs',
  },
  {
    title: 'See the Card',
    body: 'Insured value and the buyback quote show after the open.',
    href: '#packs',
  },
  {
    title: 'Choose',
    body: 'Take the buyback, or Double a Common. If you do not choose within 24 hours, the vault buys it back.',
    href: '#packs',
  },
  {
    title: 'After a Double',
    body: 'A win pays 2× the buyback and lists it for 7 days. If nobody funds it within 2 days, the vault sells the card. A loss pays you nothing.',
    href: '/lend',
  },
]

export function HowItWorks({ shots }: { shots: Shot[] }) {
  return (
    <section aria-labelledby="how-heading" className="scroll-mt-24">
      <h2 id="how-heading" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
        How It Works
      </h2>
      <div className="step-strip">
        {STEPS.map((step, index) => {
          const shot = shots[index]
          return (
            <a key={step.title} href={step.href} className="step-cell">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {shot && (
                <img
                  src={shot.imageUrl}
                  alt=""
                  width={1080}
                  height={1080}
                  loading="lazy"
                  decoding="async"
                  className="step-shot"
                />
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}
