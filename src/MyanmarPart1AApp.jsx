import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "မြန်မာစာ သင်ယူမှုနှင့် ဂိမ်း" (Myanmar
// Part 1A) HTML app ──
// Same hybrid approach as the other ported apps: the original vanilla JS
// is kept almost unchanged inside a React wrapper. document.getElementById
// /querySelector(All) calls were changed to a rootEl-scoped `byId` helper /
// rootEl.querySelectorAll(All) so this app only ever touches its own
// container (global document.onmouseup/onmousemove/ontouchend/ontouchmove
// drag-tracking handlers were left as-is, matching the convention used in
// every other ported app here). The 3 onclick="..." string attributes
// (toggleReadAloud, toggleView, closeFloatingDisplay) now call
// window.__mp1aApp.<fn>(...) instead of bare globals. window.onload was
// converted to an immediately-invoked function since the DOM is already
// present by the time this effect runs. The original CSS's bare
// `body {...}` rule was rescoped to .p1a-app-root. Confetti is this app's
// own CSS/DOM animation (not the external canvas-confetti library), so no
// extra dependency is needed.
//
// This app has no data persistence of its own; the shared Firebase
// instance from ./firebase.js is reused for the added online-roster
// feature below.

const P1A_ROSTER_PATH = 'artifacts/myanmar-part1a-app/public/data/roster';
const sanitizeP1aKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const P1A_APP_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap');
        .p1a-app-root {
            font-family: 'Padauk', sans-serif;
            background-color: #f7f9fc;
        }
        .word-button {
            transition: all 0.15s ease-in-out; 
            cursor: pointer;
            user-select: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            overflow: hidden; 
        }
        .word-button:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        }
        .word-button:active {
            transform: translateY(0);
        }
        
        @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.8); }
            80% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0px rgba(255, 255, 255, 0); }
        }
        
        .word-button.glow-active {
            transition: none !important; 
            animation: pulse-ring 0.3s ease-out;
        }

        /* Highlight style for read-aloud feature */
        .word-button.highlight {
            box-shadow: 0 0 0 4px #4f46e5, 0 10px 15px -3px rgba(0, 0, 0, 0.2); /* Indigo color ring */
            transform: scale(1.05);
            background-color: #6366f1 !important; /* A slightly lighter indigo */
        }

        .burmese-word {
            /* Removed 3D text shadow, replaced with simpler shadow for clarity */
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            display: block; 
            font-size: 1.25rem; /* Slightly smaller for game buttons */
            line-height: 2rem;
        }
        
        /* Ensure word buttons in the list view still look good */
        #words-container .word-button .burmese-word {
             font-size: 1.4rem; 
             line-height: 2.2rem;
             text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 5px rgba(0, 0, 0, 0.5);
        }


        /* --- Confetti/Celebration Effects Styles --- */
        #confetti-container {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
            /* Ensures confetti is layered above everything else in the game view */
            z-index: 10; 
        }

        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            opacity: 0;
            animation: explode 1s ease-out forwards;
            line-height: 1; /* For emojis */
            will-change: transform, opacity; /* Performance optimization */
        }
        
        /* Different Confetti Types */
        .confetti.star, .confetti.emoji, .confetti.heart {
            background: none !important;
            width: auto;
            height: auto;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));
        }
        .confetti.star { font-size: 1.5rem; }
        .confetti.emoji { font-size: 2rem; }
        .confetti.heart { font-size: 1.5rem; }
        .confetti.gold { 
            background-color: #ffd700 !important; 
            border-radius: 50%; 
            width: 12px; 
            height: 12px; 
            box-shadow: 0 0 4px rgba(255, 215, 0, 0.8);
        }

        @keyframes explode {
            0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
            50% { opacity: 1; transform: translate(var(--x), var(--y)) rotate(var(--r)); }
            100% { opacity: 0; transform: translate(var(--x), var(--y_end)) rotate(var(--r)); } /* Fall slightly lower */
        }
        /* --- End Confetti Styles --- */

        /* --- NEW: Matching Game Styles --- */
        .game-button {
            transition: all 0.2s ease-in-out;
            border: 3px solid transparent;
            border-radius: 0.75rem; /* rounded-xl */
            cursor: pointer;
            user-select: none;
            background-color: #f3f4f6; /* bg-gray-100 */
            padding: 0.5rem; /* p-2 */
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: 100%;
        }
        .game-button:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        .game-button.selected {
            border-color: #3b82f6; /* border-blue-500 */
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); /* ring */
        }
        .game-button.matched {
            border-color: #22c55e; /* border-green-500 */
            opacity: 0.6;
            cursor: not-allowed;
            transform: scale(0.95);
            background-color: #d1fae5; /* bg-green-100 */
        }
        .game-button.mismatched {
            animation: shake 0.4s ease-in-out;
            border-color: #ef4444; /* border-red-500 */
            background-color: #fee2e2; /* bg-red-100 */
        }
        .game-button img {
            width: 100%;
            height: 5rem; /* h-20 */
            object-fit: contain; /* Use contain to see the whole image */
            border-radius: 0.5rem; /* rounded-md */
            background-color: #e5e7eb; /* bg-gray-200 */
            margin-bottom: 0.25rem; /* mb-1 */
        }
        .game-button .en-text {
            font-size: 0.875rem; /* text-sm */
            color: #4b5563; /* text-gray-600 */
            text-align: center;
        }
        .game-button .burmese-word {
            font-size: 1.125rem; /* text-lg */
            font-weight: 600; /* font-semibold */
            color: #1f2937; /* text-gray-800 */
            text-shadow: none;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
        }
        /* --- End Matching Game Styles --- */

        .title-char {
            transition: all 0.2s ease-in-out;
        }
        .title-char:hover {
            color: #3b82f6; /* blue-500 */
        }
        .title-char.highlight {
            color: #4f46e5; /* indigo-600 */
            transform: scale(1.1);
        }

        /* --- Floating Card Style (NEW) --- */
        #floating-display {
            position: fixed;
            top: 4.5rem; /* Header Height approx */
            right: 1rem;
            width: 160px; /* Default for Mobile */
            z-index: 40; /* Above regular content, below header z-50 */
            background-color: rgba(255, 255, 255, 0.92); /* Slightly transparent */
            backdrop-filter: blur(8px);
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(229, 231, 235, 0.8);
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        #floating-header {
            touch-action: none; /* Prevent scrolling when dragging on mobile */
        }

        /* Desktop Adjustments */
        @media (min-width: 768px) {
            #floating-display {
                width: 220px;
                right: 2rem;
                top: 5.5rem;
                padding: 1rem;
            }
            #display-image {
                max-height: 160px !important;
            }
        }

        /* Image sizing in floating card */
        #display-image {
            max-height: 100px;
            width: auto;
            object-fit: contain;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
        }

        /* Ensure main content doesn't get hidden behind floating card on mobile if lists are long */
        /* We'll just let it float over as per request "Always visible" */
`;

const P1A_APP_BODY_HTML = `
    <!-- Main Container -->
    <div class="min-h-screen p-4 md:p-6 flex flex-col items-center">
        <!-- Header & Controls -->
        <header class="w-full max-w-7xl flex justify-between items-center sticky top-0 z-50 bg-gray-100/95 backdrop-blur-sm py-3 px-4 rounded-xl shadow-md border-b border-gray-200">
            <h1 id="main-title" class="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight flex-grow flex flex-wrap items-center gap-x-2">
                <!-- Title will be dynamically generated here -->
            </h1>
            <div class="flex items-center space-x-3 flex-shrink-0">
                <!-- Read Aloud Button -->
                <button id="read-aloud-btn" class="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition duration-150 transform hover:scale-105" onclick="window.__mp1aApp.toggleReadAloud()">
                    <svg id="read-aloud-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5v14l11-7z"></path></svg>
                </button>
                <!-- Game/List Toggle Button -->
                <button id="toggle-view-btn" class="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition duration-150 transform hover:scale-105" onclick="window.__mp1aApp.toggleView()">
                    <svg id="view-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.152A1.5 1.5 0 0113.407 2.152l2.257 4.549 5.004.727a1.5 1.5 0 01.832 2.578l-3.62 3.53.854 4.981a1.5 1.5 0 01-2.175 1.584L12 18.067l-4.482 2.352a1.5 1.5 0 01-2.175-1.584l.854-4.981-3.62-3.53a1.5 1.5 0 01.832-2.578l5.004-.727 2.257-4.549z"></path>
                    </svg>
                </button>
            </div>
        </header>

        <!-- Chapter Selector -->
        <div id="chapter-selector-container" class="w-full max-w-7xl my-4 flex justify-start space-x-3 overflow-x-auto pb-2 px-1"></div>

        <!-- NEW FLOATING DISPLAY (Fixed Position, Draggable) -->
        <div id="floating-display">
            <!-- Drag Handle & Close Button -->
            <div id="floating-header" class="w-full flex justify-between items-center mb-2 cursor-move border-b border-gray-200 pb-1">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                <button onclick="window.__mp1aApp.closeFloatingDisplay()" class="text-gray-400 hover:text-red-500 p-1 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Image Display -->
            <img id="display-image" src="" alt="ရွေးချယ်ထားသော စကားလုံး" class="hidden shadow-sm" />
            <span id="display-placeholder" class="text-gray-400 text-xs md:text-sm py-2">စကားလုံးရွေးပါ</span>

            <!-- Burmese Word Display -->
            <div id="burmese-display-area" class="w-full text-center text-indigo-600 text-xl md:text-2xl font-bold leading-tight mt-1">
                <!-- Word will appear here -->
            </div>
            
            <!-- English Overlay -->
            <div id="english-overlay" class="w-full text-center text-gray-500 text-sm md:text-base font-medium mt-1"></div>
        </div>

        <!-- Main Content (Full Width now) -->
        <div class="w-full max-w-7xl mt-2">
             <!-- Main Content Area -->
            <div class="bg-white p-4 md:p-6 rounded-2xl shadow-xl min-h-[50vh]">
                <!-- Word List View -->
                <div id="word-list-view" class="space-y-4">
                    <div id="words-container" class="flex flex-wrap gap-3 md:gap-4 p-2"></div>
                </div>
                
                <!-- Quiz Game View -->
                <div id="quiz-game-view" class="hidden flex flex-col items-center p-2">
                    <div id="game-info" class="mb-4 text-center">
                        <p class="text-lg text-gray-600">မှန်ကန်မှု: <span id="quiz-count">၀</span> / <span id="quiz-total"></span></p>
                        <p id="game-message" class="text-green-600 font-bold text-xl h-6"></p>
                    </div>
                    
                    <div id="game-images-container" class="w-full grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-6 p-2 bg-gray-50 rounded-lg border">
                        <!-- Image buttons will be injected here -->
                    </div>
                    
                    <div id="game-words-container" class="w-full grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 p-2 bg-gray-50 rounded-lg border">
                        <!-- Word buttons will be injected here -->
                    </div>

                    <div id="confetti-container" class="absolute inset-0 pointer-events-none overflow-hidden"></div>
                </div>
            </div>
        </div>
        
        <!-- Audio Element (Hidden) -->
        <audio id="audio-player"></audio>
        <audio id="title-audio-player"></audio>

        <footer class="mt-8 text-sm text-gray-400 text-center w-full">ပညာရေးအတွက်သာ</footer>
    </div>

