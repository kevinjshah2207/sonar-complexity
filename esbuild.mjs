import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

const shared = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
};

// VS Code extension bundle
await esbuild.build({
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  external: ['vscode'],
});

// Standalone CLI bundle
await esbuild.build({
  ...shared,
  entryPoints: ['cli/index.ts'],
  outfile: 'dist/cli.js',
  banner: { js: '#!/usr/bin/env node' },
});
