import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

const TERNARY_TYPES = new Set(['ternary_expression', 'conditional_expression']);

export class NestedTernaryDetector implements SmellDetector {
  readonly ruleId = 'S3358';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, false, results);
    return results;
  }

  private walk(
    node: Parser.SyntaxNode,
    insideTernary: boolean,
    results: SmellResult[],
  ): void {
    if (TERNARY_TYPES.has(node.type)) {
      if (insideTernary) {
        results.push({
          ruleId: this.ruleId,
          message: 'Nested ternary expressions are hard to read. Extract to a variable or use if/else.',
          line: node.startPosition.row,
          column: node.startPosition.column,
          endLine: node.endPosition.row,
          endColumn: node.endPosition.column,
          severity: 'warning',
        });
      }
      for (const child of node.children) {
        this.walk(child, true, results);
      }
      return;
    }
    for (const child of node.children) {
      this.walk(child, insideTernary, results);
    }
  }
}
