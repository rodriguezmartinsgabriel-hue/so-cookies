## Purpose

Strengthens the security posture of the integrations subsystem: every webhook event type is HMAC-verified, stored credentials are encrypted with a strong key derivation, and server-triggered endpoints can be restricted by IP allowlist.

## ADDED Requirements

### Requirement: All iFood webhook event types are signature-verified

The iFood webhook endpoint SHALL verify the HMAC signature for every incoming event type, including presence events, before processing or acknowledging it. Events with an invalid or missing signature MUST be rejected with HTTP 401.

#### Scenario: Signed presence event is acknowledged

- **WHEN** the iFood platform sends a presence event with a valid HMAC signature
- **THEN** the endpoint acknowledges it with HTTP 200

#### Scenario: Unsigned presence event is rejected

- **WHEN** a presence event arrives without a valid HMAC signature
- **THEN** the endpoint responds with HTTP 401

### Requirement: Stored integration credentials are strongly encrypted

Credentials for integration accounts SHALL be encrypted with AES-256 using a key derived from the `INTEGRATION_KEY` secret through a strong key-derivation function (scrypt) with a dedicated application salt. Records encrypted with the previous scheme MUST remain decryptable so that existing data is not lost.

#### Scenario: New credentials are stored with the strong scheme

- **WHEN** an integration account is created or updated
- **THEN** its credentials are encrypted with the strong scheme and an explicit version marker

#### Scenario: Legacy encrypted credentials still decrypt

- **WHEN** the system reads credentials that were encrypted with the previous key derivation
- **THEN** they are decrypted successfully

### Requirement: Reconcile endpoint supports IP allowlisting

The integration reconcile endpoint SHALL enforce an IP allowlist when one is configured, rejecting requests from non-allowlisted addresses with HTTP 403. When no allowlist is configured, the endpoint MUST keep enforcing its staff authentication as before.

#### Scenario: Allowlisted caller is accepted

- **WHEN** a request to the reconcile endpoint comes from an IP in the configured allowlist
- **THEN** the request proceeds to the handler

#### Scenario: Non-allowlisted caller is rejected

- **WHEN** an allowlist is configured and a request comes from an IP outside it
- **THEN** the endpoint responds with HTTP 403 and does not run the reconciliation
