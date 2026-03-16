import * as vscode from 'vscode';
import type { DocumentComplexityResult } from '../types/complexity';
import type { SmellResult } from '../smells/types';
import type { ParserManager } from '../core/parserManager';
import type { AnalyzerRegistry } from '../analyzers/registry';
import type { ConfigurationService } from './configurationService';
import { SmellRegistry } from '../smells/registry';

export class DocumentAnalysisService implements vscode.Disposable {
  private readonly _onDidAnalyze = new vscode.EventEmitter<DocumentComplexityResult>();
  readonly onDidAnalyze = this._onDidAnalyze.event;

  private resultCache = new Map<string, DocumentComplexityResult>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private disposables: vscode.Disposable[] = [];
  private smellRegistry: SmellRegistry;

  constructor(
    private parserManager: ParserManager,
    private analyzerRegistry: AnalyzerRegistry,
    private configService: ConfigurationService,
  ) {
    // Build initial smell registry from current config
    this.smellRegistry = this.buildSmellRegistry();

    // Analyze when a document is opened
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        this.analyzeIfSupported(doc);
      }),
    );

    // Analyze on text changes (debounced)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        this.scheduleAnalysis(e.document);
      }),
    );

    // Analyze immediately on save
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        this.cancelDebounce(doc.uri.toString());
        this.analyzeIfSupported(doc);
      }),
    );

    // Clean up when document is closed
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        const uri = doc.uri.toString();
        this.cancelDebounce(uri);
        this.resultCache.delete(uri);
        this.parserManager.clearTreeCache(uri);
      }),
    );

    // Re-analyze on config changes and rebuild smell registry with new thresholds
    this.disposables.push(
      this.configService.onDidChangeConfig(() => {
        this.smellRegistry = this.buildSmellRegistry();
        this.reanalyzeAll();
      }),
    );

    // Analyze all currently open documents
    for (const doc of vscode.workspace.textDocuments) {
      this.analyzeIfSupported(doc);
    }
  }

  private buildSmellRegistry(): SmellRegistry {
    const smellSettings = this.configService.getSmellSettings();
    return new SmellRegistry({
      maxParameters: smellSettings.maxParameters,
      maxNestingDepth: smellSettings.maxNestingDepth,
      maxReturns: smellSettings.maxReturns,
      maxSwitchCases: smellSettings.maxSwitchCases,
    });
  }

  getResult(uri: string): DocumentComplexityResult | null {
    return this.resultCache.get(uri) ?? null;
  }

  async analyzeDocument(document: vscode.TextDocument): Promise<DocumentComplexityResult | null> {
    const config = this.configService.getConfig();
    if (!config.enabled) {
      return null;
    }

    const analyzer = this.analyzerRegistry.getAnalyzer(document.languageId);
    if (!analyzer) {
      return null;
    }

    // Large file guard
    if (document.lineCount > config.largeFileThreshold && config.largeFileMode === 'disabled') {
      return null;
    }

    const wasmPath = this.analyzerRegistry.getWasmPath(document.languageId);
    if (!wasmPath) {
      return null;
    }

    try {
      const language = await this.parserManager.loadLanguage(wasmPath);
      const sourceCode = document.getText();
      const tree = this.parserManager.parse(
        document.uri.toString(),
        sourceCode,
        language,
      );

      const functions = analyzer.analyzeFunctions(tree, sourceCode, config.thresholds);

      // Run smell detectors if enabled
      let smells: SmellResult[] = [];
      if (config.smells.enabled) {
        const detectors = this.smellRegistry.getDetectors(document.languageId);
        for (const detector of detectors) {
          smells = smells.concat(detector.detect(tree, sourceCode));
        }
      }

      const result: DocumentComplexityResult = {
        uri: document.uri.toString(),
        languageId: document.languageId,
        functions,
        smells,
        analyzedAt: Date.now(),
      };

      this.resultCache.set(document.uri.toString(), result);
      this._onDidAnalyze.fire(result);
      return result;
    } catch (err) {
      console.error(`SonarComplexity: Failed to analyze ${document.uri.toString()}:`, err);
      return null;
    }
  }

  private scheduleAnalysis(document: vscode.TextDocument): void {
    const config = this.configService.getConfig();
    if (!config.enabled) {
      return;
    }

    // Large file guard: skip on-change for large files in saveOnly mode
    if (
      document.lineCount > config.largeFileThreshold &&
      config.largeFileMode === 'saveOnly'
    ) {
      return;
    }

    const uri = document.uri.toString();
    this.cancelDebounce(uri);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(uri);
      this.analyzeIfSupported(document);
    }, config.debounceMs);

    this.debounceTimers.set(uri, timer);
  }

  private analyzeIfSupported(document: vscode.TextDocument): void {
    const analyzer = this.analyzerRegistry.getAnalyzer(document.languageId);
    if (analyzer) {
      this.analyzeDocument(document);
    }
  }

  private reanalyzeAll(): void {
    for (const doc of vscode.workspace.textDocuments) {
      this.analyzeIfSupported(doc);
    }
  }

  private cancelDebounce(uri: string): void {
    const timer = this.debounceTimers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(uri);
    }
  }

  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.resultCache.clear();
    this._onDidAnalyze.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
