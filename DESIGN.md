# Só Design System

> Design system do app **Só — Cookies & Cafés**.
> Inspirado em: Apple HIG · Material Design 3 · Uber Base · Laws of UX · NN/g Nielsen Norman Group.

---

## 1. Design Philosophy

### 1.1 Human-Centered Design (Don Norman)

Quatro princípios fundamentais:

1. **Understand and Address the Core Problems** — resolva a causa raiz, não o sintoma.
2. **Be People-Centered** — design para as capacidades e necessidades reais do usuário.
3. **Use an Activity-Centered Systems Approach** — olhe para a atividade completa, não para componentes isolados.
4. **Use Rapid Iterations of Prototyping and Testing** — prototipe rápido, teste cedo, itere.

### 1.2 Brand Soul

**Só** é a ferramenta que o pequeno empresário brasileiro usa para gerenciar seu negócio com dignidade e profissionalismo. A marca comunica:

- **Simplicidade** — o app resolve o problema, não cria novos
- **Competência** — parece sério, confiável, profissional
- **Calor humano** — não é frio, mas também não é enfeitado

### 1.3 Design Principles

| # | Princípio | Descrição |
|---|-----------|-----------|
| 1 | **Conteúdo é a interface** | Decoração não substitui informação clara |
| 2 | **Menos é mais** | Cada elemento deve justificar sua existência |
| 3 | **Clareza > criatividade** | O usuário nunca deve precisar "entender" o design |
| 4 | **Consistência over tudo** | Um padrão, um lugar, sempre |
| 5 | **Toque humano** | Acolhedor sem ser piegas, profissional sem ser frio |
| 6 | **Mobile-first** | O dono do negócio usa o app no celular entre um atendimento e outro |

---

## 2. UX Principles

### 2.1 10 Heurísticas de Nielsen (Jakob Nielsen)

Aplicadas ao contexto do app Só:

| # | Heurística | Como se aplica ao Só |
|---|------------|----------------------|
| 1 | **Visibility of System Status** | Feedback imediato ao salvar estoque, atualizar cardápio, criar produto |
| 2 | **Match Between System and Real World** | "Estoque", "Cardápio", "Produto" — linguagem do dono da cafeteria |
| 3 | **User Control and Freedom** | Botão "voltar", desfazer alteração de estoque, sair sem salvar |
| 4 | **Consistency and Standards** | Mesmo padrão de botão, card, formulário em todo o app |
| 5 | **Error Prevention** | Confirmar antes de excluir, validar campos antes de enviar |
| 6 | **Recognition Rather than Recall** | Mostrar os produtos com foto e nome — não obrigar o usuário a decorar códigos |
| 7 | **Flexibility and Efficiency of Use** | Atalho de edição inline no estoque, busca rápida |
| 8 | **Aesthetic and Minimalist Design** | Cada informação irrelevante compete com a relevante — remova o que não ajuda |
| 9 | **Help Users Recognize, Diagnose, and Recover from Errors** | "Não foi possível salvar. Verifique sua conexão e tente novamente." — nunca "Erro 500" |
| 10 | **Help and Documentation** | Tooltips, hints nos campos, empty states que ensinam |

### 2.2 8 Golden Rules (Shneiderman)

1. Strive for consistency
2. Seek universal usability
3. Offer informative feedback
4. Design dialogs to yield closure
5. Prevent errors
6. Permit easy reversal of actions
7. Keep users in control
8. Reduce short-term memory load

### 2.3 6 Princípios de Interação (Don Norman)

1. **Affordances** — um botão deve parecer clicável, um card deve parecer tocável
2. **Signifiers** — use ícones, labels, cores para indicar o que fazer
3. **Constraints** — desabilite o que não é válido, mostre só o que é possível
4. **Mappings** — botão de "novo produto" no topo da lista, não no rodapé
5. **Feedback** — toda ação tem reação visual imediata
6. **Conceptual Models** — o modelo mental do usuário sobre "estoque" deve bater com a realidade do app

### 2.4 Laws of UX (Jon Yablonski)

