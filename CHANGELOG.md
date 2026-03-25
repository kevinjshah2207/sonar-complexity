# Changelog

## 0.1.7

- Fix workspace analysis not finding files — call findFiles per extension instead of brace expansion

## 0.1.6

- Fix "Analyze Workspace" not finding files when sonarComplexity.analysis.include is set

## 0.1.5

- Add `sonarComplexity.analysis.include` setting to target specific folders for workspace analysis (defaults to entire workspace)
- Add "SonarComplexity: Export Problems to File" command — writes all issues to `sonar-complexity-report.md` for use with Kiro via `@file`

## 0.1.4

- Update README to reflect new thresholds, inline indicators, and Analyze Workspace command

## 0.1.3

- Replace gutter icons with inline complexity indicators shown to the right of each function declaration
- Add "SonarComplexity: Analyze Workspace" command to analyze all supported files and populate Problems panel
- Align default thresholds with SonarQube S3776: warning at 10 (heads-up), error at 16 (SonarQube violation)

## 0.1.2

- Change publisher to kevinjshah2207 (personal namespace on OpenVSX)

## 0.1.1

- Add README with full feature documentation
- Add repository field to package.json

## 0.1.0

- Initial release
- Cognitive complexity analysis (SonarQube S3776) for JavaScript, TypeScript, and Python
- CodeLens display above functions with severity indicator
- Gutter icons (green/yellow/red) next to function declarations
- Problems panel diagnostics for functions exceeding thresholds
- Configurable thresholds (default: warning at 15, error at 25)
- Large file optimization (save-only mode for files over 10,000 lines)
