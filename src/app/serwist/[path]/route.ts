import { createSerwistRoute } from "@serwist/turbopack"

// Revision used by Serwist to version the precached offline page.
// Prefer environment variables (stable per deploy, no spawnSync overhead)
// over shelling out to git, as recommended by Serwist's own docs.
const revision: string =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
  })