| Lei | Significado prático |
|-----|---------------------|
| **Fitts's Law** | Botões de ação primária (salvar, criar) devem ser grandes e próximos |
| **Hick's Law** | Menos opções por vez = decisão mais rápida |
| **Jakob's Law** | Siga convenções que o usuário já conhece de outros apps |
| **Law of Proximity** | Elementos relacionados ficam perto; elementos diferentes, longe |
| **Aesthetic-Usability Effect** | Design bonito é percebido como mais fácil de usar |
| **Tesler's Law** | Alguma complexidade é inerente — não a esconda, simplifique-a |

---

## 3. Visual Language

### 3.1 Color System

Paleta reduzida e funcional, no estilo Apple/Uber: tons neutros dominam, cor de destaque é usada com moderação.

#### Neutral Palette (fundação)

| Token | Value | Uso |
|-------|-------|-----|
| `paper` | `#FFFFFF` | Fundo de cards, modais, sidebar |
| `cream` | `#F5F3F0` | Fundo de página |
| `line` | `#E2E0DC` | Bordas, separadores |
| `kraft` | `#C4C0BA` | Ícones secundários, bordas disabled |
| `muted` | `#8B8782` | Texto secundário, placeholders |
| `ink` | `#1A1816` | Texto principal, títulos |

#### Accent Palette (uso econômico)

O app cliente usa o accent **azul** (`#0078d3`). O tom copper do DESIGN original foi substituído para alinhar a identidade visual do app de clientes.

| Token | Value | Uso |
|-------|-------|-----|
| `accent` | `#0078d3` (blue-600) | Botão primário, link, badge ativo |
| `accent-hover` | `#0A63B0` (dark `#4aa3e8`) | Hover do accent |
| `accent-subtle` | `#E3F0FB` (blue-100) | Fundo de badge, seleção |

> **Regra premium (redesign do perfil):** accent em **intensidade plena** no máximo uma vez por tela (o CTA primário). **Tints de accent** (`bg-accent/5–15`, `border-accent/20–30`, `text-accent`) são permitidos de forma coerente como superfície de destaque (hero de pontos, section cards, badges).

#### Semantic Palette

| Token | Value | Uso |
|-------|-------|-----|
| `success` | `#2F7A3E` | Em estoque, operação concluída |
| `success-subtle` | `#E8F5E9` | Fundo de badge "em estoque" |
| `danger` | `#C23B2E` | Erro, estoque crítico, excluir |
| `danger-subtle` | `#FDEAEA` | Fundo de badge "fora de estoque" |
| `warning` | `#E0A400` | Estoque baixo |
| `warning-subtle` | `#FFF8E1` | Fundo de badge "estoque baixo" |
| `info` | `#2E5EAA` | Informação, dica, tutorial |
| `info-subtle` | `#EBF0FA` | Fundo de badge informativo |

#### Regras de uso

- Texto **sempre** em `ink` sobre fundo claro, ou `paper` sobre fundo escuro
- `accent` pleno aparece **no máximo uma vez por tela** (botão CTA primário); tints (`bg-accent/5–15`, `border-accent/20–30`) são o padrão premium para superfícies de destaque
- Cores semânticas só em badges, tags, e indicadores — nunca em texto corrido
- Nunca usar cor como única forma de transmitir informação (acessibilidade)

#### Dark Mode

Implementado via classe `.dark` no `<html>` (next-themes, toggle no Header). Tokens espelhados em `src/app/globals.css`:

| Token | Claro | Escuro |
|-------|-------|--------|
| `ink` | `#111111` | `#EDE9E2` |
| `paper` | `#FFFFFF` | `#1A1816` |
| `cream` | `#F7F3EC` | `#23201D` |
| `kraft` | `#D8CFBE` | `#3A3631` |
| `muted` | `#6B6B6B` | `#A6A099` |
| `line` | `#E4E0D6` | `#35312C` |

Regra de ouro: **nunca usar cor hex hardcoded** — sempre os tokens `--color-*` (via Tailwind `bg-paper`, `text-ink`, etc.), que invertem automaticamente entre os temas.

