import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// Live "who's online" roster — same simple heartbeat pattern as
// MyanmarReaderApp.jsx's READER_ROSTER_PATH (30s ping, 5-minute online
// window), shown to both teacher and student. No name-entry screen needed:
// identity comes from entryRequest.studentName when TutoringApp opens this
// for a student; when opened for a teacher (no studentName), they just see
// the panel without appearing in it themselves.
const BCG_ROSTER_PATH = 'artifacts/burmese-consonant-game-app/public/data/roster';
const sanitizeBcgKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

// ── Ported from the standalone "Burmese Consonant Learning Game" HTML app ──
// Same hybrid approach as ConsonantPracticeApp/DhammaschoolApp: the original
// vanilla JS (DOM manipulation, canvas-confetti, Web Audio, onclick=
// handlers in the markup) is kept almost unchanged inside a React wrapper
// instead of being rewritten as JSX/state.
//
// Two things were changed from the original standalone script, both for
// safe co-existence with the other apps mounted alongside this one (all
// kept mounted, just hidden via CSS display:none — see App.js):
//   1. document.getElementById(...) / document.body.* calls were changed to
//      rootEl.querySelector(...) / rootEl.classList.* so this app only ever
//      reads/touches its OWN container, never anything belonging to another
//      mounted app that happens to reuse the same element id (e.g. many of
//      these hybrid-wrapped apps have their own #chat-input, #audio-player,
//      etc.).
//   2. Every onclick="..." attribute in the static HTML resolves the
//      function it calls via the GLOBAL scope (that's just how inline HTML
//      event handler attributes work) — but the functions are declared
//      inside this component's own useEffect closure, not as bare globals.
//      window.__bcgApp bridges that gap, namespaced to just this app so a
//      same-named function from a different hybrid-wrapped app (e.g. this
//      app and ConsonantPracticeApp both have a "toggleClickGame") can never
//      silently overwrite one another on the shared window object.
//
// No Firebase/Firestore integration yet (per instructions — games + trophy
// wiring come in a later pass); this is purely the "mount it inline instead
// of a new tab" step for now.

const BCG_APP_BODY_HTML = `
    <div id="victory-overlay" class="fixed inset-0 bg-black/85 z-[100] hidden flex-col justify-center items-center">
        <i class="fa-solid fa-flag-checkered text-9xl text-yellow-400 mb-8 animate-bounce" style="filter: drop-shadow(0 0 20px rgba(250,204,21,0.6));"></i>
        <h1 id="victory-title" class="text-4xl md:text-5xl font-bold text-white mb-4 text-center">Victory!</h1>
        <p id="victory-subtitle" class="text-xl md:text-2xl text-green-400 font-semibold">30 Points Reached!</p>
    </div>
    <div id="spider-progress-container">
        <div id="spider-goal"><i class="fa-solid fa-flag-checkered"></i></div>
        <div id="spider-track">
            <div id="spider-web-fill" style="height: 0%;"></div>
            <div id="spider-icon" style="bottom: 0%;"><i class="fa-solid fa-spider"></i></div>
        </div>
    </div>
    <div id="fixed-header" class="fixed-header">
        <div id="game-status"></div>
    </div>
    <div id="floating-score-widget">
        <div id="score-container" class="flex items-center gap-2 sm:gap-3 relative shadow-md p-1.5 sm:p-2 rounded-xl transition-colors select-none border border-gray-200 hover:border-gray-300" title="Drag to move, click to show/hide menus">
            <div id="correct-score" class="score-badge bg-green-100 text-green-800">
                <i class="fa-solid fa-check-circle"></i> Correct: 0
            </div>
            <div id="incorrect-score" class="score-badge bg-red-100 text-red-800">
                <i class="fa-solid fa-times-circle"></i> Wrong: 0
            </div>
            <i id="menu-chevron" class="fa-solid fa-chevron-down text-gray-400 text-sm ml-1 transition-transform duration-300" style="transform: rotate(180deg);"></i>
        </div>
        <div id="controls-menu" class="flex bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-gray-200 items-center justify-center flex-wrap gap-3 sm:gap-4 max-w-[90vw]">
            <i id="sound-toggle-icon" class="fa-solid fa-volume-high icon-btn" onclick="window.__bcgApp.toggleSoundSet()" title="Change Audio Set"></i>
            <button id="pick-game-toggle-btn" class="game-toggle-btn" onclick="window.__bcgApp.togglePickGame()" title="Pick the correct letter">
                 <i class="fa-solid fa-list-check text-xl"></i>
            </button>
            <button id="click-game-toggle-btn" class="game-toggle-btn" onclick="window.__bcgApp.toggleClickGame()" title="Click the letter">
                <svg class="game-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.686 2 6 4.686 6 8v8h12V8c0-3.314-2.686-6-6-6zM18 10h-2v2h2v-2zm-2 2h-2v2h2v-2zm-4 0H8v2h2v-2zm-2-2h2v2H8v-2zm4-6c-3.314 0-6 2.686-6 6v8h12V8c0-3.314-2.686-6-6-6zm0 16a2 2 0 100 4 2 2 0 000-4z"/><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/><path d="M12 12a2 2 0 100 4 2 2 0 000-4z"/></svg>
            </button>
            <button id="image-game-toggle-btn" class="game-toggle-btn" onclick="window.__bcgApp.toggleImageGame()" title="Play Picture Game">
                <i class="fa-solid fa-images text-xl"></i>
            </button>
            <div id="group-selector-btn" class="group-selector-btn" title="Select Consonant Group">
                <span id="group-selector-display">1</span>
            </div>
            <div id="read-aloud-btn" title="Read current group aloud">
                <i class="fa-solid fa-book-open-reader"></i>
            </div>
        </div>
    </div>
    <div class="main-container">
        <div id="main-content-area" class="main-content-area">
            <div id="image-game-container">
                <div id="image-display-wrapper">
                    <img id="image-display" src="" alt="Game Image">
                    <span id="image-display-fallback" class="hidden text-center font-bold text-gray-500 px-2"></span>
                </div>
                <div id="image-game-instruction" class="flex flex-col items-center gap-2">
                    <div id="image-level-badge" class="bg-orange-500 text-white px-4 py-1 rounded-full text-lg font-bold shadow-md uppercase tracking-wide">Level 1</div>
                    <div id="image-instruction-text" class="text-xl font-bold text-orange-600">Find the FIRST letter</div>
                </div>
                <div id="image-options-grid"></div>
            </div>
            <div id="input-game-controls" class="mt-4">
                <div class="input-area">
                    <input id="chat-input" type="text" placeholder="Type to hear sound or play game..." class="input-field focus:outline-none focus:ring-2 focus:ring-green-500 w-full"/>
                    <button id="toggle-typing-btn" onclick="window.__bcgApp.toggleTypingGame()" class="px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-colors whitespace-nowrap">Game Start</button>
                </div>
            </div>
            <div id="pick-one-of-three-container" class="hidden justify-center items-center gap-4"></div>
            <div id="all-consonant-groups-unified" class="consonant-groups-wrapper">
                <div id="original-consonant-group-wrapper" class="consonant-group-wrapper" data-group-index="0">
                    <div id="consonant-grid" class="consonant-grid"></div>
                </div>
                <div id="combined-consonants-container" class="flex flex-col gap-4"></div>
            </div>
        </div>
    </div>
    <audio id="audio-player" style="display:none;"></audio>
`;

