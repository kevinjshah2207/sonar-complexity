import type Parser from 'web-tree-sitter';
import type { ILanguageAnalyzer } from '../types/language';
import type { FunctionComplexityResult, ComplexityIncrement } from '../types/complexity';
import { evaluateSeverity } from '../core/thresholdEvaluator';
import type { ComplexityThresholds } from '../types/configuration';

export interface LanguageNodeConfig {
  functionNodeTypes: Set<string>;
  structuralIncrementTypes: Set<string>;
  booleanExpressionType: string;
  booleanOperators: Set<string>;
}

export type IfAlternative =
  | { kind: 'elseif'; node: Parser.SyntaxNode; body: Parser.SyntaxNode | null }
  | { kind: 'else'; node: Parser.SyntaxNode; body: Parser.SyntaxNode | null }
  | null;

export abstract class BaseAnalyzer implements ILanguageAnalyzer {
  abstract readonly supportedLanguageIds: string[];
  abstract readonly wasmGrammarPath: string;

  protected abstract readonly config: LanguageNodeConfig;

  protected abstract getFunctionName(node: Parser.SyntaxNode): string;
  protected abstract isLabeledJump(node: Parser.SyntaxNode): boolean;

  /**
   * Get all body nodes of a structural node that should be walked at bodyNesting.
   * For if: [consequence]. For loops: [body]. For ternary: [consequence, alternative].
   */
  protected abstract getBodies(node: Parser.SyntaxNode): Parser.SyntaxNode[];

  /**
   * For if-like statements, get the alternative branch (else-if or else).
   * Returns null for non-if nodes or if there's no alternative.
   */
  protected abstract getAlternative(node: Parser.SyntaxNode): IfAlternative;

  /**
   * For Python-style grammars where elif/else are siblings:
   * get the next alternative after the given elif/else node.
   * Default returns null (JS-style where alternatives are nested).
   */
  protected getNextSiblingAlternative(
    _parentIfNode: Parser.SyntaxNode,
    _currentAltNode: Parser.SyntaxNode,
  ): IfAlternative {
    return null;
  }

  analyzeFunctions(
    tree: Parser.Tree,
    sourceCode: string,
    thresholds: ComplexityThresholds = { warning: 15, error: 25 },
  ): FunctionComplexityResult[] {
    const functionNodes = this.findFunctionNodes(tree.rootNode);
    return functionNodes
      .filter((fn) => !this.isTrivialFunction(fn))
      .map((fnNode) => this.analyzeOneFunction(fnNode, thresholds));
  }

  /**
   * Filter out trivial inline functions (single-expression arrow functions,
   * callbacks that span 1 line) to reduce visual noise.
   */
  private isTrivialFunction(node: Parser.SyntaxNode): boolean {
    if (node.type !== 'arrow_function') {
      return false;
    }
    // Single-line arrow function (no block body)
    const body = node.childForFieldName('body');
    if (body && body.type !== 'statement_block' && body.type !== 'block') {
      return true;
    }
    // Arrow function that fits on one line
    if (node.startPosition.row === node.endPosition.row) {
      return true;
    }
    return false;
  }

