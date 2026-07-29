import { useEffect, useRef } from "react"

export function useFocusTrap(isActive: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !ref.current) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const container = ref.current
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector)
    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]

    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const closeBtn = container.querySelector('[data-close-modal]') as HTMLElement
        closeBtn?.click()
        return
      }

      if (e.key !== "Tab") return
      if (focusableElements.length === 0) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isActive])

  return ref
}
