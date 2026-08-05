## Purpose

Protects session-authenticated staff API endpoints against cross-site request forgery by rejecting state-changing requests that do not originate from the application's own domains.

## ADDED Requirements

### Requirement: State-changing staff requests are origin-validated

Every state-changing request (POST, PUT, PATCH, DELETE) to a session-authenticated staff API route SHALL be rejected with an HTTP 403 when its `Origin` header is present and not an allowlisted application origin. Safe methods (GET, HEAD, OPTIONS) MUST NOT be rejected on origin grounds.

#### Scenario: Same-origin staff POST is accepted

- **WHEN** an authenticated staff user submits a POST with `Origin: https://app.cookiesecafes.com`
- **THEN** the request proceeds to the route handler

#### Scenario: Cross-origin staff POST is rejected

- **WHEN** a browser submits a POST with `Origin: https://evil.example.com` carrying a valid staff session cookie
- **THEN** the API responds with HTTP 403 and does not execute the operation

#### Scenario: Requests without an Origin header

- **WHEN** a request reaches a staff route without an `Origin` header
- **THEN** the request is not rejected on origin grounds

### Requirement: Webhook and public endpoints remain exempt from origin checks

Webhook endpoints authenticated by HMAC signature and public storefront endpoints SHALL NOT be subject to the origin validation, so that server-to-server integrations keep working.

#### Scenario: iFood webhook with valid signature

- **WHEN** the iFood platform posts a signed event from a non-application origin
- **THEN** the event is accepted based on its HMAC signature and not rejected for its origin