const BCG_APP_CSS = `
        /* Scoped to .bcg-app-root (this app's own container) instead of the
           bare "body" tag — this file gets injected into a page shared with
           TutoringApp/SmartStudy/AbhidhammaApp/MyanmarReader/Dhammaschool/
           ConsonantPracticeApp, and an unscoped body rule would otherwise
           leak into all of them. */
        .bcg-app-root {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            padding-bottom: 2rem;
            margin: 0;
            user-select: none;
        }
        .main-container {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            position: relative;
        }
        .fixed-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            margin: 0 auto;
            max-width: 900px;
            width: 100%;
            z-index: 90;
            background-color: #ffffff;
            padding: 1rem 1.5rem; 
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            border-radius: 0 0 12px 12px;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            min-height: 4.5rem; 
        }
        .score-badge {
            padding: 0.3rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            transition: all 0.3s;
            min-width: 90px; 
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .main-content-area {
            margin-top: 6.5rem; 
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        #all-consonant-groups-unified {
            max-height: none;
            overflow-y: visible;
            transition: max-height 0.3s ease-in-out;
            scrollbar-width: thin;
            scrollbar-color: #a855f7 #f3f4f6;
            padding-right: 8px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1rem;
        }
        #all-consonant-groups-unified.typing-active {
            max-height: 220px;
            overflow-y: auto;
        }
        #all-consonant-groups-unified::-webkit-scrollbar { width: 8px; }
        #all-consonant-groups-unified::-webkit-scrollbar-track { background: #f3f4f6; }
        #all-consonant-groups-unified::-webkit-scrollbar-thumb {
            background-color: #a855f7;
            border-radius: 10px;
            border: 2px solid #ffffff;
        }
        .consonant-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.75rem;
        }
        .combined-consonant-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
            gap: 0.5rem;
        }
        .consonant-group-wrapper {
            padding-top: 1rem; 
        }
        #combined-consonants-container .consonant-group-wrapper {
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            margin-top: 1rem;
        }
        .consonant-item {
            cursor: pointer;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, background-color 0.3s, box-shadow 0.3s;
            position: relative;
        }
        .consonant-item:hover { transform: scale(1.05); }
        .consonant-item.inactive {
            cursor: not-allowed;
            background-color: #f3f4f6 !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .consonant-item.highlight, .reading-highlight {
            animation: pulse-border 0.7s ease-out;
        }
        @keyframes pulse-border {
            0% { box-shadow: 0 0 0 0px var(--highlight-color, #10b981), 0 2px 4px rgba(0, 0, 0, 0.05); }
            50% { box-shadow: 0 0 0 8px var(--highlight-color, #10b981), 0 2px 4px rgba(0, 0, 0, 0.05); }
            100% { box-shadow: 0 0 0 0px var(--highlight-color, #10b981), 0 2px 4px rgba(0, 0, 0, 0.05); }
        }
        #input-game-controls {
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease-in-out;
            padding: 1rem;
            background-color: #f9fafb;
        }
        .input-area { 
            display: flex; 
            gap: 0.5rem; 
            align-items: center; 
            width: 100%;
        }
        .input-field { 
            flex-grow: 1; 
            padding: 0.75rem; 
            border-radius: 9999px; 
            border: 1px solid #d1d5db;
            white-space: nowrap; 
            overflow-x: auto;
            -webkit-overflow-scrolling: touch; 
        }
        #game-status {
            padding: 0.5rem 1.5rem; border-radius: 9999px; font-size: 1rem; font-weight: 700;
            color: white; text-align: center; opacity: 0; transition: opacity 0.3s, background-color 0.3s;
            pointer-events: none; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); white-space: nowrap;
            z-index: 10;
        }
        #game-status.show { opacity: 1; }
        #game-status.correct { background-color: #10b981; }
        #game-status.incorrect { background-color: #ef4444; }
        #game-status.info { background-color: #3b82f6; }
        .icon-btn { cursor: pointer; font-size: 1.5rem; color: #4b5563; transition: color 0.3s; position: relative; z-index: 50;}
        .game-toggle-btn, #image-game-toggle-btn {
            color: #fff; background-color: #10b981; padding: 0.75rem;
            width: 48px; height: 48px; display:flex; align-items:center; justify-content:center;
            border-radius: 9999px; font-weight: bold; transition: background-color 0.3s, transform 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            position: relative; z-index: 50;
        }
        #image-game-toggle-btn { background-color: #f59e0b; }
        #image-game-toggle-btn:hover { background-color: #d97706; transform: scale(1.05); }
        #image-game-toggle-btn.active { background-color: #ef4444; }
        .game-toggle-btn:hover { background-color: #059669; transform: scale(1.05); }
        .game-toggle-btn.active { background-color: #ef4444; }
        .game-toggle-btn.active:hover { background-color: #dc2626; }
        .group-selector-btn {
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            width: 48px; height: 48px; border-radius: 50%; background-color: #6d28d9;
            color: white; font-weight: bold; transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            position: relative; z-index: 50;
        }
        .group-selector-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1); }
        .group-selector-btn span { text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
        .game-icon-svg { width: 1.5em; height: 1.5em; transition: fill 0.3s ease-in-out; filter: drop-shadow(2px 2px 1px rgba(0, 0, 0, 0.1)); }
        #read-aloud-btn {
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            width: 48px; height: 48px; border-radius: 50%; background-color: #9ca3af;
            color: white; font-weight: bold; transition: all 0.3s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            position: relative; z-index: 50;
        }
        #read-aloud-btn:hover { background-color: #6b7280; }
        #read-aloud-btn.active { background-color: #3b82f6; }
        #pick-one-of-three-container { padding: 0.5rem 0; width: 100%; }
        #pick-one-of-three-container .consonant-item { font-size: 2.5rem; padding: 1.5rem; }
        #image-game-container {
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            width: 100%;
            padding: 1rem;
            background-color: #fff7ed;
            border: 2px dashed #f59e0b;
            border-radius: 12px;
            margin-bottom: 1rem;
        }
        #image-game-container.active { display: flex; }
        #image-display-wrapper {
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 4px solid white;
        }
        #image-display {
            width: 100%;
            height: 100%;
            object-fit: contain;
            transition: transform 0.3s;
        }
        #image-display:hover { transform: scale(1.1); }
        #image-game-instruction {
            text-align: center;
        }
        #image-options-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            width: 100%;
            max-width: 600px;
        }
        #image-options-grid .consonant-item {
            font-size: 2.5rem;
            background-color: white;
            border: 2px solid #e5e7eb;
        }
        .bcg-app-root.game-active .roman-text {
            display: none !important;
        }
        #spider-progress-container {
            position: fixed;
            right: 1.5rem;
            top: 25%;
            height: 50%;
            width: 40px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #e5e7eb;
            border-radius: 20px;
            z-index: 45;
            display: none;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            padding-top: 2rem;
            padding-bottom: 1rem;
        }
        #spider-progress-container.active {
            display: flex;
        }
        #spider-track {
            position: relative;
            width: 6px;
            height: 100%;
            background: #e5e7eb;
            border-radius: 3px;
        }
        #spider-web-fill {
            position: absolute;
            bottom: 0;
            width: 100%;
            background: #9ca3af;
            border-radius: 3px;
            transition: height 0.4s ease-out;
        }
        #spider-icon {
            position: absolute;
            left: 50%;
            transform: translateX(-50%) translateY(50%);
            font-size: 28px;
            color: #1f2937;
            transition: bottom 0.4s ease-out;
            z-index: 2;
        }
        #spider-goal {
            position: absolute;
            top: -35px;
            font-size: 28px;
            color: #eab308;
            left: 50%;
            transform: translateX(-50%);
            animation: pulse-border 2s infinite;
        }
        @keyframes pointToBtn {
            0%, 100% { transform: translateY(15px) translateX(-50%); }
            50% { transform: translateY(0) translateX(-50%); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .next-game-highlight {
            position: relative;
            z-index: 60;
        }
        .next-game-highlight::before {
            content: '';
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 3px dashed #ef4444;
            animation: spin 4s linear infinite;
        }
        .next-game-highlight::after {
            content: '\f0a6';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            position: absolute;
            bottom: -40px;
            left: 50%;
            font-size: 32px;
            color: #ef4444; 
            animation: pointToBtn 1s infinite;
            pointer-events: none;
        }
        #controls-menu {
            transition: opacity 0.2s, transform 0.2s;
            transform-origin: top;
        }
        #floating-score-widget {
            position: fixed;
            z-index: 95;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            pointer-events: none;
        }
        #score-container {
            pointer-events: auto;
            cursor: grab;
            background: white;
        }
        #score-container:active {
            cursor: grabbing;
        }
        #controls-menu {
            pointer-events: auto;
        }
        @media (max-width: 640px) {
            .bcg-app-root { padding-top: 0; }
            .main-container { padding: 0.5rem; border-radius: 0; }
            .fixed-header {
                max-width: 100%;
                margin: 0;
                border-radius: 0 0 8px 8px;
                padding: 0.75rem 0.5rem;
            }
            .main-content-area { margin-top: 6rem; }
            .consonant-grid, .combined-consonant-grid { gap: 0.5rem; }
            .consonant-item { padding: 0.5rem; font-size: 1.5rem; }
            .input-area, #input-game-controls { padding: 0.5rem; }
            .game-toggle-btn, .group-selector-btn, #read-aloud-btn, #image-game-toggle-btn { width: 40px; height: 40px; }
            .score-badge { 
                font-size: 0.75rem; 
                padding: 0.2rem 0.5rem; 
                min-width: 65px;
            }
            .score-badge i { font-size: 0.8rem; }
            #score-container { gap: 0.5rem; }
            #image-options-grid { gap: 0.5rem; }
            #image-display-wrapper { width: 150px; height: 150px; }
            #image-game-instruction { font-size: 1rem; }
            #spider-progress-container {
                right: 4px;
                width: 32px;
                height: 40%;
                top: 30%;
                padding-top: 1.5rem;
            }
            #spider-icon { font-size: 20px; }
            #spider-goal { font-size: 20px; top: -25px; }
        }
`;

