# Análise Completa — Só Cookies App

> Gerado em: 29/07/2026
> Branch: `code-review/analysis-report`

---

## Sumário Executivo

| Item | Status |
|------|--------|
| Build | ✅ Compila sem erros |
| TypeScript (strict) | ✅ Sem erros |
| Testes (14) | ✅ 100% passam |
| Prisma Generate | ✅ OK |
| PWA Build | ✅ OK |
| API Endpoints | 31 rotas |
| Páginas Dashboard | 11 páginas |
| Modelos de Dados | 17 modelos Prisma |

---

## 🚨 1. Problemas Críticos

### 1.1 Botão "Finalizar Pedido" sem handler
**Arquivo:** `src/app/cardapio/page.tsx` (linha ~84)  
**Problema:** O botão "Finalizar Pedido" no cardápio público não possui handler `onClick`. O carrinho de compras não persiste em localStorage/IndexedDB — qualquer recarregamento da página perde os itens adicionados.

**Impacto:** Funcionalidade de pedidos pelo cardápio público não operacional.

### 1.2 Role-Based Access Control (RBAC) inconsistente
**Arquivos afetados:** Múltiplos API route handlers  
**Problema:** Usuários com role `VISUALIZADOR` (leitura) conseguem criar, alterar e deletar registros porque várias rotas usam `requireAuth()` sem especificar role mínima.

| Rota | Tipo | Requerido (mínimo) | Atual |
|------|------|--------------------|-------|
| `POST /api/products` | Criação | `OPERACIONAL` | `qualquer` |
| `PUT /api/products/[id]` | Alteração | `OPERACIONAL` | `qualquer` |
| `DELETE /api/products/[id]` | Exclusão | `OPERACIONAL` | `qualquer` |
| `POST /api/sales` | Criação | `OPERACIONAL` | `qualquer` |
| `DELETE /api/sales/[id]` | Exclusão | `OPERACIONAL` | `qualquer` |
| `POST /api/orders` | Criação | `OPERACIONAL` | `qualquer` |
| `PUT /api/orders/[id]` | Alteração | `OPERACIONAL` | `qualquer` |
| `DELETE /api/orders/[id]` | Exclusão | `OPERACIONAL` | `qualquer` |
| `POST /api/price-tiers` | Criação | `ADMIN` | `qualquer` |
| `POST /api/delivery-cost` | Criação | `OPERACIONAL` | `qualquer` |
| `POST /api/ingredients` | Criação | `ADMIN` | `ADMIN` (ok) |
| `POST /api/cashflow` | Criação | `ADMIN` | `ADMIN` (ok) |
| `POST /api/reports` | Exportação | `OPERACIONAL` | `qualquer` |

### 1.3 `createSaleFromOrder` pode criar vendas duplicadas
**Arquivo:** `src/app/api/sync/push/route.ts` (linha ~64, case `"order:update"`)  
**Problema:** Quando `updateOrderStatus("CONCLUIDO")` é chamado, ele verifica `!updated.sale` para criar a venda. Se o sync push for executado duas vezes, o `update` já terá rodado, mas o `updated` retornado pode não refletir a sale recém-criada (devido ao cache ou concorrência), resultando em venda duplicada.

**Sugestão:** Usar upsert ou verificar existência antes de criar.

### 1.4 Sync push sem transação atômica
**Arquivo:** `src/app/api/sync/push/route.ts` (linha ~22, `for (const change of changes)`)  
**Problema:** Cada change é processado em um loop sequencial sem transação Prisma. Se um change falha no meio, os anteriores já foram commitados. Não há rollback.

**Sugestão:** Envolver o loop inteiro em `prisma.$transaction([...])`.

### 1.5 Sync pull inconsistente — campos de filtro misturados
**Arquivo:** `src/app/api/sync/pull/route.ts` (linhas 16-44)  
**Problema:** Cada entidade usa um campo de data diferente para filtrar:

