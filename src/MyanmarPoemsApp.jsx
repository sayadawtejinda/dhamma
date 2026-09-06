import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "မြန်မာကဗျာ သင်ကြားရေး" (Myanmar Poems) HTML app ──
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
// The original page loaded icons from a plain UMD <script src="lucide@latest">
// tag rather than the lucide-react package already used elsewhere in this
// project — that's loaded once on demand (ensureLucideLoaded below) instead
// of being added to index.html, since this is the only app that needs it.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .mpoems-app-root so it doesn't leak onto the rest of the SPA, since every
// app stays mounted simultaneously (just hidden via CSS) per App.jsx's design.

const MPOEMS_ROSTER_PATH = 'artifacts/myanmar-poems-app/public/data/roster';
const sanitizeMpoemsKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const MPOEMS_APP_CSS = `
        /* Custom styles for Burmese font and responsive layout */
        @import url('https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap');
        
        :root {
            --font-main: 'Padauk', sans-serif;
            --color-primary: #1e3a8a; /* Blue */
            --color-secondary: #fcd3d0; /* Light Coral */
        }
        
        .mpoems-app-root {
            font-family: var(--font-main);
            background-color: #f0fdf4; /* Light Mint Background */
        }

        /* Full-screen container */
        .app-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Line-by-line hover effect for poem lines (Adjusted spacing) */
        .poem-line {
            cursor: pointer;
            transition: transform 0.1s ease-in-out, background-color 0.1s;
            line-height: 1.5; /* Reduced from 1.8 for tighter spacing */
            padding: 2px 8px; /* Reduced vertical padding */
            margin: 1px 0; /* Slightly reduced margin */
            border-radius: 8px;
            /* New rule for text shadow: */
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
        }

        .poem-line:hover {
            transform: translateY(-2px);
            background-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
        }

        /* Fixed translation overlay at the bottom */
        .translation-overlay {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #f97316; /* Orange */
            color: white;
            padding: 1rem;
            text-align: center;
            font-weight: bold;
            font-size: 1.25rem;
            transition: transform 0.3s ease-in-out;
            transform: translateY(100%);
            z-index: 50;
        }

        .translation-overlay.show {
            transform: translateY(0);
        }
        
        /* New 3D-like Image Styling */
        .image-container {
            perspective: 1000px; /* Needed for 3D effect */
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #fefce8, #fbcfe8); /* Soft gradient background */
            border-radius: 1.5rem;
        }

        .poem-image-style {
            transition: transform 0.5s ease-in-out, box-shadow 0.5s ease;
            transform-style: preserve-3d;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            max-height: 100%;
            max-width: 100%;
        }

        .poem-image-style:hover {
            transform: rotateY(5deg) scale(1.02); /* Subtle 3D tilt and slight enlargement */
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }


        /* Multicolour Text Cycle */
        .color-0 { color: #ef4444; } /* Red */
        .color-1 { color: #f97316; } /* Orange */
        .color-2 { color: #3b82f6; } /* Blue */
        .color-3 { color: #10b981; } /* Emerald */
        .color-4 { color: #a855f7; } /* Violet */
`;

const MPOEMS_APP_BODY_HTML = `

    <div id="app" class="app-container md:flex md:flex-row p-4 sm:p-6 lg:p-8 space-y-6 md:space-y-0 md:space-x-8">
        
        <!-- ============================================= -->
        <!-- LEFT PANEL: POEM CONTENT & CONTROLS -->
        <!-- ============================================= -->
        <div class="md:w-1/2 flex flex-col bg-white p-6 rounded-3xl shadow-2xl transition-all duration-300 transform hover:shadow-3xl border-4 border-yellow-400">
            <h1 id="poem-title" class="text-3xl sm:text-4xl font-extrabold mb-4 text-center text-blue-800 tracking-tight"></h1>
            
            <!-- Controls Bar (Updated for navigation) -->
            <div class="flex justify-center items-center space-x-4 mb-6 p-3 bg-blue-50 rounded-xl shadow-inner">
                
                <!-- Previous Poem Icon -->
                <button id="prev-poem" class="p-3 bg-gray-400 text-white rounded-full shadow-lg transition duration-150 transform hover:scale-105 disabled:opacity-50" title="ယခင် ကဗျာသို့">
                    <i data-lucide="chevron-left" class="w-6 h-6"></i>
                </button>

                <!-- Toggle Romanization Icon -->
                <button id="toggle-romanization" class="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition duration-150 transform hover:scale-105" title="မြန်မာ/အင်္ဂလိပ် အသံထွက် ပြောင်းမည်">
                    <i data-lucide="languages" class="w-6 h-6"></i>
                </button>
                
                <!-- YouTube Icon - Now Opens in New Tab -->
                <button id="open-youtube" class="p-3 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition duration-150 transform hover:scale-105" title="YouTube ကို မျက်နှာစာအသစ်တွင် ဖွင့်မည်">
                    <i data-lucide="youtube" class="w-6 h-6"></i>
                </button>
                
                <!-- Audio Icon -->
                <button id="play-audio" class="p-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition duration-150 transform hover:scale-105" title="အသံ နားထောင်မည်">
                    <i data-lucide="volume-2" class="w-6 h-6"></i>
                </button>

                <!-- Next Poem Icon -->
                <button id="next-poem" class="p-3 bg-indigo-500 text-white rounded-full shadow-lg transition duration-150 transform hover:scale-105 disabled:opacity-50" title="နောက် ကဗျာသို့">
                    <i data-lucide="chevron-right" class="w-6 h-6"></i>
                </button>
            </div>
            
            <!-- Poem Display Area -->
            <div id="poem-container" class="font-bold flex-grow overflow-y-hidden text-center">
                <!-- Poem lines will be injected here -->
                <p class="text-center text-gray-500">ကဗျာကို စတင်ဖော်ပြနေပါပြီ...</p>
            </div>
        </div>

        <!-- ============================================= -->
        <!-- RIGHT PANEL: IMAGE DISPLAY (3D-like container) -->
        <!-- ============================================= -->
        <div class="md:w-1/2 flex flex-col bg-white p-6 rounded-3xl shadow-2xl border-4 border-pink-400">
            <div id="media-display" class="image-container flex-grow items-center justify-center">
                <!-- Image or Placeholder goes here -->
                <div id="initial-placeholder" class="w-full h-full flex flex-col items-center justify-center text-gray-700 p-6">
                    <i data-lucide="monitor-play" class="w-16 h-16 mb-4 text-pink-600"></i>
                    <p class="text-xl font-bold text-center mb-2">YouTube ဗီဒီယို ကြည့်လိုပါက</p>
                    <p class="text-base text-center text-pink-700">(YouTube Icon) ကို နှိပ်ပြီး မျက်နှာစာအသစ်တွင် ဖွင့်ကြည့်ပါ။</p>
                    <p class="text-sm mt-4 text-gray-500">(လက်ရှိကဗျာ၏ ပုံရိပ်ကို အောက်တွင် ပြသထားပါသည်။)</p>
                </div>
            </div>
        </div>

    </div>

    <!-- ============================================= -->
    <!-- FIXED TRANSLATION OVERLAY -->
    <!-- ============================================= -->
    <div id="translation-overlay" class="translation-overlay rounded-t-2xl shadow-2xl">
        <!-- Translation text will be injected here -->
    </div>

`;

