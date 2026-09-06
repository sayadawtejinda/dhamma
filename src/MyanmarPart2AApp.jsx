import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "အခန်း ၁၅ မှ ၂၈ ဝေါဟာရလေ့ကျင့်ခန်း"
// (Myanmar Part 2A) HTML app ──
// Same hybrid approach as the other ported apps: the original vanilla JS
// is kept almost unchanged inside a React wrapper. document.getElementById
// /querySelector(All) calls were changed to a rootEl-scoped `byId` helper /
// rootEl.querySelectorAll(All) so this app only ever touches its own
// container. 5 onclick="..." string attributes now call
// window.__mp2aApp.<fn>(...) instead of bare globals — 4 static ones in
// the body markup, plus one built dynamically inside a template literal
// (the per-syllable "tap to hear" spans generated at runtime). window.onload
// was converted to an immediately-invoked function since the DOM is
// already present by the time this effect runs. The original CSS's bare
// `body {...}` rule was rescoped to .p2a-app-root. A second, nested
// `<style>` block inside the original body (a fade-in keyframe for the
// start overlay) is left as-is -- <style> tags injected via
// dangerouslySetInnerHTML are still parsed and applied by the browser.
// Confetti is this app's own CSS/DOM animation (not the external
// canvas-confetti library), so no extra dependency is needed.
//
// This app has no data persistence of its own; the shared Firebase
// instance from ./firebase.js is reused for the added online-roster
// feature below.

