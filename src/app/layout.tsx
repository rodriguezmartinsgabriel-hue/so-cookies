import { headers } from "next/headers"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { SerwistProvider } from "@serwist/turbopack/react"
import Providers from "./providers"
import { LoadingScreen } from "@/components/layout/LoadingScreen"
import { UpdateWatcher } from "@/components/pwa/UpdateWatcher"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
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
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#111111" },
    { media: "(prefers-color-scheme: dark)", color: "#ede9e2" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get("x-nonce") || ""
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full font-body">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(sessionStorage.getItem("splash-shown")==="true"){document.documentElement.classList.add("splash-skip")}}catch(e){}})();',
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#111111" />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 393px) and (device-height: 852px)"
          href="/icons/splash-1179x2556.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 428px) and (device-height: 926px)"
          href="/icons/splash-1284x2778.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 430px) and (device-height: 932px)"
          href="/icons/splash-1290x2796.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 402px) and (device-height: 874px)"
          href="/icons/splash-1206x2622.png"
        />
        <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline={false}>
          <Providers>
            <LoadingScreen />
            <UpdateWatcher />
            {children}
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  )
}
