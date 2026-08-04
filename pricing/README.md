# Pricing Engine v2 - Sistema de Precificação Modular

## 🎯 Visão Geral

Sistema de precificação totalmente reescrito para uma arquitetura baseada em **Rules → Actions → State → Engine**, eliminando acoplamentos, reduzindo consultas ao banco e preparando o sistema para suportar dezenas de regras de negócio sem reescritas futuras.

## ✅ Implementação Completa

### 📦 Estrutura de Pastas

```
pricing/
├── types/                      # Tipos principais
│   └── index.ts               # Contexto, Estado, Resultado, etc.
│
├── actions/                    # Ações fortemente tipadas
│   ├── PricingAction.ts       # Interface base
│   ├── DiscountAction.ts      # Desconto
│   ├── ShippingAction.ts      # Frete
│   ├── CashbackAction.ts      # Cashback
│   ├── TaxAction.ts           # Imposto
│   ├── BonusAction.ts         # Brinde
│   ├── WarningAction.ts       # Aviso
│   └── LogAction.ts           # Log
│
├── reducers/                   # Redução de estado
│   └── ActionReducer.ts       # Aplica ações para criar novo estado
│
├── repositories/               # Acesso a dados
│   ├── ProductRepository.ts   # Produtos
│   ├── CouponRepository.ts    # Cupons
│   ├── CampaignRepository.ts  # Campanhas
│   ├── ShippingRepository.ts  # Frete
│   └── PricingRepository.ts   # Configurações
│
├── cache/                      # Sistema de cache
│   └── PricingCache.ts        # Cache de dados de leitura
│
├── registry/                   # Registro de regras
│   └── RuleRegistry.ts        # Gerenciamento de regras dinâmicas
│
├── pipeline/                   # Pipeline de execução
│   └── RulePipeline.ts        # Organiza regras por fases
│
├── executor/                   # Executor de regras
│   ├── RuleValidator.ts       # Validação de regras
│   └── RuleExecutor.ts        # Execução de regras
│
├── loaders/                    # Carregamento de dados
│   └── PricingDataLoader.ts   # Carrega dados antes da execução
│
├── engine/                     # Motor principal
│   └── PricingEngine.ts       # Orquestrador principal
│
├── calculations/               # Cálculos de resumo
│   └── PricingSummaryCalculator.ts  # Calculadora de totais
│
├── events/                     # Event Bus
│   └── EventBus.ts            # Eventos de negócio
│
├── audit/                      # Auditoria
│   └── PricingAudit.ts        # Registra todas as ações
│
├── rules/                      # Regras de negócio
│   ├── PricingRule.ts         # Interface base
│   ├── BasePriceRule.ts       # Preço base do produto
│   ├── PriceTierRule.ts       # Faixas de quantidade
│   ├── CouponRule.ts          # Cupom de desconto
│   ├── CampaignRule.ts        # Campanha promocional
│   ├── B2BRule.ts             # Desconto B2B
│   └── ShippingRule.ts        # Cálculo de frete
│
├── factory.ts                  # buildPricingEngine(prisma, { register })
│
└── __tests__/                  # Testes
    ├── pricing-engine.test.ts # Suíte Vitest do engine
    └── factories.ts           # Factories/mocks para os testes
```

### 🚀 Arquitetura Implementada

**Fluxo de Execução:**

```
1. PricingEngine.calculatePrice()
   ↓
2. PricingDataLoader.loadData()
   - Carrega produtos
   - Carrega faixas de preço
   - Carrega cupons
   - Carrega campanhas
   - Carrega frete
   - Carrega configurações
   ↓
3. RulePipeline.getPhaseTimeline()
   - BASE (Preço base)
   - ITEM (Faixas de quantidade)
   - PAYMENT (Cupons, campanhas)
   - SHIPPING (Frete)
   ↓
4. RuleExecutor.executeParallelInPhase()
   - Executa regras dentro de cada fase
   ↓
5. ActionReducer.reduce()
   - Aplica ações para criar novo estado
   ↓
6. PricingSummaryCalculator.calculate()
   - Calcula totais e resumo
   ↓
7. PricingAudit.createTrail()
   - Registra todas as ações
   ↓
8. Retorna PricingResult
```

