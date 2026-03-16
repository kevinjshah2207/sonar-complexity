import * as vscode from 'vscode';
import type { SonarComplexityConfig, ComplexityThresholds, DisplaySettings, SmellSettings } from '../types/configuration';

export class ConfigurationService implements vscode.Disposable {
  private readonly _onDidChangeConfig = new vscode.EventEmitter<SonarComplexityConfig>();
  readonly onDidChangeConfig = this._onDidChangeConfig.event;

  private disposable: vscode.Disposable;

  constructor() {
    this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('sonarComplexity')) {
        this._onDidChangeConfig.fire(this.getConfig());
      }
    });
  }

  getConfig(): SonarComplexityConfig {
    const config = vscode.workspace.getConfiguration('sonarComplexity');
    return {
      enabled: config.get<boolean>('enabled', true),
      thresholds: this.getThresholds(),
      display: this.getDisplaySettings(),
      smells: this.getSmellSettings(),
      debounceMs: config.get<number>('debounceMs', 300),
      largeFileThreshold: config.get<number>('largeFileThreshold', 10000),
      largeFileMode: config.get<'saveOnly' | 'disabled' | 'normal'>('largeFileMode', 'saveOnly'),
    };
  }

  getThresholds(): ComplexityThresholds {
    const config = vscode.workspace.getConfiguration('sonarComplexity');
    return {
      warning: config.get<number>('thresholds.warning', 15),
      error: config.get<number>('thresholds.error', 25),
    };
  }

  getDisplaySettings(): DisplaySettings {
    const config = vscode.workspace.getConfiguration('sonarComplexity');
    return {
      codeLens: config.get<boolean>('display.codeLens', true),
      gutterIcons: config.get<boolean>('display.gutterIcons', true),
      diagnostics: config.get<boolean>('display.diagnostics', true),
    };
  }

  getSmellSettings(): SmellSettings {
    const config = vscode.workspace.getConfiguration('sonarComplexity');
    return {
      enabled: config.get<boolean>('smells.enabled', true),
      maxParameters: config.get<number>('smells.maxParameters', 7),
      maxNestingDepth: config.get<number>('smells.maxNestingDepth', 4),
      maxReturns: config.get<number>('smells.maxReturns', 5),
      maxSwitchCases: config.get<number>('smells.maxSwitchCases', 30),
    };
  }

  dispose(): void {
    this._onDidChangeConfig.dispose();
    this.disposable.dispose();
  }
}
