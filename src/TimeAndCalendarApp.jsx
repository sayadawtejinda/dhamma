import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "အချိန် နှင့် ပြက္ခဒိန် လေ့ကျင့်ခန်း"
// (Time and Calendar Practice) HTML app ──
// Same hybrid approach as the other ported apps in this project: the
// original vanilla JS (DOM manipulation, Web Audio playback) is kept almost
// unchanged inside a React wrapper instead of being rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. This app has no
// onclick="..." string attributes at all (it wires everything via
// addEventListener), so no window bridge object is needed here.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule (with the page
// background image/font) — rescoped to .tc-app-root so it doesn't leak onto
// the rest of the SPA, since every app stays mounted simultaneously (just
// hidden via CSS) per App.jsx's design.

const TC_ROSTER_PATH = 'artifacts/time-and-calendar-app/public/data/roster';
const sanitizeTcKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const TC_APP_CSS = `
        /* Custom Font */
        @font-face {
            font-family: 'Pyidaungsu';
            src: url('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMyanmar/NotoSansMyanmar-Regular.ttf') format('truetype');
        }

        /* General Styles */
        .tc-app-root {
            font-family: 'Pyidaungsu', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-size: cover;
            background-position: center;
            background-image: url('https://loveincorporated.blob.core.windows.net/contentimages/gallery/32a644e7-50ab-4435-9e12-5013eea5382f-crater-lake-maroon-bells-usa.jpg');
            color: #333;
            transition: background-image 0.5s ease;
            padding: 20px 0;
        }

        .card {
            background-color: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            padding: 30px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            width: 95%;
            max-width: 650px;
        }

        /* View Toggle Icon */
        #view-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            cursor: pointer;
            z-index: 20;
            background-color: #e0f7fa;
            border-radius: 50%;
            padding: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: transform 0.2s ease, background-color 0.2s ease;
        }
        #view-toggle:hover {
            transform: scale(1.1);
            background-color: #b2ebf2;
        }
        #view-toggle svg {
            width: 32px;
            height: 32px;
            color: #00796b;
        }

        /* Views Container */
        .practice-view {
            width: 100%;
            display: none; /* Hidden by default, JS will manage visibility */
        }
        .practice-view.active {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        /* Clock Styles (from previous version) */
        .analog-clock-display {
            width: 250px;
            height: 250px;
            border: 10px solid #005a8d;
            border-radius: 50%;
            background-color: white;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.3) inset;
            position: relative;
            margin-bottom: 20px;
            cursor: pointer;
        }
        .analog-hand { position: absolute; bottom: 50%; left: 50%; transform-origin: bottom; border-radius: 5px; z-index: 2; }
        .analog-hour-hand { width: 6px; height: 60px; background-color: #005a8d; }
        .analog-minute-hand { width: 4px; height: 90px; background-color: #005a8d; }
        .analog-second-hand { width: 2px; height: 105px; background-color: red; z-index: 5; transition: transform 0.2s linear; }
        .analog-center-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: black; border-radius: 50%; z-index: 10; }
        .analog-number { position: absolute; font-size: 1.1rem; font-weight: bold; color: #1e1e1e; z-index: 1; }

        /* Control Panel Styles (for clock) */
        .control-panel { display: flex; flex-direction: row; gap: 20px; width: 100%; max-width: 500px; margin-top: 15px; }
        .control-panel > * { flex-grow: 1; }
        .control-panel select, .control-panel button { padding: 12px 15px; font-size: 1.1rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: none; }
        #questionSelect { background-color: #eaf8ff; color: #005a8d; border: 2px solid #005a8d; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23005A8D'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }
        #questionSelect:hover { background-color: #d8f0ff; }
        #answerButton { background: linear-gradient(145deg, #28a745, #1e7e34); color: white; }
        #answerButton:hover { background: linear-gradient(145deg, #1e7e34, #155b25); transform: translateY(-2px); box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2); }
        #answerButton:active { transform: translateY(0); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3); }

        /* Calendar Styles */
        #calendar-view {
            cursor: pointer;
            border: 2px dashed #ccc;
            border-radius: 15px;
            padding: 15px;
            background-color: #fcfdff;
            width: 100%;
        }
        .calendar-grid-container {
            display: grid;
            gap: 15px; /* Increased gap for better separation without headings */
            width: 100%;
            text-align: center;
        }
        .calendar-grid-container h3 {
            grid-column: 1 / -1;
            font-size: 1.1rem;
            font-weight: bold;
            color: #005a8d;
            margin: 10px 0 5px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #e0e0e0;
        }
        .grid-7-col { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .single-item-container {
            display: grid;
            justify-items: center;
        }

        .calendar-item {
            padding: 8px 5px;
            border-radius: 8px;
            background-color: #f1f5f9;
            font-weight: 500;
            transition: transform 0.2s, background-color 0.2s;
            cursor: pointer;
        }
        .calendar-item:hover {
            transform: scale(1.05);
            background-color: #e2e8f0;
        }
        .calendar-item.highlight {
            background-color: #fcd34d; /* yellow-400 */
            color: #b45309; /* yellow-700 */
            font-weight: bold;
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(252, 211, 77, 0.7);
        }

        .calendar-dow-header {
            padding: 6px 3px;
            border-radius: 8px;
            background-color: #e2e8f0;
            font-weight: bold;
            color: #1e3a8a;
            font-size: 0.9rem;
            transition: transform 0.2s, background-color 0.2s;
            cursor: pointer;
        }
        .calendar-dow-header:hover {
            transform: scale(1.05);
            background-color: #cbd5e1;
        }
        .calendar-dow-header.highlight {
            background-color: #fcd34d;
            color: #b45309;
            font-weight: bold;
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(252, 211, 77, 0.7);
        }

        /* Message Box Style */
        #messageBox {
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #fff8e1; color: #5d4037;
            padding: 15px 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5); border: 2px solid #ffcc80;
            font-size: 1.2em; font-weight: bold; z-index: 1000; opacity: 0; transition: opacity 0.3s ease;
            pointer-events: none; text-align: center; max-width: 90%;
        }
        #messageBox.show { opacity: 1; pointer-events: auto; }
        .english-translation { display: block; font-size: 0.9em; font-weight: normal; color: #9c6c39; margin-top: 8px; border-top: 1px dashed #ffcc80; padding-top: 8px; }
        
        /* Responsive adjustments */
        @media (max-width: 600px) {
            body { padding: 10px 0; }
            .card { padding: 30px 15px; }
            h1 { font-size: 1.25rem; }
            .analog-clock-display { width: 200px; height: 200px; }
            .control-panel { flex-direction: column; gap: 15px; max-width: 90%; }
            .calendar-grid-container { gap: 10px; }
            .calendar-item, .calendar-dow-header { font-size: 0.8rem; padding: 5px 2px; }
        }
`;

