const prefixes = [
  'Card',
  'Poke',
  'Gacha',
  'Ash',
  'Pika',
  'Rare',
  'Mythic',
  'Shadow',
  'Neon',
  'Cyber',
  'Aura',
  'Dragon',
  'Vortex',
  'Phantom',
  'Pixel',
  'Astral',
  'Legend',
  'Hyper',
  'Nova',
  'Ultra',
]

const suffixes = [
  'King',
  'Hunter',
  'Collector',
  'Chaser',
  'Master',
  'Fan',
  'Champion',
  'Trainer',
  'Seeker',
  'Breaker',
  'Knight',
  'Hero',
  'Lord',
  'Ace',
  'Ninja',
]

const avatars = [
  '/images/avatar-1.png',
  '/images/avatar-2.png',
  '/images/avatar-3.png',
  '/images/avatar-4.png',
  '/images/avatar-5.png',
  '/images/avatar-6.png',
  '/images/avatar-7.png',
  '/images/avatar-8.png',
]

export function generatePseudonym(): { username: string; avatar: string } {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]

  return {
    username: `${prefix}${suffix}`,
    avatar,
  }
}
