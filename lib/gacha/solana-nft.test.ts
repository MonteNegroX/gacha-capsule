import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { allowedCardImage } from './card-face'
import { HELD_JOLTEON } from './held-card'
import { base58Encode } from './solana-address'
import {
  TOKEN_2022_ID,
  TOKEN_ID,
  associatedTokenAddress,
  holdingFromRpc,
  isListableNft,
  readCardMetadata,
  unsignedDepositTransaction,
  vaultDepositInstructions,
} from './solana-nft'

const OWNER = new PublicKey('vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg')
const VAULT = new PublicKey('41NaNu6LNhDStmzEqGZHvHsawjtaBTVbR9GZdnQJ3193')
const MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const SOURCE = new PublicKey('SysvarRent111111111111111111111111111111111')
const TOKEN = new PublicKey(TOKEN_ID)

describe('solana address encoding', () => {
  it('encodes leading zeros and a single byte', () => {
    assert.equal(base58Encode(new Uint8Array()), '')
    assert.equal(base58Encode(Uint8Array.of(0)), '1')
    assert.equal(base58Encode(Uint8Array.of(1)), '2')
    assert.equal(base58Encode(Uint8Array.of(58)), '21')
    assert.equal(base58Encode(new Uint8Array(32)), '11111111111111111111111111111111')
    const key = new PublicKey(Buffer.alloc(32, 7))
    assert.equal(base58Encode(key.toBytes()), key.toBase58())
  })
})

describe('wallet card filter', () => {
  it('keeps a single token-decimal card and skips fungible or held mints', () => {
    const mint = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'
    assert.equal(isListableNft(mint, '1', 0), true)
    assert.equal(isListableNft(mint, '2', 0), false)
    assert.equal(isListableNft(mint, '1', 6), false)
    assert.equal(isListableNft(HELD_JOLTEON, '1', 0), false)
    assert.equal(isListableNft('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '1', 0), false)
    assert.equal(isListableNft('not-a-mint', '1', 0), false)
  })

  it('reads the token account program from the rpc row', () => {
    const row = holdingFromRpc({
      pubkey: SOURCE.toBase58(),
      account: {
        owner: TOKEN_2022_ID,
        data: { parsed: { info: { mint: MINT.toBase58(), tokenAmount: { amount: '1', decimals: 0 } } } },
      },
    })
    assert.equal(row?.program, TOKEN_2022_ID)
    assert.equal(row?.mint, MINT.toBase58())
    assert.equal(holdingFromRpc({ pubkey: SOURCE.toBase58(), account: { owner: '11111111111111111111111111111111' } }), null)
  })
})

describe('card metadata', () => {
  it('reads a borsh name and uri', () => {
    const name = 'Pikachu'
    const symbol = 'PKMN'
    const uri = 'https://arweave.net/abc'
    const body = Buffer.concat([
      Buffer.from([4]),
      Buffer.alloc(64),
      borsh(name),
      borsh(symbol),
      borsh(uri),
    ])
    assert.deepEqual(readCardMetadata(body), { name, uri })
    assert.equal(allowedCardImage(uri), uri)
    assert.equal(allowedCardImage('https://evil.example/a.png'), null)
  })
})

describe('vault deposit transaction', () => {
  it('builds an unsigned create-and-transfer to the vault', () => {
    const program = TOKEN
    const dest = associatedTokenAddress(VAULT, MINT, program)
    const [expected] = PublicKey.findProgramAddressSync(
      [VAULT.toBuffer(), program.toBuffer(), MINT.toBuffer()],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    )
    assert.equal(dest.toBase58(), expected.toBase58())

    const [create, transfer] = vaultDepositInstructions({ owner: OWNER, vault: VAULT, mint: MINT, source: SOURCE, program })
    assert.equal(Buffer.from(create.data).toString('hex'), '01')
    assert.deepEqual(create.keys.map(meta), [
      [OWNER.toBase58(), true, true],
      [dest.toBase58(), false, true],
      [VAULT.toBase58(), false, false],
      [MINT.toBase58(), false, false],
      [SystemProgram.programId.toBase58(), false, false],
      [program.toBase58(), false, false],
    ])
    assert.equal(Buffer.from(transfer.data).toString('hex'), '030100000000000000')
    assert.equal(transfer.programId.toBase58(), TOKEN_ID)
    assert.deepEqual(transfer.keys.map(meta), [
      [SOURCE.toBase58(), false, true],
      [dest.toBase58(), false, true],
      [OWNER.toBase58(), true, false],
    ])

    const raw = unsignedDepositTransaction({
      owner: OWNER,
      vault: VAULT,
      mint: MINT,
      source: SOURCE,
      program,
      blockhash: new PublicKey(Buffer.alloc(32, 8)).toBase58(),
    })
    const parsed = Transaction.from(raw)
    assert.equal(parsed.feePayer?.toBase58(), OWNER.toBase58())
    assert.equal(parsed.signatures.length, 1)
    assert.equal(parsed.signatures[0].signature, null)
    assert.equal(parsed.instructions.length, 2)
  })
})

function borsh(value: string): Buffer {
  const bytes = Buffer.from(value)
  const out = Buffer.alloc(4 + bytes.length)
  out.writeUInt32LE(bytes.length, 0)
  bytes.copy(out, 4)
  return out
}

function meta(key: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }): [string, boolean, boolean] {
  return [key.pubkey.toBase58(), key.isSigner, key.isWritable]
}
