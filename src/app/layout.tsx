import "./globals.css"
import type { Metadata, Viewport } from "next"
import Providers from "./providers"

export const metadata: Metadata = {
  applicationName: "Só Manager",
  title: {
    default: "Só Manager",
    template: "%s - Só Manager",
  },
  description: "Gestão completa do seu negócio de cookies",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Só Manager",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Só Manager",
    title: "Só Manager",
    description: "Gestão completa do seu negócio de cookies",
  },
}

export const viewport: Viewport = {
  themeColor: "#111111",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="h-full font-ui">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}