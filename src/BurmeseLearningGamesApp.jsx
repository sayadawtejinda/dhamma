import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Burmese Learning Games Collection" HTML app ──
// Same hybrid approach as the other ported apps in this project: the
// original vanilla JS (DOM manipulation, Web Audio playback) is kept almost
// unchanged inside a React wrapper instead of being rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. Inline onclick="..."
// attributes resolve via the global scope, so the functions they call are
// exposed under window.__blgApp (namespaced, not bare globals) — see the
// note above that assignment for the full explanation. The original page's
// `document.body`-appended helicopter-reward animation is now appended to
// this component's own root element instead.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .blg-app-root so it doesn't leak onto the rest of the SPA, since every app
// stays mounted simultaneously (just hidden via CSS) per App.jsx's design.

const BLG_ROSTER_PATH = 'artifacts/burmese-learning-games-app/public/data/roster';
const sanitizeBlgKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const BLG_APP_CSS = `
        .blg-app-root {
            font-family: 'Inter', sans-serif;
            background-color: #f0fdf4;
            /* Prevent pull-to-refresh on mobile which might interrupt dragging */
            overscroll-behavior-y: contain; 
        }
        .grid-item {
            background-color: white;
            transition: transform 0.2s, box-shadow 0.2s;
            color: #1a1a1a;
            height: 120px;
            cursor: pointer;
        }
        .grid-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }
        .correct-answer {
            background-color: #10b981; 
            color: white;
        }
        .incorrect-answer {
            background-color: #f87171; 
            color: white;
        }
        .default-answer {
            background-color: #ecfccb; 
            color: #15803d; 
        }
        .game-tab.active-tab {
            color: #15803d;
            border-bottom-color: #15803d;
        }
        .game-tab:hover:not(.active-tab) {
            background-color: #f3f4f6;
        }
        .memory-card {
            perspective: 1000px;
            width: 100%;
            height: 100px;
            cursor: pointer;
        }
        .card-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s;
            transform-style: preserve-3d;
        }
        .memory-card.flipped .card-inner {
            transform: rotateY(180deg);
        }
        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card-back {
            background-color: #ecfccb;
            color: #15803d;
            font-size: 3rem;
            font-weight: bold;
        }
        .card-front {
            background-color: white;
            color: #15803d;
            font-size: 3rem;
            transform: rotateY(180deg);
            border: 2px solid #15803d;
        }
        .memory-card.matched {
            opacity: 0.4;
            cursor: default;
        }
        @media (max-width: 640px) {
            .memory-card { height: 75px; }
            .card-face { font-size: 2rem; }
        }
        #audio-unlock-modal {
            transition: opacity 0.3s ease;
        }
        .highlight-answer {
            transform: scale(1.05);
            background-color: #a7f3d0;
            border: 2px solid #10b981;
            box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
        }
        /* Draggable Trophy Styles */
        #floating-trophy {
            touch-action: none;
            user-select: none;
        }
`;

const BLG_APP_BODY_HTML = `
    
    <!-- Floating Draggable Trophy -->
    <div id="floating-trophy" class="fixed top-6 right-6 z-[100] bg-white border-4 border-yellow-400 rounded-full px-5 py-3 shadow-2xl text-4xl sm:text-5xl font-extrabold cursor-grab active:cursor-grabbing flex items-center justify-center transition-shadow hover:shadow-yellow-400/50">
        🏆 <span id="global-trophy-count" class="ml-3 text-yellow-500">0</span>
    </div>

    <!-- Audio Unlock / Loading Modal -->
    <div id="audio-unlock-modal" class="fixed inset-0 bg-black bg-opacity-80 z-[150] flex items-center justify-center opacity-100">
        <button id="audio-unlock-btn" class="px-8 py-5 bg-green-500 text-white text-2xl font-bold rounded-lg shadow-2xl transition duration-200 hover:bg-green-600 active:scale-95">
            🔊 Tap to Start
        </button>
    </div>

    <!-- Transition/Level Complete Modal -->
    <div id="transition-modal" class="fixed inset-0 bg-black bg-opacity-80 z-[120] flex flex-col items-center justify-center hidden opacity-0 transition-opacity duration-300">
        <div class="text-7xl mb-6">🎉</div>
        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-wider">Level Complete!</h2>
        <p class="text-xl md:text-2xl text-green-300 font-semibold">Moving to the next game...</p>
    </div>

    <div class="max-w-7xl mx-auto mt-16 sm:mt-0">
        <!-- Header Section -->
        <header class="text-center mb-8 sm:mb-12 p-6 pb-12 sm:pb-6 bg-primary-green text-white rounded-xl shadow-lg relative">
            <h1 id="main-title" class="text-3xl sm:text-4xl font-extrabold mb-2">
                Burmese Learning Games
            </h1>
            <p id="sub-title" class="text-sm sm:text-base opacity-90">
                Collection of Fruits, Food, Animals, Colors and Sports
            </p>
            <!-- Romanization Toggle Icon -->
            <button id="roman-toggle-btn" class="absolute bottom-3 left-4 bg-white border-2 border-green-200 text-primary-green rounded-full px-4 py-1 shadow-md font-bold cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95" onclick="window.__blgApp.toggleRoman()">
                A/က
            </button>
        </header>
        
        <!-- Game Selection Tabs -->
        <div class="mb-8 flex flex-wrap justify-center gap-2 sm:gap-4 border-b-2 border-primary-green/20 pb-4">
            <button id="tab-habitat" class="game-tab active-tab px-4 sm:px-6 py-3 rounded-t-lg font-bold text-base sm:text-lg text-gray-500 transition duration-200 border-b-4 border-transparent cursor-pointer" onclick="window.__blgApp.handleTabClick('habitat')">
                🌎 Quiz
            </button>
            <button id="tab-memory" class="game-tab px-4 sm:px-6 py-3 rounded-t-lg font-bold text-base sm:text-lg text-gray-500 transition duration-200 border-b-4 border-transparent cursor-pointer" onclick="window.__blgApp.handleTabClick('memory')">
                🧠 Memory Game
            </button>
            <button id="tab-counting" class="game-tab px-4 sm:px-6 py-3 rounded-t-lg font-bold text-base sm:text-lg text-gray-500 transition duration-200 border-b-4 border-transparent cursor-pointer" onclick="window.__blgApp.handleTabClick('counting')">
                🔢 Counting Game
            </button>
            <button id="tab-name" class="game-tab px-4 sm:px-6 py-3 rounded-t-lg font-bold text-base sm:text-lg text-gray-500 transition duration-200 border-b-4 border-transparent cursor-pointer" onclick="window.__blgApp.handleTabClick('name')">
                🏷️ Name Game
            </button>
        </div>

        <!-- Game Container -->
        <div id="game-container">
            <!-- Habitat Quiz Game Section -->
            <section id="habitat-quiz-section" class="mb-12 p-6 bg-white rounded-xl shadow-xl border border-primary-green/30 relative hidden">
                <div class="flex flex-col lg:flex-row gap-6">
                    <div class="lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-64 relative">
                        <p id="game-feedback" class="text-center text-xl font-bold mb-4 min-h-8 text-gray-700">Tap the correct answer!</p>
                        <div id="question-target-display" class="mb-4 text-primary-green font-bold text-center p-4 min-h-24 flex items-center justify-center w-full"></div>
                    </div>
                    
                    <div class="lg:w-1/2 flex flex-col justify-center">
                        <p id="habitat-question-text" class="text-xl font-semibold text-gray-800 mb-4 min-h-10"></p>
                        <div id="answer-options" class="grid grid-cols-2 gap-4"></div>
                        <button id="next-question-btn" class="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200 active:translate-y-1 hidden" onclick="window.__blgApp.setupQuestion()">
                            Next Question <span class="ml-2">➡️</span>
                        </button>
                    </div>
                </div>
            </section>

            <!-- Memory Match Game Section -->
            <section id="memory-game-section" class="mb-12 p-6 bg-white rounded-xl shadow-xl border border-primary-green/30 hidden relative">
                <div class="flex flex-col md:flex-row gap-4 mb-6 items-center">
                    <div id="memory-category-display" class="p-3 bg-secondary-lime rounded-lg font-bold text-lg text-primary-green flex-grow text-center w-full md:w-auto">
                        Category: Automatically Selected
                    </div>
                    <button id="restart-memory-btn" class="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition flex-shrink-0">
                        Restart Game
                    </button>
                    <div id="moves-display" class="p-3 bg-gray-100 rounded-lg font-bold text-xl text-primary-green text-center w-full md:w-auto flex-shrink-0">
                        Moves: 0
                    </div>
                </div>
                <div id="memory-grid" class="grid grid-cols-5 gap-3 sm:gap-4 max-w-lg mx-auto"></div>
                <p id="memory-feedback" class="text-center text-xl font-bold mt-4 text-blue-600 min-h-8"></p>
            </section>
            
            <!-- Counting Game Section -->
            <section id="counting-game-section" class="mb-12 p-6 bg-white rounded-xl shadow-xl border border-primary-green/30 hidden relative">
                <div class="flex flex-col lg:flex-row gap-6">
                    <div class="lg:w-1/3 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p id="counting-prompt" class="text-2xl sm:text-3xl font-bold text-primary-green text-center mb-4 min-h-24"></p>
                        <p id="counting-feedback" class="text-lg font-semibold text-center min-h-8 text-gray-700">Tap the correct item.</p>
                    </div>
                    <div id="counting-items-grid" class="lg:w-2/3 grid grid-cols-2 gap-4 items-center justify-center"></div>
                </div>
            </section>

            <!-- Name Game Section -->
            <section id="name-game-section" class="mb-12 p-6 bg-white rounded-xl shadow-xl border border-primary-green/30 hidden relative">
                <div class="flex flex-col lg:flex-row gap-6">
                    <div class="lg:w-1/3 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-64">
                        <div id="name-game-emoji-display" class="text-8xl sm:text-9xl mb-4"></div>
                        <p id="name-game-feedback" class="text-lg font-semibold text-center min-h-8 text-gray-700">Listen to the audio.</p>
                    </div>
                    <div class="lg:w-2/3 flex flex-col justify-center gap-4">
                        <div id="name-game-options" class="grid grid-cols-1 gap-4"></div>
                        <button id="next-name-game-btn" class="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200 active:translate-y-1 hidden" onclick="window.__blgApp.setupNameGame()">
                            Next Question <span class="ml-2">➡️</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex justify-center gap-4 mb-8">
            <button id="prev-btn" onclick="window.__blgApp.changePage(-1)" 
                    class="bg-secondary-lime text-primary-green hover:bg-lime-200 active:translate-y-1 px-6 py-3 rounded-full font-bold shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                <span class="mr-2">⬅️</span> Previous Page
            </button>
            <button id="next-btn" onclick="window.__blgApp.changePage(1)" 
                    class="bg-primary-green text-white hover:bg-green-700 active:translate-y-1 px-6 py-3 rounded-full font-bold shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                Next Page <span class="ml-2">➡️</span>
            </button>
        </div>

        <!-- Main Grid Layout -->
        <div id="grid-container" class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3 sm:gap-4 lg:gap-5"></div>
        
        <footer class="mt-12 text-center p-4 text-sm text-gray-600 border-t border-primary-green/20">
            <p id="footer-text">Showing page 1 of 6</p>
        </footer>
    </div>

`;

