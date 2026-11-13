// Adds new house pictures to the Avatar shop. Run by "Add-New-Homes.bat" (or: node scripts/add-new-homes.mjs [--dry-run]).
//  1. looks in the Pic folder for pictures that are not numbered yet (e.g. Gemini_Generated_Image_xxx.jpg), oldest first
//  2. renames each one to the next number (0016.jpg, ...), copies it to public/images and lists it in src/homesExtra.json
//  3. commits and pushes only those files, so the site updates by itself and the houses appear in the shop
//  4. once the push has worked, deletes the numbered copies from the Pic folder (the pictures live on GitHub now)
// Names: a picture the teacher named herself ("Swiss Alpine Chalet.jpg") keeps that name; a Gemini_Generated... picture gets the next
// unused name from scripts/house-names.txt (draw in that order), or "House N" when the list has run out.
// Prices: HOME_COST (default for every new house) and HOME_PRICES (one price per picture, in order) come from Add-New-Homes.bat.
// A house can be owned by one student only; the shop shows at most 6 unsold houses at a time (see AvatarApp.jsx).
import { readdirSync, statSync, renameSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PIC = join(ROOT, 'Pic');
const IMAGES = join(ROOT, 'public', 'images');
const JSON_PATH = join(ROOT, 'src', 'homesExtra.json');
const NAMES_PATH = join(ROOT, 'scripts', 'house-names.txt');
const DEFAULT_COST = Math.max(0, parseInt(process.env.HOME_COST, 10) || 12000);
const PRICES = (process.env.HOME_PRICES || '').split(/[\s,]+/).filter(Boolean).map(n => parseInt(n, 10)).filter(n => n >= 0);
const dry = process.argv.includes('--dry-run');
const isPic = (f) => /\.(jpe?g|png|webp)$/i.test(f);
const numbered = (f) => /^\d{4}\.(jpe?g|png|webp)$/i.test(f);
const generic = (f) => /^(Gemini_Generated_Image|image|img|download|IMG_|Screenshot|ChatGPT)/i.test(f);

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const listNames = readFileSync(NAMES_PATH, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const usedNames = new Set(data.homes.map(h => h.name.toLowerCase()));
const nextListName = () => { const n = listNames.find(x => !usedNames.has(x.toLowerCase())); if (n) usedNames.add(n.toLowerCase()); return n; };
const taken = [...readdirSync(PIC), ...readdirSync(IMAGES)].filter(numbered).map(f => parseInt(f.slice(0, 4), 10));
let next = Math.max(0, ...taken) + 1;

const fresh = readdirSync(PIC).filter(f => isPic(f) && !numbered(f))
  .map(f => ({ f, t: statSync(join(PIC, f)).mtimeMs })).sort((a, b) => a.t - b.t).map(x => x.f);
if (!fresh.length) { console.log('No new pictures in the Pic folder (only numbered ones). Nothing to add.'); process.exit(0); }

const files = [], added = [], pics = [];
fresh.forEach((f, i) => {
  const num = String(next++).padStart(4, '0');
  const ext = extname(f).toLowerCase().replace('.jpeg', '.jpg');
  const newName = `${num}${ext}`;
  const own = basename(f, extname(f)).replace(/[_]+/g, ' ').trim();
  const name = !generic(f) ? own : (nextListName() || `House ${parseInt(num, 10)}`);
  if (!generic(f)) usedNames.add(name.toLowerCase());
  const cost = PRICES[i] ?? DEFAULT_COST;
  console.log(`${f}  ->  ${newName}   "${name}"   ${cost} coins`);
  if (!dry) {
    renameSync(join(PIC, f), join(PIC, newName));
    copyFileSync(join(PIC, newName), join(IMAGES, newName));
    data.homes.push({ id: `house-${num}`, name, image: `images/${newName}`, cost });
    files.push(`public/images/${newName}`); added.push(newName); pics.push(join(PIC, newName));
  }
});
if (dry) { console.log('(dry run: nothing changed)'); process.exit(0); }
writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n');
files.push('src/homesExtra.json');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' });
git('add', '--', ...files);
git('commit', '-m', `Avatar shop: new houses ${added.join(', ')}`, '--', ...files);
git('pull', '--rebase', '--autostash', 'origin', 'main');
git('push', 'origin', 'main');
pics.forEach(p => { try { unlinkSync(p); } catch { /* already gone */ } });
console.log(`\nDONE. ${added.length} new house(s) are on GitHub and were removed from the Pic folder. They appear in the shop in about 2-3 minutes.`);
