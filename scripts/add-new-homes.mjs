// Adds new house pictures to the Avatar shop. Run by "Add-New-Homes.bat" (or: node scripts/add-new-homes.mjs [--dry-run]).
//  1. looks in the Pic folder for pictures that are not numbered yet (e.g. Gemini_Generated_Image_xxx.jpg), oldest first
//  2. renames each one to the next number (0010.jpg, 0011.jpg, ...), copies it to public/images and lists it in src/homesExtra.json
//  3. commits and pushes only those files, so the site updates by itself and the houses appear in the shop
// A house can be owned by one student only; the shop shows at most 6 unsold houses at a time (see AvatarApp.jsx).
import { readdirSync, statSync, renameSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PIC = join(ROOT, 'Pic');
const IMAGES = join(ROOT, 'public', 'images');
const JSON_PATH = join(ROOT, 'src', 'homesExtra.json');
const DEFAULT_COST = 12000;
const dry = process.argv.includes('--dry-run');
const isPic = (f) => /\.(jpe?g|png|webp)$/i.test(f);
const numbered = (f) => /^\d{4}\.(jpe?g|png|webp)$/i.test(f);

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const taken = [...readdirSync(PIC), ...readdirSync(IMAGES)].filter(numbered).map(f => parseInt(f.slice(0, 4), 10));
let next = Math.max(0, ...taken) + 1;

const fresh = readdirSync(PIC).filter(f => isPic(f) && !numbered(f))
  .map(f => ({ f, t: statSync(join(PIC, f)).mtimeMs })).sort((a, b) => a.t - b.t).map(x => x.f);
if (!fresh.length) { console.log('No new pictures in the Pic folder (only numbered ones). Nothing to add.'); process.exit(0); }

const files = [], added = [];
for (const f of fresh) {
  const num = String(next++).padStart(4, '0');
  const ext = extname(f).toLowerCase().replace('.jpeg', '.jpg');
  const newName = `${num}${ext}`;
  console.log(`${f}  ->  ${newName}  (House ${parseInt(num, 10)}, ${DEFAULT_COST} coins)`);
  if (!dry) {
    renameSync(join(PIC, f), join(PIC, newName));
    copyFileSync(join(PIC, newName), join(IMAGES, newName));
    data.homes.push({ id: `house-${num}`, name: `House ${parseInt(num, 10)}`, image: `images/${newName}`, cost: DEFAULT_COST });
    files.push(`public/images/${newName}`); added.push(newName);
  }
}
if (dry) { console.log('(dry run: nothing changed)'); process.exit(0); }
writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n');
files.push('src/homesExtra.json');

const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' });
git('add', '--', ...files);
git('commit', '-m', `Avatar shop: new houses ${added.join(', ')}`, '--', ...files);
git('pull', '--rebase', '--autostash', 'origin', 'main');
git('push', 'origin', 'main');
console.log(`\nDONE. ${added.length} new house(s) are on GitHub. They appear in the shop in about 2-3 minutes.`);
