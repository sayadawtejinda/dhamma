// Where the lesson pictures go in the GitHub picture repo, so that nobody has to look at GitHub: a folder holds at most FOLDER_CAP pictures
// (GitHub's web pages get slow with thousands of files in one folder); when the current one would be full, the next folder is started
// automatically: images-02, images-03, ... (the first set of pictures is in the main folder of the repo). The numbers of the pictures keep
// counting up across all folders. Used by add-lessons.mjs. No git and no Firebase in here, so it can be tested.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const FOLDER_CAP = 900;        // pictures in one folder
export const REPO_WARN_MB = 700;      // GitHub asks for repositories under about 1 GB: warn from here
export const REPO_STOP_MB = 950;      // ... and do not add any more from here (a new picture repo is needed)
const FOLDER_RE = /^images-(\d{2,3})$/;
const PIC_RE = /^(\d{4,6})\.(?:png|jpe?g)$/i;

// The picture folders of the repo, in order: '' (the main folder) then images-02, images-03 ...
export function pictureFolders(repoDir) {
  const subs = readdirSync(repoDir).filter(f => FOLDER_RE.test(f) && statSync(join(repoDir, f)).isDirectory())
    .sort((a, b) => parseInt(a.slice(7), 10) - parseInt(b.slice(7), 10));
  return ['', ...subs];
}

// How many pictures are in each folder, and the highest picture number of the series with `digits` digits across ALL folders.
export function scanRepo(repoDir, digits) {
  const folders = pictureFolders(repoDir);
  let max = 0;
  const counts = folders.map(f => {
    const names = readdirSync(join(repoDir, f)).filter(n => PIC_RE.test(n) && statSync(join(repoDir, f, n)).isFile());
    names.forEach(n => { const m = n.match(PIC_RE)[1]; if (m.length === digits) max = Math.max(max, parseInt(m, 10)); });
    return names.length;
  });
  return { folders, counts, next: max + 1 };
}

// The folder the next `needed` pictures go in: the last one, or a new one when it would hold more than `cap`.
export function chooseFolder(folders, counts, needed, cap = FOLDER_CAP) {
  const last = folders.length - 1;
  if (counts[last] + needed <= cap) return { folder: folders[last], isNew: false };
  const n = folders.length === 1 ? 2 : parseInt(folders[last].slice(7), 10) + 1;
  return { folder: `images-${String(n).padStart(2, '0')}`, isNew: true };
}

// Total size in MB of the picture files in the repo (the .git folder is not counted).
export function repoSizeMB(repoDir) {
  let total = 0;
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      if (f === '.git') continue;
      const p = join(d, f); const st = statSync(p);
      if (st.isDirectory()) walk(p); else total += st.size;
    }
  };
  if (existsSync(repoDir)) walk(repoDir);
  return total / (1024 * 1024);
}