  private findFunctionNodes(rootNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const functions: Parser.SyntaxNode[] = [];
    const walk = (node: Parser.SyntaxNode) => {
      if (this.config.functionNodeTypes.has(node.type)) {
        functions.push(node);
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(rootNode);
    return functions;
  }

  private analyzeOneFunction(
    functionNode: Parser.SyntaxNode,
    thresholds: ComplexityThresholds,
  ): FunctionComplexityResult {
    const increments: ComplexityIncrement[] = [];
    let totalScore = 0;

    const addIncrement = (node: Parser.SyntaxNode, amount: number, reason: string) => {
      increments.push({
        line: node.startPosition.row,
        column: node.startPosition.column,
        amount,
        reason,
      });
      totalScore += amount;
    };

    const walk = (node: Parser.SyntaxNode, nestingLevel: number) => {
      // Skip nested function declarations — they get their own analysis
      if (this.config.functionNodeTypes.has(node.type) && node.id !== functionNode.id) {
        return;
      }

      // Handle boolean operator sequences
      if (node.type === this.config.booleanExpressionType && this.isBooleanOperatorNode(node)) {
        // Only process at outermost boolean expression level
        if (
          !node.parent ||
          node.parent.type !== this.config.booleanExpressionType ||
          !this.isBooleanOperatorNode(node.parent)
        ) {
          this.handleBooleanSequence(node, addIncrement);
        }
        this.walkBooleanOperands(node, nestingLevel, walk);
        return;
      }

      // Handle structural increment types (+1 + nesting)
      if (this.config.structuralIncrementTypes.has(node.type)) {
        this.handleStructuralNode(node, nestingLevel, false, addIncrement, walk);
        return;
      }

      // Handle labeled break/continue: +1 fundamental
      if (this.isLabeledJump(node)) {
        addIncrement(node, 1, '+1 labeled jump');
      }

      // Default: recurse into children at same nesting
      for (const child of node.children) {
        walk(child, nestingLevel);
      }
    };

    const body = this.getFunctionBody(functionNode);
    if (body) {
      for (const child of body.children) {
        walk(child, 0);
      }
    }

    return {
      functionName: this.getFunctionName(functionNode),
      startLine: functionNode.startPosition.row,
      endLine: functionNode.endPosition.row,
      startColumn: functionNode.startPosition.column,
      score: totalScore,
      increments,
      severity: evaluateSeverity(totalScore, thresholds),
    };
  }

  /**
   * Handle a structural node (if, for, while, switch, catch, ternary).
   * Also used recursively for else-if chains.
   *
   * @param isElseIf - If true, this node is an else-if and gets +1 fundamental (no nesting).
   */
  private handleStructuralNode(
    node: Parser.SyntaxNode,
    nestingLevel: number,
    isElseIf: boolean,
    addIncrement: (node: Parser.SyntaxNode, amount: number, reason: string) => void,
    walk: (node: Parser.SyntaxNode, nestingLevel: number) => void,
  ): void {
    // Add the increment
    if (isElseIf) {
      // else-if: +1 fundamental, no nesting penalty
      addIncrement(node, 1, '+1 else if');
    } else {
      // Structural: +1 + nesting
      const amount = 1 + nestingLevel;
      const label = node.type.replace(/_/g, ' ');
      addIncrement(
        node,
        amount,
        nestingLevel > 0 ? `+${amount} (nesting=${nestingLevel}) ${label}` : `+1 ${label}`,
      );
    }

    // The body nesting level:
    // - For else-if: same nesting as the original if's body (nestingLevel)
    // - For regular structural: nestingLevel + 1
    const bodyNesting = isElseIf ? nestingLevel : nestingLevel + 1;

    // Walk the consequence/body and any additional bodies (e.g., ternary alternative)
    const bodies = this.getBodies(node);
    for (const body of bodies) {
      if (body.childCount > 0) {
        for (const child of body.children) {
          walk(child, bodyNesting);
        }
      } else {
        // Leaf node (e.g., ternary operand that's a simple expression)
        walk(body, bodyNesting);
      }
    }

    // Handle if-chain: else-if / else alternatives
    this.handleAlternativeChain(node, bodyNesting, addIncrement, walk);
  }

  /**
   * Process the else-if / else chain of an if-like node.
   * bodyNesting is the nesting level used for the if/elif body content.
   */
  private handleAlternativeChain(
    node: Parser.SyntaxNode,
    bodyNesting: number,
    addIncrement: (node: Parser.SyntaxNode, amount: number, reason: string) => void,
    walk: (node: Parser.SyntaxNode, nestingLevel: number) => void,
  ): void {
    const alt = this.getAlternative(node);
    if (!alt) {
      return;
    }

    this.processAlternative(node, alt, bodyNesting, addIncrement, walk);
  }

  private processAlternative(
    parentIfNode: Parser.SyntaxNode,
    alt: NonNullable<IfAlternative>,
    bodyNesting: number,
    addIncrement: (node: Parser.SyntaxNode, amount: number, reason: string) => void,
    walk: (node: Parser.SyntaxNode, nestingLevel: number) => void,
  ): void {
    if (alt.kind === 'elseif') {
      if (this.config.structuralIncrementTypes.has(alt.node.type)) {
        // JS-style: the else-if IS an if_statement node, process it recursively
        this.handleStructuralNode(alt.node, bodyNesting, true, addIncrement, walk);
      } else {
        // Python-style: elif_clause is its own type
        addIncrement(alt.node, 1, '+1 elif');
        if (alt.body) {
          for (const child of alt.body.children) {
            walk(child, bodyNesting);
          }
        }
        // Continue the sibling chain (Python: elif/else are siblings under if_statement)
        const nextAlt = this.getNextSiblingAlternative(parentIfNode, alt.node);
        if (nextAlt) {
          this.processAlternative(parentIfNode, nextAlt, bodyNesting, addIncrement, walk);
        }
      }
    } else if (alt.kind === 'else') {
      addIncrement(alt.node, 1, '+1 else');
      if (alt.body) {
        for (const child of alt.body.children) {
          walk(child, bodyNesting);
        }
      }
    }
  }

  protected getFunctionBody(functionNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
    return functionNode.childForFieldName('body');
  }

  // --- Boolean operator handling ---

  private isBooleanOperatorNode(node: Parser.SyntaxNode): boolean {
    if (node.type !== this.config.booleanExpressionType) {
      return false;
    }
    const operator = node.childForFieldName('operator');
    if (operator) {
      return this.config.booleanOperators.has(operator.text);
    }
    for (const child of node.children) {
      if (this.config.booleanOperators.has(child.text)) {
        return true;
      }
    }
    return false;
  }

  private getOperatorText(node: Parser.SyntaxNode): string | null {
    const operator = node.childForFieldName('operator');
    if (operator && this.config.booleanOperators.has(operator.text)) {
      return operator.text;
    }
    for (const child of node.children) {
      if (this.config.booleanOperators.has(child.text)) {
        return child.text;
      }
    }
    return null;
  }

  private handleBooleanSequence(
    node: Parser.SyntaxNode,
    addIncrement: (node: Parser.SyntaxNode, amount: number, reason: string) => void,
  ): void {
    const operators: { op: string; node: Parser.SyntaxNode }[] = [];
    this.flattenBooleanOperators(node, operators);

    let lastOp: string | null = null;
    for (const { op, node: opNode } of operators) {
      if (op !== lastOp) {
        addIncrement(opNode, 1, `+1 ${op}`);
        lastOp = op;
      }
    }
  }

  private flattenBooleanOperators(
    node: Parser.SyntaxNode,
    result: { op: string; node: Parser.SyntaxNode }[],
  ): void {
    if (node.type !== this.config.booleanExpressionType) {
      return;
    }
    const op = this.getOperatorText(node);
    if (!op) {
      return;
    }

    const left = node.childForFieldName('left') ?? node.children[0];
    if (left?.type === this.config.booleanExpressionType && this.isBooleanOperatorNode(left)) {
      this.flattenBooleanOperators(left, result);
    }

    result.push({ op, node });

    const right = node.childForFieldName('right') ?? node.children[node.children.length - 1];
    if (right?.type === this.config.booleanExpressionType && this.isBooleanOperatorNode(right)) {
      this.flattenBooleanOperators(right, result);
    }
  }

  private walkBooleanOperands(
    node: Parser.SyntaxNode,
    nestingLevel: number,
    walk: (node: Parser.SyntaxNode, nestingLevel: number) => void,
  ): void {
    const left = node.childForFieldName('left') ?? node.children[0];
    const right = node.childForFieldName('right') ?? node.children[node.children.length - 1];

    if (left) {
      if (left.type === this.config.booleanExpressionType && this.isBooleanOperatorNode(left)) {
        this.walkBooleanOperands(left, nestingLevel, walk);
      } else {
        walk(left, nestingLevel);
      }
    }
    if (right) {
      if (right.type === this.config.booleanExpressionType && this.isBooleanOperatorNode(right)) {
        this.walkBooleanOperands(right, nestingLevel, walk);
      } else {
        walk(right, nestingLevel);
      }
    }
  }
}
