## Purpose

Hardens inbound integration webhooks by enforcing a maximum request body size and validating every payload against a strict schema before it is processed.

## ADDED Requirements

### Requirement: Webhook request bodies are size-limited

The iFood and 99Food webhook endpoints SHALL reject requests whose body exceeds a defined maximum size with HTTP 413. Bodies within the limit MUST be processed normally.

#### Scenario: Oversized webhook body is rejected

- **WHEN** a webhook request carries a body larger than the configured limit
- **THEN** the endpoint responds with HTTP 413 and does not process the payload

#### Scenario: Normal-sized webhook body is processed

- **WHEN** a webhook request carries a body within the configured limit
- **THEN** the endpoint proceeds with signature and schema validation

### Requirement: Webhook payloads are schema-validated

Every iFood and 99Food webhook payload SHALL be validated against a defined schema before processing. Payloads that do not conform MUST be rejected with HTTP 400.

#### Scenario: Invalid webhook payload is rejected

- **WHEN** a webhook request passes signature checks but its body is not valid JSON or does not conform to the expected schema
- **THEN** the endpoint responds with HTTP 400 and does not process the payload

#### Scenario: Valid webhook payload is processed

- **WHEN** a webhook request passes signature checks and its body conforms to the expected schema
- **THEN** the endpoint processes the event and responds with HTTP 200
