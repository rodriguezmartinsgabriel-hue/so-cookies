import { NextResponse } from "next/server"
import {
  buildGoogleAuthorizeUrl,
  createOAuthState,
  getGoogleClientId,
  getRequestOrigin,
  sanitizeNext,
  signOAuthState,
} from "@/lib/customer-oauth"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const limited = rateLimit(request, 20, 60_000)
  if (!limited.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${getRequestOrigin(request)}/entrar?oauth_error=too_many_requests` },
    })
  }

  const clientId = getGoogleClientId()
  if (!clientId) {
    return NextResponse.json({ error: "Login Google não configurado" }, { status: 500 })
  }

  const { nonce } = createOAuthState()
  const url = new URL(request.url)
  const next = sanitizeNext(url.searchParams.get("next"))
  const state = await signOAuthState({ nonce, next: next ?? undefined })

  const redirectUri = new URL("/api/public/auth/oauth/google/callback", getRequestOrigin(request)).toString()
  const authorizeUrl = buildGoogleAuthorizeUrl({ clientId, redirectUri, state, nonce })

  return NextResponse.redirect(authorizeUrl, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
