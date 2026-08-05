# Checklist de Otimização Mobile

## Performance (<50ms para ações locais)

- [x] Service Worker usa StaleWhileRevalidate (cache instantâneo)
- [x] staleTime reduzido para 10s em useQueryData
- [x] gcTime configurado para 60s em useQueryData
- [x] Optimistic UI no usePricing (mantém último resultado)
- [x] useCart já é local-first (localStorage + sync)
- [x] repository.ts já usa Dexie.js (IndexedDB) com sync queue

## Mobile PWA

- [x] manifest.ts com `display: standalone`
- [x] Meta tags `apple-mobile-web-app-capable` no layout
- [x] Meta tags `apple-mobile-web-app-status-bar-style` no layout
- [x] Meta tags `mobile-web-app-capable` no layout
- [x] Meta tags `theme-color` no layout
- [x] Shortcuts no manifest (Cardápio, Carrinho, Pedidos)
- [x] Categories no manifest (food, restaurant, ordering)
- [x] Splash screens para iPhone (4 tamanhos configurados)

## Headers de Cache

- [x] `X-DNS-Prefetch-Control: on` no vercel.json
- [x] `Strict-Transport-Security` no vercel.json
- [x] `Cache-Control: immutable` para /icons/*
- [x] `stale-while-revalidate` para manifest.webmanifest
- [x] `Cache-Control: no-store` para /api/*

## Medição de Performance

- [x] `src/lib/perf.ts` com measureAction e measureAsyncAction
- [x] `src/components/layout/WebVitals.tsx` com reportWebVitals
- [x] WebVitals integrado no layout.tsx
- [x] Console.warn quando ação excede 50ms

## Validação

- [x] TypeScript sem erros (`tsc --noEmit`)
- [x] Build bem-sucedido (`npm run build`)
- [x] 451 testes passando (`npm test`)

## Métricas Alvo

| Métrica | Alvo | Status |
|---------|------|--------|
| Ações locais (cache hit) | <50ms | ✅ StaleWhileRevalidate |
| First Paint (FP) | <1.8s | 📊 Medido via WebVitals |
| First Contentful Paint (FCP) | <1.8s | 📊 Medido via WebVitals |
| Largest Contentful Paint (LCP) | <2.5s | 📊 Medido via WebVitals |
| Interaction to Next Paint (INP) | <200ms | 📊 Medido via WebVitals |
| Cumulative Layout Shift (CLS) | <0.1 | 📊 Medido via WebVitals |

## Próximos Passos (Opcionais)

- [ ] Adicionar edge functions para API routes (Vercel Edge)
- [ ] Implementar preloading de páginas no SW
- [ ] Adicionar `prefetch` hints para rotas principais
- [ ] Implementar background sync para mutations offline
- [ ] Adicionar testes de performance (Lighthouse CI)