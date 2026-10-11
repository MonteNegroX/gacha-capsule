import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { backFromFront, faceFromMarketplace, faceFromPull, mergeFace, revealTitles } from './card-face'

describe('card face', () => {
  it('reads a leading year and a slab grade from the card name', () => {
    const face = faceFromPull({
      cardName: '2020 #081 Mimikyu-Holo PSA 7',
      rarity: 'common',
      imageUrl: 'https://nft.collectorcrypt.com/front/2026100810C281803',
    })
    assert.equal(face.year, '2020')
    assert.equal(face.grade, 'PSA 7')
    assert.equal(face.rarity, 'Common')
    assert.equal(face.backUrl, 'https://nft.collectorcrypt.com/back/2026100810C281803')
  })

  it('keeps a truncated grade and omits one that is not written', () => {
    const graded = faceFromPull({
      cardName: '2023 #079 Tyranitar CGC 10 Prist',
      rarity: 'Uncommon',
      imageUrl: null,
    })
    assert.equal(graded.grade, 'CGC 10')
    const bare = faceFromPull({
      cardName: '2019 Pokemon Japanese Playing Ca',
      rarity: 'Common',
      imageUrl: 'https://arweave.net/example',
    })
    assert.equal(bare.year, '2019')
    assert.equal(bare.grade, null)
    assert.equal(bare.backUrl, null)
  })

  it('prints Beckett as BGS and skips a year that is not the slab year', () => {
    const face = faceFromPull({
      cardName: 'Beckett 9.5',
      rarity: 'unknown',
      imageUrl: 'https://example.com/front/nope',
    })
    assert.equal(face.year, null)
    assert.equal(face.grade, 'BGS 9.5')
    assert.equal(face.rarity, null)
    assert.equal(face.backUrl, null)
  })

  it('orders only the titles that exist', () => {
    const titles = revealTitles(faceFromPull({
      cardName: '2024 #052 Jolteon',
      rarity: 'Common',
      imageUrl: null,
    }))
    assert.deepEqual(titles.map((title) => title.value), ['2024', 'Common'])
  })

  it('takes year, grade, and back from the matching marketplace card', () => {
    const face = faceFromMarketplace({
      filterNFtCard: [{
        nftAddress: 'mint-1',
        year: 2021,
        gradingCompany: 'CGC',
        gradeNum: 10,
        insuredValue: '29',
        backImage: 'https://arweave.net/eoCPuDmS4L84PXXBWLx7-B2LVP5Ebd2SYVDeJ5S9-RA',
        images: { backS: 'https://evil.example/back.jpg' },
      }],
    }, 'mint-1')
    assert.deepEqual(face, {
      year: '2021',
      grade: 'CGC 10',
      backUrl: 'https://arweave.net/eoCPuDmS4L84PXXBWLx7-B2LVP5Ebd2SYVDeJ5S9-RA',
    })
  })

  it('ignores a marketplace row for a different mint', () => {
    const face = faceFromMarketplace({
      filterNFtCard: [{ nftAddress: 'other', year: 1999, gradingCompany: 'PSA', gradeNum: 10 }],
    }, 'mint-1')
    assert.deepEqual(face, { year: null, grade: null, backUrl: null })
  })

  it('keeps a parsed grade when the catalog grade is missing', () => {
    const local = faceFromPull({
      cardName: '2020 #081 Mimikyu PSA 7',
      rarity: 'Common',
      imageUrl: 'https://nft.collectorcrypt.com/front/abc',
    })
    const merged = mergeFace(local, { year: null, grade: null, backUrl: null })
    assert.equal(merged.year, '2020')
    assert.equal(merged.grade, 'PSA 7')
    assert.equal(merged.backUrl, 'https://nft.collectorcrypt.com/back/abc')
  })

  it('rewrites only a Collector Crypt front scan', () => {
    assert.equal(backFromFront('https://nft.collectorcrypt.com/front/abc?x=1'), 'https://nft.collectorcrypt.com/back/abc')
    assert.equal(backFromFront('https://nft.collectorcrypt.com/files/abc'), null)
    assert.equal(backFromFront('not a url'), null)
  })
})
