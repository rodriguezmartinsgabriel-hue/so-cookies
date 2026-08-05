"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { Analytics } from "@vercel/analytics/react"
import { MotionConfig } from "framer-motion"
import { useState } from "react"
import { ToastProvider } from "@/components/ui/Toast"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              {children}
              <Analytics />
            </ToastProvider>
          </MotionConfig>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
