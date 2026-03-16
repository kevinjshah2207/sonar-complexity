import type Parser from 'web-tree-sitter';
import { BaseAnalyzer, type LanguageNodeConfig, type IfAlternative } from './baseAnalyzer';

export class PythonAnalyzer extends BaseAnalyzer {
  readonly supportedLanguageIds = ['python'];
  readonly wasmGrammarPath = 'tree-sitter-python.wasm';

  protected readonly config: LanguageNodeConfig = {
    functionNodeTypes: new Set([
      'function_definition',
    ]),
    structuralIncrementTypes: new Set([
      'if_statement',
      'for_statement',
      'while_statement',
      'except_clause',
      'conditional_expression',
    ]),
    booleanExpressionType: 'boolean_operator',
    booleanOperators: new Set(['and', 'or']),
  };

  protected getFunctionName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : '<anonymous>';
  }

  protected isLabeledJump(_node: Parser.SyntaxNode): boolean {
    return false;
  }

  protected getBodies(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    if (node.type === 'if_statement') {
      const consequence = node.childForFieldName('consequence');
      if (consequence) {
        return [consequence];
      }
      for (const child of node.children) {
        if (child.type === 'block') {
          return [child];
        }
      }
      return [];
    }

    if (node.type === 'for_statement' || node.type === 'while_statement') {
      const body = node.childForFieldName('body');
      return body ? [body] : [];
    }

    if (node.type === 'except_clause') {
      for (const child of node.children) {
        if (child.type === 'block') {
          return [child];
        }
      }
      return [];
    }

    if (node.type === 'conditional_expression') {
      // x if cond else y — walk all non-keyword children
      return node.children.filter(
        (c) => c.type !== 'if' && c.type !== 'else' && !c.type.includes('keyword'),
      );
    }

    const body = node.childForFieldName('body');
    return body ? [body] : [];
  }

  protected getAlternative(node: Parser.SyntaxNode): IfAlternative {
    if (node.type !== 'if_statement') {
      return null;
    }

    // In tree-sitter-python, elif and else are sibling children of if_statement:
    // if_statement {
    //   "if", condition, ":", block,
    //   elif_clause { "elif", condition, ":", block },
    //   elif_clause { ... },
    //   else_clause { "else", ":", block }
    // }
    //
    // We return the FIRST elif or else clause. The handleAlternativeChain in
    // baseAnalyzer will recursively call getAlternative on subsequent ones.
    // But since elif_clauses are siblings (not nested), we need a different approach:
    // Return all elif/else as a chain from this single if_statement.

    // Find the first elif_clause or else_clause
    let foundFirst = false;
    for (const child of node.children) {
      if (child.type === 'elif_clause') {
        if (!foundFirst) {
          foundFirst = true;
          const body = this.getElifBody(child);
          // For Python, we handle the ENTIRE elif/else chain here
          // by returning the first elif, and then the remaining ones
          // will be picked up through our special chain handling
          return { kind: 'elseif', node: child, body };
        }
      }
      if (child.type === 'else_clause') {
        const body = this.getElseClauseBody(child);
        return { kind: 'else', node: child, body };
      }
    }
    return null;
  }

  protected override getNextSiblingAlternative(
    ifStatement: Parser.SyntaxNode,
    afterNode: Parser.SyntaxNode,
  ): IfAlternative {
    let foundAfter = false;
    for (const child of ifStatement.children) {
      if (child.id === afterNode.id) {
        foundAfter = true;
        continue;
      }
      if (!foundAfter) {
        continue;
      }
      if (child.type === 'elif_clause') {
        return { kind: 'elseif', node: child, body: this.getElifBody(child) };
      }
      if (child.type === 'else_clause') {
        return { kind: 'else', node: child, body: this.getElseClauseBody(child) };
      }
    }
    return null;
  }

  private getElifBody(elifClause: Parser.SyntaxNode): Parser.SyntaxNode | null {
    // elif_clause structure: "elif" condition ":" block
    const consequence = elifClause.childForFieldName('consequence');
    if (consequence) {
      return consequence;
    }
    for (const child of elifClause.children) {
      if (child.type === 'block') {
        return child;
      }
    }
    return null;
  }

  private getElseClauseBody(elseClause: Parser.SyntaxNode): Parser.SyntaxNode | null {
    const body = elseClause.childForFieldName('body');
    if (body) {
      return body;
    }
    for (const child of elseClause.children) {
      if (child.type === 'block') {
        return child;
      }
    }
    return null;
  }

  protected getFunctionBody(functionNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
    return functionNode.childForFieldName('body');
  }
}
