import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  onSnapshot, 
  collection, 
  updateDoc, 
  query, 
  where, 
  addDoc,
  deleteDoc,
  limit,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { 
    BookOpen, Users, Award, Sparkles, Loader2, RefreshCw, 
    CheckCircle, XCircle, Zap, User, Edit, Trash2, LayoutGrid, List, FileText,
    ArrowLeft, AlertTriangle,
    Clock,
    Triangle,
    Circle,
    Square,
    Star,
    Download,
    Upload,
    ChevronDown, 
    Heart,
    UserCheck,
    UserPlus,
    Bell,
    Unlock,
    Lock
} from 'lucide-react';
import { appId } from './firebaseConfig';
import { auth, db } from './firebase';

const API_KEY = ""; // AI features (Generate/Format/Quiz) need a real Gemini API key to work.
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const AGE_LEVELS = {
  storyteller: "Storytellers (Ages 5+ / Beginner)",
  explorer: "Explorers (Ages 6-8)",
  adventurer: "Adventurers (Ages 9-11)",
  voyager: "Voyagers (Ages 12+)"
};

const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const getClassDocRef = (classId) => doc(db, 'artifacts', appId, 'public', 'data', 'classes', classId);
const getScoresCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'scores');
const getCompletionsCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'quizCompletions');
const getGlobalAnnouncementsCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'globalAnnouncements');
const getStudentHeartDocRef = (classId, studentName) => doc(db, 'artifacts', appId, 'public', 'data', 'studentHearts', `${classId}_${encodeURIComponent(studentName)}`);
const getStudentHeartsCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'studentHearts');
const getReflectionsCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'reflections');
const getRosterCollectionRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'classRoster');
const getRosterDocRef = (classId, studentName) => doc(db, 'artifacts', appId, 'public', 'data', 'classRoster', `${classId}_${encodeURIComponent(studentName)}`);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-xl transition-all duration-300 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, className = '', disabled = false }) => (
  <button onClick={onClick} disabled={disabled} className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-pink-500 text-white shadow-lg shadow-pink-300 hover:bg-pink-600 focus:ring-pink-200'} ${className}`}>
    {children}
  </button>
);

const Input = ({ label, value, onChange, placeholder = '', type = 'text', className = '', name = '' }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" required name={name} />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder = '', rows = 3, className = '', name = '' }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" required name={name} />
  </div>
);

const Select = ({ label, value, onChange, children, className = '', name = '' }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      <select value={value} onChange={onChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none" required name={name}>
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const MessageModal = ({ message, type, onClose }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500';
    const icon = isSuccess ? <CheckCircle className="w-6 h-6 mr-2" /> : <XCircle className="w-6 h-6 mr-2" />;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-40 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-transform duration-300" onClick={e => e.stopPropagation()}>
                <div className={`flex items-center text-white p-3 rounded-lg ${bgColor} mb-4`}>
                    {icon}<span className="font-bold text-lg">{isSuccess ? 'Success!' : 'Error!'}</span>
                </div>
                <p className="text-gray-700 mb-6">{message}</p>
                <Button onClick={onClose} className="w-full">OK</Button>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ message, confirmText = 'Confirm', onConfirm, onCancel }) => {
    if (!message) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-transform duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center text-yellow-600 mb-4">
                    <AlertTriangle className="w-8 h-8 mr-3" /><span className="font-bold text-xl">Confirmation</span>
                </div>
                <p className="text-gray-700 mb-6 text-lg">{message}</p>
                <div className="flex justify-end space-x-4">
                    <Button onClick={onCancel} className="bg-gray-400 hover:bg-gray-500 shadow-none">Cancel</Button>
                    <Button onClick={onConfirm} className={`bg-red-500 hover:bg-red-600 shadow-lg shadow-red-300`}>{confirmText}</Button>
                </div>
            </div>
        </div>
    );
};

const ClassSwitchModal = ({ classId, value, setValue, onSwitch, onCancel }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
      <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      <h2 className="font-bold text-2xl text-gray-800 mb-2">All Done!</h2>
      <p className="text-gray-600 mb-4">🎉 Congratulations! You have completed all the lessons in Class <span className="font-bold">{classId}</span>.</p>
      <p className="text-gray-600 mb-4">Would you like to explore lessons in another Class ID?</p>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter another Class ID" className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-center" />
      <div className="flex flex-col space-y-3">
        <Button onClick={() => onSwitch(value)} className="w-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-300" disabled={!value.trim()}>Go to This Class</Button>
        <Button onClick={onCancel} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none">Not Now</Button>
      </div>
    </div>
  </div>
);

const QuizConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <Zap className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="font-bold text-2xl text-gray-800 mb-2">Confirm</h2>
            <p className="text-gray-600 mb-6 text-lg">Have you finished reading the lesson?</p>
            <div className="flex flex-col space-y-3">
                <Button onClick={onConfirm} className="w-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-300 text-lg">Yes, I'm ready</Button>
                <Button onClick={onCancel} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none text-lg">Not yet</Button>
            </div>
        </div>
    </div>
);

const CompetitorCountModal = ({ maxAvailable, count, setCount, onConfirm, onCancel }) => {
    const hasEnoughRealStudents = maxAvailable >= 5;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h2 className="font-bold text-2xl text-gray-800 mb-2">Choose Competitors</h2>
                {hasEnoughRealStudents ? (
                    <>
                        <p className="text-gray-600 mb-4 text-lg">How many classmates do you want to compete against? (minimum 5)</p>
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            <button onClick={() => setCount(c => Math.max(5, c - 1))} className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-xl">-</button>
                            <span className="text-3xl font-black text-blue-600 w-16">{count}</span>
                            <button onClick={() => setCount(c => Math.min(maxAvailable + 1, c + 1))} className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-xl">+</button>
                        </div>
                    </>
                ) : (<p className="text-gray-600 mb-6 text-lg">You will compete against 5 students in this round.</p>)}
                <div className="flex flex-col space-y-3">
                    <Button onClick={onConfirm} className="w-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-300 text-lg">Start Quiz</Button>
                    <Button onClick={onCancel} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none text-lg">Cancel</Button>
                </div>
            </div>
        </div>
    );
};

const nameToColorClass = (name) => {
    let hash = 0;
    if (!name || name.length === 0) return 'bg-gray-200 text-gray-800 border-gray-400';
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); hash = hash & hash; }
    const colors = ['bg-blue-100 text-blue-800 border-blue-300','bg-green-100 text-green-800 border-green-300','bg-yellow-100 text-yellow-800 border-yellow-300','bg-purple-100 text-purple-800 border-purple-300','bg-pink-100 text-pink-800 border-pink-300','bg-indigo-100 text-indigo-800 border-indigo-300','bg-teal-100 text-teal-800 border-teal-300','bg-orange-100 text-orange-800 border-orange-300'];
    return colors[Math.abs(hash) % 8];
};

const GlobalScoreAnnouncement = ({ announcement, onClose }) => {
  if (!announcement) return null;
  const { studentName, totalScore } = announcement;
  const colorClass = nameToColorClass(studentName);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none" onAnimationEnd={onClose}>
      <div className="absolute bottom-0 left-0" style={{ animation: 'flyAcross 7s linear forwards' }}>
        <span className="text-8xl" role="img" aria-label="airplane">✈️</span>
      </div>
      <div className={`absolute p-6 rounded-2xl border-4 shadow-2xl ${colorClass}`} style={{ animation: 'dropText 7s ease-out forwards' }}>
        <h3 className="text-3xl font-extrabold text-center">Score Announcement!</h3>
        <p className="text-2xl font-bold text-center mt-2">{studentName} has {totalScore} points!</p>
      </div>
    </div>
  );
};

const MarkdownText = ({ markdown, imageUrls = [] }) => { 
    const processMarkdown = (text) => {
        if (typeof text !== 'string') return null;
        if (text.trim() === '') return null; 
        const lines = text.split('\n');
        const elements = [];
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('##')) {
                elements.push(<h2 key={index} className="text-2xl font-black text-purple-700 mt-6 mb-3">{trimmedLine.substring(2).trim()}</h2>);
            } else if (trimmedLine.startsWith('#')) {
                elements.push(<h1 key={index} className="text-3xl font-extrabold text-blue-700 mt-8 mb-4 border-b-2 pb-2">{trimmedLine.substring(1).trim()}</h1>);
            } else if (trimmedLine.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
                elements.push(<img key={index} src={trimmedLine} alt="Lesson content" className="w-full max-w-2xl mx-auto max-h-[400px] h-auto object-contain rounded-xl my-4 shadow-lg" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x300/fecaca/991b1b?text=Image+Not+Found`; }} />);
            } else {
                if (trimmedLine === '') {
                    elements.push(<p key={index} className="h-4" />);
                } else {
                    let html = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                    elements.push(<p key={index} dangerouslySetInnerHTML={{ __html: html }} className="mb-3 leading-relaxed text-lg text-gray-700" />);
                }
            }
        });
        const validImageUrls = imageUrls.filter(url => url && url.trim().startsWith('http'));
        if (validImageUrls.length > 0) {
            const pIndexes = elements.map((el, i) => (el.type === 'p' && el.props.className !== 'h-4') ? i : -1).filter(i => i !== -1);
            if (pIndexes.length > validImageUrls.length) {
                const interval = Math.floor(pIndexes.length / (validImageUrls.length + 1));
                let injectedCount = 0;
                for (let i = 0; i < validImageUrls.length; i++) {
                    const idx = pIndexes[(i + 1) * interval - 1]; 
                    if (idx !== undefined) {
                        elements.splice(idx + 1 + injectedCount, 0, <img key={`inj-${i}`} src={validImageUrls[i]} alt="Lesson" className="w-full max-w-2xl mx-auto max-h-[400px] h-auto object-contain rounded-xl my-4 shadow-lg" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x300/fecaca/991b1b?text=Image+Not+Found`; }} />);
                        injectedCount++;
                    }
                }
            }
        }
        return elements;
    };
    return <div className="font-sans">{processMarkdown(markdown)}</div>;
};

