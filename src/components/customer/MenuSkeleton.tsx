"use client"

import { Skeleton } from "@/components/ui/Skeleton"
import { GlassSurface } from "@/components/ui/GlassSurface"

export function MenuSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando cardápio">
      {/* Hero */}
      <GlassSurface tone="strong" className="rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="!h-2.5 !w-16" />
          <Skeleton variant="text" className="!h-6 !w-1/2" />
          <Skeleton variant="text" className="!h-3 !w-2/3" />
        </div>
        <Skeleton variant="card" className="!h-11 !rounded-xl" />
      </GlassSurface>

      {/* Cards */}
      {[1, 2, 3, 4].map((i) => (
        <GlassSurface key={i} tone="strong" className="rounded-2xl">
          <div className="flex items-center gap-3 p-3">
            <Skeleton variant="avatar" className="!w-16 !h-16 !rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="!h-4 !w-2/3" />
              <Skeleton variant="text" className="!h-3 !w-1/3" />
            </div>
            <Skeleton variant="card" className="!h-11 !w-11 !rounded-xl" />
          </div>
        </GlassSurface>
      ))}
    </div>
  )
}
