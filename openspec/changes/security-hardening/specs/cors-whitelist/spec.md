## Purpose

Restricts cross-origin access to the API to a small set of known application origins, replacing the current wildcard that allows any website to read API responses.

## ADDED Requirements

### Requirement: API responses carry an explicit origin allowlist

The API SHALL respond to cross-origin requests only from the known application origins: `https://cookiesecafes.com`, `https://app.cookiesecafes.com`, and their `www.` variants. Requests from any other origin MUST NOT receive the `Access-Control-Allow-Origin` response header.

#### Scenario: Request from a whitelisted domain

- **WHEN** a browser sends an API request with `Origin: https://app.cookiesecafes.com`
- **THEN** the response includes `Access-Control-Allow-Origin: https://app.cookiesecafes.com`

#### Scenario: Request from an unknown domain

- **WHEN** a browser sends an API request with `Origin: https://evil.example.com`
- **THEN** the response does not include an `Access-Control-Allow-Origin` header

#### Scenario: Development on localhost

- **WHEN** a developer sends an API request from `Origin: http://localhost:3000`
- **THEN** the request is allowed with an explicit `Access-Control-Allow-Origin: http://localhost:3000`

### Requirement: Preflight requests are handled

The API SHALL respond to OPTIONS preflight requests for allowed origins with the permitted methods and headers, and MUST reject preflight from non-allowlisted origins.

#### Scenario: Preflight from a whitelisted origin

- **WHEN** a browser sends an OPTIONS preflight with `Origin: https://cookiesecafes.com`
- **THEN** the response includes the configured `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`
