import React, { useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// The teacher's side of the Parami report (the students' page is public/parami-report.html, a plain page that reads one
// file on GitHub, so it costs nothing however many students open it). Here the teacher sees every class, leaves out the
// ones that should not count, and presses Confirm: that writes the choice to Firestore (config/paramiReport), and within
// about 15 minutes the "close-open-sessions" job rebuilds the report files from the latest class files and puts them on
// GitHub. New SmartStudy classes appear in the list by themselves the next time the files are rebuilt.
const SETTINGS = () => doc(db, `artifacts/${appId}/public/data/config/paramiReport`);
const fmt = (n) => Number(n).toLocaleString('en-US');
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
      if (!res) { setError('The report data is not ready yet. It is made by the weekly update, or when you press Confirm.'); }
      setFull(res);
      setSettings(s);
      setHidden(Object.fromEntries((s.hidden || []).map(c => [c, 1])));
    } catch (e) { console.error(e); setError('Could not load. Please try again.'); }
  };

  const toggleOpen = () => { const next = !open; setOpen(next); if (next && !full) load(); };

  const confirm = async () => {
    setBusy(true);
    try {
      await setDoc(SETTINGS(), { hidden: Object.keys(hidden), requestedAt: Date.now() }, { merge: true });
      setSettings(prev => ({ ...prev, hidden: Object.keys(hidden), requestedAt: Date.now() }));
      alert('Confirmed. It goes on GitHub within about 15 minutes, and a few minutes later students see it.');
    } catch (e) { console.error(e); alert('Could not confirm. Please try again.'); }
    setBusy(false);
  };

  const waiting = settings.requestedAt && settings.requestedAt > (settings.publishedAt || 0);
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
              {busy ? '…' : '✅ Confirm and publish'}
            </button>
            <a href={`${import.meta.env.BASE_URL}parami-report.html`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-pink-700 underline">Students' page ↗</a>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {waiting ? `⏳ Confirmed ${when(settings.requestedAt)} — waiting to go on GitHub (about 15 minutes).`
              : settings.publishedAt ? `✅ Published ${when(settings.publishedAt)}.` : 'Nothing published yet.'}
            {changed ? ' You have changes that are not confirmed yet.' : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">New SmartStudy classes appear here after the next rebuild (press Confirm to refresh the numbers too).</p>
        </div>
      )}
    </div>
  );
}
