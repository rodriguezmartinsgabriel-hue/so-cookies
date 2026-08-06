import type { PricingRule } from "../rules/PricingRule"
import type { PricingContext, PricingState, PricingData, Logger } from "../types"
import type { PricingAction } from "../actions/PricingAction"
import type { RuleRegistry } from "../registry/RuleRegistry"
import { PricingPhase } from "../pipeline/PricingPhase"
import { RuleValidator } from "./RuleValidator"

export class RuleExecutor {
  private validator: RuleValidator

  constructor(
    private registry: RuleRegistry,
    private logger: Logger,
  ) {
    this.validator = new RuleValidator(registry, logger)
  }

  async executeRule(
    rule: PricingRule,
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    // Validar se regra pode ser aplicada
    const canApply = await this.validator.validateRule(rule, context, state, data)

    if (!canApply) {
      return []
    }

    // Executar regra (retorna apenas actions)
    return await rule.apply(context, state, data)
  }

  // Execução sequencial
  async executeSequential(
    rules: PricingRule[],
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    const actions: PricingAction[] = []

    for (const rule of rules) {
      const ruleActions = await this.executeRule(rule, context, state, data)

      if (ruleActions.length > 0) {
        actions.push(...ruleActions)
      }
    }

    return actions
  }

  // Execução paralela apenas dentro da mesma fase
  async executeParallelInPhase(
    phase: PricingPhase,
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    const phaseRules = this.registry.getPhaseRules(phase)

    const rulePromises = phaseRules.map((rule) => this.executeRule(rule, context, state, data))

    return (await Promise.all(rulePromises)).flat()
  }

  // Executar apenas regras que dependem da anterior
  async executeDependentRules(
    previousActions: PricingAction[],
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    const actions: PricingAction[] = []

    for (const action of previousActions) {
      const rule = this.registry.get(action.sourceRule)

      if (!rule) continue

      const ruleActions = await this.executeRule(rule, context, state, data)

      if (ruleActions.length > 0) {
        actions.push(...ruleActions)
      }
    }

    return actions
  }

  async executeRulesParallel(
    rules: PricingRule[],
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<PricingAction[]> {
    const rulePromises = rules.map((rule) => this.executeRule(rule, context, state, data))

    return (await Promise.all(rulePromises)).flat()
  }

  async executeWithRollback(
    rules: PricingRule[],
    context: PricingContext,
    state: PricingState,
    data: PricingData,
  ): Promise<{ actions: PricingAction[]; success: boolean }> {
    for (const rule of rules) {
      try {
        const actions = await this.executeRule(rule, context, state, data)

        if (actions.some((a) => a.type === "BLOCK_CHECKOUT")) {
          return { actions, success: false }
        }
      } catch (error) {
        this.logger.error(`Rule execution failed for ${rule.id}:`, error)
        return { actions: [], success: false }
      }
    }
    return { actions: [], success: true }
  }
}
