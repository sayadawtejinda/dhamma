import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Animal Sound Quiz" HTML app ──
// Same hybrid approach as ConsonantPracticeApp/BurmeseConsonantGameApp/
// MyanmarNumberLearningApp/MyanmarVowelsLearningApp: the original vanilla JS
// (DOM manipulation, Web Audio playback) is kept almost unchanged inside a
// React wrapper instead of being rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. The original page
// also toggled a `data-mode` attribute and font/background rule on
// `document.body` (shared by the whole SPA) — both are now scoped to this
// component's own root element/class instead, so switching Quiz/Learning
// mode here can't affect any other mounted app.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.

const AS_ROSTER_PATH = 'artifacts/animal-sound-app/public/data/roster';
const sanitizeAsKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const AS_APP_CSS = `
        /* Custom font for better Burmese display */
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap');
        
        :root {
            --primary-color: #3b82f6; /* Blue-500 */
            --secondary-color: #10b981; /* Emerald-500 */
            --quiz-color: #f97316; /* Orange-500 */
        }

        .animal-sound-app-root {
            font-family: 'Padauk', 'Inter', sans-serif;
            background-color: #f0f9ff; 
        }

        .animal-card {
            transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s, opacity 0.5s; 
            cursor: pointer;
            user-select: none;
            background: linear-gradient(145deg, #ffffff, #f3f4f6); 
            border: 2px solid #e5e7eb;
            opacity: 1; 
            display: block; 
        }

        .animal-card.is-playing {
            transform: scale(0.98);
            border-color: var(--secondary-color);
            background-color: #d1fae5; 
            animation: pulse-border 1.5s infinite;
        }
        
        /* Styles for Quiz Choices (Active during quiz) */
        .animal-card.quiz-choice {
            border-color: var(--quiz-color);
            display: block !important; 
        }

        /* Only hide non-choices when we are explicitly in Quiz Mode */
        .animal-sound-app-root[data-mode="quiz"] .animal-card:not(.quiz-choice) {
            display: none !important; 
        }

        /* Learning Mode (All are active) */
        .animal-sound-app-root:not([data-mode="quiz"]) .animal-card {
            opacity: 1;
            pointer-events: auto;
            border-color: #e5e7eb;
            display: block; 
        }

        .animal-card:hover:not(.quiz-choice, .is-playing) {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 15px 25px -5px rgba(59, 130, 246, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.05); 
            border-color: var(--primary-color);
        }

        .animal-card.correct-answer {
            background-color: #a7f3d0; 
            border-color: #059669; 
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(5, 150, 105, 0.6);
        }

        .animal-card.wrong-answer {
            background-color: #fee2e2; 
            border-color: #ef4444; 
            transform: scale(0.95);
        }

        @keyframes pulse-border {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .emoji-icon {
            font-size: 3.5rem; 
            line-height: 1;
            margin-bottom: 0.5rem;
        }

        /* Finish Line Flag Pattern */
        .finish-flag {
            background-image: repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), 
                              repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000);
            background-position: 0 0, 8px 8px;
            background-size: 16px 16px;
        }

        /* NEW: Pointer Animation */
        @keyframes point-up {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
        }
        .animate-point-up {
            animation: point-up 1.5s ease-in-out infinite;
        }
`;

const AS_APP_BODY_HTML = `

    <!-- Draggable Language Toggle Widget -->
    <div id="lang-toggle-widget" 
         class="fixed top-6 right-6 z-50 bg-white/90 backdrop-blur shadow-[0_5px_20px_rgba(0,0,0,0.2)] border-2 border-blue-400 hover:border-blue-500 rounded-full py-2 px-4 flex items-center justify-center cursor-grab select-none" 
         style="touch-action: none;">
        <span class="text-xl mr-2 pointer-events-none">🔤</span>
        <span id="lang-text" class="font-bold text-gray-800 text-sm pointer-events-none">မြန်မာ</span>
    </div>

    <!-- NEW: Pointing Hand -->
    <div id="pointer-hand" class="fixed top-[4.5rem] right-8 z-50 text-5xl opacity-0 transition-opacity duration-500 pointer-events-none animate-point-up drop-shadow-lg hidden">
        👆
    </div>

    <div id="app" class="max-w-7xl mx-auto">
        <header class="text-center mb-4 mt-8 sm:mt-0">
            <h1 class="text-5xl font-extrabold text-gray-800 tracking-tighter sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500 pb-2">
                Animal Sound Quiz
            </h1>
            <div class="mt-4 flex justify-center space-x-4">
                <button id="mode-toggle-btn" 
                        class="px-6 py-3 rounded-full font-bold shadow-md transition transform hover:scale-105"
                        style="background-color: var(--quiz-color); color: white;">
                    Switch to Quiz Mode
                </button>
            </div>
        </header>

        <div id="status-message" class="text-center mb-8 p-4 bg-yellow-100 text-yellow-800 rounded-lg shadow-md font-medium" role="alert">
            <div class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0011.5 3c-4.418 0-8 3.582-8 8s3.582 8 8 8a8.001 8.001 0 005.356-2H18a1 1 0 000-2h-3.644z"></path></svg>
                <span id="loading-text">Loading audio files. Please wait...</span>
            </div>
        </div>
        
        <!-- QUIZ PANEL -->
        <div id="quiz-panel" class="hidden text-center mb-8 p-6 rounded-xl shadow-xl border-t-4 border-orange-500 bg-white">
            <div id="score-display" class="text-2xl font-bold mb-4 text-orange-600">Score: 0 / 0</div>
            <h2 id="question-text" class="text-3xl font-bold text-gray-800 mb-2 min-h-[3rem] flex items-center justify-center"></h2> 
            
            <div id="english-translation" class="text-xl font-medium text-gray-500 mb-6 min-h-[1.5rem]"></div>

            <div class="flex flex-wrap justify-center items-center gap-6 mb-6">
                <!-- REPLAY BUTTON -->
                <button id="replay-sound-btn" 
                        title="အသံပြန်နားထောင်ရန်"
                        class="w-16 h-16 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full shadow-md transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                </button>
                
                <!-- START/NEXT QUESTION BUTTON -->
                <button id="ask-question-btn" 
                        title="နောက်မေးခွန်း / စတင်မည်"
                        class="w-20 h-20 flex items-center justify-center bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] hover:from-orange-500 hover:to-orange-600 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-10 h-10 ml-1">
                      <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- ROMAN TRANSLATION TOGGLE BUTTON -->
                <button id="toggle-english-btn" 
                        title="အင်္ဂလိပ်ဘာသာပြန် ကြည့်ရန်"
                        class="w-16 h-16 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full shadow-md transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                    </svg>
                </button>
            </div>

            <!-- Race Car Progress Bar -->
            <div class="w-full max-w-2xl mx-auto h-12 bg-gray-100 rounded-full relative overflow-hidden border-2 border-gray-300 shadow-inner mb-4">
                <!-- Start Line -->
                <div class="absolute left-0 top-0 bottom-0 w-4 bg-green-500"></div>
                <!-- Finish Line -->
                <div class="absolute right-0 top-0 bottom-0 w-12 border-l-4 border-gray-800 finish-flag"></div>
                <!-- Dashed Road Line -->
                <div class="absolute top-1/2 left-0 right-0 h-[2px] bg-dashed border-b-[3px] border-gray-300 border-dashed transform -translate-y-1/2 z-0"></div>
                <!-- The Car (Flipped using -scale-x-100 to face right, increased size to text-[3.5rem]) -->
                <div id="race-car" class="absolute top-1/2 transform -translate-y-1/2 -scale-x-100 text-[3.5rem] transition-all duration-700 ease-out z-10" style="left: 2%;">🏎️</div>
            </div>

            <div id="feedback-message" class="mt-4 text-xl font-semibold min-h-[1.5rem]"></div>
        </div>

        <div id="animal-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            <!-- Animal Cards will be injected here by JavaScript -->
        </div>
        
        <div id="error-message" class="hidden fixed inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
                <h3 class="text-xl font-bold text-red-600 mb-3">An Error Occurred</h3>
                <p id="error-details" class="text-gray-700 text-sm mb-4">There was an issue loading an audio file.</p>
                <button onclick="window.__asApp.dismissError()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition">
                    OK
                </button>
            </div>
        </div>

    </div>

`;

