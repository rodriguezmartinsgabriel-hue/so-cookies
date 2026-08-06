import { BlockList } from "node:net"

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || null
}

export function isIpAllowed(ip: string | null, allowlist: string): boolean {
  if (!ip) return false
  try {
    const blockList = new BlockList()
    for (const entry of allowlist
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)) {
      if (entry.includes("/")) {
        const [addr, prefix] = entry.split("/")
        blockList.addSubnet(addr, Number(prefix))
      } else {
        blockList.addAddress(entry)
      }
    }
    return blockList.check(ip)
  } catch {
    return false
  }
}
