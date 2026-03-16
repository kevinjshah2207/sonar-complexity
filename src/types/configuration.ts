export interface ComplexityThresholds {
  warning: number;
  error: number;
}

export interface DisplaySettings {
  codeLens: boolean;
  gutterIcons: boolean;
  diagnostics: boolean;
}

export interface SmellSettings {
  enabled: boolean;
  maxParameters: number;    // S107
  maxNestingDepth: number;  // S134
  maxReturns: number;       // S3699
  maxSwitchCases: number;   // S1479
}

export interface SonarComplexityConfig {
  enabled: boolean;
  thresholds: ComplexityThresholds;
  display: DisplaySettings;
  smells: SmellSettings;
  debounceMs: number;
  largeFileThreshold: number;
  largeFileMode: 'saveOnly' | 'disabled' | 'normal';
}