const TC_APP_BODY_HTML = `

    <div class="card">
        <!-- TOGGLE ICON -->
        <div id="view-toggle" title="ပြက္ခဒိန်သို့ပြောင်းရန်">
            <svg id="toggle-icon-calendar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
            <svg id="toggle-icon-clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
        </div>

        <h1 class="text-2xl font-bold mb-5 text-gray-800 text-center">အချိန် နှင့် ပြက္ခဒိန် လေ့ကျင့်ခန်း</h1>

        <!-- CLOCK VIEW -->
        <div id="clock-view" class="practice-view active">
            <div class="analog-clock-display" id="analog-clock" title="မေးခွန်းကို ထပ်မံမေးမြန်းရန် နှိပ်ပါ။">
                <div class="analog-hour-hand analog-hand" id="analog-hour-hand"></div>
                <div class="analog-minute-hand analog-hand" id="analog-minute-hand"></div>
                <div class="analog-second-hand analog-hand" id="analog-second-hand"></div>
                <div class="analog-center-dot"></div>
            </div>
            <div class="control-panel">
                <select id="questionSelect" title="မေးခွန်းရွေးချယ်ရန်">
                    <option value="" disabled selected>Select Question</option>
                </select>
                <button id="answerButton" disabled title="အဖြေနှင့် အချိန်မှန်ကို ပြသရန်">Answer</button>
            </div>
        </div>

        <!-- CALENDAR VIEW -->
        <div id="calendar-view" class="practice-view" title="မေးခွန်းမေးရန် နှိပ်ပါ။">
            <!-- The instruction paragraph and all h3 headings were removed as requested for a cleaner look -->
            <div id="calendar-container" class="calendar-grid-container">
                <div class="flex justify-around items-center w-full">
                    <div class="single-item-container" id="calendar-years"></div>
                    <div class="single-item-container" id="calendar-holidays"></div>
                </div>
                <div class="grid-7-col" id="calendar-grid">
                    <!-- JS will populate this with DOW headers and Dates -->
                </div>
                <div class="single-item-container" id="calendar-months-en"></div>
                <div class="single-item-container" id="calendar-months-mm"></div>
            </div>
        </div>
    </div>
    
    <div id="messageBox"></div>
    <audio id="master-audio-source" src="https://raw.githubusercontent.com/nathantun93/bell/main/အချိန်.mp3" preload="auto"></audio>

`;

