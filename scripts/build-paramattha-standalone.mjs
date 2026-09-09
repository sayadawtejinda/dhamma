// Generates public/downloads/Paramattha.html -- a single, self-contained
// HTML file (React + Babel Standalone + Tailwind all from CDN, app source
// embedded inline) that a viewer can download and just double-click to
// open, no build step or dev server required. Bundles BOTH language
// versions behind the same language-picker/switch UI as the live
// paramattha.html page, so downloading once covers both languages.
//
// Re-run this (`node scripts/build-paramattha-standalone.mjs`) any time
// src/Paramattha1App.jsx or src/Paramattha2App.jsx changes, then commit the
// regenerated public/downloads/Paramattha.html.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Both files declare their own top-level helpers under the same names
// (toMyanmar, CITTAS, etc.) -- fine as separate ES modules on the live
// site, but this standalone file concatenates both into ONE inline
// <script>, so each has to be wrapped in its own IIFE to keep those names
// from colliding with each other.
function wrapAsIIFE(source) {
  const body = source
    .replace(/^import[^\n]*\n/gm, '') // no ES module imports inside a plain <script>
    .replace(/export default function App\s*\(/, 'function App(');
  return `(function () {\n${body}\nreturn App;\n})()`;
}

const myanmarSrc = wrapAsIIFE(readFileSync(join(root, 'src/Paramattha1App.jsx'), 'utf8'));
const vietnameseSrc = wrapAsIIFE(readFileSync(join(root, 'src/Paramattha2App.jsx'), 'utf8'));

const html = `<!doctype html>
<html lang="my">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paramattha</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
    <script src="https://cdn.tailwindcss.com"><\/script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Babel Standalone's "react" preset defaults to the automatic JSX
      // runtime, which emits \`import ... from "react/jsx-runtime"\` --
      // there's no module loader for that here, so this forces the
      // classic runtime (plain React.createElement calls) instead.
      Babel.registerPreset('paramattha-react-classic', {
        presets: [[Babel.availablePresets['react'], { runtime: 'classic' }]],
      });
    <\/script>
    <script type="text/babel" data-presets="paramattha-react-classic">
      const { useState, useRef, useEffect } = React;

      const ParamatthaMy = ${myanmarSrc};
      const ParamatthaVi = ${vietnameseSrc};

      const LANGUAGES = [
        { key: 'my', label: 'မြန်မာ', Component: ParamatthaMy },
        { key: 'vi', label: 'Tiếng Việt', Component: ParamatthaVi },
      ];

      function ParamatthaApp() {
        const [lang, setLang] = useState(null);
        if (!lang) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
              <div className="max-w-sm w-full text-center space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">အဘိဓမ္မာ ပရမတ္ထတရား (၄) ပါး</h1>
                <p className="text-slate-500 text-sm">Choose a language / ဘာသာစကားရွေးပါ / Chọn ngôn ngữ</p>
                <div className="space-y-3">
                  {LANGUAGES.map(l => (
                    <button key={l.key} onClick={() => setLang(l.key)}
                      className="w-full py-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 font-bold text-lg text-slate-700 transition-colors">
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        const Active = LANGUAGES.find(l => l.key === lang)?.Component;
        return (
          <div className="relative">
            <button onClick={() => setLang(null)}
              className="fixed top-3 left-3 z-[10000] bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg">
              🌐 {LANGUAGES.find(l => l.key === lang)?.label}
            </button>
            <Active />
          </div>
        );
      }

      ReactDOM.createRoot(document.getElementById('root')).render(<ParamatthaApp />);
    <\/script>
  </body>
</html>
`;

mkdirSync(join(root, 'public/downloads'), { recursive: true });
writeFileSync(join(root, 'public/downloads/Paramattha.html'), html, 'utf8');
console.log('Wrote public/downloads/Paramattha.html (' + (html.length / 1024).toFixed(0) + ' KB)');
