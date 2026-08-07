"use client"

import { Skeleton } from "@/components/ui/Skeleton"
import { GlassSurface } from "@/components/ui/GlassSurface"

export function ProfileSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando perfil">
      {/* Hero */}
      <GlassSurface tone="strong" className="rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <Skeleton variant="avatar" className="!w-16 !h-16" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="!h-5 !w-1/2" />
            <Skeleton variant="text" className="!h-3 !w-3/4" />
            <Skeleton variant="text" className="!h-3 !w-1/3" />
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-accent/5 p-4 space-y-2">
          <Skeleton variant="text" className="!h-3 !w-1/3" />
          <Skeleton variant="text" className="!h-8 !w-1/2" />
        </div>
      </GlassSurface>

      {/* Cards */}
      {[1, 2, 3].map((i) => (
        <GlassSurface key={i} tone="strong" className="rounded-2xl">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line/40">
            <Skeleton variant="avatar" className="!w-9 !h-9 !rounded-xl" />
            <Skeleton variant="text" className="!h-4 !w-1/3" />
          </div>
          <div className="p-5 space-y-3">
            <Skeleton variant="text" className="!h-4 !w-3/4" />
            <Skeleton variant="text" className="!h-4 !w-1/2" />
          </div>
        </GlassSurface>
      ))}
    </div>
  )
}
