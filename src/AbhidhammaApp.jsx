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

const WelcomeModal = ({ userId, onStudentComplete, onTeacherComplete }) => {
    const [step, setStep] = useState('role_select');
    const [name, setName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStudentSubmit = async () => {
        if (!name.trim() || !selectedGroup) return;
        setIsSubmitting(true);
        try {
            const studentRef = doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',userId);
            const snap = await getDoc(studentRef);
            if (snap.exists() && snap.data().status === 'approved') {
                onStudentComplete({...snap.data(), name: snap.data().name, group: snap.data().group||selectedGroup});
            } else {
                await setDoc(studentRef, { userId, name: name.trim(), group: selectedGroup, status: 'pending', timestamp: serverTimestamp() }, { merge: true });
                setStep('waiting_approval');
            }
        } catch(e) { console.error(e); } finally { setIsSubmitting(false); }
    };

    useEffect(() => {
        if (!userId || step !== 'waiting_approval') return;
        const unsub = onSnapshot(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','students',userId), snap => {
            if (snap.exists()) { const data = snap.data(); if (data.status==='approved') onStudentComplete({...data}); else if (data.status==='rejected') setStep('role_select'); }
        });
        return () => unsub();
    }, [userId, step]);

    return (
        <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
            <div className="bg-indigo-900/90 border border-indigo-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                {step==='role_select'&&<div><Globe className="w-16 h-16 mx-auto text-cyan-400 mb-4 animate-pulse"/><h2 className="text-3xl font-black text-white mb-8">📚 Abhidhamma App</h2><div className="space-y-4"><button onClick={()=>setStep('student_setup')} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl py-4 rounded-xl shadow-lg flex items-center justify-center gap-3"><User className="w-6 h-6"/> Student</button><button onClick={()=>setStep('teacher_login')} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl py-4 rounded-xl shadow-lg flex items-center justify-center gap-3"><Key className="w-6 h-6"/> Teacher</button></div></div>}
                {step==='student_setup'&&<div><User className="w-16 h-16 mx-auto text-cyan-400 mb-4"/><h2 className="text-3xl font-black text-white mb-4">Student Setup</h2><input className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 focus:ring-4 ring-cyan-400 outline-none" placeholder="Enter Your Full Name" value={name} onChange={e=>setName(e.target.value)}/><div className="grid grid-cols-2 gap-3 mb-6">{Object.entries(AGE_GROUPS).map(([key,info])=><button key={key} onClick={()=>setSelectedGroup(key)} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${selectedGroup===key?'bg-cyan-500 border-cyan-300 text-white scale-105':'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}>{info.icon}<span className="text-xs font-bold">{info.label}</span></button>)}</div><button onClick={handleStudentSubmit} disabled={!name||!selectedGroup||isSubmitting} className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-xl py-4 rounded-xl">{isSubmitting?<RotateCw className="w-6 h-6 mx-auto animate-spin"/>:"ENTER"}</button></div>}
                {step==='waiting_approval'&&<div><Lock className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-pulse"/><h2 className="text-2xl font-black text-white mb-4">Waiting for Approval...</h2><RotateCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin"/></div>}
                {step==='teacher_login'&&<div><Wand2 className="w-16 h-16 mx-auto text-purple-400 mb-4 animate-pulse"/><h2 className="text-3xl font-black text-white mb-4">Teacher Login</h2><input type="password" className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 focus:ring-4 ring-purple-400 outline-none" placeholder="Passcode" value={passcode} onChange={e=>{setPasscode(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&(passcode===TEACHER_PASSCODE?onTeacherComplete():setError('Incorrect Passcode.'))}/>{error&&<p className="text-red-400 mb-4 text-sm font-bold">{error}</p>}<button onClick={()=>passcode===TEACHER_PASSCODE?onTeacherComplete():setError('Incorrect Passcode.')} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xl py-4 rounded-xl">LOGIN</button></div>}
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
    const [imageInput, setImageInput] = useState('');
    const [message, setMessage] = useState('');
    const [activeQuizLessonId, setActiveQuizLessonId] = useState(null);
    const [activeQuizData, setActiveQuizData] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [openLessonId, setOpenLessonId] = useState(null);
    const [generatingLessonId, setGeneratingLessonId] = useState(null);
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

    const handleSaveLesson = async (e) => {
        e.preventDefault();
        if (!newLessonTitle.trim() || !newLessonContent.trim()) return showMessage("Fields required!");
        setIsLoading(true);
        try {
            const data = { title: newLessonTitle.trim(), burmeseContent: newLessonContent.trim() };
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
                    </div>
                </header>

                {message&&<div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold animate-bounce">{message}</div>}

                {currentRole==='Teacher' ? (
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-teal-300">{editingLesson?'Edit Lesson':'Add New Lesson'}</h3></div>
                            <form onSubmit={handleSaveLesson} className="space-y-4">
                                <input value={newLessonTitle} onChange={e=>setNewLessonTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={isLoading}/>
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
                        <div className="space-y-4">{lessons.map(l=><LessonItem key={l.id} lesson={l} isTeacher={true} onGenerateVariants={handleGenerateVariants} onEdit={l=>{setEditingLesson(l);setNewLessonTitle(l.title);setNewLessonContent(l.burmeseContent);}} isGenerating={generatingLessonId===l.id} userId={userId} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}</div>
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
