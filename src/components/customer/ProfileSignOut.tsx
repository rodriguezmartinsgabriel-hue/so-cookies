"use client"

import { useState } from "react"
import { LogOut, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

type ProfileSignOutProps = {
  onSignOut: () => void | Promise<void>
  loading?: boolean
}

export function ProfileSignOut({ onSignOut, loading }: ProfileSignOutProps) {
  const haptic = useHapticFeedback()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="pt-2 pb-4">
      <AnimatePresence mode="wait" initial={false}>
        {confirmOpen ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 p-3 rounded-xl border border-danger/30 bg-danger/5"
          >
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-sm text-ink flex-1">Tem certeza que deseja sair?</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                haptic.tap()
                setConfirmOpen(false)
              }}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              size="sm"
              className="bg-danger text-paper hover:bg-danger/90"
              onClick={async () => {
                haptic.tap()
                await onSignOut()
              }}
              disabled={loading}
            >
              Sair
            </Button>
          </motion.div>
        ) : (
          <motion.button
            key="trigger"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              haptic.tap()
              setConfirmOpen(true)
            }}
            className="group w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl
                       text-sm font-medium text-muted hover:text-danger
                       border border-line/60 hover:border-danger/30 hover:bg-danger/5
                       transition-colors duration-150"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Sair da conta
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
