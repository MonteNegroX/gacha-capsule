'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { faceFromPull, mergeFace, revealTitles, type CardFace, type FacePatch } from '@/lib/gacha/card-face'
import styles from '@/components/gacha/pack-open.module.css'

// Durations match title-pass and the flip in pack-open.module.css.
const BACK_HOLD = 3000
const TITLE_MS = 3200
const SETTLE_AT = 2750
const FLIP_MS = 900

export type RevealPull = {
  id: string
  cardName: string | null
  rarity: string | null
  imageUrl: string | null
  nftAddress: string | null
  insuredUsd: string | null
  buybackUsd: string | null
}

type Phase = 'hold' | 'play' | 'flip' | 'done'

export function PackReveal({
  pull,
  known,
  persist,
  footer,
}: {
  pull: RevealPull
  known?: FacePatch | null
  persist: boolean
  footer?: ReactNode
}) {
  const [remote, setRemote] = useState<FacePatch | null>(null)
  const [phase, setPhase] = useState<Phase>('hold')
  const [locked, setLocked] = useState<CardFace | null>(null)
  const [titleIndex, setTitleIndex] = useState(-1)
  const [settled, setSettled] = useState(0)
  const [instant, setInstant] = useState(false)
  const live = mergeFace(faceFromPull(pull), known ?? remote)
  const factsRef = useRef(live)
  factsRef.current = live
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    if (known || !pull.nftAddress) return
    const mint = pull.nftAddress
    const ac = new AbortController()
    const kill = window.setTimeout(() => ac.abort(), 4500)
    setRemote(null)
    void fetch(`/api/open/card-face?mint=${encodeURIComponent(mint)}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: FacePatch | null) => {
        if (!body || typeof body !== 'object') return
        setRemote({
          year: typeof body.year === 'string' ? body.year : null,
          grade: typeof body.grade === 'string' ? body.grade : null,
          backUrl: typeof body.backUrl === 'string' ? body.backUrl : null,
        })
      })
      .catch(() => undefined)
    return () => {
      ac.abort()
      window.clearTimeout(kill)
    }
  }, [known, pull.id, pull.nftAddress])

  useEffect(() => {
    if (!remote || phaseRef.current !== 'done') return
    setLocked((prev) => {
      if (!prev) return prev
      const next = mergeFace(prev, remote)
      if (next.year === prev.year && next.grade === prev.grade && next.backUrl === prev.backUrl) return prev
      return next
    })
  }, [remote])

  useLayoutEffect(() => {
    const key = `capsule-reveal:${pull.id}`
    const skip = reducedMotion() || (persist && window.sessionStorage.getItem(key) === '1')
    if (skip) {
      setInstant(true)
      setLocked(factsRef.current)
      setSettled(99)
      setTitleIndex(-1)
      setPhase('done')
      if (persist) window.sessionStorage.setItem(key, '1')
      return
    }
    setInstant(false)
    setPhase('hold')
    setLocked(null)
    setTitleIndex(-1)
    setSettled(0)
    const timers: number[] = []
    const finish = () => {
      setPhase('done')
      setTitleIndex(-1)
      if (persist) window.sessionStorage.setItem(key, '1')
    }
    timers.push(window.setTimeout(() => {
      const face = factsRef.current
      const titles = revealTitles(face)
      setLocked(face)
      if (titles.length === 0) {
        setPhase('flip')
        timers.push(window.setTimeout(finish, FLIP_MS))
        return
      }
      setPhase('play')
      setTitleIndex(0)
      titles.forEach((_, index) => {
        if (index > 0) timers.push(window.setTimeout(() => setTitleIndex(index), index * TITLE_MS))
        timers.push(window.setTimeout(() => setSettled(index + 1), index * TITLE_MS + SETTLE_AT))
      })
      const end = titles.length * TITLE_MS
      timers.push(window.setTimeout(() => setPhase('flip'), end))
      timers.push(window.setTimeout(finish, end + FLIP_MS))
    }, BACK_HOLD))
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [persist, pull.id])

  const titles = locked ? revealTitles(locked) : []
  const title = phase === 'play' && titleIndex >= 0 ? titles[titleIndex] : null
  const flipped = phase === 'flip' || phase === 'done'
  const backUrl = phase === 'hold' ? live.backUrl : locked?.backUrl ?? live.backUrl
  const spoken = phase === 'done'
    ? pull.cardName ?? 'Card'
    : title
      ? `${title.label}. ${title.value}`
      : 'Card back'

  return (
    <div className={styles.reveal}>
      <p className="sr-only" aria-live="polite">{spoken}</p>
      <div className={`${styles.scene} ${instant ? styles.instant : ''}`}>
        <div className={`${styles.flipper} ${flipped ? styles.flipped : ''}`}>
          <div className={styles.side}>
            <div className={styles.shot}>
              <BackFace url={backUrl} />
            </div>
          </div>
          <div className={`${styles.side} ${styles.front}`}>
            <div className={styles.shot}>
              {pull.imageUrl ? (
                <img
                  src={pull.imageUrl}
                  alt={phase === 'done' ? pull.cardName ?? '' : ''}
                  width={630}
                  height={880}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={styles.shotImg}
                />
              ) : (
                <div className={styles.plate} />
              )}
            </div>
          </div>
        </div>
        {title && (
          <p key={title.key} className={`${styles.hero} font-heading`} style={{ animationDuration: `${TITLE_MS}ms` }} aria-hidden="true">
            {title.value}
          </p>
        )}
      </div>
      <div className={styles.caption}>
        {titles.map((item, index) => (
          <div key={item.key} className={`${styles.cell} ${index < settled ? styles.cellOn : ''}`} aria-hidden={index >= settled}>
            <span className={styles.cellLabel}>{item.label}</span>
            <span className={`${styles.cellValue} font-heading`}>{item.value}</span>
          </div>
        ))}
      </div>
      {phase === 'done' && (
        <>
          {pull.cardName && <p className={`${styles.cardName} font-heading`}>{pull.cardName}</p>}
          <div className={styles.lines}>
            {pull.insuredUsd && (
              <div className={styles.line}>
                <span className={styles.label}>Insured</span>
                <span className={styles.value}>${pull.insuredUsd}</span>
              </div>
            )}
            {pull.buybackUsd && (
              <div className={styles.line}>
                <span className={styles.label}>Buyback</span>
                <span className={`${styles.value} text-[#ffd12f]`}>{pull.buybackUsd} USDG</span>
              </div>
            )}
          </div>
          {footer}
        </>
      )}
    </div>
  )
}

function BackFace({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [url])
  if (!url || failed) {
    return (
      <div className={styles.plate}>
        <span className="font-heading">CAPSULE</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      width={630}
      height={880}
      fetchPriority="high"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={styles.shotImg}
    />
  )
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