#### Material Glass (Liquid Glass)

O app usa material "Liquid Glass" como superfície padrão. Tokens em `globals.css`:

- `--glass-blur: 24px` (desfoque do vidro)
- `--glass-tint` / `--glass-tint-strong` (tint translúcida, claro e escuro)
- `--glass-border`, `--glass-highlight` (specular), `--glass-shadow`
- iOS 26+: `-apple-visual-effect: auto`; fallback `backdrop-filter: blur() saturate()`.
- Fundo ambiente via `--ambient` (radiais sutis de `accent` e `info` no `body`).

**Sempre** aplicar o vidro pelas primitivas (`GlassSurface`, `Card`, `Modal`, shells de layout) — nunca `backdrop-filter` inline.

### 3.2 Typography

#### Font Stack

| Uso | Font | Fallback |
|-----|------|----------|
| UI / corpo | **Inter** (300, 400, 500, 600) | `system-ui, sans-serif` |
| Display / títulos | **Space Grotesk** (500, 600, 700) | `sans-serif` |

> Caveat foi removido. A marca usa Space Grotesk para títulos e Inter para corpo.

#### Type Scale

| Nível | Size | Line Height | Weight | Font |
|-------|------|-------------|--------|------|
| `display` | 2rem (32px) | 1.2 | 700 | Space Grotesk |
| `h1` | 1.5rem (24px) | 1.3 | 600 | Space Grotesk |
| `h2` | 1.25rem (20px) | 1.3 | 600 | Space Grotesk |
| `h3` | 1.125rem (18px) | 1.4 | 600 | Inter |
| `body` | 0.9375rem (15px) | 1.5 | 400 | Inter |
| `body-sm` | 0.8125rem (13px) | 1.5 | 400 | Inter |
| `caption` | 0.75rem (12px) | 1.4 | 400 | Inter |
| `label` | 0.8125rem (13px) | 1.4 | 500 | Inter |

#### Regras

- Máximo 2 níveis de heading por página
- Body nunca abaixo de 15px em mobile (para evitar zoom no iOS)
- Caption só para metadados (datas, badges)
- `text-balance` para headings multi-linha
- **Premium (redesign do perfil):** títulos de página/hero usam `var(--font-ui)` (Space Grotesk) via `fontFamily: "var(--font-ui)"`; eyebrows de seção usam `text-[10px] uppercase tracking-[0.08em]`

### 3.3 Spacing (4px Grid)

Escala baseada em 4px (padrão Uber/Apple):

| Token | px | Uso comum |
|-------|----|-----------|
| `space-0` | 0 | — |
| `space-1` | 4px | Ícone interno, gap mínimo |
| `space-2` | 8px | Padding interno de cards |
| `space-3` | 12px | Gap entre elementos relacionados |
| `space-4` | 16px | Padding de página, gap entre seções |
| `space-5` | 20px | Gap entre grupos |
| `space-6` | 24px | Padding de container, margem de seção |
| `space-8` | 32px | Seções maiores |
| `space-10` | 40px | Espaço entre cards |
| `space-12` | 48px | Margem de página |
| `space-16` | 64px | Quebra visual grande |
| `space-20` | 80px | Seções completas |
| `space-24` | 96px | Topo de página (hero) |

### 3.4 Border Radius

| Token | Value | Uso |
|-------|-------|-----|
| `radius-sm` | 4px | Inputs, botões pequenos, badges |
| `radius-md` | 8px | Cards, modais, botões médios |
| `radius-lg` | 12px | Cards grandes, modais full-screen |
| `radius-2xl` | 16px | **Superfícies premium** (hero, section cards, cards de item do cliente) |
| `radius-full` | 9999px | Avatars, pills, tags |

### 3.5 Shadows