export default function BurmeseLearningGamesApp({ entryRequest, onExit }) {
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
    const rosterRef = doc(db, BLG_ROSTER_PATH, sanitizeBlgKey(studentName));
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
    const unsub = onSnapshot(collection(db, BLG_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Burmese Learning Games roster listen error:', e));
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

        // Extends the page's shared Tailwind Play-CDN config with this app's
        // custom colors (primary-green/secondary-lime) instead of overwriting
        // window.tailwind.config outright, in case another mounted app ever
        // adds its own custom colors too.
        window.tailwind = window.tailwind || {};
        window.tailwind.config = {
            ...(window.tailwind.config || {}),
            theme: {
                ...(window.tailwind.config?.theme || {}),
                extend: {
                    ...(window.tailwind.config?.theme?.extend || {}),
                    colors: {
                        ...(window.tailwind.config?.theme?.extend?.colors || {}),
                        'primary-green': '#15803d',
                        'secondary-lime': '#ecfccb',
                    }
                }
            }
        };

        // =================================================================
        // ROMANIZATION LOGIC & MAP
        // =================================================================
        let isRomanMode = false;

        const ROMAN_MAP = {
            // Veggies
            "ခရမ်းချဉ်သီး": "Kha Yan Chin Thee", "အာလူး": "Ah Loo", "ဂေါ်ဖီထုပ်": "Gaw Phi Htote", "ပန်းဂေါ်ဖီ": "Pan Gaw Phi", "ဖရုံသီး": "Pha Yone Thee", "ငရုတ်ပွ": "Nga Yoke Pwa", "ဟင်းနုနွယ်": "Hin Nu Nwe", "သခွားသီး": "Tha Khwa Thee", "ကညွှတ်": "Ka Nyut", "ပြောင်းဖူး": "Pyaung Phu", "ပဲသီး": "Pe Thee", "ကန်စွန်းဥ": "Kan Zun U", "မှို": "Hmo", "မုန်လာဥနီ": "Mon Lar U Ni", "ခရမ်းသီး": "Kha Yan Thee",
            // Fruits
            "ပန်းသီး": "Pan Thee", "ငှက်ပျောသီး": "Hnget Pyaw Thee", "လိမ္မော်သီး": "Lein Maw Thee", "စပျစ်သီး": "Sa Pyit Thee", "သလဲသီး": "Tha Le Thee", "ကီဝီသီး": "Kiwi Thee", "သရက်သီး": "Tha Yet Thee", "နာနတ်သီး": "Na Nat Thee", "ထောပတ်သီး": "Htaw Pat Thee", "မက်မွန်သီး": "Met Mon Thee", "အုန်းသီး": "Ohn Thee", "ဖရဲသီး": "Pha Ye Thee", "စတော်ဘယ်ရီသီး": "Strawberry", "ဘလက်ခ်ဘယ်ရီ": "Blackberry",
            // Animals
            "မိကျောင်း": "Mi Gyaung", "ပုရွက်ဆိတ်": "Pa Ywet Seik", "လင်းနို့": "Lin No", "ဝက်ဝံ": "Wet Wun", "ပျား": "Pyar", "ပိုးတောင်မာ": "Poe Taung Mar", "ငှက်": "Hnget", "ကျွဲ": "Kywe", "နွားထီး": "Nwar Htee", "ကုလားအုတ်": "Ku Lar Oat", "ကြောင်": "Kyaung", "နွား": "Nwar", "ကျားသစ်": "Kyar Thit", "ကြက်": "Kyet", "ချင်ပန်ဇီ": "Chimpanzee", "တောခွေး": "Taw Khway", "ကြိုးကြာ": "Kyoe Kyar", "ကျီးကန်း": "Kyee Kan", "သမင်": "Tha Min", "ခွေး": "Khway", "လင်းပိုင်": "Lin Pine", "မြည်း": "Myee", "ခို": "Kho", "ဘဲ": "Beh", "သိမ်းငှက်": "Thein Hnget", "ဆင်": "Sin", "ငါး": "Ngar", "ယင်": "Yin", "မြေခွေး": "Myay Khway", "ဖား": "Phar", "သစ်ကုလားအုတ်": "Thit Ku Lar Oat", "ဆိတ်": "Seik", "ဂေါ်ရီလာ": "Gorilla", "ကျိုင်းကောင်": "Kyine Kaung", "တောကြက်": "Taw Kyet", "ယုန်": "Yone", "ရေမြင်း": "Yay Myin", "ဟော်နက်": "Hornet", "မြင်း": "Myin", "သားပိုက်ကောင်": "Thar Pike Kaung", "ခြင်္သေ့": "Chin Thay", "လူသား": "Lu Thar", "မျောက်": "Myauk", "အမေရိကသမင်": "America Tha Min", "ကြွက်": "Kywet", "ဇီးကွက်": "Zee Kwet", "ဝက်ဝံပန်ဒါ": "Panda", "ကြက်တူရွေး": "Kyet Tu Yway", "ပင်ဂွင်း": "Penguin", "ဝက်": "Wet", "ဝင်ရိုးစွန်းဝက်ဝံ": "Win Yoe Zun Wet Wun", "ကျီး": "Kyee", "ကြံ့": "Kyan", "ပင်လယ်ဖျံ": "Pin Le Phyan", "ငါးမန်း": "Ngar Man", "သိုး": "Thoe", "ခရု": "Kha Yu", "မြွေ": "Mway", "စာကလေး": "Sar Ka Lay", "ပင့်ကူ": "Pint Ku", "ရှဉ့်": "Shin", "ငန်း": "Ngan", "ချ": "Cha", "ကျား": "Kyar", "လိပ်": "Leik", "မြွေပွေး": "Mway Pway", "ဝေလငါး": "Way La Ngar", "ဝံပုလွေ": "Wun Pa Lway", "သစ်တောက်ငှက်": "Thit Tauk Hnget", "မြင်းကျား": "Myin Kyar",
            // Foods
            "ကွတ်ကီး": "Cookie", "Sandwich": "Sandwich", "ပေါင်မုန့်": "Paung Mont", "ဘာဂါ": "Burger", "ထောပတ်": "Htaw Pat", "ဆိုဒါဗူး": "Soda Boo", "ဒိန်ခဲ": "Dein Khel", "ကြက်သားကြော်": "Kyet Thar Kyaw", "ချောကလက်": "Chocolate", "ကော်ဖီ": "Coffee", "ကိုကာကိုလာ": "Coca Cola", "ဒိုးနပ်": "Donut", "အာလူးချောင်းကြော်": "Ah Loo Chaung Kyaw", "ကြက်ကြော်": "Kyet Kyaw", "ကြက်ဥကြော်": "Kyet U Kyaw", "ဟမ်ဘာဂါ": "Hamburger", "ဟော့ဒေါ့": "Hot Dog", "ရေခဲမုန့်": "Yay Khel Mont", "မီနူး": "Menu", "နို့": "Noe", "နို့မစ်ရှိတ်": "Milkshake", "ခေါက်ဆွဲ": "Khauk Swe", "ပန်ကိတ်": "Pancake", "ပီဇာ": "Pizza", "ပြောင်းဖူးပေါက်": "Pyaung Phu Pauk", "ဆလပ်": "Salad", "ပင်လယ်စာ": "Pin Le Sar", "ဆိုဒါ": "Soda", "အချိုရည်": "Ah Cho Yay", "လက်ဖက်ရည်": "Let Phet Yay", "ဒိန်ချဉ်": "Dein Chin",
            // Kitchen
            "ထမင်းချက်ဝတ်စုံ": "Hta Min Chet Wut Sone", "ပုလင်း": "Pa Lin", "ပန်းကန်လုံး": "Pan Kan Lone", "ဇွန်းခက်ရင်း": "Zun Khet Yin", "ဓာတ်ငွေ့မီးဖို": "Dat Ngway Mee Pho", "ဖန်ခွက်": "Phan Khwet", "လက်ဖက်ရည်အိုး": "Let Phet Yay Oh", "မီးဖိုချောင်ကတ်ကြေး": "Mee Pho Gyaung Kat Kyay", "ဓားအစုံ": "Dar Ah Sone", "မီးဖိုလက်အိတ်": "Mee Pho Let Eit", "ဒယ်အိုး": "Deh Oh", "ပန်းကန်ပြား": "Pan Kan Pyar", "ဇွန်း": "Zun",
            // Colors
            "အနီရောင်": "Ah Ni Yaung", "အပြာရောင်": "Ah Pyar Yaung", "အစိမ်းရောင်": "Ah Sein Yaung", "လိမ္မော်ရောင်": "Lein Maw Yaung", "အဖြူရောင်": "Ah Phyu Yaung", "အနက်ရောင်": "Ah Net Yaung", "အဝါရောင်": "Ah War Yaung", "ခရမ်းရောင်": "Kha Yan Yaung", "ငွေရောင်": "Ngway Yaung", "အညိုရောင်": "Ah Nyo Yaung", "မီးခိုးရောင်": "Mee Khoe Yaung", "ပန်းရောင်": "Pan Yaung", "သံလွင်စိမ်း": "Than Lwin Sein", "မီးသွေးခဲ": "Mee Thway Khel", "ကြေးနီရောင်": "Kyay Ni Yaung", "ရွှေရောင်": "Shway Yaung",
            // Sports
            "ခရစ်ကတ်": "Cricket", "ဘောလုံး": "Baw Lone", "ဘေ့စ်ဘော": "Baseball", "လက်ဝှေ့": "Let Hway", "ဘော်လီဘော": "Volleyball", "ဓားပစ်": "Dar Pyit", "ဂေါက်သီး": "Gauk Thee", "ဟော်ကီ": "Hockey", "ကြက်တောင်": "Kyet Taung", "မာရသွန်": "Marathon", "ဂျူဒို": "Judo", "ကရာတေး": "Karate", "တင်းနစ်": "Tennis", "ရေကူး": "Yay Ku", "နပန်း": "Na Pan", "ယောဂ": "Yoga", "အလေးမ": "Ah Lay Ma", "ရပ်ဘီ": "Rugby", "လှိုင်းစီး": "Hline See", "မြှားပစ်": "Hmwar Pyit", "ဘတ်စကက်ဘော": "Basketball", "စကိတ်စီး": "Skate See", "တူတူပုန်း": "Tu Tu Pone", "လေဟုန်စီး": "Lay Hone See", "လှေလှော်": "Hlay Hlaw", "ရွက်လွှင့်": "Ywet Lwint", "စက်ဘီးစီး": "Set Bee See", "စွန်လွှတ်": "Sone Lwut", "နှင်းလျှောစီး": "Hnin Hlyaw See", "တောင်တက်": "Taung Tet",
            // Vehicles
            "ကား": "Car", "ဘတ်စ်ကား": "Bus", "စက်ဘီး": "Set Bee", "စကူတာ": "Scooter", "မော်တော်ဆိုင်ကယ်": "Motorcycle", "တက္ကစီ": "Taxi", "ရဲကား": "Ye Car", "လူနာတင်ယာဉ်": "Lu Nar Tin Yin", "မီးသတ်ကား": "Mee That Car", "စကိတ်ဘုတ်": "Skateboard", "ပြိုင်ကား": "Pyaing Car", "ရထား": "Ya Htar", "လေယာဉ်ပျံ": "Lay Yin Pyan", "ဟယ်လီကော်ပတာ": "Helicopter", "မြေအောက်ရထား": "Myay Auk Ya Htar", "ဗန်ကား": "Van", "ပစ်ကပ်": "Pickup", "ထွန်စက်": "Htun Set", "ကုန်တင်ကား": "Kone Tin Car", "ရွက်လှေ": "Ywet Hlay", "ကူးတို့သင်္ဘော": "Ku Doe Thin Baw", "သင်္ဘော": "Thin Baw", "ကနူးလှေ": "Canoe Hlay", "မီးပုံးပျံ": "Mee Pone Pyan", "ကေဘယ်ကား": "Cable Car", "လေထီး": "Lay Htee", "ဒုံးပျံ": "Done Pyan", "ဆိုက်ကား": "Sidecar", "စွတ်ဖား": "Sut Phar", "ကရိန်း": "Crane",
            // Habitats
            "မိချောင်းသိုက်": "Mi Gyaung Thaik", "တောင်ပို့": "Taung Poe", "လှိုဏ်ခေါင်း": "Hline Gaung", "ဂူ": "Gu", "အုံ": "Aon", "ဥမင်": "U Min", "အသိုက်": "Ah Thaik", "ခြံ": "Chan", "နွားတင်းကုပ်": "Nwar Tin Koke", "သဲကန္တာရ": "Theh Kan Tar Ya", "နေအိမ်": "Nay Ein", "ဆာဗားနား": "Savanna", "ကြက်ခြံ": "Kyet Chan", "သစ်ပင်": "Thit Pin", "မြေတွင်း": "Myay Dwin", "မြက်ခင်း": "Myet Khin", "ခွေးအိမ်": "Khway Ein", "ရေကန်": "Yay Kan", "တင်းကုပ်": "Tin Koke", "တောနက်": "Taw Net", "အက်ကြောင်း": "Ah Et Kyaung", "ဖားကန်": "Phar Kan", "လယ်ကွင်း": "Leh Kwin", "မြစ်ကမ်း": "Myit Kan", "သစ်ခေါင်း": "Thit Gaung", "အိမ်": "Ein", "မြေစို": "Myay So", "ကြွက်တွင်း": "Kywet Dwin", "ဝါးပင်": "War Pin", "လှောင်အိမ်": "Hlaung Ein", "ဝက်ခြံ": "Wet Chan", "တွင်း": "Dwin", "ရွှံ့အိုင်": "Shun Aing", "ပင်လယ်": "Pin Le", "သိုးခြံ": "Thoe Chan", "ခရုခွံ": "Kha Yu Khwan", "မြွေတွင်း": "Mway Dwin", "ပင့်ကူအိမ်": "Pint Ku Ein", "ရှဉ့်သိုက်": "Shin Thaik", "ကွင်းပြင်": "Kwin Pyin", "ယုန်တွင်း": "Yone Dwin", "ခိုအိမ်": "Kho Ein",
            "ဂူ,တော": "Gu, Taw", "ခြံ,ကျက်စားရာ": "Chan, Kyet Sar Yar", "မြက်ခင်း,တော": "Myet Khin, Taw", "အသိုက်,အိုင်": "Ah Thaik, Aing",
            // Numbers & Classifiers
            "တစ်": "Tit", "နှစ်": "Hnit", "သုံး": "Thone", "လေး": "Lay", "ငါး": "Ngar", "ခြောက်": "Chauk", "ခုနှစ်": "Khu Hnit", "ရှစ်": "Shit", "ကိုး": "Koe", "ဆယ်": "Seh",
            "ခု": "Khu", "ကောင်": "Kaung", "လုံး": "Lone", "ယောက်": "Yauk", "ပင်": "Pin", "ထည်": "Hteh", "ရွက်": "Ywet", "ဗူး": "Boo", "မျိုး": "Myoe", "နိုင်ငံ": "Nine Ngan", "ပါး": "Par", "ရွာ": "Ywar", "မြို့": "Myo", "ကိုင်း": "Kaing", "ချောင်း": "Chaung", "ခွက်": "Khwet", "လက်": "Let", "စုံ": "Sone", "ပွင့်": "Pwint", "ဥ": "U", "ညွှတ်": "Nyut", "ဖူး": "Phu", "ပုလင်း": "Pa Lin", "စိတ်": "Seik", "ခိုင်": "Khaing", "ဖီး": "Phee", "တောင့်": "Taung", "ခြမ်း": "Chan", "ထုပ်": "Htote", "ပွဲ": "Pwe", "စင်း": "Sin", "စီး": "See", "ချပ်": "Chat"
        };

        // Helper function for Romanization
        function t(text) {
            return (isRomanMode && ROMAN_MAP[text]) ? ROMAN_MAP[text] : text;
        }

        function toggleRoman() {
            isRomanMode = !isRomanMode;
            renderGrid(currentPage);
            updateGameTexts();
        }

        function updateGameTexts() {
            if (currentActiveGame === 'habitat') {
                if (quizState.currentQuizType === 'A' && quizState.currentCorrectItem) {
                    habitatQuestionTextEl.textContent = `Where does this ${t(quizState.currentCorrectItem.burmese)} (${quizState.currentCorrectItem.english}) live?`;
                    const spans = answerOptionsEl.querySelectorAll('span');
                    spans.forEach(span => {
                        const key = span.parentElement.dataset.key;
                        span.textContent = t(key);
                    });
                } else if (quizState.currentQuizType === 'B' && quizState.currentCorrectItem) {
                    const spans = answerOptionsEl.querySelectorAll('span');
                    spans.forEach(span => {
                        const burmeseName = span.parentElement.dataset.burmeseName; 
                        span.textContent = t(burmeseName);
                    });
                }
            } else if (currentActiveGame === 'counting') {
                if (countingGameState.correctItem) {
                    const burmeseName = countingGameState.correctItem.name.split(' (')[0];
                    const targetNumWord = numberWords[countingGameState.targetCount - 1];
                    const classifier = countingGameState.classifier;
                    countingPromptEl.textContent = `${t(burmeseName)} ${t(targetNumWord)} ${t(classifier)}`;
                }
            } else if (currentActiveGame === 'name') {
                 const buttons = nameGameOptionsEl.querySelectorAll('button');
                 buttons.forEach(btn => {
                     btn.textContent = t(btn.dataset.burmeseName);
                 });
            }
        }

        // =================================================================
        // 0. AUDIO SETUP
        // =================================================================
        const AUDIO_SPRITE_URL = 'https://raw.githubusercontent.com/nathantun93/bell/main/emojis.mp3';
        const COUNTING_AUDIO_SPRITE_URL = 'https://raw.githubusercontent.com/nathantun93/bell/main/တစ်လုံး.mp3';
        
        let audioCtx = null;
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
        catch(e) { console.error("Web Audio API not supported", e); }
        
        let mainAudioBuffer = null;
        let countingAudioBuffer = null;
        const audioSpriteMap = new Map();
        const countingAudioSpriteMap = new Map();
        let isAudioInitialized = false;
        let isAudioInitializing = false;
        let isAudioPlaying = false; 
        
        // Audio active sources tracker to stop them across tab switches
        let activeAudioSources = [];

        function stopAllAudio() {
            activeAudioSources.forEach(source => {
                try { source.stop(); } catch(e) {}
            });
            activeAudioSources = [];
            isAudioPlaying = false;
        }

        const audioMapList = [
            "ခရမ်းချဉ်သီး", "အာလူး", "ဂေါ်ဖီထုပ်", "ပန်းဂေါ်ဖီ", "ဖရုံသီး", "ငရုတ်ပွ", "ဟင်းနုနွယ်", "သခွားသီး", "ကညွှတ်", "ပြောင်းဖူး",
            "ပဲသီး", "ကန်စွန်းဥ", "မှို", "မုန်လာဥနီ", "ခရမ်းသီး", "ပန်းသီး", "ငှက်ပျောသီး", "လိမ္မော်သီး", "စပျစ်သီး", "သလဲသီး",
            "ကီဝီသီး", "သရက်သီး", "နာနတ်သီး", "ထောပတ်သီး", "မက်မွန်သီး", "သရက်သီး", "အုန်းသီး", "ဖရဲသီး", "စတော်ဘယ်ရီသီး", "ဘလက်ခ်ဘယ်ရီ",
            "မိကျောင်း", "ပုရွက်ဆိတ်", "လင်းနို့", "ဝက်ဝံ", "ပျား", "ပိုးတောင်မာ", "ငှက်", "ကျွဲ", "နွားထီး", "ကုလားအုတ်",
            "ကြောင်", "နွား", "ကျားသစ်", "ကြက်", "ချင်ပန်ဇီ", "နွား", "တောခွေး", "ကြိုးကြာ", "မိကျောင်း", "ကျီးကန်း",
            "သမင်", "ခွေး", "လင်းပိုင်", "မြည်း", "ခို", "ဘဲ", "သိမ်းငှက်", "ဆင်", "ငါး", "ယင်",
            "မြေခွေး", "ဖား", "သစ်ကုလားအုတ်", "ဆိတ်", "ဂေါ်ရီလာ", "ကျိုင်းကောင်", "တောကြက်", "ယုန်", "သိမ်းငှက်", "ရေမြင်း",
            "ဟော်နက်", "မြင်း", "သားပိုက်ကောင်", "ကျားသစ်", "ခြင်္သေ့", "လူသား", "မျောက်", "အမေရိကသမင်", "ကြွက်", "ဇီးကွက်",
            "ဝက်ဝံပန်ဒါ", "ကြက်တူရွေး", "ပင်ဂွင်း", "ဝက်", "ခို", "ဝင်ရိုးစွန်းဝက်ဝံ", "လင်းပိုင်", "ယုန်", "ကြွက်", "ကျီး",
            "ကြံ့", "ကျီး", "ပင်လယ်ဖျံ", "ငါးမန်း", "သိုး", "ခရု", "မြွေ", "စာကလေး", "ပင့်ကူ", "ရှဉ့်",
            "ငန်း", "ချ", "ကျား", "လိပ်", "မြွေပွေး", "ဝေလငါး", "ဝံပုလွေ", "သစ်တောက်ငှက်", "မြင်းကျား", "ကွတ်ကီး",
            "Sandwich", "ပေါင်မုန့်", "ဘာဂါ", "ထောပတ်", "ဆိုဒါဗူး", "ဒိန်ခဲ", "ကြက်သားကြော်", "ချောကလက်", "ကော်ဖီ", "ကိုကာကိုလာ",
            "ဒိုးနပ်", "အာလူးချောင်းကြော်", "ကြက်ကြော်", "ကြက်ဥကြော်", "ဟမ်ဘာဂါ", "ဟော့ဒေါ့", "ရေခဲမုန့်", "မီနူး", "နို့", "နို့မစ်ရှိတ်",
            "ခေါက်ဆွဲ", "ပန်ကိတ်", "ပီဇာ", "ပြောင်းဖူးပေါက်", "ဆလပ်", "ပင်လယ်စာ", "ဆိုဒါ", "အချိုရည်", "လက်ဖက်ရည်", "ပေါင်မုန့်",
            "ဒိန်ချဉ်", "ထမင်းချက်ဝတ်စုံ", "ပုလင်း", "ပန်းကန်လုံး", "ဇွန်းခက်ရင်း", "ဓာတ်ငွေ့မီးဖို", "ဖန်ခွက်", "လက်ဖက်ရည်အိုး", "မီးဖိုချောင်ကတ်ကြေး", "ဓားအစုံ",
            "မီးဖိုလက်အိတ်", "ဒယ်အိုး", "ပန်းကန်ပြား", "ဇွန်း", "အနီရောင်", "အပြာရောင်", "အစိမ်းရောင်", "လိမ္မော်ရောင်", "အဖြူရောင်", "အနက်ရောင်",
            "အဝါရောင်", "ခရမ်းရောင်", "ငွေရောင်", "အညိုရောင်", "မီးခိုးရောင်", "ပန်းရောင်", "သံလွင်စိမ်း", "မီးသွေးခဲ", "ကြေးနီရောင်", "ရွှေရောင်",
            "ခရစ်ကတ်", "ဘောလုံး", "ဘေ့စ်ဘော", "လက်ဝှေ့", "ဘော်လီဘော", "ဓားပစ်", "ဂေါက်သီး", "ဟော်ကီ", "ကြက်တောင်", "မာရသွန်",
            "ဂျူဒို", "ကရာတေး", "တင်းနစ်", "ရေကူး", "နပန်း", "ယောဂ", "အလေးမ", "ရပ်ဘီ", "လှိုင်းစီး", "မြှားပစ်",
            "ဘတ်စကက်ဘော", "စကိတ်စီး", "တူတူပုန်း", "လေဟုန်စီး", "လှေလှော်", "ရွက်လွှင့်", "စက်ဘီးစီး", "စွန်လွှတ်", "နှင်းလျှောစီး", "တောင်တက်",
            "မိချောင်းသိုက်", "တောင်ပို့", "လှိုဏ်ခေါင်း", "ဂူ,တော", "အုံ", "ဥမင်", "အသိုက်", "ခြံ,ကျက်စားရာ", "နွားတင်းကုပ်", "သဲကန္တာရ",
            "နေအိမ်", "ခြံ", "ဆာဗားနား", "ကြက်ခြံ", "သစ်ပင်", "တင်းကုပ်", "မြေတွင်း", "အသိုက်", "မိချောင်းသိုက်", "အသိုက်",
            "မြက်ခင်း,တော", "ခွေးအိမ်", "ရေကန်", "တင်းကုပ်", "အသိုက်", "အသိုက်,အိုင်", "အသိုက်", "တောနက်", "ရေကန်", "အက်ကြောင်း",
            "မြေခွေး", "ဖားကန်", "ဆာဗားနား", "ခြံ", "အသိုက်", "မြက်ခင်း", "အသိုက်", "လယ်ကွင်း", "အသိုက်", "မြစ်ကမ်း",
            "အုံ", "တင်းကုပ်", "သစ်ခေါင်း", "ဆာဗားနား", "ဂူ", "အိမ်", "သစ်ပင်", "မြေစို", "ကြွက်တွင်း", "အသိုက်",
            "ဝါးပင်", "လှောင်အိမ်", "အသိုက်", "ဝက်ခြံ", "ခိုအိမ်", "တွင်း", "ပင်လယ်", "ယုန်တွင်း", "ကြွက်တွင်း", "အသိုက်",
            "ရွှံ့အိုင်", "အသိုက်", "အသိုက်", "ပင်လယ်", "သိုးခြံ", "ခရုခွံ", "မြွေတွင်း", "အသိုက်", "ပင့်ကူအိမ်", "ရှဉ့်သိုက်",
            "အသိုက်", "တောင်ပို့", "ဂူ", "ပင်လယ်", "မြွေတွင်း", "ပင်လယ်", "မြေတွင်း", "အသိုက်", "ကွင်းပြင်",
            "ဒီနေရာမှာ ဘယ်အကောင် နေထိုင်သလဲ?", "ဘယ်မှာနေထိုင်သလဲ?", "ကား", "ဘတ်စ်ကား", "စက်ဘီး", "စကူတာ", 
            "မော်တော်ဆိုင်ကယ်", "တက္ကစီ", "ရဲကား", "လူနာတင်ယာဉ်", "မီးသတ်ကား", "စကိတ်ဘုတ်", "ပြိုင်ကား", "ရထား", 
            "လေယာဉ်ပျံ", "ဟယ်လီကော်ပတာ", "မြေအောက်ရထား", "ဗန်ကား", "ပစ်ကပ်", "ထွန်စက်", "ကုန်တင်ကား", "ရွက်လှေ",
            "ကူးတို့သင်္ဘော", "သင်္ဘော", "ရွက်လှေ", "ကနူးလှေ", "မီးပုံးပျံ", "သံတောင်", "လေထီး", "ဒုံးပျံ", "ဆိုက်ကား", "စွတ်ဖား", "ကရိန်း"
        ];
        
        const countingAudioMapList = [
            "တစ်", "နှစ်", "သုံး", "လေး", "ငါး", "ခြောက်", "ခုနှစ်", "ရှစ်", "ကိုး", "ဆယ်",
            "လုံး", "ခု", "ယောက်", "ကောင်", "ပင်", "ထည်", "ရွက်", "ဗူး", "မျိုး", "နိုင်ငံ", "ပါး",
            "ရွာ", "မြို့", "ကိုင်း", "ချောင်း", "ခွက်", "လက်", "စုံ", "ပွင့်", "ဥ", 
            "ညွှတ်", "ဖူး", "ပုလင်း", "စိတ်", "ခိုင်", "ဖီး", "တောင့်", "ခြမ်း", "ထုပ်", "ပွဲ", "စင်း", "စီး", "ချပ်"
        ];

        function buildAudioMap() {
            audioMapList.forEach((name, index) => audioSpriteMap.set(name, index * 3.0));
        }
        function buildCountingAudioMap() {
            countingAudioMapList.forEach((name, index) => countingAudioSpriteMap.set(name, index * 1.0));
        }

        function playAudio(burmeseWord) {
            return new Promise((resolve) => {
                if (!isAudioInitialized || !audioCtx || !mainAudioBuffer) return resolve(); 
                
                const startTime = audioSpriteMap.get(burmeseWord);
                if (startTime === undefined) {
                    let mappedKey = burmeseWord;
                    if (burmeseWord === 'ဂူ') mappedKey = 'ဂူ,တော';
                    else if (burmeseWord === 'ခြံ') mappedKey = 'ခြံ,ကျက်စားရာ';
                    else if (burmeseWord === 'မြက်ခင်း') mappedKey = 'မြက်ခင်း,တော';
                    else if (burmeseWord === 'အသိုက်') mappedKey = 'အသိုက်';
                    else if (burmeseWord === 'တင်းကုပ်') mappedKey = 'တင်းကုပ်';
                    else if (burmeseWord === 'မြေတွင်း') mappedKey = 'မြေတွင်း';
                    else if (burmeseWord === 'နေအိမ်') mappedKey = 'နေအိမ်';
                    
                    const newStartTime = audioSpriteMap.get(mappedKey);
                    if (newStartTime === undefined) return resolve(); 
                    
                    const sourceMapped = audioCtx.createBufferSource();
                    sourceMapped.buffer = mainAudioBuffer;
                    sourceMapped.connect(audioCtx.destination);
                    activeAudioSources.push(sourceMapped);
                    
                    sourceMapped.onended = () => {
                        activeAudioSources = activeAudioSources.filter(s => s !== sourceMapped);
                        if(activeAudioSources.length === 0) isAudioPlaying = false;
                        resolve();
                    };
                    isAudioPlaying = true;
                    sourceMapped.start(0, newStartTime, 2.0);
                    return;
                }

                const source = audioCtx.createBufferSource();
                source.buffer = mainAudioBuffer;
                source.connect(audioCtx.destination);
                activeAudioSources.push(source);
                
                source.onended = () => {
                    activeAudioSources = activeAudioSources.filter(s => s !== source);
                    if(activeAudioSources.length === 0) isAudioPlaying = false;
                    resolve();
                };
                isAudioPlaying = true;
                source.start(0, startTime, 2.0);
            });
        }
        
        function playCountingAudio(word) {
            return new Promise((resolve) => {
                if (!isAudioInitialized || !audioCtx || !countingAudioBuffer) return resolve();
                const startTime = countingAudioSpriteMap.get(word);
                if (startTime === undefined) return resolve();
                
                const source = audioCtx.createBufferSource();
                source.buffer = countingAudioBuffer;
                source.connect(audioCtx.destination);
                activeAudioSources.push(source);
                
                source.onended = () => {
                    activeAudioSources = activeAudioSources.filter(s => s !== source);
                    if(activeAudioSources.length === 0) isAudioPlaying = false;
                    resolve();
                };
                isAudioPlaying = true;
                source.start(0, startTime, 1.0);
            });
        }
        
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));

        async function initAudio() {
            const btn = byId('audio-unlock-btn');
            btn.textContent = 'Loading Game Data...';
            btn.disabled = true;

            if (!audioCtx) {
                btn.textContent = 'Audio Error';
                setTimeout(() => {
                        const modal = byId('audio-unlock-modal');
                        modal.style.opacity = '0';
                        modal.classList.add('hidden');
                        initializeGame();
                }, 1500);
                return;
            }

            try {
                if (audioCtx.state === 'suspended') await audioCtx.resume();
                const buffer = audioCtx.createBuffer(1, 1, 22050);
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start(0);
                
                // Wait for all data to load before proceeding
                await loadAudioData();
                
                const modal = byId('audio-unlock-modal');
                modal.style.opacity = '0';
                setTimeout(() => modal.classList.add('hidden'), 300);
                
                initializeGame(); 
            } catch (e) {
                console.error('Failed to resume audio:', e);
                btn.textContent = 'Audio Error';
                setTimeout(() => {
                        const modal = byId('audio-unlock-modal');
                        modal.style.opacity = '0';
                        modal.classList.add('hidden');
                        initializeGame(); 
                }, 1500);
            }
        }
        
        async function loadAudioData() {
            if (isAudioInitialized || isAudioInitializing || !audioCtx) return;
            isAudioInitializing = true;
            const tabButtons = rootEl.querySelectorAll('.game-tab');
            tabButtons.forEach(btn => btn.disabled = true); 

            try {
                const response = await fetch(AUDIO_SPRITE_URL);
                mainAudioBuffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
                buildAudioMap();
                
                const responseCounting = await fetch(COUNTING_AUDIO_SPRITE_URL);
                countingAudioBuffer = await audioCtx.decodeAudioData(await responseCounting.arrayBuffer());
                buildCountingAudioMap();
                
                isAudioInitialized = true;
            } catch (e) {
                console.error('Failed to load audio:', e);
            } finally {
                isAudioInitializing = false;
                tabButtons.forEach(btn => btn.disabled = false);
            }
        }

        // =================================================================
        // 1. GAME CONTROL & REWARD LOGIC
        // =================================================================
        let currentActiveGame = 'habitat';
        let currentGameWins = 0;
        const WINS_NEEDED = 5;
        const GAME_ORDER = ['habitat', 'memory', 'counting', 'name'];

        function showTransitionMessage(callback) {
            const modal = byId('transition-modal');
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
            });
            
            setTimeout(() => {
                modal.classList.remove('opacity-100');
                modal.classList.add('opacity-0');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    if (callback) callback();
                }, 300);
            }, 2500);
        }

        function showHelicopterReward(targetElementId, callback) {
            const targetEl = byId(targetElementId);
            if (!targetEl) {
                if (callback) callback();
                return;
            }
            const targetRect = targetEl.getBoundingClientRect();
            
            const heli = document.createElement('div');
            heli.textContent = '🚁';
            heli.className = 'fixed text-[150px] z-[9999] pointer-events-none drop-shadow-2xl transition-all duration-[2000ms] ease-in-out';
            heli.style.left = '50%';
            heli.style.top = '100%';
            heli.style.transform = 'translate(-50%, -50%)';
            rootEl.appendChild(heli);
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    heli.style.left = `${targetRect.left + targetRect.width / 2}px`;
                    heli.style.top = `${targetRect.top + targetRect.height / 2}px`;
                    heli.style.transform = 'translate(-50%, -50%) scale(0.5)'; // Shrink into trophy
                    heli.style.opacity = '0.5';
                });
            });
            
            setTimeout(() => {
                if (rootEl.contains(heli)) rootEl.removeChild(heli);
                if (callback) callback();
            }, 2000);
        }

        function handleWin(gameType, targetTrophyId, setupNextRoundFn) {
            currentGameWins++;
            stopHintTimer(); 
            
            showHelicopterReward('floating-trophy', () => {
                quizState.trophies++;
                updateScoreUI();
                
                if (currentGameWins >= WINS_NEEDED) {
                    currentGameWins = 0;
                    let nextIndex = (GAME_ORDER.indexOf(gameType) + 1) % GAME_ORDER.length;
                    showTransitionMessage(() => {
                        handleTabClick(GAME_ORDER[nextIndex]);
                    });
                } else {
                    setupNextRoundFn();
                }
            });
        }

        // =================================================================
        // HINT SYSTEM
        // =================================================================
        let hintTimer = null;
        
        function resetHintTimer() {
            clearTimeout(hintTimer);
            removeHint();
            // Start waiting 7 seconds ONLY after setting up correctly
            hintTimer = setTimeout(showHint, 7000); 
        }
        
        function stopHintTimer() {
            clearTimeout(hintTimer);
            removeHint();
        }
        
        function removeHint() {
            const existingHint = byId('hand-hint');
            if (existingHint) existingHint.remove();
        }
        
        function showHint() {
            // Do not show hint while audio is playing
            if (isAudioPlaying) {
                resetHintTimer(); // Try again later
                return;
            }

            if (!quizState.isAnswering && currentActiveGame !== 'memory') return;
            let targetEl = null;
            
            if (currentActiveGame === 'habitat') {
                targetEl = rootEl.querySelector(`button[data-key="${quizState.currentCorrectAnswerKey}"]`);
            } else if (currentActiveGame === 'memory') {
                const cards = rootEl.querySelectorAll('.memory-card:not(.flipped):not(.matched)');
                if (cards.length > 0) targetEl = cards[Math.floor(Math.random() * cards.length)];
            } else if (currentActiveGame === 'counting') {
                targetEl = rootEl.querySelector('.counting-correct-item');
            } else if (currentActiveGame === 'name') {
                targetEl = rootEl.querySelector('.name-correct-item');
            }

            if (targetEl) {
                targetEl.classList.add('relative');
                const hint = document.createElement('div');
                hint.id = 'hand-hint';
                hint.textContent = '👆';
                hint.className = 'absolute -bottom-4 right-2 text-5xl animate-bounce pointer-events-none z-50 drop-shadow-lg';
                targetEl.appendChild(hint);
            }
        }
        
        // =================================================================
        // 2. DATA DEFINITION
        // =================================================================
        const originalItems = [
            // GROUP 1: VEGETABLES
            { name: "ခရမ်းချဉ်သီး (Tomato)", emoji: "🍅" }, { name: "အာလူး (Potato)", emoji: "🥔" }, { name: "ဂေါ်ဖီထုပ် (Cabbage)", emoji: "🥬" }, { name: "ပန်းဂေါ်ဖီ (Cauliflower)", emoji: "🥦" }, { name: "ဖရုံသီး (Pumpkin)", emoji: "🎃" }, { name: "ငရုတ်ပွ (Capsicum)", emoji: "🫑" }, { name: "ဟင်းနုနွယ် (Spinach)", emoji: "🌿" }, { name: "သခွားသီး (Cucumber)", emoji: "🥒" }, { name: "ကညွှတ် (Asparagus)", emoji: "🌿" }, { name: "ပြောင်းဖူး (Corn)", emoji: "🌽" }, { name: "ပဲသီး (Green bean)", emoji: "🫛" }, { name: "ကန်စွန်းဥ (Sweet Potato)", emoji: "🍠" }, { name: "မှို (Mushroom)", emoji: "🍄" }, { name: "မုန်လာဥနီ (Carrot)", emoji: "🥕" }, { name: "ခရမ်းသီး (Brinjal/Eggplant)", emoji: "🍆" },
            // GROUP 2: FRUITS
            { name: "ပန်းသီး (Apple)", emoji: "🍎" }, { name: "ငှက်ပျောသီး (Banana)", emoji: "🍌" }, { name: "လိမ္မော်သီး (Orange)", emoji: "🍊" }, { name: "စပျစ်သီး (Grapes)", emoji: "🍇" }, { name: "သလဲသီး (Pomegranate)", emoji: "🌰" }, { name: "ကီဝီသီး (Kiwi)", emoji: "🥝" }, { name: "သရက်သီး (Papaya)", emoji: "🥭" }, { name: "နာနတ်သီး (Pineapple)", emoji: "🍍" }, { name: "ထောပတ်သီး (Avocado)", emoji: "🥑" }, { name: "မက်မွန်သီး (Peach)", emoji: "🍑" }, { name: "သရက်သီး (Mango)", emoji: "🥭" }, { name: "အုန်းသီး (Coconut)", emoji: "🥥" }, { name: "ဖရဲသီး (Watermelon)", emoji: "🍉" }, { name: "စတော်ဘယ်ရီသီး (Strawberry)", emoji: "🍓" }, { name: "ဘလက်ခ်ဘယ်ရီ (Blackberry)", emoji: "⚫" },
            // GROUP 3: ANIMALS & HABITATS
            { name: "မိကျောင်း (Alligator) - (အသိုက်)", emoji: "🐊" }, { name: "ပုရွက်ဆိတ် (Ant) - (တောင်ပို့)", emoji: "🐜" }, { name: "လင်းနို့ (Bat) - (လှိုဏ်ခေါင်း)", emoji: "🦇" }, { name: "ဝက်ဝံ (Bear) - (ဂူ, တော)", emoji: "🐻" }, { name: "ပျား (Bee) - (အုံ)", emoji: "🐝" }, { name: "ပိုးတောင်မာ (Beetle) - (ဥမင်)", emoji: "🐞" }, { name: "ငှက် (Bird) - (အသိုက်)", emoji: "🐦" }, { name: "ကျွဲ (Buffalo) - (ခြံ, ကျက်စားရာ)", emoji: "🐃" }, { name: "နွားထီး (Bull) - (နွားတင်းကုပ်)", emoji: "🐂" }, { name: "ကုလားအုတ် (Camel) - (သဲကန္တာရ)", emoji: "🐪" }, { name: "ကြောင် (Cat) - (တွင်း)", emoji: "🐈" }, { name: "နွား (Cattle) - (ခြံ)", emoji: "🐄" }, { name: "ကျားသစ် (Cheetah) - (ဆာဗားနား)", emoji: "🐆" }, { name: "ကြက် (Chicken) - (ကြက်ခြံ)", emoji: "🐔" }, { name: "ချင်ပန်ဇီ (Chimpanzee) - (သစ်ပင်)", emoji: "🐒" }, { name: "နွား (Cow) - (တင်းကုပ်)", emoji: "🐄" }, { name: "တောခွေး (Coyote) - (တွင်း)", emoji: "🐺" }, { name: "ကြိုးကြာ (Crane) - (အသိုက်)", emoji: "🦢" }, { name: "မိကျောင်း (Crocodile) - (အသိုက်)", emoji: "🐊" }, { name: "ကျီးကန်း (Crow) - (အသိုက်)", emoji: "🐦" }, { name: "သမင် (Deer) - (မြက်ခင်း, တော)", emoji: "🦌" }, { name: "ခွေး (Dog) - (ခွေးအိမ်)", emoji: "🐕" }, { name: "လင်းပိုင် (Dolphin) - (ရေကန်)", emoji: "🐬" }, { name: "မြည်း (Donkey) - (တင်းကုပ်)", emoji: "🐴" }, { name: "ခို (Dove) - (အသိုက်)", emoji: "🕊️" }, { name: "ဘဲ (Duck) - (အသိုက်, အိုင်)", emoji: "🦆" }, { name: "သိမ်းငှက် (Eagle) - (အသိုက်)", emoji: "🦅" }, { name: "ဆင် (Elephant) - (တောနက်)", emoji: "🐘" }, { name: "ငါး (Fish) - (ရေကန်)", emoji: "🐟" }, { name: "ယင် (Fly) - (အက်ကြောင်း)", emoji: "🪰" }, { name: "မြေခွေး (Fox) - (တွင်း)", emoji: "🦊" }, { name: "ဖား (Frog) - (ဖားကန်)", emoji: "🐸" }, { name: "သစ်ကုလားအုတ် (Giraffe) - (ဆာဗားနား)", emoji: "🦒" }, { name: "ဆိတ် (Goat) - (ခြံ)", emoji: "🐐" }, { name: "ဂေါ်ရီလာ (Gorilla) - (အသိုက်)", emoji: "🦍" }, { name: "ကျိုင်းကောင် (Grasshopper) - (မြက်ခင်း)", emoji: "🦗" }, { name: "တောကြက် (Grouse) - (အသိုက်)", emoji: "🐔" }, { name: "ယုန် (Hare) - (လယ်ကွင်း)", emoji: "🐇" }, { name: "သိမ်းငှက် (Hawk) - (အသိုက်)", emoji: "🦅" }, { name: "ရေမြင်း (Hippopotamus) - (မြစ်ကမ်း)", emoji: "🦛" }, { name: "ဟော်နက် (Hornet) - (အုံ)", emoji: "🐝" }, { name: "မြင်း (Horse) - (တင်းကုပ်)", emoji: "🐎" }, { name: "သားပိုက်ကောင် (Kangaroo) - (သစ်ခေါင်း)", emoji: "🦘" }, { name: "ကျားသစ် (Leopard) - (ဆာဗားနား)", emoji: "🐆" }, { name: "ခြင်္သေ့ (Lion) - (တွင်း)", emoji: "🦁" }, { name: "လူသား (Man) - (အိမ်)", emoji: "🧑‍🤝‍🧑" }, { name: "မျောက် (Monkey) - (သစ်ပင်)", emoji: "🐒" }, { name: "အမေရိကသမင် (Moose) - (မြေစို)", emoji: "🦌" }, { name: "ကြွက် (Mouse) - (တွင်း)", emoji: "🐁" }, { name: "ဇီးကွက် (Owl) - (အသိုက်)", emoji: "🦉" }, { name: "ဝက်ဝံပန်ဒါ (Panda) - (ဝါးပင်)", emoji: "🐼" }, { name: "ကြက်တူရွေး (Parrot) - (လှောင်အိမ်)", emoji: "🦜" }, { name: "ပင်ဂွင်း (Penguin) - (အသိုက်)", emoji: "🐧" }, { name: "ဝက် (Pig) - (ဝက်ခြံ)", emoji: "🐖" }, { name: "ခို (Pigeon) - (အိမ်)", emoji: "🕊️" }, { name: "ဝင်ရိုးစွန်းဝက်ဝံ (Polar bear) - (တွင်း)", emoji: "🐻‍❄️" }, { name: "လင်းပိုင် (Porpoise) - (ပင်လယ်, aquarium)", emoji: "🐬" }, { name: "ယုန် (Rabbit) - (လှောင်အိမ်, တွင်း)", emoji: "🐇" }, { name: "ကြွက် (Rat) - (တွင်း)", emoji: "🐀" }, { name: "ကျီး (Raven) - (အသိုက်)", emoji: "🐦" }, { name: "ကြံ့ (Rhinoceros) - (ဆာဗားနား, ရွှံ့အိုင်)", emoji: "🦏" }, { name: "ကျီး (Rook) - (အသိုက်)", emoji: "🐦" }, { name: "ပင်လယ်ဖျံ (Sea Lion) - (အသိုက်)", emoji: "🦭" }, { name: "ငါးမန်း (Shark) - (ပင်လယ်)", emoji: "🦈" }, { name: "သိုး (Sheep) - (သိုးခြံ)", emoji: "🐑" }, { name: "ခရု (Snail) - (ခရုခွံ)", emoji: "🐌" }, { name: "မြွေ (Snake) - (တွင်း)", emoji: "🐍" }, { name: "စာကလေး (Sparrow) - (အသိုက်)", emoji: "🐦" }, { name: "ပင့်ကူ (Spider) - (ပင့်ကူအိမ်)", emoji: "🕷️" }, { name: "ရှဉ့် (Squirrel) - (အသိုက်)", emoji: "🐿️" }, { name: "ငန်း (Swan) - (အသိုက်)", emoji: "🦢" }, { name: "ချ (Termite) - (တောင်ပို့)", emoji: "🐜" }, { name: "ကျား (Tiger) - (တွင်း)", emoji: "🐅" }, { name: "လိပ် (Turtle) - (ပင်လယ်)", emoji: "🐢" }, { name: "မြွေပွေး (Viper) - (တွင်း)", emoji: "🐍" }, { name: "ဝေလငါး (Whale) - (ပင်လယ်)", emoji: "🐳" }, { name: "ဝံပုလွေ (Wolf) - (တွင်း)", emoji: "🐺" }, { name: "သစ်တောက်ငှက် (Woodpecker) - (အသိုက်)", emoji: "🐦" }, { name: "မြင်းကျား (Zebra) - (တောနက်, ကွင်းပြင်)", emoji: "🦓" },
            // GROUP 4: FOOD ITEMS
            { name: "ကွတ်ကီး (Cookie (U.S.)", emoji: "🍪" }, { name: "Sandwich (BLT)", emoji: "🥪" }, { name: "ပေါင်မုန့် (Bread)", emoji: "🍞" }, { name: "ဘာဂါ (Burger)", emoji: "🍔" }, { name: "ထောပတ် (Butter)", emoji: "🧈" }, { name: "ဆိုဒါဗူး (Can Of Soda)", emoji: "🥤" }, { name: "ဒိန်ခဲ (Cheese)", emoji: "🧀" }, { name: "ကြက်သားကြော် (Chicken-Fried Steak)", emoji: "🍗" }, { name: "ချောကလက် (Chocolate)", emoji: "🍫" }, { name: "ကော်ဖီ (Coffee)", emoji: "☕" }, { name: "ကိုကာကိုလာ (Coke)", emoji: "🥤" }, { name: "ဒိုးနပ် (Donuts)", emoji: "🍩" }, { name: "အာလူးချောင်းကြော် (French Fries)", emoji: "🍟" }, { name: "ကြက်ကြော် (Fried Chicken)", emoji: "🍗" }, { name: "ကြက်ဥကြော် (Fried Eggs)", emoji: "🍳" }, { name: "ဟမ်ဘာဂါ (Hamburger)", emoji: "🍔" }, { name: "ဟော့ဒေါ့ (Hot Dog)", emoji: "🌭" }, { name: "ရေခဲမုန့် (Ice Cream)", emoji: "🍦" }, { name: "မီနူး (Menu)", emoji: "📜" }, { name: "နို့ (Milk)", emoji: "🥛" }, { name: "နို့မစ်ရှိတ် (Milk Shake)", emoji: "🥤" }, { name: "ခေါက်ဆွဲ (Noodle)", emoji: "🍜" }, { name: "ပန်ကိတ် (Pancakes)", emoji: "🥞" }, { name: "ပီဇာ (Pizza)", emoji: "🍕" }, { name: "ပြောင်းဖူးပေါက် (Popcorn)", emoji: "🍿" }, { name: "ဆလပ် (Salad)", emoji: "🥗" }, { name: "ပင်လယ်စာ (Seafood)", emoji: "🦐" }, { name: "ဆိုဒါ (Soda)", emoji: "🥤" }, { name: "အချိုရည် (Soft Drink)", emoji: "🥤" }, { name: "လက်ဖက်ရည် (Tea)", emoji: "🍵" }, { name: "ပေါင်မုန့် (White Bread)", emoji: "🍞" }, { name: "ဒိန်ချဉ် (Yogurt)", emoji: "🥛" },
            // GROUP 5: KITCHEN UTENSILS
            { name: "ထမင်းချက်ဝတ်စုံ (Apron)", emoji: "🧑‍🍳" }, { name: "ပုလင်း (Bottle)", emoji: "🍾" }, { name: "ပန်းကန်လုံး (Bowl)", emoji: "🥣" }, { name: "ဇွန်းခက်ရင်း (Cutlery)", emoji: "🍴" }, { name: "ဓာတ်ငွေ့မီးဖို (Gas stove)", emoji: "♨️" }, { name: "ဖန်ခွက် (Glass)", emoji: "🥃" }, { name: "လက်ဖက်ရည်အိုး (Teapot)", emoji: "🫖" }, { name: "မီးဖိုချောင်ကတ်ကြေး (Kitchen shears/scissors)", emoji: "✂️" }, { name: "ဓားအစုံ (Knife set)", emoji: "🔪" }, { name: "မီးဖိုလက်အိတ် (Oven gloves)", emoji: "🧤" }, { name: "ဒယ်အိုး (Pan)", emoji: "🍳" }, { name: "ပန်းကန်ပြား (Plate)", emoji: "🍽️" }, { name: "ဇွန်း (Regular spoon)", emoji: "🥄" },
            // GROUP 6: COLORS
            { name: "အနီရောင် (Red)", emoji: "🔴" }, { name: "အပြာရောင် (Blue)", emoji: "🔵" }, { name: "အစိမ်းရောင် (Green)", emoji: "🟢" }, { name: "လိမ္မော်ရောင် (Orange)", emoji: "🟠" }, { name: "အဖြူရောင် (White)", emoji: "⚪" }, { name: "အနက်ရောင် (Black)", emoji: "⚫" }, { name: "အဝါရောင် (Yellow)", emoji: "🟡" }, { name: "ခရမ်းရောင် (Purple)", emoji: "🟣" }, { name: "ငွေရောင် (Silver)", emoji: "🪙" }, { name: "အညိုရောင် (Brown)", emoji: "🟤" }, { name: "မီးခိုးရောင် (Gray)", emoji: "◻️" }, { name: "ပန်းရောင် (Pink)", emoji: "🌸" }, { name: "သံလွင်စိမ်း (Olive)", emoji: "🫒" }, { name: "မီးသွေးခဲ (Charcoal)", emoji: "◼️" }, { name: "ကြေးနီရောင် (Bronze)", emoji: "🥉" }, { name: "ရွှေရောင် (Gold)", emoji: "🥇" },
            // GROUP 7: SPORTS
            { name: "ခရစ်ကတ် (Cricket)", emoji: "🏏" }, { name: "ဘောလုံး (Football)", emoji: "⚽" }, { name: "ဘေ့စ်ဘော (Baseball)", emoji: "⚾" }, { name: "လက်ဝှေ့ (Boxing)", emoji: "🥊" }, { name: "ဘော်လီဘော (Volleyball)", emoji: "🏐" }, { name: "ဓားပစ် (Fencing)", emoji: "🤺" }, { name: "ဂေါက်သီး (Golf)", emoji: "⛳" }, { name: "ဟော်ကီ (Hockey)", emoji: "🏑" }, { name: "ကြက်တောင် (Badminton)", emoji: "🏸" }, { name: "မာရသွန် (Marathon)", emoji: "🏃‍♂️" }, { name: "ဂျူဒို (Judo)", emoji: "🥋" }, { name: "ကရာတေး (Karate)", emoji: "🥋" }, { name: "တင်းနစ် (Tennis)", emoji: "🎾" }, { name: "ရေကူး (Swimming)", emoji: "🏊‍♂️" }, { name: "နပန်း (Wrestling)", emoji: "🤼‍♂️" }, { name: "ယောဂ (Yoga)", emoji: "🧘‍♀️" }, { name: "အလေးမ (Weightlifting)", emoji: "🏋️‍♂️" }, { name: "ရပ်ဘီ (Rugby)", emoji: "🏉" }, { name: "လှိုင်းစီး (Surfing)", emoji: "🏄‍♂️" }, { name: "မြှားပစ် (Archery)", emoji: "🏹" }, { name: "ဘတ်စကက်ဘော (Basketball)", emoji: "🏀" }, { name: "စကိတ်စီး (Skateboarding)", emoji: "🛹" }, { name: "တူတူပုန်း (Hide And Seek)", emoji: "🙈" }, { name: "လေဟုန်စီး (Hang Gliding)", emoji: "🪁" }, { name: "လှေလှော် (Canoeing)", emoji: "🛶" }, { name: "ရွက်လွှင့် (Sailing)", emoji: "⛵" }, { name: "စက်ဘီးစီး (Cycling)", emoji: "🚴‍♂️" }, { name: "စွန်လွှတ် (Kite Flying)", emoji: "🪁" }, { name: "နှင်းလျှောစီး (Snow Skiing)", emoji: "⛷️" }, { name: "တောင်တက် (Climbing)", emoji: "🧗‍♂️" },
            // GROUP 8: VEHICLES
            { name: "ကား (Car)", emoji: "🚗" }, { name: "ဘတ်စ်ကား (Bus)", emoji: "🚌" }, { name: "စက်ဘီး (Bicycle)", emoji: "🚲" }, { name: "စကူတာ (Scooter)", emoji: "🛴" }, { name: "မော်တော်ဆိုင်ကယ် (Motorcycle)", emoji: "🏍️" }, { name: "တက္ကစီ (Taxi)", emoji: "🚕" }, { name: "ရဲကား (Police Car)", emoji: "🚓" }, { name: "လူနာတင်ယာဉ် (Ambulance)", emoji: "🚑" }, { name: "မီးသတ်ကား (Fire Truck)", emoji: "🚒" }, { name: "စကိတ်ဘုတ် (Skateboard)", emoji: "🛹" }, { name: "ပြိုင်ကား (Race Car)", emoji: "🏎️" }, { name: "ရထား (Train)", emoji: "🚆" }, { name: "လေယာဉ်ပျံ (Airplane)", emoji: "✈️" }, { name: "ဟယ်လီကော်ပတာ (Helicopter)", emoji: "🚁" }, { name: "မြေအောက်ရထား (Subway)", emoji: "🚇" }, { name: "ဗန်ကား (Van)", emoji: "🚐" }, { name: "ပစ်ကပ် (Pickup Truck)", emoji: "🛻" }, { name: "ထွန်စက် (Tractor)", emoji: "🚜" }, { name: "ကုန်တင်ကား (Delivery Truck)", emoji: "🚚" }, { name: "ရွက်လှေ (Sailboat)", emoji: "⛵" }, { name: "ကူးတို့သင်္ဘော (Ferry)", emoji: "⛴️" }, { name: "သင်္ဘော (Ship)", emoji: "🚢" }, { name: "ရွက်လှေ (Yacht)", emoji: "🛥️" }, { name: "ကနူးလှေ (Canoe)", emoji: "🛶" }, { name: "မီးပုံးပျံ (Hot Air Balloon)", emoji: "🎈" }, { name: "ကေဘယ်ကား (Cable Car)", emoji: "🚠" }, { name: "လေထီး (Parachute)", emoji: "🪂" }, { name: "ဒုံးပျံ (Rocket)", emoji: "🚀" }, { name: "ဆိုက်ကား (Rickshaw)", emoji: "🛺" }, { name: "စွတ်ဖား (Sledge)", emoji: "🛷" }, { name: "ကရိန်း (Crane)", emoji: "🏗️" }
        ];

        const HABITAT_IMAGE_BASE_URL = "https://raw.githubusercontent.com/nathantun93/Pic/main/";

        const quizDataList = [
            { burmeseAnimal: "မိကျောင်း", burmeseHabitat: "မိချောင်းသိုက်" }, { burmeseAnimal: "ပုရွက်ဆိတ်", burmeseHabitat: "တောင်ပို့" }, { burmeseAnimal: "လင်းနို့", burmeseHabitat: "လှိုဏ်ခေါင်း" }, { burmeseAnimal: "ဝက်ဝံ", burmeseHabitat: "ဂူ" }, { burmeseAnimal: "ပျား", burmeseHabitat: "အုံ" }, { burmeseAnimal: "ပိုးတောင်မာ", burmeseHabitat: "ဥမင်" }, { burmeseAnimal: "ငှက်", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ကျွဲ", burmeseHabitat: "ခြံ" }, { burmeseAnimal: "နွားထီး", burmeseHabitat: "နွားတင်းကုပ်" }, { burmeseAnimal: "ကုလားအုတ်", burmeseHabitat: "သဲကန္တာရ" }, { burmeseAnimal: "ကြောင်", burmeseHabitat: "နေအိမ်" }, { burmeseAnimal: "နွား", burmeseHabitat: "ခြံ" }, { burmeseAnimal: "ကျားသစ်", burmeseHabitat: "ဆာဗားနား" }, { burmeseAnimal: "ကြက်", burmeseHabitat: "ကြက်ခြံ" }, { burmeseAnimal: "ချင်ပန်ဇီ", burmeseHabitat: "သစ်ပင်" }, { burmeseAnimal: "တောခွေး", burmeseHabitat: "မြေတွင်း" }, { burmeseAnimal: "ကြိုးကြာ", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ကျီးကန်း", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "သမင်", burmeseHabitat: "မြက်ခင်း" }, { burmeseAnimal: "ခွေး", burmeseHabitat: "ခွေးအိမ်" }, { burmeseAnimal: "လင်းပိုင်", burmeseHabitat: "ရေကန်" }, { burmeseAnimal: "မြည်း", burmeseHabitat: "တင်းကုပ်" }, { burmeseAnimal: "ခို", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ဘဲ", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "သိမ်းငှက်", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ဆင်", burmeseHabitat: "တောနက်" }, { burmeseAnimal: "ငါး", burmeseHabitat: "ရေကန်" }, { burmeseAnimal: "ယင်", burmeseHabitat: "အက်ကြောင်း" }, { burmeseAnimal: "မြေခွေး", burmeseHabitat: "မြေတွင်း" }, { burmeseAnimal: "ဖား", burmeseHabitat: "ဖားကန်" }, { burmeseAnimal: "သစ်ကုလားအုတ်", burmeseHabitat: "ဆာဗားနား" }, { burmeseAnimal: "ဆိတ်", burmeseHabitat: "ခြံ" }, { burmeseAnimal: "ဂေါ်ရီလာ", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ကျိုင်းကောင်", burmeseHabitat: "မြက်ခင်း" }, { burmeseAnimal: "တောကြက်", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ယုန်", burmeseHabitat: "လယ်ကွင်း" }, { burmeseAnimal: "ရေမြင်း", burmeseHabitat: "မြစ်ကမ်း" }, { burmeseAnimal: "ဟော်နက်", burmeseHabitat: "အုံ" }, { burmeseAnimal: "မြင်း", burmeseHabitat: "တင်းကုပ်" }, { burmeseAnimal: "သားပိုက်ကောင်", burmeseHabitat: "သစ်ခေါင်း" }, { burmeseAnimal: "ခြင်္သေ့", burmeseHabitat: "ဂူ" }, { burmeseAnimal: "လူသား", burmeseHabitat: "အိမ်" }, { burmeseAnimal: "မျောက်", burmeseHabitat: "သစ်ပင်" }, { burmeseAnimal: "အမေရိကသမင်", burmeseHabitat: "မြေစို" }, { burmeseAnimal: "ကြွက်", burmeseHabitat: "ကြွက်တွင်း" }, { burmeseAnimal: "ဇီးကွက်", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ဝက်ဝံပန်ဒါ", burmeseHabitat: "ဝါးပင်" }, { burmeseAnimal: "ကြက်တူရွေး", burmeseHabitat: "လှောင်အိမ်" }, { burmeseAnimal: "ပင်ဂွင်း", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ဝက်", burmeseHabitat: "ဝက်ခြံ" }, { burmeseAnimal: "ဝင်ရိုးစွန်းဝက်ဝံ", burmeseHabitat: "တွင်း" }, { burmeseAnimal: "ကျီး", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ကြံ့", burmeseHabitat: "ရွှံ့အိုင်" }, { burmeseAnimal: "ပင်လယ်ဖျံ", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ငါးမန်း", burmeseHabitat: "ပင်လယ်" }, { burmeseAnimal: "သိုး", burmeseHabitat: "သိုးခြံ" }, { burmeseAnimal: "ခရု", burmeseHabitat: "ခရုခွံ" }, { burmeseAnimal: "မြွေ", burmeseHabitat: "မြွေတွင်း" }, { burmeseAnimal: "စာကလေး", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ပင့်ကူ", burmeseHabitat: "ပင့်ကူအိမ်" }, { burmeseAnimal: "ရှဉ့်", burmeseHabitat: "ရှဉ့်သိုက်" }, { burmeseAnimal: "ငန်း", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "ချ", burmeseHabitat: "တောင်ပို့" }, { burmeseAnimal: "ကျား", burmeseHabitat: "ဂူ" }, { burmeseAnimal: "လိပ်", burmeseHabitat: "ပင်လယ်" }, { burmeseAnimal: "မြွေပွေး", burmeseHabitat: "မြွေတွင်း" }, { burmeseAnimal: "ဝေလငါး", burmeseHabitat: "ပင်လယ်" }, { burmeseAnimal: "ဝံပုလွေ", burmeseHabitat: "မြေတွင်း" }, { burmeseAnimal: "သစ်တောက်ငှက်", burmeseHabitat: "အသိုက်" }, { burmeseAnimal: "မြင်းကျား", burmeseHabitat: "ကွင်းပြင်" }
        ];
        
        const vegCount = 15; const fruitCount = 15; const animalCount = 84;
        const foodCount = 32; const kitchenCount = 13; const colorCount = 16;
        const sportsCount = 30; const vehicleCount = 31; 
        const startSports = vegCount + fruitCount + animalCount + foodCount + kitchenCount + colorCount;
        const startVehicles = startSports + sportsCount; 

        const gameGroups = {
            'vegetables': { name: '🥬 Vegetables', items: originalItems.slice(0, vegCount) },
            'fruits': { name: '🍎 Fruits', items: originalItems.slice(vegCount, vegCount + fruitCount) },
            'animals': { name: '🐘 Animals', items: originalItems.slice(vegCount + fruitCount, vegCount + fruitCount + animalCount) },
            'food': { name: '🍔 Food', items: originalItems.slice(vegCount + fruitCount + animalCount, vegCount + fruitCount + animalCount + foodCount) },
            'kitchen': { name: '🔪 Kitchen', items: originalItems.slice(vegCount + fruitCount + animalCount + foodCount, vegCount + fruitCount + animalCount + foodCount + kitchenCount) },
            'colors': { name: '🎨 Colors', items: originalItems.slice(vegCount + fruitCount + animalCount + foodCount + kitchenCount, startSports) },
            'sports': { name: '⚽ Sports', items: originalItems.slice(startSports, startVehicles) },
            'vehicles': { name: '🚗 Vehicles', items: originalItems.slice(startVehicles) }
        };

        const deduplicateItems = (list) => {
            const uniqueMap = new Map();
            list.forEach(item => {
                const match = item.name.match(/\(([^)]+)\)/);
                let key = match ? match[1].toLowerCase().trim() : item.name.toLowerCase().trim();
                if (key.includes('-')) key = key.substring(0, key.indexOf(')')).trim();
                else if (key.includes('/')) key = key.substring(0, key.indexOf('/')).trim();
                
                const isAnimalWithHabitat = item.name.includes('-');
                if (!uniqueMap.has(key) || isAnimalWithHabitat) uniqueMap.set(key, item);
            });
            return Array.from(uniqueMap.values());
        };

        const finalItems = deduplicateItems(originalItems);
        const TOTAL_ITEMS = finalItems.length;
        
        // =================================================================
        // 3. UI and Pagination Logic
        // =================================================================
        const ITEMS_PER_PAGE = 40;
        const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE); 
        let currentPage = 1; 

        const gridContainer = byId('grid-container');
        const prevBtn = byId('prev-btn');
        const nextBtn = byId('next-btn');
        const footerText = byId('footer-text');
        
        function renderGrid(page) {
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, TOTAL_ITEMS);
            const pageItems = finalItems.slice(startIndex, endIndex);
            gridContainer.innerHTML = '';
            pageItems.forEach((item) => {
                const itemElement = document.createElement('div');
                itemElement.classList.add(
                    'grid-item', 'flex', 'flex-col', 'items-center', 'justify-center', 
                    'p-3', 'text-center', 'rounded-xl', 'shadow-md', 'border', 'border-gray-200'
                );
                
                const parts = item.name.split(' (');
                const burmesePart = parts[0];
                const englishPart = parts.length > 1 ? ' (' + parts[1] : '';
                
                itemElement.onclick = () => playAudio(burmesePart);

                const emojiDiv = document.createElement('div');
                emojiDiv.classList.add('text-4xl', 'sm:text-5xl', 'mb-2');
                emojiDiv.textContent = item.emoji;
                
                const nameP = document.createElement('p');
                nameP.classList.add('text-sm', 'sm:text-base', 'font-semibold', 'text-primary-green', 'leading-tight'); 
                nameP.textContent = t(burmesePart) + englishPart;
                
                itemElement.appendChild(emojiDiv);
                itemElement.appendChild(nameP);
                gridContainer.appendChild(itemElement);
            });
            updateUI(page);
        }

        function updateUI(page) {
            prevBtn.disabled = page === 1;
            nextBtn.disabled = page === TOTAL_PAGES;
            footerText.textContent = `Showing page ${page} of ${TOTAL_PAGES} (${TOTAL_ITEMS} items total)`;
        }

        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= TOTAL_PAGES) {
                currentPage = newPage;
                renderGrid(currentPage);
            }
        }

        // =================================================================
        // 4. HABITAT QUIZ GAME LOGIC
        // =================================================================
        let QUIZ_MAP = new Map(); 
        let ALL_ANIMALS = [];     
        let ALL_HABITAT_KEYS = []; 
        let quizState = { currentQuizType: null, currentCorrectItem: null, currentCorrectAnswerKey: null, score: 0, trophies: 0, isAnswering: true };

        const habitatQuestionTextEl = byId('habitat-question-text');
        const questionTargetDisplayEl = byId('question-target-display');
        const answerOptionsEl = byId('answer-options');
        const nextQuestionBtn = byId('next-question-btn');
        const gameFeedbackEl = byId('game-feedback');
        
        function generateQuizData() {
            const map = new Map();
            const animalList = [];
            const processedBurmeseNames = new Set(); 

            quizDataList.forEach(item => {
                const burmeseName = item.burmeseAnimal;
                const habitatKey = item.burmeseHabitat;
                const originalAnimal = originalItems.find(orig => orig.name.startsWith(burmeseName + " ("));

                if (originalAnimal && !processedBurmeseNames.has(burmeseName)) {
                    const animalMatch = originalAnimal.name.match(/\(([^)]+)\)/);
                    if (animalMatch) {
                        const englishAnimal = animalMatch[1].split('/')[0].trim(); 
                        const animalObj = {
                            burmese: burmeseName, english: englishAnimal, emoji: originalAnimal.emoji,
                            habitatKey: habitatKey, habitatDisplay: habitatKey, habitatImage: HABITAT_IMAGE_BASE_URL + habitatKey + ".png" 
                        };
                        if (!map.has(habitatKey)) map.set(habitatKey, []);
                        map.get(habitatKey).push(animalObj);
                        animalList.push(animalObj);
                        processedBurmeseNames.add(burmeseName); 
                    }
                }
            });

            const rabbit = originalItems.find(o => o.name.startsWith("ယုန် (Rabbit"));
            if(rabbit) {
                const rabbitObj = { burmese: "ယုန်", english: "Rabbit", emoji: rabbit.emoji, habitatKey: "ယုန်တွင်း", habitatDisplay: "ယုန်တွင်း", habitatImage: HABITAT_IMAGE_BASE_URL + "ယုန်တွင်း.png" };
                if (!map.has(rabbitObj.habitatKey)) map.set(rabbitObj.habitatKey, []);
                map.get(rabbitObj.habitatKey).push(rabbitObj);
                animalList.push(rabbitObj);
            }
            const pigeon = originalItems.find(o => o.name.startsWith("ခို (Pigeon"));
             if(pigeon) {
                const pigeonObj = { burmese: "ခို", english: "Pigeon", emoji: pigeon.emoji, habitatKey: "ခိုအိမ်", habitatDisplay: "ခိုအိမ်", habitatImage: HABITAT_IMAGE_BASE_URL + "ခိုအိမ်.png" };
                if (!map.has(pigeonObj.habitatKey)) map.set(pigeonObj.habitatKey, []);
                map.get(pigeonObj.habitatKey).push(pigeonObj);
                animalList.push(pigeonObj);
            }
            
            ALL_ANIMALS = Array.from(new Set(animalList.map(a => a.english))).map(eng => animalList.find(a => a.english === eng));
            QUIZ_MAP = map;
            ALL_HABITAT_KEYS = Array.from(QUIZ_MAP.keys());
        }
        
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function updateScoreUI() {
            const countEl = byId('global-trophy-count');
            if (countEl) countEl.textContent = quizState.trophies;
        }
        
        async function playQuestionSequence(type, animal, options) {
            try {
                if (type === 'A') {
                    if (!quizState.isAnswering) return;
                    await playAudio(animal.burmese); 
                    if (!quizState.isAnswering) return;
                    await playAudio("ဘယ်မှာနေထိုင်သလဲ?");
                    for (const option of options) {
                        if (!quizState.isAnswering) return;
                        const button = byId(`habitat-option-${option.key}`);
                        if (button) button.classList.add('highlight-answer');
                        await playAudio(option.display);
                        await sleep(200);
                        if (button) button.classList.remove('highlight-answer');
                        await sleep(200);
                    }
                } else {
                    if (!quizState.isAnswering) return;
                    await playAudio("ဒီနေရာမှာ ဘယ်အကောင် နေထိုင်သလဲ?");
                    for (const option of options) {
                        if (!quizState.isAnswering) return;
                        const button = byId(`habitat-option-${option.key}`);
                        if (button) button.classList.add('highlight-answer');
                        await playAudio(option.burmeseName);
                        await sleep(200);
                        if (button) button.classList.remove('highlight-answer');
                        await sleep(200);
                    }
                }
                
                if (quizState.isAnswering) {
                    gameFeedbackEl.textContent = 'Choose the correct answer.'; 
                    options.forEach(option => {
                        const button = byId(`habitat-option-${option.key}`);
                        if (button) {
                            button.disabled = false;
                            button.classList.remove('disabled:opacity-70');
                        }
                    });
                    resetHintTimer();
                }
            } catch (e) { console.error("Error in audio sequence:", e); }
        }

        function setupQuestion() {
            quizState.isAnswering = true; 
            stopHintTimer();
            answerOptionsEl.innerHTML = '';
            nextQuestionBtn.classList.add('hidden');
            gameFeedbackEl.textContent = 'Listen to the audio.'; 
            questionTargetDisplayEl.classList.remove('text-9xl', 'text-4xl'); 
            questionTargetDisplayEl.classList.add('text-6xl', 'sm:text-8xl'); 
            questionTargetDisplayEl.innerHTML = ''; 

            if (ALL_ANIMALS.length < 4 || ALL_HABITAT_KEYS.length < 4) {
                gameFeedbackEl.textContent = "Not enough data for the quiz.";
                return;
            }

            quizState.currentQuizType = Math.random() < 0.5 ? 'A' : 'B'; 
            const correctAnimal = ALL_ANIMALS[Math.floor(Math.random() * ALL_ANIMALS.length)];
            quizState.currentCorrectItem = correctAnimal;
            let options = []; 

            if (quizState.currentQuizType === 'A') {
                quizState.currentCorrectAnswerKey = correctAnimal.habitatKey;
                questionTargetDisplayEl.textContent = correctAnimal.emoji;
                questionTargetDisplayEl.classList.add('text-9xl');
                habitatQuestionTextEl.textContent = `Where does this ${t(correctAnimal.burmese)} (${correctAnimal.english}) live?`;

                const negativeKeys = shuffleArray(ALL_HABITAT_KEYS.filter(key => key !== correctAnimal.habitatKey)).slice(0, 3);
                options = shuffleArray([correctAnimal.habitatKey, ...negativeKeys].map(key => ({
                    key: key, display: key, habitatImage: HABITAT_IMAGE_BASE_URL + key + ".png", isCorrect: key === correctAnimal.habitatKey
                })));

                options.forEach(option => {
                    const button = document.createElement('button');
                    button.classList.add('w-full', 'p-4', 'rounded-xl', 'font-bold', 'text-lg', 'shadow-md', 'transition', 'duration-200', 'hover:shadow-xl', 'active:translate-y-0.5', 'flex', 'text-center', 'default-answer', 'flex-col', 'h-auto', 'disabled:opacity-70');
                    button.innerHTML = `<img src="${option.habitatImage}" alt="${option.display}" class="w-full h-24 object-contain mb-2 rounded-md bg-gray-100" onerror="this.src='https://placehold.co/100x100/f0fdf4/15803d?text=ပုံမရှိပါ'"><span class="text-sm font-semibold">${t(option.display)}</span>`; 
                    button.id = `habitat-option-${option.key}`; 
                    button.dataset.key = option.key;
                    button.dataset.isCorrect = option.isCorrect;
                    button.onclick = () => checkAnswer(option.key); 
                    button.disabled = true; 
                    answerOptionsEl.appendChild(button);
                });

            } else {
                quizState.currentCorrectAnswerKey = correctAnimal.english;
                questionTargetDisplayEl.innerHTML = `<img src="${correctAnimal.habitatImage}" alt="${correctAnimal.habitatDisplay}" class="w-full max-w-xs h-48 object-contain rounded-lg shadow-md bg-white" onerror="this.src='https://placehold.co/200x200/f0fdf4/15803d?text=ပုံမရှိပါ'">`;
                habitatQuestionTextEl.textContent = `Which animal lives here?`;

                const negativeAnimals = shuffleArray(ALL_ANIMALS.filter(a => a.habitatKey !== correctAnimal.habitatKey)).slice(0, 3);
                options = shuffleArray([correctAnimal, ...negativeAnimals].map(animal => ({
                    key: animal.english, emoji: animal.emoji, burmeseName: animal.burmese, isCorrect: animal.english === correctAnimal.english
                })));

                options.forEach(option => {
                    const button = document.createElement('button');
                    button.classList.add('w-full', 'p-4', 'rounded-xl', 'font-bold', 'text-lg', 'shadow-md', 'transition', 'duration-200', 'hover:shadow-xl', 'active:translate-y-0.5', 'flex', 'text-center', 'default-answer', 'flex-col', 'h-auto', 'disabled:opacity-70');
                    button.innerHTML = `<div class="w-full h-24 flex items-center justify-center text-6xl rounded-md bg-gray-100 mb-2">${option.emoji}</div><span class="text-sm font-semibold">${t(option.burmeseName)}</span>`; 
                    button.id = `habitat-option-${option.key}`; 
                    button.dataset.key = option.key;
                    button.dataset.burmeseName = option.burmeseName;
                    button.dataset.isCorrect = option.isCorrect;
                    button.onclick = () => checkAnswer(option.key); 
                    button.disabled = true; 
                    answerOptionsEl.appendChild(button);
                });
            }
            playQuestionSequence(quizState.currentQuizType, correctAnimal, options);
        }
        
        function checkAnswer(selectedKey) {
            if (!quizState.isAnswering) return;
            quizState.isAnswering = false; 
            stopHintTimer();

            const buttons = answerOptionsEl.querySelectorAll('button');
            buttons.forEach(button => button.disabled = true);
            
            const isCorrect = (selectedKey === quizState.currentCorrectAnswerKey);
            const correctButton = Array.from(buttons).find(btn => btn.dataset.key === quizState.currentCorrectAnswerKey);
            const selectedButton = Array.from(buttons).find(btn => btn.dataset.key === selectedKey);
            
            let correctDisplay = quizState.currentQuizType === 'B' ? `${quizState.currentCorrectItem.emoji} ${t(quizState.currentCorrectItem.burmese)}` : `'${t(quizState.currentCorrectItem.habitatKey)}'`;

            if (isCorrect) {
                gameFeedbackEl.textContent = `✅ Correct!`;
                playAudio(quizState.currentQuizType === 'A' ? quizState.currentCorrectItem.habitatKey : quizState.currentCorrectItem.burmese);
                if (correctButton) correctButton.classList.replace('default-answer', 'correct-answer');
                handleWin('habitat', 'floating-trophy', setupQuestion);
            } else {
                gameFeedbackEl.textContent = `❌ Wrong! The answer is ${correctDisplay}.`;
                if (selectedButton) selectedButton.classList.replace('default-answer', 'incorrect-answer');
                if (correctButton) correctButton.classList.replace('default-answer', 'correct-answer');
                nextQuestionBtn.classList.remove('hidden');
                nextQuestionBtn.onclick = () => {
                    nextQuestionBtn.classList.add('hidden');
                    setupQuestion();
                };
            }
        }
        
        // =================================================================
        // 5. MEMORY MATCH GAME LOGIC
        // =================================================================
        const restartMemoryBtn = byId('restart-memory-btn');
        const movesDisplay = byId('moves-display');
        const memoryGrid = byId('memory-grid');
        const memoryFeedback = byId('memory-feedback');
        const memoryCategoryDisplay = byId('memory-category-display');

        let memoryGameActive = true;
        let memFlippedCards = [];
        let memMatchedPairs = 0;
        let memMoves = 0;

        function startMemoryGame() {
            memoryGameActive = true;
            memFlippedCards = [];
            memMatchedPairs = 0;
            memMoves = 0;
            movesDisplay.textContent = `Moves: 0`;
            memoryGrid.innerHTML = '';
            memoryFeedback.textContent = '';
            stopHintTimer();

            // Auto-select a random category
            const categories = Object.keys(gameGroups);
            const randomCategoryKey = categories[Math.floor(Math.random() * categories.length)];
            const categoryData = gameGroups[randomCategoryKey];
            
            memoryCategoryDisplay.textContent = `Category: ${categoryData.name}`;

            const items = [...categoryData.items];
            const uniqueItems = deduplicateItems(items);

            if (uniqueItems.length < 5) { 
                 memoryFeedback.textContent = 'Not enough items (need 5 pairs) in this category. Restarting...';
                 setTimeout(startMemoryGame, 2000);
                 return;
            }

            const selectedItems = shuffleArray(uniqueItems).slice(0, 5); 
            const gameCards = shuffleArray([...selectedItems, ...selectedItems]);

            memoryGrid.classList.remove('grid-cols-4');
            memoryGrid.classList.add('grid-cols-5'); 

            gameCards.forEach(item => {
                const card = document.createElement('div');
                card.classList.add('memory-card');
                card.dataset.name = item.name; 
                card.dataset.burmeseName = item.name.split(' (')[0]; 
                card.innerHTML = `
                    <div class="card-inner">
                        <div class="card-face card-back">?</div>
                        <div class="card-face card-front">${item.emoji}</div>
                    </div>
                `;
                card.addEventListener('click', () => handleCardClick(card));
                memoryGrid.appendChild(card);
            });
            
            resetHintTimer();
        }

        function handleCardClick(card) {
            if (!memoryGameActive || card.classList.contains('flipped') || card.classList.contains('matched')) return;
            
            stopHintTimer();
            card.classList.add('flipped');
            playAudio(card.dataset.burmeseName);
            memFlippedCards.push(card);

            if (memFlippedCards.length === 2) {
                memoryGameActive = false;
                memMoves++;
                movesDisplay.textContent = `Moves: ${memMoves}`;

                if (memFlippedCards[0].dataset.name === memFlippedCards[1].dataset.name) {
                    memFlippedCards.forEach(c => c.classList.add('matched'));
                    memMatchedPairs++;
                    memFlippedCards = [];
                    memoryGameActive = true;
                    
                    if (memMatchedPairs === 5) { 
                        memoryFeedback.textContent = '🎉 You matched all items!';
                        memoryGameActive = false;
                        handleWin('memory', 'floating-trophy', startMemoryGame);
                    } else {
                        resetHintTimer();
                    }
                } else {
                    setTimeout(() => {
                        memFlippedCards.forEach(c => c.classList.remove('flipped'));
                        memFlippedCards = [];
                        memoryGameActive = true;
                        resetHintTimer();
                    }, 1200);
                }
            } else {
                resetHintTimer();
            }
        }
        
        // =================================================================
        // 6. COUNTING GAME LOGIC
        // =================================================================
        const countingPromptEl = byId('counting-prompt');
        const countingFeedbackEl = byId('counting-feedback');
        const countingItemsGridEl = byId('counting-items-grid');
            
        let countingGameState = { items: [], correctItem: null, targetCount: 0, currentCount: 0, classifier: 'ခု' };
        const numberWords = ["တစ်", "နှစ်", "သုံး", "လေး", "ငါး", "ခြောက်", "ခုနှစ်", "ရှစ်", "ကိုး", "ဆယ်"];
        let countableItems = []; 
        
        function populateCountableItems() {
             if (countableItems.length === 0) { 
                const groupsToUse = [gameGroups.fruits.items, gameGroups.animals.items, gameGroups.food.items, gameGroups.vegetables.items, gameGroups.kitchen.items, gameGroups.vehicles.items];
                groupsToUse.forEach(group => {
                    group.forEach(item => {
                        const burmeseName = item.name.split(' (')[0];
                        if (audioSpriteMap.has(burmeseName)) countableItems.push(item);
                    });
                });
                countableItems = deduplicateItems(countableItems);
            }
        }

        function setupCountingGame() {
            populateCountableItems();
            quizState.isAnswering = true; 
            stopHintTimer();
            countingGameState.currentCount = 0;
            countingItemsGridEl.innerHTML = '';
            countingFeedbackEl.textContent = 'Tap the correct item.';
            
            if (countableItems.length < 3) {
                countingPromptEl.textContent = "Not enough data for the game.";
                return;
            }

            const shuffled = shuffleArray([...countableItems]);
            countingGameState.items = shuffled.slice(0, 3);
            countingGameState.correctItem = countingGameState.items[0]; 
            countingGameState.targetCount = Math.floor(Math.random() * 5) + 3; 

            let classifier; 
            const burmeseName = countingGameState.correctItem.name.split(' (')[0];
            
            if (["ကော်ဖီ", "လက်ဖက်ရည်", "ဖန်ခွက်", "နို့", "အချိုရည်"].includes(burmeseName)) classifier = "ခွက်";
            else if (["ဆိုဒါ", "ဆိုဒါဗူး", "ကိုကာကိုလာ"].includes(burmeseName)) classifier = "ဗူး";
            else if (["ကွတ်ကီး", "Sandwich"].includes(burmeseName)) classifier = "ခု";
            else if (["ဟင်းနုနွယ်", "ကညွှတ်"].includes(burmeseName)) classifier = "ပင်";
            else if (["ပေါင်မုန့်", "ဟမ်ဘာဂါ", "လက်ဖက်ရည်အိုး", "ဘာဂါ"].includes(burmeseName)) classifier = "လုံး";
            else if (["ဆလပ်", "ပင်လယ်စာ"].includes(burmeseName)) classifier = "ပွဲ";
            else if (["လူသား"].includes(burmeseName)) classifier = "ယောက်";
            else if (["ထမင်းချက်ဝတ်စုံ"].includes(burmeseName)) classifier = "ထည်";
            else if (["ပြောင်းဖူး"].includes(burmeseName)) classifier = "ဖူး";
            else if (["ဖရဲသီး"].includes(burmeseName)) classifier = "စိတ်";
            else if (["ဇွန်းခက်ရင်း"].includes(burmeseName)) classifier = "စုံ";
            else if (["ပုလင်း"].includes(burmeseName)) classifier = "ပုလင်း";
            else if (["ဂေါ်ဖီထုပ်", "ပန်းဂေါ်ဖီ"].includes(burmeseName)) classifier = "ထုပ်";
            else if (["မှို"].includes(burmeseName)) classifier = "ပွင့်";
            else if (["ဓားအစုံ", "မီးဖိုချောင်ကတ်ကြေး"].includes(burmeseName)) classifier = "လက်";
            else if (["ကား", "ဘတ်စ်ကား", "စက်ဘီး", "မော်တော်ဆိုင်ကယ်", "တက္ကစီ", "ရဲကား", "လူနာတင်ယာဉ်", "မီးသတ်ကား", "ပြိုင်ကား", "ရထား", "လေယာဉ်ပျံ", "ဟယ်လီကော်ပတာ", "မြေအောက်ရထား", "ဗန်ကား", "ပစ်ကပ်", "ထွန်စက်", "ကုန်တင်ကား", "ကူးတို့သင်္ဘော", "သင်္ဘော", "သံတောင်", "လေထီး", "ဒုံးပျံ", "ဆိုက်ကား", "ကရိန်း"].includes(burmeseName)) classifier = "စီး";    
            else if (["ရွက်လှေ", "ကနူးလှေ", "စွတ်ဖား"].includes(burmeseName)) classifier = "စင်း";
            else if (gameGroups.animals.items.some(item => item.name === countingGameState.correctItem.name)) classifier = "ကောင်";
            else if (gameGroups.fruits.items.some(item => item.name === countingGameState.correctItem.name) || gameGroups.vegetables.items.some(item => item.name === countingGameState.correctItem.name)) classifier = "လုံး";
            else classifier = "ခု";

            countingGameState.classifier = classifier;
            const targetNumWord = numberWords[countingGameState.targetCount - 1];
            countingPromptEl.textContent = `${t(burmeseName)} ${t(targetNumWord)} ${t(classifier)}`;
            
            shuffleArray(countingGameState.items).forEach(item => {
                const itemEl = document.createElement('button');
                itemEl.classList.add('p-4', 'rounded-xl', 'shadow-md', 'transition', 'duration-200', 'bg-white', 'hover:shadow-lg', 'active:translate-y-0.5', 'h-30', 'sm:h-38', 'flex', 'items-center', 'justify-center');
                if (item.name === countingGameState.correctItem.name) itemEl.classList.add('counting-correct-item');
                itemEl.innerHTML = `<div class="emoji-display text-6xl sm:text-7xl">${item.emoji}</div>`;
                itemEl.onclick = () => handleCountingClick(item);
                countingItemsGridEl.appendChild(itemEl);
            });
            
            async function playPrompt() {
                await sleep(500);
                if (!quizState.isAnswering) return;
                await playAudio(burmeseName);
                if (!quizState.isAnswering) return;
                await playCountingAudio(targetNumWord);
                if (!quizState.isAnswering) return;
                await playCountingAudio(classifier);
                resetHintTimer();
            }
            playPrompt();
        }

        async function handleCountingClick(clickedItem) {
            if (!quizState.isAnswering) return; 
            stopHintTimer();
            
            if (clickedItem.name !== countingGameState.correctItem.name) {
                countingFeedbackEl.innerHTML = `<div class="text-lg font-semibold text-red-600">❌ Wrong! Try again.</div>`;
                resetHintTimer();
                return;
            }
            
            quizState.isAnswering = false; 
            countingGameState.currentCount++;
            
            if (countingGameState.currentCount > countingGameState.targetCount) {
                 countingGameState.currentCount = countingGameState.targetCount;
                 quizState.isAnswering = true; 
                 return; 
            }
            
            const numWord = numberWords[countingGameState.currentCount - 1];
            const emojiFeedback = Array(countingGameState.currentCount).fill(countingGameState.correctItem.emoji).join(' ');

            countingFeedbackEl.innerHTML = `
                <div class="text-2xl mb-2">${emojiFeedback}</div>
                <div class="text-lg font-semibold">${t(numWord)} ${t(countingGameState.classifier)}</div>
            `;
            
            await playCountingAudio(numWord);
            await playCountingAudio(countingGameState.classifier);
            
            if (countingGameState.currentCount === countingGameState.targetCount) {
                countingFeedbackEl.innerHTML = `<div class="text-2xl mb-2">${emojiFeedback}</div><div class="text-lg font-semibold text-green-600">✅ Target reached!</div>`;
                handleWin('counting', 'floating-trophy', setupCountingGame);
            } else {
                quizState.isAnswering = true;
                resetHintTimer();
            }
        }
        
        // =================================================================
        // 7. NAME GAME LOGIC
        // =================================================================
        const nameEmojiDisplayEl = byId('name-game-emoji-display');
        const nameGameFeedbackEl = byId('name-game-feedback');
        const nameGameOptionsEl = byId('name-game-options');
        const nextNameGameBtn = byId('next-name-game-btn');
            
        let nameGameState = { correctItem: null };

        function setupNameGame() {
            quizState.isAnswering = true; 
            stopHintTimer();
            nameGameOptionsEl.innerHTML = '';
            nextNameGameBtn.classList.add('hidden');
            nameGameFeedbackEl.textContent = 'Listen to the audio.';

            populateCountableItems();
            if (countableItems.length < 3) {
                nameGameFeedbackEl.textContent = "Not enough data for the game.";
                return;
            }

            const shuffled = shuffleArray([...countableItems]);
            const correctItem = shuffled[0];
            nameGameState.correctItem = correctItem;
            nameEmojiDisplayEl.textContent = correctItem.emoji;

            let options = shuffleArray([
                { item: correctItem, isCorrect: true },
                { item: shuffled[1], isCorrect: false },
                { item: shuffled[2], isCorrect: false }
            ]);

            options.forEach((option, index) => {
                const burmeseName = option.item.name.split(' (')[0];
                const button = document.createElement('button');
                button.id = `name-option-${index}`;
                button.classList.add('w-full', 'p-4', 'rounded-xl', 'font-bold', 'text-lg', 'shadow-md', 'transition', 'duration-200', 'default-answer', 'text-center', 'disabled:opacity-70');
                if (option.isCorrect) button.classList.add('name-correct-item');
                
                // Keep data-burmeseName to allow for dynamic toggling without reloading
                button.dataset.burmeseName = burmeseName;
                button.textContent = t(burmeseName);
                
                button.disabled = true; 
                button.onclick = () => handleNameAnswer(option, button);
                nameGameOptionsEl.appendChild(button);
            });

            playNameOptionsSequence(options);
        }

        async function playNameOptionsSequence(options) {
            await sleep(500); 
            for (let i = 0; i < options.length; i++) {
                if (!quizState.isAnswering) return; 
                const button = byId(`name-option-${i}`);
                if (!button) return; 
                const burmeseName = options[i].item.name.split(' (')[0];
                button.classList.add('highlight-answer');
                await playAudio(burmeseName);
                await sleep(200); 
                button.classList.remove('highlight-answer');
                await sleep(200); 
            }
            if (quizState.isAnswering) { 
                nameGameFeedbackEl.textContent = 'Choose the correct answer.';
                for (let i = 0; i < options.length; i++) {
                    const button = byId(`name-option-${i}`);
                    if (button) button.disabled = false;
                }
                resetHintTimer();
            }
        }

        function handleNameAnswer(clickedOption, buttonEl) {
            if (!quizState.isAnswering) return;
            quizState.isAnswering = false; 
            stopHintTimer();

            const allButtons = nameGameOptionsEl.querySelectorAll('button');
            allButtons.forEach(btn => btn.disabled = true);
            const correctBurmeseName = nameGameState.correctItem.name.split(' (')[0];

            if (clickedOption.isCorrect) {
                nameGameFeedbackEl.textContent = `✅ Correct!`;
                playAudio(correctBurmeseName); 
                buttonEl.classList.replace('default-answer', 'correct-answer');
                handleWin('name', 'floating-trophy', setupNameGame); 
            } else {
                nameGameFeedbackEl.textContent = `❌ Wrong! The answer is '${t(correctBurmeseName)}'.`;
                buttonEl.classList.replace('default-answer', 'incorrect-answer');
                allButtons.forEach(btn => {
                    if (btn.dataset.burmeseName === correctBurmeseName) btn.classList.replace('default-answer', 'correct-answer');
                });
                updateScoreUI();
                nextNameGameBtn.classList.remove('hidden');
                nextNameGameBtn.onclick = () => {
                     nextNameGameBtn.classList.add('hidden');
                     setupNameGame();
                };
            }
        }

        // =================================================================
        // 8. GAME SWITCHING LOGIC
        // =================================================================
        const habitatSection = byId('habitat-quiz-section');
        const memorySection = byId('memory-game-section');
        const countingGameSection = byId('counting-game-section');
        const nameGameSection = byId('name-game-section');
        const tabHabitat = byId('tab-habitat');
        const tabMemory = byId('tab-memory');
        const tabCounting = byId('tab-counting'); 
        const tabName = byId('tab-name');

        function handleTabClick(game) {
            if (!isAudioInitialized) {
                // If clicked before fully loaded
                return;
            }
            currentGameWins = 0; // Reset consecutive game wins tracker
            switchGame(game);
        }

        function switchGame(game) {
            // STOP ALL active audio on game switch
            stopAllAudio();
            
            currentActiveGame = game;
            stopHintTimer(); // Clear any existing hints
            
            habitatSection.classList.add('hidden');
            memorySection.classList.add('hidden');
            countingGameSection.classList.add('hidden');
            nameGameSection.classList.add('hidden'); 
            
            tabHabitat.classList.remove('active-tab');
            tabMemory.classList.remove('active-tab');
            tabCounting.classList.remove('active-tab');
            tabName.classList.remove('active-tab'); 

            if (game === 'habitat') {
                habitatSection.classList.remove('hidden');
                tabHabitat.classList.add('active-tab');
                setupQuestion(); 
            } else if (game === 'memory') {
                memorySection.classList.remove('hidden');
                tabMemory.classList.add('active-tab');
                startMemoryGame(); 
            } else if (game === 'counting') {
                countingGameSection.classList.remove('hidden');
                tabCounting.classList.add('active-tab');
                setupCountingGame();
            } else if (game === 'name') { 
                nameGameSection.classList.remove('hidden');
                tabName.classList.add('active-tab');
                setupNameGame();
            }
            updateScoreUI(); 
        }

        // =================================================================
        // 9. APP INITIALIZATION & DRAG LOGIC
        // =================================================================
        function initializeGame() {
            generateQuizData();
            updateScoreUI();
            renderGrid(currentPage);
            
            byId('restart-memory-btn').addEventListener('click', startMemoryGame);
            
            const games = ['habitat', 'memory', 'counting', 'name'];
            const randomGame = games[Math.floor(Math.random() * games.length)];
            switchGame(randomGame);
        }

        function setupDraggableTrophy() {
            const dragItem = rootEl.querySelector("#floating-trophy");
            if (!dragItem) return;
            
            let active = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            dragItem.addEventListener("touchstart", dragStart, {passive: false});
            document.addEventListener("touchend", dragEnd, {passive: false});
            document.addEventListener("touchmove", drag, {passive: false});

            dragItem.addEventListener("mousedown", dragStart);
            document.addEventListener("mouseup", dragEnd);
            document.addEventListener("mousemove", drag);

            function dragStart(e) {
                if (e.type === "touchstart") {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
                if (e.target === dragItem || dragItem.contains(e.target)) {
                    active = true;
                }
            }

            function drag(e) {
                if (active) {
                    e.preventDefault();
                    if (e.type === "touchmove") {
                        currentX = e.touches[0].clientX - initialX;
                        currentY = e.touches[0].clientY - initialY;
                    } else {
                        currentX = e.clientX - initialX;
                        currentY = e.clientY - initialY;
                    }
                    xOffset = currentX;
                    yOffset = currentY;
                    dragItem.style.transform = "translate3d(" + currentX + "px, " + currentY + "px, 0)";
                }
            }

            function dragEnd(e) {
                initialX = currentX;
                initialY = currentY;
                active = false;
            }
        }

        // Namespaced bridge for the onclick="..." strings embedded in the
        // HTML above (inline handlers always resolve via the global scope,
        // but these functions are declared inside this component's closure)
        // — namespaced (not bare window.toggleRoman etc.) so a same-named
        // function from a different hybrid-wrapped app mounted alongside
        // this one can't silently overwrite it.
        window.__blgApp = {
          toggleRoman, handleTabClick, setupQuestion, setupNameGame, changePage,
        };

        const runMasterInit = () => {
            const btn = byId('audio-unlock-btn');
            btn.onclick = initAudio;
            if (audioCtx && audioCtx.state === 'running') {
                initAudio();
            }
            setupDraggableTrophy();
        };
        runMasterInit();

    return () => {
      delete window.__blgApp;
    };
  }, []);

  return (
    <>
      <style>{BLG_APP_CSS}</style>
      <div
        ref={containerRef}
        className="blg-app-root p-4 sm:p-8 relative"
        dangerouslySetInnerHTML={{ __html: BLG_APP_BODY_HTML }}
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
              <h2 className="text-xl font-bold text-gray-800">🎮 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
