import type { SmellResult } from '../smells/types';

export enum ComplexitySeverity {
  Good = 'good',
  Warning = 'warning',
  Error = 'error',
}

export interface ComplexityIncrement {
  line: number;
  column: number;
  amount: number;
  reason: string;
}

export interface FunctionComplexityResult {
  functionName: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  score: number;
  increments: ComplexityIncrement[];
  severity: ComplexitySeverity;
}

export interface DocumentComplexityResult {
  uri: string;
  languageId: string;
  functions: FunctionComplexityResult[];
  smells: SmellResult[];
  analyzedAt: number;
}
