import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from './firebase';

// ── Ported from the standalone "Myanmar Vowels Learning" HTML app ──
// Same hybrid approach as ConsonantPracticeApp/BurmeseConsonantGameApp/
// MyanmarNumberLearningApp: the original vanilla JS (DOM manipulation,
// onclick= handlers in the markup, Web Audio playback) is kept almost
// unchanged inside a React wrapper instead of being rewritten as JSX/state.
//
// document.getElementById/querySelector(All) calls were changed to a
// rootEl-scoped `byId` helper / rootEl.querySelector(All) so this app only
// ever reads/touches its OWN container, never anything belonging to another
// mounted app that happens to reuse the same element id. Inline onclick="..."
// attributes resolve via the global scope, so the functions they call are
// exposed under window.__mvlApp (namespaced, not bare globals) — see the
// note above that assignment for the full explanation.
//
// Two bugs in the original standalone page were fixed while porting (both
// pre-existing, not introduced by this port):
//  1. `maxLivesForThisGame` was assigned without ever being declared. In a
//     plain (non-module) HTML page that silently creates a global; inside
//     this file (an ES module, which runs in strict mode) it would throw
//     instead, so it now has a proper `let` declaration.
//  2. `resolveAudioKey` referenced `consonantAliases` before its `const`
//     declaration further down the same function (a temporal-dead-zone
//     crash waiting to happen) — moved the declaration to the top.
//
// This app has no data persistence of its own; the shared Firebase instance
// from ./firebase.js is reused for the added online-roster feature below.
// The original CSS also had a bare `body {...}` rule — rescoped to
// .mvl-app-root so it doesn't leak onto the rest of the SPA, since every app
// stays mounted simultaneously (just hidden via CSS) per App.jsx's design.

const MVL_ROSTER_PATH = 'artifacts/myanmar-vowels-learning-app/public/data/roster';
const sanitizeMvlKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const MVL_APP_CSS = `
        .mvl-app-root {
            font-family: 'Padauk', sans-serif;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 1rem;
            position: relative;
            padding-bottom: 6rem;
        }
        .main-container {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1rem;
            position: relative;
            z-index: 10;
        }
        .chat-container {
            height: 40vh;
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease-in-out;
        }
        .chat-container.game-active {
            height: auto;
            min-height: unset;
        }

        .chat-display {
            flex-grow: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column-reverse;
            transition: opacity 0.3s;
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
            border-top: 1px solid #e5e7eb;
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
        .vowel-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 0.25rem; 
            padding: 0.25rem;
        }
        .vowel-grid.game-mode-grid {
             border-bottom: 1px solid #e5e7eb;
             border-radius: 0;
             max-height: 25vh;
             overflow-y: auto;
        }

        .vowel-item {
            cursor: pointer;
            padding: 0.25rem; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, background-color 0.3s, box-shadow 0.3s, opacity 0.3s;
            position: relative;
            overflow: hidden;
            min-height: 50px;
        }
        .vowel-text {
            line-height: 1;
            margin-bottom: 0.25rem;
        }
        .roman-text {
            font-size: 0.65rem;
            color: #6b7280;
            margin-top: 0;
            position: absolute;
            bottom: 2px;
            right: 4px;
            font-family: 'Inter', sans-serif;
            transition: opacity 0.3s;
        }
        .game-mode-grid .roman-text {
    display: block !important;
}
.hide-roman .roman-text {
    display: none !important;
}
        .game-active-hide-roman .roman-text {
            display: none !important;
        }

        .vowel-item:hover {
            transform: scale(1.05);
        }
        .vowel-item.highlight-reading {
            transform: scale(1.15);
            background-color: #fef08a !important;
            border: 2px solid #f97316;
            box-shadow: 0 0 20px #facc15;
            z-index: 10;
        }
        .vowel-item.no-clicks {
            pointer-events: none;
        }
        .game-btn {
            background-color: #fff;
            border: 2px solid #10b981;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            flex-shrink: 0;
        }
        .game-btn:hover {
            background-color: #e8f5e9;
            transform: scale(1.1);
        }
        .game-btn.disabled {
            cursor: not-allowed;
            opacity: 0.5;
            pointer-events: none;
        }
        
        #random-game-options {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
            margin-top: 1rem;
            margin-bottom: 1rem;
        }

        #random-game-options .option-button {
            padding: 1rem 1.5rem;
            border-radius: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            border: 3px solid #6366f1;
            background: linear-gradient(145deg, #ffffff, #eff6ff);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), inset 0 -2px 0 rgba(0,0,0,0.05);
            color: #4338ca;
            min-width: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #random-game-options .option-button:hover {
            transform: translateY(-4px);
            background: #e0e7ff;
            box-shadow: 0 10px 15px rgba(99, 102, 241, 0.2);
        }
        
        #random-game-options .option-button:active {
            transform: translateY(0);
        }

        #random-game-options .option-button.correct {
            background: #dcfce7; 
            border-color: #22c55e !important; 
            color: #166534 !important; 
            transform: scale(1.1);
            box-shadow: 0 0 15px #4ade80;
        }
        #random-game-options .option-button.wrong {
            background: #fee2e2;
            border-color: #ef4444 !important;
            color: #991b1b !important;
            opacity: 0.6;
        }

        .particle {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            transition: all 1s cubic-bezier(0.17, 0.67, 0.83, 0.67);
            z-index: 9999;
        }
        .game-feedback {
            padding: 1rem;
            font-size: 1.125rem; 
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid #e5e7eb;
            transition: background-color 0.3s;
        }
        .vowel-item.masked {
            opacity: 0.25;
            cursor: not-allowed;
            background-color: #d1d5db !important;
            pointer-events: none;
        }
        
        /* Gift Package Styles */
        #gift-package-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(5px);
            z-index: 10000;
            display: none;
            place-items: center;
        }
        .gift-box-transparent {
            font-size: 150px;
            animation: bounceIn 0.8s forwards, floatY 2s infinite ease-in-out 0.8s;
            text-shadow: 0 0 50px rgba(255,215,0,0.8);
            filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.6));
        }
        @keyframes bounceIn {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        @keyframes floatY {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-20px) scale(1.05); }
        }

        /* Climbing & Hearts UI */
        #game-progress-ui {
            transition: opacity 0.3s ease;
        }
        .heart {
            transition: all 0.3s ease;
            display: inline-block;
        }
        .heart.lost {
            filter: grayscale(100%);
            opacity: 0.2;
            transform: scale(0.8);
        }
        #climber {
            transition: bottom 0.5s ease-out;
        }
        
        /* Menu Buttons */
        .level-btn {
            background: #fff;
            border: 2px solid #3b82f6;
            color: #3b82f6;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: bold;
            transition: all 0.2s;
            width: 100%;
            text-align: center;
        }
        .level-btn:hover {
            background: #3b82f6;
            color: #fff;
        }
`;

