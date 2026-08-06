import type { MetadataRoute } from "next"

function siteUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://cookiesecafes.com"
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const base = siteUrl()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/cardapio`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/entrar`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/cadastro`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]
}