const NotificationBell = ({ completionsList, userName, classId, onViewProfile }) => {
  const storageKey = `bell_last_read_${classId}_${userName}`;
  const [lastRead, setLastRead] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : (Date.now() - 24 * 60 * 60 * 1000);
  });
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = completionsList.filter(c => {
    const ts = c.timestamp > 1e12 ? c.timestamp : c.timestamp * 1000;
    return ts > lastRead;
  }).length;
  const handleToggle = () => {
    if (isOpen) { const now = Date.now(); setLastRead(now); localStorage.setItem(storageKey, now.toString()); }
    setIsOpen(!isOpen);
  };
  return (
    <div className="relative z-50">
      <button onClick={handleToggle} className="relative p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
        <Bell className="w-7 h-7 text-gray-700" />
        {unreadCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="p-3 bg-blue-50 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-bold text-blue-800 flex items-center gap-2"><Bell className="w-4 h-4" /> Class Activity</h4>
            <button onClick={handleToggle}><XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {completionsList.length === 0 ? (<p className="text-sm text-gray-500 p-4 text-center italic">No activity yet.</p>) : (
              <ul className="space-y-2">
                {completionsList.map((c, i) => {
                  const ts = c.timestamp > 1e12 ? c.timestamp : c.timestamp * 1000;
                  const isNew = ts > lastRead;
                  return (
                    <li key={i} className={`text-sm p-3 rounded-lg border shadow-sm flex justify-between items-center ${isNew ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <span>{isNew ? '🎉' : '✅'} <span className="font-bold text-green-700">{c.studentName}</span> finished Lesson <span className="font-bold">{c.lessonId}</span></span>
                      <button onClick={() => { setIsOpen(false); onViewProfile(c.studentName); }} className="ml-2 p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 flex-shrink-0" title="View History"><User className="w-4 h-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TeacherNotificationBell = ({ completionsList }) => {
  const [isOpen, setIsOpen] = useState(false);
  const storageKey = `teacher_bell_last_read`;
  const [lastRead, setLastRead] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : 0;
  });
  const unreadCount = completionsList.filter(c => {
    const ts = c.timestamp > 1e12 ? c.timestamp : c.timestamp * 1000;
    return ts > lastRead;
  }).length;
  const handleToggle = () => {
    if (isOpen) { const now = Date.now(); setLastRead(now); localStorage.setItem(storageKey, now.toString()); }
    setIsOpen(!isOpen);
  };
  return (
    <div className="relative z-50">
      <button onClick={handleToggle} className="relative p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
        <Bell className="w-7 h-7 text-gray-700" />
        {unreadCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="p-3 bg-purple-50 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-bold text-purple-800 flex items-center gap-2"><Bell className="w-4 h-4" /> Student Activity</h4>
            <button onClick={handleToggle}><XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {completionsList.length === 0 ? (<p className="text-sm text-gray-500 p-4 text-center italic">No activity yet.</p>) : (
              <ul className="space-y-2">
                {completionsList.map((c, i) => {
                  const ts = c.timestamp > 1e12 ? c.timestamp : c.timestamp * 1000;
                  const isNew = ts > lastRead;
                  return (
                    <li key={i} className={`text-sm p-3 rounded-lg border shadow-sm ${isNew ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                      <span>{isNew ? '🔔' : '✅'} <span className="font-bold text-purple-700">{c.studentName}</span> finished Lesson <span className="font-bold">{c.lessonId}</span></span>
                      <span className="block text-xs text-gray-400 mt-1">{new Date(ts).toLocaleTimeString()}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DraggableRankBadge = ({ myRank, myLessonsCompleted, lessons, allScores, userName, studentAgeLevel, handleSetView, setActiveLessonId, playClickSound, myTotalLessonsCompletedAllClasses }) => {
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 20 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [focusMode, setFocusMode] = useState('rank');
  const badgeRef = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const completedLessonIds = new Set(allScores.filter(s => s.studentName === userName).map(s => s.lessonId));
  const nextLesson = lessons.find(l => !completedLessonIds.has(l.lessonId) && l.questions?.[studentAgeLevel]?.length >= 8);
  const allDone = lessons.length > 0 && lessons.every(l => completedLessonIds.has(l.lessonId));
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const onMouseDown = (e) => { e.preventDefault(); draggingRef.current = true; movedRef.current = false; dragStartRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }; };
  const onTouchStart = (e) => { const t = e.touches[0]; draggingRef.current = true; movedRef.current = false; dragStartRef.current = { x: t.clientX, y: t.clientY, posX: pos.x, posY: pos.y }; };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current) return;
      const dragStart = dragStartRef.current;
      if (Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5) movedRef.current = true;
      const bw = badgeRef.current?.offsetWidth || 100; const bh = badgeRef.current?.offsetHeight || 40;
      setPos({ x: clamp(dragStart.posX + e.clientX - dragStart.x, 0, window.innerWidth - bw), y: clamp(dragStart.posY + e.clientY - dragStart.y, 0, window.innerHeight - bh) });
    };
    const onTouchMove = (e) => {
      if (!draggingRef.current) return;
      const t = e.touches[0]; const dragStart = dragStartRef.current;
      if (Math.abs(t.clientX - dragStart.x) > 5 || Math.abs(t.clientY - dragStart.y) > 5) movedRef.current = true;
      const bw = badgeRef.current?.offsetWidth || 100; const bh = badgeRef.current?.offsetHeight || 40;
      setPos({ x: clamp(dragStart.posX + t.clientX - dragStart.x, 0, window.innerWidth - bw), y: clamp(dragStart.posY + t.clientY - dragStart.y, 0, window.innerHeight - bh) });
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (movedRef.current) return;
      if (focusMode === 'rank') {
        const target = document.getElementById('my-leaderboard-rank');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowTooltip(false); setFocusMode('lesson');
      } else {
        if (nextLesson) {
          handleSetView('studentLesson');
          setTimeout(() => {
            const target = document.getElementById(`lesson-row-${nextLesson.lessonId}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setShowTooltip(true);
          }, 150);
        } else { setShowTooltip(false); }
        setFocusMode('rank');
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [focusMode, nextLesson, handleSetView]);

  if (dismissed) return null;

  return (
    <div ref={badgeRef} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, userSelect: 'none', touchAction: 'none' }}>
      {showTooltip && (
        <div className={`absolute w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 text-sm z-[9999] ${pos.y < 220 ? 'top-full mt-2' : 'bottom-full mb-2'} ${pos.x < 140 ? 'left-0' : pos.x > window.innerWidth - 140 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
          {allDone ? (
            <div className="text-center">
              <div className="text-2xl mb-1">🎉</div>
              <p className="font-bold text-green-700 mb-1">All Lessons Complete!</p>
              <p className="text-gray-600 text-xs">Congratulations! You have successfully completed all available lessons. Keep up the great work!</p>
              <button onClick={() => setDismissed(true)} className="mt-2 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600">Close</button>
            </div>
          ) : nextLesson ? (
            <div>
              <p className="font-bold text-blue-700 mb-1 flex items-center gap-1"><span>👆</span> Next Lesson:</p>
              <p className="text-gray-800 font-semibold">{nextLesson.lessonId}: {nextLesson.title}</p>
              <button onClick={() => {
                  playClickSound?.(); setActiveLessonId(nextLesson.lessonId); handleSetView('studentReadLesson'); setShowTooltip(false);
                  setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); const top = document.getElementById('lesson-content-top'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                }} className="mt-2 w-full px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600">Start This Lesson</button>
            </div>
          ) : (<p className="text-gray-500 text-xs text-center italic">No lessons available yet.</p>)}
        </div>
      )}
      <button onMouseDown={onMouseDown} onTouchStart={onTouchStart} className="flex items-center px-3 py-2 bg-yellow-400 text-yellow-900 rounded-full shadow-2xl font-bold text-sm border-2 border-yellow-300 cursor-grab active:cursor-grabbing select-none" style={{ whiteSpace: 'nowrap' }} title="Drag me anywhere!">
        #{myRank} 🏆 {myLessonsCompleted} 🌍 {myTotalLessonsCompletedAllClasses}
      </button>
    </div>
  );
};

const Leaderboard = React.memo(({ globalLeaderboardScores, setSelectedName, handleSetView, playClickSound, heartCounts, handleHeartClick, setSelectedAgeLevel, userName }) => {
  const myRef = useRef(null);
  return (
    <Card className="flex-1 min-w-80 h-full overflow-y-auto">
      <h3 className="text-2xl font-black text-blue-800 mb-6 flex items-center justify-between">
        <span className="flex items-center"><Award className="w-6 h-6 mr-3 text-yellow-500 fill-yellow-500" />Global Leaderboard</span>
        <button onClick={() => { playClickSound?.(); handleSetView('globalLeaderboard'); }} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-all lg:hidden"><Users className="w-5 h-5" /></button>
      </h3>
      {globalLeaderboardScores.length === 0 ? (<p className="text-gray-500 italic">No scores yet. Be the first!</p>) : (
        <ol className="space-y-3">
          {globalLeaderboardScores.map((score, index) => {
              const isMe = userName && score.studentName === userName; 
              const colorClass = isMe ? 'ring-4 ring-pink-400 bg-pink-50 border-pink-400 transform scale-[1.02] shadow-lg' : `${nameToColorClass(score.studentName)} hover:shadow-md`;
              return (
                  <li key={index} ref={isMe ? myRef : null} id={isMe ? 'my-leaderboard-rank' : undefined} className={`p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 flex justify-between items-center font-bold ${colorClass}`}>
                      <span className={`text-lg sm:text-xl font-extrabold w-7 sm:w-8 text-center ${index < 3 ? 'text-red-500' : ''}`}>#{index + 1}</span>
                      <span className="flex-1 ml-2 sm:ml-4 truncate text-sm sm:text-base">
                          <span className="hover:underline" onClick={() => { playClickSound?.(); setSelectedName(score.studentName); handleSetView('studentProfile'); }}>
                            <User className="w-4 h-4 inline-block mr-2" />{score.studentName}{isMe && <span className="ml-2 text-[10px] sm:text-xs bg-pink-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">(You)</span>}
                          </span>
                          <span className="ml-1 text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:underline text-xs" onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedAgeLevel(score.studentAgeLevel); handleSetView('ageGroupLeaderboard'); }}>
                            ({AGE_LEVELS[score.studentAgeLevel] ? AGE_LEVELS[score.studentAgeLevel].split('(')[0].trim() : (score.studentAgeLevel || 'default')})
                          </span>
                      </span>
                      <span className="text-lg sm:text-xl font-black ml-2">{score.totalScore} pts</span>
                      {handleHeartClick ? (
                        <button onClick={(e) => { e.stopPropagation(); handleHeartClick?.(score.studentName); }} className="flex items-center space-x-1 p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-all ml-1 sm:ml-2">
                          <Heart className="w-5 h-5" /><span className="font-bold text-xs sm:text-sm">{heartCounts?.[score.studentName]?.hearts || 0}</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 p-2 rounded-full bg-pink-100 text-pink-600 transition-all ml-1 sm:ml-2">
                          <Heart className="w-5 h-5" /><span className="font-bold text-xs sm:text-sm">{heartCounts?.[score.studentName]?.hearts || 0}</span>
                        </div>
                      )}
                  </li>
              );
          })}
        </ol>
      )}
    </Card>
  );
});

const TeacherDashboard = React.memo(({
  classId, newLesson, setNewLesson, lessons, isLoading, 
  handleSaveLesson, handleFormatLesson, generateQuestions, 
  handleGenerateAllLevels, handleRegenerateLevel, 
  handleEditLesson, handleDeleteLesson, globalLeaderboardScores, 
  setSelectedName, handleSetView, playClickSound,
  handleDownloadLessons, handleUploadLessons, fileInputRef,
  handleDownloadLessonsOnly, handleUploadLessonsOnly, fileInputRefLessonsOnly,
  heartCounts, setSelectedAgeLevel,
  classRoster, handleApproveStudent, handleDeleteStudent,
  allScores, studentsWithCompletionsNotApproved, onApproveStudentsWithCompletions,
  autoApprove, handleToggleAutoApprove,
  completionsList, onLinkStudent
}) => {
  const [activeTab, setActiveTab] = useState('lessons'); 
  const [linkPickerFor, setLinkPickerFor] = useState(null);
  const [tutoringStudents, setTutoringStudents] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [showBulkMatch, setShowBulkMatch] = useState(false);
  const [bulkLinking, setBulkLinking] = useState(false);

  const loadTutoringStudents = async () => {
    if (tutoringStudents !== null) return;
    try {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const list = snap.docs
        .map(d => ({ id: d.id, name: d.data().name, displayId: d.data().displayId, isActive: d.data().isActive }))
        .filter(s => s.name && (s.isActive === true || s.isActive === 'pending'));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setTutoringStudents(list);
    } catch (err) {
      console.error('Error loading Tutoring students:', err);
      setTutoringStudents([]);
    }
  };

  const pendingStudents = classRoster.filter(s => s.status === 'pending');
  const approvedStudentsWithIndex = classRoster
    .filter(s => s.status === 'approved')
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((student, index) => ({ ...student, displayIndex: index + 1 }));
  const sortedApprovedStudents = [...approvedStudentsWithIndex].sort((a, b) => {
    const aTime = Date.now() - a.lastSeen; const bTime = Date.now() - b.lastSeen;
    const aIsOnline = aTime < 180000; const bIsOnline = bTime < 180000;
    const aIsWarning = aTime >= 180000 && aTime < 480000; const bIsWarning = bTime >= 180000 && bTime < 480000;
    if (aIsOnline && !bIsOnline) return -1; if (!aIsOnline && bIsOnline) return 1;
    if (aIsWarning && !bIsWarning) return -1; if (!aIsWarning && bIsWarning) return 1;
    return a.joinedAt - b.joinedAt; 
  });

  // Students from scores/completions who are NOT yet in the approved roster
  const bulkNameMatches = (tutoringStudents || [])
    ? sortedApprovedStudents
        .filter(s => !s.linkedToTutoring)
        .map(s => {
          const match = (tutoringStudents || []).find(ts => ts.name.trim().toLowerCase() === s.studentName.trim().toLowerCase());
          return match ? { oldName: s.studentName, newName: match.name, tutoringUid: match.id } : null;
        })
        .filter(Boolean)
    : [];

  const handleLinkAllMatches = async () => {
    setBulkLinking(true);
    for (const m of bulkNameMatches) {
      try { await onLinkStudent(m.oldName, m.newName, m.tutoringUid); } catch (e) { console.error('Bulk link error:', e); }
    }
    setBulkLinking(false);
    setShowBulkMatch(false);
  };

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-end space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-4xl font-extrabold text-blue-700">Teacher Dashboard: {classId}</h1>
              <p className="text-xl text-gray-600">Manage Lessons, Quizzes, and Students.</p>
            </div>
            <div className="ml-4"><TeacherNotificationBell completionsList={completionsList} /></div>
          </div>
        </div>
        <div className="flex bg-white rounded-xl shadow-md p-1 border-2 border-blue-100 flex-wrap">
          <button onClick={() => setActiveTab('lessons')} className={`px-4 md:px-6 py-2 font-bold rounded-lg transition-colors flex items-center ${activeTab === 'lessons' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}><BookOpen className="w-5 h-5 mr-2" /> Lessons</button>
          <button onClick={() => setActiveTab('students')} className={`px-4 md:px-6 py-2 font-bold rounded-lg transition-colors flex items-center relative ${activeTab === 'students' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Users className="w-5 h-5 mr-2" /> Students & Scores
            {pendingStudents.length > 0 && (<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md animate-pulse">{pendingStudents.length}</span>)}
          </button>
        </div>
      </div>
      
      {activeTab === 'lessons' && (
        <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden animate-fade-in-up">
          <Card className="w-full lg:w-1/2 overflow-y-auto">
            <h2 className="text-3xl font-bold text-purple-600 mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-3" />
              {newLesson.editingId ? `Editing Lesson ${newLesson.editingId}` : 'Create New Lesson'}
            </h2>
            <Input label="Lesson Title (optional — leave blank to auto-generate)" value={newLesson.title} onChange={(e) => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="E.g., The Solar System (or leave blank)" />
            <Textarea label="Master Lesson Content (write in English, any level)" rows="5" value={newLesson.masterContent} onChange={(e) => setNewLesson(p => ({ ...p, masterContent: e.target.value }))} placeholder="Write your lesson content here in English. Then click 'Generate All 4 Levels' below." />
            <Button onClick={() => handleGenerateAllLevels()} disabled={isLoading} className="bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-300 mb-6 flex items-center">
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}Generate All 4 Levels
            </Button>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Content ({AGE_LEVELS.storyteller})</span>
              <button onClick={() => handleRegenerateLevel('storyteller')} disabled={isLoading} className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Regenerate</button>
            </div>
            <Textarea rows="4" value={newLesson.content.storyteller} onChange={(e) => setNewLesson(p => ({ ...p, content: { ...p.content, storyteller: e.target.value }, formattedContent: { ...p.formattedContent, storyteller: '' } }))} placeholder="Enter very simple story content for 5+ year olds..." />
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Content ({AGE_LEVELS.explorer})</span>
              <button onClick={() => handleRegenerateLevel('explorer')} disabled={isLoading} className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Regenerate</button>
            </div>
            <Textarea rows="4" value={newLesson.content.explorer} onChange={(e) => setNewLesson(p => ({ ...p, content: { ...p.content, explorer: e.target.value }, formattedContent: { ...p.formattedContent, explorer: '' } }))} placeholder="Enter simple content for 6-8 year olds..." />
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Content ({AGE_LEVELS.adventurer})</span>
              <button onClick={() => handleRegenerateLevel('adventurer')} disabled={isLoading} className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Regenerate</button>
            </div>
            <Textarea rows="4" value={newLesson.content.adventurer} onChange={(e) => setNewLesson(p => ({ ...p, content: { ...p.content, adventurer: e.target.value }, formattedContent: { ...p.formattedContent, adventurer: '' } }))} placeholder="Enter detailed content for 9-11 year olds..." />
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Content ({AGE_LEVELS.voyager})</span>
              <button onClick={() => handleRegenerateLevel('voyager')} disabled={isLoading} className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Regenerate</button>
            </div>
            <Textarea rows="4" value={newLesson.content.voyager} onChange={(e) => setNewLesson(p => ({ ...p, content: { ...p.content, voyager: e.target.value }, formattedContent: { ...p.formattedContent, voyager: '' } }))} placeholder="Enter advanced content for 12+ year olds..." />
            <Input label="Header Image URL (Header Image)" value={newLesson.headerImageUrl} onChange={(e) => {
                const headerUrl = e.target.value; let updates = { headerImageUrl: headerUrl };
                const match = headerUrl.match(/^(.*)(\d{2,})(\.(?:png|jpg|jpeg|webp))$/i);
                if (match) {
                  const baseUrl = match[1]; const numberStr = match[2]; const extension = match[3]; const number = parseInt(numberStr, 10); const numDigits = numberStr.length; 
                  if (!isNaN(number)) {
                    updates.image1Url = `${baseUrl}${String(number + 1).padStart(numDigits, '0')}${extension}`;
                    updates.image2Url = `${baseUrl}${String(number + 2).padStart(numDigits, '0')}${extension}`;
                    updates.image3Url = `${baseUrl}${String(number + 3).padStart(numDigits, '0')}${extension}`;
                    updates.image4Url = `${baseUrl}${String(number + 4).padStart(numDigits, '0')}${extension}`;
                  }
                }
                setNewLesson(p => ({ ...p, ...updates }));
              }} placeholder="E.g., .../00101.png" />
            <Input label="Content Image 1" value={newLesson.image1Url} onChange={(e) => setNewLesson(p => ({ ...p, image1Url: e.target.value }))} />
            <Input label="Content Image 2" value={newLesson.image2Url} onChange={(e) => setNewLesson(p => ({ ...p, image2Url: e.target.value }))} />
            <Input label="Content Image 3" value={newLesson.image3Url} onChange={(e) => setNewLesson(p => ({ ...p, image3Url: e.target.value }))} />
            <Input label="Content Image 4" value={newLesson.image4Url} onChange={(e) => setNewLesson(p => ({ ...p, image4Url: e.target.value }))} />
            <div className="flex space-x-4 mt-6">
              <Button onClick={handleSaveLesson} disabled={isLoading}>{newLesson.editingId ? 'Save Changes' : `Add Lesson (${lessons.length}/50)`}</Button>
              {newLesson.editingId && (
                <Button onClick={() => setNewLesson({ title: '', masterContent: '', content: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, editingId: null, headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '' })} className="bg-gray-400 hover:bg-gray-500 shadow-none">Cancel</Button>
              )}
            </div>
          </Card>
          <div className="w-full lg:w-1/2 flex flex-col gap-8 overflow-hidden">
            <Card className="flex-1 overflow-y-auto">
              <input type="file" ref={fileInputRef} onChange={handleUploadLessons} accept=".json" className="hidden" />
              <input type="file" ref={fileInputRefLessonsOnly} onChange={handleUploadLessonsOnly} accept=".json" className="hidden" />
              <h2 className="text-3xl font-bold text-green-600 mb-4 flex flex-col items-start gap-3">
                <span className="flex items-center"><FileText className="w-6 h-6 mr-3" />Lesson List</span>
                <div className="flex flex-wrap gap-2 w-full">
                  <div className="flex gap-1">
                    <Button onClick={handleDownloadLessonsOnly} className="bg-blue-500 hover:bg-blue-600 px-3 py-1 text-xs flex items-center"><Download className="w-3 h-3 mr-1" />📚 Lessons Only</Button>
                    <Button onClick={() => fileInputRefLessonsOnly.current?.click()} className="bg-blue-500 hover:bg-blue-600 px-3 py-1 text-xs flex items-center"><Upload className="w-3 h-3 mr-1" />📚 Import Lessons</Button>
                  </div>
                  <div className="flex gap-1">
                    <Button onClick={handleDownloadLessons} className="bg-gray-500 hover:bg-gray-600 px-3 py-1 text-xs flex items-center"><Download className="w-3 h-3 mr-1" />📦 Full Backup</Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="bg-gray-500 hover:bg-gray-600 px-3 py-1 text-xs flex items-center"><Upload className="w-3 h-3 mr-1" />📦 Restore All</Button>
                  </div>
                </div>
              </h2>
              <div className="space-y-4">
                {lessons.map(lesson => {
                  const isFormatted = lesson.formattedContent && lesson.formattedContent.storyteller && lesson.formattedContent.explorer && lesson.formattedContent.adventurer && lesson.formattedContent.voyager;
                  const hasContent = lesson.content && lesson.content.storyteller && lesson.content.explorer && lesson.content.adventurer && lesson.content.voyager;
                  const quizzesGenerated = (lesson.questions?.storyteller?.length === 10 ? 1 : 0) + (lesson.questions?.explorer?.length === 10 ? 1 : 0) + (lesson.questions?.adventurer?.length === 10 ? 1 : 0) + (lesson.questions?.voyager?.length === 10 ? 1 : 0);
                  return (
                    <div key={lesson.lessonId} className="p-4 border-2 border-green-200 rounded-xl bg-green-50 flex flex-col space-y-2">
                      <h3 className="text-xl font-bold text-green-800">{lesson.lessonId}: {lesson.title}</h3>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-sm text-gray-600">{quizzesGenerated}/4 Quizzes | Formatted: {isFormatted ? 'Yes' : 'No'}</span>
                        <div className="flex space-x-2">
                            <Button onClick={() => handleFormatLesson(lesson.lessonId, lesson.content)} className="bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-300 px-3 py-1 text-sm flex items-center" disabled={isLoading || !hasContent}>
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LayoutGrid className="w-4 h-4 mr-2" />}AI Format
                            </Button>
                            <Button onClick={() => generateQuestions(lesson.lessonId, lesson.title, lesson.content)} className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-300 px-3 py-1 text-sm flex items-center" disabled={isLoading || !hasContent}>
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}AI Quizzes
                            </Button>
                            <Button onClick={() => handleEditLesson(lesson)} className="bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-300 px-3 py-1 text-sm flex items-center"><Edit className="w-4 h-4 mr-1" /></Button>
                            <Button onClick={() => handleDeleteLesson(lesson.lessonId)} className="bg-red-500 hover:bg-red-600 shadow-lg shadow-red-300 px-3 py-1 text-sm flex items-center"><Trash2 className="w-4 h-4 mr-1" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {lessons.length === 0 && <p className="text-gray-500 italic">No lessons created yet.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden animate-fade-in-up">
          <Card className="w-full lg:w-1/3 overflow-y-auto border-4 border-yellow-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-600 flex items-center"><UserPlus className="w-6 h-6 mr-3" />Pending Requests</h2>
              <button onClick={handleToggleAutoApprove} className={`flex items-center px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm ${autoApprove ? 'bg-green-100 text-green-700 border-2 border-green-400' : 'bg-gray-100 text-gray-600 border-2 border-gray-300'}`} title="When ON, new students will enter without waiting.">
                 {autoApprove ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}Auto-Approve: {autoApprove ? 'ON' : 'OFF'}
              </button>
            </div>
            {pendingStudents.length === 0 ? (<p className="text-gray-500 italic">No pending requests.</p>) : (
              <div className="space-y-4">
                {pendingStudents.map(student => (
                  <div key={student.studentName} className="p-4 bg-yellow-50 rounded-xl border border-yellow-300 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-gray-800">{student.studentName}</p>
                      <p className="text-sm text-gray-600">{AGE_LEVELS[student.studentAgeLevel]?.split('(')[0]}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={() => handleApproveStudent(student.studentName)} className="bg-green-500 hover:bg-green-600 px-4 py-2 text-sm">Approve</Button>
                      <Button onClick={() => handleDeleteStudent(student.studentName)} className="bg-red-500 hover:bg-red-600 px-4 py-2 text-sm shadow-none">Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="w-full lg:w-1/3 overflow-y-auto border-4 border-green-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-green-600 flex items-center"><UserCheck className="w-6 h-6 mr-3" />Approved Students</h2>
              <button
                onClick={() => { setShowBulkMatch(v => !v); if (!showBulkMatch) loadTutoringStudents(); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200"
              >
                🔍 Find Matching Names
              </button>
            </div>
            {showBulkMatch && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                {tutoringStudents === null ? (
                  <p className="text-sm text-gray-500">Loading Tutoring students...</p>
                ) : bulkNameMatches.length === 0 ? (
                  <p className="text-sm text-gray-600">No matching names found among unlinked students.</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-indigo-800 mb-2">Found {bulkNameMatches.length} matching name{bulkNameMatches.length === 1 ? '' : 's'}:</p>
                    <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                      {bulkNameMatches.map((m, i) => (
                        <p key={i} className="text-sm text-gray-700">
                          <span className="font-semibold">{m.oldName}</span> → <span className="font-semibold text-indigo-700">{m.newName}</span>
                        </p>
                      ))}
                    </div>
                    <Button onClick={handleLinkAllMatches} disabled={bulkLinking} className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-300 px-4 py-2 text-sm">
                      {bulkLinking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `🔗 Link All (${bulkNameMatches.length})`}
                    </Button>
                  </>
                )}
              </div>
            )}
            {studentsWithCompletionsNotApproved.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-semibold text-sm mb-2">
                  🔍 {studentsWithCompletionsNotApproved.length} student{studentsWithCompletionsNotApproved.length > 1 ? 's' : ''} have completions but are not yet approved:
                  <span className="font-normal ml-1">{studentsWithCompletionsNotApproved.join(', ')}</span>
                </p>
                <button onClick={onApproveStudentsWithCompletions} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
                  ✅ Approve All & Add to Roster
                </button>
              </div>
            )}
            {sortedApprovedStudents.length === 0 ? (<p className="text-gray-500 italic">No approved students yet. Click above to approve students with completions.</p>) : (
              <div className="space-y-3">
                {sortedApprovedStudents.map((student) => {
                  const timeSinceLastSeen = Date.now() - student.lastSeen;
                  const isOnline = timeSinceLastSeen < 180000;
                  const isWarning = timeSinceLastSeen >= 180000 && timeSinceLastSeen < 480000;
                  const isPickerOpen = linkPickerFor === student.studentName;
                  const filteredTutoringStudents = (tutoringStudents || []).filter(s => s.name.toLowerCase().includes(linkSearch.toLowerCase()));
                  return (
                    <div key={student.studentName} className={`p-3 rounded-xl border transition-colors ${isOnline ? 'bg-green-50 border-green-300' : isWarning ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200 opacity-80'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <span className={`font-black text-2xl w-8 ${isOnline ? 'text-green-700' : isWarning ? 'text-red-700' : 'text-gray-500'}`}>{student.displayIndex}.</span>
                          <div>
                            <p className={`font-bold text-lg ${isOnline ? 'text-gray-800' : isWarning ? 'text-red-800' : 'text-gray-600'}`}>
                              {student.studentName} {student.linkedToTutoring && <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full ml-1">🔗 Linked</span>}
                            </p>
                            <div className="flex items-center mt-1">
                              {isOnline ? (
                                <>
                                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span> 
                                  <span className="text-xs text-green-600 font-bold">Online</span>
                                  {student.currentLessonId && (<span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">Viewing: {student.currentLessonId}</span>)}
                                </>
                              ) : isWarning ? (
                                <>
                                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2 animate-pulse"></span> 
                                  <span className="text-xs text-red-600 font-bold">Inactive (Please warn student)</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2.5 h-2.5 bg-gray-400 rounded-full mr-2"></span> <span className="text-xs text-gray-500">Offline</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Button onClick={() => handleDeleteStudent(student.studentName)} className="bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs shadow-none">Remove</Button>
                          <button
                            onClick={() => { setLinkSearch(''); setLinkPickerFor(isPickerOpen ? null : student.studentName); if (!isPickerOpen) loadTutoringStudents(); }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            🔗 Link to Tutoring
                          </button>
                        </div>
                      </div>
                      {isPickerOpen && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
                          <input
                            type="text" value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)}
                            placeholder="Search Tutoring students..."
                            className="w-full p-2 mb-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          {tutoringStudents === null ? (
                            <p className="text-sm text-gray-500 p-2">Loading students...</p>
                          ) : filteredTutoringStudents.length === 0 ? (
                            <p className="text-sm text-gray-500 p-2">No matching students found.</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {filteredTutoringStudents.map(ts => (
                                <button
                                  key={ts.id}
                                  onClick={() => { onLinkStudent && onLinkStudent(student.studentName, ts.name, ts.id); setLinkPickerFor(null); }}
                                  className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 text-sm border border-transparent hover:border-indigo-200"
                                >
                                  <span className="font-semibold text-gray-800">{ts.name}</span> <span className="text-xs text-gray-500">({ts.displayId})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <Card className="w-full lg:w-1/3 overflow-y-auto border-4 border-teal-200">
            <h2 className="text-2xl font-bold text-teal-600 mb-6 flex items-center"><Award className="w-6 h-6 mr-3" />Scores & Leaderboard</h2>
            {globalLeaderboardScores.length === 0 ? (<p className="text-gray-500 italic">No scores have been recorded yet.</p>) : (
              <div className="space-y-3">
                {globalLeaderboardScores.map((score, index) => (
                  <div key={index} className="p-3 rounded-xl border border-gray-200 flex justify-between items-center transition-colors bg-white hover:bg-gray-50 hover:shadow-md">
                    <div className="flex items-center space-x-3">
                      <span className={`font-black text-xl w-6 text-center ${index < 3 ? 'text-red-500' : 'text-gray-500'}`}>{index + 1}.</span>
                      <div>
                        <p className="font-bold text-base text-gray-800 cursor-pointer hover:underline hover:text-blue-600 flex items-center" onClick={() => { playClickSound?.(); setSelectedName(score.studentName); handleSetView('studentProfile'); }}>{score.studentName}</p>
                        <p className="text-xs text-gray-600 font-medium mt-1">{AGE_LEVELS[score.studentAgeLevel]?.split('(')[0] || 'Default'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-teal-600">{score.totalScore} pts</p>
                      <p className="text-xs text-pink-500 font-bold mt-1 flex items-center justify-end"><Heart className="w-3 h-3 mr-1 fill-pink-500" /> {heartCounts?.[score.studentName]?.hearts || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
});

const StudentWaitingView = React.memo(({ handleSetView, userName, isRejected }) => (
  <Card className={`max-w-md mx-auto mt-20 p-8 space-y-6 text-center animate-fade-in-up border-4 ${isRejected ? 'border-red-400' : 'border-yellow-400'}`}>
    {isRejected ? (
      <>
        <XCircle className="w-20 h-20 text-red-500 mx-auto" />
        <h2 className="text-3xl font-bold text-gray-800">Entry Denied</h2>
        <div className="bg-red-50 p-4 rounded-xl text-red-800 font-medium text-lg leading-relaxed">
          <p>Your teacher has declined your entry for the name:</p>
          <p className="mt-2 font-bold text-red-600">"{userName}"</p>
          <p className="mt-4 text-sm text-gray-700">Please try again with your old exact name if you have joined before, or use your real name.</p>
        </div>
      </>
    ) : (
      <>
        <Clock className="w-20 h-20 text-yellow-500 mx-auto animate-pulse" />
        <h2 className="text-3xl font-bold text-gray-800">Please Wait...</h2>
        <div className="bg-yellow-50 p-4 rounded-xl text-yellow-800 font-medium text-lg leading-relaxed">
          <p>Is this your real name?</p>
          <p className="mt-2 font-bold text-red-600">"{userName}"</p>
          <p className="mt-2">Please ask your teacher for permission to enter.</p>
        </div>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mt-4" />
      </>
    )}
    <Button onClick={() => handleSetView('studentLogin')} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none mt-4">{isRejected ? 'Try Again' : 'Change Name / Exit'}</Button>
  </Card>
));

const StudentLessonView = React.memo(({
  userName, classId, lessons, globalLeaderboardScores, 
  setSelectedName, handleSetView, setActiveLessonId, setSelectedLessonId,
  playClickSound, studentAgeLevel, heartCounts, handleHeartClick, setSelectedAgeLevel, 
  mySpendableCredits, handleBuyAirplaneConfirmation, completionsList, allScores, myTotalLessonsCompletedAllClasses
}) => {
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setShowWelcome(false), 3000); return () => clearTimeout(timer); }, []);
  const myScore = globalLeaderboardScores.find(s => s.studentName === userName)?.totalScore || 0;
  const myRank = globalLeaderboardScores.findIndex(s => s.studentName === userName) + 1;
  const myLessonsCompleted = allScores ? [...new Set(allScores.filter(s => s.studentName === userName).map(s => s.lessonId))].length : 0;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <div className="flex justify-between items-start mb-8">
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${showWelcome ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
          <h1 className="text-4xl font-extrabold text-green-700">Welcome, {userName}!</h1>
          <p className="text-xl text-gray-600">Class ID: {classId}. Select a lesson to begin your journey.</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {myRank > 0 && (
            <DraggableRankBadge myRank={myRank} myLessonsCompleted={myLessonsCompleted} lessons={lessons} allScores={allScores} userName={userName} studentAgeLevel={studentAgeLevel} handleSetView={handleSetView} setActiveLessonId={setActiveLessonId} playClickSound={playClickSound} myTotalLessonsCompletedAllClasses={myTotalLessonsCompletedAllClasses} />
          )}
          <button onClick={() => { playClickSound?.(); setSelectedName(userName); handleSetView('studentProfile'); }} className="p-2 bg-purple-100 text-purple-700 rounded-full shadow-md hover:bg-purple-200 transition-colors" title="My Quiz History"><User className="w-6 h-6" /></button>
          <NotificationBell completionsList={completionsList} userName={userName} classId={classId} onViewProfile={(name) => { setSelectedName(name); handleSetView('studentProfile'); }} />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden mt-2">
        <Card className="w-full lg:w-2/3 overflow-y-auto">
          <h2 id="lesson-list-top" className="text-3xl font-bold text-blue-600 mb-6 flex items-center"><List className="w-6 h-6 mr-3" />Available Lessons ({lessons.length} total)</h2>
          {lessons.length === 0 ? (<p className="text-gray-500 italic">Your teacher hasn't created any lessons yet.</p>) : (
            <div className="space-y-4">
              {lessons.map(lesson => (
                <div key={lesson.lessonId} id={`lesson-row-${lesson.lessonId}`} className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => { playClickSound?.(); setActiveLessonId(lesson.lessonId); handleSetView('studentReadLesson'); }}>
                  <div className="flex flex-col flex-1 pr-4">
                    <h3 className="text-xl font-bold text-blue-800 hover:text-blue-600 hover:underline">{lesson.lessonId}: {lesson.title}</h3>
                    <span className="text-sm text-gray-600 mt-1">{lesson.questions?.[studentAgeLevel]?.length >= 8 ? '✅ Quiz Ready for You' : '⏳ Quiz Not Ready'}</span>
                  </div>
                  <div className="flex space-x-2 shrink-0">
                      <Button onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedLessonId(lesson.lessonId); handleSetView('lessonLeaderboard'); }} className="bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-300 p-3 rounded-full" title="Lesson Scores"><Award className="w-5 h-5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Leaderboard globalLeaderboardScores={globalLeaderboardScores} setSelectedName={setSelectedName} handleSetView={handleSetView} playClickSound={playClickSound} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} userName={userName} />
      </div>
      {mySpendableCredits >= 25000 && (
        <div className="fixed bottom-6 left-6 z-40 group">
          <Button onClick={handleBuyAirplaneConfirmation} className="bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-300 text-black rounded-full w-16 h-16 flex items-center justify-center p-0" aria-label="Announce Score"><span className="text-3xl" role="img" aria-label="airplane">✈️</span></Button>
          <span className="absolute left-0 bottom-20 w-auto p-2 text-sm text-white bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Announce Score (25,000 Points)</span>
        </div>
      )}
    </div>
  );
});

const StudentReadLessonView = React.memo(({
  lessons, activeLessonId, globalLeaderboardScores, userName, 
  setSelectedName, handleSetView, setQuizConfirmation,
  playClickSound, studentAgeLevel, heartCounts, handleHeartClick, setSelectedAgeLevel, allReflections, classId 
}) => {
  const lesson = lessons.find(l => l.lessonId === activeLessonId);
  const [reflectionText, setReflectionText] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [reflectionCompleted, setReflectionCompleted] = useState(false);
  const [showQuizButton, setShowQuizButton] = useState(false); 

  useEffect(() => { setReflectionText(''); setAiFeedback(''); setIsChecking(false); setReflectionCompleted(false); setShowQuizButton(false); }, [activeLessonId]);

  const lessonReflections = useMemo(() => allReflections.filter(r => r.lessonId === activeLessonId).sort((a, b) => b.timestamp - a.timestamp), [allReflections, activeLessonId]);
  const previousReflection = useMemo(() => lessonReflections.find(r => r.studentName === userName), [lessonReflections, userName]);
  useEffect(() => { if (previousReflection && !reflectionCompleted) setShowQuizButton(true); }, [previousReflection, reflectionCompleted]);

  const getSafeContent = (content) => { if (!content) return ''; if (typeof content === 'string') return content; return content[studentAgeLevel] || ''; };
  if (!lesson) return <div className="p-8">Lesson not found.</div>;

  const formattedContent = getSafeContent(lesson.formattedContent);
  const rawContent = getSafeContent(lesson.content);
  const contentToDisplay = (formattedContent && formattedContent.trim() !== '') ? formattedContent : (rawContent || '');
  const canStartQuiz = lesson.questions && lesson.questions[studentAgeLevel] && lesson.questions[studentAgeLevel].length >= 8;
  const helperText = `Learning about ${lesson?.title || 'this lesson'} is really fun!`;

  const handleCheckReflection = async () => {
      if (!reflectionText.trim()) return;
      playClickSound?.(); setIsChecking(true);
      try {
          const payload = { contents: [{ parts: [{ text: `Lesson Title: ${lesson.title}\nStudent's takeaway: "${reflectionText}"` }] }], systemInstruction: { parts: [{ text: "You are a friendly English teacher. The student read a lesson and wrote a short takeaway. Praise them enthusiastically in English. Tell them their thought is great and encourage them to share it with others. Keep it very short (1-2 sentences). Do not use markdown." }] } };
          const response = await fetchWithRetry(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const feedback = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Great job! Keep up the good work and share what you learned with your friends.';
          setAiFeedback(feedback);
          await addDoc(getReflectionsCollectionRef(), { classId: classId, lessonId: lesson.lessonId, studentName: userName, text: reflectionText, timestamp: Date.now() });
          setReflectionCompleted(true);
          setTimeout(() => { setShowQuizButton(true); }, 10000);
      } catch (e) {
          setAiFeedback('Great job! Keep up the good work and share what you learned with your friends.');
          setReflectionCompleted(true);
          setTimeout(() => { setShowQuizButton(true); }, 10000);
      } finally { setIsChecking(false); }
  };

  return (
    <div className="p-2 md:p-8 h-full flex flex-col relative">
      <div className="fixed bottom-6 left-6 z-50 group">
          <button onClick={() => { playClickSound?.(); handleSetView('studentLesson'); }} className="p-4 bg-gray-700 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all hover:scale-110 active:scale-95 border-2 border-white" aria-label="Back to Lesson List"><ArrowLeft className="w-6 h-6" /></button>
          <span className="absolute left-0 bottom-16 w-auto p-2 text-sm text-white bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Back to Lesson List</span>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
          <Card id="lesson-content-top" className="w-full lg:w-2/3 overflow-y-auto relative pb-24">
              {lesson.headerImageUrl ? (
                  <img src={lesson.headerImageUrl} alt={lesson.title} className="w-full max-h-[400px] h-auto object-contain rounded-xl mb-6 shadow-lg bg-gray-100" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/800x400/f97316/ffffff?text=Lesson+Header"; }} />
              ) : (<div className="w-full h-56 bg-orange-200 rounded-xl mb-6 flex items-center justify-center text-orange-700 font-bold text-2xl shadow-lg">Lesson Header</div>)}
              <h1 className="text-4xl font-extrabold text-orange-700 mt-6 mb-4">{lesson.title}</h1>
              <div className="mb-4 p-2 bg-blue-100 text-blue-700 font-bold rounded-lg inline-block">Viewing content for: {AGE_LEVELS[studentAgeLevel] || 'Default'}</div>
              <div className="p-4 bg-orange-50 rounded-lg shadow-inner">
                  <MarkdownText markdown={contentToDisplay} imageUrls={[lesson.image1Url, lesson.image2Url, lesson.image3Url, lesson.image4Url]} />
                  {contentToDisplay.trim() === '' && <p className="text-gray-500 italic">Lesson content for this age level has not been added yet.</p>}
              </div>
              {canStartQuiz ? (
                  <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-inner">
                      {!previousReflection && !reflectionCompleted ? (
                          <>
                             <h3 className="text-2xl font-bold text-blue-800 mb-4 flex items-center"><Sparkles className="w-6 h-6 mr-2 text-blue-500" />Let's write a quick reflection</h3>
                             <p className="text-gray-700 mb-4">Before taking the quiz, write down one thing you learned from this lesson below.</p>
                             <textarea rows="3" value={reflectionText} onChange={(e) => setReflectionText(e.target.value)} placeholder="Write here..." className="w-full p-4 border-2 border-blue-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none mb-4 text-lg" />
                             {(studentAgeLevel === 'storyteller' || studentAgeLevel === 'explorer') && (
                                 <div className="mb-4">
                                     <p className="text-sm text-gray-500 mb-2">If you don't know what to write, click the sentence below.</p>
                                     <button onClick={() => { playClickSound?.(); setReflectionText(helperText); }} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-bold hover:bg-yellow-200 border border-yellow-300 transition-colors text-left w-full sm:w-auto">💡 "{helperText}"</button>
                                 </div>
                             )}
                             <Button onClick={handleCheckReflection} className="w-full bg-blue-500 hover:bg-blue-600 shadow-blue-300" disabled={isChecking || !reflectionText.trim()}>{isChecking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Show Teacher'}</Button>
                          </>
                      ) : (
                          <div className="animate-fade-in-up">
                             {aiFeedback && (
                                 <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-md mb-6">
                                     <h4 className="font-bold text-green-700 flex items-center mb-2"><CheckCircle className="w-5 h-5 mr-2" /> Teacher's Feedback</h4>
                                     <p className="text-gray-800 text-lg leading-relaxed">{aiFeedback}</p>
                                 </div>
                             )}
                             {previousReflection && !aiFeedback && (
                                 <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-md mb-6">
                                     <h4 className="font-bold text-blue-700 flex items-center mb-2"><CheckCircle className="w-5 h-5 mr-2" /> Your Reflection</h4>
                                     <p className="text-gray-800 text-lg leading-relaxed">{previousReflection.text}</p>
                                 </div>
                             )}
                             <div className="mt-8">
                                <h3 className="text-2xl font-bold text-purple-700 mb-4 flex items-center"><Users className="w-6 h-6 mr-2" />Classmates' Reflections</h3>
                                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                    {lessonReflections.length === 0 ? (<p className="text-gray-500 italic">No reflections yet.</p>) : (
                                        lessonReflections.map(r => (
                                            <div key={r.id || r.timestamp} className="p-4 bg-white rounded-xl shadow-sm border-l-4 border-purple-400">
                                                <p className="font-bold text-purple-800 mb-1">{r.studentName}</p>
                                                <p className="text-gray-700">{r.text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                             </div>
                             {showQuizButton ? (
                                 <div className="mt-8 text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                                     <p className="text-green-800 font-bold text-lg mb-2">Ready for the Quiz?</p>
                                     <p className="text-gray-600 mb-4">Click the floating Start Quiz button in the bottom right corner!</p>
                                 </div>
                             ) : (<div className="mt-8 text-center p-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" /><p className="text-gray-600">Please wait a few seconds to start the quiz...</p></div>)}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="mt-8"><Button className="w-full bg-gray-400 hover:bg-gray-400 cursor-not-allowed shadow-none" disabled>Quiz Not Ready (Ask your Teacher)</Button><p className="text-red-500 text-center mt-2">The quiz for your age level is not ready. Please ask your teacher to generate it.</p></div>
              )}
          </Card>
          <Leaderboard globalLeaderboardScores={globalLeaderboardScores} setSelectedName={setSelectedName} handleSetView={handleSetView} playClickSound={playClickSound} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} userName={userName} />
      </div>
      {showQuizButton && canStartQuiz && (
          <div className="fixed bottom-8 right-8 z-50">
              <Button onClick={() => { playClickSound?.(); setQuizConfirmation({ lesson: lesson }); }} className="bg-green-500 hover:bg-green-600 shadow-[0_10px_25px_-5px_rgba(34,197,94,0.5)] text-xl py-4 px-8 rounded-full border-4 border-white animate-bounce-slight"><Zap className="w-6 h-6 inline-block mr-2 fill-yellow-300 text-yellow-300" />Start Quiz</Button>
          </div>
      )}
    </div>
  );
});

const StudentProfileView = React.memo(({ allScores, selectedName, handleSetView, setSelectedLessonId, playClickSound, setSelectedAgeLevel, previousView, userName, globalLeaderboardScores, heartCounts, myTotalLessonsCompletedAllClasses }) => {
  const studentScores = allScores.filter(score => score.studentName === selectedName).sort((a, b) => b.timestamp - a.timestamp);
  const colorClass = selectedName ? nameToColorClass(selectedName) : '';
  const isMe = userName && selectedName === userName;
  const myScore = globalLeaderboardScores?.find(s => s.studentName === userName)?.totalScore || 0;
  const myRank = (globalLeaderboardScores?.findIndex(s => s.studentName === userName) ?? -1) + 1;
  const myLessonsCompleted = allScores ? [...new Set(allScores.filter(s => s.studentName === userName).map(s => s.lessonId))].length : 0;
  const myHeartsGiven = heartCounts?.[userName]?.heartsGiven || 0;
  const myTotalCredits = Math.floor(myScore / 1000);
  const myRemainingCredits = myTotalCredits - myHeartsGiven;
  const myPointsSpent = heartCounts?.[userName]?.pointsSpent || 0;
  const mySpendableCredits = myScore - myPointsSpent;

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center">
          <h1 className={`text-4xl font-extrabold p-3 rounded-xl border-2 ${colorClass}`}><User className="w-6 h-6 inline-block mr-3" />Student History: {selectedName}</h1>
          <div className="fixed bottom-6 left-6 z-50 group">
          <button onClick={() => { playClickSound?.(); handleSetView(previousView || 'studentLesson'); }} className="p-4 bg-gray-700 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all hover:scale-110 active:scale-95 border-2 border-white" aria-label="Back to previous view"><ArrowLeft className="w-6 h-6" /></button>
          </div>
      </div>
      {isMe && (
        <div className="flex flex-wrap gap-2">
          <div className="text-lg font-bold text-pink-600 bg-pink-100 p-2 rounded-lg inline-block">You have {myRemainingCredits} ❤️ reactions left to give.</div>
          <div className="text-lg font-bold text-yellow-600 bg-yellow-100 p-2 rounded-lg inline-block">You have {mySpendableCredits} spendable points.</div>
          {myRank > 0 && (
            <div className="text-lg font-bold text-blue-600 bg-blue-100 p-2 rounded-lg inline-block">
              🏆 Global Rank: #{myRank} | 📚 Lessons Done: {myLessonsCompleted}
              <div className="text-lg font-bold text-green-600 bg-green-100 p-2 rounded-lg inline-block mt-2">🌍 The completed lesson covering all classes: {myTotalLessonsCompletedAllClasses}</div>
            </div>
          )}
        </div>
      )}
      <Card className="flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">All Quiz Attempts</h2>
          {studentScores.length === 0 ? <p className="text-gray-500 italic">No quiz history for this student.</p> : (
              <div className="space-y-3">
                  {studentScores.map((score, index) => (
                      <div key={index} className={`p-3 sm:p-4 rounded-xl border-l-4 border-purple-400 bg-gray-50 flex justify-between items-center`}>
                          <div className="flex items-center space-x-2 sm:space-x-4">
                              <span className="font-black text-base sm:text-lg text-purple-800 cursor-pointer hover:underline" onClick={() => { playClickSound?.(); setSelectedLessonId(score.lessonId); handleSetView('lessonLeaderboard'); }}><BookOpen className="w-4 h-4 inline-block mr-1" />{score.lessonId}</span>
                              <span className="text-xs sm:text-sm font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedAgeLevel(score.studentAgeLevel); handleSetView('ageGroupLeaderboard'); }}>{AGE_LEVELS[score.studentAgeLevel] ? AGE_LEVELS[score.studentAgeLevel].split('(')[0].trim() : (score.studentAgeLevel || 'default')}</span>
                              <span className="text-xs sm:text-sm text-gray-500">{new Date(score.timestamp).toLocaleDateString()} {new Date(score.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="text-xl sm:text-3xl font-black text-green-600 ml-2">{score.score} pts</span>
                      </div>
                  ))}
              </div>
          )}
      </Card>
    </div>
  );
});

const LessonLeaderboardView = React.memo(({ allScores, selectedLessonId, handleSetView, setSelectedName, playClickSound, heartCounts, handleHeartClick, setSelectedAgeLevel, userName, previousView }) => {
  const lessonScores = allScores.filter(score => score.lessonId === selectedLessonId).sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
  const firstLessonScores = lessonScores.reduce((acc, score) => {
      const key = `${score.studentName}-${score.studentAgeLevel || 'default'}`;
      if (!acc[key] || score.timestamp < acc[key].timestamp) acc[key] = score;
      return acc;
  }, {});
  const sortedFirstScores = Object.values(firstLessonScores).sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);

  return (
      <div className="p-4 md:p-8 space-y-8 h-full flex flex-col">
          <div className="flex justify-between items-center">
              <h1 className="text-3xl md:text-4xl font-extrabold text-teal-700"><List className="w-6 h-6 inline-block mr-3" />Lesson: {selectedLessonId}</h1>
              <div className="fixed bottom-6 left-6 z-50">
              <button onClick={() => { playClickSound?.(); handleSetView(previousView || 'studentLesson'); }} className="p-4 bg-gray-700 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all hover:scale-110 active:scale-95 border-2 border-white"><ArrowLeft className="w-6 h-6" /></button>
              </div>
          </div>
          <Card className="flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold text-teal-700 mb-4">Lesson Leaderboard<span className="block text-lg font-medium text-gray-500">First Attempt Scores (Per Student)</span></h2>
              {sortedFirstScores.length === 0 ? <p className="text-gray-500 italic">No students have completed this lesson's quiz yet.</p> : (
                  <ol className="space-y-3">
                      {sortedFirstScores.map((score, index) => {
                          const isMe = userName && score.studentName === userName; 
                          const colorClass = isMe ? 'ring-4 ring-pink-400 bg-pink-50 border-pink-400 transform scale-[1.02] shadow-lg' : `${nameToColorClass(score.studentName)} hover:shadow-md`;
                          return (
                              <li key={index} className={`p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 flex justify-between items-center font-bold ${colorClass}`}>
                                  <span className={`text-lg sm:text-xl font-extrabold w-7 sm:w-8 text-center ${index < 3 ? 'text-red-500' : ''}`}>#{index + 1}</span>
                                  <span className="flex-1 ml-2 sm:ml-4 truncate text-sm sm:text-base">
                                      <span className="hover:underline" onClick={() => { playClickSound?.(); setSelectedName(score.studentName); handleSetView('studentProfile'); }}><User className="w-4 h-4 inline-block mr-2" />{score.studentName}{isMe && <span className="ml-2 text-[10px] sm:text-xs bg-pink-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">(You)</span>}</span>
                                      <span className="ml-1 text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:underline text-xs" onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedAgeLevel(score.studentAgeLevel); handleSetView('ageGroupLeaderboard'); }}>({AGE_LEVELS[score.studentAgeLevel] ? AGE_LEVELS[score.studentAgeLevel].split('(')[0].trim() : (score.studentAgeLevel || 'default')})</span>
                                  </span>
                                  <span className="text-xl sm:text-3xl font-black text-teal-600 ml-2">{score.score} pts</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleHeartClick?.(score.studentName); }} className="flex items-center space-x-1 p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-all ml-1 sm:ml-2"><Heart className="w-5 h-5" /><span className="font-bold text-xs sm:text-sm">{heartCounts?.[score.studentName]?.hearts || 0}</span></button>
                              </li>
                          );
                      })}
                  </ol>
              )}
          </Card>
      </div>
  );
});

const GlobalLeaderboardView = React.memo(({ globalLeaderboardScores, handleSetView, previousView, setSelectedName, playClickSound, heartCounts, handleHeartClick, setSelectedAgeLevel, userName }) => {
  const myRef = useRef(null);
  useEffect(() => { if (myRef.current) { myRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, []);
  return (
      <div className="p-4 md:p-8 space-y-8 h-full flex flex-col">
          <div className="flex justify-between items-center">
              <h1 className="text-3xl md:text-4xl font-extrabold text-blue-700"><Award className="w-6 h-6 inline-block mr-3" />Global Leaderboard Score</h1>
              <div className="fixed bottom-6 left-6 z-50">
              <button onClick={() => { playClickSound?.(); handleSetView(previousView); setTimeout(() => { const el = document.getElementById('lesson-list-top'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }} className="p-4 bg-gray-700 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all hover:scale-110 active:scale-95 border-2 border-white"><ArrowLeft className="w-6 h-6" /></button>
              </div>
          </div>
          <Card className="flex-1 overflow-y-auto">
              {globalLeaderboardScores.length === 0 ? <p className="text-gray-500 italic">No scores yet. Be the first!</p> : (
                  <ol className="space-y-3">
                      {globalLeaderboardScores.map((score, index) => {
                          const isMe = userName && score.studentName === userName; 
                          const colorClass = isMe ? 'ring-4 ring-pink-400 bg-pink-50 border-pink-400 transform scale-[1.02] shadow-lg' : `${nameToColorClass(score.studentName)} hover:shadow-md`;
                          return (
                              <li key={index} ref={isMe ? myRef : null} className={`p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 flex justify-between items-center font-bold ${colorClass}`}>
                                  <span className={`text-lg sm:text-xl font-extrabold w-7 sm:w-8 text-center ${index < 3 ? 'text-red-500' : ''}`}>#{index + 1}</span>
                                  <span className="flex-1 ml-2 sm:ml-4 truncate text-sm sm:text-base">
                                      <span className="hover:underline" onClick={() => { playClickSound?.(); setSelectedName(score.studentName); handleSetView('studentProfile'); }}><User className="w-4 h-4 inline-block mr-2" />{score.studentName}{isMe && <span className="ml-2 text-[10px] sm:text-xs bg-pink-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">(You)</span>}</span>
                                      <span className="ml-1 text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:underline text-xs" onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedAgeLevel(score.studentAgeLevel); handleSetView('ageGroupLeaderboard'); }}>({AGE_LEVELS[score.studentAgeLevel] ? AGE_LEVELS[score.studentAgeLevel].split('(')[0].trim() : (score.studentAgeLevel || 'default')})</span>
                                  </span>
                                  <span className="text-lg sm:text-xl font-black ml-2">{score.totalScore} pts</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleHeartClick?.(score.studentName); }} className="flex items-center space-x-1 p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-all ml-1 sm:ml-2"><Heart className="w-5 h-5" /><span className="font-bold text-xs sm:text-sm">{heartCounts?.[score.studentName]?.hearts || 0}</span></button>
                                  </li>
                          );
                      })}
                  </ol>
              )}
          </Card>
      </div>
  );
});

const AgeGroupLeaderboardView = React.memo(({ allScores, selectedAgeLevel, handleSetView, previousView, setSelectedName, playClickSound, heartCounts, handleHeartClick, setSelectedAgeLevel, userName }) => {
  const ageGroupLeaderboard = useMemo(() => {
    if (!selectedAgeLevel) return [];
    const filteredScores = allScores.filter(score => score.studentAgeLevel === selectedAgeLevel);
    const firstScores = filteredScores.reduce((acc, score) => {
      const key = `${score.studentName}-${score.studentAgeLevel || 'default'}-${score.lessonId}`;
      if (!acc[key] || score.timestamp < acc[key].timestamp) acc[key] = score;
      return acc;
    }, {});
    const studentTotals = Object.values(firstScores).reduce((acc, score) => {
      const key = `${score.studentName}-${score.studentAgeLevel || 'default'}`;
      if (!acc[key]) acc[key] = { totalScore: 0, studentName: score.studentName, studentAgeLevel: score.studentAgeLevel || 'default' };
      acc[key].totalScore += score.score;
      return acc;
    }, {});
    const finalLeaderboard = Object.values(studentTotals).map(s => ({ studentName: s.studentName, studentAgeLevel: s.studentAgeLevel, totalScore: s.totalScore }));
    finalLeaderboard.sort((a, b) => b.totalScore - a.totalScore);
    return finalLeaderboard;
  }, [allScores, selectedAgeLevel]);
  const title = AGE_LEVELS[selectedAgeLevel] ? AGE_LEVELS[selectedAgeLevel].split('(')[0].trim() : (selectedAgeLevel || 'Age Group');

  return (
      <div className="p-4 md:p-8 space-y-8 h-full flex flex-col">
          <div className="flex justify-between items-center">
              <h1 className="text-3xl md:text-4xl font-extrabold text-purple-700"><Award className="w-6 h-6 inline-block mr-3" /> Leaderboard: {title}</h1>
              <div className="fixed bottom-6 left-6 z-50">
              <button onClick={() => { playClickSound?.(); handleSetView(previousView); }} className="p-4 bg-gray-700 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-all hover:scale-110 active:scale-95 border-2 border-white"><ArrowLeft className="w-6 h-6" /></button>
              </div>
          </div>
          <Card className="flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold text-purple-700 mb-4">All-Time Scores ({title})</h2>
              {ageGroupLeaderboard.length === 0 ? <p className="text-gray-500 italic">No scores yet for this age group.</p> : (
                  <ol className="space-y-3">
                      {ageGroupLeaderboard.map((score, index) => {
                          const isMe = userName && score.studentName === userName; 
                          const colorClass = isMe ? 'ring-4 ring-pink-400 bg-pink-50 border-pink-400 transform scale-[1.02] shadow-lg' : `${nameToColorClass(score.studentName)} hover:shadow-md`;
                          return (
                              <li key={index} className={`p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 flex justify-between items-center font-bold ${colorClass}`}>
                                  <span className={`text-lg sm:text-xl font-extrabold w-7 sm:w-8 text-center ${index < 3 ? 'text-red-500' : ''}`}>#{index + 1}</span>
                                  <span className="flex-1 ml-2 sm:ml-4 truncate text-sm sm:text-base">
                                      <span className="hover:underline" onClick={() => { playClickSound?.(); setSelectedName(score.studentName); handleSetView('studentProfile'); }}><User className="w-4 h-4 inline-block mr-2" />{score.studentName}{isMe && <span className="ml-2 text-[10px] sm:text-xs bg-pink-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">(You)</span>}</span>
                                      <span className="ml-1 text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:underline text-xs" onClick={(e) => { e.stopPropagation(); playClickSound?.(); setSelectedAgeLevel(score.studentAgeLevel); handleSetView('ageGroupLeaderboard'); }}>({AGE_LEVELS[score.studentAgeLevel] ? AGE_LEVELS[score.studentAgeLevel].split('(')[0].trim() : (score.studentAgeLevel || 'default')})</span>
                                  </span>
                                  <span className="text-lg sm:text-xl font-black ml-2">{score.totalScore} pts</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleHeartClick?.(score.studentName); }} className="flex items-center space-x-1 p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-all ml-1 sm:ml-2"><Heart className="w-5 h-5" /><span className="font-bold text-xs sm:text-sm">{heartCounts?.[score.studentName]?.hearts || 0}</span></button>
                                  </li>
                          );
                      })}
                  </ol>
              )}
          </Card>
      </div>
  );
});

const AgeLevelPickerView = React.memo(({ studentAgeLevel, setStudentAgeLevel, onContinue }) => (
  <Card className="max-w-md mx-auto mt-20 p-8 space-y-6">
    <h2 className="text-3xl font-bold text-green-600 text-center">Select Your Age Level</h2>
    <p className="text-sm text-gray-600 text-center bg-gray-100 p-2 rounded-lg">This is asked only once — it will be remembered next time.</p>
    <Select label="Select Your Age Level" value={studentAgeLevel} onChange={(e) => setStudentAgeLevel(e.target.value)}>
      <option value="">-- Select your level --</option>
      {Object.entries(AGE_LEVELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
    </Select>
    <Button onClick={onContinue} className="w-full" disabled={!studentAgeLevel}>Continue</Button>
  </Card>
));

const ClassPickerView = React.memo(({ classList, highlightClassId, onSelectClass, loading, classPickerInfo }) => (
  <div className="p-4 md:p-8 max-w-2xl mx-auto mt-10">
    <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center">📚 Choose Your Class</h2>
    {highlightClassId && (
      <p className="text-gray-600 text-center mb-6">Your teacher assigned <span className="font-bold text-blue-700">{highlightClassId}</span> — tap it below to start.</p>
    )}
    {loading ? (
      <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
    ) : classList.length === 0 ? (
      <p className="text-gray-500 italic text-center">No classes found.</p>
    ) : (
      <div className="space-y-3">
        {classList.map(c => {
          const info = classPickerInfo?.[c];
          const completedCount = info?.completedCount || 0;
          const lessonCount = info?.lessonCount || 0;
          const myRank = info?.myRank || 0;
          const allDone = lessonCount > 0 && completedCount >= lessonCount;
          const isHighlight = c === highlightClassId;
          return (
            <button
              key={c}
              onClick={() => onSelectClass(c)}
              className={`w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all ${isHighlight ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-lg scale-[1.02]' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>{isHighlight ? '⭐ ' : ''}{c}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {myRank > 0 && (
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full">
                      🏆 Rank #{myRank}
                    </span>
                  )}
                  {allDone ? (
                    <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                      ✅ all completed
                    </span>
                  ) : completedCount > 0 ? (
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                      {completedCount}{lessonCount > 0 ? ` / ${lessonCount}` : ''} completed
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
));

const HomeView = React.memo(({ handleSetView }) => (
  <div className="flex items-center justify-center h-full p-8">
    <Card className="max-w-lg w-full text-center p-10 space-y-8 bg-blue-50">
      <h1 className="text-5xl font-extrabold text-blue-700"><span className="block text-6xl mb-2">📚</span>Smart Study</h1>
      <div className="space-y-4">
        <Button onClick={() => handleSetView('teacherLogin')} className="w-full bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-300"><User className="w-5 h-5 mr-2" /> Teacher</Button>
        <Button onClick={() => handleSetView('studentLogin')} className="w-full bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-300"><Users className="w-5 h-5 mr-2" /> Student</Button>
      </div>
    </Card>
  </div>
));

const TeacherLoginView = React.memo(({ targetClassId, setTargetClassId, handleTeacherLogin, handleSetView }) => (
  <Card className="max-w-md mx-auto mt-20 p-8 space-y-6">
    <h2 className="text-3xl font-bold text-blue-600 text-center">Teacher Login</h2>
    <Input label="Class ID" value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} placeholder="E.g., DHAMMA" />
    <Button onClick={handleTeacherLogin} className="w-full">Enter Class</Button>
    <Button onClick={() => handleSetView('home')} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none">Back</Button>
  </Card>
));

const StudentLoginView = React.memo(({ targetClassId, setTargetClassId, userName, setUserName, studentAgeLevel, setStudentAgeLevel, handleStudentLogin, handleSetView }) => (
  <Card className="max-w-md mx-auto mt-20 p-8 space-y-6">
    <h2 className="text-3xl font-bold text-green-600 text-center">Student Login</h2>
    <p className="text-sm text-gray-600 text-center bg-gray-100 p-2 rounded-lg">If you have logged in before, please use the exact same name.</p>
    <Input label="Class ID" value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} placeholder="E.g., DHAMMA" />
    <Input label="Your Name (Real Name)" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="E.g., Aung Kaung" />
    <Select label="Select Your Age Level" value={studentAgeLevel} onChange={(e) => setStudentAgeLevel(e.target.value)}>
      <option value="">-- Select your level --</option>
      {Object.entries(AGE_LEVELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
    </Select>
    <Button onClick={handleStudentLogin} className="w-full" disabled={!targetClassId || !userName || !studentAgeLevel}>Enter Class</Button>
    <Button onClick={() => handleSetView('home')} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none">Back</Button>
  </Card>
));

const ClassCreateView = React.memo(({ classId, handleTeacherCreateClass, isLoading, handleSetView }) => (
  <Card className="max-w-md mx-auto mt-20 p-8 space-y-6">
    <h2 className="text-3xl font-bold text-red-600 text-center">Class ID: {classId}</h2>
    <p className="text-gray-700">This class does not exist. Would you like to create it?</p>
    <Button onClick={handleTeacherCreateClass} disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 shadow-green-300">{isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Class'}</Button>
    <Button onClick={() => handleSetView('home')} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none">Go to Home</Button>
  </Card>
));

const ClassErrorView = React.memo(({ classId, handleSetView }) => (
  <Card className="max-w-md mx-auto mt-20 p-8 space-y-6">
    <h2 className="text-3xl font-bold text-red-600 text-center">Class ID: {classId}</h2>
    <p className="text-gray-700">This class does not exist or has not been set up yet. Please check your ID.</p>
    <Button onClick={() => handleSetView('studentLogin')} className="w-full bg-gray-400 hover:bg-gray-500 shadow-none">Re-enter Class ID</Button>
  </Card>
));

const LoadingView = React.memo(() => (
  <div className="p-8 flex justify-center items-center h-full bg-gray-50">
    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
    <span className="ml-4 text-lg font-medium text-gray-700">Loading App...</span>
  </div>
));

const QuizView = React.memo(({ quiz, questionNumber, totalQuestions, timerValue, feedback, onAnswerSelect, onNext, userName, activeLesson, showPreview, totalScore, isLastQuestion, isSavingScore, competitors = [] }) => {
  const answerStyles = [
    { bg: 'bg-red-600', hover: 'hover:bg-red-700', icon: <Triangle className="w-6 h-6 fill-white" /> },
    { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', icon: <Square className="w-6 h-6 fill-white" /> },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', icon: <Circle className="w-6 h-6 fill-white" /> },
    { bg: 'bg-green-600', hover: 'hover:bg-green-700', icon: <Star className="w-6 h-6 fill-white" /> },
  ];
  const options = useMemo(() => { 
      if (quiz.options && Array.isArray(quiz.options) && quiz.options.length > 0) return quiz.options; 
      return ['True', 'False']; 
  }, [quiz]);
  const imageIndex = Math.floor((questionNumber - 1) / 2); 
  const imageUrls = [ activeLesson?.headerImageUrl, activeLesson?.image1Url, activeLesson?.image2Url, activeLesson?.image3Url, activeLesson?.image4Url ];
  const currentImageUrl = imageUrls[imageIndex] || `https://placehold.co/600x300/eee/aaa?text=Q${questionNumber}`;
  const rankingList = useMemo(() => {
    if (!feedback) return [];
    const list = competitors.map(c => ({ name: c.studentName, score: c.cumulative[questionNumber - 1] ?? 0, isCorrect: c.correct[questionNumber - 1] ?? false, isMe: false }));
    list.push({ name: userName, score: totalScore, isCorrect: feedback.status === 'correct', isMe: true });
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [feedback, competitors, questionNumber, totalScore, userName]);

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-2 text-lg font-bold">
        <div className="bg-black bg-opacity-30 px-4 py-2 rounded-lg">{questionNumber} / {totalQuestions}</div>
        <div className="bg-black bg-opacity-30 px-4 py-2 rounded-lg text-yellow-300">{totalScore} Points</div>
        <div className="bg-black bg-opacity-30 px-4 py-2 rounded-lg truncate max-w-[100px] md:max-w-xs">{userName}</div>
      </div>
      {!showPreview && !feedback && ( 
        <div className="relative w-full h-4 bg-gray-600 rounded-full overflow-hidden mb-4">
          <div className="absolute top-0 left-0 h-full bg-pink-500 transition-all duration-1000 linear" style={{ width: `${(timerValue / 30) * 100}%` }}></div>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"><Clock className="w-3 h-3 mr-1" /> {timerValue}</span>
        </div>
      )}
      {(showPreview || feedback) && <div className="h-4 mb-4" />}
      <div className="flex items-center justify-center text-center mb-4">
        <h1 className="text-2xl md:text-4xl font-extrabold p-6 bg-white text-gray-900 rounded-lg shadow-xl break-words w-full">
          {quiz.text?.split('____').map((part, partIndex) => (
            <React.Fragment key={partIndex}>
              {part}
              {partIndex < quiz.text.split('____').length - 1 && <span className="font-bold text-red-500 border-b-2 border-red-500 px-3 mx-1">____</span>}
            </React.Fragment>
          ))}
        </h1>
      </div>
      {showPreview ? (
        <div className="flex-grow flex items-center justify-center mb-4">
          {questionNumber === 1 ? (
            <div className="bg-white bg-opacity-95 rounded-xl p-6 w-full max-w-md text-gray-900">
              <h3 className="font-bold text-xl mb-3 text-center">Competitors in this round</h3>
              <ol className="space-y-2">
                {[...competitors.map(c => c.studentName), userName].map((name, i) => (
                  <li key={i} className={`px-3 py-2 rounded-lg ${name === userName ? 'bg-pink-100 font-bold' : 'bg-gray-50'}`}>{name}{name === userName ? ' (You)' : ''}</li>
                ))}
              </ol>
            </div>
          ) : (<img src={currentImageUrl} alt={`Hint for Q${questionNumber}`} className="w-full max-w-2xl mx-auto max-h-[400px] h-auto object-contain rounded-xl shadow-lg" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x300/fecaca/991b1b?text=Image+Not+Found`; }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {options.map((option, index) => {
            const style = answerStyles[index % 4]; 
            return (
              <button key={index} disabled={!!feedback || isSavingScore} onClick={() => onAnswerSelect(option)} className={`p-4 md:p-6 rounded-lg text-white font-bold text-lg md:text-2xl flex items-center justify-center transition-all duration-200 transform active:scale-95 shadow-lg ${style.bg} ${style.hover} ${(feedback || isSavingScore) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className="mr-3">{style.icon}</span><span className="break-words">{option}</span>
              </button>
            );
          })}
        </div>
      )}
      {feedback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto py-8 transition-opacity duration-300 z-50" style={{ backgroundColor: feedback.status === 'correct' ? 'rgba(4, 120, 87, 0.95)' : feedback.status === 'incorrect' ? 'rgba(185, 28, 28, 0.95)' : 'rgba(55, 65, 81, 0.95)' }}>
          {feedback.status === 'correct' && <CheckCircle className="w-24 h-24 text-white mb-4" />}
          {feedback.status === 'incorrect' && <XCircle className="w-24 h-24 text-white mb-4" />}
          {feedback.status === 'timeup' && <Clock className="w-24 h-24 text-white mb-4" />}
          <h2 className="text-5xl font-extrabold mb-2">{feedback.status === 'correct' ? 'Correct!' : feedback.status === 'incorrect' ? 'Incorrect!' : "Time's Up!"}</h2>
          {feedback.status === 'correct' && <p className="text-3xl font-bold text-yellow-300">+ {feedback.points} Points</p>}
          {rankingList.length > 0 && (
            <div className="bg-white bg-opacity-95 rounded-xl p-4 mt-6 w-full max-w-md text-gray-900">
              <h3 className="font-bold text-lg mb-2 text-center">Competitors</h3>
              <ol className="space-y-1">
                {rankingList.map((r, i) => (
                  <li key={i} className={`flex justify-between items-center px-3 py-1 rounded-lg ${r.isMe ? 'bg-pink-100 font-bold' : ''}`}>
                    <span>#{i + 1} {r.isCorrect ? '✅' : '❌'} {r.name}{r.isMe ? ' (You)' : ''}</span>
                    <span>{r.score} pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Button onClick={onNext} disabled={isSavingScore} className={`mt-6 mb-6 text-2xl px-10 py-4 ${feedback.status === 'correct' ? 'bg-white text-emerald-700 hover:bg-gray-100' : feedback.status === 'incorrect' ? 'bg-white text-red-700 hover:bg-gray-100' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-lg`}>
            {isSavingScore ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-current" /> : (isLastQuestion ? 'Finish' : 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
});

// --- Core App Component ---

const SmartStudyApp = ({ entryRequest, onExit }) => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState(() => localStorage.getItem('lastUserName') || '');
  const [studentAgeLevel, setStudentAgeLevel] = useState(''); 
  const [view, setView] = useState('home');
  const [classId, setClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState(() => localStorage.getItem('lastClassId') || '');
  const [classData, setClassData] = useState(null);
  const [classDataLoaded, setClassDataLoaded] = useState(false); // true once first Firestore response arrives
  const [lessons, setLessons] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [allMyScoresGlobal, setAllMyScoresGlobal] = useState([]);
  const [showClassSwitchPrompt, setShowClassSwitchPrompt] = useState(false);
  const [switchClassInput, setSwitchClassInput] = useState('');
  const classCompletePromptShownRef = useRef({});
  const [classRoster, setClassRoster] = useState([]); 
  const [completionsList, setCompletionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRejected, setIsRejected] = useState(false); 
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [previousView, setPreviousView] = useState('home');
  const [modal, setModal] = useState({ message: '', type: '', visible: false });
  const [confirmationModal, setConfirmationModal] = useState({ message: '', onConfirm: null });
  const [quizConfirmation, setQuizConfirmation] = useState({ lesson: null });
  const [competitorSelection, setCompetitorSelection] = useState({ lesson: null });
  const [competitorCount, setCompetitorCount] = useState(5);
  const [notification, setNotification] = useState(null);
  const notificationTimer = useRef(null);
  const lastNotifiedRef = useRef(null);
  const [globalAnnouncement, setGlobalAnnouncement] = useState(null);
  const globalAnnouncementTimer = useRef(null);
  const shownAnnouncementTimestamp = useRef(null); 
  const [heartCounts, setHeartCounts] = useState({}); 
  const [floatingHearts, setFloatingHearts] = useState([]); 
  const prevHeartCountsRef = useRef(); 
  const [selectedName, setSelectedName] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedAgeLevel, setSelectedAgeLevel] = useState(null); 
  const [classPickerList, setClassPickerList] = useState([]);
  const [classPickerLoading, setClassPickerLoading] = useState(false);
  // Per-class: { classId: { lessonCount, myRank, completedCount } }
  const [classPickerInfo, setClassPickerInfo] = useState({});
  const lastHandledEntryRequestRef = useRef(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuizScore, setCurrentQuizScore] = useState(0);
  const [correctAnswerCount, setCorrectAnswerCount] = useState(0);
  const [incorrectAnswerCount, setIncorrectAnswerCount] = useState(0);
  const [timerValue, setTimerValue] = useState(30);
  const [showFeedback, setShowFeedback] = useState(null);
  const [showPreview, setShowPreview] = useState(true); 
  const [needsToStartQuiz, setNeedsToStartQuiz] = useState(false); 
  const [isSavingScore, setIsSavingScore] = useState(false); 
  const [quizCompetitors, setQuizCompetitors] = useState([]);
  const timerId = useRef(null);
  const clickSoundRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputRefLessonsOnly = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try { if (!auth.currentUser) { await signInAnonymously(auth); } } catch (err) { console.error("Auth init failed", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUserId(user.uid); setIsAuthReady(true); } else { setCurrentUserId(null); }
    });
    clickSoundRef.current = new Audio('https://raw.githubusercontent.com/nathantun93/bell/main/90s.mp3');
    clickSoundRef.current.preload = 'auto';
    return () => unsubscribe(); 
  }, []); 

  useEffect(() => {
    if (!isAuthReady || !classId) return;
    setClassDataLoaded(false); // reset while new class loads
    const classUnsub = onSnapshot(getClassDocRef(classId), (docSnap) => {
      if (docSnap.exists()) { const data = docSnap.data(); setClassData(data); setLessons(data.lessons || []); } else { setClassData(null); setLessons([]); } setClassDataLoaded(true);
    }, (error) => console.error("Error fetching class data:", error));
    const scoresUnsub = onSnapshot(query(getScoresCollectionRef(), where("classId", "==", classId)), (querySnapshot) => {
      const fetchedScores = []; querySnapshot.forEach((doc) => fetchedScores.push({ id: doc.id, ...doc.data() })); setAllScores(fetchedScores);
    }, (error) => console.error("Error fetching scores:", error));
    const heartsUnsub = onSnapshot(query(getStudentHeartsCollectionRef(), where("classId", "==", classId)), (querySnapshot) => {
      const fetchedHearts = {};
      querySnapshot.forEach((doc) => { const data = doc.data(); fetchedHearts[data.studentName] = { hearts: data.hearts || 0, heartsGiven: data.heartsGiven || 0, pointsSpent: data.pointsSpent || 0 }; });
      setHeartCounts(fetchedHearts);
    }, (error) => console.error("Error fetching heart counts:", error));
    const reflectionsUnsub = onSnapshot(query(getReflectionsCollectionRef(), where("classId", "==", classId)), (querySnapshot) => {
      const fetched = []; querySnapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() })); setAllReflections(fetched);
    }, (error) => console.error("Error fetching reflections:", error));
    const rosterUnsub = onSnapshot(query(getRosterCollectionRef(), where("classId", "==", classId)), (querySnapshot) => {
      const fetchedRoster = []; querySnapshot.forEach(doc => fetchedRoster.push(doc.data())); setClassRoster(fetchedRoster);
    }, (error) => console.error("Error fetching roster:", error));
    return () => { classUnsub(); scoresUnsub(); heartsUnsub(); reflectionsUnsub(); rosterUnsub(); };
  }, [isAuthReady, classId]);
  
  useEffect(() => {
    if (!isAuthReady || !classId) return;
    const q = query(getCompletionsCollectionRef(), where("classId", "==", classId));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
      setCompletionsList(list);
      if (list.length > 0) {
        const newCompletion = list[0];
        if ((Date.now() - newCompletion.timestamp) < 10000 && newCompletion.timestamp !== lastNotifiedRef.current) {
          lastNotifiedRef.current = newCompletion.timestamp;
          setNotification(newCompletion);
          if (notificationTimer.current) clearTimeout(notificationTimer.current);
          notificationTimer.current = setTimeout(() => setNotification(null), 5000);
        }
      }
    });
    return () => { unsub(); if (notificationTimer.current) clearTimeout(notificationTimer.current); };
  }, [isAuthReady, classId]);
  
  useEffect(() => {
    if (!isAuthReady || !userName) return;
    const q = query(getScoresCollectionRef(), where("studentName", "==", userName));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const fetched = []; querySnapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() })); setAllMyScoresGlobal(fetched);
    });
    return () => unsub();
  }, [isAuthReady, userName]);

  useEffect(() => {
    if (!isAuthReady || !classId) return;
    const q = query(getGlobalAnnouncementsCollectionRef(), where("classId", "==", classId));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newAnnouncement = change.doc.data();
          if ((Date.now() - newAnnouncement.timestamp) < 10000 && newAnnouncement.timestamp !== shownAnnouncementTimestamp.current) {
            setGlobalAnnouncement(newAnnouncement); shownAnnouncementTimestamp.current = newAnnouncement.timestamp; 
            if (globalAnnouncementTimer.current) clearTimeout(globalAnnouncementTimer.current);
            globalAnnouncementTimer.current = setTimeout(() => setGlobalAnnouncement(null), 8000); 
          }
        }
      });
    });
    return () => { unsub(); if (globalAnnouncementTimer.current) clearTimeout(globalAnnouncementTimer.current); };
  }, [isAuthReady, classId]); 

  useEffect(() => {
    if (!userName) return;
    const prevCounts = prevHeartCountsRef.current;
    if (!prevCounts || !heartCounts[userName]) { prevHeartCountsRef.current = heartCounts; return; }
    const oldHearts = prevCounts[userName]?.hearts || 0; const newHearts = heartCounts[userName]?.hearts || 0;
    if (newHearts > oldHearts) {
      for (let i = 0; i < (newHearts - oldHearts); i++) {
        const id = Date.now() + Math.random() + i; const newHeart = { id, x: Math.random() * 80 + 10, duration: Math.random() * 2 + 3 }; 
        setFloatingHearts(c => [...c, newHeart]); setTimeout(() => setFloatingHearts(c => c.filter(h => h.id !== id)), newHeart.duration * 1000);
      }
    }
    prevHeartCountsRef.current = heartCounts;
  }, [heartCounts, userName]); 

  useEffect(() => {
    if ((view === 'studentLesson' || view === 'studentWaiting' || view === 'studentReadLesson' || view === 'quiz') && classId && userName) {
      const updateOnlineStatus = () => {
        let currentLesson = null;
        if (view === 'studentReadLesson' || view === 'quiz') { currentLesson = activeLessonId; }
        updateDoc(getRosterDocRef(classId, userName), { lastSeen: Date.now(), currentLessonId: currentLesson }).catch(e => console.error("Heartbeat error", e));
      };
      updateOnlineStatus();
      const interval = setInterval(updateOnlineStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [view, classId, userName, activeLessonId]);

  useEffect(() => {
    if (view === 'studentWaiting' && classId && userName) {
      const rosterDocRef = getRosterDocRef(classId, userName);
      const unsub = onSnapshot(rosterDocRef, (docSnap) => {
        if (docSnap.exists()) { const data = docSnap.data(); if (data.status === 'approved') { handleSetView('studentLesson'); } } else { setIsRejected(true); }
      });
      return () => unsub();
    }
  }, [view, classId, userName]);

  const playClickSound = useCallback(() => {
      if (clickSoundRef.current && (view.startsWith('student') || view === 'quiz') && view !== 'studentLogin') {
          clickSoundRef.current.currentTime = 0; clickSoundRef.current.play().catch(e => {});
      }
  }, [view]);

  useEffect(() => {
    if (view === 'quiz' && showFeedback === null && !showPreview) {
      setTimerValue(30); if (timerId.current) clearInterval(timerId.current);
      timerId.current = setInterval(() => setTimerValue(prev => prev - 1), 1000);
    }
    if (view !== 'quiz' || showFeedback !== null) if (timerId.current) clearInterval(timerId.current);
    return () => { if (timerId.current) clearInterval(timerId.current); };
  }, [view, currentQuestionIndex, showFeedback, showPreview]); 

  useEffect(() => {
    if (timerValue <= 0 && view === 'quiz' && showFeedback === null && !showPreview) {
      if (timerId.current) clearInterval(timerId.current); setShowFeedback({ status: 'timeup', points: 0 }); setIncorrectAnswerCount(p => p + 1);
    }
  }, [timerValue, view, showFeedback, showPreview]);

  useEffect(() => {
    if (view === 'quiz') { setShowPreview(true); const previewTimer = setTimeout(() => setShowPreview(false), 5000); return () => clearTimeout(previewTimer); }
  }, [view, currentQuestionIndex]); 

  useEffect(() => { if (needsToStartQuiz && currentLesson) { setView('quiz'); setNeedsToStartQuiz(false); } }, [needsToStartQuiz, currentLesson, setView]);
  
  const globalLeaderboardScores = useMemo(() => {
    const firstScores = allScores.reduce((acc, score) => {
      const key = `${score.studentName}-${score.studentAgeLevel || 'default'}-${score.lessonId}`;
      if (!acc[key] || score.timestamp < acc[key].timestamp) acc[key] = score; return acc;
    }, {});
    const studentTotals = Object.values(firstScores).reduce((acc, score) => {
      const key = `${score.studentName}-${score.studentAgeLevel || 'default'}`;
      if (!acc[key]) acc[key] = { totalScore: 0, studentName: score.studentName, studentAgeLevel: score.studentAgeLevel || 'default' };
      acc[key].totalScore += score.score; return acc;
    }, {});
    const finalLeaderboard = Object.values(studentTotals).map(s => ({ studentName: s.studentName, studentAgeLevel: s.studentAgeLevel, totalScore: s.totalScore }));
    finalLeaderboard.sort((a, b) => b.totalScore - a.totalScore); return finalLeaderboard;
  }, [allScores]);

  const mySpendableCredits = useMemo(() => {
    if (!userName) return 0;
    const myScore = globalLeaderboardScores.find(s => s.studentName === userName)?.totalScore || 0;
    const myPointsSpent = heartCounts[userName]?.pointsSpent || 0;
    return myScore - myPointsSpent;
  }, [globalLeaderboardScores, heartCounts, userName]);
  const myTotalLessonsCompletedAllClasses = useMemo(() => new Set(allMyScoresGlobal.map(s => `${s.classId}-${s.lessonId}`)).size, [allMyScoresGlobal]);

  const isCurrentClassAllDone = useMemo(() => {
    const completedIds = new Set(allScores.filter(s => s.studentName === userName).map(s => s.lessonId));
    const relevantLessons = lessons.filter(l => l.questions?.[studentAgeLevel]?.length >= 8);
    return relevantLessons.length > 0 && relevantLessons.every(l => completedIds.has(l.lessonId));
  }, [lessons, allScores, userName, studentAgeLevel]);

  useEffect(() => {
    if (isCurrentClassAllDone && classId && !classCompletePromptShownRef.current[classId] && (view === 'studentLesson' || view === 'studentReadLesson')) {
      classCompletePromptShownRef.current[classId] = true;
      setShowClassSwitchPrompt(true);
    }
  }, [isCurrentClassAllDone, classId, view]);

  const getAvailableCompetitorCount = useCallback((lessonId) => {
    const names = new Set();
    allScores.forEach(s => { if (s.lessonId === lessonId && s.studentName !== userName) names.add(s.studentName); });
    return names.size;
  }, [allScores, userName]);

  const generateQuizCompetitors = useCallback((lessonId, numQuestions, desiredTotal = 5) => {
    const maxTotal = numQuestions * 1000;
    const opponentsNeeded = Math.max(1, desiredTotal - 1);
    const others = {};
    allScores.forEach(s => { if (s.lessonId === lessonId && s.studentName !== userName) { if (!others[s.studentName] || s.score > others[s.studentName]) { others[s.studentName] = s.score; } } });
    let realCompetitors = Object.entries(others).map(([studentName, totalScore]) => ({ studentName, totalScore }));
    realCompetitors = realCompetitors.sort(() => Math.random() - 0.5).slice(0, opponentsNeeded);
    const placeholderNames = ['Alex', 'Maya', 'Jordan', 'Sam'];
    const placeholderPercents = [0.9, 0.85, 0.75, 0.7];
    const needed = Math.min(4, opponentsNeeded - realCompetitors.length);
    const placeholders = [];
    for (let i = 0; i < needed; i++) { placeholders.push({ studentName: placeholderNames[i], totalScore: Math.round(maxTotal * placeholderPercents[i]) }); }
    const combined = [...realCompetitors, ...placeholders];
    return combined.map(c => {
      const cumulative = []; const correct = []; let prev = 0;
      for (let q = 1; q <= numQuestions; q++) { const target = Math.round(c.totalScore * (q / numQuestions)); cumulative.push(target); correct.push(target - prev > 0); prev = target; }
      return { studentName: c.studentName, cumulative, correct };
    });
  }, [allScores, userName]);

  const generateNewLessonId = useCallback(() => {
    if (lessons.length === 0) return 'L1';
    const lessonNumbers = lessons.map(l => parseInt(l.lessonId.substring(1)) || 0);
    return `L${Math.max(0, ...lessonNumbers) + 1}`;
  }, [lessons]);

  const handleTeacherLogin = useCallback(async () => {
    if (!targetClassId) { setModal({ message: 'Please enter a Class ID.', type: 'error', visible: true }); return; }
    const enteredClassId = targetClassId.toUpperCase().trim();
    setIsLoading(true);
    try {
      const docSnap = await getDoc(getClassDocRef(enteredClassId));
      if (docSnap.exists() && docSnap.data().teacherId !== currentUserId) {
        setModal({ message: 'Access Denied: This Class ID is already registered by another teacher.', type: 'error', visible: true });
        setIsLoading(false); return;
      }
      localStorage.setItem('lastClassId', enteredClassId);
      setClassId(enteredClassId); 
      setView('teacherDashboard');
    } catch (error) { console.error(error); setModal({ message: 'Error checking class ID.', type: 'error', visible: true }); }
    setIsLoading(false);
  }, [targetClassId, currentUserId]);

  const updateLessonsInFirestore = useCallback(async (newLessons) => {
    if (!classId) return;
    try { await updateDoc(getClassDocRef(classId), { lessons: newLessons }); } 
    catch (error) { console.error("Error updating lessons:", error); setModal({ message: 'Failed to update lessons.', type: 'error', visible: true }); }
  }, [classId]);
  
  const handleToggleAutoApprove = useCallback(async () => {
    if (!classId || !classData) return;
    try {
      const newState = !classData.autoApprove;
      await updateDoc(getClassDocRef(classId), { autoApprove: newState });
      setModal({ message: `Auto-Approve is now ${newState ? 'ON' : 'OFF'}.`, type: 'success', visible: true });
    } catch (error) { setModal({ message: `Failed to toggle Auto-Approve: ${error.message}`, type: 'error', visible: true }); }
  }, [classId, classData]);

  const handleApproveStudent = async (studentNameToApprove) => {
    if (!classId) return;
    try {
      await updateDoc(getRosterDocRef(classId, studentNameToApprove), { status: 'approved' });
      setModal({ message: `${studentNameToApprove} has been approved.`, type: 'success', visible: true });
    } catch (error) { setModal({ message: `Failed to approve: ${error.message}`, type: 'error', visible: true }); }
  };

  const handleDeleteStudent = (studentNameToDelete) => {
    if (!classId) return;
    setConfirmationModal({
      message: `Are you sure you want to remove ${studentNameToDelete}?`, confirmText: "Remove",
      onConfirm: async () => {
        try { await deleteDoc(getRosterDocRef(classId, studentNameToDelete)); setConfirmationModal({ message: '', onConfirm: null }); }
        catch (error) { setModal({ message: `Failed to remove: ${error.message}`, type: 'error', visible: true }); }
      },
      onCancel: () => setConfirmationModal({ message: '', onConfirm: null })
    });
  };

  // Links a Smart Study roster student's name to a Tutoring Dashboard student.
  // Renames all of their records within THIS class (scores, quiz completions,
  // reflections, hearts, roster) to the Tutoring name, so their identity is
  // consistent everywhere from now on.
  // Students with quiz completions/scores not yet in approved roster → shown in Link to Tutoring
  const studentsWithCompletionsNotApproved = useMemo(() => {
    const approvedNames = new Set(
      classRoster.filter(s => s.status === 'approved').map(s => s.studentName.toLowerCase())
    );
    const fromData = new Set([
      ...completionsList.map(c => c.studentName),
      ...allScores.map(s => s.studentName),
    ]);
    return [...fromData].filter(name => !approvedNames.has(name.toLowerCase()));
  }, [completionsList, allScores, classRoster]);

  const handleApproveStudentsWithCompletions = useCallback(async () => {
    if (studentsWithCompletionsNotApproved.length === 0) return;
    setIsLoading(true);
    try {
      for (const name of studentsWithCompletionsNotApproved) {
        const rRef = getRosterDocRef(classId, name);
        const snap = await getDoc(rRef);
        if (snap.exists()) {
          await updateDoc(rRef, { status: 'approved' });
        } else {
          await setDoc(rRef, { classId, studentName: name, status: 'approved', joinedAt: Date.now(), lastSeen: Date.now() });
        }
      }
      setModal({ message: `✅ Approved ${studentsWithCompletionsNotApproved.length} student(s).`, type: 'success', visible: true });
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  }, [studentsWithCompletionsNotApproved, classId]);

  const handleLinkStudentToTutoring = useCallback(async (oldName, newName, tutoringStudentUid) => {
    if (!classId || !oldName || !newName) return;
    setIsLoading(true);
    const results = { scores: null, completions: null, reflections: null, hearts: null, roster: null, profile: null };

    // Always store the SmartStudy name in the Tutoring student profile so
    // SmartStudyProgressBadge can query quizCompletions under both names —
    // this makes the count correct even if the rename hasn't finished yet or
    // the student used a different name before linking.
    if (tutoringStudentUid && oldName !== newName) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', tutoringStudentUid), {
          [`smartStudyNames.${classId}`]: oldName
        });
        results.profile = 'ok';
      } catch (err) {
        console.error('Error storing smartStudyNames in Tutoring profile:', err);
        results.profile = `error: ${err.message}`;
      }
    }

    // If names match there is nothing to rename; just mark as linked and return.
    if (oldName === newName) {
      try {
        await setDoc(getRosterDocRef(classId, newName), { linkedToTutoring: true }, { merge: true });
        results.roster = 'ok';
      } catch (err) {
        console.error('Error marking roster as linked:', err);
        results.roster = `error: ${err.message}`;
      }
      setIsLoading(false);
      setModal({ message: `Linked "${newName}" to Tutoring.`, type: 'success', visible: true });
      return;
    }

    const renameInCollection = async (collectionRef, label) => {
      try {
        const snap = await getDocs(query(collectionRef, where("classId", "==", classId), where("studentName", "==", oldName)));
        if (snap.empty) { results[label] = 0; return; }
        const docs = snap.docs;
        let done = 0;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.update(d.ref, { studentName: newName }));
          await batch.commit();
          done += chunk.length;
        }
        results[label] = done;
      } catch (err) {
        console.error(`Error renaming ${label}:`, err);
        results[label] = `error: ${err.message}`;
      }
    };

    await renameInCollection(getScoresCollectionRef(), 'scores');
    await renameInCollection(getCompletionsCollectionRef(), 'completions');
    await renameInCollection(getReflectionsCollectionRef(), 'reflections');

    try {
      const oldHeartRef = getStudentHeartDocRef(classId, oldName);
      const oldHeartSnap = await getDoc(oldHeartRef);
      if (oldHeartSnap.exists()) {
        await setDoc(getStudentHeartDocRef(classId, newName), { ...oldHeartSnap.data(), classId, studentName: newName }, { merge: true });
        await deleteDoc(oldHeartRef);
      }
      results.hearts = 'ok';
    } catch (err) {
      console.error('Error migrating hearts:', err);
      results.hearts = `error: ${err.message}`;
    }

    try {
      const oldRosterRef = getRosterDocRef(classId, oldName);
      const oldRosterSnap = await getDoc(oldRosterRef);
      if (oldRosterSnap.exists()) {
        await setDoc(getRosterDocRef(classId, newName), { ...oldRosterSnap.data(), studentName: newName, linkedToTutoring: true }, { merge: true });
        await deleteDoc(oldRosterRef);
      } else {
        await setDoc(getRosterDocRef(classId, newName), { linkedToTutoring: true }, { merge: true });
      }
      results.roster = 'ok';
    } catch (err) {
      console.error('Error migrating roster:', err);
      results.roster = `error: ${err.message}`;
    }

    setIsLoading(false);
    const failed = Object.entries(results).filter(([, v]) => typeof v === 'string' && v.startsWith('error'));
    if (failed.length > 0) {
      setModal({ message: `Linked "${oldName}" → "${newName}" with some issues: ${failed.map(([k, v]) => `${k} (${v})`).join(', ')}. Check the browser console (F12) for details.`, type: 'error', visible: true });
    } else {
      setModal({ message: `Linked "${oldName}" → "${newName}". All their records in this class now use the Tutoring name.`, type: 'success', visible: true });
    }
  }, [classId]);

  const handleDownloadLessonsOnly = useCallback(() => {
    if (lessons.length === 0) { setModal({ message: "No lessons to download.", type: 'error', visible: true }); return; }
    const data = { classId, timestamp: new Date().toISOString(), lessons };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href; link.download = `lessons-only-${classId}-${Date.now()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
  }, [lessons, classId]);

  const handleDownloadLessons = useCallback(() => {
    if (lessons.length === 0 && allScores.length === 0) { setModal({ message: "No data to download.", type: 'error', visible: true }); return; }
    const backupData = { classId: classId, timestamp: new Date().toISOString(), lessons: lessons, scores: allScores, reflections: allReflections, roster: classRoster, hearts: heartCounts, completions: completionsList };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob); 
    const link = document.createElement('a'); 
    link.href = href; link.download = `backup-data-${classId}-${Date.now()}.json`; 
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
  }, [lessons, classId, allScores, allReflections, classRoster, heartCounts, completionsList]); 

  const handleUploadLessonsOnly = useCallback((event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uploadedData = JSON.parse(e.target.result);
        setConfirmationModal({
          message: "This will overwrite ONLY the lessons for this class. Student records (scores, roster, completions) will NOT be touched. Are you sure?",
          confirmText: "Upload Lessons Only",
          onConfirm: async () => {
            setIsLoading(true);
            setConfirmationModal({ message: '', onConfirm: null });
            try {
              const lessonsToUpload = Array.isArray(uploadedData) ? uploadedData : (uploadedData.lessons || []);
              await updateDoc(getClassDocRef(classId), { lessons: lessonsToUpload });
              setModal({ message: `✅ Imported ${lessonsToUpload.length} lessons. Student records untouched.`, type: 'success', visible: true });
            } catch (err) {
              console.error(err);
              setModal({ message: `Error: ${err.message}`, type: 'error', visible: true });
            } finally { setIsLoading(false); }
          }
        });
      } catch (err) { setModal({ message: `Parse error: ${err.message}`, type: 'error', visible: true }); }
      event.target.value = '';
    };
    reader.readAsText(file);
  }, [classId]);

  const handleUploadLessons = useCallback((event) => {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uploadedData = JSON.parse(e.target.result); 
        setConfirmationModal({
          message: "This will overwrite all current data (lessons, scores, roster, reflections, hearts). Are you sure?", confirmText: "Upload Data", 
          onConfirm: async () => { 
            setIsLoading(true);
            setConfirmationModal({ message: '', onConfirm: null });
            try {
              const lessonsToUpload = Array.isArray(uploadedData) ? uploadedData : uploadedData.lessons;
              await updateDoc(getClassDocRef(classId), { lessons: lessonsToUpload || [] });

              // Build a flat list of { ref, data } write operations, then commit
              // in chunks of 400 (Firestore's 500-per-batch limit) so a single
              // oversized restore or one bad record can't abort the whole thing.
              // IMPORTANT: every record's classId is force-overridden to the
              // CURRENT class being imported into — the backup file carries
              // whatever classId it was originally exported under, which is
              // often different from the class the teacher is restoring into.
              // Without this override, restored records silently never match
              // any query (all filtered by classId) and appear "missing".
              const ops = [];
              (uploadedData.scores || []).forEach(score => {
                const ref = score.id ? doc(getScoresCollectionRef(), score.id) : doc(getScoresCollectionRef());
                ops.push({ ref, data: { ...score, classId } });
              });
              (uploadedData.roster || []).forEach(student => {
                if (!student.studentName) return;
                ops.push({ ref: getRosterDocRef(classId, student.studentName), data: { ...student, classId } });
              });
              (uploadedData.reflections || []).forEach(ref_ => {
                const ref = ref_.id ? doc(getReflectionsCollectionRef(), ref_.id) : doc(getReflectionsCollectionRef());
                ops.push({ ref, data: { ...ref_, classId } });
              });
              Object.entries(uploadedData.hearts || {}).forEach(([studentName, data]) => {
                ops.push({ ref: getStudentHeartDocRef(classId, studentName), data: { ...data, classId, studentName } });
              });
              (uploadedData.completions || []).forEach(c => {
                ops.push({ ref: doc(getCompletionsCollectionRef()), data: { classId, studentName: c.studentName, lessonId: c.lessonId, timestamp: c.timestamp } });
              });

              const CHUNK_SIZE = 400;
              let written = 0;
              let failedChunks = 0;
              for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
                const chunk = ops.slice(i, i + CHUNK_SIZE);
                try {
                  const batch = writeBatch(db);
                  chunk.forEach(op => batch.set(op.ref, op.data));
                  await batch.commit();
                  written += chunk.length;
                } catch (chunkErr) {
                  console.error('Restore chunk failed:', chunkErr);
                  failedChunks++;
                }
              }

              if (failedChunks > 0) {
                setModal({ message: `Restore finished with issues: ${written} of ${ops.length} records restored. ${failedChunks} batch(es) failed — check the browser console (F12) for details.`, type: 'error', visible: true });
              } else {
                setModal({ message: `Data restored successfully. ${written} of ${ops.length} records restored.`, type: 'success', visible: true }); 
              }
            } catch (err) { setModal({ message: `Restore failed: ${err.message}`, type: 'error', visible: true }); }
            finally { setIsLoading(false); }
          },
          onCancel: () => setConfirmationModal({ message: '', onConfirm: null })
        });
      } catch (error) { setModal({ message: `Failed to read file: ${error.message}`, type: 'error', visible: true }); }
    };
    reader.readAsText(file); 
    if (event.target) event.target.value = null;
  }, [classId, updateLessonsInFirestore]);

  const [newLesson, setNewLesson] = useState({ title: '', masterContent: '', content: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, editingId: null, headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '', });
  const generateLessonTitle = useCallback(async (contentSample) => {
    const payload = { contents: [{ parts: [{ text: `Lesson content:\n${contentSample}\n\nSuggest one short, clear English title for this lesson (5 words or fewer). Return only the title text, nothing else.` }] }] };
    const response = await fetchWithRetry(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.replace(/["\n]/g, '').trim();
  }, []);

  const handleSaveLesson = useCallback(async () => {
    const { title, masterContent, content, formattedContent, editingId, headerImageUrl, image1Url, image2Url, image3Url, image4Url } = newLesson; 
    if (!content.storyteller || !content.explorer || !content.adventurer || !content.voyager) { setModal({ message: 'All four content fields are required.', type: 'error', visible: true }); return; }
    if (lessons.length >= 50 && !editingId) { setModal({ message: 'Maximum 50 lessons allowed per class.', type: 'error', visible: true }); return; }
    let finalTitle = title;
    if (!finalTitle || !finalTitle.trim()) {
      setIsLoading(true);
      try {
        const sample = masterContent || content.adventurer || content.explorer || content.storyteller || content.voyager;
        finalTitle = await generateLessonTitle(sample);
        if (!finalTitle) finalTitle = 'Untitled Lesson';
      } catch (error) { finalTitle = 'Untitled Lesson'; } finally { setIsLoading(false); }
    }
    let updatedLessons;
    const lessonData = { title: finalTitle, content: content || { storyteller: '', explorer: '', adventurer: '', voyager: '' }, imageUrl: '', formattedContent: formattedContent || { storyteller: '', explorer: '', adventurer: '', voyager: '' }, headerImageUrl: headerImageUrl || '', image1Url: image1Url || '', image2Url: image2Url || '', image3Url: image3Url || '', image4Url: image4Url || '', };
    if (editingId) updatedLessons = lessons.map(l => l.lessonId === editingId ? { ...l, ...lessonData } : l);
    else updatedLessons = [...lessons, { lessonId: generateNewLessonId(), ...lessonData, questions: [] }];
    updateLessonsInFirestore(updatedLessons);
    setNewLesson({ title: '', masterContent: '', content: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, editingId: null, headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '', });
  }, [newLesson, lessons, generateNewLessonId, updateLessonsInFirestore, generateLessonTitle]);
  
  const handleEditLesson = useCallback((lesson) => {
    const content = (lesson.content && typeof lesson.content === 'object') ? lesson.content : { storyteller: lesson.content||'', explorer: lesson.content||'', adventurer: lesson.content||'', voyager: lesson.content||'' }; 
    const formattedContent = (lesson.formattedContent && typeof lesson.formattedContent === 'object') ? lesson.formattedContent : { storyteller: lesson.formattedContent||'', explorer: lesson.formattedContent||'', adventurer: lesson.formattedContent||'', voyager: lesson.formattedContent||'' }; 
    setNewLesson({ title: lesson.title || '', masterContent: '', content: content, imageUrl: '', formattedContent: formattedContent, editingId: lesson.lessonId, headerImageUrl: lesson.headerImageUrl || '', image1Url: lesson.image1Url || '', image2Url: lesson.image2Url || '', image3Url: lesson.image3Url || '', image4Url: lesson.image4Url || '', });
  }, []);

  const handleDeleteLesson = useCallback((lessonId) => {
    setConfirmationModal({
        message: `Are you sure you want to delete Lesson ${lessonId}?`, confirmText: "Delete", 
        onConfirm: () => {
            updateLessonsInFirestore(lessons.filter(l => l.lessonId !== lessonId));
            if (newLesson.editingId === lessonId) setNewLesson({ title: '', masterContent: '', content: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, editingId: null, headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '', });
            setConfirmationModal({ message: '', onConfirm: null }); setModal({ message: `Lesson ${lessonId} deleted.`, type: 'success', visible: true });
        }
    });
  }, [lessons, newLesson.editingId, updateLessonsInFirestore]);
  
  const handleFormatLesson = useCallback(async (lessonId, lessonContent) => {
    setIsLoading(true);
    const lessonIndex = lessons.findIndex(l => l.lessonId === lessonId);
    if (lessonIndex === -1) { setModal({ message: 'Lesson not found.', type: 'error', visible: true }); setIsLoading(false); return; }
    const contentToFormat = (lessonContent && typeof lessonContent === 'object') ? lessonContent : { storyteller: String(lessonContent), explorer: String(lessonContent), adventurer: String(lessonContent), voyager: String(lessonContent) }; 
    const systemPrompt = `You are an expert editor for children's learning materials. Your task is to take the provided raw lesson text and format it into visually appealing and readable English markdown. Crucially, do not change the original facts, meaning, or educational content. Only adjust the presentation. Do NOT use any headings (like # or ##). Use bold text (**text**) for important words or phrases. Use numbered (1.) or bulleted (-) lists if appropriate. Use italic text (*text*) if appropriate. Do NOT add any extra text, comments, or explanations outside of the formatted content. Only return the formatted markdown content.`;
    const formatContent = async (text) => {
      if (!text || text.trim() === '') return ''; 
      const payload = { contents: [{ parts: [{ text: `Format the following lesson content:\n\n${text}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, };
      const response = await fetchWithRetry(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };
    try {
      const [fs, fe, fa, fv] = await Promise.all([ formatContent(contentToFormat.storyteller), formatContent(contentToFormat.explorer), formatContent(contentToFormat.adventurer), formatContent(contentToFormat.voyager) ]);
      const updatedLessons = [...lessons]; updatedLessons[lessonIndex].formattedContent = { storyteller: fs, explorer: fe, adventurer: fa, voyager: fv }; updatedLessons[lessonIndex].content = contentToFormat; 
      await updateDoc(getClassDocRef(classId), { lessons: updatedLessons }); setModal({ message: `Formatted successfully.`, type: 'success', visible: true }); 
    } catch (error) { setModal({ message: `Formatting failed.`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [classId, lessons]);

  const generateLevelContent = useCallback(async (masterText, level) => {
    const systemPrompt = `You are an expert children's educational writer. Rewrite the given lesson content in English so it is appropriate for this reading level: ${AGE_LEVELS[level]}. Adjust vocabulary difficulty, sentence length, and total word count to match this age group (younger levels: very short sentences, simple words, fewer words overall; older levels: richer vocabulary, longer sentences, more detail). Keep all facts and meaning accurate. Do not add headings. Return only the rewritten lesson text, nothing else.`;
    const payload = { contents: [{ parts: [{ text: masterText }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
    const response = await fetchWithRetry(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }, []);

  const handleGenerateAllLevels = useCallback(async () => {
    if (!newLesson.masterContent || !newLesson.masterContent.trim()) { setModal({ message: 'Please write the lesson content first.', type: 'error', visible: true }); return; }
    setIsLoading(true);
    try {
      const [storyteller, explorer, adventurer, voyager] = await Promise.all([
        generateLevelContent(newLesson.masterContent, 'storyteller'), generateLevelContent(newLesson.masterContent, 'explorer'),
        generateLevelContent(newLesson.masterContent, 'adventurer'), generateLevelContent(newLesson.masterContent, 'voyager'),
      ]);
      setNewLesson(p => ({ ...p, content: { storyteller, explorer, adventurer, voyager }, formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' } }));
      setModal({ message: 'Generated content for all 4 levels.', type: 'success', visible: true });
    } catch (error) { setModal({ message: `Generation failed: ${error.message}`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [newLesson.masterContent, generateLevelContent]);

  const handleRegenerateLevel = useCallback(async (level) => {
    if (!newLesson.masterContent || !newLesson.masterContent.trim()) { setModal({ message: 'Please write the lesson content first.', type: 'error', visible: true }); return; }
    setIsLoading(true);
    try {
      const text = await generateLevelContent(newLesson.masterContent, level);
      setNewLesson(p => ({ ...p, content: { ...p.content, [level]: text }, formattedContent: { ...p.formattedContent, [level]: '' } }));
      setModal({ message: `Regenerated ${AGE_LEVELS[level]}.`, type: 'success', visible: true });
    } catch (error) { setModal({ message: `Regeneration failed: ${error.message}`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [newLesson.masterContent, generateLevelContent]);

  const generateQuestions = useCallback(async (lessonId, lessonTitle, lessonContent) => {
    setIsLoading(true);
    const lessonIndex = lessons.findIndex(l => l.lessonId === lessonId);
    if (lessonIndex === -1) { setModal({ message: 'Lesson not found.', type: 'error', visible: true }); setIsLoading(false); return; }
    const contentByLevel = (lessonContent && typeof lessonContent === 'object') ? lessonContent : { storyteller: String(lessonContent), explorer: String(lessonContent), adventurer: String(lessonContent), voyager: String(lessonContent) };
    if (!contentByLevel.storyteller || !contentByLevel.explorer || !contentByLevel.adventurer || !contentByLevel.voyager) { setModal({ message: 'All 4 content levels must be filled.', type: 'error', visible: true }); setIsLoading(false); return; }
    const quizSchema = { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING", enum: ["mcq", "tf"] }, text: { type: "STRING" }, correct: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } } }, required: ["type", "text", "correct"], propertyOrdering: ["type", "text", "options", "correct"] } };
    const baseSystemPrompt = `You are a helpful educational assistant. Generate a quiz based on the provided lesson. The quiz must contain exactly 10 questions and use simple, clear English: Five Multiple Choice Questions (MCQ) with 4 options and a single correct answer. Five True/False (TF) questions. The response MUST be a JSON array matching the provided schema.`;
    const prompts = { storyteller: `(Ages 5+) ${baseSystemPrompt} Make extremely simple.`, explorer: `(Ages 6-8) ${baseSystemPrompt} Make simple.`, adventurer: `(Ages 9-11) ${baseSystemPrompt} Make standard.`, voyager: `(Ages 12+) ${baseSystemPrompt} Make challenging.` };
    const generateQuizForLevel = async (level) => {
        const payload = { contents: [{ parts: [{ text: `Generate a 10-question quiz for: "${lessonTitle}". Content: "${contentByLevel[level]}"` }] }], systemInstruction: { parts: [{ text: prompts[level] }] }, generationConfig: { responseMimeType: "application/json", responseSchema: quizSchema } };
        const response = await fetchWithRetry(BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const questions = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text);
        if (!Array.isArray(questions) || questions.length !== 10) throw new Error(`AI failed for ${level}.`); return questions;
    };
    try {
        const [sq, eq, aq, vq] = await Promise.all([ generateQuizForLevel('storyteller'), generateQuizForLevel('explorer'), generateQuizForLevel('adventurer'), generateQuizForLevel('voyager') ]);
        const updatedLessons = [...lessons]; updatedLessons[lessonIndex].questions = { storyteller: sq, explorer: eq, adventurer: aq, voyager: vq };
        await updateDoc(getClassDocRef(classId), { lessons: updatedLessons }); setModal({ message: `Quizzes generated.`, type: 'success', visible: true });
    } catch (error) { setModal({ message: `Failed: ${error.message}`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [classId, lessons]);

  // --- Entry point coming from the Tutoring Dashboard ("Apps" menu for
  // teachers, or "Start Lesson" for students). Skips the Home role-choice
  // screen and, for students, skips manual name entry entirely. ---
  useEffect(() => {
    if (!entryRequest) return;
    const signature = JSON.stringify({ mode: entryRequest.mode, classId: entryRequest.classId, studentName: entryRequest.studentName, ageLevel: entryRequest.ageLevel });
    if (signature === lastHandledEntryRequestRef.current) return;
    lastHandledEntryRequestRef.current = signature;

    if (entryRequest.mode === 'teacher') {
      setView('teacherLogin');
    } else if (entryRequest.mode === 'student') {
      setUserName(entryRequest.studentName || '');
      if (entryRequest.ageLevel) {
        setStudentAgeLevel(entryRequest.ageLevel); // pre-select but always show picker
      }
      // Always show ageLevelPicker so student can confirm or change their level.
      setView('ageLevelPicker');
    }
  }, [entryRequest]);

  useEffect(() => {
    if (view !== 'classPicker') return;
    setClassPickerLoading(true);
    const highlightClassId = entryRequest?.classId || null;
    getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'))
      .then(async snap => {
        let ids = snap.docs.map(d => d.id).sort();
        if (highlightClassId && !ids.includes(highlightClassId)) ids = [highlightClassId, ...ids];
        setClassPickerList(ids);

        // Load per-class lesson counts and student rank (parallel queries)
        const infoMap = {};
        await Promise.all(ids.map(async cId => {
          try {
            // lesson count from class doc
            const classDoc = snap.docs.find(d => d.id === cId);
            const lessonCount = classDoc ? (classDoc.data().lessons || []).length : 0;
            // student's completions for this class
            const myCompletions = new Set(
              allMyScoresGlobal.filter(s => s.classId === cId).map(s => s.lessonId)
            );
            const completedCount = myCompletions.size;
            // per-class rank: count distinct lessonIds per student name in scores
            const scoresSnap = await getDocs(query(
              collection(db,'artifacts',appId,'public','data','scores'),
              where('classId','==',cId)
            ));
            const byName = {};
            scoresSnap.docs.forEach(d => {
              const n = d.data().studentName; const l = d.data().lessonId;
              if(n&&l){ if(!byName[n])byName[n]=new Set(); byName[n].add(l); }
            });
            const ranked = Object.entries(byName).sort((a,b)=>b[1].size-a[1].size);
            const myIdx = ranked.findIndex(([n])=> n===userName || (allMyScoresGlobal.some(s=>s.studentName===n&&s.classId===cId)&&allMyScoresGlobal[0]?.studentName===n));
            // Better: find by studentName matching userName
            const myRankIdx = ranked.findIndex(([n]) => n === userName);
            const myRank = myRankIdx >= 0 ? myRankIdx + 1 : 0;
            infoMap[cId] = { lessonCount, completedCount, myRank };
          } catch(e) { console.error('class info error:', cId, e); }
        }));
        setClassPickerInfo(infoMap);
      })
      .catch(err => {
        console.error('Error loading class list:', err);
        setClassPickerList(highlightClassId ? [highlightClassId] : []);
      })
      .finally(() => setClassPickerLoading(false));
  }, [view]);

  const handleAgeLevelContinue = async () => {
    if (!studentAgeLevel) return;
    if (entryRequest?.onAgeLevelChosen) {
      try { await entryRequest.onAgeLevelChosen(studentAgeLevel); } catch (e) { console.error('Error saving age level:', e); }
    }
    setView('classPicker');
  };

  const handleSelectClassFromPicker = useCallback(async (targetId) => {
    const enteredName = (entryRequest?.studentName || userName || '').trim();
    if (!enteredName || !studentAgeLevel) { setModal({ message: 'Missing name or age level.', type: 'error', visible: true }); return; }
    localStorage.setItem('lastClassId', targetId);
    localStorage.setItem('lastUserName', enteredName);
    try {
      const classDocSnap = await getDoc(getClassDocRef(targetId));
      if (!classDocSnap.exists()) { setModal({ message: 'This class does not exist.', type: 'error', visible: true }); return; }
      const rosterDocRef = getRosterDocRef(targetId, enteredName);
      const docSnap = await getDoc(rosterDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status !== 'approved' || !data.linkedToTutoring) {
          // Coming in through Tutoring means this student is already
          // verified — always approve and mark as linked immediately.
          await updateDoc(rosterDocRef, { status: 'approved', linkedToTutoring: true, lastSeen: Date.now() });
        } else {
          updateDoc(rosterDocRef, { lastSeen: Date.now() });
        }
        setClassId(targetId); setUserName(enteredName); setView('studentLesson');
      } else {
        await setDoc(rosterDocRef, { classId: targetId, studentName: enteredName, studentAgeLevel: studentAgeLevel, status: 'approved', linkedToTutoring: true, joinedAt: Date.now(), lastSeen: Date.now() });
        setClassId(targetId); setUserName(enteredName); setView('studentLesson');
      }
    } catch (error) {
      console.error('Error entering class:', error);
      setModal({ message: 'Network error. Please try again.', type: 'error', visible: true });
    }
  }, [entryRequest, userName, studentAgeLevel]);

  const handleStudentLogin = useCallback(async () => {
    if (!targetClassId || !userName || !studentAgeLevel) { setModal({ message: 'Please enter Class ID, your Name, and select your Age Level.', type: 'error', visible: true }); return; }
    setIsRejected(false); 
    const enteredClassId = targetClassId.toUpperCase().trim();
    const enteredName = userName.trim();
    localStorage.setItem('lastClassId', enteredClassId);
    localStorage.setItem('lastUserName', enteredName);
    try {
      const classDocSnap = await getDoc(getClassDocRef(enteredClassId));
      if (!classDocSnap.exists()) { setModal({ message: 'Class ID does not exist. Please check and try again.', type: 'error', visible: true }); return; }
      const isAutoApprove = classDocSnap.data().autoApprove === true;
      const rosterDocRef = getRosterDocRef(enteredClassId, enteredName);
      const docSnap = await getDoc(rosterDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'approved') {
          setClassId(enteredClassId); setUserName(enteredName); setView('studentLesson');
          updateDoc(rosterDocRef, { lastSeen: Date.now() });
        } else if (data.status === 'pending' && isAutoApprove) {
          await updateDoc(rosterDocRef, { status: 'approved', lastSeen: Date.now() });
          setClassId(enteredClassId); setUserName(enteredName); setView('studentLesson');
        } else {
          setClassId(enteredClassId); setUserName(enteredName); setView('studentWaiting');
          updateDoc(rosterDocRef, { lastSeen: Date.now() });
        }
      } else {
        await setDoc(rosterDocRef, { classId: enteredClassId, studentName: enteredName, studentAgeLevel: studentAgeLevel, status: isAutoApprove ? 'approved' : 'pending', joinedAt: Date.now(), lastSeen: Date.now() });
        setClassId(enteredClassId); setUserName(enteredName); setView(isAutoApprove ? 'studentLesson' : 'studentWaiting');
      }
    } catch (error) { console.error("Login Roster Error:", error); setModal({ message: 'Network error. Please try again.', type: 'error', visible: true }); }
  }, [targetClassId, userName, studentAgeLevel]); 

  const handleStartQuiz = useCallback((lesson, desiredCompetitorTotal = 5) => {
    playClickSound(); setActiveLessonId(lesson.lessonId); setCurrentLesson(lesson); 
    if (!lesson.questions || !lesson.questions[studentAgeLevel] || lesson.questions[studentAgeLevel].length === 0) { setModal({ message: 'Quiz not available.', type: 'error', visible: true }); return; }
    setQuizCompetitors(generateQuizCompetitors(lesson.lessonId, lesson.questions[studentAgeLevel].length, desiredCompetitorTotal));
    setCurrentQuestionIndex(0); setCurrentQuizScore(0); setCorrectAnswerCount(0); setIncorrectAnswerCount(0); setShowFeedback(null); setTimerValue(30); setShowPreview(true); setNeedsToStartQuiz(true); 
  }, [playClickSound, studentAgeLevel, generateQuizCompetitors]);
  
  const handleFinishQuiz = useCallback(async () => {
    if (!currentLesson) return; 
    const currentQuizQuestions = currentLesson.questions[studentAgeLevel] || [];
    const totalQuestions = currentQuizQuestions.length || 10;
    const requiredToPass = Math.floor(totalQuestions * 0.8);
    if (correctAnswerCount < requiredToPass) {
      setModal({ message: `You got ${correctAnswerCount}/${totalQuestions} correct. Need ${requiredToPass} to pass. Please review the lesson and try again.`, type: 'error', visible: true });
      setView('studentLesson'); return;
    }
    setIsSavingScore(true);
    const submissionTime = Date.now();
    try {
      await addDoc(getScoresCollectionRef(), { classId: classId, studentName: userName, studentAgeLevel: studentAgeLevel, studentId: currentUserId, lessonId: currentLesson.lessonId, score: currentQuizScore, timestamp: submissionTime });
      await addDoc(getCompletionsCollectionRef(), { classId: classId, studentName: userName, lessonId: currentLesson.lessonId, timestamp: submissionTime });
      setModal({ message: `Quiz Finished! Correct: ${correctAnswerCount}, Wrong: ${incorrectAnswerCount}. Final score: ${currentQuizScore}`, type: 'success', visible: true });
    } catch (error) { console.error(error); setModal({ message: 'Failed to save score. Please check your connection.', type: 'error', visible: true }); }
    finally { setIsSavingScore(false); setView('studentLesson'); }
  }, [currentLesson, classId, userName, currentUserId, currentQuizScore, correctAnswerCount, incorrectAnswerCount, studentAgeLevel]);

  const handleAnswerSubmit = useCallback((selectedAnswer) => {
    playClickSound(); if (showFeedback) return;
    if (timerId.current) clearInterval(timerId.current);
    if (!currentLesson || !currentLesson.questions || !currentLesson.questions[studentAgeLevel]) return; 
    const q = currentLesson.questions[studentAgeLevel][currentQuestionIndex];
    const isCorrect = String(selectedAnswer).trim().toLowerCase() === String(q.correct).trim().toLowerCase();
    let points = 0; if (isCorrect) { setCorrectAnswerCount(p => p + 1); points = Math.round(500 + (timerValue / 30) * 500); } else { setIncorrectAnswerCount(p => p + 1); }
    setCurrentQuizScore(p => p + points); setShowFeedback({ status: isCorrect ? 'correct' : 'incorrect', points: points });
  }, [currentLesson, studentAgeLevel, currentQuestionIndex, timerValue, showFeedback, playClickSound]); 

  const handleNextQuestion = useCallback(() => {
    playClickSound(); 
    const currentQuizQuestions = currentLesson?.questions?.[studentAgeLevel] || [];
    if (currentQuestionIndex < currentQuizQuestions.length - 1) { setCurrentQuestionIndex(p => p + 1); setShowFeedback(null); setShowPreview(true); setTimerValue(30); }
    else { handleFinishQuiz(); }
  }, [currentQuestionIndex, currentLesson, studentAgeLevel, handleFinishQuiz, playClickSound]);

  const handleHeartClick = async (recipientName) => {
    if (!classId || !userName || !recipientName) return;
    const giverName = userName; const giverScore = globalLeaderboardScores.find(s => s.studentName === giverName)?.totalScore || 0;
    if ((heartCounts[giverName]?.heartsGiven || 0) >= Math.floor(giverScore / 1000)) { setModal({ message: "Not enough credits.", type: 'error', visible: true }); return; }
    try {
      await runTransaction(db, async (transaction) => {
        const recipientDoc = await transaction.get(getStudentHeartDocRef(classId, recipientName)); const giverDoc = await transaction.get(getStudentHeartDocRef(classId, giverName));
        transaction.set(getStudentHeartDocRef(classId, recipientName), { classId, studentName: recipientName, hearts: (recipientDoc.data()?.hearts || 0) + 1 }, { merge: true });
        transaction.set(getStudentHeartDocRef(classId, giverName), { classId, studentName: giverName, heartsGiven: (giverDoc.data()?.heartsGiven || 0) + 1 }, { merge: true });
      });
    } catch (error) { setModal({ message: 'Failed to send reaction.', type: 'error', visible: true }); }
  };

  const handleBuyAirplaneActual = async () => {
    if (!classId || !userName) return;
    const giverDocRef = getStudentHeartDocRef(classId, userName); const myScore = globalLeaderboardScores.find(s => s.studentName === userName)?.totalScore || 0;
    try {
      await runTransaction(db, async (transaction) => {
        const giverDoc = await transaction.get(giverDocRef); const pointsSpent = giverDoc.data()?.pointsSpent || 0;
        if (myScore - pointsSpent < 25000) throw new Error("Not enough points."); 
        transaction.set(giverDocRef, { pointsSpent: pointsSpent + 25000 }, { merge: true });
      });
      await addDoc(getGlobalAnnouncementsCollectionRef(), { classId, studentName: userName, totalScore: myScore, timestamp: Date.now() });
      setModal({ message: 'Announcement sent!', type: 'success', visible: true });
    } catch (error) { setModal({ message: `Failed: ${error.message}`, type: 'error', visible: true }); }
  };

  const handleBuyAirplaneConfirmation = () => {
    if (mySpendableCredits < 25000) { setModal({ message: "Not enough points.", type: 'error', visible: true }); return; }
    setConfirmationModal({ message: `Cost: 25,000 points. Announce score?`, confirmText: "Yes", onConfirm: () => { handleBuyAirplaneActual(); setConfirmationModal({ message: '', onConfirm: null }); }, onCancel: () => setConfirmationModal({ message: '', onConfirm: null }) });
  };

  const handleTeacherCreateClass = useCallback(async () => {
    if (!classId || !currentUserId) return; setIsLoading(true);
    try { await setDoc(getClassDocRef(classId), { classId, teacherId: currentUserId, lessons: [], autoApprove: false }, { merge: true }); setModal({ message: `Class initialized.`, type: 'success', visible: true }); } 
    catch (error) { setModal({ message: `Failed: ${error.message}`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [classId, currentUserId]);

  const handleSwitchClass = useCallback(async (newIdRaw) => {
    const newId = (newIdRaw || '').toUpperCase().trim();
    if (!newId) return;
    setIsLoading(true); setLessons([]); setAllScores([]);
    try {
      const classDocSnap = await getDoc(getClassDocRef(newId));
      if (!classDocSnap.exists()) { setModal({ message: 'This Class ID does not exist. Please check and try again.', type: 'error', visible: true }); setIsLoading(false); return; }
      const isAutoApprove = classDocSnap.data().autoApprove === true;
      const rosterDocRef = getRosterDocRef(newId, userName);
      const docSnap = await getDoc(rosterDocRef);
      let nextView = 'studentLesson';
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'approved') { await updateDoc(rosterDocRef, { lastSeen: Date.now() }); }
        else if (data.status === 'pending' && isAutoApprove) { await updateDoc(rosterDocRef, { status: 'approved', lastSeen: Date.now() }); }
        else { nextView = 'studentWaiting'; }
      } else {
        await setDoc(rosterDocRef, { classId: newId, studentName: userName, studentAgeLevel, status: isAutoApprove ? 'approved' : 'pending', joinedAt: Date.now(), lastSeen: Date.now() });
        nextView = isAutoApprove ? 'studentLesson' : 'studentWaiting';
      }
      localStorage.setItem('lastClassId', newId);
      setClassId(newId); setTargetClassId(newId); setShowClassSwitchPrompt(false); setSwitchClassInput(''); setView(nextView);
    } catch (error) { setModal({ message: `Error: ${error.message}`, type: 'error', visible: true }); } finally { setIsLoading(false); }
  }, [userName, studentAgeLevel]);

  const handleSetView = (newView) => {
    if (['globalLeaderboard', 'ageGroupLeaderboard', 'studentProfile', 'lessonLeaderboard'].includes(newView)) {
        if (['teacherDashboard', 'studentLesson'].includes(view)) { setPreviousView(view); }
    }
    setView(newView);
  };

  const renderView = () => {
    if (!isAuthReady) return <LoadingView />;
    switch (view) {
      case 'teacherLogin': return <TeacherLoginView targetClassId={targetClassId} setTargetClassId={setTargetClassId} handleTeacherLogin={handleTeacherLogin} handleSetView={handleSetView} />;
      case 'studentLogin': return <StudentLoginView targetClassId={targetClassId} setTargetClassId={setTargetClassId} userName={userName} setUserName={setUserName} studentAgeLevel={studentAgeLevel} setStudentAgeLevel={setStudentAgeLevel} handleStudentLogin={handleStudentLogin} handleSetView={handleSetView} />;
      case 'ageLevelPicker': return <AgeLevelPickerView studentAgeLevel={studentAgeLevel} setStudentAgeLevel={setStudentAgeLevel} onContinue={handleAgeLevelContinue} />;
      case 'classPicker': return <ClassPickerView classList={classPickerList} highlightClassId={entryRequest?.classId} onSelectClass={handleSelectClassFromPicker} loading={classPickerLoading} classPickerInfo={classPickerInfo} />;
      case 'studentWaiting': return <StudentWaitingView handleSetView={handleSetView} userName={userName} isRejected={isRejected} />;
      case 'teacherDashboard':
        if (!classData) return <ClassCreateView classId={classId} handleTeacherCreateClass={handleTeacherCreateClass} isLoading={isLoading} handleSetView={handleSetView} />;
        return <TeacherDashboard classId={classId} newLesson={newLesson} setNewLesson={setNewLesson} lessons={lessons} isLoading={isLoading} handleSaveLesson={handleSaveLesson} handleFormatLesson={handleFormatLesson} generateQuestions={generateQuestions} handleGenerateAllLevels={handleGenerateAllLevels} handleRegenerateLevel={handleRegenerateLevel} handleEditLesson={handleEditLesson} handleDeleteLesson={handleDeleteLesson} globalLeaderboardScores={globalLeaderboardScores} setSelectedName={setSelectedName} handleSetView={handleSetView} playClickSound={playClickSound} handleDownloadLessons={handleDownloadLessons} handleUploadLessons={handleUploadLessons} fileInputRef={fileInputRef} handleDownloadLessonsOnly={handleDownloadLessonsOnly} handleUploadLessonsOnly={handleUploadLessonsOnly} fileInputRefLessonsOnly={fileInputRefLessonsOnly} heartCounts={heartCounts} setSelectedAgeLevel={setSelectedAgeLevel} classRoster={classRoster} handleApproveStudent={handleApproveStudent} handleDeleteStudent={handleDeleteStudent} autoApprove={classData?.autoApprove || false} handleToggleAutoApprove={handleToggleAutoApprove} completionsList={completionsList} onLinkStudent={handleLinkStudentToTutoring} allScores={allScores} studentsWithCompletionsNotApproved={studentsWithCompletionsNotApproved} onApproveStudentsWithCompletions={handleApproveStudentsWithCompletions} />;
      case 'studentLesson':
        if (!classDataLoaded) return <LoadingView />;
        if (!classData) return <ClassErrorView classId={classId} handleSetView={handleSetView} />;
        return <StudentLessonView userName={userName} classId={classId} lessons={lessons} globalLeaderboardScores={globalLeaderboardScores} setSelectedName={setSelectedName} handleSetView={handleSetView} setActiveLessonId={setActiveLessonId} setSelectedLessonId={setSelectedLessonId} playClickSound={playClickSound} studentAgeLevel={studentAgeLevel} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} mySpendableCredits={mySpendableCredits} handleBuyAirplaneConfirmation={handleBuyAirplaneConfirmation} completionsList={completionsList} allScores={allScores} myTotalLessonsCompletedAllClasses={myTotalLessonsCompletedAllClasses} />;
      case 'studentReadLesson': return <StudentReadLessonView lessons={lessons} activeLessonId={activeLessonId} globalLeaderboardScores={globalLeaderboardScores} userName={userName} setSelectedName={setSelectedName} handleSetView={handleSetView} setQuizConfirmation={setQuizConfirmation} playClickSound={playClickSound} studentAgeLevel={studentAgeLevel} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} allReflections={allReflections} classId={classId} completionsList={completionsList} allScores={allScores} />;
      case 'quiz':
        const quizQuestions = (currentLesson && currentLesson.questions && currentLesson.questions[studentAgeLevel]) ? currentLesson.questions[studentAgeLevel] : [];
        if (quizQuestions.length === 0 || quizQuestions[currentQuestionIndex] === undefined || !currentLesson) return <LoadingView />; 
        return <QuizView quiz={quizQuestions[currentQuestionIndex]} questionNumber={currentQuestionIndex + 1} totalQuestions={quizQuestions.length} timerValue={timerValue} feedback={showFeedback} onAnswerSelect={handleAnswerSubmit} onNext={handleNextQuestion} isLastQuestion={currentQuestionIndex === quizQuestions.length - 1} totalScore={currentQuizScore} userName={userName} activeLesson={currentLesson} showPreview={showPreview} isSavingScore={isSavingScore} competitors={quizCompetitors} />;
      case 'studentProfile': return <StudentProfileView allScores={allScores} selectedName={selectedName} handleSetView={handleSetView} setSelectedLessonId={setSelectedLessonId} playClickSound={playClickSound} setSelectedAgeLevel={setSelectedAgeLevel} previousView={previousView} userName={userName} globalLeaderboardScores={globalLeaderboardScores} heartCounts={heartCounts} myTotalLessonsCompletedAllClasses={myTotalLessonsCompletedAllClasses}/>;
      case 'lessonLeaderboard': return <LessonLeaderboardView allScores={allScores} selectedLessonId={selectedLessonId} handleSetView={handleSetView} setSelectedName={setSelectedName} playClickSound={playClickSound} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} userName={userName} previousView={previousView} />;
      case 'globalLeaderboard': return <GlobalLeaderboardView globalLeaderboardScores={globalLeaderboardScores} handleSetView={handleSetView} previousView={previousView} setSelectedName={setSelectedName} playClickSound={playClickSound} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} userName={userName} />;
      case 'ageGroupLeaderboard': return <AgeGroupLeaderboardView allScores={allScores} selectedAgeLevel={selectedAgeLevel} handleSetView={handleSetView} previousView={previousView} setSelectedName={setSelectedName} playClickSound={playClickSound} heartCounts={heartCounts} handleHeartClick={handleHeartClick} setSelectedAgeLevel={setSelectedAgeLevel} userName={userName} />;
      case 'home': default: return <HomeView handleSetView={handleSetView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&display=swap');
        .font-fredoka { font-family: 'Fredoka', sans-serif; }
        body, .font-sans { font-family: 'Fredoka', sans-serif; }
        .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        @keyframes floatUp { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(-500px) scale(1.5); opacity: 0; } }
        @keyframes flyAcross { from { transform: translate(-200px, 0); } to { transform: translate(100vw, -100vh); } }
        @keyframes dropText { from { transform: translateY(-50px) scale(0.8); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        @keyframes bounceSlight { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-bounce-slight { animation: bounceSlight 2s infinite; }
        @keyframes slideInRight { from { transform: translateX(110%); } to { transform: translateX(0); } }
      `}</style>
      <div className="min-h-screen">{renderView()}</div>
      <GlobalScoreAnnouncement announcement={globalAnnouncement} onClose={() => setGlobalAnnouncement(null)} />
      <div className="fixed inset-0 w-full h-full pointer-events-none z-[100] overflow-hidden">
        {floatingHearts.map(heart => ( <div key={heart.id} className="absolute bottom-0" style={{ left: `${heart.x}%`, animation: `floatUp ${heart.duration}s ease-out forwards` }}><Heart className="w-8 h-8 text-pink-500 fill-pink-500" /></div> ))}
      </div>
      <MessageModal message={modal.message} type={modal.type} onClose={() => setModal({ ...modal, visible: false, message: '' })} />
      <ConfirmationModal message={confirmationModal.message} confirmText={confirmationModal.confirmText || "Delete"} onConfirm={confirmationModal.onConfirm} onCancel={() => setConfirmationModal({ message: '', onConfirm: null })} />
      {quizConfirmation.lesson && <QuizConfirmationModal onConfirm={() => { setCompetitorSelection({ lesson: quizConfirmation.lesson }); setCompetitorCount(5); setQuizConfirmation({ lesson: null }); }} onCancel={() => setQuizConfirmation({ lesson: null })} />}
      {competitorSelection.lesson && <CompetitorCountModal maxAvailable={getAvailableCompetitorCount(competitorSelection.lesson.lessonId)} count={competitorCount} setCount={setCompetitorCount} onConfirm={() => { handleStartQuiz(competitorSelection.lesson, competitorCount); setCompetitorSelection({ lesson: null }); }} onCancel={() => setCompetitorSelection({ lesson: null })} />}
      {showClassSwitchPrompt && <ClassSwitchModal classId={classId} value={switchClassInput} setValue={setSwitchClassInput} onSwitch={handleSwitchClass} onCancel={() => setShowClassSwitchPrompt(false)} />}
    </div>
  );
};

export default SmartStudyApp;
