import { PrismaClient } from '@/generated/prisma/client';
import type { PricingContext } from '../types';
import { PricingEngine } from '../engine/PricingEngine';
import { RuleRegistry } from '../registry/RuleRegistry';
import { RulePipeline, PricingPhase } from '../pipeline/RulePipeline';
import { RuleExecutor } from '../executor/RuleExecutor';
import { ActionReducer } from '../reducers/ActionReducer';
import { PricingDataLoader } from '../loaders/PricingDataLoader';
import { PricingCache } from '../cache/PricingCache';
import { PricingRule, BasePriceRule } from '../rules/PricingRule';
import { PriceTierRule } from '../rules/PriceTierRule';
import { ShippingRule } from '../rules/ShippingRule';
import { EventBus } from '../events/EventBus';

const prisma = new PrismaClient();

async function testPricingEngine() {
  console.log('🧪 Iniciando testes do Pricing Engine...\n');

  // 1. Configurar Engine
  const registry = new RuleRegistry();
  const pipeline = new RulePipeline();

  // Registrar regras
  registry.register(new BasePriceRule(prisma, console));
  registry.register(new PriceTierRule(prisma, console));
  registry.register(new ShippingRule(prisma, new EventBus(), console));

  // Configurar pipeline
  pipeline.registerPhase(PricingPhase.BASE, [registry.get('base-price')!]);
  pipeline.registerPhase(PricingPhase.ITEM, [registry.get('price-tier')!]);
  pipeline.registerPhase(PricingPhase.SHIPPING, [registry.get('shipping')!]);

  const executor = new RuleExecutor(registry, console);
  const reducer = new ActionReducer();
  const dataLoader = new PricingDataLoader(
    { findByIds: () => [] } as any,
    { findByCode: () => null } as any,
    { findActive: () => [] } as any,
    { getRateByWeight: () => null } as any,
    { getSettings: () => null } as any,
    new PricingCache()
  );

  const engine = new PricingEngine(prisma, registry, console, {
    record: () => void 0
  } as any);

  // 2. Testar cálculo de preço
  const context: PricingContext = {
    items: [
      {
        productId: 'prod1',
        qty: 5,
        basePrice: 15,
        name: 'Cookie Clássico'
      }
    ],
    channel: 'pickup',
    customerType: 'CLIENTE'
  };

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