`;

export default function MyanmarPart1AApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, P1A_ROSTER_PATH, sanitizeP1aKey(studentName));
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
    const unsub = onSnapshot(collection(db, P1A_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Part 1A roster listen error:', e));
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

        // --- Data Definitions ---
        const chapters = {
            chapter1: { title: 'အ, အာ, အား', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter1.mp3', duration: 1.0, words: [{word:"ည",en:"Night"},{word:"လ",en:"Moon/Month"},{word:"စာ",en:"Letter/Food"},{word:"ပဝါ",en:"Scarf/Shawl"},{word:"အညာ",en:"Upper region"},{word:"ဆရာ",en:"Teacher"},{word:"ဒါ",en:"This"},{word:"အလကား",en:"Free/Worthless"},{word:"ကား",en:"Car/Vehicle"},{word:"ပါး",en:"Cheek/Thin"},{word:"အဝါ",en:"Yellow"},{word:"အခါး",en:"Bitter"},{word:"ငါ",en:"I/Me"},{word:"ဘာသာစကား",en:"Language"},{word:"ဗလာ",en:"Empty/Zero"},{word:"အနာ",en:"Wound/Sore"},{word:"နား",en:"Ear/Listen"},{word:"ဓား",en:"Knife"},{word:"ငါး",en:"Fish"},{word:"ခါး",en:"Waist/Bitter"},{word:"ဖား",en:"Frog"},{word:"ဝါး",en:"Bamboo"},{word:"ဆား",en:"Salt"},{word:"ဖဝါး",en:"Sole of foot"},{word:"နဂါး",en:"Dragon"},{word:"အသား",en:"Meat/Flesh"},{word:"ကစားစရာ",en:"Toy"},{word:"ဆရာမ",en:"Female Teacher"},{word:"ဝါသနာ",en:"Hobby/Interest"},{word:"စကားဝါ",en:"Magnolia"},{word:"လခစား",en:"Employee"},{word:"ပဝါပါး",en:"Thin Scarf"},{word:"အားကစား",en:"Sport"},{word:"ပလာတာ",en:"Parata"},{word:"အညာသား",en:"Upper region person"},{word:"အစားအစာ",en:"Food"},{word:"ကာယဗလ",en:"Bodybuilding"},{word:"စပါး",en:"Paddy/Rice grain"},{word:"စကား",en:"Word/Speech"},{word:"ဖလား",en:"Cup/Trophy"},{word:"ရထား",en:"Train"},{word:"တမာ",en:"Neem tree"},{word:"စာနာ",en:"Empathy"},{word:"သာယာ",en:"Pleasant"},{word:"လသာ",en:"Moonlight"},{word:"ဗမာ",en:"Bamar/Burmese"}] },
            chapter2: { title: 'အိ, အီ, အီး၊ ၏, ဤ၊ အည့်, အည်, အည်း', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter2.mp3', duration: 2.0, words: [{word:"အဆီ",en:"Fat/Oil"},{word:"ဇနီး",en:"Wife"},{word:"အသိ",en:"Knowledge/Awareness"},{word:"ဒီဟာ",en:"This (thing)"},{word:"ဤဟာ",en:"This (formal)"},{word:"မီးသီး",en:"Lightbulb"},{word:"မီးဝါ",en:"Yellow light"},{word:"မီးနီ",en:"Red light"},{word:"အနီ",en:"Red color"},{word:"သားသမီး",en:"Children"},{word:"အသီး",en:"Fruit"},{word:"ညီ",en:"Younger brother"},{word:"ငါးပိ (ငပိ)",en:"Fermented fish paste"},{word:"ဆီ",en:"Oil"},{word:"ထီ",en:"Lottery"},{word:"သမီး",en:"Daughter"},{word:"သားအမိ",en:"Mother and child"},{word:"သားအဖ",en:"Father and child"},{word:"ညီအမ",en:"Siblings"},{word:"သဘာပတိ",en:"Chairman/President"},{word:"ဘီး",en:"Comb/Wheel"},{word:"အနီအဝါ",en:"Red and yellow"},{word:"ထိထိမိမိ",en:"Effectively/Touchingly"},{word:"မီး",en:"Fire/Light"},{word:"ဆီးသီး",en:"Jujube fruit"},{word:"ခရီးသည်",en:"Traveler"},{word:"သာလိကာ",en:"Mynah bird"},{word:"နာရီ",en:"Clock/Hour"},{word:"ထီး",en:"Umbrella"},{word:"ဆီမီး",en:"Oil lamp"},{word:"ဖားစည်",en:"Gong"},{word:"မိဘ",en:"Parents"},{word:"ညီမ",en:"Younger sister"},{word:"သတိ",en:"Caution/Memory"},{word:"မထိရ",en:"Must not touch"},{word:"ညီညီစီ",en:"Arrange neatly"},{word:"ခရီး",en:"Trip/Journey"},{word:"သမီးသား",en:"Children/Descendants"},{word:"ဆီးသီးစား",en:"Eat jujube"},{word:"ပီပီသသ",en:"Clearly/Articulately"},{word:"သတိထားပါ",en:"Be careful"},{word:"မီးနီ မီးဝါ",en:"Red light, yellow light"},{word:"သား သမီး",en:"Son, daughter"},{word:"ညီ ညီမ",en:"Younger brother, younger sister"},{word:"သတိရ",en:"Remember/Miss"}] },
            chapter3: { title: 'အု, အူ, အူး၊ ဥ, ဦ, ဦး', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter3.mp3', duration: 2.0, words: [{word:"ဘူးသီး",en:"Bottle Gourd"},{word:"အမူအရာ",en:"Manner / Behavior"},{word:"လူထုအားကစား",en:"Public Sports"},{word:"တူမ",en:"Niece"},{word:"ဦး",en:"Head / Uncle"},{word:"လူ",en:"Person / Human"},{word:"ဆု",en:"Prize / Reward"},{word:"အထူးဆု",en:"Special Prize"},{word:"သူ",en:"He / She"},{word:"ဒူး",en:"Knee"},{word:"အရူး",en:"Mad person"},{word:"ဥပမာ",en:"Example"},{word:"ဆူး",en:"Thorn / Spike"},{word:"အခု",en:"Now / This"},{word:"လူနာ",en:"Patient"},{word:"ရာသီဥတု",en:"Weather / Climate"},{word:"ငုဝါ",en:"Golden Shower Tree"},{word:"တူ",en:"Nephew / Chopsticks"},{word:"ဗူးသီး",en:"Bottle Gourd"},{word:"အာလူး",en:"Potato"},{word:"စာဥ",en:"Lady (literary)"},{word:"မီးပူ",en:"Iron (for clothes)"},{word:"တူထု",en:"Hit with Hammer"},{word:"ဆုယူ",en:"Receive Prize"},{word:"စာကူး",en:"Copy (writing)"},{word:"အနားယူ",en:"To Rest"},{word:"အတူတူ",en:"Together"},{word:"တူရိယာ",en:"Musical Instrument"},{word:"မိသားစု",en:"Family"},{word:"အမူအယာ",en:"Manner / Behavior"},{word:"ဘုရားဖူး",en:"Pilgrim"},{word:"အကူအညီ",en:"Help / Assistance"},{word:"စုဗူး",en:"Piggy Bank"},{word:"ပထမဆု",en:"First Prize"},{word:"ဒုတိယဆု",en:"Second Prize"},{word:"တတိယဆု",en:"Third Prize"}] },
            chapter4: { title: 'အေ့, အေ, အေး၊ ဧ, ၍', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter4.mp3', duration: 2.0, words: [{word:"မေမေ ဖေဖေ",en:"Mother, Father"},{word:"မေးစေ့",en:"Chin"},{word:"ညီမလေး",en:"Younger sister (dear)"},{word:"သမီးလေး",en:"Daughter (dear)"},{word:"ရေအေး",en:"Cold water"},{word:"သားကလေး",en:"Son/Boy (dear)"},{word:"နေ",en:"Sun / Live / Stay"},{word:"ပေး",en:"Give"},{word:"ဈေးနေ့",en:"Market day"},{word:"ငေး",en:"Gaze / Stare"},{word:"ပေးဝေ",en:"Distribute / Share"},{word:"စပါးစေ့",en:"Rice grain (seed)"},{word:"လေ",en:"Air / Wind"},{word:"စာပေ",en:"Literature"},{word:"အလေးထား",en:"Value / Pay attention"},{word:"ရေ",en:"Water"},{word:"ယနေ့",en:"Today"},{word:"ရေဗူး",en:"Water bottle"},{word:"ဖေဖေ",en:"Father"},{word:"မေမေ",en:"Mother"},{word:"နေ့အခါ",en:"Daytime"},{word:"ညီလေး",en:"Younger brother (dear)"},{word:"ဈေး",en:"Market / Price"},{word:"ညနေ",en:"Evening"},{word:"လူကလေး",en:"Boy / Kid"},{word:"ခရီးဝေး",en:"Long journey"},{word:"စနေနေ့",en:"Saturday"},{word:"ဒူးလေး",en:"Crossbow"},{word:"ဆေးဆရာ",en:"Doctor / Healer"},{word:"ဧရာဝတီ",en:"Ayeyarwady (river)"},{word:"ဖားကလေး",en:"Small frog"},{word:"ဝေဝေဆာဆာ",en:"Abundantly / Lushly"},{word:"အေးအေးဆေးဆေး",en:"Leisurely / Calmly"},{word:"စေတနာ",en:"Goodwill / Generosity"},{word:"ဝေဒနာ",en:"Suffering / Pain"},{word:"တခါတလေ",en:"Sometimes"},{word:"ဝါစေ့",en:"Cotton seed"},{word:"ဆီးစေ့",en:"Jujube seed / Urinary stone"},{word:"စာပေးစာယူ",en:"Correspondence"}] },
            chapter5: { title: 'အဲ့, အယ်, အဲ၊ အည်, အည်း', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter5.mp3', duration: 2.0, words: [{word:"ပုလဲ",en:"Pearl"},{word:"နီနီရဲရဲ",en:"Bright red/Blazing"},{word:"သဲသဲမဲမဲ",en:"Intensely/Fiercely"},{word:"ငါးဖယ်",en:"Featherback fish"},{word:"အမဲသားငါး",en:"Meat and fish"},{word:"မဲနယ်",en:"Indigo"},{word:"စပါးသယ်",en:"Rice carrier"},{word:"ထားဝယ်",en:"Dawei/Tavoy"},{word:"ဝါးခယ်မ",en:"Bamboo mat/Structure"},{word:"စကားဝဲ",en:"To stammer/Have an accent"},{word:"နုနယ်",en:"Tender/Young"},{word:"နယ်ပယ်",en:"Field/Sphere"},{word:"ငါးဆားနယ်",en:"Salted fish"},{word:"ရဲသား",en:"Policeman/Soldier"},{word:"သူငယ်မ",en:"Girl/Young woman"},{word:"လယ်တဲ",en:"Field hut"},{word:"ကလေးငယ်",en:"Young child/Baby"},{word:"ကဲလား",en:"Really?/Is it?"},{word:"ကယ်ဆယ်",en:"Rescue/Save"},{word:"နယ်",en:"Region/Countryside"},{word:"လယ်",en:"Paddy field"},{word:"တဲ",en:"Hut/Shack"},{word:"ဘဲ",en:"Duck"},{word:"ခယ်မ",en:"Sister-in-law (younger brother's wife)"},{word:"နေ့လယ်",en:"Noon/Afternoon"},{word:"နေ့လယ်စာ",en:"Lunch"},{word:"ဘဲသား",en:"Duck meat"},{word:"အမဲသား",en:"Beef/Dark meat"},{word:"အဲဒါ",en:"That/That thing"},{word:"ဆယ့်ငါး",en:"Fifteen"},{word:"သရဲ",en:"Ghost/Spirit"},{word:"ငရဲ",en:"Hell"},{word:"ပဲ",en:"Bean/Pea"},{word:"ပဲဆီ",en:"Peanut oil/Bean oil"},{word:"ရဲ",en:"Brave/Police"},{word:"ရဲမေ",en:"Policewoman/Female soldier"},{word:"ဈေးဝယ်သူ",en:"Shopper/Customer"},{word:"ဖရဲသီး",en:"Watermelon"},{word:"လယ်သမား",en:"Farmer"},{word:"ရဲသား ရဲမေ",en:"Policemen and policewomen"},{word:"ဈေးသည်",en:"Vendor/Seller"},{word:"လေသူရဲ",en:"Pilot/Airman"},{word:"ဘဲဥ",en:"Duck egg"},{word:"ကုလားပဲ",en:"Chickpea/Gram"},{word:"ငါးဖယ် ငါးခူ",en:"Featherback and catfish"},{word:"ခဝဲသီး",en:"Loofah gourd"},{word:"ဘဲကလေး",en:"Duckling/Small duck"},{word:"ဒရယ်",en:"Deer"},{word:"ပုလဲပုတီး",en:"Pearl necklace/rosary"},{word:"ရေခဲ",en:"Ice"},{word:"လူငယ်",en:"Youth/Young person"}] },
            chapter6: { title: 'အော့, အော်, အော၊ ဩ, ဪ', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter6.mp3', duration: 2.0, words: [{word:"ကော်မတီ",en:"Committee"},{word:"ရယ်ရယ်မောမော",en:"Cheerfully/Laughingly"},{word:"ကနဖော့",en:"Cork/Float"},{word:"ပေါ့ပေါ့ပါးပါး",en:"Lightly/Carefree"},{word:"လူသူတော်",en:"Good/Pious person"},{word:"ပူဇော်",en:"Worship/Offer"},{word:"တရားဟော",en:"Preach/Give sermon"},{word:"ဆီမီး ပူဇော်၏",en:"Offers oil lamp"},{word:"ဥသြ",en:"Cuckoo bird"},{word:"ဇာနည်ရဲဘော်",en:"Brave soldier/Hero"},{word:"ဆော်သြသူ",en:"Preacher/Crier"},{word:"လူတော်လူမော်",en:"Clever person"},{word:"လောဘ",en:"Greed"},{word:"သဘောထား",en:"Attitude/Opinion"},{word:"ပူဇော်ပသ",en:"Worship/Make offerings"},{word:"မောဟ",en:"Delusion/Ignorance"},{word:"ဇော်က ကသူ",en:"Zar, the dancer"},{word:"ယောထမီ",en:"Yaw longyi/dress"},{word:"သြဇာသီး",en:"Soursop/Custard apple"},{word:"ကောဇော",en:"Carpet/Rug"},{word:"ကော်",en:"Glue/Paste"},{word:"ဇော",en:"Concentration/Focus"},{word:"တော",en:"Forest/Jungle"},{word:"ကော်လာ",en:"Collar"},{word:"အခေါ်အဝေါ်",en:"Terminology/Naming"},{word:"ဒေါ်",en:"Aunt/Ms."},{word:"အနေတော်",en:"Just right/Moderate"},{word:"လောက",en:"World/Existence"},{word:"သဘော",en:"Nature/Idea"},{word:"ကော်ဖီ",en:"Coffee"},{word:"အပေါစား",en:"Cheap/Low quality"},{word:"ဒေါ်လာ",en:"Dollar"},{word:"ဘော်လီဘော",en:"Volleyball"},{word:"အပေါ်",en:"Above/Top"},{word:"ကောလဟာလ",en:"Rumor/Hearsay"},{word:"ရောဂါ",en:"Disease/Illness"},{word:"ဒေါသ",en:"Anger/Rage"},{word:"အဒေါ်",en:"Aunt"},{word:"အဖော်",en:"Companion/Friend"},{word:"မော်တော်ကား",en:"Motor car/Automobile"},{word:"ရဲဘော်",en:"Comrade/Soldier"},{word:"ဩဇာသီး",en:"Soursop/Custard apple"},{word:"ကော်ဇော",en:"Carpet/Rug"},{word:"သော့",en:"Key/Lock"},{word:"စောစောစီးစီး",en:"Early/Prematurely"},{word:"တယော",en:"Violin"},{word:"စားတော်ပဲ",en:"Mung bean"},{word:"ဥဩ",en:"Cuckoo bird"},{word:"ဆော့ကစား",en:"Play/Amuse oneself"},{word:"ဦးတော်",en:"Head/Top"},{word:"ဆရာတော်",en:"Reverend/Monk"},{word:"ယာတော",en:"Cultivated field area"},{word:"လယ်တော",en:"Paddy field area"},{word:"မော့ထား",en:"Look up/Lift up"}] },
            chapter7: { title: 'အံ့, အံ၊ အန့်, အန်, အန်း၊ အမ့်, အမ်, အမ်း', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter7.mp3', duration: 2.0, words: [{word:"အခမ်းအနား",en:"Ceremony/Event"},{word:"နားပန်းဆံ",en:"Eardrop/Ear ornament"},{word:"ဆူဆူညံညံ",en:"Noisy/Loudly"},{word:"စာအံသံ",en:"Sound of reciting"},{word:"တောလမ်းခရီး",en:"Jungle road trip"},{word:"ရေနံဆီ",en:"Kerosene/Oil"},{word:"သံပရာသီး",en:"Lime/Lemon"},{word:"တောလမ်း",en:"Jungle road"},{word:"အလံတော်",en:"National flag"},{word:"မောပန်း",en:"Tired/Exhausted"},{word:"တေးသံသာ",en:"Sweet song"},{word:"တေးသံ",en:"Singing voice/Tune"},{word:"စီတန်း",en:"Line up/Arrange"},{word:"ဒဏ်ရာ",en:"Wound/Injury"},{word:"အသိဉာဏ်",en:"Knowledge/Wisdom"},{word:"သဝဏ်လွှာ",en:"Message/Communication"},{word:"အသံ",en:"Sound/Voice"},{word:"ဂါဝန်",en:"Gown/Dress"},{word:"ပန်းသီး",en:"Apple"},{word:"နည်းလမ်း",en:"Method/Way"},{word:"စည်းကမ်း",en:"Rule/Discipline"},{word:"အတန်း",en:"Class/Row"},{word:"ဆေးခန်း",en:"Clinic/Dispensary"},{word:"ဆရာဝန်",en:"Doctor"},{word:"အနံ့",en:"Smell/Scent"},{word:"ကဏန်း",en:"Crab"},{word:"သူငယ်တန်း",en:"Kindergarten"},{word:"ပန်း",en:"Flower/To finish"},{word:"ပထမတန်း",en:"First class/Primary"},{word:"ပန်ကာ",en:"Fan"},{word:"ဆူညံသံ",en:"Loud noise"},{word:"ဂဏန်း",en:"Number/Digit"},{word:"အခန်း",en:"Room/Chapter"},{word:"ခန်းမ",en:"Hall/Auditorium"},{word:"ဆန်",en:"Rice (uncooked)"},{word:"ရေကန်",en:"Pond/Tank"},{word:"ခဲတံ",en:"Pencil"},{word:"အလံ",en:"Flag"},{word:"ကံ့ကော်ပန်း",en:"Mesua ferrea flower"},{word:"လမ်း",en:"Road/Way"},{word:"တူသံ",en:"Hammering sound"},{word:"ဆူညံ",en:"Noisy"},{word:"ပန်းကန်",en:"Plate/Dish"},{word:"ဝါးထရံ",en:"Bamboo mat/Wall"},{word:"ရေနံ",en:"Petroleum/Oil"},{word:"ဆေးတံ",en:"Pipe (for smoking)"},{word:"ထန်းသီး",en:"Palm fruit"},{word:"ခရမ်းသီး",en:"Eggplant/Brinjal"},{word:"သန်သန်မာမာ",en:"Healthy/Vigorous"},{word:"အံ့သြ",en:"Surprised/Astonished"},{word:"သံပုရာသီး",en:"Lemon"},{word:"သံသရာ",en:"Cycle of existence / Samsara"},{word:"မရမ်းသီး",en:"Marian plum"},{word:"ဆန်စပါး",en:"Paddy and rice"},{word:"စခန်းသာ",en:"Resort/Pleasant camp"},{word:"ငါးကန်",en:"Fish pond"},{word:"ရေကူးကန်",en:"Swimming pool"},{word:"တောတန်း",en:"Forest range"},{word:"တန်းစီ၍ လာပါ",en:"Please come in line"},{word:"ခမ်းခမ်းနားနား",en:"Grandly/Luxuriously"},{word:"လမ်းစည်းကမ်း",en:"Traffic rules"}] },
            chapter8: { title: 'အို့, အို, အိုး၊ ကိုယ့်, ကိုယ်', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter8.mp3', duration: 2.0, words: [{word:"ဖရိုဖရဲ",en:"Disorganized/Messy"},{word:"ဝိုးတိုးဝါးတား",en:"Vague/Dim"},{word:"အားကိုးအားထား",en:"Reliance/Dependence"},{word:"ဓားမတို",en:"Short knife/Cleaver"},{word:"မစို့မပို့",en:"Insufficient/Scarcely"},{word:"လိုရမယ်ရ",en:"As a precaution/Just in case"},{word:"တေးဆို",en:"Singing"},{word:"သူငယ်တော်",en:"Royal page/Child attendant"},{word:"ပိုပိုမိုမို",en:"More and more"},{word:"ပဲနို့",en:"Soy milk"},{word:"မိုး",en:"Rain/Sky"},{word:"အဘိုး",en:"Grandfather/Old man"},{word:"အမယ်အို",en:"Old woman"},{word:"အကို",en:"Older brother"},{word:"သတို့သား",en:"Bridegroom"},{word:"သတို့သမီး",en:"Bride"},{word:"အရိုး",en:"Bone/Simple"},{word:"နို့",en:"Milk/Breast"},{word:"နို့ဘူး",en:"Milk bottle"},{word:"မိုးရာသီ",en:"Rainy season"},{word:"အမိုး",en:"Roof/Cover"},{word:"အညို",en:"Brown color"},{word:"အဆိုတော်",en:"Singer"},{word:"လူဆိုး",en:"Bad person/Criminal"},{word:"လူရိုး",en:"Simple/Honest person"},{word:"အပို",en:"Extra/Additional"},{word:"အိုးစည်",en:"Ozi drum"},{word:"အဘိုးအို",en:"Old grandfather"},{word:"စာပို့သမား",en:"Postman"},{word:"သိုးကလေး",en:"Lamb/Small sheep"},{word:"မိုးခို",en:"Take shelter from rain"},{word:"ပုဆိုး",en:"Sarong/Men's lower garment"},{word:"အားကိုး",en:"To rely/Depend"},{word:"မီးဖို",en:"Stove/Fireplace"},{word:"ရိုသေ",en:"Respect/Reverence"},{word:"မိုးရေ",en:"Rainwater"},{word:"ဆီးယို",en:"Jujube jam/Sweet preserve"},{word:"ရိုးသား",en:"Honest/Sincere"},{word:"နို့ဆီဗူး",en:"Can of condensed milk"},{word:"ကိုယ်ကာယ",en:"Body/Physique"},{word:"ထမနဲထိုး",en:"Making Htamanè (sticky rice snack)"},{word:"နို့စို့ကလေး",en:"Infant/Suckling baby"},{word:"ငါးပိ",en:"Fermented fish paste"},{word:"တို့စရာ",en:"Dipping sauce/Something to dip"},{word:"ရိုသေလေးစား",en:"To respect and revere"},{word:"အစိုးရ",en:"Government"},{word:"အားကိုးစရာ",en:"Something to rely on"},{word:"ခိုကိုးစရာ",en:"Something to take refuge in"},{word:"ရိုးရိုးသားသား",en:"Honestly/Simply"},{word:"စကားဆိုသည်",en:"To speak/Say something"},{word:"ရေစိုစို",en:"Wet/Soaked"},{word:"နေညိုညို",en:"Dusk/Evening"},{word:"ကိုး နာရီထိုး",en:"9 o'clock strikes"}] },
            chapter9: { title: 'ကျ,ကြ,ချ,ခြ,ဂျ,ဂြ,ငြ,ပျ,ပြ,ဖျ,ဖြ,ဗျ, မျ,မြ, လျ', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter9.mp3', duration: 2.0, words: [{word:"လူကြီး",en:"Elder/Adult"},{word:"အမျိုးသမီး",en:"Woman/Female"},{word:"အမျိုးသား",en:"Man/Male"},{word:"မြန်မာ",en:"Myanmar/Burmese"},{word:"ပျား",en:"Bee"},{word:"ဖျော်ရည်",en:"Juice/Beverage"},{word:"အဖျား",en:"Fever/Tip"},{word:"မြို့",en:"City/Town"},{word:"မြို့ထဲ",en:"Downtown"},{word:"မြို့နယ်",en:"Township"},{word:"မြေကြီး",en:"Earth/Soil"},{word:"ခြေရာ",en:"Footprint"},{word:"ပန်းခြံ",en:"Garden/Park"},{word:"ကြာဖူး",en:"Lotus bud"},{word:"မြေပဲ",en:"Peanut/Groundnut"},{word:"ကြိုးကြာ",en:"Crane (bird)"},{word:"ချော်လဲ",en:"To slip and fall"},{word:"ပျံသန်း",en:"To fly"},{word:"များပြား",en:"Numerous/Abundant"},{word:"ပြီးစီး",en:"To complete/Finish"},{word:"ဖြေကြား",en:"To answer/Reply"},{word:"မြို့တော်",en:"Capital city"},{word:"ကြိုးစား",en:"To try hard/Strive"},{word:"ခြေကျိုး",en:"Broken leg/Lame"},{word:"သူနာပြု ဆရာမ",en:"Nurse (female)"},{word:"ဖြူနီ ညိုပြာ",en:"White, red, brown, blue (colors)"},{word:"မိုးဦးကျ",en:"Beginning of the rainy season"},{word:"ကျား",en:"Tiger/Male"},{word:"မြေဖြူ",en:"Chalk"},{word:"ကြော်ငြာ",en:"Advertisement"},{word:"ပျားရည်",en:"Honey"},{word:"ဖျာ",en:"Mat (woven)"},{word:"ကြာညို",en:"Purple lotus"},{word:"မြူးတူး",en:"To frolic/Be merry"},{word:"ချူချာ",en:"Frail/In poor health"},{word:"ကြယ်",en:"Star"},{word:"ကြာဖြူ",en:"White lotus"},{word:"ပျော်ပါး",en:"To enjoy/Have fun"},{word:"တိုးချဲ့",en:"To expand/Extend"},{word:"ကျယ်",en:"Wide/Loud"},{word:"ကျူဖျာ",en:"Reed mat"},{word:"အကျိုး",en:"Benefit/Result"},{word:"ရေချိုး",en:"To take a bath/shower"},{word:"ကြာ",en:"Long time/Lotus"},{word:"ဝါးဖျာ",en:"Bamboo mat"},{word:"ချေပ",en:"To refute/Argue against"},{word:"ခြပိုး",en:"Woodworm/Termite"},{word:"ကျေးဇူး",en:"Gratitude/Favor"},{word:"ချီးကျူး",en:"To praise/Compliment"},{word:"ကြံစည်",en:"To plan/Scheme"},{word:"စပါးကျီ",en:"Granary/Rice store"},{word:"မြူးတူးပျော်ပါး",en:"To frolic and enjoy"},{word:"အပျိုချော",en:"Beautiful maiden"},{word:"ဖြူနီညိုပြာ",en:"White, red, brown, blue"},{word:"သူနာပြု",en:"Nurse"},{word:"အကျိုးကျေးဇူး",en:"Benefit/Advantage"},{word:"မြေးအဘိုး",en:"Grandchild and grandfather"},{word:"မာရေကြောရေ",en:"Roughly/Harshly"},{word:"ပျားသကာ",en:"Honey (literary)"},{word:"အမြဲတစေ",en:"Always/Constantly"},{word:"မြေသြဇာ",en:"Fertilizer"},{word:"မေ့မေ့လျော့လျော့",en:"Carelessly/Negligently"},{word:"သပြုသီး",en:"Olive fruit"},{word:"ခရီးဦးကြို",en:"Welcome ceremony/Go to meet"},{word:"အစားကြူး",en:"Gluttonous/Eat excessively"},{word:"အစာမကြေ",en:"Indigestion"},{word:"အဖျားရောဂါ",en:"Fiver disease"}] }, // Corrected typo in 'Fever'
            chapter10: { title: 'ကွ, ခွ, စွ, ဆွ, ဇွ, တွ, ထွ, နွ, ပွ, ဖွ, ဘွ, မွ, ယွ, ရွ, လွ, သွ,', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter10.mp3', duration: 2.0, words: [{word:"နွား",en:"Cow/Ox"},{word:"ပလွေ",en:"Flute"},{word:"ပုလဲသွယ်",en:"Pearl necklace/string of pearls"},{word:"ထွေရာလေးပါး",en:"Miscellaneous/Various things"},{word:"ပွဲ",en:"Event/Festival/Bowl"},{word:"ကျေးရွာ",en:"Village"},{word:"ခွေးကလေး",en:"Puppy/Dog"},{word:"အဘိုးအဘွား",en:"Grandparents"},{word:"အပူငွေ့",en:"Vapor/Steam/Heat"},{word:"စားပွဲ",en:"Table"},{word:"သခွားသီး",en:"Cucumber/Melon"},{word:"ငွေရေးကြေးရေး",en:"Financial matters"},{word:"နွေရာသီ",en:"Summer season"},{word:"ခွဲခွာ",en:"To separate/Part ways"},{word:"စီးပွားရေး",en:"Economy/Business"},{word:"စွယ်တော်ဘုရား",en:"Tooth Relic Pagoda"},{word:"အဘွား",en:"Grandmother/Old woman"},{word:"ပလွေသံ",en:"Flute sound"},{word:"မိုးတဖွဲဖွဲ",en:"drizzling rain"},{word:"နွားထိုးကြီးမြို့",en:"Ngahtogyi (town)"},{word:"ရေနွေး",en:"Hot water/Tea"},{word:"မွေးမြူရေး",en:"Breeding/Rearing (livestock)"},{word:"သားဖွားဆရာမ",en:"Midwife/Maternity nurse"},{word:"အသွားအလာ",en:"Commuting/Traffic"},{word:"နွေဦး",en:"Spring/Early summer"},{word:"ရေနွေးအိုး",en:"Kettle/Water boiler"},{word:"ခွဲခွါ",en:"To separate/Part ways (alternate spelling)"},{word:"တဖွဲဖွဲ",en:"In drops/Drizzlingly"},{word:"ပွဲတော်",en:"Festival/Celebration"},{word:"အဘွားအို",en:"Old grandmother"},{word:"လူငယ်လူရွယ်",en:"Youth/Young people"},{word:"လွယ်လွယ်ကူကူ",en:"Easily/Simply"},{word:"မွေးဖွား",en:"To give birth"},{word:"ဖြူဖြူဖွေးဖွေး",en:"Snow-white/Pearly white"},{word:"ပူပူ နွေးနွေး",en:"Warm/Cozy (of clothes/feelings)"},{word:"ခွဲခွဲ ခြားခြား",en:"Separately/Distinctly"},{word:"ကွဲကွဲပြားပြား",en:"Clearly/Distinctly"},{word:"ဖော်ဖော်ရွေရွေ",en:"Friendly/Hospitably"},{word:"စွယ်တော် ဘုရား",en:"Tooth Relic Pagoda"},{word:"ဆွေးနွေးပွဲ",en:"Discussion/Seminar"},{word:"နေရာမရွေး",en:"Anywhere/Any place"},{word:"တလွဲတချော်",en:"Mistakenly/Erroneously"},{word:"ရွာလူကြီး",en:"Village elder/headman"},{word:"သားဖွား ဆရာမ",en:"Midwife/Maternity nurse"},{word:"စွာကျယ် စွာကျယ်",en:"Talkative/Loud-mouthed"},{word:"အကွာအဝေး",en:"Distance"},{word:"တွေးမနေရ",en:"Must not think/Worry"},{word:"အတွေးအခေါ်",en:"Ideology/Thought"},{word:"တဖွဖွ ပြော၏",en:"Speaks repeatedly/Keeps saying"},{word:"သွားကျိုး",en:"Broken tooth"},{word:"ဆွေမျိုး",en:"Relatives/Kin"},{word:"အဖွား",en:"Grandmother"},{word:"ဆွယ်တာ",en:"Sweater"},{word:"ရွာ",en:"Village"},{word:"နွေဦးရာသီ",en:"Spring/Early summer season"},{word:"နေ့စွဲ",en:"Date"},{word:"မွေးနေ့",en:"Birthday"},{word:"မီးသွေး",en:"Charcoal"},{word:"သွား",en:"Tooth/Go"},{word:"သွားကြား",en:"Gap between teeth"},{word:"တံထွေး",en:"Saliva/Spit"},{word:"ဘွဲ့",en:"Degree/Title"},{word:"ငွေ",en:"Money/Silver"},{word:"ဝံပုလွေ",en:"Wolf"},{word:"ခွေး",en:"Dog"},{word:"နွားနို့",en:"Cow's milk"},{word:"သွေး",en:"Blood"},{word:"မြေခွေး",en:"Fox"}] },
            chapter11: { title: 'ငှ, ညှ, ဏှ, နှ, မှ, ရှ, ယှ, လှ', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter11.mp3', duration: 2.0, words: [{word:"သိုမှီး",en:"To store"},{word:"နှဲ",en:"Oboe/Hne"},{word:"သားလှီးဓား",en:"Slicing knife"},{word:"နှီးထိုး",en:"To pierce/string with bamboo strip"},{word:"တစ်ရှူးထိုး",en:"Tissue/knitting"},{word:"လှေ",en:"Boat/Canoe"},{word:"လှည်း",en:"Cart/Wagon"},{word:"မှာကြား",en:"To order/Commission"},{word:"စပါးနှံ",en:"Ear of rice/paddy"},{word:"နှေးကွေး",en:"Slow"},{word:"ရောနှော",en:"To mix/Blend"},{word:"ဝေငှ",en:"To distribute/Share"},{word:"ဓားရှ",en:"Knife cut/wound"},{word:"လှေလှော်",en:"To row a boat"},{word:"အညှာ",en:"Stalk/Petiole"},{word:"လှံတံ",en:"Spear shaft"},{word:"လှလှပပ",en:"Beautifully/Gracefully"},{word:"မဲနယ်",en:"Indigo"},{word:"အကြီးအမှူး",en:"Leader/Chief"},{word:"အလှူဒါန",en:"Charity/Donation"},{word:"နှယ်နှယ်ရရ",en:"Easily/Casually"},{word:"လှည့်လည်",en:"To wander/Roam"},{word:"အမှားအမှန်",en:"Right and wrong/Errors and truths"},{word:"မှော်ဆရာ",en:"Magician/Wizard"},{word:"နှိုးဆော်",en:"To urge/Wake up"},{word:"စပါးလှေ့",en:"To thresh rice"},{word:"လှေကား",en:"Ladder/Stairs"},{word:"နှမ်း",en:"Sesame"},{word:"ရှူဆေး",en:"Inhaler/Smelling salts"},{word:"လှံ",en:"Spear"},{word:"မှဲ့",en:"Mole/Beauty spot"},{word:"အလှူ",en:"Donation/Alms-giving"},{word:"အလှူပွဲ",en:"Alms-giving ceremony"},{word:"မှန်",en:"Mirror/Correct/True"},{word:"မှန်ဘီလူး",en:"Telescope/Microscope/Magnifying glass"},{word:"ရှေ့နေ",en:"Lawyer"},{word:"အာရှ",en:"Asia"},{word:"အမှား",en:"Error/Mistake"},{word:"အမှန်",en:"Truth/Correctness"},{word:"အလှည့်",en:"Turn/Rotation"},{word:"အရှေ့",en:"East"}] },
            chapter12: { title: 'ကြွ, ကျွ, ခြွ, ချွ, မြွ', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter12.mp3', duration: 2.0, words: [{word:"ကျွဲနွား",en:"Cattle/Livestock"},{word:"ငွေအကြွေ",en:"Small change/Coins"},{word:"ကျွေးမွေး",en:"To feed/Entertain"},{word:"ပြွေ",en:"Flute/Pipa"},{word:"အကျိအချွဲ",en:"Slimy/Mucous"},{word:"ချွေးနှဲစာ",en:"Hard-earned money"},{word:"ကျွဲ",en:"Buffalo"},{word:"ကြွေအိုး",en:"Porcelain jar/pot"},{word:"မြွေ",en:"Snake"},{word:"ကျွဲကောသီး",en:"Pomelo/Grapefruit"},{word:"အကျွေးအမွေး",en:"Feasting/Entertainment"},{word:"ကြွားဝါ",en:"To boast/Show off"},{word:"ကြွယ်ဝ",en:"Wealthy/Abundant"},{word:"ကြွေးကြော်",en:"To proclaim/Shout"},{word:"ငိုကြွေး",en:"To weep/Cry"},{word:"ကြွေကရား",en:"Porcelain kettle"},{word:"ချွေးကျ",en:"To sweat"},{word:"ချွေတာရေး",en:"Economy/Thrift"},{word:"ကျွမ်းကျင်",en:"Skilled/Expert"},{word:"စပါးကြီးမြွေ",en:"Python"},{word:"မြွေပွေး",en:"Viper"},{word:"ကြွေကျ",en:"To fall off (e.g., leaves)"},{word:"ထထကြွကြွ",en:"Actively/Vigorously"},{word:"အခြွေအရံ",en:"Retinue/Attendants"},{word:"ကြွကြွရွရွ",en:"Gracefully/Briskly"},{word:"ကြွေ",en:"Porcelain/To fall (leaves)"},{word:"ကြွေပန်းကန်",en:"Porcelain plate"},{word:"ကြွေပြား",en:"Tile (porcelain/ceramic)"},{word:"အကြွေ",en:"Small pieces/Change"},{word:"အကြွေစေ့",en:"Coin/Penny"},{word:"အကြွေး",en:"Debt/Credit"},{word:"ချွေးမ",en:"Daughter-in-law"},{word:"ရေမြွေ",en:"Sea snake/Water snake"},{word:"ချွေး",en:"Sweat"},{word:"မြွေပါ",en:"Mongoose (literally 'snake-eater')"}] },
            chapter13: { title: 'မျှ, မြှ, လျှ', audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter13.mp3', duration: 2.0, words: [{word:"အမျှဝေ",en:"Share Merit"},{word:"အမြှေးပါး",en:"Membrane"},{word:"ညီညီမျှမျှ",en:"Equally/Fairly"},{word:"ချော့မြှူ",en:"Coax/Soothe"},{word:"မျှမျှတတ",en:"Fairly/Justly"},{word:"ရှုမျှော်",en:"View/Lookout"},{word:"လျှော်ကြိုး",en:"Washing Line"},{word:"ဗျော",en:"A type of drum"},{word:"လျှောစီး",en:"Slide ride"},{word:"လျှော်စည်း",en:"Laundry Pile"},{word:"ညီမျှ",en:"Equal"},{word:"ချော့မြှူ",en:"Coax/Soothe"},{word:"မျှော်မှန်း",en:"Expect/Hope"},{word:"လျှောကျ",en:"Slide Down/Slip"},{word:"ရေလျှံ",en:"Flood/Overflow"},{word:"ညီညီ မျှမျှ",en:"Equally/Fairly"},{word:"သာတူညီမျှ",en:"Equitable/Equal"},{word:"မျှမျှ တတ",en:"Fairly/Justly"},{word:"အမျှဝေပါ",en:"Please Share Merit"},{word:"လှေမျှော",en:"Drift a boat"},{word:"မျှောချသည်",en:"To flush/Drift away"},{word:"မျှော်စင်",en:"Tower/Lookout"},{word:"မျှော်ကိုး",en:"Hope/Rely on"},{word:"လျှော",en:"Slide/Slope"},{word:"ငါးမျှားတံ",en:"Fishing Rod"},{word:"လျှာ",en:"Tongue"},{word:"လျှော့ဈေး",en:"Discount/Sale"},{word:"မီးလျှံ",en:"Flame"},{word:"မျှော့",en:"Leech"}] },
            chapter14: {
                title: 'ညွှ, နွှ, မွှ, ရွှ, လွှ',
                audioUrl: 'https://raw.githubusercontent.com/nathantun93/bell/main/chapter14.mp3',
                duration: 2.0,
                words: [
                    { word: "အသီးနွှာ", en: "Peel fruit" }, { word: "လွှမ်း", en: "To cover" },
                    { word: "အစာနွှေး", en: "Reheat food" }, { word: "ပါးလွှာ", en: "Thin" },
                    { word: "မလွှဲသာလွှဲသာ", en: "Unavoidably" }, { word: "လေပွေမွှေ့", en: "Whirlwind" },
                    { word: "လွှဆွဲသမား", en: "Sawyer" }, { word: "ရွှေဖလား", en: "Golden cup" },
                    { word: "ကျော်လွှား", en: "Overcome" }, { word: "နွှဲပျော်", en: "To revel" },
                    { word: "လမ်းလွှဲ", en: "Detour" }, { word: "ပိုးမွှား", en: "Insect" },
                    { word: "မွှေးကြူ", en: "Fragrant" }, { word: "အသီးမွှာ", en: "Fruit segment" },
                    { word: "အစာနွေး", en: "Warm food" }, { word: "အသေးအမွှား", en: "Trivial" },
                    { word: "ပါးပါးလွှာလွှာ", en: "Very thin" }, { word: "ရွှေဝါ", en: "Golden yellow" },
                    { word: "လွှဆွဲ", en: "To saw" }, { word: "ပြေးလွှား", en: "To run around" },
                    { word: "ဆီရွှဲရွှဲ", en: "Oily" }, { word: "လွှဲဖယ်", en: "To evade" },
                    { word: "ရေမွှေး", en: "Perfume" }, { word: "အမြွှာပူး", en: "Twins" },
                    { word: "လွှ", en: "Saw" }, { word: "ပျံလွှား", en: "To soar" },
                    { word: "ရွှေ", en: "Gold" }, { word: "ရွှေငါး", en: "Goldfish" },
                    { word: "ရွှေဆွဲကြိုး", en: "Gold necklace" }, { word: "ရွှေဖြူ", en: "Platinum" },
                    { word: "ရွှေရတု", en: "Golden jubilee" }
                ]
            }
        };

        const pronunciationData={'၏':{start:0},'က':{start:2},'ကျ':{start:4},'ကျွ':{start:6},'ကြ':{start:8},'ကြွ':{start:10},'ကွ':{start:12},'က်':{start:14},'ခ':{start:16},'ချ':{start:18},'ချွ':{start:20},'ခြ':{start:22},'ခွ':{start:24},'ဂ':{start:26},'ဂျ':{start:28},'ဂျွ':{start:30},'ဂြ':{start:32},'ဂွ':{start:34},'ဃ':{start:36},'င':{start:38},'ငြ':{start:40},'ငွ':{start:42},'ငှ':{start:44},'င်':{start:46},'စ':{start:48},'စွ':{start:50},'စ်':{start:52},'ဆ':{start:54},'ဆွ':{start:56},'ဇ':{start:58},'ဇွ':{start:60},'ဈ':{start:62},'ဉ':{start:64},'ဉ်':{start:66},'ည':{start:68},'ညွှ':{start:70},'ညှ':{start:72},'ည်':{start:74},'ဋ':{start:76},'ဌ':{start:78},'ဍ':{start:80},'ဎ':{start:82},'ဏ':{start:84},'တ':{start:86},'တြ':{start:88},'တွ':{start:90},'တ်':{start:92},'ထ':{start:94},'ထွ':{start:96},'ဒ':{start:98},'ဒြ':{start:100},'ဒွ':{start:102},'ဓ':{start:104},'ဓွ':{start:106},'န':{start:108},'နွ':{start:110},'နွှ':{start:112},'နှ':{start:114},'န်':{start:116},'ပ':{start:118},'ပျ':{start:120},'ပျွ':{start:122},'ပြ':{start:124},'ပြွ':{start:126},'ပွ':{start:128},'ပ်':{start:130},'ဖ':{start:132},'ဖျ':{start:134},'ဖြ':{start:136},'ဖွ':{start:138},'ဗ':{start:140},'ဗျ':{start:142},'ဗွ':{start:144},'ဘ':{start:146},'ဘွ':{start:148},'မ':{start:150},'မျ':{start:152},'မျှ':{start:154},'မြ':{start:156},'မြွ':{start:158},'မြှ':{start:160},'မွ':{start:162},'မွှ':{start:164},'မှ':{start:166},'မ်':{start:168},'ယ':{start:170},'ယျ':{start:172},'ယွ':{start:174},'ယှ':{start:176},'ယ်':{start:178},'ရ':{start:180},'ရွ':{start:182},'ရွှ':{start:184},'ရှ':{start:186},'လ':{start:188},'လျ':{start:190},'လျှ':{start:192},'လွ':{start:194},'လွှ':{start:196},'လှ':{start:198},'ဝ':{start:200},'ဝှ':{start:202},'သ':{start:204},'ဿ':{start:206},'သျ':{start:208},'သွ':{start:210},'ဟ':{start:212},'ဟွ':{start:214},'ဠ':{start:216},'အ':{start:218},'အံ':{start:220},'အံ့':{start:222},'အက်':{start:224},'အင့်':{start:226},'အင်':{start:228},'အင်း':{start:230},'အစ်':{start:232},'အည့်':{start:234},'အည်':{start:236},'အည်း':{start:238},'အတတ်':{start:240},'အတ်':{start:240},'အန့်':{start:242},'အန်':{start:244},'အန်း':{start:246},'အပ်':{start:248},'အမ့်':{start:250},'အမ်':{start:252},'အမ်း':{start:254},'အယ့်':{start:256},'အယ်':{start:258},'အွတ်':{start:260},'အွန့်':{start:262},'အွန်':{start:264},'အွန်း':{start:266},'အွပ်':{start:268},'အွမ့်':{start:270},'အွမ်':{start:272},'အွမ်း':{start:274},'အာ':{start:276},'အား':{start:278},'အိ':{start:280},'အိတ်':{start:282},'အိန့်':{start:284},'အိန်':{start:286},'အိန်း':{start:288},'အိပ်':{start:290},'အို':{start:292},'အို့':{start:294},'အိုး':{start:296},'အိုက်':{start:298},'အိုင့်':{start:300},'အိုင်':{start:302},'အိုင်း':{start:304},'အီ':{start:306},'အီး':{start:308},'အု':{start:310},'အုံ':{start:312},'အုံ့':{start:314},'အုံး':{start:316},'အုတ်':{start:318},'အုန့်':{start:320},'အုန်':{start:322},'အုန်း':{start:324},'အုပ်':{start:326},'အုမ့်':{start:328},'အုမ်':{start:330},'အုမ်း':{start:332},'အူ':{start:334},'အူး':{start:336},'အေ':{start:338},'အေ့':{start:340},'အေး':{start:342},'အော':{start:344},'အော့':{start:346},'အောက်':{start:348},'အောင့်':{start:350},'အောင်':{start:352},'အောင်း':{start:354},'အော်':{start:356},'အဲ':{start:358},'အဲ့':{start:360},'ဣ':{start:362},'ဤ':{start:364},'ဥ':{start:366},'ဦ':{start:368},'ဦး':{start:370},'ဧ':{start:372},'ဧည့်':{start:374},'ဩ':{start:376},'ဪ':{start:378}};
        const pronunciationAudioUrl = 'https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းသရအသတ်_2s.mp3';

        // --- Global State & Element References ---
        let currentChapterId = 'chapter1'; // Start at chapter 14 as requested by filename
        let isFirstLoad = true; // Flag to prevent autoplay on initial load
        let audioPlayer, titleAudioPlayer, wordsContainer, wordListView, quizGameView, toggleViewBtn, 
            gameMessage, quizCountDisplay, quizTotalDisplay, 
            confettiContainer, mainTitle, readAloudBtn;
        
        // --- NEW: Element References ---
        let displayImageContainer, displayImageElement, displayPlaceholder, englishOverlay,
            gameImagesContainer, gameWordsContainer, burmeseDisplayArea, floatingDisplay; // Changed sidebarDisplay to floatingDisplay

        const colorMap = { 'bg-red-400':'#f87171','bg-pink-400':'#f472b6','bg-purple-400':'#c084fc','bg-indigo-400':'#818cf8','bg-blue-400':'#60a5fa','bg-green-400':'#4ade80','bg-yellow-400':'#facc15','bg-orange-400':'#fb923c','bg-teal-400':'#2dd4bf','bg-cyan-400':'#22d3ee' };
        const colors = Object.keys(colorMap);

        // --- NEW: Image URL Bases ---
        const baseImageUrls = [
            'https://raw.githubusercontent.com/nathantun93/pict/main/', 
            'https://raw.githubusercontent.com/nathantun93/Pic/main/'
        ];

        let isQuizView = false;
        
        // --- NEW: Matching Game State ---
        let currentQuizPage = 0;
        let quizWordsOrder = []; // This will hold the shuffled list of all words in the chapter
        let selectedImage = { word: null, element: null };
        let selectedWord = { word: null, element: null };
        let matchesOnPage = 0;
        let totalMatches = 0;
        
        // Confetti effect state
        let confettiTypeIndex = 0;
        // Defined 5 types of celebration effects
        const confettiTypes = ['default', 'star', 'emoji', 'gold', 'heart'];

        // --- Read Aloud State ---
        let isReadingAloud = false;
        let readAloudCurrentIndex = 0;
        let titleReadAloudTimeout; // For title sequence
        let currentTitleComponentIndex = 0;

        // --- Removed Three.js State ---

        const getCurrentChapter = () => chapters[currentChapterId];
        const getCurrentWords = () => getCurrentChapter().words;
        const getAllChapterNumbers = () => Object.keys(chapters).map(id => parseInt(id.replace('chapter', ''))).sort((a, b) => a - b);

        // --- Utility ---
        function shuffle(array) {
            let newArray = [...array]; // Create a copy to avoid mutating the original
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

        function applyGlowEffect(button) {
            if (!button) return;
            button.classList.add('glow-active');
            setTimeout(() => button.classList.remove('glow-active'), 300);
        }
        
        // --- Chapter Selector (Modified for full scrollable list) ---
        function renderChapterSelector() {
            const chapterSelector = byId('chapter-selector-container');
            if (!chapterSelector) return;
            chapterSelector.innerHTML = '';
            const chapterNumbers = getAllChapterNumbers();
            
            chapterNumbers.forEach(num => {
                const id = `chapter${num}`;
                const button = document.createElement('button');
                let buttonClass = 'py-2 px-6 rounded-lg font-semibold shadow-md transition duration-150 flex-shrink-0';
                buttonClass += (id === currentChapterId) ? ' bg-blue-500 text-white transform scale-105' : ' bg-gray-200 text-gray-800 hover:bg-gray-300';
                button.className = buttonClass;
                button.textContent = `အခန်း ${num}`;
                button.onclick = () => switchChapter(id);
                chapterSelector.appendChild(button);
            });

            // Auto-scroll to active chapter
            setTimeout(() => {
                const activeBtn = chapterSelector.querySelector('.bg-blue-500');
                if (activeBtn) {
                    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 100);
        }

        // --- Chapter Switching (Modified) ---
        function switchChapter(chapterId) {
            if (currentChapterId === chapterId && byId('chapter-selector-container').children.length > 0) return;
            stopReadAloud();
            stopTitleReadAloud();
            currentChapterId = chapterId;
            const chapter = getCurrentChapter();
            if (audioPlayer) { audioPlayer.src = chapter.audioUrl; audioPlayer.load(); }
            const { components, spans } = renderInteractiveTitle(chapter.title);
            
            if (!isFirstLoad) {
                startTitleReadAloud(components, spans);
            }

            if (quizTotalDisplay) { quizTotalDisplay.textContent = chapter.words.length; }
            renderChapterSelector();
            if (isQuizView) { initMatchingGame(); } // Changed
            else { renderWordList(); }

            isFirstLoad = false;
        }

        // --- Audio Playback (Unchanged) ---
        function playWordAudio(index, onEndedCallback) {
            stopTitleReadAloud(); 
            if (!audioPlayer) return;
            const chapter = getCurrentChapter();
            const duration = chapter.duration;
            const startTime = index * duration;
            if (isNaN(startTime) || !isFinite(startTime)) return;

            if (audioPlayer._stopTimer) {
                clearTimeout(audioPlayer._stopTimer);
            }

            if (audioPlayer.readyState < 2) {
                audioPlayer.addEventListener('canplaythrough', () => playWordAudio(index, onEndedCallback), { once: true });
                return;
            }
            
            audioPlayer.pause(); 
            audioPlayer.currentTime = startTime;
            const playPromise = audioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => { 
                    if (error.name !== "AbortError") console.error("Audio playback failed:", error);
                    if(audioPlayer._stopTimer) clearTimeout(audioPlayer._stopTimer);
                    if (onEndedCallback) onEndedCallback();
                });
            }

            const durationMs = (duration - 0.05) * 1000;
            audioPlayer._stopTimer = setTimeout(() => {
                if (!audioPlayer.paused) { 
                   audioPlayer.pause();
                }
                if (onEndedCallback) {
                    onEndedCallback();
                }
            }, durationMs);
        }

        // --- Title Audio Playback (Unchanged) ---
        function playComponentAudio(component, onEndedCallback) {
            stopTitleReadAloud(); 
            const data = pronunciationData[component];
            if (!data || !titleAudioPlayer) {
                if(onEndedCallback) onEndedCallback();
                return;
            }
            const duration = 2.0;
            const startTime = data.start;
             if (isNaN(startTime) || !isFinite(startTime)) {
                if(onEndedCallback) onEndedCallback();
                return;
            }
            if (titleAudioPlayer._stopTimer) clearTimeout(titleAudioPlayer._stopTimer);
            if (titleAudioPlayer.readyState < 2) {
                titleAudioPlayer.addEventListener('canplaythrough', () => playComponentAudio(component, onEndedCallback), { once: true });
                return;
            }
            titleAudioPlayer.pause();
            titleAudioPlayer.currentTime = startTime;
            const playPromise = titleAudioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => { 
                    if (error.name !== "AbortError") console.error("Title audio playback failed:", error);
                    if(onEndedCallback) onEndedCallback();
                });
            }
            titleAudioPlayer._stopTimer = setTimeout(() => {
                if (!titleAudioPlayer.paused) titleAudioPlayer.pause();
                if(onEndedCallback) onEndedCallback();
            }, (duration - 0.05) * 1000);
        }
        
        // --- Title Rendering and Autoplay (Unchanged) ---
        function renderInteractiveTitle(titleString) {
            if (!mainTitle) return { components: [], spans: [] };
            mainTitle.innerHTML = '';
            const components = titleString.split(/[,၊]/).map(s => s.trim());
            const spans = [];
            components.forEach((comp, index) => {
                if (pronunciationData[comp]) {
                    const clickableSpan = document.createElement('span');
                    clickableSpan.textContent = comp;
                    clickableSpan.className = 'title-char cursor-pointer';
                    clickableSpan.onclick = () => playComponentAudio(comp);
                    mainTitle.appendChild(clickableSpan);
                    spans.push(clickableSpan);
                } else {
                    const nonClickableSpan = document.createElement('span');
                    nonClickableSpan.textContent = comp;
                    mainTitle.appendChild(nonClickableSpan);
                    spans.push(nonClickableSpan); 
                }
                if (index < components.length - 1) {
                    const separator = document.createElement('span');
                    separator.textContent = ',';
                    mainTitle.appendChild(separator);
                }
            });
            return { components, spans };
        }
        function startTitleReadAloud(components, spans) {
            currentTitleComponentIndex = 0;
            playNextTitleComponent(components, spans);
        }
        function stopTitleReadAloud() {
            clearTimeout(titleReadAloudTimeout);
            if (titleAudioPlayer && !titleAudioPlayer.paused) {
                titleAudioPlayer.pause();
                 if (titleAudioPlayer._stopTimer) {
                    clearTimeout(titleAudioPlayer._stopTimer);
                    titleAudioPlayer._stopTimer = null;
                }
            }
            const highlighted = mainTitle.querySelector('.highlight');
            if (highlighted) highlighted.classList.remove('highlight');
        }
        function playNextTitleComponent(components, spans) {
            if (currentTitleComponentIndex > 0) {
                const prevSpan = spans[currentTitleComponentIndex - 1];
                if (prevSpan) prevSpan.classList.remove('highlight');
            }
            if (currentTitleComponentIndex >= components.length) {
                return; 
            }
            const currentComp = components[currentTitleComponentIndex];
            const currentSpan = spans[currentTitleComponentIndex];
            if (currentSpan) currentSpan.classList.add('highlight');
            playComponentAudioForSequence(currentComp, () => {
                titleReadAloudTimeout = setTimeout(() => {
                    currentTitleComponentIndex++;
                    playNextTitleComponent(components, spans);
                }, 200);
            });
        }
        function playComponentAudioForSequence(component, onEndedCallback) {
            const data = pronunciationData[component];
            if (!data || !titleAudioPlayer) {
                if (onEndedCallback) onEndedCallback();
                return;
            }
            const duration = 2.0;
            const startTime = data.start;
            if (isNaN(startTime) || !isFinite(startTime)) {
                if (onEndedCallback) onEndedCallback();
                return;
            }
            if (titleAudioPlayer._stopTimer) clearTimeout(titleAudioPlayer._stopTimer);
            if (titleAudioPlayer.readyState < 2) {
                titleAudioPlayer.addEventListener('canplaythrough', () => playComponentAudioForSequence(component, onEndedCallback), { once: true });
                return;
            }
            titleAudioPlayer.pause();
            titleAudioPlayer.currentTime = startTime;
            const playPromise = titleAudioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== "AbortError") console.error("Title audio playback failed:", error);
                    if (onEndedCallback) onEndedCallback();
                });
            }
            titleAudioPlayer._stopTimer = setTimeout(() => {
                if (!titleAudioPlayer.paused) titleAudioPlayer.pause();
                if (onEndedCallback) onEndedCallback();
            }, (duration - 0.05) * 1000);
        }

        // --- NEW: Image Handling Functions ---
        function cleanWordForImage(word) {
            // "ငါးပိ (ငပိ)" -> "ငါးပိ"
            return word.split('(')[0].trim(); 
        }

        function setImageWithFallback(imgElement, word) {
            const cleanedWord = cleanWordForImage(word);
            // Use encodeURIComponent to handle spaces or special characters in filenames
            const encodedWord = encodeURIComponent(cleanedWord);
            
            const urls = [
                `${baseImageUrls[0]}${encodedWord}.png`,
                `${baseImageUrls[1]}${encodedWord}.png`,
                `${baseImageUrls[0]}${encodedWord}.jpg`,
                `${baseImageUrls[1]}${encodedWord}.jpg`
            ];
            
            let currentUrlIndex = 0;
            
            function tryNextUrl() {
                currentUrlIndex++;
                if (currentUrlIndex < urls.length) {
                    imgElement.src = urls[currentUrlIndex];
                } else {
                    // All failed, show a placeholder
                    imgElement.src = `https://placehold.co/100x100/eee/ccc?text=${encodedWord}`;
                    imgElement.onerror = null; // Stop fallback loop
                }
            }
            
            imgElement.onerror = tryNextUrl;
            imgElement.src = urls[0];
        }
        
        // --- NEW: Draggable Floating Display Functions ---
        function closeFloatingDisplay() {
            if (floatingDisplay) floatingDisplay.style.display = 'none';
        }

        function makeDraggable(elmnt) {
            var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            var header = byId("floating-header");
            if (header) {
                header.onmousedown = dragMouseDown;
                header.ontouchstart = dragTouchStart;
            } else {
                elmnt.onmousedown = dragMouseDown;
                elmnt.ontouchstart = dragTouchStart;
            }

            function dragMouseDown(e) {
                e = e || window.event;
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function dragTouchStart(e) {
                e = e || window.event;
                // e.preventDefault() here might block scroll if dragging from body, but ok for header
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
                document.ontouchend = closeDragElement;
                document.ontouchmove = elementDragTouch;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
                elmnt.style.right = 'auto'; // Disable right so left takes over
            }

            function elementDragTouch(e) {
                e = e || window.event;
                pos1 = pos3 - e.touches[0].clientX;
                pos2 = pos4 - e.touches[0].clientY;
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
                elmnt.style.right = 'auto';
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
                document.ontouchend = null;
                document.ontouchmove = null;
            }
        }

        // --- NEW: Function to update main display image ---
        function updateDisplayImage(wordData) {
            if (!displayImageElement || !englishOverlay || !displayPlaceholder || !burmeseDisplayArea) return; 
            
            if (wordData) {
                // Restore visibility if it was closed
                if (floatingDisplay.style.display === 'none') {
                    floatingDisplay.style.display = 'flex';
                }

                setImageWithFallback(displayImageElement, wordData.word);
                displayImageElement.style.display = 'block';
                
                // --- NEW ---
                burmeseDisplayArea.textContent = wordData.word; 
                
                englishOverlay.textContent = wordData.en;
                displayPlaceholder.style.display = 'none';
            } else {
                displayImageElement.style.display = 'none';
                
                // --- NEW ---
                burmeseDisplayArea.textContent = ''; // Clear Burmese word
                
                englishOverlay.textContent = '';
                displayPlaceholder.style.display = 'block';
            }
        }

        // --- Word List View (Modified onclick) ---
        function renderWordList() {
            if (!wordsContainer) return;
            const words = getCurrentWords();
            wordsContainer.innerHTML = '';
            words.forEach((data, index) => {
                const colorClass = colors[index % colors.length];
                const button = document.createElement('div');
                button.className = `word-button ${colorClass} text-white text-2xl font-semibold px-5 py-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 ring-2 ring-transparent active:ring-4 active:ring-white active:ring-opacity-50`;
                button.innerHTML = `<span class="burmese-word">${data.word}</span>`;
                button.onclick = () => { 
                    playWordAudio(index); // No callback for single click
                    applyGlowEffect(button); 
                    updateDisplayImage(data); // CHANGED
                };
                wordsContainer.appendChild(button);
            });
        }

        // --- Read Aloud Feature (Modified) ---
        function toggleReadAloud() {
            if (isQuizView) return; // Only works in list view
            if (isReadingAloud) stopReadAloud();
            else startReadAloud();
        }

        function startReadAloud() {
            stopTitleReadAloud(); 
            if (isQuizView) return; 
            isReadingAloud = true;
            readAloudCurrentIndex = 0;
            const readAloudIcon = byId('read-aloud-icon');
            if (readAloudIcon) readAloudIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`; // Change to stop icon
            playNextWordInSequence();
        }

        function stopReadAloud() {
            if (!isReadingAloud) return;
            isReadingAloud = false;
            audioPlayer.pause();
            
            if (audioPlayer._stopTimer) {
                clearTimeout(audioPlayer._stopTimer);
                audioPlayer._stopTimer = null;
            }

            const readAloudIcon = byId('read-aloud-icon');
            if (readAloudIcon) readAloudIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5v14l11-7z"></path>`; // Change back to play icon
            const highlighted = wordsContainer.querySelector('.highlight');
            if (highlighted) highlighted.classList.remove('highlight');
            updateDisplayImage(null); // CHANGED: Clear display image
            displayPlaceholder.textContent = '';
        }

        function playNextWordInSequence() {
            if (!isReadingAloud) return;
            const words = getCurrentWords();
            if (readAloudCurrentIndex >= words.length) { stopReadAloud(); return; }
            
            const oldHighlighted = wordsContainer.querySelector('.highlight');
            if (oldHighlighted) oldHighlighted.classList.remove('highlight');

            const wordData = words[readAloudCurrentIndex];
            const currentButton = wordsContainer.children[readAloudCurrentIndex];
            
            if (currentButton) {
                currentButton.classList.add('highlight');
                currentButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            updateDisplayImage(wordData); // CHANGED
            
            playWordAudio(readAloudCurrentIndex, () => {
                if (isReadingAloud) { 
                    readAloudCurrentIndex++;
                    playNextWordInSequence();
                }
            });
        }

        // --- NEW: Matching Game Functions ---
        
        function initMatchingGame() {
            const words = getCurrentWords();
            quizWordsOrder = shuffle([...words]); // Shuffle all words for the chapter
            currentQuizPage = 0;
            totalMatches = 0;
            if (gameMessage) gameMessage.textContent = '';
            
            loadMatchingGamePage();
            updateGameCount(); // Initialize count
        }
        
        function updateGameCount() {
            if (!quizCountDisplay || !quizTotalDisplay) return;
            quizCountDisplay.textContent = totalMatches;
            quizTotalDisplay.textContent = getCurrentWords().length;
        }

        function loadMatchingGamePage() {
            matchesOnPage = 0;
            selectedImage = { word: null, element: null };
            selectedWord = { word: null, element: null };
            
            const startIndex = currentQuizPage * 6;
            const wordsForPage = quizWordsOrder.slice(startIndex, startIndex + 6);

            if (wordsForPage.length === 0 && totalMatches === getCurrentWords().length) {
                // Game is fully complete
                gameMessage.textContent = '✅ ဂုဏ်ယူပါတယ်! အားလုံး ပြီးဆုံးပါပြီ!';
                gameImagesContainer.innerHTML = '';
                gameWordsContainer.innerHTML = '';
                return;
            } else if (wordsForPage.length === 0) {
                // This shouldn't happen if logic is right, but as a fallback
                gameMessage.textContent = 'ဂိမ်းပြီးပါပြီ!';
                return;
            }

            const shuffledImages = shuffle([...wordsForPage]);
            const shuffledWords = shuffle([...wordsForPage]);
            
            gameImagesContainer.innerHTML = '';
            gameWordsContainer.innerHTML = '';
            
            shuffledImages.forEach(wordData => renderGameImageButton(wordData));
            shuffledWords.forEach(wordData => renderGameWordButton(wordData));
        }

        function renderGameImageButton(wordData) {
            const button = document.createElement('button');
            button.className = 'game-button';
            button.dataset.word = wordData.word;
            
            const img = document.createElement('img');
            img.alt = wordData.en;
            setImageWithFallback(img, wordData.word);
            
            const enText = document.createElement('span');
            enText.className = 'en-text';
            enText.textContent = wordData.en;
            
            button.appendChild(img);
            button.appendChild(enText);
            
            button.onclick = () => selectImage(button, wordData);
            gameImagesContainer.appendChild(button);
        }

        function renderGameWordButton(wordData) {
            const button = document.createElement('button');
            button.className = 'game-button justify-center'; // Center the word
            button.dataset.word = wordData.word;
            
            const myText = document.createElement('span');
            myText.className = 'burmese-word';
            myText.textContent = wordData.word;
            
            button.appendChild(myText);
            
            button.onclick = () => selectWord(button, wordData);
            gameWordsContainer.appendChild(button);
        }

        function selectImage(button, wordData) {
            if (button.classList.contains('matched') || selectedImage.element === button) return;

            // Play audio as requested for all clicks
            const index = getCurrentWords().findIndex(w => w.word === wordData.word);
            if (index > -1) playWordAudio(index);
            
            // Deselect previous image button if one was selected
            if (selectedImage.element) {
                selectedImage.element.classList.remove('selected');
            }
            
            selectedImage = { word: wordData.word, element: button };
            button.classList.add('selected');
            
            checkForMatch();
        }

        function selectWord(button, wordData) {
            if (button.classList.contains('matched') || selectedWord.element === button) return;

            // Play audio as requested for all clicks
            const index = getCurrentWords().findIndex(w => w.word === wordData.word);
            if (index > -1) playWordAudio(index);

            // Deselect previous word button if one was selected
            if (selectedWord.element) {
                selectedWord.element.classList.remove('selected');
            }
            
            selectedWord = { word: wordData.word, element: button };
            button.classList.add('selected');
            
            checkForMatch();
        }

        function checkForMatch() {
            if (!selectedImage.word || !selectedWord.word) {
                return; // Need both an image and a word to check
            }

            const imgButton = selectedImage.element;
            const wordButton = selectedWord.element;
            const isMatch = selectedImage.word === selectedWord.word;

            if (isMatch) {
                // --- MATCH ---
                imgButton.classList.add('matched');
                imgButton.classList.remove('selected');
                imgButton.disabled = true;
                
                wordButton.classList.add('matched');
                wordButton.classList.remove('selected');
                wordButton.disabled = true;

                matchesOnPage++;
                totalMatches++;
                updateGameCount();
                
                // Play celebration
                fireConfetti(imgButton);
                const index = getCurrentWords().findIndex(w => w.word === selectedImage.word);
                if (index > -1) playWordAudio(index); // Play audio on match
                
                if (matchesOnPage === 6 || totalMatches === getCurrentWords().length) {
                    // Page is complete
                    if (totalMatches === getCurrentWords().length) {
                         gameMessage.textContent = '✅ ဂုဏ်ယူပါတယ်! အားလုံး ပြီးဆုံးပါပြီ!';
                    } else {
                        gameMessage.textContent = '✅ ကောင်းတယ်! နောက် ၆ ခု သွားမယ်...';
                        currentQuizPage++;
                        setTimeout(() => {
                            loadMatchingGamePage();
                            gameMessage.textContent = '';
                        }, 2500);
                    }
                }

            } else {
                // --- MISMATCH ---
                imgButton.classList.add('mismatched');
                wordButton.classList.add('mismatched');
                
                // Remove mismatch styles after animation
                setTimeout(() => {
                    imgButton.classList.remove('mismatched');
                    wordButton.classList.remove('mismatched');
                    imgButton.classList.remove('selected');
                    wordButton.classList.remove('selected');
                }, 500);
            }

            // Clear selections regardless of match or mismatch
            selectedImage = { word: null, element: null };
            selectedWord = { word: null, element: null };
        }
        
        /* --- Confetti Implementation (Unchanged) --- */
        function fireConfetti(sourceElement) {
            if (!confettiContainer) return;
            const rect = sourceElement.getBoundingClientRect();
            const sourceX = rect.left + rect.width / 2;
            const sourceY = rect.top + rect.height / 2;
            const containerRect = confettiContainer.getBoundingClientRect();
            const type = confettiTypes[confettiTypeIndex % confettiTypes.length];
            confettiTypeIndex++;
            const colorsForDefault = ['#f87171', '#f472b6', '#c084fc', '#60a5fa', '#4ade80', '#facc15'];
            const numberOfParticles = 30;
            for (let i = 0; i < numberOfParticles; i++) {
                const particle = document.createElement('div');
                particle.classList.add('confetti');
                let particleStyle = `
                    left: ${sourceX - containerRect.left}px;
                    top: ${sourceY - containerRect.top}px;
                `;
                const angle = Math.random() * 2 * Math.PI;
                const velocity = 30 + Math.random() * 50; 
                const xOffset = Math.cos(angle) * velocity;
                const yOffset = Math.sin(angle) * velocity - 100; 
                const yEndOffset = yOffset + 200 + Math.random() * 50; 
                particle.style.setProperty('--x', `${xOffset}px`);
                particle.style.setProperty('--y', `${yOffset}px`);
                particle.style.setProperty('--y_end', `${yEndOffset}px`);
                particle.style.setProperty('--r', `${Math.random() * 720}deg`);
                particle.style.cssText += particleStyle;
                switch (type) {
                    case 'star': particle.classList.add('star'); particle.innerHTML = '⭐'; break;
                    case 'emoji':
                        particle.classList.add('emoji');
                        const emojis = ['🎉', '🎈', '🥳', '🎁', '✨'];
                        particle.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
                        break;
                    case 'gold': particle.classList.add('gold'); break;
                    case 'heart': particle.classList.add('heart'); particle.innerHTML = '💖'; break;
                    default:
                        particle.style.backgroundColor = colorsForDefault[Math.floor(Math.random() * colorsForDefault.length)];
                        particle.style.width = `${8 + Math.random() * 7}px`;
                        particle.style.height = `${8 + Math.random() * 7}px`;
                        particle.style.borderRadius = `${Math.random() > 0.5 ? '50%' : '5px'}`;
                        break;
                }
                confettiContainer.appendChild(particle);
                setTimeout(() => { particle.remove(); }, 1000);
            }
        }
        /* --- End Confetti Implementation --- */


        // --- View Toggle (Modified) ---
        function toggleView() {
            if (!wordListView || !quizGameView || !toggleViewBtn) return;
            stopReadAloud();
            isQuizView = !isQuizView;
            
            // Note: In new sidebar layout, sidebar visibility logic can be handled here if we want to hide it in game mode.
            // But user might want to see it. Let's keep it consistent for now.
            // If sidebar needs to be hidden in game view:
            // if (sidebarDisplay) sidebarDisplay.classList.toggle('hidden', isQuizView);


            if (isQuizView) {
                wordListView.classList.add('hidden');
                quizGameView.classList.remove('hidden');
                toggleViewBtn.classList.replace('bg-blue-500', 'bg-green-500');
                readAloudBtn.classList.add('opacity-50', 'cursor-not-allowed');
                byId('view-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>';
                initMatchingGame(); // CHANGED
            } else {
                wordListView.classList.remove('hidden');
                quizGameView.classList.add('hidden');
                toggleViewBtn.classList.replace('bg-green-500', 'bg-blue-500');
                readAloudBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                byId('view-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.152A1.5 1.5 0 0113.407 2.152l2.257 4.549 5.004.727a1.5 1.5 0 01.832 2.578l-3.62 3.53.854 4.981a1.5 1.5 0 01-2.175 1.584L12 18.067l-4.482 2.352a1.5 1.5 0 01-2.175-1.584l.854-4.981-3.62-3.53a1.5 1.5 0 01.832-2.578l5.004-.727 2.257-4.549z"></path>';
                renderWordList();
            }
        }
        
        // --- Removed 3D Text Functions ---

        // --- Initialization (Modified) ---
        window.__mp1aApp = { toggleReadAloud, toggleView, closeFloatingDisplay };

        (() => {
            audioPlayer = byId('audio-player');
            titleAudioPlayer = byId('title-audio-player');
            if (titleAudioPlayer) {
                titleAudioPlayer.src = pronunciationAudioUrl;
                titleAudioPlayer.load();
            }
            wordsContainer = byId('words-container');
            wordListView = byId('word-list-view');
            quizGameView = byId('quiz-game-view');
            toggleViewBtn = byId('toggle-view-btn');
            readAloudBtn = byId('read-aloud-btn');
            gameMessage = byId('game-message');
            quizCountDisplay = byId('quiz-count');
            quizTotalDisplay = byId('quiz-total');
            confettiContainer = byId('confetti-container');
            mainTitle = byId('main-title');
            
            // --- NEW Element Refs ---
            displayImageContainer = byId('display-image-container');
            displayImageElement = byId('display-image');
            displayPlaceholder = byId('display-placeholder');
            englishOverlay = byId('english-overlay');
            gameImagesContainer = byId('game-images-container');
            gameWordsContainer = byId('game-words-container');
            burmeseDisplayArea = byId('burmese-display-area'); // Added this line
            floatingDisplay = byId('floating-display'); // Added this line
            
            // Make the floating display draggable
            if (floatingDisplay) {
                makeDraggable(floatingDisplay);
            }
            
            // Set initial state
            updateDisplayImage(null); // Clear image
            displayPlaceholder.textContent = '';

            switchChapter(currentChapterId);
            // initThreeJS(); // REMOVED
        })();


    return () => {
      delete window.__mp1aApp;
    };
  }, []);

  return (
    <>
      <style>{P1A_APP_CSS}</style>
      <div
        ref={containerRef}
        className="p1a-app-root"
        dangerouslySetInnerHTML={{ __html: P1A_APP_BODY_HTML }}
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
      )}
    </>
  );
}