| Entidade | Campo de Filtro | Problema |
|----------|----------------|----------|
| `orders` | `updatedAt` | ✅ Correto |
| `sales` | `createdAt` | ❌ Não pega atualizações |
| `cashFlow` | `date` | ❌ Mistura data do lançamento com sync |
| `productions` | `updatedAt` | ✅ |
| `ingredients` | `updatedAt` | ✅ |
| `recipes` | `updatedAt` | ✅ |
| `documents` | `updatedAt` | ✅ |
| `deliveryCosts` | `createdAt` | ❌ Não pega atualizações |

---

## 🔴 2. Problemas de Segurança

### 2.1 Erros silenciados com `catch {}`
**Arquivos:**
- `src/hooks/useSales.ts` — linha 15
- `src/hooks/useOrders.ts` — linha 15
- `src/app/cardapio/page.tsx` — linha 27
- `src/lib/sync-service.ts` — linhas 39, 67
- `src/lib/repository.ts` — múltiplas linhas

**Problema:** Blocos `catch {}` vazios engolem exceções sem log, tornando impossível debugar falhas de rede, erros de API ou problemas de parsing.

### 2.2 PUT sem validação Zod
**Arquivos** — nenhuma validação de entrada nos seguintes endpoints:

| Rota | Arquivo |
|------|---------|
| `PUT /api/products/[id]` | `src/app/api/products/[id]/route.ts` |
| `PUT /api/channels/[id]` | `src/app/api/channels/[id]/route.ts` |
| `PATCH /api/productions/[id]` | `src/app/api/productions/[id]/route.ts` |
| `PUT /api/recipes/[id]` | `src/app/api/recipes/[id]/route.ts` |
| `PUT /api/documents/[id]` | `src/app/api/documents/[id]/route.ts` |
| `PUT /api/delivery-cost/[id]` | `src/app/api/delivery-cost/[id]/route.ts` |
| `PUT /api/price-tiers/[id]` | `src/app/api/price-tiers/[id]/route.ts` |

**Risco:** Dados arbitrários podem ser escritos no banco de dados, incluindo campos que não deveriam ser alterados.

### 2.3 `as any` casts inseguros
**Arquivos:**
- `src/app/api/cashflow/route.ts` — `parsed as any`
- `src/app/api/cashflow/[id]/route.ts` — `parsed as any`

**Problema:** O cast `as any` no Prisma `create`/`update` anula completamente a verificação de tipos.

### 2.4 Dados mock hardcoded no Dashboard
**Arquivo:** `src/app/page.tsx` (linha ~34)  
**Problema:** Se a API de KPIs falha, o app exibe dados mock:
```typescript
setKpis({ revenue: 450, profit: 130, margin: 28.9, ... })
```
Isso engana o usuário mostrando dados falsos em vez de um estado de erro.

### 2.5 `confirm()` bloqueante — incompatível com PWA
**Arquivos:** Todas as páginas com operações de exclusão  
**Problema:** `confirm()` não funciona em modo standalone no iOS Safari. O app PWA fica com deleções impossibilitadas em iOS.

### 2.6 `window.location.reload()` para retry
**Arquivos:**
- `src/app/(dashboard)/estoque/page.tsx`
- `src/app/(dashboard)/previsao/page.tsx`

**Problema:** Recarregar a página inteira como estratégia de "tentar novamente" é UX pobre e perde todo o estado da aplicação.

### 2.7 Sem paginação em nenhuma rota GET
**Arquivos:** Todos os 15+ endpoints GET  
**Problema:** Todos usam `findMany()` sem `take`/`skip`. Com crescimento dos dados, a performance vai degradar progressivamente.

### 2.8 `.env` com credenciais em texto claro
**Arquivo:** `so-cookies-app/.env`  
**Problema:** Senha do banco de produção em texto claro no repositório local. Embora o `.env` esteja no `.gitignore`, ainda é um risco de vazamento.

---

## 🟡 3. Problemas de Qualidade de Código

### 3.1 Uso excessivo de `any`
**Arquivos afetados:** ~25 arquivos  
**Impacto:** Anula todo o benefício do TypeScript. Erros que poderiam ser capturados em tempo de compilação escapam para runtime.

