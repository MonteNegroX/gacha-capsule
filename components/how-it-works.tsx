const STEPS = [
  {
    title: 'Open a pack',
    body: 'Pick a machine. The price is on the card.',
    href: '#packs',
  },
  {
    title: 'Read the odds',
    body: 'Expected value, tiers, and the buyback sit on the machine.',
    href: '#packs',
  },
  {
    title: 'Instant buyback',
    body: 'The rate is printed on the pack.',
    href: '#packs',
  },
  {
    title: 'Borrow',
    body: 'Lock a pull for a term. The desk is a preview.',
    href: '#borrow',
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="scroll-mt-24">
      <h2 id="how-heading" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
        How it works
      </h2>
      <ol className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="bg-[#0a0b0d]">
            <a
              href={step.href}
              className="flex h-full flex-col gap-2 p-5 hover:bg-[#14171e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3c8aff]"
            >
              <span className="font-heading text-xs font-bold text-[#3c8aff]">{index + 1}</span>
              <h3 className="font-heading text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[#b1b7c3]">{step.body}</p>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
