// Generates public/downloads/VithiCitta.html -- a single, self-contained
// HTML file (React + Babel Standalone + Tailwind all from CDN, app source
// embedded inline) that a viewer can download and just double-click to
// open, no build step or dev server required. Bundles BOTH language
// versions behind the same language-picker/switch UI as the live
// vithicitta.html page, so downloading once covers both languages.
//
// Re-run this (`node scripts/build-vithicitta-standalone.mjs`) any time
// src/VithiCitta1App.jsx or src/VithiCitta2App.jsx changes, then commit the
// regenerated public/downloads/VithiCitta.html.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Both files declare their own top-level helpers under the same names
// (toMyanmarNum, CETASIKA_DICT, etc.) -- fine as separate ES modules on the
// live site, but this standalone file concatenates both into ONE inline
// <script>, so each has to be wrapped in its own IIFE to keep those names
// from colliding with each other.
function wrapAsIIFE(source) {
  const body = source
    .replace(/^import[^\n]*\n/gm, '') // no ES module imports inside a plain <script>
    .replace(/export default function App\s*\(/, 'function App(');
  return `(function () {\n${body}\nreturn App;\n})()`;
}

const myanmarSrc = wrapAsIIFE(readFileSync(join(root, 'src/VithiCitta1App.jsx'), 'utf8'));
const vietnameseSrc = wrapAsIIFE(readFileSync(join(root, 'src/VithiCitta2App.jsx'), 'utf8'));

const html = `<!doctype html>
<html lang="my">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vithi Citta</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
    <script>
      // lucide-react's UMD build (unlike React's own) reads the browser
      // global as lowercase \`react\`, not \`React\` -- without this line its
      // factory sees \`react\` as undefined and every icon export ends up
      // undefined too, so every <User/>, <Heart/>, etc. below throws
      // "User is not defined" the moment the app tries to render one.
      window.react = window.React;
    <\/script>
    <script src="https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.min.js"><\/script>
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
      Babel.registerPreset('vithicitta-react-classic', {
        presets: [[Babel.availablePresets['react'], { runtime: 'classic' }]],
      });
    <\/script>
    <script type="text/babel" data-presets="vithicitta-react-classic">
      const { useState, useRef, useEffect, useMemo } = React;
      // Both VithiCitta1App.jsx and VithiCitta2App.jsx import this exact
      // icon set from 'lucide-react' -- wrapAsIIFE strips that import line
      // (no ES modules in a plain <script>), so it's restored here once,
      // read off the LucideReact UMD global instead.
      const { Play, Pause, SkipForward, SkipBack, RotateCcw, Activity, Clock, Info, GripVertical, User, Heart, Cloud, Sun, Apple, Eye, Ear, Flower, Utensils, Brain, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Lock, Unlock, ChevronUp, Layers, Share2, ArrowDown } = LucideReact;

      const VithiCittaMy = ${myanmarSrc};
      const VithiCittaVi = ${vietnameseSrc};

      const LANGUAGES = [
        { key: 'my', label: 'မြန်မာ', Component: VithiCittaMy },
        { key: 'vi', label: 'Tiếng Việt', Component: VithiCittaVi },
      ];

      function VithiCittaApp() {
        const [lang, setLang] = useState(null);
        if (!lang) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
              <div className="max-w-sm w-full text-center space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">စိတ္တဝီထိ (Citta Vīthi) - တွေးခေါ်ဖြစ်စဉ်</h1>
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

      ReactDOM.createRoot(document.getElementById('root')).render(<VithiCittaApp />);
    <\/script>
  </body>
</html>
`;

mkdirSync(join(root, 'public/downloads'), { recursive: true });
writeFileSync(join(root, 'public/downloads/VithiCitta.html'), html, 'utf8');
console.log('Wrote public/downloads/VithiCitta.html (' + (html.length / 1024).toFixed(0) + ' KB)');
