import React, { useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// The teacher's side of the Parami report (the students' page is public/parami-report.html, a plain page that reads one
// file on GitHub, so it costs nothing however many students open it). Used about once a year:
//   1. here: leave out the classes that should not count, press "Save my choice"
//   2. on GitHub: Actions -> "Parami report" -> Run workflow. That is the ONLY time Firebase is read for the report: it
//      brings in the newest scores, rebuilds the report files (new SmartStudy classes included) and puts them on GitHub.
// Opening this editor reads one small settings document; nothing else is read or kept running.
const SETTINGS = () => doc(db, `artifacts/${appId}/public/data/config/paramiReport`);
const fmt = (n) => Number(n).toLocaleString('en-US');
const RUN_URL = 'https://github.com/sayadawtejinda/dhamma/actions/workflows/parami-report.yml';
const when = (ms) => (ms ? new Date(ms).toLocaleString() : '');

export default function ParamiReportEditor() {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(null);
  const [hidden, setHidden] = useState({});
  const [settings, setSettings] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [res, snap] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}paramiReportFull.json?${Date.now()}`).then(r => (r.ok ? r.json() : null)),
        getDoc(SETTINGS()),
      ]);
      const s = snap.exists() ? snap.data() : {};
      if (!res) { setError('The report data is not ready yet. Press Run on GitHub to make it.'); }
      setFull(res);
      setSettings(s);
      setHidden(Object.fromEntries((s.hidden || []).map(c => [c, 1])));
    } catch (e) { console.error(e); setError('Could not load. Please try again.'); }
  };

  const toggleOpen = () => { const next = !open; setOpen(next); if (next && !full) load(); };

  const confirm = async () => {
    setBusy(true);
    try {
      await setDoc(SETTINGS(), { hidden: Object.keys(hidden), savedAt: Date.now() }, { merge: true });
      setSettings(prev => ({ ...prev, hidden: Object.keys(hidden), savedAt: Date.now() }));
      alert('Saved. Now open GitHub and press Run workflow on "Parami report" (the link under the table), and a few minutes later students see it.');
    } catch (e) { console.error(e); alert('Could not confirm. Please try again.'); }
    setBusy(false);
  };

  const rows = full ? full.students.map(s => {
    const cl = s.classes.filter(c => !hidden[c.classId]);
    return { name: s.name, classes: cl, lessons: cl.reduce((n, c) => n + c.lessons, 0), points: cl.reduce((n, c) => n + c.points, 0) };
  }).sort((a, b) => b.points - a.points || b.lessons - a.lessons || (a.name < b.name ? -1 : 1)) : [];
  const changed = JSON.stringify(Object.keys(hidden).sort()) !== JSON.stringify([...(settings.hidden || [])].sort());

  return (
    <div className="mb-8">
      <button type="button" onClick={toggleOpen} className="text-sm font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg px-4 py-2">
        🌸 Parami report (SmartStudy) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-xl bg-pink-50 border border-pink-200">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {full && (
            <>
              <p className="text-sm text-gray-600 mb-2">{full.students.length} students · data as of {when(Date.parse(full.generatedAt))}</p>
              <p className="text-sm font-semibold text-gray-700 mb-1">Tap a class to leave it out:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {full.classes.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setHidden(prev => { const n = { ...prev }; if (n[c]) delete n[c]; else n[c] = 1; return n; })}
                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${hidden[c] ? 'bg-gray-100 text-gray-400 line-through border-gray-200' : 'bg-white text-pink-800 border-pink-300'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="max-h-72 overflow-y-auto bg-white rounded-lg border border-pink-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="text-left text-gray-500 text-xs"><th className="p-2">#</th><th className="p-2">Student</th><th className="p-2 text-right">Classes</th><th className="p-2 text-right">Lessons</th><th className="p-2 text-right">Points</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.name} className="border-t border-pink-50">
                        <td className="p-2 font-bold text-pink-700">{i + 1}</td>
                        <td className="p-2 font-semibold">{r.name}</td>
                        <td className="p-2 text-right">{r.classes.length}</td>
                        <td className="p-2 text-right">{r.lessons}</td>
                        <td className="p-2 text-right font-bold">{fmt(r.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button type="button" disabled={busy || !full} onClick={confirm} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              {busy ? '…' : '✅ Save my choice'}
            </button>
            <a href={RUN_URL} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900">▶ Run on GitHub ↗</a>
            <a href={`${import.meta.env.BASE_URL}parami-report.html`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-pink-700 underline">Students' page ↗</a>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {settings.savedAt ? `Saved ${when(settings.savedAt)}.` : 'Nothing saved yet.'}
            {changed ? ' You have changes that are not saved yet.' : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">1) Save my choice. 2) Run on GitHub → "Run workflow" (it brings the newest scores and any new classes, and updates the students' page). Do this when you want a new report, for example once a year.</p>
        </div>
      )}
    </div>
  );
}
