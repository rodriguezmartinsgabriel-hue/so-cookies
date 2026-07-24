import type { NextConfig } from "next"
import { withSerwist } from "@serwist/turbopack"

export default withSerwist({
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
})