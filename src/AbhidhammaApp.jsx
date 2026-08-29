import React, { useState, useEffect, useRef, useMemo } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc, arrayUnion, onSnapshot, query, orderBy, serverTimestamp, addDoc, getDoc, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { 
    BookOpen, Edit2, Zap, RotateCw, Upload, Download, CheckCircle, 
    MessageCircle, Send, Heart, Trophy, Timer, Pause, 
    ChevronDown, ChevronRight, Gamepad2, X, ExternalLink, Youtube, Music, User,
    Baby, Compass, Map, Ship, Globe, Sparkles, Image as ImageIcon, Wand2, Lock, CheckCheck,
    AlertCircle, ArrowUp, ArrowDown, Key, ChevronLeft, Users, UserCheck, UserX, Circle, Trash2, Bell,
    ToggleLeft, ToggleRight
} from 'lucide-react';
import { auth, db } from './firebase';

// Abhidhamma app uses its own Firestore data path, separate from TutoringApp
const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';
const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
const IMG_BASE_URL = 'https://raw.githubusercontent.com/nathantun93/dhamma4/main/';
const AUDIO_BASE_URL = 'https://raw.githubusercontent.com/nathantun93/bell/main/';
const TEACHER_PASSCODE = "1";

const AGE_GROUPS = {
    storytellers: { label: 'Storytellers (Ages 5-)', icon: <Baby className="w-4 h-4"/>, length: 'short (approx 150 words)', pages: '0.5 pages' },
    explorers:    { label: 'Explorers (Ages 6-8)',   icon: <Compass className="w-4 h-4"/>, length: 'medium (approx 300 words)', pages: '1 page' },
    adventurers:  { label: 'Adventurers (Ages 9-11)',icon: <Map className="w-4 h-4"/>, length: 'long (approx 450 words)', pages: '1.5 pages' },
    voyagers:     { label: 'Voyagers (Ages 12+)',    icon: <Ship className="w-4 h-4"/>, length: 'detailed (approx 600 words)', pages: '2 pages' }
};

// --- API Helpers ---
const generateContent = async (prompt, systemInstruction) => {
    const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] }, generationConfig: { responseMimeType: "application/json" } };
    let attempt = 0;
    while (attempt < 3) {
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
            throw new Error("No content");
        } catch (e) { attempt++; if (attempt === 3) throw e; await new Promise(r => setTimeout(r, 1000)); }
    }
};

const translateText = async (text, targetLang) => {
    const prompt = `Translate the following text to ${targetLang === 'en' ? 'English' : 'Burmese'}: "${text}"`;
    return generateContent(prompt, `You are a translator. Return JSON: { "translatedText": string }`);
};

const generateSingleVariant = async (title, content, group) => {
    const conf = AGE_GROUPS[group];
    const toneMap = { storytellers: "TONE: Very simple, playful, and warm.", explorers: "TONE: Simple, clear, and engaging.", adventurers: "TONE: Conversational and descriptive.", voyagers: "TONE: Mature, reflective, and detailed." };
    const prompt = `Base Title: "${title}"\nBase Content: "${content}"\nINSTRUCTIONS FOR AGE GROUP: ${group} (${conf.label})\n1. Analyze the Base Content for image filenames (e.g., 000101.png) AND LINKS (e.g., YouTube URLs).\n2. Generate a version of this lesson. Length: ${conf.length}. ${toneMap[group]||""}\n3. Provide an "englishTitle" and 10 "discussionQuestions" in English.\n4. PRESERVE LINKS. Use formatting: **bold**, *italics*, ==highlight==.\n5. CRITICAL: Split the content into paragraphs. You MUST insert exactly one image filename from the Base Content after EACH paragraph in BOTH the burmese and english text. DO NOT SKIP IMAGES.\n6. Generate EXACTLY 10 multiple-choice questions for the quiz (English Only). Each question MUST have EXACTLY 4 options.\n7. IMPORTANT LANGUAGE RULE: Use very simple language appropriate for children. Strictly minimize the use of complex Pali words or difficult vocabulary in the Burmese text.\nRespond strictly with this JSON structure:\n{ "englishTitle": "string", "burmese": "string (with image filenames interspersed)", "english": "string (with image filenames interspersed)", "discussionQuestions": ["string","string","string","string","string","string","string","string","string","string"], "quiz": { "questions": [{ "question": "string", "options": ["string","string","string","string"], "correctAnswerIndex": 0 }] } }`;
    return generateContent(prompt, "You are an expert curriculum developer. You strictly return JSON. You ALWAYS include the exact image filenames from the source text into your generated text.");
};

const generateLessonVariants = async (title, content, mode) => {
    const targetGroups = mode === 'junior' ? ['storytellers', 'explorers'] : ['adventurers', 'voyagers'];
    const results = {};
    const completed = await Promise.all(targetGroups.map(async (g) => ({ group: g, data: await generateSingleVariant(title, content, g) })));
    completed.forEach(item => { results[item.group] = item.data; });
    return results;
};

// --- Sub-Components ---
const AudioPlayer = ({ src }) => {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null);
    const togglePlay = () => {
        if (!audioRef.current) { audioRef.current = new Audio(src); audioRef.current.onended = () => setPlaying(false); }
        if (playing) audioRef.current.pause(); else audioRef.current.play().catch(e => console.error(e));
        setPlaying(!playing);
    };
    return <button onClick={togglePlay} className="inline-flex items-center gap-1 px-2 py-1 bg-pink-600/20 text-pink-400 rounded-full hover:bg-pink-600/40 transition border border-pink-500/30 mx-1">{playing ? <Pause className="w-4 h-4" /> : <Music className="w-4 h-4" />}<span className="text-xs font-bold">Play</span></button>;
};

