import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

const NESTING_TYPES = new Set([
  'if_statement', 'for_statement', 'for_in_statement', 'while_statement',
  'do_statement', 'switch_statement', 'try_statement',
  // Python
  'with_statement',
]);

const FUNCTION_TYPES = new Set([
  'function_declaration', 'function_expression', 'arrow_function',
  'method_definition', 'generator_function_declaration', 'generator_function',
  'function_definition',
]);

export class TooDeepNestingDetector implements SmellDetector {
  readonly ruleId = 'S134';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  constructor(private threshold: number = 4) {}

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, 0, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, depth: number, results: SmellResult[]): void {
    // Reset nesting at function boundaries
    if (FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.children) {
          this.walk(child, 0, results);
        }
      }
      return;
    }

    if (NESTING_TYPES.has(node.type)) {
      const newDepth = depth + 1;
      if (newDepth > this.threshold) {
        results.push({
          ruleId: this.ruleId,
          message: `Nesting depth ${newDepth} exceeds maximum of ${this.threshold}. Refactor to reduce nesting.`,
          line: node.startPosition.row,
          column: node.startPosition.column,
          endLine: node.startPosition.row,
          endColumn: node.startPosition.column + node.type.length,
          severity: 'warning',
        });
      }
      for (const child of node.children) {
        this.walk(child, newDepth, results);
      }
      return;
    }

    for (const child of node.children) {
      this.walk(child, depth, results);
    }
  }
}
