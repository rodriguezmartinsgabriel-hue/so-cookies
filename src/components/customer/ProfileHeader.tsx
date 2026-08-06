"use client"

type ProfileHeaderProps = {
  name: string
  email: string
  phone?: string | null
}

export function ProfileHeader({ name, email, phone }: ProfileHeaderProps) {
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent text-lg font-bold">
        {initial}
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink truncate">{name}</p>
        <p className="text-sm text-muted truncate">{email}</p>
        {phone && <p className="text-sm text-muted">{phone}</p>}
      </div>
    </div>
  )
}
