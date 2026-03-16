import type Parser from 'web-tree-sitter';
import type { SmellDetector } from './detector';
import type { SmellResult } from './types';

export class ReturnBooleanLiteralDetector implements SmellDetector {
  readonly ruleId = 'S1126';
  readonly supportedLanguages = [
    'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python',
  ];

  detect(tree: Parser.Tree): SmellResult[] {
    const results: SmellResult[] = [];
    this.walk(tree.rootNode, results);
    return results;
  }

  private walk(node: Parser.SyntaxNode, results: SmellResult[]): void {
    if (node.type === 'if_statement') {
      this.checkIfReturnsBoolean(node, results);
    }
    for (const child of node.children) {
      this.walk(child, results);
    }
  }

  private checkIfReturnsBoolean(ifNode: Parser.SyntaxNode, results: SmellResult[]): void {
    // Get consequence (if body)
    const consequence = ifNode.childForFieldName('consequence');
    if (!consequence) return;

    // Get alternative (else body)
    const alternative = ifNode.childForFieldName('alternative');
    if (!alternative) return;

    // Check if consequence returns a boolean literal
    const consequenceReturn = this.getSingleReturnValue(consequence);
    if (!consequenceReturn) return;

    // For else_clause, check inside it
    let elseBody = alternative;
    if (alternative.type === 'else_clause') {
      // Check it doesn't contain an if (else-if)
      if (alternative.children.some((c) => c.type === 'if_statement')) return;
      elseBody = alternative;
    }

    const alternativeReturn = this.getSingleReturnValue(elseBody);
    if (!alternativeReturn) return;

    const isBoolPair =
      (consequenceReturn === 'true' && alternativeReturn === 'false') ||
      (consequenceReturn === 'false' && alternativeReturn === 'true') ||
      (consequenceReturn === 'True' && alternativeReturn === 'False') ||
      (consequenceReturn === 'False' && alternativeReturn === 'True');

    if (isBoolPair) {
      results.push({
        ruleId: this.ruleId,
        message: 'Remove this if statement and directly return the condition (or its negation).',
        line: ifNode.startPosition.row,
        column: ifNode.startPosition.column,
        endLine: ifNode.startPosition.row,
        endColumn: ifNode.startPosition.column + 2,
        severity: 'info',
      });
    }
  }

  private getSingleReturnValue(block: Parser.SyntaxNode): string | null {
    // Find the single return statement in a block
    const returns = this.findReturns(block);
    if (returns.length !== 1) return null;

    const ret = returns[0];
    // Get the return value
    const children = ret.namedChildren;
    if (children.length !== 1) return null;

    const val = children[0];
    if (val.type === 'true' || val.type === 'false' ||
        val.type === 'True' || val.type === 'False') {
      return val.text;
    }
    // Python: True/False are identifiers
    if (val.type === 'identifier' && (val.text === 'True' || val.text === 'False')) {
      return val.text;
    }
    return null;
  }

  private findReturns(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const returns: Parser.SyntaxNode[] = [];
    for (const child of node.namedChildren) {
      if (child.type === 'return_statement') {
        returns.push(child);
      } else if (child.type === 'block' || child.type === 'statement_block') {
        returns.push(...this.findReturns(child));
      }
    }
    return returns;
  }
}
