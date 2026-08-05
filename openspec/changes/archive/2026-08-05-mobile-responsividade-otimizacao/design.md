## Design

### Arquitetura de Cache

O Service Worker (Serwist) usa `StaleWhileRevalidate` para todas as rotas de API e páginas. Isso significa:

- **Primeira carga**: busca da rede, armazena em cache, retorna ao usuário
- **Carregamentos subsequentes**: retorna do cache instantaneamente (sub-50ms), atualiza a rede em background
- **Offline**: serve o último dado cacheado

### Estratégia de Meta Tags Mobile

```
apple-mobile-web-app-capable: yes
apple-mobile-web-app-status-bar-style: black-translucent
mobile-web-app-capable: yes
theme-color: #111111
viewport: width=device-width, initial-scale=1, viewportFit=cover
```

Isso faz o app abrir em tela cheia no iOS e Android, sem a barra de endereço do navegador.

### Optimistic UI

Para pricing e mutações:
1. O usuário realiza a ação (ex: adicionar ao carrinho)
2. A UI atualiza imediatamente com o último resultado conhecido
3. A requisição de rede é feita em background
4. Quando o resultado chega, a UI é atualizada com dados frescos

### Performance Measurement

O utilitário `perf.ts` oferece:
- `startMeasure(name)` / `endMeasure(name)` — marcação manual
- `measureAction(name, fn)` — mede ações síncronas
- `measureAsyncAction(name, fn)` — mede ações assíncronas
- `reportWebVitals()` — relata métricas via PerformanceObserver

### Headers de Cache Vercel

```
/icons/* → Cache-Control: public, max-age=31536000, immutable
/manifest.webmanifest → Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/api/* → Cache-Control: no-store
/* → X-DNS-Prefetch-Control: on, Strict-Transport-Security
```