const SmartContent = ({ text }) => {
    if (!text) return null;
    const formatText = (content) => {
        const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|==.*?==)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx} className="text-yellow-200 font-bold">{part.slice(2,-2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*')) return <em key={idx} className="text-indigo-300 italic">{part.slice(1,-1)}</em>;
            if (part.startsWith('==') && part.endsWith('==')) return <span key={idx} className="bg-yellow-600/40 px-1 rounded text-white border border-yellow-500/30 mx-0.5">{part.slice(2,-2)}</span>;
            return part;
        });
    };
    const regex = /((?:https?:\/\/[^\s]+)|(?:\b[\w-]+\.(?:png|jpg|jpeg|gif|mp3)\b))/gi;
    const parts = text.split(regex);
    return (
        <span className="leading-relaxed">
            {parts.map((part, i) => {
                if (!part) return null;
                const isUrl = part.match(/^https?:\/\//i);
                const isImage = part.match(/\.(png|jpg|jpeg|gif)$/i);
                const isAudio = part.match(/\.mp3$/i);
                if (isUrl) {
                    if (part.match(/(youtube\.com|youtu\.be)/i)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-400 hover:text-red-300 mx-1 font-semibold"><Youtube className="w-5 h-5 mr-1"/> Video</a>;
                    if (isAudio) return <AudioPlayer key={i} src={part}/>;
                    if (isImage) return <div key={i} className="my-2"><img src={part} className="max-w-full h-auto rounded-lg shadow-md border border-gray-600 mx-auto" onError={e=>e.target.style.display='none'}/></div>;
                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center mx-1">Link <ExternalLink className="w-3 h-3 ml-1"/></a>;
                }
                if (isImage) return <div key={i} className="my-2"><img src={`${IMG_BASE_URL}${part}`} className="max-w-full h-auto rounded-lg shadow-md border border-gray-600 mx-auto" onError={e=>e.target.style.display='none'}/></div>;
                if (isAudio) return <AudioPlayer key={i} src={`${AUDIO_BASE_URL}${part}`}/>;
                return <span key={i}>{formatText(part)}</span>;
            })}
        </span>
    );
};

const LeaderboardView = ({ leaderboard, title, onClose, loading, isGlobal = false, currentUserId }) => (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-700 relative animate-bounce-in">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
            <div className="text-center mb-6"><Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2"/><h3 className="text-2xl font-black text-white">{title}</h3></div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {loading ? <RotateCw className="animate-spin mx-auto text-white"/> : (
                    leaderboard.length > 0 ? leaderboard.map((entry, idx) => {
                        const isMe = entry.userId === currentUserId;
                        return <div key={idx} className={`flex justify-between items-center p-3 rounded ${isMe ? 'bg-indigo-600 border border-indigo-400' : 'bg-gray-700'}`}><div className="flex items-center gap-3"><span className={`font-bold w-6 ${isMe ? 'text-white' : 'text-yellow-400'}`}>#{idx+1}</span><span className={`font-semibold ${isMe ? 'text-white' : 'text-white'}`}>{entry.name}{isMe && <span className="text-[10px] bg-white text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-2">ME</span>}</span></div><span className={`font-mono font-bold ${isMe ? 'text-white' : 'text-indigo-300'}`}>{entry.score} pts</span></div>;
                    }) : <p className="text-center text-gray-500">No scores yet.</p>
                )}
            </div>
        </div>
    </div>
);

