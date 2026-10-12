const CAPSULE_COLORS = ['#3c8aff', '#ffd12f', '#fea8cd', '#66c800', '#0000ff', '#eef0f3']

const CAPSULES: { x: number; y: number; r: number; rot: number; color: number }[] = [
  { x: 100, y: 64, r: 15, rot: 18, color: 0 },
  { x: 72, y: 84, r: 14, rot: -28, color: 1 },
  { x: 126, y: 80, r: 15, rot: 46, color: 2 },
  { x: 96, y: 96, r: 16, rot: 8, color: 3 },
  { x: 122, y: 108, r: 12, rot: -12, color: 4 },
  { x: 74, y: 112, r: 12, rot: 36, color: 5 },
  { x: 108, y: 122, r: 11, rot: 70, color: 1 },
]

export function toneForCategory(category: string): string {
  const tones = ['#3c8aff', '#ffd12f', '#fea8cd', '#66c800']
  let index = 0
  for (const char of category) index = (index + char.charCodeAt(0)) % tones.length
  return tones[index]
}

type Props = {
  price: string
  tone: string
  spinning?: boolean
  clipId: string
}

export function CapsuleMachine({ price, tone, spinning = false, clipId }: Props) {
  const glassId = `${clipId}-glass`
  const bodyId = `${clipId}-body`
  return (
    <svg viewBox="0 0 200 312" className="h-auto w-full" aria-hidden="true">
      <defs>
        <radialGradient id={glassId} cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="38%" stopColor="#9ec2ff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#06101f" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#32353d" />
          <stop offset="100%" stopColor="#14171e" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="100" cy="92" r="62" />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="298" rx="62" ry="8" fill="#000000" opacity="0.45" />

      <rect x="36" y="148" width="128" height="140" rx="18" fill={`url(#${bodyId})`} stroke={tone} strokeWidth="3" />
      <rect x="36" y="148" width="10" height="140" rx="4" fill={tone} opacity="0.85" />

      <circle cx="100" cy="92" r="68" fill="#10151f" stroke="#dee1e7" strokeWidth="6" />
      <circle cx="100" cy="92" r="62" fill="#0c1424" />

      <g className={spinning ? 'capsule-globe is-turning' : 'capsule-globe'} clipPath={`url(#${clipId})`}>
        <circle cx="100" cy="92" r="62" fill="#0c1424" />
        {CAPSULES.map((capsule) => (
          <g key={`${capsule.x}-${capsule.y}`} transform={`translate(${capsule.x} ${capsule.y}) rotate(${capsule.rot})`}>
            <circle r={capsule.r} fill={CAPSULE_COLORS[capsule.color]} />
            <path
              d={`M ${-capsule.r} 0 A ${capsule.r} ${capsule.r} 0 0 1 ${capsule.r} 0 Z`}
              fill="#ffffff"
              opacity="0.92"
            />
            <line x1={-capsule.r + 1} x2={capsule.r - 1} y1="0" y2="0" stroke="#0a0b0d" strokeWidth="1.4" />
          </g>
        ))}
      </g>

      <circle cx="100" cy="92" r="62" fill={`url(#${glassId})`} />
      <path d="M62 62c14-16 40-22 62-16" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.55" />

      <rect x="46" y="156" width="108" height="34" rx="8" fill="#ffd12f" />
      <text
        x="100"
        y="178"
        textAnchor="middle"
        fill="#0a0b0d"
        fontSize={price.length > 6 ? 13 : 16}
        fontWeight="700"
        fontFamily="var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif"
      >
        {price}
      </text>

      <rect x="52" y="202" width="34" height="10" rx="3" fill="#0a0b0d" stroke="#5b616e" />
      <circle cx="61" cy="207" r="3" fill="#ffd12f" />

      <g className={spinning ? 'capsule-knob is-turning' : 'capsule-knob'}>
        <circle cx="148" cy="214" r="16" fill="#eef0f3" stroke="#0a0b0d" strokeWidth="3" />
        <circle cx="148" cy="214" r="4" fill="#3c8aff" />
        <rect x="160" y="210" width="18" height="8" rx="4" fill="#b1b7c3" stroke="#0a0b0d" />
      </g>

      <rect x="58" y="236" width="84" height="32" rx="8" fill="#0a0b0d" stroke="#5b616e" />
      <path d="M70 246h60" stroke="#32353d" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 256h44" stroke={tone} strokeWidth="3" strokeLinecap="round" />

      <rect x="48" y="286" width="22" height="8" rx="2" fill="#0a0b0d" />
      <rect x="130" y="286" width="22" height="8" rx="2" fill="#0a0b0d" />
    </svg>
  )
}