export default function TimeAndCalendarApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, TC_ROSTER_PATH, sanitizeTcKey(studentName));
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
    const unsub = onSnapshot(collection(db, TC_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Time and Calendar roster listen error:', e));
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

        // --- DOM Elements ---
        const messageBox = byId('messageBox');
        const viewToggle = byId('view-toggle');
        const iconCalendar = byId('toggle-icon-calendar');
        const iconClock = byId('toggle-icon-clock');
        const clockView = byId('clock-view');
        const calendarView = byId('calendar-view');
        // Clock elements
        const analogClockContainer = byId('analog-clock');
        const analogHourHand = byId('analog-hour-hand');
        const analogMinuteHand = byId('analog-minute-hand');
        const analogSecondHand = byId('analog-second-hand');
        const questionSelect = byId('questionSelect');
        const answerButton = byId('answerButton');
        // Calendar elements
        const calendarContainer = byId('calendar-container');

        // --- Data Structures ---
        const CLOCK_CONVERSATION_DATA = [
            { id: 'QA1', qKey: 'Q_35', aKey: 'A_1', qText: 'ဘယ်အချိန်ပြန်ရောက်မှာလဲ', aText: '၆နာရီခွဲလောက်ပြန်ရောက်မယ်', qEn: 'What time will you be back?', aEn: "I'll be back around 6:30.", answerTime: '06:30', pattern: (i) => [((6 + 1 + i) % 12) || 12, 30] },
            { id: 'QA2', qKey: 'Q_2', aKey: 'A_39', qText: '၈နာရီမထိုးသေးဘူးလား', aText: 'မထိုးသေးဘူး။၁၅မိနစ်လိုသေးတယ်', qEn: 'Isn\'t it eight o\'clock yet?', aEn: "Not yet. 15 minutes to go.", answerTime: '07:45', pattern: (i) => [7, 60 - (i + 1) * 5] },
            { id: 'QA3', qKey: 'Q_48', aKey: 'A_3', qText: 'အခုဘယ်နှစ်နာရီလဲ', aText: '၁၀နာရီ၄၅မိနစ်ပါ', qEn: 'What time is it now?', aEn: "It is 10:45.", answerTime: '10:45', pattern: (i) => [((10 + 1 + i) % 12) || 12, 45] },
            { id: 'QA4', qKey: 'Q_37', aKey: 'A_40', qText: 'ဘယ်အချိန်ရောက်မလဲ', aText: 'မနက်၉နာရီခွဲလောက်ရောက်မယ်', qEn: 'What time will you arrive?', aEn: 'I will arrive around 9:30 AM.', answerTime: '09:30', pattern: (i) => [((9 + 1 + i) % 12) || 12, 30] },
            { id: 'QA5', qKey: 'Q_47', aKey: 'A_4', qText: 'အချိန်ဘယ်လောက်ကျန်သေးလဲ', aText: '၁၅မိနစ်လောက်ကျန်သေးတယ်', qEn: 'How much time is left?', aEn: 'About 15 minutes left.', answerTime: '07:45', pattern: (i) => [8, (i + 1) * 5] },
            { id: 'QA6', qKey: 'Q_32', aKey: 'A_45', qText: 'ဘယ်နှစ်နာရီထိုးပြီလဲ', aText: 'သုံးနာရီထိုးဖို့၁၀မိနစ်ခန့်', qEn: 'What time is it?', aEn: 'About 10 minutes to three o\'clock.', answerTime: '02:50', pattern: (i) => [((2 + 1 + i) % 12) || 12, 50] },
        ];
        
        const CALENDAR_QUESTIONS = [
            { qKey: 'Q_CAL_MONTH', qText: 'အခုဘယ်လမှာလဲ', qEn: 'What month is it now?', type: 'month' },
            { qKey: 'Q_CAL_DATE', qText: 'ဒီနေ့ ဘယ်နှစ်ရက်နေ့လဲ', qEn: 'What is the date today?', type: 'date' },
            { qKey: 'Q_CAL_DAY', qText: 'ဒီနေ့ ဘာနေ့လဲ', qEn: 'What day is it today?', type: 'dayOfWeek' }
        ];

        const SPRITE_MAP = {
            A_1: { start: 0.00, duration: 3.0 }, Q_2: { start: 3.00, duration: 3.0 }, A_3: { start: 6.00, duration: 4.0 }, A_4: { start: 10.00, duration: 3.0 },
            YEAR_1999: { start: 13.00, duration: 2.5 }, YEAR_2000: { start: 16.00, duration: 2.0 }, YEAR_2013: { start: 18.00, duration: 2.0 }, YEAR_2014: { start: 20.00, duration: 2.0 },
            Q_CAL_DATE: { start: 44.00, duration: 2.0 }, Q_CAL_DAY: { start: 46.00, duration: 2.0 }, Q_CAL_MONTH: { start: 88.00, duration: 2.0 },
            MONTH_MM_KASON: { start: 25.00, duration: 1.0 }, DOW_THU: { start: 26.00, duration: 1.0 }, MONTH_EN_SEP: { start: 27.00, duration: 2.0 }, DOW_SAT: { start: 29.00, duration: 1.0 },
            MONTH_EN_JAN: { start: 30.00, duration: 2.0 }, MONTH_EN_JUN: { start: 32.00, duration: 1.0 }, MONTH_EN_JUL: { start: 33.00, duration: 1.0 }, DOW_SUN: { start: 34.00, duration: 1.0 },
            DOW_MON: { start: 35.00, duration: 1.0 }, MONTH_MM_TAGU: { start: 36.00, duration: 1.0 }, MONTH_MM_TASAUNGMON: { start: 37.00, duration: 2.0 },
            MONTH_MM_TABODWE: { start: 39.00, duration: 1.0 }, MONTH_MM_TABAUNG: { start: 40.00, duration: 1.0 }, MONTH_MM_TAWTHALIN: { start: 41.00, duration: 1.0 },
            MONTH_EN_DEC: { start: 42.00, duration: 2.0 }, MONTH_MM_NATDAW: { start: 48.00, duration: 1.0 }, MONTH_MM_NAYON: { start: 49.00, duration: 1.0 },
            MONTH_EN_NOV: { start: 50.00, duration: 2.0 }, MONTH_MM_PYATHO: { start: 52.00, duration: 1.0 }, MONTH_EN_FEB: { start: 53.00, duration: 2.0 }, DOW_WED: { start: 55.00, duration: 1.0 },
            Q_32: { start: 56.00, duration: 3.0 }, Q_35: { start: 62.00, duration: 2.0 }, Q_37: { start: 66.00, duration: 3.0 }, MONTH_EN_MAR: { start: 68.00, duration: 1.0 },
            A_39: { start: 69.00, duration: 4.0 }, A_40: { start: 73.00, duration: 3.0 }, MONTH_EN_MAY: { start: 76.00, duration: 1.0 },
            MONTH_MM_WAGAUNG: { start: 77.00, duration: 1.0 }, MONTH_MM_WASO: { start: 78.00, duration: 1.0 }, MONTH_MM_THADINGYUT: { start: 79.00, duration: 1.0 },
            A_45: { start: 80.00, duration: 3.0 }, DOW_FRI: { start: 83.00, duration: 1.0 }, Q_47: { start: 84.00, duration: 2.0 }, Q_48: { start: 86.00, duration: 2.0 },
            DOW_TUE: { start: 90.00, duration: 1.0 }, MONTH_EN_OCT: { start: 91.00, duration: 1.0 }, MONTH_EN_APR: { start: 92.00, duration: 1.0 }, MONTH_EN_AUG: { start: 93.00, duration: 1.0 },
            KAYIN_NEW_YEAR: { start: 94.00, duration: 2.0 }, CHRISTMAS: { start: 96.00, duration: 2.0 }, NYAUNG_YE_THUN: { start: 98.00, duration: 3.0 },
            ARMED_FORCES_DAY: { start: 101.00, duration: 2.0 }, DHAMMASETKYA_DAY: { start: 103.00, duration: 2.0 }, UNION_DAY: { start: 105.00, duration: 2.0 },
            FULL_MOON_DAY: { start: 107.00, duration: 2.0 }, INDEPENDENCE_DAY: { start: 109.00, duration: 2.0 }, THINGYAN: { start: 111.00, duration: 3.0 },
            THADINGYUT_DAY: { start: 114.00, duration: 2.0 }, ABHIDHAMMA_DAY: { start: 116.00, duration: 2.0 }, NATIONAL_DAY: { start: 118.00, duration: 2.0 },
            LABOR_DAY: { start: 120.00, duration: 2.0 }
        };
        
        const CALENDAR_DATA = {
            years: [{text: '၁၉၉၉', key: 'YEAR_1999'}, {text: '၂၀၀၀', key: 'YEAR_2000'}, {text: '၂၀၁၃', key: 'YEAR_2013'}, {text: '၂၀၁၄', key: 'YEAR_2014'}],
            dow: [{text: 'တနင်္ဂနွေ', key: 'DOW_SUN'}, {text: 'တနင်္လာ', key: 'DOW_MON'}, {text: 'အင်္ဂါ', key: 'DOW_TUE'}, {text: 'ဗုဒ္ဓဟူး', key: 'DOW_WED'}, {text: 'ကြာသပတေး', key: 'DOW_THU'}, {text: 'သောကြာ', key: 'DOW_FRI'}, {text: 'စနေ', key: 'DOW_SAT'}],
            months_en: [
                {text: 'ဇန်နဝါရီ (Jan)', key: 'MONTH_EN_JAN'}, {text: 'ဖေဖော်ဝါရီ (Feb)', key: 'MONTH_EN_FEB'}, {text: 'မတ် (Mar)', key: 'MONTH_EN_MAR'}, 
                {text: 'ဧပြီ (Apr)', key: 'MONTH_EN_APR'}, {text: 'မေ (May)', key: 'MONTH_EN_MAY'}, {text: 'ဇွန် (Jun)', key: 'MONTH_EN_JUN'}, 
                {text: 'ဇူလိုင် (Jul)', key: 'MONTH_EN_JUL'}, {text: 'ဩဂုတ် (Aug)', key: 'MONTH_EN_AUG'}, {text: 'စက်တင်ဘာ (Sep)', key: 'MONTH_EN_SEP'}, 
                {text: 'အောက်တိုဘာ (Oct)', key: 'MONTH_EN_OCT'}, {text: 'နိုဝင်ဘာ (Nov)', key: 'MONTH_EN_NOV'}, {text: 'ဒီဇင်ဘာ (Dec)', key: 'MONTH_EN_DEC'}
            ],
            months_mm: [{text: 'တန်ခူး', key: 'MONTH_MM_TAGU'}, {text: 'ကဆုန်', key: 'MONTH_MM_KASON'}, {text: 'နယုန်', key: 'MONTH_MM_NAYON'}, {text: 'ဝါဆို', key: 'MONTH_MM_WASO'}, {text: 'ဝါခေါင်', key: 'MONTH_MM_WAGAUNG'}, {text: 'တော်သလင်း', key: 'MONTH_MM_TAWTHALIN'}, {text: 'သီတင်းကျွတ်', key: 'MONTH_MM_THADINGYUT'}, {text: 'တန်ဆောင်မုန်း', key: 'MONTH_MM_TASAUNGMON'}, {text: 'နတ်တော်', key: 'MONTH_MM_NATDAW'}, {text: 'ပြာသို', key: 'MONTH_MM_PYATHO'}, {text: 'တပို့တွဲ', key: 'MONTH_MM_TABODWE'}, {text: 'တပေါင်း', key: 'MONTH_MM_TABAUNG'}]
        };

        const HOLIDAY_DATA = [
            { text: 'ကရင်နှစ်သစ်ကူးနေ့', en: 'Kayin New Year Day', key: 'KAYIN_NEW_YEAR' },
            { text: 'ခရစ်စမတ်နေ့', en: 'Christmas Day', key: 'CHRISTMAS' },
            { text: 'ညောင်ရေသွန်းပွဲတော်နေ့', en: 'Water Pouring Festival', key: 'NYAUNG_YE_THUN' },
            { text: 'တပ်မတော်နေ့', en: 'Armed Forces Day', key: 'ARMED_FORCES_DAY' },
            { text: 'ဓမ္မစကြာနေ့', en: 'Dhammacakka Day', key: 'DHAMMASETKYA_DAY' },
            { text: 'ပြည်ထောင်စုနေ့', en: 'Union Day', key: 'UNION_DAY' },
            { text: 'လပြည့်နေ့', en: 'Full Moon Day', key: 'FULL_MOON_DAY' },
            { text: 'လွတ်လပ်ရေးနေ့', en: 'Independence Day', key: 'INDEPENDENCE_DAY' },
            { text: 'သင်္ကြန်နှစ်သစ်ကူးနေ့', en: 'Thingyan Water Festival', key: 'THINGYAN' },
            { text: 'သီတင်းကျွတ်နေ့', en: 'Thadingyut Lighting Festival', key: 'THADINGYUT_DAY' },
            { text: 'အဘိဓမ္မာနေ့', en: 'Abhidhamma Day', key: 'ABHIDHAMMA_DAY' },
            { text: 'အမျိုးသားနေ့', en: 'National Day', key: 'NATIONAL_DAY' },
            { text: 'အလုပ်သမားနေ့', en: 'Labor Day', key: 'LABOR_DAY' }
        ];

        // --- State ---
        let currentView = 'clock';
        let currentClockConversationData = null;
        let currentCalendarQuestion = null;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let audioBuffer = null;
        let audioSource = null;

        // --- Audio Functions ---
        async function loadAudioSprite() {
            const AUDIO_URL = byId('master-audio-source').src;
            try {
                const response = await fetch(AUDIO_URL);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (e) {
                showMessage("အသံဖိုင်တင်ရာတွင် အမှားဖြစ်ပွားပါသည်။", "Error loading audio file.", 3000);
            }
        }

        function playAudioSprite(spriteKey) {
            if (!audioBuffer || !SPRITE_MAP[spriteKey]) return 0;
            if (audioSource) { try { audioSource.stop(); } catch (e) {} audioSource = null; }
            const { start, duration } = SPRITE_MAP[spriteKey];
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(audioContext.destination);
            if (audioContext.state === 'suspended') { audioContext.resume(); }
            audioSource.start(0, start, duration);
            return duration * 1000;
        }

        // --- Message Box Functions ---
        let messageTimeout;
        function showMessage(burmeseText, englishText, duration = 3000) {
            clearTimeout(messageTimeout);
            let htmlContent = `<span>${burmeseText}</span>`;
            if (englishText) { htmlContent += `<span class="english-translation">${englishText}</span>`; }
            messageBox.innerHTML = htmlContent;
            messageBox.classList.add('show');
            messageTimeout = setTimeout(() => { messageBox.classList.remove('show'); }, duration);
        }

        // --- View Toggle ---
        function toggleView() {
            if (currentView === 'clock') {
                currentView = 'calendar';
                clockView.classList.remove('active');
                calendarView.classList.add('active');
                iconCalendar.style.display = 'none';
                iconClock.style.display = 'block';
                viewToggle.title = "နာရီသို့ပြောင်းရန်";
                askCalendarQuestion(); // Ask a question when switching to calendar
            } else {
                currentView = 'clock';
                calendarView.classList.remove('active');
                clockView.classList.add('active');
                iconClock.style.display = 'none';
                iconCalendar.style.display = 'block';
                viewToggle.title = "ပြက္ခဒိန်သို့ပြောင်းရန်";
            }
        }

        // --- Clock Functions ---
        function setTeachingTime(hours, minutes) {
            const hoursForAnalog = hours % 12;
            const minutesDegrees = (minutes / 60) * 360;
            const hoursDegrees = (hoursForAnalog / 12) * 360 + (minutes / 60) * 30;
            const spinOffset = 1080; 
            analogMinuteHand.style.transition = 'none';
            analogHourHand.style.transition = 'none';
            analogMinuteHand.style.transform = `translate(-50%, 0) rotate(${minutesDegrees + spinOffset}deg)`;
            analogHourHand.style.transform = `translate(-50%, 0) rotate(${hoursDegrees + spinOffset}deg)`;
            void analogMinuteHand.offsetWidth; 
            analogMinuteHand.style.transition = 'transform 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
            analogHourHand.style.transition = 'transform 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
            analogMinuteHand.style.transform = `translate(-50%, 0) rotate(${minutesDegrees}deg)`;
            analogHourHand.style.transform = `translate(-50%, 0) rotate(${hoursDegrees}deg)`;
            analogSecondHand.style.opacity = 0; 
        }

        function positionAnalogClockNumbers() {
            analogClockContainer.querySelectorAll('.analog-number').forEach(n => n.remove());
            const radius = analogClockContainer.offsetWidth / 2;
            const numberRadius = radius * 0.8; 
            const numberValues = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            for (let i = 0; i < 12; i++) {
                const numDiv = document.createElement('div');
                numDiv.className = 'analog-number';
                numDiv.textContent = numberValues[i];
                const angle = (numberValues[i] * 30 - 90) * (Math.PI / 180);
                const x = radius + numberRadius * Math.cos(angle);
                const y = radius + numberRadius * Math.sin(angle);
                numDiv.style.left = `${x}px`;
                numDiv.style.top = `${y}px`;
                numDiv.style.transform = 'translate(-50%, -50%)';
                analogClockContainer.appendChild(numDiv);
            }
        }
        function setQuizTime(data) {
            const randomIndex = Math.floor(Math.random() * 5); 
            const [h, m] = data.pattern(randomIndex);
            setTeachingTime(h, m);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        function setAnswerTime(data) {
            const [h, m] = data.answerTime.split(':').map(Number);
            setTeachingTime(h, m);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }

        // --- Calendar Functions ---
        function displayRandomCalendarItems() {
            const yearsEl = byId('calendar-years');
            const monthsEnEl = byId('calendar-months-en');
            const monthsMmEl = byId('calendar-months-mm');
            const holidaysEl = byId('calendar-holidays');

            // Clear previous items
            yearsEl.innerHTML = '';
            monthsEnEl.innerHTML = '';
            monthsMmEl.innerHTML = '';
            holidaysEl.innerHTML = '';

            // Select and display random year
            const randomYear = CALENDAR_DATA.years[Math.floor(Math.random() * CALENDAR_DATA.years.length)];
            yearsEl.innerHTML = `<div class="calendar-item year-item" data-key="${randomYear.key}">${randomYear.text}</div>`;

            // Select and display random holiday
            const randomHoliday = HOLIDAY_DATA[Math.floor(Math.random() * HOLIDAY_DATA.length)];
            holidaysEl.innerHTML = `<div class="calendar-item holiday-item" data-key="${randomHoliday.key}" data-en="${randomHoliday.en}">${randomHoliday.text}</div>`;

            // Select and display random English month
            const randomEnMonth = CALENDAR_DATA.months_en[Math.floor(Math.random() * CALENDAR_DATA.months_en.length)];
            monthsEnEl.innerHTML = `<div class="calendar-item month-item" data-key="${randomEnMonth.key}">${randomEnMonth.text}</div>`;
            
            // Select and display random Myanmar month
            const randomMmMonth = CALENDAR_DATA.months_mm[Math.floor(Math.random() * CALENDAR_DATA.months_mm.length)];
            monthsMmEl.innerHTML = `<div class="calendar-item month-item" data-key="${randomMmMonth.key}">${randomMmMonth.text}</div>`;
        }
        
        function buildCalendar() {
            const calendarGridEl = byId('calendar-grid');
            calendarGridEl.innerHTML = ''; // Clear the grid before building

            // Add Day of Week headers
            CALENDAR_DATA.dow.forEach(d => {
                calendarGridEl.innerHTML += `<div class="calendar-dow-header" data-key="${d.key}">${d.text}</div>`;
            });

            // Add date numbers
            for (let i = 1; i <= 31; i++) {
                calendarGridEl.innerHTML += `<div class="calendar-item date-item" data-key="DATE_${i}">${i}</div>`;
            }
            
            // Display initial random items (for year and months)
            displayRandomCalendarItems();
        }

        function highlightRandomElement(type) {
            // Clear all previous highlights within the entire calendar view
            calendarView.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            
            let elements;
            if (type === 'month') {
                elements = rootEl.querySelectorAll('.month-item');
            } else if (type === 'date') {
                elements = rootEl.querySelectorAll('.date-item');
            } else if (type === 'dayOfWeek') {
                elements = rootEl.querySelectorAll('.calendar-dow-header'); // Use the new class for DOW
            }
            
            if (elements && elements.length > 0) {
                const randomIndex = Math.floor(Math.random() * elements.length);
                elements[randomIndex].classList.add('highlight');
            }
        }

        function askCalendarQuestion() {
            // First, display new random items
            displayRandomCalendarItems();

            const randomQuestion = CALENDAR_QUESTIONS[Math.floor(Math.random() * CALENDAR_QUESTIONS.length)];
            currentCalendarQuestion = randomQuestion;
            const duration = playAudioSprite(randomQuestion.qKey);
            showMessage(randomQuestion.qText, randomQuestion.qEn, duration + 1000);
            highlightRandomElement(randomQuestion.type);
        }

        // --- Event Handlers ---
        function handleQuestionSelect(event) {
            const selectedId = event.target.value;
            if (!selectedId) return;
            const data = CLOCK_CONVERSATION_DATA.find(d => d.id === selectedId);
            currentClockConversationData = data;
            const quizTime = setQuizTime(data);
            const duration = playAudioSprite(data.qKey);
            showMessage(data.qText, `${data.qEn} (Clock: ${quizTime})`, duration + 1000);
            answerButton.disabled = false;
        }
        
        function handleAnswerClick() {
            if (!currentClockConversationData) return;
            const data = currentClockConversationData;
            const answerTime = setAnswerTime(data);
            const duration = playAudioSprite(data.aKey);
            showMessage(data.aText, `${data.aEn} (Answer Time: ${answerTime})`, duration + 1000);
        }

        function handleClockClick() {
            if (!currentClockConversationData) {
                showMessage("လေ့ကျင့်ရန်အတွက် မေးခွန်းတစ်ခု ရွေးချယ်ပေးပါဦး။", "Please select a question to practice.", 2500);
                return;
            }
            const data = currentClockConversationData;
            const quizTime = setQuizTime(data);
            const duration = playAudioSprite(data.qKey);
            showMessage(data.qText, `${data.qEn} (Clock: ${quizTime})`, duration + 1000);
        }
        
        function handleCalendarContainerClick(event) {
            const target = event.target.closest('.calendar-item, .calendar-dow-header, #calendar-view');

            // If a specific calendar item with a key is clicked, play its sound
            if (target && (target.classList.contains('calendar-item') || target.classList.contains('calendar-dow-header')) && target.dataset.key) {
                
                // Special handling for holiday items to show translation
                if (target.classList.contains('holiday-item') && target.dataset.en) {
                    const burmeseText = target.textContent;
                    const englishText = target.dataset.en;
                    const duration = playAudioSprite(target.dataset.key);
                    showMessage(burmeseText, englishText, duration + 1000);
                } else {
                    // Original behavior for other items
                    playAudioSprite(target.dataset.key);
                }

            } else { // Otherwise, ask a new question
                askCalendarQuestion();
            }
        }
        
        // --- Initialization ---
        function populateClockQuestionDropdown() {
            CLOCK_CONVERSATION_DATA.forEach(data => {
                const option = document.createElement('option');
                option.value = data.id;
                option.textContent = data.qText;
                questionSelect.appendChild(option);
            });
        }

        const runMasterInit = () => {
            loadAudioSprite();
            // Clock setup
            positionAnalogClockNumbers();
            populateClockQuestionDropdown();
            setTeachingTime(10, 10); 
            // Calendar setup
            buildCalendar();

            // Add event listeners
            viewToggle.addEventListener('click', toggleView);
            questionSelect.addEventListener('change', handleQuestionSelect);
            answerButton.addEventListener('click', handleAnswerClick);
            analogClockContainer.addEventListener('click', handleClockClick);
            calendarView.addEventListener('click', handleCalendarContainerClick);
        }

        window.addEventListener('resize', positionAnalogClockNumbers);
        runMasterInit();

    return () => {};
  }, []);

  return (
    <>
      <style>{TC_APP_CSS}</style>
      <div
        ref={containerRef}
        className="tc-app-root"
        dangerouslySetInnerHTML={{ __html: TC_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-3 left-3 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🕐 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
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
