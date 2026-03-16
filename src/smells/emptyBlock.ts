import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

const BLOCK_PARENTS = new Set([
  'catch_clause', 'except_clause',
  'if_statement', 'else_clause', 'elif_clause',
  'for_statement', 'for_in_statement', 'while_statement', 'do_statement',
]);

export class EmptyBlockDetector implements SmellDetector {
  readonly ruleId = 'S108';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  detect(tree: Parser.Tree, sourceCode: string): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, sourceCode, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, source: string, results: SmellResult[]): void {
    if (
      (node.type === 'statement_block' || node.type === 'block') &&
      node.parent &&
      BLOCK_PARENTS.has(node.parent.type)
    ) {
      const meaningful = node.namedChildren.filter(
        (c) => c.type !== 'comment' && c.type !== 'pass_statement',
      );
      if (meaningful.length === 0) {
        // Check if there's a comment inside (intentional empty block)
        const hasComment = node.namedChildren.some((c) => c.type === 'comment');
        if (!hasComment) {
          const parentType = node.parent.type.replace(/_/g, ' ');
          results.push({
            ruleId: this.ruleId,
            message: `Empty ${parentType} block. Add logic or a comment explaining why it's empty.`,
            line: node.parent.startPosition.row,
            column: node.parent.startPosition.column,
            endLine: node.parent.endPosition.row,
            endColumn: node.parent.endPosition.column,
            severity: 'info',
          });
        }
      }
    }
    for (const child of node.children) {
      this.walk(child, source, results);
    }
  }
}
