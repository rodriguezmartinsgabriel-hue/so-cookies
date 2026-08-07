import { logger } from "./logger"

const marks = new Map<string, number>()

export function startMeasure(name: string): void {
  marks.set(name, performance.now())
}

export function endMeasure(name: string): number {
  const start = marks.get(name)
  if (start === undefined) return 0
  const duration = performance.now() - start
  marks.delete(name)
  return duration
}

export function measureAction(name: string, fn: () => void): void {
  startMeasure(name)
  try {
    fn()
  } finally {
    const duration = endMeasure(name)
    if (duration > 50) {
      logger.warn(`[perf] ${name} took ${duration.toFixed(1)}ms (target: <50ms)`)
    }
  }
}

export async function measureAsyncAction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  startMeasure(name)
  try {
    const result = await fn()
    return result
  } finally {
    const duration = endMeasure(name)
    if (duration > 50) {
      logger.warn(`[perf] ${name} took ${duration.toFixed(1)}ms (target: <50ms)`)
    }
  }
}
