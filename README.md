# Só Cookies & Café — App de Gestão e Loja Online

Plataforma completa para gestão de uma confeitaria artesanal. App Next.js com área administrativa (dashboard) e loja online para clientes.

## Stack

- **Framework**: [Next.js 16](https://nextjs.org) (Turbopack, React 19, App Router)
- **UI**: [Tailwind CSS v4](https://tailwindcss.com) — Liquid Glass design system com dark mode
- **Banco de Dados**: [Prisma 7](https://prisma.io) + PostgreSQL via Supabase
- **Autenticação**: [NextAuth v5](https://authjs.dev) (Beta) para staff + JWT customizado para clientes
- **PWA**: [Serwist](https://serwist.pages.dev) — service worker para offline-first
- **Deploy**: [Vercel](https://vercel.com) com CI/CD via GitHub Actions

## Arquitetura

```
src/
├── app/
│   ├── (auth)/          # Login (staff)
│   ├── (dashboard)/     # Painel de gestão (15 módulos)
│   ├── api/             # REST API (60+ rotas)
│   ├── entrar/          # Login de cliente
│   ├── cadastro/        # Cadastro de cliente
│   ├── cardapio/        # Cardápio (cliente)
│   ├── carrinho/        # Carrinho (cliente)
│   ├── pedido/[id]/     # Detalhes do pedido (cliente)
│   ├── perfil/          # Perfil do cliente
│   └── page.tsx         # Dashboard home (módulos)
├── components/
│   ├── layout/          # AppShell, Header, Sidebar, BottomNav
│   ├── customer/        # CustomerShell, GoogleLoginButton
│   └── ui/              # Primitivas: Button, Card, Modal, Table, Toast, etc.
├── hooks/               # useCart, usePricing, useFocusTrap, useRole, etc.
├── lib/                 # Prisma, auth, repository, sync-service, customer-auth
└── generated/prisma/    # Prisma Client gerado

pricing/                 # Pricing Engine v2 (subpackage)
```

## Domínios em Produção

| Host | Função | URL |
|------|--------|-----|
| `cookiesecafes.com` | Loja (cliente) | Cardápio, carrinho, pedidos, perfil |
| `app.cookiesecafes.com` | Gestão (staff) | Dashboard, vendas, pedidos, produção, relatórios |

Ambos são aliases de deploys Vercel com deploy automático via push em `master`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `\npm run dev` | Iniciar servidor de desenvolvimento |
| `\npm run build` | Build de produção (prisma generate + next build) |
| `\npm run start` | Iniciar servidor de produção |
| `\npm run lint` | ESLint |
| `\npm run typecheck` | TypeScript type check |
| `\npm run format` | Prettier |
| `\npm run clean` | Limpar cache e build artifacts |
| `\npm run analyze` | Bundle analyzer |
| `\npm run test` | Vitest (run once) |
| `\npm run test:watch` | Vitest (watch mode) |
| `\npm run db:migrate` | Aplicar migrations pendentes |
| `\npm run db:seed` | Popular banco com dados de desenvolvimento |

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha. Todas as variáves secretas são gerenciadas no dashboard da Vercel:

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | Conexão Prisma pooling (Supabase pgbouncer) | Sim |
| `DIRECT_DATABASE_URL` | Conexão direta (sem pooler, para migrations) | Sim |
| `\NEXTAUTH_SECRET` | Secret do NextAuth (min 32 chars, aleatório) | Sim |
| `\NEXTAUTH_URL` | URL base do app | Sim |
| `AUTH_TRUST_HOST` | Confiar host do ambiente de deploy | Produção |
| `\INTEGRATION_KEY` | Chave para criptografar credentais de integração (iFood/99Food) | Se usar integrações |
| `GOOGLE_CLIENT_ID` | OAuth do Google Cloud (login de cliente) | Se Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Secret do Google Cloud | Se Google OAuth |
| `\CUSTOMER_AUTH_SECRET` | JWT signing secret para clientes | Sim |
| `\SUPABASE_URL` / `\SUPABASE_SERVICE_ROLE_KEY` | Supabase (opcional para RLS) | Não |
| `STORE_HOST` | Domínio da loja (ex: `cookiesecafes.com.io`) | Sim |
| `STAFF_HOST` | Domínio do app de gestão (ex: `app.cookiesecafes.com`) | Sim |
| `\ANALYZE` | Ativar bundle analyzer (`npm run analyze`) | Não |

## Área Administrativa (Manager)

Após login com `admin@socookies.com`, 15 módulos disponíveis:

| Módulo | Rota | Readme Summary |
|--------|------|----------------|
| Home | `/` | KPIs, módulos |
| Usuários | `/usuarios` | Gestão de usuários admin/operacional/visualizador |
| Produtos | `/produtos` | Catálogo de produtos, preços por unidade, margem |
| Estoque | `/estoque` | ingredientes, estoque, fornecedores |
| Receitas | `/receitas` | fichas técnicas com cálculo de custo |
| Vendas | `/vendas` | Registro de vendas por canal |
| Pedidos | `/pedidos` | Kanban + lista de pedidos |
| Caixa | `/caixa` | Entradas e saídas de caixa |
| Produção | `/producao` | Lotes de produção diários |
| Delivery | `/delivery` | Zonas, Rotas, Terças/Sexta, bloqueios |
| Relatórios | `/relatorios` | Relatórios financeiros e de produção |
| Indicadores | `/indicadores` | KPIs de vendas e produção |
| Canais | `/canaos` | Canais de venda (WhatsApp, iFood, etc.) |
| Contatos | `/contatos` | CRM de contatos e interações |
| Documentos | `/documentos` | Documentos internos |
| Integrações | `/integracoes` | iFood e 99Food webhook |

## Área do Cliente (Store)

Fluxo de compra do cliente final:

1. **Entrar** `/entrar` — Login com e-mail e senha OU Google
2. **Cadastro** `/cadastro` — Registro de novo cliente
3. **Cardápio** `/cardapio` — Catálogo de produtos com fotos e preços
4. **Carrinho** `/carrinho` — Items seleertados + preços + escolha de entrega/retirada
5. **Pedido** `/pedido/[id]` — Detalhes do pedido com status em tempo real
6. **Perfil** `/perfil` — Editar dados pessoais

## Pricing Engine v2

Módulo `pricing/` com arquitetura pipeline de cálculo de preços:

- **Fases**: BASE, ITEM, ORDER, CUSTOMER, PAYMENT, SHIPPING, POST_PROCESSING
- **Rules**: PriceTierRule, PricingRule, ShippingRule
- **Actions**: Discount, Cashback, Tax, Bonus, Shipping, Log, Warning
- **Components**: Pipeline, Executor, Reducer, Validator, DataLoader, Cache, Audit

## Migrations do Banco

```bash
# Verificar status
npm run db:migrate

# Aplicar migrations pendentes (produção)
DATABASE_URL="sua-url" npx prisma migrate deploy

# Gerar nova migration
npx prisma migrate dev --name nome_da_migration
```

## CI/CD

GitHub Actions em `.github/workflows/ci.yml`:

1. **Lint & Test** — ESLint + typecheck + vitest
2. **Build** — `npm run build` com cache
3. **Deploy** — Push automático do repo pai via Vercel (submodule)

## Acessibilidade (WCAG AA)

- Páginas de erro customizadas (`error.tsx`, `not-found.tsx`)
- Focus trap em todos os modais (Escape para fechar)
- `scope="col"` em cabeçalhos de tabela
- `type="button"` em botões inline de tabela
- `htmlFor`/`id` em pairs `<label>`/`<select>`
- Touch targets ≥ 44ငx44ငx em botões com `aria-label`
- Contraste `--muted` ≥ 7.74:1 em light mode
- `color-scheme: light dark` para formular
- `prefers-reduced-motion` respeitado

## Segurança

- Sanitização de `.env` files (`git ls-files` confirmado `no .env*` commithas)
- Hashing de senhas bcryptjs (staff de clientes)
- NextAuth v5 JWT com cookies `httpOnly`
- CORS configurado em `/api/*` via `vercel.json`
- Permissions Policy para câmera/microfone/geolocation desabilitado
- Rate Limiting em rotas de login/register via `rate-limit.ts`
- Integrações protegidas com assinaturas HMAC (iFood, 99Food)

## Testes

```bash
npm test        # vitest run (242 tests)
npm run test    # vitest watch
```

- **242 tests — todos passando**
- Testes unitários em `src/lib/__tests__/`, `src/lib/integrations/__tests__/`
- Pricing engine tests em `pricing/__tests__/`

## Origem

Feito por Só Cookies & Café, 2024-2026.