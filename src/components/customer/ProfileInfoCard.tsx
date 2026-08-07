"use client"

import type { ReactNode } from "react"
import { SectionCard } from "./SectionCard"

type ProfileInfoCardProps = {
  icon: ReactNode
  title: string
  /** Rótulo curto em uppercase acima do título (ex: "Dados pessoais"). */
  eyebrow?: string
  children: ReactNode
  action?: {
    label: string
    onClick: () => void
    /** Quando true, usa variant="secondary" (mais discreto). Default false (ghost). */
    emphasis?: boolean
    ariaLabel?: string
  }
  className?: string
}

export function ProfileInfoCard(props: ProfileInfoCardProps) {
  return <SectionCard {...props} />
}
