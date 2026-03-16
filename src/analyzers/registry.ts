import type { ILanguageAnalyzer } from '../types/language';
import { JavaScriptAnalyzer } from './javascriptAnalyzer';
import { PythonAnalyzer } from './pythonAnalyzer';

export class AnalyzerRegistry {
  private analyzers: ILanguageAnalyzer[] = [];
  private languageMap = new Map<string, ILanguageAnalyzer>();

  constructor() {
    this.register(new JavaScriptAnalyzer());
    this.register(new PythonAnalyzer());
  }

  private register(analyzer: ILanguageAnalyzer): void {
    this.analyzers.push(analyzer);
    for (const langId of analyzer.supportedLanguageIds) {
      this.languageMap.set(langId, analyzer);
    }
  }

  getAnalyzer(languageId: string): ILanguageAnalyzer | undefined {
    return this.languageMap.get(languageId);
  }

  getSupportedLanguageIds(): string[] {
    return Array.from(this.languageMap.keys());
  }

  getWasmPath(languageId: string): string | undefined {
    const analyzer = this.languageMap.get(languageId);
    if (!analyzer) {
      return undefined;
    }
    // Use language-specific WASM if available (e.g., TypeScript vs JavaScript)
    if ('getWasmForLanguageId' in analyzer) {
      return (analyzer as { getWasmForLanguageId: (id: string) => string }).getWasmForLanguageId(languageId);
    }
    return analyzer.wasmGrammarPath;
  }
}
