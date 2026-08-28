export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-white sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-[#b1b7c3]">Last updated: 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-[#b1b7c3]">
        <p>
          At Capsule, we respect your privacy. This Privacy Policy explains how we collect, use,
          and protect your information when you participate in our waitlist and on-chain collectibles platform.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">Information We Collect</h2>
        <p>
          We may collect public account details (such as your Twitter username, wallet address, or email)
          when you authenticate via Privy to calculate leaderboard rank and rewards.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">How We Use Information</h2>
        <p>
          Your information is used solely to verify waitlist eligibility, process quest completions,
          and assign reward points.
        </p>
      </div>
    </div>
  )
}

