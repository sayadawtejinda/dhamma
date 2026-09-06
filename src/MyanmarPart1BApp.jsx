import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "သူငယ်တန်း စာသင်ခန်း" (Myanmar Part 1B)
// HTML app ──
// Same hybrid approach as the other ported apps: the original vanilla JS
// is kept almost unchanged inside a React wrapper. document.getElementById
// /querySelector(All) calls were changed to a rootEl-scoped `byId` helper /
// rootEl.querySelectorAll(All) so this app only ever touches its own
// container. No onclick="..." string attributes exist in this app (buttons
// are built and wired up entirely via JS), so no window bridge object is
// needed. window.onload was converted to a direct initApp() call since the
// DOM is already present by the time this effect runs. The original CSS's
// bare `body {...}` rule was rescoped to .p1b-app-root.
//
// This app has no data persistence of its own; the shared Firebase
// instance from ./firebase.js is reused for the added online-roster
// feature below.

const P1B_ROSTER_PATH = 'artifacts/myanmar-part1b-app/public/data/roster';
const sanitizeP1bKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const P1B_APP_CSS = `
        /* Inter Font ကို အသုံးပြုသည်။ မြန်မာစာအတွက်တော့ စနစ်ပေါ်မူတည်၍ ပြသမည်။ */
        .p1b-app-root {
            font-family: 'Inter', sans-serif;
            background-color: #f7f7f7;
        }
        /* စာကြောင်း ဖတ်နေချိန်တွင် မီးမောင်းထိုးပြရန်အတွက် CSS */
        .highlighted-line {
            background-color: #fcd34d; /* Bright Yellow */
            color: #1f2937;
            font-weight: bold;
            border-radius: 0.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            transition: background-color 0.2s, color 0.2s;
            border: 2px solid #f97316; /* Orange border */
        }
        /* Paragraph နှိပ်နိုင်သော နေရာအတွက် ကာဆာ ပုံစံ */
        .paragraph-line {
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.2s, background-color 0.2s;
        }
        .paragraph-line:hover {
            transform: scale(1.01);
            background-color: #eef2ff; /* Very light blue/purple */
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        /* ခေါင်းစဉ် ဖောင့်အရွယ်အစား ချိန်ညှိခြင်း */
        .chapter-title {
            font-size: clamp(1.5rem, 5vw, 2.5rem);
        }
        .paragraph-text {
            font-size: clamp(1.1rem, 3vw, 1.5rem);
            line-height: 1.8;
        }
        /* Chapter Navigation Container New Styles for Fun Aesthetics */
        .chapter-nav-container {
            background-color: #ffe4e6; /* Light Pink for fun */
            border: 3px solid #f97316; /* Bright Orange Border */
        }
        /* Chapter Button Styles */
        .chapter-button {
            background-color: #8b5cf6; /* Bright Purple */
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
        }
        .chapter-button:hover {
            background-color: #a78bfa; /* Lighter Purple */
            transform: translateY(-2px);
            box-shadow: 0 6px 10px -2px rgba(0, 0, 0, 0.2);
        }
        .chapter-button.active {
            background-color: #f97316; /* Orange for Active */
            box-shadow: 0 8px 15px -3px rgba(249, 115, 22, 0.4);
            transform: scale(1.05);
        }
        /* For Translation Display */
        #translationDisplay {
            background-color: #6366f1; /* Indigo */
            color: #ffffff;
            font-size: clamp(1rem, 2.5vw, 1.25rem);
            border-radius: 0.75rem;
            padding: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            min-height: 4.5rem; /* Ensure stability */
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-weight: 500;
        }
        /* To ensure the content area is ready for swiping */
        #contentArea {
            touch-action: pan-y; /* Allows horizontal swiping but prevents vertical scrolling conflict */
        }
        /* Game Modal Animation */
        #gameModal.visible { display: flex; }
        #gameModal.visible #gameModalContent {
            animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes zoomIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        /* Game Button Styles */
        .game-option-btn {
            background-color: white;
            border: 2px solid #cbd5e1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.2s ease-in-out;
        }
        .game-option-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.1);
            border-color: #a78bfa;
        }
        .game-option-btn.correct {
            background-color: #22c55e; /* green-500 */
            color: white;
            border-color: #16a34a; /* green-600 */
            transform: scale(1.05);
        }
        .game-option-btn.incorrect {
            background-color: #ef4444; /* red-500 */
            color: white;
            border-color: #dc2626; /* red-600 */
            opacity: 0.7;
        }
        .game-option-btn:disabled {
            cursor: not-allowed;
        }
        #gameResult {
             animation: popIn 0.4s ease forwards;
        }
        @keyframes popIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
`;

