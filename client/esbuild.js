const esbuild = require('esbuild')

esbuild.buildSync({
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  external: ['vscode'],
  target: ['es2020', 'node14'],
  platform: 'node',
  bundle: true,
  minify: true,
})
