import type Parser from 'web-tree-sitter';
import { BaseAnalyzer, type LanguageNodeConfig, type IfAlternative } from './baseAnalyzer';

export class JavaScriptAnalyzer extends BaseAnalyzer {
  readonly supportedLanguageIds = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact',
  ];

  readonly wasmGrammarPath = 'tree-sitter-javascript.wasm';

  getWasmForLanguageId(languageId: string): string {
    switch (languageId) {
      case 'typescript':
        return 'tree-sitter-typescript.wasm';
      case 'typescriptreact':
        return 'tree-sitter-tsx.wasm';
      default:
        return 'tree-sitter-javascript.wasm';
    }
  }

  protected readonly config: LanguageNodeConfig = {
    functionNodeTypes: new Set([
      'function_declaration',
      'function_expression',
      'arrow_function',
      'method_definition',
      'generator_function_declaration',
      'generator_function',
    ]),
    structuralIncrementTypes: new Set([
      'if_statement',
      'for_statement',
      'for_in_statement',
      'while_statement',
      'do_statement',
      'switch_statement',
      'catch_clause',
      'ternary_expression',
    ]),
    booleanExpressionType: 'binary_expression',
    booleanOperators: new Set(['&&', '||', '??']),
  };

  protected getFunctionName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return nameNode.text;
    }

    if (node.parent?.type === 'variable_declarator') {
      const varName = node.parent.childForFieldName('name');
      if (varName) {
        return varName.text;
      }
    }

    if (node.parent?.type === 'assignment_expression') {
      const left = node.parent.childForFieldName('left');
      if (left) {
        return left.text;
      }
    }

    if (node.parent?.type === 'pair') {
      const key = node.parent.childForFieldName('key');
      if (key) {
        return key.text;
      }
    }

    return '<anonymous>';
  }

  protected isLabeledJump(node: Parser.SyntaxNode): boolean {
    if (node.type !== 'break_statement' && node.type !== 'continue_statement') {
      return false;
    }
    return node.childForFieldName('label') !== null;
  }

  protected getBodies(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    if (node.type === 'if_statement') {
      const c = node.childForFieldName('consequence');
      return c ? [c] : [];
    }
    if (node.type === 'ternary_expression') {
      const result: Parser.SyntaxNode[] = [];
      const c = node.childForFieldName('consequence');
      const a = node.childForFieldName('alternative');
      if (c) result.push(c);
      if (a) result.push(a);
      return result;
    }
    if (node.type === 'switch_statement' || node.type === 'catch_clause') {
      const b = node.childForFieldName('body');
      return b ? [b] : [];
    }
    // for, while, do: body field
    const b = node.childForFieldName('body');
    return b ? [b] : [];
  }

  protected getAlternative(node: Parser.SyntaxNode): IfAlternative {
    if (node.type === 'if_statement') {
      const alt = node.childForFieldName('alternative');
      if (!alt) {
        return null;
      }

      // In tree-sitter-javascript, the alternative can be:
      // 1. An else_clause containing a statement_block (plain else)
      // 2. An else_clause containing an if_statement (else-if)
      // 3. Directly an if_statement (else-if, in some grammar versions)
      if (alt.type === 'if_statement') {
        return { kind: 'elseif', node: alt, body: null };
      }

      if (alt.type === 'else_clause') {
        // Check if it contains an if_statement (else-if)
        const innerIf = alt.children.find((c) => c.type === 'if_statement');
        if (innerIf) {
          return { kind: 'elseif', node: innerIf, body: null };
        }
        // Plain else — the body is everything inside the else_clause
        return { kind: 'else', node: alt, body: alt };
      }

      // Fallback: treat as else
      return { kind: 'else', node: alt, body: alt };
    }

    if (node.type === 'ternary_expression') {
      // The "else" of a ternary is the alternative field
      const alt = node.childForFieldName('alternative');
      if (alt) {
        // Ternary alternative doesn't get a +1 for "else" — it's inherent
        // Actually, per SonarQube cognitive complexity, the entire ternary gets +1+nesting
        // and neither the consequence nor alternative gets additional increments.
        // So we return null here — both branches are handled in getConsequence context.
      }
      return null;
    }

    return null;
  }

  protected getFunctionBody(functionNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
    return functionNode.childForFieldName('body');
  }
}
