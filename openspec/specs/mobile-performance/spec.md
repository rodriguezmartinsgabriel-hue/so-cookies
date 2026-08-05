## Purpose

Ensures the mobile PWA delivers sub-50ms perceived action latency by using stale-while-revalidate caching, optimistic UI updates, and local-first data access.

## ADDED Requirements

### Requirement: Service Worker returns cached API responses instantly
The system SHALL use StaleWhileRevalidate strategy for all GET /api/* routes in the service worker, returning cached data immediately while refreshing the network in background.

#### Scenario: API read returns cached data instantly
- **WHEN** user opens a page that requires API data
- **THEN** system returns cached response from Service Worker within 50ms

#### Scenario: API cache is stale and network is available
- **WHEN** cached data is older than the cache max-age
- **THEN** system returns stale cache immediately and updates in background

### Requirement: Mobile meta tags enable standalone PWA mode
The system SHALL include apple-mobile-web-app-capable, mobile-web-app-capable, and theme-color meta tags in the HTML head for full-screen mobile experience.

#### Scenario: User adds app to home screen on iOS
- **WHEN** user taps "Add to Home Screen" on Safari iOS
- **THEN** app opens in standalone mode without browser UI

#### Scenario: User adds app to home screen on Android
- **WHEN** user taps "Install App" on Chrome Android
- **THEN** app opens in standalone mode with theme color applied

### Requirement: Pricing shows last known result while fetching
The system SHALL display the last known pricing result immediately when cart changes, then update with fresh data when the API responds.

#### Scenario: User adds item to cart
- **WHEN** user adds an item to the cart
- **THEN** pricing display updates instantly with last known values (no loading flash)

#### Scenario: Fresh pricing data arrives
- **WHEN** the pricing API responds with new data
- **THEN** system updates the pricing display with the fresh result

### Requirement: Query data cache is aggressive on mobile
The system SHALL use staleTime of 10 seconds and gcTime of 60 seconds for all query data hooks.

#### Scenario: User navigates back to a cached page
- **WHEN** user navigates back to a previously visited page
- **THEN** data is served from cache without network request (within 10s of last fetch)

#### Scenario: Cache is older than 10 seconds
- **WHEN** cached data is older than 10 seconds
- **THEN** system returns stale data immediately and refetches in background

### Requirement: Performance metrics are reported via Web Vitals
The system SHALL report FP, FCP, LCP, CLS, FID, and INP metrics to the console via PerformanceObserver.

#### Scenario: Page loads and metrics are collected
- **WHEN** the app finishes loading
- **THEN** system reports at least FCP and LCP metrics to the console

#### Scenario: User interacts with the app
- **WHEN** user performs an action (tap, scroll, input)
- **THEN** system reports INP metric if available