import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GARAGE_PACK, isRipCarsPack, openerWorkerId, withRipCars, workerOwnsPack } from './ripcars-pack'

describe('garage pack', () => {
  it('is the $20 Rip Cars pack and uses its own opener heartbeat', () => {
    assert.equal(GARAGE_PACK.code, 'garage_20')
    assert.equal(GARAGE_PACK.price, 20)
    assert.equal(GARAGE_PACK.instantBuyback, 90)
    assert.equal(isRipCarsPack('garage_20'), true)
    assert.equal(isRipCarsPack('pokemon_25'), false)
    assert.equal(openerWorkerId('garage_20'), 'ripcars')
    assert.equal(openerWorkerId('pokemon_25'), 'robinhood')
    assert.equal(workerOwnsPack('garage_20', 'ripcars'), true)
    assert.equal(workerOwnsPack('garage_20', 'capsule'), false)
    assert.equal(workerOwnsPack('pokemon_25', 'capsule'), true)
    assert.equal(workerOwnsPack('pokemon_25', 'ripcars'), false)
  })

  it('adds the pack once', () => {
    const again = withRipCars(withRipCars([]))
    assert.deepEqual(again.map((machine) => machine.code), ['garage_20'])
  })
})
