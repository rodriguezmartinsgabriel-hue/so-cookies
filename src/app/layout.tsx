import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Caveat } from "next/font/google"
import Providers from "./providers"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
})

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand",
  display: "swap",
})

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
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${caveat.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full font-ui">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}