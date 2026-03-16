import type Parser from 'web-tree-sitter';
import type { SmellResult } from './types';

export interface SmellDetector {
  readonly ruleId: string;
  readonly supportedLanguages: string[];
  detect(tree: Parser.Tree, sourceCode: string): SmellResult[];
}
