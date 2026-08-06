import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getHostRole } from "@/lib/hosts";
import { isAllowedOrigin } from "@/lib/security";

const CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_ALLOW_HEADERS = "Content-Type, Authorization";

function generateNonce() {
  return crypto.randomUUID();
}

function getCspHeader(nonce: string) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

function setSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", getCspHeader(nonce));
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
}

function setCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
}

function isCustomerRoute(pathname: string) {
  return (
    pathname === "/cardapio" ||
    pathname.startsWith("/cardapio/") ||
    pathname === "/carrinho" ||
    pathname.startsWith("/carrinho/") ||
    pathname === "/entrar" ||
    pathname.startsWith("/entrar/") ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro/") ||
    pathname === "/perfil" ||
    pathname.startsWith("/perfil/") ||
    pathname === "/pedido" ||
    pathname.startsWith("/pedido/") ||
    pathname === "/pagamento" ||
    pathname.startsWith("/pagamento/")
  );
}

function isCustomerApi(pathname: string) {
  return pathname.startsWith("/api/public");
}

function isProtectedCustomerRoute(pathname: string) {
  return (
    (pathname === "/cardapio" || pathname.startsWith("/cardapio/")) ||
    (pathname === "/carrinho" || pathname.startsWith("/carrinho/")) ||
    (pathname === "/perfil" || pathname.startsWith("/perfil/")) ||
    (pathname === "/pedido" || pathname.startsWith("/pedido/")) ||
    (pathname === "/pagamento" || pathname.startsWith("/pagamento/"))
  );
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/api/auth");
}

function isInfraRoute(pathname: string) {
  return (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/serwist") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/~offline"
  );
}

function isWebhookRoute(pathname: string) {
  return (
    pathname.startsWith("/api/integrations/99food/webhook") ||
    pathname.startsWith("/api/integrations/ifood/webhook") ||
    pathname.startsWith("/api/payments/webhook/mercadopago")
  );
}

function routeRequest(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const role = getHostRole(request.nextUrl.hostname);

  if (role === "store") {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/cardapio", request.url));
    }
    if (isCustomerRoute(pathname) || isCustomerApi(pathname) || isInfraRoute(pathname) || isWebhookRoute(pathname)) {
      if (isProtectedCustomerRoute(pathname) && !request.cookies.has("socookie_customer")) {
        const loginUrl = new URL("/entrar", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }
    return new NextResponse("Not found", { status: 404 });
  }

  if (role === "staff" && (isCustomerRoute(pathname) || isCustomerApi(pathname))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isPublicRoute =
    isCustomerRoute(pathname) ||
    isCustomerApi(pathname) ||
    isAuthRoute(pathname) ||
    isInfraRoute(pathname) ||
    isWebhookRoute(pathname);

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api");
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : null;

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (isApiPath && request.method === "OPTIONS") {
    if (!allowedOrigin) {
      return new NextResponse(null, { status: 403 });
    }
    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(response, allowedOrigin);
    setSecurityHeaders(response, nonce);
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  const response = routeRequest(request);
  if (isApiPath && allowedOrigin) {
    setCorsHeaders(response, allowedOrigin);
  }
  setSecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
