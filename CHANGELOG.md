# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/). A versão exibida no app vem de `src/lib/version.ts` (fonte: `package.json`). Tags git acompanham cada release (`vX.Y.Z`).

## [0.2.0] - 2026-08-02

### Adicionado
- **Versionamento contínuo**: versão única (`src/lib/version.ts`) exibida no rodapé da Sidebar; `package.json` em `0.2.0`; tags git `vX.Y.Z` por release.
- Rota dedicada de reconciliação de plataforma `POST /api/integrations/reconcile` (auth OPERACIONAL).
- Cadência de reconciliação no cliente (a cada 5 min, online/visível).
- Testes para `parseCurrencyPtBr` e refs de sync com `channelId`/`productId`.

### Corrigido (Blindagem — Fase 0)
- **Segurança**: `GET /api/sales`, `GET /api/sales/[id]`, `GET /api/documents` e `GET /api/documents/[id]` não expõem mais o hash de senha (`user` retorna apenas `id`, `name`, `email`, `role`).
- **Webhooks**: `/api/integrations/99food/webhook` e `/api/integrations/ifood/webhook` deixaram de exigir sessão no proxy (chamadas de plataforma chegavam como 307 → `/login` e nunca processavam pedidos).
- **Escalação de privilégio**: `sync/push` agora exige ADMIN para criar/atualizar/excluir `cashFlow`, `ingredient`, `recipe`, `channel`, `priceTier` (alinhado às rotas REST).
- **Tombstones**: `recordSyncDelete()` agora é chamado em todos os DELETEs REST sincronizados (orders, sales, cashflow, productions, ingredients, recipes, channels, price-tiers, delivery-cost, contacts, interactions) e após o delete no `documents/[id]`, propagando exclusões offline.
- **Refs de sync**: `resolveRefs` agora mapeia `channelId` e `productId` (evita FK `P2003` ao criar canal/venda offline no mesmo lote).
- **Pull**: `runLazyReconcile()` saiu do caminho de todo pull (agora agendado de forma controlada), reduzindo carga no banco a cada 25s por cliente.
- **Caixa**: input monetário aceita formato pt-BR (vírgula/milhar) sem gerar `NaN`; sinal de SAIDA normalizado como negativo em REST, sync e repositório offline (exibição com `Math.abs`).
- **`isConstraintError`**: agora reconhece `P2002` (unique) e `P2003` (FK).
- **Receitas**: atualização de receita (PUT) e `updateRecipeIngredients` agora são transacionais.
- **`NEVER_SYNCED`**: constante única em `db-local.ts` (era duplicada em 3 arquivos).
- **Bundle do cliente**: `sync-service` deixou de importar `reconcile.ts` (server-only, puxava `pg`/`node:*` para o browser), mantendo o intervalo de reconcile como constante local — corrige `Module not found: Can't resolve 'dns'/'fs'/'net'/'tls'` no build.

### Notas
- Paginação/cursor no pull (primeiro sync desde `since=0`) fica para a Fase 4 de robustez.
- `fileUrl` de documentos (base64) permanece no pull/lista porque a UI offline exibe anexos e miniaturas; a paginação resolverá o payload em Fase 4.
- Dependências seguras atualizadas (patches in-range). Majors adiados: `next-auth` v4 (usamos v5 beta), `typescript` 7, `eslint` 10, `@types/node` 26.

## [0.1.0] - baseline
- Versão inicial com pedidos, vendas, caixa, produtos, insumos, receitas, canais, produção, delivery, documentos, contatos, integrações 99Food/iFood, relatórios/PDF e sync offline (Dexie + IndexedDB).
