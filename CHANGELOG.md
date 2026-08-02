# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/). A versão exibida no app vem de `src/lib/version.ts` (fonte: `package.json`). Tags git acompanham cada release (`vX.Y.Z`).

## [0.4.0] - 2026-08-02

### Corrigido (Consistência offline — Fase 2)
- **Roles UI vs servidor**: a UI de Estoque (Insumos, Tabela de Preços e Aba Geral) agora só exibe ações de criar/editar/excluir para `ADMIN` — alinhado às rotas REST e ao sync push (antes, `OPERACIONAL` via botões e gerava 403/"Sem permissão" ao sincronizar). Em Produção, editar/mudar status continua `OPERACIONAL`, mas **excluir lote** passou a ser `ADMIN`-only (servidor já exigia).
- **Status de produção normalizado (minúsculas canônico)**: `sync/push` não faz mais `.toUpperCase()` (criava `EM_PRODUCAO` divergente do client `em_producao`); migration `20260802120000` normaliza valores existentes com `lower(status)`.
- **Delete de insumo limpa refs locais**: `repository.ingredients.delete` e o pull (`applyLocalDelete`) agora removem `recipeItems` do insumo e tiram a referência do JSON embutido das receitas (espelhando o `onDelete: Cascade` do servidor); novo índice `ingredientId` no schema Dexie (versão 5).
- **`priceTiers` no sync pull**: campo `updatedAt` adicionado a `PriceTier` (migration + índice) para pull incremental; `pull/route.ts` e `pullChanges` agora trazem/gravam faixas de preço offline (antes chegavam só via fetch completo do `getAll`).

### Adicionado
- Testes: `createProductionSchema`, `createPriceTierSchema`, sync de produção (reconciliação de tempId, status minúsculas), pull de `priceTiers`, delete de insumo com limpeza de receitas.

## [0.3.0] - 2026-08-02

### Adicionado (Fase 1 — Catálogo de Produtos)
- **Página `/produtos`** (Catálogo offline-first): tabela com foto, preço, custo e margem; busca por nome/SKU/categoria; filtros TODOS/ATIVOS/INATIVOS; modal de novo/editar com input monetário pt-BR e prévia de margem; toggle ativo; exclusão confirmada.
- **Entrada "Catálogo" na Sidebar** (ícone `Cookie`).
- **CRUD offline completo de produtos**: `repository.products` (getAll/create/update/delete) com fila de sync (`product:*`), tempId→realId e remoção cascata de `priceTiers` locais ao excluir.
- **Soft-delete de produto**: novo campo `Product.deletedAt` (migration `20260802100000_add_product_deleted_at`) preserva `SaleItem`/`PriceTier` (FK Restrict); `GET /api/products` retorna ativos + inativos; pull traz apenas `deletedAt: null`; deletes propagam por tombstone (`recordSyncDelete`).
- **`computeMargin`** no servidor (`db.ts`), cliente (`repository.ts`) e sync (`push/route.ts`); **`formatBRL`**.
- **Produtos NÃO são ADMIN-only**: REST e sync exigem apenas OPERACIONAL (`ADMIN_ENTITIES` não inclui `product`).
- Dropdowns de venda/pedido/produção/estoque agora mostram apenas produtos ativos.
- Testes: `computeMargin`, `formatBRL`, sync de produto (create com remapeamento de `priceTiers`, delete local, pull, margem preservada em update).

### Corrigido
- `computeMargin` retorna 0 para custo/preço negativos ou não finitos (evita margens absurdas tipo 150%).

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
