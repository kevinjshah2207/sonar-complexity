import * as vscode from 'vscode';
import type { DocumentAnalysisService } from '../services/documentAnalysisService';
import type { ConfigurationService } from '../services/configurationService';
import { ComplexitySeverity, type DocumentComplexityResult } from '../types/complexity';

export class DiagnosticsProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private analysisService: DocumentAnalysisService,
    private configService: ConfigurationService,
  ) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('sonarComplexity');

    this.disposables.push(
      this.analysisService.onDidAnalyze((result) => {
        this.updateDiagnostics(result);
      }),
    );

    this.disposables.push(
      this.configService.onDidChangeConfig(() => {
        // Re-publish diagnostics for all cached results
        for (const doc of vscode.workspace.textDocuments) {
          const result = this.analysisService.getResult(doc.uri.toString());
          if (result) {
            this.updateDiagnostics(result);
          }
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      }),
    );
  }

  private updateDiagnostics(result: DocumentComplexityResult): void {
    const display = this.configService.getDisplaySettings();
    const uri = vscode.Uri.parse(result.uri);

    if (!display.diagnostics) {
      this.diagnosticCollection.delete(uri);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    // --- Complexity diagnostics (S3776) ---
    for (const fn of result.functions) {
      // Only create diagnostics for warning and error severity
      if (fn.severity === ComplexitySeverity.Good) {
        continue;
      }

      const range = new vscode.Range(
        fn.startLine,
        fn.startColumn,
        fn.startLine,
        fn.startColumn + fn.functionName.length,
      );

      const severity =
        fn.severity === ComplexitySeverity.Error
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning;

      const thresholds = this.configService.getThresholds();
      const threshold =
        fn.severity === ComplexitySeverity.Error
          ? thresholds.error
          : thresholds.warning;

      const diagnostic = new vscode.Diagnostic(
        range,
        `Cognitive complexity of "${fn.functionName}" is ${fn.score} (threshold: ${threshold}). Consider refactoring.`,
        severity,
      );
      diagnostic.source = 'SonarComplexity';
      diagnostic.code = 'S3776';
      diagnostics.push(diagnostic);
    }

    // --- Code smell diagnostics ---
    const smellSettings = this.configService.getSmellSettings();
    if (smellSettings.enabled) {
      for (const smell of result.smells ?? []) {
        const range = new vscode.Range(
          smell.line,
          smell.column,
          smell.endLine,
          smell.endColumn,
        );

        const severity =
          smell.severity === 'warning'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;

        const diag = new vscode.Diagnostic(range, smell.message, severity);
        diag.source = 'SonarComplexity';
        diag.code = smell.ruleId;
        diagnostics.push(diag);
      }
    }

    this.diagnosticCollection.set(uri, diagnostics);
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
