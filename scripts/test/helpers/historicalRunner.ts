/** Retrospective October candidate fixtures. Current serving routes are tested
 * by the runner service/reconciliation suites, with this opt-out absent. */
export * from '../../../lib/pricing/pricingService';
import { createPricingService as create, type PricingServiceDeps } from '../../../lib/pricing/pricingService';
import { calculateFhoneifyPrice as calculate, calculateOnePlusPrice as oneplus } from '../../../lib/pricingCalculator';

export const createPricingService = (deps: PricingServiceDeps) => create({ ...deps, disableRunnerEvidence: true });
export const calculateFhoneifyPrice: typeof calculate = (brand, model, reference, answers, semantics, storage, context) =>
  calculate(brand, model, reference, answers, semantics, storage, { ...context, disableRunnerEvidence: true });
export const calculateOnePlusPrice: typeof oneplus = (model, reference, diagnostics, semantics, storage) =>
  oneplus(model, reference, diagnostics, semantics, storage, false);
