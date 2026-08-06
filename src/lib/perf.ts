const marks = new Map<string, number>()

export function startMeasure(name: string): void {
  marks.set(name, performance.now())
}

export function endMeasure(name: string): number {
  const start = marks.get(name)
  if (start === undefined) return 0
  const duration = performance.now() - start
  marks.delete(name)
  if (duration > 0) {
    console.timeEnd(name)
  }
  return duration
}

export function measureAction(name: string, fn: () => void): void {
  console.time(name)
  startMeasure(name)
  try {
    fn()
  } finally {
    const duration = endMeasure(name)
    if (duration > 50) {
      console.warn(`[perf] ${name} took ${duration.toFixed(1)}ms (target: <50ms)`)
    }
  }
}

export async function measureAsyncAction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  console.time(name)
  startMeasure(name)
  try {
    const result = await fn()
    return result
  } finally {
    const duration = endMeasure(name)
    if (duration > 50) {
      console.warn(`[perf] ${name} took ${duration.toFixed(1)}ms (target: <50ms)`)
    }
  }
}

export function reportWebVitals(): void {
  if (typeof window === "undefined") return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry instanceof PerformancePaintTiming) {
        const metric = entry.name === "first-paint" ? "FP" : "FCP"
        console.log(`[web-vitals] ${metric}: ${entry.startTime.toFixed(1)}ms`)
      }
    }
  })

  try {
    observer.observe({ type: "paint", buffered: true })
  } catch {
    /* PerformanceObserver not supported for paint */
  }

  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        console.log(`[web-vitals] LCP: ${last.startTime.toFixed(1)}ms`)
      })
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })
    } catch {
      /* LCP not supported */
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { value: number; hadRecentInput?: boolean }
          if (!e.hadRecentInput) {
            cls += e.value
          }
        }
        console.log(`[web-vitals] CLS: ${cls.toFixed(4)}`)
      })
      clsObserver.observe({ type: "layout-shift", buffered: true })
    } catch {
      /* CLS not supported */
    }

    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[web-vitals] FID: ${entry.startTime.toFixed(1)}ms`)
        }
      })
      fidObserver.observe({ type: "first-input", buffered: true })
    } catch {
      /* FID not supported */
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[web-vitals] INP: ${entry.startTime.toFixed(1)}ms`)
        }
      })
      inpObserver.observe({ type: "event", buffered: true })
    } catch {
      /* INP not supported */
    }
  }
}
