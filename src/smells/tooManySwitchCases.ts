import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

export class TooManySwitchCasesDetector implements SmellDetector {
  readonly ruleId = 'S1479';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact',
  ];

  constructor(private threshold: number = 30) {}

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, results: SmellResult[]): void {
    if (node.type === 'switch_statement') {
      const body = node.childForFieldName('body');
      if (body) {
        const caseCount = body.namedChildren.filter(
          (c) => c.type === 'switch_case' || c.type === 'switch_default',
        ).length;
        if (caseCount > this.threshold) {
          results.push({
            ruleId: this.ruleId,
            message: `Switch has ${caseCount} cases (max: ${this.threshold}). Consider using a lookup object or map.`,
            line: node.startPosition.row,
            column: node.startPosition.column,
            endLine: node.startPosition.row,
            endColumn: node.startPosition.column + 6, // "switch"
            severity: 'warning',
          });
        }
      }
    }
    for (const child of node.children) {
      this.walk(child, results);
    }
  }
}
