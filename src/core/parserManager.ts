import * as path from 'path';
import Parser from 'web-tree-sitter';

export class ParserManager {
  private parser: Parser | null = null;
  private languageCache = new Map<string, Parser.Language>();
  private treeCache = new Map<string, Parser.Tree>();
  private wasmDir: string;

  constructor(extensionPath: string) {
    this.wasmDir = path.join(extensionPath, 'resources', 'wasm');
  }

  async initialize(): Promise<void> {
    await Parser.init({
      locateFile: (scriptName: string) => {
        return path.join(this.wasmDir, scriptName);
      },
    });
    this.parser = new Parser();
  }

  async loadLanguage(wasmFileName: string): Promise<Parser.Language> {
    const cached = this.languageCache.get(wasmFileName);
    if (cached) {
      return cached;
    }

    const wasmPath = path.join(this.wasmDir, wasmFileName);
    const language = await Parser.Language.load(wasmPath);
    this.languageCache.set(wasmFileName, language);
    return language;
  }

  parse(uri: string, sourceCode: string, language: Parser.Language): Parser.Tree {
    if (!this.parser) {
      throw new Error('ParserManager not initialized. Call initialize() first.');
    }

    this.parser.setLanguage(language);

    const oldTree = this.treeCache.get(uri);
    const tree = this.parser.parse(sourceCode, oldTree);
    this.treeCache.set(uri, tree);
    return tree;
  }

  clearTreeCache(uri: string): void {
    this.treeCache.delete(uri);
  }

  dispose(): void {
    this.treeCache.clear();
    this.languageCache.clear();
    if (this.parser) {
      this.parser.delete();
      this.parser = null;
    }
  }
}
