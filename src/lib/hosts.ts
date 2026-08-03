export type HostRole = "store" | "staff" | "unknown";

function normalizeHost(host: string | undefined): string | null {
  if (!host) return null;
  return host
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

export function getHostRole(hostname: string | undefined): HostRole {
  const host = normalizeHost(hostname);
  if (!host) return "unknown";
  const storeHost = normalizeHost(
    process.env.STORE_HOST ?? process.env.NEXT_PUBLIC_STORE_HOST,
  );
  const staffHost = normalizeHost(
    process.env.STAFF_HOST ?? process.env.NEXT_PUBLIC_STAFF_HOST,
  );
  if (storeHost && host === storeHost) return "store";
  if (staffHost && host === staffHost) return "staff";
  return "unknown";
}
