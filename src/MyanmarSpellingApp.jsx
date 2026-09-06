import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "မြန်မာစာလုံးဖတ်အက်ပ်" (Myanmar Spelling)
// HTML app ──
// Same hybrid approach as the other ported apps in this project: the
// original vanilla JS (DOM manipulation, Web Audio playback, drag handling)
// is kept almost unchanged inside a React wrapper instead of being
// rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. This app has no
// onclick="..." string attributes at all (it wires everything via
// addEventListener), so no window bridge object is needed here. The
// original page's one document.body.appendChild (a flying-dove animation)
// now appends to this component's own root element instead.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .ms-app-root so it doesn't leak onto the rest of the SPA, since every app
// stays mounted simultaneously (just hidden via CSS) per App.jsx's design.

const MS_ROSTER_PATH = 'artifacts/myanmar-spelling-app/public/data/roster';
const sanitizeMsKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const MS_APP_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap');
        :root {
            --primary-color: #4f46e5;
            --secondary-color: #ec4899;
            --accent-color: #10b981;
            --background-color: #1f2937;
            --card-color: #374151;
            --highlight-color: #38bdf8;
        }
        .ms-app-root {
            font-family: 'Padauk', sans-serif;
            background-color: var(--background-color);
            color: white;
            min-height: 100vh;
        }
        .char-box {
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s;
            cursor: pointer;
        }
        .char-box:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.5);
        }
        .vowel-syllable-btn.highlight-active {
            outline: 4px solid var(--highlight-color);
            box-shadow: 0 0 15px var(--highlight-color), 0 4px 10px rgba(0, 0, 0, 0.5);
            transform: scale(1.02);
        }
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100;
        }
        .consonant-group-btn {
            @apply p-2 rounded-lg text-white font-bold text-lg text-center cursor-pointer shadow-md transition-all duration-200 hover:scale-105;
        }
        .consonant-group-btn.active, .onset-btn.active {
            background-color: var(--highlight-color) !important;
            color: #111827 !important;
            box-shadow: 0 0 0 2px white, 0 4px 10px rgba(0,0,0,0.3) !important;
            transform: scale(1.1) !important;
            z-index: 10;
        }
        
        .onset-scroller, .keyboard-scroller {
            display: flex;
            overflow-x: auto;
            padding-bottom: 12px;
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color) var(--card-color);
            -ms-overflow-style: none;
        }
        .onset-scroller::-webkit-scrollbar, .keyboard-scroller::-webkit-scrollbar { height: 8px; }
        .onset-scroller::-webkit-scrollbar-track, .keyboard-scroller::-webkit-scrollbar-track { background: var(--card-color); border-radius: 4px; }
        .onset-scroller::-webkit-scrollbar-thumb, .keyboard-scroller::-webkit-scrollbar-thumb { background-color: var(--primary-color); border-radius: 4px; }
        .onset-btn, .keyboard-btn {
            flex-shrink: 0;
            height: 50px;
            margin-right: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 10px;
            font-size: 1.5rem;
        }
        .onset-btn { width: 50px; }
        .keyboard-btn { min-width: 50px; padding: 0 12px; user-select: none; }

        .highlight-syllable {
            background-color: var(--highlight-color); 
            color: var(--background-color); 
            border-radius: 4px;
            padding: 2px 4px;
            margin: 0 -4px;
            display: inline-block;
            transition: background-color 0.1s;
            font-weight: 700;
        }
        #highlight-area {
            height: 12rem;
            line-height: 1.5;
            white-space: pre-wrap;
            overflow-y: auto;
            word-wrap: break-word;
            box-sizing: border-box;
            font-family: 'Padauk', sans-serif;
        }
        
        #loading-content {
            background-color: #4f46e5;
            color: white;
            border-radius: 12px;
            padding: 1.5rem 3rem;
            font-weight: bold;
            text-shadow: 0 1px 1px rgba(0,0,0,0.3);
            box-shadow: 0 6px 0 #3730a3, 0 8px 15px rgba(0,0,0,0.4);
            transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
            transform: translateY(-4px);
        }
        #loading-content:hover {
            transform: translateY(-6px);
            box-shadow: 0 8px 0 #3730a3, 0 10px 20px rgba(0,0,0,0.3);
        }
        #loading-content:active {
            transform: translateY(0px);
            box-shadow: 0 2px 0 #3730a3, 0 4px 8px rgba(0,0,0,0.3);
        }

        /* Prevent text selection on draggable icon */
        .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        /* Practice Target Highlight - Intensive Flash */
        .practice-highlight {
            outline: 6px solid #fde047 !important;
            box-shadow: 0 0 25px #facc15, inset 0 0 10px rgba(0,0,0,0.3) !important;
            z-index: 50;
            animation: intenseFlash 0.5s infinite alternate !important;
            transform: scale(1.15) !important;
        }
        @keyframes intenseFlash {
            0% { box-shadow: 0 0 25px #facc15; transform: scale(1.15); background-color: #facc15; color: #111827; border-color: #facc15; }
            100% { box-shadow: 0 0 50px #ef4444, 0 0 20px #fff; transform: scale(1.25); background-color: #ef4444; color: #fff; outline-color: #ef4444; }
        }

        #pointer-finger {
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        }

        .syllable-practice-active {
            outline: 4px solid #facc15 !important;
            box-shadow: 0 0 20px #facc15, 0 4px 10px rgba(0,0,0,0.5) !important;
            transform: scale(1.1) !important;
            z-index: 20;
            filter: brightness(1.2);
        }
`;

const MS_APP_BODY_HTML = `

    <div id="loading-overlay" class="loading-overlay cursor-pointer hidden">
        <div id="loading-content" class="text-center">
            <svg id="loading-spinner" class="animate-spin h-8 w-8 text-white mx-auto mb-3 hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p id="loading-message" class="text-xl font-bold"></p>
        </div>
    </div>
    
    <!-- Floating Practice Score -->
    <div id="practice-score" class="fixed top-4 right-4 text-2xl sm:text-3xl font-bold bg-gray-800/90 backdrop-blur px-5 py-3 rounded-full shadow-lg z-50 border-2 border-yellow-500 text-white transition-transform hidden">
        🏆 <span id="score-val" class="ml-2 text-yellow-400">0</span>
    </div>
    <div id="vowel-syllables" class="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4 border-t border-gray-600 pt-4"></div>
    <div id="main-content" class="max-w-5xl mx-auto bg-gray-700 p-6 rounded-3xl shadow-2xl relative">
        
        <div id="syllable-sets-container" class="flex flex-wrap gap-2 mb-3 justify-start sm:justify-center px-2"></div>
        <div id="consonant-groups" class="p-4 bg-gray-800 rounded-2xl shadow-inner mb-6">
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div class="consonant-group-btn bg-red-600 active" data-group-index="0" data-group-color="red">က,ခ,ဂ,...</div>
                <div class="consonant-group-btn bg-orange-600" data-group-index="1" data-group-color="orange">ကျ,ကြ,ချ,...</div>
                <div class="consonant-group-btn bg-yellow-600" data-group-index="2" data-group-color="yellow">ကွ,ခွ,ဂွ,...</div>
                <div class="consonant-group-btn bg-lime-600" data-group-index="3" data-group-color="lime">ငှ,ညှ,နှ,...</div>
                <div class="consonant-group-btn bg-green-600" data-group-index="4" data-group-color="green">ကျွ,ကြွ,မြွ...</div>
                <div class="consonant-group-btn bg-cyan-600" data-group-index="5" data-group-color="cyan">မျှ,မြှ,လျှ</div>
                <div class="consonant-group-btn bg-blue-600" data-group-index="6" data-group-color="blue">ညွှ,နွှ,မွှ,...</div>
            </div>
        </div>

        

        <div id="quick-buttons-container" class="p-4 bg-gray-800 rounded-2xl shadow-inner relative">
            
            <div class="flex items-center mb-4">
                <div id="sticky-onset-controls" class="flex-shrink-0 flex items-center pr-2 bg-gray-800 z-10"></div>
                <div class="relative flex-grow flex overflow-hidden">
                    <button id="onset-scroll-left" class="absolute left-0 top-0 bottom-[12px] z-10 w-8 bg-gradient-to-r from-gray-800 via-gray-800/80 to-transparent hidden justify-start items-center text-white cursor-pointer"><svg class="w-6 h-6 bg-gray-600 rounded-full shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
                    <div id="onset-scroller" class="onset-scroller flex-grow w-full scroll-smooth"></div>
                    <button id="onset-scroll-right" class="absolute right-0 top-0 bottom-[12px] z-10 w-8 bg-gradient-to-l from-gray-800 via-gray-800/80 to-transparent hidden justify-end items-center text-white cursor-pointer"><svg class="w-6 h-6 bg-gray-600 rounded-full shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
                </div>
            </div>
            
            <div id="virtual-keyboard-area" class="border-t border-gray-600 pt-2 flex items-center">
                <button id="read-all-text-btn" title="Read all" class="flex-shrink-0 mr-4 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg transition-colors shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                    </svg>
                </button>
                
                <div class="relative flex-grow flex overflow-hidden">
                    <button id="keyboard-scroll-left" class="absolute left-0 top-0 bottom-[12px] z-10 w-8 bg-gradient-to-r from-gray-800 via-gray-800/80 to-transparent hidden justify-start items-center text-white cursor-pointer"><svg class="w-6 h-6 bg-gray-600 rounded-full shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
                    <div id="keyboard-scroller" class="keyboard-scroller flex-grow w-full scroll-smooth"></div>
                    <button id="keyboard-scroll-right" class="absolute right-0 top-0 bottom-[12px] z-10 w-8 bg-gradient-to-l from-gray-800 via-gray-800/80 to-transparent hidden justify-end items-center text-white cursor-pointer"><svg class="w-6 h-6 bg-gray-600 rounded-full shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
                </div>
            </div>
        </div>
        <div class="mt-6 relative">
            <div id="highlight-area" class="w-full min-h-48 p-3 bg-gray-800 border-2 border-indigo-500 rounded-lg text-white text-xl whitespace-pre-wrap overflow-y-auto hidden" style="height: 12rem;"></div>
            <textarea id="chat-input" class="w-full min-h-48 p-3 bg-gray-800 border-2 border-indigo-500 rounded-lg text-white text-xl resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/50 placeholder-gray-500" placeholder="စာရိုက်ထည့်ရန်..." style="height: 12rem;"></textarea>
        </div>

    </div>

    <!-- Draggable Floating Keyboard/Practice Toggle Button -->
    <div id="floating-kb-btn" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-pink-500 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.6)] flex justify-center items-center text-3xl cursor-pointer z-[100] text-white no-select transition-all hover:scale-110 active:scale-95" style="touch-action: none;" title="စာရိုက်လေ့ကျင့်ရန်">
        ⌨
    </div>

    <!-- Trophy Overlay -->
    <div id="trophy-overlay" class="fixed inset-0 flex items-center justify-center z-[300] pointer-events-none hidden transition-all duration-1000 opacity-0 scale-50">
        <div class="text-[12rem] sm:text-[18rem] drop-shadow-[0_20px_50px_rgba(250,204,21,0.8)] animate-bounce">🏆</div>
    </div>

    <!-- Big Pointing Finger for Practice Hint -->
    <div id="pointer-finger" class="fixed z-[350] text-[5rem] hidden drop-shadow-2xl animate-bounce" style="text-shadow: 0 10px 20px rgba(0,0,0,0.5);">
        👇
    </div>

