import * as fs from 'fs';
import * as path from 'path';
import { ParserManager } from '../src/core/parserManager';
import { AnalyzerRegistry } from '../src/analyzers/registry';
import { SmellRegistry } from '../src/smells/registry';
import type { FunctionComplexityResult } from '../src/types/complexity';
import type { SmellResult } from '../src/smells/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXT_TO_LANG: Record<string, string> = {
  '.js':  'javascript',
  '.jsx': 'javascriptreact',
  '.ts':  'typescript',
  '.tsx': 'typescriptreact',
  '.py':  'python',
};

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'htmlcov',
  '__pycache__', '.git', '.venv', 'venv', '.pytest_cache', '.mypy_cache',
]);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  include:   string[];
  warning:   number;
  error:     number;
  format:    'json' | 'markdown' | 'text';
  out:       string | null;
  smells:    boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const include: string[] = [];
  let warning = 10;
  let error   = 16;
  let format: 'json' | 'markdown' | 'text' = 'json';
  let out: string | null = null;
  let smells = true;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--include' || a === '-i') && args[i + 1]) {
      include.push(args[++i]);
    } else if (a === '--warning' && args[i + 1]) {
      warning = parseInt(args[++i], 10);
    } else if (a === '--error' && args[i + 1]) {
      error = parseInt(args[++i], 10);
    } else if ((a === '--format' || a === '-f') && args[i + 1]) {
      format = args[++i] as 'json' | 'markdown' | 'text';
    } else if ((a === '--out' || a === '-o') && args[i + 1]) {
      out = args[++i];
    } else if (a === '--no-smells') {
      smells = false;
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else if (a === '--version' || a === '-v') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')) as { version: string };
      console.log(pkg.version);
      process.exit(0);
    } else if (!a.startsWith('-')) {
      include.push(a); // positional arg treated as folder
    }
  }

  return {
    include: include.length > 0 ? include : ['.'],
    warning,
    error,
    format,
    out,
    smells,
  };
}

function printHelp(): void {
  console.log(`
SonarComplexity CLI — SonarQube Cognitive Complexity analyzer

Usage:
  sonar-complexity [options]

Options:
  --include, -i <folder>   Folder(s) to analyze (repeatable). Default: current directory
  --warning <n>            Warning threshold (default: 10)
  --error   <n>            Error threshold   (default: 16)
  --format, -f <fmt>       Output format: json | markdown | text (default: json)
  --out,    -o <file>      Write output to file instead of stdout
  --no-smells              Disable code smell detection
  --version, -v            Show version
  --help,   -h             Show this help

Examples:
  sonar-complexity --include src --format markdown --out report.md
  sonar-complexity --include src --include lib --format json
  sonar-complexity --warning 8 --error 15 --include src
`);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) { return results; }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) { continue; }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) { results.push(...findFiles(full)); }
    } else if (entry.isFile() && EXT_TO_LANG[path.extname(entry.name)]) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

interface FileResult {
  file:      string;
  language:  string;
  functions: FunctionComplexityResult[];
  smells:    SmellResult[];
}

// ---------------------------------------------------------------------------
// Output formatters
// ---------------------------------------------------------------------------

function toJson(results: FileResult[], thresholds: { warning: number; error: number }): string {
  return JSON.stringify({ thresholds, results }, null, 2) + '\n';
}

