## Why

The app has critical security vulnerabilities that expose it to cross-origin attacks, CSRF, brute-force API abuse, and predictable ID generation. These issues were identified in a comprehensive audit and must be addressed before any further feature work. The CORS wildcard, missing CSRF protection, and unrestricted rate limiting on staff endpoints are exploitable in production today.

## What Changes

- Replace CORS wildcard (`Access-Control-Allow-Origin: *`) with an explicit origin whitelist in `vercel.json`
- Add CSRF token validation to all state-changing API routes (POST/PUT/PATCH/DELETE)
- Add rate limiting to all staff API routes (currently only public auth routes are rate-limited)
- Replace `Math.random()` with `crypto.randomUUID()` in the pricing engine for all ID generation
- Fix AES-256 key derivation to use a proper 32-byte cryptographically random key instead of SHA-256 hashing of `INTEGRATION_KEY`
- Add HMAC signature verification to iFood webhook presence events (currently skipped)
- Add request body size limits to webhook endpoints (currently unlimited)
- Add Zod schema validation to all webhook payloads (currently `JSON.parse()` with no validation)
- Add IP-based access control to the reconcile integration endpoint

## Capabilities

### New Capabilities
- `cors-whitelist`: Restrict API CORS to known origins only
- `csrf-protection`: Add CSRF token validation to all state-changing operations
- `api-rate-limiting`: Add rate limiting to staff API routes
- `crypto-secure-ids`: Replace Math.random() with crypto-safe ID generation
- `webhook-validation`: Add schema validation and size limits to webhook endpoints

### Modified Capabilities
- `integrations-security`: Strengthen HMAC verification to cover all webhook event types including presence

## Impact

- `vercel.json`: CORS configuration change
- `src/lib/integrations/crypto.ts`: AES key derivation rewrite
- `src/lib/integrations/crypto.ts`: HMAC verification for presence events
- `pricing/index.ts`: Replace Math.random() with crypto.randomUUID()
- `pricing/events/EventBus.ts`: Replace Math.random() with crypto.randomUUID()
- `pricing/rules/*.ts`: Replace Math.random() with crypto.randomUUID()
- `src/app/api/integrations/reconcile/route.ts`: Add IP whitelisting
- `src/app/api/integrations/ifood/webhook/route.ts`: Add body size limit, schema validation, HMAC for presence
- `src/app/api/integrations/99food/webhook/route.ts`: Add body size limit, schema validation
- All staff API routes: Add rate limiting middleware
- All state-changing API routes: Add CSRF token validation