const MVL_APP_BODY_HTML = `

    <!-- Success Transparent Gift Modal -->
    <div id="gift-package-modal">
        <div class="gift-box-transparent">🎁</div>
    </div>

    <!-- Game Progress UI (Mountain & Hearts) -->
    <div id="game-progress-ui" class="hidden fixed left-2 sm:left-6 top-1/2 transform -translate-y-1/2 flex flex-col items-center z-40">
        <!-- Mountain/Rope -->
        <div class="relative w-16 h-64 sm:h-80 bg-blue-50/80 backdrop-blur rounded-2xl border-2 border-blue-200 overflow-hidden shadow-lg flex justify-center">
            <!-- Mountain graphic -->
            <div class="absolute bottom-0 w-full h-full flex flex-col justify-end items-center">
                <svg viewBox="0 0 100 100" class="w-full h-full opacity-60" preserveAspectRatio="none">
                   <polygon points="50,10 100,100 0,100" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
                   <!-- Rope -->
                   <line x1="50" y1="10" x2="50" y2="100" stroke="#475569" stroke-width="3" stroke-dasharray="6"/>
                </svg>
            </div>
            <!-- Climber -->
            <div id="climber" class="absolute w-10 h-10 flex items-center justify-center text-3xl z-10" style="bottom: 0%; left: 50%; transform: translateX(-50%);">
                🧗
            </div>
            <!-- Peak Flag -->
            <div class="absolute top-2 left-50 transform -translate-x-1/2 text-xl z-10">
                🚩
            </div>
        </div>
        <!-- Score text -->
        <div class="mt-2 bg-white/90 px-3 py-1 rounded-full shadow font-bold text-blue-600 border border-blue-100">
            <span id="progress-text">0 / 0</span>
        </div>
        <button onclick="window.__mvlApp.stopGame()" class="mt-4 bg-red-100 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-200 transition text-sm">Quit</button>
    </div>

    <!-- Consonant Modal -->
    <div id="consonant-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">Choose Consonants</h2>
            <div id="consonant-grid" class="grid grid-cols-5 sm:grid-cols-7 gap-2">
                <!-- Javascript will populate this -->
            </div>
            <button onclick="window.__mvlApp.closeConsonantModal()" class="mt-6 w-full py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 transition-colors">Close</button>
        </div>
    </div>

    <!-- Game Menu Modal -->
    <div id="game-menu-modal" class="hidden fixed inset-0 bg-black/60 z-[10002] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative">
            <button onclick="window.__mvlApp.closeGameMenu()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center text-indigo-600">Select a Game</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Random Sound -->
                <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col items-center">
                    <div class="text-4xl mb-2">👂</div>
                    <h3 class="font-bold text-xl text-indigo-800 mb-4 text-center">Listen & Match</h3>
                    <div id="listen-menu-options" class="w-full flex flex-col gap-2">
                        <!-- Populated by JS -->
                    </div>
                </div>
                
                <!-- Clicking -->
                <div class="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center">
                    <div class="text-4xl mb-2">👆</div>
                    <h3 class="font-bold text-xl text-green-800 mb-4 text-center">Click Sequence</h3>
                    <div id="click-menu-options" class="w-full flex flex-col gap-2">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Typing -->
                <div class="bg-pink-50 border border-pink-100 p-4 rounded-xl flex flex-col items-center">
                    <div class="text-4xl mb-2">⌨️</div>
                    <h3 class="font-bold text-xl text-pink-800 mb-4 text-center">Typing Practice</h3>
                    <div id="type-menu-options" class="w-full flex flex-col gap-2">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Fixed UI Corners -->
    <button id="btn-mode-b" onclick="window.__mvlApp.switchMode('B')" class="fixed top-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-indigo-600 text-white border-4 border-indigo-300 transform hover:scale-110">B</button>
    <button id="btn-mode-p" onclick="window.__mvlApp.switchMode('P')" class="fixed bottom-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-white text-gray-600 border-4 border-gray-300 hover:bg-gray-100 transform hover:scale-110">P</button>
    <button id="btn-consonant" onclick="window.__mvlApp.openConsonantModal()" class="fixed top-6 right-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-yellow-400 text-yellow-900 border-4 border-yellow-200 hover:bg-yellow-300 transform hover:scale-110">အ</button>

    <!-- Game Toolbar Fixed Bottom Center -->
    <div id="game-toolbar" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur border border-gray-200 rounded-full px-6 py-3 shadow-xl z-50 flex items-center gap-4 transition-all duration-300">
        <!-- Read Aloud Button -->
        <button id="read-aloud-btn" class="game-btn text-gray-700 border-gray-300 hover:bg-gray-100" onclick="window.__mvlApp.readAloud()" title="Read Vowels in Order">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
        </button>

        <!-- Play Games Button -->
        <button id="open-games-btn" onclick="window.__mvlApp.openGameMenu()" class="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition">
            🎮 Play Games
        </button>
        <button id="replay-sound-btn" onclick="window.__mvlApp.replayCurrentSound()" class="game-btn text-blue-600 border-blue-300 hover:bg-blue-50 hidden" title="Replay Sound">
            🔊
        </button>
    </div>

    <div class="main-container">
        <!-- Basic Grid -->
        <div id="vowel-grid-basic" class="vowel-grid bg-white border border-gray-200 rounded-lg">
            <div onclick="window.__mvlApp.handleVowelClick('အ', this)" data-base="အ" data-disp="အ" data-rom="a" class="vowel-item bg-blue-100 hover:bg-blue-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-blue-900">အ</span>
                <span class="roman-text">a</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အာ', this)" data-base="အာ" data-disp="အာ" data-rom="ar" class="vowel-item bg-blue-100 hover:bg-blue-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-blue-900">အာ</span>
                <span class="roman-text">ar</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အိ', this)" data-base="အိ" data-disp="အိ" data-rom="i." class="vowel-item bg-purple-100 hover:bg-purple-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">အိ</span>
                <span class="roman-text">i.</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အီ', this)" data-base="အီ" data-disp="အီ" data-rom="ee" class="vowel-item bg-purple-100 hover:bg-purple-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">အီ</span>
                <span class="roman-text">ee</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အု', this)" data-base="အု" data-disp="အု" data-rom="u." class="vowel-item bg-green-100 hover:bg-green-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">အု</span>
                <span class="roman-text">u.</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အူ', this)" data-base="အူ" data-disp="အူ" data-rom="uu" class="vowel-item bg-green-100 hover:bg-green-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">အူ</span>
                <span class="roman-text">uu</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အေ', this)" data-base="အေ" data-disp="အေ" data-rom="e" class="vowel-item bg-red-100 hover:bg-red-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-red-900">အေ</span>
                <span class="roman-text">ay</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အဲ', this)" data-base="အဲ" data-disp="အဲ" data-rom="ell" class="vowel-item bg-teal-100 hover:bg-teal-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-teal-900">အဲ</span>
                <span class="roman-text">ell</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အော', this)" data-base="အော" data-disp="အော" data-rom="aw" class="vowel-item bg-orange-100 hover:bg-orange-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">အော</span>
                <span class="roman-text">aw</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အော်', this)" data-base="အော်" data-disp="အော်" data-rom="aw" class="vowel-item bg-orange-100 hover:bg-orange-200">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">အော်</span>
                <span class="roman-text">aw</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အံ', this)" data-base="အံ" data-disp="အံ" data-rom="an" class="vowel-item bg-gray-200 hover:bg-gray-300">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အံ</span>
                <span class="roman-text">an</span>
            </div>
            <div onclick="window.__mvlApp.handleVowelClick('အို', this)" data-base="အို" data-disp="အို" data-rom="o" class="vowel-item bg-yellow-200 hover:bg-yellow-300">
                <span class="vowel-text text-xl sm:text-3xl font-semibold text-yellow-900">အို</span>
                <span class="roman-text">o</span>
            </div>
        </div>

        <!-- Chat Box Section -->
        <div id="chat-box-container" class="chat-container mt-8">
            <div id="game-feedback" class="game-feedback hidden text-gray-700"></div>

            <div id="chat-display" class="chat-display">
                <div class="message-bubble bg-gray-200">
                    <p class="text-gray-800">
                        Click 'Play Games' to start climbing! Click 'B' or 'P' to switch modes.
                    </p>
                </div>
            </div>
            <div class="input-area">
                <input id="chat-input" type="text" placeholder="Type the vowels you want to hear..." class="input-field focus:outline-none focus:ring-2 focus:ring-green-500"/>
                <button id="send-btn" class="send-btn">Send</button>
            </div>
        </div>
        
        <div id="random-game-options" class="hidden"></div>

        <!-- Pro Grid -->
        <div id="vowel-grid-pro" class="vowel-grid mt-6 hidden bg-white border border-gray-200 rounded-lg">
            <!-- Row 1 -->
            <div onclick="window.__mvlApp.handleVowelClick('အ', this)" data-base="အ" data-disp="အ" data-rom="a" class="vowel-item bg-blue-100 hover:bg-blue-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-blue-900">အ</span><span class="roman-text">a</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အာ', this)" data-base="အာ" data-disp="အာ" data-rom="ar" class="vowel-item bg-blue-100 hover:bg-blue-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-blue-900">အာ</span><span class="roman-text">ar</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အား', this)" data-base="အား" data-disp="အား" data-rom="ar:" class="vowel-item bg-blue-100 hover:bg-blue-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-blue-900">အား</span><span class="roman-text">ar:</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('၏', this)" data-base="၏" data-disp="၏" data-rom="i" data-indep="true" class="vowel-item bg-purple-100 hover:bg-purple-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">၏</span><span class="roman-text">i</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဤ', this)" data-base="ဤ" data-disp="ဤ" data-rom="ee" data-indep="true" class="vowel-item bg-purple-100 hover:bg-purple-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">ဤ</span><span class="roman-text">ee</span></div>
            <div class="vowel-item bg-transparent" style="pointer-events: none;"></div>

            <!-- Row 2 -->
            <div onclick="window.__mvlApp.handleVowelClick('အိ', this)" data-base="အိ" data-disp="အိ" data-rom="i." class="vowel-item bg-purple-100 hover:bg-purple-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">အိ</span><span class="roman-text">i.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အီ', this)" data-base="အီ" data-disp="အီ" data-rom="ee" class="vowel-item bg-purple-100 hover:bg-purple-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">အီ</span><span class="roman-text">ee</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အီး', this)" data-base="အီး" data-disp="အီး" data-rom="ee:" class="vowel-item bg-purple-100 hover:bg-purple-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-purple-900">အီး</span><span class="roman-text">ee:</span></div>
            <div id="r2-s4" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>
            <div id="r2-s5" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>
            <div id="r2-s6" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>

            <!-- Row 3 -->
            <div onclick="window.__mvlApp.handleVowelClick('အု', this)" data-base="အု" data-disp="အု" data-rom="u." class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">အု</span><span class="roman-text">u.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အူ', this)" data-base="အူ" data-disp="အူ" data-rom="uu" class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">အူ</span><span class="roman-text">uu</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အူး', this)" data-base="အူး" data-disp="အူး" data-rom="uu:" class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">အူး</span><span class="roman-text">uu:</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဥ', this)" data-base="ဥ" data-disp="ဥ" data-rom="u." data-indep="true" class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">ဥ</span><span class="roman-text">u.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဦ', this)" data-base="ဦ" data-disp="ဦ" data-rom="uu" data-indep="true" class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">ဦ</span><span class="roman-text">uu</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဦး', this)" data-base="ဦး" data-disp="ဦး" data-rom="uu:" data-indep="true" class="vowel-item bg-green-100 hover:bg-green-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-green-900">ဦး</span><span class="roman-text">uu:</span></div>

            <!-- Row 4 -->
            <div onclick="window.__mvlApp.handleVowelClick('အေ့', this)" data-base="အေ့" data-disp="အေ့" data-rom="ay." class="vowel-item bg-red-100 hover:bg-red-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-red-900">အေ့</span><span class="roman-text">ay.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အေ', this)" data-base="အေ" data-disp="အေ" data-rom="ay" class="vowel-item bg-red-100 hover:bg-red-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-red-900">အေ</span><span class="roman-text">ay</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အေး', this)" data-base="အေး" data-disp="အေး" data-rom="ay:" class="vowel-item bg-red-100 hover:bg-red-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-red-900">အေး</span><span class="roman-text">ay:</span></div>
            <div id="r4-s4" onclick="window.__mvlApp.handleVowelClick('ဧ', this)" data-base="ဧ" data-disp="ဧ" data-rom="ay" data-indep="true" class="vowel-item bg-red-100 hover:bg-red-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-red-900">ဧ</span><span class="roman-text">ay</span></div>
            <div id="r4-s5" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>
            <div id="r4-s6" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>

            <!-- Row 5 -->
            <div onclick="window.__mvlApp.handleVowelClick('အဲ့', this)" data-base="အဲ့" data-disp="အဲ့" data-rom="ell." class="vowel-item bg-teal-100 hover:bg-teal-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-teal-900">အဲ့</span><span class="roman-text">ell.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အယ်', this)" data-base="အယ်" data-disp="အယ်" data-rom="ell" class="vowel-item bg-teal-100 hover:bg-teal-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-teal-900">အယ်</span><span class="roman-text">ell</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အဲ', this)" data-base="အဲ" data-disp="အဲ" data-rom="ell" class="vowel-item bg-teal-100 hover:bg-teal-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-teal-900">အဲ</span><span class="roman-text">ell</span></div>
            <div id="r5-s4" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>
            <div id="r5-s5" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>
            <div id="r5-s6" class="vowel-item bg-transparent" style="visibility: hidden; pointer-events: none;"></div>

            <!-- Row 6 -->
            <div onclick="window.__mvlApp.handleVowelClick('အော့', this)" data-base="အော့" data-disp="အော့" data-rom="aw." class="vowel-item bg-orange-100 hover:bg-orange-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">အော့</span><span class="roman-text">aw.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အော်', this)" data-base="အော်" data-disp="အော်" data-rom="aw" class="vowel-item bg-orange-100 hover:bg-orange-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">အော်</span><span class="roman-text">aw</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အော', this)" data-base="အော" data-disp="အော" data-rom="aw" class="vowel-item bg-orange-100 hover:bg-orange-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">အော</span><span class="roman-text">aw</span></div>
            <div class="vowel-item bg-transparent" style="pointer-events: none;"></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဪ', this)" data-base="ဪ" data-disp="ဪ" data-rom="aw" data-indep="true" class="vowel-item bg-orange-100 hover:bg-orange-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">ဪ</span><span class="roman-text">aw</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('ဩ', this)" data-base="ဩ" data-disp="ဩ" data-rom="aw" data-indep="true" class="vowel-item bg-orange-100 hover:bg-orange-200"><span class="vowel-text text-xl sm:text-3xl font-semibold text-orange-900">ဩ</span><span class="roman-text">aw</span></div>

            <!-- Row 7 -->
            <div onclick="window.__mvlApp.handleVowelClick('အံ့', this)" data-base="အံ့" data-disp="အံ့" data-rom="ant" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အံ့</span><span class="roman-text">ant</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အံ', this)" data-base="အံ" data-disp="အံ" data-rom="an" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အံ</span><span class="roman-text">an</span></div>
            <div class="vowel-item bg-transparent" style="pointer-events: none;"></div>
            <div onclick="window.__mvlApp.handleVowelClick('အန့်', this)" data-base="အန့်" data-disp="အန့်" data-rom="ant" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အန့်</span><span class="roman-text">ant</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အန်', this)" data-base="အန်" data-disp="အန်" data-rom="an" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အန်</span><span class="roman-text">an</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အန်း', this)" data-base="အန်း" data-disp="အန်း" data-rom="an:" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အန်း</span><span class="roman-text">an:</span></div>

            <!-- Row 8 -->
            <div onclick="window.__mvlApp.handleVowelClick('အို့', this)" data-base="အို့" data-disp="အို့" data-rom="o." class="vowel-item bg-yellow-200 hover:bg-yellow-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-yellow-900">အို့</span><span class="roman-text">o.</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အို', this)" data-base="အို" data-disp="အို" data-rom="o" class="vowel-item bg-yellow-200 hover:bg-yellow-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-yellow-900">အို</span><span class="roman-text">o</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အိုး', this)" data-base="အိုး" data-disp="အိုး" data-rom="o:" class="vowel-item bg-yellow-200 hover:bg-yellow-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-yellow-900">အိုး</span><span class="roman-text">o:</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အမ့်', this)" data-base="အမ့်" data-disp="အမ့်" data-rom="amt" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အမ့်</span><span class="roman-text">amt</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အမ်', this)" data-base="အမ်" data-disp="အမ်" data-rom="am" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အမ်</span><span class="roman-text">am</span></div>
            <div onclick="window.__mvlApp.handleVowelClick('အမ်း', this)" data-base="အမ်း" data-disp="အမ်း" data-rom="am:" class="vowel-item bg-gray-200 hover:bg-gray-300"><span class="vowel-text text-xl sm:text-3xl font-semibold text-gray-900">အမ်း</span><span class="roman-text">am:</span></div>
        </div>
    </div>
    
    <div id="fireworks-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]"></div>

`;

export default function MyanmarVowelsLearningApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
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
    const rosterRef = doc(db, MVL_ROSTER_PATH, sanitizeMvlKey(studentName));
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
    const unsub = onSnapshot(collection(db, MVL_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Vowels Learning roster listen error:', e));
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

        // Audio mappings as before
        const singleAudioFile = 'https://raw.githubusercontent.com/nathantun93/bell/main/သရသံ_1s.mp3';
        const level1AllFile = 'https://raw.githubusercontent.com/nathantun93/bell/main/Level1All.mp3';

        const level1AllMap = {
            'က':0,'ကာ':1,'ကား':2,'ကိ':3,'ကီ':4,'ကီး':5,'ကု':6,'ကူ':7,'ကူး':8,'ကေ့':9,'ကေ':10,'ကေး':11,'ကဲ့':12,'ကယ်':13,'ကဲ':14,'ကော့':15,'ကော်':16,'ကော':17,'ကန့်':18,'ကန်':19,'ကန်း':20,'ကို့':21,'ကို':22,'ကိုး':23,'ခ':24,'ခါ':25,'ခါး':26,'ခိ':27,'ခီ':28,'ခီး':29,'ခု':30,'ခူ':31,'ခူး':32,'ခေ့':33,'ခေ':34,'ခေး':35,'ခဲ့':36,'ခယ်':37,'ခဲ':38,'ခေါ့':39,'ခေါ်':40,'ခေါ':41,'ခန့်':42,'ခန်':43,'ခန်း':44,'ခို့':45,'ခို':46,'ခိုး':47,'ဂ':48,'ဂါ':49,'ဂါး':50,'ဂိ':51,'ဂီ':52,'ဂီး':53,'ဂု':54,'ဂူ':55,'ဂူး':56,'ဂေ့':57,'ဂေ':58,'ဂေး':59,'ဂဲ့':60,'ဂယ်':61,'ဂဲ':62,'ဂေါ့':63,'ဂေါ်':64,'ဂေါ':65,'ဂန့်':66,'ဂန်':67,'ဂန်း':68,'ဂို့':69,'ဂို':70,'ဂိုး':71,'င':72,'ငါ':73,'ငါး':74,'ငိ':75,'ငီ':76,'ငီး':77,'ငု':78,'ငူ':79,'ငူး':80,'ငေ့':81,'ငေ':82,'ငေး':83,'ငဲ့':84,'ငယ်':85,'ငဲ':86,'ငေါ့':87,'ငေါ်':88,'ငေါ':89,'ငန့်':90,'ငန်':91,'ငန်း':92,'ငို့':93,'ငို':94,'ငိုး':95,'စ':96,'စာ':97,'စား':98,'စိ':99,'စီ':100,'စီး':101,'စု':102,'စူ':103,'စူး':104,'စေ့':105,'စေ':106,'စေး':107,'စဲ့':108,'စယ်':109,'စဲ':110,'စော့':111,'စော်':112,'စော':113,'စန့်':114,'စန်':115,'စန်း':116,'စို့':117,'စို':118,'စိုး':119,'ဇ':120,'ဇာ':121,'ဇား':122,'ဇိ':123,'ဇီ':124,'ဇီး':125,'ဇု':126,'ဇူ':127,'ဇူး':128,'ဇေ့':129,'ဇေ':130,'ဇေး':131,'ဇဲ့':132,'ဇယ်':133,'ဇဲ':134,'ဇော့':135,'ဇော်':136,'ဇော':137,'ဇန့်':138,'ဇန်':139,'ဇန်း':140,'ဇို့':141,'ဇို':142,'ဇိုး':143,'ည':144,'ညာ':145,'ညား':146,'ညိ':147,'ညီ':148,'ညီး':149,'ညု':150,'ညူ':151,'ညူး':152,'ညေ့':153,'ညေ':154,'ညေး':155,'ညဲ့':156,'ညယ်':157,'ညဲ':158,'ညော့':159,'ညော်':160,'ညော':161,'ညန့်':162,'ညန်':163,'ညန်း':164,'ညို့':165,'ညို':166,'ညိုး':167,'တ':168,'တာ':169,'တား':170,'တိ':171,'တီ':172,'တီး':173,'တု':174,'တူ':175,'တူး':176,'တေ့':177,'တေ':178,'တေး':179,'တဲ့':180,'တယ်':181,'တဲ':182,'တော့':183,'တော်':184,'တော':185,'တန့်':186,'တန်':187,'တန်း':188,'တို့':189,'တို':190,'တိုး':191,'ထ':192,'ထာ':193,'ထား':194,'ထိ':195,'ထီ':196,'ထီး':197,'ထု':198,'ထူ':199,'ထူး':200,'ထေ့':201,'ထေ':202,'ထေး':203,'ထဲ့':204,'ထယ်':205,'ထဲ':206,'ထော့':207,'ထော်':208,'ထော':209,'ထန့်':210,'ထန်':211,'ထန်း':212,'ထို့':213,'ထို':214,'ထိုး':215,'ဒ':216,'ဒါ':217,'ဒါး':218,'ဒိ':219,'ဒီ':220,'ဒီး':221,'ဒု':222,'ဒူ':223,'ဒူး':224,'ဒေ့':225,'ဒေ':226,'ဒေး':227,'ဒဲ့':228,'ဒယ်':229,'ဒဲ':230,'ဒေါ့':231,'ဒေါ်':232,'ဒေါ':233,'ဒန့်':234,'ဒန်':235,'ဒန်း':236,'ဒို့':237,'ဒို':238,'ဒိုး':239,'န':240,'နာ':241,'နား':242,'နိ':243,'နီ':244,'နီး':245,'နု':246,'နူ':247,'နူး':248,'နေ့':249,'နေ':250,'နေး':251,'နဲ့':252,'နယ်':253,'နဲ':254,'နော့':255,'နော်':256,'နော':257,'နန့်':258,'နန်':259,'နန်း':260,'နို့':261,'နို':262,'နိုး':263,'ပ':264,'ပါ':265,'ပါး':266,'ပိ':267,'ပီ':268,'ပီး':269,'ပု':270,'ပူ':271,'ပူး':272,'ပေ့':273,'ပေ':274,'ပေး':275,'ပဲ့':276,'ပယ်':277,'ပဲ':278,'ပေါ့':279,'ပေါ်':280,'ပေါ':281,'ပန့်':282,'ပန်':283,'ပန်း':284,'ပို့':285,'ပို':286,'ပိုး':287,'ဖ':288,'ဖာ':289,'ဖား':290,'ဖိ':291,'ဖီ':292,'ဖီး':293,'ဖု':294,'ဖူ':295,'ဖူး':296,'ဖေ့':297,'ဖေ':298,'ဖေး':299,'ဖဲ့':300,'ဖယ်':301,'ဖဲ':302,'ဖော့':303,'ဖော်':304,'ဖော':305,'ဖန့်':306,'ဖန်':307,'ဖန်း':308,'ဖို့':309,'ဖို':310,'ဖိုး':311,'ဗ':312,'ဗာ':313,'ဗား':314,'ဗိ':315,'ဗီ':316,'ဗီး':317,'ဗု':318,'ဗူ':319,'ဗူး':320,'ဗေ့':321,'ဗေ':322,'ဗေး':323,'ဗဲ့':324,'ဗယ်':325,'ဗဲ':326,'ဗော့':327,'ဗော်':328,'ဗော':329,'ဗန့်':330,'ဗန်':331,'ဗန်း':332,'ဗို့':333,'ဗို':334,'ဗိုး':335,'မ':336,'မာ':337,'မား':338,'မိ':339,'မီ':340,'မီး':341,'မု':342,'မူ':343,'မူး':344,'မေ့':345,'မေ':346,'မေး':347,'မဲ့':348,'မယ်':349,'မဲ':350,'မော့':351,'မော်':352,'မော':353,'မန့်':354,'မန်':355,'မန်း':356,'မို့':357,'မို':358,'မိုး':359,'ယ':360,'ယာ':361,'ယား':362,'ယိ':363,'ယီ':364,'ယီး':365,'ယု':366,'ယူ':367,'ယူး':368,'ယေ့':369,'ယေ':370,'ယေး':371,'ယဲ့':372,'ယယ်':373,'ယဲ':374,'ယော့':375,'ယော်':376,'ယော':377,'ယန့်':378,'ယန်':379,'ယန်း':380,'ယို့':381,'ယို':382,'ယိုး':383,'ရ':384,'ရာ':385,'ရား':386,'ရိ':387,'ရီ':388,'ရီး':389,'ရု':390,'ရူ':391,'ရူး':392,'ရေ့':393,'ရေ':394,'ရေး':395,'ရဲ့':396,'ရယ်':397,'ရဲ':398,'ရော့':399,'ရော်':400,'ရော':401,'ရန့်':402,'ရန်':403,'ရန်း':404,'ရို့':405,'ရို':406,'ရိုး':407,'လ':408,'လာ':409,'လား':410,'လိ':411,'လီ':412,'လီး':413,'လု':414,'လူ':415,'လူး':416,'လေ့':417,'လေ':418,'လေး':419,'လဲ့':420,'လယ်':421,'လဲ':422,'လော့':423,'လော်':424,'လော':425,'လန့်':426,'လန်':427,'လန်း':428,'လို့':429,'လို':430,'လိုး':431,'ဝ':432,'ဝါ':433,'ဝါး':434,'ဝိ':435,'ဝီ':436,'ဝီး':437,'ဝု':438,'ဝူ':439,'ဝူး':440,'ဝေ့':441,'ဝေ':442,'ဝေး':443,'ဝဲ့':444,'ဝယ်':445,'ဝဲ':446,'ဝေါ့':447,'ဝေါ်':448,'ဝေါ':449,'ဝန့်':450,'ဝန်':451,'ဝန်း':452,'ဝို့':453,'ဝို':454,'ဝိုး':455,'သ':456,'သာ':457,'သား':458,'သိ':459,'သီ':460,'သီး':461,'သု':462,'သူ':463,'သူး':464,'သေ့':465,'သေ':466,'သေး':467,'သဲ့':468,'သယ်':469,'သဲ':470,'သော့':471,'သော်':472,'သော':473,'သန့်':474,'သန်':475,'သန်း':476,'သို့':477,'သို':478,'သိုး':479,'ဟ':480,'ဟာ':481,'ဟား':482,'ဟိ':483,'ဟီ':484,'ဟီး':485,'ဟု':486,'ဟူ':487,'ဟူး':488,'ဟေ့':489,'ဟေ':490,'ဟေး':491,'ဟဲ့':492,'ဟယ်':493,'ဟဲ':494,'ဟော့':495,'ဟော်':496,'ဟော':497,'ဟန့်':498,'ဟန်':499,'ဟန်း':500,'ဟို့':501,'ဟို':502,'ဟိုး':503,'အ':504,'အာ':505,'အား':506,'အိ':507,'အီ':508,'အီး':509,'အု':510,'အူ':511,'အူး':512,'အေ့':513,'အေ':514,'အေး':515,'အဲ့':516,'အယ်':517,'အဲ':518,'အော့':519,'အော်':520,'အော':521,'အန့်':522,'အန်':523,'အန်း':524,'အို့':525,'အို':526,'အိုး':527,'ကျ':528,'ကျာ':529,'ကျား':530,'ကျိ':531,'ကျီ':532,'ကျီး':533,'ကျု':534,'ကျူ':535,'ကျူး':536,'ကျေ့':537,'ကျေ':538,'ကျေး':539,'ကျဲ့':540,'ကျယ်':541,'ကျဲ':542,'ကျော့':543,'ကျော်':544,'ကျော':545,'ကျန့်':546,'ကျန်':547,'ကျန်း':548,'ကျို့':549,'ကျို':550,'ကျိုး':551,'ချ':552,'ချာ':553,'ချား':554,'ချိ':555,'ချီ':556,'ချီး':557,'ချု':558,'ချူ':559,'ချူး':560,'ချေ့':561,'ချေ':562,'ချေး':563,'ချဲ့':564,'ချယ်':565,'ချဲ':566,'ချော့':567,'ချော်':568,'ချော':569,'ချန့်':570,'ချန်':571,'ချန်း':572,'ချို့':573,'ချို':574,'ချိုး':575,'ဂျ':576,'ဂျာ':577,'ဂျား':578,'ဂျိ':579,'ဂျီ':580,'ဂျီး':581,'ဂျု':582,'ဂျူ':583,'ဂျူး':584,'ဂျေ့':585,'ဂျေ':586,'ဂျေး':587,'ဂျဲ့':588,'ဂျယ်':589,'ဂျဲ':590,'ဂျော့':591,'ဂျော်':592,'ဂျော':593,'ဂျန့်':594,'ဂျန်':595,'ဂျန်း':596,'ဂျို့':597,'ဂျို':598,'ဂျိုး':599,'ပျ':600,'ပျာ':601,'ပျား':602,'ပျိ':603,'ပျီ':604,'ပျီး':605,'ပျု':606,'ပျူ':607,'ပျူး':608,'ပျေ့':609,'ပျေ':610,'ပျေး':611,'ပျဲ့':612,'ပျယ်':613,'ပျဲ':614,'ပျော့':615,'ပျော်':616,'ပျော':617,'ပျန့်':618,'ပျန်':619,'ပျန်း':620,'ပျို့':621,'ပျို':622,'ပျိုး':623,'ဖျ':624,'ဖျာ':625,'ဖျား':626,'ဖျိ':627,'ဖျီ':628,'ဖျီး':629,'ဖျု':630,'ဖျူ':631,'ဖျူး':632,'ဖျေ့':633,'ဖျေ':634,'ဖျေး':635,'ဖျဲ့':636,'ဖျယ်':637,'ဖျဲ':638,'ဖျော့':639,'ဖျော်':640,'ဖျော':641,'ဖျန့်':642,'ဖျန်':643,'ဖျန်း':644,'ဖျို့':645,'ဖျို':646,'ဖျိုး':647,'ဗျ':648,'ဗျာ':649,'ဗျား':650,'ဗျိ':651,'ဗျီ':652,'ဗျီး':653,'ဗျု':654,'ဗျူ':655,'ဗျူး':656,'ဗျေ့':657,'ဗျေ':658,'ဗျေး':659,'ဗျဲ့':660,'ဗျယ်':661,'ဗျဲ':662,'ဗျော့':663,'ဗျော်':664,'ဗျော':665,'ဗျန့်':666,'ဗျန်':667,'ဗျန်း':668,'ဗျို့':669,'ဗျို':670,'ဗျိုး':671,'မျ':672,'မျာ':673,'များ':674,'မျိ':675,'မျီ':676,'မျီး':677,'မျု':678,'မျူ':679,'မျူး':680,'မျေ့':681,'မျေ':682,'မျေး':683,'မျဲ့':684,'မျယ်':685,'မျဲ':686,'မျော့':687,'မျော်':688,'မျော':689,'မျန့်':690,'မျန်':691,'မျန်း':692,'မျို့':693,'မျို':694,'မျိုး':695,'လျ':696,'လျာ':697,'လျား':698,'လျု':699,'လျူ':700,'လျူး':701,'လျော့':702,'လျော်':703,'လျော':704,'လျန့်':705,'လျန်':706,'လျန်း':707,'လျို့':708,'လျို':709,'လျိုး':710,'ကွ':711,'ကွာ':712,'ကွား':713,'ကွိ':714,'ကွီ':715,'ကွီး':716,'ကွေ့':717,'ကွေ':718,'ကွေး':719,'ကွဲ့':720,'ကွယ်':721,'ကွဲ':722,'ခွ':723,'ခွါ':724,'ခွါး':725,'ခွိ':726,'ခွီ':727,'ခွီး':728,'ခွေ့':729,'ခွေ':730,'ခွေး':731,'ခွဲ့':732,'ခွယ်':733,'ခွဲ':734,'ဂွ':735,'ဂွါ':736,'ဂွါး':737,'ဂွိ':738,'ဂွီ':739,'ဂွီး':740,'ဂွေ့':741,'ဂွေ':742,'ဂွေး':743,'ဂွဲ့':744,'ဂွယ်':745,'ဂွဲ':746,'ငွ':747,'ငွာ':748,'ငွား':749,'ငွိ':750,'ငွီ':751,'ငွီး':752,'ငွေ့':753,'ငွေ':754,'ငွေး':755,'ငွဲ့':756,'ငွယ်':757,'ငွဲ':758,'စွ':759,'စွာ':760,'စွား':761,'စွိ':762,'စွီ':763,'စွီး':764,'စွေ့':765,'စွေ':766,'စွေး':767,'စွဲ့':768,'စွယ်':769,'စွဲ':770,'ဇွ':771,'ဇွာ':772,'ဇွား':773,'ဇွိ':774,'ဇွီ':775,'ဇွီး':776,'ဇွေ့':777,'ဇွေ':778,'ဇွေး':779,'ဇွဲ့':780,'ဇွယ်':781,'ဇွဲ':782,'ညွ':783,'ညွာ':784,'ညွား':785,'ညွိ':786,'ညွီ':787,'ညွီး':788,'ညွေ့':789,'ညွေ':790,'ညွေး':791,'ညွဲ့':792,'ညွယ်':793,'ညွဲ':794,'တွ':795,'တွာ':796,'တွား':797,'တွိ':798,'တွီ':799,'တွီး':800,'တွေ့':801,'တွေ':802,'တွေး':803,'တွဲ့':804,'တွယ်':805,'တွဲ':806,'ထွ':807,'ထွာ':808,'ထွား':809,'ထွိ':810,'ထွီ':811,'ထွီး':812,'ထွေ့':813,'ထွေ':814,'ထွေး':815,'ထွဲ့':816,'ထွယ်':817,'ထွဲ':818,'ဒွ':819,'ဒွါ':820,'ဒွါး':821,'ဒွိ':822,'ဒွီ':823,'ဒွီး':824,'ဒွေ့':825,'ဒွေ':826,'ဒွေး':827,'ဒွဲ့':828,'ဒွယ်':829,'ဒွဲ':830,'နွ':831,'နွာ':832,'နွား':833,'နွိ':834,'နွီ':835,'နွီး':836,'နွေ့':837,'နွေ':838,'နွေး':839,'နွဲ့':840,'နွယ်':841,'နွဲ':842,'ပွ':843,'ပွါ':844,'ပွါး':845,'ပွိ':846,'ပွီ':847,'ပွီး':848,'ပွေ့':849,'ပွေ':850,'ပွေး':851,'ပွဲ့':852,'ပွယ်':853,'ပွဲ':854,'ဖွ':855,'ဖွာ':856,'ဖွား':857,'ဖွိ':858,'ဖွီ':859,'ဖွီး':860,'ဖွေ့':861,'ဖွေ':862,'ဖွေး':863,'ဖွဲ့':864,'ဖွယ်':865,'ဖွဲ':866,'ဗွ':867,'ဗွာ':868,'ဗွား':869,'ဗွိ':870,'ဗွီ':871,'ဗွီး':872,'ဗွေ့':873,'ဗွေ':874,'ဗွေး':875,'ဗွဲ့':876,'ဗွယ်':877,'ဗွဲ':878,'မွ':879,'မွာ':880,'မွား':881,'မွိ':882,'မွီ':883,'မွီး':884,'မွေ့':885,'မွေ':886,'မွေး':887,'မွဲ့':888,'မွယ်':889,'မွဲ':890,'ယွ':891,'ယွာ':892,'ယွား':893,'ယွိ':894,'ယွီ':895,'ယွီး':896,'ယွေ့':897,'ယွေ':898,'ယွေး':899,'ယွဲ့':900,'ယွယ်':901,'ယွဲ':902,'လွ':903,'လွာ':904,'လွား':905,'လွိ':906,'လွီ':907,'လွီး':908,'လွေ့':909,'လွေ':910,'လွေး':911,'လွဲ့':912,'လွယ်':913,'လွဲ':914,'သွ':915,'သွာ':916,'သွား':917,'သွိ':918,'သွီ':919,'သွီး':920,'သွေ့':921,'သွေ':922,'သွေး':923,'သွဲ့':924,'သွယ်':925,'သွဲ':926,'ဟွ':927,'ဟွာ':928,'ဟွား':929,'ဟွိ':930,'ဟွီ':931,'ဟွီး':932,'ဟွေ့':933,'ဟွေ':934,'ဟွေး':935,'ဟွဲ့':936,'ဟွယ်':937,'ဟွဲ':938,'ငှ':939,'ငှာ':940,'ငှား':941,'ငှိ':942,'ငှီ':943,'ငှီး':944,'ငှု':945,'ငှူ':946,'ငှူး':947,'ငှေ့':948,'ငှေ':949,'ငှေး':950,'ငှဲ့':951,'ငှယ်':952,'ငှဲ':953,'ငှော့':954,'ငှော်':955,'ငှော':956,'ငှန့်':957,'ငှန်':958,'ငှန်း':959,'ငှို့':960,'ငှို':961,'ငှိုး':962,'ညှ':963,'ညှာ':964,'ညှား':965,'ညှိ':966,'ညှီ':967,'ညှီး':968,'ညှု':969,'ညှူ':970,'ညှူး':971,'ညှေ့':972,'ညှေ':973,'ညှေး':974,'ညှဲ့':975,'ညှယ်':976,'ညှဲ':977,'ညှော့':978,'ညှော်':979,'ညှော':980,'ညှန့်':981,'ညှန်':982,'ညှန်း':983,'ညှို့':984,'ညှို':985,'ညှိုး':986,'နှ':987,'နှာ':988,'နှား':989,'နှိ':990,'နှီ':991,'နှီး':992,'နှု':993,'နှူ':994,'နှူး':995,'နှေ့':996,'နှေ':997,'နှေး':998,'နှဲ့':999,'နှယ်':1000,'နှဲ':1001,'နှော့':1002,'နှော်':1003,'နှော':1004,'နှန့်':1005,'နှန်':1006,'နှန်း':1007,'နှို့':1008,'နှို':1009,'နှိုး':1010,'မှ':1011,'မှာ':1012,'မှား':1013,'မှိ':1014,'မှီ':1015,'မှီး':1016,'မှု':1017,'မှူ':1018,'မှူး':1019,'မှေ့':1020,'မှေ':1021,'မှေး':1022,'မှဲ့':1023,'မှယ်':1024,'မှဲ':1025,'မှော့':1026,'မှော်':1027,'မှော':1028,'မှန့်':1029,'မှန်':1030,'မှန်း':1031,'မှို့':1032,'မှို':1033,'မှိုး':1034,'ယှ':1035,'ယှာ':1036,'ယှား':1037,'ယှိ':1038,'ယှီ':1039,'ယှီး':1040,'ယှု':1041,'ယှူ':1042,'ယှူး':1043,'ယှေ့':1044,'ယှေ':1045,'ယှေး':1046,'ယှဲ့':1047,'ယှယ်':1048,'ယှဲ':1049,'ယှော့':1050,'ယှော်':1051,'ယှော':1052,'ယှန့်':1053,'ယှန်':1054,'ယှန်း':1055,'ယှို့':1056,'ယှို':1057,'ယှိုး':1058,'လှ':1059,'လှာ':1060,'လှား':1061,'လှိ':1062,'လှီ':1063,'လှီး':1064,'လှု':1065,'လှူ':1066,'လှူး':1067,'လှေ့':1068,'လှေ':1069,'လှေး':1070,'လှဲ့':1071,'လှယ်':1072,'လှဲ':1073,'လှော့':1074,'လှော်':1075,'လှော':1076,'လှန့်':1077,'လှန်':1078,'လှန်း':1079,'လှို့':1080,'လှို':1081,'လှိုး':1082,'ဝှ':1083,'ဝှာ':1084,'ဝှား':1085,'ဝှိ':1086,'ဝှီ':1087,'ဝှီး':1088,'ဝှု':1089,'ဝှူ':1090,'ဝှူး':1091,'ဝှေ့':1092,'ဝှေ':1093,'ဝှေး':1094,'ဝှဲ့':1095,'ဝှယ်':1096,'ဝှဲ':1097,'ဝှော့':1098,'ဝှော်':1099,'ဝှော':1100,'ဝှန့်':1101,'ဝှန်':1102,'ဝှန်း':1103,'ဝှို့':1104,'ဝှို':1105,'ဝှိုး':1106,'ကျွ':1107,'ကျွာ':1108,'ကျွား':1109,'ကျွိ':1110,'ကျွီ':1111,'ကျွီး':1112,'ကျွေ့':1113,'ကျွေ':1114,'ကျွေး':1115,'ကျွဲ့':1116,'ကျွယ်':1117,'ကျွဲ':1118,'ချွ':1119,'ချွာ':1120,'ချွား':1121,'ချွေ့':1122,'ချွေ':1123,'ချွေး':1124,'ချွဲ့':1125,'ချွယ်':1126,'ချွဲ':1127,'မြွ':1128,'မြွာ':1129,'မြွား':1130,'မြွေ့':1131,'မြွေ':1132,'မြွေး':1133,'မျှ':1134,'မျှာ':1135,'မျှား':1136,'မျှိ':1137,'မျှီ':1138,'မျှီး':1139,'မျှု':1140,'မျှူ':1141,'မျှူး':1142,'မျှေ့':1143,'မျှေ':1144,'မျှေး':1145,'မျှဲ့':1146,'မျှယ်':1147,'မျှဲ':1148,'မျှော့':1149,'မျှော်':1150,'မျှော':1151,'မျှန့်':1152,'မျှန်':1153,'မျှန်း':1154,'မျှို့':1155,'မျှို':1156,'မျှိုး':1157,'လျှ':1158,'လျှာ':1159,'လျှား':1160,'လျှိ':1161,'လျှီ':1162,'လျှီး':1163,'လျှု':1164,'လျှူ':1165,'လျှူး':1166,'လျှေ့':1167,'လျှေ':1168,'လျှေး':1169,'လျှဲ့':1170,'လျှယ်':1171,'လျှဲ':1172,'လျှော့':1173,'လျှော်':1174,'လျှော':1175,'လျှန့်':1176,'လျှန်':1177,'လျှန်း':1178,'လျှို့':1179,'လျှို':1180,'လျှိုး':1181,'ညွှ':1182,'ညွှာ':1183,'ညွှား':1184,'ညွှိ':1185,'ညွှီ':1186,'ညွှီး':1187,'ညွှေ့':1188,'ညွှေ':1189,'ညွှေး':1190,'ညွှဲ့':1191,'ညွှယ်':1192,'ညွှဲ':1193,'နွှ':1194,'နွှာ':1195,'နွှား':1196,'နွှိ':1197,'နွှီ':1198,'နွှီး':1199,'နွှေ့':1200,'နွှေ':1201,'နွှေး':1202,'နွှဲ့':1203,'နွှယ်':1204,'နွှဲ':1205,'မွှ':1206,'မွှာ':1207,'မွှား':1208,'မွှိ':1209,'မွှီ':1210,'မွှီး':1211,'မွှေ့':1212,'မွှေ':1213,'မွှေး':1214,'မွှဲ့':1215,'မွှယ်':1216,'မွှဲ':1217,'ယွှ':1218,'ယွှာ':1219,'ယွှား':1220,'ယွှိ':1221,'ယွှီ':1222,'ယွှီး':1223,'ယွှေ့':1224,'ယွှေ':1225,'ယွှေး':1226,'ယွှဲ့':1227,'ယွှယ်':1228,'ယွှဲ':1229,'လွှ':1230,'လွှာ':1231,'လွှား':1232,'လွှိ':1233,'လွှီ':1234,'လွှီး':1235,'လွှေ့':1236,'လွှေ':1237,'လွှေး':1238,'လွှဲ့':1239,'လွှယ်':1240,'လွှဲ':1241,'ယွှန့်':1242,'ယွှန်':1243,'ယွှန်း':1244,'ညွန့်':1245,'ညွန်':1246,'ညွန်း':1247,'ဂျွန့်':1248,'ဂျွန်':1249,'ဂျွန်း':1250,'မွှန့်':1251,'မွှန်':1252,'မွှန်း':1253
        };

        const vowelTimeMap = {
            'အ': 1, 'အာ': 2, 'အား': 3, '၏': 4, 'ဤ': 5, 'အိ': 4, 'အီ': 5, 'အီး': 6,
            'အည့်': 4, 'အည်': 5, 'အည်း': 6, 'ဥ': 7, 'ဦ': 8, 'ဦး': 9, 'အု': 7, 'အူ': 8,
            'အူး': 9, 'အေ': 11, 'အေ့': 10, 'အေး': 12, 'ဧ': 11, 'အယ်': 14, 'အဲ့': 13, 'အယ့်': 13,
            'အဲ': 15, 'အော': 18, 'အော့': 16, 'အော်': 17, 'အံ': 23, 'အံ့': 22, 'အန်': 23,
            'အန့်': 22, 'အန်း': 24, 'အမ်': 23, 'အမ့်': 22, 'အမ်း': 24, 'အို': 20, 'အို့': 19, 'အိုး': 21,
            'ဩ': 18, 'ဪ': 17 
        };

        const basicVowelsList = ['အ', 'အာ', 'အိ', 'အီ', 'အု', 'အူ', 'အေ', 'အဲ', 'အော', 'အော်', 'အံ', 'အို']; 
        const proVowelsList = Object.keys(vowelTimeMap).filter(v => v.length > 0); 
        const basicVowelPairs = [['အ', 'အာ'], ['အိ', 'အီ'], ['အု', 'အူ'], ['အေ', 'အဲ'], ['အော', 'အော်'], ['အံ', 'အို']];
        const proLevel1Groups = [
            ['အ', 'အာ', 'အား'], ['အိ', 'အီ', 'အီး'], ['အု', 'အူ', 'အူး'], ['အေ့', 'အေ', 'အေး'],
            ['အဲ့', 'အယ်', 'အဲ'], ['အော့', 'အော်', 'အော'], ['အံ့', 'အံ'], ['အို့', 'အို', 'အိုး']
        ];
        const proVowelStage1Sequences = [
            ['အ', 'အာ', 'အား'], ['အိ', 'အီ', 'အီး'], ['အု', 'အူ', 'အူး'], ['အေ့', 'အေ', 'အေး'],
            ['အဲ့', 'အယ်', 'အဲ'], ['အော့', 'အော်', 'အော'], ['အံ့', 'အံ'], ['အို့', 'အို', 'အိုး']
        ]; 
        const proVowelStage2Sequences = [
            ['၏', 'ဤ'], ['အည့်', 'အည်', 'အည်း'], ['ဥ', 'ဦ', 'ဦး'], ['ဧ'],
            ['_အေ့', '_အေ', '_အေး'], ['_အဲ့', '_အယ်', '_အဲ'], ['ဪ', 'ဩ'], 
            ['အန့်', 'အန်', 'အန်း'], ['အမ့်', 'အမ်', 'အမ်း']
        ]; 

        const romanConsonants = {
            'က':'k', 'ခ':'kh', 'ဂ':'g', 'ဃ':'gh', 'င':'ng', 'စ':'s', 'ဆ':'hs', 'ဇ':'z', 'ဈ':'zh', 'ည':'ny',
            'တ':'t', 'ထ':'ht', 'ဒ':'d', 'ဓ':'dh', 'န':'n', 'ပ':'p', 'ဖ':'hp', 'ဗ':'b', 'ဘ':'bh', 'မ':'m',
            'ယ':'y', 'ရ':'r', 'လ':'l', 'ဝ':'w', 'သ':'th', 'ဟ':'h', 'အ':'',
            'ကျ':'ky', 'ကြ':'kr', 'ချ':'ch', 'ဗျ':'by', 'လှ':'hl', 'ပြ':'py', 'ဖြ':'hpy', 'ရှ':'sh', 'မှ':'hm'
        };

        const allowedConsonants = {
           'i-sound-yi': ['စ', 'ည', 'န', 'မ', 'သ', 'ကျ', 'ကြ', 'ချ', 'ဗျ'],
           'ai-sound-yi': ['ဆ', 'တ', 'ထ', 'န', 'မ', 'လ', 'လှ', 'သ', 'မှ'],
           'e-sound-yi': ['ပြ', 'ရ', 'ဖြ', 'ရှ']
        };

        // UI Elements
        const chatInput = byId('chat-input');
        const sendBtn = byId('send-btn');
        const chatDisplay = byId('chat-display');
        const chatContainer = byId('chat-box-container'); 
        const gameFeedback = byId('game-feedback');
        const giftPackageModal = byId('gift-package-modal'); 
        const gameMenuModal = byId('game-menu-modal');
        const basicGrid = byId('vowel-grid-basic');
        const proGrid = byId('vowel-grid-pro');
        const randomGameOptions = byId('random-game-options');
        const progressUI = byId('game-progress-ui');
        const climberIcon = byId('climber');
        const progressText = byId('progress-text');
        
        // Game State Variables
        let currentTargetScore = 25; 
        let maxLivesForThisGame;
        let currentScore = 0;
        let currentGameType = null;
        let currentGameLevel = 1;
        
        let currentC = 'အ';
        let currentMode = 'B';
        let currentVowelList = basicVowelsList;
        
        // Loop controls
        let gameLoopInterval = null;
        let currentQuestionPool = [];
        let originalFullPool = [];
        let currentTypingVowels = [];
        let currentClickSequence = [];
        let playerClickSequenceIndex = 0;
        let isHintSequenceActive = false;
        let randomGameCurrentAnswer = '';
        
        let isReadingAloud = false;
        let audioUnlocked = false;

        const vowelAudio = new Audio(singleAudioFile);
        const level1AllAudio = new Audio(level1AllFile);
        let currentAudio = null;
        let audioStopTimer = null;
        let fireworksInterval = null;

        // Initialization
        const runMasterInit = () => {
            vowelAudio.preload = 'auto';
            level1AllAudio.preload = 'auto';
            initConsonantModal();
            proGrid.classList.add('hidden');
        };

        // --- Core UI Modals & Menus ---
        function openGameMenu() {
            if(isReadingAloud) return;
            unlockAudio();
            
            const listenContainer = byId('listen-menu-options');
            const clickContainer = byId('click-menu-options');
            const typeContainer = byId('type-menu-options');

            if (currentMode === 'B') {
                listenContainer.innerHTML = `
                    <button class="level-btn border-indigo-500 text-indigo-600 hover:bg-indigo-500" onclick="window.__mvlApp.startGameSession('listen', 1)">Level 1</button>
                    <button class="level-btn border-indigo-500 text-indigo-600 hover:bg-indigo-500" onclick="window.__mvlApp.startGameSession('listen', 2)">Level 2</button>
                `;
                clickContainer.innerHTML = `
                    <button class="level-btn border-green-500 text-green-600 hover:bg-green-500" onclick="window.__mvlApp.startGameSession('click', 1)">Level 1</button>
                    <button class="level-btn border-green-500 text-green-600 hover:bg-green-500" onclick="window.__mvlApp.startGameSession('click', 2)">Level 2</button>
                    <button class="level-btn border-green-500 text-green-600 hover:bg-green-500" onclick="window.__mvlApp.startGameSession('click', 3)">Level 3</button>
                `;
                typeContainer.innerHTML = `
                    <button class="level-btn border-pink-500 text-pink-600 hover:bg-pink-500" onclick="window.__mvlApp.startGameSession('type', 1)">Level 1</button>
                    <button class="level-btn border-pink-500 text-pink-600 hover:bg-pink-500" onclick="window.__mvlApp.startGameSession('type', 2)">Level 2</button>
                    <button class="level-btn border-pink-500 text-pink-600 hover:bg-pink-500" onclick="window.__mvlApp.startGameSession('type', 3)">Level 3</button>
                `;
            } else {
                listenContainer.innerHTML = `
                    <button class="level-btn border-indigo-500 text-indigo-600 hover:bg-indigo-500" onclick="window.__mvlApp.startGameSession('listen', 1)">Level 1</button>
                    <button class="level-btn border-indigo-500 text-indigo-600 hover:bg-indigo-500" onclick="window.__mvlApp.startGameSession('listen', 2)">Level 2</button>
                `;
                clickContainer.innerHTML = `
                    <button class="level-btn border-green-500 text-green-600 hover:bg-green-500" onclick="window.__mvlApp.startGameSession('click', 1)">Play</button>
                `;
                typeContainer.innerHTML = `
                    <button class="level-btn border-pink-500 text-pink-600 hover:bg-pink-500" onclick="window.__mvlApp.startGameSession('type', 1)">Play</button>
                `;
            }
            
            gameMenuModal.classList.remove('hidden');
        }

        function closeGameMenu() {
            gameMenuModal.classList.add('hidden');
        }

        // --- Core Game Progress Logic ---
        const startGameSession = function(type, level) {
            closeGameMenu();
            currentGameType = type;
            currentGameLevel = level;
            currentScore = 0;

            let targetCount = 25;
            maxLivesForThisGame = 5;

            // Generate question pool dynamically based on game type and mode
            if (currentMode === 'B') {
                targetCount = 25;
                maxLivesForThisGame = 5;
                if (level === 1) originalFullPool = [...basicVowelPairs];
                else if (level === 2) originalFullPool = (type === 'listen') ? [...basicVowelsList] : basicVowelsList.map(v => [v]);
                else if (level === 3) originalFullPool = Array.from({length: 25}, () => Array.from({length: 3}, () => basicVowelsList[Math.floor(Math.random() * basicVowelsList.length)]));
            } else {
                if (type === 'listen') {
                    targetCount = 25;
                    maxLivesForThisGame = 5;
                    if (level === 1) {
                        // Level 1 Listen in Pro Mode: All visible groups (both Stage 1 and Stage 2)
                        originalFullPool = [...proVowelStage1Sequences, ...proVowelStage2Sequences].filter(isSequenceVisible);
                    } else if (level === 2) {
                        originalFullPool = currentVowelList.filter(v => findVowelElement(v) && findVowelElement(v).style.visibility !== 'hidden');
                    }
                } else {
                    // Combined Level for Pro Click & Type
                    // Exact calculation of visible sequences
                    originalFullPool = [...proVowelStage1Sequences, ...proVowelStage2Sequences].filter(isSequenceVisible);
                    targetCount = originalFullPool.length;
                    maxLivesForThisGame = targetCount < 14 ? 3 : 5;
                }
            }

            if (originalFullPool.length === 0) {
                stopGame();
                createMessage("No questions available for this level.", false);
                return;
            }

            currentQuestionPool = [];
            
            // Loop until targetCount for Basic mode and Pro-Listen mode
            if (currentMode === 'B' || (currentMode === 'P' && type === 'listen')) {
                while (currentQuestionPool.length < targetCount) {
                    let shuffled = [...originalFullPool].sort(() => Math.random() - 0.5);
                    currentQuestionPool = currentQuestionPool.concat(shuffled);
                }
                currentQuestionPool = currentQuestionPool.slice(0, targetCount);
            } else {
                // For Pro Click and Pro Type, use exact number without repetition
                currentQuestionPool = [...originalFullPool].sort(() => Math.random() - 0.5);
            }
            
            currentTargetScore = targetCount;
            
            // Clean up previous states
            clearInterval(gameLoopInterval);
            clearInterval(fireworksInterval);
            if(currentAudio) currentAudio.pause();
            giftPackageModal.style.display = 'none';

            // Show UI
            progressUI.classList.remove('hidden');
            chatDisplay.classList.add('hidden');
            chatContainer.classList.add('game-active');
            gameFeedback.classList.remove('hidden');
            randomGameOptions.classList.add('hidden');
            
            const activeGrid = currentMode === 'B' ? basicGrid : proGrid;
            activeGrid.classList.add('game-mode-grid');
            rootEl.querySelectorAll('.vowel-item').forEach(item => item.classList.add('hide-roman'));
            if (currentMode === 'B') proGrid.classList.add('hidden');
            else basicGrid.classList.add('hidden');

            rootEl.querySelectorAll('.vowel-item').forEach(item => item.classList.remove('masked'));
            chatInput.value = '';
            chatInput.disabled = (type === 'click' || type === 'listen');
            
            if(type === 'type') chatInput.placeholder = "Type what you hear...";
            else chatInput.placeholder = "Disabled during this game";

            updateProgressUI();
            
            gameFeedback.innerHTML = `<p class="text-2xl font-bold text-indigo-600 animate-pulse">Get ready...</p>`;

            playIntroSequence(() => {
                if (type === 'listen') startListenRound();
                else if (type === 'click') startClickRound();
                else if (type === 'type') startTypeRound();
            });
        };

        const stopGame = function() {
            clearInterval(gameLoopInterval);
            clearInterval(fireworksInterval);
            if(currentAudio) currentAudio.pause();
            
            progressUI.classList.add('hidden');
            chatDisplay.classList.remove('hidden');
            chatContainer.classList.remove('game-active');
            gameFeedback.classList.add('hidden');
            randomGameOptions.classList.add('hidden');
            
            const activeGrid = currentMode === 'B' ? basicGrid : proGrid;
            activeGrid.classList.remove('game-mode-grid');
            rootEl.querySelectorAll('.vowel-item').forEach(item => item.classList.remove('hide-roman'));
            chatInput.disabled = false;
            chatInput.placeholder = "Type the vowels you want to hear...";
            
            byId('replay-sound-btn').classList.add('hidden');
            currentGameType = null;
            createMessage("Game stopped.", false);
        };

        function updateProgressUI() {
            // Ensure score doesn't go below 0 visually
            if (currentScore < 0) currentScore = 0;
            // Climber height maxes at ~85% so it stays inside the mountain
            climberIcon.style.bottom = `${(currentScore / currentTargetScore) * 85}%`;
            progressText.textContent = `${currentScore} / ${currentTargetScore}`;
        }

        function gainPoint() {
            currentScore++;
            updateProgressUI();
            if (currentScore >= currentTargetScore) {
                gameWin();
                return true;
            }
            return false;
        }

        function handleWrongAnswer(wrongAnswerDisplay) {
            let dropped = false;
            if (currentScore > 0) {
                currentScore--;
                dropped = true;
            }
            updateProgressUI();
            
            let html = `<p class="text-3xl font-bold text-red-600">❌ Incorrect!</p>`;
            if (wrongAnswerDisplay) {
                html += `<p class="text-gray-700 mt-1">Correct answer: <strong>${wrongAnswerDisplay}</strong></p>`;
            }
            
            if (dropped) {
                html += `<p class="text-red-500 mt-2 text-sm font-bold animate-bounce">↓ Moved down one step on the mountain</p>`;
                // Add an extra question to the pool to make up for the lost point
                let extraQuestion = originalFullPool[Math.floor(Math.random() * originalFullPool.length)];
                currentQuestionPool.push(extraQuestion);
            }

            gameFeedback.innerHTML = html;
            return false;
        }

        function gameWin() {
            clearInterval(gameLoopInterval);
            gameFeedback.innerHTML = `<p class="text-3xl font-bold text-yellow-600">🎉 Success!</p>`;
            
            giftPackageModal.style.display = 'grid';
            
            let count = 0;
            fireworksInterval = setInterval(() => {
                triggerFireworks();
                count++;
                if(count > 8) clearInterval(fireworksInterval); // Fire for ~4 seconds
            }, 500);

            setTimeout(() => {
                giftPackageModal.style.display = 'none';
                stopGame();
            }, 5000);
        }

        // Helper to check if two values are practically the same (for distractor logic)
        function isSameItem(a, b) {
            if (Array.isArray(a) && Array.isArray(b)) return a.join(',') === b.join(',');
            return a === b;
        }

        // --- Random Sound (Listen) Game Logic ---
        function startListenRound() {
            randomGameOptions.classList.remove('hidden');
            randomGameOptions.innerHTML = '';
            
            if (currentQuestionPool.length === 0) return;

            const targetItem = currentQuestionPool[0];
            randomGameCurrentAnswer = targetItem;
            
            // Collect distractors ensuring no duplicates
            let distractors = [];
            let uniqueDistractors = [];
            
            originalFullPool.forEach(item => {
                if (!isSameItem(item, targetItem)) {
                    if (!uniqueDistractors.some(d => isSameItem(d, item))) {
                        uniqueDistractors.push(item);
                    }
                }
            });
            
            while(distractors.length < 2 && uniqueDistractors.length > 0) {
                const idx = Math.floor(Math.random() * uniqueDistractors.length);
                distractors.push(uniqueDistractors.splice(idx, 1)[0]);
            }
            
            let choices = [targetItem, ...distractors];
            choices.sort(() => Math.random() - 0.5);

            choices.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'option-button text-xl md:text-2xl';
                btn.textContent = Array.isArray(item) ? item.map(v => getDisplayedText(v)).join(' ') : getDisplayedText(item);
                btn.onclick = () => checkListenAnswer(item, btn);
                randomGameOptions.appendChild(btn);
            });

            gameFeedback.innerHTML = `<p class="text-lg text-indigo-600">👂 Listen carefully...</p>`;
            
            const playSound = () => {
                if (Array.isArray(randomGameCurrentAnswer)) playSequence(randomGameCurrentAnswer);
                else playAudio(randomGameCurrentAnswer);
            };
            
            setTimeout(playSound, 500);
            clearInterval(gameLoopInterval);
            gameLoopInterval = setInterval(playSound, 5000);
        }

        function checkListenAnswer(selectedChoice, btn) {
            clearInterval(gameLoopInterval);
            if (currentAudio) currentAudio.pause();

            let isCorrect = Array.isArray(randomGameCurrentAnswer) 
                ? (selectedChoice.join('') === randomGameCurrentAnswer.join(''))
                : (selectedChoice === randomGameCurrentAnswer);

            randomGameOptions.querySelectorAll('.option-button').forEach(b => {
                b.onclick = null;
                b.style.cursor = 'default';
                let bValue = b.textContent.replace(/\s/g, ''); 
                let answerValue = (Array.isArray(randomGameCurrentAnswer) ? randomGameCurrentAnswer.map(v => getDisplayedText(v)).join('') : getDisplayedText(randomGameCurrentAnswer)).replace(/\s/g, '');
                if (bValue === answerValue) b.classList.add('correct');
            });

            if (isCorrect) {
                gameFeedback.innerHTML = `<p class="text-2xl text-green-600">✅ Correct!</p>`;
                currentQuestionPool.shift(); 
                if(!gainPoint()) setTimeout(startListenRound, 1500);
            } else {
                btn.classList.add('wrong');
                let answerText = Array.isArray(randomGameCurrentAnswer) ? randomGameCurrentAnswer.map(v => getDisplayedText(v)).join(' ') : getDisplayedText(randomGameCurrentAnswer);
                currentQuestionPool.push(currentQuestionPool.shift());
                handleWrongAnswer(answerText);
                setTimeout(startListenRound, 2500);
            }
        }

        // --- Clicking Game Logic ---
        function startClickRound() {
            playerClickSequenceIndex = 0;
            isHintSequenceActive = false;
            removeAllHints();
            
            if(currentQuestionPool.length === 0) return;
            currentClickSequence = currentQuestionPool[0];

            byId('replay-sound-btn').classList.remove('hidden');
            gameFeedback.innerHTML = `<p class="text-lg text-green-600">👆 Click the sequence of sounds you heard!</p>`;
            
            const playSound = () => playSequence(currentClickSequence);
            setTimeout(playSound, 500);
        }

        function handleVowelClick(baseKey, element) {
            unlockAudio();
            if(!baseKey || currentGameType !== 'click') {
                if(!currentGameType) playAudio(baseKey);
                return;
            }
            
            const allVowelItems = rootEl.querySelectorAll('.vowel-item');
            allVowelItems.forEach(item => item.classList.add('no-clicks'));
            setTimeout(() => allVowelItems.forEach(item => item.classList.remove('no-clicks')), 400);

            element.style.transform = 'scale(0.9)';
            setTimeout(() => element.style.transform = 'scale(1)', 100);

            if (baseKey === currentClickSequence[playerClickSequenceIndex]) {
                removeAllHints();
                playAudio(baseKey);
                playerClickSequenceIndex++;
                
                if (isHintSequenceActive && playerClickSequenceIndex < currentClickSequence.length) {
                    setTimeout(showClickingHint, 200); 
                }

                if (playerClickSequenceIndex === currentClickSequence.length) {
                    isHintSequenceActive = false;
                    gameFeedback.innerHTML = `<p class="text-2xl text-green-600">✅ Sequence is correct!</p>`;
                    currentQuestionPool.shift();
                    if(!gainPoint()) setTimeout(startClickRound, 1500);
                }
            } else {
                handleWrongAnswer("Incorrect sequence");
                isHintSequenceActive = true;
                showClickingHint();
                playerClickSequenceIndex = 0;
                setTimeout(() => {
                    gameFeedback.innerHTML = `<p class="text-lg text-green-600">👆 Please try again!</p>`;
                    playSequence(currentClickSequence);
                }, 2000);
            }
        }

        function showClickingHint() {
            const correctVowel = currentClickSequence[playerClickSequenceIndex];
            const correctElement = findVowelElement(correctVowel);
            if (correctElement && correctElement.style.visibility !== 'hidden') {
                if (!correctElement.querySelector('.hint-pointer')) {
                    const hint = document.createElement('div');
                    hint.className = 'hint-pointer absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-10 h-10 pointer-events-none z-20';
                    hint.style.animation = 'pointUp 1.2s infinite ease-in-out';
                    hint.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(251, 146, 60, 0.9)" stroke="white" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>`;
                    correctElement.appendChild(hint);
                    correctElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => { if (hint.parentElement) hint.remove(); }, 3000);
                }
            }
        }
        function removeAllHints() { rootEl.querySelectorAll('.hint-pointer').forEach(hint => hint.remove()); }

        // --- Typing Game Logic ---
        function startTypeRound() {
            if(currentQuestionPool.length === 0) return;
            currentTypingVowels = currentQuestionPool[0];
            
            gameFeedback.innerHTML = `<p class="text-lg text-pink-600">⌨️ ကြားရတဲ့ အသံတွေကို ရိုက်ထည့်ပါ!</p>`;
            
            const playSound = () => playSequence(currentTypingVowels);
            setTimeout(playSound, 500);
            clearInterval(gameLoopInterval);
            gameLoopInterval = setInterval(playSound, 7000);
        }

        function checkTypingAnswer(input) {
            if(currentGameType !== 'type') return;
            const cleanedInput = input.replace(/\s/g, '');
            const correctString = currentTypingVowels.map(v => getDisplayedText(v)).join('').replace(/\s/g, '');
            
            if (cleanedInput === correctString) {
                gameFeedback.innerHTML = `<p class="text-2xl text-green-600">✅ မှန်ပါတယ်!</p>`;
                currentQuestionPool.shift();
                if(!gainPoint()) setTimeout(startTypeRound, 1500);
            } else {
                const correctTextDisp = currentTypingVowels.map(v => getDisplayedText(v)).join(' ');
                currentQuestionPool.push(currentQuestionPool.shift());
                handleWrongAnswer(correctTextDisp);
                setTimeout(startTypeRound, 2500);
            }
        }


        // --- Auxiliary & Setup Functions ---
        function isSequenceVisible(seq) {
            return seq.every(baseKey => {
                const el = rootEl.querySelector(`.vowel-item[data-base="${baseKey}"]`);
                return el && el.style.visibility !== 'hidden';
            });
        }
        
        async function playIntroSequence(callback) {
            if (isReadingAloud) return;
            isReadingAloud = true;
            rootEl.querySelectorAll('.vowel-item').forEach(item => item.classList.remove('hide-roman'));
            
            gameFeedback.classList.remove('hidden');
            gameFeedback.innerHTML = `<p class="text-lg text-blue-600 font-bold animate-pulse">👂 Listening...</p>`;
            
            let sequencesToRead = (currentMode === 'B') ? basicVowelPairs : [...proVowelStage1Sequences, ...proVowelStage2Sequences].filter(isSequenceVisible);

            for (const sequence of sequencesToRead) {
                for (const vowel of sequence) {
                    const element = findVowelElement(vowel);
                    if (element && element.style.visibility !== 'hidden') {
                        element.classList.add('highlight-reading');
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await playAudio(vowel);
                        await new Promise(resolve => setTimeout(resolve, 150));
                        element.classList.remove('highlight-reading');
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            isReadingAloud = false;
            if (currentGameType) rootEl.querySelectorAll('.vowel-item').forEach(item => item.classList.add('hide-roman'));
            if (callback) callback();
        }

        async function readAloud() {
            if (isReadingAloud || currentGameType) return;
            unlockAudio();
            playIntroSequence(null);
        }

        function findVowelElement(baseKey) {
            const gridId = (currentMode === 'B') ? '#vowel-grid-basic' : '#vowel-grid-pro';
            const grid = rootEl.querySelector(gridId);
            if (!grid) return null;
            return grid.querySelector(`.vowel-item[data-base="${baseKey}"]`);
        }

        function getDisplayedText(baseKey) {
            const el = rootEl.querySelector(`.vowel-item[data-base="${baseKey}"]`);
            if (el && el.style.visibility !== 'hidden') {
                const textEl = el.querySelector('.vowel-text');
                if (textEl) return textEl.textContent;
            }
            return baseKey;
        }

        function createMessage(text, isUser = false) {
            if (currentGameType) return; 
            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isUser ? 'bg-green-100 ml-auto' : 'bg-gray-200 mr-auto'}`; 
            bubble.innerHTML = text;
            chatDisplay.prepend(bubble);
        }

        function handleTextInput() {
            unlockAudio();
            const input = chatInput.value;
            if (!input.trim()) return;

            if (currentGameType === 'type') {
                chatInput.value = '';
                checkTypingAnswer(input);
                return;
            }

            if (currentGameType) {
                createMessage("Typing is disabled during this game.", false);
                return;
            }
            
            createMessage(input, true);
            chatInput.value = '';

            const validVowels = Object.keys(vowelTimeMap).sort((a, b) => b.length - a.length);
            let remainingText = input.trim();
            const parsed = [];
            while (remainingText.length > 0) {
                let matched = validVowels.find(v => remainingText.startsWith(v));
                if (matched) {
                    parsed.push(matched);
                    remainingText = remainingText.substring(matched.length);
                } else {
                    remainingText = remainingText.substring(1);
                }
            }

            if (parsed.length > 0) playSequence(parsed);
            else createMessage(`Sorry, I could not find audio for '${input}'.`, false);
        }

        sendBtn.addEventListener('click', handleTextInput);
        chatInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleTextInput());

        function triggerFireworks() {
            const container = byId('fireworks-container');
            if (!container) return;
            const fireworksCount = 50; 
            const colors = ['#ffc700', '#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff'];

            for (let i = 0; i < fireworksCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                particle.style.left = `${vw / 2}px`;
                particle.style.top = `${vh / 2}px`;
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                
                container.appendChild(particle);

                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * (vw/3) + 20; 
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                setTimeout(() => {
                    particle.style.transform = `translate(${x}px, ${y}px) scale(0)`;
                    particle.style.opacity = '0';
                }, 10);
                
                setTimeout(() => particle.remove(), 1010);
            }
        }

        // --- Audio Aliasing & Logic (From original) ---
        function resolveAudioKey(word) {
            const consonantAliases = {
                'ဃ': 'ဂ', 'ယျ': 'ယ', 'ဆ': 'စ', 'ဈ': 'ဇ', 'ဋ': 'တ', 'ဌ': 'ထ', 'ဍ': 'ဒ',
                'ဎ': 'ဒ', 'ဓ': 'ဒ', 'ဏ': 'န', 'ဘ': 'ဗ', 'ဠ': 'လ', 'ရ': 'ယ', 'ကြ': 'ကျ',
                'ခြ': 'ချ', 'ဂြ': 'ဂျ', 'ငြ': 'ည', 'ပြ': 'ပျ', 'ဖြ': 'ဖျ', 'ဗြ': 'ဗျ',
                'မြ': 'မျ', 'ဆွ': 'စွ', 'ဓွ': 'ဒွ', 'ဘွ': 'ဗွ', 'ရွ': 'ယွ', 'ရွှ': 'ယွှ',
                'ဏှ': 'နှ', 'ကြွ': 'ကျွ', 'ခြွ': 'ချွ', 'မြှ': 'မျှ', 'ရှ': 'ယှ'
            };
            if (!word) return null;
            const exactAliases = { 'ကိုယ့်': 'ကို့', 'ကိုယ်': 'ကို' };
            if (exactAliases[word]) word = exactAliases[word];

            const isBaseVowel = /^အ/.test(word) || ['ဥ','ဦ','ဦး','ဧ','ဩ','ဪ','၏','ဤ'].includes(word) || word.startsWith('_အ');
            if (isBaseVowel) {
                let baseKey = word.startsWith('_') ? word.substring(1) : word;
                if (vowelTimeMap[baseKey] !== undefined) return { file: 'old', time: vowelTimeMap[baseKey] };
            }

            if (word.startsWith('_')) word = word.substring(1);

            word = word.replace(/ံ့$/, 'န့်').replace(/မ့်$/, 'န့်').replace(/ံ$/, 'န်').replace(/မ်$/, 'န်').replace(/မ်း$/, 'န်း');

            if (word.endsWith('ည့်') || word.endsWith('ည်') || word.endsWith('ည်း')) {
                let vowelPart = word.endsWith('ည့်') ? 'ည့်' : (word.endsWith('ည်း') ? 'ည်း' : 'ည်');
                let c = word.substring(0, word.length - vowelPart.length);
                let mappedVowel = '';

                if (allowedConsonants['i-sound-yi'].includes(c) || allowedConsonants['i-sound-yi'].includes(consonantAliases[c] || c)) {
                    if (vowelPart === 'ည့်') mappedVowel = 'ိ';
                    if (vowelPart === 'ည်') mappedVowel = 'ီ';
                    if (vowelPart === 'ည်း') mappedVowel = 'ီး';
                } 
                else if (allowedConsonants['e-sound-yi'].includes(c) || allowedConsonants['e-sound-yi'].includes(consonantAliases[c] || c)) {
                    if (vowelPart === 'ည့်') mappedVowel = 'ေ့';
                    if (vowelPart === 'ည်') mappedVowel = 'ေ';
                    if (vowelPart === 'ည်း') mappedVowel = 'ေး';
                } 
                else if (allowedConsonants['ai-sound-yi'].includes(c) || allowedConsonants['ai-sound-yi'].includes(consonantAliases[c] || c)) {
                    if (vowelPart === 'ည့်') mappedVowel = 'ဲ့';
                    if (vowelPart === 'ည်') mappedVowel = 'ယ်';
                    if (vowelPart === 'ည်း') mappedVowel = 'ဲ';
                } 
                else { 
                    if (vowelPart === 'ည့်') mappedVowel = 'ိ';
                    if (vowelPart === 'ည်') mappedVowel = 'ီ';
                    if (vowelPart === 'ည်း') mappedVowel = 'ီး';
                }
                word = c + mappedVowel;
            }


            const sortedAliases = Object.keys(consonantAliases).sort((a, b) => b.length - a.length);
            for (let prefix of sortedAliases) {
                if (word.startsWith(prefix)) {
                    word = consonantAliases[prefix] + word.substring(prefix.length);
                    break; 
                }
            }

            if (level1AllMap[word] !== undefined) return { file: 'new', time: level1AllMap[word] };
            let altWord1 = word.replace(/ာ/g, 'ါ');
            if (level1AllMap[altWord1] !== undefined) return { file: 'new', time: level1AllMap[altWord1] };
            let altWord2 = word.replace(/ါ/g, 'ာ');
            if (level1AllMap[altWord2] !== undefined) return { file: 'new', time: level1AllMap[altWord2] };

            return null;
        }

        function playAudio(baseKey) {
            return new Promise((resolve) => {
                if (currentAudio) { currentAudio.pause(); currentAudio.onended = null; currentAudio.onerror = null; }
                clearTimeout(audioStopTimer);

                let actualWord = getDisplayedText(baseKey);
                if (['အည့်', 'အည်', 'အည်း', '_အေ့', '_အေ', '_အေး', '_အဲ့', '_အယ်', '_အဲ'].includes(baseKey)) {
                     let mappedSuffix = '';
                     if (baseKey === 'အည့်') mappedSuffix = 'ိ';
                     if (baseKey === 'အည်') mappedSuffix = 'ီ';
                     if (baseKey === 'အည်း') mappedSuffix = 'ီး';
                     if (baseKey === '_အေ့') mappedSuffix = 'ေ့';
                     if (baseKey === '_အေ') mappedSuffix = 'ေ';
                     if (baseKey === '_အေး') mappedSuffix = 'ေး';
                     if (baseKey === '_အဲ့') mappedSuffix = 'ဲ့';
                     if (baseKey === '_အယ်') mappedSuffix = 'ယ်';
                     if (baseKey === '_အဲ') mappedSuffix = 'ဲ';
                     actualWord = currentC + mappedSuffix;
                }

                const audioInfo = resolveAudioKey(actualWord);
                if (!audioInfo) { resolve(); return; }

                let targetAudio = audioInfo.file === 'old' ? vowelAudio : level1AllAudio;
                let startTime = audioInfo.file === 'old' ? audioInfo.time - 1 : audioInfo.time;
                if (startTime < 0) { resolve(); return; }

                currentAudio = targetAudio;

                const playAfterSeek = () => {
                    currentAudio.removeEventListener('seeked', playAfterSeek);
                    const playPromise = currentAudio.play();
                    audioStopTimer = setTimeout(() => { currentAudio.pause(); resolve(); }, 1000); 
                    if (playPromise !== undefined) playPromise.catch(() => { clearTimeout(audioStopTimer); resolve(); });
                };
                currentAudio.addEventListener('seeked', playAfterSeek, { once: true });
                currentAudio.currentTime = startTime;
            });
        }

        async function playSequence(words) { for (const word of words) await playAudio(word); }
        
        function unlockAudio() {
            if (audioUnlocked) return;
            if (vowelAudio) { vowelAudio.volume = 0; vowelAudio.play().catch(()=>{}); vowelAudio.pause(); vowelAudio.currentTime = 0; vowelAudio.volume = 1; }
            if (level1AllAudio) { level1AllAudio.volume = 0; level1AllAudio.play().catch(()=>{}); level1AllAudio.pause(); level1AllAudio.currentTime = 0; level1AllAudio.volume = 1; }
            audioUnlocked = true;
        }

        // --- Consonant Selection Logic ---
        function openConsonantModal() { byId('consonant-modal').classList.remove('hidden'); }
        function closeConsonantModal() { byId('consonant-modal').classList.add('hidden'); }

        function initConsonantModal() {
            const grid = byId('consonant-grid');
            grid.innerHTML = '';
            const consonantsList = [
                'က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ဇ', 'ဈ', 'ည', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဗ', 'ဘ', 'မ', 
                'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'အ', 'ကျ', 'ကြ', 'ချ', 'ဗျ', 'လှ', 'ပြ', 'ဖြ', 'ရှ', 'မှ'
            ];
            const specialConsonants = ['စ', 'ည', 'န', 'မ', 'သ', 'ကျ','ကြ', 'ချ', 'ဗျ', 'ပြ', 'ရ', 'ဖြ', 'ရှ', 'ဆ', 'တ', 'ထ', 'လ', 'လှ', 'မှ'];

            consonantsList.forEach(c => {
                const btn = document.createElement('button');
                btn.className = specialConsonants.includes(c) 
                    ? 'p-2 sm:p-3 text-lg sm:text-2xl font-bold bg-cyan-100 text-cyan-900 rounded-xl hover:bg-cyan-200 border-2 border-cyan-400 transition-colors shadow-sm'
                    : 'p-2 sm:p-3 text-lg sm:text-2xl font-bold bg-yellow-100 text-yellow-900 rounded-xl hover:bg-yellow-200 border border-yellow-300 transition-colors';
                btn.textContent = c;
                btn.onclick = () => {
                    currentC = c;
                    byId('btn-consonant').textContent = currentC;
                    updateGridsWithConsonant();
                    closeConsonantModal();
                };
                grid.appendChild(btn);
            });
        }

        function combineConsonantAndVowel(c, baseVowel) {
            if (c === 'အ') return baseVowel;
            const independentMap = { 'ဥ':'ု', 'ဦ':'ူ', 'ဦး':'ူး', 'ဧ':'ေ', 'ဩ':'ော', 'ဪ':'ော်', '၏':'၏', 'ဤ':'ီ' };
            let vowelPart = baseVowel;
            
            if (independentMap[baseVowel]) {
                if (baseVowel === '၏' || baseVowel === 'ဤ') return c + independentMap[baseVowel]; 
                vowelPart = 'အ' + independentMap[baseVowel];
            }
            if (vowelPart.startsWith('အ')) vowelPart = vowelPart.substring(1);
            if (['ခ', 'ဂ', 'င', 'ဒ', 'ပ', 'ဝ'].includes(c)) vowelPart = vowelPart.replace(/ာ/g, 'ါ');
            return c + vowelPart;
        }

        function setDynSlot(el, base, disp, rom, group, colorClasses, isVisible) {
            if (!el) return;
            if (!isVisible) { el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; el.removeAttribute('data-disp'); el.innerHTML = ''; return; }
            el.style.visibility = 'visible'; el.style.pointerEvents = 'auto';
            el.className = `vowel-item ${colorClasses}`;
            el.setAttribute('data-base', base); el.setAttribute('data-disp', disp); el.setAttribute('data-rom', rom);
            if(group) el.setAttribute('data-group', group); else el.removeAttribute('data-group');
            el.onclick = function() { handleVowelClick(base, this); };
            el.innerHTML = `<span class="vowel-text text-xl sm:text-3xl font-semibold"></span><span class="roman-text"></span>`;
        }

        function updateGridsWithConsonant() {
            if (currentMode === 'P') {
                ['r2-s4', 'r2-s5', 'r2-s6', 'r4-s4', 'r4-s5', 'r4-s6', 'r5-s4', 'r5-s5', 'r5-s6'].forEach(id => {
                    const el = byId(id);
                    if (el) { el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; el.removeAttribute('data-disp'); el.className = 'vowel-item bg-transparent'; el.innerHTML = ''; el.onclick = null; el.removeAttribute('data-indep'); }
                });

                rootEl.querySelectorAll('[data-indep="true"]').forEach(el => {
                    el.style.visibility = (currentC === 'အ') ? 'visible' : 'hidden';
                    el.style.pointerEvents = (currentC === 'အ') ? 'auto' : 'none';
                });

                if (currentC === 'အ') {
                    setDynSlot(byId('r4-s4'), 'ဧ', 'ဧ', 'ay', '', 'bg-red-100 hover:bg-red-200 text-red-900', true);
                    byId('r4-s4').setAttribute('data-indep', 'true');
                } else if (allowedConsonants['i-sound-yi'].includes(currentC)) {
                    setDynSlot(byId('r2-s4'), 'အည့်', 'အည့်', 'i.', 'i-sound-yi', 'bg-purple-100 hover:bg-purple-200 text-purple-900', true);
                    setDynSlot(byId('r2-s5'), 'အည်', 'အည်', 'ee', 'ee-sound-yi', 'bg-purple-100 hover:bg-purple-200 text-purple-900', true);
                    setDynSlot(byId('r2-s6'), 'အည်း', 'အည်း', 'ee:', 'ee-sound-yi', 'bg-purple-100 hover:bg-purple-200 text-purple-900', true);
                } else if (allowedConsonants['e-sound-yi'].includes(currentC)) {
                    setDynSlot(byId('r4-s4'), '_အေ့', 'အည့်', 'ay.', 'ay-sound-yi', 'bg-red-100 hover:bg-red-200 text-red-900', true);
                    setDynSlot(byId('r4-s5'), '_အေ', 'အည်', 'ay', 'ay-sound-yi', 'bg-red-100 hover:bg-red-200 text-red-900', true);
                    setDynSlot(byId('r4-s6'), '_အေး', 'အည်း', 'ay:', 'ay-sound-yi', 'bg-red-100 hover:bg-red-200 text-red-900', true);
                } else if (allowedConsonants['ai-sound-yi'].includes(currentC)) {
                    setDynSlot(byId('r5-s4'), '_အဲ့', 'အည့်', 'ell.', 'ell-sound-yi', 'bg-teal-100 hover:bg-teal-200 text-teal-900', true);
                    setDynSlot(byId('r5-s5'), '_အယ်', 'အည်', 'ell', 'ell-sound-yi', 'bg-teal-100 hover:bg-teal-200 text-teal-900', true);
                    setDynSlot(byId('r5-s6'), '_အဲ', 'အည်း', 'ell:', 'ell-sound-yi', 'bg-teal-100 hover:bg-teal-200 text-teal-900', true);
                }
            }

            rootEl.querySelectorAll('.vowel-item').forEach(item => {
                if(!item.hasAttribute('data-disp') || item.classList.contains('bg-transparent') || item.style.visibility === 'hidden') return; 
                const disp = item.getAttribute('data-disp');
                const romSuffix = item.getAttribute('data-rom');
                const newText = combineConsonantAndVowel(currentC, disp);
                const romPrefix = romanConsonants[currentC] !== undefined ? romanConsonants[currentC] : '';
                
                const vowelTextEl = item.querySelector('.vowel-text');
                const romanTextEl = item.querySelector('.roman-text');
                if (vowelTextEl) vowelTextEl.textContent = newText;
                if (romanTextEl) romanTextEl.textContent = romPrefix + romSuffix;
            });
        }

        const switchMode = function(mode) {
            if (currentGameType || isReadingAloud) {
                createMessage("Please stop the current game before switching modes.", false);
                return;
            }

            if (currentMode === mode) return;

            currentMode = mode;
            currentC = 'အ'; 
            byId('btn-consonant').textContent = currentC;
            
            const btnB = byId('btn-mode-b');
            const btnP = byId('btn-mode-p');

            if (mode === 'B') {
                currentVowelList = basicVowelsList;
                basicGrid.classList.remove('hidden');
                proGrid.classList.add('hidden');
                btnB.className = "fixed top-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-indigo-600 text-white border-4 border-indigo-300 transform hover:scale-110";
                btnP.className = "fixed bottom-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-white text-gray-600 border-4 border-gray-300 hover:bg-gray-100 transform hover:scale-110";
            } else { 
                currentVowelList = proVowelsList;
                basicGrid.classList.add('hidden');
                proGrid.classList.remove('hidden');
                btnP.className = "fixed bottom-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-green-500 text-white border-4 border-green-300 transform hover:scale-110";
                btnB.className = "fixed top-6 left-6 w-14 h-14 rounded-full font-bold text-2xl shadow-lg z-50 flex items-center justify-center transition-all bg-white text-gray-600 border-4 border-gray-300 hover:bg-gray-100 transform hover:scale-110";
            }
            updateGridsWithConsonant();
        }
        function replayCurrentSound() {
    if (currentGameType === 'click' && currentClickSequence.length > 0) {
        playSequence(currentClickSequence);
    }
}


        // Namespaced bridge for the onclick="..." strings embedded in the
        // HTML above (inline handlers always resolve via the global scope,
        // but these functions are declared inside this component's closure)
        // — namespaced (not bare window.switchMode etc.) so a same-named
        // function from a different hybrid-wrapped app mounted alongside
        // this one can't silently overwrite it.
        window.__mvlApp = {
          stopGame, closeConsonantModal, closeGameMenu, switchMode,
          openConsonantModal, readAloud, openGameMenu, replayCurrentSound,
          handleVowelClick, startGameSession,
        };

        runMasterInit();

    return () => {
      delete window.__mvlApp;
    };
  }, []);

  return (
    <>
      <style>{MVL_APP_CSS}</style>
      <div
        ref={containerRef}
        className="mvl-app-root bg-gray-100"
        dangerouslySetInnerHTML={{ __html: MVL_APP_BODY_HTML }}
      />
      {!hideOwnOnlineBadge && (
      <>
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-3 right-3 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
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
