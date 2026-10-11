export const LEND_TERM_MS = 7 * 24 * 60 * 60 * 1000

const ZERO = BigInt(0)

export type LendStatus = 'LISTING' | 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'SETTLED'

export type Deposit = {
  id: string
  lender: string
  amount: bigint
}

export type LendDeal = {
  id: string
  orderId: string
  nftAddress: string
  buybackQuote: bigint
  cap: bigint
  minFunded: bigint
  funded: bigint
  status: LendStatus
  deposits: Deposit[]
  activatedAtMs: number | null
  expiresAtMs: number | null
  capPaid: bigint
  saleProceeds: bigint | null
}

export type LendError =
  | 'INVALID_DEAL'
  | 'DUPLICATE_DEAL'
  | 'ILLEGAL'
  | 'ABOVE_CAP'
  | 'DEPOSIT_CONFLICT'
  | 'NOTHING_TO_WITHDRAW'
  | 'EARLY'
  | 'LATE'
  | 'CAP_MISMATCH'
  | 'SALE_CONFLICT'

export type LendResult = { ok: true; deal: LendDeal; applied: boolean } | { ok: false; deal: LendDeal; error: LendError }

export type CreateDealInput = {
  id: string
  orderId: string
  nftAddress: string
  buybackQuote: bigint
  minFunded: bigint
}

function text(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function lenderAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null
  return trimmed.toLowerCase()
}

function unchanged(deal: LendDeal): LendResult {
  return { ok: true, deal, applied: false }
}

function fail(deal: LendDeal, error: LendError): LendResult {
  return { ok: false, deal, error }
}

function changed(deal: LendDeal, patch: Partial<LendDeal>): LendResult {
  return { ok: true, deal: { ...deal, ...patch }, applied: true }
}

export function createDeal(input: CreateDealInput): { ok: true; deal: LendDeal } | { ok: false; error: 'INVALID_DEAL' } {
  const id = text(input.id)
  const orderId = text(input.orderId)
  const nftAddress = text(input.nftAddress)
  if (!id || !orderId || !nftAddress) return { ok: false, error: 'INVALID_DEAL' }
  if (typeof input.buybackQuote !== 'bigint' || input.buybackQuote <= ZERO) return { ok: false, error: 'INVALID_DEAL' }
  if (typeof input.minFunded !== 'bigint' || input.minFunded <= ZERO || input.minFunded > input.buybackQuote) {
    return { ok: false, error: 'INVALID_DEAL' }
  }
  return {
    ok: true,
    deal: {
      id,
      orderId,
      nftAddress,
      buybackQuote: input.buybackQuote,
      cap: input.buybackQuote,
      minFunded: input.minFunded,
      funded: ZERO,
      status: 'LISTING',
      deposits: [],
      activatedAtMs: null,
      expiresAtMs: null,
      capPaid: ZERO,
      saleProceeds: null,
    },
  }
}

export function openListing(existing: readonly LendDeal[], input: CreateDealInput): { ok: true; deal: LendDeal; applied: boolean } | { ok: false; error: 'INVALID_DEAL' | 'DUPLICATE_DEAL' } {
  const orderId = text(input.orderId)
  const nftAddress = text(input.nftAddress)
  const normalized = orderId && nftAddress ? { ...input, orderId, nftAddress } : input
  const sameOrder = orderId && nftAddress ? existing.find((deal) => deal.orderId === orderId || deal.nftAddress === nftAddress) : undefined
  if (sameOrder) {
    const same =
      sameOrder.orderId === orderId &&
      sameOrder.nftAddress === nftAddress &&
      sameOrder.buybackQuote === input.buybackQuote &&
      sameOrder.minFunded === input.minFunded
    if (same) return { ok: true, deal: sameOrder, applied: false }
    return { ok: false, error: 'DUPLICATE_DEAL' }
  }
  const created = createDeal(normalized)
  if (!created.ok) return created
  return { ok: true, deal: created.deal, applied: true }
}

export type DepositInput = {
  id: string
  lender: string
  amount: bigint
  nowMs: number
}

