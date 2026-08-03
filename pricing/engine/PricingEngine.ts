import type { PricingContext, PricingState, PricingResult } from '../types';
import type { PricingAction } from '../actions/PricingAction';
import type { PricingRule } from '../rules/PricingRule';
import type { PricingRuleError } from '../errors/PricingRuleError';
import type { PricingData } from '../loaders/PricingDataLoader';
import { RulePipeline } from '../pipeline/RulePipeline';
import { RuleExecutor } from '../executor/RuleExecutor';
import { ActionReducer } from '../reducers/ActionReducer';
import { PricingDataLoader } from '../loaders/PricingDataLoader';
import { PricingCache } from '../cache/PricingCache';
import { EventBus } from '../events/EventBus';
import { PricingAudit } from '../audit/PricingAudit';
import { PricingSummaryCalculator } from '../calculations/PricingSummaryCalculator';
import { PricingRuleError } from '../errors/PricingRuleError';

export class PricingEngine {
  private executor: RuleExecutor;
  private pipeline: RulePipeline;
  private reducer: ActionReducer;
  private dataLoader: PricingDataLoader;
  private audit: PricingAudit;
  private summaryCalculator: PricingSummaryCalculator;

  constructor(
    private prisma: any,
    private registry: any,
    private logger: any,
    private metrics: any
  ) {
    this.pipeline = new RulePipeline();
    this.executor = new RuleExecutor(registry, logger);
    this.reducer = new ActionReducer();
    this.dataLoader = new PricingDataLoader(
      registry.getRepository('product') as any,
      registry.getRepository('coupon') as any,
      registry.getRepository('campaign') as any,
      registry.getRepository('shipping') as any,
      registry.getRepository('pricing') as any,
      new PricingCache()
    );
    this.audit = new PricingAudit(prisma, new EventBus());
    this.summaryCalculator = new PricingSummaryCalculator();
  }

  async calculatePrice(context: PricingContext): Promise<PricingResult> {
    const startTime = Date.now();

    // 1. Carregar dados (apenas orquestração)
    const dataStart = Date.now();
    const data = await this.dataLoader.loadData(context);
    this.metrics.record('pricing', 'data_load_time', Date.now() - dataStart);

    // 2. Inicializar estado transitório
    const state = this.initializeState(context, data);

    // 3. Executar regras em fases
    const rulesStart = Date.now();
    const actions = await this.executePhases(context, state, data);
    this.metrics.record('pricing', 'rules_execution_time', Date.now() - rulesStart);

    // 4. Aplicar ações (apenas via reducer)
    const actionsStart = Date.now();
    const newState = this.reducer.reduce(state, actions);
    this.metrics.record('pricing', 'actions_execution_time', Date.now() - actionsStart);

    // 5. Calcular totais e resumo
    const totalsStart = Date.now();
    const summary = this.summaryCalculator.calculate(newState);
    this.metrics.record('pricing', 'totals_calculation_time', Date.now() - totalsStart);

    // 6. Criar resultado
    const result: PricingResult = {
      state: newState,
      total: summary.total,
      summary,
      auditTrail: await this.audit.createTrail(context, newState, actions, Date.now() - startTime)
    };

    this.metrics.record('pricing', 'total_execution_time', Date.now() - startTime);

    return result;
  }

  private initializeState(context: PricingContext, data: PricingData): PricingState {
    return {
      items: context.items.map(item => ({
        productId: item.productId,
        name: item.name || data.products[item.productId]?.name || 'Produto',
        qty: item.qty,
        basePrice: item.basePrice,
        calculatedPrice: item.basePrice,
        priceAfterDiscount: item.basePrice
      })),
      discounts: [],
      cashbacks: [],
      taxes: [],
      bonuses: [],
      warnings: [],
      logs: [],
      blocked: false,
      version: '1.0.0'
    };
  }

  private async executePhases(
    context: PricingContext,
    state: PricingState,
    data: PricingData
  ): Promise<PricingAction[]> {
    const allActions: PricingAction[] = [];

    const phases = this.pipeline.getPhaseTimeline();

    for (const phase of phases) {
      const phaseActions = await this.executor.executeParallelInPhase(
        phase.phase,
        context,
        state,
        data
      );

      allActions.push(...phaseActions);

      // Atualizar estado intermedeiramente (opcional)
      state = this.reducer.reduce(state, phaseActions);
    }

    return allActions;
  }

  getPipeline(): RulePipeline {
    return this.pipeline;
  }

  getExecutor(): RuleExecutor {
    return this.executor;
  }
}
