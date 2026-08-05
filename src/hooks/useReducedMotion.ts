"use client"

import { useSyncExternalStore } from "react"

type MotionPreference = "reduce" | "no-preference"

function getSnapshot(): MotionPreference {
  if (typeof window === "undefined") return "no-preference"
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference"
  }
  return "no-preference"
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

export function useReducedMotion(): boolean {
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => "no-preference")
  return preference === "reduce"
}
