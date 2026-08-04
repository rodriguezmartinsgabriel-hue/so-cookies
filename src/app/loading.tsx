"use client"

import { motion } from "framer-motion"
import { GlassSurface } from "@/components/ui/GlassSurface"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <GlassSurface tone="strong" className="max-w-md mx-auto px-6 py-8 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-6 h-6 rounded-full bg-accent" />
          </motion.div>
          <p className="text-sm text-muted font-medium">Carregando...</p>
        </div>
      </GlassSurface>
    </div>
  )
}