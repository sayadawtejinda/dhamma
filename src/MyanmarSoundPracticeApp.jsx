import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Myanmar Sound Practice" HTML app ──
// Same hybrid approach as the other ported apps in this project: the
// original vanilla JS (DOM manipulation, canvas fireworks, drag/game logic)
// is kept almost unchanged inside a React wrapper instead of being
// rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. This app assigns
// onclick handlers as functions (button.onclick = () => {...}) rather than
// HTML string attributes, so no window bridge object is needed. The
// original page's document.body.appendChild calls (celebration/animation
// elements) now append to this component's own root element instead. The
// original top-level `document.addEventListener('DOMContentLoaded', ...)`
// block — which would never fire here since the real DOMContentLoaded
// already happened long before this component mounts — was converted into
// an immediately-invoked function so it runs at mount time instead.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .sp-app-root so it doesn't leak onto the rest of the SPA.

const SP_ROSTER_PATH = 'artifacts/myanmar-sound-practice-app/public/data/roster';
const sanitizeSpKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const SP_APP_CSS = `
        .sp-app-root {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #a7b7c9, #c3d9e8);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        #fireworks-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999; /* High z-index to appear completely above blackout */
            pointer-events: none;
        }
        .btn-game {
            @apply font-bold py-3 px-4 rounded-xl shadow-lg transition-transform transform;
            border: 2px solid #3b82f6;
            color: #4a5568;
            background: linear-gradient(145deg, #e0e0e0, #f0f0f0);
            width: 100%;
        }
        .btn-game:active {
            @apply shadow-none translate-y-1;
            background: linear-gradient(145deg, #f0f0f0, #e0e0f0);
        }
        .btn-correct {
            background: linear-gradient(145deg, #a5d8a5, #8bc38a);
            border-color: #4CAF50;
            color: white;
            box-shadow: 0 4px #66a166;
        }
        .btn-correct:active {
            box-shadow: 0 2px #66a166;
        }
        .btn-incorrect {
            background: linear-gradient(145deg, #f08080, #e96b6b);
            border-color: #f44336;
            color: white;
            box-shadow: 0 4px #bb5050;
        }
        .btn-incorrect:active {
             box-shadow: 0 2px #bb5050;
        }
        .game-title {
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .text-character {
            font-size: 1.75rem; 
            font-weight: 900;
            color: #1a202c; 
            text-shadow: none;
            transition: all 0.3s ease-in-out;
            margin: 0 0.1rem;
        }
        .btn-game .text-character {
             color: white;
             text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.75);
        }
        @media (min-width: 768px) {
            .text-character {
                font-size: 2rem;
                margin: 0 0.25rem;
            }
        }
        /* Learning Mode Characters */
        .learn-char {
            font-size: 1.75rem; 
            font-weight: 800;
            color: #1f2937; 
            background-color: white;
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 4rem;
            padding: 0.25rem;
            transition: all 0.2s ease;
            border: 1px solid #e5e7eb;
            scroll-margin-top: 160px;
        }
        .learn-char:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 15px rgba(0,0,0,0.15);
            color: #2563EB;
            border-color: #3B82F6;
        }
        .btn-game:hover .text-character {
            transform: translateY(-2px);
        }
        .game-container {
            max-width: 64rem;
            width: 100%;
            background-color: rgba(248, 249, 250, 0.95);
            border-radius: 1.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            padding: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 1;
            max-height: 155vh;
            overflow-y: auto;
        }
        .btn-start {
            @apply font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform;
            background: #4CAF50;
            color: white;
            border: none;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
            box-shadow: 0 6px #3E8E41;
        }
        .btn-start:active {
            transform: translateY(2px);
            box-shadow: 0 4px #3E8E41;
        }
        .btn-stop {
            @apply font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform;
            background: #D9534F;
            color: white;
            border: none;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
            box-shadow: 0 6px #B53F3A;
        }
        .btn-stop:active {
            transform: translateY(2px);
            box-shadow: 0 4px #B53F3A;
        }
        #replay-sound-btn {
            @apply bg-blue-500 text-white py-3 px-4 rounded-full shadow-lg transition-transform transform hover:scale-110 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed;
        }
        .choice-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            width: 100%;
        }
        .english-translation {
            @apply text-sm text-gray-500 font-normal text-center;
        }
        .level-button {
            @apply font-bold py-2 px-4 rounded-lg border-2 transition-all duration-200 ease-in-out;
            background: #E0F2FE; /* light-blue-100 */
            border-color: #3B82F6; /* blue-500 */
            color: #2563EB; /* blue-600 */
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-shadow: none;
            position: relative; /* For the pointer */
        }
        .level-button:hover {
             background: #DBEAFE; /* blue-100 */
        }
        .level-button.active {
            @apply shadow-none transform translate-y-0.5;
            background: #3B82F6; /* blue-500 */
            border-color: #2563EB; /* blue-600 */
            color: #FFFFFF; /* white */
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
        }
        
        /* New Custom Avatars */
        #player-avatar {
            transition: bottom 1s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
        
        #avatar-icon {
            display: inline-block;
            transition: transform 0.5s ease-in-out;
        }
        
        /* Orbit Animation for Satellite Mode */
        @keyframes orbit-hover {
            0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
            33% { transform: translateX(-30px) translateY(-10px) rotate(-5deg); }
            66% { transform: translateX(30px) translateY(10px) rotate(5deg); }
            100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
        }
        .orbit-mode {
            animation: orbit-hover 6s infinite ease-in-out;
        }

        #airplane {
            transition: top 1s cubic-bezier(0.34, 1.56, 0.64, 1), right 1s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s ease-in-out, filter 0.3s ease-in-out;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
            transform: rotate(-90deg); /* Point head to bottom-left */
        }
        .airplane-dive {
            transform: rotate(-90deg) scale(1.4) !important;
            filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.9)) !important;
        }
        .emoji-drop {
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            transition: top 3s linear;
        }

        /* Remediation Pointer Style */
        .remediation-target {
            z-index: 40;
            box-shadow: 0 0 0 4px #FCD34D !important; /* Yellow ring attention */
        }
        .remediation-target::after {
            content: '👆';
            position: absolute;
            bottom: -45px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 2.5rem;
            animation: bounce-up 1s infinite ease-in-out;
            pointer-events: none;
        }
        @keyframes bounce-up {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(10px); }
        }
        
        .hint-pulse {
            animation: pulse-grow 2s infinite;
        }
        @keyframes pulse-grow {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
            }
            50% {
                transform: scale(1.05);
                box-shadow: 0 0 0 10px rgba(22, 163, 74, 0);
            }
        }
        /* Beautiful Playing Sound Style */
        .playing-sound {
            transform: scale(1.15) !important;
            background-image: linear-gradient(45deg, #3B82F6, #8B5CF6) !important; /* Blue to Purple */
            color: white !important;
            border: none !important;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5) !important;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;
            z-index: 20;
            transition: all 0.2s ease;
        }
        .selected-consonant {
            animation: bounce-and-glow 0.8s ease-in-out;
        }
        @keyframes bounce-and-glow {
            0% { transform: scale(1); }
            50% { transform: scale(1.2) rotate(5deg); }
            100% { transform: scale(1); }
        }
        /* Modal Styles */
        #level-up-modal {
            backdrop-filter: blur(4px);
        }
        .learn-container-stack {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
            max-width: 900px;
            padding-bottom: 30vh; /* Extra space at bottom for scrolling */
            padding-top: 1rem;
        }
        .learn-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr); /* Default 3 columns */
            gap: 0.5rem;
            width: 100%;
            justify-items: center;
        }
        /* For rows with 2 items, we can center them nicely */
        .learn-row-2 {
            grid-template-columns: repeat(2, 12rem); /* Fixed width for nicer centering if desired */
            justify-content: center;
        }
        /* For rows with 4 items (Level 6 & 1/3) */
        .learn-row-4 {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
        }
        /* For rows with 1 item */
        .learn-row-1 {
            grid-template-columns: repeat(1, 12rem);
            justify-content: center;
        }
        @media (max-width: 640px) {
            .learn-row-4 {
                grid-template-columns: repeat(2, 1fr); /* 2x2 on mobile */
            }
            .learn-row-2, .learn-row-1 {
                grid-template-columns: 1fr;
                width: 100%;
            }
        }
        .sticky-header {
            position: sticky;
            top: 0;
            background-color: rgba(239, 246, 255, 0.95); /* match bg-blue-50 with opacity */
            z-index: 30;
            padding: 1rem 0;
            width: 100%;
            border-bottom: 1px solid #bfdbfe;
            display: flex;
            justify-content: flex-start;
        }
    </style>
`;

const SP_APP_BODY_HTML = `
    
    <!-- Blackout Overlay -->
    <div id="blackout-overlay" class="fixed inset-0 bg-gray-900 hidden transition-opacity duration-1000 opacity-0 pointer-events-none z-40"></div>

    <!-- Fireworks Canvas -->
    <canvas id="fireworks-canvas"></canvas>

    <!-- Avatars -->
    <div id="satellites-container"></div>
    <div id="player-avatar" class="fixed left-2 md:left-8 text-4xl md:text-5xl z-20" style="bottom: 4%;">
        <div id="avatar-icon" style="transform: rotate(-45deg);">🚀</div>
    </div>
    <div id="airplane" class="fixed text-4xl md:text-5xl z-20" style="top: 4%; right: 2rem;">🛩️</div>

    <div class="game-container space-y-6">
        <!-- Header with Icon and Title -->
        <div class="flex items-center justify-center space-x-4">
            <h1 class="text-3xl md:text-5xl font-extrabold text-blue-600 text-center game-title">
                Myanmar Vowel Sound Practice
            </h1>
        </div>

        <!-- Learning Mode Section -->
        <div id="learning-mode-container" class="w-full text-center space-y-4 pt-4">
            <h2 class="text-2xl font-bold text-gray-800">Learning Mode</h2>
            <div class="flex flex-wrap justify-center gap-2">
                <button id="learn-level-1-btn" class="level-button">Level 1</button>
                <button id="learn-level-2-btn" class="level-button">Level 2</button>
                <button id="learn-level-3-btn" class="level-button">Level 3</button>
                <button id="learn-level-4-btn" class="level-button">Level 4</button>
                <button id="learn-level-5-btn" class="level-button">Level 5</button>
                <button id="learn-level-6-btn" class="level-button">Level 6</button>
            </div>
            <div id="learning-display" class="mt-4 p-4 bg-blue-50 rounded-lg min-h-[15rem] flex flex-col items-center justify-start w-full overflow-y-auto max-h-[60vh] relative">
                 <p class="text-gray-500 mt-10">Select a level to start learning</p>
            </div>
        </div>
        <hr class="w-full border-gray-300">

        <!-- Quiz Mode Section -->
        <div id="quiz-mode-container" class="w-full text-center space-y-4">
            <h2 class="text-2xl font-bold text-gray-800">Quiz Mode</h2>
            <!-- Score and Message Section -->
            <div class="text-center text-xl font-semibold text-gray-700 space-y-2">
                <div class="flex justify-center items-center gap-8">
                     <p>Score: <span id="score" class="text-green-500 font-bold">0</span></p>
                     <p>Incorrect: <span id="wrong-score" class="text-red-500 font-bold">0</span></p>
                </div>
                <div id="message-container" class="flex justify-center items-center h-6 mt-2">
                    <p id="message" class="text-lg"></p>
                    <div id="status-icon-container" class="ml-2 w-6 h-6 flex items-center justify-center"></div>
                </div>
            </div>

            <!-- Level Selector Buttons -->
            <div class="flex flex-wrap justify-center gap-2">
                <button id="level-1-btn" class="level-button active">Level 1</button>
                <button id="level-2-btn" class="level-button">Level 2</button>
                <button id="level-3-btn" class="level-button">Level 3</button>
                <button id="level-4-btn" class="level-button">Level 4</button>
                <button id="level-5-btn" class="level-button">Level 5</button>
                <button id="level-6-btn" class="level-button">Level 6</button>
                <button id="level-7-btn" class="level-button">Level 7</button>
                <button id="level-8-btn" class="level-button">Level 8</button>
            </div>

            <!-- Game Question Section -->
            <div class="flex flex-col items-center space-y-6 w-full">
                <button id="toggle-game-btn" class="btn-start px-8 py-4 text-xl md:text-2xl font-bold">
                     Start Game
                </button>
                <button id="replay-sound-btn" class="disabled:opacity-50" disabled>
                    <i class="fas fa-volume-up text-xl"></i>
                </button>
                <div id="choices-container" class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                </div>
            </div>
        </div>
    </div>
    
    <!-- Level Up Modal -->
    <div id="level-up-modal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-50">
        <div class="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm mx-auto border-4 border-blue-400 animate-bounce-in">
            <h3 class="text-2xl font-bold text-gray-800 mb-4">Great Job! 🎉</h3>
            <p id="modal-score-text" class="text-gray-600 mb-6">You scored 50 points! Do you want to move to the next level?</p>
            <div class="flex justify-center gap-4">
                <button id="modal-stay" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition">Stay</button>
                <button id="modal-next" class="px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition">Next Level</button>
            </div>
        </div>
    </div>

`;

