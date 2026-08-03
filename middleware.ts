import { proxy } from "./src/lib/proxy"

export function middleware(request: Parameters<typeof proxy>[0]) {
  return proxy(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
