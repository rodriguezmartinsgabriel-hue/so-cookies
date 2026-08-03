import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getHostRole } from "@/lib/hosts";

function isCustomerRoute(pathname: string) {
  return (
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
    pathname.startsWith("/pedido")
  );
}

function isCustomerApi(pathname: string) {
  return pathname.startsWith("/api/public");
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
    pathname.startsWith("/api/integrations/ifood/webhook")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getHostRole(request.nextUrl.hostname);

  if (role === "store") {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/cardapio", request.url));
    }
    if (
      isCustomerRoute(pathname) ||
      isCustomerApi(pathname) ||
      isInfraRoute(pathname) ||
      isWebhookRoute(pathname)
    ) {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
