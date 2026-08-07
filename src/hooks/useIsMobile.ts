"use client"

import { useSyncExternalStore } from "react"
import { isMobileUA } from "@/lib/device"

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false
  const uaMatch = isMobileUA(navigator.userAgent)
  const viewportMatch = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches
  return uaMatch || viewportMatch
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mq = window.matchMedia("(max-width: 767px)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getServerSnapshot(): boolean | null {
  return null
}

export function useIsMobile(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
