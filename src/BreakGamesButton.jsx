import React, { useState, Suspense } from 'react';

// The teacher-dashboard button for the break games page. The page itself (and all the games) is only loaded when it is tapped.
const Gallery = React.lazy(() => import('./BreakGamesGallery'));
export default function BreakGamesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all mt-3">
        <span className="flex items-center text-lg font-bold text-emerald-800">🎮 Break games (try them all)</span>
        <span className="text-emerald-500 text-xl">→</span>
      </button>
      {open && (
        <Suspense fallback={<div className="fixed inset-0 z-[10040] bg-white flex items-center justify-center text-gray-500">Loading games…</div>}>
          <Gallery onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