Exemplos representativos:
```typescript
// vendas/page.tsx
const [sales, setSales] = useState<any[]>([])
const [products, setProducts] = useState<any[]>([])
const [channels, setChannels] = useState<any[]>([])

// estoque/page.tsx
const [ingredients, setIngredients] = useState<any[]>([])
const [recipes, setRecipes] = useState<any[]>([])

// pedidos/page.tsx
const [orders, setOrders] = useState<any[]>([])
```

### 3.2 Código duplicado
**Padrões repetidos:**

1. **Sync getAll em `repository.ts`:** O padrão `getAll()` com verificação online → fetch → merge local é repetido para 11 entidades com lógica quase idêntica.

2. **Formulários de itens:** Lógica de `formItems` (adicionar, remover, editar itens) duplicada entre `vendas/page.tsx` e `pedidos/page.tsx`.

3. **`useSales.ts` e `useOrders.ts`:** Hooks praticamente idênticos — poderiam ser um hook genérico `useLocalData<T>`.

4. **Modais de criação/edição:** Cada página implementa seu próprio modal com estados e validação separados.

### 3.3 Componentes muito grandes
| Arquivo | Linhas | Recomendado |
|---------|--------|-------------|
| `repository.ts` | 556 | Quebrar por entidade |
| `sync-service.ts` | 228 | Extrair reconciliação |
| `src/lib/db.ts` | 357 | Quebrar por domínio |
| `pedidos/page.tsx` | ~476 | KanbanBoard + OrderCard + CreateOrderModal |
| `estoque/page.tsx` | ~450 | IngredientTab + PriceTierTab + GeralTab |
| `receitas/page.tsx` | ~350 | RecipeForm + RecipeCard + IngredientSelector |

### 3.4 Falta de memoização
**Problema:** Dados derivados são recalculados em todo render:

```typescript
// vendas/page.tsx
const totalRevenue = sales.reduce(/* ... */)  // recriado a cada render

// estoque/page.tsx
const filtered = ingredients.filter(/* ... */)  // recriado a cada render
const lowStockItems = ingredients.filter(/* ... */)

// caixa/page.tsx
const todayIn = cashFlow.filter(/* ... */)
const todayOut = cashFlow.filter(/* ... */)
const todayBalance = todayIn - todayOut
```

### 3.5 Fetch vs Repository inconsistente
**Problema:** Sem padrão unificado:
- `repository.entidade.getAll()` — em vendas, estoque, etc.
- `fetch("/api/entidade")` direto — em cardapio, receitas, etc.
- Ambos com tratamentos de erro diferentes

### 3.6 Campos nutricionais com bug
**Arquivo:** `src/app/(dashboard)/estoque/page.tsx` (linha ~320)  
```typescript
if (form.caloriesPer100g) {
  payload.caloriesPer100g = form.caloriesPer100g
}
```
**Problema:** `0` é falsy em JavaScript. Se `caloriesPer100g = 0`, o campo não é enviado. Acontece com todos os 4 campos nutricionais.

### 3.7 Divisão por zero potencial
**Arquivo:** `src/app/(dashboard)/previsao/page.tsx`  
```typescript
const custoUnitario = r.totalCost / r.yield  // crash se yield = 0
p.price.toFixed(2)  // crash se price for undefined
```

### 3.8 `parsed_output.txt` e `planilha_data.*` no repo raiz
**Arquivos:** `parsed_output.txt`, `planilha_data.json`, `planilha_data.txt`  
**Problema:** Dados brutos de planilhas Excel no repositório — deveriam estar em `.gitignore` ou removidos.

---

## 📋 4. Problemas de UX/Acessibilidade

### 4.1 Cardápio público — carrinho não funcional
**Arquivo:** `src/app/cardapio/page.tsx`  
- Botão "Finalizar Pedido" **não tem handler** (linha ~84)
- Carrinho não persiste (recarregar perde tudo)
- `catch {}` silencia erros de rede
- Loading state minimalista (só texto "Carregando...")
- Sem empty state quando não há produtos

### 4.2 HTML inválido no Kanban
**Arquivo:** `src/app/(dashboard)/pedidos/page.tsx`  
**Problema:** Botão dentro de botão:
```html
<button> <!-- card clicável -->
  <button> <!-- ação do card -->
```
**Impacto:** HTML inválido, acessibilidade quebrada, eventos de clique conflitantes.

