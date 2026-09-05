import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Interactive Learning Quiz for Kids" HTML app ──
// Same hybrid approach as the other ported apps in this project: the
// original vanilla JS (DOM manipulation, Web Audio playback) is kept almost
// unchanged inside a React wrapper instead of being rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. Inline onclick="..."
// attributes (both static and generated via template strings / setAttribute)
// resolve via the global scope, so the functions they call are exposed under
// window.__ilqApp (namespaced, not bare globals) — see the note above that
// assignment for the full explanation.
//
// The original page's Firebase init (anonymous auth only) relied on injected
// globals that only exist in the Google AI Studio canvas it was built in —
// outside of it, firebaseConfig was always null and the whole Firebase path
// was dead code, so it's dropped here. The shared instance from ./firebase.js
// is reused for the added online-roster feature below instead.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .ilq-app-root so it doesn't leak onto the rest of the SPA, since every app
// stays mounted simultaneously (just hidden via CSS) per App.jsx's design.

const ILQ_ROSTER_PATH = 'artifacts/interactive-learning-quiz-app/public/data/roster';
const sanitizeIlqKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const ILQ_APP_CSS = `
        /* Using a cheerful, soft palette */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        /* Add a Burmese font for the instruction text */
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap');
        
        .ilq-app-root {
            font-family: 'Poppins', sans-serif;
            background-color: #fce4ec; /* Light Pink Background */
        }
        
        /* Apply Burmese font to the instruction text specifically */
        .burmese-text {
             font-family: 'Padauk', sans-serif;
             font-size: 1.875rem; /* 3xl */
             line-height: 2.25rem;
             color: #880e4f; /* Deep Pink */
        }
        
        .main-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 2rem 1rem;
        }
        .card {
            background-color: #ffffff;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
            border-radius: 2.5rem; /* More rounded */
            max-width: 900px;
            width: 100%;
            padding: 2.5rem;
            position: relative;
        }
        
        .option-card {
            cursor: pointer;
            transition: all 0.2s, opacity 0.5s ease-in-out;
            border: none;
            background-color: transparent;
            box-shadow: none;
            user-select: none;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            position: relative; 
        }
        
        .image-container {
            width: 120px;
            height: 120px;
            background-color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 50%;
            margin: 0 auto 0.75rem;
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2), 0 0 0 4px #ffcdd2; /* Pink/Red glow */
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 4px solid transparent;
        }

        .option-card:hover .image-container:not(.disabled) {
            box-shadow: 0 15px 30px rgba(66, 165, 245, 0.5), 0 0 0 6px #81d4fa; 
            transform: translateY(-5px);
        }
        
        .option-card:hover .part-name {
            color: #1565c0;
        }
        
        .option-card .emoji {
            font-size: 60px; /* Make emoji large */
            line-height: 1;
        }

        .image-container img {
            width: 90%;
            height: 90%;
            object-fit: contain;
        }
        
        /* Style for correct/incorrect options */
        .option-card.correct .image-container { border-color: #43a047; animation: pulse-green 0.5s; box-shadow: 0 0 20px #a5d6a7; }
        .option-card.incorrect .image-container { border-color: #e53935; animation: shake 0.5s; }
        .option-card.disabled { opacity: 0.7; cursor: default; pointer-events: none; }

        /* Animations */
        @keyframes pulse-green {
            0% { transform: scale(1); }
            50% { transform: scale(1.08); }
            100% { transform: scale(1); }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
        }
        
        /* Timer Bar Style */
        .timer-bar-container {
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            height: 20px;
            margin-top: 1rem;
        }

        .timer-bar {
            height: 100%;
            width: 100%;
            background-color: #4caf50;
            border-radius: 10px;
            transition: width 0.1s linear;
        }

`;

const ILQ_APP_BODY_HTML = `

    <div class="main-container">
        <div class="card">
            
            <!-- Game Switcher Icon -->
            <button id="game-switcher" onclick="window.__ilqApp.switchGame()" class="absolute top-6 right-6 text-4xl z-10 p-2 rounded-full hover:bg-gray-200 transition">
                🎮
            </button>

            <!-- ANATOMY QUIZ CONTAINER -->
            <div id="anatomy-quiz-container">
                <h1 class="text-3xl sm:text-4xl font-extrabold text-center mb-4 text-pink-600">
                    Human Anatomy Learning Quiz
                </h1>
                <p id="progress-text" class="text-center text-gray-500 mb-6 font-semibold">
                    Phase 1, Level 1 (3 Parts) | Mastered: 0/3 | Score: 0/6
                </p>
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <div id="instruction-area" class="flex-grow min-w-0 pr-4">
                        <h2 id="instruction-text" class="burmese-text text-lg level-up-title invisible h-8 text-left">
                            &nbsp;
                        </h2>
                    </div>
                    <div class="flex-shrink-0 flex space-x-3">
                        <button id="phase-toggle-button" onclick="window.__ilqApp.togglePhase()" class="py-2 px-6 bg-pink-500 text-white font-bold rounded-full shadow-lg hover:bg-pink-600 transition disabled:opacity-50 flex items-center justify-center">
                            Phase 1 (1-14)
                        </button>
                        <button id="start-button" onclick="window.__ilqApp.startQuizMode()" class="py-2 px-6 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center">
                            Start Quiz!
                        </button>
                    </div>
                </div>
                <div id="options-grid" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4"></div>
                <div id="feedback-message" class="mt-6 text-center text-2xl font-bold h-8"></div>
            </div>

            <!-- GENERAL QUIZ CONTAINER -->
            <div id="general-quiz-container" class="hidden">
                <h1 class="text-3xl sm:text-4xl font-extrabold text-center mb-4 text-blue-600">
                    Guess the Animal, Color & Fruit!
                </h1>
                 <p id="general-quiz-score" class="text-center text-gray-500 mb-2 font-semibold">Score: 0</p>
                 <div id="general-quiz-timer-container" class="timer-bar-container invisible">
                    <div id="general-quiz-timer-bar" class="timer-bar"></div>
                </div>
                <div class="text-center my-4 min-h-[80px] flex flex-col items-center justify-center">
                    <h2 id="general-quiz-question-en" class="text-3xl font-bold text-gray-800 text-center"></h2>
                    <!-- Add cursor-pointer and onclick to toggle English visibility -->
                    <p id="general-quiz-question-my" 
                       class="burmese-text text-xl text-gray-600 mt-1 text-center cursor-pointer"
                       onclick="window.__ilqApp.toggleEnglishQuestion()">
                    </p>
                </div>
                <div id="general-quiz-options-grid" class="grid grid-cols-3 gap-6 max-w-lg mx-auto"></div>
                <div id="general-quiz-feedback" class="mt-6 text-center text-2xl font-bold h-8"></div>
            </div>

        </div>
    </div>

    <!-- Hidden Audio Elements -->
    <audio id="body-audio" src="https://raw.githubusercontent.com/nathantun93/bell/main/Body_1s.mp3"></audio>
    <audio id="general-quiz-audio" src="https://raw.githubusercontent.com/nathantun93/bell/main/Quiz_Game.mp3"></audio>
    <audio id="general-quiz-audio-2" src="https://raw.githubusercontent.com/nathantun93/bell/main/Quiz_Game2.mp3"></audio>
    <audio id="items-audio" src="https://raw.githubusercontent.com/nathantun93/bell/main/အသုံးအဆာင်.mp3"></audio>

`;

