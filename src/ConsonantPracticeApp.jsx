import React, { useEffect, useRef } from 'react';

// ── Ported from the standalone "Myanmar Consonant Practice" HTML app ──
// Same hybrid approach as DhammaschoolApp: the original vanilla JS (DOM
// manipulation, Web Audio API, onclick= handlers in the markup) is kept
// almost unchanged inside a React wrapper instead of being rewritten as
// JSX/state, since this game's UI logic is deeply tied to direct DOM
// querySelector/classList calls throughout, and re-authoring all of that
// would be a large, risky rewrite for no functional benefit.
//
// No Firebase/Firestore integration yet (per instructions — games + trophy
// wiring come in a later pass); this is purely the "mount it inline instead
// of a new tab" step for now.

const CONSONANT_APP_BODY_HTML = `
    
    <div id="floating-controls" class="p-3 rounded-2xl shadow-lg flex items-center gap-3 transition-all duration-500 ease-in-out" style="position: fixed; top: 20px; left: 20px; z-index: 1000; cursor: move; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.25);">
        <div id="pointing-hand" class="hidden">👆</div>
        
        <!-- 1. Settings -->
        <div id="consonant-count-icon" class="number-icon-3d" onclick="changeConsonantCount()">3️⃣3️⃣</div>
        
        <!-- 2. Step 1: Read Aloud -->
        <div id="toggle-read-aloud-btn" onclick="toggleReadAloud()" class="play-button-icon bg-blue-500 hover:bg-blue-600 text-white">
            <svg id="read-aloud-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        </div>

        <!-- 3. Step 2: Waga (Bubble) Game -->
        <div id="toggle-waga-btn" onclick="cycleWaga()" class="play-button-icon bg-purple-500 hover:bg-purple-600 text-white relative">
            <span id="waga-icon" class="text-xs font-bold text-center leading-tight">Ka<br>Group</span>
            <div id="waga-play-btn" onclick="event.stopPropagation(); toggleWagaGame();" class="absolute -bottom-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3L19 12 5 21z" fill="white"></path></svg>
            </div>
        </div>
        
        <!-- 4. Step 3: Matching Game -->
        <div id="toggle-matching-btn" onclick="toggleMatchingGame()" class="play-button-icon bg-orange-500 hover:bg-orange-600 text-white">
            <span class="text-lg">🧩</span>
        </div>

        <!-- 5. Step 4: Puzzle Game -->
        <div id="toggle-puzzle-btn" onclick="togglePuzzleGame()" class="play-button-icon bg-pink-500 hover:bg-pink-600 text-white">
            <span class="text-lg">⛓️</span>
        </div>

        <!-- 6. Manual: Click Game -->
        <div id="toggle-click-btn" class="play-button-icon start" onclick="toggleClickGame()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play">
                <path d="M5 3L19 12 5 21z" fill="white"/>
            </svg>
        </div>
        
        <!-- 7. Manual: Typing Game -->
        <div id="toggle-typing-btn" onclick="toggleTypingGame()" class="play-button-icon bg-green-500 hover:bg-green-600 text-white">
            <span class="text-lg">⌨️</span>
        </div>
        
    </div>

    <!-- Instruction Audio Toggle (Bottom Right) -->
    <div id="audio-toggle-btn" onclick="toggleInstructionAudio()">
        🔊
    </div>

    <div class="main-container">
        <!-- Puzzle Sequence Display -->
        <div id="puzzle-area" class="hidden text-center">
            <div id="puzzle-choices-display" class="flex justify-center flex-wrap items-center gap-2 min-h-[65px]">
                <!-- Shuffled puzzle choices will be generated here by JS -->
            </div>
            <div id="puzzle-sequence-display" class="hidden">
                <!-- Puzzle slots will be generated here by JS -->
            </div>
        </div>

        <!-- Consonant Grid Section -->
        <div id="consonant-grid-container" class="consonant-grid-container mt-6 rounded-1g p-1">
            <div class="consonant-grid">
                <div data-consonant="က" onclick="handleGridClick(this)" class="consonant-item bg-blue-100 hover:bg-blue-200">
                    <span class="text-3xl font-semibold text-blue-900">က</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ခ" onclick="handleGridClick(this)" class="consonant-item bg-green-100 hover:bg-green-200">
                    <span class="text-3xl font-semibold text-green-900">ခ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဂ" onclick="handleGridClick(this)" class="consonant-item bg-purple-100 hover:bg-purple-200">
                    <span class="text-3xl font-semibold text-purple-900">ဂ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဃ" onclick="handleGridClick(this)" class="consonant-item bg-yellow-100 hover:bg-yellow-200">
                    <span class="text-3xl font-semibold text-yellow-900">ဃ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="င" onclick="handleGridClick(this)" class="consonant-item bg-red-100 hover:bg-red-200">
                    <span class="text-3xl font-semibold text-red-900">င</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="စ" onclick="handleGridClick(this)" class="consonant-item bg-pink-100 hover:bg-pink-200">
                    <span class="text-3xl font-semibold text-pink-900">စ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဆ" onclick="handleGridClick(this)" class="consonant-item bg-indigo-100 hover:bg-indigo-200">
                    <span class="text-3xl font-semibold text-indigo-900">ဆ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဇ" onclick="handleGridClick(this)" class="consonant-item bg-teal-100 hover:bg-teal-200">
                    <span class="text-3xl font-semibold text-teal-900">ဇ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဈ" onclick="handleGridClick(this)" class="consonant-item bg-orange-100 hover:bg-orange-200">
                    <span class="text-3xl font-semibold text-orange-900">ဈ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ည" onclick="handleGridClick(this)" class="consonant-item bg-gray-200 hover:bg-gray-300">
                    <span class="text-3xl font-semibold text-gray-900">ည</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဋ" onclick="handleGridClick(this)" class="consonant-item bg-blue-100 hover:bg-blue-200">
                    <span class="text-3xl font-semibold text-blue-900">ဋ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဌ" onclick="handleGridClick(this)" class="consonant-item bg-green-100 hover:bg-green-200">
                    <span class="text-3xl font-semibold text-green-900">ဌ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဍ" onclick="handleGridClick(this)" class="consonant-item bg-purple-100 hover:bg-purple-200">
                    <span class="text-3xl font-semibold text-purple-900">ဍ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဎ" onclick="handleGridClick(this)" class="consonant-item bg-yellow-100 hover:bg-yellow-200">
                    <span class="text-3xl font-semibold text-yellow-900">ဎ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဏ" onclick="handleGridClick(this)" class="consonant-item bg-red-100 hover:bg-red-200">
                    <span class="text-3xl font-semibold text-red-900">ဏ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="တ" onclick="handleGridClick(this)" class="consonant-item bg-pink-100 hover:bg-pink-200">
                    <span class="text-3xl font-semibold text-pink-900">တ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ထ" onclick="handleGridClick(this)" class="consonant-item bg-indigo-100 hover:bg-indigo-200">
                    <span class="text-3xl font-semibold text-indigo-900">ထ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဒ" onclick="handleGridClick(this)" class="consonant-item bg-teal-100 hover:bg-teal-200">
                    <span class="text-3xl font-semibold text-teal-900">ဒ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဓ" onclick="handleGridClick(this)" class="consonant-item bg-orange-100 hover:bg-orange-200">
                    <span class="text-3xl font-semibold text-orange-900">ဓ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="န" onclick="handleGridClick(this)" class="consonant-item bg-gray-200 hover:bg-gray-300">
                    <span class="text-3xl font-semibold text-gray-900">န</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ပ" onclick="handleGridClick(this)" class="consonant-item bg-blue-100 hover:bg-blue-200">
                    <span class="text-3xl font-semibold text-blue-900">ပ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဖ" onclick="handleGridClick(this)" class="consonant-item bg-green-100 hover:bg-green-200">
                    <span class="text-3xl font-semibold text-green-900">ဖ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဗ" onclick="handleGridClick(this)" class="consonant-item bg-purple-100 hover:bg-purple-200">
                    <span class="text-3xl font-semibold text-purple-900">ဗ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဘ" onclick="handleGridClick(this)" class="consonant-item bg-yellow-100 hover:bg-yellow-200">
                    <span class="text-3xl font-semibold text-yellow-900">ဘ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="မ" onclick="handleGridClick(this)" class="consonant-item bg-red-100 hover:bg-red-200">
                    <span class="text-3xl font-semibold text-red-900">မ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ယ" onclick="handleGridClick(this)" class="consonant-item bg-pink-100 hover:bg-pink-200">
                    <span class="text-3xl font-semibold text-pink-900">ယ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ရ" onclick="handleGridClick(this)" class="consonant-item bg-indigo-100 hover:bg-indigo-200">
                    <span class="text-3xl font-semibold text-indigo-900">ရ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="လ" onclick="handleGridClick(this)" class="consonant-item bg-teal-100 hover:bg-teal-200">
                    <span class="text-3xl font-semibold text-teal-900">လ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဝ" onclick="handleGridClick(this)" class="consonant-item bg-orange-100 hover:bg-orange-200">
                    <span class="text-3xl font-semibold text-orange-900">ဝ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="သ" onclick="handleGridClick(this)" class="consonant-item bg-gray-200 hover:bg-gray-300">
                    <span class="text-3xl font-semibold text-gray-900">သ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="" onclick="handleGridClick(this)" class="consonant-item inactive">
                    <span class="text-3xl font-semibold text-gray-100"></span>
                </div>
                <div data-consonant="ဟ" onclick="handleGridClick(this)" class="consonant-item bg-green-100 hover:bg-green-200">
                    <span class="text-3xl font-semibold text-green-900">ဟ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="ဠ" onclick="handleGridClick(this)" class="consonant-item bg-purple-100 hover:bg-purple-200">
                    <span class="text-3xl font-semibold text-purple-900">ဠ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="အ" onclick="handleGridClick(this)" class="consonant-item bg-yellow-100 hover:bg-yellow-200">
                    <span class="text-3xl font-semibold text-yellow-900">အ</span>
                    <span class="waga-counter" style="display: none;">0</span>
                </div>
                <div data-consonant="" onclick="handleGridClick(this)" class="consonant-item inactive">
                    <span class="text-3xl font-semibold text-gray-100"></span>
                </div>
            </div>
        </div>
        
        <!-- Chat Box Section (Typing Study & Game) -->
        <div id="chat-container" class="chat-container mt-1">
            <div class="input-area flex-col sm:flex-row">
                <div class="flex items-center gap-1 mt-1 sm:mt-0 w-full">
                    <input id="chat-input" type="text" placeholder="Type here..." class="input-field focus:outline-none focus:ring-2 focus:ring-green-500 w-full"/>
                    
                </div>
            </div>
            <div id="chat-display" class="chat-display rounded-t-xl">
                <div class="message-bubble bg-gray-200">
                    <p class="text-gray-800">
                        Click ⌨️ to start game or type a consonant and press Enter to listen.
                    </p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bubble Game Container -->
    <div id="bubble-game-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; display: none; z-index: 50;"></div>

    <!-- Score Display Overlay -->
    <div id="score-display"></div>

    <!-- Dog Animation Container -->
    <div id="dog-animation-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 9998;"></div>

    <!-- Bird Animation Container -->
    <div id="bird-animation-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 9997;"></div>

    <!-- Gift Box Reward Container -->
    <div id="gift-box-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; z-index: 9999; background: rgba(0,0,0,0.2);"></div>

    <!-- Answer Hint Pointer -->
    <div id="hint-pointer" style="position: absolute; font-size: 2.5rem; z-index: 1002; pointer-events: none; transition: opacity 0.3s, top 0.3s, left 0.3s; opacity: 0; visibility: hidden;">👇</div>

`;

