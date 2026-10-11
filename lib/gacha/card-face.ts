// Year, grade, and the card back for the open reveal.
// Missing facts stay null. Nothing here invents a grade or a year.

const GRADE_CODES = /^(PSA|CGC|BGS|SGC|ACE|TAG|HGA)$/
const IMAGE_HOSTS = new Set([
  'arweave.net',
  'nft.collectorcrypt.com',
  'd1xpxki1g4htqu.cloudfront.net',
])

export type FacePatch = {
  year: string | null
  grade: string | null
  backUrl: string | null
}

export type CardFace = FacePatch & {
  rarity: string | null
  frontUrl: string | null
}

export type RevealTitle = {
  key: 'year' | 'grade' | 'rarity'
  label: string
  value: string
}

const EMPTY_PATCH: FacePatch = { year: null, grade: null, backUrl: null }

export function faceFromPull(pull: {
  cardName: string | null
  rarity: string | null
  imageUrl: string | null
}): CardFace {
  const name = pull.cardName?.trim() ?? ''
  const gradeMatch = name.match(/\b(PSA|CGC|BGS|SGC|ACE|TAG|HGA|Beckett)\s+(\d+(?:\.\d+)?)\b/i)
  return {
    year: name.match(/^((?:19|20)\d{2})\b/)?.[1] ?? null,
    grade: gradeMatch ? formatGrade(gradeMatch[1], gradeMatch[2]) : null,
    rarity: rarityLabel(pull.rarity),
    backUrl: backFromFront(pull.imageUrl),
    frontUrl: pull.imageUrl?.startsWith('https://') ? pull.imageUrl : null,
  }
}

export function mergeFace(local: CardFace, patch: FacePatch | null): CardFace {
  if (!patch) return local
  return {
    ...local,
    year: patch.year ?? local.year,
    grade: patch.grade ?? local.grade,
    backUrl: patch.backUrl ?? local.backUrl,
  }
}

export function revealTitles(face: CardFace): RevealTitle[] {
  const titles: RevealTitle[] = []
  if (face.year) titles.push({ key: 'year', label: 'Year', value: face.year })
  if (face.grade) titles.push({ key: 'grade', label: 'Grade', value: face.grade })
  if (face.rarity) titles.push({ key: 'rarity', label: 'Rarity', value: face.rarity })
  return titles
}

export function faceFromMarketplace(body: unknown, mint: string): FacePatch {
  const card = firstCard(body)
  if (!card || card.nftAddress !== mint) return EMPTY_PATCH
  const images = record(card.images)
  return {
    year: yearValue(card.year),
    grade: formatGrade(card.gradingCompany, card.gradeNum),
    backUrl:
      imageUrl(images?.backM) ??
      imageUrl(images?.backL) ??
      imageUrl(images?.back) ??
      imageUrl(images?.backS) ??
      imageUrl(card.backImage),
  }
}

export function backFromFront(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  try {
    const url = new URL(imageUrl)
    if (url.hostname !== 'nft.collectorcrypt.com') return null
    const match = url.pathname.match(/^\/front\/([^/]+)$/)
    if (!match) return null
    url.pathname = `/back/${match[1]}`
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function formatGrade(company: unknown, gradeNum: unknown): string | null {
  if (typeof company !== 'string') return null
  const raw = company.trim()
  // Collector Crypt prints Beckett slabs as BGS.
  const code = /^beckett$/i.test(raw) ? 'BGS' : raw.toUpperCase()
  if (!GRADE_CODES.test(code)) return null
  const numText = typeof gradeNum === 'number' && Number.isFinite(gradeNum)
    ? String(gradeNum)
    : typeof gradeNum === 'string'
      ? gradeNum.trim()
      : ''
  if (!/^\d+(?:\.\d+)?$/.test(numText)) return null
  const num = Number(numText)
  if (num <= 0 || num > 10) return null
  return `${code} ${String(num)}`
}

function rarityLabel(value: string | null): string | null {
  const text = value?.trim() ?? ''
  if (!text || text.toLowerCase() === 'unknown') return null
  return text.slice(0, 1).toUpperCase() + text.slice(1).toLowerCase()
}

function yearValue(value: unknown): string | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  return /^(19|20)\d{2}$/.test(text) ? text : null
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('https://')) return null
  try {
    const url = new URL(value)
    if (!IMAGE_HOSTS.has(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

function firstCard(body: unknown): Record<string, unknown> | null {
  const cards = record(body)?.filterNFtCard
  if (!Array.isArray(cards) || cards.length === 0) return null
  return record(cards[0])
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}
