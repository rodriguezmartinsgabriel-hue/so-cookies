"use client"

const STORAGE_KEY = "so-sound-enabled"

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(STORAGE_KEY) !== "false"
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

let audioCtx: AudioContext | null = null

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctx =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {})
  return audioCtx
}

export function playNotificationSound(): void {
  if (!isSoundEnabled()) return
  const ctx = ensureAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1174, now + 0.15)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch {
    /* WebAudio indisponível */
  }
}
