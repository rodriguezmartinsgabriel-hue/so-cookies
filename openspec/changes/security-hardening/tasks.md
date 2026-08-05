# Tasks — Security Hardening

## 1. CORS allowlist

- [x] 1.1 Replace `Access-Control-Allow-Origin: *` in `vercel.json` with explicit `https://cookiesecafes.com`, `https://app.cookiesecafes.com`, both `www.` variants, and `http://localhost:3000`

## 2. Shared staff guard (rate limit + CSRF)

- [x] 2.1 Extend `requireAuth(request, minRole?)` in `src/lib/api-auth.ts` to run `rateLimit()` for staff routes (exported default ~120 req/min per IP per path)
- [x] 2.2 Add `assertSameOrigin(request)` check inside `requireAuth` that rejects unsafe methods (POST/PUT/PATCH/DELETE) with 403 when `Origin` is present and not allowlisted
- [x] 2.3 Add unit tests for the extended `requireAuth` (rate limit exceeded → 429, cross-origin POST → 403, absent Origin passes, GET not origin-checked)

## 3. Update staff route call sites

- [x] 3.1 Update `users`, `users/[id]` and `sync/push`, `sync/pull`, `sync/diagnostics` routes to pass `request` to `requireAuth`
- [x] 3.2 Update `products`, `products/[id]`, `ingredients`, `ingredients/[id]`, `ingredients/low-stock`, `recipes`, `recipes/[id]`, `delivery-zones`, `delivery-zones/[id]`, `delivery-routes`, `delivery-routes/[id]`, `delivery-cost`, `delivery-cost/[id]`, `delivery-blocks`, `delivery-blocks/[id]` routes
- [x] 3.3 Update `orders`, `orders/[id]`, `sales`, `sales/[id]`, `cashflow`, `cashflow/[id]`, `productions`, `productions/[id]`, `dashboard/kpis` routes
- [x] 3.4 Update `price-tiers`, `price-tiers/[id]`, `contacts`, `contacts/[id]`, `contacts/[id]/interactions`, `interactions`, `interactions/[id]`, `documents`, `documents/[id]`, `channels`, `channels/[id]`, `integrations/accounts`, `integrations/accounts/[id]` routes
- [x] 3.5 Verify no `requireAuth` call site remains without a request (grep `requireAuth` across `src/app/api`)

## 4. Pricing engine secure IDs

- [x] 4.1 Add `pricing/ids.ts` exporting `createId()` using `randomUUID()` from `node:crypto`
- [x] 4.2 Replace `Math.random()` ID generation in `pricing/index.ts` and `pricing/events/EventBus.ts` with `createId()`
- [x] 4.3 Replace `Math.random()` ID generation in `pricing/rules/*.ts` (`PricingRule`, `B2BRule`, `CampaignRule`, `CouponRule`, `PriceTierRule`, `ShippingRule`) with `createId()`
- [x] 4.4 Add unit test asserting generated IDs are valid UUIDv4 and unique

## 5. Credential encryption hardening

- [x] 5.1 Rewrite `src/lib/integrations/crypto.ts`: derive AES-256 key via scrypt with per-record salt, prefix output with `v2.`, cache derived key per process
- [x] 5.2 Keep legacy SHA-256 key as decryption fallback for non-`v2` records
- [x] 5.3 Add `scripts/reencrypt-integration-credentials.ts` (dry-run + real mode) that re-encrypts all stored credentials to `v2`
- [x] 5.4 Add unit tests: roundtrip encrypt/decrypt, legacy-format decrypt, tampered payload rejection

## 6. Webhook hardening (iFood and 99Food)

- [x] 6.1 Add `src/lib/integrations/schemas.ts` with Zod schemas for iFood and 99Food webhook payloads
- [x] 6.2 Reject webhook requests with `Content-Length` over 256 KB (HTTP 413) and re-check parsed body length
- [x] 6.3 Update `src/app/api/integrations/ifood/webhook/route.ts`: Zod-validate payload, keep explicit HMAC verification for all event types including presence
- [x] 6.4 Update `src/app/api/integrations/99food/webhook/route.ts`: Zod-validate payload, enforce body size limit
- [x] 6.5 Add unit tests for webhook schema validation, body size rejection, and presence-event HMAC verification

## 7. Reconcile IP allowlist

- [x] 7.1 Enforce `RECONCILE_IP_ALLOWLIST` (comma-separated IPs/CIDRs) in `src/app/api/integrations/reconcile/route.ts`, returning 403 for non-allowlisted callers when configured
- [x] 7.2 Add unit test for allowlisted vs non-allowlisted caller and for unset allowlist behavior

## 8. Verification

- [x] 8.1 Run `npm run typecheck` clean; `npm run lint` has only pre-existing errors in generated Prisma code and legacy root scripts (none in hardened files)
- [x] 8.2 Run `npm test` (415 tests passing, including new webhook/requireAuth/reconcile/crypto/ids tests)
- [x] 8.3 Run `npm run build` successfully
