## Tarefas

### Tarefa 1: Service Worker — StaleWhileRevalidate
- [x] Trocar `NetworkFirst` por `StaleWhileRevalidate` para APIs GET
- [x] Trocar `NetworkFirst` por `StaleWhileRevalidate` para páginas
- [x] Remover `networkTimeoutSeconds` (não necessário com SWR)
- [x] Aumentar `maxEntries` de 50 para 100 no cache de API

### Tarefa 2: Meta Tags Mobile no layout.tsx
- [x] Adicionar `apple-mobile-web-app-capable`
- [x] Adicionar `apple-mobile-web-app-status-bar-style`
- [x] Adicionar `mobile-web-app-capable`
- [x] Adicionar `theme-color` meta tag

### Tarefa 3: Manifest.ts — Shortcuts e Categories
- [x] Adicionar `categories` (food, restaurant, ordering)
- [x] Adicionar `shortcuts` para Cardápio, Carrinho e Pedidos

### Tarefa 4: useQueryData — Cache Agressivo
- [x] Reduzir `staleTime` de 30_000 para 10_000
- [x] Adicionar `gcTime` de 60_000

### Tarefa 5: usePricing — Optimistic UI
- [x] Manter último resultado visível enquanto busca novo
- [x] Mostrar loading apenas na primeira carga (sem resultado anterior)

### Tarefa 6: Vercel Headers
- [x] Adicionar `X-DNS-Prefetch-Control: on`
- [x] Adicionar `Strict-Transport-Security`
- [x] Adicionar cache headers para `/icons/*`
- [x] Adicionar `stale-while-revalidate` para manifest

### Tarefa 7: Perf Utility
- [x] Criar `src/lib/perf.ts` com `startMeasure`, `endMeasure`, `measureAction`, `measureAsyncAction`
- [x] Criar `src/components/layout/WebVitals.tsx` com `reportWebVitals`
- [x] Integrar `WebVitals` no `layout.tsx`

### Tarefa 8: Validação
- [x] TypeScript sem erros (`tsc --noEmit`)
- [x] Build bem-sucedido (`npm run build`)
- [x] Todos os testes passando (`npm test`)