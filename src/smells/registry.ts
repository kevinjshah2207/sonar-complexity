import type { SmellDetector } from './detector';
import { TooManyParametersDetector } from './tooManyParameters';
import { TooDeepNestingDetector } from './tooDeepNesting';
import { NestedTernaryDetector } from './nestedTernary';
import { EmptyBlockDetector } from './emptyBlock';
import { TooManyReturnsDetector } from './tooManyReturns';
import { ReturnBooleanLiteralDetector } from './returnBooleanLiteral';
import { TooManySwitchCasesDetector } from './tooManySwitchCases';

export interface SmellThresholds {
  maxParameters: number;
  maxNestingDepth: number;
  maxReturns: number;
  maxSwitchCases: number;
}

export class SmellRegistry {
  private detectors: SmellDetector[];

  constructor(thresholds: Partial<SmellThresholds> = {}) {
    this.detectors = [
      new TooManyParametersDetector(thresholds.maxParameters),
      new TooDeepNestingDetector(thresholds.maxNestingDepth),
      new NestedTernaryDetector(),
      new EmptyBlockDetector(),
      new TooManyReturnsDetector(thresholds.maxReturns),
      new ReturnBooleanLiteralDetector(),
      new TooManySwitchCasesDetector(thresholds.maxSwitchCases),
    ];
  }

  getDetectors(languageId: string): SmellDetector[] {
    return this.detectors.filter((d) => d.supportedLanguages.includes(languageId));
  }
}