export default function MyanmarSoundPracticeApp({ entryRequest, onExit }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, SP_ROSTER_PATH, sanitizeSpKey(studentName));
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
    const unsub = onSnapshot(collection(db, SP_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Sound Practice roster listen error:', e));
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
    const byId = (id) => rootEl.querySelector('#' + id);

        // --- GAME CONFIGURATION ---
        const WIN_SCORE = 50; // Change this to 5 for quick testing

        // --- DATA DEFINITIONS ---
        const allPairs = [ ['က', 'ကာ'], ['ခ', 'ခါ'], ['ဂ', 'ဂါ'], ['ဃ', 'ဃာ'], ['င', 'ငါ'], ['စ', 'စာ'], ['ဆ', 'ဆာ'], ['ဇ', 'ဇာ'], ['ဈ', 'ဈာ'], ['ည', 'ညာ'], ['တ', 'တာ'], ['ထ', 'ထာ'], ['ဒ', 'ဒါ'], ['ဓ', 'ဓာ'], ['န', 'နာ'], ['ပ', 'ပါ'], ['ဖ', 'ဖာ'], ['ဗ', 'ဗာ'], ['ဘ', 'ဘာ'], ['မ', 'မာ'], ['ယ', 'ယာ'], ['ရ', 'ရာ'], ['လ', 'လာ'], ['ဝ', 'ဝါ'], ['သ', 'သာ'], ['ဟ', 'ဟာ'], ['အ', 'အာ'], ['ကိ', 'ကီ'], ['ခိ', 'ခီ'], ['ဂိ', 'ဂီ'], ['ဃိ', 'ဃီ'], ['ငိ', 'ငီ'], ['စိ', 'စီ'], ['ဆိ', 'ဆီ'], ['ဇိ', 'ဇီ'], ['ဈိ', 'ဈီ'], ['ညိ', 'ညီ'], ['တိ', 'တီ'], ['ထိ', 'ထီ'], ['ဒိ', 'ဒီ'], ['ဓိ', 'ဓီ'], ['နိ', 'နီ'], ['ပိ', 'ပီ'], ['ဖိ', 'ဖီ'], ['ဗိ', 'ဗီ'], ['ဘိ', 'ဘီ'], ['မိ', 'မီ'], ['ယိ', 'ယီ'], ['ရိ', 'ရီ'], ['လိ', 'လီ'], ['ဝိ', 'ဝီ'], ['သိ', 'သီ'], ['ဟိ', 'ဟီ'], ['အိ', 'အီ'], ['ကု', 'ကူ'], ['ခု', 'ခူ'], ['ဂု', 'ဂူ'], ['ဃု', 'ဃူ'], ['ငု', 'ငူ'], ['စု', 'စူ'], ['ဆု', 'ဆူ'], ['ဇု', 'ဇူ'], ['ဈု', 'ဈူ'], ['ညု', 'ညူ'], ['တု', 'တူ'], ['ထု', 'ထူ'], ['ဒု', 'ဒူ'], ['ဓု', 'ဓူ'], ['နု', 'နူ'], ['ပု', 'ပူ'], ['ဖု', 'ဖူ'], ['ဗု', 'ဗူ'], ['ဘု', 'ဘူ'], ['မု', 'မူ'], ['ယု', 'ယူ'], ['ရု', 'ရူ'], ['လု', 'လူ'], ['ဝု', 'ဝူ'], ['သု', 'သူ'], ['ဟု', 'ဟူ'], ['အု', 'အူ'], ['ကေ', 'ကဲ'], ['ခေ', 'ခဲ'], ['ဂေ', 'ဂဲ'], ['ဃေ', 'ဃဲ'], ['ငေ', 'ငဲ'], ['စေ', 'စဲ'], ['ဆေ', 'ဆဲ'], ['ဇေ', 'ဇဲ'], ['ဈေ', 'ဈဲ'], ['ညေ', 'ညဲ'], ['တေ', 'တဲ'], ['ထေ', 'ထဲ'], ['ဒေ', 'ဒဲ'], ['ဓေ', 'ဓဲ'], ['နေ', 'နဲ'], ['ပေ', 'ပဲ'], ['ဖေ', 'ဖဲ'], ['ဗေ', 'ဗဲ'], ['ဘေ', 'ဘဲ'], ['မေ', 'မဲ'], ['ယေ', 'ယဲ'], ['ရေ', 'ရဲ'], ['လေ', 'လဲ'], ['ဝေ', 'ဝဲ'], ['သေ', 'သဲ'], ['ဟေ', 'ဟဲ'], ['အေ', 'အဲ'], ['ကော', 'ကော်'], ['ခေါ', 'ခေါ်'], ['ဂေါ', 'ဂေါ်'], ['ဃော', 'ဃော်'], ['ငေါ', 'ငေါ်'], ['စော', 'စော်'], ['ဆော', 'ဆော်'], ['ဇော', 'ဇော်'], ['ဈော', 'ဈော်'], ['ညော', 'ညော်'], ['တော', 'တော်'], ['ထော', 'ထော်'], ['ဒေါ', 'ဒေါ်'], ['ဓော', 'ဓော်'], ['နော', 'နော်'], ['ပေါ', 'ပေါ်'], ['ဖော', 'ဖော်'], ['ဗော', 'ဗော်'], ['ဘော', 'ဘော်'], ['မော', 'မော်'], ['ယော', 'ယော်'], ['ရော', 'ရော်'], ['လော', 'လော်'], ['ဝေါ', 'ဝေါ်'], ['သော', 'သော်'], ['ဟော', 'ဟော်'], ['အော', 'အော်'], ['ကံ', 'ကို'], ['ခံ', 'ခို'], ['ဂံ', 'ဂို'], ['ဃံ', 'ဃို'], ['ငံ', 'ငို'], ['စံ', 'စို'], ['ဆံ', 'ဆို'], ['ဇံ', 'ဇို'], ['ဈံ', 'ဈို'], ['ညံ', 'ညို'], ['တံ', 'တို'], ['ထံ', 'ထို'], ['ဒံ', 'ဒို'], ['ဓံ', 'ဓို'], ['နံ', 'နို'], ['ပံ', 'ပို'], ['ဖံ', 'ဖို'], ['ဗံ', 'ဗို'], ['ဘံ', 'ဘို'], ['မံ', 'မို'], ['ယံ', 'ယို'], ['ရံ', 'ရို'], ['လံ', 'လို'], ['ဝံ', 'ဝို'], ['သံ', 'သို'], ['ဟံ', 'ဟို'], ['အံ', 'အို'] ];
        const soundMapping = { 'ဃ': 'ဂ', 'ယျ': 'ယ', 'ဆ': 'စ', 'ဈ': 'ဇ', 'ဋ': 'တ', 'ဌ': 'ထ', 'ဍ': 'ဒ', 'ဎ': 'ဒ', 'ဓ': 'ဒ', 'ဏ': 'န', 'ဘ': 'ဗ', 'ဠ': 'လ', 'ရ': 'ယ', 'ကြ': 'ကျ', 'ခြ': 'ချ', 'ဂြ': 'ဂျ', 'ငြ': 'ည', 'ပြ': 'ပျ', 'ဖြ': 'ဖျ', 'ဗြ': 'ဗျ', 'မြ': 'မျ', 'ဆွ': 'စွ', 'ဓွ': 'ဒွ', 'ဘွ': 'ဗွ', 'ရွ': 'ယွ', 'ဏှ': 'နှ', 'ကြွ': 'ကျွ', 'ခြွ': 'ချွ', 'မြှ': 'မျှ', 'ရှ': 'ယှ' };
        const specialSoundMapping = { 'ဥ': 'အု', 'ဦ': 'အူ', 'ဦး': 'အူး', 'ဣ': 'အိ', '၏': 'အိ', 'ဤ': 'အီ', 'ဩ': '‌အော', 'ဪ': 'အော်', 'ဧ': 'အေ', 'ဓာ': 'ဒါ', 'ဓား': 'ဒါး', 'ဓော': 'ဒေါ', 'ဓော့': 'ဒေါ့', 'ဓော်': 'ဒေါ်', 'ဃာ': 'ဂါ', 'ဃား': 'ဂါး', 'ဃော': 'ဂေါ','ဃော့': 'ဂေါ့',  'ဃော်': 'ဂေါ်',  'မည်': 'မျည်'};
        const levelThreeWords = { 
            'ဆရာ': 'Teacher', 'အသား': 'Meat', 'ဓား': 'Knife', 'ဒါ': 'This (one/is)', 'အလကား': 'For free', 'အနာ': 'Wound', 'စကား': 'Word', 'ကား': 'Car', 'ဆား': 'Salt', 'အစားအစာ': 'Food', 
            'ဗမာ': 'Burmese', 'ရထား': 'Train', 'ပါး': 'Cheek', 'ခါး': 'Bitter', 'အားကစား': 'Sports', 'အဝါ': 'Yellow', 'အခါး': 'Bitter food', 'နား': 'Ear', 'ငါ': 'I (informal Impolite)', 'ဘာသာစကား': 'Language', 
            'မိဘ': 'parents', 'အဆီ': 'Fat', 'သမီး': 'daughter', 'ဆီးသီး': 'Plum', 'ညီမ': 'younger sister', 'ဇနီး': 'wife', 'အသိ': 'acquaintance', 'ခရီး': 'trip', 'ဒီဟာ': 'this one', 'ဘီး': 'comb', 
            'မီး': 'fire; light', 'မီးသီး': 'bulb', 'မီးဝါ': 'yellow light', 'မီးနီ': 'red light', 'အနီ': 'red', 'ဆီ': 'oil', 'သားသမီး': 'offspring (son and daughter)', 'အသီး': 'fruit', 'ညီ': 'younger brother (male speaker)', 'ငါးပိ': 'fishpaste (fermented)', 
            'တူ': 'nephew; chopsticks; hammer', 'တူမ': 'niece', 'ဦး': '(Mr.) mister/uncle', 'လူ': 'person; human', 'မိသားစု': 'family', 'ဆု': 'prize; award', 'ပထမဆု': 'first prize', 'ဒုတိယဆု': 'second prize', 'တတိယဆု': 'third prize', 'အထူးဆု': 'special award', 
            'သူ': 'he / she', 'ဒူး': 'knee', 'အရူး': 'crazy person', 'မီးပူ': 'iron', 'အကူအညီ': 'help', 'ဥပမာ': 'example', 'ဆူး': 'thorn; spike', 'အခု': 'now', 'လူနာ': 'patient', 'ရာသီဥတု': 'weather, climate', 
            'အဖေ': 'father', 'အမေ': 'mother', 'ကလေး': 'baby', 'ဦးလေး': 'uncle', 'ညနေ': 'evening', 'မေမေ': 'mommy', 'ဖေဖေ': 'daddy', 'လေး': 'four', 'ဆေး': 'medicine', 'နေရာ': 'place', 
            'ရေ': 'water', 'ရေပူ': 'hot water', 'ရေအေး': 'cold water', 'နေ': 'sun', 'လေ': 'wind; air', 'နေ့': 'day', 'ဒီနေ့': 'today', 'မနေ့က': 'yesterday', 'တနေ့က': 'the day before yesterday', 'စနေနေ့': 'Saturday', 
            'နယ်': 'Countryside', 'လယ်': 'Farm', 'တဲ': 'Hut', 'ဘဲ': 'Duck', 'လယ်သမား': 'Farmer', 'ခယ်မ': 'Sister-in law (male speaker)', 'နေ့လယ်': 'Noon; afternoon', 'နေ့လယ်စာ': 'Lunch', 'ဘဲသား': 'Duck meat', 'အမဲသား': 'Beef', 
            'ဘဲဥ': 'Duck egg', 'အဲဒါ': 'That', 'ဆယ့်ငါး': 'Fifteen', 'သရဲ': 'Ghost', 'ငရဲ': 'Hell', 'ပဲ': 'Bean, peas', 'ပဲဆီ': 'Peanut oil', 'ရေခဲ': 'Ice', 'ရဲ': 'Policeman', 'ရဲမေ': 'Policewoman', 
            'ကောဇော': 'carpet', 'ကော်': 'glue', 'ဇော': 'eagerness', 'တော': 'jungle, forest', 'ကော်လာ': 'collar', 'အခေါ်အဝေါ်': 'technical term, Jargon', 'ဒေါ်': 'Mrs./Ms. (honorific title)', 'အနေတော်': 'right proportion', 'လောက': 'world; society', 'သဘော': 'attitude; meaning', 
            'ကော်ဖီ': 'coffee', 'အပေါစား': 'cheap things', 'ဒေါ်လာ': 'dollar', 'ဘော်လီဘော': 'volleyball', 'အပေါ်': 'place above', 'ကောလဟာလ': 'rumor', 'ရောဂါ': 'disease illness', 'ဒေါသ': 'anger', 'အဒေါ်': 'aunt', 'အဖော်': 'companion', 
            'အသံ': 'sound; voice', 'ဂါဝန်': 'dress', 'ပန်းသီး': 'apple', 'ရေကူးကန်': 'swimming pool', 'နည်းလမ်း': 'way, method', 'စည်းကမ်း': 'discipline, rules', 'အတန်း': 'grade (in school)', 'ဆေးခန်း': 'clinic, dispensary', 'ဆရာဝန်': 'physician, medical doctor', 'အနံ့': 'scent, smell, odour', 
            'ကဏန်း': 'crab', 'သူငယ်တန်း': 'kindergarten', 'ပန်း': 'flower', 'ပထမတန်း': 'Grade 1', 'ပန်ကာ': 'electric fan', 'ဆူညံသံ': 'noise', 'ဂဏန်း': 'number', 'အခန်း': 'room', 'ခန်းမ': 'hall', 'ဆန်': 'uncooked rice', 
            'ပဲနို့': 'soy milk', 'မိုး': 'rain; sky', 'အဘိုး': 'grandfather', 'အမယ်အို': 'old woman', 'အကို': 'older brother', 'သတို့သား': 'bridegroom', 'သတို့သမီး': 'bride', 'မီးဖို': 'cookstove', 'အရိုး': 'bone', 'နို့': 'milk; breast', 
            'နို့ဘူး': 'baby bottle', 'မိုးရေ': 'rainwater', 'မိုးရာသီ': 'rainy season', 'အမိုး': 'roof', 'အညို': 'brown', 'အဆိုတော်': 'singer', 'လူဆိုး': 'villain bad person', 'လူရိုး': 'honest person', 'အပို': 'extra; spare', 'အစိုးရ': 'government'
        };
        const levelSixWords = { 
            'လူကြီး': 'adult grown-up: elder grandchild', 'အမျိုးသမီး': 'woman; wife', 'အမျိုးသား': 'man; husband', 'မြန်မာ': 'Myanmar', 'ပျား': 'bee', 'ပျားရည်': 'honey', 'ဖျော်ရည်': 'juice', 'ဖျာ': 'mat', 'အဖျား': 'fever', 'မြို့': 'city; town', 'မြို့တော်': 'capital city', 'မြို့ထဲ': 'city centre downtown', 'မြို့နယ်': 'township', 'မြေကြီး': 'soil, earth', 'ကြော်ငြာ': 'advertisement', 'ခြေရာ': 'footprint', 'မြေဖြူ': 'chalk', 'ပန်းခြံ': 'park', 'ကျေးဇူး': 'gratitude', 'ဆွေမျိုး': 'relative', 'အဖွား': 'grandmother', 'ဆွယ်တာ': 'sweater', 'ရွာ': 'village', 'ရေနွေး': 'tea; warm water', 'နွေဦးရာသီ': 'spring (season)', 'နေ့စွဲ': 'date (d/m/y)', 'နွေရာသီ': 'summer hot season', 'မွေးနေ့': 'birthday', 'မီးသွေး': 'charcoal', 'သွား': 'tooth/ teeth', 'သွားကြားထိုးတံ': 'toothpick', 'တံထွေး': 'spit; saliva', 'ဘွဲ့': '(University) degree', 'ငွေ': 'silver; money', 'ဝံပုလွေ': 'fox', 'ခွေး': 'dog', 'နွားနို့': 'cow milk', 'သွေး': 'blood', 'မြေခွေး': 'wolf', 'လှေကား': 'ladder', 'နှမ်း': 'sesame', 'ရှူဆေး': 'inhalant', 'လှံ': 'spear', 'မှဲ့': 'mole', 'အလှူ': 'donation', 'အလှူပွဲ': 'ceremony', 'မှန်': 'mirror; glass', 'မှန်ဘီလူး': 'magnifying glass', 'ရှေ့နေ': 'lawyer', 'အာရှ': 'Asia; Asian', 'အမှား': 'error, mistake', 'အမှန်': 'truth; fact', 'အလှည့်': '(sb\'s) turn', 'အရှေ့': 'East', 'ကြွေ': 'enamel; ceramic', 'ကြွေပန်းကန်': 'porcelain plate', 'ကြွေပြား': 'tile', 'အကြွေ': '(small) change', 'အကြွေစေ့': 'coin', 'အကြွေး': 'debt; credit', 'ချွေးမ': 'daughter-in-law', 'ရေမြွေ': 'water snake', 'ချွေး': 'sweat', 'မြွေပါ': 'mongoose', 'လျှော': 'slide', 'ငါးမျှားတံ': 'fishing rod', 'လျှာ': 'tongue', 'လျှော့ဈေး': 'discount', 'မီးလျှံ': 'flame', 'မျှော့': 'leech', 'ရေမွှေး': 'perfume', 'အမွှာပူး': 'twins', 'လွှ': 'saw', 'ပျံလွှား': 'swallow', 'ရွှေ': 'gold', 'ရွှေငါး': 'gold fish', 'ရွှေဆွဲကြိုး': 'gold necklace', 'ရွှေဖြူ': 'platinum', 'ရွှေရတု': 'golden jubilee'
        };
        const levelEightWords = {
            'ထမင်း': 'Cooked Rice', 'ဟင်း': 'Dish / Curry', 'သူငယ်ချင်း': 'Friend', 'မိခင်': 'Mother', 'ဖခင်': 'Father', 'နေ့စဉ်': 'Daily', 'သတင်းစာ': 'Newspaper', 'ဆင်': 'Elephant', 'မြင်း': 'Horse', 'ခြင်': 'Mosquito', 'အပင်': 'Plant', 'ပင်လယ်': 'Sea', 'ဝင်ငွေ': 'Income', 'ယဉ်ကျေးမှု': 'Culture', 'အကျင့်': 'Habit',
            'ကျောင်း': 'School / Monastery', 'ကျောင်းသား': 'Male Student', 'ကျောင်းသူ': 'Female Student', 'ခေါင်း': 'Head', 'ကြောင်': 'Cat', 'တောင်': 'Mountain', 'ကောင်းကင်': 'Sky', 'အရောင်': 'Color', 'အဖြူရောင်': 'White', 'အနီရောင်': 'Red', 'အပြာရောင်': 'Blue', 'အမဲရောင်': 'Black', 'ဆောင်းရာသီ': 'Winter', 'အောင်မြင်': 'Succeed',
            'ဈေးဆိုင်': 'Shop', 'ထမင်းဆိုင်': 'Restaurant', 'နိုင်ငံ': 'Country', 'နေ့လယ်ပိုင်း': 'Afternoon', 'ညနေပိုင်း': 'Evening', 'ညပိုင်း': 'Night', 'ကော်ဖီဆိုင်': 'Coffee Shop', 'နေထိုင်': 'Live / Reside', 'ယှဉ်ပြိုင်': 'Compete', 'ဖယောင်းတိုင်': 'Candle', 'နိုင်ငံခြား': 'Foreign Country', 'နိုင်ငံရေး': 'Politics', 'တိုင်းရင်းသား': 'Ethnic Group', 'ပိုင်း': 'Piece / Part',
            'အိမ်': 'House', 'နေအိမ်': 'Residence / Home', 'အချိန်မီ': 'On time', 'မိုးတိမ်': 'Cloud', 'လိမ္မော်သီး': 'Orange', 'စိမ်းလန်း': 'Green', 'ငြိမ်းချမ်း': 'Peaceful', 'ထိန်းသိမ်း': 'Maintain', 'အနိမ့်အမြင့်': 'Height / Level', 'မိန့်ခွန်း': 'Speech', 'လိမ္မာ': 'Clever / Good-natured', 'ချိန်းဆို': 'Appointment', 'မိုးခြိမ်း': 'Thunder', 'ပွဲသိမ်း': 'End of event',
            'တွေ့ဆုံ': 'Meet', 'ပုံပြင်': 'Story', 'ယုန်': 'Rabbit', 'ခေါင်းအုံး': 'Pillow', 'အုန်းသီး': 'Coconut', 'ပြုံးရွှင်': 'Smile happily', 'ဟင်းမျိုးစုံ': 'Various dishes', 'ရေပုံး': 'Water bucket', 'ဂျုံ': 'Wheat', 'ပန်းကုံး': 'Garland', 'မီးပုံးပျံ': 'Hot air balloon', 'အုံ့မှိုင်း': 'Overcast', 'လေမုန်တိုင်း': 'Storm', 'ပြေးခုန်': 'Run and jump',
            'ကောင်းမွန်': 'Excellent / Good', 'ကျွမ်းကျင်': 'Skillful', 'ဇွန်း': 'Spoon', 'ကွန်ပျူတာ': 'Computer', 'ခွန်အား': 'Strength', 'ထူးချွန်': 'Outstanding', 'ကျွန်းဆွယ်': 'Peninsula', 'ညွှန်ကြား': 'Instruct', 'စွမ်းရည်': 'Ability', 'လယ်ထွန်': 'To plow', 'ကွမ်းသီး': 'Betel nut', 'ဝါဂွမ်း': 'Cotton', 'ဆွမ်းတော်': 'Almsfood', 'ရွာသွန်း': 'Rain fall', 'ယွန်းထည်': 'Lacquerware',
            'အသက်အရွယ်': 'Age', 'နက်ဖြန်ခါ': 'Tomorrow', 'နံနက်': 'Morning', 'မျက်နှာ': 'Face', 'မျက်မှန်': 'Eyeglasses', 'ကြက်သွန်': 'Onion', 'ငှက်ပျောသီး': 'Banana', 'စက်ရုံ': 'Factory', 'ဝက်': 'Pig', 'ကြက်ဖ': 'Rooster', 'လက်ဖက်': 'Tea leaf', 'တွက်ချက်': 'Calculate', 'စာကျက်': 'Study', 'သွက်လက်': 'Active', 'ထက်ဝက်': 'Half',
            'ယောက်ျား': 'Man', 'ယောက်ျားလေး': 'Boy', 'လမ်းလျှောက်': 'Walk', 'ပြတင်းပေါက်': 'Window', 'အထောက်အကူ': 'Aid / Assistance', 'မျောက်': 'Monkey', 'ငါးခြောက်': 'Dried fish', 'ကောက်ပဲသီးနှံ': 'Crops', 'ကျောက်သင်ပုန်း': 'Blackboard', 'မြှောက်ပင့်': 'Encourage / Flatter', 'ပေါက်ပင်': 'Sapling', 'ခမောက်': 'Hat', 'ချောက်ကမ်းပါး': 'Cliff', 'မွှေနှောက်': 'Stir / Disturb', 'ထောက်ထားစာနာ': 'Sympathize',
            'ပိုက်ဆံ': 'Money', 'စာကြည့်တိုက်': 'Library', 'အမှိုက်ပုံး': 'Trash can', 'ဝမ်းဗိုက်': 'Belly', 'စိုက်ပျိုးရေး': 'Agriculture', 'ပူအိုက်': 'Hot / Stuffy', 'တိုက်ခိုက်': 'Attack', 'လေတိုက်': 'Wind blows', 'အခိုက်အတန့်': 'Moment', 'ကြုံကြိုက်': 'Coincide', 'အားစိုက်ခွန်စိုက်': 'Vigorously', 'ဆိုက်ရောက်': 'Arrive', 'ပိုက်ကွန်': 'Fishing net', 'ငှက်သိုက်': 'Bird\'s nest',
            'သစ်သီး': 'Fruit', 'မြစ်ချောင်း': 'River', 'ချစ်ခင်': 'Love', 'ညီအစ်ကို': 'Brothers', 'နှစ်သစ်ကူး': 'New Year', 'ခုနှစ်': 'Seven', 'စစ်သည်တော်': 'Soldier', 'အမှိုက်ပစ်': 'Throw away trash', 'အော်ဟစ်': 'Shout', 'ဖွင့်လှစ်': 'Open', 'ပြေပြစ်': 'Smooth / Elegant', 'မီးခြစ်': 'Lighter / Match', 'ကျားသစ်': 'Leopard', 'မျှစ်': 'Bamboo shoot',
            'ဖိနပ်': 'Shoe', 'ဆုံးဖြတ်': 'Decide', 'ကျေနပ်': 'Satisfied', 'ဓာတ်ပုံ': 'Photograph', 'အားလပ်ရက်': 'Holiday', 'လက်ပတ်နာရီ': 'Wristwatch', 'အတတ်ပညာ': 'Knowledge / Skill', 'ကောင်းမြတ်': 'Good / Excellent', 'အမှတ်တရ': 'Souvenir', 'ဝတ်ဆင်': 'Wear', 'သေနတ်': 'Gun', 'ရဟတ်ယာဉ်': 'Helicopter', 'ယပ်တောင်': 'Hand fan', 'ထူထပ်': 'Dense',
            'အိပ်ပျော်': 'Sleep', 'မိတ်ဆွေ': 'Friend', 'လွယ်အိတ်': 'School bag', 'လိပ်စာ': 'Address', 'စာအိတ်': 'Envelope', 'တံဆိပ်ခေါင်း': 'Postage stamp', 'ပုရွက်ဆိတ်': 'Ant', 'တိတ်တိတ်': 'Quietly', 'ဆိတ်': 'Goat', 'လိပ်': 'Turtle', 'ဆန်အိတ်': 'Rice bag', 'ဆိုက်': 'Dock / Arrive', 'ကောက်ရိတ်': 'Harvest', 'အထည်အလိပ်': 'Textile',
            'အလုပ်သမား': 'Worker', 'ရုပ်မြင်သံကြား': 'Television', 'ဦးထုပ်': 'Hat', 'ငရုတ်သီး': 'Chili pepper', 'ဆောက်လုပ်': 'Build', 'ရုတ်တရက်': 'Suddenly', 'အပ်ချုပ်စက်': 'Sewing machine', 'တောအုပ်': 'Forest', 'ကုလားအုတ်': 'Camel', 'သစ်ကုလားအုတ်': 'Giraffe', 'ခဏတစ်ဖြုတ်': 'Briefly', 'ရေမှုတ်': 'Water spray', 'အိုးပုတ်': 'Earthenware toy', 'ကောက်ညှင်းထုပ်': 'Sticky rice parcel',
            'လွတ်လပ်ရေးအောင်ပွဲ': 'Independence Day victory', 'ခွင့်လွှတ်': 'Forgive', 'လက်စွပ်': 'Ring', 'စိုစွတ်': 'Wet', 'ညီညွတ်': 'United', 'မင်းကွတ်သီး': 'Mangosteen', 'ဦးညွှတ်': 'Bow', 'ရွတ်ဖတ်': 'Recite', 'သီတင်းကျွတ်': 'Thadingyut Festival', 'ခူးဆွတ်': 'Pluck / Harvest', 'စွပ်ကျယ်': 'Sleeveless undershirt', 'ပွတ်တိုက်': 'Rub', 'အနားကွပ်': 'Border', 'ပင်လုံးကျွတ်': 'Whole plant'
        };
        const levelFourPairsRaw = `ကျ ကျာ ချ ချာ ဂျ ဂျာ ပျ ပျာ ဖျ ဖျာ ဗျ ဗျာ မျ မျာ လျ လျာ ကြ ကြာ ခြ ခြာ ငြ ငြာ ပြ ပြာ ဖြ ဖြာ ဗြ ဗြာ မြ မြာ ကျိ ကျီ ချိ ချီ ဂျိ ဂျီ ပျိ ပျီ ဖျိ ဖျီ ဗျိ ဗျီ မျိ မျီ ကြိ ကြီ ခြိ ခြီ ဂြိ ဂြီ ငြိ ငြီ ပြိ ပြီ ဖြိ ဖြီ ဗြိ ဗြီ မြိ မြီ ကျု ကျူ ချု ချူ ဂျု ဂျူ ပျု ပျူ ဖျု ဖျူ ဗျု ဗျူ မျု မျူ လျု လျူ ကြု ကြူ ခြု ခြူ ငြု ငြူ ပြု ပြူ ဖြု ဖြူ ဗြု ဗြူ မြု မြူ ကျေ ကျဲ ချေ ချဲ ဂျေ ဂျဲ ပျေ ပျဲ ဖျေ ဖျဲ ဗျေ ဗျဲ မျေ မျဲ ကြေ ကြဲ ခြေ ခြဲ ပြေ ပြဲ ဖြေ ဖြဲ ဗြေ ဗြဲ မြေ မြဲ ကျော ကျော် ချော ချော် ဂျော ဂျော် ပျော ပျော် ဖျော ဖျော် ဗျော ဗျော် မျော မျော် လျော လျော် ကြော ကြော် ခြော ခြော် ပြော ပြော် ဖြော ဖြော် ဗြော ဗြော် မြော မြော် ကျံ ကျို ချံ ချို ဂျံ ဂျို ပျံ ပျို ဖျံ ဖျို ဗျံ ဗျို မျံ မျို လျံ လျို ကြံ ကြို ခြံ ခြို ဂြံ ဂြို ပြံ ပြို ဖြံ ဖြို ဗြံ ဗြို မြံ မြို ကွေ ကွဲ ခွေ ခွဲ ဂွေ ဂွဲ ငွေ ငွဲ စွေ စွဲ ဆွေ ဆွဲ ဇွေ ဇွဲ ညွေ ညွဲ တွေ တွဲ ထွေ ထွဲ ဒွေ ဒွဲ ဓွေ ဓွဲ နွေ နွဲ ပွေ ပွဲ ဖွေ ဖွဲ ဗွေ ဗွဲ ဘွေ ဘွဲ မွေ မွဲ ယွေ ယွဲ ရွေ ရွဲ လွေ လွဲ သွေ သွဲ ဟွေ ဟွဲ ကွ ကွာ ခွ ခွာ ဂွ ဂွာ ငွ ငွာ စွ စွာ ဆွ ဆွာ ဇွ ဇွာ ညွ ညွာ တွ တွာ ထွ ထွာ ဒွ ဒွာ ဓွ ဓွာ နွ နွာ ပွ ပွာ ဖွ ဖွာ ဗွ ဗွာ ဘွ ဘွာ မွ မွာ ယွ ယွာ ရွ ရွာ လွ လွာ သွ သွာ ဟွ ဟွာ ကွိ ကွီ ခွိ ခွီ ဂွိ ဂွီ ငွိ ငွီ စွိ စွီ ဆွိ ဆွီ ဇွိ ဇွီ ညွိ ညွီ တွိ တွီ ထွိ ထွီ ဒွိ ဒွီ ဓွိ ဓွီ နွိ နွီ ပွိ ပွီ ဖွိ ဖွီ ဗွိ ဗွီ ဘွိ ဘွီ မွိ မွီ ယွိ ယွီ ရွိ ရွီ လွိ လွီ သွိ သွီ ဟွိ ဟွီ ငှ ငှာ ညှ ညှာ နှ နှာ မှ မှာ ရှ ရှာ လှ လှာ ငှိ ငှီ ညှိ ညှီ နှိ နှီ မှိ မှီ ရှိ ရှီ လှိ လှီ ငှု ငှူ ညှု ညှူ နှု နှူ မှု မှူ ရှု ရှူ လှု လှူ ငှေ ငှဲ ညှေ ညှဲ နှေ နှဲ မှေ မှဲ ရှေ ရှဲ လှေ လှဲ ငှော ငှော် ညှော ညှော် နှော နှော် မှော မှော် ရှော ရှော် လှော လှော် ငှံ ငှို ညှံ ညှို နှံ နှို မှံ မှို ရှံ ရှို လှံ လှို ကျွ ကျွာ ချွ ချွာ ကြွ ကြွာ ခြွ ခြွာ မြွ မြွာ ကျွိ ကျွီ ကျွေ ကျွဲ ချွေ ချွဲ ကြွေ ကြွဲ ခြွေ ခြွဲ မျှ မျှာ လျှ လျှာ မြှ မြှာ မျှိ မျှီ လျှိ လျှီ မြှိ မြှီ မျှု မျှူ လျှု လျှူ မြှု မြှူ မျှေ မျှဲ လျှေ လျှဲ မြှေ မြှဲ မျှော မျှော် လျှော လျှော် မြှော မြှော် မျှံ မျှို လျှံ လျှို မြှံ မြှို ညွှ ညွှာ နွှ နွှာ မွှ မွှာ ရွှ ရွှာ လွှ လွှာ ညွှိ ညွှီ နွှိ နွှီ မွှိ မွှီ ရွှိ ရွှီ လွှိ လွှီ ညွှေ ညွှဲ နွှေ နွှဲ မွှေ မွှဲ ရွှေ ရွှဲ လွှေ လွှဲ`;
        const levelFourItems = levelFourPairsRaw.split(/\s+/).filter(Boolean);
        const levelFourPairs = [];
        for (let i = 0; i < levelFourItems.length; i += 2) { if (levelFourItems[i+1]) { levelFourPairs.push([levelFourItems[i], levelFourItems[i+1]]); } }
        
        const levelFourHomophoneGroups = [ ['ကျ', 'ကြ'], ['ချ', 'ခြ'], ['ဂျ', 'ဂြ'], ['ပျ', 'ပြ'], ['ဖျ', 'ဖြ'], ['ဗျ', 'ဗြ'], ['မျ', 'မြ'], ['စွ', 'ဆွ'], ['ဒွ', 'ဓွ'], ['ဗွ', 'ဘွ'], ['ရွ', 'ယွ'], ['နှ', 'ဏှ'], ['ရှ', 'ယှ'], ['ကျွ', 'ကြွ'], ['ချွ', 'ခြွ'], ['မျှ', 'မြှ'] ];
        const allConsonantsAndClusters = [ 'ကျွ', 'ကြွ', 'ခြွ', 'ချွ', 'မြှ', 'မျှ', 'လျှ', 'ညွှ', 'နွှ', 'မွှ', 'ရွှ', 'လွှ', 'ကျ', 'ကြ', 'ချ', 'ခြ', 'ဂျ', 'ဂြ', 'ငြ', 'ပျ', 'ပြ', 'ဖျ', 'ဖြ', 'ဗျ', 'ဗြ', 'မျ', 'မြ', 'လျ', 'ကွ', 'ခွ', 'ဂွ', 'ငွ', 'စွ', 'ဆွ', 'ဇွ', 'ညွ', 'တွ', 'ထွ', 'ဒွ', 'ဓွ', 'နွ', 'ပွ', 'ဖွ', 'ဗွ', 'ဘွ', 'မွ', 'ယွ', 'ရွ', 'လွ', 'သွ', 'ဟွ', 'ငှ', 'ညှ', 'နှ', 'မှ', 'ရှ', 'လှ', 'က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'ဋ', 'ဌ', 'ဍ', 'ဎ', 'ဏ', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'ဠ', 'အ' ];
        const syllableStarters = [...allConsonantsAndClusters, ...Object.keys(specialSoundMapping)];
        const gameSounds = { 'correct': 'https://raw.githubusercontent.com/nathantun93/bell/main/correct.mp3', 'wrong': 'https://raw.githubusercontent.com/nathantun93/bell/main/error.mp3' };
        const gradients = [ 'linear-gradient(45deg, #FF6B6B, #F8B3C3, #6BFFB3, #43C6AC)', 'linear-gradient(45deg, #FFD700, #FFA500, #FF6347, #FF1493)', 'linear-gradient(45deg, #00C9FF, #92FE9D)', 'linear-gradient(45deg, #8A2BE2, #A020F0)', 'linear-gradient(45deg, #FF69B4, #FF00FF, #DA70D6)', 'linear-gradient(45deg, #FF4500, #FFD700)', 'linear-gradient(45deg, #1E90FF, #3CB371)', 'linear-gradient(45deg, #DDA0DD, #FFC0CB, #EE82EE)' ];

        // --- Learning Mode Data ---
        const learningConsonantsLevel1 = ['က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'အ'];
        const vowelSeriesMap = {
            'က': ['က', 'ကာ', 'ကိ', 'ကီ', 'ကု', 'ကူ', 'ကေ', 'ကဲ', 'ကော', 'ကော်', 'ကံ', 'ကို'], 'ခ': ['ခ', 'ခါ', 'ခိ', 'ခီ', 'ခု', 'ခူ', 'ခေ', 'ခဲ', 'ခေါ', 'ခေါ်', 'ခံ', 'ခို'], 'ဂ': ['ဂ', 'ဂါ', 'ဂိ', 'ဂီ', 'ဂု', 'ဂူ', 'ဂေ', 'ဂဲ', 'ဂေါ', 'ဂေါ်', 'ဂံ', 'ဂို'], 'ဃ': ['ဃ', 'ဃာ', 'ဃိ', 'ဃီ', 'ဃု', 'ဃူ', 'ဃေ', 'ဃဲ', 'ဃော', 'ဃော်', 'ဃံ', 'ဃို'], 'င': ['င', 'ငါ', 'ငိ', 'ငီ', 'ငု', 'ငူ', 'ငေ', 'ငဲ', 'ငေါ', 'ငေါ်', 'ငံ', 'ငို'], 'စ': ['စ', 'စာ', 'စိ', 'စီ', 'စု', 'စူ', 'စေ', 'စဲ', 'စော', 'စော်', 'စံ', 'စို'], 'ဆ': ['ဆ', 'ဆာ', 'ဆိ', 'ဆီ', 'ဆု', 'ဆူ', 'ဆေ', 'ဆဲ', 'ဆော', 'ဆော်', 'ဆံ', 'ဆို'], 'ဇ': ['ဇ', 'ဇာ', 'ဇိ', 'ဇီ', 'ဇု', 'ဇူ', 'ဇေ', 'ဇဲ', 'ဇော', 'ဇော်', 'ဇံ', 'ဇို'], 'ဈ': ['ဈ', 'ဈာ', 'ဈိ', 'ဈီ', 'ဈု', 'ဈူ', 'ဈေ', 'ဈဲ', 'ဈော', 'ဈော်', 'ဈံ', 'ဈို'], 'ည': ['ည', 'ညာ', 'ညိ', 'ညီ', 'ညု', 'ညူ', 'ညေ', 'ညဲ', 'ညော', 'ညော်', 'ညံ', 'ညို'], 'တ': ['တ', 'တာ', 'တိ', 'တီ', 'တု', 'တူ', 'တေ', 'တဲ', 'တော', 'တော်', 'တံ', 'တို'], 'ထ': ['ထ', 'ထာ', 'ထိ', 'ထီ', 'ထု', 'ထူ', 'ထေ', 'ထဲ', 'ထော', 'ထော်', 'ထံ', 'ထို'], 'ဒ': ['ဒ', 'ဒါ', 'ဒိ', 'ဒီ', 'ဒု', 'ဒူ', 'ဒေ', 'ဒဲ', 'ဒေါ', 'ဒေါ်', 'ဒံ', 'ဒို'], 'ဓ': ['ဓ', 'ဓာ', 'ဓိ', 'ဓီ', 'ဓု', 'ဓူ', 'ဓေ', 'ဓဲ', 'ဓော', 'ဓော်', 'ဓံ', 'ဓို'], 'န': ['န', 'နာ', 'နိ', 'နီ', 'နု', 'နူ', 'နေ', 'နဲ', 'နော', 'နော်', 'နံ', 'နို'], 'ပ': ['ပ', 'ပါ', 'ပိ', 'ပီ', 'ပု', 'ပူ', 'ပေ', 'ပဲ', 'ပေါ', 'ပေါ်', 'ပံ', 'ပို'], 'ဖ': ['ဖ', 'ဖာ', 'ဖိ', 'ဖီ', 'ဖု', 'ဖူ', 'ဖေ', 'ဖဲ', 'ဖော', 'ဖော်', 'ဖံ', 'ဖို'], 'ဗ': ['ဗ', 'ဗာ', 'ဗိ', 'ဗီ', 'ဗု', 'ဗူ', 'ဗေ', 'ဗဲ', 'ဗော', 'ဗော်', 'ဗံ', 'ဗို'], 'ဘ': ['ဘ', 'ဘာ', 'ဘိ', 'ဘီ', 'ဘု', 'ဘူ', 'ဘေ', 'ဘဲ', 'ဘော', 'ဘော်', 'ဘံ', 'ဘို'], 'မ': ['မ', 'မာ', 'မိ', 'မီ', 'မု', 'မူ', 'မေ', 'မဲ', 'မော', 'မော်', 'မံ', 'မို'], 'ယ': ['ယ', 'ယာ', 'ယိ', 'ယီ', 'ယု', 'ယူ', 'ယေ', 'ယဲ', 'ယော', 'ယော်', 'ယံ', 'ယို'], 'ရ': ['ရ', 'ရာ', 'ရိ', 'ရီ', 'ရု', 'ရူ', 'ရေ', 'ရဲ', 'ရော', 'ရော်', 'ရံ', 'ရို'], 'လ': ['လ', 'လာ', 'လိ', 'လီ', 'လု', 'လူ', 'လေ', 'လဲ', 'လော', 'လော်', 'လံ', 'လို'], 'ဝ': ['ဝ', 'ဝါ', 'ဝိ', 'ဝီ', 'ဝု', 'ဝူ', 'ဝေ', 'ဝဲ', 'ဝေါ', 'ဝေါ်', 'ဝံ', 'ဝို'], 'သ': ['သ', 'သာ', 'သိ', 'သီ', 'သု', 'သူ', 'သေ', 'သဲ', 'သော', 'သော်', 'သံ', 'သို'], 'ဟ': ['ဟ', 'ဟာ', 'ဟိ', 'ဟီ', 'ဟု', 'ဟူ', 'ဟေ', 'ဟဲ', 'ဟော', 'ဟော်', 'ဟံ', 'ဟို'], 'အ': ['အ', 'အာ', 'အိ', 'အီ', 'အု', 'အူ', 'အေ', 'အဲ', 'အော', 'အော်', 'အံ', 'အို']
};
        const combinedConsonantGroups = [ ['ကျ', 'ကြ', 'ချ', 'ခြ', 'ဂျ', 'ဂြ', 'ငြ', 'ပျ', 'ပြ', 'ဖျ', 'ဖြ', 'ဗျ', 'မျ', 'မြ', 'ယျ'], ['ကွ', 'ခွ', 'ဂွ', 'ငွ', 'စွ', 'ဆွ', 'ဇွ', 'တွ', 'ထွ', 'ဒွ', 'ဓွ', 'နွ', 'ပွ', 'ဖွ', 'ဗွ', 'ဘွ', 'မွ', 'ယွ', 'ရွ', 'လွ', 'သွ', 'ဟွ'], ['ငှ', 'ညှ', 'နှ', 'မှ', 'ယှ', 'ရှ', 'လှ'], ['ကျွ', 'ကြွ', 'ချွ', 'ဂျွ', 'ပျွ', 'ပြွ', 'မြွ'], ['မျှ', 'မြှ', 'လျှ'], ['ညွှ', 'နွှ', 'မွှ', 'ရွှ', 'လွှ'] ];
        const learningConsonantsLevel2 = combinedConsonantGroups.flat();
        
        // --- Level 5 Data ---
        const level5Consonants = [
             'က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'အ',
             'ကျ', 'ကြ', 'ချ', 'ခြ', 'ဂျ', 'ဂြ', 'ငြ', 'ပျ', 'ပြ', 'ဖျ', 'ဖြ', 'ဗျ', 'မျ', 'မြ', 'ယျ',
             'ငှ', 'ညှ', 'နှ', 'မှ', 'ယှ', 'ရှ', 'လှ',
             'မျှ', 'မြှ', 'လျှ',
             'ညွှ', 'နွှ', 'မွှ', 'ရွှ', 'လွှ'
        ];
        
        const syllableTimeMap = {'က':0,'ကာ':1,'ကား':2,'ကိ':3,'ကီ':4,'ကီး':5,'ကု':6,'ကူ':7,'ကူး':8,'ကေ့':9,'ကေ':10,'ကေး':11,'ကဲ့':12,'ကယ်':13,'ကဲ':14,'ကော့':15,'ကော်':16,'ကော':17,'ကန့်':18,'ကန်':19,'ကန်း':20,'ကို့':21,'ကို':22,'ကိုး':23,'ခ':24,'ခါ':25,'ခါး':26,'ခိ':27,'ခီ':28,'ခီး':29,'ခု':30,'ခူ':31,'ခူး':32,'ခေ့':33,'ခေ':34,'ခေး':35,'ခဲ့':36,'ခယ်':37,'ခဲ':38,'ခေါ့':39,'ခေါ်':40,'ခေါ':41,'ခန့်':42,'ခန်':43,'ခန်း':44,'ခို့':45,'ခို':46,'ခိုး':47,'ဂ':48,'ဂါ':49,'ဂါး':50,'ဂိ':51,'ဂီ':52,'ဂီး':53,'ဂု':54,'ဂူ':55,'ဂူး':56,'ဂေ့':57,'ဂေ':58,'ဂေး':59,'ဂဲ့':60,'ဂယ်':61,'ဂဲ':62,'ဂေါ့':63,'ဂေါ်':64,'ဂေါ':65,'ဂန့်':66,'ဂန်':67,'ဂန်း':68,'ဂို့':69,'ဂို':70,'ဂိုး':71,'င':72,'ငါ':73,'ငါး':74,'ငိ':75,'ငီ':76,'ငီး':77,'ငု':78,'ငူ':79,'ငူး':80,'ငေ့':81,'ငေ':82,'ငေး':83,'ငဲ့':84,'ငယ်':85,'ငဲ':86,'ငေါ့':87,'ငေါ်':88,'ငေါ':89,'ငန့်':90,'ငန်':91,'ငန်း':92,'ငို့':93,'ငို':94,'ငိုး':95,'စ':96,'စာ':97,'စား':98,'စိ':99,'စီ':100,'စီး':101,'စု':102,'စူ':103,'စူး':104,'စေ့':105,'စေ':106,'စေး':107,'စဲ့':108,'စယ်':109,'စဲ':110,'စော့':111,'စော်':112,'စော':113,'စန့်':114,'စန်':115,'စန်း':116,'စို့':117,'စို':118,'စိုး':119,'ဇ':120,'ဇာ':121,'ဇား':122,'ဇိ':123,'ဇီ':124,'ဇီး':125,'ဇု':126,'ဇူ':127,'ဇူး':128,'ဇေ့':129,'ဇေ':130,'ဇေး':131,'ဇဲ့':132,'ဇယ်':133,'ဇဲ':134,'ဇော့':135,'ဇော်':136,'ဇော':137,'ဇန့်':138,'ဇန်':139,'ဇန်း':140,'ဇို့':141,'ဇို':142,'ဇိုး':143,'ည':144,'ညာ':145,'ညား':146,'ညိ':147,'ညီ':148,'ညီး':149,'ညု':150,'ညူ':151,'ညူး':152,'ညေ့':153,'ညေ':154,'ညေး':155,'ညဲ့':156,'ညယ်':157,'ညဲ':158,'ညော့':159,'ညော်':160,'ညော':161,'ညန့်':162,'ညန်':163,'ညန်း':164,'ညို့':165,'ညို':166,'ညိုး':167,'တ':168,'တာ':169,'တား':170,'တိ':171,'တီ':172,'တီး':173,'တု':174,'တူ':175,'တူး':176,'တေ့':177,'တေ':178,'တေး':179,'တဲ့':180,'တယ်':181,'တဲ':182,'တော့':183,'တော်':184,'တော':185,'တန့်':186,'တန်':187,'တန်း':188,'တို့':189,'တို':190,'တိုး':191,'ထ':192,'ထာ':193,'ထား':194,'ထိ':195,'ထီ':196,'ထီး':197,'ထု':198,'ထူ':199,'ထူး':200,'ထေ့':201,'ထေ':202,'ထေး':203,'ထဲ့':204,'ထယ်':205,'ထဲ':206,'ထော့':207,'ထော်':208,'ထော':209,'ထန့်':210,'ထန်':211,'ထန်း':212,'ထို့':213,'ထို':214,'ထိုး':215,'ဒ':216,'ဒါ':217,'ဒါး':218,'ဒိ':219,'ဒီ':220,'ဒီး':221,'ဒု':222,'ဒူ':223,'ဒူး':224,'ဒေ့':225,'ဒေ':226,'ဒေး':227,'ဒဲ့':228,'ဒယ်':229,'ဒဲ':230,'ဒေါ့':231,'ဒေါ်':232,'ဒေါ':233,'ဒန့်':234,'ဒန်':235,'ဒန်း':236,'ဒို့':237,'ဒို':238,'ဒိုး':239,'န':240,'နာ':241,'နား':242,'နိ':243,'နီ':244,'နီး':245,'နု':246,'နူ':247,'နူး':248,'နေ့':249,'နေ':250,'နေး':251,'နဲ့':252,'နယ်':253,'နဲ':254,'နော့':255,'နော်':256,'နော':257,'နန့်':258,'နန်':259,'နန်း':260,'နို့':261,'နို':262,'နိုး':263,'ပ':264,'ပါ':265,'ပါး':266,'ပိ':267,'ပီ':268,'ပီး':269,'ပု':270,'ပူ':271,'ပူး':272,'ပေ့':273,'ပေ':274,'ပေး':275,'ပဲ့':276,'ပယ်':277,'ပဲ':278,'ပေါ့':279,'ပေါ်':280,'ပေါ':281,'ပန့်':282,'ပန်':283,'ပန်း':284,'ပို့':285,'ပို':286,'ပိုး':287,'ဖ':288,'ဖာ':289,'ဖား':290,'ဖိ':291,'ဖီ':292,'ဖီး':293,'ဖု':294,'ဖူ':295,'ဖူး':296,'ဖေ့':297,'ဖေ':298,'ဖေး':299,'ဖဲ့':300,'ဖယ်':301,'ဖဲ':302,'ဖော့':303,'ဖော်':304,'ဖော':305,'ဖန့်':306,'ဖန်':307,'ဖန်း':308,'ဖို့':309,'ဖို':310,'ဖိုး':311,'ဗ':312,'ဗာ':313,'ဗား':314,'ဗိ':315,'ဗီ':316,'ဗီး':317,'ဗု':318,'ဗူ':319,'ဗူး':320,'ဗေ့':321,'ဗေ':322,'ဗေး':323,'ဗဲ့':324,'ဗယ်':325,'ဗဲ':326,'ဗော့':327,'ဗော်':328,'ဗော':329,'ဗန့်':330,'ဗန်':331,'ဗန်း':332,'ဗို့':333,'ဗို':334,'ဗိုး':335,'မ':336,'မာ':337,'မား':338,'မိ':339,'မီ':340,'မီး':341,'မု':342,'မူ':343,'မူး':344,'မေ့':345,'မေ':346,'မေး':347,'မဲ့':348,'မယ်':349,'မဲ':350,'မော့':351,'မော်':352,'မော':353,'မန့်':354,'မန်':355,'မန်း':356,'မို့':357,'မို':358,'မိုး':359,'ယ':360,'ယာ':361,'ယား':362,'ယိ':363,'ယီ':364,'ယီး':365,'ယု':366,'ယူ':367,'ယူး':368,'ယေ့':369,'ယေ':370,'ယေး':371,'ယဲ့':372,'ယယ်':373,'ယဲ':374,'ယော့':375,'ယော်':376,'ယော':377,'ယန့်':378,'ယန်':379,'ယန်း':380,'ယို့':381,'ယို':382,'ယိုး':383,'ရ':384,'ရာ':385,'ရား':386,'ရိ':387,'ရီ':388,'ရီး':389,'ရု':390,'ရူ':391,'ရူး':392,'ရေ့':393,'ရေ':394,'ရေး':395,'ရဲ့':396,'ရယ်':397,'ရဲ':398,'ရော့':399,'ရော်':400,'ရော':401,'ရန့်':402,'ရန်':403,'ရန်း':404,'ရို့':405,'ရို':406,'ရိုး':407,'လ':408,'လာ':409,'လား':410,'လိ':411,'လီ':412,'လီး':413,'လု':414,'လူ':415,'လူး':416,'လေ့':417,'လေ':418,'လေး':419,'လဲ့':420,'လယ်':421,'လဲ':422,'လော့':423,'လော်':424,'လော':425,'လန့်':426,'လန်':427,'လန်း':428,'လို့':429,'လို':430,'လိုး':431,'ဝ':432,'ဝါ':433,'ဝါး':434,'ဝိ':435,'ဝီ':436,'ဝီး':437,'ဝု':438,'ဝူ':439,'ဝူး':440,'ဝေ့':441,'ဝေ':442,'ဝေး':443,'ဝဲ့':444,'ဝယ်':445,'ဝဲ':446,'ဝေါ့':447,'ဝေါ်':448,'ဝေါ':449,'ဝန့်':450,'ဝန်':451,'ဝန်း':452,'ဝို့':453,'ဝို':454,'ဝိုး':455,'သ':456,'သာ':457,'သား':458,'သိ':459,'သီ':460,'သီး':461,'သု':462,'သူ':463,'သူး':464,'သေ့':465,'သေ':466,'သေး':467,'သဲ့':468,'သယ်':469,'သဲ':470,'သော့':471,'သော်':472,'သော':473,'သန့်':474,'သန်':475,'သန်း':476,'သို့':477,'သို':478,'သိုး':479,'ဟ':480,'ဟာ':481,'ဟား':482,'ဟိ':483,'ဟီ':484,'ဟီး':485,'ဟု':486,'ဟူ':487,'ဟူး':488,'ဟေ့':489,'ဟေ':490,'ဟေး':491,'ဟဲ့':492,'ဟယ်':493,'ဟဲ':494,'ဟော့':495,'ဟော်':496,'ဟော':497,'ဟန့်':498,'ဟန်':499,'ဟန်း':500,'ဟို့':501,'ဟို':502,'ဟိုး':503,'အ':504,'အာ':505,'အား':506,'အိ':507,'အီ':508,'အီး':509,'အု':510,'အူ':511,'အူး':512,'အေ့':513,'အေ':514,'အေး':515,'အဲ့':516,'အယ်':517,'အဲ':518,'အော့':519,'အော်':520,'အော':521,'အန့်':522,'အန်':523,'အန်း':524,'အို့':525,'အို':526,'အိုး':527,'ကျ':528,'ကျာ':529,'ကျား':530,'ကျိ':531,'ကျီ':532,'ကျီး':533,'ကျု':534,'ကျူ':535,'ကျူး':536,'ကျေ့':537,'ကျေ':538,'ကျေး':539,'ကျဲ့':540,'ကျယ်':541,'ကျဲ':542,'ကျော့':543,'ကျော်':544,'ကျော':545,'ကျန့်':546,'ကျန်':547,'ကျန်း':548,'ကျို့':549,'ကျို':550,'ကျိုး':551,'ချ':552,'ချာ':553,'ချား':554,'ချိ':555,'ချီ':556,'ချီး':557,'ချု':558,'ချူ':559,'ချူး':560,'ချေ့':561,'ချေ':562,'ချေး':563,'ချဲ့':564,'ချယ်':565,'ချဲ':566,'ချော့':567,'ချော်':568,'ချော':569,'ချန့်':570,'ချန်':571,'ချန်း':572,'ချို့':573,'ချို':574,'ချိုး':575,'ဂျ':576,'ဂျာ':577,'ဂျား':578,'ဂျိ':579,'ဂျီ':580,'ဂျီး':581,'ဂျု':582,'ဂျူ':583,'ဂျူး':584,'ဂျေ့':585,'ဂျေ':586,'ဂျေး':587,'ဂျဲ့':588,'ဂျယ်':589,'ဂျဲ':590,'ဂျော့':591,'ဂျော်':592,'ဂျော':593,'ဂျန့်':594,'ဂျန်':595,'ဂျန်း':596,'ဂျို့':597,'ဂျို':598,'ဂျိုး':599,'ပျ':600,'ပျာ':601,'ပျား':602,'ပျိ':603,'ပျီ':604,'ပျီး':605,'ပျု':606,'ပျူ':607,'ပျူး':608,'ပျေ့':609,'ပျေ':610,'ပျေး':611,'ပျဲ့':612,'ပျယ်':613,'ပျဲ':614,'ပျော့':615,'ပျော်':616,'ပျော':617,'ပျန့်':618,'ပျန်':619,'ပျန်း':620,'ပျို့':621,'ပျို':622,'ပျိုး':623,'ဖျ':624,'ဖျာ':625,'ဖျား':626,'ဖျိ':627,'ဖျီ':628,'ဖျီး':629,'ဖျု':630,'ဖျူ':631,'ဖျူး':632,'ဖျေ့':633,'ဖျေ':634,'ဖျေး':635,'ဖျဲ့':636,'ဖျယ်':637,'ဖျဲ':638,'ဖျော့':639,'ဖျော်':640,'ဖျော':641,'ဖျန့်':642,'ဖျန်':643,'ဖျန်း':644,'ဖျို့':645,'ဖျို':646,'ဖျိုး':647,'ဗျ':648,'ဗျာ':649,'ဗျား':650,'ဗျိ':651,'ဗျီ':652,'ဗျီး':653,'ဗျု':654,'ဗျူ':655,'ဗျူး':656,'ဗျေ့':657,'ဗျေ':658,'ဗျေး':659,'ဗျဲ့':660,'ဗျယ်':661,'ဗျဲ':662,'ဗျော့':663,'ဗျော်':664,'ဗျော':665,'ဗျန့်':666,'ဗျန်':667,'ဗျန်း':668,'ဗျို့':669,'ဗျို':670,'ဗျိုး':671,'မျ':672,'မျာ':673,'များ':674,'မျိ':675,'မျီ':676,'မျီး':677,'မျု':678,'မျူ':679,'မျူး':680,'မျေ့':681,'မျေ':682,'မျေး':683,'မျဲ့':684,'မျယ်':685,'မျဲ':686,'မျော့':687,'မျော်':688,'မျော':689,'မျန့်':690,'မျန်':691,'မျန်း':692,'မျို့':693,'မျို':694,'မျိုး':695,'လျ':696,'လျာ':697,'လျား':698,'လျု':699,'လျူ':700,'လျူး':701,'လျော့':702,'လျော်':703,'လျော':704,'လျန့်':705,'လျန်':706,'လျန်း':707,'လျို့':708,'လျို':709,'လျိုး':710,'ကွ':711,'ကွာ':712,'ကွား':713,'ကွိ':714,'ကွီ':715,'ကွီး':716,'ကွေ့':717,'ကွေ':718,'ကွေး':719,'ကွဲ့':720,'ကွယ်':721,'ကွဲ':722,'ခွ':723,'ခွါ':724,'ခွါး':725,'ခွိ':726,'ခွီ':727,'ခွီး':728,'ခွေ့':729,'ခွေ':730,'ခွေး':731,'ခွဲ့':732,'ခွယ်':733,'ခွဲ':734,'ဂွ':735,'ဂွါ':736,'ဂွါး':737,'ဂွိ':738,'ဂွီ':739,'ဂွီး':740,'ဂွေ့':741,'ဂွေ':742,'ဂွေး':743,'ဂွဲ့':744,'ဂွယ်':745,'ဂွဲ':746,'ငွ':747,'ငွာ':748,'ငွား':749,'ငွိ':750,'ငွီ':751,'ငွီး':752,'ငွေ့':753,'ငွေ':754,'ငွေး':755,'ငွဲ့':756,'ငွယ်':757,'ငွဲ':758,'စွ':759,'စွာ':760,'စွား':761,'စွိ':762,'စွီ':763,'စွီး':764,'စွေ့':765,'စွေ':766,'စွေး':767,'စွဲ့':768,'စွယ်':769,'စွဲ':770,'ဇွ':771,'ဇွာ':772,'ဇွား':773,'ဇွိ':774,'ဇွီ':775,'ဇွီး':776,'ဇွေ့':777,'ဇွေ':778,'ဇွေး':779,'ဇွဲ့':780,'ဇွယ်':781,'ဇွဲ':782,'ညွ':783,'ညွာ':784,'ညွား':785,'ညွိ':786,'ညွီ':787,'ညွီး':788,'ညွေ့':789,'ညွေ':790,'ညွေး':791,'ညွဲ့':792,'ညွယ်':793,'ညွဲ':794,'တွ':795,'တွာ':796,'တွား':797,'တွိ':798,'တွီ':799,'တွီး':800,'တွေ့':801,'တွေ':802,'တွေး':803,'တွဲ့':804,'တွယ်':805,'တွဲ':806,'ထွ':807,'ထွာ':808,'ထွား':809,'ထွိ':810,'ထွီ':811,'ထွီး':812,'ထွေ့':813,'ထွေ':814,'ထွေး':815,'ထွဲ့':816,'ထွယ်':817,'ထွဲ':818,'ဒွ':819,'ဒွါ':820,'ဒွါး':821,'ဒွိ':822,'ဒွီ':823,'ဒွီး':824,'ဒွေ့':825,'ဒွေ':826,'ဒွေး':827,'ဒွဲ့':828,'ဒွယ်':829,'ဒွဲ':830,'နွ':831,'နွာ':832,'နွား':833,'နွိ':834,'နွီ':835,'နွီး':836,'နွေ့':837,'နွေ':838,'နွေး':839,'နွဲ့':840,'နွယ်':841,'နွဲ':842,'ပွ':843,'ပွါ':844,'ပွါး':845,'ပွိ':846,'ပွီ':847,'ပွီး':848,'ပွေ့':849,'ပွေ':850,'ပွေး':851,'ပွဲ့':852,'ပွယ်':853,'ပွဲ':854,'ဖွ':855,'ဖွာ':856,'ဖွား':857,'ဖွိ':858,'ဖွီ':859,'ဖွီး':860,'ဖွေ့':861,'ဖွေ':862,'ဖွေး':863,'ဖွဲ့':864,'ဖွယ်':865,'ဖွဲ':866,'ဗွ':867,'ဗွာ':868,'ဗွား':869,'ဗွိ':870,'ဗွီ':871,'ဗွီး':872,'ဗွေ့':873,'ဗွေ':874,'ဗွေး':875,'ဗွဲ့':876,'ဗွယ်':877,'ဗွဲ':878,'မွ':879,'မွာ':880,'မွား':881,'မွိ':882,'မွီ':883,'မွီး':884,'မွေ့':885,'မွေ':886,'မွေး':887,'မွဲ့':888,'မွယ်':889,'မွဲ':890,'ယွ':891,'ယွာ':892,'ယွား':893,'ယွိ':894,'ယွီ':895,'ယွီး':896,'ယွေ့':897,'ယွေ':898,'ယွေး':899,'ယွဲ့':900,'ယွယ်':901,'ယွဲ':902,'လွ':903,'လွာ':904,'လွား':905,'လွိ':906,'လွီ':907,'လွီး':908,'လွေ့':909,'လွေ':910,'လွေး':911,'လွဲ့':912,'လွယ်':913,'လွဲ':914,'သွ':915,'သွာ':916,'သွား':917,'သွိ':918,'သွီ':919,'သွီး':920,'သွေ့':921,'သွေ':922,'သွေး':923,'သွဲ့':924,'သွယ်':925,'သွဲ':926,'ဟွ':927,'ဟွာ':928,'ဟွား':929,'ဟွိ':930,'ဟွီ':931,'ဟွီး':932,'ဟွေ့':933,'ဟွေ':934,'ဟွေး':935,'ဟွဲ့':936,'ဟွယ်':937,'ဟွဲ':938,'ငှ':939,'ငှာ':940,'ငှား':941,'ငှိ':942,'ငှီ':943,'ငှီး':944,'ငှု':945,'ငှူ':946,'ငှူး':947,'ငှေ့':948,'ငှေ':949,'ငှေး':950,'ငှဲ့':951,'ငှယ်':952,'ငှဲ':953,'ငှော့':954,'ငှော်':955,'ငှော':956,'ငှန့်':957,'ငှန်':958,'ငှန်း':959,'ငှို့':960,'ငှို':961,'ငှိုး':962,'ညှ':963,'ညှာ':964,'ညှား':965,'ညှိ':966,'ညှီ':967,'ညှီး':968,'ညှု':969,'ညှူ':970,'ညှူး':971,'ညှေ့':972,'ညှေ':973,'ညှေး':974,'ညှဲ့':975,'ညှယ်':976,'ညှဲ':977,'ညှော့':978,'ညှော်':979,'ညှော':980,'ညှန့်':981,'ညှန်':982,'ညှန်း':983,'ညှို့':984,'ညှို':985,'ညှိုး':986,'နှ':987,'နှာ':988,'နှား':989,'နှိ':990,'နှီ':991,'နှီး':992,'နှု':993,'နှူ':994,'နှူး':995,'နှေ့':996,'နှေ':997,'နှေး':998,'နှဲ့':999,'နှယ်':1000,'နှဲ':1001,'နှော့':1002,'နှော်':1003,'နှော':1004,'နှန့်':1005,'နှန်':1006,'နှန်း':1007,'နှို့':1008,'နှို':1009,'နှိုး':1010,'မှ':1011,'မှာ':1012,'မှား':1013,'မှိ':1014,'မှီ':1015,'မှီး':1016,'မှု':1017,'မှူ':1018,'မှူး':1019,'မှေ့':1020,'မှေ':1021,'မှေး':1022,'မှဲ့':1023,'မှယ်':1024,'မှဲ':1025,'မှော့':1026,'မှော်':1027,'မှော':1028,'မှန့်':1029,'မှန်':1030,'မှန်း':1031,'မှို့':1032,'မှို':1033,'မှိုး':1034,'ယှ':1035,'ယှာ':1036,'ယှား':1037,'ယှိ':1038,'ယှီ':1039,'ယှီး':1040,'ယှု':1041,'ယှူ':1042,'ယှူး':1043,'ယှေ့':1044,'ယှေ':1045,'ယှေး':1046,'ယှဲ့':1047,'ယှယ်':1048,'ယှဲ':1049,'ယှော့':1050,'ယှော်':1051,'ယှော':1052,'ယှန့်':1053,'ယှန်':1054,'ယှန်း':1055,'ယှို့':1056,'ယှို':1057,'ယှိုး':1058,'လှ':1059,'လှာ':1060,'လှား':1061,'လှိ':1062,'လှီ':1063,'လှီး':1064,'လှု':1065,'လှူ':1066,'လှူး':1067,'လှေ့':1068,'လှေ':1069,'လှေး':1070,'လှဲ့':1071,'လှယ်':1072,'လှဲ':1073,'လှော့':1074,'လှော်':1075,'လှော':1076,'လှန့်':1077,'လှန်':1078,'လှန်း':1079,'လှို့':1080,'လှို':1081,'လှိုး':1082,'ဝှ':1083,'ဝှာ':1084,'ဝှား':1085,'ဝှိ':1086,'ဝှီ':1087,'ဝှီး':1088,'ဝှု':1089,'ဝှူ':1090,'ဝှူး':1091,'ဝှေ့':1092,'ဝှေ':1093,'ဝှေး':1094,'ဝှဲ့':1095,'ဝှယ်':1096,'ဝှဲ':1097,'ဝှော့':1098,'ဝှော်':1099,'ဝှော':1100,'ဝှန့်':1101,'ဝှန်':1102,'ဝှန်း':1103,'ဝှို့':1104,'ဝှို':1105,'ဝှိုး':1106,'ကျွ':1107,'ကျွာ':1108,'ကျွား':1109,'ကျွိ':1110,'ကျွီ':1111,'ကျွီး':1112,'ကျွေ့':1113,'ကျွေ':1114,'ကျွေး':1115,'ကျွဲ့':1116,'ကျွယ်':1117,'ကျွဲ':1118,'ချွ':1119,'ချွာ':1120,'ချွား':1121,'ချွေ့':1122,'ချွေ':1123,'ချွေး':1124,'ချွဲ့':1125,'ချွယ်':1126,'ချွဲ':1127,'မြွ':1128,'မြွာ':1129,'မြွား':1130,'မြွေ့':1131,'မြွေ':1132,'မြွေး':1133,'မျှ':1134,'မျှာ':1135,'မျှား':1136,'မျှိ':1137,'မျှီ':1138,'မျှီး':1139,'မျှု':1140,'မျှူ':1141,'မျှူး':1142,'မျှေ့':1143,'မျှေ':1144,'မျှေး':1145,'မျှဲ့':1146,'မျှယ်':1147,'မျှဲ':1148,'မျှော့':1149,'မျှော်':1150,'မျှော':1151,'မျှန့်':1152,'မျှန်':1153,'မျှန်း':1154,'မျှို့':1155,'မျှို':1156,'မျှိုး':1157,'လျှ':1158,'လျှာ':1159,'လျှား':1160,'လျှိ':1161,'လျှီ':1162,'လျှီး':1163,'လျှု':1164,'လျှူ':1165,'လျှူး':1166,'လျှေ့':1167,'လျှေ':1168,'လျှေး':1169,'လျှဲ့':1170,'လျှယ်':1171,'လျှဲ':1172,'လျှော့':1173,'လျှော်':1174,'လျှော':1175,'လျှန့်':1176,'လျှန်':1177,'လျှန်း':1178,'လျှို့':1179,'လျှို':1180,'လျှိုး':1181,'ညွှ':1182,'ညွှာ':1183,'ညွှား':1184,'ညွှိ':1185,'ညွှီ':1186,'ညွှီး':1187,'ညွှေ့':1188,'ညွှေ':1189,'ညွှေး':1190,'ညွှဲ့':1191,'ညွှယ်':1192,'ညွှဲ':1193,'နွှ':1194,'နွှာ':1195,'နွှား':1196,'နွှိ':1197,'နွှီ':1198,'နွှီး':1199,'နွှေ့':1200,'နွှေ':1201,'နွှေး':1202,'နွှဲ့':1203,'နွှယ်':1204,'နွှဲ':1205,'မွှ':1206,'မွှာ':1207,'မွှား':1208,'မွှိ':1209,'မွှီ':1210,'မွှီး':1211,'မွှေ့':1212,'မွှေ':1213,'မွှေး':1214,'မွှဲ့':1215,'မွှယ်':1216,'မွှဲ':1217,'ရွှ':1218,'ရွှာ':1219,'ရွှား':1220,'ရွှိ':1221,'ရွှီ':1222,'ရွှီး':1223,'ရွှေ့':1224,'ရွှေ':1225,'ရွှေး':1226,'ရွှဲ့':1227,'ရွှယ်':1228,'ရွှဲ':1229,'လွှ':1230,'လွှာ':1231,'လွှား':1232,'လွှိ':1233,'လွှီ':1234,'လွှီး':1235,'လွှေ့':1236,'လွှေ':1237,'လွှေး':1238,'လွှဲ့':1239,'လွှယ်':1240,'လွှဲ':1241, 'ယွှန့်':1242,'ယွှန်':1243,'ယွှန်း':1244,'ညွန့်':1245,'ညွန်':1246,'ညွန်း':1247,'ဂျွန့်':1248,'ဂျွန်':1249,'ဂျွန်း':1250,'မွှန့်':1251,'မွှန်':1252,'မွှန်း':1253};
        const level5TimeMap = {'အင့်':0,'အင်':1,'အင်း':2,'အောင့်':3,'အောင်':4,'အောင်း':5,'အိုင့်':6,'အိုင်':7,'အိုင်း':8,'အိန့်':9,'အိန်':10,'အိန်း':11,'အုန့်':12,'အုန်':13,'အုန်း':14,'အွန့်':15,'အွန်':16,'အွန်း':17,'အက်':18,'အောက်':19,'အိုက်':20,'အစ်':21,'အတ်':22,'အိတ်':23,'အုတ်':24,'အွတ်':25,'ကင့်':26,'ကင်':27,'ကင်း':28,'ကောင့်':29,'ကောင်':30,'ကောင်း':31,'ကိုင့်':32,'ကိုင်':33,'ကိုင်း':34,'ကွင့်':35,'ကွင်':36,'ကွင်း':37,'ကိန့်':38,'ကိန်':39,'ကိန်း':40,'ကုန့်':41,'ကုန်':42,'ကုန်း':43,'ကွန့်':44,'ကွန်':45,'ကွန်း':46,'ကက်':47,'ကောက်':48,'ကိုက်':49,'ကွက်':50,'ကစ်':51,'ကတ်':52,'ကိတ်':53,'ကုတ်':54,'ကွတ်':55,'ခင့်':56,'ခင်':57,'ခင်း':58,'ခေါင့်':59,'ခေါင်':60,'ခေါင်း':61,'ခိုင့်':62,'ခိုင်':63,'ခိုင်း':64,'ခွင့်':65,'ခွင်':66,'ခွင်း':67,'ခိန့်':68,'ခိန်':69,'ခိန်း':70,'ခုန့်':71,'ခုန်':72,'ခုန်း':73,'ခွန့်':74,'ခွန်':75,'ခွန်း':76,'ခက်':77,'ခေါက်':78,'ခိုက်':79,'ခွက်':80,'ခစ်':81,'ခတ်':82,'ခိတ်':83,'ခုတ်':84,'ခွတ်':85,'ဂင့်':86,'ဂင်':87,'ဂင်း':88,'ဂေါင့်':89,'ဂေါင်':90,'ဂေါင်း':91,'ဂိုင့်':92,'ဂိုင်':93,'ဂိုင်း':94,'ဂွင့်':95,'ဂွင်':96,'ဂွင်း':97,'ဂိန့်':98,'ဂိန်':99,'ဂိန်း':100,'ဂုန့်':101,'ဂုန်':102,'ဂုန်း':103,'ဂွန့်':104,'ဂွန်':105,'ဂွန်း':106,'ဂက်':107,'ဂေါက်':108,'ဂိုက်':109,'ဂွက်':110,'ဂစ်':111,'ဂတ်':112,'ဂိတ်':113,'ဂုတ်':114,'ဂွတ်':115,'ငင့်':116,'ငင်':117,'ငင်း':118,'ငေါင့်':119,'ငေါင်':120,'ငေါင်း':121,'ငိုင့်':122,'ငိုင်':123,'ငိုင်း':124,'ငိန့်':125,'ငိန်':126,'ငိန်း':127,'ငုန့်':128,'ငုန်':129,'ငုန်း':130,'ငွန့်':131,'ငွန်':132,'ငွန်း':133,'ငက်':134,'ငေါက်':135,'ငိုက်':136,'ငွက်':137,'ငစ်':138,'ငတ်':139,'ငိတ်':140,'ငုတ်':141,'ငွတ်':142,'စင့်':143,'စင်':144,'စင်း':145,'စောင့်':146,'စောင်':147,'စောင်း':148,'စိုင့်':149,'စိုင်':150,'စိုင်း':151,'စွင့်':152,'စွင်':153,'စွင်း':154,'စိန့်':155,'စိန်':156,'စိန်း':157,'စုန့်':158,'စုန်':159,'စုန်း':160,'စွန့်':161,'စွန်':162,'စွန်း':163,'စက်':164,'စောက်':165,'စိုက်':166,'စွက်':167,'စစ်':168,'စတ်':169,'စိတ်':170,'စုတ်':171,'စွတ်':172,'ဇင့်':173,'ဇင်':174,'ဇင်း':175,'ဇောင့်':176,'ဇောင်':177,'ဇောင်း':178,'ဇိုင့်':179,'ဇိုင်':180,'ဇိုင်း':181,'ဇိန့်':182,'ဇိန်':183,'ဇိန်း':184,'ဇုန့်':185,'ဇုန်':186,'ဇုန်း':187,'ဇွန့်':188,'ဇွန်':189,'ဇွန်း':190,'ဇက်':191,'ဇောက်':192,'ဇိုက်':193,'ဇွက်':194,'ဇစ်':195,'ဇတ်':196,'ဇိတ်':197,'ဇုတ်':198,'ဇွတ်':199,'ညင့်':200,'ညင်':201,'ညင်း':202,'ညောင့်':203,'ညောင်':204,'ညောင်း':205,'ညိုင့်':206,'ညိုင်':207,'ညိုင်း':208,'ညွင့်':209,'ညွင်':210,'ညွင်း':211,'ညိန့်':212,'ညိန်':213,'ညိန်း':214,'ညုန့်':215,'ညုန်':216,'ညုန်း':217,'ညွန့်':218,'ညွန်':219,'ညွန်း':220,'ညက်':221,'ညောက်':222,'ညွက်':223,'ညစ်':224,'ညတ်':225,'ညိတ်':226,'ညုတ်':227,'ညွတ်':228,'တင့်':229,'တင်':230,'တင်း':231,'တောင့်':232,'တောင်':233,'တောင်း':234,'တိုင့်':235,'တိုင်':236,'တိုင်း':237,'တွင့်':238,'တွင်':239,'တွင်း':240,'တိန့်':241,'တိန်':242,'တိန်း':243,'တုန့်':244,'တုန်':245,'တုန်း':246,'တွန့်':247,'တွန်':248,'တွန်း':249,'တက်':250,'တောက်':251,'တိုက်':252,'တွက်':253,'တစ်':254,'တတ်':255,'တိတ်':256,'တုတ်':257,'တွတ်':258,'ထင့်':259,'ထင်':260,'ထင်း':261,'ထောင့်':262,'ထောင်':263,'ထောင်း':264,'ထိုင့်':265,'ထိုင်':266,'ထိုင်း':267,'ထွင့်':268,'ထွင်':269,'ထွင်း':270,'ထိန့်':271,'ထိန်':272,'ထိန်း':273,'ထုန့်':274,'ထုန်':275,'ထုန်း':276,'ထွန့်':277,'ထွန်':278,'ထွန်း':279,'ထက်':280,'ထောက်':281,'ထိုက်':282,'ထွက်':283,'ထစ်':284,'ထတ်':285,'ထိတ်':286,'ထုတ်':287,'ထွတ်':288,'ဒင့်':289,'ဒင်':290,'ဒင်း':291,'ဒေါင့်':292,'ဒေါင်':293,'ဒေါင်း':294,'ဒိုင့်':295,'ဒိုင်':296,'ဒိုင်း':297,'ဒွင့်':298,'ဒွင်':299,'ဒွင်း':300,'ဒိန့်':301,'ဒိန်':302,'ဒိန်း':303,'ဒုန့်':304,'ဒုန်':305,'ဒုန်း':306,'ဒွန့်':307,'ဒွန်':308,'ဒွန်း':309,'ဒက်':310,'ဒေါက်':311,'ဒိုက်':312,'ဒွက်':313,'ဒစ်':314,'ဒတ်':315,'ဒိတ်':316,'ဒုတ်':317,'ဒွတ်':318,'နင့်':319,'နင်':320,'နင်း':321,'နောင့်':322,'နောင်':323,'နောင်း':324,'နိုင့်':325,'နိုင်':326,'နိုင်း':327,'နွင့်':328,'နွင်':329,'နွင်း':330,'နိန့်':331,'နိန်':332,'နိန်း':333,'နုန့်':334,'နုန်':335,'နုန်း':336,'နွန့်':337,'နွန်':338,'နွန်း':339,'နက်':340,'နောက်':341,'နိုက်':342,'နွက်':343,'နစ်':344,'နတ်':345,'နိတ်':346,'နုတ်':347,'နွတ်':348,'ပင့်':349,'ပင်':350,'ပင်း':351,'ပေါင့်':352,'ပေါင်':353,'ပေါင်း':354,'ပိုင့်':355,'ပိုင်':356,'ပိုင်း':357,'ပွင့်':358,'ပွင်':359,'ပွင်း':360,'ပိန့်':361,'ပိန်':362,'ပိန်း':363,'ပုန့်':364,'ပုန်':365,'ပုန်း':366,'ပွန့်':367,'ပွန်':368,'ပွန်း':369,'ပက်':370,'ပေါက်':371,'ပိုက်':372,'ပွက်':373,'ပစ်':374,'ပတ်':375,'ပိတ်':376,'ပုတ်':377,'ပွတ်':378,'ဖင့်':379,'ဖင်':380,'ဖင်း':381,'ဖောင့်':382,'ဖောင်':383,'ဖောင်း':384,'ဖိုင့်':385,'ဖိုင်':386,'ဖိုင်း':387,'ဖွင့်':388,'ဖွင်':389,'ဖွင်း':390,'ဖိန့်':391,'ဖိန်':392,'ဖိန်း':393,'ဖုန့်':394,'ဖုန်':395,'ဖုန်း':396,'ဖွန့်':397,'ဖွန်':398,'ဖွန်း':399,'ဖက်':400,'ဖောက်':401,'ဖိုက်':402,'ဖွက်':403,'ဖစ်':404,'ဖတ်':405,'ဖိတ်':406,'ဖုတ်':407,'ဖွတ်':408,'ဗင့်':409,'ဗင်':410,'ဗင်း':411,'ဗောင့်':412,'ဗောင်':413,'ဗောင်း':414,'ဗိုင့်':415,'ဗိုင်':416,'ဗိုင်း':417,'ဗွင့်':418,'ဗွင်':419,'ဗွင်း':420,'ဗိန့်':421,'ဗိန်':422,'ဗိန်း':423,'ဗုန့်':424,'ဗုန်':425,'ဗုန်း':426,'ဗွန့်':427,'ဗွန်':428,'ဗွန်း':429,'ဗက်':430,'ဗောက်':431,'ဗိုက်':432,'ဗွက်':433,'ဗစ်':434,'ဗတ်':435,'ဗိတ်':436,'ဗုတ်':437,'ဗွတ်':438,'မင့်':439,'မင်':440,'မင်း':441,'မောင့်':442,'မောင်':443,'မောင်း':444,'မိုင့်':445,'မိုင်':446,'မိုင်း':447,'မွင့်':448,'မွင်':449,'မွင်း':450,'မိန့်':451,'မိန်':452,'မိန်း':453,'မုန့်':454,'မုန်':455,'မုန်း':456,'မွန့်':457,'မွန်':458,'မွန်း':459,'မက်':460,'မောက်':461,'မိုက်':462,'မွက်':463,'မစ်':464,'မတ်':465,'မိတ်':466,'မုတ်':467,'မွတ်':468,'ယင့်':469,'ယင်':470,'ယင်း':471,'ယောင့်':472,'ယောင်':473,'ယောင်း':474,'ယိုင့်':475,'ယိုင်':476,'ယိုင်း':477,'ယွင့်':478,'ယွင်':479,'ယွင်း':480,'ယိန့်':481,'ယိန်':482,'ယိန်း':483,'ယုန့်':484,'ယုန်':485,'ယုန်း':486,'ယွန့်':487,'ယွန်':488,'ယွန်း':489,'ယက်':490,'ယောက်':491,'ယိုက်':492,'ယွက်':493,'ယစ်':494,'ယတ်':495,'ယိတ်':496,'ယုတ်':497,'ယွတ်':498,'လင့်':499,'လင်':500,'လင်း':501,'လောင့်':502,'လောင်':503,'လောင်း':504,'လိုင့်':505,'လိုင်':506,'လိုင်း':507,'လွင့်':508,'လွင်':509,'လွင်း':510,'လိန့်':511,'လိန်':512,'လိန်း':513,'လုန့်':514,'လုန်':515,'လုန်း':516,'လွန့်':517,'လွန်':518,'လွန်း':519,'လက်':520,'လောက်':521,'လိုက်':522,'လွက်':523,'လစ်':524,'လတ်':525,'လိတ်':526,'လုတ်':527,'လွတ်':528,'ဝင့်':529,'ဝင်':530,'ဝင်း':531,'ဝေါင့်':532,'ဝေါင်':533,'ဝေါင်း':534,'ဝိုင့်':535,'ဝိုင်':536,'ဝိုင်း':537,'ဝိန့်':538,'ဝိန်':539,'ဝိန်း':540,'ဝုန့်':541,'ဝုန်':542,'ဝုန်း':543,'ဝွန့်':544,'ဝွန်':545,'ဝွန်း':546,'ဝက်':547,'ဝေါက်':548,'ဝိုက်':549,'ဝစ်':550,'ဝတ်':551,'ဝိတ်':552,'ဝုတ်':553,'ဝွတ်':554,'သင့်':555,'သင်':556,'သင်း':557,'သောင့်':558,'သောင်':559,'သောင်း':560,'သိုင့်':561,'သိုင်':562,'သိုင်း':563,'သွင့်':564,'သွင်':565,'သွင်း':566,'သိန့်':567,'သိန်':568,'သိန်း':569,'သုန့်':570,'သုန်':571,'သုန်း':572,'သွန့်':573,'သွန်':574,'သွန်း':575,'သက်':576,'သောက်':577,'သိုက်':578,'သွက်':579,'သစ်':580,'သတ်':581,'သိတ်':582,'သုတ်':583,'သွတ်':584,'ဟင့်':585,'ဟင်':586,'ဟင်း':587,'ဟောင့်':588,'ဟောင်':589,'ဟောင်း':590,'ဟိုင့်':591,'ဟိုင်':592,'ဟိုင်း':593,'ဟိန့်':594,'ဟိန်':595,'ဟိန်း':596,'ဟုန့်':597,'ဟုန်':598,'ဟုန်း':599,'ဟွန့်':600,'ဟွန်':601,'ဟွန်း':602,'ဟက်':603,'ဟောက်':604,'ဟိုက်':605,'ဟစ်':606,'ဟတ်':607,'ဟိတ်':608,'ဟုတ်':609,'ဟွတ်':610,'ကျင့်':611,'ကျင်':612,'ကျင်း':613,'ကျောင့်':614,'ကျောင်':615,'ကျောင်း':616,'ကျိုင့်':617,'ကျိုင်':618,'ကျိုင်း':619,'ကျွင့်':620,'ကျွင်':621,'ကျွင်း':622,'ကျိန့်':623,'ကျိန်':624,'ကျိန်း':625,'ကျုန့်':626,'ကျုန်':627,'ကျုန်း':628,'ကျွန့်':629,'ကျွန်':630,'ကျွန်း':631,'ကျက်':632,'ကျောက်':633,'ကျိုက်':634,'ကျွက်':635,'ကျစ်':636,'ကျတ်':637,'ကျိတ်':638,'ကျုတ်':639,'ကျွတ်':640,'ချင့်':641,'ချင်':642,'ချင်း':643,'ချောင့်':644,'ချောင်':645,'ချောင်း':646,'ချိုင့်':647,'ချိုင်':648,'ချိုင်း':649,'ချွင့်':650,'ချွင်':651,'ချွင်း':652,'ချိန့်':653,'ချိန်':654,'ချိန်း':655,'ချုန့်':656,'ချုန်':657,'ချုန်း':658,'ချွန့်':659,'ချွန်':660,'ချွန်း':661,'ချက်':662,'ချောက်':663,'ချိုက်':664,'ချွက်':665,'ချစ်':666,'ချတ်':667,'ချိတ်':668,'ချုတ်':669,'ချွတ်':670,'ဂျင့်':671,'ဂျင်':672,'ဂျင်း':673,'ဂျောင့်':674,'ဂျောင်':675,'ဂျောင်း':676,'ဂျိုင့်':677,'ဂျိုင်':678,'ဂျိုင်း':679,'ဂျွင့်':680,'ဂျွင်':681,'ဂျွင်း':682,'ဂျိန့်':683,'ဂျိန်':684,'ဂျိန်း':685,'ဂျုန့်':686,'ဂျုန်':687,'ဂျုန်း':688,'ဂျွန့်':689,'ဂျွန်':690,'ဂျွန်း':691,'ဂျက်':692,'ဂျောက်':693,'ဂျိုက်':694,'ဂျွက်':695,'ဂျစ်':696,'ဂျတ်':697,'ဂျိတ်':698,'ဂျုတ်':699,'ဂျွတ်':700,'ပျင့်':701,'ပျင်':702,'ပျင်း':703,'ပျောင့်':704,'ပျောင်':705,'ပျောင်း':706,'ပျိုင့်':707,'ပျိုင်':708,'ပျိုင်း':709,'ပျိန့်':710,'ပျိန်':711,'ပျိန်း':712,'ပျုန့်':713,'ပျုန်':714,'ပျုန်း':715,'ပျွန့်':716,'ပျွန်':717,'ပျွန်း':718,'ပျက်':719,'ပျောက်':720,'ပျိုက်':721,'ပျစ်':722,'ပျတ်':723,'ပျိတ်':724,'ပျုတ်':725,'ပျွတ်':726,'ဖျင့်':727,'ဖျင်':728,'ဖျင်း':729,'ဖျောင့်':730,'ဖျောင်':731,'ဖျောင်း':732,'ဖျိုင့်':733,'ဖျိုင်':734,'ဖျိုင်း':735,'ဖျိန့်':736,'ဖျိန်':737,'ဖျိန်း':738,'ဖျုန့်':739,'ဖျုန်':740,'ဖျုန်း':741,'ဖျက်':742,'ဖျောက်':743,'ဖျိုက်':744,'ဖျစ်':745,'ဖျတ်':746,'ဖျိတ်':747,'ဖျုတ်':748,'ဖျွတ်':749,'ဗျင့်':750,'ဗျင်':751,'ဗျင်း':752,'ဗျောင့်':753,'ဗျောင်':754,'ဗျောင်း':755,'ဗျိုင့်':756,'ဗျိုင်':757,'ဗျိုင်း':758,'ဗျိန့်':759,'ဗျိန်':760,'ဗျိန်း':761,'ဗျုန့်':762,'ဗျုန်':763,'ဗျုန်း':764,'ဗျွန့်':765,'ဗျွန်':766,'ဗျွန်း':767,'ဗျက်':768,'ဗျောက်':769,'ဗျိုက်':770,'ဗျစ်':771,'ဗျတ်':772,'ဗျိတ်':773,'ဗျုတ်':774,'ဗျွတ်':775,'မျင့်':776,'မျင်':777,'မျင်း':778,'မျောင့်':779,'မျောင်':780,'မျောင်း':781,'မျိုင့်':782,'မျိုင်':783,'မျိုင်း':784,'မျိန့်':785,'မျိန်':786,'မျိန်း':787,'မျုန့်':788,'မျုန်':789,'မျုန်း':790,'မျွန့်':791,'မျွန်':792,'မျွန်း':793,'မျက်':794,'မျောက်':795,'မျိုက်':796,'မျစ်':797,'မျတ်':798,'မျိတ်':799,'မျုတ်':800,'မျွတ်':801,'လျင့်':802,'လျင်':803,'လျင်း':804,'လျောင့်':805,'လျောင်':806,'လျောင်း':807,'လျက်':808,'လျောက်':809,'လျိုက်':810,'လျစ်':811,'လျတ်':812,'လျိတ်':813,'လျုတ်':814,'လျွတ်':815,'ငှင့်':816,'ငှင်':817,'ငှင်း':818,'ငှက်':819,'ငှစ်':820,'ငှိတ်':821,'ငှုတ်':822,'ညှင့်':823,'ညှင်':824,'ညှင်း':825,'ညှောင့်':826,'ညှောင်':827,'ညှောင်း':828,'ညှိုင့်':829,'ညှိုင်':830,'ညှိုင်း':831,'ညှိန့်':832,'ညှိန်':833,'ညှိန်း':834,'ညှုန့်':835,'ညှုန်':836,'ညှုန်း':837,'ညွှန့်':838,'ညွှန်':839,'ညွှန်း':840,'ညှက်':841,'ညှောက်':842,'ညှိုက်':843,'ညှစ်':844,'ညှိတ်':845,'ညှုတ်':846,'နှင့်':847,'နှင်':848,'နှင်း':849,'နှောင့်':850,'နှောင်':851,'နှောင်း':852,'နှိုင့်':853,'နှိုင်':854,'နှိုင်း':855,'နှိန့်':856,'နှိန်':857,'နှိန်း':858,'နှုန့်':859,'နှုန်':860,'နှုန်း':861,'နှက်':862,'နှောက်':863,'နှိုက်':864,'နှစ်':865,'နှတ်':866,'နှိတ်':867,'နှုတ်':868,'မှင့်':869,'မှင်':870,'မှင်း':871,'မှောင့်':872,'မှောင်':873,'မှောင်း':874,'မှိုင့်':875,'မှိုင်':876,'မှိုင်း':877,'မှိန့်':878,'မှိန်':879,'မှိန်း':880,'မှုန့်':881,'မှုန်':882,'မှုန်း':883,'မွှန့်':884,'မွှန်':885,'မွှန်း':886,'မှက်':887,'မှောက်':888,'မှိုက်':889,'မှစ်':890,'မှတ်':891,'မှိတ်':892,'မှုတ်':893,'မွှတ်':894,'ယှင့်':895,'ယှင်':896,'ယှင်း':897,'ယှောင့်':898,'ယှောင်':899,'ယှောင်း':900,'ယှိုင့်':901,'ယှိုင်':902,'ယှိုင်း':903,'ယှိန့်':904,'ယှိန်':905,'ယှိန်း':906,'ယှုန့်':907,'ယှုန်':908,'ယှုန်း':909,'ယွှန့်':910,'ယွှန်':911,'ယွှန်း':912,'ယှက်':913,'ယှောက်':914,'ယှိုက်':915,'ယှစ်':916,'ယှတ်':917,'ယှိတ်':918,'ယှုတ်':919,'ယွှတ်':920,'မျှင့်':921,'မျှင်':922,'မျှင်း':923,'မျှောင့်':924,'မျှောင်':925,'မျှောင်း':926,'မျှုန့်':927,'မျှုန်':928,'မျှုန်း':929,'မျှက်':930,'မျှောက်':931,'မျှိုက်':932,'မျှစ်':933,'မျှတ်':934,'မျှိတ်':935,'မျှုတ်':936,'မျွှတ်':937,'လျှင့်':938,'လျှင်':939,'လျှင်း':940,'လျှောင့်':941,'လျှောင်':942,'လျှောင်း':943,'လျှက်':944,'လျှောက်':945,'လျှိုက်':946,'လျှစ်':947,'လျှိတ်':948,'လျှုတ်':949,'နွှင့်':950,'နွှင်':951,'နွှင်း':952,'ရွှင့်':953,'ရွှင်':954,'ရွှင်း':955,'လွှင့်':956,'လွှင်':957,'လွှင်း':958, 'လှောင့်':959,'လှောင်':960,'လှောင်း':961,'လှိုင့်':962,'လှိုင်':963,'လှိုင်း':964,'လှိန့်':965,'လှိန်':966,'လှိန်း':967,'လှက်':968,'လှောက်':969,'လှိုက်':970,'လှစ်':971,'လှတ်':972,'လှိတ်':973,'လှုတ်':974,'လွှတ်':975,'လှုန့်':976,'လှုန်':977,'လှုန်း':978, 'ံ':979, '၌':980, '၍':981, '၎င်း':982, 'က်':983, 'ဂျွ':984, 'င်':985, 'စ်':986, 'ဉ်':987, 'ည်':988, 'တ်':989, 'န်':990, 'ပျွ':991, 'ပြွ':992, 'ပ်':993, 'မြွ':994, 'မ်':995, 'ယ်':996, 'ျ':997, 'ြ':998, 'ွ':999, 'ှ':1000, 'ဲ':1001, '်':1002, '့':1003, 'း':1005, 'ာ':1007, 'ါ':1009, 'ိ':1011, 'ီ':1013, 'ု':1015, 'ူ':1017, 'ေ':1019};

        // --- Global State Variables ---
        let currentLevel = 1;
        let score = 0;
        let wrongScore = 0;
        let isGameRunning = false;
        let isPlaying = false;
        let choices = [];
        let correctItem = null;
        let soundTimeout = null;
        
        // Learning Mode State
        let currentLearningLevel = 1;
        let isPlayingSeries = false;
        
        // Remediation State
        const remediationMap = {
            1: 1,
            2: 2,
            4: 3,
            5: 4,
            7: 5,
            8: 6
        };
        let remediationState = {
            active: false,
            quizLevel: 0,
            learnLevel: 0,
            listenCount: 0,
            phase: 'idle' // 'idle', 'select-level', 'select-consonant', 'listening', 'completed'
        };

        // Audio Players
        const audioPlayer = new Audio('https://raw.githubusercontent.com/nathantun93/bell/main/Level1All.mp3');
        const audioPlayerLevel5 = new Audio('https://raw.githubusercontent.com/nathantun93/bell/main/Level2All.mp3');

        // DOM elements
        const scoreElement = byId('score'), wrongScoreElement = byId('wrong-score');
        const messageElement = byId('message'), choicesContainer = byId('choices-container');
        const toggleGameBtn = byId('toggle-game-btn'), replaySoundBtn = byId('replay-sound-btn');
        const levelButtons = rootEl.querySelectorAll('#quiz-mode-container .level-button'), statusIconContainer = byId('status-icon-container');
        const learningDisplay = byId('learning-display');
        
        // Ensure buttons exist before attaching events to avoid errors
        const modal = byId('level-up-modal');
        const modalStayBtn = byId('modal-stay');
        const modalNextBtn = byId('modal-next');


        function extractBaseConsonant(char) { for (const base of allConsonantsAndClusters) { if (char.startsWith(base)) return base; } return char.charAt(0); }
        
        function getSyllables(word) {
             const syllables = [];
             if (!word) return syllables;
             let i = 0;
             while (i < word.length) {
                 let nextSplit = word.length;
                 for (let j = i + 1; j < word.length; j++) {
                     let isStarter = false;
                     for (const starter of syllableStarters) {
                         if (word.substring(j).startsWith(starter)) {
                             const charAfterStarter = word[j + starter.length];
                             if (charAfterStarter === '်' || charAfterStarter === '္') {
                                 continue;
                             }
                             isStarter = true;
                             break;
                         }
                     }

                     if (isStarter) {
                         nextSplit = j;
                         break;
                     }
                 }
                 syllables.push(word.substring(i, nextSplit));
                 i = nextSplit;
             }
             return syllables;
        }

        function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }

        function getSoundStartTime(char) {
            // New Logic: Check for special endings 'ည့်', 'ည်', 'ည်း' FIRST to handle Quiz Mode
            if (char.endsWith('ည့်') || char.endsWith('ည်') || char.endsWith('ည်း')) {
                const base = extractBaseConsonant(char);
                
                const groupYi = ['စ', 'ည',  'န', 'မ', 'သ', 'ကျ', 'ချ', 'ဗျ', 'ကြ', 'ခြ']; 
                const groupAe = ['ဆ', 'တ', 'ထ', 'န', 'မ', 'လ', 'လှ', 'သ', 'မှ']; 
                const groupAy = ['ရ', 'ပြ', 'ဖြ', 'ရှ'];

                let suffixType = '';
                if (char.endsWith('ည့်')) suffixType = 'short'; 
                else if (char.endsWith('ည်')) suffixType = 'med';   
                else if (char.endsWith('ည်း')) suffixType = 'long';  

                let mappedChar = null;

                if (groupAy.includes(base)) {
                    if (suffixType === 'short') mappedChar = base + 'ေ့';
                    else if (suffixType === 'med') mappedChar = base + 'ေ';
                    else if (suffixType === 'long') mappedChar = base + 'ေး';
                } else if (groupAe.includes(base)) {
                    if (suffixType === 'short') mappedChar = base + 'ဲ့';
                    else if (suffixType === 'med') mappedChar = base + 'ယ်';
                    else if (suffixType === 'long') mappedChar = base + 'ဲ';
                } else if (groupYi.includes(base)) {
                    if (suffixType === 'short') mappedChar = base + 'ိ';
                    else if (suffixType === 'med') mappedChar = base + 'ီ';
                    else if (suffixType === 'long') mappedChar = base + 'ီး';
                }

                if (mappedChar) {
                     // Recursively check sound for the mapped char
                     const time = getSoundStartTime(mappedChar);
                     if (time !== undefined) return time;
                }
            }

            // -- FORCED MAPPING LOGIC START --
            const base = extractBaseConsonant(char);
            if (base === 'ရ') {
                 const mappedChar = char.replace('ရ', 'ယ');
                 return getSoundStartTime(mappedChar); 
            }
            // -- FORCED MAPPING LOGIC END --

            const charsToTry = [char];

            if (char.endsWith('မ့်')) charsToTry.push(char.replace('မ့်', 'န့်'));
            if (char.endsWith('မ်')) charsToTry.push(char.replace('မ်', 'န်'));
            if (char.endsWith('မ်း')) charsToTry.push(char.replace('မ်း', 'န်း'));
            if (char.endsWith('ံ့')) charsToTry.push(char.replace('ံ့', 'န့်'));

            if (char.includes('ံ')) {
                charsToTry.push(char.replace(/ံ/g, 'န်'));
            }
            
            const specialMapped = specialSoundMapping[char];
            if (specialMapped) {
                charsToTry.push(specialMapped);
            }

            for (const c of charsToTry) {
                let startTime = syllableTimeMap[c];
                if (startTime !== undefined) return startTime;

                const withoutTones = c.replace(/[့း]/g, '');
                if (withoutTones !== c) {
                    startTime = syllableTimeMap[withoutTones];
                    if (startTime !== undefined) return startTime;
                }

                const base = extractBaseConsonant(c);
                const mappedBase = soundMapping[base];
                if (mappedBase) {
                    const mappedChar = c.replace(base, mappedBase);
                    startTime = syllableTimeMap[mappedChar];
                    if (startTime !== undefined) return startTime;
                    
                    const mappedWithoutTones = mappedChar.replace(/[့း]/g, '');
                     if (mappedWithoutTones !== mappedChar) {
                        startTime = syllableTimeMap[mappedWithoutTones];
                        if (startTime !== undefined) return startTime;
                    }
                }
            }
            return undefined;
        }
        
        function getSoundStartTimeLevel5(char) {
            // 1. Direct Lookup
            if (level5TimeMap[char] !== undefined) return level5TimeMap[char];

            // 2. Handle 'ဉ်' mappings (replace ဉ with င် etc)
            let mappedChar = char;
            if (char.includes('ဉ့်')) mappedChar = char.replace('ဉ့်', 'င့်');
            else if (char.includes('ဉ်း')) mappedChar = char.replace('ဉ်း', 'င်း');
            else if (char.includes('ဉ်')) mappedChar = char.replace('ဉ်', 'င်');
            
            // 3. Common Ending Replacements for Level 5 Sound Fallbacks
            // 'ပ်' -> 'တ်' mapping
            if (mappedChar.includes('ွပ်')) mappedChar = mappedChar.replace('ွပ်', 'ွတ်');
            else if (mappedChar.includes('ိပ်')) mappedChar = mappedChar.replace('ိပ်', 'ိတ်');
            else if (mappedChar.includes('ုပ်')) mappedChar = mappedChar.replace('ုပ်', 'ုတ်');
            else if (mappedChar.includes('ပ်')) mappedChar = mappedChar.replace('ပ်', 'တ်');
            
            // 'မ်' -> 'န်' mapping
             if (mappedChar.includes('ုမ့်')) mappedChar = mappedChar.replace('ုမ့်', 'ုန့်');
             else if (mappedChar.includes('ုမ်')) mappedChar = mappedChar.replace('ုမ်', 'ုန်');
             else if (mappedChar.includes('ုမ်း')) mappedChar = mappedChar.replace('ုမ်း', 'ုန်း');
             else if (mappedChar.includes('ွမ့်')) mappedChar = mappedChar.replace('ွမ့်', 'ွန့်');
             else if (mappedChar.includes('ွမ်')) mappedChar = mappedChar.replace('ွမ်', 'ွန်');
             else if (mappedChar.includes('ွမ်း')) mappedChar = mappedChar.replace('ွမ်း', 'ွန်း');
             else if (mappedChar.includes('ိမ့်')) mappedChar = mappedChar.replace('ိမ့်', 'ိန့်');
             else if (mappedChar.includes('ိမ်')) mappedChar = mappedChar.replace('ိမ်', 'ိန်');
             else if (mappedChar.includes('ိမ်း')) mappedChar = mappedChar.replace('ိမ်း', 'ိန်း');
             else if (mappedChar.includes('မ့်')) mappedChar = mappedChar.replace('မ့်', 'န့်');
             else if (mappedChar.includes('မ်')) mappedChar = mappedChar.replace('မ်', 'န်');
             else if (mappedChar.includes('မ်း')) mappedChar = mappedChar.replace('မ်း', 'န်း');

            // 'ုံ' -> 'ုန်' mapping
            if (mappedChar.includes('ုံ့')) mappedChar = mappedChar.replace('ုံ့', 'ုန့်');
            else if (mappedChar.includes('ုံ')) mappedChar = mappedChar.replace('ုံ', 'ုန်');
            else if (mappedChar.includes('ုံး')) mappedChar = mappedChar.replace('ုံး', 'ုန်း');

            if (level5TimeMap[mappedChar] !== undefined) return level5TimeMap[mappedChar];

            // 4. Handle Consonant Mapping (Fallbacks for missing audio)
            const base = extractBaseConsonant(mappedChar);
            const mappedBase = soundMapping[base];
            
            if (mappedBase) {
                const soundChar = mappedChar.replace(base, mappedBase);
                if (level5TimeMap[soundChar] !== undefined) return level5TimeMap[soundChar];
            }
            
            return undefined;
        }

        // --- LEARNING MODE LOGIC ---

        const tallAaConsonants = ['ခ', 'ဂ', 'င', 'ဒ', 'ပ', 'ဝ', 'ဒွ', 'ဓွ', 'ခွ', 'ဂွ', 'ငွ', 'ပွ', 'ဝွ']; 
        function getCorrectVowelSuffix(consonant, suffix) {
            if (suffix.startsWith('ာ')) {
                if (tallAaConsonants.includes(consonant) || (consonant.length > 1 && tallAaConsonants.includes(consonant[0]) && !consonant.includes('ြ') && !consonant.includes('ွ'))) {
                     return suffix.replace('ာ', 'ါ');
                }
            }
            if (suffix.startsWith('ော')) {
                 if (tallAaConsonants.includes(consonant)) {
                    return suffix.replace('ော', 'ေါ');
                }
            }
            if (suffix.startsWith('ော်')) {
                 if (tallAaConsonants.includes(consonant)) {
                    return suffix.replace('ော်', 'ေါ်');
                }
            }
            return suffix;
        }

        function getExtendedVowelSeries(consonant) {
            const groupYi = ['စ', 'ည',  'န', 'မ', 'သ', 'ကျ', 'ချ', 'ဗျ', 'ကြ', 'ခြ'];
            const groupAe = ['ဆ', 'တ', 'ထ', 'န', 'မ', 'လ', 'လှ', 'သ']; 
            const groupAy = ['ရ', 'ပြ', 'ဖြ', 'ရှ'];

            const rows = [];
            const basePatterns = [
                ['', 'ာ', 'ား'],       // 0
                ['ိ', 'ီ', 'ီး'],       // 1
                ['ု', 'ူ', 'ူး'],       // 2
                ['ေ့', 'ေ', 'ေး'],     // 3
                ['ဲ့', 'ယ်', 'ဲ'],      // 4
                ['ော့', 'ော်', 'ော'],   // 5
                ['ံ့', 'ံ'],           // 6
                ['န့်', 'န်', 'န်း'],    // 7
                ['မ့်', 'မ်', 'မ်း'],    // 8
                ['ို့', 'ို', 'ိုး']      // 9
            ];
            
            basePatterns.forEach((group, index) => {
                let standardRow = [];
                group.forEach(suffix => {
                    const correctSuffix = getCorrectVowelSuffix(consonant, suffix);
                    standardRow.push({
                        text: consonant + correctSuffix,
                        sound: consonant + correctSuffix 
                    });
                });
                rows.push(standardRow);

                if (index === 1 && groupYi.includes(consonant)) {
                    const suffixes = ['ည့်', 'ည်', 'ည်း'];
                    const soundSuffixes = ['ိ', 'ီ', 'ီး'];
                    let specialRow = [];
                    suffixes.forEach((s, i) => {
                        specialRow.push({
                            text: consonant + s,
                            sound: consonant + soundSuffixes[i] 
                        });
                    });
                    rows.push(specialRow);
                }

                if (index === 3 && groupAy.includes(consonant)) {
                    const suffixes = ['ည့်', 'ည်', 'ည်း'];
                    const soundSuffixes = ['ေ့', 'ေ', 'ေး'];
                    let specialRow = [];
                    suffixes.forEach((s, i) => {
                        specialRow.push({
                            text: consonant + s,
                            sound: consonant + soundSuffixes[i] 
                        });
                    });
                    rows.push(specialRow);
                }

                if (index === 4 && groupAe.includes(consonant)) {
                    const suffixes = ['ည့်', 'ည်', 'ည်း'];
                    const soundSuffixes = ['ဲ့', 'ယ်', 'ဲ'];
                    let specialRow = [];
                    suffixes.forEach((s, i) => {
                        specialRow.push({
                            text: consonant + s,
                            sound: consonant + soundSuffixes[i] 
                        });
                    });
                    rows.push(specialRow);
                }
            });
            
            return rows; 
        }
        
        function getVowelSeriesForLevel5(consonant) {
            const correctAung = getCorrectVowelSuffix(consonant, 'ောင်');
            const correctAuk = getCorrectVowelSuffix(consonant, 'ောက်');

            const createItems = (texts, sounds) => {
                let items = [];
                for(let i=0; i<texts.length; i++) {
                    const s = (sounds && sounds[i]) ? sounds[i] : texts[i];
                    if(getSoundStartTimeLevel5(s) !== undefined) {
                        items.push({ text: texts[i], sound: s });
                    }
                }
                return items;
            };

            const row1 = createItems([consonant+'င်', consonant+correctAung, consonant+'ိုင်']);
            const row2 = createItems([consonant+'ိန်', consonant+'ုန်', consonant+'ွန်']);
            const row3 = createItems([consonant+'က်', consonant+correctAuk, consonant+'ိုက်']);
            const row4 = createItems([consonant+'စ်']);
            const row5 = createItems([consonant+'တ်', consonant+'ိတ်', consonant+'ုတ်', consonant+'ွတ်']);
            const row6 = createItems([consonant+'ပ်', consonant+'ိပ်', consonant+'ုပ်', consonant+'ွပ်']);

            return [row1, row2, row3, row4, row5, row6].filter(r => r.length > 0);
        }
        
        function getVowelSeriesForLevel6(consonant) {
            const correctAung = getCorrectVowelSuffix(consonant, 'ောင်');
            const correctAuk = getCorrectVowelSuffix(consonant, 'ောက်');

            const createItems = (texts, sounds) => {
                let items = [];
                for(let i=0; i<texts.length; i++) {
                    const s = (sounds && sounds[i]) ? sounds[i] : texts[i];
                    if(getSoundStartTimeLevel5(s) !== undefined) {
                        items.push({ text: texts[i], sound: s });
                    }
                }
                return items;
            };

            const row1 = createItems([consonant+'င့်', consonant+'င်', consonant+'င်း']);
             const nyinConsonants = ['စ', 'ဇ', 'ည', 'ကျ', 'ချ', 'ပျ', 'ဖျ', 'မျ', 'လျ', 'ကြ'];
             let rowNyin = [];
             if (nyinConsonants.includes(consonant)) {
                 rowNyin = createItems([consonant+'ဉ့်', consonant+'ဉ်', consonant+'ဉ်း']);
             }
            const row2 = createItems([consonant+'ွင့်', consonant+'ွင်', consonant+'ွင်း']);
            const row3 = createItems([consonant+getCorrectVowelSuffix(consonant, 'ောင့်'), consonant+correctAung, consonant+getCorrectVowelSuffix(consonant, 'ောင်း')]);
            const row4 = createItems([consonant+'ိုင့်', consonant+'ိုင်', consonant+'ိုင်း']);
            const row5 = createItems([consonant+'ိန့်', consonant+'ိန်', consonant+'ိန်း']);
            const row6 = createItems([consonant+'ိမ့်', consonant+'ိမ်', consonant+'ိမ်း']);
            const row7 = createItems([consonant+'ုံ့', consonant+'ုံ', consonant+'ုံး']);
            const row8 = createItems([consonant+'ုန့်', consonant+'ုန်', consonant+'ုန်း']);
            const row9 = createItems([consonant+'ုမ့်', consonant+'ုမ်', consonant+'ုမ်း']);
            const row10 = createItems([consonant+'ွန့်', consonant+'ွန်', consonant+'ွန်း']);
            const row11 = createItems([consonant+'ွမ့်', consonant+'ွမ်', consonant+'ွမ်း']);
            const row12 = createItems([consonant+'က်', consonant+'ွက်', consonant+correctAuk, consonant+'ိုက်']);
            const row13 = createItems([consonant+'စ်']);
            const row14 = createItems([consonant+'တ်', consonant+'ိတ်', consonant+'ုတ်', consonant+'ွတ်']);
            const row15 = createItems([consonant+'ပ်', consonant+'ိပ်', consonant+'ုပ်', consonant+'ွပ်']);

            const allRows = [row1, rowNyin, row2, row3, row4, row5, row6, row7, row8, row9, row10, row11, row12, row13, row14, row15];
            return allRows.filter(r => r.length > 0);
        }

        function getVowelSeriesFor(consonant, level) {
            if (level === 6) {
                return getVowelSeriesForLevel6(consonant);
            } else if (level === 5) {
                return getVowelSeriesForLevel5(consonant); 
            } else if (level === 2 || level === 4) {
                const rows = getExtendedVowelSeries(consonant);
                if (level === 4) {
                    return rows.map(row => row.filter(item => getSoundStartTime(item.sound) !== undefined))
                               .filter(row => row.length > 0);
                }
                return rows;
            } else {
                let simpleSeries = [];
                if (vowelSeriesMap[consonant]) {
                    simpleSeries = vowelSeriesMap[consonant].filter(syllable => getSoundStartTime(syllable) !== undefined);
                } else {
                    const seriesTemplate = ['က', 'ကာ', 'ကိ', 'ကီ', 'ကု', 'ကူ', 'ကေ', 'ကဲ', 'ကော', 'ကော်', 'ကံ', 'ကို'];
                    const templateBase = 'က';
                    const generatedSeries = seriesTemplate.map(templateSyllable => {
                        const vowelPart = templateSyllable.substring(templateBase.length);
                        let newSyllable = consonant + vowelPart;
                        if (consonant === 'ည' && vowelPart === 'ီ') { newSyllable = 'ညီ'; }
                        return newSyllable;
                    });
                    simpleSeries = generatedSeries.filter(syllable => getSoundStartTime(syllable) !== undefined);
                }
                
                const chunkedSeries = [];
                for (let i = 0; i < simpleSeries.length; i += 4) {
                    const chunk = simpleSeries.slice(i, i + 4).map(str => ({ text: str, sound: str }));
                    chunkedSeries.push(chunk);
                }
                return chunkedSeries;
            }
        }

        function generateLevelRows(consonantList) {
            const allRows = [];
            consonantList.forEach(consonant => {
                const rows = getExtendedVowelSeries(consonant);
                rows.forEach(row => {
                     const validRow = row.filter(item => getSoundStartTime(item.sound) !== undefined);
                     if (validRow.length > 0) {
                         allRows.push(validRow);
                     }
                });
            });
            return allRows;
        }

        function generateLevel6Rows(consonantList) {
            const allRows = [];
            consonantList.forEach(consonant => {
                const rows = getVowelSeriesForLevel6(consonant);
                rows.forEach(row => {
                    if (row.length >= 2) {
                        allRows.push(row);
                    }
                });
            });
            return allRows;
        }

        const levelTwoData = generateLevelRows(learningConsonantsLevel1);
        const level5Data = generateLevelRows(learningConsonantsLevel2);
        const level7Data = generateLevel6Rows(level5Consonants);

        // --- QUIZ MODE FUNCTIONS ---
        const levelData = { 
            1: allPairs, 
            2: levelTwoData, 
            3: Object.keys(levelThreeWords), 
            4: levelFourPairs, 
            5: level5Data, 
            6: Object.keys(levelSixWords),
            7: level7Data,
            8: Object.keys(levelEightWords)
        };

        function playQuestionSound() {
            if (!isGameRunning || isPlaying) return; 
            isPlaying = true; 
            toggleGameBtn.disabled = true; 
            replaySoundBtn.disabled = true;
            
            clearTimeout(soundTimeout); 
            if (!audioPlayer.paused) { audioPlayer.pause(); }
            if (!audioPlayerLevel5.paused) { audioPlayerLevel5.pause(); }
            
            let syllables = [];
            
            if ([5, 7].includes(currentLevel)) {
                 syllables = correctItem;
            }
            else if ([1, 2, 4].includes(currentLevel)) { 
                syllables = correctItem; 
            } 
            else if ([3, 6, 8].includes(currentLevel)) { 
                syllables = getSyllables(correctItem); 
            }
            
            const playNextAudio = (index) => {
                if (!isGameRunning || index >= syllables.length) { 
                    isPlaying = false; 
                    if (isGameRunning) { 
                        toggleGameBtn.disabled = false; 
                        replaySoundBtn.disabled = false; 
                    } 
                    return; 
                }
                
                let syllableText = syllables[index];
                let soundKey = syllableText; 
                
                if (typeof syllableText === 'object' && syllableText !== null && syllableText.sound) {
                    soundKey = syllableText.sound;
                }

                let startTime = getSoundStartTime(soundKey);
                let activePlayer = audioPlayer;

                if (startTime === undefined) {
                    startTime = getSoundStartTimeLevel5(soundKey);
                    activePlayer = audioPlayerLevel5;
                }
                
                if (startTime === undefined) { 
                    playNextAudio(index + 1); 
                    return; 
                }
                
                activePlayer.currentTime = startTime; 
                const playPromise = activePlayer.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => { 
                        soundTimeout = setTimeout(() => { 
                            if (isGameRunning) { 
                                activePlayer.pause(); 
                                setTimeout(() => playNextAudio(index + 1), 100); 
                            } 
                        }, 1000); 
                    })
                    .catch(error => { 
                        playNextAudio(index + 1); 
                    });
                }
            };
            playNextAudio(0);
        }

        function shootEnergy(button, callback) {
            const btnRect = button.getBoundingClientRect();
            const avatarNode = byId('player-avatar');
            const avatarRect = avatarNode.getBoundingClientRect();
            
            const energy = document.createElement('div');
            energy.innerHTML = '⚡'; 
            energy.className = 'fixed z-50 text-4xl pointer-events-none drop-shadow-[0_0_15px_#3B82F6]';
            energy.style.left = `${btnRect.left + btnRect.width/2}px`;
            energy.style.top = `${btnRect.top + btnRect.height/2}px`;
            energy.style.transform = 'translate(-50%, -50%)';
            rootEl.appendChild(energy);

            const deltaX = avatarRect.left + avatarRect.width/2 - (btnRect.left + btnRect.width/2);
            const deltaY = avatarRect.top + avatarRect.height/2 - (btnRect.top + btnRect.height/2);

            const anim = energy.animate([
                { transform: `translate(-50%, -50%) scale(0.5)`, opacity: 0 },
                { transform: `translate(-50%, -50%) scale(1.5)`, opacity: 1, offset: 0.2 },
                { transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.5)`, opacity: 0 }
            ], { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

            anim.onfinish = () => {
                energy.remove();
                avatarNode.animate([
                    { transform: 'scale(1)', filter: 'brightness(1)' },
                    { transform: 'scale(1.4)', filter: 'brightness(1.5)' },
                    { transform: 'scale(1)', filter: 'brightness(1)' }
                ], { duration: 300 });
                if (callback) callback();
            };
        }

        function shootLetters(button, callback) {
            const btnRect = button.getBoundingClientRect();
            const planeNode = byId('airplane');
            const planeRect = planeNode.getBoundingClientRect();
            
            const letters = document.createElement('div');
            letters.textContent = button.innerText.replace(/\s+/g, '').substring(0, 4);
            letters.className = 'fixed z-50 text-4xl font-black text-red-600 pointer-events-none drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]';
            letters.style.left = `${btnRect.left + btnRect.width/2}px`;
            letters.style.top = `${btnRect.top + btnRect.height/2}px`;
            letters.style.transform = 'translate(-50%, -50%)';
            rootEl.appendChild(letters);

            const deltaX = planeRect.left + planeRect.width/2 - (btnRect.left + btnRect.width/2);
            const deltaY = planeRect.top + planeRect.height/2 - (btnRect.top + btnRect.height/2);

            const anim = letters.animate([
                { transform: `translate(-50%, -50%) rotate(0deg) scale(0.5)`, opacity: 1 },
                { transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) rotate(720deg) scale(1.5)`, opacity: 0.5 }
            ], { duration: 600, easing: 'ease-in' });

            anim.onfinish = () => {
                letters.remove();
                if (callback) callback();
            };
        }

        function leaveSatelliteInOrbit() {
            const container = byId('satellites-container');
            const sat = document.createElement('div');
            sat.className = 'fixed text-4xl md:text-5xl z-10 orbit-mode';
            // Place randomly at the top area (X: 10% to 90%, Y: 2% to 15%)
            const randomX = Math.random() * 80 + 10; 
            const randomY = Math.random() * 13 + 2;  
            sat.style.left = `${randomX}%`;
            sat.style.top = `${randomY}%`;
            sat.textContent = '🛰️';
            container.appendChild(sat);
        }

        function updateProgressAvatars() {
            const avatarNode = byId('player-avatar');
            const avatarIcon = byId('avatar-icon');
            const airplane = byId('airplane');
            
            const currentProgressScore = Math.min(score, WIN_SCORE);
            const progress = (currentProgressScore / WIN_SCORE) * 85; 
            avatarNode.style.bottom = `calc(4% + ${progress}vh)`;

            // Handle Rocket to Satellite morphing when winning this level
            if (currentProgressScore >= WIN_SCORE) {
                avatarIcon.textContent = '🛰️';
                avatarIcon.style.transform = 'rotate(0deg)'; // Satellite points normally
                avatarIcon.classList.add('orbit-mode');
            } else {
                avatarIcon.textContent = '🚀';
                avatarIcon.style.transform = 'rotate(-45deg)'; // Make Rocket point straight up
                avatarIcon.classList.remove('orbit-mode');
            }
            
            // Airplane moves down-left diagonally based on wrong score (0 to 10)
            const airTopProgress = Math.min((wrongScore / 10) * 85, 85);
            const airRightProgress = Math.min((wrongScore / 10) * 75, 75); 
            airplane.style.top = `calc(4% + ${airTopProgress}vh)`;
            airplane.style.right = `calc(2rem + ${airRightProgress}vw)`;
        }

        function startEmojiRain() {
            const createCryingEmoji = () => {
                const emoji = document.createElement('div');
                emoji.innerText = Math.random() > 0.5 ? '😭' : '😢';
                emoji.className = 'emoji-drop';
                emoji.style.left = Math.random() * 95 + 'vw';
                emoji.style.top = '-50px';
                emoji.style.fontSize = (Math.random() * 20 + 24) + 'px';
                rootEl.appendChild(emoji);
                
                setTimeout(() => {
                    emoji.style.top = '120vh';
                }, 10);

                setTimeout(() => {
                    emoji.remove();
                }, 3000);
            };

            const interval = setInterval(createCryingEmoji, 150);
            
            setTimeout(() => {
                clearInterval(interval);
            }, 5000);
        }

        function resetScores() {
            score = 0;
            wrongScore = 0;
            scoreElement.textContent = 0;
            wrongScoreElement.textContent = 0;
            updateProgressAvatars();
        }
        
        // --- REMEDIATION FUNCTIONS ---
        function startRemediation(quizLvl, learnLvl) {
            isGameRunning = false;
            toggleGameBtn.textContent = 'Start Game';
            toggleGameBtn.className = 'btn-start px-8 py-4 text-xl md:text-2xl font-bold';
            toggleGameBtn.disabled = true; 
            replaySoundBtn.disabled = true;
            choicesContainer.innerHTML = '';
            levelButtons.forEach(btn => btn.disabled = true);
            
            remediationState.active = true;
            remediationState.quizLevel = quizLvl;
            remediationState.learnLevel = learnLvl;
            remediationState.listenCount = 0;
            remediationState.phase = 'select-level';
            
            messageElement.textContent = 'You must practice before trying again!';
            messageElement.className = 'text-lg text-red-600 font-bold animate-pulse';
            
            const targetBtn = byId(`learn-level-${learnLvl}-btn`);
            if (targetBtn) {
                targetBtn.classList.add('remediation-target');
                targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function finishRemediation() {
            remediationState.active = false;
            remediationState.phase = 'completed';
            
            byId('quiz-mode-container').scrollIntoView({ behavior: 'smooth' });
            
            levelButtons.forEach(btn => btn.disabled = false);
            toggleGameBtn.disabled = false;
            
            const quizBtn = byId(`level-${remediationState.quizLevel}-btn`);
            if (quizBtn) {
                quizBtn.classList.add('remediation-target');
                quizBtn.click(); 
            }
            
            messageElement.textContent = 'Training Complete! You can retry now.';
            messageElement.className = 'text-lg text-green-600 font-bold';
        }

        function newGame(autoplay = true) {
            if (remediationState.phase === 'completed') {
                 const quizBtn = byId(`level-${remediationState.quizLevel}-btn`);
                 if (quizBtn) quizBtn.classList.remove('remediation-target');
                 remediationState.phase = 'idle';
            }

            if (!isGameRunning) { choicesContainer.innerHTML = ''; messageElement.textContent = ''; return; }
            messageElement.textContent = ''; statusIconContainer.innerHTML = ''; choices = []; let allItems;
            
            const sourceData = levelData[currentLevel]; 
            if (!sourceData || sourceData.length === 0) { messageElement.textContent = 'No items for this level.'; return; }
            
            updateProgressAvatars();

            if ([5, 7].includes(currentLevel)) {
                allItems = [...sourceData];
                correctItem = allItems[Math.floor(Math.random() * allItems.length)];
                
                let distractors = [];
                while (distractors.length < 1) {
                     const dRow = allItems[Math.floor(Math.random() * allItems.length)];
                     if (dRow[0].text !== correctItem[0].text) {
                         distractors.push(dRow);
                     }
                }
                choices = shuffle([correctItem, ...distractors]);
                
            } else if ([1, 2, 4].includes(currentLevel)) {
                allItems = [...sourceData]; 
                correctItem = allItems.splice(Math.floor(Math.random() * allItems.length), 1)[0];
                
                let distractors = []; 
                if (currentLevel === 1 || currentLevel === 4) {
                    const correctBase = extractBaseConsonant(correctItem[0]); 
                    const homophoneGroup = levelFourHomophoneGroups.find(g => g.includes(correctBase));
                    if (homophoneGroup && currentLevel === 4) { 
                        allItems = allItems.filter(itemPair => !homophoneGroup.includes(extractBaseConsonant(itemPair[0]))); 
                    }
                }
                while (distractors.length < 2 && allItems.length > 0) { 
                    distractors.push(allItems.splice(Math.floor(Math.random() * allItems.length), 1)[0]); 
                }
                choices = shuffle([correctItem, ...distractors]);
                
            } else {
                allItems = [...sourceData]; 
                correctItem = allItems.splice(Math.floor(Math.random() * allItems.length), 1)[0];
                let distractors = [];
                while (distractors.length < 2 && allItems.length > 0) { 
                    distractors.push(allItems.splice(Math.floor(Math.random() * allItems.length), 1)[0]); 
                }
                choices = shuffle([correctItem, ...distractors]);
            }
            
            renderChoices();
            if (autoplay) { playQuestionSound(); } 
            else { replaySoundBtn.classList.add('hint-pulse', 'bg-green-500'); setTimeout(() => { replaySoundBtn.classList.remove('hint-pulse', 'bg-green-500'); }, 2000); }
        }

        function checkAnswer(event, selectedItem) {
            if (isPlaying) return; 
            
            let isCorrect = false;
            
            if ([5, 7].includes(currentLevel)) {
                isCorrect = JSON.stringify(selectedItem) === JSON.stringify(correctItem);
            } else {
                isCorrect = JSON.stringify(selectedItem) === JSON.stringify(correctItem);
            }

            const button = event.currentTarget; const resultAudio = new Audio(isCorrect ? gameSounds.correct : gameSounds.wrong);
            resultAudio.play().catch(e => console.error("Result audio playback failed:", e));
            statusIconContainer.innerHTML = `<i class="fas ${isCorrect ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'} text-xl"></i>`;
            
            if (isCorrect) {
                score++; 
                scoreElement.textContent = score; 
                messageElement.textContent = 'Correct!'; 
                messageElement.className = 'text-lg text-green-500'; 
                button.classList.add('btn-correct'); 
                choicesContainer.querySelectorAll('button').forEach(btn => btn.disabled = true);
                
                shootEnergy(button, () => {
                    updateProgressAvatars();
                    
                    if (score === WIN_SCORE && wrongScore < 10) { 
                        // Celebrate only exactly at max score to prevent repeating loop on "Stay"
                        const blackout = byId('blackout-overlay');
                        blackout.classList.remove('hidden');
                        setTimeout(() => blackout.style.opacity = '0.85', 10);
                        
                        triggerFireworks(50);
                        
                        setTimeout(() => { 
                            blackout.style.opacity = '0';
                            setTimeout(() => blackout.classList.add('hidden'), 1000);
                            
                            if (levelData[currentLevel + 1]) { 
                                byId('modal-score-text').textContent = `You scored ${WIN_SCORE} points! Do you want to move to the next level?`;
                                showModal(); 
                            } else { 
                                if (score >= WIN_SCORE) leaveSatelliteInOrbit();
                                score = 0; wrongScore = 0; scoreElement.textContent = 0; wrongScoreElement.textContent = 0;
                                newGame(); 
                            } 
                        }, 10000); // 10s of fireworks
                    } else { 
                        setTimeout(() => newGame(), 800);
                    }
                });
            } else {
                wrongScore++; 
                wrongScoreElement.textContent = wrongScore;
                button.classList.add('btn-incorrect'); 
                button.disabled = true; 
                
                shootLetters(button, () => {
                    const airplane = byId('airplane');
                    airplane.classList.add('airplane-dive');
                    
                    setTimeout(() => {
                        airplane.classList.remove('airplane-dive');
                        updateProgressAvatars();

                        if (score < WIN_SCORE && wrongScore >= 10) {
                            choicesContainer.querySelectorAll('button').forEach(btn => btn.disabled = true);
                            messageElement.textContent = `Too many errors!`; 
                            messageElement.className = 'text-lg text-red-600 font-bold';
                            
                            startEmojiRain(); 
                            
                            setTimeout(() => {
                                if (remediationMap[currentLevel]) {
                                    startRemediation(currentLevel, remediationMap[currentLevel]);
                                } else {
                                    messageElement.textContent = `Game Over! Restarting...`; 
                                    setTimeout(() => { 
                                        resetScores(); 
                                        newGame(); 
                                    }, 2000);
                                }
                            }, 5000); 
                        } else { 
                            messageElement.textContent = `Incorrect, try again.`; 
                            messageElement.className = 'text-lg text-red-500'; 
                        }
                    }, 300); 
                });
            }
        }
        
        function changeButtonColors() { rootEl.querySelectorAll('#choices-container .btn-game').forEach(btn => { btn.style.background = gradients[Math.floor(Math.random() * gradients.length)]; btn.style.color = '#fff'; }); }

        function renderChoices() {
            choicesContainer.innerHTML = '';
            
            if ([5, 7].includes(currentLevel)) {
                choicesContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl";
            } else {
                choicesContainer.className = "grid grid-cols-1 md:grid-cols-3 gap-4 w-full";
            }

            choices.forEach(item => {
                const choiceWrapper = document.createElement('div');
                choiceWrapper.className = 'choice-wrapper';
        
                let translation = null;
                if (currentLevel === 3 && levelThreeWords[item]) translation = levelThreeWords[item];
                else if (currentLevel === 6 && levelSixWords[item]) translation = levelSixWords[item];
                else if (currentLevel === 8 && levelEightWords[item]) translation = levelEightWords[item];

                if (translation) {
                    const translationSpan = document.createElement('span');
                    translationSpan.className = 'english-translation';
                    translationSpan.textContent = translation;
                    choiceWrapper.appendChild(translationSpan);
                }
        
                const button = document.createElement('button');
                button.className = 'btn-game p-6 md:p-8 flex items-center justify-center';
        
                const spanContainer = document.createElement('div');
                spanContainer.className = 'flex flex-row flex-wrap justify-center items-center gap-2'; 
        
                if (Array.isArray(item)) {
                    item.forEach(charObj => {
                        const span = document.createElement('span');
                        span.className = 'text-character';
                        span.textContent = (typeof charObj === 'object') ? charObj.text : charObj;
                        spanContainer.appendChild(span);
                    });
                } else {
                    const span = document.createElement('span');
                    span.className = 'text-character';
                    span.textContent = item;
                    spanContainer.appendChild(span);
                }
        
                button.appendChild(spanContainer);
                button.onclick = (event) => checkAnswer(event, item);
                choiceWrapper.appendChild(button);
                choicesContainer.appendChild(choiceWrapper);
            });
            changeButtonColors();
        }

        async function playSingleSound(syllable) {
            let startTime;
            let player = audioPlayer;

            if (currentLearningLevel === 5 || currentLearningLevel === 6) {
                 startTime = getSoundStartTimeLevel5(syllable);
                 player = audioPlayerLevel5;
            } else {
                 startTime = getSoundStartTime(syllable);
            }

            if (startTime !== undefined) {
                player.currentTime = startTime;
                const playPromise = player.play();
                 if (playPromise !== undefined) {
                    playPromise.catch(e => {});
                 }
                setTimeout(() => {
                    player.pause();
                }, 1000);
            }
        }

        async function playVowelSeries(rows) {
            if (isPlayingSeries) return;
            isPlayingSeries = true;
            const backBtn = byId('back-to-learn-choice-btn');
            if(backBtn) backBtn.disabled = true;

            let flatSeries = rows.flat();
            let player = audioPlayer;
            if (currentLearningLevel === 5 || currentLearningLevel === 6) player = audioPlayerLevel5;

            for (let i = 0; i < flatSeries.length; i++) {
                if (!isPlayingSeries) break; 
                const item = flatSeries[i];
                const syllableSound = item.sound;
                
                const allChars = rootEl.querySelectorAll('.learn-char');
                const el = allChars[i]; 
                
                if (el) {
                    el.classList.add('playing-sound');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                let startTime;
                if (currentLearningLevel === 5 || currentLearningLevel === 6) {
                    startTime = getSoundStartTimeLevel5(syllableSound);
                } else {
                    startTime = getSoundStartTime(syllableSound);
                }

                if (startTime !== undefined) {
                    await new Promise(resolve => {
                        player.currentTime = startTime;
                        const playPromise = player.play();
                        if (playPromise !== undefined) {
                           playPromise.catch(e => { resolve(); });
                        }
                        setTimeout(() => {
                           if (!player.paused) { player.pause(); }
                           resolve();
                        }, 1000);
                    });
                } else {
                     await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                if (el) el.classList.remove('playing-sound');
                if (i < flatSeries.length - 1) await new Promise(resolve => setTimeout(resolve, 100)); 
            }
            isPlayingSeries = false;
            if(backBtn) backBtn.disabled = false;

            if (remediationState.active && remediationState.phase === 'listening') {
                remediationState.listenCount++;
                if (remediationState.listenCount < 3) {
                    setTimeout(() => {
                        displayConsonantChoices(remediationState.learnLevel);
                    }, 500);
                } else {
                    setTimeout(() => {
                        finishRemediation();
                    }, 500);
                }
            }
        }

        function handleConsonantSelection(consonant) {
            if (remediationState.active) {
                const buttons = rootEl.querySelectorAll('#learning-display button');
                buttons.forEach(btn => btn.classList.remove('remediation-target'));
                remediationState.phase = 'listening'; 
            }

            const rows = getVowelSeriesFor(consonant, currentLearningLevel);
            learningDisplay.innerHTML = '';
            
            const stickyHeader = document.createElement('div');
            stickyHeader.className = 'sticky-header';
            
            const backButton = document.createElement('button');
            backButton.textContent = '◀ Back';
            backButton.id = 'back-to-learn-choice-btn';
            backButton.className = 'level-button ml-4';
            backButton.onclick = () => { isPlayingSeries = false; clearTimeout(soundTimeout); audioPlayer.pause(); audioPlayerLevel5.pause(); displayConsonantChoices(currentLearningLevel); };
            
            stickyHeader.appendChild(backButton);
            learningDisplay.appendChild(stickyHeader);

            const stackContainer = document.createElement('div');
            stackContainer.className = 'learn-container-stack';

            rows.forEach((rowItems, rIndex) => {
                const rowEl = document.createElement('div');
                let gridClass = 'learn-row';
                if (rowItems.length === 1) gridClass = 'learn-row learn-row-1';
                else if (rowItems.length === 2) gridClass = 'learn-row learn-row-2';
                else if (rowItems.length === 4) gridClass = 'learn-row learn-row-4';
                
                rowEl.className = gridClass;
                
                rowItems.forEach((item, cIndex) => {
                    const charEl = document.createElement('div');
                    charEl.id = `learn-syllable-${rIndex}-${cIndex}`; 
                    charEl.className = 'learn-char p-2';
                    charEl.textContent = item.text;
                    charEl.onclick = () => playSingleSound(item.sound); 
                    rowEl.appendChild(charEl);
                });
                stackContainer.appendChild(rowEl);
            });
            
            learningDisplay.appendChild(stackContainer);
            playVowelSeries(rows);
        }
        
        function displayConsonantChoices(level) {
            currentLearningLevel = level;
            
            if (remediationState.active && remediationState.phase === 'select-level') {
                 if (level === remediationState.learnLevel) {
                     rootEl.querySelectorAll('#learning-mode-container .level-button').forEach(b => b.classList.remove('remediation-target'));
                     remediationState.phase = 'select-consonant';
                 }
            }

            let source;
            if (level === 1 || level === 2) {
                source = learningConsonantsLevel1;
            } else if (level === 5 || level === 6) {
                source = level5Consonants;
            } else {
                source = learningConsonantsLevel2;
            }
            
            const shuffled = shuffle([...source]);
            const choices = shuffled.slice(0, 5); 
            
            learningDisplay.innerHTML = '';
            
            const headerContainer = document.createElement('div');
            headerContainer.className = "w-full text-center mb-6 mt-4";
            
            const instruction = document.createElement('h3');
            instruction.className = 'text-xl font-semibold text-gray-700';
            if (remediationState.active) {
                instruction.textContent = `Practice ${3 - remediationState.listenCount} more time(s)! Choose a consonant.`;
                instruction.className = 'text-xl font-bold text-red-600 animate-pulse';
            } else {
                instruction.textContent = 'Choose a consonant';
            }
            headerContainer.appendChild(instruction);
            learningDisplay.appendChild(headerContainer);
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex flex-wrap justify-center gap-4 w-full pb-8'; 
            choices.forEach((consonant, index) => {
                const button = document.createElement('button');
                button.className = 'font-bold rounded-xl shadow-lg transition-transform transform text-4xl p-6 hover:scale-105 active:scale-95';
                button.textContent = consonant;
                button.style.backgroundImage = gradients[Math.floor(Math.random() * gradients.length)];
                button.style.color = 'white';
                button.style.border = 'none';
                button.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';

                if (remediationState.active && index === 2) { 
                    button.classList.add('remediation-target');
                } else if (remediationState.active && choices.length < 3 && index === 0) {
                     button.classList.add('remediation-target');
                }

                button.onclick = () => {
                    button.classList.add('selected-consonant');
                    setTimeout(() => {
                       handleConsonantSelection(consonant);
                    }, 800); 
                };
                buttonContainer.appendChild(button);
            });
            learningDisplay.appendChild(buttonContainer);
        }


        // --- EVENT LISTENERS ---

        (() => {
            levelButtons.forEach(button => { button.addEventListener('click', () => { 
                if (remediationState.active && remediationState.phase !== 'completed') return;

                levelButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); 
                currentLevel = parseInt(button.id.match(/\d+/)[0]); 
                if (isGameRunning) { 
                    if (score >= WIN_SCORE) leaveSatelliteInOrbit();
                    score = 0; wrongScore = 0; scoreElement.textContent = 0; wrongScoreElement.textContent = 0; newGame(); 
                } 
            }); });
            
            toggleGameBtn.addEventListener('click', () => {
                isGameRunning = !isGameRunning;
                if (isGameRunning) {
                    toggleGameBtn.textContent = 'Stop Game'; toggleGameBtn.className = 'btn-stop px-8 py-4 text-xl md:text-2xl font-bold';
                    replaySoundBtn.disabled = false; levelButtons.forEach(btn => btn.disabled = true);
                    if (score >= WIN_SCORE) leaveSatelliteInOrbit();
                    score = 0; wrongScore = 0; scoreElement.textContent = 0; wrongScoreElement.textContent = 0; newGame();
                } else {
                    toggleGameBtn.textContent = 'Start Game'; toggleGameBtn.className = 'btn-start px-8 py-4 text-xl md:text-2xl font-bold';
                    replaySoundBtn.disabled = true; choicesContainer.innerHTML = ''; levelButtons.forEach(btn => btn.disabled = false);
                }
            });

            replaySoundBtn.addEventListener('click', () => { 
                if (isGameRunning && !isPlaying) { replaySoundBtn.classList.remove('hint-pulse', 'bg-green-500'); playQuestionSound(); }
            });

            function setupLearnBtn(btnId, level) {
                const btn = byId(btnId);
                if(btn) {
                    btn.addEventListener('click', () => {
                         rootEl.querySelectorAll('#learning-mode-container .level-button').forEach(b => b.classList.remove('active'));
                         btn.classList.add('active');
                         displayConsonantChoices(level);
                    });
                }
            }
            setupLearnBtn('learn-level-1-btn', 1);
            setupLearnBtn('learn-level-2-btn', 2);
            setupLearnBtn('learn-level-3-btn', 3);
            setupLearnBtn('learn-level-4-btn', 4);
            setupLearnBtn('learn-level-5-btn', 5);
            setupLearnBtn('learn-level-6-btn', 6);

            if(modalStayBtn) {
                modalStayBtn.addEventListener('click', () => {
                    hideModal();
                    if (score >= WIN_SCORE) leaveSatelliteInOrbit();
                    score = 0;
                    wrongScore = 0;
                    scoreElement.textContent = 0;
                    wrongScoreElement.textContent = 0;
                    newGame();
                });
            }

            if(modalNextBtn) {
                modalNextBtn.addEventListener('click', () => {
                    hideModal();
                    if (score >= WIN_SCORE) leaveSatelliteInOrbit();
                    if (levelData[currentLevel + 1]) {
                        const currentBtn = byId(`level-${currentLevel}-btn`);
                        const nextBtn = byId(`level-${currentLevel + 1}-btn`);
                        if (currentBtn) currentBtn.classList.remove('active');
                        if (nextBtn) nextBtn.classList.add('active');
                        
                        currentLevel++;
                        score = 0;
                        wrongScore = 0;
                        scoreElement.textContent = 0;
                        wrongScoreElement.textContent = 0;
                        newGame();
                    }
                });
            }
        })();
        
        function showModal() {
             if(modal) modal.classList.remove('hidden');
        }

        function hideModal() {
             if(modal) modal.classList.add('hidden');
        }

        // --- Fireworks ---
        const fireworksCanvas = byId('fireworks-canvas');
        const ctx = fireworksCanvas.getContext('2d');
        let fireworks = [], particles = [], animationFrameId;
        function resizeCanvas() { fireworksCanvas.width = window.innerWidth; fireworksCanvas.height = window.innerHeight; }
        window.addEventListener('resize', resizeCanvas); resizeCanvas();
        function hueToRgb(h) {
            let r, g, b; const i = Math.floor(h * 6); const f = h * 6 - i; const q = 1 * (1 - f); const t = 1 * (1 - (1 - f));
            switch (i % 6) { case 0: r = 1, g = t, b = 0; break; case 1: r = q, g = 1, b = 0; break; case 2: r = 0, g = 1, b = t; break; case 3: r = 0, g = q, b = 1; break; case 4: r = t, g = 0, b = 1; break; case 5: r = 1, g = 0, b = q; break; }
            return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
        }
        function createParticles(x, y, hue) {
            const count = 100; for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 5 + 1; particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, hue: hue, brightness: Math.random() * 50 + 50, alpha: 1, decay: Math.random() * 0.015 + 0.015 }); }
        }
        function launchFirework() {
            const x = Math.random() * fireworksCanvas.width; const y = fireworksCanvas.height; const targetY = Math.random() * (fireworksCanvas.height / 2); const hue = Math.random();
            fireworks.push({ x: x, y: y, sx: x, sy: y, tx: x, ty: targetY, hue: hue });
        }
        function animateFireworks() {
            animationFrameId = requestAnimationFrame(animateFireworks); ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
            let i = fireworks.length; while (i--) {
                const fw = fireworks[i]; const speed = 5; const angle = Math.atan2(fw.ty - fw.y, fw.tx - fw.x); const distance = Math.sqrt(Math.pow(fw.tx - fw.x, 2) + Math.pow(fw.ty - fw.y, 2));
                if (distance < speed) { createParticles(fw.tx, fw.ty, fw.hue); fireworks.splice(i, 1); } else { fw.x += Math.cos(angle) * speed; fw.y += Math.sin(angle) * speed; ctx.beginPath(); ctx.moveTo(fw.x, fw.y); ctx.lineTo(fw.x - Math.cos(angle) * 3, fw.y - Math.sin(angle) * 3); ctx.strokeStyle = hueToRgb(fw.hue); ctx.lineWidth = 3; ctx.stroke(); }
            }
            let j = particles.length; while (j--) {
                const p = particles[j]; p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= p.decay;
                if (p.alpha <= p.decay) { particles.splice(j, 1); } else { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2, false); ctx.fillStyle = `hsla(${p.hue * 360}, 100%, ${p.brightness}%, ${p.alpha})`; ctx.fill(); }
            }
            if (fireworks.length === 0 && particles.length === 0) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        }
        function triggerFireworks(bursts = 5) {
            launchFirework(); // Start immediately to prevent animation loop closing
            let i = bursts - 1; 
            const interval = setInterval(() => { 
                if (i > 0) {
                    launchFirework(); 
                    i--; 
                } else {
                    clearInterval(interval); 
                }
            }, 200);
            if (!animationFrameId) { animateFireworks(); }
        }

    return () => {};
  }, []);

  return (
    <>
      <style>{SP_APP_CSS}</style>
      <div
        ref={containerRef}
        className="sp-app-root"
        dangerouslySetInnerHTML={{ __html: SP_APP_BODY_HTML }}
      />
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-16 right-4 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🔊 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
