"use client"

import { motion } from "framer-motion"

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center text-center py-12 px-4 will-change-transform"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8, rotate: -5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 mx-auto mb-4 text-muted/50"
        >
          {icon}
        </motion.div>
      )}
      <p className="text-base font-semibold text-ink mb-1">{title}</p>
      <p className="text-sm text-muted mb-6 max-w-xs">{description}</p>
      {action && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={action.onClick}
          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-ink text-paper h-10 px-4 text-sm transition-all hover:bg-ink/90"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}