export function deposit(deal: LendDeal, input: DepositInput): LendResult {
  const id = text(input.id)
  const lender = lenderAddress(input.lender)
  if (!id || !lender || typeof input.amount !== 'bigint' || input.amount <= ZERO || !Number.isFinite(input.nowMs)) {
    return fail(deal, 'ILLEGAL')
  }
  const prior = deal.deposits.find((row) => row.id === id)
  if (prior) {
    if (prior.lender === lender && prior.amount === input.amount) return unchanged(deal)
    return fail(deal, 'DEPOSIT_CONFLICT')
  }
  if (deal.status !== 'LISTING') return fail(deal, 'ILLEGAL')
  if (deal.funded + input.amount > deal.cap) return fail(deal, 'ABOVE_CAP')

  const deposits = [...deal.deposits, { id, lender, amount: input.amount }]
  const funded = deal.funded + input.amount
  if (funded < deal.minFunded) return changed(deal, { deposits, funded })
  return changed(deal, {
    deposits,
    funded,
    status: 'ACTIVE',
    activatedAtMs: input.nowMs,
    expiresAtMs: input.nowMs + LEND_TERM_MS,
  })
}

export function withdraw(deal: LendDeal, lender: string, amount: bigint): LendResult {
  const address = lenderAddress(lender)
  if (!address || typeof amount !== 'bigint' || amount <= ZERO) return fail(deal, 'ILLEGAL')
  if (deal.status !== 'LISTING') return fail(deal, 'ILLEGAL')
  const rows = deal.deposits.filter((row) => row.lender === address)
  const balance = rows.reduce((sum, row) => sum + row.amount, ZERO)
  if (amount > balance) return fail(deal, 'NOTHING_TO_WITHDRAW')

  let left = amount
  const deposits: Deposit[] = []
  for (const row of deal.deposits) {
    if (row.lender !== address || left === ZERO) {
      deposits.push(row)
      continue
    }
    if (row.amount <= left) {
      left -= row.amount
      continue
    }
    deposits.push({ ...row, amount: row.amount - left })
    left = ZERO
  }
  return changed(deal, { deposits, funded: deal.funded - amount })
}

export function repay(deal: LendDeal, payment: bigint, nowMs: number): LendResult {
  if (deal.status === 'REPAID' && deal.capPaid === payment) return unchanged(deal)
  if (deal.status !== 'ACTIVE' || deal.expiresAtMs == null) return fail(deal, 'ILLEGAL')
  if (!Number.isFinite(nowMs)) return fail(deal, 'ILLEGAL')
  if (nowMs > deal.expiresAtMs) return fail(deal, 'LATE')
  if (payment !== deal.cap) return fail(deal, 'CAP_MISMATCH')
  return changed(deal, { status: 'REPAID', capPaid: payment })
}

export function markDefault(deal: LendDeal, nowMs: number): LendResult {
  if (deal.status === 'DEFAULTED') return unchanged(deal)
  if (deal.status !== 'ACTIVE' || deal.expiresAtMs == null) return fail(deal, 'ILLEGAL')
  if (!Number.isFinite(nowMs) || nowMs <= deal.expiresAtMs) return fail(deal, 'EARLY')
  return changed(deal, { status: 'DEFAULTED' })
}

export function settleSale(deal: LendDeal, proceeds: bigint): LendResult {
  if (typeof proceeds !== 'bigint' || proceeds < ZERO) return fail(deal, 'SALE_CONFLICT')
  if (deal.status === 'SETTLED') {
    if (deal.saleProceeds === proceeds) return unchanged(deal)
    return fail(deal, 'SALE_CONFLICT')
  }
  if (deal.status !== 'DEFAULTED') return fail(deal, 'ILLEGAL')
  return changed(deal, { status: 'SETTLED', saleProceeds: proceeds })
}

export function shares(deal: LendDeal): bigint[] {
  const total = deal.status === 'REPAID' ? deal.capPaid : deal.status === 'SETTLED' ? deal.saleProceeds : null
  if (total == null || deal.funded === ZERO) return deal.deposits.map(() => ZERO)
  const amounts = deal.deposits.map((row) => (total * row.amount) / deal.funded)
  let allocated = ZERO
  for (const amount of amounts) allocated += amount
  const last = amounts.length - 1
  if (last >= 0) amounts[last] += total - allocated
  return amounts
}

export function lenderShare(deal: LendDeal, lender: string): bigint {
  const address = lenderAddress(lender)
  if (!address) return ZERO
  const split = shares(deal)
  let sum = ZERO
  deal.deposits.forEach((row, index) => {
    if (row.lender === address) sum += split[index] ?? ZERO
  })
  return sum
}