export default function InteractiveLearningQuizApp({ entryRequest, onExit }) {
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
    const rosterRef = doc(db, ILQ_ROSTER_PATH, sanitizeIlqKey(studentName));
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
    const unsub = onSnapshot(collection(db, ILQ_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Interactive Learning Quiz roster listen error:', e));
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

// The original page's Firebase init (anonymous auth only) relied on
// injected globals (__app_id / __firebase_config / __initial_auth_token)
// that only exist in the Google AI Studio canvas this was built in;
// outside of it firebaseConfig was always null, so initializeAppAndAuth
// below always took its skip-Firebase-entirely branch in practice.
// Dropped it -- db/auth/userId were otherwise unused everywhere else.
        let currentGame = 'anatomy'; // 'anatomy' or 'general'
        const phaseNames = ["Anatomy 1", "Anatomy 2", "Clothes", "Household", "School"]; // Phase များကို နာမည်ပေးခြင်း

        // ====================================================================
        // --- ANATOMY QUIZ - VARIABLES AND DATA ---
        // ====================================================================
        const LEVEL_SIZES = [3, 6, 10, 14];
        const MAX_PARTS_PER_PHASE = 14; 
        const TOTAL_PARTS = 70; // 28 မှ 70 သို့ပြောင်းလဲ (Phase 5 ခုစာ)
        let currentPhase = 1;
        let currentLevelIndex = 0;
        let currentSetSize = LEVEL_SIZES[currentLevelIndex];
        let partStats = {};
        let targetPart = null; 
        let isLearningMode = true;
        let awaitingAnswer = false; 
        let quizSessionParts = [];
        const learningItems = [ // bodyParts မှ learningItems သို့ နာမည်ပြောင်း
            { id: 1, name: "ကျောကုန်း", en: "Back", start: 0.00, duration: 1.00 }, { id: 2, name: "ချက်", en: "Navel", start: 1.00, duration: 1.00 }, { id: 3, name: "ခြေထောက်", en: "Leg", start: 2.00, duration: 1.00 }, { id: 4, name: "ခြေသည်း", en: "Toenail", start: 3.00, duration: 1.00 }, { id: 5, name: "ခြေသလုံး", en: "Calf", start: 4.00, duration: 1.00 }, { id: 6, name: "ခါး", en: "Waist", start: 5.00, duration: 1.00 }, { id: 7, name: "ခေါင်း", en: "Head", start: 6.00, duration: 1.00 }, { id: 8, name: "ဂျိုင်း", en: "Armpit", start: 7.00, duration: 1.00 }, { id: 9, name: "ဆံပင်", en: "Hair", start: 8.00, duration: 1.00 }, { id: 10, name: "တင်ပါး", en: "Buttocks", start: 9.00, duration: 1.00 }, { id: 11, name: "ဒူးခေါင်း", en: "Knee", start: 10.00, duration: 1.00 }, { id: 12, name: "နှာခေါင်း", en: "Nose", start: 11.00, duration: 1.00 }, { id: 13, name: "နှုတ်ခမ်း", en: "Lips", start: 12.00, duration: 1.00 }, { id: 14, name: "နားရွက်", en: "Ear", start: 13.00, duration: 1.00 }, { id: 15, name: "ပခုံး", en: "Shoulder", start: 14.00, duration: 1.00 }, { id: 16, name: "ပါး", en: "Cheek", start: 15.00, duration: 1.00 }, { id: 17, name: "ပါးစပ်", en: "Mouth", start: 16.00, duration: 1.00 }, { id: 18, name: "ပေါင်", en: "Thigh", start: 17.00, duration: 1.00 }, { id: 19, name: "ဗိုက်", en: "Stomach", start: 18.00, duration: 1.00 }, { id: 20, name: "မျက်စိ", en: "Eye", start: 19.00, duration: 1.00 }, { id: 21, name: "မျက်နှာ", en: "Face", start: 20.00, duration: 1.00 }, { id: 22, name: "မေးစေ့", en: "Chin", start: 21.00, duration: 1.00 }, { id: 23, name: "ရင်ဘတ်", en: "Chest", start: 22.00, duration: 1.00 }, { id: 24, name: "လက်", en: "Hand", start: 23.00, duration: 1.00 }, { id: 25, name: "လက်သည်း", en: "Fingernail", start: 24.00, duration: 1.00 }, { id: 26, name: "လည်ပင်း", en: "Neck", start: 25.00, duration: 1.00 }, { id: 27, name: "လျှာ", en: "Tongue", start: 26.00, duration: 1.00 }, { id: 28, name: "သွား", en: "Tooth", start: 27.00, duration: 1.00 },
            // --- Phase 3: Clothes (IDs 29-42) ---
            { id: 29, name: "တီရှပ်", en: "T-Shirt", emoji: "👕", start: 0.00, duration: 2.00, type: 'emoji' },
            { id: 30, name: "ဘောင်းဘီရှည်", en: "Pants / Jeans", emoji: "👖", start: 2.00, duration: 2.00, type: 'emoji' },
            { id: 31, name: "ဂါဝန်", en: "Dress", emoji: "👗", start: 4.00, duration: 2.00, type: 'emoji' },
            { id: 32, name: "ကုတ်အင်္ကျီ", en: "Coat / Jacket", emoji: "🧥", start: 6.00, duration: 2.00, type: 'emoji' },
            { id: 33, name: "ဖိနပ်", en: "Sneaker / Shoe", emoji: "👟", start: 8.00, duration: 2.00, type: 'emoji' },
            { id: 34, name: "ခြေအိတ်", en: "Socks", emoji: "🧦", start: 10.00, duration: 2.00, type: 'emoji' },
            { id: 35, name: "ဦးထုပ်", en: "Cap", emoji: "🧢", start: 12.00, duration: 2.00, type: 'emoji' },
            { id: 36, name: "ဘောင်းဘီတို", en: "Shorts", emoji: "🩳", start: 14.00, duration: 2.00, type: 'emoji' },
            { id: 37, name: "သိုးမွေးပဝါ", en: "Scarf", emoji: "🧣", start: 16.00, duration: 2.00, type: 'emoji' },
            { id: 38, name: "လက်အိတ်", en: "Gloves", emoji: "🧤", start: 18.00, duration: 2.00, type: 'emoji' },
            { id: 39, name: "လက်စွပ်", en: "Ring", emoji: "💍", start: 20.00, duration: 2.00, type: 'emoji' },
            { id: 40, name: "နေကာမျက်မှန်", en: "Sunglasses", emoji: "🕶️", start: 22.00, duration: 2.00, type: 'emoji' },
            { id: 41, name: "လည်သာအင်္ကျီ", en: "Tie", emoji: "👔", start: 24.00, duration: 2.00, type: 'emoji' },
            { id: 42, name: "ရေကူးဝတ်စုံ", en: "Swimsuit", emoji: "👙", start: 26.00, duration: 2.00, type: 'emoji' },
            // --- Phase 4: Household (IDs 43-56) ---
            { id: 43, name: "အိမ်", en: "House", emoji: "🏠", start: 28.00, duration: 2.00, type: 'emoji' },
            { id: 44, name: "ကုလားထိုင်", en: "Chair", emoji: "🪑", start: 30.00, duration: 2.00, type: 'emoji' },
            { id: 45, name: "အိပ်ရာ", en: "Bed", emoji: "🛏️", start: 32.00, duration: 2.00, type: 'emoji' },
            { id: 46, name: "နာရီ", en: "Clock", emoji: "⏰", start: 34.00, duration: 2.00, type: 'emoji' },
            { id: 47, name: "သော့", en: "Key", emoji: "🔑", start: 36.00, duration: 2.00, type: 'emoji' },
            { id: 48, name: "ဆိုဖာ / ထိုင်ခုံရှည်", en: "Sofa / Couch", emoji: "🛋️", start: 38.00, duration: 2.00, type: 'emoji' },
            { id: 49, name: "တံခါး", en: "Door", emoji: "🚪", start: 40.00, duration: 2.00, type: 'emoji' },
            { id: 50, name: "ပန်းကန်ခွက်ယောက်", en: "Plate / Cutlery", emoji: "🍽️", start: 42.00, duration: 2.00, type: 'emoji' },
            { id: 51, name: "ရေချိုးခန်း", en: "Shower", emoji: "🚿", start: 44.00, duration: 2.00, type: 'emoji' },
            { id: 52, name: "ရုပ်မြင်သံကြား", en: "Television", emoji: "📺", start: 46.00, duration: 2.00, type: 'emoji' },
            { id: 53, name: "မီးသီး", en: "Light Bulb", emoji: "💡", start: 48.00, duration: 2.00, type: 'emoji' },
            { id: 54, name: "ခြင်းတောင်း", en: "Basket", emoji: "🧺", start: 50.00, duration: 2.00, type: 'emoji' },
            { id: 55, name: "ရေချိုးကန်", en: "Bathtub", emoji: "🛁", start: 52.00, duration: 2.00, type: 'emoji' },
            { id: 56, name: "အိမ်သာ", en: "Toilet", emoji: "🚽", start: 54.00, duration: 2.00, type: 'emoji' },
            // --- Phase 5: School Supplies (IDs 57-70) ---
            { id: 57, name: "စာအုပ်များ", en: "Books", emoji: "📚", start: 56.00, duration: 2.00, type: 'emoji' },
            { id: 58, name: "ခဲတံ", en: "Pencil", emoji: "✏️", start: 58.00, duration: 2.00, type: 'emoji' },
            { id: 59, name: "ပေတံ", en: "Ruler", emoji: "📏", start: 60.00, duration: 2.00, type: 'emoji' },
            { id: 60, name: "ကျောပိုးအိတ်", en: "Backpack", emoji: "🎒", start: 62.00, duration: 2.00, type: 'emoji' },
            { id: 61, name: "ကတ်ကြေး", en: "Scissors", emoji: "✂️", start: 64.00, duration: 2.00, type: 'emoji' },
            { id: 62, name: "ဂဏန်းတွက်စက်", en: "Calculator", emoji: "🧮", start: 66.00, duration: 2.00, type: 'emoji' },
            { id: 63, name: "ကမ္ဘာလုံး", en: "Globe", emoji: "🌎", start: 68.00, duration: 2.00, type: 'emoji' },
            { id: 64, name: "မှတ်စုစာအုပ်", en: "Notepad", emoji: "📝", start: 70.00, duration: 2.00, type: 'emoji' },
            { id: 65, name: "ဖယောင်းခဲတံ", en: "Crayon", emoji: "🖍️", start: 72.00, duration: 2.00, type: 'emoji' },
            { id: 66, name: "ထောင့်မှန်တြိဂံ", en: "Protractor", emoji: "📐", start: 74.00, duration: 2.00, type: 'emoji' },
            { id: 67, name: "တေးဂီတ", en: "Music", emoji: "🎼", start: 76.00, duration: 2.00, type: 'emoji' },
            { id: 68, name: "အဏုကြည့်မှန်ပြောင်း", en: "Microscope", emoji: "🔬", start: 78.00, duration: 2.00, type: 'emoji' },
            { id: 69, name: "ဆေးပုံး", en: "Palette / Art", emoji: "🎨", start: 80.00, duration: 2.00, type: 'emoji' },
            { id: 70, name: "ဘာသာစကား", en: "Language", emoji: "🗣️", start: 82.00, duration: 2.00, type: 'emoji' }
        ];

        // --- DOM ELEMENTS (ANATOMY) ---
        const phase1_2_Audio = byId('body-audio'); // anatomyAudio မှ နာမည်ပြောင်း
        const itemsAudio = byId('items-audio'); // အသံဖိုင်အသစ် ထည့်သွင်း
        const progressText = byId('progress-text');
        const instructionText = byId('instruction-text');
        const startButton = byId('start-button');
        const optionsGrid = byId('options-grid');
        const feedbackMessage = byId('feedback-message');
        const phaseToggleButton = byId('phase-toggle-button'); 

        // ====================================================================
        // --- GENERAL QUIZ - VARIABLES AND DATA ---
        // ====================================================================
        let generalQuizQuestions = [];
        let currentGeneralQuizIndex = 0;
        let generalQuizScore = 0;
        let generalQuizTimer;
        let generalQuizAwaitingAnswer = false;

        const generalQuizData = [
            { id: 1, question: { text: "ဘယ်အကောင်က ပိုကြီးလဲ။", en: "Which is bigger?", start: 9.00, duration: 2.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 11.00, duration: 1.0 }, { text: "ဆင်", en: "Elephant", emoji: '🐘', start: 12.00, duration: 1.0, isCorrect: true }, { text: "ကြွက်", en: "Mouse", emoji: '🐁', start: 13.00, duration: 1.0 } ]},
            { id: 2, question: { text: "ဘယ်အကောင်က ပျံနိုင်လဲ။", en: "What animal can fly?", start: 14.00, duration: 2.00 }, options: [ { text: "ခွေး", en: "Dog", emoji: '🐕', start: 16.00, duration: 1.0 }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 17.00, duration: 1.0 }, { text: "ငှက်", en: "Bird", emoji: '🐦', start: 18.00, duration: 1.0, isCorrect: true } ]},
            { id: 3, question: { text: "မတူညီတာကို ရှာပါ။", en: "Find the odd one out.", start: 19.00, duration: 2.00 }, options: [ { text: "ငှက်ပျောသီး", en: "Banana", emoji: '🍌', start: 21.00, duration: 1.0 }, { text: "ကား", en: "Car", emoji: '🚗', start: 22.00, duration: 1.0, isCorrect: true }, { text: "လိမ္မော်သီး", en: "Orange", emoji: '🍊', start: 23.00, duration: 1.0 } ]},
            { id: 4, question: { text: "ကောင်းကင်ရဲ့ အရောင်က ဘာလဲ။", en: "What color is the sky?", start: 24.00, duration: 2.00 }, options: [ { text: "အပြာ", en: "Blue", emoji: '🔵', start: 26.00, duration: 1.0, isCorrect: true }, { text: "အစိမ်း", en: "Green", emoji: '🟢', start: 27.00, duration: 1.0 }, { text: "အနီ", en: "Red", emoji: '🔴', start: 28.00, duration: 1.0 } ]},
            { id: 5, question: { text: "ဘယ်ဟာက အသီးအနှံလဲ။", en: "Which one is a fruit?", start: 29.00, duration: 2.00 }, options: [ { text: "မုန်လာဥနီ", en: "Carrot", emoji: '🥕', start: 31.00, duration: 1.0 }, { text: "လိမ္မော်သီး", en: "Orange", emoji: '🍊', start: 32.00, duration: 1.0, isCorrect: true }, { text: "အာလူး", en: "Potato", emoji: '🥔', start: 33.00, duration: 1.0 } ]},
            { id: 6, question: { text: "မတူတာကို ရှာပါ။", en: "Find the odd one out.", start: 34.00, duration: 2.00 }, options: [ { text: "စက်ဝိုင်း", en: "Circle", emoji: '⭕', start: 36.00, duration: 1.0 }, { text: "လေးထောင့်", en: "Square", emoji: '🟥', start: 37.00, duration: 1.0 }, { text: "ငှက်ပျောသီး", en: "Banana", emoji: '🍌', start: 38.00, duration: 1.0, isCorrect: true } ]},
            { id: 7, question: { text: "ဘယ်အရာမှာ ခြေထောက်လေးချောင်း ရှိလဲ။", en: "What has four legs?", start: 40.00, duration: 3.00 }, options: [ { text: "ကုလားထိုင်", en: "Chair", emoji: '🪑', start: 43.00, duration: 1.0, isCorrect: true }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 44.00, duration: 1.0 }, { text: "ငှက်", en: "Bird", emoji: '🐦', start: 45.00, duration: 1.0 } ]},
            { id: 8, question: { text: "(stop sign) ရဲ့ အရောင်က ဘာလဲ။", en: "What color is a stop sign?", start: 46.00, duration: 2.00 }, options: [ { text: "အနီ", en: "Red", emoji: '🔴', start: 48.00, duration: 1.0, isCorrect: true }, { text: "အဝါ", en: "Yellow", emoji: '🟡', start: 49.00, duration: 1.0 }, { text: "အပြာ", en: "Blue", emoji: '🔵', start: 50.00, duration: 1.0 } ]},
            { id: 9, question: { text: "ဘယ်ဟာက ပိုမြန်လဲ။", en: "Which is faster?", start: 51.00, duration: 2.00 }, options: [ { text: "လိပ်", en: "Turtle", emoji: '🐢', start: 53.00, duration: 1.0 }, { text: "စက်ဘီး", en: "Bicycle", emoji: '🚲', start: 54.00, duration: 1.0 }, { text: "ကား", en: "Car", emoji: '🚗', start: 55.00, duration: 1.0, isCorrect: true } ]},
            { id: 10, question: { text: "ဘာက လုံးလုံး (အဝိုင်း) လဲ။", en: "What is round?", start: 56.00, duration: 2.00 }, options: [ { text: "ဘောလုံး", en: "Ball", emoji: '⚽', start: 58.00, duration: 1.0, isCorrect: true }, { text: "စာအုပ်", en: "Book", emoji: '📖', start: 59.00, duration: 1.0 }, { text: "တြိဂံ", en: "Triangle", emoji: '🔺', start: 60.00, duration: 1.0 } ]},
            { id: 11, question: { text: "ဘယ်ဟာကို စားလို့ရလဲ။", en: "Which one can you eat?", start: 61.00, duration: 2.00 }, options: [ { text: "ဖိနပ်", en: "Shoe", emoji: '👟', start: 63.00, duration: 1.0 }, { text: "ပေါင်မုန့်ညှပ်", en: "Sandwich", emoji: '🥪', start: 64.00, duration: 2.0, isCorrect: true }, { text: "ခဲတံ", en: "Pencil", emoji: '✏️', start: 66.00, duration: 1.0 } ]},
            { id: 12, question: { text: "ဘယ်ဟာက ပျံနိုင်လဲ။", en: "Which one can fly?", start: 67.00, duration: 2.00 }, options: [ { text: "မြင်း", en: "Horse", emoji: '🐎', start: 69.00, duration: 1.0 }, { text: "စက်ဘီး", en: "Bicycle", emoji: '🚲', start: 70.00, duration: 1.0 }, { text: "လေယာဉ်", en: "Plane", emoji: '✈️', start: 71.00, duration: 1.0, isCorrect: true } ]},
            { id: 13, question: { text: "ဘယ်ဟာက  အဝိုင်းပုံ လဲ။", en: "Which one is a shape?", start: 72.00, duration: 2.00 }, options: [ { text: "စက်ဝိုင်း", en: "Circle", emoji: '⭕', start: 74.00, duration: 1.0, isCorrect: true }, { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 75.00, duration: 1.0 }, { text: "သစ်ပင်", en: "Tree", emoji: '🌳', start: 76.00, duration: 1.0 } ]},
            { id: 14, question: { text: "ဘယ်အကောင်က ရေထဲမှာ နေလဲ။", en: "What animal lives in the water?", start: 77.00, duration: 2.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 79.00, duration: 1.0 }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 80.00, duration: 1.0, isCorrect: true }, { text: "ငှက်", en: "Bird", emoji: '🐦', start: 81.00, duration: 1.0 } ]},
            { id: 15, question: { text: "ဘယ်ဟာကို စာရေးဖို့ အသုံးပြုလဲ။", en: "Which is used for writing?", start: 82.00, duration: 3.00 }, options: [ { text: "ခဲတံ", en: "Pencil", emoji: '✏️', start: 85.00, duration: 1.0, isCorrect: true }, { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 86.00, duration: 1.0 }, { text: "ဦးထုပ်", en: "Hat", emoji: '👒', start: 87.00, duration: 1.0 } ]},
            { id: 16, question: { text: "ခြေထောက်မှာ ဘာဝတ်လဲ။", en: "What do you wear on your feet?", start: 88.00, duration: 2.00 }, options: [ { text: "လက်အိတ်", en: "Gloves", emoji: '🧤', start: 90.00, duration: 1.0 }, { text: "ဦးထုပ်", en: "Hat", emoji: '👒', start: 91.00, duration: 1.0 }, { text: "ဖိနပ်", en: "Shoes", emoji: '👟', start: 92.00, duration: 1.0, isCorrect: true } ]},
            { id: 17, question: { text: "ဘယ်ဟာက ပူလဲ။", en: "Which one is hot?", start: 93.00, duration: 2.00 }, options: [ { text: "ရေခဲမုန့်", en: "Ice cream", emoji: '🍦', start: 95.00, duration: 1.0 }, { text: "ဟင်းချို", en: "Soup", emoji: '🥣', start: 96.00, duration: 1.0, isCorrect: true }, { text: "ဆီးနှင်း", en: "Snow", emoji: '❄️', start: 97.00, duration: 1.0 } ]},
            { id: 18, question: { text: "သွားတိုက်ဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to brush your teeth?", start: 99.00, duration: 2.00 }, options: [ { text: "သွားတိုက်တံ", en: "Toothbrush", emoji: '🪥', start: 101.00, duration: 1.0, isCorrect: true }, { text: "ဘီး", en: "Comb", emoji: '🎀', start: 102.00, duration: 1.0 }, { text: "သဘက်", en: "Towel", emoji: '🧖', start: 103.00, duration: 1.0 } ]},
            { id: 19, question: { text: "ဘယ်ဟာက အေးလဲ။", en: "Which one is cold?", start: 104.00, duration: 2.00 }, options: [ { text: "ရေခဲ", en: "Ice", emoji: '🧊', start: 106.00, duration: 1.0, isCorrect: true }, { text: "နေ", en: "Sun", emoji: '☀️', start: 107.00, duration: 1.0 }, { text: "မီး", en: "Fire", emoji: '🔥', start: 108.00, duration: 1.0 } ]},
            { id: 20, question: { text: "ရေဆာတဲ့အခါ ဘာကို သောက်လဲ။", en: "What do you drink when you're thirsty?", start: 109.00, duration: 2.00 }, options: [ { text: "သဲ", en: "Sand", emoji: '🏖️', start: 111.00, duration: 1.0 }, { text: "ရေ", en: "Water", emoji: '💧', start: 112.00, duration: 1.0, isCorrect: true }, { text: "ကျောက်ခဲ", en: "Rocks", emoji: '🪨', start: 113.00, duration: 1.0 } ]},
            { id: 21, question: { text: "ဘယ်ဟာက လှိမ့်နိုင်လဲ။", en: "Which one can bounce?", start: 114.00, duration: 2.00 }, options: [ { text: "စာအုပ်", en: "Book", emoji: '📖', start: 116.00, duration: 1.0 }, { text: "ကုလားထိုင်", en: "Chair", emoji: '🪑', start: 117.00, duration: 1.0 }, { text: "ဘောလုံး", en: "Ball", emoji: '⚽', start: 118.00, duration: 1.0, isCorrect: true } ]},
            { id: 22, question: { text: "ဘယ်ဟာမှာ ဘီးတွေ ပါလဲ။", en: "Which one has wheels?", start: 119.00, duration: 2.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 121.00, duration: 1.0 }, { text: "သစ်ပင်", en: "Tree", emoji: '🌳', start: 122.00, duration: 1.0 }, { text: "စက်ဘီး", en: "Bicycle", emoji: '🚲', start: 123.00, duration: 1.0, isCorrect: true } ]},
            { id: 23, question: { text: "စက္ကူ ဖြတ်ဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to cut paper?", start: 124.00, duration: 3.00 }, options: [ { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 127.00, duration: 1.0 }, { text: "ကတ်ကြေး", en: "Scissors", emoji: '✂️', start: 128.00, duration: 1.0, isCorrect: true }, { text: "ခက်ရင်း", en: "Fork", emoji: '🍴', start: 129.00, duration: 1.0 } ]},
            { id: 24, question: { text: "ခေါင်းမှာ ဘာဝတ်လဲ။", en: "What do you wear on your head?", start: 130.00, duration: 2.00 }, options: [ { text: "ဦးထုပ်", en: "Hat", emoji: '👒', start: 132.00, duration: 1.0, isCorrect: true }, { text: "ခြေအိတ်", en: "Socks", emoji: '🧦', start: 133.00, duration: 1.0 }, { text: "ဖိနပ်", en: "Shoes", emoji: '👟', start: 134.00, duration: 1.0 } ]},
            { id: 25, question: { text: "ဘယ်ဟာက အသီးအနှံလဲ။", en: "Which one is a fruit?", start: 135.00, duration: 2.00 }, options: [ { text: "မုန်လာဥနီ", en: "Carrot", emoji: '🥕', start: 137.00, duration: 1.0 }, { text: "ပန်းဂေါ်ဖီစိမ်း", en: "Broccoli", emoji: '🥦', start: 138.00, duration: 2.0 }, { text: "ငှက်ပျောသီး", en: "Banana", emoji: '🍌', start: 140.00, duration: 1.0, isCorrect: true } ]},
            { id: 26, question: { text: "ဟင်းချို သောက်ဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to eat soup?", start: 141.00, duration: 2.00 }, options: [ { text: "ခက်ရင်း", en: "Fork", emoji: '🍴', start: 143.00, duration: 1.0 }, { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 144.00, duration: 1.0, isCorrect: true }, { text: "ဓား", en: "Knife", emoji: '🔪', start: 145.00, duration: 1.0 } ]},
            { id: 27, question: { text: "ဘယ်ဟာက ဟင်းသီးဟင်းရွက်လဲ။", en: "Which is a vegetable?", start: 146.00, duration: 2.00 }, options: [ { text: "အာလူး", en: "Potato", emoji: '🥔', start: 148.00, duration: 1.0, isCorrect: true }, { text: "ပန်းသီး", en: "Apple", emoji: '🍎', start: 149.00, duration: 1.0 }, { text: "လိမ္မော်သီး", en: "Orange", emoji: '🍊', start: 150.00, duration: 1.0 } ]},
            { id: 28, question: { text: "အေးတဲ့အခါ ဘာဝတ်လဲ။", en: "What do you wear when it's cold?", start: 151.00, duration: 2.00 }, options: [ { text: "မိုးကာအင်္ကျီ", en: "Raincoat", emoji: '🧥', start: 153.00, duration: 2.0 }, { text: "ဂျာကင်အင်္ကျီ", en: "Jacket", emoji: '🧥', start: 155.00, duration: 2.0, isCorrect: true }, { text: "ရေကူးဝတ်စုံ", en: "Swimsuit", emoji: '👙', start: 157.00, duration: 2.0 } ]},
            { id: 29, question: { text: "ဘယ်အကောင်က ခုန်ပေါက်သွားလာလဲ။", en: "What animal hops?", start: 159.00, duration: 2.00 }, options: [ { text: "သစ်ကုလားအုတ်", en: "Kangaroo", emoji: '🦘', start: 161.00, duration: 1.0, isCorrect: true }, { text: "ခြင်္သေ့", en: "Lion", emoji: '🦁', start: 162.00, duration: 1.0 }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 163.00, duration: 1.0 } ]},
            { id: 30, question: { text: "လက်ဆေးဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to wash your hands?", start: 164.00, duration: 2.00 }, options: [ { text: "ရေ", en: "Water", emoji: '💧', start: 166.00, duration: 1.0, isCorrect: true }, { text: "သဲ", en: "Sand", emoji: '🏖️', start: 167.00, duration: 1.0 }, { text: "ခဲတံ", en: "Pencil", emoji: '✏️', start: 168.00, duration: 1.0 } ]},
            { id: 31, question: { text: "ဘယ်ဟာက အလင်းရောင်ပေးလဲ။", en: "Which one makes light?", start: 169.00, duration: 2.00 }, options: [ { text: "မီးအိမ်", en: "Lamp", emoji: '💡', start: 171.00, duration: 1.0, isCorrect: true }, { text: "စာအုပ်", en: "Book", emoji: '📖', start: 172.00, duration: 1.0 }, { text: "ဖိနပ်", en: "Shoe", emoji: '👟', start: 173.00, duration: 1.0 } ]},
            { id: 32, question: { text: "ဘယ်အကောင်မှာ အတောင်ပံ ရှိလဲ။", en: "Which animal has wings?", start: 174.00, duration: 2.00 }, options: [ { text: "ခွေး", en: "Dog", emoji: '🐕', start: 176.00, duration: 1.0 }, { text: "ငှက်", en: "Bird", emoji: '🐦', start: 177.00, duration: 1.0, isCorrect: true }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 178.00, duration: 1.0 } ]},
            { id: 33, question: { text: "မိုးရွာတဲ့နေ့မှာ ဘာကို ဆောင်ထားလဲ။", en: "What do you wear on a rainy day?", start: 179.00, duration: 3.00 }, options: [ { text: "ထီး", en: "Umbrella", emoji: '☂️', start: 182.00, duration: 1.0, isCorrect: true }, { text: "နေကာမျက်မှန်", en: "Sunglasses", emoji: '😎', start: 183.00, duration: 2.0 }, { text: "လက်အိတ်", en: "Gloves", emoji: '🧤', start: 185.00, duration: 1.0 } ]},
            { id: 34, question: { text: "ဘယ်ဟာကို သောက်ဖို့အတွက် အသုံးပြုလဲ။", en: "Which one is used to drink?", start: 186.00, duration: 3.00 }, options: [ { text: "ဖိနပ်", en: "Shoe", emoji: '👟', start: 189.00, duration: 1.0 }, { text: "ခေါင်းအုံး", en: "Pillow", emoji: ' подушка', start: 190.00, duration: 1.0 }, { text: "ခွက်", en: "Cup", emoji: '🥤', start: 191.00, duration: 1.0, isCorrect: true } ]},
            { id: 35, question: { text: "ဖိနပ်ကြိုးချည်ဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to tie your shoes?", start: 192.00, duration: 3.00 }, options: [ { text: "ဖိနပ်ကြိုး", en: "Shoelace", emoji: '🪢', start: 195.00, duration: 1.0, isCorrect: true }, { text: "ခါးပတ်", en: "Belt", emoji: '띠', start: 196.00, duration: 1.0 }, { text: "ပဝါ", en: "Scarf", emoji: '🧣', start: 197.00, duration: 1.0 } ]},
            { id: 36, question: { text: "ဘယ်အကောင်က ဟောင်လဲ။", en: "Which animal barks?", start: 198.00, duration: 2.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 200.00, duration: 1.0 }, { text: "နွား", en: "Cow", emoji: '🐄', start: 201.00, duration: 1.0 }, { text: "ခွေး", en: "Dog", emoji: '🐕', start: 202.00, duration: 1.0, isCorrect: true } ]},
            { id: 37, question: { text: "ဘယ်ဟာက အိမ်မွေးတိရစ္ဆာန်လဲ။", en: "Which one is a pet?", start: 203.00, duration: 2.00 }, options: [ { text: "သစ်ပင်", en: "Tree", emoji: '🌳', start: 205.00, duration: 1.0 }, { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 206.00, duration: 1.0, isCorrect: true }, { text: "ကျောက်တုံး", en: "Rock", emoji: '🪨', start: 207.00, duration: 1.0 } ]},
            { id: 38, question: { text: "စာရေးဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to write?", start: 208.00, duration: 2.00 }, options: [ { text: "ခဲတံ", en: "Pencil", emoji: '✏️', start: 210.00, duration: 1.0, isCorrect: true }, { text: "ကုလားထိုင်", en: "Chair", emoji: '🪑', start: 211.00, duration: 1.0 }, { text: "စောင်", en: "Blanket", emoji: '🧣', start: 212.00, duration: 1.0 } ]},
            { id: 39, question: { text: "ဖုန်းခေါ်ဖို့ ဘာကို အသုံးပြုလဲ။", en: "What do you use to make a call?", start: 213.00, duration: 2.00 }, options: [ { text: "ဖုန်း", en: "Phone", emoji: '📱', start: 215.00, duration: 1.0, isCorrect: true }, { text: "ဖိနပ်", en: "Shoe", emoji: '👟', start: 216.00, duration: 1.0 }, { text: "အရုပ်", en: "Toy", emoji: '🧸', start: 217.00, duration: 1.0 } ]},
            { id: 40, question: { text: "ဘယ်ဟာက သယ်ယူပို့ဆောင်ရေး နည်းလမ်းလဲ။", en: "Which one is a mode of transportation?", start: 218.00, duration: 3.00 }, options: [ { text: "စာအုပ်", en: "Book", emoji: '📖', start: 221.00, duration: 1.0 }, { text: "ပန်း", en: "Flower", emoji: '🌸', start: 222.00, duration: 1.0 }, { text: "ရထား", en: "Train", emoji: '🚂', start: 223.00, duration: 1.0, isCorrect: true } ]},
            { id: 41, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က '​မြောင်'​ လို့အော်လဲ။", en: "Which animal says meow?", start: 0.00, duration: 3.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 3.00, duration: 1.0, isCorrect: true }, { text: "ခွေး", en: "Dog", emoji: '🐕', start: 4.00, duration: 1.0 }, { text: "နွား", en: "Cow", emoji: '🐄', start: 5.00, duration: 1.0 } ]},
            { id: 42, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က နှာမောင်းရှည်သလဲ။", en: "Which animal has a long trunk?", start: 6.00, duration: 3.00 }, options: [ { text: "ဆင်", en: "Elephant", emoji: '🐘', start: 9.00, duration: 1.0, isCorrect: true }, { text: "ကျား", en: "Tiger", emoji: '🐅', start: 10.00, duration: 1.0 }, { text: "ခြင်္သေ့", en: "Lion", emoji: '🦁', start: 11.00, duration: 1.0 } ]},
            { id: 43, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က သမုဒ္ဒရာထဲမှာ ရေကူးနိုင်သလဲ။", en: "Which animal can swim in the ocean?", start: 12.00, duration: 3.00 }, options: [ { text: "မျောက်", en: "Monkey", emoji: '🐒', start: 15.00, duration: 1.0 }, { text: "ယုန်", en: "Rabbit", emoji: '🐇', start: 16.00, duration: 1.0 }, { text: "ငါး", en: "Fish", emoji: '🐟', start: 17.00, duration: 1.0, isCorrect: true } ]},
            { id: 44, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က တောရဲ့ဘုရင်လဲ။", en: "Which animal is the king of the jungle?", start: 18.00, duration: 3.00 }, options: [ { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 21.00, duration: 1.0 }, { text: "ခြင်္သေ့", en: "Lion", emoji: '🦁', start: 22.00, duration: 1.0, isCorrect: true }, { text: "ဆိတ်", en: "Goat", emoji: '🐐', start: 23.00, duration: 1.0 } ]},
            { id: 45, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က ကျွန်တော်တို့ကို နို့ပေးသလဲ။", en: "Which animal gives us milk?", start: 24.00, duration: 3.00 }, options: [ { text: "နွား", en: "Cow", emoji: '🐄', start: 27.00, duration: 1.0, isCorrect: true }, { text: "ခွေး", en: "Dog", emoji: '🐕', start: 28.00, duration: 1.0 }, { text: "မြင်း", en: "Horse", emoji: '🐎', start: 29.00, duration: 1.0 } ]},
            { id: 46, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်ငှက်က 'ဟဲလို' လို့ပြောနိုင်သလဲ။", en: "Which bird can say hello?", start: 30.00, duration: 3.00 }, options: [ { text: "ကြက်တူရွေး", en: "Parrot", emoji: '🦜', start: 33.00, duration: 1.0, isCorrect: true }, { text: "ဘဲ", en: "Duck", emoji: '🦆', start: 34.00, duration: 1.0 }, { text: "ကြက်", en: "Chicken", emoji: '🐔', start: 35.00, duration: 1.0 } ]},
            { id: 47, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က ခုန်ပြီတော့ နားရွက်ရှည်သလဲ။", en: "Which animal hops and has long ears?", start: 36.00, duration: 3.00 }, options: [ { text: "မြေခွေး", en: "Fox", emoji: '🦊', start: 39.00, duration: 1.0 }, { text: "ကြောင်", en: "Cat", emoji: '🐈', start: 40.00, duration: 1.0 }, { text: "ယုန်", en: "Rabbit", emoji: '🐇', start: 41.00, duration: 1.0, isCorrect: true } ]},
            { id: 48, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က အဖြူနဲ့အမည်း အစင်းကြောင်းတွေရှိသလဲ။", en: "Which animal has black and white stripes?", start: 42.00, duration: 4.00 }, options: [ { text: "သစ်ကုလားအုတ်", en: "Giraffe", emoji: '🦒', start: 46.00, duration: 1.0 }, { text: "မြင်းကျား", en: "Zebra", emoji: '🦓', start: 47.00, duration: 1.0, isCorrect: true }, { text: "ဝက်ဝံ", en: "Bear", emoji: '🐻', start: 48.00, duration: 1.0 } ]},
            { id: 49, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က သစ်ပင်တက်ပြီး ငှက်ပျောသီးစားနိုင်သလဲ။", en: "Which animal can climb trees and eat bananas?", start: 49.00, duration: 4.00 }, options: [ { text: "မျောက်", en: "Monkey", emoji: '🐒', start: 53.00, duration: 1.0, isCorrect: true }, { text: "သိုး", en: "Sheep", emoji: '🐑', start: 54.00, duration: 1.0 }, { text: "မြင်း", en: "Horse", emoji: '🐎', start: 55.00, duration: 1.0 } ]},
            { id: 50, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အကောင်က လည်ပင်းအရမ်းရှည်သလဲ။", en: "Which animal has a very long neck?", start: 56.00, duration: 3.00 }, options: [ { text: "ဝက်", en: "Pig", emoji: '🐷', start: 59.00, duration: 1.0 }, { text: "ကျား", en: "Tiger", emoji: '🐅', start: 60.00, duration: 1.0 }, { text: "သစ်ကုလားအုတ်", en: "Giraffe", emoji: '🦒', start: 61.00, duration: 1.0, isCorrect: true } ]},
            { id: 51, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက သစ်သီးလဲ။", en: "Which one is a fruit?", start: 62.00, duration: 2.00 }, options: [ { text: "ပန်းသီး", en: "Apple", emoji: '🍎', start: 64.00, duration: 1.0, isCorrect: true }, { text: "ပေါင်မုန့်", en: "Bread", emoji: '🍞', start: 65.00, duration: 1.0 }, { text: "ဒိန်ခဲ", en: "Cheese", emoji: '🧀', start: 66.00, duration: 1.0 } ]},
            { id: 52, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက အဝါရောင်လဲ။", en: "Which one is yellow?", start: 67.00, duration: 2.00 }, options: [ { text: "ခရမ်းချဉ်သီး", en: "Tomato", emoji: '🍅', start: 69.00, duration: 2.0 }, { text: "ငှက်ပျောသီး", en: "Banana", emoji: '🍌', start: 71.00, duration: 1.0, isCorrect: true }, { text: "စတော်ဘယ်ရီ", en: "Strawberry", emoji: '🍓', start: 72.00, duration: 1.0 } ]},
            { id: 53, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အချိုရည်က အေးပြီး အဖြူရောင်လဲ။", en: "Which drink is cold and white?", start: 73.00, duration: 3.00 }, options: [ { text: "လက်ဖက်ရည်", en: "Tea", emoji: '🍵', start: 76.00, duration: 1.0 }, { text: "ဖျော်ရည်", en: "Juice", emoji: '🧃', start: 77.00, duration: 1.0 }, { text: "နို့", en: "Milk", emoji: '🥛', start: 78.00, duration: 1.0, isCorrect: true } ]},
            { id: 54, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အစားအစာက ပျားတွေဆီကလာတာလဲ။", en: "Which food comes from bees?", start: 79.00, duration: 3.00 }, options: [ { text: "ပျားရည်", en: "Honey", emoji: '🍯', start: 82.00, duration: 1.0, isCorrect: true }, { text: "ထောပတ်", en: "Butter", emoji: '🧈', start: 83.00, duration: 1.0 }, { text: "ဆန်", en: "Rice", emoji: '🍚', start: 84.00, duration: 1.0 } ]},
            { id: 55, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက ဟင်းသီးဟင်းရွက်လဲ။", en: "Which one is a vegetable?", start: 85.00, duration: 2.00 }, options: [ { text: "ကိတ်မုန့်", en: "Cake", emoji: '🎂', start: 87.00, duration: 1.0 }, { text: "မုန်လာဥနီ", en: "Carrot", emoji: '🥕', start: 88.00, duration: 1.0, isCorrect: true }, { text: "ရေခဲမုန့်", en: "Ice cream", emoji: '🍦', start: 89.00, duration: 1.0 } ]},
            { id: 56, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အစားအစာက ချိုသလဲ။", en: "Which food is sweet?", start: 90.00, duration: 2.00 }, options: [ { text: "သကြားလုံး", en: "Candy", emoji: '🍬', start: 92.00, duration: 1.0, isCorrect: true }, { text: "ဆန်", en: "Rice", emoji: '🍚', start: 93.00, duration: 1.0 }, { text: "ပေါင်မုန့်", en: "Bread", emoji: '🍞', start: 94.00, duration: 1.0 } ]},
            { id: 57, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက လုံးပြီး အနီရောင်လဲ။", en: "Which one is round and red?", start: 95.00, duration: 3.00 }, options: [ { text: "ခရမ်းချဉ်သီး", en: "Tomato", emoji: '🍅', start: 98.00, duration: 2.0, isCorrect: true }, { text: "အာလူး", en: "Potato", emoji: '🥔', start: 100.00, duration: 1.0 }, { text: "မုန်လာဥနီ", en: "Carrot", emoji: '🥕', start: 101.00, duration: 2.0 } ]},
            { id: 58, audioFile: 'Quiz_Game2.mp3', question: { text: "ပီဇာပေါ်မှာ ဘယ်အစားအစာကို ထည့်သလဲ။", en: "Which food do we put on pizza?", start: 103.00, duration: 3.00 }, options: [ { text: "ဆပ်ပြာ", en: "Soap", emoji: '🧼', start: 106.00, duration: 1.0 }, { text: "ရေ", en: "Water", emoji: '💧', start: 107.00, duration: 1.0 }, { text: "ဒိန်ခဲ", en: "Cheese", emoji: '🧀', start: 108.00, duration: 1.0, isCorrect: true } ]},
            { id: 59, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အချိုရည်က ပူသလဲ။", en: "Which drink is hot?", start: 109.00, duration: 2.00 }, options: [ { text: "လက်ဖက်ရည်", en: "Tea", emoji: '🍵', start: 111.00, duration: 1.0, isCorrect: true }, { text: "ဖျော်ရည်", en: "Juice", emoji: '🧃', start: 112.00, duration: 1.0 }, { text: "ရေခဲရေ", en: "Ice water", emoji: '🧊', start: 113.00, duration: 1.0 } ]},
            { id: 60, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်အစားအစာက အစိမ်းရောင်နဲ့ သေးငယ်လဲ။", en: "Which food is green and small?", start: 114.00, duration: 3.00 }, options: [ { text: "ချောကလက်", en: "Chocolate", emoji: '🍫', start: 117.00, duration: 1.0 }, { text: "ပေါင်မုန့်", en: "Bread", emoji: '🍞', start: 118.00, duration: 1.0 }, { text: "ပဲစေ့", en: "Peas", emoji: '🫛', start: 119.00, duration: 1.0, isCorrect: true } ]},
            { id: 61, audioFile: 'Quiz_Game2.mp3', question: { text: "စာရေးဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to write?", start: 120.00, duration: 2.00 }, options: [ { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 122.00, duration: 1.0 }, { text: "ခဲတံ", en: "Pencil", emoji: '✏️', start: 123.00, duration: 1.0, isCorrect: true }, { text: "ဘောလုံး", en: "Ball", emoji: '⚽', start: 124.00, duration: 1.0 } ]},
            { id: 62, audioFile: 'Quiz_Game2.mp3', question: { text: "စာအုပ်ဖတ်ဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to read?", start: 125.00, duration: 3.00 }, options: [ { text: "ကုလားထိုင်", en: "Chair", emoji: '🪑', start: 128.00, duration: 1.0 }, { text: "စာအုပ်", en: "Book", emoji: '📖', start: 129.00, duration: 1.0, isCorrect: true }, { text: "ပန်းကန်", en: "Plate", emoji: '🍽️', start: 130.00, duration: 1.0 } ]},
            { id: 63, audioFile: 'Quiz_Game2.mp3', question: { text: "ရေသောက်ဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to drink water?", start: 131.00, duration: 2.00 }, options: [ { text: "ခွက်", en: "Cup", emoji: '🥤', start: 133.00, duration: 1.0, isCorrect: true }, { text: "ဘောပင်", en: "Pen", emoji: '✒️', start: 134.00, duration: 1.0 }, { text: "အိတ်", en: "Bag", emoji: '👜', start: 135.00, duration: 1.0 } ]},
            { id: 64, audioFile: 'Quiz_Game2.mp3', question: { text: "ခြေထောက်မှာ ဘာဝတ်လဲ။", en: "What do you wear on your feet?", start: 136.00, duration: 2.00 }, options: [ { text: "ဦးထုပ်", en: "Hat", emoji: '👒', start: 138.00, duration: 1.0 }, { text: "ဖိနပ်", en: "Shoes", emoji: '👟', start: 139.00, duration: 1.0, isCorrect: true }, { text: "လက်အိတ်", en: "Gloves", emoji: '🧤', start: 140.00, duration: 1.0 } ]},
            { id: 65, audioFile: 'Quiz_Game2.mp3', question: { text: "စာရွက်ဖြတ်ဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to cut paper?", start: 141.00, duration: 3.00 }, options: [ { text: "ပေတံ", en: "Ruler", emoji: '📏', start: 144.00, duration: 1.0 }, { text: "ခဲဖျက်", en: "Eraser", emoji: '📝', start: 145.00, duration: 1.0 }, { text: "ကတ်ကြေး", en: "Scissors", emoji: '✂️', start: 146.00, duration: 1.0, isCorrect: true } ]},
            { id: 66, audioFile: 'Quiz_Game2.mp3', question: { text: "ခဲတံနဲ့ရေးတာကို ဖျက်ဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to erase a pencil?", start: 147.00, duration: 3.00 }, options: [ { text: "ခဲဖျက်", en: "Eraser", emoji: '📝', start: 150.00, duration: 1.0, isCorrect: true }, { text: "မာကာ", en: "Marker", emoji: '🖍️', start: 151.00, duration: 1.0 }, { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 152.00, duration: 1.0 } ]},
            { id: 67, audioFile: 'Quiz_Game2.mp3', question: { text: "ကျောင်းမှာ ဘယ်ပေါ်မှာ ထိုင်သလဲ။", en: "What do you sit on at school?", start: 153.00, duration: 2.00 }, options: [ { text: "ပန်းကန်", en: "Plate", emoji: '🍽️', start: 155.00, duration: 1.0 }, { text: "ကုလားထိုင်", en: "Chair", emoji: '🪑', start: 156.00, duration: 1.0, isCorrect: true }, { text: "သစ်ပင်", en: "Tree", emoji: '🌳', start: 157.00, duration: 1.0 } ]},
            { id: 68, audioFile: 'Quiz_Game2.mp3', question: { text: "ပုံဆွဲဖို့အတွက် ဘာကိုသုံးလဲ။", en: "What do you use to color a picture?", start: 158.00, duration: 2.00 }, options: [ { text: "ဇွန်း", en: "Spoon", emoji: '🥄', start: 160.00, duration: 1.0 }, { text: "ဓား", en: "Knife", emoji: '🔪', start: 161.00, duration: 1.0 }, { text: "ဖယောင်းခဲ", en: "Crayon", emoji: '🖍️', start: 162.00, duration: 1.0, isCorrect: true } ]},
            { id: 69, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက အရှည်ကို တိုင်းတာဖို့လဲ။", en: "Which one is for measuring length?", start: 163.00, duration: 3.00 }, options: [ { text: "ပေတံ", en: "Ruler", emoji: '📏', start: 166.00, duration: 1.0, isCorrect: true }, { text: "စာအုပ်", en: "Book", emoji: '📖', start: 167.00, duration: 1.0 }, { text: "လိမ္မော်သီး", en: "Orange", emoji: '🍊', start: 168.00, duration: 1.0 } ]},
            { id: 70, audioFile: 'Quiz_Game2.mp3', question: { text: "ဘယ်တစ်ခုက အချိန်ကြည့်ဖို့ ကူညီပေးသလဲ။", en: "Which one helps you see the time?", start: 169.00, duration: 3.00 }, options: [ { text: "ဘောပင်", en: "Pen", emoji: '✒️', start: 172.00, duration: 1.0 }, { text: "နာရီ", en: "Clock", emoji: '⏰', start: 173.00, duration: 1.0, isCorrect: true }, { text: "စားပွဲ", en: "Table", emoji: '🪑', start: 174.00, duration: 2.0 } ]}
        ];
        
        // --- DOM ELEMENTS (GENERAL QUIZ) ---
        const generalQuizAudio = byId('general-quiz-audio');
        const generalQuizAudio2 = byId('general-quiz-audio-2');
        const audioElements = {
            'Quiz_Game.mp3': generalQuizAudio,
            'Quiz_Game2.mp3': generalQuizAudio2,
        };
        const generalQuizContainer = byId('general-quiz-container');
        const generalQuizOptionsGrid = byId('general-quiz-options-grid');
        const generalQuizQuestionEn = byId('general-quiz-question-en');
        const generalQuizQuestionMy = byId('general-quiz-question-my');
        const generalQuizFeedback = byId('general-quiz-feedback');
        const generalQuizScoreEl = byId('general-quiz-score');
        const generalQuizTimerContainer = byId('general-quiz-timer-container');
        const generalQuizTimerBar = byId('general-quiz-timer-bar');

        // ====================================================================
        // --- GENERAL UTILITIES & GAME SWITCHING ---
        // ====================================================================
        const firebaseStatus = byId('firebase-status');

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // --- NEW FUNCTION: Toggles the visibility of the English question ---
        function toggleEnglishQuestion() {
            generalQuizQuestionEn.classList.toggle('hidden');
        }
        window.toggleEnglishQuestion = toggleEnglishQuestion; // Expose to global scope for inline onclick
        
        function playAudio(audioElement, startTime, duration) {
            if (!audioElement) return;

            // Clear any existing stop timer associated with this element
            if (audioElement.stopTimer) {
                clearTimeout(audioElement.stopTimer);
            }

            audioElement.pause();
            audioElement.currentTime = startTime;

            const playPromise = audioElement.play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    if (duration) {
                        // Set a timeout to stop playback after the duration
                        audioElement.stopTimer = setTimeout(() => {
                            audioElement.pause();
                        }, duration * 1000);
                    }
                }).catch(error => { /* Autoplay error - silent fail */ });
            }
        }
        
        function switchGame() {
            currentGame = (currentGame === 'anatomy') ? 'general' : 'anatomy';
            
            // Force stop and reset audio
            phase1_2_Audio.pause(); // 'anatomyAudio' မှ 'phase1_2_Audio' သို့ ပြင်ဆင်
            phase1_2_Audio.currentTime = 0; // 'anatomyAudio' မှ 'phase1_2_Audio' သို့ ပြင်ဆင်
            itemsAudio.pause(); // Phase 3,4,5 audio ကိုပါ ပိတ်ရန် ထည့်သွင်း
            itemsAudio.currentTime = 0; // Phase 3,4,5 audio ကိုပါ reset လုပ်ရန် ထည့်သွင်း
            generalQuizAudio.pause();
            generalQuizAudio.currentTime = 0;
            if (generalQuizAudio2) {
                generalQuizAudio2.pause();
                generalQuizAudio2.currentTime = 0;
            }

            // Stop all timers
            clearTimeout(generalQuizTimer);
            clearTimeout(window.learningTextTimer);

            if (currentGame === 'anatomy') {
                byId('anatomy-quiz-container').classList.remove('hidden');
                byId('general-quiz-container').classList.add('hidden');
                displayLearningMode();
            } else {
                byId('anatomy-quiz-container').classList.add('hidden');
                byId('general-quiz-container').classList.remove('hidden');
                startGeneralQuiz();
            }
        }
        window.switchGame = switchGame;

        // ====================================================================
        // --- ANATOMY QUIZ - FUNCTIONS ---
        // ====================================================================

        // ပုံ သို့မဟုတ် emoji ကို ပြသရန် helper function
        function getItemVisual(part) {
            if (part.type === 'emoji') {
                return `<span class="emoji">${part.emoji}</span>`;
            }
            return `<img src="${getImageUrl(part.name)}" alt="${part.en}" onerror="this.onerror=null; this.src='https://placehold.co/120x120/9ca3af/ffffff?text=${part.en.substring(0,2)}'">`;
        }

        function getImageUrl(burmeseName) { return `https://raw.githubusercontent.com/nathantun93/Pic/main/${burmeseName}.png`; }
        function getActiveParts() { return learningItems.slice((currentPhase - 1) * 14, (currentPhase - 1) * 14 + currentSetSize); } // bodyParts မှ ပြောင်း
        
        function playSpecificAudio(part) { 
            if (!part) return;
            // Phase 3, 4, 5 (ID > 28) ဖြစ်ပါက အသံဖိုင်အသစ်ကို ဖွင့်
            if (part.id > 28) { 
                playAudio(itemsAudio, part.start, part.duration || 2.0);
            } else {
                playAudio(phase1_2_Audio, part.start, part.duration || 1.0);
            }
        }
        window.playSpecificAudio = (id) => playSpecificAudio(learningItems.find(p => p.id === id)); // bodyParts မှ ပြောင်း
        
        function handleLearningClick(partId) {
            if (!isLearningMode || awaitingAnswer) return;
            const part = learningItems.find(p => p.id === partId); // bodyParts မှ ပြောင်း
            if (part) {
                playSpecificAudio(part); 
                instructionText.textContent = part.name; 
                instructionText.classList.remove('invisible');
                clearTimeout(window.learningTextTimer);
                window.learningTextTimer = setTimeout(() => { instructionText.textContent = ''; instructionText.classList.add('invisible'); }, 1500);
            }
        }
        window.handleLearningClick = handleLearningClick;
        
        function initializeState(phase) {
            currentPhase = parseInt(phase, 10);
            currentLevelIndex = 0;
            currentSetSize = LEVEL_SIZES[currentLevelIndex];
            partStats = {};
            learningItems.slice((currentPhase - 1) * 14, currentPhase * 14).forEach(part => partStats[part.id] = 0); // bodyParts မှ ပြောင်း
        }

        function togglePhase() {
            initializeState((currentPhase % 5) + 1); // Phase 1-5 လည်ပတ်ရန် ပြင်ဆင်
            displayLearningMode();
        }
        window.togglePhase = togglePhase;

        function updateProgress() {
            const partsInSet = getActiveParts();
            const partsMastered = partsInSet.filter(p => (partStats[p.id] || 0) >= 2).length;
            const currentScore = partsInSet.reduce((sum, part) => sum + Math.min(partStats[part.id] || 0, 2), 0);
            progressText.textContent = `Phase ${currentPhase}, Level ${currentLevelIndex + 1} (${currentSetSize} Parts) | Mastered: ${partsMastered}/${currentSetSize} | Score: ${currentScore}/${currentSetSize * 2}`;
            phaseToggleButton.textContent = `Phase ${currentPhase}: ${phaseNames[currentPhase - 1]}`; // Phase နာမည်ကို ပြသရန်
            if (isLearningMode) {
                startButton.textContent = "Start Quiz!"; startButton.className = startButton.className.replace(/bg-yellow-500|hover:bg-yellow-600/g, 'bg-green-500 hover:bg-green-600');
                startButton.setAttribute('onclick', 'window.__ilqApp.startQuizMode()'); startButton.disabled = false; phaseToggleButton.disabled = false;
            } else {
                startButton.textContent = `Replay Audio`; startButton.className = startButton.className.replace(/bg-green-500|hover:bg-green-600/g, 'bg-yellow-500 hover:bg-yellow-600');
                startButton.setAttribute('onclick', 'window.__ilqApp.playTargetAudio()'); phaseToggleButton.disabled = true;
            }
        }
        
        function showReward(title, message) {
            feedbackMessage.className = 'mt-6 text-center text-3xl font-bold h-auto text-white bg-gradient-to-r from-pink-500 to-red-500 p-4 rounded-xl shadow-2xl animate-pulse';
            feedbackMessage.textContent = title;
            instructionText.className = 'burmese-text text-lg level-up-title h-auto text-left text-3xl text-yellow-700 font-extrabold animate-bounce';
            instructionText.textContent = message;
            setTimeout(() => {
                feedbackMessage.className = 'mt-6 text-center text-2xl font-bold h-8'; feedbackMessage.textContent = '';
                instructionText.className = 'burmese-text text-lg level-up-title invisible h-8 text-left'; instructionText.textContent = ''; 
            }, 4000);
        }

        function checkProgressionAndAdvance() {
            const activePartsForCheck = getActiveParts();
            if (activePartsForCheck.length > 0 && activePartsForCheck.every(part => (partStats[part.id] || 0) >= 2)) {
                if (currentLevelIndex < LEVEL_SIZES.length - 1) {
                    currentLevelIndex++; currentSetSize = LEVEL_SIZES[currentLevelIndex];
                    showReward(`Level ${currentLevelIndex} Complete! 🎉`, `Advancing to Level ${currentLevelIndex + 1} (${currentSetSize} parts).`);
                    getActiveParts().forEach(part => { if (partStats[part.id] === undefined) partStats[part.id] = 0; });
                } else {
                    if (currentPhase < 5) { // Phase 5 ထက်ငယ်နေသေးလျှင်
                        showReward(`Phase ${currentPhase} Mastered! 🌟`, `Moving to Phase ${currentPhase + 1}.`); 
                        initializeState(currentPhase + 1); 
                    } else { // Phase 5 ပြီးသွားလျှင်
                        showReward(`Total Mastery! 🏆`, `Resetting to Phase 1.`); 
                        initializeState(1); 
                    }
                }
                setTimeout(() => displayLearningMode(), 4500);
                return true;
            }
            return false;
        }

        async function displayLearningMode() {
            isLearningMode = true; 
            awaitingAnswer = false; 
            targetPart = null; 
            feedbackMessage.textContent = '';
            instructionText.className = 'burmese-text text-lg level-up-title invisible h-8 text-left';
            optionsGrid.innerHTML = getActiveParts().map(part => `<div class="option-card" onclick="window.__ilqApp.handleLearningClick(${part.id})"><div class="image-container">${getItemVisual(part)}</div><p class="part-name text-md font-bold text-gray-700">${part.en.toUpperCase()}</p></div>`).join(''); // getItemVisual သုံးရန် ပြင်ဆင်
            optionsGrid.className = currentSetSize <= 3 ? 'grid grid-cols-3 gap-4 max-w-sm mx-auto' : currentSetSize <= 6 ? 'grid grid-cols-3 gap-4 max-w-lg mx-auto' : 'grid grid-cols-4 lg:grid-cols-5 gap-4';
            updateProgress();
        }

        function startQuizMode() { if (isLearningMode) { isLearningMode = false; quizSessionParts = getActiveParts().map(p => p.id); setupNewRound(); } }
        window.startQuizMode = startQuizMode;
        
        async function setupNewRound() {
            if (quizSessionParts.length === 0) {
                feedbackMessage.textContent = 'Quiz cycle complete. Continuing...';
                quizSessionParts = getActiveParts().map(p => p.id);
                setTimeout(() => { feedbackMessage.textContent = ''; }, 1000); 
            }

            if (quizSessionParts.length === 0) {
                console.error("Failed to get active parts for the quiz round. Resetting to learning mode.");
                displayLearningMode();
                return;
            }
            const activeParts = getActiveParts();
            const targetPartId = quizSessionParts.splice(Math.floor(Math.random() * quizSessionParts.length), 1)[0];
            targetPart = learningItems.find(p => p.id === targetPartId); // bodyParts မှ ပြောင်း
            
            if (!targetPart) {
                console.error("A target part could not be selected. This may be due to a state inconsistency. Resetting quiz to a safe state.");
                displayLearningMode();
                return;
            }

            let options = (currentSetSize <= 3) ? [...activeParts] : [targetPart, ...shuffleArray(activeParts.filter(p => p.id !== targetPart.id)).slice(0, 2)];
            feedbackMessage.textContent = ''; instructionText.classList.remove('invisible'); instructionText.textContent = targetPart.name;
            awaitingAnswer = true;
            optionsGrid.innerHTML = shuffleArray(options).map(part => `<div id="option-${part.id}" class="option-card" onclick="window.__ilqApp.handleSelection(${part.id})"><div class="image-container">${getItemVisual(part)}</div><p class="part-name text-md font-bold text-gray-700">${part.en.toUpperCase()}</p></div>`).join(''); // getItemVisual သုံးရန် ပြင်ဆင်
            optionsGrid.className = 'grid grid-cols-3 gap-4 max-w-lg mx-auto';
            updateProgress(); playTargetAudio(); 
        }

        function playTargetAudio() { if (targetPart) playSpecificAudio(targetPart); }
        window.playTargetAudio = playTargetAudio;

        function handleSelection(selectedId) {
            if (!awaitingAnswer || isLearningMode) return;
            awaitingAnswer = false; Array.from(optionsGrid.children).forEach(child => child.onclick = null); startButton.disabled = true; 
            const isCorrect = selectedId === targetPart.id;
            byId(`option-${selectedId}`).classList.add(isCorrect ? 'correct' : 'incorrect');
            if (!isCorrect) byId(`option-${targetPart.id}`)?.classList.add('correct');
            feedbackMessage.textContent = isCorrect ? "Correct! Well Done! 🎉" : `Incorrect. The answer is "${targetPart.en}". 😥`;
            feedbackMessage.className = `mt-6 text-center text-2xl font-bold h-8 ${isCorrect ? 'text-green-600' : 'text-red-500'}`;
            if (isCorrect && (partStats[selectedId] || 0) < 2) partStats[selectedId]++;

            const progressed = checkProgressionAndAdvance();

            if (!progressed) {
                setTimeout(() => { 
                    startButton.disabled = false; 
                    setupNewRound(); 
                }, 2000);
            }
        }
        window.handleSelection = handleSelection;

        // ====================================================================
        // --- GENERAL QUIZ - FUNCTIONS ---
        // ====================================================================
        function startGeneralQuiz() {
            currentGeneralQuizIndex = 0; generalQuizScore = 0;
            generalQuizQuestions = shuffleArray([...generalQuizData]);
            generalQuizFeedback.textContent = '';
            generalQuizScoreEl.textContent = `Score: 0`;
            const welcome = [{start: 0.00, duration: 4.00}, {start: 4.00, duration: 5.00}][Math.floor(Math.random() * 2)];
            playAudio(generalQuizAudio, welcome.start, welcome.duration);
            setTimeout(displayNextGeneralQuizQuestion, 4500);
        }

        async function playQuestionAndOptionsSequentially(question) {
            const audioFile = question.audioFile || 'Quiz_Game.mp3';
            const audioElement = audioElements[audioFile];

            if (!audioElement) {
                console.error(`Audio element for ${audioFile} not found.`);
                generalQuizAwaitingAnswer = true;
                startTimer();
                // Reveal all options immediately if audio fails
                Array.from(generalQuizOptionsGrid.children).forEach(child => child.classList.remove('opacity-0'));
                return;
            }

            // 1. Play the question audio and wait for it to finish.
            playAudio(audioElement, question.question.start, question.question.duration);
            await new Promise(resolve => setTimeout(resolve, (question.question.duration * 1000) + 250)); // Wait for audio + small pause

            // 2. Reveal and play each option sequentially.
            const optionElements = generalQuizOptionsGrid.children;
            for (let i = 0; i < optionElements.length; i++) {
                const option = question.options[i];
                if (optionElements[i]) {
                    optionElements[i].classList.remove('opacity-0'); // Reveal option
                    playAudio(audioElement, option.start, option.duration); // Play its audio
                    await new Promise(resolve => setTimeout(resolve, (option.duration * 1000) + 500)); // Wait for audio + pause
                }
            }

            // 3. Once all options are presented, allow the user to answer and start the timer.
            generalQuizAwaitingAnswer = true;
            startTimer();
        }

        function displayNextGeneralQuizQuestion() {
            clearTimeout(generalQuizTimer); 
            generalQuizFeedback.textContent = '';
            generalQuizAwaitingAnswer = false; // Player cannot answer yet

            if (currentGeneralQuizIndex >= generalQuizQuestions.length) {
                generalQuizQuestionEn.textContent = "Quiz Complete!";
                generalQuizQuestionMy.textContent = "ဂုဏ်ယူပါတယ်။ အားလုံးဖြေဆိုပြီးပါပြီ။";
                generalQuizFeedback.textContent = `Final Score: ${generalQuizScore} / ${generalQuizQuestions.length}`;
                generalQuizOptionsGrid.innerHTML = `<button onclick="window.__ilqApp.startGeneralQuiz()" class="col-span-3 py-2 px-6 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:bg-blue-600">Play Again</button>`;
                generalQuizTimerContainer.classList.add('invisible');
                return;
            }
            
            const q = generalQuizQuestions[currentGeneralQuizIndex];
            generalQuizQuestionEn.textContent = q.question.en;
            generalQuizQuestionMy.textContent = q.question.text;
            
            // --- ADDED: Hide English question by default ---
            generalQuizQuestionEn.classList.add('hidden');

            // Render options initially hidden
            generalQuizOptionsGrid.innerHTML = q.options.map((opt, index) => `<div id="general-opt-${index}" class="option-card opacity-0" onclick="window.__ilqApp.handleGeneralQuizSelection(${index})"><div class="image-container"><span class="emoji">${opt.emoji}</span></div><p class="part-name text-sm font-semibold text-gray-700"><span class="font-bold text-gray-800">${opt.en}</span><br><span class="font-light burmese-text text-lg">${opt.text}</span></p></div>`).join('');
            
            // Start the sequential presentation
            playQuestionAndOptionsSequentially(q);
        }
        
        function handleGeneralQuizSelection(selectedIndex) {
            if (!generalQuizAwaitingAnswer) return;
            generalQuizAwaitingAnswer = false; clearTimeout(generalQuizTimer); generalQuizTimerContainer.classList.add('invisible');
            Array.from(generalQuizOptionsGrid.children).forEach(child => child.onclick = null);
            const question = generalQuizQuestions[currentGeneralQuizIndex];
            const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
            if (selectedIndex !== null && question.options[selectedIndex].isCorrect) {
                generalQuizScore++;
                generalQuizFeedback.textContent = "Correct! 🎉";
                generalQuizFeedback.className = 'mt-6 text-center text-2xl font-bold h-8 text-green-600';
                byId(`general-opt-${selectedIndex}`).classList.add('correct');
                
                // Play audio for the correct answer
                const correctOption = question.options[selectedIndex];
                const audioFile = question.audioFile || 'Quiz_Game.mp3';
                const audioElement = audioElements[audioFile];
                if (audioElement && correctOption.start !== undefined && correctOption.duration !== undefined) {
                    // Stop other sounds before playing
                    Object.values(audioElements).forEach(audio => {
                        if (audio !== audioElement) {
                           audio.pause();
                           if(audio.stopTimer) clearTimeout(audio.stopTimer);
                        }
                    });
                    playAudio(audioElement, correctOption.start, correctOption.duration);
                }
            } else {
                generalQuizFeedback.textContent = "Incorrect. 😥"; generalQuizFeedback.className = 'mt-6 text-center text-2xl font-bold h-8 text-red-500';
                if(selectedIndex !== null) byId(`general-opt-${selectedIndex}`).classList.add('incorrect');
                byId(`general-opt-${correctOptionIndex}`).classList.add('correct');
            }
            generalQuizScoreEl.textContent = `Score: ${generalQuizScore}`; currentGeneralQuizIndex++;
            setTimeout(displayNextGeneralQuizQuestion, 2000);
        }
        window.handleGeneralQuizSelection = handleGeneralQuizSelection;

        function startTimer() {
            generalQuizTimerContainer.classList.remove('invisible'); let timeLeft = 5000;
            generalQuizTimerBar.style.width = '100%'; generalQuizTimerBar.style.transitionDuration = '0s';
            const timerFn = () => {
                timeLeft -= 50;
                generalQuizTimerBar.style.width = `${(timeLeft / 5000) * 100}%`;
                if (timeLeft <= 0) {
                    clearTimeout(generalQuizTimer); // Timer runs out, but do not advance. Wait for user click.
                } else {
                    generalQuizTimer = setTimeout(timerFn, 50);
                }
            };
            setTimeout(() => { generalQuizTimerBar.style.transitionDuration = '0.1s'; timerFn(); }, 100);
        }



        // Namespaced bridge for the onclick="..." strings embedded in the
        // HTML above (inline handlers always resolve via the global scope,
        // but these functions are declared inside this component's closure)
        // -- namespaced (not bare window.switchGame etc.) so a same-named
        // function from a different hybrid-wrapped app mounted alongside
        // this one can't silently overwrite it.
        window.__ilqApp = {
          switchGame, togglePhase, startQuizMode, toggleEnglishQuestion,
          handleLearningClick, handleSelection, startGeneralQuiz,
          handleGeneralQuizSelection,
          playSpecificAudioById: (id) => playSpecificAudio(learningItems.find(p => p.id === id)),
          playTargetAudio,
        };

        initializeState(1);
        displayLearningMode();

    return () => {
      delete window.__ilqApp;
    };
  }, []);

  return (
    <>
      <style>{ILQ_APP_CSS}</style>
      <div
        ref={containerRef}
        className="ilq-app-root"
        dangerouslySetInnerHTML={{ __html: ILQ_APP_BODY_HTML }}
      />
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
              <h2 className="text-xl font-bold text-gray-800">🧠 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
