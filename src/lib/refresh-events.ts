type RefreshListener = () => void
let refreshListeners: RefreshListener[] = []

export function onDataRefresh(fn: RefreshListener) {
  refreshListeners.push(fn)
  return () => {
    refreshListeners = refreshListeners.filter((f) => f !== fn)
  }
}

export function emitDataRefresh() {
  refreshListeners.forEach((fn) => fn())
}
