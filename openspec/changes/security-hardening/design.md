# Design — Security Hardening

## Context

See `proposal.md` — Why for motivation. Current state relevant to the approach:

- `vercel.json:13-19` sets `Access-Control-Allow-Origin: *` for all `/api/*` routes at the edge.
- Staff API routes all follow the same guard pattern: `const { error } = await requireAuth(minRole?)` at the top of each handler (`src/lib/api-auth.ts`).
- `src/lib/rate-limit.ts` already provides an in-memory per-IP-per-path limiter used by public auth/order routes.
- `src/lib/integrations/crypto.ts` derives the AES key as `SHA-256(INTEGRATION_KEY)` — weak for a low-entropy secret. Credentials are already encrypted in the DB with this scheme, so a change must stay backward compatible.
- The pricing engine (`pricing/`) has 8 copies of `Math.random().toString(36)...` for ID generation across `index.ts`, `events/EventBus.ts`, and `rules/*.ts`.
- Webhook routes read `request.text()` with no size cap and parse with inline types, not Zod.
- iFood presence events already flow through `findIfoodAccountBySignature` (HMAC) before the early-return ack; the spec makes this behavior an explicit contract and adds a regression test.
- `openspec/specs/` has no main specs yet; `integrations-security` is treated as a new main spec in this change.

## Goals / Non-Goals

**Goals:**
- One-point enforcement for staff-route hardening: rate limiting + CSRF origin checks live in the shared guard, not in each route.
- Backward-compatible credential encryption so existing stored credentials keep working during and after migration.
- No new runtime dependencies (reuse `zod`, `crypto`, and the existing `rate-limit.ts`).

**Non-Goals:**
- Not re-architecting client data-fetching or introducing an external rate-limit store (Upstash/Redis).
- Not converting every client call site to send CSRF tokens.
- Not hardening public storefront routes beyond what already exists (they are same-origin and already rate-limited).
- Not removing the leftover `so-cookies-app/` directory or `Math.random()` uses outside `pricing/` (`src/lib/repository.ts`, `src/lib/customer-orders.ts`) — those are follow-ups in other changes.

## Decisions

### 1. CORS allowlist in `vercel.json`
Apply the explicit origin allowlist (`cookiesecafes.com`, `app.cookiesecafes.com`, `www.` variants, `http://localhost:3000`) in the existing `/api/(.*)` header rule instead of `*`. Since the app is same-origin and uses httpOnly cookies, CORS is defense-in-depth, but a wildcard is still a live misconfiguration.
- Alternatives: per-route `NextResponse` headers middleware. Rejected — edge headers in `vercel.json` cover all API routes and OPTIONS uniformly with no per-handler code.

### 2. CSRF: Origin/Referer validation in the shared guard
Extend the staff guard to reject unsafe methods (POST/PUT/PATCH/DELETE) when an `Origin` header is present and not allowlisted. Webhook routes are HMAC-authenticated and never call the guard, so they are exempt by construction (spec: csrf-protection).
- Alternatives: double-submit cookie token (requires touching every client fetch/axios call — large blast radius and no existing client-side token plumbing); NextAuth's own CSRF cookie (couples custom API hardening to the auth provider). Chosen: Origin validation — OWASP-recommended for same-origin SPAs with httpOnly cookies, zero client changes.
- Trade-off: requests with no `Origin` header (curl, some tooling) are not rejected. Acceptable; the primary browser-based attack vector sends an `Origin`.