export default function BurmeseConsonantGameApp({ entryRequest, onExit }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  // Roster heartbeat — only pings when opened for a student (entryRequest
  // carries their name); a teacher just observes.
  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, BCG_ROSTER_PATH, sanitizeBcgKey(studentName));
    const ping = () => setDoc(rosterRef, { studentName, isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30000);
    const goOffline = () => { updateDoc(rosterRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [studentName]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, BCG_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Burmese Consonant Game roster listen error:', e));
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowForOnlineCheck(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isRosterEntryOnline = (s) => {
    const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
    return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 5 * 60 * 1000;
  };
  const weeklyRosterList = onlineStudents
    .filter(s => {
      const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
      return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 7 * 24 * 60 * 60 * 1000;
    })
    .map(s => ({ ...s, _isOnlineNow: isRosterEntryOnline(s) }))
    .sort((a, b) => {
      if (a._isOnlineNow !== b._isOnlineNow) return b._isOnlineNow ? 1 : -1;
      const aMs = a.lastSeen?.toMillis ? a.lastSeen.toMillis() : 0;
      const bMs = b.lastSeen?.toMillis ? b.lastSeen.toMillis() : 0;
      return bMs - aMs;
    });
  const onlineCount = onlineStudents.filter(isRosterEntryOnline).length;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const rootEl = containerRef.current;

        // Firebase Auth (kept for structure) — but this file has no real
        // shared Firebase instance to plug into yet (per instructions, that
        // comes with the trophy/link-to-tutoring pass later), so this whole
        // block is simply left inert rather than wired up.

        // --- Toggle Menu Logic ---
        let isMenuOpen = true;
        function toggleControlsMenu(forceState = null) {
            const menu = document.getElementById('controls-menu');
            const chevron = document.getElementById('menu-chevron');
            if (forceState !== null) { isMenuOpen = forceState; } else { isMenuOpen = !isMenuOpen; }
            if (isMenuOpen) {
                menu.classList.remove('hidden'); menu.classList.add('flex'); chevron.style.transform = 'rotate(180deg)';
            } else {
                menu.classList.add('hidden'); menu.classList.remove('flex'); chevron.style.transform = 'rotate(0deg)';
            }
        }

        // --- Data ---
        const allConsonants = [
            'က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'ဋ', 'ဌ', 'ဍ', 'ဎ', 'ဏ', 'တ', 'ထ', 'ဒ', 'ဓ', 'န',
            'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', '','ဟ', 'ဠ', 'အ', ''
        ];
        const cleanConsonants = allConsonants.filter(c => c !== '');
        const romanMap = {
            'က': 'ka', 'ခ': 'kha', 'ဂ': 'ga', 'ဃ': 'ga', 'င': 'nga',
            'စ': 'sa', 'ဆ': 'hsa', 'ဇ': 'za', 'ဈ': 'za', 'ည': 'nya',
            'ဋ': 'ta', 'ဌ': 'hta', 'ဍ': 'da', 'ဎ': 'da', 'ဏ': 'na',
            'တ': 'ta', 'ထ': 'hta', 'ဒ': 'da', 'ဓ': 'da', 'န': 'na',
            'ပ': 'pa', 'ဖ': 'hpa', 'ဗ': 'ba', 'ဘ': 'ba', 'မ': 'ma',
            'ယ': 'ya', 'ရ': 'ra', 'လ': 'la', 'ဝ': 'wa', 'သ': 'tha',
            'ဟ': 'ha', 'ဠ': 'la', 'အ': 'a',
            'ကျ': 'kya', 'ကြ': 'kya', 'ချ': 'cha', 'ခြ': 'cha', 'ဂျ': 'gya', 'ဂြ': 'gya', 'ငြ': 'nya', 'ပျ': 'pya', 'ပြ': 'pya', 'ဖျ': 'hpya', 'ဖြ': 'hpya', 'ဗျ': 'bya', 'မျ': 'mya', 'မြ': 'mya', 'ယျ': 'ya', 'လျ': 'lya', 'သျ': 'sha', 'တြ': 'tra', 'ဒြ': 'dra',
            'ကွ': 'kwa', 'ခွ': 'khwa', 'ဂွ': 'gwa', 'ငွ': 'ngwa', 'စွ': 'swa', 'ဆွ': 'hswa', 'ဇွ': 'zwa', 'တွ': 'twa', 'ထွ': 'htwa', 'ဒွ': 'dwa', 'ဓွ': 'dhwa', 'နွ': 'nwa', 'ပွ': 'pwa', 'ဖွ': 'hpwa', 'ဗွ': 'bwa', 'ဘွ': 'bhwa', 'မွ': 'mwa', 'ယွ': 'ywa', 'ရွ': 'ywa', 'လွ': 'lwa', 'သွ': 'thwa', 'ဟွ': 'hwa',
            'ငှ': 'hnga', 'ညှ': 'hnya', 'နှ': 'hna', 'မှ': 'hma', 'ယှ': 'sha', 'ရှ': 'sha', 'လှ': 'hla', 'ဝှ': 'hwa',
            'ကျွ': 'kywa', 'ကြွ': 'kywa', 'ချွ': 'chwa', 'ဂျွ': 'gywa', 'ပျွ': 'pywa', 'ပြွ': 'pywa', 'မြွ': 'mywa',
            'မျှ': 'hmya', 'မြှ': 'hmya', 'လျှ': 'hlya',
            'ညွှ': 'hnywa', 'နွှ': 'hnwa', 'မွှ': 'hmwa', 'ရွှ': 'shwa', 'လွှ': 'hlwa'
        };
        const combinedConsonantGroups = [
            ['ကျ', 'ကြ', 'ချ', 'ခြ', 'ဂျ', 'ဂြ', 'ငြ', 'ပျ', 'ပြ', 'ဖျ', 'ဖြ', 'ဗျ', 'မျ', 'မြ', 'ယျ', 'လျ', 'သျ', 'တြ', 'ဒြ'],
            ['ကွ', 'ခွ', 'ဂွ', 'ငွ', 'စွ', 'ဆွ', 'ဇွ', 'တွ', 'ထွ', 'ဒွ', 'ဓွ', 'နွ', 'ပွ', 'ဖွ', 'ဗွ', 'ဘွ', 'မွ', 'ယွ', 'ရွ', 'လွ', 'သွ', 'ဟွ'],
            ['ငှ', 'ညှ', 'နှ', 'မှ', 'ယှ', 'ရှ', 'လှ', 'ဝှ'],
            ['ကျွ', 'ကြွ', 'ချွ', 'ဂျွ', 'ပျွ', 'ပြွ', 'မြွ'],
            ['မျှ', 'မြှ', 'လျှ'],
            ['ညွှ', 'နွှ', 'မွှ', 'ရွှ', 'လွှ']
        ];
        const imageWords = [
            { w: 'ကံ့ကော်ပန်း', s: 3, b: ['က', 'က', 'ပ'] },
            { w: 'ကျောက်စိမ်းရောင်', s: 3, b: ['ကျ', 'စ', 'ရ'] },
            { w: 'ကြက်ပေါင်း', s: 2, b: ['ကြ', 'ပ'] },
            { w: 'ကြက်သွန်နီ', s: 3, b: ['ကြ', 'သ', 'န'] },
            { w: 'ကြက်သွန်ဖြူ', s: 3, b: ['ကြ', 'သ', 'ဖြ'] },
            { w: 'ကြက်သားဟင်း', s: 3, b: ['ကြ', 'သ', 'ဟ'] },
            { w: 'ကြက်ဟင်းခါးသီး', s: 4, b: ['ကြ', 'ဟ', 'ခ', 'သ'] },
            { w: 'ကြာပန်း', s: 2, b: ['ကြ', 'ပ'] },
            { w: 'ကိုက်လန်', s: 2, b: ['က', 'လ'] },
            { w: '‌ဂေါ်ဖီထုပ်', s: 3, b: ['ဂ', 'ဖ', 'ထ'] },
            { w: 'ခရမ်းချဉ်သီး', s: 4, b: ['ခ', 'ရ', 'ချ', 'သ'] },
            { w: 'ခရမ်းရောင်', s: 3, b: ['ခ', 'ရ', 'ရ'] },
            { w: 'ခရမ်းသီး', s: 3, b: ['ခ', 'ရ', 'သ'] },
            { w: 'ခရေပန်း', s: 3, b: ['ခ', 'ရ', 'ပ'] },
            { w: 'ခေါင်းပေါင်း', s: 2, b: ['ခ', 'ပ'] },
            { w: 'ဂန္ဓမာပန်း', s: 4, b: ['ဂ', 'ဓ', 'မ', 'ပ'] },
            { w: 'ဂျင်း', s: 1, b: ['ဂျ'] },
            { w: 'ဂါဝန်', s: 2, b: ['ဂ', 'ဝ'] },
            { w: 'ငရုပ်သီး', s: 3, b: ['င', 'ရ', 'သ'] },
            { w: 'ငါးဟင်း', s: 3, b: ['င', 'ဟ'] },
            { w: 'စပယ်ပန်း', s: 3, b: ['စ', 'ပ', 'ပ'] },
            { w: 'စပျစ်သီး', s: 3, b: ['စ', 'ပျ', 'သ'] },
            { w: 'စွတ်ကျယ်', s: 2, b: ['စွ', 'ကျ'] },
            { w: 'ဆယ့်နှစ်မျိုးဟင်းချို', s: 5, b: ['ဆ', 'နှ', 'မျ', 'ဟ', 'ချ'] },
            { w: 'ဆလတ်ရွက်', s: 3, b: ['ဆ', 'လ', 'ရွ'] },
            { w: 'ဆွယ်တာ', s: 2, b: ['ဆွ', 'တ'] },
            { w: 'ဆွဲကြိုး', s: 2, b: ['ဆွ', 'ကြ'] },
            { w: 'ဇီးသီး', s: 2, b: ['ဇ', 'သ'] },
            { w: 'ညှပ်ဖိနပ်', s: 3, b: ['ညှ', 'ဖ', 'န'] },
            { w: 'တိုက်ပုံအင်္ကျီ', s: 4, b: ['တ', 'ပ', 'အ', 'ကျ'] },
            { w: 'ထမင်း', s: 2, b: ['ထ', 'မ'] },
            { w: 'ထမင်းကြော်', s: 3, b: ['ထ', 'မ', 'ကြ'] },
            { w: 'ဒန့်သလွန်သီး', s: 4, b: ['ဒ', 'သ', 'လွ', 'သ'] },
            { w: 'နံနံပင်', s: 3, b: ['န', 'န', 'ပ'] },
            { w: 'နှင်းဆီပန်း', s: 3, b: ['နှ', 'ဆ', 'ပ'] },
            { w: 'နားကပ်', s: 2, b: ['န', 'က'] },
            { w: 'နေကြာပန်း', s: 3, b: ['န', 'ကြ', 'ပ'] },
            { w: 'ပန်းမုန်လာ', s: 3, b: ['ပ', 'မ', 'လ'] },
            { w: 'ပန်းရောင်', s: 2, b: ['ပ', 'ရ'] },
            { w: 'ပန်းသီး', s: 2, b: ['ပ', 'သ'] },
            { w: 'ပိတောက်ပန်း', s: 3, b: ['ပ', 'တ', 'ပ'] },
            { w: 'ပုဆိုး', s: 2, b: ['ပ', 'ဆ'] },
            { w: 'ဖရုံသီး', s: 3, b: ['ဖ', 'ရ', 'သ'] },
            { w: 'ဖရဲသီး', s: 3, b: ['ဖ', 'ရ', 'သ'] },
            { w: 'ဗူးသီး', s: 2, b: ['ဗ', 'သ'] },
            { w: 'ဘိုစားပဲသီး', s: 4, b: ['ဘ', 'စ', 'ပ', 'သ'] },
            { w: 'ဘောင်ဘီ', s: 2, b: ['ဘ', 'ဘ'] },
            { w: 'ဘဲကင်', s: 2, b: ['ဘ', 'က'] },
            { w: 'ဘဲပေါင်း', s: 2, b: ['ဘ', 'ပ'] },
            { w: 'မကျီးသီး', s: 3, b: ['မ', 'ကျ', 'သ'] },
            { w: 'မျက်မှန်', s: 2, b: ['မျ', 'မှ'] },
            { w: 'မရမ်းသီး', s: 3, b: ['မ', 'ရ', 'သ'] },
            { w: 'မြစိမ်းရောင်', s: 3, b: ['မြ', 'စ', 'ရ'] },
            { w: 'မာလကာသီး', s: 4, b: ['မ', 'လ', 'က', 'သ'] },
            { w: 'မိုးပြာရောင်', s: 3, b: ['မ', 'ပြ', 'ရ'] },
            { w: 'မီးခိုးရောင်', s: 3, b: ['မ', 'ခ', 'ရ'] },
            { w: 'မုန်ညင်း', s: 2, b: ['မ', 'ည'] },
            { w: 'မုန်လာဥ', s: 3, b: ['မ', 'လ', 'အ'] },
            { w: 'မေမြို့ပန်း', s: 3, b: ['မ', 'မြ', 'ပ'] },
            { w: 'ရင်ဖုံးအင်္ကျီ', s: 4, b: ['ရ', 'ဖ', 'အ', 'ကျ'] },
            { w: 'ရှပ်အင်္ကျီ', s: 3, b: ['ရှ', 'အ', 'ကျ'] },
            { w: 'ရေခဲမုန့်', s: 3, b: ['ရ', 'ခ', 'မ'] },
            { w: 'လက်ကိုင်ပဝါ', s: 4, b: ['လ', 'က', 'ပ', 'ဝ'] },
            { w: 'လက်ကောက်', s: 2, b: ['လ', 'က'] },
            { w: 'လက်စွတ်', s: 2, b: ['လ', 'စွ'] },
            { w: 'လက်ပတ်နာရီ', s: 4, b: ['လ', 'ပ', 'န', 'ရ'] },
            { w: 'လည်စီးပဝါ', s: 4, b: ['လ', 'စ', 'ပ', 'ဝ'] },
            { w: 'လည်ဆွဲ', s: 2, b: ['လ', 'ဆွ'] },
            { w: 'လုံခြည်', s: 2, b: ['လ', 'ခြ'] },
            { w: 'ဝက်သားဟင်း', s: 3, b: ['ဝ', 'သ', 'ဟ'] },
            { w: 'ဝက်အူချောင်း', s: 3, b: ['ဝ', 'အ', 'ချ'] },
            { w: 'သံပုရာသီး', s: 4, b: ['သ', 'ပ', 'ရ', 'သ'] },
            { w: 'သခွါးသီး', s: 3, b: ['သ', 'ခွ', 'သ'] },
            { w: 'သစ္စာပန်း', s: 3, b: ['သ', 'စ', 'ပ'] },
            { w: 'သစ်ကြားသီး', s: 3, b: ['သ', 'ကြ', 'သ'] },
            { w: 'သစ်ခွပန်း', s: 3, b: ['သ', 'ခွ', 'ပ'] },
            { w: 'သစ်တော်သီး', s: 3, b: ['သ', 'တ', 'သ'] },
            { w: 'သစ်အယ်သီး', s: 3, b: ['သ', 'အ', 'သ'] },
            { w: 'သပြေပန်း', s: 3, b: ['သ', 'ပြ', 'ပ'] },
            { w: 'သရက်သီး', s: 3, b: ['သ', 'ရ', 'သ'] },
            { w: 'ဟင်း', s: 1, b: ['ဟ'] },
            { w: 'ဟင်းချို', s: 2, b: ['ဟ', 'ချ'] },
            { w: 'ဟင်းချို', s: 2, b: ['ဟ', 'ချ'] },
            { w: 'အစိမ်းရင့်ရောင်', s: 4, b: ['အ', 'စ', 'ရ', 'ရ'] },
            { w: 'အစိမ်းရောင်', s: 3, b: ['အ', 'စ', 'ရ'] }, 
            { w: 'အညိုရောင်', s: 3, b: ['အ', 'ည', 'ရ'] },
            { w: 'အနက်ရောင်', s: 3, b: ['အ', 'န', 'ရ'] },
            { w: 'အနီရောင်', s: 3, b: ['အ', 'န', 'ရ'] },
            { w: 'အပြာရောင်', s: 3, b: ['အ', 'ပြ', 'ရ'] },
            { w: 'အဖြူရောင်', s: 3, b: ['အ', 'ဖြ', 'ရ'] },
            { w: 'အဝါရောင်', s: 3, b: ['အ', 'ဝ', 'ရ'] },
            { w: 'အာလူး', s: 2, b: ['အ', 'လ'] }, 
            { w: 'ဦးထုပ်', s: 2, b: ['အ', 'ထ'] } 
        ];
        let allSoundGroupsForReading = [];
        const audioSets = {
            set1: {
                url: 'https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းအသံ_1s.mp3',
                duration: 1,
                times: { 'က': 0, 'ခ': 1, 'ဂ': 2, 'ဃ': 2, 'င': 3, 'စ': 4, 'ဆ': 5, 'ဇ': 6, 'ဈ': 6, 'ည': 7, 'ဋ': 8, 'ဌ': 9, 'ဍ': 10, 'ဎ': 10, 'ဏ': 11, 'တ': 8, 'ထ': 9, 'ဒ': 10, 'ဓ': 10, 'န': 11, 'ပ': 12, 'ဖ': 13, 'ဗ': 14, 'ဘ': 14, 'မ': 15, 'ယ': 16, 'ရ': 16, 'လ': 17, 'ဝ': 18, 'သ': 19, 'ဟ': 20, 'ဠ': 17, 'အ': 21 }
            },
            set2: { url: 'https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းနာမည်ဗျည်းသံ_3s.mp3', duration: 3, times: {} },
            set3: {
                url: 'https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းတွဲအသံ_1s.mp3',
                duration: 1,
                times: { 'ကျ': 0, 'ကျွ': 1, 'ကြ': 2, 'ကြွ': 3, 'ကွ': 4, 'ချ': 5, 'ချွ': 6, 'ခြ': 7, 'ခွ': 8, 'ဂျ': 9, 'ဂျွ': 10, 'ဂြ': 11, 'ဂွ': 12, 'ငွ': 13, 'ငှ': 14, 'စွ': 15, 'ဆွ': 16, 'ဇွ': 17, 'ညွှ': 18, 'ညှ': 19, 'တြ': 20, 'တွ': 21, 'ထွ': 22, 'ဒြ': 23, 'ဒွ': 24, 'ဓွ': 25, 'နွ': 26, 'နွှ': 27, 'နှ': 28, 'ပျ': 29, 'ပျွ': 30, 'ပြ': 31, 'ပြွ': 32, 'ပွ': 33, 'ဖျ': 34, 'ဖြ': 35, 'ဖွ': 36, 'ဗျ': 37, 'ဗွ': 38, 'ဘွ': 39, 'မျ': 40, 'မျှ': 41, 'မြ': 42, 'မြွ': 43, 'မြှ': 44, 'မွ': 45, 'မွှ': 46, 'မှ': 47, 'ယျ': 48, 'ယွ': 49, 'ယှ': 50, 'ရွ': 51, 'ရွှ': 52, 'ရှ': 53, 'လျ': 54, 'လျှ': 55, 'ငြ': 56, 'လွ': 57, 'လွှ': 58, 'လှ': 59, 'ဝှ': 60, 'သျ': 61, 'သွ': 62, 'ဟွ': 63 }
            },
            imageGame: {
                url: 'https://raw.githubusercontent.com/nathantun93/bell/main/အမျိုးစုံ.mp3',
                duration: 2,
                times: {}
            }
        };
        const feedbackAudio = { 'correct': 'https://raw.githubusercontent.com/nathantun93/bell/main/correct.mp3', 'wrong': 'https://raw.githubusercontent.com/nathantun93/bell/main/error.mp3' };
        const elements = {
            allConsonantGroupsUnified: rootEl.querySelector('#all-consonant-groups-unified'), 
            consonantGrid: rootEl.querySelector('#consonant-grid'),
            combinedConsonantsContainer: rootEl.querySelector('#combined-consonants-container'),
            inputGameControls: rootEl.querySelector('#input-game-controls'),
            chatInput: rootEl.querySelector('#chat-input'),
            toggleTypingBtn: rootEl.querySelector('#toggle-typing-btn'),
            soundToggleIcon: rootEl.querySelector('#sound-toggle-icon'),
            clickGameToggleBtn: rootEl.querySelector('#click-game-toggle-btn'),
            pickGameToggleBtn: rootEl.querySelector('#pick-game-toggle-btn'),
            pickOneOfThreeContainer: rootEl.querySelector('#pick-one-of-three-container'),
            groupSelectorBtn: rootEl.querySelector('#group-selector-btn'),
            groupSelectorDisplay: rootEl.querySelector('#group-selector-display'),
            gameStatus: rootEl.querySelector('#game-status'),
            correctScoreDisplay: rootEl.querySelector('#correct-score'),
            incorrectScoreDisplay: rootEl.querySelector('#incorrect-score'),
            readAloudBtn: rootEl.querySelector('#read-aloud-btn'),
            mainContentArea: rootEl.querySelector('#main-content-area'), 
            imageGameToggleBtn: rootEl.querySelector('#image-game-toggle-btn'),
            imageGameContainer: rootEl.querySelector('#image-game-container'),
            imageDisplay: rootEl.querySelector('#image-display'),
            imageDisplayFallback: rootEl.querySelector('#image-display-fallback'),
            imageGameInstruction: rootEl.querySelector('#image-game-instruction'),
            imageLevelBadge: rootEl.querySelector('#image-level-badge'),
            imageInstructionText: rootEl.querySelector('#image-instruction-text'),
            imageOptionsGrid: rootEl.querySelector('#image-options-grid'),
        };
        let currentGameMode = null, correctAnswer = null, correctCount = 0, incorrectCount = 0;
        let userClickSequence = '', audioTimer = null, currentAudioSet = 'set1', audioSegmentTimer = null, isAudioPlaying = false;
        let isReadingAloud = false;
        let currentSelectedGroupIndex = 0;

        const scoreWidget = rootEl.querySelector('#floating-score-widget');
        const scoreHeader = rootEl.querySelector('#score-container');
        let isDragging = false;
        let hasMoved = false;
        let dragStartX = 0, dragStartY = 0;
        let initialWidgetX = 0, initialWidgetY = 0;

        scoreHeader.addEventListener('mousedown', dragStart);
        scoreHeader.addEventListener('touchstart', dragStart, {passive: false});

        function dragStart(e) {
            if (e.target.closest('#controls-menu')) return;
            const event = e.type.includes('mouse') ? e : e.touches[0];
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            const rect = scoreWidget.getBoundingClientRect();
            if (scoreWidget.style.transform) {
                scoreWidget.style.transform = 'none';
                scoreWidget.style.left = rect.left + 'px';
                scoreWidget.style.top = rect.top + 'px';
            }
            initialWidgetX = scoreWidget.offsetLeft;
            initialWidgetY = scoreWidget.offsetTop;
            isDragging = true;
            hasMoved = false;
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, {passive: false});
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchend', dragEnd);
        }
        function drag(e) {
            if (!isDragging) return;
            const event = e.type.includes('mouse') ? e : e.touches[0];
            const dx = event.clientX - dragStartX;
            const dy = event.clientY - dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
            if (hasMoved) {
                e.preventDefault();
                let newX = initialWidgetX + dx;
                let newY = initialWidgetY + dy;
                const headerHeight = rootEl.querySelector('#fixed-header').offsetHeight;
                const minY = headerHeight + 10;
                const maxY = window.innerHeight - scoreWidget.offsetHeight - 10;
                const maxX = window.innerWidth - scoreWidget.offsetWidth;
                if (newY < minY) newY = minY;
                if (newY > maxY) newY = maxY;
                if (newX < 0) newX = 0;
                if (newX > maxX) newX = maxX;
                scoreWidget.style.left = newX + 'px';
                scoreWidget.style.top = newY + 'px';
            }
        }
        function dragEnd() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchend', dragEnd);
        }
        scoreHeader.addEventListener('click', function(e) {
            if (hasMoved) { e.preventDefault(); return; }
            toggleControlsMenu();
        });

        let netScore = 0;
        const TARGET_SCORE = 30;
        let isVictorySequence = false;
        let imageGameStage = 'first';
        let currentImageWordData = null;
        const soundGroups = { 'ဂဃ': ['ဂ', 'ဃ'], 'ဇဈ': ['ဇ', 'ဈ'], 'ဋတ': ['ဋ', 'တ'], 'ဌထ': ['ဌ', 'ထ'], 'ဍဎဒဓ': ['ဍ', 'ဎ', 'ဒ', 'ဓ'], 'ဏန': ['ဏ', 'န'], 'ဗဘ': ['ဗ', 'ဘ'], 'ယရ': ['ယ', 'ရ'], 'လဠ': ['လ', 'ဠ'] };
        const combinedSoundAlikePairs = {
            'ကျကြ': ['ကျ', 'ကြ'], 'ချခြ': ['ချ', 'ခြ'], 'ဂျဂြ': ['ဂျ', 'ဂြ'],
            'ပျပြ': ['ပျ', 'ပြ'], 'ဖျဖြ': ['ဖျ', 'ဖြ'], 'မျမြ': ['မျ', 'မြ'],
            'ဒွဓွ': ['ဒွ', 'ဓွ'], 'ဗွဘွ': ['ဗွ', 'ဘွ'], 'ယွရွ': ['ယွ', 'ရွ'], 'ယှရှ': ['ယှ', 'ရှ']
        };
        const allSoundAlikeGroups = {...soundGroups, ...combinedSoundAlikePairs};
        const ungroupedWhiteConsonants = ['က', 'ခ', 'င', 'စ', 'ဆ', 'ည', 'ပ', 'ဖ', 'မ', 'ဝ', 'သ', 'ဟ', 'အ'];
        const colorClasses = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-red-100', 'bg-pink-100', 'bg-indigo-100', 'bg-teal-100', 'bg-orange-100'];
        const highlightColors = ['#3b82f6', '#10b981', '#a855f7', '#eab308', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
        const combinedColors = ['bg-cyan-100', 'bg-lime-100', 'bg-fuchsia-100', 'bg-amber-100', 'bg-rose-100', 'bg-sky-100'];
        const combinedHighlightColors = ['#0891b2', '#4d7c0f', '#c026d3', '#b45309', '#e11d48', '#0284c7'];
        let colorMap = {};
        const rewardConfettiConfigs = [
            { shapes: ['star'], colors: ['#ff7e5f', '#feb47b', '#f8d210', '#a8dadc'], scalar: 1.5, particleCount: 100, ticks: 150 },
            { shapes: ['heart'], colors: ['#ff006e', '#ffcbf2', '#f0004c', '#d62828'], scalar: 1.8, particleCount: 120, ticks: 180, spread: 100 },
            { shapes: ['circle', 'square'], colors: ['#ffd700', '#32cd32', '#f9f871', '#00a300'], scalar: 1.2, particleCount: 180, ticks: 120, gravity: 0.8 },
            { shapes: ['circle', 'line'], colors: ['#f0f8ff', '#e6e6fa', '#ffe4e1', '#d8bfd8'], scalar: 1, particleCount: 200, ticks: 160, zIndex: 999 },
            { shapes: ['circle', 'square'], colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'], scalar: 0.8, particleCount: 250, ticks: 100 }
        ];
        let rewardIndex = 0;
        function triggerDiverseConfetti() {
            const config = rewardConfettiConfigs[rewardIndex % rewardConfettiConfigs.length];
            rewardIndex++;
            confetti({ ...config, origin: { y: 0.7 }, spread: config.spread || 90, zIndex: 200 });
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, zIndex: 200, });
        }
        function updateSpiderProgress() {
            if (netScore < 0) netScore = 0;
            if (netScore > TARGET_SCORE) netScore = TARGET_SCORE;
            const progressPercent = (netScore / TARGET_SCORE) * 100;
            rootEl.querySelector('#spider-icon').style.bottom = `calc(${progressPercent}% - 14px)`;
            rootEl.querySelector('#spider-web-fill').style.height = `${progressPercent}%`;
            if (currentGameMode) {
                rootEl.querySelector('#spider-progress-container').classList.add('active');
            } else {
                rootEl.querySelector('#spider-progress-container').classList.remove('active');
            }
        }
        function triggerImageLevelUp() {
            isVictorySequence = true;
            let nextStage = 'first';
            let levelName = 'Level 1';
            if (imageGameStage === 'first') { nextStage = 'last'; levelName = 'Level 2'; }
            else if (imageGameStage === 'last') { nextStage = 'middle'; levelName = 'Level 3'; }
            else { nextStage = 'first'; levelName = 'Level 1'; }
            const overlay = rootEl.querySelector('#victory-overlay');
            overlay.querySelector('#victory-title').innerText = "Level Cleared!";
            overlay.querySelector('#victory-subtitle').innerText = "Get ready for " + levelName + "!";
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            const end = Date.now() + 5000;
            const confettiInterval = setInterval(() => {
                if (Date.now() > end) clearInterval(confettiInterval);
                else triggerDiverseConfetti();
            }, 500);
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
                isVictorySequence = false;
                imageGameStage = nextStage;
                netScore = 0;
                updateSpiderProgress();
                showGameStatus(levelName + " Started!", 'info');
                askImageQuestion();
            }, 5000);
        }
        function triggerVictory(completedMode) {
            if (completedMode === 'image') { triggerImageLevelUp(); return; }
            isVictorySequence = true;
            stopGame(); 
            const overlay = rootEl.querySelector('#victory-overlay');
            overlay.querySelector('#victory-title').innerText = "Victory!";
            overlay.querySelector('#victory-subtitle').innerText = "You are Professional of Myanmar Consonant!";
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            const end = Date.now() + 5000;
            const confettiInterval = setInterval(() => {
                if (Date.now() > end) { clearInterval(confettiInterval); } else { triggerDiverseConfetti(); }
            }, 500);
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
                isVictorySequence = false;
                pointToNextGame(completedMode);
            }, 5000);
        }
        function pointToNextGame(completedMode) {
            rootEl.querySelectorAll('.next-game-highlight').forEach(el => el.classList.remove('next-game-highlight'));
            let nextBtnId = null;
            let promptText = "";
            if (completedMode === 'pick') { nextBtnId = 'click-game-toggle-btn'; promptText = "Play Click Game next?"; }
            else if (completedMode === 'click') { nextBtnId = 'image-game-toggle-btn'; promptText = "Play Picture Game next?"; }
            if (nextBtnId) {
                const btn = rootEl.querySelector('#' + nextBtnId);
                if (btn) btn.classList.add('next-game-highlight');
                showGameStatus(promptText, "info");
                toggleControlsMenu(true); 
            }
        }
        function isInSameSoundGroup(c1, c2) {
            if (c1 === c2) return false;
            for (const group of Object.values(allSoundAlikeGroups)) {
                if (group.includes(c1) && group.includes(c2)) return true;
            }
            return false;
        }
        function checkOptionsForSoundAlikeConflict(options) {
            for (let i = 0; i < options.length; i++) {
                for (let j = i + 1; j < options.length; j++) {
                    if (isInSameSoundGroup(options[i], options[j])) { return true; }
                }
            }
            return false;
        }
        function generateOriginalGrid() {
            elements.consonantGrid.innerHTML = '';
            let groupedColorIndex = 0;
            for (const groupKey in soundGroups) {
                const highlightColor = highlightColors[groupedColorIndex % highlightColors.length];
                soundGroups[groupKey].forEach(consonant => { colorMap[consonant] = highlightColor; });
                groupedColorIndex++;
            }
            ungroupedWhiteConsonants.forEach(consonant => { colorMap[consonant] = '#3b82f6'; });
            const getBgColorForOriginal = (consonant) => {
                for (let i = 0; i < Object.keys(soundGroups).length; i++) {
                    const groupKey = Object.keys(soundGroups)[i];
                    if (soundGroups[groupKey].includes(consonant)) return colorClasses[i % colorClasses.length];
                }
                return 'bg-white border border-gray-300';
            };
            allConsonants.forEach(c => {
                const div = document.createElement('div');
                div.className = `consonant-item flex items-center justify-center text-3xl font-semibold`;
                div.dataset.consonant = c;
                div.onclick = () => handleGridClick(c);
                if (c === '') div.classList.add('inactive');
                else div.classList.add(...getBgColorForOriginal(c).split(' '));
                if (c === '') {
                    div.innerHTML = `<span class="select-none">${c}</span>`;
                } else {
                    div.innerHTML = `<span class="select-none">${c}</span><span class="roman-text absolute bottom-1 right-1.5 text-[11px] leading-none text-gray-500 font-normal">${romanMap[c] || ''}</span>`;
                }
                elements.consonantGrid.appendChild(div);
            });
        }
        function generateCombinedGrids() {
            elements.combinedConsonantsContainer.innerHTML = '';
            combinedConsonantGroups.forEach((group, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'consonant-group-wrapper'; 
                wrapper.dataset.groupIndex = index + 1;
                const grid = document.createElement('div');
                grid.className = 'combined-consonant-grid';
                const colorClass = combinedColors[index % combinedColors.length];
                const highlightColor = combinedHighlightColors[index % combinedColors.length];
                group.forEach(c => {
                    colorMap[c] = highlightColor;
                    const div = document.createElement('div');
                    div.className = `consonant-item flex items-center justify-center text-2xl font-semibold ${colorClass}`;
                    div.dataset.consonant = c;
                    div.onclick = () => handleGridClick(c);
                    div.innerHTML = `<span class="select-none">${c}</span><span class="roman-text absolute bottom-1 right-1.5 text-[10px] leading-none text-gray-600 font-normal">${romanMap[c] || ''}</span>`;
                    grid.appendChild(div);
                });
                wrapper.appendChild(grid);
                elements.combinedConsonantsContainer.appendChild(wrapper);
            });
        }
        function stopCurrentAudio() {
            const audioPlayer = rootEl.querySelector('#audio-player');
            audioPlayer.pause();
            audioPlayer.src = '';
            if (audioSegmentTimer) { clearTimeout(audioSegmentTimer); audioSegmentTimer = null; }
            isAudioPlaying = false; 
        }
        function playAudio(word, feedback = false) {
            if (isReadingAloud && !feedback) { } else { stopCurrentAudio(); }
            const audioPlayer = rootEl.querySelector('#audio-player');
            return new Promise((resolve) => {
                const cleanUpAndResolve = () => { audioPlayer.onended = null; audioPlayer.onerror = null; audioPlayer.oncanplaythrough = null; resolve(); };
                audioPlayer.onended = cleanUpAndResolve;
                audioPlayer.onerror = (e) => { console.error(`Audio error playing '${word}'. Event:`, e); cleanUpAndResolve(); }; 
                audioPlayer.onplay = () => { isAudioPlaying = true; };
                const playPromise = p => p.catch(e => { if (e.name !== 'AbortError') console.error('Audio play error:', e); cleanUpAndResolve(); });
                if (feedback) {
                    audioPlayer.src = feedbackAudio[word];
                    audioPlayer.currentTime = 0;
                    playPromise(audioPlayer.play());
                } else {
                    let set = null;
                    if (currentGameMode === 'image' && audioSets.imageGame.times[word] !== undefined) { set = audioSets.imageGame; }
                    else if (audioSets.set3.times.hasOwnProperty(word)) { set = audioSets.set3; }
                    else if (audioSets[currentAudioSet].times.hasOwnProperty(word)) { set = audioSets[currentAudioSet]; }
                    if (set) {
                        const startTime = set.times[word];
                        const playSegment = () => {
                            audioPlayer.currentTime = startTime;
                            playPromise(audioPlayer.play());
                            audioSegmentTimer = setTimeout(() => { audioPlayer.pause(); resolve(); }, set.duration * 1000 - 50);
                        };
                        if (audioPlayer.src !== set.url) {
                            audioPlayer.src = set.url;
                            audioPlayer.oncanplaythrough = () => { audioPlayer.oncanplaythrough = null; playSegment(); };
                        } else playSegment();
                    } else { console.warn(`Audio not found for '${word}'.`); resolve(); }
                }
            });
        }
        function updateScoreDisplay() { 
            elements.correctScoreDisplay.innerHTML = `<i class="fa-solid fa-check-circle"></i> Correct: ${correctCount}`;
            elements.incorrectScoreDisplay.innerHTML = `<i class="fa-solid fa-times-circle"></i> Wrong: ${incorrectCount}`;
        }
        function toggleSoundSet() {
            if (currentGameMode) { showGameStatus("Cannot change audio while game is active.", 'info'); return; }
            currentAudioSet = (currentAudioSet === 'set1') ? 'set2' : 'set1';
            elements.soundToggleIcon.classList.toggle('fa-volume-high');
            elements.soundToggleIcon.classList.toggle('fa-bell');
            showGameStatus(`Switched to Audio Set ${currentAudioSet === 'set1' ? 1 : 2}.`, 'info');
        }
        elements.groupSelectorBtn.addEventListener('click', () => {
            stopGame();
            if (allSoundGroupsForReading.length === 0) return;
            currentSelectedGroupIndex = (currentSelectedGroupIndex + 1) % allSoundGroupsForReading.length;
            const newIndex = currentSelectedGroupIndex;
            elements.groupSelectorDisplay.innerText = newIndex + 1;
            showGameStatus(`Group ${newIndex + 1} Selected.`, 'info');
            let targetElement;
            if (newIndex === 0) { targetElement = rootEl.querySelector('#original-consonant-group-wrapper'); }
            else {
                const combinedWrappers = elements.combinedConsonantsContainer.querySelectorAll('.consonant-group-wrapper');
                targetElement = combinedWrappers[newIndex - 1]; 
            }
            if (targetElement) {
                elements.allConsonantGroupsUnified.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => { targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
        });
        elements.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleTypingInput(); });
        elements.chatInput.addEventListener('input', (e) => {
            const currentVal = e.target.value;
            if (currentGameMode !== 'typing') { 
                const parsed = parseInput(currentVal);
                if (parsed.length > 0) { const lastSound = parsed[parsed.length - 1]; playAudio(lastSound); }
            }
        });
        elements.chatInput.addEventListener('focus', () => {
            elements.allConsonantGroupsUnified.classList.add('typing-active');
            elements.inputGameControls.scrollIntoView({ behavior: 'smooth', block: 'end' }); 
        });
        elements.chatInput.addEventListener('blur', () => {
            if (currentGameMode !== 'typing') { elements.allConsonantGroupsUnified.classList.remove('typing-active'); }
        });
        function parseInput(input) {
            const allValid = { ...audioSets.set1.times, ...audioSets.set2.times, ...audioSets.set3.times };
            const validConsonants = Object.keys(allValid).sort((a, b) => b.length - a.length);
            let remainingText = input.trim(), parsed = [];
            while (remainingText.length > 0) {
                const match = validConsonants.find(c => remainingText.startsWith(c));
                if (match) { parsed.push(match); remainingText = remainingText.substring(match.length); } 
                else { remainingText = remainingText.substring(1); }
            }
            return parsed;
        }
        function handleTypingInput() {
            if (currentGameMode === 'typing') checkTypingAnswer();
            else { elements.chatInput.value = ''; }
        }
        function toggleTypingGame() { if (currentGameMode === 'typing') stopGame(); else startTypingGame(); }
        function getQuestionConsonants() {
            const activeGroup = allSoundGroupsForReading[currentSelectedGroupIndex];
            if (!activeGroup || activeGroup.length === 0) return [];
            if (currentSelectedGroupIndex === 0) {
                if (currentAudioSet === 'set2') return [activeGroup[Math.floor(Math.random() * activeGroup.length)]];
                const possibleGroups = Object.values(soundGroups).filter(g => g.every(c => activeGroup.includes(c)));
                const possibleSingles = ungroupedWhiteConsonants.filter(c => activeGroup.includes(c)).map(c => [c]);
                const allQuestions = [...possibleGroups, ...possibleSingles];
                if (allQuestions.length === 0) return [activeGroup[Math.floor(Math.random() * activeGroup.length)]];
                return allQuestions[Math.floor(Math.random() * allQuestions.length)];
            } else { return [activeGroup[Math.floor(Math.random() * activeGroup.length)]]; }
        }
        function startTypingGame() {
            stopGame();
            currentGameMode = 'typing';
            netScore = 0; updateSpiderProgress();
            rootEl.classList.add('game-active');
            elements.allConsonantGroupsUnified.classList.add('typing-active');
            showGameStatus(`Typing Game (Group ${currentSelectedGroupIndex + 1}) Started.`, 'info');
            elements.chatInput.focus();
            elements.toggleTypingBtn.innerText = 'Game Stop';
            elements.toggleTypingBtn.classList.replace('bg-green-500', 'bg-red-500');
            askTypingQuestion();
        }
        function askTypingQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            const questionConsonants = getQuestionConsonants();
            if (questionConsonants.length === 0) { stopGame(); showGameStatus("No consonants for question.", 'incorrect'); return; }
            correctAnswer = questionConsonants.sort().join('');
            const message = questionConsonants.length > 1 ? "Which letters do you hear? Type all." : "Which letter do you hear?";
            showGameStatus(message, 'info');
            elements.chatInput.placeholder = message;
            elements.chatInput.value = '';
            playAudio(questionConsonants[0]);
            audioTimer = setInterval(() => playAudio(questionConsonants[0]), 5000);
        }
        function checkTypingAnswer() {
            const userInput = elements.chatInput.value;
            const sortedUserInput = userInput.trim().split('').sort().join('');
            elements.chatInput.value = '';
            if (sortedUserInput === correctAnswer) {
                if (audioTimer) clearInterval(audioTimer); audioTimer = null;
                playAudio('correct', true); correctCount++; updateScoreDisplay(); showGameStatus('Correct!', 'correct');
                triggerDiverseConfetti();
                netScore++; updateSpiderProgress();
                if (netScore >= TARGET_SCORE) triggerVictory('typing');
                else setTimeout(askTypingQuestion, 2000);
            } else {
                playAudio('wrong', true); incorrectCount++; updateScoreDisplay();
                showGameStatus(`Wrong. The answer was "${correctAnswer}".`, 'incorrect');
                netScore--; updateSpiderProgress();
                setTimeout(askTypingQuestion, 3000);
            }
        }
        function toggleClickGame() { if (currentGameMode === 'click') stopGame(); else startClickGame(); }
        function startClickGame() {
            stopGame();
            currentGameMode = 'click'; userClickSequence = '';
            netScore = 0; updateSpiderProgress();
            rootEl.classList.add('game-active');
            elements.clickGameToggleBtn.classList.add('active');
            showGameStatus(`Click Game Started.`, 'info');
            askClickQuestion();
        }
        function askClickQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            const activeGroup = allSoundGroupsForReading[currentSelectedGroupIndex].filter(c => c !== '');
            if (activeGroup.length === 0) { stopGame(); showGameStatus("No consonants for question.", 'incorrect'); return; }
            correctAnswer = activeGroup[Math.floor(Math.random() * activeGroup.length)];
            showGameStatus("Click the letter you hear.", 'info');
            playAudio(correctAnswer);
            audioTimer = setInterval(() => playAudio(correctAnswer), 5000);
        }
        function showGameStatus(message, type) {
            elements.gameStatus.textContent = message;
            elements.gameStatus.className = '';
            elements.gameStatus.classList.add(type, 'show');
            setTimeout(() => elements.gameStatus.classList.remove('show'), type === 'incorrect' ? 3000 : 2000);
        }
        function handleGridClick(clickedConsonant) {
            if (clickedConsonant === '') return;
            if (isVictorySequence) return;
            const clickedElement = rootEl.querySelector(`.consonant-item[data-consonant="${clickedConsonant}"]`);
            if (!clickedElement) return;
            clickedElement.style.setProperty('--highlight-color', colorMap[clickedConsonant] || '#10b981');
            clickedElement.classList.add('highlight');
            clickedElement.addEventListener('animationend', () => clickedElement.classList.remove('highlight'), { once: true });
            if (currentGameMode === 'click') {
                if (!audioTimer) return;
                if (clickedConsonant === correctAnswer || isInSameSoundGroup(clickedConsonant, correctAnswer)) {
                    if (audioTimer) clearInterval(audioTimer); audioTimer = null;
                    playAudio('correct', true); correctCount++; updateScoreDisplay(); showGameStatus('Correct!', 'correct');
                    triggerDiverseConfetti();
                    netScore++; updateSpiderProgress();
                    if (netScore >= TARGET_SCORE) triggerVictory('click');
                    else setTimeout(askClickQuestion, 2000);
                } else {
                    if (audioTimer) clearInterval(audioTimer); audioTimer = null;
                    playAudio('wrong', true); incorrectCount++; updateScoreDisplay(); showGameStatus('Wrong! Try again.', 'incorrect');
                    netScore--; updateSpiderProgress();
                    setTimeout(askClickQuestion, 2000);
                }
            } else if (!currentGameMode) { playAudio(clickedConsonant); }
        }
        function askPickQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            const group = allSoundGroupsForReading[currentSelectedGroupIndex];
            const availableGroup = group.filter(c => c !== ''); 
            if (availableGroup.length < 3) { stopGame(); showGameStatus("Not enough letters in this group for Pick Game.", 'incorrect'); return; }
            let options = [];
            let attempts = 0;
            const MAX_ATTEMPTS = 50; 
            while (options.length < 3 && attempts < MAX_ATTEMPTS) {
                attempts++;
                options = []; 
                let candidates = [];
                let tempAvailable = [...availableGroup]; 
                while (candidates.length < 3 && tempAvailable.length > 0) {
                    const index = Math.floor(Math.random() * tempAvailable.length);
                    candidates.push(tempAvailable[index]);
                    tempAvailable.splice(index, 1);
                }
                if (candidates.length < 3) continue;
                if (checkOptionsForSoundAlikeConflict(candidates)) { continue; } else { options = candidates; break; }
            }
            if (attempts >= MAX_ATTEMPTS) { stopGame(); showGameStatus("Could not find distinct options.", 'incorrect'); return; }
            correctAnswer = options[Math.floor(Math.random() * 3)];
            elements.pickOneOfThreeContainer.innerHTML = '';
            options.forEach(c => {
                const div = document.createElement('div');
                const colorClass = colorClasses[Math.floor(Math.random() * colorClasses.length)];
                div.className = `consonant-item flex items-center justify-center text-3xl font-semibold w-full sm:w-1/3 ${colorClass}`;
                div.dataset.consonant = c;
                div.onclick = () => checkPickAnswer(c, div);
                div.innerHTML = `<span class="select-none">${c}</span>`;
                elements.pickOneOfThreeContainer.appendChild(div);
            });
            elements.pickOneOfThreeContainer.querySelectorAll('.consonant-item').forEach(el => {
                el.style.setProperty('--highlight-color', '#3b82f6');
                el.classList.add('highlight');
                el.addEventListener('animationend', () => el.classList.remove('highlight'), { once: true });
            });
            showGameStatus("Pick the letter you hear.", 'info');
            playAudio(correctAnswer);
            audioTimer = setInterval(() => playAudio(correctAnswer), 5000);
        }
        function togglePickGame() { if (currentGameMode === 'pick') stopGame(); else startPickGame(); }
        function startPickGame() {
            stopGame();
            currentGameMode = 'pick';
            netScore = 0; updateSpiderProgress();
            rootEl.classList.add('game-active');
            elements.pickGameToggleBtn.classList.add('active');
            elements.pickOneOfThreeContainer.classList.remove('hidden');
            elements.pickOneOfThreeContainer.classList.add('flex');
            let targetElement;
            if (currentSelectedGroupIndex === 0) { targetElement = rootEl.querySelector('#original-consonant-group-wrapper'); }
            else {
                const combinedWrappers = elements.combinedConsonantsContainer.querySelectorAll('.consonant-group-wrapper');
                targetElement = combinedWrappers[currentSelectedGroupIndex - 1]; 
            }
            if (targetElement) {
                targetElement.after(elements.pickOneOfThreeContainer); 
                setTimeout(() => { elements.pickOneOfThreeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); 
            }
            showGameStatus(`Pick the Correct Letter Game Started.`, 'info');
            askPickQuestion(); 
        }
        function checkPickAnswer(clicked, element) {
            if (isVictorySequence) return;
            elements.pickOneOfThreeContainer.querySelectorAll('.consonant-item').forEach(el => el.onclick = null);
            if (clicked === correctAnswer) {
                if (audioTimer) clearInterval(audioTimer); audioTimer = null;
                element.style.setProperty('--highlight-color', '#10b981');
                element.classList.add('highlight');
                playAudio('correct', true); correctCount++; updateScoreDisplay(); showGameStatus('Correct!', 'correct');
                triggerDiverseConfetti();
                netScore++; updateSpiderProgress();
                if (netScore >= TARGET_SCORE) triggerVictory('pick');
                else setTimeout(askPickQuestion, 2000);
            } else {
                element.style.setProperty('--highlight-color', '#ef4444');
                element.classList.add('highlight');
                playAudio('wrong', true); incorrectCount++; updateScoreDisplay(); showGameStatus('Wrong!', 'incorrect');
                const correctEl = elements.pickOneOfThreeContainer.querySelector(`[data-consonant="${correctAnswer}"]`);
                if(correctEl) { correctEl.style.setProperty('--highlight-color', '#10b981'); correctEl.classList.add('highlight'); }
                netScore--; updateSpiderProgress();
                setTimeout(askPickQuestion, 3000); 
            }
        }
        function toggleImageGame() { if (currentGameMode === 'image') stopGame(); else startImageGame(); }
        function startImageGame() {
            stopGame();
            currentGameMode = 'image';
            imageGameStage = 'first';
            netScore = 0; updateSpiderProgress();
            rootEl.classList.add('game-active');
            elements.imageGameToggleBtn.classList.add('active');
            elements.imageGameContainer.classList.add('active');
            elements.imageGameContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showGameStatus(`Picture Game Started! Level 1: First Letter`, 'info');
            askImageQuestion();
        }
        // The source images live in a separate third-party GitHub repo
        // (nathantun93/Pic) as a mix of .png/.jpg/.jpeg files. The word list
        // doesn't record which extension each one uses, so try them in
        // order; if none load, show the word itself instead of a broken
        // image (the old fallback pointed at via.placeholder.com, which no
        // longer exists).
        function setImageWithFallback(word) {
            const extensions = ['png', 'jpg', 'jpeg'];
            let attempt = 0;
            elements.imageDisplayFallback.classList.add('hidden');
            elements.imageDisplay.classList.remove('hidden');
            elements.imageDisplay.onerror = () => {
                attempt++;
                if (attempt < extensions.length) {
                    elements.imageDisplay.src = `https://raw.githubusercontent.com/nathantun93/Pic/main/${encodeURIComponent(word)}.${extensions[attempt]}`;
                } else {
                    elements.imageDisplay.onerror = null;
                    elements.imageDisplay.classList.add('hidden');
                    elements.imageDisplayFallback.textContent = word;
                    elements.imageDisplayFallback.classList.remove('hidden');
                }
            };
            elements.imageDisplay.src = `https://raw.githubusercontent.com/nathantun93/Pic/main/${encodeURIComponent(word)}.${extensions[0]}`;
        }
        function askImageQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            let validWords = [];
            if (imageGameStage === 'middle') { validWords = imageWords.filter(item => item.s === 3); }
            else { validWords = imageWords; }
            if (validWords.length === 0) { stopGame(); showGameStatus("No words for this level.", 'incorrect'); return; }
            currentImageWordData = validWords[Math.floor(Math.random() * validWords.length)];
            const word = currentImageWordData.w;
            let correctCons = '';
            if (imageGameStage === 'first') {
                correctCons = currentImageWordData.b[0];
                elements.imageLevelBadge.innerText = "LEVEL 1";
                elements.imageInstructionText.innerText = "Find the FIRST letter";
            } else if (imageGameStage === 'last') {
                correctCons = currentImageWordData.b[currentImageWordData.b.length - 1];
                elements.imageLevelBadge.innerText = "LEVEL 2";
                elements.imageInstructionText.innerText = "Find the LAST letter";
            } else if (imageGameStage === 'middle') {
                correctCons = currentImageWordData.b[1];
                elements.imageLevelBadge.innerText = "LEVEL 3";
                elements.imageInstructionText.innerText = "Find the MIDDLE letter";
            }
            if (!correctCons) { console.warn("Data issue with word:", word); askImageQuestion(); return; }
            correctAnswer = correctCons;
            setImageWithFallback(word);
            let options = [correctAnswer];
            while (options.length < 4) {
                const randomC = cleanConsonants[Math.floor(Math.random() * cleanConsonants.length)];
                if (!options.includes(randomC)) options.push(randomC);
            }
            options = options.sort(() => Math.random() - 0.5);
            elements.imageOptionsGrid.innerHTML = '';
            options.forEach(c => {
                const div = document.createElement('div');
                div.className = `consonant-item flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all`;
                div.dataset.consonant = c;
                div.innerText = c;
                div.onclick = () => checkImageAnswer(c, div);
                elements.imageOptionsGrid.appendChild(div);
            });
            playAudio(word);
            audioTimer = setInterval(() => playAudio(word), 4000);
        }
        function checkImageAnswer(clicked, element) {
            if (isVictorySequence) return;
            elements.imageOptionsGrid.querySelectorAll('.consonant-item').forEach(el => el.onclick = null);
            if (clicked === correctAnswer) {
                if (audioTimer) clearInterval(audioTimer); audioTimer = null;
                element.style.backgroundColor = '#dcfce7';
                element.style.borderColor = '#22c55e';
                playAudio('correct', true);
                correctCount++; updateScoreDisplay(); showGameStatus('Correct!', 'correct');
                triggerDiverseConfetti();
                netScore++; updateSpiderProgress();
                if (netScore >= TARGET_SCORE) { triggerVictory('image'); } else { setTimeout(askImageQuestion, 2000); }
            } else {
                element.style.backgroundColor = '#fee2e2';
                element.style.borderColor = '#ef4444';
                playAudio('wrong', true);
                incorrectCount++; updateScoreDisplay(); showGameStatus('Wrong!', 'incorrect');
                const correctEl = Array.from(elements.imageOptionsGrid.children).find(el => el.innerText === correctAnswer);
                if (correctEl) { correctEl.style.borderColor = '#22c55e'; correctEl.style.backgroundColor = '#dcfce7'; }
                netScore--; updateSpiderProgress();
                setTimeout(askImageQuestion, 3000);
            }
        }
        function stopGame() {
            if (audioTimer) clearInterval(audioTimer); audioTimer = null;
            stopCurrentAudio();
            rootEl.classList.remove('game-active');
            if (!isVictorySequence) {
                if (currentGameMode) showGameStatus("Game Stopped.", 'info');
                rootEl.querySelectorAll('.next-game-highlight').forEach(el => el.classList.remove('next-game-highlight'));
            }
            if (currentGameMode === 'typing') {
                elements.toggleTypingBtn.innerText = 'Game Start';
                elements.toggleTypingBtn.classList.replace('bg-red-500', 'bg-green-500');
                elements.chatInput.placeholder = 'Type to hear sound or play game...';
                elements.allConsonantGroupsUnified.classList.remove('typing-active');
            } else if (currentGameMode === 'click') {
                elements.clickGameToggleBtn.classList.remove('active');
            } else if (currentGameMode === 'pick') {
                elements.pickGameToggleBtn.classList.remove('active');
                elements.pickOneOfThreeContainer.classList.add('hidden');
                elements.pickOneOfThreeContainer.classList.remove('flex');
                if (elements.mainContentArea) elements.mainContentArea.prepend(elements.pickOneOfThreeContainer);
            } else if (currentGameMode === 'image') {
                elements.imageGameToggleBtn.classList.remove('active');
                elements.imageGameContainer.classList.remove('active');
            }
            currentGameMode = null; correctCount = 0; incorrectCount = 0; updateScoreDisplay();
            correctAnswer = null; userClickSequence = '';
            if (!isVictorySequence) { netScore = 0; updateSpiderProgress(); }
            else { rootEl.querySelector('#spider-progress-container').classList.remove('active'); }
            elements.allConsonantGroupsUnified.classList.remove('typing-active');
        }
        async function readAloudCurrentGroup() {
            if (isAudioPlaying && isReadingAloud) {
                isReadingAloud = false;
                stopCurrentAudio();
                elements.readAloudBtn.classList.remove('active');
                return;
            }
            isReadingAloud = true;
            elements.readAloudBtn.classList.add('active');
            const groupToRead = allSoundGroupsForReading[currentSelectedGroupIndex];
            isAudioPlaying = true;
            for (const consonant of groupToRead) {
                if (!isReadingAloud) break; 
                const element = rootEl.querySelector(`.consonant-item[data-consonant="${consonant}"]`);
                if (element) {
                    element.style.setProperty('--highlight-color', colorMap[consonant] || '#3b82f6');
                    element.classList.add('reading-highlight');
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                await playAudio(consonant);
                if (element) { element.classList.remove('reading-highlight'); }
                await new Promise(res => setTimeout(res, 200)); 
            }
            isAudioPlaying = false;
            isReadingAloud = false;
            elements.readAloudBtn.classList.remove('active');
        }
        elements.readAloudBtn.addEventListener('click', readAloudCurrentGroup);
        function initApp() {
            const burmeseConsonants = allConsonants.filter(c => c !== '');
            burmeseConsonants.forEach((consonant, index) => { audioSets.set2.times[consonant] = index * 3; });
            imageWords.forEach((item, index) => { audioSets.imageGame.times[item.w] = index * 2; });
            allSoundGroupsForReading = [burmeseConsonants, ...combinedConsonantGroups];
            generateOriginalGrid();
            generateCombinedGrids();
            updateScoreDisplay(); 
        }
        initApp();

        // Every onclick="..." attribute in the static HTML above resolves the
        // function it calls via the GLOBAL scope — that's how inline HTML
        // event handler attributes work, regardless of where the actual
        // function was declared. Namespacing under window.__bcgApp (not bare
        // window.toggleClickGame etc.) is what keeps this app from silently
        // colliding with a same-named function from a different hybrid-
        // wrapped app mounted alongside it (see ConsonantPracticeApp's
        // window.__cpApp for the same pattern).
        window.__bcgApp = {
          toggleSoundSet, togglePickGame, toggleClickGame, toggleImageGame, toggleTypingGame,
        };

  }, []);

  return (
    <>
      <style>{BCG_APP_CSS}</style>
      <div
        ref={containerRef}
        className="bcg-app-root bg-gray-100"
        dangerouslySetInnerHTML={{ __html: BCG_APP_BODY_HTML }}
      />
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-3 right-3 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🕷️ Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
              <button onClick={() => setShowOnlinePanel(false)} className="text-gray-400 hover:text-gray-700"><X size={22}/></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Showing everyone active in the last 7 days.</p>
            <div className="space-y-2">
              {weeklyRosterList.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s._isOnlineNow ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-800">{s.studentName}</span>
                  </div>
                  <span className="text-xs text-gray-400">{s._isOnlineNow ? 'Online now' : 'Active this week'}</span>
                </div>
              ))}
              {weeklyRosterList.length === 0 && <p className="text-center text-gray-400 py-6">No students active this week yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
