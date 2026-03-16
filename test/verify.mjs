/**
 * Standalone verification script — runs without VS Code.
 * Usage: node test/verify.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Parser from 'web-tree-sitter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// We need to import compiled JS from dist/
const { JavaScriptAnalyzer } = await import(join(rootDir, 'dist', 'analyzers', 'javascriptAnalyzer.js'));
const { PythonAnalyzer } = await import(join(rootDir, 'dist', 'analyzers', 'pythonAnalyzer.js'));

// Initialize tree-sitter
const wasmDir = join(rootDir, 'resources', 'wasm');
await Parser.init({
  locateFile: (scriptName) => join(wasmDir, scriptName),
});

const parser = new Parser();

async function loadLanguage(wasmFile) {
  return Parser.Language.load(join(wasmDir, wasmFile));
}

function analyzeFile(filePath, analyzer, language, thresholds = { warning: 15, error: 25 }) {
  const source = readFileSync(filePath, 'utf-8');
  parser.setLanguage(language);
  const tree = parser.parse(source);
  return analyzer.analyzeFunctions(tree, source, thresholds);
}

// Test runner
let passed = 0;
let failed = 0;

function expectScore(label, result, functionName, expectedScore) {
  const fn = result.find((r) => r.functionName === functionName);
  if (!fn) {
    console.log(`  FAIL: ${label} — function "${functionName}" not found`);
    console.log(`    Found functions: ${result.map(r => r.functionName).join(', ')}`);
    failed++;
    return;
  }
  if (fn.score === expectedScore) {
    console.log(`  PASS: ${label} — ${functionName} = ${fn.score}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label} — ${functionName} = ${fn.score} (expected ${expectedScore})`);
    if (fn.increments.length > 0) {
      console.log(`    Increments:`);
      for (const inc of fn.increments) {
        console.log(`      Line ${inc.line + 1}: ${inc.reason} (${inc.amount})`);
      }
    }
    failed++;
  }
}

// --- JavaScript Tests ---
console.log('\n=== JavaScript Tests ===\n');
const jsLang = await loadLanguage('tree-sitter-javascript.wasm');
const jsAnalyzer = new JavaScriptAnalyzer();

const simpleJsPath = join(rootDir, 'test', 'fixtures', 'javascript', 'simple.js');
const simpleResults = analyzeFile(simpleJsPath, jsAnalyzer, jsLang);

expectScore('simple.js', simpleResults, 'empty', 0);
expectScore('simple.js', simpleResults, 'singleIf', 1);
expectScore('simple.js', simpleResults, 'ifElseIfElse', 3);
expectScore('simple.js', simpleResults, 'simpleLoop', 3);
expectScore('simple.js', simpleResults, 'booleanAnd', 1);
expectScore('simple.js', simpleResults, 'mixedBooleans', 2);
expectScore('simple.js', simpleResults, 'sameBooleans', 1);

const nestedJsPath = join(rootDir, 'test', 'fixtures', 'javascript', 'nested.js');
const nestedResults = analyzeFile(nestedJsPath, jsAnalyzer, jsLang);

expectScore('nested.js', nestedResults, 'deeplyNested', 10);
expectScore('nested.js', nestedResults, 'tryCatch', 6);

const edgeJsPath = join(rootDir, 'test', 'fixtures', 'javascript', 'edgeCases.js');
const edgeResults = analyzeFile(edgeJsPath, jsAnalyzer, jsLang);

expectScore('edgeCases.js', edgeResults, 'arrowSimple', 1);
// arrowExpr is filtered out (single-expression arrow function)
expectScore('edgeCases.js', edgeResults, 'outer', 1);
expectScore('edgeCases.js', edgeResults, 'inner', 1);
expectScore('edgeCases.js', edgeResults, 'switchExample', 1);
expectScore('edgeCases.js', edgeResults, 'nestedSwitch', 3);
expectScore('edgeCases.js', edgeResults, 'longElseIf', 5);
expectScore('edgeCases.js', edgeResults, 'mixedBoolSeq', 3);
expectScore('edgeCases.js', edgeResults, 'labeledBreak', 2);
expectScore('edgeCases.js', edgeResults, 'ternaryNested', 3);
expectScore('edgeCases.js', edgeResults, 'myMethod', 1);
expectScore('edgeCases.js', edgeResults, 'doWhile', 1);

// --- TypeScript Tests ---
console.log('\n=== TypeScript Tests ===\n');
const tsLang = await loadLanguage('tree-sitter-typescript.wasm');

const tsPath = join(rootDir, 'test', 'fixtures', 'typescript', 'basic.ts');
const tsResults = analyzeFile(tsPath, jsAnalyzer, tsLang);

expectScore('basic.ts', tsResults, 'typedFunction', 3);
expectScore('basic.ts', tsResults, 'arrowTyped', 1);

// --- Python Tests ---
console.log('\n=== Python Tests ===\n');
const pyLang = await loadLanguage('tree-sitter-python.wasm');
const pyAnalyzer = new PythonAnalyzer();

const simplePyPath = join(rootDir, 'test', 'fixtures', 'python', 'simple.py');
const pySimpleResults = analyzeFile(simplePyPath, pyAnalyzer, pyLang);

expectScore('simple.py', pySimpleResults, 'empty', 0);
expectScore('simple.py', pySimpleResults, 'single_if', 1);
expectScore('simple.py', pySimpleResults, 'if_elif_else', 3);
expectScore('simple.py', pySimpleResults, 'simple_loop', 3);
expectScore('simple.py', pySimpleResults, 'boolean_and', 1);
expectScore('simple.py', pySimpleResults, 'mixed_booleans', 2);

const nestedPyPath = join(rootDir, 'test', 'fixtures', 'python', 'nested.py');
const pyNestedResults = analyzeFile(nestedPyPath, pyAnalyzer, pyLang);

expectScore('nested.py', pyNestedResults, 'deeply_nested', 10);
expectScore('nested.py', pyNestedResults, 'try_except', 6);

const edgePyPath = join(rootDir, 'test', 'fixtures', 'python', 'edgeCases.py');
const pyEdgeResults = analyzeFile(edgePyPath, pyAnalyzer, pyLang);

expectScore('edgeCases.py', pyEdgeResults, 'long_elif', 5);
expectScore('edgeCases.py', pyEdgeResults, 'outer_func', 1);
expectScore('edgeCases.py', pyEdgeResults, 'inner_func', 1);
expectScore('edgeCases.py', pyEdgeResults, 'complex_func', 14);
expectScore('edgeCases.py', pyEdgeResults, 'mixed_bool', 3);

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
