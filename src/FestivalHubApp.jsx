import React, { useEffect, useState } from 'react';
import { loadFestivalSettings, saveFestivalSetting, getFestivalList, festivalStatus } from './festivals';

// Teacher's "Festival apps" group: every festival in festivals.js is listed
// here (so future festivals are found in one place), each with its own
// start/end dates and an on/off switch. A festival is open to students from
// its start date to its end date, both included -- that is all it takes.
const STATUS = {
  open: { label: 'Open now', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  upcoming: { label: 'Upcoming', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  ended: { label: 'Ended', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  off: { label: 'Switched off', cls: 'bg-red-100 text-red-700 border-red-300' },
};

function FestivalRow({ festival, onOpen }) {
  const [start, setStart] = useState(festival.start);
  const [end, setEnd] = useState(festival.end);
  const [enabled, setEnabled] = useState(festival.enabled);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const dirty = start !== festival.start || end !== festival.end || enabled !== festival.enabled;
  const invalid = !start || !end || end < start;
  const status = STATUS[festivalStatus({ ...festival, start, end, enabled })];

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await saveFestivalSetting(festival.id, { start, end, enabled });
      setMsg('Saved ✅');
    } catch (e) {
      console.error(e);
      setMsg('Could not save -- try again.');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-4xl">{festival.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg text-indigo-900">{festival.title}</div>
          <div className="text-sm text-gray-600">{festival.tagline}</div>
        </div>
        <span className={`text-xs font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${status.cls}`}>{status.label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-gray-700">
          Starts
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full border-2 border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Ends (included)
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full border-2 border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
      </div>
      {end && start && end < start && <p className="mt-1 text-xs text-red-600">The end date must not be before the start date.</p>}
      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Switched on (students can enter between the dates above)
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={!dirty || invalid || saving} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40">
          {saving ? 'Saving…' : 'Save dates'}
        </button>
        <button onClick={() => onOpen({ ...festival, start, end, enabled })} className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold">
          👀 Preview
        </button>
        {msg && <span className="text-sm font-semibold text-emerald-700">{msg}</span>}
      </div>
    </div>
  );
}

export default function FestivalHubApp({ onExit, onOpenFestival }) {
  const [settings, setSettings] = useState(null);
  useEffect(() => { loadFestivalSettings().then(setSettings); }, []);
  const festivals = settings ? getFestivalList(settings) : [];
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-indigo-50 px-4 pt-20 pb-16">
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-black text-indigo-900">🎪 Festival apps</h1>
        <p className="text-sm text-gray-600 mt-1 mb-5">
          Choose when each festival is open. While it is open, students see an announcement in the middle of their home page, and tapping it takes them into the festival.
        </p>
        {!settings && <p className="text-gray-500">Loading…</p>}
        <div className="space-y-4">
          {festivals.map(f => (
            <FestivalRow key={f.id} festival={f} onOpen={(resolved) => onOpenFestival({ mode: 'teacher', festival: resolved, fromHub: true })} />
          ))}
        </div>
      </div>
    </div>
  );
}