`;

export default function MyanmarSpellingApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, MS_ROSTER_PATH, sanitizeMsKey(studentName));
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
    const unsub = onSnapshot(collection(db, MS_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Spelling roster listen error:', e));
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

        let audioContext = null; 
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioContext = new AudioContext();
            }
        } catch(e) {
            console.error("Failed to initialize AudioContext immediately:", e);
        }

        let isAudioInitialized = false; 
        let playbackInProgress = false; 
        let currentTypingSource = null; 
        let level1Buffer = null;
        let level2Buffer = null;
        let currentOnset = 'အ';
        let currentSetIndex = 0; 
        const loadedBuffers = {};
        
        // Interrupt logic counter for smooth typing
        let globalPlaySeq = 0;
        let freeTypingTimeout = null;

        // Practice Mode State
        let isPracticeMode = false;
        let practiceSyllables = [];
        let currentPracSyllableIdx = 0;
        let practiceSequence = [];
        let currentPracStepIdx = 0;
        let practiceStartIndex = 0;
        let practiceScore = 0;
        let pointerHintTimeout = null; // Timeout for showing the finger hint

        const AUDIO_URLS = {
            level1: 'https://raw.githubusercontent.com/nathantun93/bell/main/Level1All.mp3',
            level2: 'https://raw.githubusercontent.com/nathantun93/bell/main/Level2All.mp3'
        };
        
        const EXCLUDED_PRACTICE_CHARS = ['၏','ဤ','ဥ','ဦ','ဦး','ဧ','ဪ','ဩ'];
        
        const KILLER_MARK = '\u103a'; 
        const PRE_VOWEL_E = '\u1031'; 
        const TALL_AA = '\u102B';     
        const VIRTUAL_KEYBOARD_CHARS = [
            'space', 'ာ','ါ','ိ','ီ','ု','ူ','ေ','ဲ','်','ံ','း','့','ျ','ြ','ွ','ှ',
            'backspace','င်','က်','စ်','ည်','ဉ်','တ်','န်','ပ်','မ်','ယ်','ဣ','၏','ဤ','ဥ','ဦ','ဦး','ဧ','ဧည့်','ဩ','ဪ'
        ];
        
        const SYLLABLE_SETS = [
            ["အ","အာ","အိ","အီ","အု","အူ","အေ","အဲ","အော","အော်","အံ","အို"],
            ["အ","အာ","အား"],
            ["အိ","အီ","အီး","၏","ဤ","အည့်","အည်","အည်း"],
            ["အု","အူ","အူး","ဥ","ဦ","ဦး"],
            ["အေ့","အေ","အေး","ဧ","အည့်","အည်","အည်း"],
            ["အဲ့","အယ်","အဲ","အည့်","အည်","အည်း"],
            ["အော့","အော်","အော","ဪ","ဩ"],
            ["အံ့","အံ","အန့်","အန်","အန်း","အမ့်","အမ်","အမ်း"],
            ["အို့","အို","အိုး","ကိုယ့်","ကိုယ်"],
            ["အင်","အောင်","အိုင်"],
            ["အင့်","အင်","အင်း","အဉ့်","အဉ်","အဉ်း"],
            ["အောင့်","အောင်","အောင်း"],
            ["အိုင့်","အိုင်","အိုင်း"],
            ["အန်","အိန်","အုန်","အွန်"],
            ["အိန့်","အိန်","အိန်း","အိမ့်","အိမ်","အိမ်း"],
            ["အုန့်","အုန်","အုန်း","အုံ့","အုံ","အုံး"],
            ["အွန့်","အွန်","အွန်း","အွမ့်","အွမ်","အွမ်း"],
            ["အက်","အောက်","အိုက်","အစ်"],
            ["အတ်","အိတ်","အုတ်","အွတ်"],
            ["အပ်","အိပ်","အုပ်","အွပ်"]
        ];

        const ONSET_ROMAN_MAP = {
            'က':'k', 'ခ':'kh', 'ဂ':'g', 'ဃ':'gh', 'င':'ng', 'စ':'s', 'ဆ':'hs', 'ဇ':'z', 'ဈ':'zh', 'ည':'ny', 'ဋ':'t', 'ဌ':'ht', 'ဍ':'d', 'ဎ':'dh', 'ဏ':'n', 'တ':'t', 'ထ':'ht', 'ဒ':'d', 'ဓ':'dh', 'န':'n', 'ပ':'p', 'ဖ':'hp', 'ဗ':'b', 'ဘ':'bh', 'မ':'m', 'ယ':'y', 'ရ':'y', 'လ':'l', 'ဝ':'w', 'သ':'th', 'ဟ':'h', 'ဠ':'l', 'အ':'',
            'ကျ':'ky', 'ကြ':'ky', 'ချ':'ch', 'ခြ':'ch', 'ဂျ':'gy', 'ဂြ':'gy', 'ငြ':'ny', 'ပျ':'py', 'ပြ':'py', 'ဖျ':'hpy', 'ဖြ':'hpy', 'ဗျ':'by', 'မျ':'my', 'မြ':'my', 'ယျ':'y', 'လျ':'ly', 'သျ':'sh', 'တြ':'tr', 'ဒြ':'dr',
            'ကွ':'kw', 'ခွ':'khw', 'ဂွ':'gw', 'ငွ':'ngw', 'စွ':'sw', 'ဆွ':'hsw', 'ဇွ':'zw', 'တွ':'tw', 'ထွ':'htw', 'ဒွ':'dw', 'ဓွ':'dhw', 'နွ':'nw', 'ပွ':'pw', 'ဖွ':'hpw', 'ဗွ':'bw', 'ဘွ':'bhw', 'မွ':'mw', 'ယွ':'yw', 'ရွ':'yw', 'လွ':'lw', 'သွ':'thw', 'ဟွ':'hw',
            'ငှ':'hng', 'ညှ':'hny', 'နှ':'hn', 'မှ':'hm', 'ယှ':'sh', 'ရှ':'sh', 'လှ':'hl', 'ဝှ':'hw',
            'ကျွ':'kyw', 'ကြွ':'kyw', 'ချွ':'chw', 'ဂျွ':'gyw', 'ပျွ':'pyw', 'ပြွ':'pyw', 'မြွ':'myw',
            'မျှ':'hmy', 'မြှ':'hmy', 'လျှ':'sh',
            'ညွှ':'hnyw', 'နွှ':'hnw', 'မွှ':'hmw', 'ရွှ':'shw', 'လွှ':'hlw'
        };

        const RHYME_ROMAN_MAP = {
            "အ":"a", "အာ":"ar", "အား":"arr", "အိ":"i", "အီ":"ee", "အီး":"ee", "၏":"i", "ဤ":"ee", "အု":"u", "အူ":"uu", "အူး":"uu", "ဥ":"u", "ဦ":"uu", "ဦး":"uu", "အေ့":"ay", "အေ":"ay", "အေး":"ay", "ဧ":"ay", "အဲ့":"ell", "အယ်":"ell", "အဲ":"ell", "အော့":"aw", "အော်":"aw", "အော":"aw", "ဪ":"aw", "ဩ":"aw", "အံ":"an", "အံ့":"an", "အန့်":"ant", "အန်":"an", "အန်း":"an", "အမ့်":"amt", "အမ်":"am", "အမ်း":"am", "အို့":"o", "အို":"o", "အိုး":"o", "ကိုယ့်":"o", "ကိုယ်":"o", "အင်":"in", "အောင်":"aung", "အိုင်":"aing", "အင့်":"int", "အင်း":"in", "အဉ့်":"int", "အဉ်":"in", "အဉ်း":"in", "အောင့်":"aung", "အောင်း":"aung", "အိုင့်":"aing", "အိုင်း":"aing", "အိန်":"ein", "အုန်":"on", "အွန်":"un", "အိန့်":"eint", "အိန်း":"ein", "အိမ့်":"eimt", "အိမ်":"eim", "အိမ်း":"eim", "အုန့်":"ont", "အုန်း":"on", "အုံ့":"ont", "အုံ":"on", "အုံး":"on", "အွန့်":"unt", "အွန်း":"un", "အွမ့်":"umt", "အွမ်":"um", "အွမ်း":"um", "အက်":"et", "အောက်":"auk", "အိုက်":"aik", "အစ်":"it", "အတ်":"at", "အိတ်":"eit", "အုတ်":"ok", "အွတ်":"ut", "အပ်":"ap", "အိပ်":"eip", "အုပ်":"op", "အွပ်":"up"
        };

        function getRhymeRoman(pattern, setIndex) {
            if (pattern === 'အည့်' || pattern === 'အည်' || pattern === 'အည်း') {
                if (setIndex === 2) return 'i';
                if (setIndex === 4) return 'e';
                if (setIndex === 5) return 'ai';
                return 'i';
            }
            return RHYME_ROMAN_MAP[pattern] || '';
        }

        const VALID_YI_GROUP1 = ['စ', 'ည', 'န', 'မ', 'သ', 'ကျ','ကြ', 'ချ', 'ဗျ']; 
        const VALID_YI_GROUP2 = ['ပြ', 'ရ', 'ဖြ', 'ရှ']; 
        const VALID_YI_GROUP3 = ['ဆ', 'တ', 'ထ', 'န', 'မ', 'လ', 'လှ', 'သ']; 
        const VALID_YIN_GROUP = ['စ', 'ဇ', 'ည','ကျ',  'ချ', 'ပျ', 'ဖျ', 'မျ', 'ရှ', 'ယျာ', 'ယျ']; 

        const CONSONANT_GROUPS_DATA = [
            ['က','ခ','ဂ','ဃ','င','စ','ဆ','ဇ','ဈ','ည','တ','ထ','ဒ','ဓ','န','ပ','ဖ','ဗ','ဘ','မ','ယ','ရ','လ','ဝ','သ','ဟ','အ','ဋ','ဌ','ဍ','ဎ','ဏ', 'ဠ'],
            ['ကျ','ကြ','ချ','ခြ','ဂျ','ဂြ','ငြ','ပျ','ပြ','ဖျ','ဖြ','ဗျ','မျ','မြ','ယျ','လျ','သျ','တြ','ဒြ'],
            ['ကွ','ခွ','ဂွ','ငွ','စွ','ဆွ','ဇွ','တွ','ထွ','ဒွ','ဓွ','နွ','ပွ','ဖွ','ဗွ','ဘွ','မွ','ယွ','ရွ','လွ','သွ','ဟွ'],
            ['ငှ','ညှ','နှ','မှ','ယှ','ရှ','လှ','ဝှ'],
            ['ကျွ','ကြွ','ချွ','ဂျွ','ပျွ','ပြွ','မြွ'],
            ['မျှ','မြှ','လျှ'],
            ['ညွှ','နွှ','မွှ','ရွှ','လွှ']
        ];
        
        const level1Map = {'က':0,'ကာ':1,'ကား':2,'ကိ':3,'ကီ':4,'ကီး':5,'ကု':6,'ကူ':7,'ကူး':8,'ကေ့':9,'ကေ':10,'ကေး':11,'ကဲ့':12,'ကယ်':13,'ကဲ':14,'ကော့':15,'ကော်':16,'ကော':17,'ကန့်':18,'ကန်':19,'ကန်း':20,'ကို့':21,'ကို':22,'ကိုး':23,'ခ':24,'ခါ':25,'ခါး':26,'ခိ':27,'ခီ':28,'ခီး':29,'ခု':30,'ခူ':31,'ခူး':32,'ခေ့':33,'ခေ':34,'ခေး':35,'ခဲ့':36,'ခယ်':37,'ခဲ':38,'ခေါ့':39,'ခေါ်':40,'ခေါ':41,'ခန့်':42,'ခန်':43,'ခန်း':44,'ခို့':45,'ခို':46,'ခိုး':47,'ဂ':48,'ဂါ':49,'ဂါး':50,'ဂိ':51,'ဂီ':52,'ဂီး':53,'ဂု':54,'ဂူ':55,'ဂူး':56,'ဂေ့':57,'ဂေ':58,'ဂေး':59,'ဂဲ့':60,'ဂယ်':61,'ဂဲ':62,'ဂေါ့':63,'ဂေါ်':64,'ဂေါ':65,'ဂန့်':66,'ဂန်':67,'ဂန်း':68,'ဂို့':69,'ဂို':70,'ဂိုး':71,'င':72,'ငါ':73,'ငါး':74,'ငိ':75,'ငီ':76,'ငီး':77,'ငု':78,'ငူ':79,'ငူး':80,'ငေ့':81,'ငေ':82,'ငေး':83,'ငဲ့':84,'ငယ်':85,'ငဲ':86,'ငေါ့':87,'ငေါ်':88,'ငေါ':89,'ငန့်':90,'ငန်':91,'ငန်း':92,'ငို့':93,'ငို':94,'ငိုး':95,'စ':96,'စာ':97,'စား':98,'စိ':99,'စီ':100,'စီး':101,'စု':102,'စူ':103,'စူး':104,'စေ့':105,'စေ':106,'စေး':107,'စဲ့':108,'စယ်':109,'စဲ':110,'စော့':111,'စော်':112,'စော':113,'စန့်':114,'စန်':115,'စန်း':116,'စို့':117,'စို':118,'စိုး':119,'ဇ':120,'ဇာ':121,'ဇား':122,'ဇိ':123,'ဇီ':124,'ဇီး':125,'ဇု':126,'ဇူ':127,'ဇူး':128,'ဇေ့':129,'ဇေ':130,'ဇေး':131,'ဇဲ့':132,'ဇယ်':133,'ဇဲ':134,'ဇော့':135,'ဇော်':136,'ဇော':137,'ဇန့်':138,'ဇန်':139,'ဇန်း':140,'ဇို့':141,'ဇို':142,'ဇိုး':143,'ည':144,'ညာ':145,'ညား':146,'ညိ':147,'ညီ':148,'ညီး':149,'ညု':150,'ညူ':151,'ညူး':152,'ညေ့':153,'ညေ':154,'ညေး':155,'ညဲ့':156,'ညယ်':157,'ညဲ':158,'ညော့':159,'ညော်':160,'ညော':161,'ညန့်':162,'ညန်':163,'ညန်း':164,'ညို့':165,'ညို':166,'ညိုး':167,'တ':168,'တာ':169,'တား':170,'တိ':171,'တီ':172,'တီး':173,'တု':174,'တူ':175,'တူး':176,'တေ့':177,'တေ':178,'တေး':179,'တဲ့':180,'တယ်':181,'တဲ':182,'တော့':183,'တော်':184,'တော':185,'တန့်':186,'တန်':187,'တန်း':188,'တို့':189,'တို':190,'တိုး':191,'ထ':192,'ထာ':193,'ထား':194,'ထိ':195,'ထီ':196,'ထီး':197,'ထု':198,'ထူ':199,'ထူး':200,'ထေ့':201,'ထေ':202,'ထေး':203,'ထဲ့':204,'ထယ်':205,'ထဲ':206,'ထော့':207,'ထော်':208,'ထော':209,'ထန့်':210,'ထန်':211,'ထန်း':212,'ထို့':213,'ထို':214,'ထိုး':215,'ဒ':216,'ဒါ':217,'ဒါး':218,'ဒိ':219,'ဒီ':220,'ဒီး':221,'ဒု':222,'ဒူ':223,'ဒူး':224,'ဒေ့':225,'ဒေ':226,'ဒေး':227,'ဒဲ့':228,'ဒယ်':229,'ဒဲ':230,'ဒေါ့':231,'ဒေါ်':232,'ဒေါ':233,'ဒန့်':234,'ဒန်':235,'ဒန်း':236,'ဒို့':237,'ဒို':238,'ဒိုး':239,'န':240,'နာ':241,'နား':242,'နိ':243,'နီ':244,'နီး':245,'နု':246,'နူ':247,'နူး':248,'နေ့':249,'နေ':250,'နေး':251,'နဲ့':252,'နယ်':253,'နဲ':254,'နော့':255,'နော်':256,'နော':257,'နန့်':258,'နန်':259,'နန်း':260,'နို့':261,'နို':262,'နိုး':263,'ပ':264,'ပါ':265,'ပါး':266,'ပိ':267,'ပီ':268,'ပီး':269,'ပု':270,'ပူ':271,'ပူး':272,'ပေ့':273,'ပေ':274,'ပေး':275,'ပဲ့':276,'ပယ်':277,'ပဲ':278,'ပေါ့':279,'ပေါ်':280,'ပေါ':281,'ပန့်':282,'ပန်':283,'ပန်း':284,'ပို့':285,'ပို':286,'ပိုး':287,'ဖ':288,'ဖာ':289,'ဖား':290,'ဖိ':291,'ဖီ':292,'ဖီး':293,'ဖု':294,'ဖူ':295,'ဖူး':296,'ဖေ့':297,'ဖေ':298,'ဖေး':299,'ဖဲ့':300,'ဖယ်':301,'ဖဲ':302,'ဖော့':303,'ဖော်':304,'ဖော':305,'ဖန့်':306,'ဖန်':307,'ဖန်း':308,'ဖို့':309,'ဖို':310,'ဖိုး':311,'ဗ':312,'ဗာ':313,'ဗား':314,'ဗိ':315,'ဗီ':316,'ဗီး':317,'ဗု':318,'ဗူ':319,'ဗူး':320,'ဗေ့':321,'ဗေ':322,'ဗေး':323,'ဗဲ့':324,'ဗယ်':325,'ဗဲ':326,'ဗော့':327,'ဗော်':328,'ဗော':329,'ဗန့်':330,'ဗန်':331,'ဗန်း':332,'ဗို့':333,'ဗို':334,'ဗိုး':335,'မ':336,'မာ':337,'မား':338,'မိ':339,'မီ':340,'မီး':341,'မု':342,'မူ':343,'မူး':344,'မေ့':345,'မေ':346,'မေး':347,'မဲ့':348,'မယ်':349,'မဲ':350,'မော့':351,'မော်':352,'မော':353,'မန့်':354,'မန်':355,'မန်း':356,'မို့':357,'မို':358,'မိုး':359,'ယ':360,'ယာ':361,'ယား':362,'ယိ':363,'ယီ':364,'ယီး':365,'ယု':366,'ယူ':367,'ယူး':368,'ယေ့':369,'ယေ':370,'ယေး':371,'ယဲ့':372,'ယယ်':373,'ယဲ':374,'ယော့':375,'ယော်':376,'ယော':377,'ယန့်':378,'ယန်':379,'ယန်း':380,'ယို့':381,'ယို':382,'ယိုး':383,'ရ':384,'ရာ':385,'ရား':386,'ရိ':387,'ရီ':388,'ရီး':389,'ရု':390,'ရူ':391,'ရူး':392,'ရေ့':393,'ရေ':394,'ရေး':395,'ရဲ့':396,'ရယ်':397,'ရဲ':398,'ရော့':399,'ရော်':400,'ရော':401,'ရန့်':402,'ရန်':403,'ရန်း':404,'ရို့':405,'ရို':406,'ရိုး':407,'လ':408,'လာ':409,'လား':410,'လိ':411,'လီ':412,'လီး':413,'လု':414,'လူ':415,'လူး':416,'လေ့':417,'လေ':418,'လေး':419,'လဲ့':420,'လယ်':421,'လဲ':422,'လော့':423,'လော်':424,'လော':425,'လန့်':426,'လန်':427,'လန်း':428,'လို့':429,'လို':430,'လိုး':431,'ဝ':432,'ဝါ':433,'ဝါး':434,'ဝိ':435,'ဝီ':436,'ဝီး':437,'ဝု':438,'ဝူ':439,'ဝူး':440,'ဝေ့':441,'ဝေ':442,'ဝေး':443,'ဝဲ့':444,'ဝယ်':445,'ဝဲ':446,'ဝေါ့':447,'ဝေါ်':448,'ဝေါ':449,'ဝန့်':450,'ဝန်':451,'ဝန်း':452,'ဝို့':453,'ဝို':454,'ဝိုး':455,'သ':456,'သာ':457,'သား':458,'သိ':459,'သီ':460,'သီး':461,'သု':462,'သူ':463,'သူး':464,'သေ့':465,'သေ':466,'သေး':467,'သဲ့':468,'သယ်':469,'သဲ':470,'သော့':471,'သော်':472,'သော':473,'သန့်':474,'သန်':475,'သန်း':476,'သို့':477,'သို':478,'သိုး':479,'ဟ':480,'ဟာ':481,'ဟား':482,'ဟိ':483,'ဟီ':484,'ဟီး':485,'ဟု':486,'ဟူ':487,'ဟူး':488,'ဟေ့':489,'ဟေ':490,'ဟေး':491,'ဟဲ့':492,'ဟယ်':493,'ဟဲ':494,'ဟော့':495,'ဟော်':496,'ဟော':497,'ဟန့်':498,'ဟန်':499,'ဟန်း':500,'ဟို့':501,'ဟို':502,'ဟိုး':503,'အ':504,'အာ':505,'အား':506,'အိ':507,'အီ':508,'အီး':509,'အု':510,'အူ':511,'အူး':512,'အေ့':513,'အေ':514,'အေး':515,'အဲ့':516,'အယ်':517,'အဲ':518,'အော့':519,'အော်':520,'အော':521,'အန့်':522,'အန်':523,'အန်း':524,'အို့':525,'အို':526,'အိုး':527,'ကျ':528,'ကျာ':529,'ကျား':530,'ကျိ':531,'ကျီ':532,'ကျီး':533,'ကျု':534,'ကျူ':535,'ကျူး':536,'ကျေ့':537,'ကျေ':538,'ကျေး':539,'ကျဲ့':540,'ကျယ်':541,'ကျဲ':542,'ကျော့':543,'ကျော်':544,'ကျော':545,'ကျန့်':546,'ကျန်':547,'ကျန်း':548,'ကျို့':549,'ကျို':550,'ကျိုး':551,'ချ':552,'ချာ':553,'ချား':554,'ချိ':555,'ချီ':556,'ချီး':557,'ချု':558,'ချူ':559,'ချူး':560,'ချေ့':561,'ချေ':562,'ချေး':563,'ချဲ့':564,'ချယ်':565,'ချဲ':566,'ချော့':567,'ချော်':568,'ချော':569,'ချန့်':570,'ချန်':571,'ချန်း':572,'ချို့':573,'ချို':574,'ချိုး':575,'ဂျ':576,'ဂျာ':577,'ဂျား':578,'ဂျိ':579,'ဂျီ':580,'ဂျီး':581,'ဂျု':582,'ဂျူ':583,'ဂျူး':584,'ဂျေ့':585,'ဂျေ':586,'ဂျေး':587,'ဂျဲ့':588,'ဂျယ်':589,'ဂျဲ':590,'ဂျော့':591,'ဂျော်':592,'ဂျော':593,'ဂျန့်':594,'ဂျန်':595,'ဂျန်း':596,'ဂျို့':597,'ဂျို':598,'ဂျိုး':599,'ပျ':600,'ပျာ':601,'ပျား':602,'ပျိ':603,'ပျီ':604,'ပျီး':605,'ပျု':606,'ပျူ':607,'ပျူး':608,'ပျေ့':609,'ပျေ':610,'ပျေး':611,'ပျဲ့':612,'ပျယ်':613,'ပျဲ':614,'ပျော့':615,'ပျော်':616,'ပျော':617,'ပျန့်':618,'ပျန်':619,'ပျန်း':620,'ပျို့':621,'ပျို':622,'ပျိုး':623,'ဖျ':624,'ဖျာ':625,'ဖျား':626,'ဖျိ':627,'ဖျီ':628,'ဖျီး':629,'ဖျု':630,'ဖျူ':631,'ဖျူး':632,'ဖျေ့':633,'ဖျေ':634,'ဖျေး':635,'ဖျဲ့':636,'ဖျယ်':637,'ဖျဲ':638,'ဖျော့':639,'ဖျော်':640,'ဖျော':641,'ဖျန့်':642,'ဖျန်':643,'ဖျန်း':644,'ဖျို့':645,'ဖျို':646,'ဖျိုး':647,'ဗျ':648,'ဗျာ':649,'ဗျား':650,'ဗျိ':651,'ဗျီ':652,'ဗျီး':653,'ဗျု':654,'ဗျူ':655,'ဗျူး':656,'ဗျေ့':657,'ဗျေ':658,'ဗျေး':659,'ဗျဲ့':660,'ဗျယ်':661,'ဗျဲ':662,'ဗျော့':663,'ဗျော်':664,'ဗျော':665,'ဗျန့်':666,'ဗျန်':667,'ဗျန်း':668,'ဗျို့':669,'ဗျို':670,'ဗျိုး':671,'မျ':672,'မျာ':673,'များ':674,'မျိ':675,'မျီ':676,'မျီး':677,'မျု':678,'မျူ':679,'မျူး':680,'မျေ့':681,'မျေ':682,'မျေး':683,'မျဲ့':684,'မျယ်':685,'မျဲ':686,'မျော့':687,'မျော်':688,'မျော':689,'မျန့်':690,'မျန်':691,'မျန်း':692,'မျို့':693,'မျို':694,'မျိုး':695,'လျ':696,'လျာ':697,'လျား':698,'လျု':699,'လျူ':700,'လျူး':701,'လျော့':702,'လျော်':703,'လျော':704,'လျန့်':705,'လျန်':706,'လျန်း':707,'လျို့':708,'လျို':709,'လျိုး':710,'ကွ':711,'ကွာ':712,'ကွား':713,'ကွိ':714,'ကွီ':715,'ကွီး':716,'ကွေ့':717,'ကွေ':718,'ကွေး':719,'ကွဲ့':720,'ကွယ်':721,'ကွဲ':722,'ခွ':723,'ခွါ':724,'ခွါး':725,'ခွိ':726,'ခွီ':727,'ခွီး':728,'ခွေ့':729,'ခွေ':730,'ခွေး':731,'ခွဲ့':732,'ခွယ်':733,'ခွဲ':734,'ဂွ':735,'ဂွါ':736,'ဂွါး':737,'ဂွိ':738,'ဂွီ':739,'ဂွီး':740,'ဂွေ့':741,'ဂွေ':742,'ဂွေး':743,'ဂွဲ့':744,'ဂွယ်':745,'ဂွဲ':746,'ငွ':747,'ငွာ':748,'ငွား':749,'ငွိ':750,'ငွီ':751,'ငွီး':752,'ငွေ့':753,'ငွေ':754,'ငွေး':755,'ငွဲ့':756,'ငွယ်':757,'ငွဲ':758,'စွ':759,'စွာ':760,'စွား':761,'စွိ':762,'စွီ':763,'စွီး':764,'စွေ့':765,'စွေ':766,'စွေး':767,'စွဲ့':768,'စွယ်':769,'စွဲ':770,'ဇွ':771,'ဇွာ':772,'ဇွား':773,'ဇွိ':774,'ဇွီ':775,'ဇွီး':776,'ဇွေ့':777,'ဇွေ':778,'ဇွေး':779,'ဇွဲ့':780,'ဇွယ်':781,'ဇွဲ':782,'ညွ':783,'ညွာ':784,'ညွား':785,'ညွိ':786,'ညွီ':787,'ညွီး':788,'ညွေ့':789,'ညွေ':790,'ညွေး':791,'ညွဲ့':792,'ညွယ်':793,'ညွဲ':794,'တွ':795,'တွာ':796,'တွား':797,'တွိ':798,'တွီ':799,'တွီး':800,'တွေ့':801,'တွေ':802,'တွေး':803,'တွဲ့':804,'တွယ်':805,'တွဲ':806,'ထွ':807,'ထွာ':808,'ထွား':809,'ထွိ':810,'ထွီ':811,'ထွီး':812,'ထွေ့':813,'ထွေ':814,'ထွေး':815,'ထွဲ့':816,'ထွယ်':817,'ထွဲ':818,'ဒွ':819,'ဒွါ':820,'ဒွါး':821,'ဒွိ':822,'ဒွီ':823,'ဒွီး':824,'ဒွေ့':825,'ဒွေ':826,'ဒွေး':827,'ဒွဲ့':828,'ဒွယ်':829,'ဒွဲ':830,'နွ':831,'နွာ':832,'နွား':833,'နွိ':834,'နွီ':835,'နွီး':836,'နွေ့':837,'နွေ':838,'နွေး':839,'နွဲ့':840,'နွယ်':841,'နွဲ':842,'ပွ':843,'ပွါ':844,'ပွါး':845,'ပွိ':846,'ပွီ':847,'ပွီး':848,'ပွေ့':849,'ပွေ':850,'ပွေး':851,'ပွဲ့':852,'ပွယ်':853,'ပွဲ':854,'ဖွ':855,'ဖွာ':856,'ဖွား':857,'ဖွိ':858,'ဖွီ':859,'ဖွီး':860,'ဖွေ့':861,'ဖွေ':862,'ဖွေး':863,'ဖွဲ့':864,'ဖွယ်':865,'ဖွဲ':866,'ဗွ':867,'ဗွာ':868,'ဗွား':869,'ဗွိ':870,'ဗွီ':871,'ဗွီး':872,'ဗွေ့':873,'ဗွေ':874,'ဗွေး':875,'ဗွဲ့':876,'ဗွယ်':877,'ဗွဲ':878,'မွ':879,'မွာ':880,'မွား':881,'မွိ':882,'မွီ':883,'မွီး':884,'မွေ့':885,'မွေ':886,'မွေး':887,'မွဲ့':888,'မွယ်':889,'မွဲ':890,'ယွ':891,'ယွာ':892,'ယွား':893,'ယွိ':894,'ယွီ':895,'ယွီး':896,'ယွေ့':897,'ယွေ':898,'ယွေး':899,'ယွဲ့':900,'ယွယ်':901,'ယွဲ':902,'လွ':903,'လွာ':904,'လွား':905,'လွိ':906,'လွီ':907,'လွီး':908,'လွေ့':909,'လွေ':910,'လွေး':911,'လွဲ့':912,'လွယ်':913,'လွဲ':914,'သွ':915,'သွာ':916,'သွား':917,'သွိ':918,'သွီ':919,'သွီး':920,'သွေ့':921,'သွေ':922,'သွေး':923,'သွဲ့':924,'သွယ်':925,'သွဲ':926,'ဟွ':927,'ဟွာ':928,'ဟွား':929,'ဟွိ':930,'ဟွီ':931,'ဟွီး':932,'ဟွေ့':933,'ဟွေ':934,'ဟွေး':935,'ဟွဲ့':936,'ဟွယ်':937,'ဟွဲ':938,'ငှ':939,'ငှာ':940,'ငှား':941,'ငှိ':942,'ငှီ':943,'ငှီး':944,'ငှု':945,'ငှူ':946,'ငှူး':947,'ငှေ့':948,'ငှေ':949,'ငှေး':950,'ငှဲ့':951,'ငှယ်':952,'ငှဲ':953,'ငှော့':954,'ငှော်':955,'ငှော':956,'ငှန့်':957,'ငှန်':958,'ငှန်း':959,'ငှို့':960,'ငှို':961,'ငှိုး':962,'ညှ':963,'ညှာ':964,'ညှား':965,'ညှိ':966,'ညှီ':967,'ညှီး':968,'ညှု':969,'ညှူ':970,'ညှူး':971,'ညှေ့':972,'ညှေ':973,'ညှေး':974,'ညှဲ့':975,'ညှယ်':976,'ညှဲ':977,'ညှော့':978,'ညှော်':979,'ညှော':980,'ညှန့်':981,'ညှန်':982,'ညှန်း':983,'ညှို့':984,'ညှို':985,'ညှိုး':986,'နှ':987,'နှာ':988,'နှား':989,'နှိ':990,'နှီ':991,'နှီး':992,'နှု':993,'နှူ':994,'နှူး':995,'နှေ့':996,'နှေ':997,'နှေး':998,'နှဲ့':999,'နှယ်':1000,'နှဲ':1001,'နှော့':1002,'နှော်':1003,'နှော':1004,'နှန့်':1005,'နှန်':1006,'နှန်း':1007,'နှို့':1008,'နှို':1009,'နှိုး':1010,'မှ':1011,'မှာ':1012,'မှား':1013,'မှိ':1014,'မှီ':1015,'မှီး':1017,'မှု':1017,'မှူ':1018,'မှူး':1019,'မှေ့':1020,'မှေ':1021,'မှေး':1022,'မှဲ့':1023,'မှယ်':1024,'မှဲ':1025,'မှော့':1026,'မှော်':1027,'မှော':1028,'မှန့်':1029,'မှန်':1030,'မှန်း':1031,'မှို့':1032,'မှို':1033,'မှိုး':1034,'ယှ':1035,'ယှာ':1036,'ယှား':1037,'ယှိ':1038,'ယှီ':1039,'ယှီး':1040,'ယှု':1041,'ယှူ':1042,'ယှူး':1043,'ယှေ့':1044,'ယှေ':1045,'ယှေး':1046,'ယှဲ့':1047,'ယှယ်':1048,'ယှဲ':1049,'ယှော့':1050,'ယှော်':1051,'ယှော':1052,'ယှန့်':1053,'ယှန်':1054,'ယှန်း':1055,'ယှို့':1056,'ယှို':1057,'ယှိုး':1058,'လှ':1059,'လှာ':1060,'လှား':1061,'လှိ':1062,'လှီ':1063,'လှီး':1064,'လှု':1065,'လှူ':1066,'လှူး':1067,'လှေ့':1068,'လှေ':1069,'လှေး':1070,'လှဲ့':1071,'လှယ်':1072,'လှဲ':1073,'လှော့':1074,'လှော်':1075,'လှော':1076,'လှန့်':1077,'လှန်':1078,'လှန်း':1079,'လှို့':1080,'လှို':1081,'လှိုး':1082,'ဝှ':1083,'ဝှာ':1084,'ဝှား':1085,'ဝှိ':1086,'ဝှီ':1087,'ဝှီး':1088,'ဝှု':1089,'ဝှူ':1090,'ဝှူး':1091,'ဝှေ့':1092,'ဝှေ':1093,'ဝှေး':1094,'ဝှဲ့':1095,'ဝှယ်':1096,'ဝှဲ':1097,'ဝှော့':1098,'ဝှော်':1099,'ဝှော':1100,'ဝှန့်':1101,'ဝှန်':1102,'ဝှန်း':1103,'ဝှို့':1104,'ဝှို':1105,'ဝှိုး':1106,'ကျွ':1107,'ကျွာ':1108,'ကျွား':1109,'ကျွိ':1110,'ကျွီ':1111,'ကျွီး':1112,'ကျွေ့':1113,'ကျွေ':1114,'ကျွေး':1115,'ကျွဲ့':1116,'ကျွယ်':1117,'ကျွဲ':1118,'ချွ':1119,'ချွာ':1120,'ချွား':1121,'ချွေ့':1122,'ချွေ':1123,'ချွေး':1124,'ချွဲ့':1125,'ချွယ်':1126,'ချွဲ':1127,'မြွ':1128,'မြွာ':1129,'မြွား':1130,'မြွေ့':1131,'မြွေ':1132,'မြွေး':1133,'မျှ':1134,'မျှာ':1135,'မျှား':1136,'မျှိ':1137,'မျှီ':1138,'မျှီး':1139,'မျှု':1140,'မျှူ':1141,'မျှူး':1142,'မျှေ့':1143,'မျှေ':1144,'မျှေး':1145,'မျှဲ့':1146,'မျှယ်':1147,'မျှဲ':1148,'မျှော့':1149,'မျှော်':1150,'မျှော':1151,'မျှန့်':1152,'မျှန်':1153,'မျှန်း':1154,'မျှို့':1155,'မျှို':1156,'မျှိုး':1157,'လျှ':1158,'လျှာ':1159,'လျှား':1160,'လျှိ':1161,'လျှီ':1162,'လျှီး':1163,'လျှု':1164,'လျှူ':1165,'လျှူး':1166,'လျှေ့':1167,'လျှေ':1168,'လျှေး':1169,'လျှဲ့':1170,'လျှယ်':1171,'လျှဲ':1172,'လျှော့':1173,'လျှော်':1174,'လျှော':1175,'လျှန့်':1176,'လျှန်':1177,'လျှန်း':1178,'လျှို့':1179,'လျှို':1180,'လျှိုး':1181,'ညွှ':1182,'ညွှာ':1183,'ညွှား':1184,'ညွှိ':1185,'ညွှီ':1186,'ညွှီး':1187,'ညွှေ့':1188,'ညွှေ':1189,'ညွှေး':1190,'ညွှဲ့':1191,'ညွှယ်':1192,'ညွှဲ':1193,'နွှ':1194,'နွှာ':1195,'နွှား':1196,'နွှိ':1197,'နွှီ':1198,'နွှီး':1199,'နွှေ့':1200,'နွှေ':1201,'နွှေး':1202,'နွှဲ့':1203,'နွှယ်':1204,'နွှဲ':1205,'မွှ':1206,'မွှာ':1207,'မွှား':1208,'မွှိ':1209,'မွှီ':1210,'မွှီး':1211,'မွှေ့':1212,'မွှေ':1213,'မွှေး':1214,'မွှဲ့':1215,'မွှယ်':1216,'မွှဲ':1217,'ယွှ':1218,'ယွှာ':1219,'ယွှား':1220,'ယွှိ':1221,'ယွှီ':1222,'ယွှီး':1223,'ယွှေ့':1224,'ယွှေ':1225,'ယွှေး':1226,'ယွှဲ့':1227,'ယွှယ်':1228,'ယွှဲ':1229,'လွှ':1230,'လွှာ':1231,'လွှား':1232,'လွှိ':1233,'လွှီ':1234,'လွှီး':1235,'လွှေ့':1236,'လွှေ':1237,'လွှေး':1238,'လွှဲ့':1239,'လွှယ်':1240,'လွှဲ':1241, 'ယွှန့်':1242,'ယွှန်':1243,'ယွှန်း':1244,'ညွန့်':1245,'ညွန်':1246,'ညွန်း':1247,'ဂျွန့်':1248,'ဂျွန်':1249,'ဂျွန်း':1250,'မွှန့်':1251,'မွှန်':1252,'မွှန်း':1253};
        
        const level2Map = {'အင့်':0,'အင်':1,'အင်း':2,'အောင့်':3,'အောင်':4,'အောင်း':5,'အိုင့်':6,'အိုင်':7,'အိုင်း':8,'အိန့်':9,'အိန်':10,'အိန်း':11,'အုန့်':12,'အုန်':13,'အုန်း':14,'အွန့်':15,'အွန်':16,'အွန်း':17,'အက်':18,'အောက်':19,'အိုက်':20,'အစ်':21,'အတ်':22,'အိတ်':23,'အုတ်':24,'အွတ်':25,'ကင့်':26,'ကင်':27,'ကင်း':28,'ကောင့်':29,'ကောင်':30,'ကောင်း':31,'ကိုင့်':32,'ကိုင်':33,'ကိုင်း':34,'ကွင့်':35,'ကွင်':36,'ကွင်း':37,'ကိန့်':38,'ကိန်':39,'ကိန်း':40,'ကုန့်':41,'ကုန်':42,'ကုန်း':43,'ကွန့်':44,'ကွန်':45,'ကွန်း':46,'ကက်':47,'ကောက်':48,'ကိုက်':49,'ကွက်':50,'ကစ်':51,'ကတ်':52,'ကိတ်':53,'ကုတ်':54,'ကွတ်':55,'ခင့်':56,'ခင်':57,'ခင်း':58,'ခေါင့်':59,'ခေါင်':60,'ခေါင်း':61,'ခိုင့်':62,'ခိုင်':63,'ခိုင်း':64,'ခွင့်':65,'ခွင်':66,'ခွင်း':67,'ခိန့်':68,'ခိန်':69,'ခိန်း':70,'ခုန့်':71,'ခုန်':72,'ခုန်း':73,'ခွန့်':74,'ခွန်':75,'ခွန်း':76,'ခက်':77,'ခေါက်':78,'ခိုက်':79,'ခွက်':80,'ခစ်':81,'ခတ်':82,'ခိတ်':83,'ခုတ်':84,'ခွတ်':85,'ဂင့်':86,'ဂင်':87,'ဂင်း':88,'ဂေါင့်':89,'ဂေါင်':90,'ဂေါင်း':91,'ဂိုင့်':92,'ဂိုင်':93,'ဂိုင်း':94,'ဂွင့်':95,'ဂွင်':96,'ဂွင်း':97,'ဂိန့်':98,'ဂိန်':99,'ဂိန်း':100,'ဂုန့်':101,'ဂုန်':102,'ဂုန်း':103,'ဂွန့်':104,'ဂွန်':105,'ဂွန်း':106,'ဂက်':107,'ဂေါက်':108,'ဂိုက်':109,'ဂွက်':110,'ဂစ်':111,'ဂတ်':112,'ဂိတ်':113,'ဂုတ်':114,'ဂွတ်':115,'ငင့်':116,'ငင်':117,'ငင်း':118,'ငေါင့်':119,'ငေါင်':120,'ငေါင်း':121,'ငိုင့်':122,'ငိုင်':123,'ငိုင်း':124,'ငိန့်':125,'ငိန်':126,'ငိန်း':127,'ငုန့်':128,'ငုန်':129,'ငုန်း':130,'ငွန့်':131,'ငွန်':132,'ငွန်း':133,'ငက်':134,'ငေါက်':135,'ငိုက်':136,'ငွက်':137,'ငစ်':138,'ငတ်':139,'ငိတ်':140,'ငုတ်':141,'ငွတ်':142,'စင့်':143,'စင်':144,'စင်း':145,'စောင့်':146,'စောင်':147,'စောင်း':148,'စိုင့်':149,'စိုင်':150,'စိုင်း':151,'စွင့်':152,'စွင်':153,'စွင်း':154,'စိန့်':155,'စိန်':156,'စိန်း':157,'စုန့်':158,'စုန်':159,'စုန်း':160,'စွန့်':161,'စွန်':162,'စွန်း':163,'စက်':164,'စောက်':165,'စိုက်':166,'စွက်':167,'စစ်':168,'စတ်':169,'စိတ်':170,'စုတ်':171,'စွတ်':172,'ဇင့်':173,'ဇင်':174,'ဇင်း':175,'ဇောင့်':176,'ဇောင်':177,'ဇောင်း':178,'ဇိုင့်':179,'ဇိုင်':180,'ဇိုင်း':181,'ဇိန့်':182,'ဇိန်':183,'ဇိန်း':184,'ဇုန့်':185,'ဇုန်':186,'ဇုန်း':187,'ဇွန့်':188,'ဇွန်':189,'ဇွန်း':190,'ဇက်':191,'ဇောက်':192,'ဇိုက်':193,'ဇွက်':194,'ဇစ်':195,'ဇတ်':196,'ဇိတ်':197,'ဇုတ်':198,'ဇွတ်':199,'ညင့်':200,'ညင်':201,'ညင်း':202,'ညောင့်':203,'ညောင်':204,'ညောင်း':205,'ညိုင့်':206,'ညိုင်':207,'ညိုင်း':208,'ညွင့်':209,'ညွင်':210,'ညွင်း':211,'ညိန့်':212,'ညိန်':213,'ညိန်း':214,'ညုန့်':215,'ညုန်':216,'ညုန်း':217,'ညွန့်':218,'ညွန်':219,'ညွန်း':220,'ညက်':221,'ညောက်':222,'ညွက်':223,'ညစ်':224,'ညတ်':225,'ညိတ်':226,'ညုတ်':227,'ညွတ်':228,'တင့်':229,'တင်':230,'တင်း':231,'တောင့်':232,'တောင်':233,'တောင်း':234,'တိုင့်':235,'တိုင်':236,'တိုင်း':237,'တွင့်':238,'တွင်':239,'တွင်း':240,'တိန့်':241,'တိန်':242,'တိန်း':243,'တုန့်':244,'တုန်':245,'တုန်း':246,'တွန့်':247,'တွန်':248,'တွန်း':249,'တက်':250,'တောက်':251,'တိုက်':252,'တွက်':253,'တစ်':254,'တတ်':255,'တိတ်':256,'တုတ်':257,'တွတ်':258,'ထင့်':259,'ထင်':260,'ထင်း':261,'ထောင့်':262,'ထောင်':263,'ထောင်း':264,'ထိုင့်':265,'ထိုင်':266,'ထိုင်း':267,'ထွင့်':268,'ထွင်':269,'ထွင်း':270,'ထိန့်':271,'ထိန်':272,'ထိန်း':273,'ထုန့်':274,'ထုန်':275,'ထုန်း':276,'ထွန့်':277,'ထွန်':278,'ထွန်း':279,'ထက်':280,'ထောက်':281,'ထိုက်':282,'ထွက်':283,'ထစ်':284,'ထတ်':285,'ထိတ်':286,'ထုတ်':287,'ထွတ်':288,'ဒင့်':289,'ဒင်':290,'ဒင်း':291,'ဒေါင့်':292,'ဒေါင်':293,'ဒေါင်း':294,'ဒိုင့်':295,'ဒိုင်':296,'ဒိုင်း':297,'ဒွင့်':298,'ဒွင်':299,'ဒွင်း':300,'ဒိန့်':301,'ဒိန်':302,'ဒိန်း':303,'ဒုန့်':304,'ဒုန်':305,'ဒုန်း':306,'ဒွန့်':307,'ဒွန်':308,'ဒွန်း':309,'ဒက်':310,'ဒေါက်':311,'ဒိုက်':312,'ဒွက်':313,'ဒစ်':314,'ဒတ်':315,'ဒိတ်':316,'ဒုတ်':317,'ဒွတ်':318,'နင့်':319,'နင်':320,'နင်း':321,'နောင့်':322,'နောင်':323,'နောင်း':324,'နိုင့်':325,'နိုင်':326,'နိုင်း':327,'နွင့်':328,'နွင်':329,'နွင်း':330,'နိန့်':331,'နိန်':332,'နိန်း':333,'နုန့်':334,'နုန်':335,'နုန်း':336,'နွန့်':337,'နွန်':338,'နွန်း':339,'နက်':340,'နောက်':341,'နိုက်':342,'နွက်':343,'နစ်':344,'နတ်':345,'နိတ်':346,'နုတ်':347,'နွတ်':348,'ပင့်':349,'ပင်':350,'ပင်း':351,'ပေါင့်':352,'ပေါင်':353,'ပေါင်း':354,'ပိုင့်':355,'ပိုင်':356,'ပိုင်း':357,'ပွင့်':358,'ပွင်':359,'ပွင်း':360,'ပိန့်':361,'ပိန်':362,'ပိန်း':363,'ပုန့်':364,'ပုန်':365,'ပုန်း':366,'ပွန့်':367,'ပွန်':368,'ပွန်း':369,'ပက်':370,'ပေါက်':371,'ပိုက်':372,'ပွက်':373,'ပစ်':374,'ပတ်':375,'ပိတ်':376,'ပုတ်':377,'ပွတ်':378,'ဖင့်':379,'ဖင်':380,'ဖင်း':381,'ဖောင့်':382,'ဖောင်':383,'ဖောင်း':384,'ဖိုင့်':385,'ဖိုင်':386,'ဖိုင်း':387,'ဖွင့်':388,'ဖွင်':389,'ဖွင်း':390,'ဖိန့်':391,'ဖိန်':392,'ဖိန်း':393,'ဖုန့်':394,'ဖုန်':395,'ဖုန်း':396,'ဖွန့်':397,'ဖွန်':398,'ဖွန်း':399,'ဖက်':400,'ဖောက်':401,'ဖိုက်':402,'ဖွက်':403,'ဖစ်':404,'ဖတ်':405,'ဖိတ်':406,'ဖုတ်':407,'ဖွတ်':408,'ဗင့်':409,'ဗင်':410,'ဗင်း':411,'ဗောင့်':412,'ဗောင်':413,'ဗောင်း':414,'ဗိုင့်':415,'ဗိုင်':416,'ဗိုင်း':417,'ဗွင့်':418,'ဗွင်':419,'ဗွင်း':420,'ဗိန့်':421,'ဗိန်':422,'ဗိန်း':423,'ဗုန့်':424,'ဗုန်':425,'ဗုန်း':426,'ဗွန့်':427,'ဗွန်':428,'ဗွန်း':429,'ဗက်':430,'ဗောက်':431,'ဗိုက်':432,'ဗွက်':433,'ဗစ်':434,'ဗတ်':435,'ဗိတ်':436,'ဗုတ်':437,'ဗွတ်':438,'မင့်':439,'မင်':440,'မင်း':441,'မောင့်':442,'မောင်':443,'မောင်း':444,'မိုင့်':445,'မိုင်':446,'မိုင်း':447,'မွင့်':448,'မွင်':449,'မွင်း':450,'မိန့်':451,'မိန်':452,'မိန်း':453,'မုန့်':454,'မုန်':455,'မုန်း':456,'မွန့်':457,'မွန်':458,'မွန်း':459,'မက်':460,'မောက်':461,'မိုက်':462,'မွက်':463,'မစ်':464,'မတ်':465,'မိတ်':466,'မုတ်':467,'မွတ်':468,'ယင့်':469,'ယင်':470,'ယင်း':471,'ယောင့်':472,'ယောင်':473,'ယောင်း':474,'ယိုင့်':475,'ယိုင်':476,'ယိုင်း':477,'ယွင့်':478,'ယွင်':479,'ယွင်း':480,'ယိန့်':481,'ယိန်':482,'ယိန်း':483,'ယုန့်':484,'ယုန်':485,'ယုန်း':486,'ယွန့်':487,'ယွန်':488,'ယွန်း':489,'ယက်':490,'ယောက်':491,'ယိုက်':492,'ယွက်':493,'ယစ်':494,'ယတ်':495,'ယိတ်':496,'ယုတ်':497,'ယွတ်':498,'လင့်':499,'လင်':500,'လင်း':501,'လောင့်':502,'လောင်':503,'လောင်း':504,'လိုင့်':505,'လိုင်':506,'လိုင်း':507,'လွင့်':508,'လွင်':509,'လွင်း':510,'လိန့်':511,'လိန်':512,'လိန်း':513,'လုန့်':514,'လုန်':515,'လုန်း':516,'လွန့်':517,'လွန်':518,'လွန်း':519,'လက်':520,'လောက်':521,'လိုက်':522,'လွက်':523,'လစ်':524,'လတ်':525,'လိတ်':526,'လုတ်':527,'လွတ်':528,'ဝင့်':529,'ဝင်':530,'ဝင်း':531,'ဝေါင့်':532,'ဝေါင်':533,'ဝေါင်း':534,'ဝိုင့်':535,'ဝိုင်':536,'ဝိုင်း':537,'ဝိန့်':538,'ဝိန်':539,'ဝိန်း':540,'ဝုန့်':541,'ဝုန်':542,'ဝုန်း':543,'ဝွန့်':544,'ဝွန်':545,'ဝွန်း':546,'ဝက်':547,'ဝေါက်':548,'ဝိုက်':549,'ဝစ်':550,'ဝတ်':551,'ဝိတ်':552,'ဝုတ်':553,'ဝွတ်':554,'သင့်':555,'သင်':556,'သင်း':557,'သောင့်':558,'သောင်':559,'သောင်း':560,'သိုင့်':561,'သိုင်':562,'သိုင်း':563,'သွင့်':564,'သွင်':565,'သွင်း':566,'သိန့်':567,'သိန်':568,'သိန်း':569,'သုန့်':570,'သုန်':571,'သုန်း':572,'သွန့်':573,'သွန်':574,'သွန်း':575,'သက်':576,'သောက်':577,'သိုက်':578,'သွက်':579,'သစ်':580,'သတ်':581,'သိတ်':582,'သုတ်':583,'သွတ်':584,'ဟင့်':585,'ဟင်':586,'ဟင်း':587,'ဟောင့်':588,'ဟောင်':589,'ဟောင်း':590,'ဟိုင့်':591,'ဟိုင်':592,'ဟိုင်း':593,'ဟိန့်':594,'ဟိန်':595,'ဟိန်း':596,'ဟုန့်':597,'ဟုန်':598,'ဟုန်း':599,'ဟွန့်':600,'ဟွန်':601,'ဟွန်း':602,'ဟက်':603,'ဟောက်':604,'ဟိုက်':605,'ဟစ်':606,'ဟတ်':607,'ဟိတ်':608,'ဟုတ်':609,'ဟွတ်':610,'ကျင့်':611,'ကျင်':612,'ကျင်း':613,'ကျောင့်':614,'ကျောင်':615,'ကျောင်း':616,'ကျိုင့်':617,'ကျိုင်':618,'ကျိုင်း':619,'ကျွင့်':620,'ကျွင်':621,'ကျွင်း':622,'ကျိန့်':623,'ကျိန်':624,'ကျိန်း':625,'ကျုန့်':626,'ကျုန်':627,'ကျုန်း':628,'ကျွန့်':629,'ကျွန်':630,'ကျွန်း':631,'ကျက်':632,'ကျောက်':633,'ကျိုက်':634,'ကျွက်':635,'ကျစ်':636,'ကျတ်':637,'ကျိတ်':638,'ကျုတ်':639,'ကျွတ်':640,'ချင့်':641,'ချင်':642,'ချင်း':643,'ချောင့်':644,'ချောင်':645,'ချောင်း':646,'ချိုင့်':647,'ချိုင်':648,'ချိုင်း':649,'ချွင့်':650,'ချွင်':651,'ချွင်း':652,'ချိန့်':653,'ချိန်':654,'ချိန်း':655,'ချုန့်':656,'ချုန်':657,'ချုန်း':658,'ချွန့်':659,'ချွန်':660,'ချွန်း':661,'ချက်':662,'ချောက်':663,'ချိုက်':664,'ချွက်':665,'ချစ်':666,'ချတ်':667,'ချိတ်':668,'ချုတ်':669,'ချွတ်':670,'ဂျင့်':671,'ဂျင်':672,'ဂျင်း':673,'ဂျောင့်':674,'ဂျောင်':675,'ဂျောင်း':676,'ဂျိုင့်':677,'ဂျိုင်':678,'ဂျိုင်း':679,'ဂျွင့်':680,'ဂျွင်':681,'ဂျွင်း':682,'ဂျိန့်':683,'ဂျိန်':684,'ဂျိန်း':685,'ဂျုန့်':686,'ဂျုန်':687,'ဂျုန်း':688,'ဂျွန့်':689,'ဂျွန်':690,'ဂျွန်း':691,'ဂျက်':692,'ဂျောက်':693,'ဂျိုက်':694,'ဂျွက်':695,'ဂျစ်':696,'ဂျတ်':697,'ဂျိတ်':698,'ဂျုတ်':699,'ဂျွတ်':700,'ပျင့်':701,'ပျင်':702,'ပျင်း':703,'ပျောင့်':704,'ပျောင်':705,'ပျောင်း':706,'ပျိုင့်':707,'ပျိုင်':708,'ပျိုင်း':709,'ပျိန့်':710,'ပျိန်':711,'ပျိန်း':712,'ပျုန့်':713,'ပျုန်':714,'ပျုန်း':715,'ပျွန့်':716,'ပျွန်':717,'ပျွန်း':718,'ပျက်':719,'ပျောက်':720,'ပျိုက်':721,'ပျစ်':722,'ပျတ်':723,'ပျိတ်':724,'ပျုတ်':725,'ပျွတ်':726,'ဖျင့်':727,'ဖျင်':728,'ဖျင်း':729,'ဖျောင့်':730,'ဖျောင်':731,'ဖျောင်း':732,'ဖျိုင့်':733,'ဖျိုင်':734,'ဖျိုင်း':735,'ဖျိန့်':736,'ဖျိန်':737,'ဖျိန်း':738,'ဖျုန့်':739,'ဖျုန်':740,'ဖျုန်း':741,'ဖျက်':742,'ဖျောက်':743,'ဖျိုက်':744,'ဖျစ်':745,'ဖျတ်':746,'ဖျိတ်':747,'ဖျုတ်':748,'ဖျွတ်':749,'ဗျင့်':750,'ဗျင်':751,'ဗျင်း':752,'ဗျောင့်':753,'ဗျောင်':754,'ဗျောင်း':755,'ဗျိုင့်':756,'ဗျိုင်':757,'ဗျိုင်း':758,'ဗျိန့်':759,'ဗျိန်':760,'ဗျိန်း':761,'ဗျုန့်':762,'ဗျုန်':763,'ဗျုန်း':764,'ဗျွန့်':765,'ဗျွန်':766,'ဗျွန်း':767,'ဗျက်':768,'ဗျောက်':769,'ဗျိုက်':770,'ဗျစ်':771,'ဗျတ်':772,'ဗျိတ်':773,'ဗျုတ်':774,'ဗျွတ်':775,'မျင့်':776,'မျင်':777,'မျင်း':778,'မျောင့်':779,'မျောင်':780,'မျောင်း':781,'မျိုင့်':782,'မျိုင်':783,'မျိုင်း':784,'မျိန့်':785,'မျိန်':786,'မျိန်း':787,'မျုန့်':788,'မျုန်':789,'မျုန်း':790,'မျွန့်':791,'မျွန်':792,'မျွန်း':793,'မျက်':794,'မျောက်':795,'မျိုက်':796,'မျစ်':797,'မျတ်':798,'မျိတ်':799,'မျုတ်':800,'မျွတ်':801,'လျင့်':802,'လျင်':803,'လျင်း':804,'လျောင့်':805,'လျောင်':806,'လျောင်း':807,'လျက်':808,'လျောက်':809,'လျိုက်':810,'လျစ်':811,'လျတ်':812,'လျိတ်':813,'လျုတ်':814,'လျွတ်':815,'ငှင့်':816,'ငှင်':817,'ငှင်း':818,'ငှက်':819,'ငှစ်':820,'ငှိတ်':821,'ငှုတ်':822,'ညှင့်':823,'ညှင်':824,'ညှင်း':825,'ညှောင့်':826,'ညှောင်':827,'ညှောင်း':828,'ညှိုင့်':829,'ညှိုင်':830,'ညှိုင်း':831,'ညှိန့်':832,'ညှိန်':833,'ညှိန်း':834,'ညှုန့်':835,'ညှုန်':836,'ညှုန်း':837,'ညွှန့်':838,'ညွှန်':839,'ညွှန်း':840,'ညှက်':841,'ညှောက်':842,'ညှိုက်':843,'ညှစ်':844,'ညှိတ်':845,'ညှုတ်':846,'နှင့်':847,'နှင်':848,'နှင်း':849,'နှောင့်':850,'နှောင်':851,'နှောင်း':852,'နှိုင့်':853,'နှိုင်':854,'နှိုင်း':855,'နှိန့်':856,'နှိန်':857,'နှိန်း':858,'နှုန့်':859,'နှုန်':860,'နှုန်း':861,'နှက်':862,'နှောက်':863,'နှိုက်':864,'နှစ်':865,'နှတ်':866,'နှိတ်':867,'နှုတ်':868,'မှင့်':869,'မှင်':870,'မှင်း':871,'မှောင့်':872,'မှောင်':873,'မှောင်း':874,'မှိုင့်':875,'မှိုင်':876,'မှိုင်း':877,'မှိန့်':878,'မှိန်':879,'မှိန်း':880,'မှုန့်':881,'မှုန်':882,'မှုန်း':883,'မွှန့်':884,'မွှန်':885,'မွှန်း':886,'မှက်':887,'မှောက်':888,'မှိုက်':889,'မှစ်':890,'မှတ်':891,'မှိတ်':892,'မှုတ်':893,'မွှတ်':894,'ယှင့်':895,'ယှင်':896,'ယှင်း':897,'ယှောင့်':898,'ယှောင်':899,'ယှောင်း':900,'ယှိုင့်':901,'ယှိုင်':902,'ယှိုင်း':903,'ယှိန့်':904,'ယှိန်':905,'ယှိန်း':906,'ယှုန့်':907,'ယှုန်':908,'ယှုန်း':909,'ယွှန့်':910,'ယွှန်':911,'ယွှန်း':912,'ယှက်':913,'ယှောက်':914,'ယှိုက်':915,'ယှစ်':916,'ယှတ်':917,'ယှိတ်':918,'ယှုတ်':919,'ယွှတ်':920,'မျှင့်':921,'မျှင်':922,'မျှင်း':923,'မျှောင့်':924,'မျှောင်':925,'မျှောင်း':926,'မျှုန့်':927,'မျှုန်':928,'မျှုန်း':929,'မျှက်':930,'မျှောက်':931,'မျှိုက်':932,'မျှစ်':933,'မျှတ်':934,'မျှိတ်':935,'မျှုတ်':936,'မျွှတ်':937,'လျှင့်':938,'လျှင်':939,'လျှင်း':940,'လျှောင့်':941,'လျှောင်':942,'လျှောင်း':943,'လျှက်':944,'လျှောက်':945,'လျှိုက်':946,'လျှစ်':947,'လျှိတ်':948,'လျှုတ်':949,'နွှင့်':950,'နွှင်':951,'နွှင်း':952,'ယွှင့်':953,'ယွှင်':954,'ယွှင်း':955,'လွှင့်':956,'လွှင်':957,'လွှင်း':958, 'လှောင့်':959,'လှောင်':960,'လှောင်း':961,'လှိုင့်':962,'လှိုင်':963,'လှိုင်း':964,'လှိန့်':965,'လှိန်':966,'လှိန်း':967,'လှက်':968,'လှောက်':969,'လှိုက်':970,'လှစ်':971,'လှတ်':972,'လှိတ်':973,'လှုတ်':974,'လွှတ်':975,'လှုန့်':976,'လှုန်':977, 'လှုန်း':978, 'ံ':979, '၌':980, '၍':981, '၎င်း':982, 'က်':983, 'ဂျွ':984, 'င်':985, 'စ်':986, 'ဉ်':987, 'ည်':988, 'တ်':989, 'န်':990, 'ပျွ':991, 'ပြွ':992, 'ပ်':993, 'မြွ':994, 'မ်':995, 'ယ်':996, 'ျ':997, 'ြ':998, 'ွ':999, 'ှ':1000, 'ဲ':1001, '်':1002, '့':1003, 'း':1005, 'ာ':1007, 'ါ':1009, 'ိ':1011, 'ီ':1013, 'ု':1015, 'ူ':1017, 'ေ':1019};
        
        const CHAR_MAP = {};
        const twoSecChars = ['့', 'း', 'ာ', 'ါ', 'ိ', 'ီ', 'ု', 'ူ', 'ေ'];
        
        for (const char in level2Map) { 
            if (!CHAR_MAP.hasOwnProperty(char)) { 
                let duration = twoSecChars.includes(char) ? 2000 : 1000;
                CHAR_MAP[char] = { bufferKey: 'level2', offsetSec: level2Map[char], duration: duration }; 
            } 
        }
        for (const char in level1Map) { 
            if (!CHAR_MAP.hasOwnProperty(char)) { 
                CHAR_MAP[char] = { bufferKey: 'level1', offsetSec: level1Map[char], duration: 1000 }; 
            } 
        }

        const SOUND_MAPPING = { 
            'ဃ':'ဂ','ဆ':'စ','ဈ':'ဇ','ဉ':'ည','ဋ':'တ','ဌ':'ထ','ဍ':'ဒ','ဎ':'ဒ','ဓ':'ဒ','ဏ':'န','ဘ':'ဗ','ဠ':'လ','ရ':'ယ','ယျ':'ယ','ကြ':'ကျ','ခြ':'ချ','ဂြ':'ဂျ','ပြ':'ပျ','ဖြ':'ဖျ','ဗြ':'ဗျ','မြ':'မျ','ဆွ':'စွ','ဓွ':'ဒွ','ငြ':'ည','ဘွ':'ဗွ','ရွ':'ယွ','ရွှ':'ယွှ','ဏှ':'နှ','ရှ':'ယှ','ကြွ':'ကျွ','ခြွ':'ချွ','မြှ':'မျှ','မြွ':'မွ',
            'က္':'က်', 'ဂ္':'က်', 'စ္':'စ်', 'ဇ္':'စ်', 'ဒ္':'တ်', 'ဓ္':'တ်', 'န္':'န်', 'ပ္':'ပ်', 'ဖ္':'ပ်', 'ဗ္':'ပ်', 'မ္':'မ်', 'ယ္':'ယ်', 'ရ္':'ယ်', 'လ္':'လ်', 'ဝ္':'ယ်', 'သ္':'သ်', 'သ်':'တ်', 'ဟ္':'ဟ်', 'ဠ္':'ယ်', 'အ္':'ယ်'
        };
        
        const SPECIAL_SOUND_MAPPING = { 
            'ဥ':'အု','ဦ':'အူ','ဦး':'အူး','ဣ':'အိ','၏':'အိ','ဤ':'အီ','ဩ':'အော','ဪ':'အော်','ဧ':'အေ',
            'ဓာ':'ဒါ','ဓား':'ဒါး','ဓော':'ဒေါ','ဓော်':'ဒေါ်','ဃာ':'ဂါ','ဃား':'ဂါး','ဃော':'ဂေါ','ဃော်':'ဂေါ်'
        };
        
        const HIGHLIGHT_AREA = byId('highlight-area');
        const CHAT_INPUT = byId('chat-input');
        const CONSONANT_TRIGGERS = ['က','ခ','ဂ','ဃ','င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'ဋ', 'ဌ', 'ဍ', 'ဎ', 'ဏ', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'ဠ', 'အ']; 
        const COMPONENT_TRIGGERS = ['ာ','ါ','ိ','ီ','ု','ူ','ေ','ဲ','်','ံ','း','့','ျ','ြ','ွ','ှ'];
        const FINAL_CONSONANT_TRIGGERS = ['င်','က်','စ်','ည်','ဉ်','တ်','န်','ပ်','မ်','ယ်'];

        // --- Normalization Logic ---
        function normalizeMyanmarText(text) {
            if (!text) return "";
            let normalized = text.normalize('NFC');
            // Fix typing order so Asat always comes before Auk-myit/Wusarga internally
            normalized = normalized.replace(/\u1037\u103A/g, '\u103A\u1037');
            normalized = normalized.replace(/\u1038\u103A/g, '\u103A\u1038');
            return normalized;
        }

        function insertSpacesBurmese(text) {
            if (!text) return "";
            let result = normalizeMyanmarText(text);
            
            // Handle common standalone ည acting as stacked in Pali
            result = result.replace(/ဣ/g, 'အိ');
            result = result.replace(/န္ဒြ/g, 'န် ဒ ရ');
            result = result.replace(/ည/g, 'ဉ် ည');
            result = result.replace(/ဉ် ညှ/g, 'ညှ');
            result = result.replace(/ဉ် ည်/g, 'ည်');
            result = result.replace(/ုဉ်/g, 'ုန်');
            result = result.replace(/ဿ/g, 'သ် သ');
            result = result.replace(/သကျ/g, 'သက် ကျ');
            result = result.replace(/ကတွာ/g, 'ကတ် တ ဝါ');
            
            // Handle Kinzi explicitly: င ် ္ -> င် [space]
            result = result.replace(/င\u103A\u1039([က-အ])/g, 'င\u103A $1');
            
            // Handle standard stacking (Virama): C1 ္ C2 -> C1 ် [space] C2
            // ဥပမာ - သက္က -> သက် က, မေတ္တာ -> မေတ် တာ
            result = result.replace(/([က-အ])\u1039([က-အ])/g, '$1\u103A $2');

            const wordBoundaryRegex = /([^\s\u1040-\u104F])([\u1000-\u102A]?(?![\u103A\u1039]))/g;
            result = result.replace(wordBoundaryRegex, (match, p1, p2) => {
                return p1 + (p2 ? ' ' + p2 : '');
            });
            result = result.replace(/(\s*)[\u104A](\s*)/g, ' \u104A ');
            result = result.replace(/\s+/g, ' ').trim();
            return result;
        }

        // --- Drag Floating Icon Logic ---
        const floatingBtn = byId('floating-kb-btn');
        let isDraggingKB = false;
        let dragStartX = 0, dragStartY = 0;
        let initialKB_X = 0, initialKB_Y = 0;
        let hasMovedKB = false;

        floatingBtn.addEventListener('mousedown', startDragKB);
        floatingBtn.addEventListener('touchstart', startDragKB, {passive: false});

        document.addEventListener('mousemove', dragKB);
        document.addEventListener('touchmove', dragKB, {passive: false});

        document.addEventListener('mouseup', endDragKB);
        document.addEventListener('touchend', endDragKB);

        function startDragKB(e) {
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

            dragStartX = clientX;
            dragStartY = clientY;
            
            const rect = floatingBtn.getBoundingClientRect();
            initialKB_X = clientX - rect.left;
            initialKB_Y = clientY - rect.top;
            
            isDraggingKB = true;
            hasMovedKB = false;
            
            // Remove centering transform when starting drag so dragging logic works purely on left/top
            floatingBtn.classList.remove('transform', '-translate-x-1/2', 'transition-transform');
        }

        function dragKB(e) {
            if (!isDraggingKB) return;
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            if (Math.abs(clientX - dragStartX) > 5 || Math.abs(clientY - dragStartY) > 5) {
                hasMovedKB = true;
                if(e.type === 'touchmove') e.preventDefault(); 

                let newX = clientX - initialKB_X;
                let newY = clientY - initialKB_Y;

                newX = Math.max(0, Math.min(newX, window.innerWidth - floatingBtn.offsetWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - floatingBtn.offsetHeight));

                floatingBtn.style.left = newX + 'px';
                floatingBtn.style.top = newY + 'px';
                floatingBtn.style.right = 'auto';
                floatingBtn.style.bottom = 'auto';
            }
        }

        function endDragKB(e) {
            isDraggingKB = false;
            floatingBtn.classList.add('transition-transform');
        }

        // Toggle Practice Mode & Clear Text
        floatingBtn.addEventListener('click', (e) => {
            if (!hasMovedKB) {
                if (isPracticeMode) {
                    cancelPracticeMode();
                } else {
                    const textarea = byId('chat-input');
                    textarea.value = ''; 
                    startPracticeMode();
                }
            }
        });

        // --- Spelling Logic Engine for Practice Mode ---
        function getPracticeSequence(onset, syllable) {
            let steps = [];
            let tokens = [];

            let remainder = syllable.substring(onset.length);

            // Visual order: Require typing "ေ" first if present
            let hasPreVowelE = remainder.includes('ေ');
            if (hasPreVowelE) {
                tokens.push('ေ');
                remainder = remainder.replace('ေ', '');
            }

            tokens.push(onset);

            let i = 0;
            while (i < remainder.length) {
                let found = false;
                // Treat killer marks combinations (e.g. 'င်', 'က်') as a single keypress
                if (i + 1 < remainder.length) {
                    let twoChar = remainder.substring(i, i+2);
                    if (VIRTUAL_KEYBOARD_CHARS.includes(twoChar)) {
                        tokens.push(twoChar);
                        i += 2;
                        found = true;
                        continue;
                    }
                }
                if (!found) {
                    tokens.push(remainder[i]);
                    i++;
                }
            }

            let logicalString = '';

            // Structure the phonetic sequence based on typing rules
            for (let j = 0; j < tokens.length; j++) {
                let key = tokens[j];
                let sounds = [];

                // Build logical string for the textarea output
                if (key === 'ေ') {
                    logicalString = 'ေ'; 
                } else if (key === onset) {
                    logicalString = hasPreVowelE ? (onset + 'ေ') : onset;
                } else {
                    logicalString += key;
                }

                let nextKey = (j + 1 < tokens.length) ? tokens[j+1] : null;

                if (key === 'ေ') {
                    sounds.push('ေ'); 
                } else if (key === onset) {
                    if (syllable === onset) {
                        sounds.push(onset, 'ယေ', onset); // e.g. အ, ယေ, အ
                    } else if (hasPreVowelE) {
                        let willBeAw = remainder.includes('ာ') || remainder.includes('ါ');
                        if (willBeAw) {
                            sounds.push(onset); // Skip intermediate for 'အော'
                        } else {
                            sounds.push(onset, 'ယေ', logicalString); // e.g. အ, ယေ, အေ
                        }
                    } else {
                        sounds.push(onset);
                    }
                } else {
                    let phoneticKey = getPhoneticKey(key);
                    sounds.push(phoneticKey); 

                    let willBeModifiedFurther = (nextKey !== null);
                    let isToneMark = ['့', 'း'].includes(key) || key === '်';
                    let nextIsToneMark = nextKey !== null && (['့', 'း'].includes(nextKey) || nextKey === '်');

                    if (isToneMark) {
                        if (!willBeModifiedFurther) {
                            sounds.push(logicalString); 
                        }
                    } else {
                        if (!willBeModifiedFurther) {
                            if (logicalString !== phoneticKey) {
                                sounds.push(logicalString);
                            }
                        } else if (nextIsToneMark) {
                            // Skip intermediate sound for ေ...ာ် or ေ...ာ့ pattern
                            let skipIntermediate = false;
                            if (hasPreVowelE && (key === 'ာ' || key === 'ါ')) {
                                skipIntermediate = true;
                            }
                            if (!skipIntermediate && logicalString !== phoneticKey) {
                                sounds.push(logicalString);
                            }
                        }
                    }
                }

                steps.push({
                    key: key,
                    sounds: sounds,
                    insert: logicalString
                });
            }

            return steps;
        }

        // --- Practice Mode Management ---
        function startPracticeMode() {
            if (isPracticeMode || !isAudioInitialized) return;
            
            const btns = rootEl.querySelectorAll('#vowel-syllables .vowel-syllable-btn[data-char]');
            practiceSyllables = Array.from(btns)
                .map(b => b.getAttribute('data-char'))
                .filter(c => c && !EXCLUDED_PRACTICE_CHARS.includes(c));
            
            if (practiceSyllables.length === 0) {
                endPracticeModeWithReward();
                return;
            }
            
            isPracticeMode = true;
            currentPracSyllableIdx = 0;
            
            byId('practice-score').classList.remove('hidden');
            
            floatingBtn.classList.add('animate-pulse');
            
            startPracticeSyllable(0);
        }

        function startPracticeSyllable(index) {
            if (index >= practiceSyllables.length) {
                endPracticeModeWithReward();
                return;
            }
            
            const syllable = practiceSyllables[index];
            practiceSequence = getPracticeSequence(currentOnset, syllable);
            currentPracStepIdx = 0;
            
            const textarea = byId('chat-input');
            practiceStartIndex = textarea.value.length;
            if (practiceStartIndex > 0 && !textarea.value.endsWith(' ') && !textarea.value.endsWith('\n')) {
                 textarea.value += ' ';
                 practiceStartIndex++;
            }
            
            // Highlight current syllable in the grid and dim completed/excluded ones
            rootEl.querySelectorAll('.vowel-syllable-btn').forEach(b => b.classList.remove('syllable-practice-active', 'opacity-50'));
            const allBtns = rootEl.querySelectorAll('#vowel-syllables .vowel-syllable-btn[data-char]');
            allBtns.forEach((btn) => {
                const char = btn.getAttribute('data-char');
                if (EXCLUDED_PRACTICE_CHARS.includes(char)) {
                    btn.classList.add('opacity-50'); 
                } else {
                    const pIdx = practiceSyllables.indexOf(char);
                    if (pIdx !== -1) {
                        if (pIdx < index) {
                            btn.classList.add('opacity-50'); 
                        } else if (pIdx === index) {
                            btn.classList.add('syllable-practice-active');
                            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                }
            });
            
            updatePracticePrompt();
        }

        function updatePointerPosition() {
            if (!isPracticeMode) return;
            const pointer = byId('pointer-finger');
            if (pointer.classList.contains('hidden')) return;

            const targetBtn = rootEl.querySelector('.practice-highlight');
            if (targetBtn) {
                const rect = targetBtn.getBoundingClientRect();
                pointer.style.left = (rect.left + rect.width / 2 - 40) + 'px'; // Center horizontally
                pointer.style.top = (rect.top - 90) + 'px'; // Float above the target
            }
        }
        
        window.addEventListener('scroll', updatePointerPosition, true);
        window.addEventListener('resize', updatePointerPosition);

        function updatePracticePrompt() {
            const step = practiceSequence[currentPracStepIdx];
            
            // Remove previous highlights
            rootEl.querySelectorAll('.practice-highlight').forEach(el => el.classList.remove('practice-highlight'));
            
            // Clear pointer hint and reset timeout
            clearTimeout(pointerHintTimeout);
            const pointer = byId('pointer-finger');
            pointer.classList.add('hidden');
            
            // Find and highlight original target button
            const keyToPress = step.key;
            let targetBtn = rootEl.querySelector(`.keyboard-btn[data-char="${keyToPress}"]`) || 
                            rootEl.querySelector(`.onset-btn[data-char="${keyToPress}"]`) ||
                            rootEl.querySelector(`.vowel-syllable-btn[data-char="${keyToPress}"]`);
            
            if (targetBtn) {
                targetBtn.classList.add('practice-highlight');
                // Auto scroll into view
                targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

                // Show Pointer Finger if the user takes too long (3.5 seconds)
                pointerHintTimeout = setTimeout(() => {
                    if (isPracticeMode && rootEl.querySelector('.practice-highlight')) {
                        pointer.classList.remove('hidden');
                        updatePointerPosition();
                    }
                }, 3500);
            }
        }

        function spawnFlyingDoves(startEl) {
            if (!startEl) return;
            
            const targetSyllableChar = practiceSyllables[currentPracSyllableIdx];
            const endEl = rootEl.querySelector(`.vowel-syllable-btn[data-char="${targetSyllableChar}"]`);
            
            const startRect = startEl.getBoundingClientRect();
            let endRect = endEl ? endEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: 0, height: 0 };

            // Spawn multiple doves
            for (let i = 0; i < 1; i++) {
                const dove = document.createElement('div');
                dove.textContent = '🕊️';
                dove.className = 'fixed z-[400] text-4xl pointer-events-none drop-shadow-md';
                // Start exactly at center of pressed button
                dove.style.left = (startRect.left + startRect.width / 2 - 20) + 'px';
                dove.style.top = (startRect.top + startRect.height / 2 - 20) + 'px';
                rootEl.appendChild(dove);

                const spreadX = (Math.random() - 0.5) * 150;
                
                // Fly sequence using Web Animations API
                const animation = dove.animate([
                    { transform: 'translate(0, 0) scale(0.5) rotate(0deg)', opacity: 1 },
                    { transform: `translate(${spreadX}px, -100px) scale(1.5) rotate(${spreadX/5}deg)`, opacity: 1, offset: 0.4 },
                    { transform: `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top + (endRect.height/2)}px) scale(0.5) rotate(0deg)`, opacity: 0 }
                ], {
                    duration: 2200 + Math.random() * 600,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', 
                    fill: 'forwards'
                });

                animation.onfinish = () => dove.remove();
            }
        }

        async function handlePracticeKeyPress(key) {
            if (!isPracticeMode || playbackInProgress) return;
            
            const step = practiceSequence[currentPracStepIdx];
            const targetBtn = rootEl.querySelector(`.practice-highlight`);
            
            if (key !== step.key) {
                // Wrong key typed
                if (targetBtn) {
                    targetBtn.classList.add('bg-red-500');
                    setTimeout(() => targetBtn.classList.remove('bg-red-500'), 300);
                }
                return;
            }
            
            playbackInProgress = true;

            // Hide pointer and clear timeout
            clearTimeout(pointerHintTimeout);
            byId('pointer-finger').classList.add('hidden');

            // Spawn Flying Doves
            if (targetBtn) {
                spawnFlyingDoves(targetBtn);
            }
            
            const textarea = byId('chat-input');
            textarea.value = textarea.value.substring(0, practiceStartIndex) + step.insert;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            if (targetBtn) targetBtn.classList.remove('practice-highlight');
            
            await playSequentialSounds(step.sounds, 150, true);
            
            currentPracStepIdx++;
            if (currentPracStepIdx >= practiceSequence.length) {
                currentPracSyllableIdx++;
                startPracticeSyllable(currentPracSyllableIdx);
            } else {
                updatePracticePrompt();
            }
            
            playbackInProgress = false;
        }

        function cancelPracticeMode() {
            isPracticeMode = false;
            
            rootEl.querySelectorAll('.practice-highlight').forEach(el => el.classList.remove('practice-highlight'));
            rootEl.querySelectorAll('.vowel-syllable-btn').forEach(el => el.classList.remove('syllable-practice-active', 'opacity-50'));
            floatingBtn.classList.remove('animate-pulse');

            clearTimeout(pointerHintTimeout);
            const pointer = byId('pointer-finger');
            if (pointer) pointer.classList.add('hidden');
        }

        function endPracticeModeWithReward() {
            cancelPracticeMode();
            
            practiceScore++;
            byId('score-val').textContent = practiceScore;
            
            // Show Trophy
            const trophy = byId('trophy-overlay');
            trophy.classList.remove('hidden');
            trophy.classList.remove('opacity-0', 'scale-50');
            
            setTimeout(() => {
                trophy.classList.add('opacity-0', 'scale-50');
                setTimeout(() => {
                    trophy.classList.add('hidden');
                }, 1000);
            }, 2500);
        }

        // --- Basic Audio and Phonetic Logic ---

        function getPhoneticKey(char) {
            if (!char) return char;
            if (char === 'ံ') return 'ံ'; // Ensure standalone anusvara isn't mutated
            if (char === 'ဉ်' || char === 'ဉ') return char; // Preserve standalone Nya letters

            // Protect explicit standalone typing components so they spell out literally instead of mapped variations
            const standaloneProtections = ['င်','က်','စ်','ည်','ဉ်','တ်','န်','ပ်','မ်','ယ်', 'ာ','ါ','ိ','ီ','ု','ူ','ေ','ဲ','်','ံ','း','့','ျ','ြ','ွ','ှ'];
            if (standaloneProtections.includes(char)) return char;

            let mapped = char;

            mapped = mapped.replace(/ဉ်/g, 'ဉ်'); // Normalize

            mapped = mapped.replace(/ံ့$/, 'န့်');
            mapped = mapped.replace(/ံ့$/, 'န့်'); 
            mapped = mapped.replace(/ံး$/, 'န်း');
            mapped = mapped.replace(/ံ$/, 'န်');

            mapped = mapped.replace(/မ်း$/, 'န်း');
            mapped = mapped.replace(/မ့်$/, 'န့်'); 
            mapped = mapped.replace(/မ့်$/, 'န့်'); 
            mapped = mapped.replace(/မ်$/, 'န်');

            mapped = mapped.replace(/ဉ့်$/, 'င့်');
            mapped = mapped.replace(/ဉ့်$/, 'င့်');
            mapped = mapped.replace(/ဉ့္$/, 'င့်');
            mapped = mapped.replace(/ဉ်း$/, 'င်း');
            mapped = mapped.replace(/ဉး$/, 'င်း'); 
            mapped = mapped.replace(/ဉ်$/, 'င်');

            mapped = mapped.replace(/ပ်$/, 'တ်');

            // --- Pali phonetic mappings for unrolled stacked characters ---
            mapped = mapped.replace(/ေတ်$/, 'စ်');  // မေတ္တာ -> မေတ် -> မစ်
            mapped = mapped.replace(/ေန်$/, 'င်');
            mapped = mapped.replace(/ိုလ်$/, 'ို');
            mapped = mapped.replace(/ိုယ်$/, 'ို');
            mapped = mapped.replace(/ိုယ့်$/, 'ို့');
            mapped = mapped.replace(/ာဇ်$/, 'စ်');
            mapped = mapped.replace(/ာဉ်$/, 'င်');
            mapped = mapped.replace(/ာတ်$/, 'တ်');
            mapped = mapped.replace(/ာဏ်$/, 'န်');
            mapped = mapped.replace(/ိုဏ်း$/, 'ိုင်း');
            mapped = mapped.replace(/ိစ်$/, 'ိတ်');
            mapped = mapped.replace(/ိဉ်$/, 'ိန်');
            mapped = mapped.replace(/ောန်$/, 'ွန်');  // ဟောန္တိ -> ဟောန် -> ဟွန်
            mapped = mapped.replace(/ောဉ်$/, 'ွန်');  // ကောဉ္စ -> ကောဉ် -> ကွန်
            mapped = mapped.replace(/ုဉ်$/, 'ုန်');   // သုည -> သုဉ် -> သုန်
            mapped = mapped.replace(/ဒ်$/, 'တ်');   // ဗုဒ္ဓ -> ဗုဒ် -> ဗုတ်
            mapped = mapped.replace(/ဂ်$/, 'က်');   // သက္က -> သက် က
            mapped = mapped.replace(/ိဇ်$/, 'ိတ်');   // ဝိဇ္ဇာ -> ဝိဇ် -> ဝိတ်
            mapped = mapped.replace(/သ်$/, 'တ်');   // တိဿ -> တိသ် -> တိတ်
            mapped = mapped.replace(/ဋ်$/, 'တ်');   // ဝဋ္ဋ -> ဝဋ် -> ဝတ်
            mapped = mapped.replace(/ဍ်$/, 'တ်');
            mapped = mapped.replace(/ဇ်$/, 'စ်');
            mapped = mapped.replace(/ာ့$/, '');
            mapped = mapped.replace(/ာဉ်$/, 'ဉ်');
            mapped = mapped.replace(/ဂ်$/, 'က်');   
            mapped = mapped.replace(/ုခ်$/, 'ုတ်');   
            mapped = mapped.replace(/ဗ်$/, 'ပ်');   
            mapped = mapped.replace(/ဏ်$/, 'န်');   // မဏ္ဍပ် -> မဏ် -> မန်
            mapped = mapped.replace(/ဠ်$/, 'န်');   

            let onset = "";
            const possibleOnsets = CONSONANT_GROUPS_DATA.flat().sort((a, b) => b.length - a.length);
            for(let o of possibleOnsets) {
                if (mapped.startsWith(o)) {
                    onset = o;
                    break;
                }
            }

            if (onset) {
                if (mapped.endsWith('ည့်') || mapped.endsWith('ည့်')) {
                    if (VALID_YI_GROUP1.includes(onset)) mapped = mapped.replace(/ည့်$|ည့်$/, 'ိ');
                    else if (VALID_YI_GROUP2.includes(onset)) mapped = mapped.replace(/ည့်$|ည့်$/, 'ေ့');
                    else if (VALID_YI_GROUP3.includes(onset)) mapped = mapped.replace(/ည့်$|ည့်$/, 'ဲ့');
                    else mapped = mapped.replace(/ည့်$|ည့်$/, 'ိ');
                }
                else if (mapped.endsWith('ည်း')) {
                    if (VALID_YI_GROUP1.includes(onset)) mapped = mapped.replace(/ည်း$/, 'ီး');
                    else if (VALID_YI_GROUP2.includes(onset)) mapped = mapped.replace(/ည်း$/, 'ေး');
                    else if (VALID_YI_GROUP3.includes(onset)) mapped = mapped.replace(/ည်း$/, 'ဲ');
                    else mapped = mapped.replace(/ည်း$/, 'ီး'); 
                }
                else if (mapped.endsWith('ည်')) {
                    if (VALID_YI_GROUP1.includes(onset)) mapped = mapped.replace(/ည်$/, 'ီ');
                    else if (VALID_YI_GROUP2.includes(onset)) mapped = mapped.replace(/ည်$/, 'ေ');
                    else if (VALID_YI_GROUP3.includes(onset)) mapped = mapped.replace(/ည်$/, 'ယ်');
                    else mapped = mapped.replace(/ည်$/, 'ီ'); 
                }
            }

            if (SPECIAL_SOUND_MAPPING.hasOwnProperty(mapped)) return SPECIAL_SOUND_MAPPING[mapped];
            
            for (let len = 4; len >= 1; len--) {
                const sub = mapped.substring(0, len);
                if (SOUND_MAPPING[sub] && sub.length === len) {
                    return SOUND_MAPPING[sub] + mapped.substring(len);
                }
            }
            return mapped;
        }

        function getAudioInfo(char) {
            if (!char) return null;
            
            let phoneticKey = getPhoneticKey(char);
            if (CHAR_MAP.hasOwnProperty(phoneticKey)) return CHAR_MAP[phoneticKey];
            
            const lastChar = phoneticKey.slice(-1);
            if (lastChar === 'း' || lastChar === '့') {
                const baseSyllable = phoneticKey.slice(0, -1);
                if (CHAR_MAP.hasOwnProperty(baseSyllable)) return CHAR_MAP[baseSyllable];
            }
            
            if (CHAR_MAP.hasOwnProperty(char)) return CHAR_MAP[char];
            return null;
        }
        
        function parseMyanmarSyllables(text) {
            const syllables = [];
            let remaining = text.trim().replace(/[^က-အ\u1020-\u103f\s]/g, ''); 
            
            while (remaining.length > 0) {
                if (remaining[0] === ' ') {
                    remaining = remaining.substring(1);
                    continue;
                }
                
                let bestMatch = null, bestLength = 0;
                // Increased length from 5 to 12 to correctly grab long syllables like "ကြောင်း", "ပေါင်း"
                for (let len = Math.min(12, remaining.length); len >= 1; len--) {
                    const candidate = remaining.substring(0, len);
                    if (candidate.includes(' ')) continue; 
                    
                    if (getAudioInfo(candidate)) { 
                        bestMatch = candidate; 
                        bestLength = len; 
                        break; 
                    }
                }
                if (bestMatch) { 
                    syllables.push(bestMatch); 
                    remaining = remaining.substring(bestLength); 
                } else { 
                    remaining = remaining.substring(1); 
                }
            }
            return syllables;
        }

        async function playSequentialSounds(charArray, interSoundDelayMs, ignorePlaybackState = false) {
            if (!isAudioInitialized) return;
            
            globalPlaySeq++;
            const mySeq = globalPlaySeq;

            if (audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch (e) { return; }
            }
            
            if (currentTypingSource && !ignorePlaybackState) { 
                try { currentTypingSource.stop(); } catch (e) {} 
            }

            playbackInProgress = true;

            for (let i = 0; i < charArray.length; i++) {
                if (!ignorePlaybackState && mySeq !== globalPlaySeq) {
                    break; // နောက်အသံတစ်ခု ဝင်လာပါက လက်ရှိဖတ်နေတာကို ရပ်မည်
                }

                const charToPlay = charArray[i];
                const info = getAudioInfo(charToPlay);
                if (!info) continue;
                
                let buffer = null;
                if (info.bufferKey === 'level1') buffer = level1Buffer;
                else if (info.bufferKey === 'level2') buffer = level2Buffer;
                if (!buffer) continue;

                await new Promise(resolve => {
                    const durationSec = info.duration / 1000;
                    const offsetSec = info.offsetSec;

                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    currentTypingSource = source; 
                    
                    source.start(0, offsetSec, durationSec);
                    
                    source.onended = () => {
                        if (currentTypingSource === source) currentTypingSource = null;
                        if (i < charArray.length - 1) {
                            setTimeout(() => resolve(), interSoundDelayMs);
                        } else {
                            resolve();
                        }
                    };
                });
            }
            
            if (mySeq === globalPlaySeq) {
                playbackInProgress = false;
            }
        }
        
        async function playCharWithButtonHighlight(char, buttonElement, preventSeqIncrement = false) {
            if (!isAudioInitialized || !buttonElement) return;

            if (!preventSeqIncrement) {
                globalPlaySeq++;
            }
            const mySeq = globalPlaySeq;

            const info = getAudioInfo(char);
            if (!info) return;

            if (audioContext.state === 'suspended') {
                try { await audioContext.resume(); } catch (e) { return; }
            }
            
            if (currentTypingSource) { try { currentTypingSource.stop(); } catch (e) {} }

            buttonElement.classList.add('highlight-active');
            playbackInProgress = true;
            
            let buffer = null;
            if (info.bufferKey === 'level1') buffer = level1Buffer;
            else if (info.bufferKey === 'level2') buffer = level2Buffer;
            
            await new Promise(resolve => {
                const durationSec = info.duration / 1000;
                const offsetSec = info.offsetSec;
                
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                currentTypingSource = source; 
                
                source.start(0, offsetSec, durationSec);
                
                source.onended = () => {
                    if (currentTypingSource === source) currentTypingSource = null;
                    buttonElement.classList.remove('highlight-active');
                    if (!preventSeqIncrement && mySeq === globalPlaySeq) playbackInProgress = false;
                    resolve();
                };
            });
        }

        async function playSyllableSequenceWithHighlight(syllableArray, spacedFullText) {
            globalPlaySeq++;
            const mySeq = globalPlaySeq;

            if (currentTypingSource) { try { currentTypingSource.stop(); } catch (e) {} }

            if (syllableArray.length === 0) return;
            
            CHAT_INPUT.classList.add('hidden');
            HIGHLIGHT_AREA.classList.remove('hidden');
            playbackInProgress = true;
            
            let fullText = spacedFullText; 
            let currentSyllableIndex = 0;

            const textParts = fullText.match(/(\s+)|([က-အ\u1020-\u103f]+)/g) || [];
            
            const updateHighlightDisplay = () => {
                let html = '';
                let tempSyllableIndex = 0; 

                textParts.forEach(part => {
                    if (/\s+/.test(part)) {
                        html += part.replace(/\n/g, '<br/>');
                    } else {
                        let remainingPart = part;
                        while (remainingPart.length > 0) {
                            let bestMatch = null, bestLength = 0;
                            
                            // Increased length from 5 to 12 to match the parser logic
                            for (let len = Math.min(12, remainingPart.length); len >= 1; len--) {
                                const candidate = remainingPart.substring(0, len);
                                if (getAudioInfo(candidate)) { 
                                    bestMatch = candidate; 
                                    bestLength = len; 
                                    break; 
                                }
                            }
                            
                            if (bestMatch) {
                                if (tempSyllableIndex === currentSyllableIndex) {
                                    html += `<span class="highlight-syllable">${bestMatch}</span>`;
                                } else {
                                    html += bestMatch;
                                }
                                remainingPart = remainingPart.substring(bestLength);
                                tempSyllableIndex++;
                            } else {
                                remainingPart = remainingPart.substring(1); 
                            }
                        }
                    }
                });

                HIGHLIGHT_AREA.innerHTML = html;

                const highlightedSpan = HIGHLIGHT_AREA.querySelector('.highlight-syllable');
                if (highlightedSpan) {
                    const topPos = highlightedSpan.offsetTop - HIGHLIGHT_AREA.offsetTop;
                    const containerHeight = HIGHLIGHT_AREA.clientHeight;
                    if (topPos > HIGHLIGHT_AREA.scrollTop + containerHeight - 50 || topPos < HIGHLIGHT_AREA.scrollTop) {
                        HIGHLIGHT_AREA.scrollTop = topPos - containerHeight / 2;
                    }
                }
            };
            
            for (const char of syllableArray) {
                if (mySeq !== globalPlaySeq) break;
                
                const info = getAudioInfo(char);
                if (!info) {
                    currentSyllableIndex++;
                    continue;
                }

                updateHighlightDisplay();
                
                let buffer = null;
                if (info.bufferKey === 'level1') buffer = level1Buffer;
                else if (info.bufferKey === 'level2') buffer = level2Buffer;
                if (!buffer) continue;

                await new Promise(resolve => {
                    const durationSec = info.duration / 1000;
                    const offsetSec = info.offsetSec;
                    
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    currentTypingSource = source; 
                    
                    source.start(0, offsetSec, durationSec);
                    
                    source.onended = () => {
                        currentTypingSource = null;
                        setTimeout(() => resolve(), 150); 
                    };
                });

                currentSyllableIndex++;
            }

            currentTypingSource = null;
            HIGHLIGHT_AREA.innerHTML = ''; 
            HIGHLIGHT_AREA.classList.add('hidden');
            CHAT_INPUT.classList.remove('hidden');
            
            if (mySeq === globalPlaySeq) {
                playbackInProgress = false;
            }
        }

        async function loadAudio(url, key) {
            if (loadedBuffers[key]) return loadedBuffers[key];
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${key}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    loadedBuffers[key] = audioBuffer;
                    return audioBuffer;
                } catch (e) {
                     console.error(`[Audio Load] Attempt ${attempt + 1} failed for ${key}:`, e);
                     if (attempt === 2) throw e; 
                     await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                }
            }
        }

        function updateScrollButtons(scrollerId, leftBtnId, rightBtnId) {
            const scroller = byId(scrollerId);
            const leftBtn = byId(leftBtnId);
            const rightBtn = byId(rightBtnId);
            if (!scroller || !leftBtn || !rightBtn) return;

            if (scroller.scrollLeft > 5) {
                leftBtn.classList.remove('hidden');
                leftBtn.classList.add('flex');
            } else {
                leftBtn.classList.add('hidden');
                leftBtn.classList.remove('flex');
            }

            if (scroller.scrollWidth - scroller.clientWidth > scroller.scrollLeft + 5) {
                rightBtn.classList.remove('hidden');
                rightBtn.classList.add('flex');
            } else {
                rightBtn.classList.add('hidden');
                rightBtn.classList.remove('flex');
            }
        }

        function setupScroller(scrollerId, leftBtnId, rightBtnId) {
            const scroller = byId(scrollerId);
            const leftBtn = byId(leftBtnId);
            const rightBtn = byId(rightBtnId);
            if (!scroller || !leftBtn || !rightBtn) return;

            scroller.addEventListener('scroll', () => updateScrollButtons(scrollerId, leftBtnId, rightBtnId));
            window.addEventListener('resize', () => updateScrollButtons(scrollerId, leftBtnId, rightBtnId));

            leftBtn.addEventListener('click', () => {
                scroller.scrollBy({ left: -200, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                scroller.scrollBy({ left: 200, behavior: 'smooth' });
            });
        }
        
        async function initialize() {
    if (!audioContext) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
        } catch (e) {
            console.error('AudioContext creation failed:', e);
        }
    }

    byId('main-content').classList.remove('hidden');

    try {
        [level1Buffer, level2Buffer] = await Promise.all([
            loadAudio(AUDIO_URLS.level1, 'level1'),
            loadAudio(AUDIO_URLS.level2, 'level2')
        ]);

        isAudioInitialized = true;

        setupScroller('onset-scroller', 'onset-scroll-left', 'onset-scroll-right');
        setupScroller('keyboard-scroller', 'keyboard-scroll-left', 'keyboard-scroll-right');

        renderSyllableSetIcons();
        renderOnsetScroller(CONSONANT_GROUPS_DATA[0], 'red');
        renderVowelSyllables(currentOnset);
        renderVirtualKeyboard();
    } catch (e) {
        console.error('Error loading audio:', e);
    }
}

        initialize();

        function renderSyllableSetIcons() {
            const container = byId('syllable-sets-container');
            container.innerHTML = '';
            
            SYLLABLE_SETS.forEach((_, index) => {
                const btn = document.createElement('button');
                btn.className = `w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center transition-transform shadow-md ${index === currentSetIndex ? 'bg-sky-400 text-gray-900 ring-2 ring-white scale-110' : 'bg-gray-600 text-white hover:bg-gray-500 hover:scale-105'}`;
                btn.textContent = index + 1;
                btn.onclick = () => {
                    currentSetIndex = index;
                    
                    currentOnset = 'အ';
                    
                    rootEl.querySelectorAll('.consonant-group-btn').forEach(b => b.classList.remove('active'));
                    const group0Btn = rootEl.querySelector('.consonant-group-btn[data-group-index="0"]');
                    if (group0Btn) {
                        group0Btn.classList.add('active');
                        renderOnsetScroller(CONSONANT_GROUPS_DATA[0], group0Btn.getAttribute('data-group-color'));
                    }

                    renderSyllableSetIcons(); 
                    renderVowelSyllables('အ'); 
                    if(isPracticeMode) {
                        cancelPracticeMode();
                        startPracticeMode();
                    }
                };
                container.appendChild(btn);
            });
        }

        function renderVowelSyllables(onsetChar) {
            currentOnset = onsetChar;
            const container = byId('vowel-syllables');
            container.innerHTML = '';
            
            const currentSetPatterns = SYLLABLE_SETS[currentSetIndex];

            currentSetPatterns.forEach((pattern, index) => {
                
                if (pattern.includes('ည်')) {
                    if (currentSetIndex === 2 && !VALID_YI_GROUP1.includes(onsetChar)) return;
                    if (currentSetIndex === 4 && !VALID_YI_GROUP2.includes(onsetChar)) return;
                    if (currentSetIndex === 5 && !VALID_YI_GROUP3.includes(onsetChar)) return;
                }
                if (pattern.includes('ဉ်')) {
                    if (currentSetIndex === 10 && !VALID_YIN_GROUP.includes(onsetChar) && onsetChar !== 'ယျ') return;
                }

                let syllable = pattern;
                
                if (onsetChar !== 'အ') {
                    let modifiedPattern = pattern;
                    if (onsetChar.includes('ွ')) {
                        modifiedPattern = modifiedPattern.replace(/အွ/g, 'အ');
                    }
                    syllable = modifiedPattern.replace(/အ/g, onsetChar);
                }

                const specialOnsetsForTallAa = ['ခ', 'ခွ', 'ဂ', 'ဂွ', 'င', 'ဒ', 'ဒွ', 'ဓွ', 'ပွ', 'ပ', 'ဝ'];
                if (specialOnsetsForTallAa.includes(onsetChar)) {
                    syllable = syllable.replace(/ာ/g, 'ါ');
                }

                const button = document.createElement('div');
                const info = getAudioInfo(syllable);
                const colorClasses = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-lime-500','bg-green-500','bg-emerald-500','bg-cyan-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-pink-500','bg-fuchsia-500'];
                
                const baseOnsetRoman = ONSET_ROMAN_MAP[onsetChar] !== undefined ? ONSET_ROMAN_MAP[onsetChar] : '';
                const leftRoman = (baseOnsetRoman !== '' || onsetChar === 'အ' ? baseOnsetRoman + 'a' : '').toLowerCase();
                const rightRoman = getRhymeRoman(pattern, currentSetIndex).toLowerCase();

                const innerContent = `
                    <span class="absolute top-0.5 left-1 text-[15px] sm:text-[15px] leading-none text-black/70 font-normal tracking-wide pointer-events-none">${leftRoman}</span>
                    <span class="z-10 pointer-events-none">${syllable}</span>
                    <span class="absolute bottom-0.5 right-1 text-[15px] sm:text-[15px] leading-none text-black/70 font-normal tracking-wide pointer-events-none">${rightRoman}</span>
                `;

                if (info) {
                    button.className = `relative char-box vowel-syllable-btn flex justify-center items-center h-12 rounded-lg text-xl sm:text-2xl font-bold text-white shadow-md ${colorClasses[index % colorClasses.length]} hover:brightness-125`;
                    button.setAttribute('data-char', syllable);
                    button.innerHTML = innerContent;
                } else {
                    button.className = `relative char-box flex justify-center items-center h-12 rounded-lg text-xl sm:text-2xl font-bold text-gray-500 shadow-inner bg-gray-800 cursor-not-allowed opacity-70 vowel-syllable-btn`;
                    button.setAttribute('data-char', syllable);
                    button.innerHTML = innerContent;
                }
                container.appendChild(button);
            });
            
            if(isPracticeMode) {
                cancelPracticeMode();
                startPracticeMode();
            }
        }

        function renderOnsetScroller(consonantArray, color) {
            const stickyContainer = byId('sticky-onset-controls');
            const scrollContainer = byId('onset-scroller');
            stickyContainer.innerHTML = ''; 
            scrollContainer.innerHTML = '';

            const readAllVowelsBtn = document.createElement('div');
            readAllVowelsBtn.id = 'read-all-vowels-btn';
            readAllVowelsBtn.title = 'Read all / Stop';
            readAllVowelsBtn.className = 'onset-btn char-box flex justify-center items-center bg-yellow-500 hover:bg-yellow-600';
            readAllVowelsBtn.innerHTML = `<svg id="read-all-icon" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>`;
            stickyContainer.appendChild(readAllVowelsBtn);

            const separator = document.createElement('div');
            separator.className = 'flex-shrink-0 w-px h-10 bg-gray-500 mx-1 self-center';
            stickyContainer.appendChild(separator);

            const bgColor = `bg-${color}-500`, hoverColor = `hover:bg-${color}-600`;
            consonantArray.forEach(char => {
                const button = document.createElement('div');
                button.className = `onset-btn char-box ${bgColor} ${hoverColor}`;
                button.textContent = char;
                button.setAttribute('data-char', char);
                if (char === currentOnset) button.classList.add('active');
                scrollContainer.appendChild(button);
            });
            
            setTimeout(() => updateScrollButtons('onset-scroller', 'onset-scroll-left', 'onset-scroll-right'), 50);
        }

        function renderVirtualKeyboard() {
            const container = byId('keyboard-scroller');
            container.innerHTML = '';
            VIRTUAL_KEYBOARD_CHARS.forEach(char => {
                const button = document.createElement('div');
                button.className = 'keyboard-btn char-box';
                button.setAttribute('data-char', char);
                if (char === 'space') { 
                    button.textContent = 'Space'; 
                    button.classList.add('bg-gray-500', 'hover:bg-gray-600', 'action-btn');
                } else if (char === 'backspace') { 
                    button.innerHTML = '⌫'; 
                    button.classList.add('bg-red-600', 'hover:bg-red-700', 'action-btn'); 
                    button.style.fontSize = '1.8rem';
                } else { 
                    button.textContent = char; 
                    if (char === 'ေ') { 
                         button.classList.add('bg-white', 'text-gray-900', 'hover:bg-gray-200');
                    } else {
                         button.classList.add('bg-indigo-600', 'hover:bg-indigo-700'); 
                    }
                }
                container.appendChild(button);
            });

            setTimeout(() => updateScrollButtons('keyboard-scroller', 'keyboard-scroll-left', 'keyboard-scroll-right'), 50);
        }

        byId('vowel-syllables').addEventListener('click', async (e) => {
            const vowelBtn = e.target.closest('.vowel-syllable-btn[data-char]');
            if (vowelBtn && !isPracticeMode) { 
                const syllable = vowelBtn.dataset.char;
                
                // Get spelling sequence similar to typing practice
                const seq = getPracticeSequence(currentOnset, syllable);
                const soundsToPlay = [];
                seq.forEach(step => {
                    soundsToPlay.push(...step.sounds);
                });
                
                // Remove existing active highlights
                rootEl.querySelectorAll('.vowel-syllable-btn.highlight-active').forEach(b => b.classList.remove('highlight-active'));
                
                vowelBtn.classList.add('highlight-active');
                
                // Play each phonetic sound sequentially
                await playSequentialSounds(soundsToPlay, 150); 
                
                // Remove highlight after playback
                vowelBtn.classList.remove('highlight-active');
            }
        });

        byId('sticky-onset-controls').addEventListener('click', async (e) => {
            const btn = e.target.closest('#read-all-vowels-btn');
            if (!btn || isPracticeMode) return;
            
            const iconSvg = btn.querySelector('svg');
            const speakerHtml = `<path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
            const stopHtml = `<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>`;

            if (playbackInProgress) {
                playbackInProgress = false; 
                globalPlaySeq++;
                if (currentTypingSource) { try { currentTypingSource.stop(); } catch (e) {} }
                if (iconSvg) iconSvg.innerHTML = speakerHtml;
                return;
            }
            
            playbackInProgress = true; 
            globalPlaySeq++;
            const mySeq = globalPlaySeq;
            if (iconSvg) iconSvg.innerHTML = stopHtml;

            const syllableButtons = rootEl.querySelectorAll('#vowel-syllables .vowel-syllable-btn[data-char]');
            const excludeFromRead = ['၏','ဤ','ဥ','ဦ','ဦး','ဧ','ဪ','ဩ'];

            for (const button of syllableButtons) {
                if (mySeq !== globalPlaySeq) break; 
                const syllable = button.getAttribute('data-char');
                
                if (excludeFromRead.includes(syllable)) {
                    continue; 
                }

                // Prevent inner play action from resetting globalPlaySeq causing the loop to break early
                await playCharWithButtonHighlight(syllable, button, true); 
                
                let delaySteps = 15;
                for(let i = 0; i < delaySteps; i++) {
                    if (mySeq !== globalPlaySeq) break;
                    await new Promise(r => setTimeout(r, 10));
                }
            }
            if (mySeq === globalPlaySeq) {
                playbackInProgress = false;
                if (iconSvg) iconSvg.innerHTML = speakerHtml;
            }
        });

        byId('consonant-groups').addEventListener('click', (e) => {
            const btn = e.target.closest('.consonant-group-btn');
            if (!btn) return;
            rootEl.querySelectorAll('.consonant-group-btn').forEach(b => b.classList.remove('active'));
            const color = btn.getAttribute('data-group-color');
            btn.classList.add('active');
            const index = parseInt(btn.getAttribute('data-group-index'));
            renderOnsetScroller(CONSONANT_GROUPS_DATA[index], color); 
        });
        
        byId('onset-scroller').addEventListener('click', async (e) => {
            const btn = e.target.closest('.onset-btn');
            if (!btn) return;
            const onsetChar = btn.getAttribute('data-char');
            if (!onsetChar) return;

            if (isPracticeMode) {
                handlePracticeKeyPress(onsetChar);
                return;
            }

            currentOnset = onsetChar;
            rootEl.querySelectorAll('#onset-scroller .onset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            renderVowelSyllables(onsetChar);

            const textarea = byId('chat-input');
            textarea.value = normalizeMyanmarText(textarea.value + onsetChar);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            if (freeTypingTimeout) {
                clearTimeout(freeTypingTimeout);
                freeTypingTimeout = null;
            }

            await playSequentialSounds([onsetChar], 0); 

            const newSyllableAfter = parseMyanmarSyllables(insertSpacesBurmese(textarea.value)).pop();
            if (newSyllableAfter && getAudioInfo(newSyllableAfter) && newSyllableAfter !== onsetChar) {
                freeTypingTimeout = setTimeout(() => {
                    playSequentialSounds([newSyllableAfter], 0);
                }, 600);
            }
        });

        byId('quick-buttons-container').addEventListener('click', async (e) => {
            const readAllTextBtn = e.target.closest('#read-all-text-btn');
            const keyBtn = e.target.closest('.keyboard-btn');
            const textarea = byId('chat-input');
            
            if (readAllTextBtn) {
                const fullText = textarea.value;
                if (fullText) {
                    const spacedText = insertSpacesBurmese(fullText);
                    const syllablesToPlay = parseMyanmarSyllables(spacedText);
                    await playSyllableSequenceWithHighlight(syllablesToPlay, spacedText); 
                }
                return;
            }

            if (keyBtn) {
                const char = keyBtn.dataset.char;
                
                if (isPracticeMode) {
                    handlePracticeKeyPress(char);
                    return;
                }
                
                let currentText = textarea.value;
                
                if (char === 'space') {
                    textarea.value += ' ';
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                } else if (char === 'backspace') {
                    textarea.value = [...currentText].slice(0, -1).join('');
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                }
                
                const potentialNewText = normalizeMyanmarText(currentText + char);
                const prevSyllable = parseMyanmarSyllables(insertSpacesBurmese(currentText)).pop();
                const newSyllableAfter = parseMyanmarSyllables(insertSpacesBurmese(potentialNewText)).pop();
                
                let componentCharToPlay = '';
                if (CONSONANT_TRIGGERS.includes(char)) {
                    componentCharToPlay = char; 
                } else if (COMPONENT_TRIGGERS.includes(char) || FINAL_CONSONANT_TRIGGERS.includes(char)) {
                    if (getAudioInfo(char)) {
                        componentCharToPlay = char; 
                    } else if (FINAL_CONSONANT_TRIGGERS.includes(char)) {
                         componentCharToPlay = getPhoneticKey(char);
                    }
                }
                
                textarea.value = potentialNewText;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                if (freeTypingTimeout) {
                    clearTimeout(freeTypingTimeout);
                    freeTypingTimeout = null;
                }
                
                let soundsToPlay = [];
                const isToneMark = ['့', 'း'].includes(char);

                if (isToneMark && prevSyllable && getAudioInfo(prevSyllable)) {
                    // Read the previously completed syllable before the tone mark
                    soundsToPlay.push(prevSyllable);
                }

                if (componentCharToPlay && getAudioInfo(componentCharToPlay)) {
                    soundsToPlay.push(componentCharToPlay);
                }
                
                if (soundsToPlay.length > 0) {
                    await playSequentialSounds(soundsToPlay, 150);
                }

                if (newSyllableAfter && getAudioInfo(newSyllableAfter)) {
                    if (newSyllableAfter !== componentCharToPlay) {
                        // Wait to see if typing continues before reading the syllable to prevent premature read (e.g., 'ကြော')
                        freeTypingTimeout = setTimeout(() => {
                            playSequentialSounds([newSyllableAfter], 0);
                        }, 600);
                    }
                }
            }
        });

    return () => {
      // Browsers cap how many AudioContexts a page may have open at once;
      // this app can now be entered/exited repeatedly within a session
      // (e.g. navigating parts inside the "Reading Myanmar" group), so an
      // unclosed context left over from a previous visit could exhaust
      // that limit and make a later visit fail to load audio at all.
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, []);

  return (
    <>
      <style>{MS_APP_CSS}</style>
      <div
        ref={containerRef}
        className="ms-app-root p-4 sm:p-8 relative"
        dangerouslySetInnerHTML={{ __html: MS_APP_BODY_HTML }}
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
              <h2 className="text-xl font-bold text-gray-800">🔤 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
