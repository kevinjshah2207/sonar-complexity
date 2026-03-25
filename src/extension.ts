import * as vscode from 'vscode';
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
      const files = await vscode.workspace.findFiles(
        '{**/*.js,**/*.jsx,**/*.ts,**/*.tsx,**/*.py}',
        '{**/node_modules/**,**/dist/**,**/build/**,.git/**}',
      );
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
    { dispose: () => parserManager.dispose() },
  );
}

export function deactivate(): void {
  // Cleanup handled by context.subscriptions
}
