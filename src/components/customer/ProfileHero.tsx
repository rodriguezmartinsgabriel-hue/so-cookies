"use client"

import { Sparkles, Mail, Phone } from "lucide-react"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { Badge } from "@/components/ui/Badge"
import { ProfilePointsCard } from "./ProfilePointsCard"

type ProfileHeroProps = {
  name: string
  email: string
  phone?: string | null
  points: {
    balance: number
    lifetimeEarned: number
    lifetimeSpent: number
    pointsPerReal: number
  }
  /** Handler do botão "Ver histórico" no PointsCard. */
  onViewPointsHistory?: () => void
}

export function ProfileHero({ name, email, phone, points, onViewPointsHistory }: ProfileHeroProps) {
  const initial = (name || email || "?").trim().charAt(0).toUpperCase()

  return (
    <GlassSurface tone="strong" className="rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/70
                       flex items-center justify-center text-paper text-2xl font-bold
                       shadow-md ring-2 ring-paper/60"
            aria-hidden="true"
          >
            {initial}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success
                       border-2 border-paper flex items-center justify-center"
            aria-label="Conta ativa"
            title="Conta ativa"
          >
            <Sparkles className="w-2.5 h-2.5 text-paper" strokeWidth={3} />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-ink truncate" style={{ fontFamily: "var(--font-ui)" }}>
              {name || "Bem-vindo"}
            </h2>
            <Badge variant="accent">Membro Só</Badge>
          </div>
          <div className="mt-1 space-y-0.5">
            <p className="flex items-center gap-1.5 text-xs text-muted truncate">
              <Mail className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{email}</span>
            </p>
            {phone && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Phone className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{phone}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <ProfilePointsCard
        balance={points.balance}
        lifetimeEarned={points.lifetimeEarned}
        lifetimeSpent={points.lifetimeSpent}
        pointsPerReal={points.pointsPerReal}
        onViewHistory={onViewPointsHistory}
      />
    </GlassSurface>
  )
}