### 🎯 Principais Características

#### ✅ Arquitetura Modular

- **Rules → Actions → State → Engine**: Fluxo claro e determinístico
- **Sem acoplamento direto**: Nenhuma regra acessa banco ou modifica estado diretamente
- **Extensível**: Adicionar nova regra = nova classe

#### ✅ Actions Fortemente Tipadas

- Cada ação tem sua própria classe com tipos específicos
- Elimina `value: any` de interfaces
- Melhora segurança de tipos

#### ✅ Repositories Clean

- Repositories são a única camada que conhece Prisma
- DataLoader não tem lógica de negócio
- Cache reduz consultas ao banco

#### ✅ Audit Trail Completo

- Cada ação é registrada com contexto
- Timeline por fase
- Possibilidade de debug completo

#### ✅ Performance

- Cache de dados de leitura frequente
- Métricas de execução
- Ordenação eficiente por fase e peso

### 📊 Estrutura de Tipos

**Contexto de Entrada:**
```typescript
interface PricingContext {
  customerId?: string;
  customerType: 'CLIENTE' | 'B2B' | 'EMPRESA' | 'SUBSCRIBER';
  channel: 'delivery' | 'pickup' | 'digital';
  couponCode?: string;
  items: Array<{ productId: string; qty: number; basePrice: number }>;
}
```

**Estado Transitório:**
```typescript
interface PricingState {
  items: PricingItem[];
  discounts: Discount[];
  cashbacks: Cashback[];
  taxes: Tax[];
  bonuses: Bonus[];
  warnings: Warning[];
  logs: Log[];
  blocked: boolean;
  blockedReason?: string;
}
```

**Resultado:**
```typescript
interface PricingResult {
  state: PricingState;
  total: number;
  summary: PricingSummary;
  auditTrail: AuditTrail;
}
```

### 🔄 Regras de Negócio

#### 1. BasePriceRule
- Define preço base do produto
- Executada na fase BASE
- Prioridade 1

#### 2. PriceTierRule
- Aplica faixas de quantidade
- Executada na fase ITEM
- Prioridade 2

#### 3. CouponRule
- Aplica cupom de desconto (`PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`)
- `BUY_X_GET_Y` gera aviso (não aplicado)
- Valida ativo/expirado/esgotado/canal/pedido mínimo com avisos
- Executada na fase PAYMENT
- Prioridade 3

#### 4. CampaignRule
- Aplica a campanha ativa de maior prioridade cujas condições batam (`minQty`, `minOrderValue`, `products`, `categories`, `customerTypes`)
- Executada na fase ORDER
- Prioridade 3

#### 5. B2BRule
- Aplica `b2bDiscountPercent` do `ChannelConfig` quando `customerType === 'B2B'`
- Executada na fase CUSTOMER
- Prioridade 3

#### 6. ShippingRule
- Calcula frete para delivery
- Respeita `state.freeShipping` (cupom de frete grátis zera o custo)
- Executada na fase SHIPPING
- Prioridade 4

### 📈 Métricas de Performance

**Objetivos:**
- Total execution < 200ms
- Data load < 50ms
- Rules execution < 50ms
- Actions execution < 20ms
- Totals calculation < 10ms

## 🧪 Como Testar

```bash
cd so-cookies-app
npm test                 # suíte completa (Vitest)
npx vitest run pricing/__tests__/pricing-engine.test.ts   # só o engine
```

## 📝 Como Usar

