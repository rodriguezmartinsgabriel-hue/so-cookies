"use client"

import { useEffect } from "react"
import { reportWebVitals } from "@/lib/perf"

export function WebVitals() {
  useEffect(() => {
    reportWebVitals()
  }, [])
  return null
}