| Token | Value | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Cards no fundo cream |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | Cards flutuantes, modais |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.08)` | Modal, dropdown |
| `shadow-xl` | `0 12px 40px rgba(0,0,0,0.10)` | Toast, FAB |

### 3.6 Motion

#### Easing

| Token | Value | Uso |
|-------|-------|-----|
| `ease-productive` | `cubic-bezier(0.16, 1, 0.3, 1)` | Ações do usuário (click, hover) |
| `ease-expressive` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transições de página, modais |

#### Duration

| Token | ms | Uso |
|-------|----|-----|
| `duration-fast` | 150ms | Hover, active, feedback imediato |
| `duration-normal` | 250ms | Transições de estado, toast |
| `duration-slow` | 350ms | Modal, slide-up, page transition |

#### Patterns

- **Produtivo** (150ms, ease-productive): hover, focus, active, press, badge change
- **Expressivo** (300ms, ease-expressive): modal entrar/sair, página mudar, skeleton
- **Stagger**: lista de itens com delay incremental de 50ms entre cada item
- **prefers-reduced-motion**: respeitar `@media (prefers-reduced-motion: reduce)` — desativar animações, manter transições instantâneas

### 3.7 Customer Premium Language

> Linguagem premium criada no redesign de `/perfil`, replicada no cardápio e no carrinho.
> Componentes canônicos: `ProfileHero`, `SectionCard` (ex-`ProfileInfoCard`),
> `ProfileInfoRow`, `ProfilePointsCard`, `ProfileSkeleton`, `ProfileSignOut`,
> `LoyaltySection`, `MenuHero`, `PageHeader`.

Padrões:

1. **Hero glass forte** — `GlassSurface tone="strong" rounded-2xl p-5` no topo das páginas, com eyebrow + título display + subtítulo.
2. **Section card** — header com ícone `w-9 h-9 rounded-xl bg-accent/10 text-accent`, eyebrow uppercase `tracking-[0.08em]`, título `text-base font-semibold`, divisor `border-b border-line/40`; corpo `divide-y divide-line/30`.
3. **Accent-tint card** — `rounded-2xl border border-accent/30 bg-accent/5` para superfícies de destaque (pontos, loyalty, prêmios).
4. **Micro-stats** — `rounded-lg bg-paper/60 border border-line/50`, valor `text-xl font-bold`, label `text-[10px] uppercase tracking-wide text-muted`.
5. **Skeleton espelhado** — skeleton reflete o layout final (hero + cards) via `GlassSurface tone="strong" rounded-2xl`.
6. **Motion** — entrada de página com stagger (`0.06`, item `y:12`); fades `0.18–0.25s`; springs `stiffness 400 damping 20` em números/badges; listas longas CSS-driven.
7. **Haptic** — `haptic.tap()`/`selection()`/`success()` como reforço em interações.

Regra de performance: **nunca** `motion.div` por item em listas longas (cardápio); usar CSS `.stagger` e transições de grid.

---

## 4. Design Tokens (W3C DTCG Format)

```json
{
  "so": {
    "color": {
      "neutral": {
        "paper": { "value": "#FFFFFF" },
        "cream": { "value": "#F5F3F0" },
        "line": { "value": "#E2E0DC" },
        "kraft": { "value": "#C4C0BA" },
        "muted": { "value": "#8B8782" },
        "ink": { "value": "#1A1816" }
      },
      "accent": {
        "default": { "value": "#0078d3" },
        "hover": { "value": "#0A63B0" },
        "subtle": { "value": "#E3F0FB" }
      },
      "semantic": {
        "success": { "value": "#2F7A3E" },
        "danger": { "value": "#C23B2E" },
        "warning": { "value": "#E0A400" },
        "info": { "value": "#2E5EAA" }
      }
    },
    "typography": {
      "fontFamily": {
        "ui": { "value": "Inter" },
        "display": { "value": "Space Grotesk" }
      },
      "typeScale": {
        "display": { "value": { "fontSize": "2rem", "lineHeight": 1.2, "fontWeight": 700 } },
        "h1": { "value": { "fontSize": "1.5rem", "lineHeight": 1.3, "fontWeight": 600 } },
        "h2": { "value": { "fontSize": "1.25rem", "lineHeight": 1.3, "fontWeight": 600 } },
        "h3": { "value": { "fontSize": "1.125rem", "lineHeight": 1.4, "fontWeight": 600 } },
        "body": { "value": { "fontSize": "0.9375rem", "lineHeight": 1.5, "fontWeight": 400 } },
        "body-sm": { "value": { "fontSize": "0.8125rem", "lineHeight": 1.5, "fontWeight": 400 } },
        "caption": { "value": { "fontSize": "0.75rem", "lineHeight": 1.4, "fontWeight": 400 } },
        "label": { "value": { "fontSize": "0.8125rem", "lineHeight": 1.4, "fontWeight": 500 } }
      }
    },
    "spacing": {
      "0": { "value": "0" },
      "1": { "value": "4px" },
      "2": { "value": "8px" },
      "3": { "value": "12px" },
      "4": { "value": "16px" },
      "5": { "value": "20px" },
      "6": { "value": "24px" },
      "8": { "value": "32px" },
      "10": { "value": "40px" },
      "12": { "value": "48px" },
      "16": { "value": "64px" },
      "20": { "value": "80px" },
      "24": { "value": "96px" }
    },
    "borderRadius": {
      "sm": { "value": "4px" },
      "md": { "value": "8px" },
      "lg": { "value": "12px" },
      "2xl": { "value": "16px" },
      "full": { "value": "9999px" }
    },
    "shadow": {
      "sm": { "value": "0 1px 2px rgba(0,0,0,0.04)" },
      "md": { "value": "0 4px 12px rgba(0,0,0,0.06)" },
      "lg": { "value": "0 8px 24px rgba(0,0,0,0.08)" },
      "xl": { "value": "0 12px 40px rgba(0,0,0,0.10)" }
    },
    "motion": {
      "duration": {
        "fast": { "value": "150ms" },
        "normal": { "value": "250ms" },
        "slow": { "value": "350ms" }
      },
      "easing": {
        "productive": { "value": "cubic-bezier(0.16, 1, 0.3, 1)" },
        "expressive": { "value": "cubic-bezier(0.65, 0, 0.35, 1)" }
      }
    }
  }
}
```

---

## 5. Component Architecture — Atomic Design

### 5.1 Átomos

| Componente | Descrição |
|------------|-----------|
| `Button` | Primary, secondary, ghost, danger. 3 tamanhos (sm, md, lg) |
| `Input` | Text, number, select, textarea. Label + helper + error |
| `Badge` | Em estoque, baixo, crítico, inativo |
| `Avatar` | Foto do produto, iniciais |
| `Icon` | lucide-react. Tamanhos: 16px (inline), 20px (ui), 24px (nav) |
| `Tag` | Categoria, filtro, atributo |

### 5.2 Moléculas

| Componente | Composto de |
|------------|-------------|
| `SearchBar` | Input + Icon + clear button |
| `Card` | Imagem + heading + body + footer |
| `FormField` | Label + Input + Helper/Error |
| `StatsGroup` | 3-4 StatCards lado a lado |
| `ProductRow` | Avatar + name + price + stock badge + actions |

### 5.3 Organismos

| Componente | Descrição |
|------------|-----------|
| `Sidebar` | Navegação desktop com links + brand + footer |
| `BottomNav` | Navegação mobile com 3-5 itens + active state |
| `ProductGrid` | Grid responsivo de ProdutoCards |
| `EstoqueList` | Lista de ProductRows com busca + filtro |
| `Modal` | Overlay + container + close + heading + body |
| `ToastProvider` | Contexto + renderer de notificações |
| `EmptyState` | Ilustração + heading + texto + CTA |

### 5.4 Templates

| Template | Descrição |
|----------|-----------|
| `AppLayout` | Sidebar (desktop) + BottomNav (mobile) + main content |

### 5.5 Páginas

| Página | Organismos usados |
|--------|-------------------|
| `/` (Cardápio) | ProductGrid, CategorySection, Hero (futuro) |
| `/estoque` | SearchBar, EstoqueList, StatsGroup, Modal (ProdutoForm) |

---

## 6. States & Behaviors

### 6.1 Loading

- **Skeleton**: shimmer animado com cantos arredondados, sem texto
- **Duration**: mostrar skeleton se loading > 200ms; se < 200ms, não mostrar nada (evitar flash)
- **Layout**: skeleton deve espelhar o layout final (altura, largura, proporções)

### 6.2 Empty State

Toda lista vazia deve ter:
1. Ícone ou ilustração simples (24-32px, cor muted)
2. Heading: "Nenhum produto encontrado"
3. Texto explicativo: "Tente alterar os filtros ou adicionar um novo produto"
4. CTA: botão "Adicionar produto"

### 6.3 Error State

- **Toast de erro**: slide-in-right, auto-dismiss após 5s
- **Inline error**: abaixo do campo, cor danger, ícone de alerta
- **Página de erro**: heading + descrição + botão "Tentar novamente"

### 6.4 Edge Cases

| Caso | Comportamento |
|------|---------------|
| Produto com estoque 0 | Badge "Fora de estoque" (danger), card com opacidade reduzida |
| Produto sem imagem | Avatar com iniciais + cor de fundo pastel |
| Rede off-line | Toast "Você está off-line" + operações enfileiradas |
| Muitos produtos (>50) | Paginação ou infinite scroll com intersection observer |
| Nome muito longo | Truncar com ellipsis após 2 linhas |

---

## 7. Interaction Design

### 7.1 Micro-interações

| Elemento | Comportamento |
|----------|---------------|
| **Button hover** | Opacidade 0.9 + transição 150ms |
| **Button active/press** | Scale 0.97 + transição 100ms |
| **Card hover** | shadow-md → shadow-lg, 200ms |
| **Input focus** | Ring 2px solid accent + outline none |
| **Toast appear** | slide-in-right, 300ms ease-expressive |
| **Toast dismiss** | Opacity 0 + translateX(20px), 200ms |
| **Badge change** | scale-in animação, 200ms |
| **Modal open** | Overlay fade-in 200ms + modal scale-in 300ms |
| **Modal close** | Overlay fade-out 150ms + modal scale-out 150ms |

### 7.2 Navigation

- **Mobile**: BottomNav fixo, transição de página com fade-in-up
- **Desktop**: Sidebar fixa, conteúdo com fade-in
- **Active state**: cor accent + ícone preenchido
- **Back button**: presente em páginas aninhadas (ex: dentro do estoque)

### 7.3 Feedback

| Ação | Feedback |
|------|----------|
| Salvar produto | Toast "Produto salvo" (success, auto-dismiss 3s) |
| Excluir produto | Modal de confirmação + toast "Produto excluído" |
| Erro de rede | Toast "Sem conexão. Alterações salvas localmente." (warning) |
| Ação concluída | Check-pop animation no ícone |

---

## 8. Accessibility (WCAG 2.2 AA+)

### 8.1 Touch Targets

- Mínimo **44×44px** para todos os alvos tocáveis (Apple HIG padrão)
- Espaçamento mínimo de **8px** entre alvos adjacentes

### 8.2 Color Contrast

- Texto normal (< 18px): **4.5:1** mínimo
- Texto grande (≥ 18px bold ou ≥ 24px regular): **3:1** mínimo
- Elementos não-texto (ícones, bordas): **3:1** mínimo

### 8.3 Semantic HTML

- `<nav>` para navegação (sidebar, bottom nav)
- `<main>` para conteúdo principal
- `<button>` para ações (nunca div com onClick)
- `<h1-h6>` hierarchy respeitada (um h1 por página)
- `<form>` com `onSubmit` para formulários

### 8.4 ARIA

- `aria-label` para botões sem texto visível (ícones)
- `aria-current="page"` para link ativo na navegação
- `aria-live="polite"` para toasts e notificações
- `role="dialog"` + `aria-modal="true"` para modais
- `role="status"` para badges de estoque

### 8.5 Keyboard

- Todas as ações acessíveis via Tab/Shift+Tab
- Modal: focus trap + Escape fecha
- Enter e Space ativam botões
- Setas direcionais para navegação em listas

### 8.6 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. UX Writing (Tom de Voz)

### 9.1 Princípios

- **Direto**: "Salvar", "Excluir", "Criar produto" — não "Inserir novo registro"
- **Acolhedor**: "Tudo certo! Produto salvo." — não "Operação concluída com sucesso"
- **Sem jargão**: "Digite o nome do produto" — não "Insira a nomenclatura"
- **Português brasileiro**: "Você" (não "tu"), "estoque" (não "inventário"), "cardápio" (não "menu")

### 9.2 Labels Padrão

| Contexto | Label |
|----------|-------|
| Salvar | "Salvar" |
| Excluir | "Excluir produto" |
| Cancelar | "Cancelar" |
| Voltar | "Voltar" |
| Criar | "Novo produto" |
| Buscar | "Buscar produto..." |
| Confirmar exclusão | "Tem certeza que deseja excluir [nome]?" |
| Empty state | "Nenhum produto encontrado" |
| CTA empty state | "Adicionar produto" |
| Erro de rede | "Sem conexão. Verifique sua internet." |
| Sucesso | "Produto salvo com sucesso." |

### 9.3 Erros

| Situação | Mensagem |
|----------|----------|
| Campo obrigatório vazio | "Preencha este campo" |
| Preço inválido | "Digite um valor válido (ex: 15,90)" |
| Nome duplicado | "Já existe um produto com este nome" |
| Erro inesperado | "Algo deu errado. Tente novamente." |

### 9.4 Empty States

| Página | Estados vazios |
|--------|----------------|
| Cardápio | "Nenhum produto no cardápio. Adicione o primeiro!" |
| Estoque | "Nenhum produto cadastrado. Crie seu primeiro produto." |
| Busca | "Nenhum resultado para \"[termo]\". Tente outro termo." |

---

## 10. Responsive Layout

### 10.1 Breakpoints

| Breakpoint | Largura | Alvo |
|------------|---------|------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / desktop pequeno |
| `xl` | 1280px | Desktop |

### 10.2 Layout por Dispositivo

#### Mobile (< 768px)

- Bottom nav fixa (64px + safe area)
- Conteúdo em coluna única
- Padding lateral 16px
- Full-width cards
- FAB para ação primária (se aplicável)

#### Tablet (768px — 1024px)

- Sidebar opcional (colapsável)
- Grid de 2 colunas para cards
- Padding lateral 24px

#### Desktop (≥ 1024px)

- Sidebar fixa (256px)
- Conteúdo centralizado (`max-w-7xl`)
- Grid de 3-4 colunas para cards
- Padding lateral 32px

### 10.3 Navegação

| Dispositivo | Navegação primária | Navegação secundária |
|-------------|-------------------|----------------------|
| Mobile | BottomNav (3-5 itens) | Header com título + back |
| Tablet | Sidebar (pode colapsar) | Breadcrumb |
| Desktop | Sidebar fixa | Breadcrumb |

---

## 11. References

- [Apple Human Interface Guidelines](https://developer.apple.com/design/)
- [Google Material Design 3](https://m3.material.io/)
- [Uber Base Design System](https://base.uber.com/)
- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [Laws of UX — Jon Yablonski](https://lawsofux.com/)
- [10 Usability Heuristics — Jakob Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [The Design of Everyday Things — Don Norman](https://www.nngroup.com/books/design-everyday-things-revised/)
- [First Principles of Interaction Design — Bruce Tognazzini](https://asktog.com/atc/principles-of-interaction-design/)
- [8 Golden Rules — Ben Shneiderman](https://www.cs.umd.edu/~ben/goldenrules.html)
- [NN/g Nielsen Norman Group](https://www.nngroup.com/articles/)
- [State of UX 2026 — NN/g](https://www.nngroup.com/articles/state-of-ux-2026/)

---

> Este documento é a fonte da verdade para todo design do app Só. Consulte antes de criar qualquer novo componente, tela ou interação.
