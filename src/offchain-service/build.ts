await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  compile: true,
  minify: true,
  target: 'bun',
});
