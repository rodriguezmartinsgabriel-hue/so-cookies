import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { MobileAppPrompt } from "@/components/pwa/MobileAppPrompt"

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
const MOBILE_VIEWPORT = "(max-width: 767px)"
const STANDALONE = "(display-mode: standalone)"

function setUA(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true })
}

function mockMatchMedia(matchesByQuery: Record<string, boolean>) {
  const mq = vi.fn().mockImplementation((query: string) => ({
    matches: matchesByQuery[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }))
  Object.defineProperty(window, "matchMedia", { value: mq, configurable: true, writable: true })
  return mq
}

const mobileQueries = {
  [MOBILE_VIEWPORT]: true,
  [STANDALONE]: false,
  [REDUCED_MOTION]: true,
}

const desktopQueries = {
  [MOBILE_VIEWPORT]: false,
  [STANDALONE]: false,
  [REDUCED_MOTION]: true,
}

describe("MobileAppPrompt", () => {
  beforeEach(() => {
    localStorage.clear()
    delete process.env.NEXT_PUBLIC_MOBILE_PROMPT_ROLLOUT
    setUA(ANDROID_UA)
    mockMatchMedia(mobileQueries)
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MOBILE_PROMPT_ROLLOUT
    vi.restoreAllMocks()
  })

  it("aparece automaticamente para usuário mobile na primeira visita", async () => {
    render(<MobileAppPrompt />)
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /instale o app da só/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /instalar app/i })).toBeInTheDocument()
  })

  it("não aparece para usuário desktop", () => {
    setUA(DESKTOP_UA)
    mockMatchMedia(desktopQueries)
    render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("não aparece quando já está em modo standalone", async () => {
    mockMatchMedia({ ...mobileQueries, [STANDALONE]: true })
    render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("não aparece quando o usuário marcou que já instalou o app", () => {
    localStorage.setItem("socookie-mobile-prompt-installed", "true")
    render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("não reaparece após dismiss dentro do cooldown de 7 dias", async () => {
    render(<MobileAppPrompt />)
    fireEvent.click(await screen.findByRole("button", { name: /agora não/i }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(localStorage.getItem("socookie-mobile-prompt-dismissed-at")).not.toBeNull()

    const { unmount } = render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
    unmount()
  })

  it("“Agora não” grava cooldown e impede novo prompt na mesma renderização", async () => {
    render(<MobileAppPrompt />)
    fireEvent.click(await screen.findByRole("button", { name: /agora não/i }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.queryByRole("button", { name: /instalar app/i })).toBeNull()
  })

  it("exibe instruções de instalação para iOS", async () => {
    setUA(IOS_UA)
    render(<MobileAppPrompt />)
    fireEvent.click(await screen.findByRole("button", { name: /ver como instalar/i }))
    expect(await screen.findByText(/compartilhar/i)).toBeInTheDocument()
    expect(screen.getByText(/adicionar à tela de início/i)).toBeInTheDocument()
  })

  it("exibe instruções do menu do navegador para Android sem beforeinstallprompt", async () => {
    render(<MobileAppPrompt />)
    fireEvent.click(await screen.findByRole("button", { name: /instalar app/i }))
    expect(await screen.findByText(/menu do navegador/i)).toBeInTheDocument()
    expect(screen.getByText(/adicionar à tela inicial/i)).toBeInTheDocument()
  })

  it("dispara beforeinstallprompt no Android quando disponível e fecha ao aceitar", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const userChoice = Promise.resolve({ outcome: "accepted" as const })

    render(<MobileAppPrompt />)
    await screen.findByRole("dialog")

    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
    }
    event.prompt = prompt
    event.userChoice = userChoice
    act(() => {
      window.dispatchEvent(event)
    })

    await waitFor(() => expect(screen.getByRole("button", { name: /instalar app/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /instalar app/i }))

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("“Já tenho o app instalado” marca instalado e fecha permanentemente", async () => {
    render(<MobileAppPrompt />)
    fireEvent.click(await screen.findByRole("button", { name: /já tenho o app instalado/i }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(localStorage.getItem("socookie-mobile-prompt-installed")).toBe("true")
  })

  it("respeita rollout desligado (0%)", () => {
    process.env.NEXT_PUBLIC_MOBILE_PROMPT_ROLLOUT = "0"
    render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("respeita cooldown ativo persistido no localStorage", () => {
    localStorage.setItem("socookie-mobile-prompt-dismissed-at", String(Date.now()))
    render(<MobileAppPrompt />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
