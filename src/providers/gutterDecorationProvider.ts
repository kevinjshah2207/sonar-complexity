import * as vscode from 'vscode';
import * as path from 'path';
import type { DocumentAnalysisService } from '../services/documentAnalysisService';
import type { ConfigurationService } from '../services/configurationService';
import { ComplexitySeverity } from '../types/complexity';

export class GutterDecorationProvider implements vscode.Disposable {
  private goodDecoration: vscode.TextEditorDecorationType;
  private warningDecoration: vscode.TextEditorDecorationType;
  private errorDecoration: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor(
    extensionPath: string,
    private analysisService: DocumentAnalysisService,
    private configService: ConfigurationService,
  ) {
    const iconsDir = path.join(extensionPath, 'resources', 'icons');

    this.goodDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: path.join(iconsDir, 'complexity-good.svg'),
      gutterIconSize: '80%',
    });

    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: path.join(iconsDir, 'complexity-warning.svg'),
      gutterIconSize: '80%',
    });

    this.errorDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: path.join(iconsDir, 'complexity-error.svg'),
      gutterIconSize: '80%',
    });

    this.disposables.push(
      this.analysisService.onDidAnalyze(() => {
        this.updateActiveEditor();
      }),
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateActiveEditor();
      }),
    );

    this.disposables.push(
      this.configService.onDidChangeConfig(() => {
        this.updateActiveEditor();
      }),
    );

    // Initial update
    this.updateActiveEditor();
  }

  private updateActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const display = this.configService.getDisplaySettings();
    if (!display.gutterIcons) {
      editor.setDecorations(this.goodDecoration, []);
      editor.setDecorations(this.warningDecoration, []);
      editor.setDecorations(this.errorDecoration, []);
      return;
    }

    const result = this.analysisService.getResult(editor.document.uri.toString());
    if (!result) {
      editor.setDecorations(this.goodDecoration, []);
      editor.setDecorations(this.warningDecoration, []);
      editor.setDecorations(this.errorDecoration, []);
      return;
    }

    const goodRanges: vscode.Range[] = [];
    const warningRanges: vscode.Range[] = [];
    const errorRanges: vscode.Range[] = [];

    for (const fn of result.functions) {
      const range = new vscode.Range(fn.startLine, 0, fn.startLine, 0);
      switch (fn.severity) {
        case ComplexitySeverity.Good:
          goodRanges.push(range);
          break;
        case ComplexitySeverity.Warning:
          warningRanges.push(range);
          break;
        case ComplexitySeverity.Error:
          errorRanges.push(range);
          break;
      }
    }

    editor.setDecorations(this.goodDecoration, goodRanges);
    editor.setDecorations(this.warningDecoration, warningRanges);
    editor.setDecorations(this.errorDecoration, errorRanges);
  }

  dispose(): void {
    this.goodDecoration.dispose();
    this.warningDecoration.dispose();
    this.errorDecoration.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