### 4.3 BottomNav sem acesso a todos os módulos
**Arquivo:** `src/components/layout/BottomNav.tsx`  
**Problema:** Apenas 5 itens — módulos importantes (Receitas, Produção, Documentos, Previsão) não aparecem na navegação mobile.

### 4.4 `aria-label` enganoso no BottomNav
**Arquivo:** `src/components/layout/BottomNav.tsx`  
```typescript
{ label: "Vendas", icon: ShoppingBag, href: "/vendas", isCenter: true, ariaLabel: "Nova Venda" }
```
**Problema:** `aria-label="Nova Venda"` não corresponde ao label visual "Vendas".

### 4.5 Focus trap não re-query elementos
**Arquivo:** `src/hooks/useFocusTrap.ts`  
**Problema:** Se o conteúdo do modal muda após mount (ex: estado de loading → formulário), os elementos focáveis não são re-queridos, quebrando a navegação por teclado.

### 4.6 Notificações — badge limitado
**Arquivo:** `src/components/layout/Header.tsx`  
```typescript
unreadCount > 9 ? "9+" : unreadCount
```
**Problema:** Nunca mostra o total real se > 9 notificações.

---

## 🧪 5. Cobertura de Testes

### 5.1 Testes existentes (14 testes — todos passam)
| Suite | Testes | Cobertura |
|-------|--------|-----------|
| `utils.test.ts` | 2 | Função `cn` |
| `db-local.test.ts` | 2 | Export do Dexie |
| `notifications.test.ts` | 1 | Import check |
| `validation.test.ts` | 9 | Schemas Zod |

### 5.2 O que NÃO tem teste
| Categoria | Item | Arquivos |
|-----------|------|----------|
| **API Routes** | 31 endpoints | `src/app/api/**/*` |
| **Hooks** | 4 hooks | `src/hooks/*.ts` |
| **Componentes** | 8 componentes | `src/components/**/*` |
| **Repository** | 140+ funções | `src/lib/repository.ts` |
| **Sync Service** | 8 funções | `src/lib/sync-service.ts` |
| **DB functions** | 50+ funções | `src/lib/db.ts` |
| **Auth** | 2 funções | `src/lib/auth.ts`, `src/lib/api-auth.ts` |
| **Páginas** | 11 páginas | `src/app/**/page.tsx` |
| **Service Worker** | SW handlers | `src/app/sw.ts` |

---

## 🏗️ 6. Problemas de Arquitetura

### 6.1 `xlsx` em devDependencies mas usado em runtime
**Arquivo:** `package.json`  
**Problema:** `xlsx` está em `devDependencies` mas é importado em runtime na página de relatórios (`relatorios/page.tsx`).

### 6.2 `relationMode = "prisma"` sem chaves estrangeiras reais
**Arquivo:** `prisma/schema.prisma`  
**Problema:** O Prisma no modo `prisma` não cria constraints de chave estrangeira no banco. Isso significa que:
- Integridade referencial é apenas no nível da aplicação
- Deletar um registro com dependências pode deixar orphan records
- Migrations não capturam violações de FK

### 6.3 Supabase configurado mas não utilizado
**Arquivos:** `.env.example`  
**Problema:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão no `.env.example` mas não são usados em lugar nenhum. O RLS (Row Level Security) do Supabase não está implementado.

### 6.4 ClearSyncQueue condicional
**Arquivo:** `src/lib/sync-service.ts` (linha 75)  
```typescript
if (pushed.pushed > 0 && pulled.pulled >= 0) {
  await clearSyncQueue()
}
```
**Problema:** Só limpa a fila se push retornou resultados. Se push falha e pull roda, a fila não é limpa e os mesmos changes são re-enviados no próximo sync.

### 6.5 Missing GET handlers individuais
**Rotas sem GET para item individual:**
- `api/channels/[id]`
- `api/price-tiers/[id]`
- `api/delivery-cost/[id]`
- `api/productions/[id]`

