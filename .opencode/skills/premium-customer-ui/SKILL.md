---
name: premium-customer-ui
description: Use when building or redesigning the customer-facing UI (cardápio, carrinho, perfil, pedido, pagamento, auth) to apply the premium design language of the perfil redesign. Trigger on keywords: premium, cardápio, carrinho, perfil, hero, accent-tint, section card, eyebrow, redesign cliente, padronizar, deixar bonito, UI do cliente. Also use when creating customer components that must match ProfileHero/ProfileInfoCard/LoyaltySection.
---

# Premium Customer UI — Só Cookies & Café

> Linguagem de design "premium" criada no redesign da página `/perfil`.
> Componentes canônicos (fonte da verdade): `src/components/customer/ProfileHero.tsx`,
> `ProfileInfoCard.tsx`, `ProfileInfoRow.tsx`, `ProfilePointsCard.tsx`,
> `ProfileSkeleton.tsx`, `ProfileSignOut.tsx`, `LoyaltySection.tsx`, e os genéricos
> `SectionCard.tsx` e `PageHeader.tsx`. Consultar esses arquivos antes de implementar.

---

## Princípios

1. **Superfície glass forte no topo** — hero e cards principais usam `GlassSurface tone="strong" rounded-2xl`; detalhes internos usam tints (`bg-paper/60`, `bg-accent/5`).
2. **Hierarquia tipográfica premium** — títulos/display usam `var(--font-ui)` (Space Grotesk); corpo sempre `var(--font-body)` (Inter). Máximo 2 níveis de heading por página.
3. **Eyebrow em tudo** — micro-label `text-[10px] uppercase tracking-[0.08em] text-muted` (ou `text-accent` para destaque) acima de títulos de seção.
4. **Accent azul `#0078d3`** — usado em **tints** (`bg-accent/5–15`, `border-accent/20–30`, `text-accent`) de forma coerente; em intensidade plena apenas no CTA primário (1x por tela).
5. **Listas longas são CSS-driven** — animação por CSS (`.stagger`, `grid-rows 0fr→1fr`), nunca `motion.div` por item em listas com muitos elementos (jank em celular). Motion/framer-motion só para micro-interações e transições de estado.
6. **Acessibilidade primeiro** — contraste 4.5:1, alvos ≥44px, `prefers-reduced-motion` respeitado, haptic como reforço (nunca único feedback).

## Tokens relevantes

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-ui` | Space Grotesk | Títulos display, hero, nome do usuário |
| `--font-body` | Inter | Corpo, labels |
| `--accent` | `#0078d3` (dark `#4aa3e8`) | Tints, badges, CTA primário |
| `rounded-2xl` | 16px | Superfícies premium (hero, section cards, cards de item) |
| `rounded-xl` | 12px | Elementos internos (stat cards, avatares de item) |
| `rounded-lg` | 8px | Detalhes pequenos (mini-stats, pills internas) |
| `border-line/40` | — | Divisórias de header de seção |
| `border-line/30` | — | Divisórias de corpo (`divide-y`) |

Motion: fades `0.18–0.25s` (y pequeno), springs `stiffness 400 damping 20` (números/badges), entrada de página com `AnimatePresence mode="wait"` + `containerVariants/itemVariants` (stagger `0.06`, item `y:12`). Respeitar `useReducedMotion`.

## Receitas por seção

### Perfil (canônico)
- `ProfileHero`: hero glass + avatar com gradiente `from-accent to-accent/70`, `ring-2 ring-paper/60`, badge de status; nome display; `ProfilePointsCard` embutido.
- `ProfileInfoCard` → hoje `SectionCard` (genérico). Header: ícone `w-9 h-9 rounded-xl bg-accent/10 text-accent`, eyebrow uppercase, título; ação ghost/secondary.
- `ProfileInfoRow`: linha label/valor `px-5 py-3.5`, valor `text-muted truncate max-w-[60%]`, "Não informado" italic.
- `ProfilePointsCard`: accent-tint `rounded-xl bg-accent/5 border border-accent/20`, saldo `text-3xl font-bold text-accent tabular-nums`, mini-stats `bg-paper/60 border border-line/50`.
- `ProfileSkeleton`: espelha hero + cards com `GlassSurface tone="strong" rounded-2xl` + `Skeleton`.
- `ProfileSignOut`: confirmação inline com `AnimatePresence mode="wait"`, tint danger `border-danger/30 bg-danger/5`.

### Cardápio
- `MenuHero`: `GlassSurface tone="strong" rounded-2xl p-5`, eyebrow "Cardápio", título display, subtítulo (ex: "Escolha seus cookies — retirada na loja"), **busca embutida** com ícone Search + clear; mostrar contagem de resultados quando houver busca.
- Categorias: **pills sticky** `rounded-full bg-paper/90 backdrop-blur border border-line/40 px-4 py-2 text-[10px] uppercase tracking-[0.08em]`, com contagem opcional.
- `ProductCard`: `Card rounded-2xl`; micro-feedback via CSS `active:scale-[0.99]` + haptic no stepper; **não** usar motion por item na lista.
- `MenuSkeleton`: espelha hero + cards.

### Carrinho
- `PageHeader`: eyebrow + título display + subtítulo (ex: "Revise seu pedido antes de finalizar").
- Itens: `Card rounded-2xl`, `AnimatePresence mode="popLayout"` + `layout="position"` (lista curta — motion permitido aqui), springs no número do stepper.
- Passo 2: toggle/slots com `rounded-2xl`, ativo `border-ink bg-ink text-paper`.
- Passo 3: seções com `SectionCard` (Resumo/Entrega/Cupom); total em destaque `text-lg font-bold`.
- `CheckoutStepper`: pills `rounded-full`, estados success/ink/cream, transição suave.
- `StickyBottomCTA`, `LoyaltyPreview`, `OrderConfirmDialog`: já premium — manter.

## Anti-padrões

- ❌ `motion.div` por item em listas longas (cardápio) — use CSS.
- ❌ `backdrop-filter`/`-apple-visual-effect` inline — sempre pelas primitivas.
- ❌ Cor hex hardcoded em JSX — sempre tokens (`bg-accent/10`, `text-muted`, ...).
- ❌ Accent em intensidade plena em texto corrido ou múltiplos CTAs — só o CTA primário.
- ❌ Font display em corpo de texto — Space Grotesk só em títulos.
- ❌ Radius inconsistente (misturar `rounded` default com `rounded-2xl` na mesma superfície).
- ❌ Alterar lógica de negócio durante um "restyle premium" — separar visual de comportamento.

## Checklist de qualidade (antes de considerar pronto)

- [ ] Contraste AA (4.5:1 texto, 3:1 não-texto) em claro e escuro
- [ ] Alvos tocáveis ≥44×44px, 8px entre adjacentes
- [ ] `prefers-reduced-motion` respeitado
- [ ] Estados: loading (skeleton espelhado), empty, error cobertos
- [ ] `aria-label` em botões de ícone; headings em ordem; um `h1` por página
- [ ] Accent azul; nenhum hex hardcoded
- [ ] Testes dos componentes novos + verdes
