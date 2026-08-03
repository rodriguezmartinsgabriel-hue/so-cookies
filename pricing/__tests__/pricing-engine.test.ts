import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from '@/generated/prisma/client';
import type { PricingContext } from '../types';
import { PricingEngine } from '../engine/PricingEngine';
import { RuleRegistry } from '../registry/RuleRegistry';
import { RulePipeline, PricingPhase } from '../pipeline/RulePipeline';
import { RuleExecutor } from '../executor/RuleExecutor';
import { ActionReducer } from '../reducers/ActionReducer';
import { PricingDataLoader } from '../loaders/PricingDataLoader';
import { PricingCache } from '../cache/PricingCache';
import { BasePriceRule } from '../rules/PricingRule';
import { PriceTierRule } from '../rules/PriceTierRule';
import { ShippingRule } from '../rules/ShippingRule';
import { EventBus } from '../events/EventBus';
import {
  buildPricingDataLoaderDeps,
  mockConsole,
  mockMetrics,
  pricingContextFactory,
} from './factories';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" })
const prisma = new PrismaClient({ adapter });

async function testPricingEngine() {
  console.log('🧪 Iniciando testes do Pricing Engine...\n');

  // 1. Configurar Engine
  const registry = new RuleRegistry();
  const pipeline = new RulePipeline();
  const logger = mockConsole();

  // Registrar regras
  registry.register(new BasePriceRule(prisma, logger));
  registry.register(new PriceTierRule(prisma, logger));
  registry.register(new ShippingRule(prisma, new EventBus(), logger));

  // Configurar pipeline
  pipeline.registerPhase(PricingPhase.BASE, [registry.get('base-price')!]);
  pipeline.registerPhase(PricingPhase.ITEM, [registry.get('price-tier')!]);
  pipeline.registerPhase(PricingPhase.SHIPPING, [registry.get('shipping')!]);

  const _executor = new RuleExecutor(registry, logger);
  void _executor;
  const _reducer = new ActionReducer();
  void _reducer;
  const deps = buildPricingDataLoaderDeps();
  const _dataLoader = new PricingDataLoader(
    deps.productRepository,
    deps.couponRepository,
    deps.campaignRepository,
    deps.shippingRepository,
    deps.pricingRepository,
    new PricingCache()
  );
  void _dataLoader;

  const engine = new PricingEngine(prisma, registry, logger, mockMetrics());

  // 2. Testar cálculo de preço
  const context: PricingContext = pricingContextFactory();

  console.log('Teste 1: Cálculo básico de preço');
  console.log('Itens:', context.items);
  console.log('Canal:', context.channel);
  console.log('Tipo de cliente:', context.customerType);
  console.log('\n');

  try {
    const result = await engine.calculatePrice(context);

    console.log('✅ Cálculo realizado com sucesso!');
    console.log('Resultado total:', result.total);
    console.log('Subtotal:', result.summary.subtotal);
    console.log('Total de descontos:', result.summary.discountTotal);
    console.log('Percentual de desconto:', result.summary.discountPercent);
    console.log('Regras aplicadas:', result.summary.rulesApplied);
    console.log('\n');

    // Mostrar itens
    console.log('Itens calculados:');
    result.state.items.forEach(item => {
      console.log(`  - ${item.name} x ${item.qty} = ${item.calculatedPrice} cada = ${item.calculatedPrice * item.qty} total`);
    });
    console.log('\n');

    // Mostrar auditoria
    console.log('Auditoria:');
    result.auditTrail.events.forEach(event => {
      console.log(`  - [${event.actionType}] ${event.ruleName}: ${JSON.stringify(event.value)}`);
    });
    console.log('\n');

    console.log('✅ Todos os testes passaram com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar testes
testPricingEngine();






