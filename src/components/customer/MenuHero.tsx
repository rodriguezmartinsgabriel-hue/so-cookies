"use client"

import { Search, X } from "lucide-react"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { Input } from "@/components/ui/Input"

type MenuHeroProps = {
  query: string
  onQueryChange: (query: string) => void
  /** Total de itens filtrados; exibido como contagem quando há busca ativa. */
  resultCount?: number
}

export function MenuHero({ query, onQueryChange, resultCount }: MenuHeroProps) {
  const hasQuery = query.trim().length > 0

  return (
    <GlassSurface tone="strong" className="rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em] text-accent">Cardápio</p>
        <h1 className="mt-1 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-ui)" }}>
          Escolha seus cookies
        </h1>
        <p className="mt-1 text-sm text-muted">Retirada na loja — monte seu pedido</p>
      </div>

      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center pointer-events-none">
          <Search className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <Input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar no cardápio"
          aria-label="Buscar no cardápio"
          className="!h-12 !rounded-full !border-line/50 !bg-paper/60 backdrop-blur-md pl-12 pr-14"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Limpar busca"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {hasQuery && typeof resultCount === "number" && (
        <p className="text-xs text-muted" role="status">
          {resultCount === 1 ? "1 item encontrado" : `${resultCount} itens encontrados`}
        </p>
      )}
    </GlassSurface>
  )
}
