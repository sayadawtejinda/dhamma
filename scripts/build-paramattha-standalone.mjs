// Generates public/downloads/Paramattha.html -- ONE self-contained HTML file with the whole Paramattha page
// (Myanmar / English / Vietnamese, same 🌐 switch as the live paramattha.html). The app is bundled with esbuild
// (React included), so the only thing it loads from the internet is the Tailwind CDN script for styling.
//
// Re-run (`node scripts/build-paramattha-standalone.mjs`) after any change under src/Paramattha*.jsx,
// src/paramattha*.js or src/vithiCittaEnglish*.js, then commit the regenerated public/downloads/Paramattha.html.
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [join(root, 'src/paramattha-main.jsx')],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  charset: 'utf8',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.js': 'jsx' },
  logLevel: 'error',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\/script');

const html = `<!doctype html>
<html lang="my">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paramattha</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`;

mkdirSync(join(root, 'public/downloads'), { recursive: true });
writeFileSync(join(root, 'public/downloads/Paramattha.html'), html, 'utf8');
console.log('Wrote public/downloads/Paramattha.html (' + (html.length / 1024).toFixed(0) + ' KB)');
