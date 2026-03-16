import { ComplexitySeverity } from '../types/complexity';
import type { ComplexityThresholds } from '../types/configuration';

export function evaluateSeverity(
  score: number,
  thresholds: ComplexityThresholds,
): ComplexitySeverity {
  if (score >= thresholds.error) {
    return ComplexitySeverity.Error;
  }
  if (score >= thresholds.warning) {
    return ComplexitySeverity.Warning;
  }
  return ComplexitySeverity.Good;
}