export default function MyanmarPoemsApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, MPOEMS_ROSTER_PATH, sanitizeMpoemsKey(studentName));
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
    const unsub = onSnapshot(collection(db, MPOEMS_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Poems roster listen error:', e));
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

        // ----------------------------------------------------
        // I. DATA STRUCTURE (ကဗျာများ၏ အချက်အလက်များ)
        // ----------------------------------------------------
        // (*** Note: The poemsData remains exactly the same as the previous version ***)
        const poemsData = [
            // 1. အားလုံးကိုချစ်မယ် (Updated Audio/Image URLs)
            {
                title: "အားလုံးကိုချစ်မယ်",
                youtubeId: "https://youtu.be/F6_LGs8C5VA?si=j3Ha6EqOw4ri7nNi&t=56", // User's full link
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/အားလုံးကိုချစ်မယ်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/အားလုံးကိုချစ်မယ်.png", // Literal filename

                burmese: [
                    "မေမေကြီးကိုချစ် ဖေဖေကြီးလည်းချစ်",
                    "မေမေကြီးရော ဖေဖေကြီးရော မေမေကြီးရောချစ်",
                    "ကိုကိုကြီးကိုချစ် မမကြီးလည်းချစ်",
                    "ကိုကိုကြီးရော မမကြီးရော ကိုကိုကြီးရောချစ်",
                    "ဆရာမကြီးကိုချစ် ဆရာမလေးလည်းချစ်",
                    "ဆရာမကြီးရော ဆရာမလေးရော ဆရာမကြီးရောချစ်",
                    "လူအားလုံးကို ချစ်၊ လူတွေ အားလုံး ချစ်",
                    "မေမေ, ဖေဖေ, ကိုကို, မမ, ဆရာအားလုံးကို ချစ်"
                ],
                romanization: [
                    "MayMayGyi Go Chit. PhayPhayGyi Lell Chit.",
                    "MayMayGyi Yaw, PhayPhayGyi Yaw, MayMay Gyi Yaw Chit.",
                    "Ko Ko Gyi Go Chit.  Ma Ma Gyi Lell Chit.",
                    "Ko Ko Gyi Yaw, Ma Ma Gyi Yaw, Ko Ko Gyi Yaw Chit.",
                    "Sayama Gyi Go Chit. Sayama Lay Lell Chit.",
                    "Sayama Gyi Yaw, Sayama Lay Yaw, Sayama Gyi Yaw Chit.",
                    "Luu Arr Lone Go Chit, Luu twe Arr Lone Chit.",
                    "May May, Phay Phay, Ko Ko, Ma Ma, Sayar Arr Lone Go Chit."
                ],
                translation: [
                    "I love Mother and I also love Father,",
                    "Both Mother, Father, and Mother, I love.",
                    "I love Big Brother and I also love Big Sister,",
                    "Both Big Brother, Big Sister, and Big Brother, I love.",
                    "I love the Head Teacher and I also love the Junior Teacher,",
                    "Both the Head Teacher, Junior Teacher, and Head Teacher, I love.",
                    "I love all people, I love everyone,",
                    "Mother, Father, Brother, Sister, all Teachers, I love."
                ]
            },
            // 2. မမ ဝဝ
            {
                title: "မမ ဝဝ",
                youtubeId: "https://youtu.be/jX81kFnAtRI?si=BdYz8Wqxl4hyIteX", // Placeholder ID
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မမဝဝ.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မမဝဝ.jpg", // Literal filename (as requested)

                burmese: [
                    "မမ ဝဝ",
                    "ထထက",
                    "အက ပထမ။",
                    "ကပါ ကပါ",
                    "မမရာ",
                    "ညည လသာသာ။",
                    "ညအခါ",
                    "ငါ စာရ",
                    "မမ ဝဝ",
                    "ထထက။"
                ],
                romanization: [
                    "Ma Ma Wa Wa",
                    "Hta Hta Ka",
                    "Ah Kar Patha Ma",
                    "Ka Bar Ka Bar",
                    "Ma Ma Yar",
                    "Nya Nya Lar Thar Thar",
                    "Nya Ah Khar",
                    "Ngar Sar Ya",
                    "Ma Ma Wa Wa",
                    "Hta Hta Ka"
                ],
                translation: [
                    "Plump Sister,",
                    "Get up and dance,",
                    "Dancing is the first thing.",
                    "Dance please, dance,",
                    "My dear sister,",
                    "On bright moonlight nights.",
                    "At night time,",
                    "I read my lessons,",
                    "Plump Sister,",
                    "Get up and dance."
                ]
            },
            // 3. မင်္ဂလာပါ
            {
                title: "မင်္ဂလာပါ",
                youtubeId: "https://youtu.be/TPcuL3G8xG0?si=T5vH0M1_jYxkO9wz", // Placeholder ID
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မင်္ဂလာပါ.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မင်္ဂလာပါ.jpg", // Literal filename
                
                burmese: [
                    "မောင်တို့မယ်တို့ ကျောင်းခန်းဝင်",
                    "အပြုံးပန်းကိုဆင်၊",
                    "မင်္ဂလာပါ ဆရာမ",
                    "ညီညီညာညာ နှုတ်ဆက်ကြ။"
                ],
                romanization: [
                    "Maung doe mel doe kyang khan win",
                    "A pyone pan go sin",
                    "Mingalarpar sayama",
                    "Nyi nyi nyar nyar nhout set gya"
                ],
                translation: [
                    "Boys and girls enter the classroom,",
                    "Adorning smiles like flowers,",
                    "“Hello, Teacher,”",
                    "They greet in unison."
                ]
            },
            // 4. တို့ကျောင်း (From previous query)
            {
                title: "တို့ကျောင်း",
                youtubeId: "https://youtu.be/Z6EKzn_U0tI?si=MQlAEfkZxmaWFl2d", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တို့ကျောင်း.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တို့ကျောင်း.jpg", // Literal filename

                burmese: [
                    "ပန်းကလေးများ ပွင့်တော့မည်",
                    "ဖူးတံ ဝင့်လို့ ချီ",
                    "နေခြည်မှာ ရွှေရည်လောင်း",
                    "ငါတို့ စာသင်ကျောင်း"
                ],
                romanization: [
                    "Pan ga lay myar pwint dot myee",
                    "Pyoo dan wint loe chee",
                    "Nay chi mhar shwe yee lown",
                    "Ngar doe sar tin gyaung"
                ],
                translation: [
                    "The little flowers are about to bloom,",
                    "The buds proudly rise,",
                    "The sunlight pours golden liquid,",
                    "Our school."
                ]
            },
            // 5. လူရှည်ကြီးလိုလျှောက်
            {
                title: "လူရှည်ကြီးလိုလျှောက်",
                youtubeId: "https://youtu.be/MH3_DSszmi0?si=Q4tfzxuXGE12z79c", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/လူရှည်ကြီး.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/လူရှည်ကြီး.jpeg", // Literal filename

                burmese: [
                    "လူရှည်ကြီး လို လျှောက်",
                    "လူပုလေး လို လျှောက်",
                    "လူဝကြီး လို လျှောက်",
                    "လူပိန်လေး လို လျှောက်",
                    "မင်းသားလေး လို က",
                    "မင်းသမီးလေး လို က"
                ],
                romanization: [
                    "Lu Shay Gyi loe shout",
                    "Lu pu lay loe shout",
                    "Lu wa gyi loe shout",
                    "Lu pain lay loe shout",
                    "Min dar lay loe ka",
                    "Min da mee lay loe ka"
                ],
                translation: [
                    "Walk like a tall person,",
                    "Walk like a Little short person,",
                    "Walk like a Fat person,",
                    "Walk like a Thin person,",
                    "Dance like a prince,",
                    "Dance like a Princess."
                ]
            },
            // 6. မျက်စိလေးက
            {
                title: "မျက်စိလေးက မြင်တယ်",
                youtubeId: "https://youtu.be/fbrh1Pv_iUE?si=7IuLrV2QY0Uv4E5i", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မျက်စိလေးက.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မျက်စိလေးက.png", // Literal filename

                burmese: [
                    "မျက်စိ​လေးက မြင်တယ်။",
                    "နားလေးက ကြားတယ်။",
                    "နှာ​ခေါင်း​လေးက ​လေကို ရှူရတယ်။",
                    "ဦး​နှောက်လေးက ​တွေးကာ",
                    "ပါးစပ်​လေးကို ဟကာ",
                    "ပျော်​ပျော်ရွှင်ရွှင်",
                    "သီချင်းဆိုကြစို့ကွယ်။",
                    "ပျော်ရွှင်တယ်"
                ],
                romanization: [
                    "myet si lay ga myin del",
                    "narr lay ga kyar del",
                    "nha khong lay ga lay go shu ya del.",
                    "Oo hnoke lay ga tway gar",
                    "ba sat lay go ha gar",
                    "pyaw pyaw shwin shwin",
                    "ta chin so jha soe kwel",
                    "Pyaw shwin deel"
                ],
                translation: [
                    "The little eye sees.",
                    "The little ear hears.",
                    "The nose has to breathe air.",
                    "The brain thinks,",
                    "The little mouth opens,",
                    "Happily,",
                    "Let's sing a song.",
                    "We are happy."
                ]
            },
            // 7. ဖြူဖွေးလှတဲ့ယုန်
            {
                title: "ဖြူဖွေးလှတဲ့ယုန်",
                youtubeId: "https://youtu.be/1leEuuRufEk?si=mkWPgF2r738Xs_9H", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဖြူဖွေးလှတဲ့ယုန်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဖြူဖွေးလှတဲ့ယုန်.png", // Literal filename

                burmese: [
                    "ဟိုခုန် သည်ခုန် တခုန်ခုန်",
                    "ဖြူဖွေးလှတဲ့ ယုန်",
                    "ဖြူဖွေးလှတဲ့ ယုန်",
                    "ဟိုနေရာမှာလဲ တခုန်ခုန်",
                    "သည်နေရာမှာလဲ တခုန်ခုန်",
                    "ဟိုခုန် သည်ခုန် တခုန်ခုန်",
                    "ဖြူဖွေးလှတဲ့ ယုန်။"
                ],
                romanization: [
                    "Ho khone Di khone ta khone khone",
                    "(Pyu phywe hla dae yone)",
                    "(Pyu phywe hla dae yone)",
                    "Ho nay yar mhar lell ta khone khone",
                    "di nay yar mhar lell ta khone khone",
                    "Ho khone Di khone ta khone khone",
                    "Pyu phywe hla dae yone."
                ],
                translation: [
                    "Jumping here, jumping there, hop hop hop,",
                    "The beautiful white rabbit,",
                    "The beautiful white rabbit,",
                    "Jumping hop hop at that place too,",
                    "Jumping hop hop at this place too,",
                    "Jumping here, jumping there, hop hop hop,",
                    "The beautiful white rabbit."
                ]
            },
            // 8. ဘူးသီးကလေး
            {
                title: "ဘူးသီးကလေး",
                youtubeId: "https://youtu.be/ewpabAK7tVE?si=uQ0A6akY5S37zskx", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဘူးသီးကလေး.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဘူးသီးကလေး.jpeg", // Literal filename

                burmese: [
                    "ဘူးသီးကလေး ဝတုတ်တုတ်",
                    "ညီညီ ဖိုးဝရုပ်၊",
                    "ခေါင်းစုတ်ဖွားနဲ့ ကိုကိုရယ်",
                    "ပြောင်းဖူးနဲ့ တူတယ်။",
                    "လှချင်လွန်းလို့ ကြက်တောင်စည်း",
                    "မီးမီး နာနတ်သီး၊",
                    "ပိန်ပိန်သေးသေး အရပ်ရှည်",
                    "ဖေကြီး ပဲလင်းမြွေ၊",
                    "မေတ္တာထားလို့ ကရုဏာကြီး",
                    "မေမေ ဖရဲသီး"
                ],
                romanization: [
                    "Bu tee ga lay wa toke toke nyi nyi pho wa yoke",
                    "Gaung sout phwar nae ko ko yal",
                    "Pyaung phuu nae tuu dal",
                    "Hla chin lun loe kyat taung see",
                    "Mee mee nar nat tee",
                    "Pain pain tay tay a yat shay",
                    "Phay gyi pell lin mwea",
                    "Myit tar htar loe ga yu nar kyi may may pha yell tee."
                ],
                translation: [
                    "The little gourd is plump,",
                    "Brother Pho Wa Yoke is neat and tidy.",
                    "Brother with messy hair,",
                    "Looks like a corn cob.",
                    "Wanting to be pretty, tying a hair extension,",
                    "Little Sister is a pineapple.",
                    "Thin, small, and tall,",
                    "Father is a pole bean (snake bean).",
                    "With loving-kindness and great compassion,",
                    "Mother is a watermelon."
                ]
            },
            // 9. သူလေသူလေ
            {
                title: "သူလေသူလေ",
                youtubeId: "https://youtu.be/yjkqCdEbUAM?si=jCi0Fj6YNlYqhv4B", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/သူလေသူလေ.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/သူလေသူလေ.png", // Literal filename

                burmese: [
                    "သူလေ သူလေ ဝတယ် သူ ဝတယ်",
                    "အစား ကောင်းကောင်း စားနိုင်တယ်",
                    "သူလေ သူလေ လှတယ် သူ လှတယ်",
                    "စိတ်ထား ကောင်းကောင်း ထားလို့ကွယ်",
                    "ကိုယ်လေ ကိုယ်လေ ဝတယ် ကိုယ် ဝတယ်",
                    "သူ့လို အစား စားနိုင်တယ်",
                    "ကိုယ်လေ ကိုယ်လေ လှတယ် ကိုယ် လှတယ်",
                    "သူ့လို စိတ်ထား ကောင်းလို့ကွယ်"
                ],
                romanization: [
                    "Tu lay tu lay Wa dell tu Wa dell",
                    "A sar kaung kaung sar naing dell",
                    "Tu lay tu lay hla dell tu hla dell",
                    "Sate htar kaung kaung htar loe kwe",
                    "Ko lay ko lay wa dell ko wa dell",
                    "Tu lo a sar sar naing dell",
                    "Ko lay ko lay hla dell ko hla dell",
                    "Tu lo sate htar kaung loe kwe."
                ],
                translation: [
                    "That person, that person is fat, they are fat,",
                    "They can eat good food.",
                    "That person, that person is beautiful, they are beautiful,",
                    "Because they have a good heart.",
                    "I am, I am fat, I am fat,",
                    "I can eat food like them.",
                    "I am, I am beautiful, I am beautiful,",
                    "Because I have a good heart like them."
                ]
            },
            // 10. ဗုံတီး ပက်ချပ်ချပ်
            {
                title: "ဗုံတီး ပက်ချပ်ချပ်",
                youtubeId: "https://youtu.be/D73JZ4g5Pwc?si=DW_5l8yQhG_badBl", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဗုံတီးပက်ချပ်ချပ်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဗုံတီးပက်ချပ်ချပ်.jpeg", // Literal filename

                burmese: [
                    "(ခေါင်း)3ကလေး လှုပ်ပါလား",
                    "(ခေါင်း)3ကလေးလှုပ်လိုက်ပါ။",
                    "(ဗုံတီး ဗုံတီး ပက်ချပ်ချပ်)2",
                    "(ခေါင်း)3ကလေးလှုပ်ကာ ကလိုက်ပါ။",
                    "လက်",
                    "ခါး",
                    "ဒူး",
                    "ခြေထောက်"
                ],
                romanization: [
                    "(Goung)3 ga lay hlot par lar",
                    "(Goung)3 ga lay hlot like bar",
                    "(Bon tee bon tee pat chat chat)2",
                    "(Goung)3 ga lay hlot gar ka like bar",
                    "lat",
                    "kharr",
                    "duu",
                    "chay thought"
                ],
                translation: [
                    "Head, head, move your little head please?",
                    "Head, head, shake your little head.",
                    "Drumming, drumming, pat chat chat (Sound of drum)",
                    "Shake your head and dance, little head.",
                    "Hand/Arm",
                    "Waist",
                    "Knee",
                    "Foot/Leg"
                ]
            },
            // 11. နာနတ်သီးနဲ့ ဒူးရင်းသီး
            {
                title: "နာနတ်သီးနဲ့ ဒူးရင်းသီး",
                youtubeId: "https://youtu.be/mriVV8uQJio?si=Dn0UxGifs-fmO11t", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/နာနတ်သီးနဲ့ဒူးရင်းသီး.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/နာနတ်သီးနဲ့ဒူးရင်းသီး.png", // Literal filename

                burmese: [
                    "နာနတ်သီးနဲ့ ဒူးရင်းဟာ",
                    "သူငယ်ချင်းတွေပါ",
                    "တစ်နေ့သောခါ ရန်ဖြစ်ကြ",
                    "ဒူရင်းသီးက ဆူးနဲ့ချ",
                    "နာနတ်သီးရဲ့ မျက်နှာဝယ်",
                    "ဆူးချက်တွေကကြွယ်",
                    "သူတို့နှယ် ရန်မဖြစ်နဲ့",
                    "သင့်အောင် ပေါင်းကြကွဲ့"
                ],
                romanization: [
                    "Narr Nat tee nea Duu yinn har",
                    "Ta ngea chin twe bar",
                    "Ta nay daw khar yan phyit jha",
                    "Duu yinn tee ga Suu nea cha",
                    "Narr nat tee yea myat nhar well",
                    "Suu jhat twe ga kywe",
                    "tuu doe nhae yan ma phyit nea",
                    "Tint aung paung gya kwea."
                ],
                translation: [
                    "Pineapple and Durian,",
                    "Are friends.",
                    "One day they fought,",
                    "The durian hit with its thorns.",
                    "On the pineapple's face,",
                    "There were many thorn marks.",
                    "Don't fight like them,",
                    "Be friendly and get along."
                ]
            },
            // 12. မနှင်းတို့အိမ်
            {
                title: "မနှင်းတို့အိမ်",
                youtubeId: "https://youtu.be/6jGKr9ol_SU?si=6h5KqUnrmaeP_M8q", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မနှင်းတို့အိမ်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မနှင်းတို့အိမ်.jpg", // Literal filename

                burmese: [
                    "ဟိုဘက်ကမ်းက မီးထိန်ထိန်",
                    "သည်ဘက်ကမ်းက မီးထိန်ထိန်။",
                    "ဆီမီးထိန်ထိန် လင်းပါတဲ့",
                    "မနှင်းတို့အိမ်။"
                ],
                romanization: [
                    "Ho bhaat kam ga mee htein htein",
                    "di bhaat kam ga mee htein htein",
                    "se mee htein htein linn par dae",
                    "ma nhinn Doet aain ."
                ],
                translation: [
                    "Bright lights from that shore,",
                    "Bright lights from this shore.",
                    "The oil lamp lights up brightly,",
                    "Ma Hnin's house."
                ]
            },
            // 13. သစ်ပင်ပေါ်က တောက်တဲ့
            {
                title: "သစ်ပင်ပေါ်က တောက်တဲ့",
                youtubeId: "https://youtu.be/eK9a9x174uA?si=OJDuEWLh9uf_UjAb", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တောက်တဲ့.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တောက်တဲ့.jpg", // Literal filename

                burmese: [
                    "သစ်ပင်ပေါ်မှာ ထိုင်နေတဲ့ တောက်တဲ့ တောက်တဲ့",
                    "မိုးလေဝါသ ဟောတတ်တဲ့ တောက်တဲ့ တောက်တဲ့",
                    "အို... ဟောလိုက်စမ်းပါ အို...",
                    "မိုးရွာမလား တောက်တဲ့ အို.. တောက်တဲ့"
                ],
                romanization: [
                    "Thit pin baw mhar, htaing nay dea, tauk tae, tauk tae",
                    "Moe lay wa ta, hall tat dea, tauk tae, tauk tae",
                    "O…, hall like san bar, o…",
                    "Moe ywar ma lar, tauk tea. O tauk tea."
                ],
                translation: [
                    "Sitting on the tree, Gecko, Gecko,",
                    "Forecasting the weather, Gecko, Gecko,",
                    "Oh... please predict it, oh...",
                    "Will it rain, Gecko. Oh, Gecko."
                ]
            },
            // 14. ဖိနပ်လေးကို ညီညီကွယ်
            {
                title: "ဖိနပ်လေးကို ညီညီကွယ်",
                youtubeId: "https://youtu.be/2qcJRZCXWgA?si=tVVoL0EigKS_lLTC", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဖိနပ်လေးကိုညီညီကွယ်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဖိနပ်လေးကိုညီညီကွယ်.png", // Literal filename

                burmese: [
                    "ဖိနပ်လေးကို (ညီညီကွယ်)3",
                    "ဖိနပ်လေးကို ညီညီကွယ် စီကာ ထားရမယ်",
                    "စာအုပ်လေးကို (ညီညီကွယ်)3",
                    "စာအုပ်လေးကို ညီညီကွယ် စီကာ ထားရမယ်",
                    "အမှိုက်လေးကို (အတူတူကွယ်)3",
                    "အမှိုက်လေးကို အတူတူကွယ် ပြိုင်တူ ကောက် ကြမယ်",
                    "ကစားရတာ ပျော်ပါသလား",
                    "(ပျော်ပါတယ်)၂",
                    "ကစားပြီးရင် ဘာလုပ်မလဲ",
                    "ပြန်ကာ သိမ်းရမယ်"
                ],
                romanization: [
                    "Pha nat lay go (nyi nyi kwal)3",
                    "Pha nat lay go nyi nyi kwal see gar thar ya mel",
                    "Sar ouk lay go (nyi nyi kwal)3",
                    "Sar ouk lay go nyi nyi kwal see gar thar ya mel",
                    "A mite lay go a (tu tu kwal)3",
                    "A mite lay go a tu tu kwal pyine tu kouk ja mel",
                    "Ga sar ya dar pyaw bar ta lar",
                    "(Pyaw bar del)2",
                    "Ga sar pi yin bar loke ma lel",
                    "Pyan gar tain ya mel"
                ],
                translation: [
                    "The little shoes, neatly dear,",
                    "The little shoes, neatly dear, must be arranged.",
                    "The little books, neatly dear,",
                    "The little books, neatly dear, must be arranged.",
                    "The rubbish, together dear,",
                    "The rubbish, together dear, let's pick it up together.",
                    "Do you enjoy playing?",
                    "We enjoy it.",
                    "What will you do after playing?",
                    "We must tidy up."
                ]
            },
            // 15. တူတူပုန်းလို့ ကစားစို့
            {
                title: "တူတူပုန်းလို့ ကစားစို့",
                youtubeId: "https://youtu.be/5W_v0RFGt94?si=hjVkZd3kx3QpEJEc", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တူတူပုန်းလို့ကစားစို့.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တူတူပုန်းလို့ကစားစို့.png", // Literal filename

                burmese: [
                    "တူတူပုန်းလို့ ကစားစို့ လာလာလာ",
                    "တူတူပုန်းလို့ ကစားစို့ လာလာလာ",
                    "၁ ၂ ၃ ၄ ၅ ၆ ၇ ၈ ၉ ၁၀",
                    "နောက်လှည့် ကြည့်တော့ အားလုံးရပ်ရပ်ရပ်"
                ],
                romanization: [
                    "Tu tu pone loe Gasar soe lar lar lar",
                    "Tu tu pone loe Gasar soe lar lar lar",
                    "၁ ၂ ၃ ၄ ၅ ၆ ၇ ၈ ၉ ၁၀",
                    "Nauk hlae kyi dawt arr lone yat yat yat"
                ],
                translation: [
                    "Let's play hide and seek, come, come, come,",
                    "Let's play hide and seek, come, come, come,",
                    "1 2 3 4 5 6 7 8 9 10,",
                    "When turning back to look, everyone stop, stop, stop."
                ]
            },
            // 16. ဖိုးလနတ်သား
            {
                title: "ဖိုးလနတ်သား",
                youtubeId: "https://youtu.be/o0-3Upwrvnw?si=PrmrIm94v_HeXhEM", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဖိုးလနတ်သား.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဖိုးလနတ်သား.jpg", // Literal filename

                burmese: [
                    "ရွှေလမှာ ယုန်ဝပ်လို့",
                    "ဆန် ဖွပ်သည့် အဘိုးအို",
                    "ဟော ကြည့်ပါဆို။",
                    "ဆိုသာဆို ပိုမိုသည့် စကား။",
                    "ကလေး အငို တိတ်အောင်",
                    "အရိပ် အယောင် ပြတယ်",
                    "ဖိုးလနတ်သား။"
                ],
                romanization: [
                    "Shwe la mhar yone wot loe",
                    "San phot te a bho o",
                    "Ho kyi bar soe",
                    "Soe dar soe po moe the sa gar",
                    "Ka lay a ngo take aung",
                    "A yake a young pya dal",
                    "Pho la nat tar."
                ],
                translation: [
                    "A rabbit crouches on the golden moon,",
                    "An old man pounding rice,",
                    "Behold, look!",
                    "Words that are spoken and exaggerated.",
                    "To stop the child from crying,",
                    "A shadow is shown,",
                    "The Prince of the Moon (Pho La Nat Tar)."
                ]
            },
            // 17. ဖိုးသာထူး
            {
                title: "ဖိုးသာထူး",
                youtubeId: "https://youtu.be/XSx5obuXIHE?si=kz4niH9PZKAgLFFV", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဖိုးသာထူး.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဖိုးသာထူး.jpg", // Literal filename

                burmese: [
                    "ဖိုးသာထူး ဖိုးသာထူး",
                    "အလွန်ဝတဲ့ ဖိုးသာထူး",
                    "ဖိုးသာထူး ဝမ်းပူပူ",
                    "ဖိုးဝကြီးနဲ့ တူ",
                    "တူပါသကွဲ့ မယုံငြား",
                    "သည်မှာ ကြည့်ပါလား"
                ],
                romanization: [
                    "Pho tar htu Pho tar htu",
                    "A Lwon Wa dae Pho tar Htu",
                    "Pho tar htu Wan Pu Pu",
                    "Pho Wa Gyi nea Tu",
                    "Tu par ta Kwae Ma Yong Nyar",
                    "Dee Mhar Kyi bar lar"
                ],
                translation: [
                    "Pho Tar Htu, Pho Tar Htu,",
                    "The extremely fat Pho Tar Htu,",
                    "Pho Tar Htu with a big belly,",
                    "Like Pho Wa Gyi (a famous fat character),",
                    "Indeed they are alike, if you don't believe,",
                    "Look right here."
                ]
            },
            // 18. ပျော်စရာမွေးနေ့
            {
                title: "ပျော်စရာမွေးနေ့",
                youtubeId: "https://youtu.be/MPN3jiyisuw?si=017rFRd-Vb2ZDRW5", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ပျော်စရာမွေးနေ့.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ပျော်စရာမွေးနေ့.jpeg", // Literal filename

                burmese: [
                    "(ပျော်စရာ မွေးနေ့ လေးပါ)2",
                    "(ပျော်စရာ မွေးနေ့)2",
                    "ပျော်စရာ မွေးနေ့ လေးပါ",
                    "(သူငယ်ချင်းတွေ ဖိတ်ပါ)2",
                    "(ပျော်စရာ မွေးနေ့)2",
                    "ပျော်စရာ မွေးနေ့ လေးမှာ"
                ],
                romanization: [
                    "(Pyaw za yar mway nae layy bar)2",
                    "(pyaw za yar mway nae)2",
                    "pyaw za yar mway nae layy bar",
                    "(T ngeel chin dway phate bar)2",
                    "(pyaw za yar mway nae)2",
                    "pyaw za yar mway nae layy mhar"
                ],
                translation: [
                    "It's a happy little birthday,",
                    "Happy birthday,",
                    "It's a happy little birthday,",
                    "Invite your friends,",
                    "Happy birthday,",
                    "On this happy little birthday."
                ]
            },
            // 19. အဖိုးကြီးအို
            {
                title: "အဖိုးကြီးအို",
                youtubeId: "https://youtu.be/MBGiQaK3fcQ?si=GBlTXvI7HfKD2H9O", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/အဖိုးကြီးအို.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/အဖိုးကြီးအို.jpg", // Literal filename

                burmese: [
                    "အဖိုးကြီးအို",
                    "ခါးကုန်းကုန်း",
                    "မသေပါနှင့်အုံး။",
                    "နောင်နှစ်ခါ",
                    "တန်ဆောင်မုန်း",
                    "ပွဲကြည့်ပါအုံး။"
                ],
                romanization: [
                    "Aa hpoe kyee ao",
                    "hkarr konekone",
                    "m tay par nhae aone",
                    "naung nhit hkar",
                    "taan saung mone",
                    "pwal kyee bar aone ."
                ],
                translation: [
                    "Old man,",
                    "With a hunched back,",
                    "Please don't die yet.",
                    "Next year,",
                    "During Tazaungmon (a month of the Myanmar calendar),",
                    "Please watch the festival."
                ]
            },
            // 20. ရောင်စုံမီးပုံး
            {
                title: "ရောင်စုံမီးပုံး",
                youtubeId: "https://youtu.be/MjMx9u8DXxM?si=vcwayOr1K-R_dJlb", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ရောင်စုံမီးပုံး.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ရောင်စုံမီးပုံး.png", // Literal filename

                burmese: [
                    "(ရောင်စုံ မီးပုံး)2",
                    "(ဖြူ နီ ဝါ)2",
                    "ဟိုမီးပုံးလည်း ချစ်စရာ",
                    "သည်မီးပုံးလည်း ချစ်စရာ",
                    "(ပွဲတော်အခါ)2"
                ],
                romanization: [
                    "(Yaung Sone Mee Bone)2",
                    "(Phyu Nee War)2",
                    "Ho Mee Bone Lal chitsayar",
                    "Dee Mee Bone Lal Chitsayar",
                    "(Pwal Daw a khar)2"
                ],
                translation: [
                    "Colourful lantern,",
                    "White, Red, Yellow,",
                    "That lantern is also lovely,",
                    "This lantern is also lovely,",
                    "During the festival time."
                ]
            },
            // 21. ဈေးထဲသွားကြမယ်
            {
                title: "ဈေးထဲသွားကြမယ်",
                youtubeId: "https://youtu.be/C9eJTX9LdUA?si=NhHJPkJyfgZWok0u", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဈေးထဲသွားကြမယ်.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဈေးထဲသွားကြမယ်.jpeg", // Literal filename

                burmese: [
                    "ဖေဖေနဲ့ အတူတူကွယ် ဈေးထဲသွားကြမယ်...",
                    "မေမေနဲ့ အတူတူကွယ် ဈေးထဲသွားကြမယ်...",
                    "(ဝယ်မယ်ကွယ့်)2 အသားနဲ့ ငါးနဲ့ဝယ်....။",
                    "(ဝယ်မယ်ကွယ့်)2 ဟင်းသီးဟင်းရွက်ဝယ်..."
                ],
                romanization: [
                    "Pyay Phay Nae A Tu Tu Kwel Zayy Htae Twar Ja Mel",
                    "May May Nae A Tu Tu Kwel Zayy Htae Twar Ja Mel",
                    "(Well Mell Kwea)2 A Tar nae Ngar nae Well.",
                    "(Well Mell Kwea)2 Hin Tee Hin Ywat Well."
                ],
                translation: [
                    "Let's go to the market together with Father...",
                    "Let's go to the market together with Mother...",
                    "We will buy, dear, we will buy meat and fish....",
                    "We will buy, dear, we will buy meat and fish....",
                    "We will buy, dear, we will buy vegetables...",
                    "We will buy, dear, we will buy vegetables..."
                ]
            },
            // 22. တို့များငယ်သော်လည်း
            {
                title: "တို့များငယ်သော်လည်း",
                youtubeId: "https://youtu.be/asNbe7Iwcoo?si=wELaXGM9e7hgVjTU", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တို့များငယ်သော်လည်း.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တို့များငယ်သော်လည်း.png", // Literal filename

                burmese: [
                    "(တို့များငယ်သော်လည်း အလုပ်လုပ်တတ်တယ်၊",
                    "ဘယ်အလုပ် မဆို တို့များလုပ်တတ်တယ်။)2",
                    "(ရေခပ်ပေး)3 တတ်တယ်",
                    "(ဟင်းရွက်ခြွေ)3 တတ်တယ်",
                    "(တံမြက်စည်းလှည်း)3 တတ်တယ်",
                    "တို့များငယ်သော်လည်း အလုပ်လုပ်တတ်တယ်။"
                ],
                romanization: [
                    "(doe myar ngal daw lel A loke loke tat dal",
                    "Bel a loke ma soe doe myar loke tat dal)2",
                    "(yay khat pay)3 tat dal",
                    "(hin yoat chwey)3 tat dal",
                    "(tan myat see hlel)3 tat dal",
                    "doe myar ngal daw lel A loke loke tat dal"
                ],
                translation: [
                    "Although we are young, we know how to work,",
                    "No matter what job, we know how to do it.",
                    "We know how to fetch water,",
                    "We know how to pluck vegetables,",
                    "We know how to sweep with a broom,",
                    "Although we are young, we know how to work."
                ]
            },
            // 23. ဆွမ်းအုပ်နီနီ
            {
                title: "ဆွမ်းအုပ်နီနီ",
                youtubeId: "https://youtu.be/22AbXAnsBv8?si=jtaDkymy5rzah9bl&t=56", 
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဆွမ်းအုပ်နီနီ.mp3", // Literal filename
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဆွမ်းအုပ်နီနီ.jpg", // Literal filename

                burmese: [
                    "ဆွမ်းအုပ်နီနီ အမေရွက်လို့",
                    "နက်ဖြန်မနက် ကျောင်းထွက်မယ်။",
                    "မောင်လဲလိုက်မယ် ချန်မထားနဲ့",
                    "အမေသွားတော့ ပျင်းလှတယ်။",
                    "ကျောင်းကြီးပေါ်မှာ",
                    "မောင်ငယ်ဆော့တော့",
                    "ဘုန်းကြီးအော့လို့ ရိုက်လိမ့်မယ်။",
                    "မောင်မဆော့ပေါင် စိပ်ပုတီးနဲ့",
                    "ဘုန်းတော်ကြီးလို နေပါ့မယ်။",
                    "လိုက်မယ် လိုက်မယ်။"
                ],
                romanization: [
                    "Swan Eot Nee Nee A May Ywat loe",
                    "Nat Phyan Ma Nat Kyaung Thwet Mae.",
                    "Maung Lae Like Mae chan ma thar Nea",
                    "A may Twar daw pyin hla dea",
                    "Kyaung Gyi paw mhar maung ngae sawt dawt",
                    "Phone Gyi awt loe yike lake mae",
                    "Maung ma sawt bown, sake ba dee nea",
                    "Phone daw gyi loe nay ba mae. Like mae, like mae."
                ],
                translation: [
                    "Mother carries the red food bowl (for monks),",
                    "Will go out to the monastery tomorrow morning.",
                    "I (younger brother) will follow too, don't leave me behind,",
                    "When Mother goes, I am very bored.",
                    "On the big monastery grounds,",
                    "If the little brother plays,",
                    "The monk might scold and hit.",
                    "I won't play, I will stay with my prayer beads,",
                    "And live like a venerable monk.",
                    "I will follow, I will follow."
                ]
            },
            // 24. တစ်နှစ်စာကိုချစ်
            {
                title: "တစ်နှစ်စာကိုချစ်",
                youtubeId: "https://youtu.be/h8dfOkUlM0c?si=aZzrwnSTOV5xOfIF",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တစ်နှစ်စာကိုချစ်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တစ်နှစ်စာကိုချစ်.jpg",
                burmese: [
                    "တစ် နှစ် ၊ စာကိုချစ်",
                    "သုံး လေး ၊ မသိတာမေး",
                    "ငါး ခြောက် ၊ နှစ်ချင်းပေါက်",
                    "ခုနစ် ရှစ် ၊ တပည့်သစ်",
                    "ကိုး တဆယ် ၊ ကြိုးစားမယ်"
                ],
                romanization: [
                    "Ta Hnit Sar Ko Chit",
                    "Thone lay, ma thi tar may",
                    "Ngar chaut, nhit chin pauk",
                    "Khun nit shit, ta pae thit",
                    "Koe ta sel, kyoe sar mal"
                ],
                translation: [
                    "One Twe, Love for the Lesson",
                    "Three four, ask what you don't know",
                    "Five six, a quick learner",
                    "Seven eight, new student",
                    "Nine ten, will try hard"
                ]
            },
            // 25. လိမ္မာတဲ့ ကလေးလေး
            {
                title: "လိမ္မာတဲ့ ကလေးလေး",
                youtubeId: "https://youtu.be/TjFi3lo9J0A?si=3dDTAxPl7DiNrA_m",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/လိမ္မာတဲ့ကလေးလေး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/လိမ္မာတဲ့ကလေးလေး.jpg",
                burmese: [
                    "လိမ္မာတဲ့ ကလေးလေး ဖြစ်အောင်ကွယ်။",
                    "တို့တစ်တွေ အမြဲ ကြိုးစားမယ်။",
                    "အဖေအမေရဲ့ စကား နားထောင်မယ်၊",
                    "ရိုသေလို့ ချစ်ပါ့မယ်။",
                    "လိမ္မာတဲ့ ကလေးလေး ဖြစ်အောင်ကွယ်။",
                    "တို့တစ်တွေ အမြဲ ကြိုးစားမယ်။",
                    "ဆရာ ဆရာမ စကား နားထောင်မယ်၊",
                    "ရိုသေလို့ ချစ်ပါ့မယ်။ ။"
                ],
                romanization: [
                    "Limmar dae kalay lay pyit aung kwal.",
                    "Doe tit twe a myae kyoe sar mal.",
                    "A pay a may yae sagar nar htaung mal,",
                    "Yo thay lo chit par mal.",
                    "Limmar dae kalay lay pyit aung kwal.",
                    "Doe tit twe a myae kyoe sar mal.",
                    "Sayar sayarma sagar nar htaung mal,",
                    "Yo thay lo chit par mal."
                ],
                translation: [
                    "To be a good little child,",
                    "We will always try.",
                    "We will listen to Father and Mother's words,",
                    "We will respect and love.",
                    "To be a good little child,",
                    "We will always try.",
                    "We will listen to the teacher's words,",
                    "We will respect and love."
                ]
            },
            // 26. ကိုကိုတစ်ကလေး
            {
                title: "ကိုကိုတစ်ကလေး",
                youtubeId: "https://youtu.be/fPrvW633S1s?si=iHIJ-O1zrkduhJ8j",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ကိုကိုတစ်ကလေး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ကိုကိုတစ်ကလေး.jpg",
                burmese: [
                    "ကိုကို (၁)ကလေး ထွက်လို့လာ",
                    "မမ (၂)လည်းပါ",
                    "ညီ (၃) (၄) နဲ့ (၅)လည်းပါ",
                    "အားလုံး ကကြမှာ။"
                ],
                romanization: [
                    "Ko ko ၁ ka lay thwat loe lar",
                    "မမ ၂ lel par", // User-provided mix
                    "Nyi ၃ ၄ nae ၅ lel par",
                    "Arr lone ka gya mhar"
                ],
                translation: [
                    "Brother (1) child comes out",
                    "Sister (2) is also included",
                    "Brother (3) (4) and (5) are also included",
                    "Everyone will dance."
                ]
            },
            // 27. ၁,၂,၃,၄
            {
                title: "၁,၂,၃,၄",
                youtubeId: "https://youtu.be/6Fz4CJ6i4Dk?si=bV24KEbYUYHE-q4q",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/၁,၂,၃,၄.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/၁,၂,၃,၄.jpg",
                burmese: [
                    "(၁ ၂ ၃ ၄)2",
                    "(၅ ၆ ၇)2",
                    "(၇ ပြီတော့ ၈ ကွယ်)2",
                    "(၉ ၁၀)2"
                ],
                romanization: [
                    "(၁ ၂ ၃ ၄)2",
                    "(၅ ၆ ၇)2",
                    "(၇ pi daw ၈ kwal)2",
                    "(၉ ၁၀)2"
                ],
                translation: [
                    "1 2 3 4",
                    "5 6 7",
                    "After 7 is 8",
                    "၉ ၁၀"
                ]
            },
            // 28. ၁,၂,၃
            {
                title: "၁,၂,၃",
                youtubeId: "https://youtu.be/5EcX-uVEIx0?si=6h3LyHtbkiqwTdVU",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/၁,၂,၃.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/၁,၂,၃.jpg",
                burmese: [
                    "၁ ၂ ၃ မောင်မောင် တူတူ ပုန်း",
                    "၄ ၅ ၆ မမ ပန်းတွေ ကောက်",
                    "၇ ၈ ၉ ဖေဖေ ပန်းပင် ပျိုး",
                    "၁၀ ၁၁ ၁၂ မေမေကို သိပ် ချစ်"
                ],
                romanization: [
                    "၁ ၂ ၃ Maung Maung tuu tuu pone",
                    "၄ ၅ ၆ Ma Ma pan twe kauk",
                    "၇ ၈ ၉ Phay Phay pan pin pyoe",
                    "၁၀ ၁၁ ၁၂ May May go thit chit"
                ],
                translation: [
                    "1 2 3 Brother, let's hide and seek",
                    "4 5 6 Sister, pick flowers",
                    "7 8 9 Father, plant flowers",
                    "10 11 12 Love Mother very much"
                ]
            },
            // 29. ၁,၂,လက်ရှေ့ပစ်
            {
                title: "၁,၂,လက်ရှေ့ပစ်",
                youtubeId: "https://youtu.be/-U1rha03HJA?si=Wz1TsW9XjGYVr82I",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/၁,၂,လက်ရှေ့ပစ်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/၁,၂,လက်ရှေ့ပစ်.jpg",
                burmese: [
                    "၁ ၂ လက်ရှေ့ပစ်",
                    "၃ ၄ ပခုံးတင်ကွေး",
                    "၅ ၆ လက်အပေါ်‌မြှောက်",
                    "၇ ၈ လက်နောက်ပစ်",
                    "၉ ၁၀ လက်ပိုက်မယ်"
                ],
                romanization: [
                    "၁ ၂ let shay pyit",
                    "၃ ၄ pa khone tin kway",
                    "၅ ၆ let a paw myauk",
                    "၇ ၈ let nauk pyit",
                    "၉ ၁၀ let pike mal"
                ],
                translation: [
                    "1 2 Throw hands forward",
                    "3 4 Bend at shoulders",
                    "5 6 Raise hands up",
                    "7 8 Throw hands back",
                    "9 10 Fold arms"
                ]
            },
            // 30. ပန်းတစ်ပွင့်
            {
                title: "ပန်းတစ်ပွင့်",
                youtubeId: "https://youtu.be/0XnPo-3geH4?si=yZUJNC_e34tCqfgB",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ပန်းတစ်ပွင့်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ပန်းတစ်ပွင့်.png",
                burmese: [
                    "ပန်းတစ်ပွင့်, ပန်းနှစ်ပွင့်, ပန်းသုံးပွင့်ပါ",
                    "ပန်းလေးပွင့်, ပန်းငါးပွင့်, ပန်းခြောက်ပွင့်ပါ",
                    "ပန်းခုနှစ်ပွင့်, ပန်းရှစ်ပွင့်, ပန်းကိုးပွင့်",
                    "ပန်းကလေးဆယ်ပွင့်ပါ။"
                ],
                romanization: [
                    "Pan ta pwint, pan nhit pwint, pan thone pwint par",
                    "Pan lay pwint, pan ngar pwint, pan chauk pwint par",
                    "Pan khun nit pwint, pan shit pwint, pan koe pwint",
                    "Pan ka lay sel pwint par."
                ],
                translation: [
                    "One flower, two flowers, three flowers",
                    "Four flowers, five flowers, six flowers",
                    "Seven flowers, eight flowers, nine flowers",
                    "Ten little flowers."
                ]
            },
            // 31. အားလုံးညီညွတ်တယ်
            {
                title: "အားလုံးညီညွတ်တယ်",
                youtubeId: "https://youtu.be/EJe_Tjw2k6U?si=fjyDo2hd4Qh35O9",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/အားလုံးညီညွတ်တယ်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/အားလုံးညီညွတ်တယ်.jpg",
                burmese: [
                    "၁ ၂ ၃ ညီမ ပန်းတွေကုံး",
                    "၄ ၅ ၆ နွားနို့ မှန်မှန်သောက်",
                    "၇ ၈ ၉ ဥယျာဉ်လေးကို ပျိုး",
                    "၁၀ ၁၁ ၁၂ ကိုယ့်တိုင်း ကိုယ့်ပြည်ချစ်",
                    "၁၃ ၁၄ ၁၅ ပန်းချီ ဆွဲပါလား",
                    "၁၆ ၁၇ ၁၈ အမှိုက် ယူလို့ပစ်",
                    "၁၉ ၂၀ အားလုံး ညီညွတ်တယ်"
                ],
                romanization: [
                    "၁ ၂ ၃ nyi ma pan twe kone",
                    "၄ ၅ ၆ nwar noe mhan mhan thauk",
                    "၇ ၈ ၉ u yin lay go pyoe",
                    "၁၀ ၁၁ ၁၂ koe tine koe pyi chit",
                    "၁၃ ၁၄ ၁၅ pan chi swel par lar",
                    "၁၆ ၁၇ ၁၉ a mhite yu loe pyit",
                    "၁၉ ၂၀ arr lone nyi nywat tal"
                ],
                translation: [
                    "1 2 3 Sister makes flower garlands",
                    "4 5 6 Drink milk regularly",
                    "7 8 9 Plant a little garden",
                    "10 11 12 Love your country",
                    "13 14 15 Draw a picture",
                    "16 17 18 Pick up and throw trash",
                    "19 20 Everyone is united"
                ]
            },
            // 32. ခရီးသွားကြမယ်
            {
                title: "ခရီးသွားကြမယ်",
                youtubeId: "https://youtu.be/8wPO7_HZcEk?si=Q3CTcbIXE33jlNdq",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ခရီးသွားကြမယ်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ခရီးသွားကြမယ်.jpeg",
                burmese: [
                    "ခရီးသွားကြမယ် တူတူလာ",
                    "သူငယ်ချင်း အားလုံး ပျော်စရာ",
                    "စီးကြ မောင်းကြ သွားကြမှာ",
                    "ပွမ် ပွမ် ကားကြီး မောင်းမယ်",
                    "တူ တူ ရထားကြီး မောင်းမယ်",
                    "ပေါ် ပေါ် သင်္ဘောကြီး မောင်းမယ်",
                    "ဝီ ဝီ လေယာဉ်ပျံကြီး မောင်းမယ်",
                    "ကလင် ကလင် စက်ဘီးလေး စီးမယ်",
                    "ဝူး ဝူး ဆိုင်ကယ် စီးမယ်",
                    "လျှောက် လျှောက် လမ်းကလေး လျှောက်မယ်"
                ],
                romanization: [
                    "Kha yee twar gya mal tuu tuu lar",
                    "Thu nge chin arr lone pyaw saya",
                    "See gya maung gya twar gya mhar",
                    "Pwum Pwum kar gyi maung mal",
                    "Tuu Tuu ya htar gyi maung mal",
                    "Paw Paw thin baw gyi maung mal",
                    "Whee Whee lay yin pyan gyi maung mal",
                    "Klin Klin set bein lay see mal",
                    "Woo Woo sidecar see mal",
                    "Shauk Shauk lan ka lay shauk mal"
                ],
                translation: [
                    "Let's travel, come together",
                    "All friends, it's so fun",
                    "We will ride and drive",
                    "Beep beep, drive the big car",
                    "Choo choo, drive the big train",
                    "Toot toot, drive the big ship",
                    "Whoosh whoosh, fly the big airplane",
                    "Kling kling, ride the little bicycle",
                    "Vroom vroom, ride the motorcycle",
                    "Walk walk, walk the little path"
                ]
            },
            // 33. ဆုတောင်း
            {
                title: "ဆုတောင်း",
                youtubeId: "https://youtu.be/59k3t0xSETc?si=9oPBDWIu5W9_vGl7",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဆုတောင်း.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဆုတောင်း.jpg",
                burmese: [
                    "စပါးဝါရွှေ ဝင်းပါစေ",
                    "ပန်းတွေ သင်းပါစေ၊",
                    "ငှက်ကလေးတွေ မိုးတိမ်ကြား",
                    "ပျံနိုင်ကြစေသား။",
                    "နေရောင်ခြည်လည်း ဖွေးပါစေ",
                    "လေပြည် အေးပါစေ၊",
                    "ချစ်မိတ်ဆွေ ပေါင်းဖော်များ",
                    "ကျန်းမာကြစေသား။"
                ],
                romanization: [
                    "Sapar war shwe win par say",
                    "Pan twe thin par say,",
                    "Nget ka lay twe moe tein kyar",
                    "Pyan naing gya say tar.",
                    "Nay yaung chi lel phway par say",
                    "Lay pyi ay par say,",
                    "Chit mate swe paung phaw myar",
                    "Kyan mar gya say tar."
                ],
                translation: [
                    "May the golden paddy shine,",
                    "May the flowers be fragrant,",
                    "The little birds, between the clouds,",
                    "May they be able to fly.",
                    "May the sunlight be bright,",
                    "May the breeze be cool,",
                    "Dear friends and companions,",
                    "May they be healthy."
                ]
            },
            // 34. ချိုးကလေး
            {
                title: "ချိုးကလေး",
                youtubeId: "https://youtu.be/k9TrwexAAx0?si=Zfy2jkKEaEyDOyIF",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ချိုးကလေး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ချိုးကလေး.jpg",
                burmese: [
                    "တနင်္ဂနွေ တနင်္လာ",
                    "ချိုးကလေး ကူသံသာ။",
                    "အင်္ဂါ ဗုဒ္ဓဟူး",
                    "ချိုးကလေး တကူ ကူး။",
                    "ကြာသပတေး သောကြာ",
                    "ချိုးကလေး မှန်မှန် လာ။",
                    "စနေမှာ မလာ အား",
                    "ချိုးကလေး ပျံလို့ သွား။"
                ],
                romanization: [
                    "Ta nin ga nway, Ta nin lar",
                    "Choe ka lay koo than thar.",
                    "In gar, Boke da hoo",
                    "Choe ka lay ta koo koo.",
                    "Kyar tha pa tay, Thauk kyar",
                    "Choe ka lay mhan mhan lar.",
                    "Sa nay mhar ma lar arr",
                    "Choe ka lay pyan loe twar."
                ],
                translation: [
                    "Sunday, Monday,",
                    "The little dove coos sweetly.",
                    "Tuesday, Wednesday,",
                    "The little dove coos and coos.",
                    "Thursday, Friday,",
                    "The little dove comes regularly.",
                    "On Saturday, it's not free and doesn't come,",
                    "The little dove flies away."
                ]
            },
            // 35. ရောင်စုံဘောလုံး
            {
                title: "ရောင်စုံဘောလုံး",
                youtubeId: "https://youtu.be/pOhPH3jv-so?si=dgyJzQPjEnYSDHSO",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ရောင်စုံဘောလုံး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ရောင်စုံဘောလုံး.jpeg",
                burmese: [
                    "(ရောင်စုံ ဘောလုံး)၂ (တစ်လုံး ငါးပြား)၂",
                    "(ကြိုက်တဲ့ အရောင် ရွေးယူ)၂",
                    "(တစ်လုံး ငါးပြား)၂",
                    "ဘိုးဘိုးကြီးရေ.. ဘွားဘွားကြီးရေ..",
                    "ချစ်ရဲ့လား/ဆူမှာလား/ပျော်ရဲ့လား",
                    "ဘိုးဘိုးချစ်တဲ့ မြေးရေ..",
                    "ဘွားဘွားချစ်တဲ့ မြေးရေ..",
                    "ချစ်ပါတယ်/ဘေးကို ဖယ်/ပျော်ပါတယ်",
                    "ကြောင်ဆိုးကြီးကို ရိုက်ပါမယ်",
                    "ဘိုးဘိုးနဲ့ ဘွားဘွားနဲ့ အတူတူ လိုက်က၊",
                    "ဘိုးဘိုးကြီးက သွားမရှိတော့ သီချင်း မဆိုနိုင်ဘူး။",
                    "ဘွားဘွားကြီးက အားမရှိတော့ လိုက်မကနိုင်ဘူး"
                ],
                romanization: [
                    "(Yaung sone baw lone)x2 (Ta lone ngar pyar)x2",
                    "(Kyike dae a yaung yway yu)x2",
                    "(Ta lone ngar pyar)x2",
                    "Bae boe gyi ray.. Bwar bwar gyi ray..",
                    "Chit yae lar / Soo mhar lar / Pyaw yae lar",
                    "Boe boe chit dae myay ray..",
                    "Bwar bwar chit dae myay ray..",
                    "Chit par tal / Bay go phel / Pyaw par tal",
                    "Kyaung soe gyi go yike par mal",
                    "Boe boe nae bwar bwar nae a tuu tuu like ka,",
                    "Boe boe gyi ga twar ma shi daw thi chin ma so naing buu.",
                    "Bwar bwar gyi ga arr ma shi daw like ma ka naing buu"
                ],
                translation: [
                    "(Colorful ball)x2 (One for five pyas)x2",
                    "(Choose the color you like)x2",
                    "(One for five pyas)x2",
                    "Oh Grandpa.. Oh Grandma..",
                    "Do you love me? / Will you scold? / Are you happy?",
                    "Oh, Grandpa's beloved grandchild..",
                    "Oh, Grandma's beloved grandchild..",
                    "I love you / Move aside / I am happy",
                    "I will hit the big bad cat",
                    "Dance along with Grandpa and Grandma,",
                    "Grandpa has no teeth, so he can't sing.",
                    "Grandma has no strength, so she can't dance along."
                ]
            },
            // 36. ဆယ့်နှစ်လ ရာသီ ပွဲတော်များ
            {
                title: "ဆယ့်နှစ်လ ရာသီ ပွဲတော်များ",
                youtubeId: "https://youtu.be/oBpLrvNP4RI?si=7VJyqr6wcoMvFtiQ",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဆယ့်နှစ်လရာသီ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဆယ့်နှစ်လရာသီ.jpg",
                burmese: [
                    "မြန်မာတို့ရဲ့ ၁၂-လရာသီ တို့အားလုံး သိသင့်ပါသည်",
                    "၁။ တန်ခူးလ သင်္ကြန်ပွဲ",
                    "၂။ ကဆုန်လ ညောင်ရေသွန်းပွဲ",
                    "၃။ နယုန်လ စာပြန်ပွဲ",
                    "၄။ ဝါဆိုလ ၀ါဆိုပွဲ",
                    "၅။ ဝါခေါင်လ စာရေးတံမဲပွဲ",
                    "၆။ တော်သလင်းလ လှေပြိုင်ပွဲ",
                    "၇။ သီတင်းကျွတ်လ မီးထွန်းပွဲ",
                    "၈။ တန်ဆောင်မုန်းလ ကထိန်ပွဲ",
                    "၉။ နတ်တော်လ စာဆိုတော်ပွဲ",
                    "၁၀။ ပြာသိုလ မြင်းခင်းပွဲ",
                    "၁၁။ တပို့တွဲလ ထမနဲပွဲ",
                    "၁၂။ တပေါင်းလ သဲပုံစေတီပွဲ"
                ],
                romanization: [
                    "Myanmar doe yae 12 la ya thee doe arr lone thi thint par del",
                    "1. Ta Nguu La Thingyan Pwe",
                    "2. Ka Sone La Nyaung Yay Thwin Pwe",
                    "3. Na Yone La Sar Pyan Pwe",
                    "4. Wa Soe La Wa Soe Pwe",
                    "5. Wa Khaung La Sar Yay Tan Mal Pwe",
                    "6. Taw Tha Lin La Hlay Pyaing Pwe",
                    "7. Tha Tin Kyut La Mee Htun Pwe",
                    "8. Ta Saung Mone La Ka Htein Pwe",
                    "9. Nat Taw La Sar So Taw Pwe",
                    "10. Pya Tho La Myin Khin Pwe",
                    "11. Ta Po Tway La Hta Ma Nae Pwe",
                    "12. Ta Paung La Thae Pone Zay Ti Pwe"
                ],
                translation: [
                    "We should all know the 12 months of Myanmar",
                    "1. Tagu - Thingyan (Water) Festival",
                    "2. Kason - Banyan Watering Festival",
                    "3. Nayon - Scripture Recital Festival",
                    "4. Waso - Waso Festival (Rains Retreat)",
                    "5. Wagaung - Sortition Festival",
                    "6. Tawthalin - Boat Racing Festival",
                    "7. Thadingyut - Festival of Lights",
                    "8. Tazaungmon - Kahtein (Robe Offering) Festival",
                    "9. Natdaw - Literati Festival",
                    "10. Pyatho - Equestrian Festival",
                    "11. Tabodwe - Htamane (Glutinous Rice) Festival",
                    "12. Tabaung - Sand Pagoda Festival"
                ]
            },
            // 37. သားတို့ချစ်တဲ့ဆရာမ
            {
                title: "သားတို့ချစ်တဲ့ဆရာမ",
                youtubeId: "https://youtu.be/2y61-iUypQE?si=IQc_nhTAVoWVTLJE",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/သားတို့ချစ်တဲ့ဆရာမ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/သားတို့ချစ်တဲ့ဆရာမ.png",
                burmese: [
                    "ဆရာမ ဆရာမ... သားတို့ ချစ်တဲ့ ဆရာမ",
                    "ဆရာမ ဆရာမ… သမီးတို့ ချစ်တဲ့ ဆရာမ",
                    "ပြုံးပြုံးလေးနဲ့ စာကိုသင်",
                    "တပည့်များရဲ့ ပဲ့ကိုင်ရှင်",
                    "မင်္ဂလာပါ ဆရာမ တပည့်တွေ ချစ်ကြ",
                    "ကြိမ်လုံးကိုလည်း သူ မကိုင်",
                    "မေတ္တာတရားဟာ သူ့ လက်ကိုင်",
                    "ချော့ကာ မော့ကာ စာသင်ပြ",
                    "သားသားတို့ ဆရာမ",
                    "သိစရာ တတ်စရာ သင်ညွှန်ပြ",
                    "မီးမီးတို့ ဆရာမ"
                ],
                romanization: [
                    "Sayama Sayama... Thar doe chit dae Sayama",
                    "Sayama Sayama... Tha mee doe chit dae Sayama",
                    "Pyone pyone lay nae sar go thin",
                    "Ta pae myar yae pae kaing shin",
                    "Mingalarpar Sayama ta pae twe chit gya",
                    "Kyein lone go lel thu ma kaing",
                    "Myittar ta yar har thu let kaing",
                    "Chaw kar maw kar sar thin pya",
                    "Thar thar doe Sayama",
                    "Thi saya tat saya thin nhwon pya",
                    "Mee mee doe Sayama"
                ],
                translation: [
                    "Teacher, Teacher... The teacher our sons love",
                    "Teacher, Teacher... The teacher our daughters love",
                    "Teaching with a smile",
                    "The students' helmsman",
                    "Hello Teacher, the students love you",
                    "She doesn't hold a cane",
                    "Loving-kindness is her tool",
                    "She teaches patiently and kindly",
                    "The sons' teacher",
                    "She teaches what we need to know and learn",
                    "The daughters' teacher"
                ]
            },
            // 38. မူကြိုကားကြီး လာပါပြီကွယ်
            {
                title: "မူကြိုကားကြီး လာပါပြီကွယ်",
                youtubeId: "https://youtu.be/iCc_sdOB6B8?si=y_xoR3D8V9vO6fZ4",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မူကြိုကားကြီး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မူကြိုကားကြီး.png",
                burmese: [
                    "လွယ်အိတ်ကလေးတွေ ကိုယ်စီ လွယ်",
                    "ကိုကို မမ တို့ပါကွယ်",
                    "သားသားလေးလည်း လိုက်ချင်တယ်",
                    "ကျောင်းတက်ချင်ပြီကွယ်",
                    "သားသားလေးက တစ်ယောက်ထဲကွယ်",
                    "အိမ်မှာ ပျင်းပါတယ်",
                    "ကျောင်းကို သွားလို့ ကဗျာ ဆိုမယ်",
                    "မူကြိုကားကြီး လာပါပြီကွယ်"
                ],
                romanization: [
                    "Lwal eit ga lay twe ko sii lwal",
                    "Ko ko ma ma doe par kwal",
                    "Tar tar lay lell like chin dal",
                    "Kyaung tat chin pee kwal",
                    "Tar tar lay ga ta yauk htell kwal",
                    "Eain mhar pyin bar dell",
                    "Kyaung go twar loe ga byar soe mal",
                    "Muu gyo kar gyi lar bar pyi kwal"
                ],
                translation: [
                    "Carrying their own small school bags,",
                    "Big brother and big sister are here,",
                    "Little son wants to follow too,",
                    "I want to go to school.",
                    "Little son is all alone,",
                    "He is bored at home.",
                    "I will go to school and sing poems,",
                    "The kindergarten bus is here."
                ]
            },
            // 39. မေ့သားလှ
            {
                title: "မေ့သားလှ",
                youtubeId: "https://youtu.be/vFuqWZ0RRCM?si=r0qt-1Oz6vN62j8G",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/မေ့သားလှ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/မေ့သားလှ.jpg",
                burmese: [
                    "ခေါင်းလောင်းသံ ဒေါင်ဒေါင်ဒင်",
                    "ကျောင်းတက်ချိန်မို့ပင်၊",
                    "စာသင်သမျှ နားထောင်ကြ",
                    "ဒါမှ မေ့သားလှ။",
                    "ခေါင်းလောင်းသံ ဒေါင်ဒေါင်ဒင်",
                    "ကျောင်းဆင်းချိန်မို့ပင်၊",
                    "အတန်းစဉ်ကာ အိမ်ပြန်ရ",
                    "ဒါမှ မေ့သားလှ။"
                ],
                romanization: [
                    "Khaung laung than daung daung din",
                    "Kyaung tet chain moe pin,",
                    "Sar thin tha mya nar htaung gya",
                    "Dar mha May thar hla.",
                    "Khaung laung than daung daung din",
                    "Kyaung sin chain moe pin,",
                    "A tan sin kar ein pyan ya",
                    "Dar mha May thar hla."
                ],
                translation: [
                    "The bell rings, dong dong ding,",
                    "Because it's time for school.",
                    "Listen to all the lessons,",
                    "That's Mother's beautiful child.",
                    "The bell rings, dong dong ding,",
                    "Because it's time to go home.",
                    "Line up and return home,",
                    "That's Mother's beautiful child."
                ]
            },
            // 40. တောင်တောရယ်သာ
            {
                title: "တောင်တောရယ်သာ",
                youtubeId: "https://youtu.be/3fhwtn9ADno?si=J8zTBWpWKfyo89fl",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/တောင်တောရယ်သာ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/တောင်တောရယ်သာ.jpg",
                burmese: [
                    "တောင်တောရယ် သာ",
                    "မာလာက ငုံဖူး။",
                    "တစ်ပင်ကို နှစ်ပင် ယှက်တယ် ကျေးငှက်က မြူး။"
                ],
                romanization: [
                    "Taung taw yal thar",
                    "Mar lar ga ngone phuu.",
                    "Ta pin go nhit pin yhet tel kyay nget ka myuu."
                ],
                translation: [
                    "The forest hills are pleasant",
                    "The flowers are budding.",
                    "One tree intertwined with another, the birds are frolicking."
                ]
            },
            // 41. ယုန်ကလေးက နားရွက်ထောင်
            {
                title: "ယုန်ကလေးက နားရွက်ထောင်",
                youtubeId: "https://youtu.be/62umXRM2jcE?si=HWG36vRgGiBn2lOb",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ယုန်ကလေးကနားရွက်ထောင်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ယုန်ကလေးကနားရွက်ထောင်.jpg",
                burmese: [
                    "ယုန်ကလေးက နားရွက်ထောင် ပညာရှိ ယောင်ယောင်",
                    "ကြောင်ကလေးက လက်သည်းဝှက် ချောင်းလိုက်ရတဲ့ကြွက်",
                    "ရွှေဇီးကွက်ရဲ့ ဣန္ဒြေ ဘုရင်ကြီးလိုနေ",
                    "မိုးလေတွက်ကာ ဗေဒင်ဟော တောက်တဲ့ ကိုလေပေါ",
                    "ပြောတိုင်း ယုံတဲ့ ပုတ်သင်ညို ခေါင်းညိတ်လှသကို",
                    "ရွှေကျီးညို သာပါလှ ဧည့်သည်လာပါစ။"
                ],
                romanization: [
                    "Yone ka lay ga nar ywet htaung pyin nyar shi yaung yaung",
                    "Kyaung ka lay ga let thel whet chaung like ya dae kywet",
                    "Shwe zee kwet yae indray ba yin gyi lo nay",
                    "Moe lay twet kar baydin haw tauk tae ko lay paw",
                    "Pyaw tine yone dae pote thin nyo gaung nyeit hla tha ko",
                    "Shwe kyee nyo thar par hla aeh thel lar par sa."
                ],
                translation: [
                    "The little rabbit perks its ears, pretending to be wise",
                    "The little cat hides its claws, stalking the mouse",
                    "The golden owl's dignity is like a king's",
                    "The gecko, Mr. Windbag, predicts the weather",
                    "The chameleon believes everything, nodding its head",
                    "The pleasant myna bird, a guest is coming."
                ]
            },
            // 42. ပေါင်းစုညီညာဆိုကမယ်
            {
                title: "ပေါင်းစုညီညာဆိုကမယ်",
                youtubeId: "https://youtu.be/L7RmbutvlyI?si=MU_gc1EEdBK982OY",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ပေါင်းစုညီညာဆိုကမယ်.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ပေါင်းစုညီညာဆိုကမယ်.jpg",
                burmese: [
                    "လာပါလေ သူငယ်ချင်း",
                    "ပေါင်းစု ကြစို့ကွယ်",
                    "ပျော်ရွှင်စွာ တို့များ",
                    "ဆို ကမယ်",
                    "တစ်ဦးက ကကာ",
                    "တစ်ယောက်က ဝိုင်းလို့ဆို",
                    "ပျော်စရာ အချိန်လေး",
                    "အားလုံးအတွက်ကွယ်"
                ],
                romanization: [
                    "Lar bar lay ta ngel chin",
                    "Paung su gya soe kwal",
                    "Pyaw shwin swar doe myar",
                    "Soe ka mal",
                    "Ta oo ga ka gar ta yoke ga wine loe soe",
                    "Pyaw sa a chain lay",
                    "Arr lone a twak kwal."
                ],
                translation: [
                    "Come, friend",
                    "Let's get together",
                    "Happily, we will",
                    "Sing and dance",
                    "One person dances",
                    "Another sings along",
                    "A happy time",
                    "For everyone."
                ]
            },
            // 43. ဟောဒီလို
            {
                title: "ဟောဒီလို",
                youtubeId: "https://youtu.be/38LamRCOoGk?si=XPki5Y8r1rgvp0tA",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဟောဒီလို.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဟောဒီလို.png",
                burmese: [
                    "ဝါးပင်ကြီးတွေ ဘယ်လိုယိမ်း",
                    "ဟောဒီလို ယိမ်း",
                    "ငှက်ခါးစိမ်းက ဘယ်လိုပျံ",
                    "ဟောဒီလို ပျံ",
                    "ပင်လယ်ဖျံက ဘယ်လိုသွား",
                    "ဟောဒီလို သွား",
                    "ကိုရွှေဖားက ဘယ်လိုခုန်",
                    "ဟောဒီလို ခုန်",
                    "ဗုံသံကြားတော့ ဘယ်လိုက",
                    "ဟောဒီလို က"
                ],
                romanization: [
                    "War pin gyi twe bal lo yein",
                    "Haw di lo yein",
                    "Nget khar sein ka bal lo pyan",
                    "Haw di lo pyan",
                    "Pin lel phan ka bal lo twar",
                    "Haw di lo twar",
                    "Ko shwe phar ka bal lo khone",
                    "Haw di lo khone",
                    "Bone than kyar daw bal lo ka",
                    "Haw di lo ka"
                ],
                translation: [
                    "How do the big bamboo trees sway?",
                    "They sway like this",
                    "How does the green magpie fly?",
                    "It flies like this",
                    "How does the sea otter move?",
                    "It moves like this",
                    "How does Mr. Golden Frog jump?",
                    "He jumps like this",
                    "When you hear the drum, how do you dance?",
                    "You dance like this"
                ]
            },
            // 44. ဆန်းသစ်စ
            {
                title: "ဆန်းသစ်စ",
                youtubeId: "https://youtu.be/bOM4nT95QGU?si=zLBbJp49CbnP3LBS",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ဆန်းသစ်စ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ဆန်းသစ်စ.jpg",
                burmese: [
                    "ဆန်းသစ်စ လကလေးဟာ အဲဒါ ရေးချပါ",
                    "ပြောင်းပြန်လှည့်ကာ ဝတ်ဆံထိုး အဲဒါ သဝေထိုး",
                    "ရေအိုးကလေး ရွက်လာရင် အဲဒါ လုံးကြီးတင်",
                    "လုံးကြီးတင်မှာ မျက်ဆန်ခတ် လုံးကြီးတင်ဆန်ခတ်"
                ],
                romanization: [
                    "San thit sa la ka lay har, el dar yay cha par",
                    "Pyaung pyan hlae kar wet san htoe, el dar tha way htoe",
                    "Yay oe ka lay ywet lar yin, el dar lone gyi tin",
                    "Lone gyi tin mhar myet san khat, lone gyi tin san khat"
                ],
                translation: [
                    "The new crescent moon, that is 'yay-cha' (vowel sign)",
                    "Turn it around and add a stamen, that is 'tha-way-htoe' (vowel sign)",
                    "If you carry a small water pot, that is 'lone-gyi-tin' (vowel sign)",
                    "Add a dot to 'lone-gyi-tin', that is 'lone-gyi-tin-san-khat' (vowel sign)"
                ]
            },
            // 45. ပြေးပွဲ ပြိုင်ပွဲ
            {
                title: "ပြေးပွဲ ပြိုင်ပွဲ",
                youtubeId: "https://youtu.be/nCRggZb2LIg?si=RQNCP4twCPzi_y-l",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ပြေးပွဲပြိုင်ပွဲ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ပြေးပွဲပြိုင်ပွဲ.jpg",
                burmese: [
                    "ခြေထောက်တစ်ဖက်",
                    "ထောက်လို့ရပ်",
                    "တစ်ချောင်းငင်လို့ မှတ်။",
                    "နှစ်ဖက်ရပ်တော့",
                    "နှစ်ချောင်းငင်",
                    "ပြေးပွဲ ပြိုင်ပွဲ ဝင်။",
                    "ပြေးရင်းပင်",
                    "နောက်ပြန်လဲ",
                    "နောက်ပစ် ကလေးပဲ။",
                    "ခဏ ခဏ လဲ။"
                ],
                romanization: [
                    "Chay htauk ta phet",
                    "Htauk loe yat",
                    "Ta chaung ngin loe mhat.",
                    "Nhit phet yat daw",
                    "Nhit chaung ngin",
                    "Pyay pwe pyaing pwe win.",
                    "Pyay yin pin",
                    "Nauk pyan lae",
                    "Nauk pyit ka lay pal.",
                    "Kha na kha na lae."
                ],
                translation: [
                    "One leg",
                    "Stand on it",
                    "Remember it as 'ta-chaung-ngin' (vowel sign).",
                    "When you stand on two feet",
                    "It's 'nhit-chaung-ngin' (vowel sign)",
                    "Enter the running race.",
                    "While running",
                    "Fall backwards",
                    "It's just 'nauk-pyit' (vowel sign).",
                    "Falling again and again."
                ]
            },
            // 46. စံပယ်ပွင့်လေး
            {
                title: "စံပယ်ပွင့်လေး",
                youtubeId: "https://youtu.be/mTf8ibKfxqA?si=BjO7-skgwryPEih5",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/စံပယ်ပွင့်လေး.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/စံပယ်ပွင့်လေး.jpg",
                burmese: [
                    "စံပယ်ပွင့်ကလေး ခေါင်းပေါ်တင် အဲဒါ သေးသေးတင်။",
                    "စံပယ်နှစ်ပွင့် ရှေ့မှာရောက် ဝစ္စနှစ်လုံးပေါက်။",
                    "အောက်နားဆီက တစ်ပွင့်ဟာ အောက်ကမြစ် ကလေးပါ။",
                    "သေသေချာချာ မှတ်လို့ထား မောင်ညီမလေးများ။"
                ],
                romanization: [
                    "Sa bal pwint ka lay gaung paw tin, el dar thay thay tin.",
                    "Sa bal nhit pwint shay mhar yauk, wit sa nhit lone pauk.",
                    "Auk nar see ka ta pwint har, auk ka myit ka lay par.",
                    "Thay thay char char mhat loe htar, maung nyi ma lay myar."
                ],
                translation: [
                    "A jasmine flower on the head, that is 'thay-thay-tin' (tone mark).",
                    "Two jasmine flowers in front, that is 'wut-sa-nhit-lone-pauk' (visarga).",
                    "One flower underneath, that is 'auk-ka-myit' (vowel sign).",
                    "Remember this carefully, little brothers and sisters."
                ]
            },
            // 47. သင်ကျောင်းထဲမှာ ပျော်ရွှင်လျှင်
            {
                title: "သင်ကျောင်းထဲမှာ ပျော်ရွှင်လျှင်",
                youtubeId: "https://youtu.be/zswm3ErISn4?si=WeQfaMCJsWc9FTdu",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/သင်ကျောင်းထဲမှာ.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/သင်ကျောင်းထဲမှာပျော်ရွှင်လျှင်.jpg",
                burmese: [
                    "(သင်ကျောင်းထဲမှာ ပျော်ရွှင်လျှင် လက်ခုပ်တီး)၂",
                    "သင်ကျောင်းထဲမှာ ပျော်ရွှင်လျှင် အားရပါးရ လက်ခုပ်တီး...",
                    "သင်ကျောင်းထဲမှာ ပျော်ရွှင်လျှင် လက်ခုပ်တီး",
                    "ခေါင်းကိုငြိမ့်, ခြေကိုဆောင့်, နှာကိုခြေ, အားလုံးလုပ်"
                ],
                romanization: [
                    "(tin kyaungg htell mhar pyaw shwin yin laat hkote tee)x2",
                    "tin kyaungg htell mhar pyaw shwin yin arr ya parr ya laat hkote tee",
                    "tin kyaungg htell mhar pyaw shwin yin laat hkote tee",
                    "Goung go nyeint, Chay go saunt, Hna go chay, Arr lone loke"
                ],
                translation: [
                    "(If you're happy in your school, clap your hands)x2",
                    "If you're happy in your school, clap your hands with all your might...",
                    "If you're happy in your school, clap your hands",
                    "Nod your head, stomp your feet, pinch your nose, do it all"
                ]
            },
            // 48. ရွှေစွန်ညို
            {
                title: "ရွှေစွန်ညို",
                youtubeId: "https://youtu.be/D8grwaqGPX4?si=AoDS_xbrifVgKEif",
                audioUrl: "https://raw.githubusercontent.com/nathantun93/bell/main/ရွှေစွန်ညို.mp3",
                imageUrl: "https://raw.githubusercontent.com/nathantun93/Pic/main/ရွှေစွန်ညို.jpg",
                burmese: [
                    "ရွှေစွန်ညို ဘာကို လိုလို့ ဝဲပါတယ်",
                    "မထွေးလိုလို့ ဝဲပါတယ်။",
                    "မထွေးမပါ တို့ချည်းသာ",
                    "ပါပါလျက်သား နောက်ကထား။",
                    "မထွေးအသား ခါးလှတယ်",
                    "ချောင်းငယ်ရေနှင့် ဆေးပါ့မယ်။",
                    "ချောင်းငယ်ရေချမ်း နွေမှာခန်း",
                    "မြစ်ငယ်ရေနှင့် ဆေးပါ့မယ်။",
                    "မြစ်ငယ်ရေချမ်း နွေမှာခန်း",
                    "ပင်လယ်ရေနှင့် ဆေးပါ့မယ်။",
                    "ပင်လယ်ရေချမ်း နွေမှာခန်း",
                    "ပင်လယ်ရေ ဘယ်မခန်း၊ မထွေး အမိဖမ်း။"
                ],
                romanization: [
                    "Shwe Sone Nyo bar go lo loe wae par tal",
                    "Ma Htway lo loe wae par tal.",
                    "Ma Htway ma par doe chi thar",
                    "Par par lyat thar nauk ka htar.",
                    "Ma Htway a thar khar hla tal",
                    "Chaung ngel yay nae say par mal.",
                    "Chaung ngel yay chan nway mhar khan",
                    "Myit ngel yay nae say par mal.",
                    "Myit ngel yay chan nway mhar khan",
                    "Pin lel yay nae say par mal.",
                    "Pin lel yay chan nway mhar khan",
                    "Pin lel yay bal ma khan, Ma Htway a mi phan."
                ],
                translation: [
                    "Golden Kite, why are you circling?",
                    "I'm circling because I want Ma Htway (a name).",
                    "Ma Htway isn't here, it's only us.",
                    "She is here, hiding at the back.",
                    "Ma Htway's flesh is very bitter.",
                    "I will wash it with stream water.",
                    "The stream water is cold, but dries up in summer.",
                    "I will wash it with river water.",
                    "The river water is cold, but dries up in summer.",
                    "I will wash it with sea water.",
                    "The sea water is cold, but dries up in summer.",
                    "The sea water never dries up! Catch Ma Htway!"
                ]
            }
        ];
        
        // ----------------------------------------------------
        // II. STATE MANAGEMENT & CONSTANTS
        // ----------------------------------------------------
        let currentPoemIndex = 0;
        let isRomanizationMode = false;
        let currentAudio = null;

        const poemContainer = byId('poem-container');
        const poemTitle = byId('poem-title');
        const mediaDisplay = byId('media-display');
        const initialPlaceholder = byId('initial-placeholder');
        const translationOverlay = byId('translation-overlay');
        
        // Navigation Buttons
        const prevButton = byId('prev-poem');
        const nextButton = byId('next-poem');
        const openYoutubeButton = byId('open-youtube'); // Renamed ID

        const COLOR_CLASSES = ['color-0', 'color-1', 'color-2', 'color-3', 'color-4'];
        const TRANSLATION_TIMEOUT_MS = 3000; // 3 seconds to hide the translation

        // ----------------------------------------------------
        // III. CORE FUNCTIONS
        // ----------------------------------------------------

        /**
         * Renders the current poem (Burmese or Romanization) to the screen.
         */
        function renderPoem() {
            const poem = poemsData[currentPoemIndex];
            const lines = isRomanizationMode ? poem.romanization : poem.burmese;
            
            poemTitle.textContent = `${currentPoemIndex + 1}. ${poem.title}`;
            poemContainer.innerHTML = '';
            
            lines.forEach((line, index) => {
                const p = document.createElement('p');
                // Added max-w-xl and mx-auto for better centering of text lines
                p.className = `poem-line ${COLOR_CLASSES[index % COLOR_CLASSES.length]} mx-auto max-w-xl`; 
                p.textContent = line;
                p.dataset.lineIndex = index;
                p.addEventListener('click', handleLineClick);
                poemContainer.appendChild(p);
            });
            
            // Adjust font size dynamically to fill space
            adjustFontSize();

            // Re-render the image for context and the 3D-like effect
            displayImage(poem.imageUrl);
            
            // Update navigation button states
            prevButton.disabled = currentPoemIndex === 0;
            nextButton.disabled = currentPoemIndex === poemsData.length - 1;
            prevButton.classList.toggle('opacity-50', currentPoemIndex === 0);
            nextButton.classList.toggle('opacity-50', currentPoemIndex === poemsData.length - 1);
        }

        /**
         * Dynamically adjusts font size to fill the container height without overflowing.
         */
        function adjustFontSize() {
            const container = byId('poem-container');
            
            // Set a sensible max/min font size in pixels
            // Title is sm:text-4xl (36px). Max font size is set to 32px to avoid being larger than the title.
            // (ခေါင်းစဉ်မှာ 36px ဖြစ်သောကြောင့်၊ အကြီးဆုံး စာလုံးအရွယ်အစားကို 32px သို့ ကန့်သတ်ထားပါသည်)
            const MAX_FONT_SIZE_PX = 32; // Allow larger fonts for short poems
            const MIN_FONT_SIZE_PX = 14; // Allow smaller fonts for long poems
            const STEP_PX = 1; // Increase by 1px for finer control

            let currentSize = MIN_FONT_SIZE_PX;
            container.style.fontSize = currentSize + 'px';

            // Loop to GROW font size as long as it fits within the container height
            while (container.scrollHeight <= container.clientHeight && currentSize < MAX_FONT_SIZE_PX) {
                currentSize += STEP_PX;
                container.style.fontSize = currentSize + 'px';
            }
            
            // If the loop broke because it overflowed, step back one size to ensure it fits
            if (container.scrollHeight > container.clientHeight) {
                 currentSize -= STEP_PX;
                 container.style.fontSize = currentSize + 'px';
            }
            
            // Final check: ensure it's not below min
            if (currentSize < MIN_FONT_SIZE_PX) {
                 container.style.fontSize = MIN_FONT_SIZE_PX + 'px';
            }
        }

        /**
         * Navigates to the previous or next poem.
         * @param {number} direction - 1 for next, -1 for previous.
         */
        function navigatePoem(direction) {
            // Stop any currently playing audio when changing poems
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
            
            const newIndex = currentPoemIndex + direction;
            if (newIndex >= 0 && newIndex < poemsData.length) {
                currentPoemIndex = newIndex;
                renderPoem();
            }
        }

        /**
         * Toggles between Burmese text and Romanized text.
         */
        function toggleRomanization() {
            isRomanizationMode = !isRomanizationMode;
            // Update icon style to reflect current state
            const btn = byId('toggle-romanization');
            if (isRomanizationMode) {
                btn.classList.replace('bg-red-500', 'bg-blue-500');
                btn.title = "မြန်မာစာ ပြန်ပြောင်းမည်";
            } else {
                btn.classList.replace('bg-blue-500', 'bg-red-500');
                btn.title = "အင်္ဂလိပ် အသံထွက် ပြောင်းမည်";
            }
            renderPoem();
        }

        /**
         * Handles the click on a poem line to show its English translation.
         * @param {Event} e - The click event.
         */
        function handleLineClick(e) {
            const lineIndex = parseInt(e.currentTarget.dataset.lineIndex, 10);
            const translationText = poemsData[currentPoemIndex].translation[lineIndex];

            // 1. Show Translation
            translationOverlay.textContent = translationText;
            translationOverlay.classList.remove('bg-gray-700');
            translationOverlay.classList.add('bg-f97316', 'show');

            // 2. Automatically Hide after timeout (to save space)
            clearTimeout(window.translationTimer);
            window.translationTimer = setTimeout(() => {
                translationOverlay.classList.remove('show');
            }, TRANSLATION_TIMEOUT_MS);
        }

        /**
         * Parses various YouTube URL formats to extract ID and start time.
         * This function is now used to construct the direct URL for opening in a new tab.
         * @param {string} url - The YouTube URL or video ID.
         * @returns {object|null} - {id: string, start: string|null}
         */
        function parseYoutubeDetails(url) {
            if (!url) return null;

            let videoId = null;
            let startTime = null;
            let isFullUrl = false;

            // Regex patterns
            const patterns = [
                /youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&]t=([0-9]+))?/,
                /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})(?:[?&]t=([0-9]+))?/,
                /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&]start=([0-9]+))?/,
                /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    videoId = match[1];
                    startTime = match[2] || null;
                    isFullUrl = url.startsWith('http');
                    break;
                }
            }

            // If no match and it's an 11-char string, assume it's a raw ID
            if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
                videoId = url;
            }

            // If the URL is already a full, valid URL, just return it as is
            if (url.startsWith('http') && videoId) {
                return { id: videoId, start: startTime, fullUrl: url };
            }


            return { id: videoId, start: startTime, fullUrl: null };
        }

        /**
         * Opens the associated YouTube video in a new browser tab. (New Logic)
         */
        function openYoutubeInNewTab() {
            const poem = poemsData[currentPoemIndex];
            const details = parseYoutubeDetails(poem.youtubeId);

            if (!details || !details.id) {
                alertUser("YouTube လင့်ခ် ထည့်သွင်းမထားပါ/မှားယွင်းနေပါသည်။");
                return;
            }
            
            let targetUrl = details.fullUrl;
            
            if (!targetUrl) {
                // If it wasn't a full URL, construct the standard watch link
                targetUrl = `https://www.youtube.com/watch?v=${details.id}`;
                if (details.start) {
                    targetUrl += `&t=${details.start}`;
                }
            }
            
            window.open(targetUrl, '_blank');
            alertUser(`YouTube ကို မျက်နှာစာအသစ်တွင် ဖွင့်လိုက်ပါပြီ: ${poem.title}`);
        }

        /**
         * Plays the associated audio file. (Unchanged logic)
         */
        function playAudio() {
            // 1. Check if audio is currently playing (toggle off)
            if (currentAudio && !currentAudio.paused) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                alertUser("အသံကို ရပ်လိုက်ပါပြီ။");
                return;
            }
            
            // 2. If no audio is playing, stop any previous (paused) audio
            if (currentAudio) {
                 currentAudio.pause();
                 currentAudio.currentTime = 0;
            }

            // 3. Get new poem details and play
            const poem = poemsData[currentPoemIndex];
            const rawAudioUrl = poem.audioUrl; // Get the raw URL with Burmese name

            if (!rawAudioUrl || rawAudioUrl.trim() === "") {
                alertUser("အသံဖိုင် လင့်ခ် ထည့်သွင်းမထားပါ/မှားယွင်းနေပါသည်။");
                return;
            }

            // Encode the filename part of the URL before fetching
            const baseUrl = rawAudioUrl.substring(0, rawAudioUrl.lastIndexOf('/') + 1);
            const fileName = rawAudioUrl.substring(rawAudioUrl.lastIndexOf('/') + 1);
            const finalAudioUrl = baseUrl + encodeURIComponent(fileName);

            currentAudio = new Audio(finalAudioUrl); // Use the encoded URL
            currentAudio.play().catch(error => {
                 alertUser("အသံဖွင့်ရာတွင် အမှားဖြစ်ပွားပါသည်။ လင့်ခ်မှန်မမှန် စစ်ဆေးပါ။ (Path: " + finalAudioUrl.substring(0, 50) + "...)"); // Show encoded path for debugging
                 console.error("Audio playback error:", error);
            });

            currentAudio.onplaying = () => {
                alertUser(`"${poem.title}" ကို ဖွင့်နေပါသည်...`);
            }
            
            currentAudio.onended = () => {
                alertUser("အသံဖွင့်ခြင်း ပြီးဆုံးပါပြီ။");
            }
        }
        
        /**
         * Displays the poem's image in the media panel with 3D-like styling.
         * @param {string} url - The image URL to display.
         */
        function displayImage(url) {
            // Clear any existing content and ensure the placeholder is hidden
            mediaDisplay.innerHTML = '';
            
            // Create a wrapper for the image for the 3D-like effect
            const wrapper = document.createElement('div');
            wrapper.className = 'w-full h-full flex items-center justify-center image-container';
            mediaDisplay.appendChild(wrapper);

            if (!url) {
                // No URL provided, show the dedicated placeholder message
                wrapper.innerHTML = `<div id="initial-placeholder" class="w-full h-full flex flex-col items-center justify-center text-gray-700 p-6">
                    <i data-lucide="monitor-play" class="w-16 h-16 mb-4 text-pink-600"></i>
                    <p class="text-xl font-bold text-center mb-2">YouTube ဗီဒီယို ကြည့်လိုပါက</p>
                    <p class="text-base text-center text-pink-700">(YouTube Icon) ကို နှိပ်ပြီး မျက်နှာစာအသစ်တွင် ဖွင့်ကြည့်ပါ။</p>
                    <p class="text-sm mt-4 text-gray-500">(လက်ရှိကဗျာ၏ ပုံရိပ်ကို မရရှိသေးပါ။)</p>
                </div>`;
                lucide.createIcons(); // Re-render icons in the placeholder
                return; // Exit
            }
        
            // URL is provided, process and display the image
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            const finalImageUrl = baseUrl + encodeURIComponent(fileName);
            
            let img = document.createElement('img');
            img.id = 'poem-image';
            img.className = 'poem-image-style w-full h-auto object-contain rounded-2xl'; // Apply 3D style class
            img.src = finalImageUrl;
            
            img.onerror = () => {
                 img.src = "https://placehold.co/800x600/bbf7d0/1e3a8a?text=Image+Not+Found";
                 console.error("Image load error for:", finalImageUrl); 
                 alertUser("ပုံရိပ်ကို ဖွင့်ရာတွင် အမှားဖြစ်ပွားပါသည်။");
            };
            
            wrapper.appendChild(img);
        }

        /**
         * Custom alert (since window.alert is disallowed).
         * @param {string} message - The message to show.
         */
        function alertUser(message) {
            // Simple visual feedback using the translation overlay as a temporary message box
            const originalText = translationOverlay.textContent;
            translationOverlay.textContent = message;
            translationOverlay.classList.remove('bg-f97316');
            translationOverlay.classList.add('bg-gray-700', 'show'); // Use a different color for system messages

            clearTimeout(window.alertTimer);
            window.alertTimer = setTimeout(() => {
                translationOverlay.classList.remove('show', 'bg-gray-700');
                translationOverlay.classList.add('bg-f97316');
                translationOverlay.textContent = originalText;
            }, 2000);
        }


        // ----------------------------------------------------
        // IV. INITIALIZATION & EVENT LISTENERS
        // ----------------------------------------------------

        const runMasterInit = () => {
            // Initialize lucide icons
            lucide.createIcons();

            // Set up event listeners for control buttons
            byId('toggle-romanization').addEventListener('click', toggleRomanization);
            
            // YouTube button now opens in a new tab
            openYoutubeButton.addEventListener('click', openYoutubeInNewTab);
            
            byId('play-audio').addEventListener('click', playAudio);

            // Navigation Listeners
            prevButton.addEventListener('click', () => navigatePoem(-1));
            nextButton.addEventListener('click', () => navigatePoem(1));
            
            // Add a resize listener to adjust font size when window changes size
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(adjustFontSize, 100); // Debounce resize
            });

            // Initial rendering
            if (poemsData.length > 0) {
                renderPoem();
            } else {
                poemContainer.innerHTML = '<p class="text-center text-red-500 font-bold">ကဗျာအချက်အလက် မရှိသေးပါ။</p>';
                mediaDisplay.innerHTML = '<p class="text-center text-red-500 font-bold">ပုံရိပ်အတွက် အချက်အလက် မရှိသေးပါ။</p>';
            }
        };

        // Lucide is loaded from a plain UMD <script> tag (this app used
        // <script src="https://unpkg.com/lucide@latest">, not the
        // lucide-react package already used elsewhere in this project) --
        // loaded once into the page (shared if another mounted app ever
        // needs it too) and only then is the rest of this app initialized.
        function ensureLucideLoaded() {
            return new Promise((resolve) => {
                if (window.lucide) { resolve(); return; }
                const existing = document.querySelector('script[data-lucide-cdn]');
                if (existing) { existing.addEventListener('load', () => resolve()); return; }
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/lucide@latest';
                script.dataset.lucideCdn = 'true';
                script.onload = () => resolve();
                document.head.appendChild(script);
            });
        }
        ensureLucideLoaded().then(runMasterInit);

    return () => {};
  }, []);

  return (
    <>
      <style>{MPOEMS_APP_CSS}</style>
      <div
        ref={containerRef}
        className="mpoems-app-root selection:bg-yellow-200"
        dangerouslySetInnerHTML={{ __html: MPOEMS_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
      <>
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
