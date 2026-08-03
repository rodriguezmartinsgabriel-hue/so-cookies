import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/cardapio" ||
    pathname.startsWith("/cardapio") ||
    pathname === "/carrinho" ||
    pathname.startsWith("/carrinho") ||
    pathname === "/entrar" ||
    pathname.startsWith("/entrar") ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro") ||
    pathname === "/perfil" ||
    pathname.startsWith("/perfil") ||
    pathname === "/pedido" ||
    pathname.startsWith("/pedido") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/serwist") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/~offline" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/integrations/99food/webhook") ||
    pathname.startsWith("/api/integrations/ifood/webhook");

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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
