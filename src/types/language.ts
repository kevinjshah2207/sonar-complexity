import type Parser from 'web-tree-sitter';
import type { FunctionComplexityResult } from './complexity';
import type { ComplexityThresholds } from './configuration';

export interface ILanguageAnalyzer {
  readonly supportedLanguageIds: string[];
  readonly wasmGrammarPath: string;

  analyzeFunctions(
    tree: Parser.Tree,
    sourceCode: string,
    thresholds?: ComplexityThresholds,
  ): FunctionComplexityResult[];
}
