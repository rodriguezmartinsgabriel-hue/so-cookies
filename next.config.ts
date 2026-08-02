import { withSerwist } from "@serwist/turbopack"
import withBundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleAnalyzerConfig(
  withSerwist({
    turbopack: {},
    experimental: {
      serverActions: {
        bodySizeLimit: "2mb",
      },
    },
    async headers() {
      return [
        {
          source: "/icons/:path*",
          headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
          source: "/logo.svg",
          headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
          source: "/manifest.webmanifest",
          headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
        },
      ]
    },
  }),
)
