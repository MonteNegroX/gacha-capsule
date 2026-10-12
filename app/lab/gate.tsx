'use client'

import { useState } from 'react'

export function LabGate({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/lab/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error || 'Could not unlock')
        return
      }
      window.location.reload()
    } catch {
      setError('Could not unlock')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Capsule lab</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-white">Test Bench</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#b1b7c3]">
          This page is not linked from the site. It is for trying the machine before opening is public.
        </p>
      </div>
      {configured ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-[#eef0f3]">
            Lab password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border border-white/15 bg-[#14171e] px-3 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-[#fc401f]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#3c8aff] text-sm font-bold text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[#b1b7c3]">Lab is off until GACHA_LAB_SECRET is set on the server.</p>
      )}
    </main>
  )
}