const CONSONANT_APP_CSS = `
        /* Scoped to .consonant-app-root (this app's own container) instead of
           the bare "body" tag — this file gets injected into a page shared
           with TutoringApp/SmartStudy/AbhidhammaApp/MyanmarReader/
           Dhammaschool, and an unscoped body rule would otherwise leak into
           all of them (fixed page background/centering/overflow behavior). */
        .consonant-app-root {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 1rem;
            position: relative;
            /* Changed to auto to allow scrolling for bottom rows */
            overflow-y: auto; 
            overflow-x: hidden;
        }
        .main-container {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            /* Ensure container is above bubbles if needed, but usually bubbles are effectively modal-like */
            position: relative;
            z-index: 10; 
            margin-bottom: 80px; /* Add space at bottom so A-Waga isn't cut off */
        }
        .consonant-grid-container {
            overflow-y: visible; /* Allow content to flow naturally */
            max-height: none;
            transition: max-height 0.3s ease-in-out, display 0.3s;
        }
        /* Only use scroll if strictly constrained by parent, but here we let body scroll */
        .consonant-grid-container.conditionally-scrollable {
            /* Keep this logic for typing mode focus if needed, or remove to simplify */
        }

        .consonant-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.75rem;
        }
        .consonant-item {
            cursor: pointer;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, background-color 0.3s, box-shadow 0.3s, border 0.3s, opacity 0.3s;
            position: relative;
            overflow: hidden;
            border: 3px solid transparent;
        }
        .consonant-item:hover {
            transform: scale(1.05);
        }
        .consonant-item.inactive {
            cursor: not-allowed;
            background-color: #f3f4f6 !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .consonant-item.highlight {
            background-color: #fcd34d !important; /* Yellow 400 */
            box-shadow: 0 4px 6px rgba(252, 211, 77, 0.5);
        }
        .consonant-item.choice {
            border-color: #f59e0b; /* Amber 500 */
            transform: scale(1.05);
        }
        .puzzle-choice-item {
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            background-color: #f3e8ff; /* Purple 100 */
            border: 2px solid #d8b4fe; /* Purple 300 */
            font-size: 1.75rem;
            font-weight: 600;
            color: #6b21a8; /* Purple 800 */
            width: 55px;
            height: 55px;
        }
        .puzzle-choice-item:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .puzzle-choice-item.used {
            opacity: 0.3;
            transform: scale(0.9);
            cursor: not-allowed;
            background-color: #e5e7eb;
            border-color: #9ca3af;
        }
        .puzzle-slot {
            width: 60px;
            height: 60px;
            background-color: white;
            border-radius: 8px;
            border: 2px dashed #9ca3af;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 2rem;
            font-weight: bold;
            color: #374151;
            transition: all 0.3s ease;
        }
        .puzzle-slot.filled {
            background-color: #a7f3d0; /* Emerald 200 */
            border-style: solid;
            border-color: #10b981; /* Emerald 500 */
            transform: scale(1.1);
        }
        .consonant-item.puzzle-hidden {
            opacity: 0;
            pointer-events: none;
            background-color: #e5e7eb !important;
            box-shadow: inset 2px 2px 4px #d1d5db, inset -2px -2px 4px #ffffff;
            transform: none;
        }
        .consonant-grid-container.puzzle-active .consonant-item.revealed {
            opacity: 1 !important;
            transform: scale(1.1) !important;
            transition: opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Pulse animation for visual feedback */
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0px rgba(74, 222, 128, 0.7); }
            50% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0.3); }
            100% { box-shadow: 0 0 0 0px rgba(74, 222, 128, 0); }
        }
        .active-pulse {
            animation: pulse-glow 0.5s ease-out;
        }

        .chat-container {
            height: 30vh;
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.7);
        }
        .chat-display {
            flex-grow: 1;
            padding: 1rem;
            overflow-y: auto;
            border-bottom: 1px solid #e5e7eb;
        }
        .message-bubble {
            background-color: #d1fae5;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            max-width: 80%;
            margin-bottom: 0.5rem;
        }
        .input-area {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
        }
        .input-field {
            flex-grow: 1;
            padding: 0.75rem;
            border-radius: 9999px;
            border: 1px solid #d1d5db;
        }
        .send-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 9999px;
            background-color: #10b981;
            color: white;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .send-btn:hover {
            background-color: #059669;
        }
        .number-icon-3d {
            width: 48px;
            height: 48px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(145deg, #e6e6e6, #ffffff);
            border-radius: 12px;
            box-shadow: 6px 6px 12px #d1d1d1, -6px -6px 12px #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            color: #4a4a4a;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            user-select: none;
        }
        .number-icon-3d:active {
            box-shadow: inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff;
            transform: scale(0.98);
        }
        .play-button-icon {
            width: 48px;
            height: 48px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-size: 2rem;
            transition: transform 0.2s, background-color 0.2s;
            cursor: pointer;
            user-select: none;
        }
        .play-button-icon:active {
            transform: scale(0.95);
        }
        .play-button-icon.start {
            background-color: #22c55e;
            color: white;
        }
        .play-button-icon.stop {
            background-color: #ef4444;
            color: white;
        }
        #score-display {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 1.5rem 3rem;
            border-radius: 12px;
            font-size: 2rem;
            font-weight: bold;
            text-align: center;
            z-index: 100;
            display: none;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        }
        /* New Waga Game Styles */
        .waga-counter {
            position: absolute;
            top: 2px;
            right: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            background-color: #ef4444;
            color: white;
            border-radius: 9999px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .bubble {
            position: absolute;
            bottom: -100px;
            background-color: rgba(255, 255, 255, 0.7);
            border: 2px solid rgba(139, 92, 246, 0.5); /* Purple */
            color: #4c51bf; /* Indigo */
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 1.5rem;
            cursor: pointer;
            user-select: none;
            animation: float-up 10s linear;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            backdrop-filter: blur(5px);
            transition: all 0.3s ease-out;
            z-index: 50; /* Ensure high z-index but clickable */
        }
        @keyframes float-up {
            from { bottom: -100px; }
            to { bottom: 110vh; }
        }
        .bubble.pop {
            animation: pop 0.3s ease-out forwards;
        }
        @keyframes pop {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        .bubble.fall {
            animation: fall-down 1.5s ease-in forwards;
            pointer-events: none;
        }
        @keyframes fall-down {
            from { transform: translateY(0) rotate(0deg); opacity: 1; }
            to { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .flying-bird {
            position: fixed;
            font-size: 2.5rem;
            will-change: transform;
            pointer-events: none;
            z-index: 9997;
        }
        .dog-runner {
            position: absolute;
            font-size: 8rem;
            will-change: transform;
        }
        @keyframes run-across-ltr {
            from { transform: translateX(-10vw) scaleX(-1); }
            to { transform: translateX(110vw) scaleX(-1); }
        }
        @keyframes run-across-rtl {
            from { transform: translateX(110vw); }
            to { transform: translateX(-10vw); }
        }
        .gift-box {
            font-size: 15vw;
            animation: drop-gift 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes drop-gift {
            0% { transform: translateY(-100vh) scale(0.3) rotate(-90deg); }
            70% { transform: translateY(0) scale(1.1) rotate(10deg); }
            90% { transform: scale(0.95) rotate(-5deg); }
            100% { transform: translateY(0) scale(1) rotate(0deg); }
        }
        .consonant-item.dimmed {
            opacity: 0.35;
            pointer-events: none;
        }
        .consonant-item.dimmed:hover {
            transform: none;
        }
        #pointing-hand {
            position: absolute;
            left: 15px; /* Center it above the icon */
            top: 60px;  /* Position it below the controls */
            font-size: 2.5rem;
            animation: point-up-bounce 1.5s ease-in-out infinite;
            opacity: 1;
            transition: opacity 0.5s ease-out, left 0.5s ease-in-out, top 0.5s ease-in-out, transform 0.5s ease-in-out;
            pointer-events: none;
            z-index: 1001;
        }

        @keyframes point-up-bounce {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(8px) rotate(0); }
        }
        
        #pointing-hand.pointing-up {
             animation: point-up-bounce 1.5s ease-in-out infinite;
             transform: rotate(180deg);
        }
        
         @keyframes point-up-bounce-from-below {
            0%, 100% { transform: translateY(0) rotate(180deg); }
            50% { transform: translateY(-8px) rotate(180deg); }
        }

        #pointing-hand.hidden {
            opacity: 0;
        }
        #hint-pointer {
            position: absolute;
            font-size: 2.5rem;
            z-index: 1002;
            pointer-events: none;
            transition: opacity 0.3s, top 0.3s, left 0.3s;
            opacity: 0;
            visibility: hidden;
        }
        #hint-pointer.visible {
            opacity: 1;
            visibility: visible;
        }

        /* Styling for the new Audio Toggle Button */
        #audio-toggle-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: white;
            border-radius: 50%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            z-index: 1000;
            transition: transform 0.2s, background-color 0.2s;
            font-size: 1.5rem;
            border: 1px solid #e5e7eb;
        }
        #audio-toggle-btn:hover {
            background-color: #f3f4f6;
            transform: scale(1.1);
        }
        #audio-toggle-btn:active {
            transform: scale(0.9);
        }
        #audio-toggle-btn.muted {
            background-color: #fee2e2; /* Red 100 */
            color: #ef4444;
            border-color: #fca5a5;
        }
`;

