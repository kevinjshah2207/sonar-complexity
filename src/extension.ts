import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ParserManager } from './core/parserManager';
import { AnalyzerRegistry } from './analyzers/registry';
import { ConfigurationService } from './services/configurationService';
import { DocumentAnalysisService } from './services/documentAnalysisService';
import { ComplexityCodeLensProvider } from './providers/codeLensProvider';
import { GutterDecorationProvider } from './providers/gutterDecorationProvider';
import { DiagnosticsProvider } from './providers/diagnosticsProvider';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const configService = new ConfigurationService();
  const parserManager = new ParserManager(context.extensionPath);
  const analyzerRegistry = new AnalyzerRegistry();

  try {
    await parserManager.initialize();
  } catch (err) {
    vscode.window.showErrorMessage(
      `SonarComplexity: Failed to initialize parser. ${err}`,
    );
    return;
  }

  const analysisService = new DocumentAnalysisService(
    parserManager,
    analyzerRegistry,
    configService,
  );

  // Register CodeLens provider for all supported languages
  const supportedLanguages = analyzerRegistry.getSupportedLanguageIds();
  const documentSelector: vscode.DocumentSelector = supportedLanguages.map(
    (lang) => ({ language: lang, scheme: 'file' }),
  );

  const codeLensProvider = new ComplexityCodeLensProvider(
    analysisService,
    configService,
  );

  const codeLensRegistration = vscode.languages.registerCodeLensProvider(
    documentSelector,
    codeLensProvider,
  );

  const gutterProvider = new GutterDecorationProvider(
    context.extensionPath,
    analysisService,
    configService,
  );

  const diagnosticsProvider = new DiagnosticsProvider(
    analysisService,
    configService,
  );

  // Register commands
  const analyzeCommand = vscode.commands.registerCommand(
    'sonarComplexity.analyzeCurrentFile',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor.');
        return;
      }
      const result = await analysisService.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(
          `SonarComplexity: Analyzed ${result.functions.length} function(s).`,
        );
      } else {
        vscode.window.showInformationMessage(
          'SonarComplexity: Language not supported or analysis disabled.',
        );
      }
    },
  );

  const toggleCommand = vscode.commands.registerCommand(
    'sonarComplexity.toggleEnabled',
    async () => {
      const config = vscode.workspace.getConfiguration('sonarComplexity');
      const current = config.get<boolean>('enabled', true);
      await config.update('enabled', !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `SonarComplexity: ${!current ? 'Enabled' : 'Disabled'}`,
      );
    },
  );

  const analyzeWorkspaceCommand = vscode.commands.registerCommand(
    'sonarComplexity.analyzeWorkspace',
    async () => {
      const config = vscode.workspace.getConfiguration('sonarComplexity');
      const includeFolders = config.get<string[]>('analysis.include', ['**']);

      const allFiles: vscode.Uri[] = [];
      for (const folder of includeFolders) {
        const pattern = folder === '**'
          ? '**/*.{js,jsx,ts,tsx,py}'
          : `${folder}/**/*.{js,jsx,ts,tsx,py}`;
        const found = await vscode.workspace.findFiles(pattern);
        allFiles.push(...found);
      }
      const files = [...new Map(allFiles.map(u => [u.fsPath, u])).values()];
      if (files.length === 0) {
        vscode.window.showInformationMessage('SonarComplexity: No supported files found.');
        return;
      }
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'SonarComplexity: Analyzing workspace...',
          cancellable: false,
        },
        async () => {
          const { analyzed } = await analysisService.analyzeWorkspaceFiles(files);
          vscode.window.showInformationMessage(
            `SonarComplexity: Analyzed ${analyzed} file(s). Check the Problems panel.`,
          );
        },
      );
    },
  );

  const exportProblemsCommand = vscode.commands.registerCommand(
    'sonarComplexity.exportProblems',
    async () => {
      const allDiagnostics = vscode.languages.getDiagnostics();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      const lines: string[] = [
        '# SonarComplexity — Problems Report',
        `Generated: ${new Date().toISOString()}`,
        '',
      ];

      let total = 0;
      for (const [uri, diagnostics] of allDiagnostics) {
        const sonar = diagnostics.filter(d => d.source === 'SonarComplexity');
        if (sonar.length === 0) { continue; }

        const relPath = workspaceRoot
          ? path.relative(workspaceRoot, uri.fsPath)
          : uri.fsPath;
        lines.push(`## ${relPath}`);

        for (const d of sonar) {
          const sev = d.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARN';
          const line = d.range.start.line + 1;
          lines.push(`- [${sev}] Line ${line}: ${d.message} (${d.code})`);
          total++;
        }
        lines.push('');
      }

      if (total === 0) {
        vscode.window.showInformationMessage(
          'SonarComplexity: No problems found. Run "Analyze Workspace" first.',
        );
        return;
      }

      lines.unshift(`Total issues: ${total}`, '');

      const outPath = workspaceRoot
        ? path.join(workspaceRoot, 'sonar-complexity-report.md')
        : path.join(require('os').tmpdir(), 'sonar-complexity-report.md');

      fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

      const open = await vscode.window.showInformationMessage(
        `SonarComplexity: Exported ${total} issue(s) to sonar-complexity-report.md`,
        'Open File',
      );
      if (open) {
        const doc = await vscode.workspace.openTextDocument(outPath);
        await vscode.window.showTextDocument(doc);
      }
    },
  );

  context.subscriptions.push(
    configService,
    analysisService,
    codeLensProvider,
    codeLensRegistration,
    gutterProvider,
    diagnosticsProvider,
    analyzeCommand,
    toggleCommand,
    analyzeWorkspaceCommand,
    exportProblemsCommand,
    { dispose: () => parserManager.dispose() },
  );
}

export function deactivate(): void {
  // Cleanup handled by context.subscriptions
}
