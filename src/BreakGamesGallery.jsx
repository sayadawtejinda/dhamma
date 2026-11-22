import React, { useState } from 'react';
import { QUIZ_BREAK_GAMES, BIRD_COIN_CAP } from './quizBreakGames';

// Teacher page: every short coin game the students meet between the two halves of a Smart Study quiz (and in the other apps),
// one button each, so the teacher can open and try any of them. Nothing here is saved and no coins are paid.
// The names are in the same order as QUIZ_BREAK_GAMES in quizBreakGames.jsx: when a game is added there, add its name here.
const NAMES = [
  '🐦 Bird rescue', '🌸 Flower offering', '♻️ Litter picking', '🏹 Animal rescue', '🪓 Woodcutter and the axe', '🐜 Ant gathering',
  '💧 Water for the animals', '🤝 Help friends', '🙏 Pay respect', '🎁 Ten gifts', '👜 Return lost things', '🏠 Help parents',
  '🍚 Alms round', '🦆 Golden egg duck', '🦩 Cunning heron', '🐘 Share the water', '🎓 School of skills', '⚖️ Ten deeds',
  '✨ Ten merits', '🐅 Tiger in the trap', '📜 Finish the proverb', '🐕 Brave puppy', '🧹 Clean the house', '🛕 Clean the pagoda',
  '🛒 Market for parents', '🐇 Wake the hare', '🩺 Animal first aid', '🌳 Poke tree and baby banyan', '🐒 Monkey and the beans', '🕷️ King and the spider', '🦅 Eagles and good friends', '🐢 Tortoise and two swans',
];

export default function BreakGamesGallery({ onClose }) {
  const [playing, setPlaying] = useState(null);
  if (playing !== null) {
    const Game = QUIZ_BREAK_GAMES[playing];
    return (
      <div className="fixed inset-0 z-[10050] bg-white overflow-auto">
        <button onClick={() => setPlaying(null)} className="fixed top-3 left-3 z-[10060] px-3 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg font-bold" aria-label="Back to the list of games">← List</button>
        <Game key={playing} coinsLeft={BIRD_COIN_CAP} onDone={() => setPlaying(null)} />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[10040] bg-gradient-to-b from-sky-50 to-emerald-50 overflow-auto px-4 pt-6 pb-16">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-emerald-800">🎮 Break games ({QUIZ_BREAK_GAMES.length})</h1>
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded-full font-bold shadow">✕ Close</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Tap a game to try it. Nothing is saved and no coins are paid here.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUIZ_BREAK_GAMES.map((_, i) => (
            <button key={i} onClick={() => setPlaying(i)} className="bg-white p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-md text-left font-bold text-emerald-900 flex items-center justify-between">
              <span>{i + 1}. {NAMES[i] || `Game ${i + 1}`}</span><span className="text-emerald-500">▶</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