const QuizModule = ({ lessonId, lessonTitle, userId, userName, ageGroup, quizData, onClose }) => {
    const [gameState, setGameState] = useState('playing');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showOptions, setShowOptions] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedbackStatus, setFeedbackStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);

    useEffect(() => { if (gameState !== 'playing' || showOptions) return; const t1 = setTimeout(() => setShowOptions(true), 5000); return () => clearTimeout(t1); }, [gameState, showOptions, currentQIndex]);
    useEffect(() => { if (gameState !== 'playing' || !showOptions || isProcessing) return; const timer = setInterval(() => setTimeLeft(p => p-1), 1000); return () => clearInterval(timer); }, [gameState, showOptions, isProcessing, currentQIndex]);
    useEffect(() => { if (timeLeft <= 0 && showOptions && !isProcessing && gameState === 'playing') handleAnswer(-1, true); }, [timeLeft, showOptions, isProcessing, gameState]);

    const handleAnswer = async (optionIndex, isTimeout = false) => {
        if (isProcessing) return;
        setIsProcessing(true); setSelectedOption(optionIndex);
        const currentQ = quizData.questions[currentQIndex];
        const isCorrect = !isTimeout && currentQ.correctAnswerIndex !== undefined && optionIndex === currentQ.correctAnswerIndex;
        setFeedbackStatus(isCorrect ? 'correct' : 'incorrect');
        const points = isCorrect ? Math.max(100, Math.ceil((timeLeft/30)*1000)) : 0;
        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        if (isCorrect) setCorrectCount(newCorrectCount);
        setTimeout(async () => {
            setScore(prev => prev + points); setFeedbackStatus(null); setSelectedOption(null); setIsProcessing(false);
            if (currentQIndex + 1 < quizData.questions.length) {
                setCurrentQIndex(p => p+1); setShowOptions(false); setTimeLeft(30);
            } else {
                const finalScore = score + points;
                if (newCorrectCount < 8) { setGameState('failed'); return; }
                setGameState('finished');
                try {
                    await addDoc(collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'lessons', lessonId, 'quiz', ageGroup, 'results'), { name: userName, score: finalScore, userId, group: ageGroup, timestamp: serverTimestamp() });
                    const globalDocId = `${userId}_${lessonId}_${ageGroup}`;
                    const globalDocRef = doc(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'global_scores', globalDocId);
                    const docSnap = await getDoc(globalDocRef);
                    if (!docSnap.exists()) await setDoc(globalDocRef, { userId, name: userName, group: ageGroup, score: finalScore, lessonId, timestamp: serverTimestamp() });
                } catch(e) { console.error(e); }
            }
        }, 1500);
    };

    if (gameState === 'failed') return <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 p-8 rounded-2xl text-center shadow-2xl border border-red-500"><div className="text-6xl mb-4">😔</div><h2 className="text-3xl font-bold text-red-400 mb-2">Not Enough Correct!</h2><p className="text-gray-300 text-lg mb-6">Need at least 8 correct answers to pass.</p><button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full">Go Back & Review</button></div></div>;
    if (gameState === 'finished') return <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 p-8 rounded-2xl text-center shadow-2xl"><Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4"/><h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2><p className="text-gray-400 text-lg mb-6">Score: <span className="text-indigo-400 font-bold">{score}</span></p><button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full">Finish</button></div></div>;
    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-4 overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-8 h-8"/></button>
            <div className="w-full max-w-3xl flex flex-col h-full justify-center">
                <div className="flex justify-between items-center mb-6 px-4">
                    <div className="bg-gray-800 px-4 py-2 rounded-full border border-gray-600 text-white font-bold">Q {currentQIndex+1}/{quizData.questions.length}</div>
                    {showOptions && <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-xl flex items-center"><Timer className="w-5 h-5 mr-2"/> {timeLeft}s</div>}
                    <div className="bg-indigo-600 px-4 py-2 rounded-full text-white font-bold">Score: {score}</div>
                </div>
                <div className="bg-white text-black p-8 rounded-xl shadow-2xl mb-8 text-center min-h-[200px] flex items-center justify-center relative overflow-hidden">
                    <h2 className="text-2xl md:text-3xl font-bold z-10">{quizData.questions[currentQIndex].question}</h2>
                    {feedbackStatus && <div className={`absolute inset-0 flex items-center justify-center z-20 ${feedbackStatus === 'correct' ? 'bg-green-100/90 text-green-700' : 'bg-red-100/90 text-red-700'}`}><div className="text-4xl font-black">{feedbackStatus === 'correct' ? "CORRECT!" : "WRONG!"}</div></div>}
                </div>
                {showOptions ? (
                    <div className={`grid gap-4 ${quizData.questions[currentQIndex].options.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {quizData.questions[currentQIndex].options.map((opt, idx) => {
                            let btnClass = "hover:scale-105 active:scale-95";
                            let bgClass = ['bg-red-500','bg-blue-500','bg-yellow-500','bg-green-500'][idx%4];
                            if (feedbackStatus) { btnClass = "cursor-not-allowed opacity-50"; if (idx === quizData.questions[currentQIndex].correctAnswerIndex) bgClass = "bg-green-600 ring-4 ring-green-300 opacity-100"; else if (idx === selectedOption && feedbackStatus === 'incorrect') bgClass = "bg-red-600 ring-4 ring-red-300 opacity-100"; }
                            return <button key={idx} onClick={() => handleAnswer(idx)} disabled={isProcessing} className={`${bgClass} text-white font-bold text-lg p-6 rounded-xl shadow-lg transform transition flex items-center ${btnClass}`}><span className="bg-black/20 w-8 h-8 rounded flex items-center justify-center mr-4">{['A','B','C','D'][idx]}</span>{opt}</button>;
                        })}
                    </div>
                ) : <div className="text-center py-20"><div className="animate-pulse text-4xl font-black text-yellow-400">Get Ready... (5s)</div></div>}
            </div>
        </div>
    );
};

const QAList = ({ lessonId, isTeacher, userId, userName, suggestedQuestions = [], lessonContext = "" }) => {
    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [replyInputs, setReplyInputs] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleSuggestions, setVisibleSuggestions] = useState([]);
    const [suggestionPool, setSuggestionPool] = useState([]);
    const bottomRef = useRef(null);

    useEffect(() => { if (suggestedQuestions.length > 0) { setVisibleSuggestions(suggestedQuestions.slice(0,3)); setSuggestionPool(suggestedQuestions.slice(3)); } }, [suggestedQuestions]);
    useEffect(() => { if (!db) return; const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lessonId,'questions'), orderBy('timestamp','asc')); return onSnapshot(q, snap => setQuestions(snap.docs.map(d => ({id:d.id,...d.data()})))); }, [lessonId]);

    const handleAsk = async () => {
        if (!newQuestion.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            let translation = '';
            try { const res = await translateText(newQuestion, isTeacher ? 'en' : 'mm'); translation = res.translatedText; } catch(e) { translation = newQuestion; }
            await addDoc(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lessonId,'questions'), { studentId: userId, studentName: userName||"Anonymous", text: newQuestion, translation, originalLang: isTeacher?'mm':'en', timestamp: serverTimestamp(), replies: [], likes: [] });
            setNewQuestion('');
        } catch(e) { console.error(e); } finally { setIsSubmitting(false); }
    };

    const handleReply = async (questionId) => {
        const text = replyInputs[questionId];
        if (!text?.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            let translation = '';
            try { const res = await translateText(text, isTeacher?'en':'mm'); translation = res.translatedText; } catch(e) { translation = text; }
            const reply = { id: crypto.randomUUID(), userId, userName: userName||(isTeacher?"Teacher":"Student"), role: isTeacher?'Teacher':'Student', text: text.trim(), translation, originalLang: isTeacher?'mm':'en', timestamp: new Date().toISOString(), likes: [] };
            await updateDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lessonId,'questions',questionId), { replies: arrayUnion(reply) });
            setReplyInputs(p => ({...p, [questionId]: ''}));
        } catch(e) { console.error(e); } finally { setIsSubmitting(false); }
    };

    const renderText = (item) => {
        let displayContent = item.text;
        if (isTeacher && item.originalLang==='en') displayContent = item.translation||item.text;
        else if (!isTeacher && item.originalLang==='mm') displayContent = item.translation||item.text;
        return <SmartContent text={displayContent}/>;
    };

    return (
        <div className="space-y-6 mt-4">
            {!isTeacher && visibleSuggestions.length > 0 && (
                <div className="bg-indigo-900/30 p-4 rounded-xl border border-indigo-500/30">
                    <h4 className="text-indigo-300 text-sm font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4"/> Curious? Try asking:</h4>
                    <div className="flex flex-wrap gap-2">{visibleSuggestions.map((sq,idx) => <button key={idx} onClick={() => setNewQuestion(sq)} className="text-left text-xs bg-indigo-800/50 hover:bg-indigo-700 text-indigo-100 px-3 py-2 rounded-lg border border-indigo-600 transition">{sq}</button>)}</div>
                </div>
            )}
            {questions.map(q => (
                <div key={q.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1"><span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 flex items-center gap-1 w-fit mb-1"><User className="w-3 h-3"/> {q.studentName||"Student"}</span><div className="text-white font-medium">{renderText(q)}</div></div>
                    </div>
                    <div className="ml-2 pl-3 border-l-2 border-gray-700 space-y-3 mt-3">
                        {q.replies && q.replies.map((reply,idx) => (
                            <div key={idx} className={`text-sm p-3 rounded-lg border ${reply.role==='Teacher'?'bg-teal-900/20 border-teal-800/50':'bg-gray-700/30 border-gray-600/50'}`}>
                                <span className={`text-xs font-bold ${reply.role==='Teacher'?'text-teal-400':'text-gray-400'} flex items-center gap-1 mb-1`}>{reply.role==='Teacher'?<Wand2 className="w-3 h-3"/>:<User className="w-3 h-3"/>} {reply.userName||reply.role}</span>
                                <div className="text-gray-200">{renderText(reply)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <input value={replyInputs[q.id]||''} onChange={e => setReplyInputs(p=>({...p,[q.id]:e.target.value}))} placeholder="Write a reply..." className="flex-1 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none" onKeyDown={e => e.key==='Enter'&&handleReply(q.id)}/>
                        <button onClick={() => handleReply(q.id)} disabled={isSubmitting} className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700"><Send className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
            <div className="pt-4 border-t border-gray-700 pb-10" ref={bottomRef}>
                <p className="text-xs text-gray-400 mb-2 font-bold uppercase">New Question</p>
                <div className="flex gap-2">
                    <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Ask a question..." className="flex-1 bg-gray-900 text-white text-sm p-3 rounded-xl border border-gray-600 focus:border-indigo-500 focus:outline-none" disabled={isSubmitting} onKeyDown={e => e.key==='Enter'&&handleAsk()}/>
                    <button onClick={handleAsk} disabled={isSubmitting||!newQuestion} className="bg-green-600 px-6 py-2 rounded-xl text-white font-bold hover:bg-green-700">Ask</button>
                </div>
            </div>
        </div>
    );
};

const LessonItem = ({ lesson, isTeacher, studentAgeGroup, studentName, onGenerateVariants, onTakeQuiz, onEdit, isGenerating, userId, isOpen, onToggle }) => {
    const [activeTab, setActiveTab] = useState('content');
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loadingLB, setLoadingLB] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [hasAsked, setHasAsked] = useState(false);
    const [hasReplied, setHasReplied] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const lessonRef = useRef(null);

    useEffect(() => { if (isOpen && lessonRef.current) setTimeout(() => { const y = lessonRef.current.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({top:y,behavior:'smooth'}); }, 100); }, [isOpen]);
    useEffect(() => {
        if (!db || !userId) return;
        const qRef = collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lesson.id,'questions');
        const unsub = onSnapshot(qRef, snap => {
            let unread=false,asked=false,replied=false;
            snap.docs.forEach(d => { const q=d.data(); if(q.studentId===userId)asked=true; if(q.studentId!==userId&&(!q.likes||!q.likes.includes(userId)))unread=true; if(q.replies){q.replies.forEach(r=>{if(r.userId===userId)replied=true;if(r.userId!==userId&&(!r.likes||!r.likes.includes(userId)))unread=true;});}});
            setHasUnread(unread); setHasAsked(asked); setHasReplied(replied);
        });
        if (studentAgeGroup) {
            const resultRef = collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lesson.id,'quiz',studentAgeGroup,'results');
            const unsubResult = onSnapshot(query(resultRef, where('userId','==',userId)), snap => setIsCompleted(!snap.empty));
            return () => { unsub(); unsubResult(); };
        }
        return () => unsub();
    }, [lesson.id, userId, studentAgeGroup]);

    useEffect(() => {
        if (!showLeaderboard || !db) return;
        setLoadingLB(true);
        const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','global_scores'), where('lessonId','==',lesson.id));
        return onSnapshot(q, snap => { const results = snap.docs.map(d=>d.data()).sort((a,b)=>b.score-a.score); setLeaderboardData(results); setLoadingLB(false); });
    }, [showLeaderboard, lesson.id]);

    const variants = lesson.variants || {};
    const hasJunior = variants.storytellers && variants.explorers;
    const hasSenior = variants.adventurers && variants.voyagers;
    let displayContent = "", displayTitle = lesson.title, quizAvailable = false, quizDataForStudent = null, discussionQuestions = [];
    if (!isTeacher && studentAgeGroup) {
        const myVariant = variants[studentAgeGroup];
        if (myVariant) { displayContent = myVariant.english; displayTitle = myVariant.englishTitle || lesson.title; quizAvailable = !!myVariant.quiz; quizDataForStudent = myVariant.quiz; discussionQuestions = myVariant.discussionQuestions || []; }
        else displayContent = "Lesson content not available for your age group yet.";
    }
    const isQuizLocked = !isTeacher && (!hasAsked || !hasReplied);

    return (
        <div ref={lessonRef} className={`relative rounded-xl shadow-md overflow-hidden border transition hover:shadow-lg mb-4 ${isTeacher?'bg-gray-800 border-gray-700':'bg-gray-700 border-gray-600'}`}>
            {isGenerating && <div className="absolute inset-0 bg-gray-900/80 z-[60] flex flex-col items-center justify-center backdrop-blur-sm rounded-xl"><RotateCw className="w-12 h-12 text-teal-400 animate-spin mb-4"/><h3 className="text-xl font-bold text-white mb-2">AI is Generating...</h3></div>}
            <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-gray-600/50 transition flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400"/> : <ChevronRight className="w-5 h-5 text-gray-400"/>}
                    <div className="flex flex-col">
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${isTeacher?'text-teal-300':'text-white'}`}>{displayTitle}{isCompleted&&<span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/30"><CheckCheck className="w-3 h-3"/> Completed</span>}{hasUnread&&<span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}</h3>
                        {isTeacher&&<span className="text-xs text-gray-500">{hasJunior&&hasSenior?<span className="text-green-400 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/>Ready</span>:<span className="text-yellow-500">Pending: {!hasJunior&&<span>Junior </span>}{!hasSenior&&<span>Senior</span>}</span>}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={e=>{e.stopPropagation();setShowLeaderboard(true);}} className="p-2 text-yellow-500 hover:text-yellow-400 rounded-full transition z-20"><Trophy className="w-5 h-5"/></button>
                    {isTeacher&&<div className="flex items-center gap-1 mr-2" onClick={e=>e.stopPropagation()}><button onClick={()=>onEdit(lesson)} className="p-2 bg-blue-600 rounded hover:bg-blue-700 text-white"><Edit2 className="w-3 h-3"/></button><button onClick={()=>onGenerateVariants(lesson,'junior')} className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> Jr.</button><button onClick={()=>onGenerateVariants(lesson,'senior')} className="px-3 py-1 bg-pink-600 rounded hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> Sr.</button></div>}
                </div>
            </div>
            {isOpen && (
                <div className="border-t border-gray-600/50 bg-gray-900/30">
                    <div className="flex border-b border-gray-700">
                        <button onClick={()=>setActiveTab('content')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab==='content'?'text-teal-400 border-b-2 border-teal-400 bg-gray-800':'text-gray-400 hover:text-white'}`}><BookOpen className="w-4 h-4"/> Lesson</button>
                        <button onClick={()=>setActiveTab('discussion')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab==='discussion'?'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800':'text-gray-400 hover:text-white'}`}><MessageCircle className="w-4 h-4"/> Discussion {hasUnread&&<span className="w-2 h-2 bg-red-500 rounded-full ml-1"></span>}</button>
                    </div>
                    <div className="p-5">
                        {activeTab==='content'&&(
                            <div>
                                {isTeacher ? <div className="p-4 bg-gray-900 rounded-xl border border-gray-700"><h4 className="font-bold text-teal-400 mb-4 text-lg border-b border-gray-700 pb-2">Original Lesson Content</h4><div className="text-white whitespace-pre-wrap leading-relaxed text-lg"><SmartContent text={lesson.burmeseContent}/></div></div>
                                : (<div className="space-y-4">
                                    <div className="text-yellow-100 whitespace-pre-wrap leading-relaxed text-lg"><SmartContent text={displayContent}/></div>
                                    {quizAvailable && (
                                        <div className="mt-6">
                                            {isQuizLocked&&!isCompleted ? (
                                                <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-600 flex flex-col items-center text-center">
                                                    <Lock className="w-8 h-8 text-gray-400 mb-2"/><h4 className="text-white font-bold mb-1">Quiz Locked</h4>
                                                    <p className="text-gray-400 text-sm mb-3">Complete discussion tasks to unlock:</p>
                                                    <div className="flex gap-4 text-xs font-semibold"><span className={`flex items-center gap-1 ${hasAsked?'text-green-400':'text-gray-500'}`}>{hasAsked?<CheckCircle className="w-4 h-4"/>:<div className="w-4 h-4 rounded-full border border-gray-500"/>} Ask 1 Question</span><span className={`flex items-center gap-1 ${hasReplied?'text-green-400':'text-gray-500'}`}>{hasReplied?<CheckCircle className="w-4 h-4"/>:<div className="w-4 h-4 rounded-full border border-gray-500"/>} Answer 1 Question</span></div>
                                                    <button onClick={()=>setActiveTab('discussion')} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-bold">Go to Discussion</button>
                                                </div>
                                            ) : (
                                                <button onClick={e=>{e.stopPropagation();onTakeQuiz(lesson.id,displayTitle,quizDataForStudent);}} className={`w-full py-3 font-black rounded-xl shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2 ${isCompleted?'bg-gradient-to-r from-green-600 to-teal-600 text-white':'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}`}>
                                                    {isCompleted?<><Trophy className="w-6 h-6"/> QUIZ COMPLETED</>:<><Gamepad2 className="w-6 h-6"/> PLAY QUIZ ({studentAgeGroup})</>}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>)}
                            </div>
                        )}
                        {activeTab==='discussion'&&<QAList lessonId={lesson.id} isTeacher={isTeacher} userId={userId} userName={studentName} suggestedQuestions={discussionQuestions} lessonContext={lesson.burmeseContent}/>}
                    </div>
                </div>
            )}
            {showLeaderboard&&<LeaderboardView leaderboard={leaderboardData} title={displayTitle} loading={loadingLB} onClose={()=>setShowLeaderboard(false)} currentUserId={userId}/>}
        </div>
    );
};

const NotificationBell = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [lastRead, setLastRead] = useState(() => parseInt(localStorage.getItem(`abhidhamma_notif_${userId}`)) || 0);
    useEffect(() => {
        if (!db || !userId) return;
        const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','activity_feed'), orderBy('timestamp','desc'), limit(15));
        const unsub = onSnapshot(q, snap => setNotifications(snap.docs.map(d=>({id:d.id,...d.data()}))));
        return () => unsub();
    }, [userId]);
    const unreadCount = notifications.filter(n => {
        const ts = n.timestamp?.toMillis ? n.timestamp.toMillis() : (n.timestamp?.seconds*1000)||0;
        return ts > lastRead;
    }).length;
    const handleToggle = () => {
        if (!isOpen) { const now=Date.now(); setLastRead(now); localStorage.setItem(`abhidhamma_notif_${userId}`, now); }
        setIsOpen(!isOpen);
    };
    return (
        <div className="relative">
            <button onClick={handleToggle} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition relative shadow-lg">
                <Bell className="w-5 h-5 text-gray-300"/>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[90vw] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-400"/> Notifications</h4>
                        <button onClick={()=>setIsOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                        {notifications.length===0 ? <p className="text-center text-gray-500 text-xs py-6 italic">No new notifications</p> : notifications.map(n => (
                            <div key={n.id} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/50 flex items-start gap-3">
                                <Trophy className="w-4 h-4 text-yellow-400 mt-1"/>
                                <div><p className="text-xs font-bold text-white"><span className="text-indigo-300">{n.studentName}</span> finished a quiz!</p><p className="text-[10px] text-gray-400 truncate mt-0.5">{n.lessonTitle}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CompletionToastStack = ({ toasts }) => (
    <div className="fixed top-24 right-4 z-[70] flex flex-col gap-2 items-end">
        {toasts.map(t => (
            <div key={t.id} className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 border border-green-400">
                <CheckCircle className="w-5 h-5"/>
                <span>Lesson Completed! ({t.count} today)</span>
            </div>
        ))}
    </div>
);

const FloatingStatsBar = ({ rank, totalLessons }) => {
    const [pos, setPos] = useState({ x: null, y: 16 });
    const dragging = useRef(false);
    const offset = useRef({ x:0, y:0 });
    const startDrag = (clientX, clientY, el) => { dragging.current=true; const rect=el.getBoundingClientRect(); offset.current={x:clientX-rect.left,y:clientY-rect.top}; };
    const onMove = (clientX, clientY) => { if(!dragging.current) return; setPos({x:clientX-offset.current.x,y:clientY-offset.current.y}); };
    const stopDrag = () => { dragging.current=false; };
    useEffect(() => {
        const mm = e=>onMove(e.clientX,e.clientY); const tm = e=>{if(e.touches[0])onMove(e.touches[0].clientX,e.touches[0].clientY);};
        window.addEventListener('mousemove',mm); window.addEventListener('touchmove',tm); window.addEventListener('mouseup',stopDrag); window.addEventListener('touchend',stopDrag);
        return () => { window.removeEventListener('mousemove',mm); window.removeEventListener('touchmove',tm); window.removeEventListener('mouseup',stopDrag); window.removeEventListener('touchend',stopDrag); };
    }, []);
    const style = pos.x===null ? {left:'50%',top:'16px',transform:'translateX(-50%)'} : {left:pos.x+'px',top:pos.y+'px'};
    return (
        <div onMouseDown={e=>startDrag(e.clientX,e.clientY,e.currentTarget)} onTouchStart={e=>e.touches[0]&&startDrag(e.touches[0].clientX,e.touches[0].clientY,e.currentTarget)}
            style={{position:'fixed',zIndex:70,cursor:'grab',...style}} className="bg-gray-800/95 border border-indigo-500 rounded-full shadow-2xl px-5 py-2 flex items-center gap-4 select-none backdrop-blur-md">
            <span className="flex items-center gap-1 text-yellow-400 font-black"><Trophy className="w-4 h-4"/> #{rank||'-'}</span>
            <span className="text-gray-500">|</span>
            <span className="flex items-center gap-1 text-teal-300 font-bold"><BookOpen className="w-4 h-4"/> {totalLessons} Lessons</span>
        </div>
    );
};

const ClassRoster = ({ userId }) => {
    const [students, setStudents] = useState([]);
    const [isOpen, setIsOpen] = useState(true);
    const [nowTime, setNowTime] = useState(Date.now());
    const [autoApprove, setAutoApprove] = useState(false);
    useEffect(() => { const i=setInterval(()=>setNowTime(Date.now()),10000); return()=>clearInterval(i); },[]);
    useEffect(() => {
        if (!db||!userId) return;
        const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students'));
        return onSnapshot(q, snap => {
            const now=Date.now();
            setStudents(snap.docs.map(d=>{
                const data=d.data(); const lp=data.lastPing;
                if(data.isOnline&&lp){const pm=lp.toMillis?lp.toMillis():(lp.seconds*1000); if((now-pm)/60000>2) return{id:d.id,...data,isOnline:false};}
                return{id:d.id,...data};
            }));
        });
    },[userId]);
    useEffect(() => {
        if(!db) return;
        const ref=doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','settings','preferences');
        return onSnapshot(ref, snap=>{ if(snap.exists()) setAutoApprove(snap.data().autoApprove||false); });
    },[]);
    const toggleAutoApprove=async(e)=>{e.stopPropagation();await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','settings','preferences'),{autoApprove:!autoApprove},{merge:true});};
    const handleApprove=async(id,intendedName)=>{
        const ref=doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',id);
        const snap=await getDoc(ref); if(!snap.exists()) return;
        const data=snap.data(); let num=data.studentNumber;
        if(!num){const max=students.filter(s=>s.status==='approved').reduce((m,s)=>s.studentNumber>m?s.studentNumber:m,0); num=max+1;}
        await updateDoc(ref,{status:'approved',name:intendedName||data.name,pendingName:null,studentNumber:num});
    };
    useEffect(()=>{if(autoApprove) students.filter(s=>s.status==='pending').forEach(s=>handleApprove(s.id,s.pendingName||s.name));},[students,autoApprove]);
    const handleReject=async(id)=>updateDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',id),{status:'rejected',pendingName:null});
    const handleRemove=async(e,id)=>{e.stopPropagation();try{await deleteDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',id));}catch(err){console.error(err);}};
    const pending=students.filter(s=>s.status==='pending');
    const online=students.filter(s=>s.status==='approved'&&s.isOnline).sort((a,b)=>a.studentNumber-b.studentNumber);
    const offline=students.filter(s=>s.status==='approved'&&!s.isOnline).sort((a,b)=>a.studentNumber-b.studentNumber).map(s=>{
        let isWarning=false; const ct=s.lastSeen||s.lastPing;
        if(ct){const ms=ct.toMillis?ct.toMillis():(ct.seconds*1000); const d=(nowTime-ms)/60000; if(d>=3&&d<=8)isWarning=true;}
        return{...s,isWarning};
    });
    return (
        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 mb-6 overflow-hidden">
            <div onClick={()=>setIsOpen(!isOpen)} className="p-4 border-b border-gray-700 cursor-pointer flex flex-wrap gap-3 justify-between items-center hover:bg-gray-700 transition">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400"/> Class Roster</h3>
                    <button onClick={toggleAutoApprove} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold transition-all ${autoApprove?'bg-green-500/20 text-green-400 border border-green-500/50':'bg-gray-800 text-gray-400 border border-gray-600'}`}>
                        {autoApprove?<ToggleRight className="w-4 h-4"/>:<ToggleLeft className="w-4 h-4"/>} Auto-Approve
                    </button>
                </div>
                <div className="flex items-center gap-4 text-sm font-semibold">
                    <span className="text-yellow-400">{pending.length} Pending</span>
                    <span className="text-green-400">{online.length} Online</span>
                    <span className="text-gray-400">{online.length+offline.length} Total</span>
                    {isOpen?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronLeft className="w-5 h-5 text-gray-400"/>}
                </div>
            </div>
            {isOpen && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50">
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Pending {pending.length>0&&<span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse inline-block ml-1"></span>}</h4>
                        {pending.length===0?<p className="text-gray-500 text-sm italic">No pending requests.</p>:null}
                        {pending.map(s=>(
                            <div key={s.id} className="bg-gray-800 p-3 rounded-lg border border-yellow-600/30 flex justify-between items-center">
                                <div><p className="font-bold text-white">{s.pendingName||s.name}</p>{s.pendingName&&<p className="text-xs text-yellow-400">Previous: {s.name}</p>}</div>
                                <div className="flex gap-2">
                                    <button onClick={()=>handleApprove(s.id,s.pendingName||s.name)} className="p-2 bg-green-600 hover:bg-green-500 rounded text-white"><UserCheck className="w-4 h-4"/></button>
                                    <button onClick={()=>handleReject(s.id)} className="p-2 bg-red-600 hover:bg-red-500 rounded text-white"><UserX className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Online ({online.length})</h4>
                            <div className="flex flex-wrap gap-3">
                                {online.length===0?<span className="text-gray-600 text-sm italic">Nobody online.</span>:null}
                                {online.map(s=>(
                                    <div key={s.id} className="bg-indigo-900/60 border border-indigo-500/50 p-2 rounded-xl flex flex-col gap-1 min-w-[150px]">
                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <div className="flex items-center gap-2"><Circle className="w-2 h-2 fill-green-500 text-green-500"/><span className="font-mono font-bold text-indigo-300">#{s.studentNumber}</span><span className="text-white font-semibold truncate max-w-[100px]">{s.name}</span></div>
                                            <button onClick={e=>handleRemove(e,s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Offline ({offline.length})</h4>
                            <div className="flex flex-wrap gap-3">
                                {offline.length===0?<span className="text-gray-600 text-sm italic">No offline students.</span>:null}
                                {offline.map(s=>(
                                    <div key={s.id} className={`border px-3 py-1.5 rounded-full flex items-center gap-2 text-sm ${s.isWarning?'bg-red-950/80 border-red-500':'bg-gray-800 border-gray-600 grayscale opacity-60 hover:opacity-100'}`}>
                                        <Circle className={`w-2 h-2 flex-shrink-0 ${s.isWarning?'fill-red-500 text-red-500':'fill-gray-500 text-gray-500'}`}/>
                                        <span className={`font-mono font-bold ${s.isWarning?'text-red-300':'text-gray-400'}`}>#{s.studentNumber}</span>
                                        <span className={`font-semibold ${s.isWarning?'text-white':'text-gray-300'}`}>{s.name}</span>
                                        <button onClick={e=>handleRemove(e,s.id)} className="ml-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const WelcomeModal = ({ onStudentComplete, onTeacherComplete }) => {
    // Simplified: no role selection, no name entry — just pick age group and enter.
    // Teacher login is via the header button (not this modal).
    const [selectedGroup, setSelectedGroup] = useState(() => {
        // Restore last used age group from localStorage
        return localStorage.getItem('abhidhamma_ageGroup') || null;
    });
    return (
        <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
            <div className="bg-indigo-900/90 border border-indigo-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                <Globe className="w-16 h-16 mx-auto text-cyan-400 mb-4 animate-pulse"/>
                <h2 className="text-3xl font-black text-white mb-2">📚 Abhidhamma</h2>
                <p className="text-indigo-300 mb-6">Choose your age group to begin</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {Object.entries(AGE_GROUPS).map(([key,info])=>(
                        <button key={key} onClick={()=>setSelectedGroup(key)}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${selectedGroup===key?'bg-cyan-500 border-cyan-300 text-white scale-105 shadow-lg':'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'}`}>
                            {info.icon}
                            <span className="text-xs font-bold">{info.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={()=>{ if(!selectedGroup) return; localStorage.setItem('abhidhamma_ageGroup', selectedGroup); onStudentComplete({ group: selectedGroup, status: 'approved' }); }}
                    disabled={!selectedGroup}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition">
                    ENTER
                </button>
            </div>
        </div>
    );
};

// ── Main AbhidhammaApp Component ──────────────────────────────────────────────
export default function AbhidhammaApp({ entryRequest, onExit }) {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isTeacher, setIsTeacher] = useState(false);
    const [lessons, setLessons] = useState([]);
    const [currentRole, setCurrentRole] = useState('Student');
    const [isLoading, setIsLoading] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonContent, setNewLessonContent] = useState('');
    const [newLessonImageBase, setNewLessonImageBase] = useState('https://raw.githubusercontent.com/nathantun93/dhamma4/main/');
    const [imageInput, setImageInput] = useState('');
    const [message, setMessage] = useState('');
    const [activeQuizLessonId, setActiveQuizLessonId] = useState(null);
    const [activeQuizData, setActiveQuizData] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [openLessonId, setOpenLessonId] = useState(null);
    const [generatingLessonId, setGeneratingLessonId] = useState(null);
    const [completionToasts, setCompletionToasts] = useState([]);
    const [studentRank, setStudentRank] = useState(null);
    const [studentTotalLessons, setStudentTotalLessons] = useState(0);
    const prevTodayCountRef = useRef(0);
    const [isIdle, setIsIdle] = useState(false);
    const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
    const [globalLeaderboardData, setGlobalLeaderboardData] = useState([]);
    const [loadingGlobalLB, setLoadingGlobalLB] = useState(false);
    const lastHandledEntryRef = useRef(null);

    const showMessage = (text) => { setMessage(text); setTimeout(() => setMessage(''), 3000); };

    // Auth — use shared Firebase auth instance
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => { setUserId(u ? u.uid : null); setIsAuthReady(true); });
        return () => unsub();
    }, []);

    // Restore teacher state (use 'abhidhamma_' prefix to avoid clash with TutoringApp)
    useEffect(() => {
        if (localStorage.getItem('abhidhamma_isTeacher') === 'true') { setIsTeacher(true); setCurrentRole('Teacher'); }
    }, []);

    // Handle entryRequest from TutoringApp
    useEffect(() => {
        if (!entryRequest || !isAuthReady) return;
        const sig = JSON.stringify({ mode: entryRequest.mode, lessonId: entryRequest.lessonId, studentName: entryRequest.studentName, ageGroup: entryRequest.ageGroup });
        if (sig === lastHandledEntryRef.current) return;
        lastHandledEntryRef.current = sig;

        if (entryRequest.mode === 'teacher') {
            setIsTeacher(true); setCurrentRole('Teacher');
            localStorage.setItem('abhidhamma_isTeacher', 'true');
        } else if (entryRequest.mode === 'student' && entryRequest.studentName) {
            // Bypass WelcomeModal — student is already authenticated via TutoringApp
            const ageGroupMap = { storyteller:'storytellers', explorer:'explorers', adventurer:'adventurers', voyager:'voyagers' };
            const group = entryRequest.ageGroup
                ? (ageGroupMap[entryRequest.ageGroup] || entryRequest.ageGroup)
                : 'explorers';
            const profile = { name: entryRequest.studentName, group, status: 'approved' };
            setStudentProfile(profile);
            setCurrentRole('Student');
            if (entryRequest.lessonId) setOpenLessonId(entryRequest.lessonId);
        }
    }, [entryRequest, isAuthReady]);

    // Load lessons
    useEffect(() => {
        if (!db || !userId) return;
        const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons'), orderBy('timestamp','asc'));
        const unsub = onSnapshot(q, snap => setLessons(snap.docs.map(d => ({id:d.id,...d.data()}))));
        const saved = localStorage.getItem(`abhidhamma_student_profile_${userId}`);
        if (saved && !entryRequest?.studentName) setStudentProfile(JSON.parse(saved));
        return () => unsub();
    }, [isAuthReady, userId]);

    // Global leaderboard
    useEffect(() => {
        if (!showGlobalLeaderboard || !db) return;
        setLoadingGlobalLB(true);
        const q = query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','global_scores'), orderBy('timestamp','desc'));
        return onSnapshot(q, snap => {
            const scores = snap.docs.map(d=>d.data());
            const grouped = {};
            scores.forEach(s => { const key=`${s.userId}_${s.group}`; if(!grouped[key])grouped[key]={userId:s.userId,name:s.name,group:s.group,score:0}; grouped[key].score+=s.score; });
            setGlobalLeaderboardData(Object.values(grouped).sort((a,b)=>b.score-a.score)); setLoadingGlobalLB(false);
        });
    }, [showGlobalLeaderboard]);

    const handleTeacherLogin = () => { const c=prompt("Enter Abhidhamma Teacher Passcode:"); if(c===TEACHER_PASSCODE){setIsTeacher(true);setCurrentRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');showMessage("Logged in as Teacher.");}else showMessage("Incorrect Passcode."); };
    const handleTeacherLogout = () => { setIsTeacher(false);setCurrentRole('Student');localStorage.removeItem('abhidhamma_isTeacher');showMessage("Switched to Student mode."); };

    const handleExportLessons = async () => {
        setIsLoading(true); showMessage("Exporting all data...");
        try {
            const toMs = (ts) => { if(!ts) return null; if(typeof ts.toMillis==='function') return ts.toMillis(); if(ts.seconds) return ts.seconds*1000; return null; };
            const [lessonsSnap,scoresSnap,studentsSnap,activitySnap] = await Promise.all([
                getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons')),
                getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','global_scores')),
                getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students')),
                getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','activity_feed')),
            ]);
            const exportData = {
                version: 2,
                lessons: lessonsSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),
                globalScores: scoresSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),
                students: studentsSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp),lastSeen:toMs(d.data().lastSeen)})),
                activityFeed: activitySnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),
                questions: {},
                quizResults: {},
            };
            for (const d of lessonsSnap.docs) {
                const qSnap = await getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',d.id,'questions'));
                if(!qSnap.empty) exportData.questions[d.id]=qSnap.docs.map(q=>({id:q.id,...q.data(),timestamp:toMs(q.data().timestamp)}));
                for (const g of Object.keys(AGE_GROUPS)) {
                    const rSnap = await getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',d.id,'quiz',g,'results'));
                    if(!rSnap.empty) exportData.quizResults[`${d.id}_${g}`]=rSnap.docs.map(r=>({id:r.id,...r.data(),timestamp:toMs(r.data().timestamp)}));
                }
            }
            const blob = new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href=url; a.download=`abhidhamma_full_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showMessage("Exported all data successfully!");
        } catch(e) { console.error(e); showMessage("Error Exporting!"); } finally { setIsLoading(false); }
    };

    const handleImportLessons = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                setIsLoading(true);
                const toDate = (ts) => ts ? new Date(ts) : serverTimestamp();
                let lCount=0, sCount=0, stuCount=0, qCount=0, qrCount=0, aCount=0;
                // Lessons
                for (const l of (data.lessons||[])) {
                    const {id,timestamp,...rest}=l;
                    const withClass = importClassId.trim() ? {...rest, classId: importClassId.trim().toUpperCase()} : rest;
                    await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',id),{...withClass,timestamp:toDate(timestamp)});
                    lCount++;
                }
                // Global scores
                for (const s of (data.globalScores||[])) {
                    const {id,timestamp,...rest}=s;
                    await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','global_scores',id),{...rest,timestamp:toDate(timestamp)});
                    sCount++;
                }
                // Students (preserve approval status, names, etc.)
                for (const stu of (data.students||[])) {
                    const {id,timestamp,lastSeen,...rest}=stu;
                    await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',id),{...rest,timestamp:toDate(timestamp),lastSeen:toDate(lastSeen),isOnline:false,currentLesson:null});
                    stuCount++;
                }
                // Activity feed / notifications
                for (const a of (data.activityFeed||[])) {
                    const {id,timestamp,...rest}=a;
                    await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','activity_feed',id),{...rest,timestamp:toDate(timestamp)});
                    aCount++;
                }
                // Q&A per lesson
                for (const [lessonId,qList] of Object.entries(data.questions||{})) {
                    for (const q of qList) {
                        const {id,timestamp,...rest}=q;
                        await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lessonId,'questions',id),{...rest,timestamp:toDate(timestamp)});
                        qCount++;
                    }
                }
                // Quiz results per lesson per group
                for (const [key,rList] of Object.entries(data.quizResults||{})) {
                    const parts=key.split('_'); const group=parts.pop(); const lessonId=parts.join('_');
                    for (const r of rList) {
                        const {id,timestamp,...rest}=r;
                        await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lessonId,'quiz',group,'results',id),{...rest,timestamp:toDate(timestamp)});
                        qrCount++;
                    }
                }
                showMessage(`Imported: ${lCount} lessons, ${stuCount} students, ${sCount} scores, ${qCount} Q&A, ${aCount} notifications.`);
            } catch(error) { showMessage(`Error: ${error.message}`); } finally { setIsLoading(false); }
            event.target.value='';
        };
        reader.readAsText(file);
    };

    const handleSaveLesson = async (e) => {
        e.preventDefault();
        if (!newLessonTitle.trim() || !newLessonContent.trim()) return showMessage("Fields required!");
        setIsLoading(true);
        try {
            const data = { title: newLessonTitle.trim(), burmeseContent: newLessonContent.trim(), imageBaseUrl: newLessonImageBase.trim() || IMG_BASE_URL };
            if (!editingLesson) { data.timestamp = serverTimestamp(); data.variants = {}; }
            const ref = editingLesson ? doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',editingLesson.id) : doc(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons'));
            await setDoc(ref, data, { merge: true });
            setNewLessonTitle(''); setNewLessonContent(''); setEditingLesson(null); showMessage("Lesson saved.");
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    };

    const insertImageSequence = () => {
        if (!imageInput.trim() || !/^\d+$/.test(imageInput.trim())) return showMessage("Numbers only");
        const num = parseInt(imageInput.trim(),10); const padLen = imageInput.trim().length;
        let seq = ""; for (let i=0;i<5;i++) seq += `${String(num+i).padStart(padLen,'0')}.png\n`;
        setNewLessonContent(p => p+(p?'\n':'')+seq);
        const next = String(num+5).padStart(padLen,'0'); localStorage.setItem('abhidhamma_lastImageSeqNum',next); setImageInput(next);
    };

    const handleGenerateVariants = async (lesson, mode) => {
        setIsLoading(true); setGeneratingLessonId(lesson.id);
        try {
            const newVariants = await generateLessonVariants(lesson.title, lesson.burmeseContent, mode);
            await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lesson.id), { variants: newVariants }, { merge: true });
            for (const [group, data] of Object.entries(newVariants)) { if(data.quiz) await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','lessons',lesson.id,'quiz',group),data.quiz); }
            showMessage("Generated Successfully!");
        } catch(e) { showMessage("Error generating."); console.error(e); } finally { setIsLoading(false); setGeneratingLessonId(null); }
    };

    const handleStudentOnboarding = (profile) => {
        setStudentProfile(profile);
        if (userId) localStorage.setItem(`abhidhamma_student_profile_${userId}`, JSON.stringify(profile));
    };

    const shouldShowWelcome = !isTeacher && (!studentProfile || studentProfile.status !== 'approved') && !entryRequest?.studentName;

    if (!isAuthReady) return <div className="min-h-screen bg-gray-900 flex justify-center items-center text-teal-400 pt-16"><RotateCw className="animate-spin w-8 h-8"/></div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8 pt-16">
            <style>{`.animate-bounce-in{animation:bounceIn 0.5s ease-out}@keyframes bounceIn{0%{transform:scale(0.5);opacity:0}80%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}`}</style>

            <CompletionToastStack toasts={completionToasts} />
            {currentRole === 'Student' && studentProfile?.status === 'approved' && (
                <FloatingStatsBar rank={studentRank} totalLessons={studentTotalLessons} />
            )}
            {shouldShowWelcome && (
                <WelcomeModal userId={userId} onStudentComplete={handleStudentOnboarding} onTeacherComplete={()=>{setIsTeacher(true);setCurrentRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');}}/>
            )}

            {activeQuizLessonId && activeQuizData && (
                <QuizModule lessonId={activeQuizLessonId} lessonTitle={lessons.find(l=>l.id===activeQuizLessonId)?.title||''} userId={userId} userName={studentProfile?.name||'Student'} ageGroup={studentProfile?.group} quizData={activeQuizData} onClose={()=>{setActiveQuizLessonId(null);setActiveQuizData(null);}}/>
            )}
            {showGlobalLeaderboard && <LeaderboardView leaderboard={globalLeaderboardData} title="Abhidhamma Champion Board" loading={loadingGlobalLB} onClose={()=>setShowGlobalLeaderboard(false)} isGlobal={true} currentUserId={userId}/>}

            <div className="max-w-4xl mx-auto">
                <header className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-amber-400">📚 Abhidhamma App</span>
                        {isTeacher ? (
                            <div className="flex gap-2">
                                <button onClick={()=>setCurrentRole(currentRole==='Teacher'?'Student':'Teacher')} className={`px-4 py-2 font-bold rounded shadow-lg ${currentRole==='Teacher'?'bg-purple-600':'bg-teal-600'}`}>{currentRole==='Teacher'?'Student View':'Teacher View'}</button>
                                <button onClick={handleTeacherLogout} className="px-4 py-2 font-bold rounded bg-red-600 hover:bg-red-700">Logout</button>
                            </div>
                        ) : <button onClick={handleTeacherLogin} className="px-4 py-2 font-bold rounded bg-gray-600 hover:bg-gray-500 flex items-center gap-2"><Key className="w-4 h-4"/> Teacher Login</button>}
                        {studentProfile?.status==='approved'&&<span className="bg-gray-700 px-3 py-1 rounded text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4"/> {studentProfile.name}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        {studentProfile?.status==='approved'&&<button onClick={()=>setShowGlobalLeaderboard(true)} className="p-2 bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 rounded-full hover:bg-yellow-600/40"><Trophy className="w-5 h-5"/></button>}
                        <div className="text-gray-400 text-sm font-semibold">{currentRole} View</div>
                       <NotificationBell userId={userId} />
                    </div>
                </header>

                {message&&<div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold animate-bounce">{message}</div>}

                {currentRole==='Teacher' ? (
                    <div className="space-y-6">
                        <ClassRoster userId={userId} />
                        <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-teal-300">{editingLesson?'Edit Lesson':'Add New Lesson'}</h3>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-gray-900 border border-gray-600 rounded p-1">
                        <input type="text" value={importClassId} onChange={e=>setImportClassId(e.target.value.toUpperCase())} placeholder="CLASS ID" className="bg-transparent text-white text-xs font-mono font-bold w-20 focus:outline-none px-1" title="Class ID tag for imported lessons"/>
                        <label className="cursor-pointer bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 text-xs text-white font-semibold">
                            <input type="file" accept=".json" onChange={handleImportLessons} className="hidden"/>
                            <Upload className="w-3 h-3"/> Import
                        </label>
                    </div>
                    <button onClick={handleExportLessons} disabled={isLoading} className="bg-pink-600 p-2 rounded hover:bg-pink-700 transition flex items-center gap-1 text-sm text-white font-semibold">
                        <Download className="w-4 h-4"/> Export
                    </button>
                </div>
            </div>
                            <form onSubmit={handleSaveLesson} className="space-y-4">
                                <input value={newLessonTitle} onChange={e=>setNewLessonTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={isLoading}/>
                <div className="flex gap-2 items-center bg-gray-900 p-2 rounded border border-gray-600">
                    <span className="text-gray-400 text-xs font-semibold ml-2 whitespace-nowrap">🖼 Image Folder URL:</span>
                    <input value={newLessonImageBase} onChange={e=>setNewLessonImageBase(e.target.value)} placeholder="https://raw.githubusercontent.com/..." className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-gray-600 focus:border-teal-500" disabled={isLoading}/>
                </div>
                                <textarea value={newLessonContent} onChange={e=>setNewLessonContent(e.target.value)} placeholder="Lesson Content (Burmese)" rows="6" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={isLoading}/>
                                <div className="flex gap-2 items-center bg-gray-900 p-2 rounded border border-gray-600">
                                    <ImageIcon className="w-4 h-4 text-gray-400 ml-2"/>
                                    <input type="text" placeholder="e.g. 001" value={imageInput} onChange={e=>setImageInput(e.target.value)} className="bg-transparent text-white text-sm focus:outline-none w-24 border-b border-gray-600"/>
                                    <button type="button" onClick={insertImageSequence} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white">Add Images</button>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-teal-600 p-3 rounded hover:bg-teal-700 flex justify-center items-center font-bold" disabled={isLoading}>{isLoading&&!generatingLessonId?<RotateCw className="animate-spin w-5 h-5 mr-2"/>:<BookOpen className="w-5 h-5 mr-2"/>}{editingLesson?'Update':'Save Lesson'}</button>
                                    {editingLesson&&<button type="button" onClick={()=>{setEditingLesson(null);setNewLessonTitle('');setNewLessonContent('');}} className="bg-gray-600 p-3 rounded hover:bg-gray-500">Cancel</button>}
                                </div>
                            </form>
                        </div>
                        <div className="space-y-4">{lessons.map(l=><LessonItem key={l.id} lesson={l} isTeacher={true} onGenerateVariants={handleGenerateVariants} onEdit={l=>{setEditingLesson(l);setNewLessonTitle(l.title);setNewLessonContent(l.burmeseContent);setNewLessonImageBase(l.imageBaseUrl||IMG_BASE_URL);}} isGenerating={generatingLessonId===l.id} userId={userId} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}</div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {lessons.map(l=><LessonItem key={l.id} lesson={l} isTeacher={false} studentAgeGroup={studentProfile?.group} studentName={studentProfile?.name} onTakeQuiz={(id,title,data)=>{setActiveQuizLessonId(id);setActiveQuizData(data);}} isGenerating={false} userId={userId} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}
                        {lessons.length===0&&<div className="text-center text-gray-500 py-10">No lessons yet.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