export default function AnimalSoundApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, AS_ROSTER_PATH, sanitizeAsKey(studentName));
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
    const unsub = onSnapshot(collection(db, AS_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Animal Sound roster listen error:', e));
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
    // event listeners and DOM state; it's meant to run exactly once per
    // mount, not be torn down and redone.
    if (initializedRef.current) return;
    initializedRef.current = true;
    const rootEl = containerRef.current;
    const byId = (id) => rootEl.querySelector('#' + id);

        // Updated Animal Data (Burmese & Romanized Names)
        const ANIMAL_DATA = [
            { id: 0, name: "ဝံပုလွေ", romanName: "Won Pu Lwe", soundStart: 0.00, soundDuration: 29.00, emoji: "🐺", nameStart: 0.00 },
            { id: 1, name: "ဝေလငါး", romanName: "Wai La Nga", soundStart: 29.00, soundDuration: 53.00, emoji: "🐳", nameStart: 1.00 },
            { id: 2, name: "ကျား", romanName: "Kyar", soundStart: 82.00, soundDuration: 66.00, emoji: "🐅", nameStart: 2.00 },
            { id: 3, name: "ငန်း", romanName: "Ngan", soundStart: 148.00, soundDuration: 4.00, emoji: "🦢", nameStart: 3.00 },
            { id: 4, name: "မြွေ", romanName: "Hmwe", soundStart: 152.00, soundDuration: 16.00, emoji: "🐍", nameStart: 4.00 },
            { id: 5, name: "သိုး", romanName: "Thoe", soundStart: 168.00, soundDuration: 9.00, emoji: "🐑", nameStart: 5.00 },
            { id: 6, name: "ယုန်", romanName: "Yone", soundStart: 177.00, soundDuration: 18.00, emoji: "🐇", nameStart: 6.00 },
            { id: 7, name: "ချိုးဖြူ", romanName: "Choe Phyu", soundStart: 195.00, soundDuration: 4.00, emoji: "🕊️", nameStart: 7.00 }, 
            { id: 8, name: "ဝက်", romanName: "Wet", soundStart: 199.00, soundDuration: 1.00, emoji: "🐷", nameStart: 8.00 },
            { id: 9, name: "ဥဒေါင်း", romanName: "U Daung", soundStart: 200.00, soundDuration: 1.00, emoji: "🦚", nameStart: 9.00 },
            { id: 10, name: "ကြက်တူရွေး", romanName: "Kyet Tu Yway", soundStart: 201.00, soundDuration: 22.00, emoji: "🦜", nameStart: 10.00 },
            { id: 11, name: "နွားထီး", romanName: "Nwar Htee", soundStart: 223.00, soundDuration: 3.00, emoji: "🐂", nameStart: 11.00 },
            { id: 12, name: "ဇီးကွက်", romanName: "Zee Kwet", soundStart: 226.00, soundDuration: 16.00, emoji: "🦉", nameStart: 12.00 },
            { id: 13, name: "မျောက်", romanName: "Myauk", soundStart: 242.00, soundDuration: 59.00, emoji: "🐒", nameStart: 13.00 },
            { id: 14, name: "ခြင်္သေ့", romanName: "Chin Theit", soundStart: 301.00, soundDuration: 10.00, emoji: "🦁", nameStart: 14.00 },
            { id: 15, name: "မြေခွေး", romanName: "Myay Khway", soundStart: 311.00, soundDuration: 2.00, emoji: "🦊", nameStart: 15.00 },
            { id: 16, name: "မြင်း", romanName: "Myin", soundStart: 313.00, soundDuration: 3.00, emoji: "🐎", nameStart: 16.00 },
            { id: 17, name: "ဆိတ်", romanName: "Sate", soundStart: 316.00, soundDuration: 43.00, emoji: "🐐", nameStart: 17.00 },
            { id: 18, name: "ကျိုင်းကောင်", romanName: "Kyaing Kaung", soundStart: 359.00, soundDuration: 18.00, emoji: "🦗", nameStart: 18.00 }, 
            { id: 19, name: "ဘဲငန်း", romanName: "Bae Ngan", soundStart: 377.00, soundDuration: 16.00, emoji: "🦢", nameStart: 19.00 },
            { id: 20, name: "သစ်ကုလားအုတ်", romanName: "Thit Ka Lar Oak", soundStart: 393.00, soundDuration: 14.00, emoji: "🦒", nameStart: 20.00 },
            { id: 21, name: "ဖား", romanName: "Phar", soundStart: 407.00, soundDuration: 54.00, emoji: "🐸", nameStart: 21.00 },
            { id: 22, name: "ဆင်", romanName: "Sin", soundStart: 461.00, soundDuration: 2.00, emoji: "🐘", nameStart: 22.00 },
            { id: 23, name: "လင်းယုန်", romanName: "Lin Yone", soundStart: 463.00, soundDuration: 3.00, emoji: "🦅", nameStart: 23.00 },
            { id: 24, name: "ဘဲ", romanName: "Bae", soundStart: 466.00, soundDuration: 4.00, emoji: "🦆", nameStart: 24.00 },
            { id: 25, name: "မြည်း", romanName: "Myee", soundStart: 470.00, soundDuration: 15.00, emoji: "🐴", nameStart: 25.00 },
            { id: 26, name: "ခွေး", romanName: "Khway", soundStart: 485.00, soundDuration: 3.00, emoji: "🐕", nameStart: 26.00 },
            { id: 27, name: "သမင်", romanName: "Tha Min", soundStart: 488.00, soundDuration: 48.00, emoji: "🦌", nameStart: 27.00 },
            { id: 28, name: "ကျီးကန်း", romanName: "Kyee Kan", soundStart: 536.00, soundDuration: 49.00, emoji: "🐦‍⬛", nameStart: 28.00 },
            { id: 29, name: "နှံကောင်", romanName: "Hnan Kaung", soundStart: 585.00, soundDuration: 11.00, emoji: "🦗", nameStart: 29.00 }, 
            { id: 30, name: "နွားမ", romanName: "Nwar Ma", soundStart: 596.00, soundDuration: 3.00, emoji: "🐄", nameStart: 30.00 },
            { id: 31, name: "ပျား", romanName: "Pyar", soundStart: 599.00, soundDuration: 41.00, emoji: "🐝", nameStart: 31.00 },
            { id: 32, name: "ကြောင်", romanName: "Kyaung", soundStart: 640.00, soundDuration: 1.00, emoji: "🐈", nameStart: 32.00 },
            { id: 33, name: "ဝက်ဝံ", romanName: "Wet Wun", soundStart: 641.00, soundDuration: 10.00, emoji: "🐻", nameStart: 33.00 },
            { id: 34, name: "လင်းနို့", romanName: "Lin Noht", soundStart: 651.00, soundDuration: 56.00, emoji: "🦇", nameStart: 34.00 }, 
        ];

        // --- QUIZ QUESTIONS DATA STRUCTURE WITH ROMANIZED TRANSLATIONS ---
        const QUIZ_QUESTIONS = [
            { id: 1, text: "ရေထဲမှာနေတဲ့ အကောင်ကို ရှာဘာ။", romanText: "Yay Htae Mhar Nay Tae A Kaung Ko Shar Par.", englishText: "Find the animal that lives in water.", audioStart: 0.00, type: 'CATEGORY', correctIndices: [1, 3, 19, 21, 24] }, 
            { id: 2, text: "ဒီအသံက ဘာအကောင်ရဲ့ အသံလဲ?", romanText: "Di A Than Ka Bar A Kaung Yae A Than Lae?", englishText: "What animal makes this sound?", audioStart: 3.00, type: 'SOUND', correctIndices: [] }, 
            { id: 3, text: "ကုန်းပေါ်မှာနေတဲ့ အကောင်ကို ရှာဘာ။", romanText: "Kone Paw Mhar Nay Tae A Kaung Ko Shar Par.", englishText: "Find the animal that lives on land.", audioStart: 6.00, type: 'CATEGORY', correctIndices: [0, 2, 4, 5, 6, 8, 11, 13, 14, 15, 16, 17, 20, 22, 25, 26, 27, 30, 32, 33] },
            { id: 4, text: "ခြေထောက်လေးချောင်းရှိတဲ့ အကောင်ကို ရှာဘာ။", romanText: "Chay Htauk Lay Chaung Shi Tae A Kaung Ko Shar Par.", englishText: "Find the animal with four legs.", audioStart: 9.00, type: 'CATEGORY', correctIndices: [0, 2, 5, 6, 8, 11, 13, 14, 15, 16, 17, 20, 21, 22, 25, 26, 27, 30, 32, 33] },
            { id: 5, text: "ခြေထောက်နှစ်ချောင်းရှိတဲ့ အကောင်ကို ရှာဘာ။", romanText: "Chay Htauk Hnit Chaung Shi Tae A Kaung Ko Shar Par.", englishText: "Find the animal with two legs.", audioStart: 12.00, type: 'CATEGORY', correctIndices: [3, 7, 9, 10, 12, 19, 23, 24, 28] },
            { id: 6, text: "ခြေထောက်မရှိတဲ့ အကောင်ကို ရှာပါ။", romanText: "Chay Htauk Ma Shi Tae A Kaung Ko Shar Par.", englishText: "Find the animal with no legs.", audioStart: 15.00, type: 'CATEGORY', correctIndices: [1, 4] },
            { id: 7, text: "လေထဲမှာ ပျံနိုင်တဲ့အကောင်ကို ရှာပါ", romanText: "Lay Htae Mhar Pyan Naing Tae A Kaung Ko Shar Par.", englishText: "Find the animal that can fly in the air.", audioStart: 18.00, type: 'CATEGORY', correctIndices: [3, 7, 9, 10, 12, 19, 23, 24, 28, 29, 31, 34] },
            { id: 8, text: "ဘယ်အကောင်ကို ချစ်သလဲ", romanText: "Bae A Kaung Ko Chit Tha Lae?", englishText: "Which animal do you like?", audioStart: 21.00, type: 'CATEGORY', correctIndices: [5, 8, 11, 16, 17, 24, 25, 26, 30, 32] },
            { id: 9, text: "ဘယ်အကောင်ကို ကြောက်သလဲ", romanText: "Bae A Kaung Ko Kyauk Tha Lae?", englishText: "Which animal are you afraid of?", audioStart: 24.00, type: 'CATEGORY', correctIndices: [0, 2, 4, 14, 33] },
            { id: 10, text: "ဘယ်အကောင် လိုချင်သလဲ", romanText: "Bae A Kaung Lo Chin Tha Lae?", englishText: "Which animal do you want as a pet?", audioStart: 27.00, type: 'CATEGORY', correctIndices: [5, 8, 11, 16, 17, 24, 25, 26, 30, 32] },
            { id: 11, text: "အသားစားတဲ့ အကောင်ကို ရှာပါ။", romanText: "A Thar Sar Tae A Kaung Ko Shar Par.", englishText: "Find the meat-eating animal (carnivore).", audioStart: 30.00, type: 'CATEGORY', correctIndices: [0, 2, 14] },
            { id: 12, text: "မြက်စားတဲ့အကောင်ကို ရှာပါ", romanText: "Myet Sar Tae A Kaung Ko Shar Par.", englishText: "Find the grass-eating animal (herbivore).", audioStart: 33.00, type: 'CATEGORY', correctIndices: [5, 6, 11, 16, 17, 20, 22, 25, 27, 30] },
            { id: 13, text: "ဘယ်အကောင်က ပိုကြီးသလဲ?", romanText: "Bae A Kaung Ka Po Gyi Tha Lae?", englishText: "Which animal is bigger?", audioStart: 36.00, type: 'CATEGORY', correctIndices: [1, 2, 11, 14, 16, 20, 22, 23, 30] },
            { id: 14, text: "ဘယ်အကောင်က ပိုငယ်သလဲ?", romanText: "Bae A Kaung Ka Po Nge Tha Lae?", englishText: "Which animal is smaller?", audioStart: 39.00, type: 'CATEGORY', correctIndices: [6, 12, 15, 18, 21, 29, 31, 34] },
            { id: 15, text: "ဘယ်အကောင်က အဖြူရောင်လဲ?", romanText: "Bae A Kaung Ka A Phyu Yaung Lae?", englishText: "Which animal is white?", audioStart: 42.00, type: 'CATEGORY', correctIndices: [5, 7] },
            { id: 16, text: "ဘယ်အကောင်က အစိမ်းရောင်လဲ?", romanText: "Bae A Kaung Ka A Sein Yaung Lae?", englishText: "Which animal is green?", audioStart: 45.00, type: 'CATEGORY', correctIndices: [4, 10, 18, 21] },
            { id: 17, text: "ဘယ်အကောင်က အဝါရောင်လဲ?", romanText: "Bae A Kaung Ka A War Yaung Lae?", englishText: "Which animal is yellow?", audioStart: 48.00, type: 'CATEGORY', correctIndices: [10, 14, 20] }, 
            { id: 18, text: "ဘယ်အကောင်က အိမ်မွေးတိရစ္ဆာန်လဲ", romanText: "Bae A Kaung Ka Eain Mway Ti Rit San Lae?", englishText: "Which animal is a pet?", audioStart: 51.00, type: 'CATEGORY', correctIndices: [5, 8, 11, 16, 17, 24, 25, 26, 30, 32] },
            { id: 19, text: "ဘယ်အကောင်က ခြံထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Chan Htae Mhar Nay Lae?", englishText: "Which animal lives on a farm?", audioStart: 54.00, type: 'CATEGORY', correctIndices: [5, 8, 11, 17, 19, 24, 25, 30] },
            { id: 20, text: "ဘယ်အကောင်က တောထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Taw Htae Mhar Nay Lae?", englishText: "Which animal lives in the forest?", audioStart: 57.00, type: 'CATEGORY', correctIndices: [0, 2, 13, 14, 15, 20, 22, 27, 33] },
            { id: 21, text: "ဘယ်အကောင်က ငှက်သိုက်မှာ နေလဲ?", romanText: "Bae A Kaung Ka Hnget Thaik Mhar Nay Lae?", englishText: "Which animal lives in a nest?", audioStart: 60.00, type: 'CATEGORY', correctIndices: [3, 7, 9, 10, 12, 19, 23, 24, 28] },
            { id: 22, text: "ဘယ်အကောင်က မြင်းတင်းကုတ်မှာ နေလဲ?", romanText: "Bae A Kaung Ka Myin Tin Kote Mhar Nay Lae?", englishText: "Which animal lives in a stable?", audioStart: 63.00, type: 'CATEGORY', correctIndices: [16, 25] },
            { id: 23, text: "ဘယ်အကောင်က ဂူထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Gu Htae Mhar Nay Lae?", englishText: "Which animal lives in a cave?", audioStart: 66.00, type: 'CATEGORY', correctIndices: [0, 14, 33, 34] },
            { id: 24, text: "ဘယ်အကောင်က ငှက်သိုက်ထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Hnget Thaik Htae Mhar Nay Lae?", englishText: "Which animal lives in a bird's nest?", audioStart: 69.00, type: 'CATEGORY', correctIndices: [3, 7, 9, 10, 12, 19, 23, 24, 28] }, 
            { id: 25, text: "ဘယ်အကောင်က ပျားအုံထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Pyar Ohm Htae Mhar Nay Lae?", englishText: "Which animal lives in a beehive?", audioStart: 72.00, type: 'CATEGORY', correctIndices: [31] }, 
            { id: 26, text: "ဘယ်အကောင်က နွားတင်းကုတ်မှာ နေလဲ?", romanText: "Bae A Kaung Ka Nwar Tin Kote Mhar Nay Lae?", englishText: "Which animal lives in a cowshed?", audioStart: 75.00, type: 'CATEGORY', correctIndices: [11, 30] },
            { id: 27, text: "ဘယ်အကောင်က မြေတွင်းထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Myay Dwin Htae Mhar Nay Lae?", englishText: "Which animal lives in a burrow?", audioStart: 78.00, type: 'CATEGORY', correctIndices: [4, 6, 15] },
            { id: 28, text: "ဘယ်အကောင်က ပင်လယ်ထဲမှာ နေလဲ?", romanText: "Bae A Kaung Ka Pin Lal Htae Mhar Nay Lae?", englishText: "Which animal lives in the sea?", audioStart: 81.00, type: 'CATEGORY', correctIndices: [1] },
            { id: 29, text: "ဘယ်အကောင်က အတောင်ပံ ရှိလဲ?", romanText: "Bae A Kaung Ka A Taung Pan Shi Lae?", englishText: "Which animal has wings?", audioStart: 84.00, type: 'CATEGORY', correctIndices: [3, 7, 9, 10, 12, 19, 23, 24, 28, 31, 34] }, 
            { id: 30, text: "ဘယ်အကောင်က လည်ပင်းရှည်လဲ?", romanText: "Bae A Kaung Ka Lall Pyin Shay Lae?", englishText: "Which animal has a long neck?", audioStart: 87.00, type: 'CATEGORY', correctIndices: [20] }, 
        ];

        // Audio File URLs
        const NAME_AUDIO_URL = "https://raw.githubusercontent.com/nathantun93/bell/main/animals.mp3";
        const SOUND_AUDIO_URL = "https://raw.githubusercontent.com/nathantun93/bell/main/animal-sound.mp3"; 
        const QUIZ_AUDIO_URL = "https://raw.githubusercontent.com/nathantun93/bell/main/ဘယ်အကောင်လဲ.mp3"; 
        
        // Audio Durations 
        const NAME_DURATION = 1.0; 
        const QUIZ_PROMPT_DURATION = 3.0; 
        const MAX_QUIZ_SOUND_DURATION = 3.0; 

        let audioContext;
        let nameAudioBuffer;
        let soundAudioBuffer;
        let quizAudioBuffer;

        let isPlaying = false;
        let currentSource = null;

        // Language Toggle State
        let displayLang = 'my'; // 'my' for Myanmar, 'en' for Romanized Myanmar

        // Quiz State Variables
        let isQuizMode = false;
        let currentQuestion = null; 
        let correctAnimalIndex = -1; 
        let quizChoices = []; 
        let score = 0;
        let totalQuestionsAsked = 0;
        let questionCounter = 0; 
        let isTranslationVisible = false; 

        const statusElement = byId('status-message');
        const gridElement = byId('animal-grid');
        const errorElement = byId('error-message');
        const errorDetailsElement = byId('error-details');
        const modeToggleBtn = byId('mode-toggle-btn');
        const quizPanel = byId('quiz-panel');
        const askQuestionBtn = byId('ask-question-btn');
        const replaySoundBtn = byId('replay-sound-btn');
        const toggleEnglishBtn = byId('toggle-english-btn'); 
        const englishTranslationElement = byId('english-translation'); 
        const scoreDisplayElement = byId('score-display');
        const feedbackMessageElement = byId('feedback-message');
        const questionTextElement = byId('question-text');
        const bodyElement = rootEl;

        // --- LANGUAGE TOGGLE & DRAG LOGIC ---
        const langWidget = byId('lang-toggle-widget');
        const langTextSpan = byId('lang-text');
        let isDraggingWidget = false;
        let dragStartX, dragStartY;
        let initialLeft, initialTop;
        let widgetHasMoved = false;

        function updateLanguageUI() {
            // Update widget text
            langTextSpan.textContent = displayLang === 'my' ? 'မြန်မာ' : 'Roman';

            // Update animal cards
            ANIMAL_DATA.forEach((animal, index) => {
                const nameP = rootEl.querySelector(`#animal-${index} p`);
                if (nameP) {
                    nameP.textContent = displayLang === 'my' ? animal.name : animal.romanName;
                }
            });

            // Update current quiz question if in quiz mode
            if (isQuizMode && currentQuestion) {
                questionTextElement.textContent = displayLang === 'my' ? currentQuestion.text : currentQuestion.romanText;
            }
        }

        function handleLangToggle() {
            displayLang = displayLang === 'my' ? 'en' : 'my';
            updateLanguageUI();
            
            // NEW: Hide pointer if clicked
            const pointer = byId('pointer-hand');
            if (pointer && !pointer.classList.contains('opacity-0')) {
                pointer.classList.add('opacity-0');
                setTimeout(() => pointer.classList.add('hidden'), 500);
            }
        }

        // Pointer Events for robust drag and drop
        langWidget.addEventListener('pointerdown', (e) => {
            isDraggingWidget = true;
            widgetHasMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = langWidget.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            langWidget.style.right = 'auto'; // Clear 'right' property to allow left/top positioning
            langWidget.style.left = initialLeft + 'px';
            langWidget.style.top = initialTop + 'px';
            
            langWidget.setPointerCapture(e.pointerId);
            langWidget.classList.add('cursor-grabbing');
            langWidget.classList.remove('cursor-grab');
        });

        langWidget.addEventListener('pointermove', (e) => {
            if (!isDraggingWidget) return;
            
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                widgetHasMoved = true;
            }
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            
            // Keep within window bounds
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - langWidget.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - langWidget.offsetHeight));

            langWidget.style.left = newLeft + 'px';
            langWidget.style.top = newTop + 'px';
        });

        langWidget.addEventListener('pointerup', (e) => {
            if (!isDraggingWidget) return;
            isDraggingWidget = false;
            langWidget.releasePointerCapture(e.pointerId);
            langWidget.classList.remove('cursor-grabbing');
            langWidget.classList.add('cursor-grab');
            
            if (!widgetHasMoved) {
                handleLangToggle(); // Treat as a click if it wasn't dragged
            }
        });


        // --- RACE CAR LOGIC ---
        function updateRaceCarProgress() {
            const car = byId('race-car');
            const POINTS_PER_LAP = 30; // Changed from 10 to 30
            
            if (score === 0) {
                car.style.left = '2%';
                return;
            }

            let remainder = score % POINTS_PER_LAP;
            
            if (score > 0 && remainder === 0) {
                // Hit the finish line! (30, 60, 90...)
                car.style.left = '85%'; 
                
                // Reset to start after a delay for the next lap
                setTimeout(() => {
                    car.style.transition = 'none';
                    car.style.left = '2%';
                    // Re-enable transition
                    setTimeout(() => { car.style.transition = 'all 0.7s ease-out'; }, 50);
                }, 2500); 

            } else {
                // Move forward incrementally (2% to 85%)
                // 83% total distance / 30 steps = ~2.766% per step
                let progressPercentage = 2 + (remainder * 2.766); 
                car.style.left = `${progressPercentage}%`;
            }
        }

        // Utility: Array shuffling function
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // Utility: Get N unique random indices
        function getUniqueRandomIndices(count, pool, excludeIndices = []) {
            const indices = [];
            const availablePool = pool.filter(idx => !excludeIndices.includes(idx));
            
            if (availablePool.length < count) {
                return availablePool;
            }

            const shuffledPool = shuffle([...availablePool]);
            return shuffledPool.slice(0, count);
        }

        // Function to show custom error message
        function showCustomError(message) {
            errorDetailsElement.textContent = message;
            errorElement.classList.remove('hidden');
        }

        // Audio Buffer Load/Decode Function
        async function loadAudio(url, type) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
                return await audioContext.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.error(`Error loading ${type} audio:`, error);
                showCustomError(`Failed to load ${type} audio file. (${error.message})`);
                throw error;
            }
        }
        
        // Function to stop current playback completely
        function stopCurrentPlayback() {
            if (currentSource) {
                currentSource.stop();
                currentSource = null;
            }
            isPlaying = false;
            rootEl.querySelectorAll('.animal-card.is-playing').forEach(card => {
                card.classList.remove('is-playing');
            });
        }

        // Function to play a segment of an audio buffer (With Audio Interruption Fix)
        function playSegment(buffer, startTime, duration, onEndedCallback) {
            if (currentSource) {
                currentSource.stop();
                currentSource = null;
            }
             if (audioContext && audioContext.state === 'suspended') {
                 audioContext.resume().then(() => playSegment(buffer, startTime, duration, onEndedCallback));
                 return;
            }

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            source.start(0, startTime, duration); 

            let isStoppedManually = false;

            source.onended = (event) => {
                currentSource = null;
                // Only trigger the callback if the audio finished naturally (not interrupted)
                if (!isStoppedManually && onEndedCallback) {
                    onEndedCallback();
                }
            };

            // Override stop method to prevent chaining when interrupted
            const originalStop = source.stop.bind(source);
            source.stop = () => {
                isStoppedManually = true;
                originalStop();
            };

            currentSource = source;
            return source;
        }

        // Learning Mode: Play Name and Sound sequentially
        function playAnimal(animal, cardElement) {
            if (!nameAudioBuffer || !soundAudioBuffer) {
                console.log("Audio buffers not loaded.");
                return;
            }
            
            // Stop any currently playing animal sounds instantly
            stopCurrentPlayback();
            
            isPlaying = true; 
            cardElement.classList.add('is-playing');
            
            // Because playSegment handles interruptions properly, we can safely chain these
            playSegment(nameAudioBuffer, animal.nameStart, NAME_DURATION, () => {
                playSegment(soundAudioBuffer, animal.soundStart, animal.soundDuration, () => {
                    isPlaying = false;
                    cardElement.classList.remove('is-playing');
                });
            });
        }
        
        // --- QUIZ LOGIC ---

        function updateScoreDisplay() {
            scoreDisplayElement.textContent = `Score: ${score} / ${totalQuestionsAsked}`;
            updateRaceCarProgress(); // Move the car when score updates
        }
        
        function resetCardStyles() {
            rootEl.querySelectorAll('.animal-card').forEach(card => {
                card.classList.remove('correct-answer', 'wrong-answer', 'is-playing', 'quiz-choice');
                card.style.opacity = '';
                card.style.pointerEvents = '';
                card.style.display = ''; 
            });
        }
        
        // Function to display and read choices sequentially
        function readChoicesSequentially(choices, index, onSequenceEnd) {
            if (index < choices.length) {
                const animal = ANIMAL_DATA[choices[index]];
                const card = byId(`animal-${choices[index]}`);
                
                card.style.opacity = '1'; 
                card.classList.add('is-playing');

                playSegment(nameAudioBuffer, animal.nameStart, NAME_DURATION, () => {
                    card.classList.remove('is-playing');
                    setTimeout(() => {
                         readChoicesSequentially(choices, index + 1, onSequenceEnd);
                    }, 200); 
                });
            } else {
                choices.forEach(idx => {
                    byId(`animal-${idx}`).style.pointerEvents = 'auto';
                });
                onSequenceEnd();
            }
        }

        // Function to determine the correct animal and decoys based on question type
        function determineChoices(question) {
            let correctIdx;
            let decoyIndices;
            const allAnimalIndices = ANIMAL_DATA.map(a => a.id);

            if (question.type === 'SOUND') {
                correctIdx = Math.floor(Math.random() * ANIMAL_DATA.length);
                decoyIndices = getUniqueRandomIndices(2, allAnimalIndices, [correctIdx]);
            } else {
                const correctPool = question.correctIndices;
                correctIdx = correctPool[Math.floor(Math.random() * correctPool.length)];
                const incorrectPool = allAnimalIndices.filter(idx => !correctPool.includes(idx));
                const numDecoys = Math.min(2, incorrectPool.length);
                decoyIndices = getUniqueRandomIndices(numDecoys, incorrectPool);
                
                if (decoyIndices.length < 2 && incorrectPool.length > 0) {
                     while (decoyIndices.length < 2) {
                        decoyIndices.push(incorrectPool[Math.floor(Math.random() * incorrectPool.length)]);
                     }
                     decoyIndices = [...new Set(decoyIndices)];
                } else if (incorrectPool.length === 0) {
                    decoyIndices = getUniqueRandomIndices(2, correctPool, [correctIdx]);
                }
            }
            const choiceIndices = shuffle([correctIdx, ...decoyIndices]);
            return { correctIdx, choiceIndices };
        }


        function askQuestion() {
            if (!quizAudioBuffer || !nameAudioBuffer || !soundAudioBuffer) {
                showCustomError("Audio files are still loading. Please wait.");
                return;
            }

            stopCurrentPlayback(); 
            resetCardStyles();
            feedbackMessageElement.textContent = '';
            askQuestionBtn.disabled = true;
            replaySoundBtn.disabled = true;
            toggleEnglishBtn.disabled = true;

            questionCounter++;
            let randomIndex;

            if (questionCounter % 3 === 0) {
                randomIndex = 1;
            } else {
                randomIndex = Math.floor(Math.random() * QUIZ_QUESTIONS.length);
            }
            
            currentQuestion = QUIZ_QUESTIONS[randomIndex];
            
            const { correctIdx, choiceIndices } = determineChoices(currentQuestion);
            correctAnimalIndex = correctIdx;
            quizChoices = choiceIndices;
            
            // Respect language mode for question text
            questionTextElement.textContent = displayLang === 'my' ? currentQuestion.text : currentQuestion.romanText;
            
            if (isTranslationVisible) {
                englishTranslationElement.textContent = currentQuestion.englishText;
            } else {
                englishTranslationElement.textContent = '';
            }

            totalQuestionsAsked++;
            updateScoreDisplay(); // Includes race car logic
            
            rootEl.querySelectorAll('.animal-card').forEach((card, index) => {
                if (quizChoices.includes(index)) {
                    card.classList.add('quiz-choice');
                    card.style.opacity = '0';
                    card.style.pointerEvents = 'none';
                } else {
                    card.classList.remove('quiz-choice'); 
                }
            });

            isPlaying = true;
            
            playSegment(quizAudioBuffer, currentQuestion.audioStart, QUIZ_PROMPT_DURATION, () => {
                toggleEnglishBtn.disabled = false; 
                
                if (currentQuestion.type === 'SOUND') {
                    const correctAnimal = ANIMAL_DATA[correctAnimalIndex];
                    const limitedSoundDuration = Math.min(correctAnimal.soundDuration, MAX_QUIZ_SOUND_DURATION);
                    
                    playSegment(soundAudioBuffer, correctAnimal.soundStart, limitedSoundDuration, () => {
                        replaySoundBtn.disabled = false; 
                        
                        readChoicesSequentially(quizChoices, 0, () => {
                            isPlaying = false;
                            feedbackMessageElement.classList.remove('text-red-500', 'text-green-600');
                            feedbackMessageElement.classList.add('text-gray-700');
                        });
                    });
                } else {
                    replaySoundBtn.disabled = true; 

                    readChoicesSequentially(quizChoices, 0, () => {
                        isPlaying = false;
                        feedbackMessageElement.classList.remove('text-red-500', 'text-green-600');
                        feedbackMessageElement.classList.add('text-gray-700');
                    });
                }
            });
        }

        function replaySound() {
            if (isQuizMode && currentQuestion && currentQuestion.type === 'SOUND' && correctAnimalIndex !== -1 && !isPlaying) {
                stopCurrentPlayback();
                
                const correctAnimal = ANIMAL_DATA[correctAnimalIndex];
                const limitedSoundDuration = Math.min(correctAnimal.soundDuration, MAX_QUIZ_SOUND_DURATION);
                
                isPlaying = true;
                replaySoundBtn.disabled = true; 
                askQuestionBtn.disabled = true; 
                toggleEnglishBtn.disabled = true;

                byId(`animal-${correctAnimalIndex}`).classList.add('is-playing');

                playSegment(soundAudioBuffer, correctAnimal.soundStart, limitedSoundDuration, () => {
                    byId(`animal-${correctAnimalIndex}`).classList.remove('is-playing');
                    isPlaying = false;
                    
                    const hasAnswered = feedbackMessageElement.textContent.length > 0;
                    if (!hasAnswered) {
                        replaySoundBtn.disabled = false;
                        toggleEnglishBtn.disabled = false; 
                    }
                });
            }
        }
        
        function toggleTranslation() {
            isTranslationVisible = !isTranslationVisible;
            if (isTranslationVisible && currentQuestion) {
                englishTranslationElement.textContent = currentQuestion.englishText;
                toggleEnglishBtn.classList.remove('bg-emerald-100', 'text-emerald-600');
                toggleEnglishBtn.classList.add('bg-emerald-500', 'text-white');
            } else {
                englishTranslationElement.textContent = '';
                toggleEnglishBtn.classList.remove('bg-emerald-500', 'text-white');
                toggleEnglishBtn.classList.add('bg-emerald-100', 'text-emerald-600');
            }
        }


        function checkAnswer(animalIndex, cardElement) {
            if (isPlaying || correctAnimalIndex === -1 || !cardElement.classList.contains('quiz-choice') || cardElement.style.pointerEvents === 'none') {
                return;
            }
            
            isPlaying = true; 
            askQuestionBtn.disabled = true; 
            replaySoundBtn.disabled = true; 
            toggleEnglishBtn.disabled = true;
            
            const isCorrect = (animalIndex === correctAnimalIndex);
            
            quizChoices.forEach(idx => {
                byId(`animal-${idx}`).style.pointerEvents = 'none';
            });

            if (isCorrect) {
                score++;
                cardElement.classList.add('correct-answer');
                
                const correctAnimal = ANIMAL_DATA[animalIndex];
                
                playSegment(nameAudioBuffer, correctAnimal.nameStart, NAME_DURATION, () => {
                    
                    feedbackMessageElement.textContent = displayLang === 'my' ? "အဖြေမှန်ပါတယ်။ တော်တယ်! 👍" : "Correct! Well done! 👍";
                    feedbackMessageElement.classList.remove('text-red-500');
                    feedbackMessageElement.classList.add('text-green-600');

                    // Auto-ask next question
                    setTimeout(() => {
                        isPlaying = false;
                        resetCardStyles(); 
                        feedbackMessageElement.textContent = ""; 
                        feedbackMessageElement.classList.remove('text-red-500', 'text-green-600');
                        askQuestion(); 
                    }, 2500); 

                });

            } else {
                cardElement.classList.add('wrong-answer');
                
                const correctName = displayLang === 'my' ? ANIMAL_DATA[correctAnimalIndex].name : ANIMAL_DATA[correctAnimalIndex].romanName;
                feedbackMessageElement.textContent = displayLang === 'my' 
                    ? `အဖြေမှားပါတယ်။ အဖြေမှန်က ${correctName} ပါ။ 😞` 
                    : `Wrong. The correct answer was ${correctName}. 😞`;
                
                feedbackMessageElement.classList.remove('text-green-600');
                feedbackMessageElement.classList.add('text-red-500');

                const correctCard = byId(`animal-${correctAnimalIndex}`);
                if (correctCard) {
                    setTimeout(() => correctCard.classList.add('correct-answer'), 1000);
                }

                // Auto-ask next question EVEN IF WRONG (after feedback delay)
                setTimeout(() => {
                    isPlaying = false;
                    resetCardStyles();
                    feedbackMessageElement.textContent = ""; 
                    feedbackMessageElement.classList.remove('text-red-500', 'text-green-600');
                    askQuestion(); // Automatically proceed to next question
                }, 3500); 
            }

            updateScoreDisplay();
        }

        // --- MODE TOGGLE LOGIC ---

        function toggleMode() {
            isQuizMode = !isQuizMode;
            
            stopCurrentPlayback();
            resetCardStyles();
            askQuestionBtn.disabled = true;
            replaySoundBtn.disabled = true;
            toggleEnglishBtn.disabled = true;
            englishTranslationElement.textContent = '';
            isTranslationVisible = false; 

            if (isQuizMode) {
                bodyElement.setAttribute('data-mode', 'quiz');
                quizPanel.classList.remove('hidden');

                if (!quizAudioBuffer) {
                     byId('loading-text').textContent = "Loading Quiz audio for 30 questions...";
                     statusElement.classList.remove('hidden');
                     
                     loadAudio(QUIZ_AUDIO_URL, 'Quiz').then(buffer => {
                         quizAudioBuffer = buffer;
                         statusElement.classList.add('hidden');
                         modeToggleBtn.textContent = "Switch to Learning Mode";
                         modeToggleBtn.style.backgroundColor = 'var(--primary-color)';
                         updateScoreDisplay();
                         askQuestionBtn.disabled = false; 
                     }).catch(error => {
                        isQuizMode = false; 
                        bodyElement.setAttribute('data-mode', 'learn'); 
                        quizPanel.classList.add('hidden'); 
                        modeToggleBtn.textContent = "Switch to Quiz Mode"; 
                        modeToggleBtn.style.backgroundColor = 'var(--quiz-color)'; 
                        statusElement.classList.add('hidden'); 
                     });

                } else {
                    modeToggleBtn.textContent = "Switch to Learning Mode";
                    modeToggleBtn.style.backgroundColor = 'var(--primary-color)';
                    updateScoreDisplay();
                    askQuestionBtn.disabled = false; 
                }

            } else {
                bodyElement.setAttribute('data-mode', 'learn');
                quizPanel.classList.add('hidden');
                modeToggleBtn.textContent = "Switch to Quiz Mode";
                modeToggleBtn.style.backgroundColor = 'var(--quiz-color)';
                correctAnimalIndex = -1;
                currentQuestion = null;
            }

            setupEventListeners();
        }

        // --- UI Initialization and Listeners ---

        function setupEventListeners() {
            ANIMAL_DATA.forEach((animal, index) => {
                const card = byId(`animal-${index}`);
                if (card) {
                    const newCard = card.cloneNode(true);
                    card.replaceWith(newCard);
                }
            });

            ANIMAL_DATA.forEach((animal, index) => {
                const card = byId(`animal-${index}`);
                
                if (card) {
                    if (isQuizMode) {
                        card.onclick = () => checkAnswer(index, card);
                    } else {
                        card.onclick = () => playAnimal(animal, card);
                    }
                }
            });
            
            if (nameAudioBuffer && soundAudioBuffer) {
                askQuestionBtn.onclick = () => {
                    if (totalQuestionsAsked > 0 && !isPlaying && askQuestionBtn.disabled === false) {
                        resetCardStyles();
                    }
                    askQuestion();
                };
                replaySoundBtn.onclick = replaySound; 
                toggleEnglishBtn.onclick = toggleTranslation; 
            }
        }

        function initializeUI() {
            gridElement.innerHTML = ANIMAL_DATA.map((animal, index) => `
                <div id="animal-${index}" 
                     class="animal-card p-4 sm:p-6 text-center rounded-xl shadow-lg border-2 border-transparent transition-all duration-300 transform" 
                     data-index="${index}"
                     role="button"
                     tabindex="0"
                     aria-label="Click to hear ${animal.name}">
                    <div class="emoji-icon mb-2">${animal.emoji}</div>
                    <p class="text-xl sm:text-2xl font-semibold text-gray-700">${displayLang === 'my' ? animal.name : animal.romanName}</p>
                </div>
            `).join('');

            setupEventListeners();
            modeToggleBtn.onclick = toggleMode;
            statusElement.classList.add('hidden');
            updateScoreDisplay();
        }

        async function initApp() {
            try {
                byId('loading-text').textContent = "Loading animal names audio...";
                nameAudioBuffer = await loadAudio(NAME_AUDIO_URL, 'Name');
                
                byId('loading-text').textContent = "Loading animal sounds audio...";
                soundAudioBuffer = await loadAudio(SOUND_AUDIO_URL, 'Sound');

                initializeUI();
                console.log("All learning audio buffers loaded successfully.");

                // NEW: Show pointing hand after a short delay
                setTimeout(() => {
                    const pointer = byId('pointer-hand');
                    if (pointer) {
                        pointer.classList.remove('hidden');
                        setTimeout(() => pointer.classList.remove('opacity-0'), 50);
                        
                        // Hide automatically after 6 seconds
                        setTimeout(() => {
                            if (!pointer.classList.contains('opacity-0')) {
                                pointer.classList.add('opacity-0');
                                setTimeout(() => pointer.classList.add('hidden'), 500);
                            }
                        }, 6000);
                    }
                }, 1500);

            } catch (error) {
                byId('loading-text').textContent = "Error loading audio files. Please refresh the page.";
            }
        }


        function dismissError() {
            byId('error-message').classList.add('hidden');
        }

        // Namespaced bridge for the onclick="..." string embedded in the
        // HTML above (inline handlers always resolve via the global scope,
        // but this function is declared inside this component's closure) —
        // namespaced (not a bare window.dismissError) so a same-named
        // function from a different hybrid-wrapped app mounted alongside
        // this one can't silently overwrite it.
        window.__asApp = { dismissError };

        initApp();


    return () => {
      delete window.__asApp;
    };
  }, []);

  return (
    <>
      <style>{AS_APP_CSS}</style>
      <div
        ref={containerRef}
        data-mode="learn"
        className="animal-sound-app-root min-h-screen p-4 sm:p-8"
        dangerouslySetInnerHTML={{ __html: AS_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-16 left-3 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🐾 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
