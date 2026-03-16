export interface SmellResult {
  ruleId: string;
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: 'warning' | 'info';
}

export interface DocumentSmellResult {
  uri: string;
  smells: SmellResult[];
}
