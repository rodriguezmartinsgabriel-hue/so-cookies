## Purpose

Adds per-IP request throttling to all staff API routes so that authenticated admin and operational endpoints cannot be abused for brute-force, scraping, or denial-of-service.

## ADDED Requirements

### Requirement: Staff API routes are rate limited

Every session-authenticated staff API route SHALL enforce a per-IP-per-path request limit. When the limit is exceeded, the API MUST respond with HTTP 429 and a `Retry-After` header indicating when the client may retry.

#### Scenario: Request within the limit is allowed

- **WHEN** a staff client sends requests from one IP below the configured limit within the window
- **THEN** each request is processed normally

#### Scenario: Request over the limit is throttled

- **WHEN** a staff client exceeds the configured request limit from the same IP for the same path within the window
- **THEN** the API responds with HTTP 429 and a `Retry-After` header

#### Scenario: Bucket resets after the window

- **WHEN** the rate limit window elapses for a throttled client
- **THEN** the client is allowed to make requests again

### Requirement: Rate limiting does not break legitimate webhook traffic

Webhook endpoints authenticated by HMAC signature SHALL NOT be subject to the staff rate limit and MUST keep accepting signed events.

#### Scenario: Signed webhook event over the staff limit

- **WHEN** a platform sends more signed webhook events than the staff rate limit in a window
- **THEN** every signed event is still processed because the staff limit does not apply
