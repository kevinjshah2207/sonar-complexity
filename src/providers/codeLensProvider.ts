import * as vscode from 'vscode';
import type { DocumentAnalysisService } from '../services/documentAnalysisService';
import type { ConfigurationService } from '../services/configurationService';
import { ComplexitySeverity } from '../types/complexity';

const SEVERITY_LABELS: Record<ComplexitySeverity, string> = {
  [ComplexitySeverity.Good]: 'Good',
  [ComplexitySeverity.Warning]: 'Warning',
  [ComplexitySeverity.Error]: 'Error',
};

const SEVERITY_ICONS: Record<ComplexitySeverity, string> = {
  [ComplexitySeverity.Good]: '\u2714',    // checkmark
  [ComplexitySeverity.Warning]: '\u26A0',  // warning sign
  [ComplexitySeverity.Error]: '\u2716',    // heavy X
};

export class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private disposables: vscode.Disposable[] = [];

  constructor(
    private analysisService: DocumentAnalysisService,
    private configService: ConfigurationService,
  ) {
    this.disposables.push(
      this.analysisService.onDidAnalyze(() => {
        this._onDidChangeCodeLenses.fire();
      }),
    );
    this.disposables.push(
      this.configService.onDidChangeConfig(() => {
        this._onDidChangeCodeLenses.fire();
      }),
    );
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const display = this.configService.getDisplaySettings();
    if (!display.codeLens) {
      return [];
    }

    const result = this.analysisService.getResult(document.uri.toString());
    if (!result) {
      return [];
    }

    return result.functions.map((fn) => {
      const range = new vscode.Range(fn.startLine, 0, fn.startLine, 0);
      const icon = SEVERITY_ICONS[fn.severity];
      const label = SEVERITY_LABELS[fn.severity];
      const title = `${icon} Complexity: ${fn.score} [${label}]`;

      return new vscode.CodeLens(range, {
        title,
        command: '',
        tooltip: `Cognitive complexity of ${fn.functionName}: ${fn.score}`,
      });
    });
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