### 6.6 Public routes hardcoded no proxy
**Arquivo:** `src/proxy.ts` (linhas 7-15)  
```typescript
const isPublicRoute =
  pathname === "/login" ||
  pathname.startsWith("/cardapio") ||
  pathname.startsWith("/_next/static") ||
  // ... hardcoded list
```
**Problema:** Lista hardcoded que precisa ser mantida manualmente a cada nova rota pública.

---

## ✅ 7. O que funciona bem

1. **Build 100% funcional** — compila sem erros, TypeScript strict mode sem erros
2. **Autenticação NextAuth v5** — JWT, roles (ADMIN/OPERACIONAL/VISUALIZADOR), middleware funcional
3. **Offline-first** — Dexie.js + sync queue + push/pull operacional
4. **PWA completo** — Service Worker (Serwist), precaching, offline page, background sync
5. **Seed real** — Dados reais baseados nas fichas técnicas dos cookies (3 sabores com ingredientes, custos, receitas)
6. **Prisma schema completo** — 17 modelos relacionados, índices adequados
7. **Design System documentado** — `DESIGN.md` com tokens, cores, tipografia, spacing
8. **Dashboard completo** — 11 módulos (caixa, canais, delivery, documentos, estoque, pedidos, previsão, produção, receitas, relatórios, vendas)
9. **Layout responsivo** — Sidebar desktop + BottomNav mobile + Header
10. **Recharts para gráficos** — Dashboard de relatórios com KPIs visuais
11. **Zod validation** — Schemas de validação nos POSTs principais
12. **Testes unitários** — 14 testes passando

---

## 📊 8. Priorização de Correções

### 🔥 Imediato (Segurança & Funcionalidade)
| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 1 | Adicionar handler no botão "Finalizar Pedido" | 2h | Alto |
| 2 | Corrigir RBAC em todas as rotas | 3h | Alto |
| 3 | Validar Zod em todos os PUT/PATCH | 4h | Alto |
| 4 | Trocar `confirm()` por modal customizado | 4h | Alto |
| 5 | Corrigir `catch {}` silencioso com logging | 2h | Alto |
| 6 | Adicionar paginação nas rotas GET | 6h | Médio |

### 📅 Curto prazo (Qualidade)
| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 7 | Substituir `any` por tipos gerados do Prisma | 8h | Alto |
| 8 | Extrair componentes grandes em arquivos menores | 8h | Médio |
| 9 | Unificar fetch vs repository | 4h | Médio |
| 10 | Adicionar `useMemo`/`useCallback` faltantes | 3h | Médio |
| 11 | Adicionar testes para API routes e hooks | 16h | Alto |

### 🔧 Manutenção
| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 12 | Mover `xlsx` para dependencies | 5min | Baixo |
| 13 | Corrigir parsing `0` falsy nos campos nutricionais | 30min | Baixo |
| 14 | Adicionar guard contra divisão por zero | 30min | Médio |
| 15 | Adicionar .gitignore para planilhas exportadas | 5min | Baixo |
| 16 | Criar hook genérico `useLocalData<T>` | 2h | Médio |

---

## 🔗 9. Links Úteis

- **Repositório:** https://github.com/rodriguezmartinsgabriel-hue/so-cookies
- **PR Atual:** (este PR)
- **Design System:** `DESIGN.md`
- **Plano do App:** `PLANO_APP_PEQUENAS_EMPRESAS.md`

---

## 📝 10. Checklist para CodeRabbit

O CodeRabbit deve verificar especificamente:

- [ ] **Segurança:** Roles RBAC em todas as rotas
- [ ] **Validação:** Zod schemas faltando em PUT/PATCH
- [ ] **Tipagem:** Substituição de `any` por tipos concretos
- [ ] **Error Handling:** Tratamento de erros sem `catch {}` vazio
- [ ] **Duplicação:** Refatoração de código duplicado
- [ ] **Performance:** Missing `useMemo`/`useCallback`
- [ ] **UX:** `confirm()` bloqueante
- [ ] **UX:** Botão sem handler no cardápio
- [ ] **UX:** Dados mock enganosos no dashboard
- [ ] **Arquitetura:** Paginação, sync transactions, xlsx dependency