const P1B_APP_BODY_HTML = `

    <!-- မူရင်း အသံပိုင်ရှင် (Hidden Audio Player) -->
    <audio id="audioPlayer" src="https://raw.githubusercontent.com/nathantun93/bell/main/သူငယ်တန်း.mp3" preload="auto"></audio>

    <div id="loadingIndicator" class="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div id="loader" class="text-center">
            <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
            <p class="mt-4 text-xl font-semibold text-indigo-600">အသံဖိုင်များကို စီစဉ်နေပါသည်...</p>
        </div>
        <div id="startButtonContainer" class="text-center hidden">
            <button id="startButton" class="px-8 py-4 bg-green-500 text-white font-bold rounded-full shadow-lg text-2xl transform hover:scale-105 transition-transform">
                စတင်ပါ
            </button>
            <p class="mt-4 text-gray-600">iPad/iPhone တွင် ဆက်ရန် နှိပ်ပါ။</p>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 space-y-4 lg:space-y-0 lg:space-x-4">

        <!-- Chapter Navigation (Left Sidebar on Desktop, Top on Mobile) -->
        <div class="lg:w-1/4 w-full chapter-nav-container p-4 rounded-xl shadow-2xl flex-shrink-0">
            <h2 class="text-xl font-bold text-indigo-700 mb-4 border-b-2 border-orange-500 pb-2">အခန်းများ (Chapter)</h2>
            
            <div class="flex justify-center mb-4 p-2 bg-pink-100 rounded-lg shadow-inner">
                <img id="chapterImage" src="" alt="အခန်းအလိုက် ပုံ" class="w-full h-auto max-h-48 object-contain rounded-lg border-2 border-orange-500">
            </div>
            
            <div id="chapterNav" class="grid grid-cols-7 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-96 lg:max-h-full overflow-y-auto">
                <!-- Chapter buttons will be generated here -->
            </div>
        </div>

        <!-- Content Display Area (Image, Text, Paragraph Navigation) - SWIPE AREA -->
        <div id="contentArea" class="lg:w-3/4 w-full bg-white p-6 rounded-xl shadow-2xl">
            
            <h1 id="mainTitle" class="chapter-title font-extrabold text-gray-800 mb-4 border-b-4 border-indigo-500 pb-2 text-left">အခန်း (၁)</h1>

            <div class="flex flex-wrap justify-between items-center mb-6">
                <div id="paragraphNav" class="flex flex-wrap gap-2 pr-2">
                    <!-- Paragraph buttons will be generated here -->
                </div>

                <div class="flex-shrink-0 pt-2 sm:pt-0 flex items-center space-x-3">
                    <button id="gameBtn" class="p-3 rounded-full bg-purple-600 text-white shadow-xl transition duration-150 ease-in-out transform hover:scale-110 active:scale-95 w-14 h-14 flex items-center justify-center" title="စာလုံးပေါင်း ဂိမ်း">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5h-3V5A1.5 1.5 0 0110 3.5zM8.5 8H10v1.5H8.5V8zm1.5 1.5V8H10v1.5zm-1.5 3H10v1.5H8.5V11zM10 11h1.5v1.5H10V11zm2-5.5a1.5 1.5 0 00-1.5-1.5V5h1.5v1.5h-1.5v-1.5zM10 8H8.5v1.5H10V8zm3.5 1.5a1.5 1.5 0 01-1.5-1.5V5h1.5v3a1.5 1.5 0 01-1.5 1.5zM15 11.5a1.5 1.5 0 00-1.5-1.5v-3h1.5v3a1.5 1.5 0 01-1.5 1.5zM5 11.5a1.5 1.5 0 011.5-1.5v-3H5v3a1.5 1.5 0 001.5 1.5zM6.5 13H5v1.5h1.5V13zm3.5 0H8.5v1.5H10V13zm1.5 0H10v1.5h1.5V13zm3.5 0h-1.5v1.5H15V13zM10 18a8 8 0 100-16 8 8 0 000 16z"/>
                        </svg>
                    </button>
                    <button id="fullReadBtn" class="p-3 rounded-full bg-orange-500 text-white shadow-xl transition duration-150 ease-in-out transform hover:scale-110 active:scale-95 w-14 h-14 flex items-center justify-center" title="စာပိုဒ် အစအဆုံးဖတ်ရန်">
                        <svg id="playIcon" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                        </svg>
                        <svg id="stopIcon" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 hidden" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 8a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V8z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div class="flex flex-col space-y-4">
                    <div class="flex justify-center p-2 bg-gray-50 rounded-lg shadow-inner">
                        <img id="contentImage" src="" alt="စာအုပ်ပုံ" class="w-full max-h-96 object-contain rounded-lg shadow-xl border-4 border-purple-500">
                    </div>
                </div>
                
                <div class="flex flex-col space-y-4">
                    <div id="paragraphDisplay" class="paragraph-text text-gray-700 space-y-2">
                        <!-- Text lines will be displayed here -->
                    </div>
                    <div id="translationDisplay" class="text-center font-medium">
                        <!-- Translation will appear here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Game Modal -->
    <div id="gameModal" class="fixed inset-0 bg-black bg-opacity-70 z-50 hidden items-center justify-center p-4">
        <div class="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-auto text-center" id="gameModalContent">
            
            <button id="playGameSoundBtn" class="mb-8 w-20 h-20 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center mx-auto transition transform hover:scale-110 active:scale-95 ring-4 ring-white ring-opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 15.858a5 5 0 010-7.072m2.828 9.9a9 9 0 010-12.728" /></svg>
            </button>

            <div id="gameOptions" class="space-y-4 mb-6">
                <!-- Game options will be generated here -->
            </div>

            <div id="gameResult" class="min-h-[3rem] mb-4 text-3xl font-bold"></div>

            <div class="flex justify-center space-x-4">
                 <button id="closeGameBtn" class="px-8 py-3 bg-white text-gray-800 rounded-full shadow-md hover:bg-gray-200 font-semibold transition-colors">ပိတ်မည်</button>
            </div>
        </div>
    </div>


`;

