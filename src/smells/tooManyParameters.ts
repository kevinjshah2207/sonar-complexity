import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

const JS_FUNCTION_TYPES = new Set([
  'function_declaration', 'function_expression', 'arrow_function',
  'method_definition', 'generator_function_declaration', 'generator_function',
]);
const PY_FUNCTION_TYPES = new Set(['function_definition']);

export class TooManyParametersDetector implements SmellDetector {
  readonly ruleId = 'S107';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  constructor(private threshold: number = 7) {}

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, results: SmellResult[]): void {
    if (JS_FUNCTION_TYPES.has(node.type) || PY_FUNCTION_TYPES.has(node.type)) {
      const params = node.childForFieldName('parameters');
      if (params) {
        const paramCount = params.namedChildren.filter(
          (c) => c.type !== 'comment' && c.type !== 'decorator',
        ).length;
        if (paramCount > this.threshold) {
          const name = this.getFunctionName(node);
          results.push({
            ruleId: this.ruleId,
            message: `"${name}" has ${paramCount} parameters (max: ${this.threshold}). Consider refactoring.`,
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
