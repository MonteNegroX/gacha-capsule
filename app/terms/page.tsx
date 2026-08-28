export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-white sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-sm text-[#b1b7c3]">Last updated: 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-[#b1b7c3]">
        <p>
          Welcome to Capsule. By accessing or participating in our waitlist, you agree to these Terms of Service.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">Waitlist & Quests</h2>
        <p>
          Points and leaderboard ranks are promotional incentives for early supporters. Sybil attacks
          or fraudulent task verification may result in points disqualification.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">Limitation of Liability</h2>
        <p>
          Capsule is provided "as is". We reserve the right to modify or update quest rules and reward distribution schedules.
        </p>
      </div>
    </div>
  )
}

