# SonarComplexity

A VS Code / Kiro extension that calculates **SonarQube Cognitive Complexity** (S3776) for functions and detects **code smells** in JavaScript, TypeScript, and Python — all powered by tree-sitter WASM with no native bindings.

---

## Features

### Cognitive Complexity Analysis (S3776)

Measures how hard a function is to understand, using the [SonarQube Cognitive Complexity](https://www.sonarsource.com/docs/CognitiveComplexity.pdf) algorithm. Unlike cyclomatic complexity, it penalises deeply nested logic and rewards simple control flow.

Three severity levels based on configurable thresholds (defaults: **<15 good**, **15–25 warning**, **>25 error**):

| Severity | Threshold | Indicator |
|----------|-----------|-----------|
| ✅ Good | < 15 | Green gutter dot |
| ⚠️ Warning | 15 – 25 | Yellow gutter dot |
| ❌ Error | > 25 | Red gutter dot |

### Display Modes

All three modes are active simultaneously and individually toggleable:

- **CodeLens** — `✔ Complexity: 4 [Good]` shown above each function declaration
- **Gutter icons** — Coloured dot in the editor gutter next to every function
- **Problems panel** — Warning/error diagnostics in the VS Code Problems tab (source: `SonarComplexity`, code: `S3776`)

### Code Smell Detection

Seven SonarQube pattern-matching rules run alongside complexity analysis:

| Rule | Name | Languages | Default Threshold |
|------|------|-----------|-------------------|
| S107 | Too many parameters | JS / TS / Python | 7 |
| S134 | Too deeply nested | JS / TS / Python | 4 levels |
| S3358 | Nested ternary | JS / TS / Python | — |
| S108 | Empty block | JS / TS / Python | — |
| S3699 | Too many returns | JS / TS / Python | 5 |
| S1126 | Return boolean literal | JS / TS / Python | — |
| S1479 | Too many switch cases | JS / TS only | 30 |

Smell diagnostics appear in the Problems panel alongside complexity diagnostics with their SonarQube rule code (e.g. `S107`).

---

## Supported Languages

| Language | Extension |
|----------|-----------|
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Python | `.py` |

---

## Installation

### From Open VSX (Kiro / VS Code)

Search for **SonarComplexity** in the Extensions panel, or install via the command palette:

```
ext install sonar-complexity.sonar-complexity
```

### From a `.vsix` file

```bash
code --install-extension sonar-complexity-0.1.0.vsix
```

---

## Configuration

All settings are under the `sonarComplexity` namespace in VS Code Settings (`Cmd+,`):

### Complexity

| Setting | Default | Description |
|---------|---------|-------------|
| `sonarComplexity.enabled` | `true` | Enable / disable all analysis |
| `sonarComplexity.thresholds.warning` | `15` | Score at which a function turns yellow |
| `sonarComplexity.thresholds.error` | `25` | Score at which a function turns red |
| `sonarComplexity.display.codeLens` | `true` | Show CodeLens above functions |
| `sonarComplexity.display.gutterIcons` | `true` | Show coloured gutter dots |
| `sonarComplexity.display.diagnostics` | `true` | Report issues in Problems panel |
| `sonarComplexity.debounceMs` | `300` | Delay (ms) before re-analysing after edits |
| `sonarComplexity.largeFileThreshold` | `10000` | Line count that triggers large-file mode |
| `sonarComplexity.largeFileMode` | `"saveOnly"` | `saveOnly` \| `disabled` \| `normal` |

### Code Smells

| Setting | Default | Description |
|---------|---------|-------------|
| `sonarComplexity.smells.enabled` | `true` | Enable / disable smell detection |
| `sonarComplexity.smells.maxParameters` | `7` | S107 threshold |
| `sonarComplexity.smells.maxNestingDepth` | `4` | S134 threshold |
| `sonarComplexity.smells.maxReturns` | `5` | S3699 threshold |
| `sonarComplexity.smells.maxSwitchCases` | `30` | S1479 threshold |

---

## Commands

| Command | Description |
|---------|-------------|
| `SonarComplexity: Analyze Current File` | Force re-analysis of the active file |
| `SonarComplexity: Toggle Enabled` | Quickly toggle the extension on/off |

---

## How Cognitive Complexity Is Calculated

The algorithm follows the [SonarQube specification](https://www.sonarsource.com/docs/CognitiveComplexity.pdf):

- **+1 per structural node** (`if`, `for`, `while`, `do`, `switch`, `catch`, ternary `?:`) plus **+1 per nesting level** it sits inside
- **+1 per fundamental node** (`else`, `elif`, labeled `break`/`continue`) — no nesting penalty
- **+1 per boolean operator sequence change** (e.g. `a && b && c` = +1, but `a && b || c` = +2)
- Nested functions reset the nesting counter and are scored independently
- Trivial single-expression arrow functions (e.g. `arr.map(x => x.id)`) are skipped

---

## How It Works

- Parsing is done with [web-tree-sitter](https://github.com/tree-sitter/tree-sitter) (WASM) — no native bindings, no Node.js version conflicts, works identically in VS Code and Kiro
- Grammar files (`.wasm`) are bundled in `resources/wasm/` — no network access required
- The extension is bundled with [esbuild](https://esbuild.github.io/) into a single `dist/extension.js` for fast startup
- Results are cached per document and debounced on keystrokes (configurable)

---

## Development

```bash
git clone https://github.com/kevinjshah2207/sonar-complexity.git
cd sonar-complexity
npm install

# Run tests (no VS Code needed)
npm run test:unit

# Build
npm run bundle

# Package
npm run package

# Install locally
code --install-extension sonar-complexity-0.1.0.vsix
```

### Project Structure

```
src/
├── analyzers/          # Cognitive complexity algorithm (BaseAnalyzer + JS/Python subclasses)
├── core/               # tree-sitter WASM lifecycle (ParserManager)
├── providers/          # VS Code UI (CodeLens, gutter icons, diagnostics)
├── services/           # Orchestration (DocumentAnalysisService, ConfigurationService)
├── smells/             # Code smell detectors (S107, S134, S3358, S108, S3699, S1126, S1479)
├── types/              # Shared TypeScript interfaces
└── extension.ts        # Entry point
```

---

## Contributing

Pull requests are welcome. For larger changes, please open an issue first.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes
4. Push and open a PR

---

## License

MIT — see [LICENSE](LICENSE)