const P2A_ROSTER_PATH = 'artifacts/myanmar-part2a-app/public/data/roster';
const sanitizeP2aKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const P2A_APP_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&family=Gaegu:wght@700&display=swap');
        
        :root {
            --bg-start: #d0e8ff;
            --bg-end: #f0f7ff;
            --primary-blue: #2563eb;
            --primary-blue-dark: #1e40af;
            --accent-green: #10b981;
            --accent-green-dark: #047857;
            --accent-yellow: #f59e0b;
            --accent-pink: #ec4899;
            --text-dark: #1e293b;
            --text-light: #475569;
            --card-bg: #ffffff;
            --card-border: #93c5fd;
        }

        .p2a-app-root {
            font-family: 'Padauk', 'Inter', sans-serif;
            background: linear-gradient(135deg, var(--bg-start) 0%, var(--bg-end) 100%);
            min-height: 100vh;
            color: var(--text-dark);
        }
        
        /* Playful font for titles */
        .font-gaegu {
            font-family: 'Gaegu', cursive;
        }

        .container-card {
            max-width: 900px;
            min-height: 550px;
            background-color: var(--card-bg); 
            border: 4px solid var(--card-border); 
            box-shadow: 0 20px 40px rgba(0, 80, 150, 0.15), 0 0 0 10px rgba(255, 255, 255, 0.5);
        }
        
        /* New Word Card Style */
        .word-card {
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
            cursor: pointer;
            user-select: none;
            border-radius: 1.25rem; /* 20px */
            border: 3px solid;
            border-bottom-width: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .word-card:hover {
            transform: translateY(-8px) rotate(-1deg);
            box-shadow: 0 18px 30px rgba(0, 80, 150, 0.15); 
        }
        .word-card:active {
            transform: translateY(-2px) scale(0.98) rotate(0deg);
        }
        .is-playing {
            transform: scale(1.08) rotate(2deg) !important; 
            box-shadow: 0 0 30px var(--accent-yellow) !important;
            filter: brightness(1.1);
            z-index: 10;
        }

        /* Upgraded Button Styles */
        .control-btn, .option-button, #start-btn, #next-button {
            transition: all 0.15s ease-out;
            border-radius: 1rem; /* 16px */
            font-weight: 700;
            text-shadow: 0 1px 1px rgba(0,0,0,0.1);
            border-bottom-width: 6px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .control-btn:hover, .option-button:hover:not(:disabled), #start-btn:hover, #next-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0,0,0,0.15);
        }
        .control-btn:active, .option-button:active:not(:disabled), #start-btn:active, #next-button:active {
            transform: translateY(1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            filter: brightness(0.95);
        }

        /* Quiz Specific Styles */
        .correct {
            background-color: #34d399 !important;
            border-color: #059669 !important;
            color: white !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            animation: correctPulse 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .incorrect {
            background-color: #f87171 !important;
            border-color: #dc2626 !important;
            color: white !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            animation: shake 0.5s ease-in-out;
        }
        @keyframes correctPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        /* NEW: Class for tap-down effect on touch devices */
        .is-tapped {
            transform: translateY(1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            filter: brightness(0.95);
        }

        /* Confetti Animation */
        .confetti {
            position: absolute; width: 15px; height: 15px; pointer-events: none;
            z-index: 50; font-size: 1.5rem; animation: fall linear forwards;
        }
        @keyframes fall {
            from { transform: translateY(-50px) rotate(0deg); opacity: 1; }
            to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        /* Navigation Arrows outside the card */
        .nav-arrow {
            position: fixed; top: 50%; transform: translateY(-50%);
            opacity: 0.7; transition: all 0.3s; z-index: 30;
            display: none; background-color: var(--primary-blue); color: white;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2); border-radius: 9999px;
            width: 4rem; height: 4rem;
        }
        .nav-arrow:hover {
            opacity: 1; transform: translateY(-50%) scale(1.1); background-color: var(--primary-blue-dark);
        }
        .nav-arrow:disabled {
            opacity: 0.1 !important; cursor: default; transform: translateY(-50%) scale(1.0);
        }
        @media (min-width: 1024px) {
            .nav-arrow { display: flex; align-items: center; justify-content: center; }
            #prev-chapter-btn { left: 50%; margin-left: -520px; }
            #next-chapter-btn { right: 50%; margin-right: -520px; }
        }
        
        /* Floating Image Animation */
        .float-enter {
            opacity: 0;
            transform: translateX(20px) rotate(5deg);
        }
        .float-enter-active {
            opacity: 1;
            transform: translateX(0) rotate(-3deg);
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
`;

const P2A_APP_BODY_HTML = `
    
    <!-- Audio elements for playback. Hidden from user. -->
    <audio id="vocab-audio"></audio>
    <audio id="pronunciation-audio"></audio>

    <div id="start-overlay" class="fixed inset-0 bg-sky-100/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div class="text-center p-8 bg-white rounded-3xl shadow-2xl border-4 border-blue-300 max-w-md transform transition-all duration-500 scale-95 opacity-0 animate-fade-in-up">
            
            <button id="start-btn" class="w-full px-8 py-4 bg-green-500 text-white font-bold text-2xl border-green-700">
                Start!
            </button>
        </div>
        <style>
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up { animation: fade-in-up 0.5s 0.2s ease-out forwards; }
        </style>
    </div>

    <div id="confetti-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-40"></div>
    
    <button id="prev-chapter-btn" onclick="window.__mp2aApp.changeChapter(-1)" class="nav-arrow" aria-label="အခန်းအဟောင်း">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
    </button>
    
    <div class="fixed top-6 right-6 flex space-x-3 z-50">
        <button id="list-mode-btn" class="control-btn p-3 bg-indigo-500 text-white border-indigo-700" title="စာလုံးများ အားလုံး ကြည့်ရန်">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
        </button>
        <button id="read-all-btn" class="control-btn p-3 bg-yellow-500 text-white border-yellow-700" title="စာလုံးများ ဆက်တိုက် ဖတ်ရန်">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.47-9.536a9 9 0 010 12.072M21 12a9 9 0 01-9 9m0-18a9 9 0 019 9m-9 9H5a2 2 0 01-2-2V7a2 2 0 012-2h7l4 4-4 4z"></path></svg>
        </button>
        <button id="quiz-mode-btn" class="control-btn p-3 bg-gray-200 text-gray-700 border-gray-400" title="ရွေးချယ်မှု ဂိမ်း ဆော့ရန်">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 002 2m-2-2a2 2 0 01-2 2m-2 7a2 2 0 012-2m-2 2a2 2 0 002 2m7-2a2 2 0 01-2 2m-2-2a2 2 0 00-2 2m2-7a2 2 0 00-2-2m2 2a2 2 0 012-2m0-4h.01M12 18h.01M7 6h.01M17 18h.01M5 12h.01M19 12h.01M5 6h.01M19 6h.01M19 18h.01"></path></svg>
        </button>
    </div>

    <!-- NEW: Floating Image Container (Positioned below the icons) -->
    <div id="floating-image-container" class="fixed top-24 right-6 z-40 hidden transition-all duration-300">
        <img id="floating-image" src="" alt="Vocabulary Image" class="w-28 h-28 md:w-40 md:h-40 object-cover bg-white rounded-xl shadow-2xl border-4 border-white transform rotate-3" />
    </div>

    <div id="app-container" class="hidden container-card w-full p-6 md:p-10 rounded-3xl relative mt-8 overflow-hidden">
        
        <h1 id="chapter-title" class="text-3xl md:text-4xl font-gaegu text-blue-700 mb-8 text-center mt-2 border-b-4 border-yellow-300 pb-4">...</h1>

        <div id="loading-area" class="text-center p-8">
            <p class="text-lg font-medium text-gray-700 mb-4">အသံဖိုင်ကို ဒေါင်းလုဒ်လုပ်နေပါသည်...</p>
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto"></div>
        </div>

        <div id="content-area" class="hidden">
            
            <div id="list-view" class="block">
                <div id="vocabulary-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"></div>
            </div>

            <div id="quiz-view" class="hidden text-center max-w-lg mx-auto">
                <p id="progress-display" class="mb-4 text-md font-semibold text-gray-500">
                    <span id="current-progress">1</span> / <span id="total-words-quiz"></span>
                </p>
                
                <div class="p-6 md:p-8 bg-pink-50 rounded-2xl shadow-lg mb-6 border-4 border-pink-300">
                    <!-- CHANGED: Replaced English word <p> with <img> tag for the quiz image -->
                    <img id="quiz-image" src="" alt="ဝေါဟာရ ပုံ" class="w-full h-48 md:h-64 object-contain rounded-lg mb-2 bg-gray-100" />
                    <!-- ADDED English word display -->
                    <p id="quiz-english-word" class="text-xl md:text-2xl font-bold text-pink-700 mt-3 mb-2 font-gaegu"></p>
                    <button id="replay-btn" onclick="window.__mp2aApp.replayAudioClue()" class="hidden mt-4 p-3 bg-yellow-400 text-yellow-900 rounded-full shadow-lg transition duration-200 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 transform hover:scale-110" title="အသံ ပြန်ဖွင့်ရန်">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                </div>

                <div id="quiz-area" class="grid grid-cols-2 gap-4"></div>

                <div id="status-message" class="mt-8 text-xl font-bold h-10 transform transition duration-300"></div>
                
                <button id="next-button" onclick="window.__mp2aApp.nextWord()" class="mt-6 w-full py-3 px-6 bg-blue-500 text-white font-bold border-blue-700 hidden">
                    နောက်တစ်လုံး &rarr;
                </button>
            </div>
            
            <p id="total-words-list" class="mt-8 text-center text-sm text-gray-500">
                စုစုပေါင်း စာလုံး: <span></span>
            </p>
        </div>
    </div>
    
    <button id="next-chapter-btn" onclick="window.__mp2aApp.changeChapter(1)" class="nav-arrow" aria-label="အခန်းအသစ်">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
    </button>


`;

export default function MyanmarPart2AApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, P2A_ROSTER_PATH, sanitizeP2aKey(studentName));
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
    const unsub = onSnapshot(collection(db, P2A_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Part 2A roster listen error:', e));
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

        // --- DATA ---
        const COMBINED_AUDIO_URL = "https://raw.githubusercontent.com/nathantun93/bell/main/Level-2.mp3";
        const pronunciationAudioUrl = 'https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းသရအသတ်_2s.mp3';
        const CHAPTERS = [
            {
                title: "အခန်း 15 (အင့်, အင်, အင်း၊ အဉ့်, အဉ်, အဉ်း)",
                startTime: 0.00,
                vocabulary: [
                    { burmese: "မြင်း", english: "Horse" }, { burmese: "ရှဉ့်", english: "Squirrel" }, { burmese: "ပင့်ကူ", english: "Spider" }, { burmese: "ကင်း", english: "Serow / Venom" }, { burmese: "ကျင်း", english: "Hole / Trench" }, { burmese: "လေ့ကျင့်ခန်း", english: "Exercise" }, { burmese: "နှင်း", english: "Snow / Dew" }, { burmese: "လေယာဉ်", english: "Airplane" }, { burmese: "အပင်", english: "Plant" }, { burmese: "ခြင်ဆေး", english: "Mosquito Repellent" }, { burmese: "ထမင်း", english: "Cooked Rice" }, { burmese: "ဟင်း", english: "Dish / Curry" }, { burmese: "အကင်", english: "Grilled Meat" }, { burmese: "အချဉ်", english: "Sour / Pickle" }, { burmese: "အတင်း", english: "Gossip / Firmly" }, { burmese: "ဝင်ငွေ", english: "Income" }, { burmese: "ယဉ်ကျေးမှု", english: "Culture" }, { burmese: "ပင်လယ်", english: "Sea" }, { burmese: "အထင်အမြင်", english: "Opinion" }, { burmese: "အထင်", english: "Guess / Thought" }, { burmese: "အမြင်", english: "View / Sight" }, { burmese: "အကျင့်", english: "Habit" }, { burmese: "စားပွဲခင်း", english: "Tablecloth" }, { burmese: "တင်ပါး", english: "Hips / Buttocks" }, { burmese: "ပင်စိမ်း", english: "Basil" }, { burmese: "ဆင်", english: "Elephant" }, { burmese: "တံစဉ်", english: "Sickle" }, { burmese: "တွင်းရေ", english: "Well Water" }, { burmese: "ခြင်", english: "Mosquito" }, { burmese: "ယင်", english: "Fly (Insect)" }, { burmese: "နေ့စဉ်", english: "Daily" }, { burmese: "သတင်းစာ", english: "Newspaper" }, { burmese: "စားချင့်စဖွယ်", english: "Delicious / Appetizing" }, { burmese: "နှင်းဆီပွင့်", english: "Rose Flower" }, { burmese: "လယ်ကွင်း", english: "Paddy Field" }, { burmese: "ငါးရှဉ့်", english: "Eel" }, { burmese: "မိခင် ဖခင်", english: "Parents" },  { burmese: "ရေအိုးစင်", english: "Water Pot Stand" }, { burmese: "သူငယ်ချင်း", english: "Friend" }, { burmese: "ဆီးနှင်း", english: "Sleet / Hail" }, { burmese: "ရှင်းလင်း", english: "Clear / Explain" }, { burmese: "ယဉ်ကျေး", english: "Polite" }, { burmese: "အချိုအချဉ်", english: "Sweet & Sour" }, { burmese: "အလေ့အကျင့်", english: "Practice / Habit" }, { burmese: "မြေပြင်", english: "Ground / Floor" }, { burmese: "စင်မြင့်", english: "Platform / Stage" }, { burmese: "ပျဉ်ပြား", english: "Wooden Plank" }, { burmese: "ထင်း", english: "Firewood" }
                ]
            },
            {
                title: "အခန်း 16 (အောင့်, အောင်, အောင်း)", startTime: 96.00, vocabulary: [
                    { burmese: "မောင်း", english: "Drive / Gong" }, { burmese: "ဖြောင့်မှန်", english: "Honest / Straight & Correct" }, { burmese: "လောင်းလှေ", english: "Dugout Canoe" }, { burmese: "ညီနောင်", english: "Siblings / Brothers" }, { burmese: "ချောင်းကလေး", english: "Small Stream" }, { burmese: "ပြောင်းပင်", english: "Maize/Corn Plant" }, { burmese: "အောင်မြင်", english: "Succeed / Successful" }, { burmese: "အရောင်အဆင်း", english: "Hue / Coloration" }, { burmese: "ပျော့ပျောင်း", english: "Soft / Flexible" }, { burmese: "သူရဲကောင်း", english: "Hero" }, { burmese: "စာသင်ကျောင်း", english: "School" }, { burmese: "ပြည်ထောင်စု", english: "Union" }, { burmese: "အပေါင်းအဖော်", english: "Friend / Companion" }, { burmese: "ဖြောင့်ဖြောင့်", english: "Straightly / Directly" }, { burmese: "နှောင်း", english: "Late / After" }, { burmese: "ပြောင်း", english: "Change / Corn" }, { burmese: "စောင်း", english: "Harp / Slanted" }, { burmese: "ကြောင်", english: "Cat" }, { burmese: "ပြောင်းဖူးပင်", english: "Corn Plant" }, { burmese: "ခေါင်းလောင်း", english: "Bell" }, { burmese: "ကျောင်း", english: "School / Monastery" }, { burmese: "ကျောင်းသား", english: "Male Student" }, { burmese: "ကျောင်းသူ", english: "Female Student" }, { burmese: "ကျောင်းစာ", english: "Schoolwork" }, { burmese: "မောင်လေး", english: "Younger Brother" }, { burmese: "ကောင်မလေး", english: "Girl" }, { burmese: "ကောင်လေး", english: "Boy" }, { burmese: "ဘောင်းဘီ", english: "Trousers / Pants" }, { burmese: "ပေါင်", english: "Thigh / Pound (weight)" }, { burmese: "ခေါင်း", english: "Head" }, { burmese: "ခေါင်းဆောင်", english: "Leader" }, { burmese: "အစောင့်", english: "Guard / Watchman" }, { burmese: "ထောင်", english: "Prison / Thousand" }, { burmese: "အကြောင်းအရာ", english: "Topic / Subject" }, { burmese: "စာကြောင်း", english: "Sentence" }, { burmese: "ဆောင်းပါး", english: "Article / Essay" }, { burmese: "ချောင်", english: "Corner / Nook" }, { burmese: "စောင်", english: "Blanket" }, { burmese: "ခေါင်မိုး", english: "Roof" }, { burmese: "မီးဖိုချောင်", english: "Kitchen" }, { burmese: "ဆောင်းရာသီ", english: "Winter" }, { burmese: "ကောင်းကင်", english: "Sky / Heaven" }, { burmese: "ချောင်း", english: "Stream / Cough" }, { burmese: "မြောင်း", english: "Ditch / Canal" }, { burmese: "တောင်", english: "Mountain / South" }, { burmese: "တောင်ကြား", english: "Valley" }, { burmese: "အလင်းရောင်", english: "Light / Illumination" }, { burmese: "တောင်ပံ", english: "Wing" }, { burmese: "အရောင်", english: "Color" }, { burmese: "အဝါရောင်", english: "Yellow" }, { burmese: "အညိုရောင်", english: "Brown" }, { burmese: "ခရမ်းရောင်", english: "Purple" }, { burmese: "အပြာရောင်", english: "Blue" }, { burmese: "အဖြူရောင်", english: "White" }, { burmese: "ပန်းရောင်", english: "Pink" }, { burmese: "အနီရောင်", english: "Red" }, { burmese: "အမဲရောင်", english: "Black" }, { burmese: "မီးခိုးရောင်", english: "Gray" }, { burmese: "ဘောင်းဘီအပြာရောင်", english: "Blue Trousers" }, { burmese: "အပြာရောင်ဘောင်းဘီ", english: "Blue Trousers" }
                ]
            },
            {
                title: "အခန်း 17 (အိုင့်, အိုင်, အိုင်း)", startTime: 216.00, vocabulary: [
                    { burmese: "ဈေးဆိုင်", english: "Shop / Store" }, { burmese: "ထမင်းဆိုင်", english: "Restaurant / Rice Shop" }, { burmese: "ထိုင်းနိုင်ငံ", english: "Thailand" }, { burmese: "ကုလားထိုင်", english: "Chair" }, { burmese: "နိုင်ငံ", english: "Country / Nation" }, { burmese: "နိုင်ငံသား", english: "Citizen / National" }, { burmese: "နိုင်ငံရေး", english: "Politics" }, { burmese: "နိုင်ငံခြား", english: "Foreign Country / Abroad" }, { burmese: "နိုင်ငံခြားသား", english: "Foreigner / Alien" }, { burmese: "ပိုင်း", english: "piece, part, during" }, { burmese: "နေ့လယ်ပိုင်း", english: "Afternoon" }, { burmese: "ညနေပိုင်း", english: "Evening" }, { burmese: "ညပိုင်း", english: "Night / Nighttime" }, { burmese: "ဆေးဆိုင်", english: "Pharmacy / Drug Store" }, { burmese: "ကော်ဖီဆိုင်", english: "Coffee Shop / Cafe" }, { burmese: "အအေးဆိုင်", english: "Drink Shop / Beverage Stall" }, { burmese: "အသီးဆိုင်", english: "Fruit Stall / Shop" }, { burmese: "ပြိုင်ပွဲ", english: "Competition / Contest" }, { burmese: "မွှေးကြိုင်", english: "Fragrant / Aromatic" }, { burmese: "ဗိုင်းငင်", english: "Spin (thread)" }, { burmese: "ရေအိုင်", english: "Pond / Puddle" }, { burmese: "တိုင်းရင်းသား", english: "Ethnic Group / Indigenous People" }, { burmese: "ယှဉ်ပြိုင်", english: "Compete" }, { burmese: "ကူညီရိုင်းပင်း", english: "Help and Support" }, { burmese: "နေထိုင်", english: "Live / Reside" }, { burmese: "လှောင်ချိုင့်", english: "Cage" }, { burmese: "ပန်းခိုင်", english: "Flower Cluster / Inflorescence" }, { burmese: "ဗျိုင်း", english: "Egret (bird)" }, { burmese: "ဖယောင်းတိုင်", english: "Candle" }, { burmese: "နှိုင်းယှဉ်", english: "Compare" }, { burmese: "တောမြိုင်", english: "Jungle / Dense Forest" }, { burmese: "လှိုင်း", english: "Wave" }, { burmese: "တိုင်းပြည်", english: "Country / State" }, { burmese: "ကြံ့ခိုင်", english: "Strong / Robust" }, { burmese: "နိုင်ငံတော်", english: "State / Realm (Government)" }, { burmese: "ဆိုင်းဝိုင်း", english: "Traditional Burmese Orchestra" }, { burmese: "မြိုင်မြိုင်ဆိုင်ဆိုင်", english: "Lively and Crowded" }, { burmese: "တံတိုင်း", english: "Wall / Fence" }, { burmese: "ကိုင်းပင်", english: "Plant (reeds)" }, { burmese: "ဒိုင်းဝင်", english: "Shield Bearer" }
                ]
            },
            {
                title: "အခန်း 18 (အိမ့်, အိမ်, အိမ်း၊ အိန့်, အိန်, အိန်း)", startTime: 296.00, vocabulary: [
                    { burmese: "အနိမ့်အမြင့်", english: "Height / Level" }, { burmese: "နေအိမ်", english: "Residence / Home" }, { burmese: "မိန့်ခွန်း", english: "Speech / Address" }, { burmese: "ကထိန်ပွဲ", english: "Kahtina Ceremony" }, { burmese: "လေငြိမ်", english: "Calm wind / Stillness" }, { burmese: "အငြိမ့်", english: "Traditional dance-drama" }, { burmese: "အချိန်မီ", english: "On time / Timely" }, { burmese: "ငြိမ့်ညောင်း", english: "Soft / Harmonious" }, { burmese: "ပွဲသိမ်း", english: "End of event / Finale" }, { burmese: "ပျိုးစိမ်", english: "Nursing (plants) / Soaking (seeds)" }, { burmese: "အိမ်", english: "House / Home" }, { burmese: "မိုးတိမ်", english: "Cloud" }, { burmese: "ချိန်ခွင်", english: "Scale / Balance (weighing)" }, { burmese: "လိမ္မော်သီး", english: "Orange (fruit)" }, { burmese: "ကြိမ်ခြင်း", english: "Whipping / Caning" }, { burmese: "ချိန်းဆို", english: "Appointment / Arrange to meet" }, { burmese: "ကြိမ်းမောင်း", english: "Scold / Rebuke" }, { burmese: "မိုးခြိမ်း", english: "Thunder" }, { burmese: "ထိန်လင်း", english: "Brightly lit / Shining" }, { burmese: "ထိန်းသိမ်း", english: "Maintain / Preserve" }, { burmese: "ဖြီးလိမ်း", english: "Apply makeup / Groom" }, { burmese: "လိမ္မာ", english: "Good-natured / Clever" }, { burmese: "ငြိမ်းချမ်း", english: "Peaceful / Calm" }, { burmese: "ပုသိမ်ထီး", english: "Pathein Parasol (umbrella)" }, { burmese: "စိမ်းလန်း", english: "Green / Verdant (lush)" }
                ]
            },
            {
                title: "အခန်း 19 (အုံ့, အုံ, အုံး၊ အုန့်, အုန်, အုန်း၊ အုမ့်, အုမ်, အုမ်း)", startTime: 346.00, vocabulary: [
                    { burmese: "ဗုံတို", english: "Short drum" }, { burmese: "တွေ့ဆုံ", english: "Meet / Encounter" }, { burmese: "ပုံပြင်", english: "Story / Tale" }, { burmese: "နယုန်လ", english: "Nayon (Burmese Month)" }, { burmese: "လုံမလေး", english: "Young woman / Maiden" }, { burmese: "နံ့သာမှုန့်", english: "Sandalwood powder" }, { burmese: "ကုန်းကြောင်း", english: "Land route" }, { burmese: "အုံ့မှိုင်း", english: "Overcast / Gloomy" }, { burmese: "ပြေးခုန်", english: "Run and jump" }, { burmese: "လေမုန်တိုင်း", english: "Storm / Cyclone" }, { burmese: "ယုန်", english: "Rabbit" }, { burmese: "မီးပုံးပျံ", english: "Hot air balloon" }, { burmese: "ခေါင်းအုံး", english: "Pillow" }, { burmese: "မုန့်လုံးရေပေါ်", english: "Burmese sweet snack" }, { burmese: "ဒုံးပျံ", english: "Rocket" }, { burmese: "ဂျုံ", english: "Wheat / Flour" }, { burmese: "ပျားအုံ", english: "Beehive" }, { burmese: "ဗုံရှည်", english: "Long drum" }, { burmese: "ခေါင်းငုံ့", english: "Bow one's head" }, { burmese: "ငုံး", english: "Quail (bird)" }, { burmese: "အုန်းသီး", english: "Coconut" }, { burmese: "ပန်းကုံး", english: "Garland / Wreath" }, { burmese: "ပြုံးရွှင်", english: "Smile happily" }, { burmese: "ဟင်းမျိုးစုံ", english: "Various dishes" }, { burmese: "ရေပုံး", english: "Water bucket" }
                ]
            },
            {
                title: "အခန်း 20 (အွန့်, အွန်, အွန်း, အွမ့်, အွမ်, အွမ်း)", startTime: 396.00, vocabulary: [
                    { burmese: "ကောင်းမွန်", english: "Excellent / Good" }, { burmese: "စွမ်းရည်", english: "Ability / Capacity" }, { burmese: "ကျွန်းဆွယ်", english: "Peninsula" }, { burmese: "ညွှန်ကြား", english: "Instruct / Direct" }, { burmese: "ကျွမ်းကျင်", english: "Skillful / Expert" }, { burmese: "ဆွမ်းတော်", english: "Almsfood (for monks)" }, { burmese: "ရွာသွန်း", english: "To fall (rain)" }, { burmese: "မွမ်းမံ", english: "To decorate / Adorn" }, { burmese: "ခွန်အား", english: "Strength / Power" }, { burmese: "ထူးချွန်", english: "Outstanding / Excellent" }, { burmese: "ဝါဂွမ်း", english: "Cotton" }, { burmese: "ထွန်တုံး", english: "Plow / Plowshare" }, { burmese: "ကွမ်းသီး", english: "Betel nut" }, { burmese: "ကွန်ပျူတာ", english: "Computer" }, { burmese: "ဇွန်း", english: "Spoon" }, { burmese: "လယ်ထွန်", english: "To plow the field" }, { burmese: "စွန်", english: "Kite (toy/bird)" }, { burmese: "ယွန်းထည်", english: "Lacquerware" }, { burmese: "ဆွမ်းအုပ်", english: "Alms container" }, { burmese: "ကျွန်းပင်", english: "Teak tree" }, { burmese: "ဇွန်ပန်း", english: "June flower" }, { burmese: "ရေလယ်ကျွန်း", english: "Island" }, { burmese: "ပြိုင်တူတွန်း", english: "Push simultaneously" }, { burmese: "ထူးချွန်သူ", english: "Brilliant person / Ace" }, { burmese: "ခွန်အားကြီး", english: "Strong / Powerful" }
                ]
            },
            {
                title: "အခန်း 21 (အက်)", startTime: 446.00, vocabulary: [
                    { burmese: "ဆောင်ရွက်", english: "Implement / Perform" }, { burmese: "ညဉ့်နက်", english: "Deep night" }, { burmese: "ကြက်သွန်ဥ", english: "Onion bulb" }, { burmese: "အသက်အရွယ်", english: "Age" }, { burmese: "ထက်ဝက်", english: "Half" }, { burmese: "နက်ဖြန်ခါ", english: "Tomorrow" }, { burmese: "သွက်လက်", english: "Quick / Active" }, { burmese: "စာကျက်", english: "Study / Memorize" }, { burmese: "တွက်ချက်", english: "Calculate" }, { burmese: "စွက်ဖက်", english: "Interfere" }, { burmese: "လင်းကြက်တွန်", english: "Cock crow" }, { burmese: "ရောယှက်", english: "Mix / Intertwine" }, { burmese: "ပျက်ကွက်", english: "Fail / Absent" }, { burmese: "သီးနှံအထွက်တိုး", english: "Increase in crop yield" }, { burmese: "ကြက်သွန်", english: "Onion" }, { burmese: "စက်မှုလယ်ယာ", english: "Mechanized farming" }, { burmese: "နံနက်", english: "Morning" }, { burmese: "ငှက်ပျောသီး", english: "Banana" }, { burmese: "ရက်ကန်းစင်", english: "Loom" }, { burmese: "ရွက်လှေ", english: "Sailboat" }, { burmese: "ကြက်သွန်နီ", english: "Red onion" }, { burmese: "ကြွက်", english: "Mouse / Rat" }, { burmese: "စက်ရုံ", english: "Factory" }, { burmese: "မျက်မှန်", english: "Eyeglasses" }, { burmese: "မျက်နှာ", english: "Face" }, { burmese: "ထွန်စက်", english: "Tractor" }, { burmese: "ဝက်", english: "Pig" }, { burmese: "ကြက်ဖ", english: "Rooster" }, { burmese: "လက်ဖက်", english: "Tea leaf" }, { burmese: "တံမြက်စည်း", english: "Broom" }, { burmese: "မြေအိုးမြေခွက်", english: "Earthenware pots" }, { burmese: "မြက်ခင်းပြင်", english: "Lawn / Grass field" }
                ]
            },
            {
                title: "အခန်း 22 (အောက်)", startTime: 510.00, vocabulary: [
                    { burmese: "ယောက်ျား", english: "Man / Male" }, { burmese: "မြှောက်ပင့်", english: "Flatter / Encourage" }, { burmese: "ပိတောက်ပန်း", english: "Padauk flower" }, { burmese: "ပေါက်ပင်", english: "Sapling / Sprouting plant" }, { burmese: "ခမောက်", english: "Hat / Helmet (traditional)" }, { burmese: "ရှောက်သီး", english: "Pomelo / Shaddock" }, { burmese: "ချောက်ကမ်းပါး", english: "Cliff / Ravine" }, { burmese: "ကောက်ပဲသီးနှံ", english: "Crops / Grains" }, { burmese: "ခလောက်", english: "Bell / Rattle (for animals)" }, { burmese: "အထောက်အကူ", english: "Aid / Assistance" }, { burmese: "မွှေနှောက်", english: "Stir / Disturb / Interfere" }, { burmese: "ထောက်ထားစာနာ", english: "Sympathize / Considerate" }, { burmese: "လမ်းလျှောက်", english: "Walk" }, { burmese: "ကောက်လှိုင်း", english: "Rice straw" }, { burmese: "ထွန်းထွန်းပေါက်ပေါက်", english: "Clear / Explicitly" }, { burmese: "ထန်းခေါက်ဖာ", english: "Palmyra-bark box" }, { burmese: "ကျောက်သင်ပုန်း", english: "Slate / Chalkboard" }, { burmese: "မျောက်", english: "Monkey" }, { burmese: "တုတ်ကောက်", english: "Cane / Walking stick" }, { burmese: "ငါးခြောက်", english: "Dried fish" }, { burmese: "ပြတင်းပေါက်", english: "Window" }, { burmese: "ယောက်ျားလေး", english: "Boy" }
                ]
            },
            {
                title: "အခန်း 23 (အိုက်)", startTime: 554.00, vocabulary: [
                    { burmese: "မီးမြိုက်", english: "Burn / Incinerate" }, { burmese: "အားစိုက်ခွန်စိုက်", english: "Vigorously / Earnestly" }, { burmese: "ဆိုက်ရောက်", english: "Arrive / Land" }, { burmese: "မီးမြှိုက်", english: "Incinerate / Set on fire" }, { burmese: "လှိုက်လှိုက်လှဲလှဲ", english: "Warmly / Heartily" }, { burmese: "ကြုံကြိုက်", english: "Encounter / Coincide" }, { burmese: "စိုက်ပျိုးရေး", english: "Agriculture" }, { burmese: "သိုက်သိုက်မြိုက်မြိုက်", english: "In prosperity / Splendidly" }, { burmese: "အခိုက်အတန့်", english: "Moment / Instant" }, { burmese: "အမှိုက်ပုံး", english: "Trash can" }, { burmese: "ပိုက်ကျော်ခြင်း", english: "Sepak Takraw" }, { burmese: "စိုက်ပျိုးခင်း", english: "Plantation / Farm" }, { burmese: "ကောက်စိုက်သမ", english: "Rice planter / Farmer" }, { burmese: "ငှက်သိုက်", english: "Bird's nest" }, { burmese: "ပိုက်ကွန်", english: "Net / Fishing net" }, { burmese: "စာကြည့်တိုက်", english: "Library" }, { burmese: "သားပိုက်ကောင်", english: "Kangaroo" }, { burmese: "ကျိုက်ထီးရိုး", english: "Kyaiktiyo Pagoda" }, { burmese: "ပိုက်ဆံ", english: "Money" }, { burmese: "ဝမ်းဗိုက်", english: "Abdomen / Belly" }, { burmese: "လူမိုက်", english: "Fool / Rogue" }, { burmese: "ပူအိုက်", english: "Hot and stuffy" }, { burmese: "တိုက်ခိုက်", english: "Attack / Assail" }, { burmese: "လေတိုက်", english: "Wind blows" }
                ]
            },
            {
                title: "အခန်း 24 (အစ်)", startTime: 602.00, vocabulary: [
                    { burmese: "ပစ်တိုင်းထောင်", english: "Roly-poly toy" }, { burmese: "ကျားသစ်", english: "Leopard / Panther" }, { burmese: "ကွမ်းအစ်", english: "Betel box" }, { burmese: "မီးခြစ်", english: "Matchbox / Lighter" }, { burmese: "မျှစ်", english: "Bamboo shoot" }, { burmese: "ချစ်ခင်", english: "To love / Be affectionate" }, { burmese: "သစ်သီး", english: "Fruit" }, { burmese: "ထစ်ချုန်း", english: "To rumble / Thunder loudly" }, { burmese: "ဖွင့်လှစ်", english: "To open / Initiate" }, { burmese: "ပြေပြစ်", english: "Smooth / Elegant" }, { burmese: "အော်ဟစ်", english: "To shout / Scream" }, { burmese: "မြစ်ချောင်း", english: "River / Stream" }, { burmese: "စစ်သည်တော်", english: "Soldier" }, { burmese: "လစ်လပ်", english: "Vacant / Empty" }, { burmese: "ညီအစ်ကို", english: "Brothers / Siblings (male)" }, { burmese: "ခုနှစ်", english: "Seven" }, { burmese: "ယွန်းအစ်", english: "Lacquerware box" }, { burmese: "ကျစ်ဆံမြီး", english: "Braid / Pigtail" }, { burmese: "ရေစစ်", english: "Water filter" }, { burmese: "ခုနစ်", english: "Seven (classifier form)" }, { burmese: "အမှိုက်ပစ်", english: "To throw away trash" }, { burmese: "နှစ်သစ်ကူး", english: "New Year celebration" }
                ]
            },
            {
                title: "အခန်း 25 (အတ်၊ အပ်)", startTime: 646.00, vocabulary: [
                    { burmese: "ဇာတ်ပွဲ", english: "Play / Performance" }, { burmese: "ဖိနပ်", english: "Shoe / Footwear" }, { burmese: "သေနတ်", english: "Gun / Rifle" }, { burmese: "ရဟတ်ယာဉ်", english: "Helicopter" }, { burmese: "ယပ်တောင်", english: "Hand fan" }, { burmese: "ဆုံးဖြတ်", english: "Decide / Determine" }, { burmese: "ကျေနပ်", english: "Satisfied / Content" }, { burmese: "နေကြတ်", english: "Eclipse" }, { burmese: "ထူထပ်", english: "Thick / Dense" }, { burmese: "ဝတ်ဆင်", english: "To wear / Dress" }, { burmese: "ချဉ်ဖတ်", english: "Pickle / Fermented food" }, { burmese: "တိုက်ခတ်", english: "To blow/hit (wind/storm)" }, { burmese: "ကောင်းမြတ်", english: "Good / Excellent" }, { burmese: "အတတ်ပညာ", english: "Knowledge / Skill" }, { burmese: "အမှတ်တရ", english: "Souvenir / Memory" }, { burmese: "မီးညှပ်", english: "Tongs / Pincers" }, { burmese: "အားလပ်", english: "To be free / Relax" }, { burmese: "ဓာတ်ပုံ", english: "Photograph" }, { burmese: "အပ်", english: "Needle / Pin" }, { burmese: "သနပ်ခါး", english: "Thanaka" }, { burmese: "နေကြတ်", english: "Eclipse" }, { burmese: "အားလပ်ရက်", english: "Holiday / Day off" }, { burmese: "ခြင်းခတ်", english: "To play Chinlone (Cane ball)" }, { burmese: "လက်ပတ်နာရီ", english: "Wristwatch" }, { burmese: "ပျဉ်ချပ်", english: "Wooden board / Plank" }
                ]
            },
            {
                title: "အခန်း 26 (အိတ်၊ အိပ်)", startTime: 696.00, vocabulary: [
                    { burmese: "လွယ်အိတ်", english: "School bag" }, { burmese: "ကြိတ်ဆုံ", english: "Grindstone" }, { burmese: "လိပ်ပြာ", english: "Butterfly / Conscience" }, { burmese: "ဆိုက်", english: "Arrive / Dock" }, { burmese: "ငါးမျှားချိတ်", english: "Fishing hook" }, { burmese: "ကောက်ရိတ်", english: "Harvest" }, { burmese: "စာအိတ်", english: "Envelope" }, { burmese: "တံဆိပ်", english: "Badge / Mark" }, { burmese: "အိပ်ပျော်", english: "Sleep" }, { burmese: "သပိတ်", english: "Alms bowl / Strike" }, { burmese: "မိတ်ဆွေ", english: "Friend" }, { burmese: "လိပ်စာ", english: "Address" }, { burmese: "ပုရွက်ဆိတ်", english: "Ant" }, { burmese: "ပုတီးစိပ်", english: "Count prayer beads" }, { burmese: "တိတ်တိတ်", english: "Silently / Quietly" }, { burmese: "တံစက်မြိတ်", english: "Eaves (of a roof)" }, { burmese: "အထည်အလိပ်", english: "Textile / Fabric" }, { burmese: "ဆန်အိတ်", english: "Rice bag" }, { burmese: "လိပ်", english: "Turtle / Roll up" }, { burmese: "ဆိတ်", english: "Goat" }, { burmese: "ပုရွက်ဆိတ်", english: "Ant" }, { burmese: "တံဆိပ်ခေါင်း", english: "Postage stamp" }, { burmese: "လိပ်စာကတ်", english: "Address card" }, { burmese: "ပုတီးစိပ်", english: "Count prayer beads" }
                ]
            },
            {
                title: "အခန်း 27 (အုပ်၊ အုတ်)", startTime: 744.00, vocabulary: [
                    { burmese: "အလုပ်သမား", english: "Worker / Laborer" }, { burmese: "အပ်ချုပ်စက်", english: "Sewing machine" }, { burmese: "ဆွမ်းအုပ်", english: "Alms bowl container" }, { burmese: "ဝါးလက်ခုပ်", english: "Bamboo clapper / Castanets" }, { burmese: "ရုပ်မြင်သံကြား", english: "Television" }, { burmese: "ဆောက်လုပ်", english: "To build / Construct" }, { burmese: "တောအုပ်", english: "Forest / Grove" }, { burmese: "ဦးထုပ်", english: "Hat / Cap" }, { burmese: "ငရုတ်သီး", english: "Chili pepper" }, { burmese: "ခဏတစ်ဖြုတ်", english: "For a moment / Briefly" }, { burmese: "ရုတ်တရက်", english: "Suddenly / All of a sudden" }, { burmese: "တီးမှုတ်", english: "To play a musical instrument" }, { burmese: "ဖားပြုပ်", english: "Toad" }, { burmese: "ကုလားအုတ်", english: "Camel" }, { burmese: "ကောက်ညှင်းထုပ်", english: "Sticky rice parcel" }, { burmese: "နွားတင်းကုပ်", english: "Cowshed / Stable" }, { burmese: "ရေမှုတ်", english: "Water spray / Atomizer" }, { burmese: "အိုးပုတ်", english: "Earthenware pot/toy" }, { burmese: "သစ်ကုလားအုတ်", english: "Giraffe" }
                ]
            },
            {
                title: "အခန်း 28 (အွတ်၊ အွပ်)", startTime: 782.00, vocabulary: [
                    { burmese: "လွတ်လပ်ရေးအောင်ပွဲ", english: "Independence Day victory" }, { burmese: "ကွပ်ပျစ်", english: "Wooden platform/bed" }, { burmese: "ရေပြွတ်", english: "Water spray/Jet" }, { burmese: "လက်စွပ်", english: "Ring" }, { burmese: "သီတင်းကျွတ်", english: "Thadingyut (Burmese month/Festival)" }, { burmese: "ခူးဆွတ်", english: "To pluck/harvest" }, { burmese: "ခွင့်လွှတ်", english: "To forgive/pardon" }, { burmese: "အနားကွပ်", english: "Border/Edge" }, { burmese: "ရွတ်ဖတ်", english: "To recite/chant" }, { burmese: "ဦးညွှတ်", english: "To bow ones head" }, { burmese: "စိုစွတ်", english: "Wet/damp" }, { burmese: "ပွတ်တိုက်", english: "To rub/scrub" }, { burmese: "ကတွတ်ပေါက်", english: "Hole/Burrow" }, { burmese: "ပင်လုံးကျွတ်", english: "Whole plant" }, { burmese: "ညီညွတ်", english: "United/Harmonious" }, { burmese: "ကရွတ်ခွေ", english: "Coil of bamboo/rattan" }, { burmese: "မုန့်ကြွပ်", english: "Crisp snack/cracker" }, { burmese: "မင်းကွတ်သီး", english: "Mangosteen" }, { burmese: "စွပ်ကျယ်", english: "Sleeveless undershirt" }
                ]
            }
        ];
        const pronunciationData={'၏':{start:0},'က':{start:2},'ကျ':{start:4},'ကျွ':{start:6},'ကြ':{start:8},'ကြွ':{start:10},'ကွ':{start:12},'က်':{start:14},'ခ':{start:16},'ချ':{start:18},'ချွ':{start:20},'ခြ':{start:22},'ခွ':{start:24},'ဂ':{start:26},'ဂျ':{start:28},'ဂျွ':{start:30},'ဂြ':{start:32},'ဂွ':{start:34},'ဃ':{start:36},'င':{start:38},'ငြ':{start:40},'ငွ':{start:42},'ငှ':{start:44},'င်':{start:46},'စ':{start:48},'စွ':{start:50},'စ်':{start:52},'ဆ':{start:54},'ဆွ':{start:56},'ဇ':{start:58},'ဇွ':{start:60},'ဈ':{start:62},'ဉ':{start:64},'ဉ်':{start:66},'ည':{start:68},'ညွှ':{start:70},'ညှ':{start:72},'ည်':{start:74},'ဋ':{start:76},'ဌ':{start:78},'ဍ':{start:80},'ဎ':{start:82},'ဏ':{start:84},'တ':{start:86},'တြ':{start:88},'တွ':{start:90},'တ်':{start:92},'ထ':{start:94},'ထွ':{start:96},'ဒ':{start:98},'ဒြ':{start:100},'ဒွ':{start:102},'ဓ':{start:104},'ဓွ':{start:106},'န':{start:108},'နွ':{start:110},'နွှ':{start:112},'နှ':{start:114},'န်':{start:116},'ပ':{start:118},'ပျ':{start:120},'ပျွ':{start:122},'ပြ':{start:124},'ပြွ':{start:126},'ပွ':{start:128},'ပ်':{start:130},'ဖ':{start:132},'ဖျ':{start:134},'ဖြ':{start:136},'ဖွ':{start:138},'ဗ':{start:140},'ဗျ':{start:142},'ဗွ':{start:144},'ဘ':{start:146},'ဘွ':{start:148},'မ':{start:150},'မျ':{start:152},'မျှ':{start:154},'မြ':{start:156},'မြွ':{start:158},'မြှ':{start:160},'မွ':{start:162},'မွှ':{start:164},'မှ':{start:166},'မ်':{start:168},'ယ':{start:170},'ယျ':{start:172},'ယွ':{start:174},'ယှ':{start:176},'ယ်':{start:178},'ရ':{start:180},'ရွ':{start:182},'ရွှ':{start:184},'ရှ':{start:186},'လ':{start:188},'လျ':{start:190},'လျှ':{start:192},'လွ':{start:194},'လွှ':{start:196},'လှ':{start:198},'ဝ':{start:200},'ဝှ':{start:202},'သ':{start:204},'ဿ':{start:206},'သျ':{start:208},'သွ':{start:210},'ဟ':{start:212},'ဟွ':{start:214},'ဠ':{start:216},'အ':{start:218},'အံ':{start:220},'အံ့':{start:222},'အက်':{start:224},'အင့်':{start:226},'အင်':{start:228},'အင်း':{start:230},'အစ်':{start:232},'အည့်':{start:234},'အည်':{start:236},'အည်း':{start:238},'အတတ်':{start:240},'အတ်':{start:240},'အန့်':{start:242},'အန်':{start:244},'အန်း':{start:246},'အပ်':{start:248},'အမ့်':{start:250},'အမ်':{start:252},'အမ်း':{start:254},'အယ့်':{start:256},'အယ်':{start:258},'အွတ်':{start:260},'အွန့်':{start:262},'အွန်':{start:264},'အွန်း':{start:266},'အွပ်':{start:268},'အွမ့်':{start:270},'အွမ်':{start:272},'အွမ်း':{start:274},'အာ':{start:276},'အား':{start:278},'အိ':{start:280},'အိတ်':{start:282},'အိန့်':{start:284},'အိန်':{start:286},'အိန်း':{start:288},'အိပ်':{start:290},'အို':{start:292},'အို့':{start:294},'အိုး':{start:296},'အိုက်':{start:298},'အိုင့်':{start:300},'အိုင်':{start:302},'အိုင်း':{start:304},'အီ':{start:306},'အီး':{start:308},'အု':{start:310},'အုံ':{start:312},'အုံ့':{start:314},'အုံး':{start:316},'အုတ်':{start:318},'အုန့်':{start:320},'အုန်':{start:322},'အုန်း':{start:324},'အုပ်':{start:326},'အုမ့်':{start:328},'အုမ်':{start:330},'အုမ်း':{start:332},'အူ':{start:334},'အူး':{start:336},'အေ':{start:338},'အေ့':{start:340},'အေး':{start:342},'အော':{start:344},'အော့':{start:346},'အောက်':{start:348},'အောင့်':{start:350},'အောင်':{start:352},'အောင်း':{start:354},'အော်':{start:356},'အဲ':{start:358},'အဲ့':{start:360},'ဣ':{start:362},'ဤ':{start:364},'ဥ':{start:366},'ဦ':{start:368},'ဦး':{start:370},'ဧ':{start:372},'ဧည့်':{start:374},'ဩ':{start:376},'ဪ':{start:378},'အဉ့်':{start:380},'အဉ်':{start:382},'အဉ်း':{start:384},'အိမ့်':{start:386},'အိမ်':{start:388},'အိမ်း':{start:390}};
        
        // --- GLOBAL STATE & DOM ELEMENTS ---
        let currentChapterIndex = 0; 
        let isPlaying = false;
        let isReadingAll = false;
        let mode = 'list'; // 'list' or 'quiz'
        let currentWordIndex = 0;
        let correctAnswer = null;
        let clickTimer = null; // Added for double click logic
        
        // For swipe detection
        let touchstartX = 0;
        let touchstartY = 0;

        const $vocabAudio = byId('vocab-audio');
        const $pronunciationAudio = byId('pronunciation-audio');
        const $loadingArea = byId('loading-area');
        const $contentArea = byId('content-area');
        const $listView = byId('list-view');
        const $quizView = byId('quiz-view');
        const $listModeBtn = byId('list-mode-btn');
        const $readAllBtn = byId('read-all-btn'); 
        const $quizModeBtn = byId('quiz-mode-btn');
        const $vocabularyGrid = byId('vocabulary-grid');
        const $quizArea = byId('quiz-area');
        const $statusMessage = byId('status-message');
        const $nextButton = byId('next-button');
        const $chapterTitle = byId('chapter-title');
        const $prevChapterBtn = byId('prev-chapter-btn');
        const $nextChapterBtn = byId('next-chapter-btn');
        const $appContainer = byId('app-container');
        const $startOverlay = byId('start-overlay');
        const $startBtn = byId('start-btn');
        
        // NEW: Floating Image Elements
        const $floatingImageContainer = byId('floating-image-container');
        const $floatingImage = byId('floating-image');
        
        const WORD_COLORS = [
            { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' }, 
            { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' }, 
            { bg: 'bg-lime-100', border: 'border-lime-300', text: 'text-lime-800' }, 
            { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800'},
            { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-800'}, 
            { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-800' }, 
            { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800'}, 
            { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800'}
        ];
        
        const QUIZ_BASE_COLORS = [
            { bg: 'bg-indigo-200', text: 'text-indigo-800', border: 'border-indigo-400' },
            { bg: 'bg-rose-200', text: 'text-rose-800', border: 'border-rose-400' },
            { bg: 'bg-teal-200', text: 'text-teal-800', border: 'border-teal-400' },
            { bg: 'bg-amber-200', text: 'text-amber-800', border: 'border-amber-400' }
        ];

        // --- AUDIO HANDLING (REWRITTEN) ---
        function stopAllAudio(keepReadingAllState = false) {
            $vocabAudio.pause();
            $pronunciationAudio.pause();
            isPlaying = false;

            if (!keepReadingAllState && isReadingAll) {
                isReadingAll = false;
                updateReadAllButtonState();
            }
        }
        
        function playSegment(audioElement, url, startTime, duration) {
            return new Promise((resolve) => {
                stopAllAudio(true);
                isPlaying = true;

                const fragmentUrl = `${url}#t=${startTime},${startTime + duration}`;
                
                // Forcing reload for media fragments on some browsers
                if (audioElement.currentSrc.endsWith(fragmentUrl)) {
                    audioElement.load(); 
                }
                audioElement.src = fragmentUrl;

                audioElement.play().catch(e => {
                    console.error("Playback failed:", e);
                    isPlaying = false;
                    resolve();
                });

                const onEnded = () => {
                    isPlaying = false;
                    audioElement.removeEventListener('ended', onEnded);
                    audioElement.removeEventListener('pause', onEnded);
                    resolve();
                };

                audioElement.addEventListener('ended', onEnded);
                audioElement.addEventListener('pause', onEnded); // Resolve on manual stop too
            });
        }

        function getWordDurationForChapter(chapterIndex) {
            const currentChapter = CHAPTERS[chapterIndex];
            const nextChapter = CHAPTERS[chapterIndex + 1];

            if (nextChapter && currentChapter.vocabulary.length > 0) {
                const timeDiff = nextChapter.startTime - currentChapter.startTime;
                return timeDiff / currentChapter.vocabulary.length;
            }
            // Fallback for the last chapter. Use a safe average.
            // CHANGED: Set fixed 2.0s duration as requested for precision
            return 2.0; // All words seem to be 2.0s duration. 
        }

        // Helper function to load images (Used by both floating image and quiz)
        function loadImage(imgElement, word, showAfterLoad = null) {
            const imgSrcPng = `https://raw.githubusercontent.com/nathantun93/pict/main/${encodeURIComponent(word)}.png`;
            const imgSrcJpg = `https://raw.githubusercontent.com/nathantun93/pict/main/${encodeURIComponent(word)}.jpg`;
            const placeholderUrl = `https://placehold.co/400x300/f0f7ff/1e293b?text=${encodeURIComponent(word)}`;

            imgElement.src = imgSrcPng;
            
            imgElement.onload = () => {
                if (showAfterLoad) showAfterLoad();
            };

            imgElement.onerror = () => { 
                imgElement.src = imgSrcJpg; 
                imgElement.onerror = () => { 
                    imgElement.src = placeholderUrl; 
                    imgElement.onerror = null; 
                    if (showAfterLoad) showAfterLoad();
                };
            };
        }

        function showFloatingImage(word) {
            loadImage($floatingImage, word, () => {
                // Animation classes
                $floatingImageContainer.classList.remove('hidden', 'translate-x-10', 'opacity-0');
                $floatingImageContainer.classList.add('float-enter-active');
            });
        }

        async function playWord(index, elementToHighlight = null, isClue = false) {
            if (isPlaying) return;
            rootEl.querySelectorAll('.is-playing').forEach(el => el.classList.remove('is-playing'));
            if (elementToHighlight) elementToHighlight.classList.add('is-playing');
            
            // CHANGED: Only disable buttons if it's the main clue audio
            if (isClue && mode === 'quiz' && !correctAnswer) setQuizButtonsDisabled(true);

            // NEW: Show floating image if in list mode (covers both manual click and read-all)
            if (mode === 'list') {
                 const wordData = CHAPTERS[currentChapterIndex].vocabulary[index];
                 showFloatingImage(wordData.burmese);
            }

            const chapterStartTime = CHAPTERS[currentChapterIndex].startTime;
            const wordDuration = getWordDurationForChapter(currentChapterIndex); 
            const offset = chapterStartTime + (index * wordDuration);
            
            // CHANGED: Subtract 100ms (0.3s) from the duration to prevent overlap
            const playDuration = wordDuration - 0.3;
            
            await playSegment($vocabAudio, COMBINED_AUDIO_URL, offset, playDuration);

            if (elementToHighlight) elementToHighlight.classList.remove('is-playing');
            // CHANGED: Only re-enable buttons if it was the main clue
            if (isClue && mode === 'quiz' && !correctAnswer) setQuizButtonsDisabled(false);
        }

        async function playPronunciation(word) {
            if (!pronunciationData[word]) return;
            const offset = pronunciationData[word].start;
            await playSegment($pronunciationAudio, pronunciationAudioUrl, offset, 2);
        }

        // --- UI & APP LOGIC ---

        function changeChapter(direction) {
            let newIndex = currentChapterIndex + direction;
            if (newIndex < 0 || newIndex >= CHAPTERS.length) return;
            
            stopAllAudio();
            currentChapterIndex = newIndex;
            currentWordIndex = 0; 
            
            renderChapterTitle(CHAPTERS[currentChapterIndex].title);
            updateChapterNavButtons();
            setMode(mode, true);
        }
        
        function setMode(newMode, forceRender = false) {
            if (newMode === mode && !forceRender) return;

            stopAllAudio();
            mode = newMode;
            $statusMessage.textContent = '';
            
            const buttons = { list: $listModeBtn, quiz: $quizModeBtn };
            const activeColors = { list: 'bg-indigo-500 text-white border-indigo-700', quiz: 'bg-pink-500 text-white border-pink-700' };
            const inactiveColors = 'bg-gray-200 text-gray-700 border-gray-400';

            Object.keys(buttons).forEach(key => {
                buttons[key].className = buttons[key].className.replace(/(bg|text|border)-(\w+)-(\d{2,3})/g, '').trim();
                buttons[key].classList.add(...(key === newMode ? activeColors[key] : inactiveColors).split(' '));
            });
            
            if (mode === 'list') {
                $listView.classList.remove('hidden');
                $quizView.classList.add('hidden');
                renderListView();
            } else {
                // NEW: Hide floating image when entering quiz mode
                $floatingImageContainer.classList.add('hidden', 'translate-x-10', 'opacity-0');
                $floatingImageContainer.classList.remove('float-enter-active');

                $listView.classList.add('hidden');
                $quizView.classList.remove('hidden');
                loadWordForQuiz();
            }
        }
        
        function renderChapterTitle(title) {
            const titleParts = title.match(/(.+)\((.+)\)/);
            $chapterTitle.innerHTML = '';
            if (!titleParts) { $chapterTitle.textContent = title; return; }

            $chapterTitle.innerHTML += `${titleParts[1].trim()} (`
            const sounds = titleParts[2].replace(')', '').split(/,\s*|၊\s*/);
            sounds.forEach((sound, index) => {
                const trimmedSound = sound.trim();
                if(trimmedSound) {
                    $chapterTitle.innerHTML += `<span class="cursor-pointer hover:text-yellow-500 transition-colors duration-200" onclick="window.__mp2aApp.playPronunciation('${trimmedSound}')">${trimmedSound}</span>`;
                    if (index < sounds.length - 1) $chapterTitle.innerHTML += '၊ ';
                }
            });
            $chapterTitle.innerHTML += ')';
        }

        function renderListView() {
            $vocabularyGrid.innerHTML = '';
            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            rootEl.querySelector('#total-words-list span').textContent = vocabulary.length;

            vocabulary.forEach((wordData, index) => {
                const color = WORD_COLORS[index % WORD_COLORS.length];
                const card = document.createElement('div');
                card.className = `word-card p-4 text-center font-bold ${color.bg} ${color.border} ${color.text}`;
                card.setAttribute('data-index', index); 
                card.innerHTML = `<span class="text-2xl sm:text-3xl font-gaegu block leading-tight">${wordData.burmese}</span><span class="text-sm opacity-90 block mt-1">${wordData.english}</span>`;
                // CHANGED: Pass `isClue` flag
                card.onclick = () => playWord(index, card, false);
                $vocabularyGrid.appendChild(card);
            });
        }
        
        function updateReadAllButtonState() {
            if (isReadingAll) {
                $readAllBtn.classList.add('bg-red-500', 'text-white', 'border-red-700');
                $readAllBtn.classList.remove('bg-yellow-500', 'border-yellow-700');
                $readAllBtn.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>'; 
                $readAllBtn.title = 'ဆက်တိုက်ဖတ်ခြင်း ရပ်ရန်';
            } else {
                $readAllBtn.classList.remove('bg-red-500', 'text-white', 'border-red-700');
                $readAllBtn.classList.add('bg-yellow-500', 'border-yellow-700');
                $readAllBtn.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.47-9.536a9 9 0 010 12.072M21 12a9 9 0 01-9 9m0-18a9 9 0 019 9m-9 9H5a2 2 0 01-2-2V7a2 2 0 012-2h7l4 4-4 4z"></path>';
                $readAllBtn.title = 'စာလုံးများ ဆက်တိုက် ဖတ်ရန်';
            }
        }

        async function readAllWords() {
            if (isReadingAll) {
                stopAllAudio();
                return;
            }
            
            isReadingAll = true;
            updateReadAllButtonState();
            if (mode !== 'list') setMode('list'); 
            
            [$listModeBtn, $quizModeBtn].forEach(btn => btn.disabled = true);

            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            for (let i = 0; i < vocabulary.length; i++) {
                if (!isReadingAll) break;
                const card = rootEl.querySelector(`.word-card[data-index="${i}"]`);
                // CHANGED: Pass `isClue` flag
                await playWord(i, card, false); 
                await new Promise(r => setTimeout(r, 200)); // Short pause between words
            }
            
            isReadingAll = false;
            updateReadAllButtonState();
            [$listModeBtn, $quizModeBtn].forEach(btn => btn.disabled = false);
        }

        function generateQuiz(correctIndex) {
            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            const indices = new Set([correctIndex]);
            const numOptions = Math.min(4, vocabulary.length);
            while (indices.size < numOptions) {
                indices.add(Math.floor(Math.random() * vocabulary.length));
            }
            let options = Array.from(indices).map(i => vocabulary[i]);
            return options.sort(() => Math.random() - 0.5); // Shuffle
        }

        // --- NEW FUNCTION: Finds and plays a word by its Burmese text ---
        async function playWordByBurmese(burmeseWord) {
            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            const wordIndex = vocabulary.findIndex(v => v.burmese === burmeseWord);
            if (wordIndex !== -1) {
                // Pass false for isClue so it doesn't disable buttons
                await playWord(wordIndex, null, false); 
            }
        }

        // --- NEW FUNCTION: Handles single/double click logic for quiz buttons ---
        function handleQuizClick(event, burmeseWord, button) {
            event.preventDefault(); // Prevent default behavior
            
            if (clickTimer) {
                // --- DOUBLE CLICK ---
                // If timer exists, this is the second click
                clearTimeout(clickTimer);
                clickTimer = null;
                checkAnswer(burmeseWord, button);
            } else {
                // --- SINGLE CLICK ---
                // First click, set a timer
                clickTimer = setTimeout(() => {
                    if (correctAnswer === null) {
                        clickTimer = null;
                        return; // Don't play if question is already answered
                    }
                    
                    // --- NEW LOGIC ---
                    // 1. Find the English word
                    const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
                    const clickedWordData = vocabulary.find(v => v.burmese === burmeseWord);
                    
                    // 2. Display the English word
                    if (clickedWordData) {
                        byId('quiz-english-word').textContent = clickedWordData.english;
                    }

                    // 3. Play the audio
                    playWordByBurmese(burmeseWord);
                    
                    clickTimer = null;
                }, 250); // 250ms window for a double click
            }
        }

        function loadWordForQuiz() {
            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            if (currentWordIndex >= vocabulary.length) {
                currentWordIndex = 0;
                $statusMessage.textContent = '🎉 အခန်းပြီးပါပြီ! အစမှပြန်စပါမည်။';
            } else {
                 $statusMessage.textContent = '';
            }
            
            correctAnswer = vocabulary[currentWordIndex].burmese;
            const englishWord = vocabulary[currentWordIndex].english; // Get English word
            byId('current-progress').textContent = currentWordIndex + 1;
            byId('total-words-quiz').textContent = vocabulary.length;
            
            // CHANGED: Load image using helper
            const $quizImage = byId('quiz-image');
            loadImage($quizImage, correctAnswer);
            
            // REMOVED: This line is removed so the English word doesn't show on load.
            // byId('quiz-english-word').textContent = englishWord; 

            $quizArea.innerHTML = '';
            // ADDED: Clear the English word display from the previous question's click
            byId('quiz-english-word').textContent = ''; 
            const quizOptions = generateQuiz(currentWordIndex);
            
            quizOptions.forEach((word, i) => {
                const color = QUIZ_BASE_COLORS[i % QUIZ_BASE_COLORS.length];
                const button = document.createElement('button');
                button.className = `option-button p-4 text-2xl font-gaegu ${color.bg} ${color.text} ${color.border}`;
                button.setAttribute('data-word', word.burmese);
                // CHANGED: Use new click handler
                button.onclick = (e) => handleQuizClick(e, word.burmese, button);
                button.textContent = word.burmese;
                
                // NEW: Add touch listeners for tap-down effect
                button.addEventListener('touchstart', () => button.classList.add('is-tapped'), { passive: true });
                button.addEventListener('touchend', () => button.classList.remove('is-tapped'));
                button.addEventListener('touchcancel', () => button.classList.remove('is-tapped'));

                $quizArea.appendChild(button);
            });
            
            $nextButton.classList.add('hidden');
            // We can still play the audio clue on load if we want
             // replayAudioClue(); // REMOVED as requested
        }

        function replayAudioClue() {
            const vocabulary = CHAPTERS[currentChapterIndex].vocabulary;
            const wordIndex = vocabulary.findIndex(v => v.burmese === correctAnswer);
            // CHANGED: Pass `isClue` flag
            if (wordIndex !== -1) playWord(wordIndex, null, true);
        }
        
        function setQuizButtonsDisabled(disabled) {
            $quizArea.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
            // byId('replay-btn').disabled = disabled; // Replay button is hidden
        }

        function checkAnswer(chosenWord, chosenButton) {
            if (correctAnswer === null) return; // Already answered
            setQuizButtonsDisabled(true); 

            if (chosenWord === correctAnswer) {
                chosenButton.classList.add('correct');
                $statusMessage.textContent = '✅ အဖြေမှန်ပါတယ်!';
                $statusMessage.className = 'mt-8 text-xl font-bold h-10 text-green-600';
                showConfetti();
                setTimeout(nextWord, 1800); 
            } else {
                chosenButton.classList.add('incorrect');
                $quizArea.querySelector(`button[data-word="${correctAnswer}"]`).classList.add('correct');
                $statusMessage.textContent = '❌ မှားသွားတယ်နော်...';
                $statusMessage.className = 'mt-8 text-xl font-bold h-10 text-red-600';
                $nextButton.classList.remove('hidden');
            }
            correctAnswer = null; // Prevent re-answering
        }
        
        function nextWord() {
            currentWordIndex++;
            loadWordForQuiz();
        }

        function showConfetti() {
            const EMOJIS = ['🦋', '✨', '💖', '🌈', '⭐', '🎈', '🎉'];
            for (let i = 0; i < 40; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
                confetti.style.left = `${Math.random() * 100}%`;
                const duration = 2 + Math.random() * 3;
                confetti.style.animationDuration = `${duration}s`;
                confetti.style.animationDelay = `${Math.random() * 0.5}s`;
                byId('confetti-container').appendChild(confetti);
                setTimeout(() => confetti.remove(), duration * 1000 + 500);
            }
        }
        
        function updateChapterNavButtons() {
            $prevChapterBtn.disabled = (currentChapterIndex === 0);
            $nextChapterBtn.disabled = (currentChapterIndex === CHAPTERS.length - 1);
        }
        
        // --- IMPROVED SWIPE DETECTION LOGIC ---
        
        $appContainer.addEventListener('touchstart', e => { 
            touchstartX = e.changedTouches[0].screenX; 
            touchstartY = e.changedTouches[0].screenY; // ဒေါင်လိုက် ရွှေ့ခြင်းစမှတ်
        }, { passive: true });
        
        $appContainer.addEventListener('touchend', e => {
            const horizontalDistance = e.changedTouches[0].screenX - touchstartX;
            const verticalDistance = e.changedTouches[0].screenY - touchstartY; // ဒေါင်လိုက်ရွှေ့တဲ့ အကွာအဝေး

            const absHorizontal = Math.abs(horizontalDistance);
            const absVertical = Math.abs(verticalDistance);

            // အလျားလိုက် ရွှေ့တာ 50 pixels ထက်ပိုပြီး၊ ဒေါင်လိုက်ရွှေ့တာထက် ၁.၅ ဆ ပိုများမှသာ အခန်းကူးပြောင်းမှု ဖြစ်စေမည်။
            // (Only trigger chapter change if horizontal movement is significant and much larger than vertical movement)
            if (absHorizontal > 50 && absHorizontal > absVertical * 1.5) { 
                changeChapter(horizontalDistance < 0 ? 1 : -1);
            }
        }, { passive: true });

        $listModeBtn.addEventListener('click', () => setMode('list'));
        $quizModeBtn.addEventListener('click', () => setMode('quiz'));
        $readAllBtn.addEventListener('click', readAllWords); 

        window.__mp2aApp = { changeChapter, replayAudioClue, nextWord, playPronunciation };

        (() => {
            $startBtn.addEventListener('click', async () => {
                // Unlock audio by playing a silent sound on user interaction.
                // This is the most crucial step for iOS/iPadOS compatibility.
                $vocabAudio.play().catch(()=>{});
                $vocabAudio.pause();
                
                // Show loading spinner while preparing app
                $startBtn.textContent = 'ခဏစောင့်ပါ...';
                $startBtn.disabled = true;

                // Preload the main audio file. This can also show a progress bar in a real app.
                $vocabAudio.src = COMBINED_AUDIO_URL;
                $vocabAudio.load();
                
                // Hide overlay and show app
                $startOverlay.classList.add('hidden');
                $appContainer.classList.remove('hidden');

                $contentArea.classList.add('hidden');
                $loadingArea.classList.remove('hidden');

                // Wait until enough audio data is loaded to start playing.
                $vocabAudio.addEventListener('canplaythrough', () => {
                    $loadingArea.classList.add('hidden');
                    $contentArea.classList.remove('hidden');
                    renderChapterTitle(CHAPTERS[0].title);
                    updateChapterNavButtons();
                    setMode('list', true);
                }, { once: true });
            });

            // NEW: Add touch listeners for tap-down effect on static buttons
            const addTouchEffect = (element) => {
                if (!element) return; // Add a check
                element.addEventListener('touchstart', () => element.classList.add('is-tapped'), { passive: true });
                element.addEventListener('touchend', () => element.classList.remove('is-tapped'));
                element.addEventListener('touchcancel', () => element.classList.remove('is-tapped'));
            };
            
            rootEl.querySelectorAll('.control-btn, #start-btn, #next-button, .nav-arrow').forEach(addTouchEffect);
        })();

    return () => {
      delete window.__mp2aApp;
    };
  }, []);

  return (
    <>
      <style>{P2A_APP_CSS}</style>
      <div
        ref={containerRef}
        className="p2a-app-root p-4 flex items-start justify-center min-h-screen relative"
        dangerouslySetInnerHTML={{ __html: P2A_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
      <>
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
              <h2 className="text-xl font-bold text-gray-800">📖 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
      )}
    </>
  );
}
