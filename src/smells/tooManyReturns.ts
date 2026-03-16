import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

const FUNCTION_TYPES = new Set([
  'function_declaration', 'function_expression', 'arrow_function',
  'method_definition', 'generator_function_declaration', 'generator_function',
  'function_definition',
]);

export class TooManyReturnsDetector implements SmellDetector {
  readonly ruleId = 'S3699';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  constructor(private threshold: number = 5) {}

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, results: SmellResult[]): void {
    if (FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName('body');
      if (body) {
        const returnCount = this.countReturns(body);
        if (returnCount > this.threshold) {
          const name = this.getFunctionName(node);
          results.push({
            ruleId: this.ruleId,
            message: `"${name}" has ${returnCount} return statements (max: ${this.threshold}). Consider simplifying.`,
            line: node.startPosition.row,
            column: node.startPosition.column,
            endLine: node.startPosition.row,
            endColumn: node.startPosition.column + (name.length || 8),
            severity: 'warning',
          });
        }
      }
    }
    for (const child of node.children) {
      this.walk(child, results);
    }
  }

  private countReturns(node: Parser.SyntaxNode): number {
    let count = 0;
    const walk = (n: Parser.SyntaxNode) => {
      if (n.type === 'return_statement') {
        count++;
      }
      // Don't count returns in nested functions
      if (FUNCTION_TYPES.has(n.type)) {
        return;
      }
      for (const child of n.children) {
        walk(child);
      }
    };
    walk(node);
    return count;
  }

  private getFunctionName(node: Parser.SyntaxNode): string {
    const name = node.childForFieldName('name');
    if (name) return name.text;
    if (node.parent?.type === 'variable_declarator') {
      const varName = node.parent.childForFieldName('name');
      if (varName) return varName.text;
    }
    return '<anonymous>';
  }
}
