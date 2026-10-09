type Shot = {
  name: string
  imageUrl: string
}

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

export function HowItWorks({ shots }: { shots: Shot[] }) {
  return (
    <section aria-labelledby="how-heading" className="scroll-mt-24">
      <h2 id="how-heading" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
        How it works
      </h2>
      <div className="mt-6 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => {
          const shot = shots[index]
          return (
            <a
              key={step.title}
              href={step.href}
              className="flex flex-col gap-3 bg-[#14171e] p-5 hover:bg-[#1c2029] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3c8aff]"
            >
              <h3 className="font-heading text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[#b1b7c3]">{step.body}</p>
              {shot && (
                <img
                  src={shot.imageUrl}
                  alt=""
                  width={1080}
                  height={1080}
                  loading="lazy"
                  decoding="async"
                  className="mt-auto aspect-square w-full object-contain"
                />
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}
