---
title: "Mobile Responsividade e Otimização de Performance"
status: "proposed"
priority: "high"
---

## Proposta

Otimizar o app Só Cookies & Café para a versão mobile (PWA) com foco em responsividade, garantindo que as ações do usuário rodem em menos de 50ms via estratégia local-first com cache agressivo e optimistic UI.

## Mudanças Propostas

1. **Service Worker (sw.ts)** — Trocar NetworkFirst por StaleWhileRevalidate para APIs e páginas. Isso retorna dados do cache instantaneamente enquanto atualiza em background, eliminando a latência de rede para ações do usuário.

2. **Meta tags mobile (layout.tsx)** — Adicionar `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `mobile-web-app-capable` e `theme-color` para PWA standalone no iOS e Android.

3. **Manifest.ts** — Adicionar `shortcuts` para navegação rápida e `categories` para discoverability na loja de apps.

4. **useQueryData.ts** — Reduzir `staleTime` de 30s para 10s e adicionar `gcTime` de 60s para cache mais agressivo no client.

5. **usePricing.ts** — Adicionar optimistic UI: manter o último resultado de pricing visível enquanto busca o novo, eliminando o flash de loading.

6. **Vercel headers (vercel.json)** — Adicionar `X-DNS-Prefetch-Control`, `Strict-Transport-Security` e cache headers para assets estáticos.

7. **Perf utility (src/lib/perf.ts)** — Criar utilitário de medição de performance com `measureAction`, `startMeasure`, `endMeasure` e `reportWebVitals`.

8. **Web Vitals (WebVitals.tsx)** — Componente client que reporta FP, FCP, LCP, CLS, FID e INP via PerformanceObserver.

## Restrições

- Ações com rede (API/banco) nunca ficarão abaixo de 50ms sem infraestrutura adicional (edge functions, CDN). A meta <50ms aplica-se a ações locais (cache hit, render, optimistic update).
- O app já possui arquitetura local-first com Dexie.js (IndexedDB) e sync queue, o que facilita a otimização.