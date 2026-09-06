import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Myanmar Number Learning" HTML app ──
// Same hybrid approach as ConsonantPracticeApp/BurmeseConsonantGameApp: the
// original vanilla JS (DOM manipulation, onclick= handlers in the markup,
// Web Audio playback) is kept almost unchanged inside a React wrapper
// instead of being rewritten as JSX/state.
//
// document.getElementById/querySelectorAll calls were changed to a rootEl-
// scoped `byId` helper / rootEl.querySelectorAll so this app only ever
// reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. Inline onclick="..."
// attributes resolve via the global scope, so the functions they call are
// exposed under window.__mnlApp (namespaced, not bare globals) — see the
// note above that assignment for the full explanation.
//
// The original page's own Firebase init (anonymous auth only, no actual
// data use) was dropped — this app has no data persistence of its own, and
// the shared Firebase instance from ./firebase.js is reused for the added
// online-roster feature below. The original CSS also had a bare `body {...}`
// rule (font/background for the whole page) — rescoped to .mnl-app-root so
// it doesn't leak onto the rest of the SPA, since every app stays mounted
// simultaneously (just hidden via CSS) per App.jsx's design.

const MNL_ROSTER_PATH = 'artifacts/myanmar-number-learning-app/public/data/roster';
const sanitizeMnlKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const MNL_APP_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700;800&family=Inter:wght@400;600;800;900&display=swap');
        
        .mnl-app-root {
            font-family: 'Padauk', sans-serif;
            background-color: #f3f4f6;
            transition: background-color 0.3s;
            margin: 0;
            padding: 0;
        }

        /* --- App 1 Styles --- */
        #app1 {
             font-family: 'Inter', 'Padauk', sans-serif;
             background-color: #fce4ec;
        }
        .highlight-text {
            color: #ffffff;
            background-color: #d81b60;
            border-radius: 0.5rem;
            padding: 0.1rem 0.4rem;
            display: inline-block;
            transition: all 0.2s ease-in-out;
            font-weight: 700;
            box-shadow: 0 4px 8px rgba(216, 27, 96, 0.4);
        }
        .place-value-button {
            background-color: #ffffff;
            color: #4a148c;
            border: 2px solid #ce93d8;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-size: 0.9rem;
            padding: 0.5rem 0.9rem;
        }
        .place-value-button.active {
            background-color: #ffb300;
            color: #4a148c;
            font-weight: 700;
            border-color: #ff8f00;
            transform: scale(1.03);
            box-shadow: 0 8px 12px rgba(255, 179, 0, 0.6);
        }
        .number-card, .game-option-button {
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            background-color: #ffffff;
            border: 3px solid #b3e5fc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 0.5rem;
            min-height: 8rem;
        }
        .number-card.highlight-card {
            background-color: #a5b4fc;
            transform: scale(1.05);
            box-shadow: 0 10px 20px -5px rgba(165, 180, 252, 0.7);
        }
        .game-option-button.correct-highlight {
            background-color: #4f46e5;
            border-color: #3730a3;
            color: #ffffff;
            transform: scale(1.05);
            box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.7);
        }
        .burmese-digit {
            font-family: 'Padauk', sans-serif;
            font-size: 3rem;
            font-weight: 800;
            color: #312E81;
            word-break: break-word;
        }
        .text-white-override {
            color: #ffffff !important;
        }
        .burmese-text {
            font-family: 'Padauk', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: #3f51b5;
        }
        #gameGrid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
            gap: 1.5rem;
        }
        .game-option-button {
            border: 4px solid #6b21a8; 
            transition: all 0.2s ease-in-out;
        }

        /* --- App 2 Styles --- */
        #app2 {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between; 
            position: relative;
            overflow: hidden;
        }
        .main-content-wrapper {
            flex-grow: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            width: 100%; padding: 1rem 0; position: relative;
        }
        .grid-container {
            width: 100%; max-width: 1000px; max-height: 85vh;
            overflow-y: auto; transition: all 0.3s ease-in-out;
            padding: 1rem; background-color: white;
            border-radius: 1rem; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }
        .grid-container.quiz-active { max-height: calc(85vh - 220px); }
        .grid-cell {
            padding: 0.75rem; display: flex; align-items: center; justify-content: center;
            font-size: 1.8rem; font-weight: 700; color: #1f2937;
            cursor: pointer; transition: all 0.1s;
        }
        .grid-cell:hover:not(.highlight) { background-color: #bfdbfe !important; transform: scale(1.05); }
        .highlight {
            background-color: #fbbf24 !important; color: #854d0e !important; transform: scale(1.1);
            border: 3px solid #f59e0b; box-shadow: 0 4px 10px rgba(251, 191, 36, 0.5);
            transition: background-color 0.2s, transform 0.2s;
        }
        .text-3d {
            font-size: 15vw; line-height: 1; font-weight: 900; color: #ef4444;
            text-shadow: 4px 4px 0 #fca5a5, 8px 8px 0 #fca5a5, 12px 12px 0 #dc2626, 16px 16px 20px rgba(0, 0, 0, 0.4);
            transition: all 0.2s ease-out; text-align: center;
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%); pointer-events: none; z-index: 10;
        }
        #multilingual-display {
            width: 100%; max-width: 1000px; background-color: #ffffff; padding: 0.5rem 1rem; 
            box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.05); --pali-font: 'Times New Roman', Times, serif;
        }
        .num-display-item { padding: 0.25rem; flex: 1; text-align: center; }
        .num-value { font-size: 0.9rem; font-weight: 600; }
        #pali-text.num-value { font-family: var(--pali-font); }
        .quiz-btn {
            font-size: 2rem; padding: 1rem 1.5rem; margin: 0.25rem; border-radius: 0.75rem;
            transition: all 0.2s; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            width: auto; min-width: 120px; font-weight: 700;
        }
        .quiz-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); }
        .quiz-btn:disabled { cursor: not-allowed; opacity: 0.7; }
        #confetti-canvas {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 1000;
        }
        #playback-mode-btn {
            width: 50px; height: 50px; font-size: 0.9rem; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
        }

        /* --- App Toggle Button Styles --- */
        #app-toggle-button {
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 2000; /* Ensure it's on top of everything */
            background-color: #8e24aa;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease-in-out, background-color 0.2s;
        }
        #app-toggle-button:hover {
            transform: scale(1.1);
            background-color: #ab47bc;
        }
        .hidden {
            display: none;
        }

        /* --- Turtle Track Styles --- */
        .turtle-track-container {
            width: 100%;
            height: 48px;
            background: #e8f5e9;
            border-radius: 24px;
            position: relative;
            margin: 10px 0;
            border: 3px solid #81c784;
            box-shadow: inset 0 3px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .turtle {
            position: absolute;
            top: 50%;
            transform: translateY(-50%) scaleX(-1); /* Face right */
            font-size: 28px;
            transition: left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s ease;
            left: 0;
            z-index: 10;
        }
        .turtle.moving-back {
            transform: translateY(-50%) scaleX(1); /* Face left when moving back */
        }
        .finish-line {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 28px;
        }
`;

const MNL_APP_BODY_HTML = `
    
    <button id="app-toggle-button" title="App ပြောင်းရန်">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,117.66l-56-56a8,8,0,0,0-11.32,11.32L193.67,104H144a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V120h41.67l-31.33,31.34a8,8,0,0,0,11.32,11.32l56-56A8,8,0,0,0,229.66,117.66ZM112,96H70.33l31.34-31.34a8,8,0,0,0-11.32-11.32l-56,56a8,8,0,0,0,0,11.32l56,56a8,8,0,0,0,11.32-11.32L70.33,160H112a8,8,0,0,0,8-8V104A8,8,0,0,0,112,96Z"></path></svg>
    </button>
    
    <!-- App 1: Place Values -->
    <div id="app1">
        <div class="p-2 md:p-4 min-h-screen">
            <div class="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl p-4 md:p-6 border-4 border-rose-500">
                <audio id="audioPlayer" class="hidden" preload="auto">
                    <source src="https://raw.githubusercontent.com/nathantun93/bell/main/1_Kaday_1.mp3" type="audio/mp3">
                    Your browser does not support the audio element.
                </audio>

                <div id="navigation" class="flex flex-wrap justify-center gap-2 mb-4 p-2 bg-pink-100 rounded-lg shadow-inner"></div>
                <div id="contentDisplay" class="text-center min-h-[60px] mb-4 p-3 bg-yellow-50 rounded-lg shadow-md border border-yellow-300"></div>
                <div id="numberGrid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"></div>
                <div id="emojiDisplay" class="mt-4 min-h-[50px] p-4 bg-purple-50 rounded-lg shadow-inner flex flex-wrap justify-center items-center gap-2 text-4xl"></div>
            </div>
        </div>
    </div>

    <!-- App 2: 1-100 Grid -->
    <div id="app2" class="hidden">
        <canvas id="confetti-canvas"></canvas>

        <div id="app2-controls" class="fixed top-4 right-4 z-50 flex space-x-3">
            <button id="playback-mode-btn"
                    class="p-3 rounded-full bg-blue-500 text-white shadow-xl hover:bg-blue-600 transition duration-300"
                    title="ရေတွက်ပုံစံ ပြောင်းရန်">
                အားလုံး
            </button>
            <button id="toggle-audio-btn" 
                    class="p-3 rounded-full bg-yellow-500 text-white shadow-xl hover:bg-yellow-600 transition duration-300"
                    title="ဆက်တိုက်ရေတွက်ရန်/ရပ်ရန်">
                <svg id="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" style="display: block;"><path d="M240,128a15.8,15.8,0,0,1-7.8,13.5l-144,88A16,16,0,0,1,64,216V40a16,16,0,0,1,24.2-13.5l144,88A15.8,15.8,0,0,1,240,128Z"></path></svg>
                <svg id="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" style="display: none;"><path d="M112,48v160a16,16,0,0,1-32,0V48A16,16,0,0,1,112,48ZM176,48v160a16,16,0,0,1-32,0V48A16,16,0,0,1,176,48Z"></path></svg>
            </button>
            <button id="toggle-quiz-btn" 
                    class="p-3 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition duration-300"
                    title="ဂိမ်း စတင်ရန်/ပိတ်ရန်">
                <svg id="quiz-on-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" style="display: block;"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM128,216a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM128,72a12,12,0,1,1,12,12A12,12,0,0,1,128,72ZM128,124a12,12,0,0,1,12,12v36a12,12,0,0,1-24,0V136A12,12,0,0,1,128,124Z"></path></svg>
                <svg id="quiz-off-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" style="display: none;"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"></path></svg>
            </button>
        </div>
        
        <div class="main-content-wrapper">
            <div id="current-number-3d" class="text-3d opacity-0">၁</div>
            <div id="quiz-bar" class="hidden w-full max-w-[1000px] p-4 mb-4 bg-gray-100 rounded-xl shadow-lg border border-gray-200">
                <div class="flex flex-col mb-4 px-4">
                    <h3 class="text-xl font-semibold text-gray-800 text-center mb-2">Choice Correct Number</h3>
                    <div class="turtle-track-container w-full max-w-[600px] mx-auto">
                        <div class="turtle" id="app2-turtle" style="left: 0;">🐢</div>
                        <div class="finish-line">🏁</div>
                    </div>
                </div>
                <div id="answer-buttons" class="flex flex-wrap justify-center items-center gap-4"></div>
                <div class="mt-4 text-center h-16 flex flex-col justify-center items-center">
                    <div id="game-feedback" class="text-3xl font-bold transition-opacity duration-300"></div>
                    <button id="next-question-btn" 
                            class="mt-2 px-6 py-2 bg-blue-500 text-white font-bold rounded-full text-lg shadow-md hover:bg-blue-600 transition hidden">
                        နောက်တစ်ပုဒ်
                    </button>
                </div>
            </div>
            <div id="counting-view" class="grid grid-cols-10 gap-2 grid-container"></div>
        </div>

        <div id="multilingual-display" class="shadow-lg border-t border-gray-200">
            <div class="flex flex-wrap justify-around items-center text-gray-800">
                <div class="num-display-item"><p id="myanmar-text" class="num-value text-red-700 border-b-2 border-red-200">တစ်</p></div>
                <div class="num-display-item"><p id="roman-text" class="num-value text-blue-700 border-b-2 border-blue-200">I</p></div>
                <div class="num-display-item"><p id="pali-text" class="num-value text-green-700 border-b-2 border-green-200"></p></div>
                <div class="num-display-item"><p id="english-text" class="num-value text-purple-700 border-b-2 border-purple-200">one</p></div>
            </div>
        </div>

        <audio id="counting-audio" preload="auto">
            <source src="https://raw.githubusercontent.com/nathantun93/bell/main/၁၀၀.mp3" type="audio/mpeg">
        </audio>
    </div>

`;

export default function MyanmarNumberLearningApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, MNL_ROSTER_PATH, sanitizeMnlKey(studentName));
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
    const unsub = onSnapshot(collection(db, MNL_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Number Learning roster listen error:', e));
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
    // Dev-mode double-invoke / re-mount guard — this whole script wires up
    // onclick handlers and DOM state; it's meant to run exactly once per
    // mount, not be torn down and redone.
    if (initializedRef.current) return;
    initializedRef.current = true;
    const rootEl = containerRef.current;
    const byId = (id) => rootEl.querySelector('#' + id);

        // --- App Toggling Logic ---
        const app1Container = byId('app1');
        const app2Container = byId('app2');
        const appToggleButton = byId('app-toggle-button');
        const app2Controls = byId('app2-controls'); // Get App 2 controls wrapper

        const app1AudioPlayer = byId('audioPlayer');
        const app2AudioPlayer = byId('counting-audio');

        appToggleButton.addEventListener('click', () => {
            const isApp1Visible = !app1Container.classList.contains('hidden');
            if (isApp1Visible) {
                // Switch to App 2
                app1Container.classList.add('hidden');
                app2Container.classList.remove('hidden');
                app1AudioPlayer.pause(); // Pause App 1's audio
                app2Controls.classList.remove('hidden'); // Show App 2 controls
            } else {
                // Switch to App 1
                app1Container.classList.remove('hidden');
                app2Container.classList.add('hidden');
                app2AudioPlayer.pause(); // Pause App 2's audio
                app2Controls.classList.add('hidden'); // Hide App 2 controls
            }
        });

        // --- App 1 (Place Values) Logic ---
        const audioPlayer = byId('audioPlayer');
        const navigation = byId('navigation');
        const contentDisplay = byId('contentDisplay');
        const numberGrid = byId('numberGrid');
        const emojiDisplay = byId('emojiDisplay'); // Get emoji display
        let currentSection = 'intro';
        let highlightInterval = null;
        let isGameMode = false;
        let currentQuestion = null; 
        let audioSegmentMap = {};
        
        // --- NEW VARIABLES FOR APP 1 GAME LOGIC ---
        let app1Stats = { correct: 0, wrong: 0 };
        let autoStartQuiz = false;
        const gameLevels = ['units', 'tens', 'hundreds', 'thousands'];
        const finalLevels = ['tenThousands', 'hundredThousands', 'millions', 'crore'];
        let finalSequenceIndex = 0;
        let isFinalSequencePlaying = false;
        // ------------------------------------------

        const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
        const emojiList = ['🍎', '🍌', '🍓', '🚗', '🚀', '⭐', '❤️', '⚽', '🔑', '🐶', '🐱', '🐘', '🦋', '🐞', '🐢', '🐠'];

        function convertToBurmeseDigits(number) {
            const formattedNumber = new Intl.NumberFormat('en-US').format(number).toString();
            let burmeseString = '';
            for (let i = 0; i < formattedNumber.length; i++) {
                const char = formattedNumber[i];
                const digit = parseInt(char);
                if (!isNaN(digit)) {
                    burmeseString += burmeseDigits[digit];
                } else {
                    burmeseString += char;
                }
            }
            return burmeseString;
        }

        function generateEmojiString(count, emojiIndex) {
            if (count <= 0) return '';
            const emoji = emojiList[emojiIndex % emojiList.length]; // Get one emoji type
            let emojis = '';
            let currentLine = '';
            for (let i = 1; i <= count; i++) {
                currentLine += emoji;
                if (i % 5 === 0 || i === count) { // ၅ ခု ပြည့်တိုင်း (သို့) အဆုံးရောက်တိုင်း
                    emojis += `<div class="w-full flex justify-center whitespace-nowrap">${currentLine}</div>`;
                    currentLine = '';
                }
            }
            return emojis; // Return divs of emojis
        }

        const countingData = {
            intro: { label: 'Introduction', start: 0.00, end: 17.99, type: 'intro', details: [ { text: "Hello kids! This time, let's learn to count numbers from:", time: 0.00, key: null }, { text: "Units (ခု)", time: 7.00, key: "units" }, { text: "Tens (ဆယ်)", time: 8.00, key: "tens" }, { text: "Hundreds (ရာ)", time: 9.00, key: "hundreds" }, { text: "Thousands (ထောင်)", time: 11.00, key: "thousands" }, { text: "Ten Thousands (သောင်း)", time: 12.00, key: "tenThousands" }, { text: "Lakh (သိန်း)", time: 13.00, key: "hundredThousands" }, { text: "Millions (သန်း)", time: 14.00, key: "millions" }, { text: "Crore (ကုဋေ)", time: 15.00, key: "crore" }, { text: "Let's start counting!", time: 16.00, key: null } ] },
            units: { label: 'ခု', start: 18.00, end: 40.80, type: 'counting', details: [ { text: "Ready? Let's start with Units:", time: 18.00, key: null }, { text: "တစ်", digit: 1, time: 23.00 }, { text: "နှစ်", digit: 2, time: 25.00 }, { text: "သုံး", digit: 3, time: 27.00 }, { text: "လေး", digit: 4, time: 29.00 }, { text: "ငါး", digit: 5, time: 31.00 }, { text: "ခြောက်", digit: 6, time: 33.00 }, { text: "ခုနစ်", digit: 7, time: 35.00 }, { text: "ရှစ်", digit: 8, time: 37.00 }, { text: "ကိုး", digit: 9, time: 39.00 }, { text: "ဆယ်", digit: 10, time: 45.00 } ] },
            tens: { label: 'ဆယ်', start: 41.00, end: 71.99, type: 'counting', details: [ { text: "Let's continue counting the Tens place.", time: 41.00, key: null }, { text: "ဆယ်", digit: 10, time: 45.00 }, { text: "နှစ်ဆယ်", digit: 20, time: 48.00 }, { text: "သုံးဆယ်", digit: 30, time: 51.00 }, { text: "လေးဆယ်", digit: 40, time: 54.00 }, { text: "ငါးဆယ်", digit: 50, time: 57.00 }, { text: "ခြောက်ဆယ်", digit: 60, time: 60.00 }, { text: "ခုနစ်ဆယ်", digit: 70, time: 63.00 }, { text: "ရှစ်ဆယ်", digit: 80, time: 66.00 }, { text: "ကိုးဆယ်", digit: 90, time: 69.00 } ] },
            hundreds: { label: 'ရာ', start: 72.00, end: 101.99, type: 'counting', details: [ { text: "Now we've reached the Hundreds place!", time: 72.00, key: null }, { text: "တစ်ရာ", digit: 100, time: 75.00 }, { text: "နှစ်ရာ", digit: 200, time: 78.00 }, { text: "သုံးရာ", digit: 300, time: 81.00 }, { text: "လေးရာ", digit: 400, time: 84.00 }, { text: "ငါးရာ", digit: 500, time: 87.00 }, { text: "ခြောက်ရာ", digit: 600, time: 90.00 }, { text: "ခုနစ်ရာ", digit: 700, time: 93.00 }, { text: "ရှစ်ရာ", digit: 800, time: 96.00 }, { text: "ကိုးရာ", digit: 900, time: 99.00 } ] },
            thousands: { label: 'ထောင်', start: 102.00, end: 132.99, type: 'counting', details: [ { text: "Let's keep counting the Thousands.", time: 102.00, key: null }, { text: "တစ်ထောင်", digit: 1000, time: 105.00 }, { text: "နှစ်ထောင်", digit: 2000, time: 108.00 }, { text: "သုံးထောင်", digit: 3000, time: 111.00 }, { text: "လေးထောင်", digit: 4000, time: 114.00 }, { text: "ငါးထောင်", digit: 5000, time: 117.00 }, { text: "ခြောက်ထောင်", digit: 6000, time: 120.00 }, { text: "ခုနစ်ထောင်", digit: 7000, time: 123.00 }, { text: "ရှစ်ထောင်", digit: 8000, time: 126.00 }, { text: "ကိုးထောင်", digit: 9000, time: 129.00 } ] },
            tenThousands: { label: 'သောင်း', start: 133.00, end: 168.99, type: 'counting', details: [ { text: "Numbers are getting bigger now! Above Nine Thousand.", time: 133.00, key: null }, { text: "Let's move on to Ten Thousands:", time: 138.00, key: null }, { text: "တစ်သောင်း", digit: 10000, time: 141.00 }, { text: "နှစ်သောင်း", digit: 20000, time: 144.00 }, { text: "သုံးသောင်း", digit: 30000, time: 147.00 }, { text: "လေးသောင်း", digit: 40000, time: 150.00 }, { text: "ငါးသောင်း", digit: 50000, time: 153.00 }, { text: "ခြောက်သောင်း", digit: 60000, time: 156.00 }, { text: "ခုနစ်သောင်း", digit: 70000, time: 159.00 }, { text: "ရှစ်သောင်း", digit: 80000, time: 162.00 }, { text: "ကိုးသောင်း", digit: 90000, time: 165.00 } ] },
            hundredThousands: { label: 'သိန်း', start: 169.00, end: 206.99, type: 'counting', details: [ { text: "Ten Thousands finished, now it's Lakh (Hundred Thousands). Let's count!", time: 169.00, key: null }, { text: "တစ်သိန်း", digit: 100000, time: 179.00 }, { text: "နှစ်သိန်း", digit: 200000, time: 182.00 }, { text: "သုံးသိန်း", digit: 300000, time: 185.00 }, { text: "လေးသိန်း", digit: 400000, time: 188.00 }, { text: "ငါးသိန်း", digit: 500000, time: 191.00 }, { text: "ခြောက်သိန်း", digit: 600000, time: 194.00 }, { text: "ခုနစ်သိန်း", digit: 700000, time: 197.00 }, { text: "ရှစ်သိန်း", digit: 800000, time: 200.00 }, { text: "ကိုးသိန်း", digit: 900000, time: 203.00 } ] },
            millions: { label: 'သန်း', start: 207.00, end: 239.99, type: 'counting', details: [ { text: "Since Lakhs are finished, let's continue counting Millions.", time: 207.00, key: null }, { text: "တစ်သန်း", digit: 1000000, time: 214.00 }, { text: "နှစ်သန်း", digit: 2000000, time: 217.00 }, { text: "သုံးသန်း", digit: 3000000, time: 220.00 }, { text: "လေးသန်း", digit: 4000000, time: 223.00 }, { text: "ငါးသန်း", digit: 5000000, time: 226.00 }, { text: "ခြောက်သန်း", digit: 6000000, time: 229.00 }, { text: "ခုနစ်သန်း", digit: 7000000, time: 232.00 }, { text: "ရှစ်သန်း", digit: 8000000, time: 235.00 }, { text: "ကိုးသန်း", digit: 9000000, time: 238.00 } ] },
            crore: { label: 'ကုဋေ', start: 240.00, end: 286.00, type: 'counting', details: [ { text: "We've finished Units, Tens, Hundreds, Thousands, Lakh, and Millions. Now, let's count Crore (Ten Millions).", time: 240.00, key: null }, { text: "တစ်ကုဋေ", digit: 10000000, time: 249.00 }, { text: "နှစ်ကုဋေ", digit: 20000000, time: 252.00 }, { text: "သုံးကုဋေ", digit: 30000000, time: 255.00 }, { text: "လေးကုဋေ", digit: 40000000, time: 258.00 }, { text: "ငါးကုဋေ", digit: 50000000, time: 261.00 }, { text: "ခြောက်ကုဋေ", digit: 60000000, time: 264.00 }, { text: "ခုနစ်ကုဋေ", digit: 70000000, time: 267.00 }, { text: "ရှစ်ကုဋေ", digit: 80000000, time: 270.00 }, { text: "ကိုးကုဋေ", digit: 90000000, time: 273.00 }, { text: "ဆယ်ကုဋေ", digit: 100000000, time: 276.00 }, { text: "That's it for our counting lesson up to Crore!", time: 279.00, key: null }, { text: "Wishing all the children health and happiness!", time: 285.00, key: null } ] }
        };

        function stopHighlighting() {
            if (highlightInterval) { clearInterval(highlightInterval); highlightInterval = null; }
        }
        function preProcessAudioData() {
            const sections = ['units', 'tens', 'hundreds', 'thousands', 'tenThousands', 'hundredThousands', 'millions', 'crore'];
            sections.forEach(sectionKey => {
                const section = countingData[sectionKey];
                // Filter items that are *within* the section's time range
                const countingItems = section.details.filter(d => d.digit && d.time < section.end);

                // Manually add '10' (ဆယ်) from the 'tens' section, as its audio is there.
                if (sectionKey === 'tens') {
                    const tenItem = section.details.find(d => d.digit === 10);
                    const twentyItem = section.details.find(d => d.digit === 25);
                    if (tenItem && twentyItem) {
                         audioSegmentMap[10] = { time: tenItem.time, duration: twentyItem.time - tenItem.time };
                    }
                }
                
                countingItems.forEach((item, index, array) => {
                    const nextItem = array[index + 1];
                    const nextItemTime = nextItem ? nextItem.time : section.end;
                    
                    // Don't process '10' from 'units' (already handled from 'tens')
                    if (item.digit === 10 && sectionKey === 'units') return; 

                    audioSegmentMap[item.digit] = { time: item.time, duration: nextItemTime - item.time };
                });
            });
        }
        function getNumberComponents(number) {
            if (number <= 0) return [];
            let components = [], tempNumber = number, powerOf10 = 1;
            while (powerOf10 * 10 <= tempNumber) { powerOf10 *= 10; }
            while (powerOf10 >= 1) {
                let digit = Math.floor(tempNumber / powerOf10);
                if (digit > 0) { components.push(digit * powerOf10); }
                tempNumber %= powerOf10;
                powerOf10 /= 10;
            }
            return components;
        }
        function playMultiDigitAudio(components, cardId = null, index = 0) {
            if (index >= components.length) {
                if (cardId) { const card = byId(cardId); if(card) card.classList.remove('highlight-card', 'correct-highlight'); }
                return;
            }
            stopHighlighting(); audioPlayer.pause();
            const currentComponent = components[index];
            const segment = audioSegmentMap[currentComponent];
            if (!segment) { playMultiDigitAudio(components, cardId, index + 1); return; }
            const isLastComponent = index === components.length - 1;
            const playbackDurationMs = isLastComponent ? segment.duration * 1000 + 100 : 1000;
            if (cardId) {
                const card = byId(cardId);
                if (index === 0) { rootEl.querySelectorAll('.number-card, .game-option-button').forEach(c => c.classList.remove('highlight-card', 'correct-highlight')); }
                card.classList.add('highlight-card');
            }
            audioPlayer.currentTime = segment.time;
            audioPlayer.play().catch(e => console.error("Multi-digit audio playback error:", e));
            setTimeout(() => {
                audioPlayer.pause();
                playMultiDigitAudio(components, cardId, index + 1);
                if (cardId && isLastComponent) { const card = byId(cardId); if(card) card.classList.remove('highlight-card', 'correct-highlight'); }
            }, playbackDurationMs);
        }
        const playSingleItem = function (startTime, digit, cardId) {
            stopHighlighting(); audioPlayer.pause(); 
            const section = countingData[currentSection];
            const details = section.details.filter(d => d.digit);
            const currentItemIndex = details.findIndex(d => d.digit === digit);
            if (currentItemIndex === -1) {
                 // Special case for '10' (ဆယ်) clicked from 'units' section
                if (digit === 10) {
                    const segment = audioSegmentMap[10]; // Get from pre-processed map
                    if (segment) {
                        startTime = segment.time;
                    } else {
                        return; // Can't play if not found
                    }
                } else {
                    return; // Not found and not '10'
                }
            }
            
            let stopTime;
            if (digit === 10) {
                 const segment = audioSegmentMap[10];
                 stopTime = startTime + segment.duration;
            } else if (currentSection === 'units' && digit === 9) { // <<< THIS IS THE FIX
                stopTime = section.end; // Use the section's end time (40.80)
            } else {
                const nextItem = details[currentItemIndex + 1];
                stopTime = nextItem ? nextItem.time : section.end;
            }


            if (currentSection === 'units') {
                // Pick a random emoji index each time a card is clicked
                const randomEmojiIndex = Math.floor(Math.random() * emojiList.length);
                emojiDisplay.innerHTML = generateEmojiString(digit, randomEmojiIndex);
            } else {
                emojiDisplay.innerHTML = ''; // Clear for other sections
            }

            if (cardId) {
                const card = byId(cardId);
                rootEl.querySelectorAll('.number-card').forEach(c => c.classList.remove('highlight-card')); 
                card.classList.add('highlight-card');
            }
            audioPlayer.currentTime = startTime;
            audioPlayer.play().catch(e => console.error("Single audio playback error:", e));
            const durationMs = (stopTime - startTime) * 1000;
            setTimeout(() => {
                if (audioPlayer.currentTime < stopTime + 0.1) { audioPlayer.pause(); }
                if (cardId) { const card = byId(cardId); if(card) card.classList.remove('highlight-card'); }
            }, durationMs + 100); 
        }
        
        // --- NEW: Play Final Sequence Logic ---
        function playEndingSequence() {
            if (finalSequenceIndex >= finalLevels.length) {
                isFinalSequencePlaying = false;
                contentDisplay.innerHTML = `<div class="p-4 bg-green-100 rounded-lg"><h2 class="text-2xl font-bold text-green-700">Congratulations!</h2><p class="text-lg text-gray-700">You have completed all counting lessons up to Crore!</p></div>`;
                return;
            }
            const level = finalLevels[finalSequenceIndex];
            isFinalSequencePlaying = true;
            playSection(level);
        }
        // ----------------------------------------

        const playSection = function (sectionId) {
            stopHighlighting();
            const section = countingData[sectionId];
            if (!section) return;
            currentSection = sectionId;
            rootEl.querySelectorAll('.place-value-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.section === sectionId);
            });
            numberGrid.innerHTML = '';

            if (sectionId === 'units') {
                emojiDisplay.innerHTML = ''; // Clear on section start
            } else {
                emojiDisplay.innerHTML = ''; // Clear for other sections
            }

            // --- CHANGED: Only render game if not just listening/learning ---
            // If autoStartQuiz is true, we want to play audio THEN show quiz.
            // But visually we show the counting content first.
            
            if (section.type === 'intro') {
                renderIntroContent(section);
            } else {
                renderCountingContent(section); // Always show counting first when audio plays
            }
            
            audioPlayer.currentTime = section.start;
            audioPlayer.play().catch(e => console.error("Audio playback error:", e)); 
            
            highlightInterval = setInterval(() => {
                const currentTime = audioPlayer.currentTime;
                const section = countingData[currentSection];
                
                // --- NEW: Handle Audio End for Game Logic ---
                if (currentTime >= section.end || audioPlayer.paused) {
                    if (currentTime >= section.end) { 
                        audioPlayer.pause();
                        stopHighlighting();

                        // --- Logic to transition to quiz or next sequence ---
                        if (autoStartQuiz && gameLevels.includes(currentSection)) {
                            autoStartQuiz = false;
                            isGameMode = true; // ensure game mode is on
                            renderGameContent(currentSection);
                            const toggleBtn = byId('gameToggle');
                            if(toggleBtn) {
                                toggleBtn.textContent = 'Quiz Mode (ON)';
                                toggleBtn.classList.remove('bg-teal-500', 'hover:bg-teal-600');
                                toggleBtn.classList.add('bg-pink-600', 'hover:bg-pink-700');
                            }
                        } else if (isFinalSequencePlaying) {
                            finalSequenceIndex++;
                            setTimeout(playEndingSequence, 1000); // Wait 1s then play next
                        }
                    } else if (audioPlayer.paused) {
                        stopHighlighting(); 
                    }
                    return;
                }
                // --------------------------------------------

                let currentlyHighlightedDigit = 0; // Find the highlighted digit

                const details = section.details.filter(d => d.digit || d.key); 
                details.forEach((item, index) => {
                    let endTime;
                    if (item.key) { 
                        const nextItem = section.details.find((d, i) => i > index && d.key);
                        endTime = nextItem ? nextItem.time : section.end;
                    } else if (item.digit) { 
                        // Stop '9' from 'units' at the section end, not at '10's time
                        if (currentSection === 'units' && item.digit === 9) {
                            endTime = section.end;
                        } else {
                            const nextItem = details[index + 1];
                            endTime = nextItem ? nextItem.time : section.end;
                        }
                    } else { return; }
                    const startTime = item.time;
                    const shouldHighlight = (currentTime >= startTime && currentTime < endTime);
                    
                    if (section.type === 'intro' && item.key) {
                        const element = byId(`intro-text-${item.key}`);
                        if (element) { element.classList.toggle('highlight-text', shouldHighlight); }
                    } else if (section.type === 'counting' && item.digit) {
                        // Don't auto-highlight '10' in 'units' section
                        if(currentSection === 'units' && item.digit === 10) return; 

                        const element = byId(`number-card-${item.digit}`);
                        if (element) { 
                            element.classList.toggle('highlight-card', shouldHighlight);
                            if (shouldHighlight) {
                                currentlyHighlightedDigit = item.digit;
                            }
                        }
                    }
                });

                if (section.type === 'counting' && currentSection === 'units') {
                    emojiDisplay.innerHTML = generateEmojiString(currentlyHighlightedDigit, currentlyHighlightedDigit);
                }

            }, 100); 
        }
        function renderIntroContent(section) {
            contentDisplay.innerHTML = '';
            numberGrid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'; 
            numberGrid.innerHTML = '';
            let htmlContent = '<div class="text-base md:text-lg font-normal leading-relaxed tracking-wider text-gray-700">';
            let parts = section.details.map(item => {
                if (item.key) { return `<span id="intro-text-${item.key}" class="cursor-pointer hover:shadow-lg hover:bg-yellow-200 rounded-lg p-1" onclick="window.__mnlApp.playSection('${item.key}')">${item.text}</span>`; }
                return item.text;
            }).join(' ');
            htmlContent += parts + '</div>';
            contentDisplay.innerHTML = htmlContent;
            emojiDisplay.innerHTML = ''; // Clear emoji display for intro
        }
        function renderCountingContent(section) {
            const introText = section.details.find(d => !d.digit);
            let gridClass = ['units', 'tens', 'hundreds', 'thousands'].includes(currentSection) ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';
            contentDisplay.innerHTML = `<p class="text-lg md:text-xl font-semibold text-indigo-700">${introText ? introText.text : section.label + ' Counting Started.'}</p>`;
            numberGrid.className = gridClass; 
            numberGrid.innerHTML = section.details.filter(d => d.digit).map(item => `<div id="number-card-${item.digit}" class="number-card bg-white p-2 rounded-lg shadow-xl text-center" onclick="window.__mnlApp.playSingleItem(${item.time}, ${item.digit}, 'number-card-${item.digit}')"><div class="burmese-digit mb-1">${convertToBurmeseDigits(item.digit)}</div><div classs="burmese-text">${item.text}</div></div>`).join('');
        
            if (currentSection === 'units') {
                emojiDisplay.innerHTML = '<span class="text-gray-400 text-lg">ဂဏန်းကဒ်ကို နှိပ်ပြီး emoji အရေအတွက် ကြည့်ပါ။</span>';
            } else {
                emojiDisplay.innerHTML = '';
            }
        }
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
            return array;
        }
        function generateQuestion(sectionId) {
            let min, max;
            switch (sectionId) {
                case 'units': min = 1; max = 10; break;
                case 'tens': min = 11; max = 99; break;
                case 'hundreds': min = 101; max = 999; break;
                case 'thousands': min = 1001; max = 9999; break;
                default: return null; 
            }
            let correctNumber;
            do {
                correctNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                if (sectionId === 'tens' && correctNumber % 10 === 0 && correctNumber !== 10) continue; // Allow 10 in units
                if (sectionId === 'hundreds' && correctNumber % 100 === 0) continue;
                if (sectionId === 'thousands' && correctNumber % 1000 === 0) continue;
            } while (correctNumber < min);
            
            // For 'units' quiz, make sure 10 is a valid component
            const components = (sectionId === 'units' && correctNumber === 10) ? [10] : getNumberComponents(correctNumber);
            if (components.length === 0) return null;

            let options = new Set([correctNumber]);
            while (options.size < 3) {
                let offset = Math.floor(Math.random() * 50) - 25;
                if (sectionId === 'units') {
                    offset = Math.floor(Math.random() * 5) - 2; // Smaller offset for units
                }
                let distractor = correctNumber + offset;
                if (distractor >= min && distractor <= max && distractor !== correctNumber && !options.has(distractor)) {
                    options.add(distractor);
                }
            }
            return { correctNumber, components, options: shuffleArray(Array.from(options)), isMultiDigit: components.length > 1 };
        }
        function renderGameContent(sectionId) {
            const question = generateQuestion(sectionId);
            if (!question) { contentDisplay.innerHTML = `<p class="text-lg text-red-600 font-bold">Error generating question or Quiz Mode not supported for this section.</p>`; numberGrid.innerHTML = ''; return; }
            currentQuestion = question;
            const label = countingData[sectionId].label;
            const numComponents = question.components.length;
            
            // Special handling for "10" (ဆယ်) in units quiz
            let audioComponents = [...question.components];
            if (sectionId === 'units' && question.correctNumber === 10) {
                audioComponents = [10]; // Ensure it just plays '10'
            }
            
            // --- UPDATED: Turtle Score Board ---
            contentDisplay.innerHTML = `
                <div class="flex justify-between items-center mb-2 px-2 bg-indigo-50 rounded p-2">
                     <p class="text-lg font-bold text-gray-800"><span class="text-rose-600">${label}</span> Quiz</p>
                </div>
                <div class="turtle-track-container w-full max-w-[500px] mx-auto">
                    <div class="turtle" id="app1-turtle" style="left: calc(${(app1Stats.correct / 25) * 100}% - ${(app1Stats.correct / 20) * 40}px);">🐢</div>
                    <div class="finish-line">🏁</div>
                </div>
                <div class="flex flex-col items-center justify-center mt-2">
                    <button onclick="window.__mnlApp.playMultiDigitAudio([${audioComponents.join(', ')}])" class="bg-rose-500 text-white text-base font-bold py-2 px-4 rounded-full shadow-lg hover:bg-rose-600 transition duration-300 transform hover:scale-105 flex items-center mb-2">
                        <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                        Listen Again
                    </button>
                    <div id="gameFeedback" class="mt-1 text-base font-extrabold min-h-[30px] text-indigo-700">Ready!</div>
                </div>`;
            // ---------------------------------------------------
            
            if (sectionId === 'units') {
                numberGrid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-4'; // 1 col on mobile
            } else {
                numberGrid.className = 'grid grid-cols-3 gap-4';
            }
            
            if (sectionId === 'units') {
                // --- New logic to pick distinct emojis ---
                let emojiIndices = new Set();
                while(emojiIndices.size < 3 && emojiIndices.size < emojiList.length) { // ensure we don't infinite loop if emojiList is small
                    emojiIndices.add(Math.floor(Math.random() * emojiList.length));
                }
                
                // --- THIS IS THE FIX ---
                const [idx1, idx2, idx3] = Array.from(emojiIndices);
                const emojiMap = {};
                if (question.options[0]) emojiMap[question.options[0]] = idx1;
                if (question.options[1]) emojiMap[question.options[1]] = idx2;
                if (question.options[2]) emojiMap[question.options[2]] = idx3;
                // --- END FIX ---

                // Quiz with Emojis
                numberGrid.innerHTML = question.options.map(digit => 
                    `<button id="game-option-${digit}" class="game-option-button bg-white p-2 rounded-lg shadow-xl text-center flex flex-col items-center justify-center min-h-[8rem] border-4 border-purple-700 hover:border-purple-500" onclick="window.__mnlApp.checkAnswer(${digit})">
                        <div class="p-1 text-2xl sm:text-3xl" style="line-height: 1.2;">
                            ${generateEmojiString(digit, emojiMap[digit])}
                        </div>
                        <div class="burmese-digit text-4xl font-bold mt-2">${convertToBurmeseDigits(digit)}</div>
                     </button>`
                ).join('');
            } else {
                // Original Quiz with Digits
                numberGrid.innerHTML = question.options.map(digit => 
                    `<button id="game-option-${digit}" class="game-option-button bg-white p-2 rounded-lg shadow-xl text-center flex flex-col items-center justify-center h-28 border-4 border-purple-700 hover:border-purple-500" onclick="window.__mnlApp.checkAnswer(${digit})">
                        <div class="burmese-digit mb-1 text-3xl">${convertToBurmeseDigits(digit)}</div>
                     </button>`
                ).join('');
            }

            playMultiDigitAudio(audioComponents);
        }
        const checkAnswer = function (selectedDigit) {
            if (!currentQuestion) return;
            const correctNumber = currentQuestion.correctNumber;
            const feedbackElement = byId('gameFeedback');
            rootEl.querySelectorAll('.game-option-button').forEach(btn => btn.disabled = true);
            const selectedButton = byId(`game-option-${selectedDigit}`);
            const correctButton = byId(`game-option-${correctNumber}`);
            const setDigitColorWhite = (btn) => { 
                if (currentSection !== 'units') { // Only apply to non-emoji quiz
                    const digitEl = btn.querySelector('.burmese-digit'); 
                    if(digitEl) digitEl.classList.add('text-white-override');
                }
            }
            const restoreDigitColor = (btn) => { 
                if (currentSection !== 'units') { // Only apply to non-emoji quiz
                    const digitEl = btn.querySelector('.burmese-digit'); 
                    if(digitEl) digitEl.classList.remove('text-white-override'); 
                }
            }
            if (selectedDigit === correctNumber) {
                // --- UPDATED LOGIC: Turtle Move Forward ---
                app1Stats.correct++;
                const turtle = byId('app1-turtle');
                if(turtle) {
                    turtle.classList.remove('moving-back');
                    turtle.style.left = `calc(${(app1Stats.correct / 20) * 100}% - ${(app1Stats.correct / 20) * 40}px)`;
                }

                feedbackElement.textContent = "Correct!";
                feedbackElement.className = 'mt-1 text-base font-extrabold min-h-[30px] text-green-600';
                selectedButton.classList.add('correct-highlight');
                setDigitColorWhite(selectedButton);
                if (currentSection === 'units') { selectedButton.style.backgroundColor = '#4f46e5'; }

                setTimeout(() => { 
                    // --- Win Condition: 20 Correct ---
                    if (app1Stats.correct >= 20) {
                        // Level Complete
                        alert(`Level ${countingData[currentSection].label} Complete!`);
                        
                        // Move to next level logic
                        const currentIndex = gameLevels.indexOf(currentSection);
                        if (currentIndex < gameLevels.length - 1) {
                            // Go to next game level
                            app1Stats = { correct: 0, wrong: 0 };
                            const nextLevel = gameLevels[currentIndex + 1];
                            currentSection = nextLevel;
                            autoStartQuiz = true; // Set flag to start quiz after audio
                            playSection(nextLevel);
                        } else {
                            // Finished 'Thousands' -> Start Final Sequence
                            app1Stats = { correct: 0, wrong: 0 };
                            // Switch off game mode UI
                            const toggleBtn = byId('gameToggle');
                            if(toggleBtn) {
                                toggleBtn.textContent = 'Quiz Mode (OFF)';
                                toggleBtn.classList.remove('bg-pink-600', 'hover:bg-pink-700');
                                toggleBtn.classList.add('bg-teal-500', 'hover:bg-teal-600');
                            }
                            isGameMode = false;
                            finalSequenceIndex = 0;
                            playEndingSequence();
                        }
                    } else {
                        renderGameContent(currentSection); 
                    }
                }, 1500);
            } else {
                // --- UPDATED LOGIC: Turtle Move Backward ---
                app1Stats.correct = Math.max(0, app1Stats.correct - 1);
                const turtle = byId('app1-turtle');
                if(turtle) {
                    turtle.classList.add('moving-back');
                    turtle.style.left = `calc(${(app1Stats.correct / 20) * 100}% - ${(app1Stats.correct / 20) * 40}px)`;
                }

                feedbackElement.textContent = "Incorrect.";
                feedbackElement.className = 'mt-1 text-base font-extrabold min-h-[30px] text-red-600';
                selectedButton.classList.add('bg-red-500', 'ring-4', 'ring-red-700');
                setDigitColorWhite(selectedButton);
                correctButton.classList.add('correct-highlight');
                setDigitColorWhite(correctButton);
                if (currentSection === 'units') { correctButton.style.backgroundColor = '#4f46e5'; }
                
                setTimeout(() => {
                    selectedButton.classList.remove('bg-red-500', 'ring-4', 'ring-red-700');
                    restoreDigitColor(selectedButton);
                    correctButton.classList.remove('correct-highlight');
                    restoreDigitColor(correctButton);
                    if (currentSection === 'units') { selectedButton.style.backgroundColor = ''; correctButton.style.backgroundColor = ''; }
                    rootEl.querySelectorAll('.game-option-button').forEach(btn => btn.disabled = false);
                    
                    feedbackElement.textContent = "Try again! Listen to the sound.";
                    let audioComponents = [...currentQuestion.components];
                    if (currentSection === 'units' && currentQuestion.correctNumber === 10) { audioComponents = [10]; }
                    playMultiDigitAudio(audioComponents); 
                }, 2000);
            }
        }
        const toggleGameMode = function () {
            isGameMode = !isGameMode;
            const toggleBtn = byId('gameToggle');
            if (!['units', 'tens', 'hundreds', 'thousands'].includes(currentSection)) { currentSection = 'units'; }
            
            // Reset Stats on toggle
            app1Stats = { correct: 0, wrong: 0 };
            
            if (isGameMode) {
                toggleBtn.textContent = 'Quiz Mode (ON)';
                toggleBtn.classList.remove('bg-teal-500', 'hover:bg-teal-600');
                toggleBtn.classList.add('bg-pink-600', 'hover:bg-pink-700');
                stopHighlighting(); audioPlayer.pause();
                renderGameContent(currentSection);
            } else {
                toggleBtn.textContent = 'Quiz Mode (OFF)';
                toggleBtn.classList.add('bg-teal-500', 'hover:bg-teal-600');
                toggleBtn.classList.remove('bg-pink-600', 'hover:bg-pink-700');
                playSection(currentSection);
            }
        }
        const startApp = function () {
            navigation.style.pointerEvents = 'auto';
            const quizToggle = byId('gameToggle');
            if (quizToggle) quizToggle.disabled = false;
            playSection('intro');
        }
        function initApp1() {
            preProcessAudioData();
            const placeValueKeys = ['units', 'tens', 'hundreds', 'thousands', 'tenThousands', 'hundredThousands', 'millions', 'crore'];
            const toggleButton = document.createElement('button');
            toggleButton.id = 'gameToggle';
            toggleButton.className = 'bg-teal-500 text-white text-base font-bold py-1.5 px-3 rounded-full transition duration-300 ease-in-out hover:shadow-xl shadow-md disabled:opacity-50';
            toggleButton.textContent = 'Quiz Mode (OFF)';
            toggleButton.onclick = toggleGameMode;
            toggleButton.disabled = true;
            navigation.appendChild(toggleButton);
            const navButtonsHtml = placeValueKeys.map(key => `<button data-section="${key}" onclick="window.__mnlApp.playSection('${key}')" class="place-value-button text-base font-bold py-1.5 px-3 rounded-full transition duration-300 ease-in-out hover:shadow-xl">${countingData[key].label}</button>`).join('');
            navigation.insertAdjacentHTML('afterbegin', navButtonsHtml);
            navigation.style.pointerEvents = 'none';
            contentDisplay.innerHTML = `<div class="flex flex-col items-center justify-center h-full min-h-[50px] py-2"><p class="text-lg md:text-xl text-indigo-700 font-bold mb-3">Click START to begin the lesson!</p><button onclick="window.__mnlApp.startApp()" class="bg-pink-500 text-white text-xl font-bold py-2 px-6 rounded-full shadow-lg hover:bg-pink-600 transform hover:scale-105 transition duration-300 ease-in-out">START</button></div>`;
            emojiDisplay.innerHTML = ''; // Clear on init
            audioPlayer.onended = () => { stopHighlighting(); };
            audioPlayer.onpause = () => { if (highlightInterval) { stopHighlighting(); } };
        }

        // --- App 2 (1-100 Grid) Logic ---
        const NUMBER_DATA = [
            { myanmar_word: "သုည", roman: "0", pali: "သုည (suñña)", english: "zero" },
            { myanmar_word: "တစ်", roman: "I", pali: "ဧက (eka)", english: "one" },
            { myanmar_word: "နှစ်", roman: "II", pali: "ဒွေ (dve)", english: "two" },
            { myanmar_word: "သုံး", roman: "III", pali: "တိ (ti)", english: "three" },
            { myanmar_word: "လေး", roman: "IV", pali: "စတု (catu)", english: "four" },
            { myanmar_word: "ငါး", roman: "V", pali: "ပဉ္စ (pañca)", english: "five" },
            { myanmar_word: "ခြောက်", roman: "VI", pali: "ဆ (cha)", english: "six" },
            { myanmar_word: "ခုနစ်", roman: "VII", pali: "သတ္တ (satta)", english: "seven" },
            { myanmar_word: "ရှစ်", roman: "VIII", pali: "အဋ္ဌ (aṭṭha)", english: "eight" },
            { myanmar_word: "ကိုး", roman: "IX", pali: "နဝ (nava)", english: "nine" },
            { myanmar_word: "တစ်ဆယ်", roman: "X", pali: "ဒသ (dasa)", english: "ten" },
            { myanmar_word: "တစ်ဆယ့်တစ်", roman: "XI", pali: "ဧကာဒသ (ekādasa)", english: "eleven" },
            { myanmar_word: "တစ်ဆယ့်နှစ်", roman: "XII", pali: "ဒွါဒသ (dvādasa)", english: "twelve" },
            { myanmar_word: "တစ်ဆယ့်သုံး", roman: "XIII", pali: "တေရသ (terasa)", english: "thirteen" },
            { myanmar_word: "တစ်ဆယ့်လေး", roman: "XIV", pali: "စတုဒ္ဒသ (catuddasa)", english: "fourteen" },
            { myanmar_word: "တစ်ဆယ့်ငါး", roman: "XV", pali: "ပန္နရသ (paṇṇarasa)", english: "fifteen" },
            { myanmar_word: "တစ်ဆယ့်ခြောက်", roman: "XVI", pali: "သောဠသ (soḷasa)", english: "sixteen" },
            { myanmar_word: "တစ်ဆယ့်ခုနစ်", roman: "XVII", pali: "သတ္တရသ (sattarasa)", english: "seventeen" },
            { myanmar_word: "တစ်ဆယ့်ရှစ်", roman: "XVIII", pali: "အဋ္ဌာရသ (aṭṭhārasa)", english: "eighteen" },
            { myanmar_word: "တစ်ဆယ့်ကိုး", roman: "XIX", pali: "ဧကူနဝီသတိ (ekūnavīsati)", english: "nineteen" },
            { myanmar_word: "နှစ်ဆယ်", roman: "XX", pali: "ဝီသတိ (vīsati)", english: "twenty" },
            { myanmar_word: "နှစ်ဆယ့်တစ်", roman: "XXI", pali: "ဧကဝီသတိ (ekavīsati)", english: "twenty-one" },
            { myanmar_word: "နှစ်ဆယ့်နှစ်", roman: "XXII", pali: "ဗာဝီသတိ (bāvīsati)", english: "twenty-two" },
            { myanmar_word: "နှစ်ဆယ့်သုံး", roman: "XXIII", pali: "တေဝီသတိ (tevīsati)", english: "twenty-three" },
            { myanmar_word: "နှစ်ဆယ့်လေး", roman: "XXIV", pali: "စတုဝီသတိ (catuvīsati)", english: "twenty-four" },
            { myanmar_word: "နှစ်ဆယ့်ငါး", roman: "XXV", pali: "ပဉ္စဝီသတိ (pañcavīsati)", english: "twenty-five" },
            { myanmar_word: "နှစ်ဆယ့်ခြောက်", roman: "XXVI", pali: "ဆဗ္ဗီသတိ (chabbīsati)", english: "twenty-six" },
            { myanmar_word: "နှစ်ဆယ့်ခုနစ်", roman: "XXVII", pali: "သတ္တဝီသတိ (sattavīsati)", english: "twenty-seven" },
            { myanmar_word: "နှစ်ဆယ့်ရှစ်", roman: "XXVIII", pali: "အဋ္ဌဝီသတိ (aṭṭhavīsati)", english: "twenty-eight" },
            { myanmar_word: "နှစ်ဆယ့်ကိုး", roman: "XXIX", pali: "ဧကူနတိံသတိ (ekūnatiṁsati)", english: "twenty-nine" },
            { myanmar_word: "သုံးဆယ်", roman: "XXX", pali: "တိံသတိ (tiṁsati)", english: "thirty" },
            { myanmar_word: "သုံးဆယ့်တစ်", roman: "XXXI", pali: "ဧကတိံသတိ (ekatiṁsati)", english: "thirty-one" },
            { myanmar_word: "သုံးဆယ့်နှစ်", roman: "XXXII", pali: "ဒွတ္တိံသတိ (dvattiṁsati)", english: "thirty-two" },
            { myanmar_word: "သုံးဆယ့်သုံး", roman: "XXXIII", pali: "တေတ္တိံသတိ (tettiṁsati)", english: "thirty-three" },
            { myanmar_word: "သုံးဆယ့်လေး", roman: "XXXIV", pali: "စတုတ္တိံသတိ (catuttiṁsati)", english: "thirty-four" },
            { myanmar_word: "သုံးဆယ့်ငါး", roman: "XXXV", pali: "ပဉ္စတိံသတိ (pañcatiṁsati)", english: "thirty-five" },
            { myanmar_word: "သုံးဆယ့်ခြောက်", roman: "XXXVI", pali: "ဆတ္တိံသတိ (chattiṁsati)", english: "thirty-six" },
            { myanmar_word: "သုံးဆယ့်ခုနစ်", roman: "XXXVII", pali: "သတ္တတိံသတိ (sattatiṁsati)", english: "thirty-seven" },
            { myanmar_word: "သုံးဆယ့်ရှစ်", roman: "XXXVIII", pali: "အဋ္ဌတိံသတိ (aṭṭhatiṁsati)", english: "thirty-eight" },
            { myanmar_word: "သုံးဆယ့်ကိုး", roman: "XXXIX", pali: "ဧကူနစတ္တာဠီသတိ (ekūnacattālīsati)", english: "thirty-nine" },
            { myanmar_word: "လေးဆယ်", roman: "XL", pali: "စတ္တာဠီသတိ (cattālīsati)", english: "forty" },
            { myanmar_word: "လေးဆယ့်တစ်", roman: "XLI", pali: "ဧကစတ္တာဠီသတိ (ekacattālīsati)", english: "forty-one" },
            { myanmar_word: "လေးဆယ့်နှစ်", roman: "XLII", pali: "ဒွိစတ္တာဠီသတိ (dvicattālīsati)", english: "forty-two" },
            { myanmar_word: "လေးဆယ့်သုံး", roman: "XLIII", pali: "တေစတ္တာဠီသတိ (tecattālīsati)", english: "forty-three" },
            { myanmar_word: "လေးဆယ့်လေး", roman: "XLIV", pali: "စတုစတ္တာဠီသတိ (catucattālīsati)", english: "forty-four" },
            { myanmar_word: "လေးဆယ့်ငါး", roman: "XLV", pali: "ပဉ္စစတ္တာဠီသတိ (pañcacattālīsati)", english: "forty-five" },
            { myanmar_word: "လေးဆယ့်ခြောက်", roman: "XLVI", pali: "ဆစတ္တာဠီသတိ (chacattālīsati)", english: "forty-six" },
            { myanmar_word: "လေးဆယ့်ခုနစ်", roman: "XLVII", pali: "သတ္တစတ္တာဠီသတိ (sattacattālīsati)", english: "forty-seven" },
            { myanmar_word: "လေးဆယ့်ရှစ်", roman: "XLVIII", pali: "အဋ္ဌစတ္တာဠီသတိ (aṭṭhacattālīsati)", english: "forty-eight" },
            { myanmar_word: "လေးဆယ့်ကိုး", roman: "XLIX", pali: "ဧကူနပညာသ (ekūnapaññāsa)", english: "forty-nine" },
            { myanmar_word: "ငါးဆယ်", roman: "L", pali: "ပညာသ (paññāsa)", english: "fifty" },
            { myanmar_word: "ငါးဆယ့်တစ်", roman: "LI", pali: "ဧကပညာသ (ekapaññāsa)", english: "fifty-one" },
            { myanmar_word: "ငါးဆယ့်နှစ်", roman: "LII", pali: "ဒွပညာသ (dvipaññāsa)", english: "fifty-two" },
            { myanmar_word: "ငါးဆယ့်သုံး", roman: "LIII", pali: "တိပညာသ (tipaññāsa)", english: "fifty-three" },
            { myanmar_word: "ငါးဆယ့်လေး", roman: "LIV", pali: "စတုပညာသ (catupaññāsa)", english: "fifty-four" },
            { myanmar_word: "ငါးဆယ့်ငါး", roman: "LV", pali: "ပဉ္စပညာသ (pañcapaññāsa)", english: "fifty-five" },
            { myanmar_word: "ငါးဆယ့်ခြောက်", roman: "LVI", pali: "ဆပ္ပညာသ (chappaññāsa)", english: "fifty-six" },
            { myanmar_word: "ငါးဆယ့်ခုနစ်", roman: "LVII", pali: "သတ္တပညာသ (sattapaññāsa)", english: "fifty-seven" },
            { myanmar_word: "ငါးဆယ့်ရှစ်", roman: "LVIII", pali: "အဋ္ဌပညာသ (aṭṭhapaññāsa)", english: "fifty-eight" },
            { myanmar_word: "ငါးဆယ့်ကိုး", roman: "LIX", pali: "ဧကူနသဋ္ဌိ (ekūnasaṭṭhi)", english: "fifty-nine" },
            { myanmar_word: "ခြောက်ဆယ်", roman: "LX", pali: "သဋ္ဌိ (saṭṭhi)", english: "sixty" },
            { myanmar_word: "ခြောက်ဆယ့်တစ်", roman: "LXI", pali: "ဧကသဋ္ဌိ (ekasaṭṭhi)", english: "sixty-one" },
            { myanmar_word: "ခြောက်ဆယ့်နှစ်", roman: "LXII", pali: "ဗာသဋ္ဌိ (bāsaṭṭhi)", english: "sixty-two" },
            { myanmar_word: "ခြောက်ဆယ့်သုံး", roman: "LXIII", pali: "တေသဋ္ဌိ (tesaṭṭhi)", english: "sixty-three" },
            { myanmar_word: "ခြောက်ဆယ့်လေး", roman: "LXIV", pali: "စတုသဋ္ဌိ (catusaṭṭhi)", english: "sixty-four" },
            { myanmar_word: "ခြောက်ဆယ့်ငါး", roman: "LXV", pali: "ပဉ္စသဋ္ဌိ (pañcasaṭṭhi)", english: "sixty-five" },
            { myanmar_word: "ခြောက်ဆယ့်ခြောက်", roman: "LXVI", pali: "ဆသဋ္ဌိ (chasaṭṭhi)", english: "sixy-six" },
            { myanmar_word: "ခြောက်ဆယ့်ခုနစ်", roman: "LXVII", pali: "သတ္တသဋ္ဌိ (sattasaṭṭhi)", english: "sixty-seven" },
            { myanmar_word: "ခြောက်ဆယ့်ရှစ်", roman: "LXVIII", pali: "အဋ္ဌသဋ္ဌိ (aṭṭhasaṭṭhi)", english: "sixty-eight" },
            { myanmar_word: "ခြောက်ဆယ့်ကိုး", roman: "LXIX", pali: "ဧကူနသတ္တတိ (ekūnasattati)", english: "sixty-nine" },
            { myanmar_word: "ခုနစ်ဆယ်", roman: "LXX", pali: "သတ္တတိ (sattati)", english: "seventy" },
            { myanmar_word: "ခုနစ်ဆယ့်တစ်", roman: "LXXI", pali: "ဧကသတ္တတိ (ekasattati)", english: "seventy-one" },
            { myanmar_word: "ခုနစ်ဆယ့်နှစ်", roman: "LXXII", pali: "ဗာသတ္တတိ (bāsattati)", english: "seventy-two" },
            { myanmar_word: "ခုနစ်ဆယ့်သုံး", roman: "LXXIII", pali: "တေသတ္တတိ (tesattati)", english: "seventy-three" },
            { myanmar_word: "ခုနစ်ဆယ့်လေး", roman: "LXXIV", pali: "စတုသတ္တတိ (catusattati)", english: "seventy-four" },
            { myanmar_word: "ခုနစ်ဆယ့်ငါး", roman: "LXXV", pali: "ပဉ္စသတ္တတိ (pañcasattati)", english: "seventy-five" },
            { myanmar_word: "ခုနစ်ဆယ့်ခြောက်", roman: "LXXVI", pali: "ဆသတ္တတိ (chasattati)", english: "seventy-six" },
            { myanmar_word: "ခုနစ်ဆယ့်ခုနစ်", roman: "LXXVII", pali: "သတ္တသတ္တတိ (sattasattati)", english: "seventy-seven" },
            { myanmar_word: "ခုနစ်ဆယ့်ရှစ်", roman: "LXXVIII", pali: "အဋ္ဌသတ္တတိ (aṭṭhasattati)", english: "seventy-eight" },
            { myanmar_word: "ခုနစ်ဆယ့်ကိုး", roman: "LXXIX", pali: "ဧကူနာသီတိ (ekūnāsīti)", english: "seventy-nine" },
            { myanmar_word: "ရှစ်ဆယ်", roman: "LXXX", pali: "အသီတိ (asīti)", english: "eighty" },
            { myanmar_word: "ရှစ်ဆယ့်တစ်", roman: "LXXXI", pali: "ဧကာသီတိ (ekāsīti)", english: "eighty-one" },
            { myanmar_word: "ရှစ်ဆယ့်နှစ်", roman: "LXXXII", pali: "ဒွါသီတိ (dvāsīti)", english: "eighty-two" },
            { myanmar_word: "ရှစ်ဆယ့်သုံး", roman: "LXXXIII", pali: "တေအသီတိ (te-asīti)", english: "eighty-three" },
            { myanmar_word: "ရှစ်ဆယ့်လေး", roman: "LXXXIV", pali: "စတုရာသီတိ (caturāsīti)", english: "eighty-four" },
            { myanmar_word: "ရှစ်ဆယ့်ငါး", roman: "LXXXV", pali: "ပဉ္စာသီတိ (pañcāsīti)", english: "eighty-five" },
            { myanmar_word: "ရှစ်ဆယ့်ခြောက်", roman: "LXXXVI", pali: "ဆာသီတိ (chāsīti)", english: "eighty-six" },
            { myanmar_word: "ရှစ်ဆယ့်ခုနစ်", roman: "LXXXVII", pali: "သတ္တသီတိ (sattāsīti)", english: "eighty-seven" },
            { myanmar_word: "ရှစ်ဆယ့်ရှစ်", roman: "LXXXVIII", pali: "အဋ္ဌာသီတိ (aṭṭhāsīti)", english: "eighty-eight" },
            { myanmar_word: "ရှစ်ဆယ့်ကိုး", roman: "LXXXIX", pali: "ဧကူနနဝုတိ (ekūnanavuti)", english: "eighty-nine" },
            { myanmar_word: "ကိုးဆယ်", roman: "XC", pali: "နဝုတိ (navuti)", english: "ninety" },
            { myanmar_word: "ကိုးဆယ့်တစ်", roman: "XCI", pali: "ဧကနဝုတိ (ekanavuti)", english: "ninety-one" },
            { myanmar_word: "ကိုးဆယ့်နှစ်", roman: "XCII", pali: "ဒွိနဝုတိ (dvinavuti)", english: "ninety-two" },
            { myanmar_word: "ကိုးဆယ့်သုံး", roman: "XCIII", pali: "တိနဝုတိ (tinavuti)", english: "ninety-three" },
            { myanmar_word: "ကိုးဆယ့်လေး", roman: "XCIV", pali: "စတုနဝုတိ (catunavuti)", english: "ninety-four" },
            { myanmar_word: "ကိုးဆယ့်ငါး", roman: "XCV", pali: "ပဉ္စနဝုတိ (pañcanavuti)", english: "ninety-five" },
            { myanmar_word: "ကိုးဆယ့်ခြောက်", roman: "XCVI", pali: "ဆနဝုတိ (channavuti)", english: "ninety-six" },
            { myanmar_word: "ကိုးဆယ့်ခုနစ်", roman: "XCVII", pali: "သတ္တနဝုတိ (sattanavuti)", english: "ninety-seven" },
            { myanmar_word: "ကိုးဆယ့်ရှစ်", roman: "XCVIII", pali: "အဋ္ဌနဝုတိ (aṭṭhanavuti)", english: "ninety-eight" },
            { myanmar_word: "ကိုးဆယ့်ကိုး", roman: "XCIX", pali: "ဧကူနသတံ (ekūnasataṁ)", english: "ninety-nine" },
            { myanmar_word: "တစ်ရာ", roman: "C", pali: "သတံ (sataṁ)", english: "one hundred" }
        ];
        const audio = byId('counting-audio'); const gridContainer = byId('counting-view'); const toggleAudioBtn = byId('toggle-audio-btn'); const playIcon = byId('play-icon'); const pauseIcon = byId('pause-icon'); const currentNumber3D = byId('current-number-3d'); const myanmarText = byId('myanmar-text'); const romanText = byId('roman-text'); const paliText = byId('pali-text'); const englishText = byId('english-text'); const multilingualDisplay = byId('multilingual-display'); const toggleQuizBtn = byId('toggle-quiz-btn'); const quizOnIcon = byId('quiz-on-icon'); const quizOffIcon = byId('quiz-off-icon'); const quizBar = byId('quiz-bar'); const answerButtonsContainer = byId('answer-buttons'); const gameFeedback = byId('game-feedback'); const nextQuestionBtn = byId('next-question-btn'); const playbackModeBtn = byId('playback-mode-btn');
        
        let isPlayingContinuous = false, sequenceTimeoutId = null, singlePlayTimeout = null, lastHighlightedNumber = 0, currentCorrectAnswer = 0, isQuizActive = false, playbackMode = 'all';
        
        // --- NEW VARIABLES FOR APP 2 GAME LOGIC ---
        let app2Stats = { correct: 0, wrong: 0 };
        const app2ScoreBoard = byId('app2-score-board');
        // ------------------------------------------

        const SEGMENT_DATA = [ { startNum: 1, endNum: 10, audioStart: 14.0, audioEnd: 31.0, interval: 1.70 }, { startNum: 11, endNum: 14, audioStart: 32.0, audioEnd: 42.0, interval: 2.50 }, { startNum: 15, endNum: 19, audioStart: 43.0, audioEnd: 52.50, interval: 2.00 }, { startNum: 20, endNum: 30, audioStart: 52.50, audioEnd: 72.0, interval: 1.80 }, { startNum: 31, endNum: 40, audioStart: 73.0, audioEnd: 90.0, interval: 1.70 }, { startNum: 41, endNum: 46, audioStart: 90.0, audioEnd: 100.0, interval: 1.80 }, { startNum: 47, endNum: 50, audioStart: 100.0, audioEnd: 107.0, interval: 1.80 }, { startNum: 51, endNum: 80, audioStart: 130.0, audioEnd: 181.0, interval: 1.70 }, { startNum: 81, endNum: 84, audioStart: 203.0, audioEnd: 210.0, interval: 1.80 }, { startNum: 85, endNum: 90, audioStart: 210.0, audioEnd: 220.0, interval: 1.80 }, { startNum: 91, endNum: 100, audioStart: 220.0, audioEnd: 238.0, interval: 1.80 } ];
        const AUDIO_TOTAL_END = 238.0;
        function getStartTimeForNumber(n) { if (n < 1 || n > 100) return 0; for (const segment of SEGMENT_DATA) { if (n >= segment.startNum && n <= segment.endNum) { return segment.audioStart + ((n - segment.startNum) * segment.interval); } } return 0; }
        function getEndTimeForNumber(n) { if (n >= 100) return AUDIO_TOTAL_END; const currentSegment = SEGMENT_DATA.find(s => n >= s.startNum && n <= s.endNum); if (!currentSegment) return getStartTimeForNumber(n) + 1.8; if (n === currentSegment.endNum) { return currentSegment.audioEnd; } const nextStart = getStartTimeForNumber(n + 1); if (nextStart > 0) return nextStart; return getStartTimeForNumber(n) + currentSegment.interval; }
        function playSingleNumber(n) { if (isPlayingContinuous) stopContinuousSynchronization(); const targetTime = getStartTimeForNumber(n); const stopTime = getEndTimeForNumber(n); const duration = (stopTime - targetTime) * 1000; if (targetTime === 0 || stopTime === 0 || duration <= 0) { return; } audio.currentTime = targetTime; audio.play().catch(console.error); clearTimeout(singlePlayTimeout); singlePlayTimeout = setTimeout(() => audio.pause(), duration); if (!isQuizActive) updateHighlightAndDisplay(n); }
        function updateHighlightAndDisplay(currentNum) { if (lastHighlightedNumber > 0) { byId(`cell-${lastHighlightedNumber}`)?.classList.remove('highlight'); } if (currentNum >= 1 && currentNum <= 100) { const currentCell = byId(`cell-${currentNum}`); if (currentCell) { currentCell.classList.add('highlight'); lastHighlightedNumber = currentNum; currentCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } const data = NUMBER_DATA[currentNum]; currentNumber3D.textContent = getBurmeseNumber(currentNum); currentNumber3D.classList.add('opacity-100'); myanmarText.textContent = data.myanmar_word; romanText.textContent = data.roman; paliText.textContent = data.pali || '...'; englishText.textContent = data.english; } else { currentNumber3D.classList.remove('opacity-100'); lastHighlightedNumber = 0; myanmarText.textContent = '...'; romanText.textContent = '...'; paliText.textContent = '...'; englishText.textContent = '...'; } }
        function calculateStartNumberForContinuous() { let currentNum = lastHighlightedNumber; if (currentNum === 0 || currentNum < 1 || currentNum > 100) { currentNum = 1; } if (playbackMode === 'all') { return currentNum; } else if (playbackMode === 'evens') { return (currentNum % 2 === 0) ? currentNum : currentNum + 1; } else if (playbackMode === 'fives') { return (currentNum % 5 === 0) ? currentNum : Math.ceil(currentNum / 5) * 5; } return 1; }
        function playNextInSequence(num) { if (!isPlayingContinuous || num > 100) { stopContinuousSynchronization(); updateHighlightAndDisplay(0); return; } updateHighlightAndDisplay(num); const startTime = getStartTimeForNumber(num); const endTime = getEndTimeForNumber(num); const duration = (endTime - startTime) * 1000; if (startTime === 0 || endTime === 0 || duration <= 0) { stopContinuousSynchronization(); return; } audio.currentTime = startTime; audio.play().catch(console.error); clearTimeout(sequenceTimeoutId); sequenceTimeoutId = setTimeout(() => { let nextNum; if (playbackMode === 'all') nextNum = num + 1; else if (playbackMode === 'evens') nextNum = num + 2; else nextNum = num + 5; playNextInSequence(nextNum); }, duration > 100 ? duration : 1000); }
        function startContinuousSynchronization() { if (isPlayingContinuous || isQuizActive) return; clearTimeout(singlePlayTimeout); isPlayingContinuous = true; playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; const startNum = calculateStartNumberForContinuous(); if (startNum > 100) { stopContinuousSynchronization(); updateHighlightAndDisplay(0); return; } playNextInSequence(startNum); }
        function stopContinuousSynchronization() { clearTimeout(sequenceTimeoutId); sequenceTimeoutId = null; isPlayingContinuous = false; audio.pause(); playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; }
        
        function toggleQuiz() { 
            isQuizActive = !isQuizActive; 
            // Reset stats on toggle
            app2Stats = { correct: 0, wrong: 0 };
            updateApp2ScoreBoard();

            if (isQuizActive) { 
                stopContinuousSynchronization(); 
                updateHighlightAndDisplay(0); 
                quizBar.classList.remove('hidden'); 
                gridContainer.classList.add('quiz-active'); 
                multilingualDisplay.classList.add('hidden'); 
                currentNumber3D.classList.remove('opacity-100'); 
                quizOnIcon.style.display = 'none'; 
                quizOffIcon.style.display = 'block'; 
                toggleQuizBtn.classList.replace('bg-red-600', 'bg-gray-700'); 
                toggleQuizBtn.classList.replace('hover:bg-red-700', 'hover:bg-gray-800'); 
                startQuiz(); 
            } else { 
                quizBar.classList.add('hidden'); 
                gridContainer.classList.remove('quiz-active'); 
                multilingualDisplay.classList.remove('hidden'); 
                audio.pause(); 
                clearTimeout(singlePlayTimeout); 
                updateHighlightAndDisplay(1); 
                quizOnIcon.style.display = 'block'; 
                quizOffIcon.style.display = 'none'; 
                toggleQuizBtn.classList.replace('bg-gray-700', 'bg-red-600'); 
                toggleQuizBtn.classList.replace('hover:bg-gray-800', 'hover:bg-red-700'); 
            } 
        }
        function updateApp2ScoreBoard() {
            const turtle = byId('app2-turtle');
            if(turtle) {
                turtle.style.left = `calc(${(app2Stats.correct / 30) * 100}% - ${(app2Stats.correct / 30) * 40}px)`;
            }
        }

        function generateWrongAnswers(correct) { const wrongAnswers = new Set(); while (wrongAnswers.size < 2) { let offset = Math.floor(Math.random() * 15) + 1; let sign = Math.random() < 0.5 ? 1 : -1; let wrong = correct + offset * sign; if (wrong >= 1 && wrong <= 100 && wrong !== correct && !wrongAnswers.has(wrong)) { wrongAnswers.add(wrong); } } return Array.from(wrongAnswers); }
        function startQuiz() { gameFeedback.textContent = ''; nextQuestionBtn.classList.add('hidden'); answerButtonsContainer.innerHTML = ''; const targetArabic = Math.floor(Math.random() * 100) + 1; currentCorrectAnswer = targetArabic; const wrongChoices = generateWrongAnswers(targetArabic); let choices = [targetArabic, ...wrongChoices]; choices.sort(() => Math.random() - 0.5); playSingleNumber(targetArabic); choices.forEach(choice => { const btn = document.createElement('button'); btn.textContent = getBurmeseNumber(choice); btn.className = `quiz-btn bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold`; btn.dataset.value = choice; btn.onclick = () => checkQuizAnswer(choice, btn); answerButtonsContainer.appendChild(btn); }); }
        
        function checkQuizAnswer(selectedValue, selectedButton) { 
            Array.from(answerButtonsContainer.children).forEach(btn => btn.disabled = true); 
            audio.pause(); 
            
            const turtle = byId('app2-turtle');

            if (selectedValue === currentCorrectAnswer) { 
                app2Stats.correct++;
                if(turtle) turtle.classList.remove('moving-back');
                updateApp2ScoreBoard();
                gameFeedback.textContent = '🎉 မှန်ပါတယ် 🎉'; 
                selectedButton.classList.replace('bg-indigo-500', 'bg-green-500'); 
                launchConfetti(); 
                
                setTimeout(() => {
                    // --- Win Condition: 30 Correct ---
                    if (app2Stats.correct >= 30) {
                        alert("Congratulations! You finished the game!");
                        toggleQuiz(); // Reset/Exit game
                    } else {
                        startQuiz();
                    }
                }, 2000); 
            } else { 
                app2Stats.correct = Math.max(0, app2Stats.correct - 1);
                if(turtle) turtle.classList.add('moving-back');
                updateApp2ScoreBoard();
                gameFeedback.textContent = '😥 မှားပါတယ်...'; 
                selectedButton.classList.replace('bg-indigo-500', 'bg-red-500'); 
                
                nextQuestionBtn.classList.remove('hidden'); 
            } 
        }
        
        const confettiCanvas = byId('confetti-canvas'); const confettiCtx = confettiCanvas.getContext('2d'); let confettiParticles = []; const CONFETTI_COLORS = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
        function resizeCanvas() { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
        function launchConfetti() { resizeCanvas(); confettiParticles = []; for (let i = 0; i < 150; i++) { confettiParticles.push({ x: Math.random() * confettiCanvas.width, y: -Math.random() * confettiCanvas.height * 0.5, size: Math.random() * 8 + 4, speedX: Math.random() * 6 - 3, speedY: Math.random() * 5 + 2, color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)], angle: Math.random() * 360, spin: Math.random() * 10 - 5 }); } animateConfetti(); setTimeout(() => confettiParticles = [], 3000); }
        function animateConfetti() { if (confettiParticles.length === 0) { confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); return; } confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); confettiParticles.forEach((p, index) => { p.y += p.speedY; p.x += p.speedX; p.angle += p.spin; p.speedY += 0.05; confettiCtx.save(); confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.angle * Math.PI / 180); confettiCtx.fillStyle = p.color; confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); confettiCtx.restore(); if (p.y > confettiCanvas.height) { confettiParticles.splice(index, 1); } }); requestAnimationFrame(animateConfetti); }
        function getBurmeseNumber(n) { return String(n).split('').map(digit => burmeseDigits[parseInt(digit, 10)]).join(''); }
        
        function initApp2() {
            // Populate the grid for App 2
            for (let i = 1; i <= 100; i++) {
                const cell = document.createElement('div');
                cell.id = `cell-${i}`;
                cell.textContent = getBurmeseNumber(i);
                const hue = (i * 3) % 360;
                cell.className = `grid-cell rounded-lg shadow-md hover:shadow-lg`;
                cell.style.backgroundColor = `hsl(${hue}, 80%, 95%)`;
                cell.addEventListener('click', () => {
                    if (!isPlayingContinuous && !isQuizActive) {
                        playSingleNumber(i);
                    }
                });
                gridContainer.appendChild(cell);
            }
            toggleAudioBtn.addEventListener('click', () => { if (isPlayingContinuous) { stopContinuousSynchronization(); updateHighlightAndDisplay(lastHighlightedNumber); } else { startContinuousSynchronization(); } });
            const modes = { all: 'အားလုံး', evens: 'စုံ', fives: '၅ ဆ' }; const modeOrder = ['all', 'evens', 'fives']; let currentModeIndex = 0; playbackModeBtn.addEventListener('click', () => { currentModeIndex = (currentModeIndex + 1) % modeOrder.length; playbackMode = modeOrder[currentModeIndex]; playbackModeBtn.textContent = modes[playbackMode]; if (isPlayingContinuous) { stopContinuousSynchronization(); startContinuousSynchronization(); } });
            toggleQuizBtn.addEventListener('click', toggleQuiz);
            nextQuestionBtn.addEventListener('click', startQuiz);
            window.addEventListener('resize', resizeCanvas);
            updateHighlightAndDisplay(1);
        }

        // --- Master Initializer ---
        const runMasterInit = () => {
            window.scrollTo(0, 0); // Scroll to top on load
            app1Container.classList.remove('hidden'); // Ensure App 1 is visible by default
            app2Container.classList.add('hidden');   // Ensure App 2 is hidden by default
            app2Controls.classList.add('hidden'); // Hide App 2 controls on initial load
            initApp1();
            initApp2();
        };


        // Namespaced bridge for the onclick="..." strings embedded in the
        // HTML above (inline handlers always resolve via the global scope,
        // but these functions are declared inside this component's closure)
        // — namespaced (not bare window.playSection etc.) so a same-named
        // function from a different hybrid-wrapped app mounted alongside
        // this one can't silently overwrite it.
        window.__mnlApp = {
          playSection, playSingleItem, playMultiDigitAudio, checkAnswer, toggleGameMode, startApp,
        };

        runMasterInit();

    return () => {
      delete window.__mnlApp;
    };
  }, []);

  return (
    <>
      <style>{MNL_APP_CSS}</style>
      <div
        ref={containerRef}
        className="mnl-app-root bg-gray-100"
        dangerouslySetInnerHTML={{ __html: MNL_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
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
              <h2 className="text-xl font-bold text-gray-800">🔢 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
      )}
    </>
  );
}