function toMarkdown(results: FileResult[], thresholds: { warning: number; error: number }): string {
  const lines: string[] = [];
  let errors = 0;
  let warnings = 0;

  for (const r of results) {
    const hasIssues =
      r.functions.some(f => f.score >= thresholds.warning) || r.smells.length > 0;
    if (!hasIssues) { continue; }

    lines.push(`## ${r.file}`);

    for (const fn of r.functions) {
      if (fn.score >= thresholds.error) {
        lines.push(`- ❌ \`${fn.functionName}\` — complexity ${fn.score} (line ${fn.startLine}) [S3776]`);
        errors++;
      } else if (fn.score >= thresholds.warning) {
        lines.push(`- ⚠️ \`${fn.functionName}\` — complexity ${fn.score} (line ${fn.startLine}) [S3776]`);
        warnings++;
      }
    }

    for (const s of r.smells) {
      lines.push(`- ⚠️ Line ${s.line}: ${s.message} [${s.ruleId}]`);
      warnings++;
    }

    lines.push('');
  }

  const header = [
    '# SonarComplexity Report',
    `Generated: ${new Date().toISOString()}`,
    `Thresholds: warning ≥ ${thresholds.warning}, error ≥ ${thresholds.error}`,
    `**${errors} error(s), ${warnings} warning(s)**`,
    '',
  ];

  return [...header, ...lines].join('\n');
}

function toText(results: FileResult[], thresholds: { warning: number; error: number }): string {
  const lines: string[] = [];
  let total = 0;

  for (const r of results) {
    for (const fn of r.functions) {
      const sev = fn.score >= thresholds.error ? 'ERROR' : fn.score >= thresholds.warning ? 'WARN ' : null;
      if (sev) {
        lines.push(`${sev}  ${r.file}:${fn.startLine}  ${fn.functionName}  complexity=${fn.score}  [S3776]`);
        total++;
      }
    }
    for (const s of r.smells) {
      lines.push(`WARN   ${r.file}:${s.line}  ${s.message}  [${s.ruleId}]`);
      total++;
    }
  }

  lines.push(`\n${total} issue(s) found.`);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  // Collect files
  const allFiles: string[] = [];
  for (const folder of opts.include) {
    allFiles.push(...findFiles(path.resolve(folder)));
  }

  if (allFiles.length === 0) {
    process.stderr.write('SonarComplexity: No supported files found.\n');
    process.exit(1);
  }

  // Bootstrap analysis pipeline — WASM files live next to the CLI in resources/wasm/
  const packageRoot   = path.resolve(__dirname, '..');
  const parserManager = new ParserManager(packageRoot);
  const analyzers     = new AnalyzerRegistry();
  const smellRegistry = opts.smells ? new SmellRegistry() : null;
  const thresholds    = { warning: opts.warning, error: opts.error };

  await parserManager.initialize();

  const results: FileResult[] = [];

  for (const filePath of allFiles) {
    const languageId = EXT_TO_LANG[path.extname(filePath)];
    const analyzer   = analyzers.getAnalyzer(languageId);
    const wasmPath   = analyzers.getWasmPath(languageId);
    if (!analyzer || !wasmPath) { continue; }

    try {
      const source   = fs.readFileSync(filePath, 'utf8');
      const language = await parserManager.loadLanguage(wasmPath);
      const tree     = parserManager.parse(filePath, source, language);
      const functions = analyzer.analyzeFunctions(tree, source, thresholds);

      const smells: SmellResult[] = [];
      if (smellRegistry) {
        for (const detector of smellRegistry.getDetectors(languageId)) {
          smells.push(...detector.detect(tree, source));
        }
      }

      results.push({ file: filePath, language: languageId, functions, smells });
    } catch (err) {
      process.stderr.write(`SonarComplexity: Failed to analyze ${filePath}: ${err}\n`);
    }
  }

  parserManager.dispose();

  // Render output
  let output: string;
  if (opts.format === 'markdown') { output = toMarkdown(results, thresholds); }
  else if (opts.format === 'text') { output = toText(results, thresholds); }
  else { output = toJson(results, thresholds); }

  if (opts.out) {
    fs.writeFileSync(opts.out, output, 'utf8');
    process.stderr.write(`SonarComplexity: Results written to ${opts.out}\n`);
  } else {
    process.stdout.write(output);
  }

  // Exit 1 if any function breaches the error threshold
  const hasErrors = results.some(r => r.functions.some(f => f.score >= thresholds.error));
  process.exit(hasErrors ? 1 : 0);
}

main().catch(err => {
  process.stderr.write(`SonarComplexity CLI error: ${err}\n`);
  process.exit(1);
});
