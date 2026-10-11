import { Contract, id, JsonRpcProvider, Wallet } from 'ethers'
import { FUNDER_BPS, LEND_ADDRESS, LEND_TERM_SECONDS, PROTOCOL_BPS } from '@/lib/gacha/lend-abi'
import { ROBINHOOD_RPC, ROBINHOOD_USDG } from '@/lib/gacha/robinhood-transfer'

const ERC20 = ['function transfer(address to, uint256 amount) returns (bool)']
const LEND = [
  'function createDeal(bytes32 id, address owner_, uint256 principal, uint16 funderBps, uint16 protocolBps, uint32 term)',
  'function withdrawPrincipal(bytes32 id)',
]

function wallet(): Wallet {
  let key = process.env.ROBINHOOD_TREASURY_PRIVATE_KEY?.trim() ?? ''
  if (/^[a-fA-F0-9]{64}$/.test(key)) key = `0x${key}`
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) throw new Error('Treasury key is not configured')
  return new Wallet(key, new JsonRpcProvider(ROBINHOOD_RPC, 4663))
}

async function fee(signer: Wallet) {
  const block = await signer.provider?.getBlock('latest')
  const base = block?.baseFeePerGas ?? BigInt('20000000')
  const tip = BigInt('1000000')
  return {
    type: 2 as const,
    maxPriorityFeePerGas: tip,
    maxFeePerGas: base * BigInt(3) + tip,
  }
}

export function dealIdFor(orderId: string): string {
  return id(orderId)
}

export async function treasuryAddressMatches(expected: string): Promise<boolean> {
  return wallet().address.toLowerCase() === expected.toLowerCase()
}

export async function treasuryUsdgBalance(): Promise<bigint> {
  const signer = wallet()
  const token = new Contract(ROBINHOOD_USDG, ['function balanceOf(address) view returns (uint256)'], signer)
  return BigInt(await token.balanceOf(signer.address))
}

export async function sendUsdg(to: string, amount: bigint): Promise<string> {
  if (amount <= BigInt(0)) throw new Error('Nothing to send')
  const signer = wallet()
  const token = new Contract(ROBINHOOD_USDG, ERC20, signer)
  const tx = await token.transfer(to, amount, { ...(await fee(signer)), gasLimit: BigInt(150000) })
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) throw new Error('USDG transfer failed')
  return receipt.hash as string
}

export async function createLendDeal(orderId: string, owner: string, principal: bigint): Promise<string> {
  if (principal <= BigInt(0)) throw new Error('Deal principal is empty')
  const signer = wallet()
  const lend = new Contract(LEND_ADDRESS, LEND, signer)
  const tx = await lend.createDeal(
    dealIdFor(orderId),
    owner,
    principal,
    FUNDER_BPS,
    PROTOCOL_BPS,
    LEND_TERM_SECONDS,
    { ...(await fee(signer)), gasLimit: BigInt(300000) },
  )
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) throw new Error('Deal was not created')
  return dealIdFor(orderId)
}

export async function withdrawLendPrincipal(dealId: string): Promise<string> {
  const signer = wallet()
  const lend = new Contract(LEND_ADDRESS, LEND, signer)
  const tx = await lend.withdrawPrincipal(dealId, { ...(await fee(signer)), gasLimit: BigInt(200000) })
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) throw new Error('Principal was not withdrawn')
  return receipt.hash as string
}