export default function MyanmarPart1BApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, P1B_ROSTER_PATH, sanitizeP1bKey(studentName));
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
    const unsub = onSnapshot(collection(db, P1B_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Part 1B roster listen error:', e));
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

        // စာသင်ခန်းအတွက် အဓိက အချက်အလက်များကို သိမ်းဆည်းခြင်း
        const AUDIO_FILE_URL = "https://raw.githubusercontent.com/nathantun93/bell/main/သူငယ်တန်း.mp3";
        const IMAGE_BASE_URL = "https://raw.githubusercontent.com/nathantun93/Pic/main/"; 
        const SWIPE_THRESHOLD = 50; // ပွတ်ဆွဲမှု အနည်းဆုံး အကွာအဝေး (Pixels)
        const VERTICAL_TOLERANCE_RATIO = 2; // ဘယ်ညာရွေ့လျားမှုက အပေါ်အောက်ရွေ့လျားမှုထက် ၂ ဆ ပိုများမှသာ အလုပ်လုပ်မည်။

        // အသံမှတ်တမ်း (Timestamps) များကို စုစည်းထားခြင်း
        const AUDIO_SEGMENT_START_TIMES = [
            0.00, 2.00, 4.00, 6.00, 7.00, 11.00, 13.00, 15.00, 17.00, 19.00, 24.00, 26.00, 27.00, 29.00, 31.00, 35.00, 37.00, 39.00, 41.00, 43.00, 49.00, 51.00, 53.00, 55.00, 56.00, 61.00, 63.00, 65.00, 67.00, 69.00, 74.00, 76.00, 78.00, 80.00, 82.00, 87.00, 89.00, 91.00, 93.00, 95.00, 102.00, 104.00, 106.00, 108.00, 109.00, 115.00, 117.00, 119.00, 121.00, 123.00, 129.00, 131.00, 133.00, 135.00, 137.00, 143.00, 145.00, 147.00, 149.00, 151.00, 158.00, 161.00, 163.00, 166.00, 168.00, 174.00, 176.00, 178.00, 180.00, 182.00, 187.00, 189.00, 191.00, 194.00, 196.00, 203.00, 205.00, 207.00, 209.00, 211.00, 213.00, 215.00, 222.00, 224.00, 226.00, 228.00, 230.00, 235.00, 237.00, 239.00, 242.00, 244.00, 250.00, 252.00, 254.00, 256.00, 258.00, 264.00, 266.00, 268.00, 270.00, 273.00, 275.00, 284.00, 286.00, 289.00, 291.00, 293.00, 299.00, 301.00, 303.00, 305.00, 307.00, 313.00, 315.00, 317.00, 319.00, 321.00, 323.00, 330.00, 332.00, 334.00, 336.00, 338.00, 345.00, 347.00, 349.00, 351.00, 353.00, 359.00, 361.00, 363.00, 365.00, 367.00, 375.00, 377.00, 379.00, 381.00, 383.00, 388.00, 390.00, 392.00, 394.00, 396.00, 403.00, 405.00, 408.00, 410.00, 412.00, 418.00, 421.00, 423.00, 425.00, 427.00, 435.00, 438.00, 440.00, 443.00, 446.00, 453.00, 455.00, 457.00, 460.00, 462.00, 468.00, 470.00, 472.00, 475.00, 478.00, 486.00, 488.00, 490.00, 492.00, 495.00, 503.00, 505.00, 507.00, 509.00, 511.00, 518.00, 520.00, 522.00, 524.00, 527.00, 535.00, 537.00, 539.00, 541.00, 543.00, 546.00, 555.00, 557.00, 559.00, 562.00, 564.00, 566.00, 575.00, 577.00, 579.00, 581.00, 584.00, 586.00, 595.00, 597.00, 599.00, 602.00, 604.00, 606.00, 616.00, 618.00, 620.00, 623.00, 625.00, 628.00, 638.00, 640.00, 642.00, 644.00, 646.00, 653.00, 655.00, 657.00, 659.00, 662.00, 669.00, 671.00, 673.00, 675.00, 678.00, 686.00, 689.00, 691.00, 693.00, 695.00, 703.00, 705.00, 707.00, 710.00, 712.00, 720.00, 722.00, 724.00, 726.00, 728.00, 736.00, 738.00, 740.00, 742.00, 744.00, 751.00, 754.00, 756.00, 758.00, 762.00, 771.00, 774.00, 776.00, 779.00, 782.00, 791.00, 794.00, 797.00, 800.00, 803.00, 813.00, 815.00, 818.00, 821.00, 824.00, 833.00, 836.00, 839.00, 842.00, 845.00, 855.00, 858.00, 861.00, 864.00, 867.00, 876.00, 879.00, 881.00, 883.00, 885.00, 893.00, 896.00, 899.00, 902.00, 905.00
        ];
        const FINAL_AUDIO_END_TIME = 908.00;

        const ALL_CONTENT = [
            // Chapter 1
            { chapter: '1', imagePrefix: '01', paragraphs: [
                { id: '01-01', lines: ['ညအခါ', 'လသာသာ', 'ကစားမလား', 'နားမလား။'], englishLines: ['At night', 'The moon is bright', 'Shall we play?', 'Or shall we rest?'], startIdx: 0 },
                { id: '01-02', lines: ['အစားအစာ', 'ဝါးစားပါ', 'အသား ပါသလား၊', 'ငါးပါသလား။'], englishLines: ['Food', 'Chew and eat it', 'Is there meat?', 'Is there fish?'], startIdx: 5 },
                { id: '01-03', lines: ['ကစားစရာ', 'ကစားပါ', 'အားထားစရာ', 'သားသား လာ။'], englishLines: ['Toys', 'Play', 'Something to rely on', 'My son, come.'], startIdx: 10 },
                { id: '01-04', lines: ['စာရ သလား', 'ခဏ လာပါ', 'ဆရာမ အနား', 'လာသာ လာပါ။'], englishLines: ['Did you get the lesson?', 'Come for a moment', 'Near the teacher', 'Come, those who come.'], startIdx: 15 },
            ]},
            // Chapter 2
            { chapter: '2', imagePrefix: '02', paragraphs: [
                { id: '02-01', lines: ['ညီညီ ညာညာ', 'အနီးလာ', 'ဆရာ မိဘ', 'သတိရ။'], englishLines: ['In harmony', 'Come near', 'Teacher and parents', 'Remember them.'], startIdx: 20 },
                { id: '02-02', lines: ['ဆီမီး ဝါဝါ', 'ညီညီ စီထားသည်။', 'အနီးအနား', 'သမီး သား လာပါ။'], englishLines: ['Bright oil lamps', 'Arranged neatly.', 'Nearby', 'Daughter, son, please come.'], startIdx: 25 },
                { id: '02-03', lines: ['အရီး လာသည်။', 'ဆီးသီး ပါသလား။', 'အဆီ မစား။', 'အသီး စားပါ။'], englishLines: ['Auntie comes.', 'Are there jujubes?', 'Do not eat fat.', 'Eat fruit.'], startIdx: 30 },
                { id: '02-04', lines: ['ဤခရီး နီးသလား။', 'ငါးနာရီ လာရ၏။', 'မီးရထား စီးလာပါ။', 'အလကား မစီးရ။'], englishLines: ['Is this journey near?', 'It takes five hours to come.', 'Come by train.', 'You can’t ride for free.'], startIdx: 35 },
            ]},
            // Chapter 3
            { chapter: '3', imagePrefix: '03', paragraphs: [
                { id: '03-01', lines: ['သူ ပညာ ထူး၏။', 'ပထမဆု ရသည်။', 'ဆု လာယူပါ။', 'အတု ယူစရာ။'], englishLines: ['He is excellent in studies.', 'He won first prize.', 'He brought the prize.', 'He is an example to follow.'], startIdx: 40 },
                { id: '03-02', lines: ['ရာသီဥတု ပူသည်။', 'ထီး ယူလာသလား။', 'ဦးဦး လာ၏။', 'အနားယူပါ။'], englishLines: ['The weather is hot.', 'Did you bring an umbrella?', 'Uncle comes.', 'Please rest.'], startIdx: 45 },
                { id: '03-03', lines: ['ဤမိသားစု', 'ဘုရားဖူး လာ၏။', 'လူစုလာသည်။', 'ဦးသာထူး ပါသလား။'], englishLines: ['This family', 'Comes to pay homage.', 'The crowd gathers.', 'Is U Tha Htoo included?'], startIdx: 50 },
                { id: '03-04', lines: ['စားစရာ လာယူပါ။', 'ညီညီညာညာ လာပါ။', 'လုမယူရ။', 'အတူတူ စားပါ။'], englishLines: ['Come and take food.', 'Come in unity.', 'Do not snatch.', 'Eat together.'], startIdx: 55 },
            ]},
            // Chapter 4
            { chapter: '4', imagePrefix: '04', paragraphs: [
                { id: '04-01', lines: ['သားကလေးတီတာတာ', 'မေမေ့ အနားလာ။', 'ဖေဖေ မေမေ သူ့စကား', 'တူတူရေ ဝါး။'], englishLines: ['The little child is babbling', 'Come near mother.', 'Father and mother, his words', 'Together, chew and eat.'], startIdx: 60 },
                { id: '04-02', lines: ['စာအရေးအသား', 'အလေးထားပါ။', 'ငေးမနေရ။', 'အားပေး ကူညီပါ။'], englishLines: ['Writing (script)', 'Pay attention.', 'Don’t stare idly.', 'Encourage and help.'], startIdx: 65 },
                { id: '04-03', lines: ['ယနေ့ နေသာ၏။', 'လေမလာ၍ ပူသည်။', 'ခရီးဝေးက လာရသည်။', 'ရေအေးအေး ပေးပါ။'], englishLines: ['It is sunny today.', 'It is hot because there is no wind.', 'I had to come from far away.', 'Please give cold water.'], startIdx: 70 },
                { id: '04-04', lines: ['ဖေဖေ မေမေ', 'မာပါစေ။', 'မေမေ့ စကား', 'အရေးထား။', 'ဖေဖေ့ စကား', 'သား လေးစား။'], englishLines: ['Father and Mother', 'May they be strong.', 'Mother’s words', 'Cherish them.', 'Father’s words', 'The son respects them.'], startIdx: 75 },
            ]},
            // Chapter 5
            { chapter: '5', imagePrefix: '05', paragraphs: [
                { id: '05-01', lines: ['ဘယ်က လာသလဲ။', 'ဘယ်နယ်က လဲ။', 'အလယ်က လူ', 'စကားနည်း၏။'], englishLines: ['Where did you come from?', 'Which region is it?', 'The person in the middle', 'Is a person of few words.'], startIdx: 82 },
                { id: '05-02', lines: ['ကလေးငယ်ငယ်', 'ဘာစားခဲ့သလဲ။', 'အမဲသားငါး စားရဲ့ လား။', 'ကုလားပဲ စားပါ။'], englishLines: ['The small child', 'What did they eat?', 'Did they eat beef and fish?', 'Eat chickpeas.'], startIdx: 87 },
                { id: '05-03', lines: ['သူသည် နုနယ်၏။', 'လဲနေသူ ထူပေးပါ။', 'အားငယ်သူ အားပေးပါ။', 'အတူတူ သယ်ယူပါ။'], englishLines: ['He is young and tender.', 'Help up the one who has fallen.', 'Encourage the weak.', 'Carry it together.'], startIdx: 92 },
                { id: '05-04', lines: ['လယ်သမား လူငယ်', 'စပါးနယ်နေသည်။', 'မမ စပါးသယ်၏။', 'မေမေ စားစရာ ဝယ်လာသည်။', 'ဖရဲသီး ပါသလား။'], englishLines: ['The young farmer', 'Is threshing paddy.', 'Elder sister carries the paddy.', 'Mother bought food.', 'Is there watermelon?'], startIdx: 97 },
            ]},
            // Chapter 6
            { chapter: '6', imagePrefix: '06', paragraphs: [
                { id: '06-01', lines: ['ဆီမီး ပူဇော်ပါ။', 'ဆရာတော် တရားဟော၏။', 'ဒေါသ မထားရ။', 'သာဓု ခေါ်ပါ။'], englishLines: ['Offer oil lamps.', 'The venerable monk preaches.', 'Do not be angry.', 'Say Sadhu (Amen).'], startIdx: 103 },
                { id: '06-02', lines: ['ဇာနည် ရဲဘော်', 'လူတော် လူမော်', 'အဖော်ရ၏။', 'တော်ပါပေသည်။'], englishLines: ['The heroic soldier', 'Is a talented, respected person', 'He has a companion.', 'He is indeed worthy.'], startIdx: 108 }, 
                { id: '06-03', lines: ['ဇော်က ကနေသည်။', 'ခါးကော့ ထားပါ။', 'ရယ်ရယ် မောမော', 'ပေါ့ပေါ့ ပါးပါး', 'တော်တော် မောသလား။'], englishLines: ['Zaw is dancing.', 'Arch your back.', 'Laughing joyfully', 'Lightly and easily', 'Are you very tired?'], startIdx: 113 }, 
                { id: '06-04', lines: ['ဒေါ်ဒေါ် ဘယ်ကလာသလဲ။', 'စောစော လာသလား။', 'အဖော် ခေါ်လာသည်။', 'ဩဇာသီး ပါ၏။'], englishLines: ['Auntie, where did you come from?', 'Did you come early?', 'She brought a companion.', 'There is custard apple.'], startIdx: 119 }, 
            ]},
            // Chapter 7
            { chapter: '7', imagePrefix: '07', paragraphs: [
                { id: '07-01', lines: ['ဘယ်အတန်းကလဲ။', 'သူငယ်တန်းကပါ။', 'ခဲတံ ပါသလား။', 'အခန်းထဲက ယူခဲ့ပါ။'], englishLines: ['Which class are you in?', 'I am in the first grade.', 'Do you have a pencil?', 'Bring it from the room.'], startIdx: 124 }, 
                { id: '07-02', lines: ['ဦးလေး ဘာထမ်း လာသလဲ။', 'ဘူးသီး ခရမ်းသီး ပါ၏။', 'တောလမ်းက လာခဲ့သည်။', 'မမောပန်းပါ။'], englishLines: ['Uncle, what are you carrying?', 'There are gourds and eggplants.', 'I came from the forest path.', 'I am not tired.'], startIdx: 129 }, 
                { id: '07-03', lines: ['ငါး မဖမ်းရ။', 'ပန်း မခူးရ။', 'ရေကန်အနီး မဆော့ရ။', 'စည်းကမ်း လေးစားပါ။'], englishLines: ['Do not catch fish.', 'Do not pick flowers.', 'Do not play near the pond.', 'Respect the rules.'], startIdx: 134 }, 
                { id: '07-04', lines: ['အလံတော် တလူလူ။', 'တေးသံ သာယာ၏။', 'စီတန်း၍ လာနေသည်။', 'အခမ်းအနား စတော့မည်။'], englishLines: ['The flag is fluttering.', 'The song is pleasant.', 'They are coming in a line.', 'The ceremony is about to begin.'], startIdx: 139 }, 
            ]},
            // Chapter 8
            { chapter: '8', imagePrefix: '08', paragraphs: [
                { id: '08-01', lines: ['လူကလေး နိုးလာသည်။', 'ကလေးကို မလန့်စေရ။', 'ငို မနေစေရ။', 'ရဲဖို့ လိုပါသည်။'], englishLines: ['The child wakes up.', 'Do not frighten the child.', 'Do not let them cry.', 'It is necessary to be brave.'], startIdx: 144 }, 
                { id: '08-02', lines: ['ဆရာမ အတန်းထဲသို့ လာသည်။', 'ရိုရိုသေသေ နေပါ။', 'စာ တိုးတိုး အံပါ။', 'ကိုယ့်ကိုယ်ကိုယ် အားကိုးပါ။'], englishLines: ['The teacher comes into the class.', 'Be respectful.', 'Recite quietly.', 'Rely on yourself.'], startIdx: 149 }, 
                { id: '08-03', lines: ['မိဘဆရာ ရိုသေပါ။', 'ရိုးရိုးသားသား နေပါ။', 'သာသာယာယာ စကားဆိုပါ။', 'အဘိုးအိုကို ကန်တော့ပါ။'], englishLines: ['Respect parents and teachers.', 'Be honest.', 'Speak gently and sweetly.', 'Pay homage to the old man.'], startIdx: 154 }, 
                { id: '08-04', lines: ['မိုးလရာသီ', 'အဘိုးအိုတို့ လယ်တဲ', 'တဲကလေး မိုးယို နေသလား။', 'ကူညီ၍ မိုးပေးပါ။'], englishLines: ['The rainy season', 'Grandfather’s field hut', 'Is the small hut leaking?', 'Help roof it.'], startIdx: 159 }, 
            ]},
            // Chapter 9
            { chapter: '9', imagePrefix: '09', paragraphs: [
                { id: '09-01', lines: ['ဆရာမ စာပြမည်။', 'မြေဖြူ ယူလာသည်။', 'မိမိနေရာ နေကြပါ။', 'စကားကျယ်ကျယ် မပြောရ။'], englishLines: ['The teacher will teach.', 'Brought chalk', 'Stay in your own place.', 'Do not speak loudly.'], startIdx: 164 }, 
                { id: '09-02', lines: ['နေကျဲကျဲ ပူသည်။', 'နေပူထဲ မပြေးရ။', 'အဖျားရောဂါ ရမည်။', 'နေအေးသောအခါ ပြေးကစားပါ။'], englishLines: ['The sun is intensely hot.', 'Do not run in the hot sun.', 'You will get a fever.', 'Run and play when it is cool.'], startIdx: 169 }, 
                { id: '09-03', lines: ['ပျားရည် ချိုသည်။', 'အစာကြေပါသည်။', 'ငါးကြီးဆီ စားပါ။', 'ကျန်းမာဝဖြိုးလာမည်။'], englishLines: ['Honey is sweet.', 'It helps digestion.', 'Eat fish oil.', 'You will become healthy and plump.'], startIdx: 174 }, 
                { id: '09-04', lines: ['ကျားကြီး ခြေရာကြီး', 'မေးဖန်များ စကားရ', 'ပျော်ပျော်နေ သေခဲ', 'ကျီစားသန်က ရန်များ၏။'], englishLines: ['Big tiger, big footprint', 'Ask often, you get the answer', 'Live happily, you die less often (Live long)', 'Too much teasing creates enemies.'], startIdx: 179 }, 
            ]},
            // Chapter 10
            { chapter: '10', imagePrefix: '10', paragraphs: [
                { id: '10-01', lines: ['ဆရာကန်တော့ပွဲ', 'အတူတကွ သွားကြမည်။', 'လူစု မကွဲစေရ။', 'ခွဲခွဲခြားခြား မပြုရ။', 'ဖော်ဖော်ရွေရွေ နေကြပါ။'], englishLines: ['Teacher\'s offering ceremony', 'We will go together.', 'Do not let the group scatter.', 'Do not discriminate.', 'Be friendly.'], startIdx: 184 }, 
                { id: '10-02', lines: ['နွေဦးရာသီ', 'ပလွေသံ သာယာ၏။', 'နွားများကို ဆွဲလာသည်။', 'အဝေးသို့ မသွားရ။', 'နေရာရွေး၍ နားမည်။'], englishLines: ['Spring season', 'The sound of the flute is pleasant.', 'The cows are being led.', 'Do not go far away.', 'Choose a place and rest.'], startIdx: 190 }, 
                { id: '10-03', lines: ['မယ်ငွေ၏ သားကလေး', 'အသား ဖြူဖွေးသည်။', 'ကလေး ထွားသည်။', 'ယုယုယယ ပွေ့ချီထား၏။', 'နွေးနွေးထွေးထွေး ထားပါ။'], englishLines: ['Ma Ngwe’s small child', 'The skin is white and fair.', 'He is also sturdy.', 'She holds him tenderly.', 'Keep him warm.'], startIdx: 196 }, 
                { id: '10-04', lines: ['ဤရွာကလေး သာယာသည်။', 'ဘူးသီး သခွားသီး ပေါ၏။', 'ရာသီမရွေး မအားကြပါ။', 'နွားများ မွေးမြူထားသည်။', 'ပျော်မွေ့စွာ နေကြသည်။'], englishLines: ['This small village is peaceful.', 'There are plenty of gourds and cucumbers.', 'They are busy in all seasons.', 'They keep cows.', 'They live happily.'], startIdx: 202 }, 
            ]},
            // Chapter 11
            { chapter: '11', imagePrefix: '11', paragraphs: [
                { id: '11-01', lines: ['အရှေ့ ရွာမှာ ဘာရှိသလဲ။', 'လူစည်ကားလှပါသည်။', 'ဘုရားပွဲတော် ရှိပါသလား။', 'လှည်းစီး၍ လာကြသည်။', 'လှေစီး၍လည်း လာကြသည်။'], englishLines: ['What is in the eastern village?', 'It is very crowded.', 'Is there a pagoda festival?', 'They come by cart.', 'They also come by boat.'], startIdx: 208 }, 
                { id: '11-02', lines: ['လူကလေး မှေးနေသည်။', 'အအေးမိ၍ နှာစေးသည်။', 'ရှူဆေး ရှိသလား။', 'နွေးနွေးထွေးထွေး ရှိပါစေ။'], englishLines: ['The child is napping.', 'He has a cold and runny nose.', 'Is there an inhaler?', 'Keep him warm.'], startIdx: 214 }, 
                { id: '11-03', lines: ['စပါး လှေ့နေကြသည်။', 'အဆာပြေ ပဲလှော် ဝါးပါ။', 'ရေနွေးကြမ်း ငှဲ့ပေးပါ။', 'စပါး ပေါ်မှ အလှူပေးမည်။'], englishLines: ['They are threshing paddy.', 'Chew roasted beans for a snack.', 'Pour some plain tea.', 'We will donate from the paddy harvest.'], startIdx: 219 }, 
                { id: '11-04', lines: ['ပညာကို ရှာမှီးပါ။', 'အမှားအမှန် ခွဲခြားပါ။', 'သတိ ရှိရမည်။', 'သနားညှာတာမှု ရှိကြပါ။'], englishLines: ['Seek knowledge.', 'Distinguish right from wrong.', 'You must be mindful.', 'Be compassionate.'], startIdx: 224 }, 
            ]},
            // Chapter 12
            { chapter: '12', imagePrefix: '12', paragraphs: [
                { id: '12-01', lines: ['ရွာလူကြီးများ ကြွလာပြီ။', 'ကြွေပန်းကန် ယူခဲ့ပါ။', 'ကျွဲကောသီး ထည့်ထားပါ။', 'ကျွေးမွေး ပြုစုပါရစေ။'], englishLines: ['The village elders have arrived.', 'Bring a porcelain plate.', 'Put pomelos in it.', 'Let me serve and care for you.'], startIdx: 229 }, 
                { id: '12-02', lines: ['မြွေသံ လား လေသံလား။', 'မြွေ သတိထားပါ။', 'မြွေထိက ဆေးခန်းသွားရမည်။', 'ဆရာဝန် ကြွလာပြီ။'], englishLines: ['Is that the sound of a snake or the wind?', 'Beware of snakes.', 'If bitten by a snake, go to the clinic.', 'The doctor has arrived.'], startIdx: 234 }, 
                { id: '12-03', lines: ['လူကလေး အသီးခွေချ၏။', 'အသီးများ ကြွေကျလာပြီ။', 'ကျွဲနွား မစားစေရ။', 'ချွေးဒီးဒီး ကျသည်။'], englishLines: ['The child shakes the fruit down.', 'The fruits have fallen.', 'Do not let buffaloes and cows eat them.', 'Sweating profusely.'], startIdx: 239 }, 
                { id: '12-04', lines: ['ကြွေပန်းအိုး ဝယ်လာသည်။', 'အကြွေး မဝယ်ပါ။', 'ကြွားကြွားဝါဝါ မနေရ။', 'ငွေကို ချွေတာပါ။'], englishLines: ['I bought a porcelain vase.', 'Do not buy on credit.', 'Do not show off.', 'Save money.'], startIdx: 244 }, 
            ]},
            // Chapter 13
            { chapter: '13', imagePrefix: '13', paragraphs: [
                { id: '13-01', lines: ['ရေကန်ထဲမှာ မျှော့ရှိ၏။', 'ငါးမျှားကြမည်။', 'ငါးမျှားတံ ယူခဲ့ပါ။', 'ငါးရက ညီညီမျှမျှယူကြမည်။'], englishLines: ['There are leeches in the pond.', 'We will fish.', 'Bring a fishing rod.', 'We will share the fish equally.'], startIdx: 249 }, 
                { id: '13-02', lines: ['အရသာကို လျှာက သိသည်။', 'ဈေးသည် မျှော်နေသည်။', 'ဈေးလျှော့၍ ပေးမည်လား။', 'မျှမျှတတ သဘောထားပါ။'], englishLines: ['The tongue knows the taste.', 'The seller is waiting.', 'Will they give a discount?', 'Be fair and impartial.'], startIdx: 254 }, 
                { id: '13-03', lines: ['လယ်ထဲမှာ ရေလျှံနေပြီ။', 'လျှော်စည်းများ မျောပါ နေကြသည်။', 'လှေမျှော၍ ဆယ်ယူပါ။', 'လျှောကျမည် သတိထား။'], englishLines: ['The field is flooded.', 'Rafts (of straw) are floating.', 'Float a boat and retrieve them.', 'Beware of slipping.'], startIdx: 259 }, 
                { id: '13-04', lines: ['ကလေးကို မြှူနေသည်။', 'ချော့မြူသော်လည်း မရပါ။', 'လျှာမှာ အနာရှိသလား။', 'အာဟာရ မျှပါစေ။'], englishLines: ['He is trying to coax the child.', 'Coaxing is not working.', 'Is there a sore on his tongue?', 'Let the nutrition be balanced.'], startIdx: 264 }, 
            ]},
            // Chapter 14
            { chapter: '14', imagePrefix: '14', paragraphs: [
                { id: '14-01', lines: ['လွှသမားများ လွှဆွဲနေကြသည်။', 'ချွေးများ စိုရွှဲနေသည်။', 'စားစရာကို နွေးထားပါ။', 'စားစရာ အသီးများ နွှာထားပါ။'], englishLines: ['Sawyers are sawing.', 'They are drenched in sweat.', 'Keep the food warm.', 'Peel the fruits.'], startIdx: 269 }, 
                { id: '14-02', lines: ['နွှဲပျော်စရာ တို့ တောရွာ', 'စပါးရွှေဝါ အားထားစရာ', 'စံပယ်ပန်းများ မွှေးကြူ၏။', 'ပျံလွှားများ ပျံနေကြသည်။'], englishLines: ['Our village is a place for fun', 'Golden paddy is our reliance', 'Jasmine flowers are fragrant.', 'Swallows are flying.'], startIdx: 274 }, 
                { id: '14-03', lines: ['သူ့ကိုယ်မှာ ရေတွေရွှဲနေသည်။', 'ပဝါ လွှားထားပါ။', 'မီးမြန်မြန် မွှေးပါ။', 'မီးနားမှာ ရွှေ့ နေပါ။'], englishLines: ['His body is drenched with water.', 'Put a towel over him.', 'Start the fire quickly.', 'Move near the fire.'], startIdx: 279 }, 
                { id: '14-04', lines: ['ချွေးတရွှဲရွှဲ အားကစားပွဲ', 'လွှဲဖယ်၍ မနေပါ။', 'ပြေးလွှားကစားကြသည်။', 'အားရပါးရ နွှဲပါဦး။'], englishLines: ['Sweaty sports event', 'Don’t stay away.', 'Run and play.', 'Enjoy it wholeheartedly.'], startIdx: 284 }, 
            ]}
        ];

        // State variables
        let currentChapterIndex = 0;
        let currentParagraphIndex = 0;
        let currentAudioEnd = 0;
        let isReadingFullParagraph = false;
        let audioInitialized = false;
        let touchStartX = 0;
        let touchStartY = 0; // Vertical start position ကို ထပ်ပေါင်းထည့်သည်။
        let correctGameSegmentIndex = -1;
        let gameAnswerRevealed = false;

        // DOM References
        const audioPlayer = byId('audioPlayer');
        const chapterNav = byId('chapterNav');
        const paragraphNav = byId('paragraphNav');
        const contentImage = byId('contentImage');
        const paragraphDisplay = byId('paragraphDisplay');
        const mainTitle = byId('mainTitle');
        const fullReadBtn = byId('fullReadBtn');
        const loadingIndicator = byId('loadingIndicator');
        const chapterImage = byId('chapterImage');
        const translationDisplay = byId('translationDisplay');
        const playIcon = byId('playIcon');
        const stopIcon = byId('stopIcon');
        const contentArea = byId('contentArea');
        // Game Modal References
        const gameBtn = byId('gameBtn');
        const gameModal = byId('gameModal');
        const gameModalContent = byId('gameModalContent');
        const playGameSoundBtn = byId('playGameSoundBtn');
        const gameOptions = byId('gameOptions');
        const gameResult = byId('gameResult');
        const closeGameBtn = byId('closeGameBtn');

        function getSegmentEnd(startIndex) {
            if (startIndex < AUDIO_SEGMENT_START_TIMES.length - 1) {
                return AUDIO_SEGMENT_START_TIMES[startIndex + 1];
            }
            return FINAL_AUDIO_END_TIME;
        }

        function setFullReadButtonState(reading) {
            isReadingFullParagraph = reading;
            if (reading) {
                fullReadBtn.classList.add('bg-red-500');
                fullReadBtn.classList.remove('bg-orange-500');
                playIcon.classList.add('hidden');
                stopIcon.classList.remove('hidden');
            } else {
                fullReadBtn.classList.remove('bg-red-500');
                fullReadBtn.classList.add('bg-orange-500');
                playIcon.classList.remove('hidden');
                stopIcon.classList.add('hidden');
            }
        }

        function stopAudio(force = false) {
             if (!audioPlayer.paused) {
                audioPlayer.pause();
                if (force) audioPlayer.currentTime = 0;
            }
            highlightLine(-1);
            currentAudioEnd = 0;
            translationDisplay.textContent = ''; 
            setFullReadButtonState(false);
        }

        function playSegment(segmentIndex, lineIndex, isGameSound = false) {
            // Forcefully stop any current playback to prevent overlap
            audioPlayer.pause();

            if (isReadingFullParagraph && !isGameSound) {
                stopAudio();
            }
            
            if (segmentIndex >= AUDIO_SEGMENT_START_TIMES.length) {
                console.warn(`Segment index ${segmentIndex} is out of bounds.`);
                return;
            }

            const startTime = AUDIO_SEGMENT_START_TIMES[segmentIndex];
            currentAudioEnd = getSegmentEnd(segmentIndex);
            
            if (!isGameSound) {
                const chapter = ALL_CONTENT[currentChapterIndex];
                const paragraph = chapter.paragraphs[currentParagraphIndex];
                if (lineIndex >= 0 && paragraph.englishLines && paragraph.englishLines[lineIndex]) {
                    translationDisplay.textContent = paragraph.englishLines[lineIndex];
                } else if (lineIndex === -2) {
                    translationDisplay.textContent = 'စာပိုဒ်ကို ဖတ်နေပါသည်...';
                }
                highlightLine(lineIndex);
            }

            audioPlayer.currentTime = startTime;
            audioPlayer.play().catch(e => console.error("Audio playback error:", e));
        }


        function highlightLine(lineIndex) {
            const lines = paragraphDisplay.children;
            for (let i = 0; i < lines.length; i++) {
                lines[i].classList.remove('highlighted-line');
            }
            if (lineIndex !== -1 && lines[lineIndex]) {
                lines[lineIndex].classList.add('highlighted-line');
                lines[lineIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
            }
        }

        function playPreviewSegment(segmentIndex, lineIndex) {
            // This function is simplified to only handle playback initiation and UI updates.
            // The waiting logic is handled by the caller.
            if (segmentIndex >= AUDIO_SEGMENT_START_TIMES.length || !isReadingFullParagraph) {
                return; 
            }
            audioPlayer.pause(); // Ensure no other sound is playing

            const startTime = AUDIO_SEGMENT_START_TIMES[segmentIndex];
            const endTime = getSegmentEnd(segmentIndex);
            
            highlightLine(lineIndex);
            const paragraph = ALL_CONTENT[currentChapterIndex].paragraphs[currentParagraphIndex];
            if (paragraph.englishLines && paragraph.englishLines[lineIndex]) {
                 translationDisplay.textContent = paragraph.englishLines[lineIndex];
            }

            currentAudioEnd = endTime; 
            
            audioPlayer.currentTime = startTime;
            audioPlayer.play().catch(e => {
                console.error("Playback error:", e);
            });
        }
        
        async function readFullParagraphWithPreview() {
            if (isReadingFullParagraph) {
                stopAudio();
                return;
            }

            setFullReadButtonState(true);
            const chapter = ALL_CONTENT[currentChapterIndex];
            const paragraph = chapter.paragraphs[currentParagraphIndex];
            
            try {
                for (let i = 0; i < paragraph.lines.length; i++) {
                    if (!isReadingFullParagraph) break;
                    const segmentIndex = paragraph.startIdx + i;
                    playPreviewSegment(segmentIndex, i);
                    
                    // Wait for the segment to finish based on its duration
                    const startTime = AUDIO_SEGMENT_START_TIMES[segmentIndex];
                    const endTime = getSegmentEnd(segmentIndex);
                    const durationMs = (endTime - startTime) * 1000;
                    await new Promise(r => setTimeout(r, durationMs + 100));
                }

                if (isReadingFullParagraph) {
                    const fullReadSegmentIndex = paragraph.startIdx + paragraph.lines.length;
                    playSegment(fullReadSegmentIndex, -2); 
                } else {
                    stopAudio();
                }

            } catch (error) {
                console.error("Error during full read preview:", error);
                stopAudio();
            }
        }
        
        function updateChapterImage() {
            const chapter = ALL_CONTENT[currentChapterIndex];
            const chapterImageUrl = `${IMAGE_BASE_URL}${chapter.imagePrefix}-00.jpg`;
            chapterImage.src = chapterImageUrl;
            chapterImage.onerror = () => {
                chapterImage.src = `https://placehold.co/400x150/f97316/ffffff?text=Chapter%20Image%20${chapter.imagePrefix}-00%20(Error)`;
            };
        }
        
        function navigateParagraph(direction) {
            stopAudio();
            const currentChapter = ALL_CONTENT[currentChapterIndex];
            const totalParagraphs = currentChapter.paragraphs.length;
            let newIndex = currentParagraphIndex + direction;

            if (newIndex >= 0 && newIndex < totalParagraphs) {
                currentParagraphIndex = newIndex;
                renderContent();
            } else {
                console.log("Reached chapter boundary.");
            }
        }

        function renderContent() {
            const chapter = ALL_CONTENT[currentChapterIndex];
            const paragraph = chapter.paragraphs[currentParagraphIndex];

            stopAudio();
            mainTitle.textContent = `အခန်း (${chapter.chapter})`;

            const paddedParagraphIndex = (currentParagraphIndex + 1).toString().padStart(2, '0');
            const imageUrl = `${IMAGE_BASE_URL}${chapter.imagePrefix}-${paddedParagraphIndex}.png`;
            contentImage.src = imageUrl;
            contentImage.onerror = () => {
                contentImage.src = `https://placehold.co/400x300/a855f7/ffffff?text=ပုံမရှိပါ%20${chapter.imagePrefix}-${paddedParagraphIndex}.png`;
            };

            paragraphDisplay.innerHTML = '';
            paragraph.lines.forEach((line, lineIndex) => {
                const p = document.createElement('p');
                p.textContent = line;
                p.className = 'paragraph-line p-3 rounded-xl text-gray-800 hover:bg-yellow-100 transition-all duration-200 shadow-sm'; 
                p.dataset.lineIndex = lineIndex;
                p.addEventListener('click', () => playSegment(paragraph.startIdx + lineIndex, lineIndex));
                paragraphDisplay.appendChild(p);
            });

            fullReadBtn.onclick = readFullParagraphWithPreview;
            renderParagraphNav();
            updateChapterImage();
            translationDisplay.textContent = '';
        }

        function renderChapterNav() {
            chapterNav.innerHTML = '';
            ALL_CONTENT.forEach((chapter, index) => {
                const btn = document.createElement('button');
                btn.textContent = `အခန်း ${chapter.chapter}`;
                btn.className = `p-2 rounded-lg text-sm font-semibold chapter-button ${index === currentChapterIndex ? 'active' : ''}`;
                btn.addEventListener('click', () => {
                    currentChapterIndex = index;
                    currentParagraphIndex = 0; 
                    renderContent();
                    renderChapterNav(); 
                });
                chapterNav.appendChild(btn);
            });
            updateChapterImage(); 
        }

        function renderParagraphNav() {
            paragraphNav.innerHTML = '';
            const chapter = ALL_CONTENT[currentChapterIndex];
            const burmeseNumerals = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
            const toBurmeseNumber = (n) => String(n).split('').map(digit => burmeseNumerals[parseInt(digit)]).join('');

            chapter.paragraphs.forEach((paragraph, index) => {
                const btn = document.createElement('button');
                btn.textContent = toBurmeseNumber(index + 1);
                btn.className = `py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${index === currentParagraphIndex ? 'bg-red-500 text-white shadow-xl hover:bg-red-600 transform scale-105' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-300'}`;
                btn.addEventListener('click', () => {
                    currentParagraphIndex = index;
                    renderContent();
                });
                paragraphNav.appendChild(btn);
            });
        }

        // --- GAME LOGIC ---
        function openGame() {
            stopAudio(true);
            gameModal.classList.add('visible');
            setupGame();
            setTimeout(() => playGameSoundBtn.click(), 400); // Auto-play sound after modal animation
        }

        function closeGame() {
            stopAudio(true);
            gameModal.classList.remove('visible');
        }

        function setupGame() {
            gameAnswerRevealed = false;
            gameResult.textContent = '';
            gameOptions.innerHTML = '';
            
            const chapter = ALL_CONTENT[currentChapterIndex];
            let allLines = chapter.paragraphs.flatMap(p => 
                p.lines.map((line, lineIndex) => ({ text: line, segmentIndex: p.startIdx + lineIndex }))
            );

            // Fisher-Yates shuffle
            for (let i = allLines.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allLines[i], allLines[j]] = [allLines[j], allLines[i]];
            }
            
            const selectedOptions = allLines.slice(0, 3);
            
            if (selectedOptions.length < 3) {
                gameOptions.innerHTML = '<p>ဂိမ်းအတွက် စာကြောင်း မလုံလောက်ပါ။</p>';
                playGameSoundBtn.disabled = true;
                return;
            }
            playGameSoundBtn.disabled = false;

            correctGameSegmentIndex = selectedOptions[Math.floor(Math.random() * 3)].segmentIndex;
            
            selectedOptions.sort(() => 0.5 - Math.random());
            
            selectedOptions.forEach(option => {
                const btn = document.createElement('button');
                btn.textContent = option.text;
                btn.className = 'game-option-btn w-full text-left p-4 rounded-lg text-lg font-medium';
                btn.dataset.segmentIndex = option.segmentIndex;
                btn.addEventListener('click', checkGameAnswer);
                gameOptions.appendChild(btn);
            });

            playGameSoundBtn.onclick = () => playSegment(correctGameSegmentIndex, -1, true);
        }

        function checkGameAnswer(event) {
            const selectedBtn = event.currentTarget;
            const allBtns = gameOptions.querySelectorAll('button');
            const selectedSegmentIndex = parseInt(selectedBtn.dataset.segmentIndex);

            if (selectedSegmentIndex === correctGameSegmentIndex) {
                // This block is entered if the correct button is clicked,
                // either on the first try or after making a mistake.
                if (!gameAnswerRevealed) { // First try correct
                    gameResult.textContent = 'မှန်ပါတယ်! 🎉';
                    gameResult.className = 'min-h-[3rem] mb-4 text-3xl font-bold text-green-600';
                }
                
                selectedBtn.classList.add('correct');
                allBtns.forEach(b => { 
                    b.disabled = true;
                    b.classList.remove('incorrect'); // Clean up styles
                });
                
                // Auto advance to next question
                setTimeout(() => {
                    setupGame();
                    setTimeout(() => playGameSoundBtn.click(), 100);
                }, 1500);

            } else { // Incorrect guess
                selectedBtn.classList.add('incorrect');
                selectedBtn.disabled = true; // Disable the wrong option
                
                if (!gameAnswerRevealed) {
                    gameAnswerRevealed = true;
                    gameResult.textContent = 'မှားပါတယ်... 🙁 မှန်တာကိုနှိပ်ပါ';
                    gameResult.className = 'min-h-[3rem] mb-4 text-2xl font-bold text-red-600';
                    const correctBtn = gameOptions.querySelector(`[data-segment-index='${correctGameSegmentIndex}']`);
                    if (correctBtn) correctBtn.classList.add('correct');
                }
            }
        }
        
        gameBtn.addEventListener('click', openGame);
        closeGameBtn.addEventListener('click', closeGame);

        // --- END GAME LOGIC ---

        audioPlayer.addEventListener('timeupdate', () => {
            if (currentAudioEnd > 0 && audioPlayer.currentTime >= currentAudioEnd - 0.15) {
                audioPlayer.pause();
                currentAudioEnd = 0;
                if (!isReadingFullParagraph) {
                    highlightLine(-1);
                    translationDisplay.textContent = '';
                }
            } 
        });
        
        // ** UPDATED SWIPE LOGIC **

        contentArea.addEventListener('touchstart', (e) => {
             if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY; // Y နေရာကို မှတ်သားထားသည်။
            }
        }, { passive: true });

        contentArea.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY; // Y နေရာကို မှတ်သားထားသည်။
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY; 

            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // horizontal swipe က threshold ထက် ကျော်ပြီး၊ vertical movement ထက် ၂ ဆ ပိုများမှသာ အလုပ်လုပ်မည်။
            if (absDeltaX > SWIPE_THRESHOLD && absDeltaX > absDeltaY * VERTICAL_TOLERANCE_RATIO) {
                if (deltaX > 0) {
                    navigateParagraph(-1); // Swipe right (to previous)
                } else {
                    navigateParagraph(1);  // Swipe left (to next)
                }
            }

            // Reset state variables after touch sequence ends
            touchStartX = 0;
            touchStartY = 0;
        });
        
        // ** END UPDATED SWIPE LOGIC **

        function initializeAudio() {
            if (audioInitialized) return;
            // Try to play a silent bit of audio to unlock it on mobile
            audioPlayer.play().then(() => {
                audioPlayer.pause();
                console.log("Audio permissions granted.");
                audioInitialized = true;
                loadingIndicator.classList.add('hidden');
            }).catch(e => {
                console.warn("Audio autoplay failed, user interaction is required.");
                byId('loader').classList.add('hidden');
                byId('startButtonContainer').classList.remove('hidden');
            });
        }

        function initApp() {
            renderChapterNav();
            renderContent();
            setFullReadButtonState(false);
            
            // Try initializing audio immediately
            initializeAudio();

            // Fallback for browsers that are very strict
            setTimeout(() => {
                 if (!audioInitialized) {
                    console.warn("Audio not ready, showing start button as fallback.");
                    byId('loader').classList.add('hidden');
                    byId('startButtonContainer').classList.remove('hidden');
                 }
            }, 2500);

            byId('startButton').addEventListener('click', () => {
                 audioPlayer.play();
                 audioPlayer.pause();
                 audioInitialized = true;
                 loadingIndicator.classList.add('hidden');
            });
        }

        initApp();

    return () => {};
  }, []);

  return (
    <>
      <style>{P1B_APP_CSS}</style>
      <div
        ref={containerRef}
        className="p1b-app-root min-h-screen flex flex-col"
        dangerouslySetInnerHTML={{ __html: P1B_APP_BODY_HTML }}
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
              <h2 className="text-xl font-bold text-gray-800">🏫 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
