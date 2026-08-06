import {
  clearOAuthStateCookie,
  exchangeGoogleCode,
  findOrCreateOAuthCustomer,
  getGoogleClientId,
  getGoogleClientSecret,
  getOAuthStateCookie,
  getRequestOrigin,
  oauthErrorRedirect,
  sanitizeNext,
  verifyGoogleIdToken,
} from "@/lib/customer-oauth"
import { setCustomerCookie } from "@/lib/customer-auth"
import { syncCustomerToContact } from "@/lib/customer-contact"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const limited = rateLimit(request, 10, 60_000)
  if (!limited.ok) {
    return oauthErrorRedirect(request, "too_many_requests")
  }

  const url = new URL(request.url)
  const stateParam = url.searchParams.get("state")
  const code = url.searchParams.get("code")

  const saved = await getOAuthStateCookie()
  await clearOAuthStateCookie()

  if (!saved || !stateParam || saved.state !== stateParam) {
    console.warn("[oauth] invalid_state", {
      hasCookie: Boolean(saved),
      hasStateParam: Boolean(stateParam),
      mismatch: Boolean(saved && stateParam && saved.state !== stateParam),
    })
    return oauthErrorRedirect(request, "invalid_state")
  }
  if (!code) {
    return oauthErrorRedirect(request, "access_denied")
  }

  const clientId = getGoogleClientId()
  const clientSecret = getGoogleClientSecret()
  if (!clientId || !clientSecret) {
    return oauthErrorRedirect(request, "not_configured")
  }

  const redirectUri = new URL("/api/public/auth/oauth/google/callback", getRequestOrigin(request)).toString()

  try {
    const { idToken } = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri })
    const profile = await verifyGoogleIdToken({ idToken, clientId, nonce: saved.nonce })
    const { customerId, created } = await findOrCreateOAuthCustomer({
      provider: "google",
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
    })
    if (created) {
      try {
        await syncCustomerToContact({ id: customerId, name: profile.name || profile.email, email: profile.email })
      } catch (e) {
        console.error("Falha ao sincronizar contato do cliente OAuth", e)
      }
    }
    await setCustomerCookie(customerId)
    const next = sanitizeNext(saved.next)
    return new Response(null, {
      status: 302,
      headers: { Location: new URL(next ?? "/perfil", getRequestOrigin(request)).toString() },
    })
  } catch {
    return oauthErrorRedirect(request, "server_error")
  }
}
