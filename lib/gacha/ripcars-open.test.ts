import assert from 'node:assert/strict'
import { createHash, createPublicKey, verify } from 'node:crypto'
import { describe, it } from 'node:test'
import { Keypair } from '@solana/web3.js'
import { beginOpen, chooseBuyback, confirmPayment, createOrder, recordBuyback, recordOpen } from '@/lib/capsule/order'
import { garageSiwsMessage, keypairFromSecret, readGarageCard, signSiwsMessage } from './ripcars-open'
import { base58Decode, base58Encode } from './solana-address'

const SPKI = Buffer.from('302a300506032b6570032100', 'hex')
const PAYER = '0x1111111111111111111111111111111111111111'

describe('rip cars opener', () => {
  it('builds the Privy SIWS message the site signs', () => {
    const message = garageSiwsMessage('Wallet111', 'nonce-1', '2026-10-12T00:00:00.000Z')
    assert.equal(message, [
      'app.ripcars.io wants you to sign in with your Solana account:',
      'Wallet111',
      '',
      'You are proving you own Wallet111.',
      '',
      'URI: https://app.ripcars.io',
      'Version: 1',
      'Chain ID: mainnet',
      'Nonce: nonce-1',
      'Issued At: 2026-10-12T00:00:00.000Z',
      'Resources:',
      '- https://privy.io',
    ].join('\n'))
  })

  it('signs that message with the opener key', () => {
    const key = Keypair.generate()
    const message = 'sign in'
    const signature = Buffer.from(signSiwsMessage(message, key), 'base64')
    const pub = createPublicKey({ key: Buffer.concat([SPKI, Buffer.from(key.publicKey.toBytes())]), format: 'der', type: 'spki' })
    assert.equal(verify(null, Buffer.from(message), pub, signature), true)
    assert.equal(signature.length, 64)
  })

  it('loads the same key from json, base64, and base58', () => {
    const key = Keypair.generate()
    const secret = Buffer.from(key.secretKey)
    const loaded = [
      keypairFromSecret(JSON.stringify([...secret])),
      keypairFromSecret(secret.toString('base64')),
      keypairFromSecret(base58Encode(secret)),
      keypairFromSecret(Buffer.from(key.secretKey.subarray(0, 32)).toString('base64')),
    ]
    assert.deepEqual(loaded.map((item) => item.publicKey.toBase58()), [
      key.publicKey.toBase58(),
      key.publicKey.toBase58(),
      key.publicKey.toBase58(),
      Keypair.fromSeed(key.secretKey.subarray(0, 32)).publicKey.toBase58(),
    ])
    assert.deepEqual(base58Decode(key.publicKey.toBase58()), key.publicKey.toBytes())
    assert.deepEqual(base58Decode(base58Encode(new Uint8Array(32))), new Uint8Array(32))
    assert.deepEqual(base58Decode(base58Encode(Uint8Array.of(0, 1))), Uint8Array.of(0, 1))
    assert.throws(() => keypairFromSecret('not a key'), /not valid/)
  })

  it('reads the car and the settled sale', () => {
    const mint = Keypair.generate().publicKey.toBase58()
    const card = readGarageCard({
      rarity: 'Rare',
      car: { id: mint, name: 'Twin Mill', image: 'https://cdn.example/car.png', fmv: 40, buyback: 36 },
    }, 36)
    assert.deepEqual(card, {
      mint,
      name: 'Twin Mill',
      rarity: 'Rare',
      imageUrl: 'https://cdn.example/car.png',
      fmvUsd: 40,
      buybackUsd: 36,
    })
    assert.equal(readGarageCard({ car: { name: 'No mint' } }, 10), null)
  })

  it('settles a garage open as a buyback, without Double', () => {
    const created = createOrder({
      id: 'garage-1',
      chainId: 4663,
      token: 'USDG',
      payer: PAYER,
      machineCode: 'garage_20',
      memo: 'pay',
      packPrice: BigInt(20_000_000),
    })
    assert.equal(created.ok, true)
    if (!created.ok) return
    const paid = confirmPayment(created.order, {
      hash: `0x${createHash('sha256').update('garage').digest('hex')}`,
      chainId: 4663,
      token: 'USDG',
      payer: PAYER,
      amount: BigInt(20_000_000),
    })
    assert.equal(paid.ok, true)
    if (!paid.ok) return
    const opening = beginOpen(paid.order)
    assert.equal(opening.ok, true)
    if (!opening.ok) return
    const recorded = recordOpen(opening.order, {
      nftAddress: Keypair.generate().publicKey.toBase58(),
      cardName: 'Twin Mill',
      rarity: 'Rare',
      buybackQuote: BigInt(18_000_000),
      openedAtMs: 1_000,
    })
    assert.equal(recorded.ok, true)
    if (!recorded.ok) return
    const chosen = chooseBuyback(recorded.order, 1_000)
    assert.equal(chosen.ok, true)
    if (!chosen.ok) return
    assert.equal(chosen.order.status, 'BUYBACK_CONFIRMED')
    assert.equal(chosen.order.choice, 'BUYBACK')
    const sold = recordBuyback(chosen.order, 'sale-sig', BigInt(18_000_000))
    assert.equal(sold.ok, true)
    if (!sold.ok) return
    assert.equal(sold.order.status, 'PAYOUT_PENDING')
    assert.equal(sold.order.actualRefund, BigInt(18_000_000))
  })
})