### 3. Rate limiting for staff routes via the shared guard
Call the existing in-memory `rateLimit()` inside the guard for every staff route (default ~120 req/min per IP per path, exported constant so routes can tune). Webhooks skip it because they don't use the guard.
- Alternatives: Upstash/Redis (durable but adds an external service and env management), Next.js middleware at edge (can't easily distinguish HMAC webhooks from browser traffic, and duplicates existing in-memory logic). Chosen: extend the guard — single point, consistent with the current auth-route limiter.
- Trade-off: in-memory buckets are per serverless instance, so the limit is not globally exact. Acceptable as defense-in-depth; upgradeable to a store later without spec changes.

### 4. Guard shape: extend `requireAuth` to `requireAuth(request, minRole?)`
Change `src/lib/api-auth.ts` so `requireAuth` accepts a `Request` first and internally performs (a) rate limiting, (b) CSRF origin check on unsafe methods, (c) the existing session/role check. Call sites change from `requireAuth("OPERACIONAL")` to `requireAuth(request, "OPERACIONAL")`, and GET-only handlers gain a `request: Request` parameter.
- Alternatives: a separate `requireStaff()` helper (more name churn across ~40 files), or middleware (exemption logic is messy). Chosen: extend `requireAuth` — the `const { error } = await requireAuth(...)` pattern is uniform, so edits are mechanical and reviewable.

### 5. Pricing IDs via `crypto.randomUUID()`
Add a single `pricing/ids.ts` exporting `createId()` backed by `randomUUID()` (Node's `crypto`, already available via `@types/node` in `pricing/package.json`), and replace all 8 duplicated `Math.random()` expressions.
- Alternatives: `nanoid` dependency (new package for a built-in capability). Chosen: `randomUUID()` — no new dep, RFC 4122 v4, collision-safe, cryptographically secure.
- Verified: pricing IDs are used as opaque strings (event/audit IDs); no code depends on the old base36 format.

### 6. Credential encryption: scrypt-derived key with versioned envelope
In `src/lib/integrations/crypto.ts`: derive the AES-256 key with `scrypt(INTEGRATION_KEY, per-record random salt)` and prefix encrypted values with `v2.`. Keep the legacy SHA-256 key path as a decryption fallback for records without the prefix. A one-off script re-encrypts all stored credentials to `v2`.
- Alternatives: require `INTEGRATION_KEY` to already be a 32-byte base64 key (breaks existing installs, changes ops contract), or HKDF (does not slow down brute force of a low-entropy secret). Chosen: scrypt with per-record salt — raises the cost of guessing `INTEGRATION_KEY` while staying a drop-in env contract.
- Use a fixed moderate cost (N=16384) and cache the derived key per process to keep webhook decryption fast.

### 7. Webhook size limits + Zod schemas
Reject requests whose `Content-Length` exceeds 256 KB, and re-check the parsed body length as a second guard (App Router doesn't expose a streamed read; `request.text()` is the only read). Add `src/lib/integrations/schemas.ts` with Zod schemas for iFood and 99Food payloads, parsed via `safeParse` before processing.
- Zod is already a runtime dependency used across the app.

### 8. Reconcile IP allowlist via env var
Honor `RECONCILE_IP_ALLOWLIST` (comma-separated IPs/CIDRs, compared against the first `x-forwarded-for` entry, as already done in `rate-limit.ts`). When set, enforce before the handler and return 403 for non-allowlisted callers; when unset, keep current `requireAuth("OPERACIONAL")` behavior so staff dashboards are unaffected.

## Risks / Trade-offs

- [CORS whitelist blocks a legit client] → Mitigation: include apex + `www.` + localhost; commit list is easy to extend.
- [Origin check rejects a legit tool that sends a mismatched Origin] → Mitigation: only unsafe methods on staff routes are checked; absent Origin passes.
- [scrypt slows webhook decryption] → Mitigation: moderate cost, key cached per process; fallback path only used until migration completes.
- [AES migration risk: re-encrypt script touches live data] → Mitigation: run with a dry-run flag first; versioned envelope means data stays readable even if only part migrates.
- [In-memory rate limit not exact across instances] → Mitigation: documented defense-in-depth; limits are generous enough to avoid false positives.
- [randomUUID changes ID format] → Mitigation: verified no format assumptions in `pricing/`; UUIDs are valid strings anywhere IDs are used.

## Migration Plan

1. Deploy the code change with the versioned AES envelope (dual decrypt: `v2` via scrypt, legacy via SHA-256). Existing credentials remain readable — no downtime.
2. Run the re-encryption script (with `--dry-run`, then for real) so all stored credentials use `v2`.
3. Verify webhook processing and dashboard integration-account listing after migration.
4. Rollback: revert the commit; `vercel.json` headers and env allowlists deploy instantly on revert.

## Open Questions

None that would change the specs, approach, or task breakdown.