export default function ConsonantPracticeApp({ entryRequest, onExit }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Dev-mode double-invoke / re-mount guard — this whole script wires up
    // onclick handlers, Web Audio contexts, and DOM state; it's meant to run
    // exactly once per mount, not be torn down and redone.
    if (initializedRef.current) return;
    initializedRef.current = true;
    const rootEl = containerRef.current;

        // --- CONSONANT AUDIO ---
        let audioContext;
        let audioBuffer;
        let isAudioContextReady = false;

        // --- INSTRUCTION AUDIO ---
        let instructionAudioContext;
        let instructionAudioBuffer;
        let isInstructionAudioReady = false;
        let isIntroAudioFinished = false;
        let activeInstructionSources = [];
        let isInstructionAudioEnabled = true; // New Flag

        const allConsonantsInOrder = ['က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'ဋ', 'ဌ', 'ဍ', 'ဎ', 'ဏ', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'ဠ', 'အ'];
        const consonantTimings = {};
        allConsonantsInOrder.forEach((char, index) => {
            consonantTimings[char] = { start: index * 2, duration: 2 };
        });
        
        const instructionTimings = {
            1: { start: 0, duration: 5.5 }, 2: { start: 6, duration: 4.5 },
            3: { start: 11, duration: 4.5 }, 4: { start: 16, duration: 5.5 },
            5: { start: 22, duration: 3.5 }, 6: { start: 26, duration: 2.5 },
            7: { start: 29, duration: 5.5 }, 8: { start: 35, duration: 1.8 },
            9: { start: 37, duration: 2.5 }, 10: { start: 40, duration: 1.8 },
            11: { start: 42, duration: 1.8 }, 12: { start: 44, duration: 1.8 },
            13: { start: 46, duration: 1.8 }, 14: { start: 48, duration: 2.5 },
            15: { start: 51, duration: 0.8 }, 16: { start: 52, duration: 1.5 },
            17: { start: 54, duration: 1.5 }, 18: { start: 56, duration: 1.8 },
            19: { start: 58, duration: 1.8 }, 20: { start: 60, duration: 4.0 },
            21: { start: 63, duration: 3 }, 22: { start: 66, duration: 4 },
            23: { start: 70, duration: 2 }, 24: { start: 72, duration: 3 },
            25: { start: 75, duration: 2 }, 26: { start: 77, duration: 2 },
            27: { start: 79, duration: 3 }, 28: { start: 82, duration: 2 },
            29: { start: 84, duration: 3 }, 30: { start: 87, duration: 3 },
            31: { start: 90, duration: 3 }, 32: { start: 93, duration: 3 },
            33: { start: 96, duration: 3 }, 34: { start: 99, duration: 4 },
            35: { start: 103, duration: 2 }, 36: { start: 105, duration: 2 },
            37: { start: 107, duration: 2 }, 38: { start: 109, duration: 2 },
            39: { start: 111, duration: 3 }, 40: { start: 114, duration: 3 },
            41: { start: 117, duration: 2 }, 42: { start: 119, duration: 2 },
            43: { start: 121, duration: 2 }, 44: { start: 123, duration: 4 },
            45: { start: 127, duration: 2 }, 46: { start: 129, duration: 2 },
            47: { start: 131, duration: 2 }, 48: { start: 133, duration: 2 },
            49: { start: 135, duration: 2 }, 50: { start: 137, duration: 2 },
            51: { start: 139, duration: 2 }, 52: { start: 141, duration: 2 },
            53: { start: 143, duration: 2 }, 54: { start: 145, duration: 6 },
            55: { start: 151, duration: 5 }
        };

        async function initInstructionAudio() {
            if (isInstructionAudioReady || instructionAudioContext) return;
            try {
                instructionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                const response = await fetch('https://raw.githubusercontent.com/nathantun93/bell/main/စကားပြော1.mp3');
                const arrayBuffer = await response.arrayBuffer();
                await new Promise((resolve, reject) => instructionAudioContext.decodeAudioData(arrayBuffer, resolve, reject))
                    .then(buffer => {
                        instructionAudioBuffer = buffer;
                        isInstructionAudioReady = true;
                    });
            } catch (e) { console.error("Failed to initialize instruction audio:", e); }
        }

        async function initConsonantAudio() {
            if (isAudioContextReady || audioContext) return;
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const response = await fetch('https://raw.githubusercontent.com/nathantun93/bell/main/ဗျည်းနာမည်_2s.mp3');
                const arrayBuffer = await response.arrayBuffer();
                await new Promise((resolve, reject) => audioContext.decodeAudioData(arrayBuffer, resolve, reject))
                    .then(buffer => {
                        audioBuffer = buffer;
                        isAudioContextReady = true;
                    });
            } catch (e) {
                console.error("Failed to initialize Web Audio API:", e);
            }
        }
        
        function stopAllInstructionAudio() {
            activeInstructionSources.forEach(source => {
                try { source.stop(0); } catch (e) { /* Source might have already stopped */ }
            });
            activeInstructionSources = [];
        }

        function toggleInstructionAudio() {
            isInstructionAudioEnabled = !isInstructionAudioEnabled;
            const btn = document.getElementById('audio-toggle-btn');
            
            if (isInstructionAudioEnabled) {
                btn.innerText = '🔊';
                btn.classList.remove('muted');
            } else {
                btn.innerText = '🔇';
                btn.classList.add('muted');
                stopAllInstructionAudio();
            }
        }
        
        async function playInstructionAudio(clipNumber) {
            // Check if audio is enabled (unless it's clip #1 Intro, which we might want to force or not, let's respect toggle)
            if (!isInstructionAudioEnabled) return;

            if (clipNumber !== 1 && !isIntroAudioFinished) {
                console.log("Intro audio (#1) must play first.");
                return; 
            }
            if (!isInstructionAudioReady) await initInstructionAudio();
            if (!isInstructionAudioReady || !instructionAudioContext || !instructionAudioBuffer) { console.error("Instruction audio not ready."); return; }
            if (instructionAudioContext.state === 'suspended') await instructionAudioContext.resume();
            
            const timing = instructionTimings[clipNumber];
            if (!timing) { console.warn(`No instruction audio for clip ${clipNumber}`); return; }

            return new Promise(resolve => {
                const source = instructionAudioContext.createBufferSource();
                source.buffer = instructionAudioBuffer;
                source.connect(instructionAudioContext.destination);

                activeInstructionSources.push(source);

                source.onended = () => {
                    activeInstructionSources = activeInstructionSources.filter(s => s !== source);
                    resolve();
                };
                source.start(0, timing.start, timing.duration);
            });
        }
        
        // Fireworks/Confetti effect for correct answers
        function launchConfetti() {
            const confettiContainer = document.body;
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.left = `${Math.random() * 100}vw`;
                confetti.style.top = `-20px`;
                confetti.style.width = `${Math.random() * 10 + 5}px`;
                confetti.style.height = confetti.style.width;
                confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
                confetti.style.opacity = '1';
                confetti.style.zIndex = '9999';
                confetti.style.pointerEvents = 'none';
                confetti.style.borderRadius = '50%';
                
                const animation = confetti.animate([
                    { transform: `translateY(0) translateX(0) rotate(0deg)`, opacity: 1 },
                    { transform: `translateY(110vh) translateX(${Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
                ], {
                    duration: Math.random() * 2000 + 3000,
                    easing: 'ease-out',
                });
                
                animation.onfinish = () => confetti.remove();
                confettiContainer.appendChild(confetti);
            }
        }

        function showDogAnimation() {
            const dogAnimationContainer = document.getElementById('dog-animation-container');
            dogAnimationContainer.innerHTML = ''; // Clear previous dogs
            const numDogs = Math.floor(Math.random() * 5) + 1; // Random number from 1 to 5
            for(let i=0; i < numDogs; i++) {
                const dog = document.createElement('div');
                dog.innerText = '🐕';
                dog.className = 'dog-runner';
                dog.style.top = `${Math.random() * 90}%`;
                const duration = Math.random() * 3 + 5; // 5-8 seconds
                const delay = Math.random() * 1;
                dog.style.animationDuration = `${duration}s`;
                dog.style.animationDelay = `${delay}s`;

                if (Math.random() > 0.5) {
                    dog.style.animationName = 'run-across-ltr';
                    dog.style.transform = 'scaleX(-1)'; // Flip the dog
                } else {
                    dog.style.animationName = 'run-across-rtl';
                }

                dogAnimationContainer.appendChild(dog);
                setTimeout(() => dog.remove(), (duration + delay) * 1000);
            }
        }
        
        const feedbackAudio = {
            'correct': 'https://raw.githubusercontent.com/nathantun93/bell/main/happypuppy.mp3',
            'wrong': 'https://raw.githubusercontent.com/nathantun93/bell/main/error.mp3'
        };

        const feedbackAudioWaga = {
            'correct': 'https://raw.githubusercontent.com/nathantun93/bell/main/happy.mp3',
            'wrong': 'https://raw.githubusercontent.com/nathantun93/bell/main/pick.mp3'
        };

        // --- DOM Elements ---
        const consonantGridContainer = document.getElementById('consonant-grid-container');
        const chatContainer = document.getElementById('chat-container');
        const chatInput = document.getElementById('chat-input');
        const chatDisplay = document.getElementById('chat-display');
        const toggleTypingBtn = document.getElementById('toggle-typing-btn');
        const toggleClickBtn = document.getElementById('toggle-click-btn');
        const toggleMatchingBtn = document.getElementById('toggle-matching-btn');
        const togglePuzzleBtn = document.getElementById('toggle-puzzle-btn');
        const consonantCountIcon = document.getElementById('consonant-count-icon');
        const scoreDisplay = document.getElementById('score-display');
        const floatingControls = document.getElementById('floating-controls');
        const bubbleGameContainer = document.getElementById('bubble-game-container');
        const wagaIcon = document.getElementById('waga-icon');
        const wagaPlayBtn = document.getElementById('waga-play-btn');
        const toggleReadAloudBtn = document.getElementById('toggle-read-aloud-btn');
        const readAloudIcon = document.getElementById('read-aloud-icon');
        const puzzleArea = document.getElementById('puzzle-area');
        const puzzleChoicesDisplay = document.getElementById('puzzle-choices-display');
        const puzzleSequenceDisplay = document.getElementById('puzzle-sequence-display');
        const giftBoxContainer = document.getElementById('gift-box-container');
        const pointingHand = document.getElementById('pointing-hand');
        const hintPointer = document.getElementById('hint-pointer');

        // --- Game State Variables ---
        let currentGameMode = null;
        let correctAnswer = null;
        let correctCount = 0;
        let userClickSequence = '';
        let consonantsToAsk = 1;
        let audioTimer = null;
        let isReadingAloud = false;
        let matchingChoices = [];
        let puzzleSequence = [];
        let puzzleUserProgress = [];
        let consecutiveWrongAnswers = 0;
        let isMatchingQuestionAnswered = false;

        // --- New Auto Flow Variables ---
        let isAutoFlow = false;
        let puzzleRoundsWon = 0;
        const TARGET_MATCHING_SCORE = 20;
        const TARGET_PUZZLE_ROUNDS = 3;
        const READ_ALOUD_REPEATS = 3;

        const consonantCountOptions = [5, 10, 15, 20, 25, 30, 33];
        const consonantCountEmojis = ['5️⃣', '🔟', '1️⃣5️⃣', '2️⃣0️⃣', '2️⃣5️⃣', '3️⃣0️⃣', '3️⃣3️⃣'];
        let currentConsonantCountIndex = 6;

        // --- Tutorial State ---
        let tutorialStep = 0;
        const tutorialTargets = [
            'consonant-count-icon', 'toggle-read-aloud-btn', 'toggle-waga-btn',
            'toggle-matching-btn', 'toggle-puzzle-btn', 'toggle-click-btn', 'toggle-typing-btn'
        ];
        const tutorialAudioClips = [2, 14, 8, 5, 6, 3, 4];

        // --- Controls Repositioning Logic ---
        let controlsPositionIndex = 0;
        const controlPositions = [
            { top: '20px', left: '20px', right: 'auto', bottom: 'auto' }, // Top-left
            { top: '20px', right: '20px', left: 'auto', bottom: 'auto' }, // Top-right
            { bottom: '20px', left: '20px', top: 'auto', right: 'auto' }, // Bottom-left
            { bottom: '20px', right: '20px', left: 'auto', top: 'auto' }  // Bottom-right
        ];

        function applyControlsPosition(index) {
            const pos = controlPositions[index];
            floatingControls.style.top = pos.top;
            floatingControls.style.left = pos.left;
            floatingControls.style.right = pos.right;
            floatingControls.style.bottom = pos.bottom;
        }

        // Generalized overlap check for all modes
        function checkControlsOverlapAndReposition() {
            let targetElements = [];

            if (currentGameMode === 'puzzle') {
                const nextCorrectChar = puzzleSequence[puzzleUserProgress.length];
                if (nextCorrectChar) {
                    const el = document.querySelector(`.puzzle-choice-item[data-consonant='${nextCorrectChar}']:not(.used)`);
                    if(el) targetElements.push(el);
                }
            } else if (currentGameMode === 'waga') {
                // For Waga, we want to avoid the active group
                const activeGroup = wagaConsonants[currentWagaIndex].chars;
                activeGroup.forEach(char => {
                     const el = document.querySelector(`.consonant-item[data-consonant='${char}']`);
                     if(el) targetElements.push(el);
                });
            } else if (currentGameMode === 'matching') {
                matchingChoices.forEach(char => {
                    const el = document.querySelector(`.consonant-item[data-consonant='${char}']`);
                    if(el) targetElements.push(el);
                });
            } else if (isReadingAloud) {
                // For Read Aloud, try to avoid the character being highlighted if possible,
                // but since it moves fast, maybe just avoid the first few rows?
                // Let's make it avoid the currently highlighted one if any
                const el = document.querySelector('.consonant-item.highlight');
                if(el) targetElements.push(el);
            }

            if (targetElements.length === 0) return;

            const checkOverlap = () => {
                const controlsRect = floatingControls.getBoundingClientRect();
                
                for (let el of targetElements) {
                    const targetRect = el.getBoundingClientRect();
                    // Check intersection
                    if (!(controlsRect.right < targetRect.left || 
                          controlsRect.left > targetRect.right || 
                          controlsRect.bottom < targetRect.top || 
                          controlsRect.top > targetRect.bottom)) {
                        return true; // Overlap detected
                    }
                }
                return false;
            };

            let attempts = 0;
            // Keep moving the controls until there is no overlap or we've tried all positions
            while (checkOverlap() && attempts < controlPositions.length) {
                controlsPositionIndex = (controlsPositionIndex + 1) % controlPositions.length;
                applyControlsPosition(controlsPositionIndex);
                attempts++;
            }
        }

        // --- Waga Game Variables ---
        const wagaConsonants = [
            { name: 'Ka Group', chars: ['က', 'ခ', 'ဂ', 'ဃ', 'င'] },
            { name: 'Sa Group', chars: ['စ', 'ဆ', 'ဇ', 'ဈ', 'ည'] },
            { name: 'Tta Group', chars: ['ဋ', 'ဌ', 'ဍ', 'ဎ', 'ဏ'] },
            { name: 'Ta Group', chars: ['တ', 'ထ', 'ဒ', 'ဓ', 'န'] },
            { name: 'Pa Group', chars: ['ပ', 'ဖ', 'ဗ', 'ဘ', 'မ'] },
            { name: 'A Group', chars: ['ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'ဠ', 'အ'] }
        ];
        const consonantVariations = {
            'က': ['က', 'ကာ', 'ကား', 'ကိ', 'ကီ', 'ကီး', 'ကု', 'ကူ', 'ကူး', 'ကေ', 'ကေ့', 'ကေး',  'ကဲ', 'ကဲ့', 'ကယ်', 'ကော', 'ကော့', 'ကော်', 'ကံ', 'ကံ့', 'ကို', 'ကို့', 'ကိုး', 'ကက်', 'ကောက်', 'ကိုက်', 'ကိမ်', 'ကုန်', 'ကွန်', 'ကင်', 'ကောင်', 'ကိုင်', 'ကစ်', 'ကပ်', 'ကိတ်', 'ကုတ်', 'ကွတ်'],
            'ခ': ['ခ', 'ခါ', 'ခါး', 'ခိ', 'ခီ', 'ခီး', 'ခု', 'ခူ', 'ခူး', 'ခေ', 'ခေ့', 'ခေး',  'ခဲ', 'ခဲ့', 'ခြယ်', 'ခေါ', 'ခေါ့', 'ခေါ်', 'ခံ', 'ခံ့', 'ခို', 'ခို့', 'ခိုး', 'ခက်', 'ခေါက်', 'ခိုက်', 'ခိမ်', 'ကုန်', 'ခွန်', 'ခင်', 'ခေါင်', 'ခိုင်', 'ခစ်', 'ခပ်', 'ခိတ်', 'ခုတ်', 'ခွတ်'],
            'ဂ': ['ဂ', 'ဂါ', 'ဂါး', 'ဂိ', 'ဂီ', 'ဂီး', 'ဂု', 'ဂူ', 'ဂူး', 'ဂေ', 'ဂေ့', 'ဂေး',  'ဂဲ', 'ဂဲ့', 'ဂယ်', 'ဂေါ', 'ဂေါ့', 'ဂေါ်', 'ဂံ', 'ဂံ့', 'ဂို', 'ဂို့', 'ဂိုး', 'ဂက်', 'ဂေါက်', 'ဂိုက်', 'ဂိမ်', 'ဂုန်', 'ဂွန်', 'ဂင်', 'ဂေါင်', 'ဂိုင်', 'ဂစ်', 'ဂပ်', 'ဂိတ်', 'ဂုတ်', 'ဂွတ်'],
            'ဃ': ['ဃ', 'ဃာ', 'ဃော'],
            'င': ['င', 'ငါ', 'ငါး', 'ငိ', 'ငီ', 'ငီး', 'ငု', 'ငူ', 'ငူး', 'ငေ', 'ငေ့', 'ငေး',  'ငဲ', 'ငဲ့', 'ငယ့်', 'ငေါ', 'ငေါ့', 'ငေါ်', 'ငံ', 'ငံ့', 'ငို', 'ငို့', 'ငိုး', 'ငက်', 'ငေါက်', 'ငိုက်', 'ငိမ်', 'ငုန်', 'ငွန်', 'ငင်', 'ငေါင်', 'ငိုင်', 'ငစ်', 'ငပ်', 'ငိတ်', 'ငုတ်', 'ငွတ်'],
            'စ': ['စ', 'စာ', 'စား', 'စိ', 'စီ', 'စီး', 'စု', 'ဆူ', 'စူး', 'စေ', 'စေ့', 'စေး',  'စဲ', 'စဲ့', 'စယ်', 'စော', 'စော့', 'စော်', 'စံ', 'စံ့', 'စို', 'စို့', 'စိုး', 'စက်', 'စောက်', 'စိုက်', 'စိမ်', 'စုန်', 'စွန်', 'စင်', 'စောင်', 'ဆိုင်', 'စစ်', 'စပ်', 'စိပ်', 'စုတ်', 'စွပ်'],
            'ဆ': ['ဆ', 'ဆာ', 'ဆား', 'ဆိ', 'ဆီ', 'ဆီး', 'ဆု', 'ဆူ', 'ဆူး', 'ဆေ', 'ဆေ့', 'ဆေး',  'ဆဲ', 'ဆဲ့', 'ဆယ်', 'ဆော', 'ဆော့', 'ဆော်', 'ဆံ', 'ဆံ့', 'ဆို', 'ဆို့', 'ဆိုး', 'ဆက်', 'ဆောက်', 'ဆိုက်', 'ဆိမ်', 'ဆုန်', 'ဆွန်', 'ဆင်', 'ဆောင့်', 'ဆိုင်', 'ဆစ်', 'ဆပ်', 'ဆိတ်', 'ဆုတ်', 'ဆွတ်'],
            'ဇ': ['ဇ', 'ဇာ', 'ဇိ', 'ဇီ', 'ဇီး', 'ဇု', 'ဇူ', 'ဇူး', 'ဇေ', 'ဇေ့', 'ဇေး', 'ဇော', 'ဇော်', 'ဇို', 'ဇက်', 'ဇင်', 'ဇစ်'],
            'ဈ': ['ဈ', 'ဈာ', 'ဈာန်'],
            'ည': ['ည', 'ညာ', 'ညိ', 'ညီ', 'ညီး', 'ညု', 'ညူ', 'ညူး', 'ညေ', 'ညေ့', 'ညေး',  'ညဲ', 'ညဲ့', 'ညယ်', 'ညော', 'ညော့', 'ညော်', 'ညံ', 'ညံ့', 'ညို', 'ညို့', 'ညိုး', 'ညက်', 'ညောက်', 'ညိုက်', 'ညိမ်', 'ညုန်', 'ညွန်', 'ညင်', 'ညောင်', 'ညိုင်', 'ညစ်', 'ညပ်', 'ညိတ်', 'ညုတ်', 'ညွတ်'],
            'ဋ': ['ဋ', 'ဋီ', 'ဋ'],
            'ဌ': ['ဌ', 'ဌာ', 'ဌာန်'],
            'ဍ': ['ဍ', 'ဍု'],
            'ဎ': ['ဎ', 'ဎီ'],
            'ဏ': ['ဏ', 'ဏီ'],
            'တ': ['တ', 'တာ', 'တား', 'တိ', 'တီ', 'တီး', 'တု', 'တူ', 'တူး', 'တေ', 'တေ့', 'တေး',  'တဲ', 'တဲ့', 'တယ်', 'တော', 'တော့', 'တော်', 'တံ', 'တံ့', 'တို', 'တို့', 'တိုး', 'တတ်', 'တောက်', 'တိုက်', 'တိမ်', 'တုန်', 'တွန်', 'တင်', 'တောင်', 'တိုင်', 'တစ်', 'တပ်', 'တိတ်', 'တုတ်', 'တွတ်'],
            'ထ': ['ထ', 'ထာ', 'ထား', 'ထိ', 'ထီ', 'ထီး', 'ထု', 'ထူ', 'ထူး', 'ထေ', 'ထေ့', 'ထေး',  'ထဲ', 'ထဲ့', 'ထယ်', 'ထော', 'ထော့', 'ထော်', 'ထံ', 'ထံ့', 'ထို', 'ထို့', 'ထိုး', 'ထက်', 'ထောက်', 'ထိုက်', 'ထိမ်', 'ထုန်', 'ထွန်', 'ထင်', 'ထောင်', 'ထိုင်', 'ထစ်', 'ထပ်', 'ထိပ်', 'ထုတ်', 'ထွတ်'],
            'ဒ': ['ဒ', 'ဒါ', 'ဒါး', 'ဒိ', 'ဒီ', 'ဒီး', 'ဒု', 'ဒူ', 'ဒူး', 'ဒေ', 'ဒေ့', 'ဒေး',  'ဒဲ', 'ဒဲ့', 'ဒယ်', 'ဒေါ', 'ဒေါ့', 'ဒေါ်', 'ဒံ', 'ဒံ့', 'ဒို', 'ဒို့', 'ဒိုး', 'ဒက်', 'ဒေါက်', 'ဒိုက်', 'ဒိမ်', 'ဒုန်', 'ဒွန်', 'ဒင်', 'ဒေါင်', 'ဒိုင်', 'ဒစ်', 'ဒပ်', 'ဒိတ်', 'ဒုတ်', 'ဒွတ်'],
            'ဓ': ['ဓ', 'ဓာ', 'ဓိ', 'ဓါး'],
            'န': ['န', 'နာ', 'နား', 'နိ', 'နီ', 'နီး', 'နု', 'နူ', 'နူး', 'နေ', 'နေ့', 'နေး',  'နဲ', 'နဲ့', 'နယ်', 'နော', 'နော့', 'နော်', 'နံ', 'နံ့', 'နို', 'နို့', 'နိုး', 'နက်', 'နောက်', 'နိုက်', 'နိမ်', 'နုန်', 'နွန်', 'နင်', 'နောင်', 'နိုင်', 'နစ်', 'နပ်', 'နိတ်', 'နုတ်', 'နွတ်'],
            'ပ': ['ပ', 'ပါ', 'ပါး', 'ပိ', 'ပီ', 'ပီး', 'ပု', 'ပူ', 'ပူး', 'ပေ', 'ပေး', 'ပေ့',  'ပဲ', 'ပဲ့', 'ပယ်', 'ပေါ', 'ပေါ့', 'ပေါ်', 'ပံ', 'ပံ့', 'ပို', 'ပို့', 'ပိုး', 'ပတ်', 'ပေါက်', 'ပိုက်', 'ပိမ်', 'ပုန်', 'ပွန်', 'ပင်', 'ပေါင်း', 'ပိုင်', 'ပစ်', 'ပပ်', 'ပိတ်', 'ပုတ်', 'ပွတ်'],
            'ဖ': ['ဖ', 'ဖာ', 'ဖား', 'ဖိ', 'ဖီ', 'ဖီး', 'ဖု', 'ဖူ', 'ဖူး', 'ဖေ', 'ဖေ့', 'ဖေး',  'ဖဲ', 'ဖဲ့', 'ဖယ်', 'ဖော', 'ဖော့', 'ဖော်', 'ဖံ', 'ဖံ့', 'ဖို', 'ဖို့', 'ဖိုး', 'ဖက်', 'ဖောက်', 'ဖိုက်', 'ဖိမ်', 'ဖုန်', 'ဖွန်', 'ဖင်', 'ဖောင်', 'ဖိုင်', 'ဖစ်', 'ဖပ်', 'ဖိတ်', 'ဖုတ်', 'ဖွတ်'],
            'ဗ': ['ဗ', 'ဗာ', 'ဗိ', 'ဗီ', 'ဗီး', 'ဗု', 'ဗူ', 'ဗူး', 'ဗေ', 'ဗေ့', 'ဗေး',  'ဗဲ', 'ဗဲ့', 'ဗယ်', 'ဗော', 'ဗော့', 'ဗော်', 'ဗံ', 'ဗံ့', 'ဗို', 'ဗို့', 'ဗိုး', 'ဗက်', 'ဗောက်', 'ဗိုက်', 'ဗိမ်', 'ဗုန်', 'ဗွန်', 'ဗင်', 'ဗောင်', 'ဗိုင်', 'ဗစ်', 'ဗပ်', 'ဗိတ်', 'ဗုတ်', 'ဗွတ်'],
            'ဘ': ['ဘ', 'ဘာ', 'ဘား', 'ဘိ', 'ဘီ', 'ဘီး', 'ဘု', 'ဘူ', 'ဘူး', 'ဘေ', 'ဘေ့', 'ဘေး',  'ဘဲ', 'ဘဲ့', 'ဘယ်', 'ဘော', 'ဘော့', 'ဘော်', 'ဘံ', 'ဘံ့', 'ဘို', 'ဘို့', 'ဘိုး', 'ဘက်', 'ဘောက်', 'ဘိုက်', 'ဘိမ်', 'ဘုန်', 'ဘွန်', 'ဘင်', 'ဘောင်', 'ဘိုင်', 'ဘစ်', 'ဘပ်', 'ဘိတ်', 'ဘုတ်', 'ဘွတ်'],
            'မ': ['မ', 'မာ', 'မား', 'မိ', 'မီ', 'မီး', 'မု', 'မူ', 'မူး', 'မေ', 'မေ့', 'မေး',  'မဲ', 'မဲ့', 'မယ်', 'မော', 'မော့', 'မော်', 'မံ', 'မံ့', 'မို', 'မို့', 'မိုး', 'မက်', 'မောက်', 'မိုက်', 'မိမ်', 'မုန်', 'မွန်', 'ပင်', 'ပေါင်း', 'မိုင်', 'မစ်', 'မပ်', 'မိတ်', 'မုတ်', 'မွတ်'],
            'ယ': ['ယ', 'ယာ', 'ယား', 'ယိ', 'ယီ', 'ယီး', 'ယု', 'ယူ', 'ယူး', 'ယေ', 'ယေ့', 'ယေး',  'ယဲ', 'ယဲ့', 'ယယ်', 'ယော', 'ယော့', 'ယော်', 'ယံ', 'ယံ့', 'ယို', 'ယို့', 'ယိုး', 'ယက်', 'ယောက်', 'ယိုက်', 'ယိမ်', 'ယုန်', 'ယွန်', 'ယင်', 'ယောင်', 'ယိုင်', 'ယစ်', 'ယပ်', 'ယိတ်', 'ယုတ်', 'ယွတ်'],
            'ရ': ['ရ', 'ရာ', 'ရား', 'ရိ', 'ရီ', 'ရီး', 'ရု', 'ရူ', 'ရူး', 'ရေ', 'ရေ့', 'ရေး',  'ရဲ', 'ရဲ့', 'ရယ်', 'ရော', 'ရော့', 'ရော်', 'ရံ', 'ရံ့', 'ရို', 'ရို့', 'ရိုး', 'ရက်', 'ရောက်', 'ရိုက်', 'ရိမ်', 'ရုန်', 'ရွန်', 'ရင်', 'ရောင်', 'ရိုင်', 'ရစ်', 'ရပ်', 'ရိတ်', 'ရုတ်', 'ရွတ်'],
            'လ': ['လ', 'လာ', 'လား', 'လိ', 'လီ', 'လု', 'လူ', 'လူး', 'လေ', 'လေ့', 'လေး',  'လဲ', 'လဲ့', 'လယ်', 'လော', 'လော့', 'လော်', 'လံ', 'လံ့', 'လို', 'လို့', 'လိုး', 'လက်', 'လောက်', 'လိုက်', 'လိမ်', 'လုန်', 'လွန်', 'လင်', 'လောင်', 'လိုင်', 'လစ်', 'လပ်', 'လိပ်', 'လုတ်', 'လွတ်'],
            'ဝ': ['ဝ', 'ဝါ', 'ဝါး', 'ဝိ', 'ဝီ', 'ဝီး', 'ဝု', 'ဝူ', 'ဝူး', 'ဝေ', 'ဝေ့', 'ဝေး',  'ဝဲ', 'ဝဲ့', 'ဝယ်', 'ဝေါ', 'ဝေါ့', 'ဝေါ်', 'ဝံ', 'ဝံ့', 'ဝို', 'ဝို့', 'ဝိုး', 'ဝက်', 'ဝေါက်', 'ဝိုက်', 'ဝိမ်', 'ဝန်', 'ဝင်', 'ဝိုင်း', 'ဝစ်', 'ဝပ်', 'ဝိတ်', 'ဝတ်'],
            'သ': ['သ', 'သာ', 'သား', 'သိ', 'သီ', 'သီး', 'သု', 'သူ', 'သူး', 'သေ', 'သေ့', 'သေး',  'သဲ', 'သဲ့', 'သယ်', 'သော', 'သေ့', 'သော်', 'သံ', 'သံ့', 'သို', 'သို့', 'သိုး', 'သက်', 'သောက်', 'သိုက်', 'သိမ်', 'သုန်', 'သွန်', 'သင်', 'သောင်', 'သိုင်း', 'သစ်', 'သပ်', 'သိတ်', 'သုတ်', 'သွတ်'],
            'ဟ': ['ဟ', 'ဟာ', 'ဟား', 'ဟိ', 'ဟီ', 'ဟီး', 'ဟု', 'ဟူ', 'ဟူး', 'ဟေ', 'ဟေ့', 'ဟေး',  'ဟဲ', 'ဟဲ့', 'ဟယ်', 'ဟော', 'ဟော့', 'ဟော်', 'ဟံ', 'ဟံ့', 'ဟို', 'ဟို့', 'ဟိုး', 'ဟက်', 'ဟောက်', 'ဟိုက်', 'ဟိမ်', 'ဟုန်', 'ဟွန်', 'ဟင်', 'ဟောင်', 'ဟိုင်း', 'ဟစ်', 'ဟပ်', 'ဟိတ်', 'ဟုတ်', 'ဟွတ်'],
            'ဠ': ['ဠ', 'ဠာ'],
            'အ': ['အ', 'အာ', 'အား', 'အိ', 'အီ', 'အီး', 'အု', 'အူ', 'အူး', 'အေ', 'အေ့', 'အေး',  'အဲ', 'အဲ့', 'အယ်', 'အော', 'အော့', 'အော်', 'အံ', 'အံ့', 'အို', 'အို့', 'အိုး', 'အက်', 'အောက်', 'အိုက်', 'အိမ်', 'အုန်', 'အွန်', 'အင်', 'အောင်', 'အိုင်', 'အစ်', 'အပ်', 'အိပ်', 'အုတ်', 'အွတ်'],
        };
        const allConsonants = [...allConsonantsInOrder];
        let wagaGameActive = false;
        let currentWagaIndex = 0;
        let currentWagaConsonantIndex = 0;
        let wagaConsonantScores = {};
        let bubbleInterval = null;
        let wagaAudioCueInterval = null;

        // --- Draggable Controls ---
        let isDragging = false;
        let offsetX, offsetY;
        floatingControls.addEventListener('mousedown', (e) => {
            if (e.target.closest('.play-button-icon') || e.target.closest('.number-icon-3d')) return;
            isDragging = true;
            offsetX = e.clientX - floatingControls.getBoundingClientRect().left;
            offsetY = e.clientY - floatingControls.getBoundingClientRect().top;
            floatingControls.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            floatingControls.style.left = `${e.clientX - offsetX}px`;
            floatingControls.style.top = `${e.clientY - offsetY}px`;
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            floatingControls.style.cursor = 'move';
        });

        // --- Touch events for mobile dragging ---
        floatingControls.addEventListener('touchstart', (e) => {
            if (e.target.closest('.play-button-icon') || e.target.closest('.number-icon-3d')) return;
            isDragging = true;
            let touch = e.touches[0];
            offsetX = touch.clientX - floatingControls.getBoundingClientRect().left;
            offsetY = touch.clientY - floatingControls.getBoundingClientRect().top;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Prevent page scrolling
            let touch = e.touches[0];
            floatingControls.style.left = `${touch.clientX - offsetX}px`;
            floatingControls.style.top = `${touch.clientY - offsetY}px`;
        }, { passive: false });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        // --- General Functions ---
        function showScore(message) {
            scoreDisplay.innerText = message;
            scoreDisplay.style.display = 'block';
            scoreDisplay.style.opacity = '1';
            setTimeout(() => {
                scoreDisplay.style.opacity = '0';
                setTimeout(() => { scoreDisplay.style.display = 'none'; }, 500);
            }, 3000);
        }

        function showGiftBoxReward() {
            giftBoxContainer.style.display = 'flex';
            giftBoxContainer.innerHTML = `<div class="gift-box">🎁</div>`;
            setTimeout(() => {
                launchConfetti(); // Big confetti burst!
            }, 1500);
            setTimeout(() => {
                giftBoxContainer.style.display = 'none';
                giftBoxContainer.innerHTML = '';
            }, 4000);
        }

        async function playAudio(word, feedback = false, element = null, audioSet = feedbackAudio) {
            if (!isIntroAudioFinished) return;
            if (feedback) {
                return new Promise(resolve => {
                    const audioUrl = audioSet[word];
                    if (!audioUrl) return resolve();
                    const audio = new Audio(audioUrl);
                    audio.onended = resolve;
                    audio.onerror = resolve;
                    audio.play().catch(err => { console.error("Feedback audio failed", err); resolve(); });
                });
            } else {
                if (!isAudioContextReady) await initConsonantAudio();
                if (!isAudioContextReady || !audioContext || !audioBuffer) { console.error("Audio system not ready."); return; }
                if (audioContext.state === 'suspended') await audioContext.resume();

                const timing = consonantTimings[word];
                if (!timing) { console.warn(`No audio time for ${word}`); return; }

                if (element) {
                    element.classList.add('highlight');
                    setTimeout(() => element.classList.remove('highlight'), 300);
                }

                return new Promise(resolve => {
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.onended = resolve;
                    source.start(0, timing.start, timing.duration);
                });
            }
        }
        
        async function playRandomCorrectFeedback() {
            const choices = [15, 16, 17, 21, 22, 23, 24, 25, 26];
            const clip = choices[Math.floor(Math.random() * choices.length)];
            await playInstructionAudio(clip);
        }

        async function playRandomWrongFeedback() {
            const choices = [18, 19, 20];
            const clip = choices[Math.floor(Math.random() * choices.length)];
            await playInstructionAudio(clip);
        }

        async function showHighscoreHint() {
            if (tutorialStep < tutorialTargets.length) {
                pointingHand.classList.add('hidden');
            }
            await playInstructionAudio(55);

            const targetElement = document.getElementById('consonant-count-icon');
            if (targetElement) {
                const targetRect = targetElement.getBoundingClientRect();
                const controlsRect = floatingControls.getBoundingClientRect();
                
                pointingHand.style.top = `${targetRect.bottom - controlsRect.top}px`;
                const newLeft = targetRect.left - controlsRect.left + (targetRect.width / 2) - (pointingHand.offsetWidth / 2);
                pointingHand.style.left = `${newLeft}px`;
                pointingHand.classList.add('pointing-up');
                pointingHand.style.animationName = 'point-up-bounce-from-below';
                
                pointingHand.classList.remove('hidden');

                setTimeout(() => {
                    pointingHand.classList.add('hidden');
                    pointingHand.classList.remove('pointing-up');
                     pointingHand.style.animationName = '';
                    setHandPosition(tutorialStep);
                }, 5000); 
            }
        }

        async function handleCorrectAnswer() {
            correctCount++;
            consecutiveWrongAnswers = 0;
            showDogAnimation();

            // Modified Scoring Logic for Auto Flow
            if (currentGameMode === 'matching') {
                if (correctCount >= TARGET_MATCHING_SCORE && isAutoFlow) {
                    await playInstructionAudio(34 + (correctCount > 20 ? 0 : correctCount)); // Just play generic
                    createMessage("Congratulation! Moving to Puzzle Game... ⛓️", false);
                    setTimeout(startPuzzleGame, 2000);
                    return; 
                }
            }

            if (correctCount <= 20) {
                await playInstructionAudio(34 + correctCount);
                if (correctCount === 10 || correctCount === 20) {
                    showGiftBoxReward();
                }
            } else {
                showScore(`Score: ${correctCount} 🎉`);
                if (correctCount === 25 || correctCount === 30) {
                    await showHighscoreHint();
                }
            }
            await playRandomCorrectFeedback();
        }

        function updateGridForWaga() {
            const consonantItems = document.querySelectorAll('.consonant-item');
            const activeWagaChars = wagaConsonants[currentWagaIndex].chars;

            consonantItems.forEach(item => {
                const consonant = item.dataset.consonant;
                if (consonant && consonant !== "") {
                    if (activeWagaChars.includes(consonant)) {
                        item.classList.remove('dimmed');
                    } else {
                        item.classList.add('dimmed');
                    }
                }
            });
        }

        // --- Read Aloud Feature ---
        async function toggleReadAloud() {
            await handleTutorialClick('toggle-read-aloud-btn');
            if (isReadingAloud) {
                isAutoFlow = false; // User manually stopped
                stopReadAloud();
            } else {
                startReadAloud();
            }
        }

        async function startReadAloud() {
            stopAllGames();
            isReadingAloud = true;
            isAutoFlow = true; // Enable auto flow
            
            toggleReadAloudBtn.classList.remove('bg-blue-500');
            toggleReadAloudBtn.classList.add('bg-red-500');
            readAloudIcon.innerHTML = `<path d="M18.36 5.64a9 9 0 0 1 0 12.72M15.54 8.46a5 5 0 0 1 0 7.07"/>`;

            const consonantsToRead = allConsonantsInOrder.slice(0, consonantCountOptions[currentConsonantCountIndex]);
            const repeats = isAutoFlow ? READ_ALOUD_REPEATS : 1;

            createMessage(`Reading aloud ${repeats} times... 🔊`, false);

            for (let i = 0; i < repeats; i++) {
                if (!isReadingAloud) break;
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between loops
                
                for (const char of consonantsToRead) {
                    if (!isReadingAloud) break; 
                    const element = document.querySelector(`.consonant-item[data-consonant='${char}']`);
                    if (element) {
                        element.classList.add('highlight');
                        // Reposition controls if they cover the highlighted element
                        checkControlsOverlapAndReposition();
                    }
                    await playAudio(char);
                    if (element) element.classList.remove('highlight');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (isReadingAloud) {
                stopReadAloud(true); // Finished naturally
            }
        }

        function stopReadAloud(finishedNaturally = false) {
            isReadingAloud = false;
            toggleReadAloudBtn.classList.add('bg-blue-500');
            toggleReadAloudBtn.classList.remove('bg-red-500');
            readAloudIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
            document.querySelectorAll('.consonant-item.highlight').forEach(el => el.classList.remove('highlight'));

            if (finishedNaturally && isAutoFlow) {
                createMessage("Finished Reading. Preparing Bubble Game... 🎈", false);
                setTimeout(startWagaGame, 1500);
            }
        }


        // --- Waga Bubble Game ---
        async function cycleWaga() {
            await handleTutorialClick('toggle-waga-btn');
            if(wagaGameActive) return;
            currentWagaIndex = (currentWagaIndex + 1) % wagaConsonants.length;
            wagaIcon.innerText = wagaConsonants[currentWagaIndex].name;
            // Removed audio cue here to prevent overlap if game starts immediately
        }

        function toggleWagaGame() {
            if (wagaGameActive) {
                isAutoFlow = false; // Manually stopped
                stopWagaGame();
            } else {
                startWagaGame();
            }
        }

        function startWagaGame() {
            stopAllGames();
            wagaGameActive = true;
            isAutoFlow = true; // Enable auto flow
            currentGameMode = 'waga';
            
            // Auto-select Waga based on count
            // 5->0, 10->1, 15->2, 20->3, 25->4, 30/33->5
            let targetWagaIndex = currentConsonantCountIndex; 
            if (targetWagaIndex > 5) targetWagaIndex = 5; // Cap at 5 for 33 chars
            currentWagaIndex = targetWagaIndex;
            
            // Use innerHTML to allow <br> for English text wrapping
            wagaIcon.innerHTML = wagaConsonants[currentWagaIndex].name.replace(' ', '<br>');
            
            bubbleGameContainer.style.display = 'block';
            currentWagaConsonantIndex = 0;
            wagaConsonantScores = {};
            resetWagaCounters();
            updateWagaTarget();
            bubbleInterval = setInterval(createBubble, 800);
            wagaPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"></rect></svg>`;
            wagaPlayBtn.classList.remove('bg-green-500');
            wagaPlayBtn.classList.add('bg-red-500');
            
            // Reposition controls if they cover the active group
            checkControlsOverlapAndReposition();

            createMessage(`${wagaConsonants[currentWagaIndex].name} Bubble Game Started! 🎈`, false);
        }

        function stopWagaGame(finishedNaturally = false) {
            wagaGameActive = false;
            clearInterval(bubbleInterval);
            clearInterval(wagaAudioCueInterval);
            wagaAudioCueInterval = null;
            bubbleGameContainer.innerHTML = '';
            bubbleGameContainer.style.display = 'none';
            resetWagaCounters(); 
            wagaPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3L19 12 5 21z" fill="white"></path></svg>`;
            wagaPlayBtn.classList.remove('bg-red-500');
            wagaPlayBtn.classList.add('bg-green-500');
            updateGridVisibility();

            if (finishedNaturally && isAutoFlow) {
                createMessage("Bubble Game Completed. Going to Matching Game... 🧩", false);
                setTimeout(startMatchingGame, 1500);
            }
        }
        
        function createBubble() {
            if (!wagaGameActive) return;
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const currentWaga = wagaConsonants[currentWagaIndex];
            if (currentWagaConsonantIndex >= currentWaga.chars.length) {
                stopWagaGame(true); // Finished naturally
                return;
            }
            const targetChar = currentWaga.chars[currentWagaConsonantIndex];
            
            const isTarget = Math.random() < 0.2;
            let bubbleText = '';
            let isCorrect = false;

            if (isTarget) {
                const variations = consonantVariations[targetChar] || [targetChar];
                bubbleText = variations[Math.floor(Math.random() * variations.length)];
                isCorrect = true;
            } else {
                let randomChar = allConsonants[Math.floor(Math.random() * allConsonants.length)];
                while(randomChar === targetChar) {
                    randomChar = allConsonants[Math.floor(Math.random() * allConsonants.length)];
                }
                bubbleText = randomChar;
            }
            
            bubble.innerText = bubbleText;
            bubble.style.left = `${Math.random() * 90}%`;
            bubble.dataset.isCorrect = isCorrect;
            bubble.dataset.targetChar = targetChar;
            
            bubble.addEventListener('click', handleBubbleClick);
            bubble.addEventListener('animationend', () => bubble.remove());
            
            bubbleGameContainer.appendChild(bubble);
        }

        async function handleBubbleClick(event) {
            const bubble = event.currentTarget;
            bubble.style.pointerEvents = 'none';
            const isCorrect = bubble.dataset.isCorrect === 'true';

            if (isCorrect) {
                const targetChar = bubble.dataset.targetChar;
                
                // Check if score limit reached (Max 10)
                if ((wagaConsonantScores[targetChar] || 0) >= 10) {
                     bubble.classList.add('pop');
                     bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
                     return;
                }

                wagaConsonantScores[targetChar] = (wagaConsonantScores[targetChar] || 0) + 1;
                const currentScore = wagaConsonantScores[targetChar];

                // VISUALS FIRST
                const targetButton = document.querySelector(`.consonant-item[data-consonant='${targetChar}']`);
                if (targetButton) {
                    // Create and animate a bird flying to the target
                    const birdContainer = document.getElementById('bird-animation-container');
                    const bird = document.createElement('div');
                    bird.innerText = '🕊️';
                    bird.className = 'flying-bird';

                    const startRect = bubble.getBoundingClientRect();
                    const endRect = targetButton.getBoundingClientRect();

                    bird.style.left = `${startRect.left + startRect.width / 2 - 15}px`;
                    bird.style.top = `${startRect.top + startRect.height / 2 - 15}px`;
                    birdContainer.appendChild(bird);

                    const midX = (startRect.left + endRect.left) / 2 + (Math.random() * 200 - 100);
                    const midY = (startRect.top + endRect.top) / 2 + (Math.random() * 200 - 100);
                    
                    const endX = endRect.left + endRect.width / 2 - 15;
                    const endY = endRect.top + endRect.height / 2 - 15;

                    const animation = bird.animate([
                        { transform: `translate(0, 0) scale(1) rotate(0deg)`, opacity: 1 },
                        { transform: `translate(${midX - startRect.left}px, ${midY - startRect.top}px) scale(1.2) rotate(${Math.random() * 40 - 20}deg)`, opacity: 1, offset: 0.5 },
                        { transform: `translate(${endX - startRect.left}px, ${endY - startRect.top}px) scale(0.5) rotate(0deg)`, opacity: 0 }
                    ], {
                        duration: 1500,
                        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
                    });
                    
                    animation.onfinish = () => {
                        bird.remove();
                        const counter = targetButton.querySelector('.waga-counter');
                        counter.innerText = currentScore;
                    };
                }
                
                bubble.classList.add('pop');
                bubble.addEventListener('animationend', () => bubble.remove(), { once: true });

                // AUDIO & LOGIC LATER
                await playAudio('correct', true, null, feedbackAudioWaga);
                await handleCorrectAnswer();

                if (currentScore >= 10) {
                    currentWagaConsonantIndex++;
                    updateWagaTarget();
                }
            } else {
                // VISUALS FIRST
                bubble.style.animation = 'none';
                bubble.classList.add('fall');
                bubble.addEventListener('animationend', () => bubble.remove(), { once: true });

                // AUDIO & LOGIC LATER
                await playAudio('wrong', true, null, feedbackAudioWaga);
                await playRandomWrongFeedback();
                
                consecutiveWrongAnswers++;
                if (consecutiveWrongAnswers >= 3) {
                    showCorrectAnswerHint();
                }
            }
        }

        function resetWagaCounters() {
            document.querySelectorAll('.waga-counter').forEach(c => {
                c.innerText = '0';
                c.style.display = 'none';
            });
        }

        function updateWagaTarget() {
            if (wagaAudioCueInterval) clearInterval(wagaAudioCueInterval);
            
            const currentWaga = wagaConsonants[currentWagaIndex];
            if (currentWagaConsonantIndex >= currentWaga.chars.length) {
                stopWagaGame(true); // Trigger natural finish
                return;
            }

            const targetChar = currentWaga.chars[currentWagaConsonantIndex];
            const targetButton = document.querySelector(`.consonant-item[data-consonant='${targetChar}']`);
            if(targetButton) {
                const counter = targetButton.querySelector('.waga-counter');
                counter.style.display = 'flex';
                const score = wagaConsonantScores[targetChar] || 0;
                counter.innerText = score;
            }

            playWagaAudioCue();
            wagaAudioCueInterval = setInterval(playWagaAudioCue, 7000);
        }
        
        async function playWagaAudioCue() {
            if (!wagaGameActive) return;
            const currentWaga = wagaConsonants[currentWagaIndex];
            if (currentWagaConsonantIndex < currentWaga.chars.length) {
                const targetChar = currentWaga.chars[currentWagaConsonantIndex];
                await playAudio(targetChar);
            }
        }


        // --- Other Game Functions (Original) ---
        function updateGridVisibility() {
            const consonantItems = document.querySelectorAll('.consonant-item');
            const activeCount = consonantCountOptions[currentConsonantCountIndex];
            let consonantIndex = 0;

            consonantItems.forEach(item => {
                const consonant = item.dataset.consonant;
                if (consonant && consonant !== "") { 
                    if (consonantIndex < activeCount) {
                        item.classList.remove('dimmed');
                    } else {
                        item.classList.add('dimmed');
                    }
                    consonantIndex++;
                }
            });
        }

        const consonantCountAudioMap = { 5: 27, 10: 28, 15: 29, 20: 30, 25: 31, 30: 32, 33: 33 };

        async function changeConsonantCount() {
            await handleTutorialClick('consonant-count-icon');
            stopAllGames(); // Reset everything including AutoFlow
            currentConsonantCountIndex = (currentConsonantCountIndex + 1) % consonantCountOptions.length;
            consonantCountIcon.innerText = consonantCountEmojis[currentConsonantCountIndex];
            
            const currentCount = consonantCountOptions[currentConsonantCountIndex];
            createMessage(`Selected ${currentCount} consonants.`, false);
            updateGridVisibility();

            // Play audio based on selection
            const audioClip = consonantCountAudioMap[currentCount];
            if (audioClip) {
                await playInstructionAudio(audioClip);
            }
        }

        async function playSequence(words) {
            for (const word of words) {
                const element = document.querySelector(`.consonant-item[data-consonant='${word}']`);
                await playAudio(word, false, element);
            }
        }

        function createMessage(text, isUser = true) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${isUser ? 'bg-green-100 ml-auto' : 'bg-gray-200'}`;
            messageDiv.innerHTML = text; // Changed to innerHTML to support <br>
            chatDisplay.appendChild(messageDiv);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }

        function handleTypingInput() {
            if (currentGameMode === 'typing') checkTypingAnswer();
            else {
                const input = chatInput.value.trim();
                chatInput.value = '';
                if (input === '') return;
                createMessage(input, true);
                const wordsToPlay = input.split('').filter(char => allConsonantsInOrder.includes(char));
                if (wordsToPlay.length > 0) {
                    createMessage(`Playing sound for "${wordsToPlay.join('')}"... 🔊`, false);
                    playSequence(wordsToPlay);
                } else {
                    createMessage(`No sound found. Please type a valid Myanmar consonant. 📢`, false);
                }
            }
        }
        
        function startTypingGame() {
            stopAllGames();
            currentGameMode = 'typing'; correctCount = 0; consonantsToAsk = 1;
            createMessage("Game Started. Listen to the sound and type the consonant. 🎧", false);
            chatInput.focus();
            toggleTypingBtn.innerHTML = `<span class="text-lg">🛑</span>`;
            toggleTypingBtn.classList.remove('bg-green-500'); toggleTypingBtn.classList.add('bg-red-500');
            askTypingQuestion();
        }
        
        async function askTypingQuestion() {
            if (audioTimer) clearInterval(audioTimer);

            const consonantsToUse = allConsonantsInOrder.slice(0, consonantCountOptions[currentConsonantCountIndex]);
            if (consonantsToUse.length === 0) { stopAllGames(); return; }
            
            let questionWords = Array.from({length: consonantsToAsk}, () => consonantsToUse[Math.floor(Math.random() * consonantsToUse.length)]);
            correctAnswer = questionWords.join('');
            
            await playSequence(questionWords);
            if (currentGameMode === 'typing') audioTimer = setInterval(() => playSequence(questionWords), 5000);
        }

        async function checkTypingAnswer() {
            const userInput = chatInput.value.trim();
            chatInput.value = '';
            createMessage(userInput, true);
            
            if (userInput === correctAnswer) {
                if (audioTimer) clearInterval(audioTimer);
                await playAudio('correct', true);
                await handleCorrectAnswer();
                
                if (correctCount === 10 && consonantsToAsk === 1) { consonantsToAsk = 2; createMessage("Level Up! Now listen to 2 consonants. 🚀", false); }
                else if (correctCount === 20 && consonantsToAsk === 2) { consonantsToAsk = 3; createMessage("Level Up! Now listen to 3 consonants. 🌠", false); }
                setTimeout(askTypingQuestion, 1500);
            } else {
                await playAudio('wrong', true);
                await playRandomWrongFeedback();
                createMessage(`Wrong Answer. The correct answer was "${correctAnswer}". 😞`, false);
                consecutiveWrongAnswers++;
                if (consecutiveWrongAnswers >= 3) {
                    showCorrectAnswerHint(); // This won't point, but will reset counter
                }
            }
        }
        
        async function toggleTypingGame() { 
            await handleTutorialClick('toggle-typing-btn');
            currentGameMode === 'typing' ? stopAllGames() : startTypingGame(); 
        }

        function startClickGame() {
            stopAllGames();
            currentGameMode = 'click'; correctCount = 0;
            toggleClickBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>`;
            toggleClickBtn.classList.remove('start'); toggleClickBtn.classList.add('stop');
            askClickQuestion();
        }

        async function askClickQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            const consonantsToUse = allConsonantsInOrder.slice(0, consonantCountOptions[currentConsonantCountIndex]);
            if (consonantsToUse.length === 0) { stopAllGames(); return; }
            
            let numQuestions = 1; // Always ask one consonant
            let questionWords = [];
            while(questionWords.length < numQuestions) {
                let char = consonantsToUse[Math.floor(Math.random() * consonantsToUse.length)];
                if(!questionWords.includes(char)) questionWords.push(char);
            }

            correctAnswer = questionWords.join('');
            userClickSequence = '';
            
            await playSequence(questionWords);
            if (currentGameMode === 'click') audioTimer = setInterval(() => playSequence(questionWords), 5000);
        }

        // --- Matching Game ---
        async function toggleMatchingGame() {
            await handleTutorialClick('toggle-matching-btn');
            if (currentGameMode === 'matching') {
                isAutoFlow = false;
                stopAllGames();
            } else {
                startMatchingGame();
            }
        }

        function startMatchingGame() {
            stopAllGames();
            isAutoFlow = true; // Enable auto flow
            currentGameMode = 'matching';
            correctCount = 0;
            toggleMatchingBtn.innerHTML = `<span class="text-lg">🛑</span>`;
            toggleMatchingBtn.classList.remove('bg-orange-500');
            toggleMatchingBtn.classList.add('bg-red-500');
            createMessage(`Matching Game Started! Try to get ${TARGET_MATCHING_SCORE} points! 🧩`, false);
            askMatchingQuestion();
        }

        async function askMatchingQuestion() {
            if (audioTimer) clearInterval(audioTimer);
            document.querySelectorAll('.consonant-item.choice').forEach(el => el.classList.remove('choice'));
            isMatchingQuestionAnswered = false;

            const consonantsToUse = allConsonantsInOrder.slice(0, consonantCountOptions[currentConsonantCountIndex]);
            if (consonantsToUse.length < 3) {
                 createMessage("Need at least 3 consonants to play matching game.", false);
                 stopAllGames();
                 return;
            }

            matchingChoices = [];
            while(matchingChoices.length < 3) {
                let char = consonantsToUse[Math.floor(Math.random() * consonantsToUse.length)];
                if(!matchingChoices.includes(char)) matchingChoices.push(char);
            }

            correctAnswer = matchingChoices[Math.floor(Math.random() * matchingChoices.length)];

            matchingChoices.forEach(char => {
                const el = document.querySelector(`.consonant-item[data-consonant='${char}']`);
                if(el) el.classList.add('choice');
            });
            
            // Check for overlap immediately
            checkControlsOverlapAndReposition();

            await playAudio(correctAnswer);
            if (currentGameMode === 'matching') {
                audioTimer = setInterval(() => playAudio(correctAnswer), 5000);
            }
        }

        // --- Puzzle Game ---
        async function togglePuzzleGame() {
            await handleTutorialClick('toggle-puzzle-btn');
            if (currentGameMode === 'puzzle') {
                isAutoFlow = false;
                stopAllGames();
            } else {
                startPuzzleGame();
            }
        }

        function startPuzzleGame() {
            stopAllGames();
            isAutoFlow = true; // Enable auto flow
            currentGameMode = 'puzzle';
            puzzleRoundsWon = 0; // Reset rounds
            
            togglePuzzleBtn.innerHTML = `<span class="text-lg">🛑</span>`;
            togglePuzzleBtn.classList.remove('bg-pink-500');
            togglePuzzleBtn.classList.add('bg-red-500');
            puzzleArea.classList.remove('hidden');
            chatContainer.classList.add('hidden');
            consonantGridContainer.classList.add('puzzle-active');
            
            // Set an initial "away" position, the overlap check will refine it.
            controlsPositionIndex = 1; 
            applyControlsPosition(controlsPositionIndex);

            createMessage(`Puzzle Game Started! Complete ${TARGET_PUZZLE_ROUNDS} rounds. ⛓️`, false);
            askPuzzleQuestion();
        }

        function askPuzzleQuestion() {
            puzzleUserProgress = [];
            
            const consonantsToUse = allConsonantsInOrder.slice(0, consonantCountOptions[currentConsonantCountIndex]);
            const numToSequence = consonantsToUse.length;
            if (numToSequence < 2) {
                stopAllGames();
                return;
            }
            
            document.querySelectorAll('.consonant-item.revealed').forEach(el => el.classList.remove('revealed'));
            document.querySelectorAll('.consonant-item.puzzle-hidden').forEach(el => el.classList.remove('puzzle-hidden'));

            puzzleSequence = [...consonantsToUse];
            
            puzzleSequence.forEach(char => {
                const itemToHide = document.querySelector(`.consonant-item[data-consonant='${char}']`);
                if (itemToHide) {
                    itemToHide.classList.add('puzzle-hidden');
                }
            });

            const shuffledSequence = [...puzzleSequence].sort(() => Math.random() - 0.5);

            puzzleChoicesDisplay.innerHTML = '';
            shuffledSequence.forEach(char => {
                const choiceEl = document.createElement('div');
                choiceEl.className = 'puzzle-choice-item';
                choiceEl.dataset.consonant = char;
                choiceEl.innerText = char;
                choiceEl.onclick = () => handlePuzzleChoiceClick(choiceEl);
                puzzleChoicesDisplay.appendChild(choiceEl);
            });
            
            puzzleSequenceDisplay.innerHTML = '';
            puzzleSequence.forEach(() => {
                const slot = document.createElement('div');
                slot.className = 'puzzle-slot';
                puzzleSequenceDisplay.appendChild(slot);
            });

            // Check for overlap after choices are rendered
            setTimeout(checkControlsOverlapAndReposition, 100);
        }
        
        async function handlePuzzleChoiceClick(element) {
            if (element.classList.contains('used')) return;
        
            const clickedConsonant = element.dataset.consonant;
            const nextCorrectChar = puzzleSequence[puzzleUserProgress.length];
        
            if (clickedConsonant === nextCorrectChar) {
                stopAllInstructionAudio();
        
                // Immediately update UI and state
                puzzleUserProgress.push(clickedConsonant);
                element.classList.add('used');
        
                const slotToFill = puzzleSequenceDisplay.children[puzzleUserProgress.length - 1];
                if (slotToFill) {
                    slotToFill.innerText = clickedConsonant;
                    slotToFill.classList.add('filled');
                }
                
                const revealedItem = document.querySelector(`.consonant-item[data-consonant='${clickedConsonant}']`);
                if (revealedItem) {
                    revealedItem.classList.remove('puzzle-hidden');
                    revealedItem.classList.add('revealed');
                }
        
                // Play consonant sound immediately, but don't wait
                playAudio(clickedConsonant);

                // Check for completion
                if (puzzleUserProgress.length === puzzleSequence.length) {
                    puzzleRoundsWon++;
                    showGiftBoxReward();
                    
                    if (isAutoFlow && puzzleRoundsWon >= TARGET_PUZZLE_ROUNDS) {
                         setTimeout(() => {
                             showScore("Lesson Completed! 🎉");
                             createMessage("Congratulation! All game stages completed. 🏆", false);
                             stopAllGames();
                             launchConfetti();
                         }, 1000);
                    } else {
                        setTimeout(askPuzzleQuestion, 4500);
                    }
                } else {
                    // If not complete, check overlap for the *next* target
                    setTimeout(checkControlsOverlapAndReposition, 100);
                }
        
                // Handle feedback in the background
                (async () => {
                    await playAudio('correct', true);
                    await handleCorrectAnswer();
                })();
        
            } else {
                await playAudio('wrong', true);
                await playRandomWrongFeedback();
                consecutiveWrongAnswers++;
                if (consecutiveWrongAnswers >= 3) {
                    showCorrectAnswerHint();
                }
                element.animate([
                    { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 300, easing: 'ease-in-out' });
            }
        }

        async function handleGridClick(element) {
            const clickedConsonant = element.dataset.consonant;
            if (currentGameMode === 'click') {
                if (clickedConsonant === '' || !correctAnswer) return;
                element.classList.add('active-pulse');
                setTimeout(() => element.classList.remove('active-pulse'), 500);
                
                userClickSequence += clickedConsonant;
                
                if (correctAnswer.startsWith(userClickSequence)) {
                    await playAudio('correct', true);
                    if (userClickSequence === correctAnswer) {
                        if (audioTimer) clearInterval(audioTimer);
                        await handleCorrectAnswer();
                        setTimeout(askClickQuestion, 1500);
                    }
                } else {
                    await playAudio('wrong', true);
                    await playRandomWrongFeedback();
                    userClickSequence = '';
                    consecutiveWrongAnswers++;
                    if (consecutiveWrongAnswers >= 3) {
                        showCorrectAnswerHint();
                    }
                }
            } else if (currentGameMode === 'matching') {
                if (isMatchingQuestionAnswered || !matchingChoices.includes(clickedConsonant)) return; 

                element.classList.add('active-pulse');
                setTimeout(() => element.classList.remove('active-pulse'), 500);

                if (clickedConsonant === correctAnswer) {
                    isMatchingQuestionAnswered = true;
                    if (audioTimer) clearInterval(audioTimer);
                    await playAudio('correct', true);
                    await handleCorrectAnswer();

                    // Switch to Puzzle Game if score reaches 20
                    if (correctCount >= 20) {
                         setTimeout(() => {
                            createMessage("Congratulation! Moving to Puzzle Game... ⛓️", false);
                            startPuzzleGame();
                        }, 1500);
                    } else {
                        setTimeout(askMatchingQuestion, 1500);
                    }
                } else {
                    await playAudio('wrong', true);
                    await playRandomWrongFeedback();
                    const correctEl = document.querySelector(`.consonant-item[data-consonant='${correctAnswer}']`);
                    if(correctEl) {
                        correctEl.classList.add('highlight');
                        setTimeout(() => correctEl.classList.remove('highlight'), 1000);
                    }
                    consecutiveWrongAnswers++;
                    if (consecutiveWrongAnswers >= 3) {
                        showCorrectAnswerHint();
                    }
                }
            } else if (!currentGameMode) {
                element.classList.add('active-pulse');
                setTimeout(() => element.classList.remove('active-pulse'), 500);
                await playAudio(clickedConsonant, false, element);
            }
        }
        
        async function toggleClickGame() { 
            await handleTutorialClick('toggle-click-btn');
            currentGameMode === 'click' ? stopAllGames() : startClickGame(); 
        }

        function stopAllGames() {
            if(wagaGameActive) stopWagaGame(); // This will not trigger next step if called here because we set isAutoFlow=false explicitly in toggle handlers usually, OR we want it to stop everything.
            if(isReadingAloud) {
                isReadingAloud = false;
                stopReadAloud();
            }

            if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }

            if (currentGameMode === 'typing') {
                createMessage("Game Stopped. 👋", false);
                toggleTypingBtn.innerHTML = `<span class="text-lg">⌨️</span>`;
                toggleTypingBtn.classList.remove('bg-red-500'); toggleTypingBtn.classList.add('bg-green-500');
            } else if (currentGameMode === 'click') {
                toggleClickBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3L19 12 5 21z" fill="white"/></svg>`;
                toggleClickBtn.classList.remove('stop'); toggleClickBtn.classList.add('start');
            } else if (currentGameMode === 'matching') {
                toggleMatchingBtn.innerHTML = `<span class="text-lg">🧩</span>`;
                toggleMatchingBtn.classList.remove('bg-red-500');
                toggleMatchingBtn.classList.add('bg-orange-500');
                document.querySelectorAll('.consonant-item.choice').forEach(el => el.classList.remove('choice'));
            } else if (currentGameMode === 'puzzle') {
                togglePuzzleBtn.innerHTML = `<span class="text-lg">⛓️</span>`;
                togglePuzzleBtn.classList.remove('bg-red-500');
                togglePuzzleBtn.classList.add('bg-pink-500');
                puzzleArea.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                consonantGridContainer.classList.remove('puzzle-active');
                document.querySelectorAll('.consonant-item.revealed').forEach(el => {
                    el.classList.remove('revealed');
                });
                document.querySelectorAll('.consonant-item.puzzle-hidden').forEach(el => {
                    el.classList.remove('puzzle-hidden');
                });
                // Reset controls position to default top-left
                controlsPositionIndex = 0;
                applyControlsPosition(controlsPositionIndex);
            }
            currentGameMode = null; correctAnswer = null; userClickSequence = ''; matchingChoices = []; puzzleSequence = []; puzzleUserProgress = [];
        }

        // --- Tutorial Functions ---
        function setHandPosition(step) {
            if (step >= tutorialTargets.length) {
                pointingHand.classList.add('hidden');
                return;
            }
            pointingHand.classList.remove('hidden');
            pointingHand.style.animationName = 'point-up-bounce';
            pointingHand.classList.remove('pointing-up');

            const targetId = tutorialTargets[step];
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const targetRect = targetElement.getBoundingClientRect();
                const controlsRect = floatingControls.getBoundingClientRect();
                const newLeft = targetRect.left - controlsRect.left + (targetRect.width / 2) - (pointingHand.offsetWidth / 2);
                pointingHand.style.left = `${newLeft}px`;
                pointingHand.style.top = `60px`;
            }
        }

        async function handleTutorialClick(clickedElementId) {
            const expectedTargetId = tutorialTargets[tutorialStep];
            if (clickedElementId === expectedTargetId) {
                await playInstructionAudio(tutorialAudioClips[tutorialStep]);
                tutorialStep++;
                setHandPosition(tutorialStep);
            }
        }
        
        async function showCorrectAnswerHint() {
            let targetElement;
            
            if ((currentGameMode === 'click' || currentGameMode === 'matching') && correctAnswer) {
                const targetChar = correctAnswer.charAt(userClickSequence.length);
                targetElement = document.querySelector(`.consonant-item[data-consonant='${targetChar}']`);
            } else if (currentGameMode === 'waga') {
                const currentWaga = wagaConsonants[currentWagaIndex];
                if (currentWagaConsonantIndex < currentWaga.chars.length) {
                    const targetChar = currentWaga.chars[currentWagaConsonantIndex];
                    targetElement = document.querySelector(`.consonant-item[data-consonant='${targetChar}']`);
                }
            } else if (currentGameMode === 'puzzle') {
                const nextCorrectChar = puzzleSequence[puzzleUserProgress.length];
                targetElement = document.querySelector(`.puzzle-choice-item[data-consonant='${nextCorrectChar}']`);
            }
            
            if (targetElement) {
                await playInstructionAudio(34);
                const rect = targetElement.getBoundingClientRect();
                hintPointer.style.top = `${rect.top - 40}px`; 
                hintPointer.style.left = `${rect.left + (rect.width / 2) - 15}px`;
                hintPointer.style.visibility = 'visible';
                hintPointer.style.opacity = '1';
                
                setTimeout(() => {
                    hintPointer.style.opacity = '0';
                    hintPointer.style.visibility = 'hidden';
                }, 4000); 
            }
            
            consecutiveWrongAnswers = 0; // Reset after showing
        }

        async function initializeApp() {
            updateGridVisibility();
            setTimeout(() => setHandPosition(0), 100);
        }

        // --- Event Listeners ---
        // Scoped to this app's own container (rootEl), not document.body —
        // this component is mounted inline alongside TutoringApp/SmartStudy/
        // AbhidhammaApp/MyanmarReader/Dhammaschool (all kept mounted, just
        // hidden via CSS), so a global body listener with {once:true} could
        // get silently "used up" by a click on a completely different app
        // before this one was ever opened.
        rootEl.addEventListener('click', async () => {
             await initConsonantAudio();
             await initInstructionAudio();
             if (isInstructionAudioReady) {
                await playInstructionAudio(1);
                isIntroAudioFinished = true;
             }
        }, { once: true });
        chatInput.addEventListener('focus', () => { consonantGridContainer.classList.add('conditionally-scrollable'); });
        chatInput.addEventListener('blur', () => { consonantGridContainer.classList.remove('conditionally-scrollable'); });
        chatInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); handleTypingInput(); }});

        // The page's 'load' event already fired long before this component
        // ever mounted (it's added to the DOM later, when navigated to), so
        // window.addEventListener('load', ...) would never fire again here —
        // call it directly instead.
        initializeApp();


  }, []);

  return (
    <>
      <style>{CONSONANT_APP_CSS}</style>
      <div
        ref={containerRef}
        className="consonant-app-root bg-gray-100"
        dangerouslySetInnerHTML={{ __html: CONSONANT_APP_BODY_HTML }}
      />
    </>
  );
}
