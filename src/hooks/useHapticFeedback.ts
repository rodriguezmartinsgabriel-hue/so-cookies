"use client"

import { useCallback } from "react"

export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  return {
    tap: () => vibrate(10),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 30, 50, 30, 50]),
    selection: () => vibrate(5),
    heavy: () => vibrate([20, 50, 20]),
  }
}