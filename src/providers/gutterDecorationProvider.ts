import * as vscode from 'vscode';
import type { DocumentAnalysisService } from '../services/documentAnalysisService';
import type { ConfigurationService } from '../services/configurationService';
import { ComplexitySeverity } from '../types/complexity';

export class GutterDecorationProvider implements vscode.Disposable {
  private goodDecoration: vscode.TextEditorDecorationType;
  private warningDecoration: vscode.TextEditorDecorationType;
  private errorDecoration: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor(
    _extensionPath: string,
    private analysisService: DocumentAnalysisService,
    private configService: ConfigurationService,
  ) {
    const afterStyle = { margin: '0 0 0 2em', fontStyle: 'italic', fontSize: '11px' };

    this.goodDecoration = vscode.window.createTextEditorDecorationType({
      after: afterStyle,
    });

    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      after: afterStyle,
    });

    this.errorDecoration = vscode.window.createTextEditorDecorationType({
      after: afterStyle,
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

    const goodDecorations: vscode.DecorationOptions[] = [];
    const warningDecorations: vscode.DecorationOptions[] = [];
    const errorDecorations: vscode.DecorationOptions[] = [];

    for (const fn of result.functions) {
      const range = new vscode.Range(fn.startLine, 0, fn.startLine, Number.MAX_SAFE_INTEGER);
      switch (fn.severity) {
        case ComplexitySeverity.Good:
          goodDecorations.push({
            range,
            renderOptions: { after: { contentText: ` ✔ ${fn.score}`, color: new vscode.ThemeColor('charts.green') } },
          });
          break;
        case ComplexitySeverity.Warning:
          warningDecorations.push({
            range,
            renderOptions: { after: { contentText: ` ⚠ ${fn.score}`, color: new vscode.ThemeColor('charts.yellow') } },
          });
          break;
        case ComplexitySeverity.Error:
          errorDecorations.push({
            range,
            renderOptions: { after: { contentText: ` ✖ ${fn.score}`, color: new vscode.ThemeColor('charts.red') } },
          });
          break;
      }
    }

    editor.setDecorations(this.goodDecoration, goodDecorations);
    editor.setDecorations(this.warningDecoration, warningDecorations);
    editor.setDecorations(this.errorDecoration, errorDecorations);
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
