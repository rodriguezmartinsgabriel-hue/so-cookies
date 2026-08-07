"use client"

type PageHeaderProps = {
  eyebrow: string
  title: string
  subtitle?: string
}

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-accent">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-ui)" }}>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  )
}