```typescript
import { buildPricingEngine } from '@so-cookies/pricing';
import { PricingEngine } from './pricing/engine/PricingEngine';
import { RuleRegistry } from './pricing/registry/RuleRegistry';
import { PricingRule } from './pricing/rules/PricingRule';
import { EventBus } from './pricing/events/EventBus';

// 1. Configurar Engine (fábrica registra todas as regras e repositórios)
const engine = buildPricingEngine(prisma);

// Com repositórios customizados (ex.: mocks em testes):
const engine = buildPricingEngine(prisma, {
  logger: console,
  metrics: { record: () => void 0 },
  register: (registry) => {
    registry.registerRepository('coupon', mockCouponRepo);
  }
});

// 2. Criar contexto (cupom e tipo de cliente são opcionais)
const context: PricingContext = {
  items: [
    { productId: 'prod1', qty: 5, basePrice: 15 }
  ],
  channel: 'delivery',
  customerType: 'B2B',
  couponCode: 'WELCOME10'
};

// 3. Calcular preço
const result = await engine.calculatePrice(context);

// 4. Usar resultado
console.log('Total:', result.total);
console.log('Summary:', result.summary);
console.log('Avisos:', result.state.warnings);
```

## 🔄 Adicionar Nova Regra

```typescript
export class MyCustomRule implements PricingRule {
  id = 'my-custom';
  name = 'Minha Regra Personalizada';
  phase = PricingPhase.CUSTOMER;
  weight = 3;
  priority = 3;
  enabled = true;

  async canApply(context: PricingContext, state: PricingState, data: PricingData): Promise<boolean> {
    return true;
  }

  async apply(context: PricingContext, state: PricingState, data: PricingData): Promise<PricingAction[]> {
    // Retorna apenas ações, nunca modifica estado diretamente
    return [
      new DiscountAction(...),
      new WarningAction(...)
    ];
  }

  getRuleName(): string { return this.name; }
  getPhase(): PricingPhase { return this.phase; }
}

// Registrar
registry.register(new MyCustomRule());
```

## 🎯 Critérios de Aceite

✅ **Arquiteturais:**
- [x] Nenhuma regra acessa banco diretamente
- [x] Nenhuma regra altera estado diretamente
- [x] Apenas engine reduz estado (via ActionReducer)
- [x] Fluxo dividido em fases (BASE, ITEM, PAYMENT, SHIPPING)
- [x] Repositories são responsáveis por dados
- [x] Loader não tem lógica de negócio

✅ **Funcionais:**
- [x] Preço base funciona
- [x] Faixas de quantidade funcionam
- [x] Cupons (percentual, fixo, frete grátis) funcionam
- [x] Campanhas funcionam
- [x] Desconto B2B funciona
- [x] Sistema de regras funciona
- [x] Auditoria gera logs completos
- [x] Eventos são emitidos

✅ **Técnicos:**
- [x] Actions fortemente tipadas
- [x] Sem `value: any`
- [x] Limpar separation of concerns
- [x] Extensível (nova regra = nova classe)
- [x] Suíte Vitest do engine (prisma mockado)

## 🚀 Próximos Passos

### 1. Testes Unitários Completos
- [ ] Testes de performance
- [ ] Testes de determinismo

### 2. Melhorias Futuras
- [ ] Cupom BUY_X_GET_Y (leva/ganha)
- [ ] Regras de Cashback
- [ ] Normalização de canais (regra de canal por flag específica)

### 3. Integração com App Existente
- [x] Integrar com checkout (carrinho com cupom)
- [x] Integrar com catálogo
- [ ] Atualizar API de vendas

## 📚 Documentação Adicional

- Ver `PLANO_IMPLEMENTACAO_PRICING_ENGINE_V2.md` para detalhes completos
- Ver `src/lib/entity-types.ts` para tipos existentes (compatibilidade)
- Ver `prisma/schema.prisma` para modelos de banco

---

**Status:** ✅ **IMPLEMENTADO** (regras completas)

**Implementado:** 13 de 13 etapas principais  
**Arquivos criados:** 35  
**Testes:** suíte Vitest do engine (15 cenários)
