import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  getDocs,
  deleteDoc,
  writeBatch,
  orderBy,
  limit,
  arrayUnion,
  increment,
  deleteField
} from 'firebase/firestore';
import { appId } from './firebaseConfig';
import { auth, db } from './firebase';

// --- Firebase Configuration ---
const initialAuthToken = null;

// --- Helper Functions ---

const playSound = (soundIndex) => {
  try {
    const audio = document.getElementById('notification-sound');

    if (!audio) return;
    const startTime = soundIndex * 2; 
    audio.currentTime = startTime;
    audio.play().catch(e => console.warn("Audio play failed:", e)); 
    setTimeout(() => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    }, 2000);
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

const stringToColor = (str) => {
  if (!str) return '#cccccc';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') { 
    return 'Pending...'; 
  }
  return timestamp.toDate().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diffMs = end.toDate() - start.toDate();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} minutes`; 
};

const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const openLink = (url) => {
  if (!url) {
    console.warn("No URL provided to openLink.");
    return;
  }
  if (url.startsWith('smartstudy://')) {
    const [, rest] = url.split('smartstudy://');
    const [classId, lessonId] = rest.split('/');
    alert(`This lesson lives inside the "Lessons & Quiz" tab.\n\nGo to: Lessons & Quiz → Student → Class ID "${classId}" → find lesson ${lessonId}.\n\n(Automatic jump-to-lesson is coming in a future update.)`);
    return;
  }
  let correctedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    correctedUrl = `https://${url}`;
  }
  window.open(correctedUrl, '_blank', 'noopener,noreferrer');
};

// Safely extracts just the Class ID from a "smartstudy://" link. Tolerant of
// the old "smartstudy://CLASSID/LESSONID" format (used briefly before the
// picker was simplified to class-only) as well as the current
// "smartstudy://CLASSID" format — always returns just the class ID with no
// slash, so it's safe to use directly as a Firestore document ID segment.
const extractSmartStudyClassId = (link) => {
  if (!link || typeof link !== 'string' || !link.startsWith('smartstudy://')) return null;
  const rest = link.replace('smartstudy://', '');
  return rest.split('/')[0] || null;
};

const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';

const extractAbhidhammaLessonId = (link) => {
  if (!link || !link.startsWith('abhidhamma://')) return null;
  return link.replace('abhidhamma://', '') || null;
};

// ── Dhammaschool app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
const DHAMMASCHOOL_APP_ID = 'dhammaschool-app'; // Firestore appId used inside the HTML app's PATHS.*
const MYANMAR_SPEAKING_APP_ID = 'myanmar-speaking-app'; // Firestore appId used inside myanmar-speaking-app.jsx
const sanitizeMyanmarSpeakingKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');
// TODO: replace with the actual hosted URL once the Dhammaschool app app is deployed.
const DHAMMASCHOOL_APP_URL = 'https://sayadawtejinda.github.io/dhamma/Dhammaschool.html';

// ── Myanmar Speaking app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
// TODO: replace with the actual hosted URL once the Myanmar Speaking app is deployed (same pattern as Dhammaschool app).
const MYANMAR_SPEAKING_APP_URL = 'https://sayadawtejinda.github.io/myanmar-wordcraft/';
// Loose match instead of a strict startsWith(MYANMAR_SPEAKING_APP_URL) — an
// older Lesson Bank entry may have been saved without the trailing slash, or
// with http:// instead of https://, and would otherwise silently fall through
// to the generic external-link opener (new tab, no auto-login, no minutes).
const isMyanmarSpeakingUrl = (u) => typeof u === 'string' && u.includes('myanmar-wordcraft');

// ── Myanmar Reader app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
// TODO: replace with the actual hosted URL once the Myanmar Reader app is deployed (same pattern as Myanmar Speaking app).
const MYANMAR_READER_APP_URL = 'https://sayadawtejinda.github.io/myanmar-reader/';

const extractDhammaschoolClassId = (link) => {
  if (!link || !link.startsWith('dhammaschool://')) return null;
  return link.replace('dhammaschool://', '') || null;
};

const sanitizeKey = (key) => {
  if (!key || typeof key !== 'string') return 'unknown_lesson';
  return key.replace(/[\.\#\$\/\[\]]/g, '_');
};

// A Lesson Bank entry can be sent to any class at Assign-time (the class isn't
// baked in when the entry is created), so the same bank entry/title gets reused
// across many different classes. Trophy tracking keyed on title alone would
// wrongly lump every class's trophies together under one number — folding the
// classId into the key keeps each class's trophies separate and correct.
const extractClassIdFromLink = (link) => {
  if (!link) return null;
  if (link.startsWith('smartstudy://')) return extractSmartStudyClassId(link);
  if (link.startsWith('abhidhamma://')) return extractAbhidhammaLessonId(link);
  if (link.startsWith('dhammaschool://')) return extractDhammaschoolClassId(link);
  return null;
};

// ── Grouped apps (Reading Myanmar / Speaking Myanmar / Myanmar Part 1 & 2) ──
// Each bundles several games behind one "Choose a Part" screen (see
// ReadingMyanmarApp.jsx etc). A Lesson Bank entry for one of these is
// stored as the bare scheme (e.g. "readingmyanmar://"); the specific part
// is chosen at Assign Lesson time (same "not baked into the bank entry"
// idea as smartstudy://) and appended as "readingmyanmar://<partKey>" on
// the assigned lesson, so the student's copy jumps straight into that part
// instead of showing the chooser, and Available Lessons can show which
// part it is. These lists must stay in sync with the PARTS arrays in the
// three group files.
const READING_MYANMAR_PARTS = [
  { key: 'consonantpractice', label: 'Part 1: Consonant Practice' },
  { key: 'burmesegame', label: 'Part 2: Burmese Consonant Game' },
  { key: 'vowelslearning', label: 'Part 3: Myanmar Vowels' },
  { key: 'myanmarspelling', label: 'Part 4: Myanmar Spelling' },
  { key: 'consonantendings', label: 'Part 5: Consonant Endings' },
  { key: 'soundpractice', label: 'Part 6: Sound Practice' },
];
const SPEAKING_MYANMAR_PARTS = [
  { key: 'myanmarpoems', label: 'Part 1: Myanmar Poems' },
  { key: 'numberlearning', label: 'Part 2: Number Learning' },
  { key: 'animalsound', label: 'Part 3: Animal Sound Quiz' },
  { key: 'burmeselearninggames', label: 'Part 4: Burmese Learning Games' },
  { key: 'interactivequiz', label: 'Part 5: Interactive Learning Quiz' },
  { key: 'timeandcalendar', label: 'Part 6: Time and Calendar' },
];
const MYANMAR_PART1AND2_PARTS = [
  { key: 'part1a', label: 'Part 1A: Myanmar Learning & Game' },
  { key: 'part1b', label: 'Part 1B: Kindergarten Classroom' },
  { key: 'part2a', label: 'Part 2A: Chapters 15-28 Vocabulary' },
  { key: 'part2b', label: 'Part 2B: Chapters 15-29 Reading' },
];
const GROUP_PARTS_BY_SCHEME = {
  'readingmyanmar://': READING_MYANMAR_PARTS,
  'speakingmyanmar://': SPEAKING_MYANMAR_PARTS,
  'myanmarpart1and2://': MYANMAR_PART1AND2_PARTS,
};
const extractGroupPartKey = (link) => {
  if (!link) return null;
  for (const scheme of Object.keys(GROUP_PARTS_BY_SCHEME)) {
    if (link.startsWith(scheme) && link !== scheme) return link.replace(scheme, '');
  }
  return null;
};
const groupPartLabel = (scheme, partKey) => {
  const parts = GROUP_PARTS_BY_SCHEME[scheme];
  const part = parts && parts.find(p => p.key === partKey);
  return part ? part.label : null;
};
const groupSchemeOfLink = (link) => {
  if (!link) return null;
  for (const scheme of Object.keys(GROUP_PARTS_BY_SCHEME)) {
    if (link === scheme || link.startsWith(scheme)) return scheme;
  }
  return null;
};
const computeLessonKey = (title, link) => {
  const classId = extractClassIdFromLink(link);
  return sanitizeKey(classId ? `${title}_${classId}` : title);
};

// Single source of truth for "how many lesson-units has this student
// completed on this lesson" — Smart Study, Abhidhamma, and Dhammaschool all
// share the same idea (a class = several lessons, trophies awarded roughly
// every 5), and used to each compute this number slightly differently in
// different places (tracked completedUnits, a trophy-derived estimate, real
// recorded sessions, and — for Smart Study only — a live class-completion
// count), which could disagree with each other: a teacher fixing the
// trophy count wouldn't necessarily update every other display, so a
// student could see "✅ Completed" in one place and "Continue Lesson 1" in
// another for the exact same lesson. This takes the highest of every
// signal available, so every display -- Available Lessons, Active
// Session, the Completed badge, Continue/Start button text -- always
// agrees, and "Fix Previously Earned" alone is enough to correct all of
// them at once.
const getEffectiveCompletedUnit = (lesson, studentProfile, sessionsForLesson, ssCompletionCounts) => {
  if (!lesson) return 0;
  const lessonKey = computeLessonKey(lesson.title, lesson.link);
  const maxAvailable = lesson.trophyLimit || 0;
  const unitCount = lesson.unitCount || 0;
  const previouslyEarned = studentProfile?.earnedTrophies?.[lessonKey] || 0;
  const trackedCompletedUnit = studentProfile?.completedUnits?.[lessonKey] || 0;
  const derivedCompletedUnit = (unitCount > 0 && maxAvailable > 0)
    ? Math.min(unitCount, Math.ceil((previouslyEarned * unitCount) / maxAvailable))
    : 0;
  const highestSessionCompletedUnit = (sessionsForLesson || []).reduce(
    (max, s) => (typeof s.completedUnit === 'number' ? Math.max(max, s.completedUnit) : max), 0
  );
  const ssClassId = lesson.link?.startsWith('smartstudy://') ? extractSmartStudyClassId(lesson.link) : null;
  const ssCount = ssClassId != null ? (ssCompletionCounts?.[ssClassId] || 0) : 0;
  const effective = Math.max(trackedCompletedUnit, derivedCompletedUnit, highestSessionCompletedUnit, ssCount);
  return unitCount > 0 ? Math.min(unitCount, effective) : effective;
};

// How many trophies a class with this many lessons is worth. Matches the
// teacher's real awarding pattern (confirmed against actual examples):
// 4 lessons -> 1 trophy, 10 -> 2, 11 -> 2, 29 -> 6 — i.e. round(lessons / 5),
// not floor(lessons / 5) (floor would give 4->0 and 29->5, both wrong).
const computeClassTrophyMax = (lessonCount) => {
  const n = lessonCount || 0;
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n / 5));
};

// One-time migration map for the 4 old Gemini-link Lesson Bank entries being
// retired in favor of the real per-class Smart Study tracking. `fallback` is
// only ever used for a target class that has NO live Smart Study tracking at
// all (e.g. Mingala) -- every class that does exist live gets its trophies
// computed from real quizCompletions data instead, exactly like a normal
// Smart Study class, so a student's true progress decides the number, not
// this old fixed value.
const SMARTSTUDY_MIGRATION_MAP = {
  "10 Parami": [
    { classId: 'BUDDHA', fallback: 2 },
    { classId: 'DHAMMA', fallback: 2 },
    { classId: 'NEW', fallback: 1 },
  ],
  " Heavenly World or Golden cage": [
    { classId: 'DEVA', fallback: 2 },
    { classId: 'KAMMA', fallback: 3 },
  ],
  "38 Blessings ": [
    { classId: 'MINGALA', fallback: 2 },
  ],
  "The Buddha's Eight Outer Victories": [
    { classId: 'OUTER VICTORIES', fallback: 2 },
    { classId: 'WASO', fallback: 2 },
  ],
};
const SMARTSTUDY_MIGRATION_NEW_TITLE = 'Smart Study';

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Paths ---
const publicDataPath = `/artifacts/${appId}/public/data`;
const configCollection = collection(db, `${publicDataPath}/config`);
const studentsCollection = collection(db, `${publicDataPath}/students`);
const lessonsCollection = collection(db, `${publicDataPath}/lessons`); 
const sessionsCollection = collection(db, `${publicDataPath}/studySessions`);
const lessonBankCollection = collection(db, `${publicDataPath}/lessonBank`); 
const teacherScheduleCollection = collection(db, `${publicDataPath}/teacherSchedule`); 
const groupsCollection = collection(db, `${publicDataPath}/studentGroups`);
const announcementsCollection = collection(db, `${publicDataPath}/announcements`);
const starAnnouncementsCollection = collection(db, `${publicDataPath}/starAnnouncements`);
const greetingsCollection = collection(db, `${publicDataPath}/greetings`);
const teacherConfigDoc = doc(configCollection, 'teacher');

// --- Components ---

function ConfirmationModal({ 
  isOpen, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor = "bg-red-600 hover:bg-red-700" 
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">{title}</h3>
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</div>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-5 py-2 rounded-lg text-white font-semibold ${confirmColor} shadow-md`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrophyResetModal({ isOpen, onReset, onDecline }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-[100]">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 text-center">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Reset Legacy Trophies?</h3>
        <p className="text-gray-700 mb-6 whitespace-pre-wrap">
          You have just imported data. Would you like to reset all previously awarded trophies for all students to start fresh according to the new rules?
          <br/><br/>
          If you select <strong>"No, Keep Them"</strong>, current trophy counts will be retained and you will not be asked again.
        </p>
        <div className="flex flex-col space-y-3">
          <button onClick={onReset} className="w-full px-5 py-3 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 shadow-md transition-colors">
            Yes, Reset All Trophies
          </button>
          <button onClick={onDecline} className="w-full px-5 py-3 rounded-lg text-gray-800 font-bold bg-gray-200 hover:bg-gray-300 shadow-md transition-colors">
            No, Keep Them
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentAttendanceModal({ isOpen, onClose, student }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDuration, setTotalDuration] = useState(0); 

  useEffect(() => {
    if (isOpen && student?.id) {
      setLoading(true);
      const q = query(sessionsCollection, where("studentUid", "==", student.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalMinutes = 0; 
        const history = snapshot.docs
          .map(doc => doc.data())
          .filter(s => s.endTime && s.startTime)
          .sort((a, b) => a.startTime.toDate() - b.startTime.toDate()); 
        
        history.forEach(entry => {
          if (entry.startTime && entry.endTime) {
            const diffMs = entry.endTime.toDate() - entry.startTime.toDate();
            totalMinutes += Math.round(diffMs / 60000);
          }
        });
            
        setAttendance(history);
        setTotalDuration(totalMinutes); 
        setLoading(false);
      }, (error) => {
        console.error("Error fetching attendance: ", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">
          Study History: {student?.name}
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
          {loading ? (
            <p className="text-gray-600">Loading history...</p>
          ) : attendance.length === 0 ? (
            <p className="text-gray-600">No completed study sessions found.</p>
          ) : (
            attendance.map((entry, index) => (
              <div key={index} className="bg-gray-100 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{entry.lessonTitle}</p>
                <p className="text-sm text-gray-700">Completed: {formatTimestamp(entry.endTime)}</p>
                <p className="text-sm text-gray-700">Duration: {getDuration(entry.startTime, entry.endTime)}</p>
                <p className="text-xs text-gray-600 mt-1 truncate">Feedback: {entry.feedbackNotes || 'N/A'}</p>
              </div>
            ))
          )}
        </div>
        {!loading && (
          <div className="mb-6 p-3 bg-indigo-50 rounded-lg text-center">
            <p className="text-lg font-semibold text-indigo-800">
              Total Study Time: {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </p>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditScheduleModal({ isOpen, onClose, onSave, entry, students }) {
  const [studentType, setStudentType] = useState('online');
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [updateType, setUpdateType] = useState('single'); 

  useEffect(() => {
    if (entry) {
      setUpdateType('single');

      if (entry.studentUid === 'offline') {
        setStudentType('offline');
        setSelectedStudentUid('');
        setManualStudentName(entry.studentName);
        setStudentSearch(''); 
      } else {
        setStudentType('online');
        setSelectedStudentUid(entry.studentUid);
        setManualStudentName('');
        const foundName = students.find(s => s.id === entry.studentUid)?.name;
        setStudentSearch(String(foundName || '')); 
      }
    
      setIsStudentDropdownOpen(false); 

      const startTime = (entry.startTime && typeof entry.startTime.toDate === 'function') 
        ? entry.startTime.toDate() : new Date(); 
      
      const endTime = (entry.endTime && typeof entry.endTime.toDate === 'function')
        ? entry.endTime.toDate() : new Date(startTime.getTime() + 60 * 60 * 1000);

      setManualDate(toLocalDateString(startTime));
      
      const formatTime = (date) => {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      setManualStartTime(formatTime(startTime));
      setManualEndTime(formatTime(endTime));
    }
  }, [entry, students]);

  if (!isOpen || !entry) return null;
  
  const filteredStudents = useMemo(() => {
    const searchStr = String(studentSearch || '').toLowerCase(); 
    if (!searchStr) return students; 
    return students.filter(s =>
      s.isActive === true && s.name && typeof s.name === 'string' && s.name.toLowerCase().startsWith(searchStr) 
    );
  }, [students, studentSearch]);

  const handleSaveClick = (e) => {
    e.preventDefault();
    let studentUid = '';
    let studentName = '';

    if (studentType === 'online') {
      if (!selectedStudentUid) return;
      studentUid = selectedStudentUid;
      studentName = students.find(s => s.id === studentUid)?.name || 'Unknown Student';
    } else {
      if (!manualStudentName) return;
      studentUid = 'offline';
      studentName = manualStudentName;
    }

    const [year, month, day] = manualDate.split('-').map(Number);
    const [startHour, startMinute] = manualStartTime.split(':').map(Number);
    const [endHour, endMinute] = manualEndTime.split(':').map(Number);

    const newStartTime = Timestamp.fromDate(new Date(year, month - 1, day, startHour, startMinute));
    const newEndTime = Timestamp.fromDate(new Date(year, month - 1, day, endHour, endMinute));

    onSave({
      id: entry.id,
      studentUid: studentUid,
      studentName: studentName,
      startTime: newStartTime,
      endTime: newEndTime,
      isRecurring: entry.isRecurring, 
      recurrenceId: entry.recurrenceId, 
      updateType: updateType 
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <form onSubmit={handleSaveClick} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Edit Schedule Entry</h3>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Student Type</label>
          <select 
            value={studentType} 
            onChange={(e) => setStudentType(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="online">Online Student</option>
            <option value="offline">Offline Student</option>
          </select>
        </div>
        
        {studentType === 'online' ? (
          <div className="mb-4 relative">
            <label className="block text-gray-700 mb-2">Select Student</label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value); 
                if (selectedStudentUid) setSelectedStudentUid(null); 
                setIsStudentDropdownOpen(true);
              }}
              onFocus={() => setIsStudentDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsStudentDropdownOpen(false), 200)} 
              placeholder="Type to search..."
              className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isStudentDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setStudentSearch(student.name);
                        setSelectedStudentUid(student.id);
                        setIsStudentDropdownOpen(false);
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer"
                    >
                      {student.name} ({student.displayId})
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500">No students found.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Student Name</label>
            <input type="text" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)} placeholder="e.g., Offline Student" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Date</label>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Start Time</label>
            <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">End Time</label>
            <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {entry.isRecurring && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="font-semibold text-yellow-800 mb-3">Recurring Entry</p>
            <p className="text-sm text-yellow-700 mb-3">This is a recurring entry. How would you like to update it?</p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" name="updateType" value="single" checked={updateType === 'single'}
                  onChange={() => setUpdateType('single')} className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                Update This Entry Only
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" name="updateType" value="all" checked={updateType === 'all'}
                  onChange={() => setUpdateType('all')} className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                Update All Future Entries
              </label>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancel
          </button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 shadow-md">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Report Components ---

function StarAnnouncementModal({ isOpen, onClose, students, onSend }) {
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const filtered = students.filter(s => s.isActive === true && s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUid || !message.trim()) return;
    onSend(selectedUid, duration, message.trim());
    setSearch(''); setSelectedUid(''); setDuration(1); setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">⭐ Announce Outstanding Student</h3>
        <div className="mb-4 relative">
          <label className="block text-gray-700 mb-2">Select Student</label>
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUid(''); setIsDropdownOpen(true); }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            placeholder="Type to search..."
            className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.length > 0 ? filtered.map(s => (
                <div key={s.id} onClick={() => { setSearch(s.name); setSelectedUid(s.id); setIsDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer">
                  {s.name}
                </div>
              )) : <div className="p-3 text-gray-500">No students found.</div>}
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Show for</label>
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => setDuration(1)} className={`w-1/2 p-2 rounded-lg font-semibold ${duration === 1 ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>1 Week</button>
            <button type="button" onClick={() => setDuration(2)} className={`w-1/2 p-2 rounded-lg font-semibold ${duration === 2 ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>2 Weeks</button>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="3" placeholder="e.g., This student has perfect attendance!" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 shadow-md">Send</button>
        </div>
      </form>
    </div>
  );
}

function AttendanceReports({ students, teacherSchedule, sessions }) {
  const [period, setPeriod] = useState('monthly'); 

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (period === 'monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const pastSchedules = teacherSchedule.filter(s => {
      const d = s.startTime.toDate();
      return d >= startDate && d <= now;
    });

    const offlineNames = [...new Set(pastSchedules.filter(s => s.studentUid === 'offline').map(s => s.studentName))];
    const offlineStudents = offlineNames.map(name => ({ id: 'offline', name: name, displayId: 'Offline' }));
    const allStudentsToReport = [...students.filter(s => s.isActive), ...offlineStudents];

    const report = allStudentsToReport.map(student => {
      const studentSchedules = pastSchedules.filter(s => s.studentUid === student.id || (s.studentUid === 'offline' && s.studentName === student.name));
      let attended = 0;
      let absent = 0;

      studentSchedules.forEach(entry => {
        if (entry.overrideStatus === 'attended') {
          attended++;
        } else if (entry.overrideStatus === 'absent') {
          absent++;
        } else if (entry.studentUid !== 'offline') {
          const entryDate = entry.startTime.toDate();
          const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 0, 0, 0);
          const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
          const didAttend = sessions.some(s => s.studentUid === student.id && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
          if (didAttend) attended++;
          else absent++;
        } else {
          absent++; 
        }
      });

      return {
        name: student.name,
        displayId: student.displayId,
        total: studentSchedules.length,
        attended,
        absent
      };
    });

    return report.filter(r => r.total > 0).sort((a, b) => (b.attended / b.total) - (a.attended / a.total));
  }, [period, students, teacherSchedule, sessions]);

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-indigo-200 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-indigo-800">Attendance Overview</h3>
        <div className="flex rounded-lg bg-gray-100 p-1 shadow-inner">
          <button onClick={() => setPeriod('monthly')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${period === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>This Month</button>
          <button onClick={() => setPeriod('yearly')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${period === 'yearly' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>This Year</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-indigo-50 text-indigo-800 border-b-2 border-indigo-200">
              <th className="p-3 font-semibold rounded-tl-lg">Student Name</th>
              <th className="p-3 font-semibold text-center">Total Scheduled</th>
              <th className="p-3 font-semibold text-center text-emerald-600">Attended</th>
              <th className="p-3 font-semibold text-center text-red-600">Absent</th>
              <th className="p-3 font-semibold text-center rounded-tr-lg">Rate</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500 font-medium">No scheduled sessions for this period.</td></tr>
            ) : (
              reportData.map((row, idx) => {
                const rate = Math.round((row.attended / row.total) * 100);
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">
                      {row.name} 
                      {row.displayId === 'Offline' && <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Offline</span>}
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">{row.total}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{row.attended}</td>
                    <td className="p-3 text-center font-bold text-red-600">{row.absent}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-1 rounded-full text-sm shadow-sm ${rate >= 80 ? 'bg-emerald-100 text-emerald-800' : rate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{rate}%</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeacherDashboard({ user, onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenConsonantPractice, onOpenBurmeseGame, onOpenMyanmarSpeaking, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2 }) {
  const [students, setStudents] = useState([]);
  const [lessonBank, setLessonBank] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [teacherSchedule, setTeacherSchedule] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [viewMode, setViewMode] = useState('send'); 
  const [reportTab, setReportTab] = useState('feedback'); 
  const [showAllReports, setShowAllReports] = useState(false); 
  const [teacherConfigData, setTeacherConfigData] = useState(null);
  const [recoveryPasscodeInput, setRecoveryPasscodeInput] = useState('');
  const [recoveryPasscodeSaving, setRecoveryPasscodeSaving] = useState(false);

  const handleSaveRecoveryPasscode = async () => {
    const code = recoveryPasscodeInput.trim();
    if (!code) { alert('Please enter a passcode.'); return; }
    setRecoveryPasscodeSaving(true);
    try {
      await setDoc(teacherConfigDoc, { passcode: code }, { merge: true });
      setRecoveryPasscodeInput('');
      alert('Recovery passcode saved! Write it down somewhere safe — you\'ll need it if you ever get logged out as teacher.');
    } catch (error) {
      console.error('Error saving recovery passcode:', error);
      alert('Error saving passcode. Please try again.');
    }
    setRecoveryPasscodeSaving(false);
  };
  
  const [newBankLessonTitle, setNewBankLessonTitle] = useState('');
  const [newBankLessonLink, setNewBankLessonLink] = useState('');
  const [newBankLessonDetails, setNewBankLessonDetails] = useState(''); 
  const [newBankLessonTrophyLimit, setNewBankLessonTrophyLimit] = useState(0);
  const [newBankLessonUnitLabel, setNewBankLessonUnitLabel] = useState('Chapter');
  const [newBankLessonUnitCount, setNewBankLessonUnitCount] = useState(0);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [smartStudyClasses, setSmartStudyClasses] = useState(null); // null = not loaded yet
  const [pickerLoading, setPickerLoading] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null); 
  const [mergeSourceId, setMergeSourceId] = useState(null); 
  const [mergeTargetId, setMergeTargetId] = useState(null); 
  const [mergeNewTitle, setMergeNewTitle] = useState(''); 
  const [mergeSourceTitle, setMergeSourceTitle] = useState('');
  const [mergeTargetTitle, setMergeTargetTitle] = useState('');
  const [isMerging, setIsMerging] = useState(false); 
  const draggedLessonIdRef = useRef(null);

  const [sendActionType, setSendActionType] = useState('lesson'); 
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [selectedBankLessonId, setSelectedBankLessonId] = useState('');
  const [sendSmartStudyClassId, setSendSmartStudyClassId] = useState(''); // class chosen in Send Action for smartstudy:// lessons
  const [sendGroupPartKey, setSendGroupPartKey] = useState(''); // part chosen in Send Action for readingmyanmar:// / speakingmyanmar:// / myanmarpart1and2:// lessons
  // SmartStudy completion counts for the selected student (loaded when student+lesson are selected)
  const [ssStudentClassCount, setSsStudentClassCount] = useState(null);   // per-class (e.g. BUDDHA)
  const [ssStudentTotalCount, setSsStudentTotalCount] = useState(null);   // all classes combined
  const [abhiStudentCount, setAbhiStudentCount] = useState(null);
  const [abhiStudentScore, setAbhiStudentScore] = useState(null);
  const [abhiTotalCount,   setAbhiTotalCount]   = useState(null); // total lessons in the abhi class
  const [sendAbhidhammaClassId, setSendAbhidhammaClassId] = useState(''); // class chosen in Send Action for abhidhamma:// lessons
  const [sendDhammaschoolClassId, setSendDhammaschoolClassId] = useState(''); // class chosen in Send Action for dhammaschool:// lessons
  const [dhammaschoolClasses, setDhammaschoolClasses] = useState(null); // null = not yet loaded; [{classId, lessonCount}]
  const [dhammaschoolLoading, setDhammaschoolLoading] = useState(false);
  const [dhammaschoolStudentProgress, setDhammaschoolStudentProgress] = useState(null); // { completedCount:number, totalLessons:number, score:number }
  const [abhidhammaClasses, setAbhidhammaClasses] = useState(null);   // null = not yet loaded
  const [abhidhammaLoading, setAbhidhammaLoading] = useState(false);
  const [sendTargetType, setSendTargetType] = useState('student'); 
  const [selectedGroupId, setSelectedGroupId] = useState(''); 
  const [sendStudentSearch, setSendStudentSearch] = useState(''); 
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false); 
  const [directTrophyAmount, setDirectTrophyAmount] = useState(1);
  const [previouslyEarnedOverride, setPreviouslyEarnedOverride] = useState('');
  const [completedUnitOverride, setCompletedUnitOverride] = useState('');
  const [isSavingCompletedUnit, setIsSavingCompletedUnit] = useState(false);
  const [isSavingPreviouslyEarned, setIsSavingPreviouslyEarned] = useState(false);
  const [isReconcilingAllClasses, setIsReconcilingAllClasses] = useState(false);
  const [wholeAppMaxAvailable, setWholeAppMaxAvailable] = useState(null); // sum of each class's own max-available
  useEffect(() => {
    setPreviouslyEarnedOverride('');
    setCompletedUnitOverride('');
  }, [selectedStudentUid, selectedBankLessonId, sendSmartStudyClassId, sendAbhidhammaClassId, sendDhammaschoolClassId]);

  // When no specific class is chosen, "Max Available" for the whole app must be
  // the SUM of each class's own max-available (floor(classLessons/5) per class)
  // — NOT floor(totalLessonsAcrossAllClasses/5) or a manually-typed number.
  // Flooring per-class first and then summing always gives a number <= flooring
  // the grand total first (each class's remainder gets thrown away separately
  // instead of combined), so using the grand-total floor — or an independently
  // typed "Max Trophies Available" — reliably overstates what the per-class
  // trophy math actually adds up to. This keeps the whole-app number and the
  // sum of individual class numbers always in agreement.
  useEffect(() => {
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!lesson) { setWholeAppMaxAvailable(null); return; }
    if (lesson.link === 'abhidhamma://' && !sendAbhidhammaClassId) {
      (async () => {
        const classes = await loadAbhidhammaClasses();
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + computeClassTrophyMax(c.lessonCount), 0));
      })();
    } else if (lesson.link === 'smartstudy://' && !sendSmartStudyClassId) {
      (async () => {
        const classes = await loadSmartStudyClassList();
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + computeClassTrophyMax(c.lessonCount), 0));
      })();
    } else if (lesson.link === 'dhammaschool://' && !sendDhammaschoolClassId) {
      (async () => {
        const classes = await loadDhammaschoolClasses();
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + computeClassTrophyMax(c.lessonCount), 0));
      })();
    } else {
      setWholeAppMaxAvailable(null);
    }
  }, [selectedBankLessonId, sendAbhidhammaClassId, sendSmartStudyClassId, sendDhammaschoolClassId]);

  const [lastTrophyAward, setLastTrophyAward] = useState(null);
  const undoTimerRef = useRef(null);
  
  const [newGroupName, setNewGroupName] = useState('');
  
  const [scheduleStudentType, setScheduleStudentType] = useState('online'); 
  const [scheduleSelectedStudentUid, setScheduleSelectedStudentUid] = useState('');
  const [scheduleStudentSearch, setScheduleStudentSearch] = useState(''); 
  const [isScheduleDropdownOpen, setIsScheduleDropdownOpen] = useState(false); 
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualDate, setManualDate] = useState(toLocalDateString(new Date()));
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurEndDate, setRecurEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3); 
    return toLocalDateString(d);
  });

  const [showDeleteModal, setShowDeleteModal] = useState({ isOpen: false, id: null, title: '', type: '' });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [editingEntry, setEditingEntry] = useState(null); 
  const [showTrophyResetPrompt, setShowTrophyResetPrompt] = useState(false);
  const [showStarModal, setShowStarModal] = useState(false);
  const [greetingToast, setGreetingToast] = useState(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', confirmColor: 'bg-indigo-600 hover:bg-indigo-700'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileContent, setImportFileContent] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const importFileRef = useRef(null); 
  
  const prevSessionsRef = useRef([]); 
  const hasAutoSelectedSendStudentRef = useRef(false);
  const hasAutoSelectedScheduleStudentRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(teacherConfigDoc, (docSnap) => {
      if (docSnap.exists()) setTeacherConfigData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(studentsCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name)); 
      setStudents(studentList);
      
      const firstActiveStudent = studentList.find(s => s.isActive === true);
      
      if (!hasAutoSelectedSendStudentRef.current && firstActiveStudent) {
        setSelectedStudentUid(firstActiveStudent.id);
        setSendStudentSearch(firstActiveStudent.name); 
        hasAutoSelectedSendStudentRef.current = true;
      }
      if (!hasAutoSelectedScheduleStudentRef.current && firstActiveStudent) {
        setScheduleSelectedStudentUid(firstActiveStudent.id);
        setScheduleStudentSearch(firstActiveStudent.name); 
        hasAutoSelectedScheduleStudentRef.current = true;
      }
    });
    return () => unsubscribe();
  }, [user.uid]);
  
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(lessonBankCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bankList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.title.localeCompare(b.title)); 
      setLessonBank(bankList);
      
      if (!selectedBankLessonId && bankList.length > 0) {
        setSelectedBankLessonId(bankList[0].id);
      }
    }, (error) => {
      console.error("Error fetching lesson bank: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Lessons keep getting added to SmartStudy/Abhidhamma, so a whole-app
  // Lesson Bank entry's "Total Number" and "Max Trophies Available" go stale
  // over time. This silently refreshes both — from live class data, using the
  // same round-based trophy formula everywhere — for any SmartStudy/Abhidhamma
  // entry that hasn't been auto-refreshed in the last 7 days. The teacher can
  // still open the app picker manually any time for an on-demand refresh.
  useEffect(() => {
    if (!lessonBank || lessonBank.length === 0) return;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const staleEntries = lessonBank.filter(l => {
      const isWholeAppEntry = l.link === 'smartstudy://' || l.link === 'abhidhamma://';
      if (!isWholeAppEntry) return false;
      const lastRefreshed = l.lastAutoRefreshedAt?.toMillis ? l.lastAutoRefreshedAt.toMillis() : 0;
      return (now - lastRefreshed) > ONE_WEEK_MS;
    });
    if (staleEntries.length === 0) return;

    (async () => {
      for (const entry of staleEntries) {
        try {
          const classes = entry.link === 'smartstudy://'
            ? await fetchFreshSmartStudyClasses()
            : await fetchFreshAbhidhammaClasses();
          const totalLessons = (classes || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0);
          const totalTrophies = (classes || []).reduce((sum, c) => sum + computeClassTrophyMax(c.lessonCount), 0);
          await updateDoc(doc(db, `${publicDataPath}/lessonBank`, entry.id), {
            unitCount: totalLessons,
            trophyLimit: totalTrophies,
            lastAutoRefreshedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error(`Error auto-refreshing Lesson Bank entry "${entry.title}":`, e);
        }
      }
    })();
  }, [lessonBank]);
  
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(groupsCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.groupName.localeCompare(b.groupName));
      setGroups(groupList);
      
      if (!selectedGroupId && groupList.length > 0) {
        setSelectedGroupId(groupList[0].id);
      }
    }, (error) => {
      console.error("Error fetching groups: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Live "student greeted you" toast — students say Mangalabar when they
  // enter their dashboard; this only reacts to greetings added AFTER the
  // listener attaches (skips the initial snapshot) so opening the teacher
  // dashboard doesn't replay every greeting sent since forever.
  useEffect(() => {
    if (!user?.uid) return;
    let hasLoadedInitial = false;
    // Not scoped by teacherUid — this app's students/lessons collections
    // aren't teacher-scoped either (single-teacher deployment), so greetings
    // follow the same pattern.
    const unsubscribe = onSnapshot(greetingsCollection, (snapshot) => {
      if (!hasLoadedInitial) {
        hasLoadedInitial = true;
        return;
      }
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setGreetingToast({ studentName: data.studentName || 'A student' });
          setTimeout(() => setGreetingToast(null), 5000);
        }
      });
    }, (error) => {
      console.error("Error listening for greetings: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(sessionsCollection); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
      
      const prevCompleted = prevSessionsRef.current.filter(s => s.endTime).length;
      const currentCompleted = sessionList.filter(s => s.endTime).length;

      if (currentCompleted > prevCompleted && prevSessionsRef.current.length > 0) {
        playSound(3); 
      }
      prevSessionsRef.current = sessionList;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(teacherScheduleCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setTeacherSchedule(scheduleList);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (editingLessonId) {
      const lesson = lessonBank.find(l => l.id === editingLessonId);
      if (lesson) {
        setNewBankLessonTitle(lesson.title);
        setNewBankLessonLink(lesson.link);
        setNewBankLessonDetails(lesson.details || ''); 
        setNewBankLessonTrophyLimit(lesson.trophyLimit || 0);
        setNewBankLessonUnitLabel(lesson.unitLabel || 'Chapter');
        setNewBankLessonUnitCount(lesson.unitCount || 0);
      }
    } else {
      setNewBankLessonTitle('');
      setNewBankLessonLink('');
      setNewBankLessonDetails(''); 
      setNewBankLessonTrophyLimit(0);
      setNewBankLessonUnitLabel('Chapter');
      setNewBankLessonUnitCount(0);
    }
  }, [editingLessonId, lessonBank]);

  // --- Smart Study app picker (reads directly from Firestore; only loads
  // the class ID list, and only when the teacher opens the picker, so this
  // never loads all Smart Study lesson content up front). ---
  // Fetch this student's SmartStudy completion counts whenever the
  // student/lesson/class selection changes in Send Action.
  useEffect(() => {
    setSsStudentClassCount(null);
    setSsStudentTotalCount(null);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!lesson?.link?.startsWith('smartstudy://')) return;
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    const sName = student.name;
    const namesToTry = [...new Set([sName, ...Object.values(student.smartStudyNames || {})].filter(Boolean))];
    let isMounted = true;
    (async () => {
      try {
        const distinctClassLesson = new Set(); // all-class total
        const distinctForClass = new Set();    // per-class (selected class)
        for (const name of namesToTry) {
          const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
            where('studentName', '==', name)
          );
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const cId = d.data().classId; const lId = d.data().lessonId;
            if (cId && lId) {
              distinctClassLesson.add(`${cId}-${lId}`);
              if (sendSmartStudyClassId && cId === sendSmartStudyClassId) distinctForClass.add(lId);
            }
          });
        }
        if (isMounted) {
          setSsStudentTotalCount(distinctClassLesson.size);
          if (sendSmartStudyClassId) setSsStudentClassCount(distinctForClass.size);
        }
      } catch (e) {
        console.error('Error fetching SmartStudy student completions:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedStudentUid, selectedBankLessonId, sendSmartStudyClassId, lessonBank, students]);

  // Dhammaschool app — student progress across the whole selected class
  useEffect(() => {
    setDhammaschoolStudentProgress(null);
    if (!sendDhammaschoolClassId || !selectedStudentUid) return;
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    (async () => {
      try {
        // Lessons belonging to this class (classId field on each lesson doc)
        const lessonsSnap = await getDocs(query(
          collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'),
          where('classId', '==', sendDhammaschoolClassId)
        ));
        const classLessonIds = lessonsSnap.docs.map(d => d.id);
        const totalLessons = classLessonIds.length;

        // Dhammaschool app uses its own anonymous Firebase session per device/browser
        // (separate from TutoringApp's studentUid), so completions must be matched
        // by studentName, not by a doc ID built from studentUid.
        const completionsSnap = await getDocs(query(
          collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions'),
          where('studentName', '==', student.name)
        ));
        const completedLessonIds = new Set(completionsSnap.docs.map(d => d.data().lessonId).filter(lid => classLessonIds.includes(lid)));

        let totalScore = 0;
        for (const lid of classLessonIds) {
          try {
            const scoresSnap = await getDocs(query(
              collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
              where('lessonId', '==', lid),
              where('studentName', '==', student.name)
            ));
            let best = 0;
            scoresSnap.docs.forEach(d => { best = Math.max(best, Number(d.data().score) || 0); });
            totalScore += best;
          } catch (e) {}
        }
        setDhammaschoolStudentProgress({ completedCount: completedLessonIds.size, totalLessons, score: totalScore });
      } catch (e) {
        console.error('Dhammaschool progress fetch:', e);
        setDhammaschoolStudentProgress({ completedCount: 0, totalLessons: 0, score: 0 });
      }
    })();
  }, [sendDhammaschoolClassId, selectedStudentUid]);

  // Abhidhamma student progress for Assign Lesson — handles old & new format
  useEffect(()=>{
    setAbhiStudentCount(null);setAbhiStudentScore(null);setAbhiTotalCount(null);
    if(!sendAbhidhammaClassId)return;
    // Load total lesson count for the class
    getDocs(collection(db,'artifacts','lesson-translator-app-v6','public','data','classes',sendAbhidhammaClassId,'lessons'))
      .then(snap=>setAbhiTotalCount(snap.size)).catch(()=>setAbhiTotalCount(0));
    if(!selectedStudentUid)return;
    const student=students.find(s=>s.id===selectedStudentUid);if(!student)return;
    const allNames=[...new Set([student.name,...(Object.values(student?.abhidhammaNames||{}))].filter(Boolean))];
    (async()=>{
      let pts=0;const done=new Set();
      const ABHI_COL=collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
      for(const nm of allNames){
        try{
          const [s1,s2]=await Promise.all([getDocs(query(ABHI_COL,where('name','==',nm))),getDocs(query(ABHI_COL,where('studentName','==',nm)))]);
          [...s1.docs,...s2.docs].forEach(d=>{const dt=d.data();if(dt.classId&&dt.classId!==sendAbhidhammaClassId)return;pts+=(Number(dt.score)||0);if(dt.lessonId)done.add(dt.lessonId);});
        }catch(e){}
      }
      setAbhiStudentScore(pts);setAbhiStudentCount(done.size);
    })();
  },[sendAbhidhammaClassId,selectedStudentUid]);

  const loadDhammaschoolClasses = async () => {
    if (dhammaschoolClasses !== null) return dhammaschoolClasses;
    setDhammaschoolLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'));
      const counts = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.isPublic) return; // only count lessons the teacher made public
        const cid = (data.classId && data.classId.trim()) ? data.classId.trim() : 'GENERAL';
        counts[cid] = (counts[cid] || 0) + 1;
      });
      const list = Object.entries(counts)
        .map(([classId, lessonCount]) => ({ classId, lessonCount }))
        .sort((a, b) => a.classId.localeCompare(b.classId));
      setDhammaschoolClasses(list);
      setDhammaschoolLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Dhammaschool classes:', err);
      setDhammaschoolClasses([]);
      setDhammaschoolLoading(false);
      return [];
    }
  };

  const loadAbhidhammaClasses = async () => {
    if (abhidhammaClasses !== null) return abhidhammaClasses;
    setAbhidhammaLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes'));
      const list = await Promise.all(snap.docs.map(async d => {
        let lessonCount = 0;
        try {
          const lessonsSnap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes', d.id, 'lessons'));
          lessonCount = lessonsSnap.size;
        } catch (e) {}
        return { classId: d.id, displayName: d.data().displayName || d.id, lessonCount };
      }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setAbhidhammaClasses(list);
      setAbhidhammaLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Abhidhamma classes:', err);
      setAbhidhammaClasses([]);
      setAbhidhammaLoading(false);
      return [];
    }
  };

  const loadSmartStudyClassList = async () => {
    if (smartStudyClasses !== null) return smartStudyClasses; // already loaded/cached
    setPickerLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
      const list = snap.docs.map(d => ({ classId: d.id, lessonCount: (d.data().lessons || []).length }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setSmartStudyClasses(list);
      setPickerLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Smart Study classes:', err);
      setSmartStudyClasses([]);
      setPickerLoading(false);
      return [];
    }
  };

  // Always-fresh variants (skip the state cache above) — used only by the
  // weekly Lesson Bank auto-refresh, so a stale in-memory cache from earlier
  // in the session can never cause it to "refresh" with old numbers.
  const fetchFreshAbhidhammaClasses = async () => {
    const snap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes'));
    return Promise.all(snap.docs.map(async d => {
      let lessonCount = 0;
      try {
        const lessonsSnap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes', d.id, 'lessons'));
        lessonCount = lessonsSnap.size;
      } catch (e) {}
      return { classId: d.id, lessonCount };
    }));
  };
  const fetchFreshSmartStudyClasses = async () => {
    const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
    return snap.docs.map(d => ({ classId: d.id, lessonCount: (d.data().lessons || []).length }));
  };

  const handleSaveLessonToBank = async (e) => {
    e.preventDefault();
    if (!newBankLessonTitle || !newBankLessonLink) return;
    
    const lessonData = {
      teacherUid: user.uid,
      title: newBankLessonTitle,
      link: newBankLessonLink,
      details: newBankLessonDetails, 
      trophyLimit: parseInt(newBankLessonTrophyLimit) || 0,
      unitLabel: newBankLessonUnitLabel || 'Chapter',
      unitCount: parseInt(newBankLessonUnitCount) || 0
    };
    try {
      if (editingLessonId) {
        const lessonDoc = doc(db, `${publicDataPath}/lessonBank`, editingLessonId);
        try {
          await updateDoc(lessonDoc, lessonData);
        } catch (updateError) {
          // The lesson being edited was deleted (by this teacher or another
          // session) before the edit was saved -- re-create it instead of
          // silently losing the edit.
          await addDoc(lessonBankCollection, { ...lessonData, createdAt: serverTimestamp() });
        }
        setEditingLessonId(null);
      } else {
        await addDoc(lessonBankCollection, {
          ...lessonData,
          createdAt: serverTimestamp()
        });
      }
      setNewBankLessonTitle('');
      setNewBankLessonLink('');
      setNewBankLessonDetails('');
      setNewBankLessonTrophyLimit(0);
      setNewBankLessonUnitLabel('Chapter');
      setNewBankLessonUnitCount(0);
    } catch (error) {
      console.error("Error saving lesson to bank:", error);
    }
  };

  const handleSendLesson = async (e) => {
    e.preventDefault();
    const lessonToSend = lessonBank.find(l => l.id === selectedBankLessonId);
    // Use the class chosen right here in Assign Lesson (not anything baked into
    // the bank entry) to compute the correct lesson count / trophy target —
    // this is what lets one bank entry be sent to any class, with the right
    // numbers every time, for all three linked apps.
    const ssSelectedClass = (sendSmartStudyClassId && smartStudyClasses)
      ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
      : null;
    const classLessonCountForSend = (() => {
      if (lessonToSend?.link === 'smartstudy://' && ssSelectedClass) return ssSelectedClass.lessonCount || 0;
      if (lessonToSend?.link === 'abhidhamma://' && sendAbhidhammaClassId && abhiTotalCount != null) return abhiTotalCount;
      if (lessonToSend?.link === 'dhammaschool://' && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null) return dhammaschoolStudentProgress.totalLessons;
      return null;
    })();
    const effectiveLessonUnitCount = classLessonCountForSend != null ? classLessonCountForSend : (lessonToSend?.unitCount || 0);
    const effectiveLessonTrophyLimit = classLessonCountForSend != null ? computeClassTrophyMax(classLessonCountForSend) : (lessonToSend?.trophyLimit || 0);
    // For lessons stored without a classId, substitute the one chosen here in
    // the Send Action class picker.
    const effectiveLessonLink = (() => {
      if (!lessonToSend?.link) return '';
      if (lessonToSend.link === 'smartstudy://' && sendSmartStudyClassId) return `smartstudy://${sendSmartStudyClassId}`;
      if (lessonToSend.link === 'abhidhamma://' && sendAbhidhammaClassId) return `abhidhamma://${sendAbhidhammaClassId}`;
      if (lessonToSend.link === 'dhammaschool://' && sendDhammaschoolClassId) return `dhammaschool://${sendDhammaschoolClassId}`;
      if (GROUP_PARTS_BY_SCHEME[lessonToSend.link] && sendGroupPartKey) return `${lessonToSend.link}${sendGroupPartKey}`;
      return lessonToSend.link;
    })();

    if (!lessonToSend) return;

    // Only replaces a PREVIOUS assignment of the exact same class/link, not
    // every past lesson with this title -- Smart Study/Abhidhamma/
    // Dhammaschool assign one class at a time under the same bank title, so
    // matching on title alone would delete (and hide from Available
    // Lessons) a still-relevant earlier class the moment a different one is
    // sent. The student's per-class trophy/completed progress lives on
    // their own profile doc either way and was never affected by this.
    const deleteExistingLessons = async (sUid, title, link) => {
      const q = query(lessonsCollection, where("studentUid", "==", sUid), where("title", "==", title), where("link", "==", link));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    };

    if (sendTargetType === 'group') {
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group || group.studentUids.length === 0) return;
      
      const targetStudents = students.filter(s => group.studentUids.includes(s.id));
      const studentNames = targetStudents.map(s => s.name).join(', ');

      const executeSend = async () => {
        try {
          for (const studentUid of group.studentUids) {
            await deleteExistingLessons(studentUid, lessonToSend.title, effectiveLessonLink);
            await addDoc(lessonsCollection, {
              studentUid: studentUid,
              teacherUid: user.uid,
              title: lessonToSend.title,
              link: effectiveLessonLink,
              details: lessonToSend.details,
              trophyLimit: effectiveLessonTrophyLimit,
              unitLabel: lessonToSend.unitLabel || 'Chapter',
              unitCount: effectiveLessonUnitCount,
              status: 'pending',
              sentAt: serverTimestamp()
            });
          }
          playSound(2);
        } catch (error) {
          console.error("Error sending lesson to group:", error);
        }
      };
      
      setShowConfirmModal({
        isOpen: true,
        title: 'Send to Group',
        message: `Are you sure you want to assign "${lessonToSend.title}" to "${group.groupName}" (${targetStudents.length} students)?\n(${studentNames})\n\nNote: If they already have this lesson, the old one will be replaced.`,
        onConfirm: () => {
          executeSend();
          setShowConfirmModal({ isOpen: false });
        },
        confirmText: 'Send',
        confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
      });
      
    } else {
      const student = students.find(s => s.id === selectedStudentUid);
      if (!selectedStudentUid || !student) return;
      
      const executeSend = async () => {
        try {
          await deleteExistingLessons(selectedStudentUid, lessonToSend.title, effectiveLessonLink);
          await addDoc(lessonsCollection, {
            studentUid: selectedStudentUid,
            teacherUid: user.uid,
            title: lessonToSend.title,
            link: effectiveLessonLink,
            details: lessonToSend.details,
            trophyLimit: effectiveLessonTrophyLimit,
            unitLabel: lessonToSend.unitLabel || 'Chapter',
            unitCount: effectiveLessonUnitCount,
            status: 'pending',
            sentAt: serverTimestamp()
          });
          playSound(2);
        } catch (error) {
          console.error("Error sending lesson:", error);
        }
      };
      
      setShowConfirmModal({
        isOpen: true,
        title: 'Assign Lesson',
        message: `Are you sure you want to assign "${lessonToSend.title}" to ${student.name}?\n\nNote: If they already have this lesson, the old one will be replaced.`,
        onConfirm: () => {
          executeSend();
          setShowConfirmModal({ isOpen: false });
        },
        confirmText: 'Send',
        confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
      });
    }
  };

  // Substitutes the class chosen in Send Action into a bare bank-entry link
  // (e.g. 'abhidhamma://' -> 'abhidhamma://BEING_GOOD_AND_BEING_KIND'), matching
  // what handleSendLesson actually sends to the student.
  const getEffectiveLinkForSend = (lesson) => {
    if (!lesson?.link) return '';
    if (lesson.link === 'smartstudy://' && sendSmartStudyClassId) return `smartstudy://${sendSmartStudyClassId}`;
    if (lesson.link === 'abhidhamma://' && sendAbhidhammaClassId) return `abhidhamma://${sendAbhidhammaClassId}`;
    if (lesson.link === 'dhammaschool://' && sendDhammaschoolClassId) return `dhammaschool://${sendDhammaschoolClassId}`;
    if (GROUP_PARTS_BY_SCHEME[lesson.link] && sendGroupPartKey) return `${lesson.link}${sendGroupPartKey}`;
    return lesson.link;
  };

  // Single source of truth for "how many trophies can this lesson give, and
  // under what key are they tracked" — used identically by the Trophy Status
  // display and the actual award function, so they can never disagree.
  const getClassSpecificTrophyInfo = (lesson) => {
    if (!lesson) return { maxAvailable: 0, unitCount: 0, lessonKey: '', classId: null };
    const effectiveLink = getEffectiveLinkForSend(lesson);
    const classId = extractClassIdFromLink(effectiveLink);

    let lessonCount = null;
    if (lesson.link === 'smartstudy://' && sendSmartStudyClassId && smartStudyClasses) {
      const c = (smartStudyClasses || []).find(cl => cl.classId === sendSmartStudyClassId);
      lessonCount = c ? c.lessonCount : null;
    } else if (lesson.link?.startsWith('abhidhamma://') && sendAbhidhammaClassId && abhiTotalCount != null) {
      lessonCount = abhiTotalCount;
    } else if (lesson.link?.startsWith('dhammaschool://') && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null) {
      lessonCount = dhammaschoolStudentProgress.totalLessons;
    }

    const isLinkedApp = lesson.link === 'smartstudy://' || lesson.link?.startsWith('abhidhamma://') || lesson.link?.startsWith('dhammaschool://');
    const maxAvailable = lessonCount != null
      ? computeClassTrophyMax(lessonCount)
      : (isLinkedApp && wholeAppMaxAvailable != null ? wholeAppMaxAvailable : (lesson.trophyLimit || 0));
    const unitCount = lessonCount != null ? lessonCount : (lesson.unitCount || 0);
    const lessonKey = computeLessonKey(lesson.title, effectiveLink);
    return { maxAvailable, unitCount, lessonKey, classId };
  };

  // Lets the teacher directly SET the correct "Previously Earned" baseline for
  // a specific class — a one-time reconciliation tool. Old trophy totals were
  // accumulated under a shared title-only key across every class ever sent
  // under that Lesson Bank entry, so they can't be automatically split back
  // out per class (trophies were awarded in manual batches, not 1-per-lesson,
  // so completed-lesson count alone can't reverse-engineer the true number).
  // The teacher can see "Student Progress" (real completed-lesson count) right
  // above this to help them judge the right number from memory/records, enter
  // it once here, and going forward the app tracks that class correctly on
  // its own — this does NOT add new trophies, it only corrects the stored
  // starting point so "Remaining to Award" is accurate and nothing gets
  // double-awarded.
  const handleSetPreviouslyEarned = async (lessonKey, maxAvailable) => {
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    const newValue = parseInt(previouslyEarnedOverride);
    if (isNaN(newValue) || newValue < 0) {
      alert('Please enter a valid number (0 or more).');
      return;
    }
    if (newValue > maxAvailable) {
      alert(`Can't be more than Max Available (${maxAvailable}).`);
      return;
    }
    setIsSavingPreviouslyEarned(true);
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, student.id), {
        [`earnedTrophies.${lessonKey}`]: newValue
      });
      setPreviouslyEarnedOverride('');
    } catch (err) {
      console.error('Error setting Previously Earned:', err);
      alert('Error saving. Please try again.');
    }
    setIsSavingPreviouslyEarned(false);
  };

  // Same idea as handleSetPreviouslyEarned, but for completedUnits — some
  // lessons (Myanmar Reader in particular) have no live class API to pull
  // the real progress number from, so completedUnits[lessonKey] is just
  // whatever was last stored, and can go stale (e.g. Sheet A/Sheet B used to
  // get double-counted as separate chapters before that was fixed).
  const handleSetCompletedUnit = async (lessonKey) => {
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    const newValue = parseInt(completedUnitOverride);
    if (isNaN(newValue) || newValue < 0) {
      alert('Please enter a valid number (0 or more).');
      return;
    }
    setIsSavingCompletedUnit(true);
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, student.id), {
        [`completedUnits.${lessonKey}`]: newValue
      });
      setCompletedUnitOverride('');
    } catch (err) {
      console.error('Error setting Completed Unit:', err);
      alert('Error saving. Please try again.');
    }
    setIsSavingCompletedUnit(false);
  };

  // One-click bulk reconciliation: for a student who has fully finished a
  // class (every lesson done, "all completed" in Abhidhamma), it's safe to
  // assume the teacher already gave that class's trophies in full — so this
  // sets Previously Earned = Max Available for every FULLY-completed class in
  // one pass, without touching classes that are only partially done (those
  // still need a manual look, since partial trophy history can't be
  // reconstructed automatically — see handleSetPreviouslyEarned).
  const handleReconcileAllAbhidhammaClasses = async () => {
    const student = students.find(s => s.id === selectedStudentUid);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!student || !lesson) return;
    setIsReconcilingAllClasses(true);
    try {
      const classes = await loadAbhidhammaClasses();
      const allNames = [...new Set([student.name, ...(Object.values(student?.abhidhammaNames || {}))].filter(Boolean))];
      const ABHI_COL = collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'global_scores');

      const updates = {};
      const confirmedClassIds = [];
      const skippedClassIds = [];

      for (const c of (classes || [])) {
        const totalLessons = c.lessonCount || 0;
        if (totalLessons === 0) continue;

        const done = new Set();
        for (const nm of allNames) {
          try {
            const [s1, s2] = await Promise.all([
              getDocs(query(ABHI_COL, where('name', '==', nm))),
              getDocs(query(ABHI_COL, where('studentName', '==', nm)))
            ]);
            [...s1.docs, ...s2.docs].forEach(d => {
              const dt = d.data();
              if (dt.classId && dt.classId !== c.classId) return;
              if (dt.lessonId) done.add(dt.lessonId);
            });
          } catch (e) {}
        }

        if (done.size >= totalLessons) {
          const classMax = computeClassTrophyMax(totalLessons);
          const classKey = computeLessonKey(lesson.title, `abhidhamma://${c.classId}`);
          updates[`earnedTrophies.${classKey}`] = classMax;
          confirmedClassIds.push(c.classId);
        } else {
          skippedClassIds.push(c.classId);
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, `${publicDataPath}/students`, student.id), updates);
      }

      alert(
        `Confirmed trophies for ${confirmedClassIds.length} fully-completed class(es):\n${confirmedClassIds.join(', ') || '(none)'}\n\n` +
        `Skipped ${skippedClassIds.length} not-yet-fully-completed class(es) — check those manually:\n${skippedClassIds.join(', ') || '(none)'}`
      );
    } catch (err) {
      console.error('Error reconciling all classes:', err);
      alert('Error reconciling. Please try again.');
    }
    setIsReconcilingAllClasses(false);
  };

  const handleAwardDirectTrophies = async (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentUid);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);

    if (!student || !lesson) return;

    const { maxAvailable, lessonKey } = getClassSpecificTrophyInfo(lesson);
    const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
    const remaining = Math.max(0, maxAvailable - previouslyEarned);

    const amountToAward = parseInt(directTrophyAmount);

    if (isNaN(amountToAward) || amountToAward <= 0 || amountToAward > remaining) {
        alert("Invalid trophy amount.");
        return;
    }

    const executeAward = async () => {
        try {
            const studentDocRef = doc(db, `${publicDataPath}/students`, student.id);
            const newTotalEarned = previouslyEarned + amountToAward;
            const prevCompletedUnit = student.completedUnits?.[lessonKey] || 0;
            const unitCount = getClassSpecificTrophyInfo(lesson).unitCount;
            let newCompletedUnit = prevCompletedUnit;

            const updateData = {
                trophyCount: increment(amountToAward),
                justEarnedTrophy: true
            };
            updateData[`earnedTrophies.${lessonKey}`] = increment(amountToAward);

            if (unitCount > 0 && maxAvailable > 0) {
                newCompletedUnit = Math.min(unitCount, Math.ceil((newTotalEarned * unitCount) / maxAvailable));
                if (newCompletedUnit > prevCompletedUnit) {
                    updateData[`completedUnits.${lessonKey}`] = newCompletedUnit;
                }
            }

            await updateDoc(studentDocRef, updateData);

            const expires = new Date();
            expires.setDate(expires.getDate() + 1);
            const newTotal = (student.trophyCount || 0) + amountToAward;

            const announcementRef = await addDoc(announcementsCollection, {
                studentName: student.name,
                trophyCount: newTotal,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expires),
                id: getUUID()
            });

            playSound(2); 
            alert(`Successfully awarded ${amountToAward} trophies to ${student.name}.`);
            setDirectTrophyAmount(1);

            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            setLastTrophyAward({
                studentId: student.id,
                studentName: student.name,
                amount: amountToAward,
                lessonKey: lessonKey,
                announcementId: announcementRef.id,
                prevCompletedUnit: prevCompletedUnit,
                unitChanged: newCompletedUnit > prevCompletedUnit
            });
            undoTimerRef.current = setTimeout(() => {
                setLastTrophyAward(null);
            }, 30000);
        } catch (err) {
            console.error("Error awarding direct trophies", err);
        }
    };

    setShowConfirmModal({
      isOpen: true,
      title: 'Award Trophies Directly',
      message: `Are you sure you want to directly award ${amountToAward} ${amountToAward > 1 ? 'trophies' : 'trophy'} to ${student.name} for the lesson "${lesson.title}"?`,
      onConfirm: () => {
        executeAward();
        setShowConfirmModal({ isOpen: false });
      },
      confirmText: 'Award',
      confirmColor: 'bg-yellow-500 hover:bg-yellow-600'
    });
  };
const handleUndoTrophyAward = async () => {
    if (!lastTrophyAward) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, lastTrophyAward.studentId);
      const updateData = {
        trophyCount: increment(-lastTrophyAward.amount)
      };
      updateData[`earnedTrophies.${lastTrophyAward.lessonKey}`] = increment(-lastTrophyAward.amount);
      if (lastTrophyAward.unitChanged) {
        updateData[`completedUnits.${lastTrophyAward.lessonKey}`] = lastTrophyAward.prevCompletedUnit;
      }
      await updateDoc(studentDocRef, updateData);

      if (lastTrophyAward.announcementId) {
        await deleteDoc(doc(db, `${publicDataPath}/announcements`, lastTrophyAward.announcementId));
      }

      alert(`Successfully undid the award of ${lastTrophyAward.amount} trophy(s) for ${lastTrophyAward.studentName}.`);
    } catch (e) {
      console.error("Error undoing trophy award:", e);
    }
    setLastTrophyAward(null);
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (sendActionType === 'lesson') {
        handleSendLesson(e);
    } else {
        handleAwardDirectTrophies(e);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    
    let studentUid = null;
    let studentName = '';
    
    if (scheduleStudentType === 'online') {
      if (!scheduleSelectedStudentUid) return;
      studentUid = scheduleSelectedStudentUid;
      studentName = students.find(s => s.id === studentUid)?.name || 'Unknown Student';
    } else {
      if (!manualStudentName) return;
      studentUid = 'offline'; 
      studentName = manualStudentName;
    }

    if (!manualDate || !manualStartTime || !manualEndTime) return;
    
    const executeAdd = async () => {
      const [startHour, startMinute] = manualStartTime.split(':').map(Number);
      const [endHour, endMinute] = manualEndTime.split(':').map(Number);

      try {
        const [year, month, day] = manualDate.split('-').map(Number);
        const baseStartDate = new Date(year, month - 1, day, startHour, startMinute);
        const baseEndDate = new Date(year, month - 1, day, endHour, endMinute);
      
        if (isRecurring) {
          if (!recurEndDate) return;
          const [endYear, endMonth, endDay] = recurEndDate.split('-').map(Number);
          const finalEntryDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59);
          
          const recurrenceId = getUUID(); 
          let currentLoopDate = new Date(baseStartDate.getTime());
          
          while (currentLoopDate <= finalEntryDate) {
            const currentStartTime = new Date(currentLoopDate.getTime());
            currentStartTime.setHours(startHour, startMinute);
            
            const currentEndTime = new Date(currentLoopDate.getTime());
            currentEndTime.setHours(endHour, endMinute);
            
            await addDoc(teacherScheduleCollection, {
              teacherUid: user.uid,
              studentUid: studentUid,
              studentName: studentName,
              startTime: Timestamp.fromDate(currentStartTime),
              endTime: Timestamp.fromDate(currentEndTime),
              isRecurring: true,
              recurrenceId: recurrenceId,
              overrideStatus: null 
            });
            currentLoopDate.setDate(currentLoopDate.getDate() + 7);
          }
        } else {
          await addDoc(teacherScheduleCollection, {
            teacherUid: user.uid,
            studentUid: studentUid,
            studentName: studentName,
            startTime: Timestamp.fromDate(baseStartDate),
            endTime: Timestamp.fromDate(baseEndDate),
            isRecurring: false,
            recurrenceId: null,
            overrideStatus: null 
          });
        }
        setManualStudentName('');
      } catch (error) {
        console.error("Error adding to schedule:", error);
      }
    };

    setShowConfirmModal({
      isOpen: true,
      title: 'Add Schedule Entry',
      message: `Are you sure you want to add this schedule entry for ${studentName}?`,
      onConfirm: () => {
        executeAdd();
        setShowConfirmModal({ isOpen: false }); 
      },
      confirmText: 'Add',
      confirmColor: 'bg-emerald-500 hover:bg-emerald-600'
    });
  };

const handleSendStarAnnouncement = async (studentUid, durationWeeks, message) => {
    const student = students.find(s => s.id === studentUid);
    if (!student) return;
    const expires = new Date();
    expires.setDate(expires.getDate() + (durationWeeks * 7));
    try {
      await addDoc(starAnnouncementsCollection, {
        studentUid: studentUid,
        studentName: student.name,
        message: message,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expires)
      });
      setShowStarModal(false);
    } catch (e) {
      console.error("Error sending star announcement:", e);
    }
  };
  const handleToggleStudentActive = async (studentId, currentStatus) => {
    const studentDoc = doc(db, `${publicDataPath}/students`, studentId);
    try {
      await updateDoc(studentDoc, {
        isActive: !currentStatus 
      });
    } catch (error) {
      console.error("Error changing student status:", error);
    }
  };

  const handleApproveNameChange = async (studentId, newName) => {
    if (!newName || !newName.trim()) return;
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentId), {
        name: newName.trim(),
        pendingName: null
      });
    } catch (error) {
      console.error("Error approving name change:", error);
    }
  };

  const handleRejectNameChange = async (studentId) => {
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentId), { pendingName: null });
    } catch (error) {
      console.error("Error rejecting name change:", error);
    }
  };

  const handleApproveStudent = async (studentId) => {
    const studentDocRef = doc(db, `${publicDataPath}/students`, studentId); 
    try {
      const studentDoc = await getDoc(studentDocRef);
      const studentData = studentDoc.data();
      
      const dataToUpdate = { isActive: true };
      if (studentData.dailySubmissionCount === undefined) dataToUpdate.dailySubmissionCount = 0;
      if (studentData.lastSubmissionDate === undefined) dataToUpdate.lastSubmissionDate = null;
      if (studentData.completedCount === undefined) dataToUpdate.completedCount = 0;
      if (studentData.trophyCount === undefined) dataToUpdate.trophyCount = 0;
      if (studentData.earnedTrophies === undefined) dataToUpdate.earnedTrophies = {};
      
      await updateDoc(studentDocRef, dataToUpdate);

      // The "Parami" group runs large enough that the teacher can't manually
      // re-send every lesson to each new joiner during class — so accepting
      // here also auto-forwards whatever was sent to the group in the last
      // 24 hours, instead of leaving the new student with no lesson at all.
      const paramiGroup = groups.find(g => (g.groupName || '').trim().toLowerCase() === 'parami');
      if (paramiGroup) {
        setShowConfirmModal({
          isOpen: true,
          title: 'Add to Parami Group?',
          message: `Add ${studentData?.name || 'this student'} to the "Parami" group?\n\nIf a lesson was sent to Parami in the last 24 hours, it will be sent to them too.`,
          onConfirm: async () => {
            setShowConfirmModal({ isOpen: false });
            try {
              await handleToggleStudentInGroup(paramiGroup.id, studentId, true);

              const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
              const memberUids = (paramiGroup.studentUids || []).filter(uid => uid !== studentId);
              let recentLesson = null;
              for (let i = 0; i < memberUids.length; i += 30) {
                const chunk = memberUids.slice(i, i + 30);
                if (chunk.length === 0) continue;
                const q = query(lessonsCollection, where('studentUid', 'in', chunk), where('sentAt', '>=', cutoff));
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                  const lessonData = d.data();
                  if (!lessonData.sentAt) return;
                  if (!recentLesson || lessonData.sentAt.toMillis() > recentLesson.sentAt.toMillis()) {
                    recentLesson = lessonData;
                  }
                });
              }

              if (recentLesson) {
                await addDoc(lessonsCollection, {
                  studentUid: studentId,
                  teacherUid: recentLesson.teacherUid,
                  title: recentLesson.title,
                  link: recentLesson.link,
                  details: recentLesson.details,
                  trophyLimit: recentLesson.trophyLimit,
                  unitLabel: recentLesson.unitLabel || 'Chapter',
                  unitCount: recentLesson.unitCount,
                  status: 'pending',
                  sentAt: serverTimestamp()
                });
              }
            } catch (e) {
              console.error('Error adding approved student to Parami group:', e);
            }
          },
          confirmText: 'Add',
          confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
        });
      }
    } catch (error) {
      console.error("Error approving student:", error);
    }
  };

  const handleApproveTrophy = async (studentId, studentName, amount = 1, lessonTitle = null, sessionId = null, lessonLink = null) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      
      const updateData = {
        trophyRequested: false,
        trophyCount: increment(amount),
        justEarnedTrophy: true,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophyLessonLink: null,
        requestedTrophySessionId: null
      };
      
      if (lessonTitle) {
        updateData[`earnedTrophies.${computeLessonKey(lessonTitle, lessonLink)}`] = increment(amount);
      }
      
      await updateDoc(studentDocRef, updateData);
      
      if (sessionId) {
        const sessionRef = doc(db, `${publicDataPath}/studySessions`, sessionId);
        try {
          await updateDoc(sessionRef, { awardedTrophies: increment(amount) });
        } catch(e) {
          console.error("Error updating session trophies:", e);
        }
      }

      const expires = new Date();
      expires.setDate(expires.getDate() + 1); 
      const studentDoc = await getDoc(studentDocRef);
      const newTotal = studentDoc.data().trophyCount || 1;
      
      await addDoc(announcementsCollection, { 
        studentName: studentName, trophyCount: newTotal, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(expires), id: getUUID() 
      });
      
    } catch (error) {
      console.error("Error approving trophy:", error);
    }
  };

  const handleRejectTrophy = async (studentId, sessionId, lessonTitle, lessonLink = null) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      const updateData = {
        trophyRequested: false,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophyLessonLink: null,
        requestedTrophySessionId: null
      };

      if (sessionId && lessonTitle) {
        const sessionDoc = await getDoc(doc(db, `${publicDataPath}/studySessions`, sessionId));
        if (sessionDoc.exists()) {
          const previousCompletedUnit = sessionDoc.data().previousCompletedUnit || 0;
          updateData[`completedUnits.${computeLessonKey(lessonTitle, lessonLink)}`] = previousCompletedUnit;
        }
      }

      await updateDoc(studentDocRef, updateData);
    } catch (error) {
      console.error("Error rejecting trophy:", error);
    }
  };

  const handleResetAllTrophies = async () => {
    try {
        const batch = writeBatch(db);
        students.forEach(student => {
            const sRef = doc(db, `${publicDataPath}/students`, student.id);
            batch.update(sRef, {
                trophyCount: 0,
                earnedTrophies: {},
                trophyRequested: false,
                requestedTrophyAmount: 0
            });
        });
        const configRef = doc(db, `${publicDataPath}/config`, 'teacher');
        batch.set(configRef, { hasDeclinedTrophyReset: true }, { merge: true });
        
        await batch.commit();
        setShowTrophyResetPrompt(false);
        alert("All legacy trophies have been successfully reset.");
    } catch(e) {
        console.error("Error resetting trophies", e);
    }
  };

  const handleDeclineTrophyReset = async () => {
    try {
        const configRef = doc(db, `${publicDataPath}/config`, 'teacher');
        await setDoc(configRef, { hasDeclinedTrophyReset: true }, { merge: true });
        setShowTrophyResetPrompt(false);
    } catch(e) {
        console.error("Error updating config", e);
    }
  };
  
  const openDeleteModal = (id, title, type) => {
    let message = `Are you sure you want to delete "${title}"? This cannot be undone.`;
    if (type === 'student') {
      message = `Are you sure you want to permanently delete the student "${title}"? This action cannot be undone.`;
    }
    
    setShowDeleteModal({ 
      isOpen: true, id: id, title: title, type: type, message: message
    });
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal({ isOpen: false, id: null, title: '', type: '' });
  };
  
  const handleDeleteItem = async () => {
    const { id, type } = showDeleteModal;
    if (!id || !type) return;
    
    let docRef;
    if (type === 'lessonBank') docRef = doc(db, `${publicDataPath}/lessonBank`, id);
    else if (type === 'teacherSchedule') docRef = doc(db, `${publicDataPath}/teacherSchedule`, id);
    else if (type === 'student') docRef = doc(db, `${publicDataPath}/students`, id);
    else if (type === 'group') docRef = doc(db, `${publicDataPath}/studentGroups`, id);
    else return;
    
    try {
      await deleteDoc(docRef);
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  const handleLessonDragStart = (lesson) => {
    draggedLessonIdRef.current = lesson.id;
    setMergeSourceId(lesson.id);
    setMergeSourceTitle(lesson.title);
  };

  const handleLessonDragEnd = () => {
    draggedLessonIdRef.current = null;
    if (!mergeTargetId) {
      setMergeSourceId(null);
      setMergeSourceTitle('');
    }
  };

  const handleLessonDrop = (targetLesson) => {
    const sourceId = draggedLessonIdRef.current;
    if (!sourceId || sourceId === targetLesson.id) return;
    const sourceLesson = lessonBank.find(l => l.id === sourceId);
    if (sourceLesson && sourceLesson.link === targetLesson.link) {
      setMergeTargetId(targetLesson.id);
      setMergeTargetTitle(targetLesson.title);
      setMergeNewTitle(`${sourceLesson.title} / ${targetLesson.title}`);
    } else {
      alert("These two lessons have different links and cannot be merged.");
      setMergeSourceId(null);
      setMergeSourceTitle('');
    }
  };
  
  const cancelMerge = () => {
    setMergeSourceId(null);
    setMergeTargetId(null);
    setMergeSourceTitle('');
    setMergeTargetTitle('');
    setMergeNewTitle('');
  };
  
  const executeMergeLessons = async () => {
    if (!mergeSourceId || !mergeTargetId || !mergeNewTitle.trim()) return;
    const lessonA = lessonBank.find(l => l.id === mergeSourceId);
    const lessonB = lessonBank.find(l => l.id === mergeTargetId);
    if (!lessonA || !lessonB) return;
    
    setIsMerging(true);
    try {
      const newTitle = mergeNewTitle.trim();
      const keyA = sanitizeKey(lessonA.title);
      const keyB = sanitizeKey(lessonB.title);
      const newKey = sanitizeKey(newTitle);
      const newTrophyLimit = (parseInt(lessonA.trophyLimit) || 0) + (parseInt(lessonB.trophyLimit) || 0);
      const newUnitCount = (parseInt(lessonA.unitCount) || 0) + (parseInt(lessonB.unitCount) || 0);
      
      const studentsSnap = await getDocs(studentsCollection);
      const batch = writeBatch(db);
      
      studentsSnap.docs.forEach(studentDoc => {
        const data = studentDoc.data();
        const earned = data.earnedTrophies || {};
        const completed = data.completedUnits || {};
        
        const earnedA = earned[keyA] || 0;
        const earnedB = earned[keyB] || 0;
        const completedA = completed[keyA] || 0;
        const completedB = completed[keyB] || 0;
        
        if (earnedA === 0 && earnedB === 0 && completedA === 0 && completedB === 0) return; 
        
        const update = {};
        if (keyA !== newKey) update[`earnedTrophies.${keyA}`] = deleteField();
        if (keyB !== newKey) update[`earnedTrophies.${keyB}`] = deleteField();
        update[`earnedTrophies.${newKey}`] = earnedA + earnedB;
        
        if (keyA !== newKey) update[`completedUnits.${keyA}`] = deleteField();
        if (keyB !== newKey) update[`completedUnits.${keyB}`] = deleteField();
        update[`completedUnits.${newKey}`] = completedA + completedB;
        
        batch.update(studentDoc.ref, update);
      });
      
      const lessonADocRef = doc(db, `${publicDataPath}/lessonBank`, lessonA.id);
      batch.update(lessonADocRef, {
        title: newTitle,
        trophyLimit: newTrophyLimit,
        unitCount: newUnitCount
      });
      
      const lessonBDocRef = doc(db, `${publicDataPath}/lessonBank`, lessonB.id);
      batch.delete(lessonBDocRef);
      
      await batch.commit();
      alert(`Successfully merged into "${newTitle}".`);
      cancelMerge();
    } catch (error) {
      console.error("Error merging lessons:", error);
      alert("An error occurred while merging.");
    }
    setIsMerging(false);
  };
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await addDoc(groupsCollection, {
        teacherUid: user.uid, groupName: name, studentUids: [], createdAt: serverTimestamp()
      });
      setNewGroupName(''); 
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };
  
  const handleToggleStudentInGroup = async (groupId, studentId, isChecked) => {
    try {
      const groupDocRef = doc(db, `${publicDataPath}/studentGroups`, groupId);
      const groupDocSnap = await getDoc(groupDocRef);
      if (!groupDocSnap.exists()) return;
      
      const currentUids = groupDocSnap.data().studentUids || [];
      let updatedUids = [];
      
      if (isChecked) {
        if (!currentUids.includes(studentId)) updatedUids = [...currentUids, studentId];
        else updatedUids = currentUids; 
      } else {
        updatedUids = currentUids.filter(uid => uid !== studentId);
      }
      
      await updateDoc(groupDocRef, { studentUids: updatedUids });
    } catch (error) {
      console.error("Error updating group members:", error);
    }
  };
  
  const handleUpdateSchedule = async (updatedData) => {
    const { id, studentUid, studentName, startTime, endTime, isRecurring, recurrenceId, updateType } = updatedData;
    
    try {
      if (isRecurring && updateType === 'all') {
        const batch = writeBatch(db);
        const q = query(
          teacherScheduleCollection,
          where("recurrenceId", "==", recurrenceId),
          where("startTime", ">=", editingEntry.startTime) 
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(docSnap => {
          const entry = docSnap.data();
          const entryDate = entry.startTime.toDate();
          
          const newStartHour = startTime.toDate().getHours();
          const newStartMinute = startTime.toDate().getMinutes();
          const newEndHour = endTime.toDate().getHours();
          const newEndMinute = endTime.toDate().getMinutes();

          const newEntryStartTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), newStartHour, newStartMinute);
          const newEntryEndTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), newEndHour, newEndMinute);
          
          batch.update(docSnap.ref, {
            studentUid: studentUid, studentName: studentName,
            startTime: Timestamp.fromDate(newEntryStartTime), endTime: Timestamp.fromDate(newEntryEndTime)
          });
        });
        await batch.commit();
      } else {
        const docRef = doc(db, `${publicDataPath}/teacherSchedule`, id);
        const dataToUpdate = { studentUid, studentName, startTime, endTime };
        
        if (isRecurring && updateType === 'single') {
          dataToUpdate.isRecurring = false;
          dataToUpdate.recurrenceId = null;
          dataToUpdate.overrideStatus = null; 
        }
        await updateDoc(docRef, dataToUpdate);
      }
      closeEditModal(); 
    } catch (error) {
      console.error("Error updating schedule:", error);
    }
  };
  
  const [isRepairingData, setIsRepairingData] = useState(false);
  const handleRepairTeacherUid = async () => {
    if (!user?.uid) return;
    setIsRepairingData(true);
    try {
      // If teacher access was ever recovered (e.g. after being locked out), the
      // Firebase UID recognized as "the teacher" can change — but existing
      // lessonBank/teacherSchedule/studentGroups documents still carry the OLD
      // uid in their teacherUid field, so the uid-filtered queries that load
      // them return nothing (data looks "gone" even though it's still there).
      // This finds every doc in those 3 collections — regardless of its current
      // teacherUid — and rewrites it to match this session's uid, since this
      // app supports only one teacher account at a time.
      const collections = [
        { ref: lessonBankCollection, path: `${publicDataPath}/lessonBank` },
        { ref: teacherScheduleCollection, path: `${publicDataPath}/teacherSchedule` },
        { ref: groupsCollection, path: `${publicDataPath}/studentGroups` },
      ];
      let fixedCount = 0;
      for (const { ref, path } of collections) {
        const snap = await getDocs(ref);
        const toFix = snap.docs.filter(d => d.data().teacherUid !== user.uid);
        for (let i = 0; i < toFix.length; i += 400) {
          const chunk = toFix.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.update(doc(db, path, d.id), { teacherUid: user.uid }));
          await batch.commit();
        }
        fixedCount += toFix.length;
      }
      alert(fixedCount > 0
        ? `Repaired ${fixedCount} item(s). Your Lesson Bank, Schedule, and Groups should now show up correctly.`
        : `Nothing needed fixing — all your data already matches this account.`);
    } catch (error) {
      console.error('Error repairing teacherUid data:', error);
      alert('Error while repairing data. Please try again, or let your developer know.');
    }
    setIsRepairingData(false);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const fetchAndConvert = async (collectionRef) => {
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => {
          const data = doc.data();
          const id = doc.id;
          Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
              data[key] = data[key].toDate().toISOString();
            }
          });
          return { id, ...data };
        });
      };
      
      const [lessonBankData, studentsData, scheduleData, sessionsData, groupsData, starAnnouncementsData] = await Promise.all([
        fetchAndConvert(query(lessonBankCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(studentsCollection),
        fetchAndConvert(query(teacherScheduleCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(sessionsCollection), 
        fetchAndConvert(query(groupsCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(starAnnouncementsCollection)
      ]);
      
      const backupData = {
        lessonBank: lessonBankData, students: studentsData, schedule: scheduleData, sessions: sessionsData, groups: groupsData, starAnnouncements: starAnnouncementsData
      };
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
    setIsExporting(false);
  };

  const handleImportFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportFileContent(e.target.result);
        setShowImportModal(true);
      };
      reader.readAsText(file);
    }
    if(importFileRef.current) importFileRef.current.value = null;
  };
  
  const confirmImportData = async () => {
    if (!importFileContent) return;
    setIsImporting(true);
    setShowImportModal(false);
    
    try {
      const data = JSON.parse(importFileContent);
      const convertItem = (itemData) => {
        const data = { ...itemData };
        delete data.id; 
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data[key])) {
            data[key] = Timestamp.fromDate(new Date(data[key]));
          }
        });
        return data;
      };

      // Backups can come from a different Firebase project (e.g. an old environment).
      // teacherUid values inside the backup belong to that old project's teacher account
      // and won't match this project's teacher, so lessonBank/schedule/groups queries
      // (which filter by teacherUid) would silently show nothing. Rewrite teacherUid to
      // the current logged-in teacher on import so everything shows up correctly.
      const convertTeacherItem = (itemData) => {
        const converted = convertItem(itemData);
        converted.teacherUid = user.uid;
        return converted;
      };

      // Build a flat list of { path, id, data } write operations across all collections.
      const ops = [];
      data.lessonBank?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/lessonBank`, id: item.id, data: convertTeacherItem(item) }); });
      data.students?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/students`, id: item.id, data: convertItem(item) }); });
      data.schedule?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/teacherSchedule`, id: item.id, data: convertTeacherItem(item) }); });
      data.sessions?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/studySessions`, id: item.id, data: convertItem(item) }); });
      data.groups?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/studentGroups`, id: item.id, data: convertTeacherItem(item) }); });
      data.starAnnouncements?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/starAnnouncements`, id: item.id, data: convertItem(item) }); });

      // Firestore allows at most 500 operations per batch. Chunk into groups of 400
      // (safety margin) and commit each chunk sequentially so large backups don't
      // silently fail as a single oversized batch.
      const CHUNK_SIZE = 400;
      const totalOps = ops.length;
      let written = 0;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          batch.set(doc(db, op.path, op.id), op.data);
        });
        await batch.commit();
        written += chunk.length;
      }

      if (!teacherConfigData?.hasDeclinedTrophyReset) {
         setShowTrophyResetPrompt(true);
      }
      alert(`Import complete. ${written} of ${totalOps} records restored.`);
    } catch (error) {
      console.error("Error importing data:", error);
      alert(`Import failed: ${error.message || error}. Please check the browser console (F12) for details, or contact support.`);
    }
    setImportFileContent(null);
    setIsImporting(false);
  };

  // ── Trophy Data Audit ──
  // Two checks, neither of which writes anything -- purely diagnostic, so
  // it's always safe to run.
  //
  // 1) Live scan: flags any earnedTrophies value that exceeds its lesson's
  //    own trophyLimit -- a state that should be logically impossible, so
  //    seeing it at all means something (a bad manual edit, a bug like the
  //    per-class-summing one this was built in response to) let a number
  //    go higher than it should. Only checks bare-title keys (lessons
  //    without a Smart Study/Abhidhamma/Dhammaschool class concept),
  //    since a per-class key's real max requires knowing that specific
  //    class's live lesson count, which wasn't worth the extra fetches for
  //    a first pass.
  //
  // 2) Backup comparison: upload an older exported backup and compare each
  //    student's earnedTrophies/completedUnits key-by-key against the
  //    current live data (matched by student NAME, not ID, since an old
  //    backup can come from a different Firebase project with different
  //    IDs -- see confirmImportData's teacherUid rewrite for the same
  //    reason). Surfaces every case where the old backup shows MORE than
  //    what's live now -- exactly the shape of bug that lost Long Phan's
  //    6 Abhidhamma trophies during whatever long-ago migration never
  //    finished carrying them over.
  const [trophyAuditResults, setTrophyAuditResults] = useState(null);
  const [isRunningTrophyAudit, setIsRunningTrophyAudit] = useState(false);
  const [auditBackupFileContent, setAuditBackupFileContent] = useState(null);
  const [auditBackupFileName, setAuditBackupFileName] = useState('');
  const auditBackupFileRef = useRef(null);

  const runLiveTrophyAudit = () => {
    setIsRunningTrophyAudit(true);
    const findings = [];
    students.forEach(student => {
      const earned = student.earnedTrophies || {};
      Object.entries(earned).forEach(([key, value]) => {
        if (!value || value <= 0) return;
        // Only bare-title keys (no class suffix): find a lessonBank entry
        // whose own sanitized title matches this key exactly.
        const matchingLesson = lessonBank.find(l => sanitizeKey(l.title) === key);
        if (!matchingLesson) return;
        const max = matchingLesson.trophyLimit || 0;
        if (max > 0 && value > max) {
          findings.push({
            type: 'impossible',
            studentName: student.name,
            lessonTitle: matchingLesson.title,
            key,
            liveValue: value,
            max
          });
        }
      });
    });
    setTrophyAuditResults(prev => ({ ...(prev || {}), impossibleStates: findings, liveScanDone: true }));
    setIsRunningTrophyAudit(false);
  };

  const handleAuditBackupFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAuditBackupFileContent(e.target.result);
        setAuditBackupFileName(file.name);
      };
      reader.readAsText(file);
    }
    if (auditBackupFileRef.current) auditBackupFileRef.current.value = null;
  };

  const runBackupComparisonAudit = () => {
    if (!auditBackupFileContent) return;
    setIsRunningTrophyAudit(true);
    try {
      const backup = JSON.parse(auditBackupFileContent);
      const oldStudents = backup.students || [];
      // The live `students` list comes from a Firestore listener that can
      // still be mid-load (especially right after opening this tab) --
      // comparing against it too early falsely reported every one of a
      // student's trophies as "0, possible data loss" once, even though
      // the data was actually all there once the listener caught up. If
      // live has noticeably fewer students than the backup being compared
      // against, that's a strong sign it hasn't finished loading yet, so
      // refuse to run rather than produce a misleading report.
      if (oldStudents.length > 0 && students.length < oldStudents.length * 0.9) {
        alert(`Live student list looks incomplete (${students.length} loaded vs ${oldStudents.length} in the backup) -- it may still be loading. Wait a few seconds and try again.`);
        setIsRunningTrophyAudit(false);
        return;
      }
      const findings = [];
      oldStudents.forEach(oldStudent => {
        const liveStudent = students.find(s => (s.name || '').trim().toLowerCase() === (oldStudent.name || '').trim().toLowerCase());
        if (!liveStudent) {
          findings.push({ type: 'missing_student', studentName: oldStudent.name });
          return;
        }
        ['earnedTrophies', 'completedUnits'].forEach(field => {
          const oldMap = oldStudent[field] || {};
          const liveMap = liveStudent[field] || {};
          Object.entries(oldMap).forEach(([key, oldValue]) => {
            const liveValue = liveMap[key] || 0;
            if ((oldValue || 0) !== liveValue) {
              findings.push({
                type: 'mismatch',
                field,
                studentName: liveStudent.name,
                key,
                oldValue: oldValue || 0,
                liveValue,
                lostData: (oldValue || 0) > liveValue
              });
            }
          });
        });
      });
      // Worst (data possibly lost) first, then by student name.
      findings.sort((a, b) => {
        if (a.type === 'missing_student' || b.type === 'missing_student') return a.type === 'missing_student' ? -1 : 1;
        if (a.lostData !== b.lostData) return a.lostData ? -1 : 1;
        return (a.studentName || '').localeCompare(b.studentName || '');
      });
      setTrophyAuditResults(prev => ({ ...(prev || {}), backupComparison: findings, backupFileName: auditBackupFileName }));
    } catch (err) {
      alert(`Could not read that backup file: ${err.message || err}`);
    }
    setIsRunningTrophyAudit(false);
  };

  // ── Smart Study migration (retiring 4 old Gemini-link lessons) ──
  // Preview-first, exactly like the audit above: computes what WOULD change
  // and shows it, writes nothing until the teacher explicitly applies it.
  // Only ever raises a per-class earnedTrophies value up to what a student
  // has actually earned live in Smart Study (or the fallback, for a class
  // with no live tracking) -- it never lowers anything, and it never touches
  // the old bare-title keys, so trophyCount and everything already awarded
  // stays exactly as-is.
  const [ssMigrationPreview, setSsMigrationPreview] = useState(null);
  const [isRunningSsMigration, setIsRunningSsMigration] = useState(false);
  const [isApplyingSsMigration, setIsApplyingSsMigration] = useState(false);

  const runSmartStudyMigrationPreview = async () => {
    setIsRunningSsMigration(true);
    setSsMigrationPreview(null);
    try {
      const classesSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
      const liveClasses = {};
      classesSnap.docs.forEach(d => { liveClasses[d.id] = (d.data().lessons || []).length; });

      const completionCache = {};
      const getCompletedCount = async (classId, names) => {
        const distinct = new Set();
        for (const name of names) {
          if (!name) continue;
          const cacheKey = `${classId}::${name}`;
          if (!(cacheKey in completionCache)) {
            const q = query(
              collection(db, 'artifacts', appId, 'public', 'data', 'quizCompletions'),
              where('classId', '==', classId),
              where('studentName', '==', name)
            );
            const snap = await getDocs(q);
            completionCache[cacheKey] = snap.docs.map(d => d.data().lessonId);
          }
          completionCache[cacheKey].forEach(id => distinct.add(id));
        }
        return distinct.size;
      };

      const rows = [];
      for (const student of students) {
        const earned = student.earnedTrophies || {};
        for (const oldTitle of Object.keys(SMARTSTUDY_MIGRATION_MAP)) {
          const oldValue = earned[oldTitle] || 0;
          if (oldValue <= 0) continue;
          for (const target of SMARTSTUDY_MIGRATION_MAP[oldTitle]) {
            const { classId, fallback } = target;
            const newKey = sanitizeKey(`${SMARTSTUDY_MIGRATION_NEW_TITLE}_${classId}`);
            const currentNew = earned[newKey] || 0;
            const lessonCount = liveClasses[classId];
            let deserved, basis, liveCompleted = null, liveTotal = null;
            if (lessonCount != null && lessonCount > 0) {
              const names = [...new Set([student.name, student.smartStudyNames?.[classId]].filter(Boolean))];
              const completed = await getCompletedCount(classId, names);
              const maxAvailable = computeClassTrophyMax(lessonCount);
              deserved = Math.floor((completed * maxAvailable) / lessonCount);
              basis = 'live';
              liveCompleted = completed;
              liveTotal = lessonCount;
            } else {
              deserved = fallback;
              basis = 'fallback';
            }
            const proposedNew = Math.max(currentNew, deserved);
            rows.push({
              studentId: student.id,
              studentName: student.name,
              oldTitle,
              oldValue,
              classId,
              newKey,
              basis,
              liveCompleted,
              liveTotal,
              deserved,
              currentNew,
              proposedNew,
              willChange: proposedNew > currentNew,
            });
          }
        }
      }
      rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.oldTitle.localeCompare(b.oldTitle) || a.classId.localeCompare(b.classId));
      setSsMigrationPreview({ rows, liveClasses });
    } catch (err) {
      console.error('Error running Smart Study migration preview:', err);
      alert(`Could not run the migration preview: ${err.message || err}`);
    }
    setIsRunningSsMigration(false);
  };

  const applySmartStudyMigration = async () => {
    if (!ssMigrationPreview) return;
    const changingRows = ssMigrationPreview.rows.filter(r => r.willChange);
    if (changingRows.length === 0) {
      alert('Nothing to apply -- no student needs a higher trophy count than they already have.');
      return;
    }
    if (!window.confirm(`This will set new "Smart Study" per-class trophy values for ${changingRows.length} student/class combination(s), only where that raises the number. It will NOT change any existing trophy already given. Continue?`)) return;
    setIsApplyingSsMigration(true);
    try {
      let ssEntry = lessonBank.find(l => l.link === 'smartstudy://');
      if (!ssEntry) {
        await addDoc(lessonBankCollection, {
          teacherUid: user.uid,
          title: SMARTSTUDY_MIGRATION_NEW_TITLE,
          link: 'smartstudy://',
          details: '',
          trophyLimit: 0,
          unitLabel: 'Lesson',
          unitCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      const batch = writeBatch(db);
      changingRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.newKey}`]: row.proposedNew });
      });
      await batch.commit();
      alert(`Done. Updated ${changingRows.length} trophy value(s) under the new "Smart Study" entry. The old lesson trophies were left untouched.`);
      setSsMigrationPreview(null);
    } catch (err) {
      console.error('Error applying Smart Study migration:', err);
      alert(`Migration failed: ${err.message || err}`);
    }
    setIsApplyingSsMigration(false);
  };

  const handleDeleteOldSmartStudyLessons = async () => {
    const targets = lessonBank.filter(l => Object.keys(SMARTSTUDY_MIGRATION_MAP).includes(l.title));
    if (targets.length === 0) {
      alert('None of the 4 old lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      await Promise.all(targets.map(t => deleteDoc(doc(db, `${publicDataPath}/lessonBank`, t.id))));
      alert(`Deleted ${targets.length} old lesson(s).`);
    } catch (err) {
      console.error('Error deleting old Smart Study lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  const completedSessions = sessions
    .filter(s => s.endTime)
    .sort((a, b) => b.startTime.toDate() - a.startTime.toDate());
    
  const futureScheduleEntries = teacherSchedule.filter(
    entry => entry.startTime.toDate() > new Date()
  );

  const expiringSchedules = useMemo(() => {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); 
    
    const latestSchedules = {};
    teacherSchedule.forEach(entry => {
      const key = entry.studentUid === 'offline' ? `offline-${entry.studentName}` : entry.studentUid;
      if (!latestSchedules[key] || entry.startTime.toDate() > latestSchedules[key].startTime.toDate()) {
        latestSchedules[key] = entry;
      }
    });
    
    const expiring = [];
    Object.values(latestSchedules).forEach(entry => {
      const lastDate = entry.startTime.toDate();
      if (lastDate > now && lastDate <= twoWeeksFromNow) {
        expiring.push(entry);
      }
    });
    
    return expiring.sort((a,b) => a.startTime.toDate() - b.startTime.toDate()); 
  }, [teacherSchedule]);

  const pendingStudents = useMemo(() => students.filter(s => s.isActive === 'pending'), [students]);
  const pendingNameChanges = useMemo(() => students.filter(s => s.pendingName), [students]);
  const currentStudents = useMemo(() => students.filter(s => s.isActive === true || s.isActive === false), [students]);
  const trophyRequests = useMemo(() => students.filter(s => s.trophyRequested === true), [students]);
  
  const totalStudents = currentStudents.length;
  const activeStudents = currentStudents.filter(s => s.isActive === true).length;
  
  const filteredSendStudents = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    const scheduledTodayUids = new Set();
    const scheduledThisHourUids = new Set();

    teacherSchedule.forEach(entry => {
      if (entry.studentUid !== 'offline') {
        const entryStart = entry.startTime.toDate();
        const entryEnd = entry.endTime.toDate();
        
        if (entryStart.toDateString() === todayStr) {
          scheduledTodayUids.add(entry.studentUid);
          
          const nowMs = now.getTime();
          if (nowMs >= entryStart.getTime() - (15 * 60000) && nowMs <= entryEnd.getTime()) {
             scheduledThisHourUids.add(entry.studentUid);
          }
        }
      }
    });

    const searchStr = String(sendStudentSearch || '').toLowerCase(); 
    let baseList = students.filter(s => s.isActive === true);
    
    if (searchStr) {
      baseList = baseList.filter(s => s.name && typeof s.name === 'string' && s.name.toLowerCase().includes(searchStr));
    }
    
    return baseList.sort((a, b) => {
      const aThisHour = scheduledThisHourUids.has(a.id);
      const bThisHour = scheduledThisHourUids.has(b.id);
      if (aThisHour && !bThisHour) return -1;
      if (!aThisHour && bThisHour) return 1;

      const aToday = scheduledTodayUids.has(a.id);
      const bToday = scheduledTodayUids.has(b.id);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [students, sendStudentSearch, teacherSchedule]);
  
  const filteredScheduleStudents = useMemo(() => {
    const searchStr = String(scheduleStudentSearch || '').toLowerCase(); 
    if (!searchStr) return students.filter(s => s.isActive === true); 
    return students.filter(s =>
      s.isActive === true && s.name && typeof s.name === 'string' && s.name.toLowerCase().startsWith(searchStr) 
    );
  }, [students, scheduleStudentSearch]);

  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let weekAttended = 0, weekAbsent = 0;
    let monthAttended = 0, monthAbsent = 0;
    let yearAttended = 0, yearAbsent = 0;

    teacherSchedule.forEach(entry => {
       const entryDate = entry.startTime.toDate();
       if (entryDate > now) return; 

       let isAttended = false;
       let isAbsent = false;

       if (entry.overrideStatus === 'attended') isAttended = true;
       else if (entry.overrideStatus === 'absent') isAbsent = true;
       else if (entry.studentUid !== 'offline') {
           const startOfEntryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
           const endOfEntryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
           const didAttend = sessions.some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfEntryDay && s.startTime.toDate() <= endOfEntryDay);
           if (didAttend) isAttended = true;
           else isAbsent = true;
       } else {
           isAbsent = true;
       }

       if (entryDate >= startOfWeek) {
           if (isAttended) weekAttended++;
           if (isAbsent) weekAbsent++;
       }
       if (entryDate >= startOfMonth) {
           if (isAttended) monthAttended++;
           if (isAbsent) monthAbsent++;
       }
       if (entryDate >= startOfYear) {
           if (isAttended) yearAttended++;
           if (isAbsent) yearAbsent++;
       }
    });

    return { weekAttended, weekAbsent, monthAttended, monthAbsent, yearAttended, yearAbsent };
  }, [teacherSchedule, sessions]);

  const openAttendanceModal = (student) => {
    if (student.id !== 'offline' && student.displayId) {
      setSelectedStudentForHistory(student);
      setShowAttendanceModal(true);
    }
  };
  
  const closeAttendanceModal = () => {
    setShowAttendanceModal(false);
    setSelectedStudentForHistory(null);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };
  
  const closeEditModal = () => {
    setEditingEntry(null);
    setShowEditModal(false);
  };
  
  const handleRenewSchedule = (entry) => {
    if (entry.studentUid === 'offline') {
      setScheduleStudentType('offline');
      setManualStudentName(entry.studentName);
      setScheduleSelectedStudentUid('');
      setScheduleStudentSearch(''); 
    } else {
      setScheduleStudentType('online');
      setScheduleSelectedStudentUid(entry.studentUid);
      setScheduleStudentSearch(entry.studentName); 
      setManualStudentName('');
    }
    
    const lastDate = entry.startTime.toDate();
    const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    setManualDate(toLocalDateString(nextDate));
    
    const formatTime = (date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    setManualStartTime(formatTime(entry.startTime.toDate()));
    setManualEndTime(formatTime(entry.endTime.toDate()));
    
    setIsRecurring(true);
    
    const newEndDate = new Date(nextDate.getTime());
    newEndDate.setMonth(newEndDate.getMonth() + 3);
    setRecurEndDate(toLocalDateString(newEndDate));
  };

  return (
    <div className="p-6">
      <ConfirmationModal
        isOpen={showConfirmModal.isOpen} onClose={() => setShowConfirmModal({ isOpen: false })}
        onConfirm={showConfirmModal.onConfirm} title={showConfirmModal.title}
        message={showConfirmModal.message} confirmText={showConfirmModal.confirmText}
        confirmColor={showConfirmModal.confirmColor}
      />
      <ConfirmationModal 
        isOpen={showDeleteModal.isOpen} onClose={closeDeleteModal}
        onConfirm={handleDeleteItem} title={`Delete ${showDeleteModal.type === 'lessonBank' ? 'Lesson' : (showDeleteModal.type === 'student' ? 'Student' : (showDeleteModal.type === 'group' ? 'Group' : 'Entry'))}`}
        message={showDeleteModal.message || `Are you sure you want to delete "${showDeleteModal.title}"? This cannot be undone.`}
        confirmText="Delete" confirmColor="bg-red-600 hover:bg-red-700"
      />
      <ConfirmationModal
        isOpen={showImportModal} onClose={() => setShowImportModal(false)}
        onConfirm={confirmImportData} title="Import Data"
        message="Warning: This will overwrite existing data with data from the backup file. This action cannot be undone. Are you sure?"
        confirmText="Import" confirmColor="bg-indigo-500 hover:bg-indigo-600"
      />
      <TrophyResetModal 
        isOpen={showTrophyResetPrompt} 
        onReset={handleResetAllTrophies} 
        onDecline={handleDeclineTrophyReset} 
      />
      <StarAnnouncementModal
        isOpen={showStarModal}
        onClose={() => setShowStarModal(false)}
        students={students}
        onSend={handleSendStarAnnouncement}
      />
      {greetingToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9600] max-w-md w-[90%]">
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-400 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">🙏</span>
            <div className="flex-1">
              <p className="font-bold text-emerald-900">{greetingToast.studentName}</p>
              <p className="text-emerald-800 text-sm">Mangalabar ဘုန်းဘုန်း</p>
            </div>
            <button onClick={() => setGreetingToast(null)} className="text-emerald-500 hover:text-emerald-800 text-lg">✕</button>
          </div>
        </div>
      )}
      {mergeTargetId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 text-purple-700">Merge Two Lessons</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{mergeSourceTitle}" and "{mergeTargetTitle}" will be merged. Trophy counts will be combined automatically.
            </p>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">New Title</label>
              <input
                type="text"
                value={mergeNewTitle}
                onChange={(e) => setMergeNewTitle(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelMerge} disabled={isMerging} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={executeMergeLessons} disabled={isMerging || !mergeNewTitle.trim()} className="px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 shadow-md disabled:opacity-50">
                {isMerging ? 'Merging...' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <StudentAttendanceModal isOpen={showAttendanceModal} onClose={closeAttendanceModal} student={selectedStudentForHistory} />
      <EditScheduleModal isOpen={showEditModal} onClose={closeEditModal} onSave={handleUpdateSchedule} entry={editingEntry} students={students.filter(s => s.isActive)} />
      
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Teacher Dashboard</h2>
      
      <div className="mb-6 border-b border-gray-300">
        <nav className="flex flex-wrap space-x-4">
          <button onClick={() => setViewMode('send')} className={`py-2 px-4 font-medium ${viewMode === 'send' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>Send Action</button>
          <button onClick={() => setViewMode('schedule')} className={`py-2 px-4 font-medium flex items-center ${viewMode === 'schedule' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-600 hover:text-emerald-600'}`}>
            My Schedule
            {expiringSchedules.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">{expiringSchedules.length}</span>
            )}
          </button>
          <button onClick={() => setViewMode('bank')} className={`py-2 px-4 font-medium ${viewMode === 'bank' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-gray-600 hover:text-sky-600'}`}>Lesson Bank</button>
          <button onClick={() => setViewMode('reports')} className={`py-2 px-4 font-medium ${viewMode === 'reports' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-600 hover:text-amber-600'}`}>Reports</button>
          <button onClick={() => setViewMode('students')} className={`relative py-2 px-4 font-medium ${viewMode === 'students' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600 hover:text-rose-600'}`}>
            Students
            {(pendingStudents.length > 0 || trophyRequests.length > 0) && (
              <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">{pendingStudents.length + trophyRequests.length}</span>
            )}
            {/* Small dot specifically for students requesting a name change —
                separate from the count badge above, which is for approvals
                and trophy requests, so a rename request never gets missed
                inside that number. */}
            {pendingNameChanges.length > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white animate-pulse"
                title={`${pendingNameChanges.length} student(s) requesting a name change`}
              ></span>
            )}
          </button>
          <button onClick={() => setViewMode('groups')} className={`py-2 px-4 font-medium ${viewMode === 'groups' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-600 hover:text-cyan-600'}`}>
            Groups
          </button>
          <button onClick={() => setViewMode('settings')} className={`py-2 px-4 font-medium ${viewMode === 'settings' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-gray-600'}`}>Settings</button>
          <button onClick={() => setViewMode('apps')} className={`py-2 px-4 font-medium ${viewMode === 'apps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Apps</button>
        </nav>
      </div>

      {viewMode === 'apps' && (
        <div className="bg-blue-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-200 max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Other Apps</h3>
          <p className="text-sm text-gray-600 mb-6">Open a connected app. More apps can be added here later.</p>
          <button
            onClick={() => onOpenSmartStudy && onOpenSmartStudy({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="flex items-center text-lg font-bold text-blue-800">📚 Smart Study app</span>
            <span className="text-blue-500 text-xl">→</span>
          </button>
          <button
            onClick={() => onOpenAbhidhamma && onOpenAbhidhamma({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-amber-800">📚 Abhidhamma app</span>
            <span className="text-amber-500 text-xl">→</span>
          </button>
          {/* Dhammaschool app — now mounted inline in the same project as
              SmartStudy/Abhidhamma/Myanmar Reader, so this switches the view
              instead of opening a new tab. */}
          <button
            onClick={() => onOpenDhammaschool && onOpenDhammaschool({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-orange-800">📖 Dhammaschool app</span>
            <span className="text-orange-500 text-xl">→</span>
          </button>
          {/* Myanmar Consonant Practice — mounted inline like the others above.
              No teacher/student distinction yet (no Firebase wiring in this
              app currently — that, plus trophy/score integration, comes in a
              later pass), so this just switches straight to it. */}
          {/* Burmese Consonant Learning Game — mounted inline like the others.
              No Firebase/trophy wiring yet either, same as Consonant Practice
              above (comes in a later pass). */}
          {/* Myanmar Number Learning / Vowels Learning — mounted inline like
              the others above, same "no Firebase/trophy wiring yet" note as
              Consonant Practice / Burmese Game. */}
          {/* Combined group entry — bundles Consonant Practice, Burmese
              Consonant Game, Vowels, Spelling, Consonant Endings and Sound
              Practice behind one "Choose a Part" screen so a teacher can
              assign all six as a single lesson. The individual apps above
              stay available too. */}
          <button
            onClick={() => onOpenReadingMyanmar && onOpenReadingMyanmar({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-blue-800">📚 Reading Myanmar app</span>
            <span className="text-blue-500 text-xl">→</span>
          </button>
          {/* Second combined group — bundles Myanmar Poems, Number Learning,
              Animal Sound Quiz, Burmese Learning Games, Interactive Learning
              Quiz and Time and Calendar behind one "Choose a Part" screen. */}
          <button
            onClick={() => onOpenSpeakingMyanmar && onOpenSpeakingMyanmar({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-orange-800">🗣️ Speaking Myanmar app</span>
            <span className="text-orange-500 text-xl">→</span>
          </button>
          {/* Third combined group — bundles Myanmar Part 1A, 1B, 2A and 2B
              behind one "Choose a Part" screen. */}
          <button
            onClick={() => onOpenMyanmarPart1And2 && onOpenMyanmarPart1And2({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-indigo-800">📘 Myanmar Part 1 & 2 app</span>
            <span className="text-indigo-500 text-xl">→</span>
          </button>
          {/* Myanmar Speaking app — now mounted inline in the same project as
              the other apps above, instead of opening the separately-hosted
              myanmar-wordcraft deployment in a new tab. */}
          <button
            onClick={() => onOpenMyanmarSpeaking && onOpenMyanmarSpeaking({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-purple-800">🗣️ Myanmar Speaking app</span>
            <span className="text-purple-500 text-xl">→</span>
          </button>
          {/* Myanmar Reader app — now mounted inline in the same project as
              SmartStudy/Abhidhamma, so this switches the view instead of
              opening a new tab. */}
          <button
            onClick={() => onOpenMyanmarReader && onOpenMyanmarReader({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-teal-200 hover:border-teal-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-teal-800">📗 Myanmar Reader app</span>
            <span className="text-teal-500 text-xl">→</span>
          </button>
        </div>
      )}

      {viewMode === 'schedule' && (
         <div className="flex flex-col md:flex-row gap-4 mb-6">
           <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">This Week's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.weekAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.weekAbsent}</span>
                </div>
              </div>
           </div>
           <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide">This Month's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.monthAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.monthAbsent}</span>
                </div>
              </div>
           </div>
           <div className="bg-violet-50 p-4 rounded-xl shadow-sm border border-violet-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-violet-800 uppercase tracking-wide">This Year's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.yearAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.yearAbsent}</span>
                </div>
              </div>
           </div>
        </div>
      )}

      {viewMode === 'send' && (
        <form onSubmit={handleSendSubmit} className="bg-indigo-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-indigo-200">
          <h3 className="text-xl font-semibold mb-4 text-indigo-700">Send Action</h3>

          {lastTrophyAward && (
            <div className="mb-4 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-yellow-800 font-semibold">
                Awarded {lastTrophyAward.amount} trophy(s) to {lastTrophyAward.studentName}.
              </p>
              <button type="button" onClick={handleUndoTrophyAward} className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg shadow-md flex-shrink-0">
                ↩ Undo (within 30s)
              </button>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Action Type</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button type="button" onClick={() => setSendActionType('lesson')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendActionType === 'lesson' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Assign Lesson</button>
              <button type="button" onClick={() => { setSendActionType('trophy'); setSendTargetType('student'); }} className={`w-1/2 p-2 rounded-lg font-semibold ${sendActionType === 'trophy' ? 'bg-white shadow text-yellow-600' : 'text-gray-600'}`}>Award Trophies Only</button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Target</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button type="button" onClick={() => setSendTargetType('student')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendTargetType === 'student' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Single Student</button>
              <button type="button" disabled={sendActionType === 'trophy'} onClick={() => setSendTargetType('group')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendTargetType === 'group' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`} title={sendActionType === 'trophy' ? "Trophies can only be awarded directly to a single student." : ""}>Group</button>
            </div>
          </div>
          
          {sendTargetType === 'student' ? (
            <div className="mb-4 relative">
              <label className="block text-gray-700 mb-2">Select Student</label>
              <input
                type="text" value={sendStudentSearch}
                onChange={(e) => {
                  setSendStudentSearch(e.target.value);
                  if (selectedStudentUid) setSelectedStudentUid(null); 
                  setIsSendDropdownOpen(true);
                }}
                onFocus={() => setIsSendDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsSendDropdownOpen(false), 200)} 
                placeholder="Type to search..."
                className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {isSendDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSendStudents.length > 0 ? (
                    filteredSendStudents.map(student => {
                      const now = new Date();
                      let isScheduledToday = false;
                      let isScheduledThisHour = false;
                      
                      teacherSchedule.forEach(entry => {
                        if (entry.studentUid === student.id) {
                          const entryStart = entry.startTime.toDate();
                          const entryEnd = entry.endTime.toDate();
                          if (entryStart.toDateString() === now.toDateString()) {
                            isScheduledToday = true;
                            const nowMs = now.getTime();
                            if (nowMs >= entryStart.getTime() - (15 * 60000) && nowMs <= entryEnd.getTime()) {
                              isScheduledThisHour = true;
                            }
                          }
                        }
                      });

                      return (
                        <div
                          key={student.id} onClick={() => { setSendStudentSearch(student.name); setSelectedStudentUid(student.id); setIsSendDropdownOpen(false); hasAutoSelectedSendStudentRef.current = true; }}
                          className={`p-3 cursor-pointer flex justify-between items-center ${isScheduledThisHour ? 'bg-rose-50 border-l-4 border-rose-500 hover:bg-rose-100' : isScheduledToday ? 'bg-indigo-50 hover:bg-indigo-100 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}
                        >
                          <div>
                            <span className={isScheduledToday || isScheduledThisHour ? 'font-bold text-indigo-900' : ''}>{student.name}</span>
                            <span className="text-gray-500 text-sm ml-2">({student.displayId})</span>
                          </div>
                          {isScheduledThisHour ? (
                            <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-1 rounded-md">Scheduled This Hour</span>
                          ) : isScheduledToday ? (
                            <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-1 rounded-md">Scheduled Today</span>
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-3 text-gray-500">No students found.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select Group</label>
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>-- Select a group --</option>
                {groups.map(group => <option key={group.id} value={group.id}>{group.groupName} ({group.studentUids.length} students)</option>)}
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Select Lesson from Bank</label>
            <select value={selectedBankLessonId} onChange={(e) => { setSelectedBankLessonId(e.target.value); setSendSmartStudyClassId(''); setSendAbhidhammaClassId(''); setSendGroupPartKey(''); }} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>-- Select a lesson --</option>
              {lessonBank.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} ({lesson.details})</option>)}
            </select>
          </div>

          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'smartstudy://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📚 Smart Study app — choose a Class ID</label>
                {smartStudyClasses === null ? (
                  <button type="button" onClick={loadSmartStudyClassList}
                    className="w-full p-3 border rounded-lg bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100"
                  >
                    Load Smart Study classes…
                  </button>
                ) : pickerLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : smartStudyClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No Smart Study classes found yet.</p>
                ) : (
                  <select
                    value={sendSmartStudyClassId}
                    onChange={(e) => setSendSmartStudyClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {smartStudyClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.classId} ({c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'})</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'abhidhamma://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📚 Abhidhamma app — choose a Class ID</label>
                {abhidhammaClasses === null ? (
                  <button type="button" onClick={loadAbhidhammaClasses}
                    className="w-full p-3 border rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100"
                  >
                    Load Abhidhamma classes…
                  </button>
                ) : abhidhammaLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : abhidhammaClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No Abhidhamma classes found yet.</p>
                ) : (
                  <select
                    value={sendAbhidhammaClassId}
                    onChange={(e) => setSendAbhidhammaClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {abhidhammaClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.displayName || c.classId}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {/* Dhammaschool app — class picker (mirrors SmartStudy/Abhidhamma "choose a Class ID") */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'dhammaschool://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📖 Dhammaschool app — choose a Class ID</label>
                {dhammaschoolClasses === null ? (
                  <button type="button" onClick={loadDhammaschoolClasses}
                    className="w-full p-3 border rounded-lg bg-orange-50 text-orange-700 font-semibold hover:bg-orange-100"
                  >
                    Load Dhammaschool classes…
                  </button>
                ) : dhammaschoolLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : dhammaschoolClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No public lessons found in Dhammaschool app yet.</p>
                ) : (
                  <select
                    value={sendDhammaschoolClassId}
                    onChange={(e) => setSendDhammaschoolClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {dhammaschoolClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.classId} ({c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'})</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {/* Dhammaschool app — student progress across the whole class */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedStudentUid || !selectedLesson || selectedLesson.link !== 'dhammaschool://' || !sendDhammaschoolClassId) return null;
            const student = students.find(s => s.id === selectedStudentUid);
            if (!student) return null;
            return (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-orange-800 font-bold mb-1">Student Progress on "{sendDhammaschoolClassId}" Dhammaschool Class:</p>
                {dhammaschoolStudentProgress === null
                  ? <p className="text-sm text-orange-600">Loading…</p>
                  : dhammaschoolStudentProgress.totalLessons > 0
                    ? <p className="text-sm text-orange-700">{student.name} completed <strong>{dhammaschoolStudentProgress.completedCount}</strong> / {dhammaschoolStudentProgress.totalLessons} lesson{dhammaschoolStudentProgress.totalLessons !== 1 ? 's' : ''} · Total score: <strong>{(dhammaschoolStudentProgress.score || 0).toLocaleString()} pts</strong></p>
                    : <p className="text-sm text-orange-600">No public lessons in this class yet.</p>
                }
              </div>
            );
          })()}

          {/* Grouped apps (Reading Myanmar / Speaking Myanmar / Myanmar Part 1 & 2)
              — choose which part to send, same "not baked into the bank
              entry" idea as Smart Study's class picker, but the part list
              is static (no Firestore fetch needed). */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            const scheme = selectedLesson ? groupSchemeOfLink(selectedLesson.link) : null;
            if (!selectedLesson || !scheme || selectedLesson.link !== scheme) return null;
            const parts = GROUP_PARTS_BY_SCHEME[scheme];
            const appLabel = selectedLesson.title || 'this app';
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">{appLabel} — choose a Part</label>
                <select
                  value={sendGroupPartKey}
                  onChange={(e) => setSendGroupPartKey(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>-- Choose a part --</option>
                  {parts.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* Abhidhamma student progress (when abhi class selected) */}


          {selectedStudentUid && selectedBankLessonId && sendTargetType === 'student' && (() => {
              const student = students.find(s => s.id === selectedStudentUid);
              const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
              if (!student || !lesson) return null;

              const isAbhiForTrophy = lesson.link?.startsWith('abhidhamma://');
              const isDhammaschoolForTrophy = lesson.link?.startsWith('dhammaschool://');
              const ssClassForTrophy = (sendSmartStudyClassId && smartStudyClasses)
                ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
                : null;
              const abhiClassForTrophy = (isAbhiForTrophy && sendAbhidhammaClassId && abhiTotalCount != null)
                ? { classId: sendAbhidhammaClassId, lessonCount: abhiTotalCount }
                : null;
              const dhammaschoolClassForTrophy = (isDhammaschoolForTrophy && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null)
                ? { classId: sendDhammaschoolClassId, lessonCount: dhammaschoolStudentProgress.totalLessons }
                : null;
              const anyClassForTrophy = ssClassForTrophy || abhiClassForTrophy || dhammaschoolClassForTrophy;
              const effectiveUnitCountForDisplay = anyClassForTrophy
                ? (anyClassForTrophy.lessonCount || 0)
                : (lesson.unitCount || 0);

              // Same class-aware key/limit logic used by the actual award
              // function (getClassSpecificTrophyInfo) — this is what fixes the
              // "Previously Earned" number being a cross-class total instead of
              // this specific class's own trophies.
              //
              // For the no-class-selected aggregate view specifically: two
              // different attempts at summing per-class keys on top of the
              // bare legacy key each ended up double-counting for real
              // students (Abhidhamma's legacy bare key already held a
              // student's full historical total from before per-class
              // tracking existed, so adding newer per-class keys on top
              // overshot past Max Available). Reverted to the plain original
              // lookup -- correct for the cases checked so far -- until
              // there's a confirmed case showing exactly what the bare key
              // is missing.
              const { maxAvailable, lessonKey } = getClassSpecificTrophyInfo(lesson);
              const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
              const remaining = Math.max(0, maxAvailable - previouslyEarned);

              const trackedCompletedUnit = student.completedUnits?.[lessonKey] || 0;
              const derivedCompletedUnit = (effectiveUnitCountForDisplay > 0 && maxAvailable > 0)
                ? Math.min(effectiveUnitCountForDisplay, Math.ceil((previouslyEarned * effectiveUnitCountForDisplay) / maxAvailable))
                : 0;
              const completedUnit = Math.max(trackedCompletedUnit, derivedCompletedUnit);

              const latestSessionForLesson = completedSessions.find(
                s => s.studentUid === student.id && s.lessonTitle === lesson.title && typeof s.completedUnit === 'number' && s.completedUnit > 0
              );
              const showNowFinished = latestSessionForLesson && latestSessionForLesson.completedUnit < completedUnit;

              return (
                  <div className="mb-4 space-y-3">

                    {lesson.unitCount > 0 && (
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-indigo-800 font-bold mb-1">
                          Student Progress on this {anyClassForTrophy ? `${anyClassForTrophy.classId} ` : ''}Lesson:
                        </p>
                        {(() => {
                          const displayedCompleted = isAbhiForTrophy
                            ? (abhiStudentCount ?? completedUnit)
                            : isDhammaschoolForTrophy
                              ? (dhammaschoolStudentProgress?.completedCount ?? completedUnit)
                              : ssClassForTrophy
                                ? (ssStudentClassCount ?? completedUnit)
                                : (ssStudentTotalCount ?? completedUnit);
                          const displayedTotal = isAbhiForTrophy
                            ? (abhiTotalCount ?? effectiveUnitCountForDisplay)
                            : effectiveUnitCountForDisplay;
                          const unitLabel = (isAbhiForTrophy || isDhammaschoolForTrophy) ? 'Lesson' : (lesson.unitLabel || 'Lesson');
                          return displayedCompleted > 0 ? (
                            <p className="text-sm text-indigo-700">
                              {student.name} completed up to {unitLabel} {displayedCompleted} / {displayedTotal}.
                            </p>
                          ) : (
                            <p className="text-sm text-indigo-700">No progress reported yet for this lesson.</p>
                          );
                        })()}
                        {/* One-time correction tool — for lessons like Myanmar Reader that
                            don't have a live class API to pull the real number from, this
                            value is just whatever was last stored in completedUnits, which
                            can go stale (e.g. it briefly counted Sheet A and Sheet B as
                            separate chapters, doubling the number). Only shown when there's
                            no live-fetched count overriding it. */}
                        {!isAbhiForTrophy && !isDhammaschoolForTrophy && !ssClassForTrophy && ssStudentTotalCount == null && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-indigo-200">
                            <label className="text-xs text-indigo-700 font-semibold whitespace-nowrap">Fix Completed Chapter:</label>
                            <input
                              type="number" min="0"
                              value={completedUnitOverride}
                              onChange={(e) => setCompletedUnitOverride(e.target.value)}
                              placeholder={String(completedUnit)}
                              className="w-20 p-1.5 border-2 border-indigo-300 rounded-lg text-center font-bold text-indigo-900 text-sm"
                            />
                            <button
                              type="button"
                              disabled={isSavingCompletedUnit || completedUnitOverride === ''}
                              onClick={() => handleSetCompletedUnit(lessonKey)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isSavingCompletedUnit ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {maxAvailable > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-bold mb-2">
                          Trophy Status{anyClassForTrophy ? ` for ${anyClassForTrophy.classId}` : ' for this Lesson'}:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                          <li>Max Available: <strong>{maxAvailable}</strong></li>
                          <li>Previously Earned: <strong>{previouslyEarned}</strong></li>
                          <li>Remaining to Award: <strong>{remaining}</strong></li>
                        </ul>

                        {/* One-time correction tool — see handleSetPreviouslyEarned for why
                            this can't just be auto-recalculated from completed lessons. */}
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-yellow-200">
                          <label className="text-xs text-yellow-700 font-semibold whitespace-nowrap">Fix Previously Earned:</label>
                          <input
                            type="number" min="0" max={maxAvailable}
                            value={previouslyEarnedOverride}
                            onChange={(e) => setPreviouslyEarnedOverride(e.target.value)}
                            placeholder={String(previouslyEarned)}
                            className="w-20 p-1.5 border-2 border-yellow-300 rounded-lg text-center font-bold text-yellow-900 text-sm"
                          />
                          <button
                            type="button"
                            disabled={isSavingPreviouslyEarned || previouslyEarnedOverride === ''}
                            onClick={() => handleSetPreviouslyEarned(lessonKey, maxAvailable)}
                            className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs font-bold hover:bg-yellow-700 disabled:opacity-50"
                          >
                            {isSavingPreviouslyEarned ? 'Saving...' : 'Save'}
                          </button>
                        </div>

                        {/* Bulk one-click action: only shows in the "whole app" view (no
                            specific class chosen) — auto-confirms trophies for every class
                            this student has fully finished, so the teacher doesn't have to
                            enter "Fix Previously Earned" one class at a time. */}
                        {lesson.link === 'abhidhamma://' && !sendAbhidhammaClassId && (
                          <button
                            type="button"
                            disabled={isReconcilingAllClasses}
                            onClick={handleReconcileAllAbhidhammaClasses}
                            className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700 disabled:opacity-50 mb-3"
                          >
                            {isReconcilingAllClasses ? 'Checking every class...' : '⚡ Confirm trophies for every fully-completed class'}
                          </button>
                        )}
                        
                        {sendActionType === 'trophy' && remaining > 0 && (
                            <div className="flex items-center space-x-3 mt-3 border-t border-yellow-200 pt-3">
                                <label className="text-yellow-800 font-bold">Amount to Award:</label>
                                <input 
                                  type="number" min="1" max={remaining} 
                                  value={directTrophyAmount} 
                                  onChange={(e) => setDirectTrophyAmount(e.target.value)} 
                                  className="w-24 p-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-600 text-center font-bold text-yellow-900"
                                />
                            </div>
                        )}
                        {sendActionType === 'trophy' && remaining === 0 && (
                            <p className="text-red-500 font-bold mt-2">No trophies remaining to award for this lesson.</p>
                        )}
                      </div>
                    )}
                  </div>
              );
          })()}

          {sendActionType === 'lesson' ? (
             <button type="submit" className="w-full bg-indigo-500 text-white p-3 rounded-lg font-semibold hover:bg-indigo-600 transition-transform transform hover:scale-105 shadow-md">
               Assign Lesson
             </button>
          ) : (
             <button type="submit" className="w-full bg-yellow-500 text-white p-3 rounded-lg font-bold hover:bg-yellow-600 transition-transform transform hover:scale-105 shadow-md">
               Award Trophies Directly
             </button>
          )}
        </form>
      )}

      {viewMode === 'schedule' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleAddSchedule} className="bg-emerald-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-emerald-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Add Manual Schedule Entry</h3>
              <button type="button" onClick={() => setShowStarModal(true)} title="Announce Outstanding Student" className="text-2xl hover:scale-110 transition-transform">⭐</button>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Student Type</label>
              <select value={scheduleStudentType} onChange={(e) => setScheduleStudentType(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="online">Online Student</option>
                <option value="offline">Offline Student</option>
              </select>
            </div>
            
            {scheduleStudentType === 'online' ? (
              <div className="mb-4 relative">
                <label className="block text-gray-700 mb-2">Select Student</label>
                <input
                  type="text" value={scheduleStudentSearch}
                  onChange={(e) => {
                    setScheduleStudentSearch(e.target.value); 
                    if (scheduleSelectedStudentUid) setScheduleSelectedStudentUid(null); 
                    setIsScheduleDropdownOpen(true);
                  }}
                  onFocus={() => setIsScheduleDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsScheduleDropdownOpen(false), 200)} 
                  placeholder="Type to search..." className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isScheduleDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredScheduleStudents.length > 0 ? (
                      filteredScheduleStudents.map(student => (
                        <div
                          key={student.id} onClick={() => { setScheduleStudentSearch(student.name); setScheduleSelectedStudentUid(student.id); setIsScheduleDropdownOpen(false); hasAutoSelectedScheduleStudentRef.current = true; }}
                          className="p-3 hover:bg-indigo-50 cursor-pointer"
                        >
                          {student.name} ({student.displayId})
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500">No students found.</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Student Name</label>
                <input type="text" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)} placeholder="e.g., Offline Student" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Date</label>
              <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Start Time</label>
                <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">End Time</label>
                <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div className="mb-4 space-y-2">
              <div className="flex items-center">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label className="ml-2 block text-sm text-gray-900">Repeat weekly</label>
              </div>
              {isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeat until</label>
                  <input type="date" value={recurEndDate} onChange={(e) => setRecurEndDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md">
              Add to Schedule
            </button>
          </form>
          
          <div className="space-y-8">
            {expiringSchedules.length > 0 && (
              <div className="bg-yellow-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-yellow-300">
                <h3 className="text-xl font-semibold mb-4 text-yellow-800">Schedules Needing Renewal</h3>
                <p className="text-sm text-yellow-700 mb-4">The following weekly schedules will expire within 2 weeks.</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {expiringSchedules.map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold">{entry.studentName}</p>
                        <p className="text-sm text-gray-600">Expires on: {formatTimestamp(entry.startTime)}</p>
                      </div>
                      <button onClick={() => handleRenewSchedule(entry)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 shadow-md text-sm flex-shrink-0 w-full sm-w-auto">
                        Renew
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          
            <div className="bg-emerald-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-emerald-200">
               <h3 className="text-xl font-semibold mb-4 text-gray-800">Upcoming Scheduled Sessions</h3>
               <div className="space-y-3 max-h-96 overflow-y-auto">
                 {futureScheduleEntries.length === 0 ? <p>No upcoming sessions.</p> :
                  futureScheduleEntries.map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{entry.studentName}</p>
                          <p className="text-sm text-gray-600">{formatTimestamp(entry.startTime)}</p>
                          {entry.isRecurring && (
                            <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Recurring</span>
                          )}
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openDeleteModal(entry.id, entry.studentName, 'teacherSchedule')} className="text-red-500 hover:text-red-700" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                       </div>
                    </div>
                  ))
                 }
               </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleCreateGroup} className="bg-cyan-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-cyan-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Group</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Group Name</label>
              <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Grade 10A" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <button type="submit" className="w-full bg-cyan-500 text-white p-3 rounded-lg font-semibold hover:bg-cyan-600 transition-transform transform hover:scale-105 shadow-md">
              Create Group
            </button>
          </form>
          
          <div className="bg-cyan-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-cyan-200">
             <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage Groups</h3>
             <div className="space-y-6 max-h-[600px] overflow-y-auto">
               {groups.length === 0 ? <p>No groups created yet.</p> : (
                 groups.map(group => (
                   <div key={group.id} className="bg-white p-4 rounded-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="text-lg font-semibold text-cyan-800">{group.groupName}</h4>
                       <button onClick={() => openDeleteModal(group.id, group.groupName, 'group')} className="text-red-500 hover:text-red-700" title="Delete Group">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                     </div>
                     <p className="text-sm text-gray-600 mb-3">Add or remove students from this group:</p>
                     <div className="space-y-2 max-h-48 overflow-y-auto">
                       {students.filter(s => s.isActive).map(student => {
                         const isChecked = group.studentUids.includes(student.id);
                         return (
                           <label key={student.id} className="flex items-center p-2 bg-gray-50 rounded-lg">
                             <input type="checkbox" checked={isChecked} onChange={(e) => handleToggleStudentInGroup(group.id, student.id, e.target.checked)} className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                             <span className="ml-3 text-gray-800">{student.name} ({student.displayId})</span>
                           </label>
                         );
                       })}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      {viewMode === 'settings' && (
        <div className="bg-violet-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-violet-200 max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Data Management</h3>
          <p className="text-sm text-gray-600 mb-6">Your data is stored securely in the cloud. You can download a backup of your data as a JSON file.</p>

          <div className="mb-8 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <h4 className="text-lg font-semibold mb-2 text-orange-800">🔧 Missing Lesson Bank / Schedule / Groups?</h4>
            <p className="text-sm text-gray-700 mb-3">
              If you were ever locked out and had teacher access recovered, your existing data may still be tagged with your old account ID and won't show up. This finds and re-tags it to your current account — safe to run any time, even if nothing needs fixing.
            </p>
            <button onClick={handleRepairTeacherUid} disabled={isRepairingData} className="w-full bg-orange-500 text-white p-3 rounded-lg font-semibold hover:bg-orange-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50">
              {isRepairingData ? 'Repairing...' : 'Repair My Data'}
            </button>
          </div>
          
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Export Data</h4>
            <p className="text-sm text-gray-600 mb-4">Download all your data as a JSON file.</p>
            <button onClick={handleExportData} disabled={isExporting} className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50">
              {isExporting ? 'Exporting...' : 'Download Data Backup'}
            </button>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Import Data</h4>
            <p className="text-sm text-red-600 font-medium mb-4">Warning: This action will import and overwrite existing data. Cannot be undone.</p>
            <input 
              type="file" accept=".json" ref={importFileRef} onChange={handleImportFileSelect} disabled={isImporting}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            {isImporting && <p className="text-indigo-600 mt-4">Importing data, please wait...</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔍 Trophy Data Audit</h4>
            <p className="text-sm text-gray-600 mb-4">
              Read-only checks — nothing here writes any data. Use this to find other trophy mix-ups without checking every student one by one.
            </p>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Scan for impossible trophy counts</p>
              <p className="text-sm text-gray-500 mb-3">Flags any student whose earned trophies for a lesson exceed that lesson's own Max Available — a state that should never happen.</p>
              <button
                onClick={runLiveTrophyAudit}
                disabled={isRunningTrophyAudit}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningTrophyAudit ? 'Scanning...' : 'Scan Live Data'}
              </button>
              {trophyAuditResults?.liveScanDone && (
                trophyAuditResults.impossibleStates.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ No impossible trophy counts found.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {trophyAuditResults.impossibleStates.map((f, i) => (
                      <div key={i} className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                        <strong>{f.studentName}</strong> — {f.lessonTitle}: has <strong className="text-red-700">{f.liveValue}</strong> trophies, but Max Available is only <strong>{f.max}</strong>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Compare against an old backup</p>
              <p className="text-sm text-gray-500 mb-3">Upload a previous "Download Data Backup" file (matched by student name) to see exactly which trophy/lesson numbers differ from right now — this doesn't touch live data at all, it just shows the differences.</p>
              <input
                type="file" accept=".json" ref={auditBackupFileRef} onChange={handleAuditBackupFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 mb-3"
              />
              {auditBackupFileName && (
                <p className="text-xs text-gray-500 mb-3">Selected: {auditBackupFileName}</p>
              )}
              <button
                onClick={runBackupComparisonAudit}
                disabled={isRunningTrophyAudit || !auditBackupFileContent}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningTrophyAudit ? 'Comparing...' : 'Compare to Old Backup'}
              </button>
              {trophyAuditResults?.backupComparison && (
                trophyAuditResults.backupComparison.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ No differences found — everything matches the old backup.</p>
                ) : (
                  <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                    {trophyAuditResults.backupComparison.map((f, i) => (
                      <div key={i} className={`text-sm rounded-lg p-2 border ${f.type === 'missing_student' ? 'bg-gray-50 border-gray-200' : f.lostData ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        {f.type === 'missing_student' ? (
                          <><strong>{f.studentName}</strong> — in the old backup, but no matching student found live (name may have changed).</>
                        ) : (
                          <>
                            <strong>{f.studentName}</strong> — {f.field === 'earnedTrophies' ? 'trophies' : 'completed'} for "{f.key}": old backup had <strong className={f.lostData ? 'text-red-700' : ''}>{f.oldValue}</strong>, live now has <strong>{f.liveValue}</strong>
                            {f.lostData && <span className="ml-1 text-red-700 font-semibold">— possible data loss</span>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into Smart Study</h4>
            <p className="text-sm text-gray-600 mb-4">
              One-time move for 4 old Gemini-link lessons ("10 Parami", "Heavenly World or Golden cage", "38 Blessings", "The Buddha's Eight Outer Victories") into the real per-class Smart Study tracking. Step 1 only calculates and shows a preview — nothing is written until you press Apply. Step 2 (deleting the old lessons) is separate and only removes them from the Lesson Bank; it never touches any student's already-earned trophies.
            </p>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview the Smart Study trophy migration</p>
              <p className="text-sm text-gray-500 mb-3">For every affected student, checks their real live progress in each mapped Smart Study class (or uses the old fixed number only if that class has no Smart Study tracking at all), and shows what would change.</p>
              <button
                onClick={runSmartStudyMigrationPreview}
                disabled={isRunningSsMigration}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningSsMigration ? 'Calculating...' : 'Run Migration Preview'}
              </button>

              {ssMigrationPreview && (
                <div className="mt-4">
                  {ssMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these 4 old lessons.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left border">Student</th>
                              <th className="p-2 text-left border">Old Lesson</th>
                              <th className="p-2 text-left border">→ Class</th>
                              <th className="p-2 text-left border">Basis</th>
                              <th className="p-2 text-left border">Current New</th>
                              <th className="p-2 text-left border">Proposed New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ssMigrationPreview.rows.map((r, i) => (
                              <tr key={i} className={r.willChange ? 'bg-emerald-50' : ''}>
                                <td className="p-2 border">{r.studentName}</td>
                                <td className="p-2 border">{r.oldTitle.trim()}</td>
                                <td className="p-2 border">{r.classId}</td>
                                <td className="p-2 border">
                                  {r.basis === 'live'
                                    ? `live (${r.liveCompleted}/${r.liveTotal} lessons)`
                                    : <span className="text-amber-700">fallback (no live class found)</span>}
                                </td>
                                <td className="p-2 border">{r.currentNew}</td>
                                <td className="p-2 border font-semibold">
                                  {r.proposedNew}{r.willChange && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={applySmartStudyMigration}
                        disabled={isApplyingSsMigration || ssMigrationPreview.rows.every(r => !r.willChange)}
                        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingSsMigration ? 'Applying...' : `Apply — set ${ssMigrationPreview.rows.filter(r => r.willChange).length} value(s)`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the 4 old lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data.</p>
              <button
                onClick={handleDeleteOldSmartStudyLessons}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔑 Teacher Account Recovery Passcode</h4>
            <p className="text-sm text-gray-600 mb-2">
              Teacher access is normally tied to this browser/device. If you ever get logged out (cleared browser data, new device, etc.), this passcode lets you reclaim teacher access instead of needing a database edit.
            </p>
            <p className="text-sm font-semibold mb-4">
              {teacherConfigData?.passcode
                ? <span className="text-emerald-600">✓ A recovery passcode is set.</span>
                : <span className="text-red-600">⚠ No recovery passcode set yet — set one now so you're never locked out.</span>}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={recoveryPasscodeInput}
                onChange={(e) => setRecoveryPasscodeInput(e.target.value)}
                placeholder={teacherConfigData?.passcode ? 'New passcode (replaces old one)' : 'Choose a passcode'}
                className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleSaveRecoveryPasscode}
                disabled={recoveryPasscodeSaving}
                className="px-5 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50 flex-shrink-0"
              >
                {recoveryPasscodeSaving ? 'Saving...' : (teacherConfigData?.passcode ? 'Change' : 'Set Passcode')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'reports' && (
        <div className="space-y-6">
          <div className="flex space-x-4 mb-2">
            <button
              onClick={() => setReportTab('feedback')}
              className={`px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${reportTab === 'feedback' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'}`}
            >
              Feedback Reports
            </button>
            <button
              onClick={() => setReportTab('attendance')}
              className={`px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${reportTab === 'attendance' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
            >
              Attendance Reports
            </button>
          </div>

          {reportTab === 'feedback' && (() => {
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
            const recentSessions = showAllReports
              ? completedSessions
              : completedSessions.filter(s => s.endTime.toDate() >= oneMonthAgo);
            const hiddenCount = completedSessions.length - recentSessions.length;

            return (
              <div className="bg-amber-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-amber-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Student Feedback Reports</h3>
                {!showAllReports && (
                  <p className="text-sm text-gray-600 mb-4">Showing reports from the last 30 days.</p>
                )}
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {recentSessions.length === 0 ? <p className="text-gray-500 font-medium">No feedback yet.</p> :
                    recentSessions.map(session => {
                      const student = students.find(s => s.id === session.studentUid);
                      return (
                        <div key={session.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-900">
                            {session.lessonTitle}
                            {session.lessonLink && extractSmartStudyClassId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractSmartStudyClassId(session.lessonLink)}</span>
                            )}
                            {session.lessonLink && session.lessonLink.startsWith('abhidhamma://') && extractAbhidhammaLessonId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractAbhidhammaLessonId(session.lessonLink)}</span>
                            )}
                            {session.lessonLink && session.lessonLink.startsWith('dhammaschool://') && extractDhammaschoolClassId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractDhammaschoolClassId(session.lessonLink)}</span>
                            )}
                          </p>
                          <p className="text-sm font-medium text-indigo-700">Student: {student ? student.name : 'Unknown'}</p>
                          <p className="text-sm text-gray-600">Completed: {formatTimestamp(session.endTime)}</p>
                          <p className="text-sm text-gray-600">Duration: {getDuration(session.startTime, session.endTime)}</p>
                          <div className="mt-2 p-3 bg-white rounded-lg border">
                            <p className="text-sm font-semibold">Feedback:</p>
                            <p className="text-sm text-gray-700 mb-1">{session.feedbackNotes || 'N/A'}</p>
                            <p className="text-sm font-semibold mt-2">Score:</p>
                            <p className="text-sm text-gray-700">{session.score || 'N/A'}</p>
                            {session.completedUnit && session.completedUnit > 0 ? (
                              <p className="text-sm font-semibold text-indigo-600 mt-2">
                                {student ? student.name : 'This student'} completed up to {session.lessonUnitLabel || 'Chapter'} {Math.max(session.previousCompletedUnit || 0, session.completedUnit)}{session.lessonUnitCount ? ` / ${session.lessonUnitCount}` : ''}.
                                {session.completedUnit < (session.previousCompletedUnit || 0) && (
                                  <> Now finished {session.lessonUnitLabel || 'Chapter'} {session.completedUnit}.</>
                                )}
                              </p>
                            ) : null}
                            {session.awardedTrophies && session.awardedTrophies > 0 ? (
                              <p className="text-sm font-semibold text-yellow-600 mt-2">🏆 Trophies Awarded: {session.awardedTrophies}</p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
                {!showAllReports && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllReports(true)}
                    className="mt-4 w-full bg-amber-500 text-white p-3 rounded-lg font-semibold hover:bg-amber-600 shadow-md"
                  >
                    Show Older Reports ({hiddenCount} more)
                  </button>
                )}
                {showAllReports && (
                  <button
                    onClick={() => setShowAllReports(false)}
                    className="mt-4 w-full bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-400 shadow-md"
                  >
                    Show Only Last 30 Days
                  </button>
                )}
              </div>
            );
          })()}

          {reportTab === 'attendance' && (
            <AttendanceReports students={students} teacherSchedule={teacherSchedule} sessions={sessions} />
          )}
        </div>
      )}

      {viewMode === 'students' && (
        <div className="bg-rose-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-rose-200">
          
          {trophyRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-yellow-800">
                🏆 Trophy Requests <span className="ml-3 text-base font-normal">({trophyRequests.length} pending)</span>
              </h3>
              <div className="space-y-4">
                {trophyRequests.map(student => {
                  const amount = student.requestedTrophyAmount || 1;
                  const lessonTitle = student.requestedTrophyLessonTitle || 'a lesson';
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-yellow-100 border border-yellow-300 shadow-sm">
                      <div>
                        <p className="font-bold text-yellow-900 text-lg">{student.name} is requesting {amount > 1 ? `${amount} Trophies` : 'a Trophy'} for "{lessonTitle}"!</p>
                        <p className="text-sm text-yellow-700 mt-1 font-semibold">Current Total: {student.trophyCount || 0}</p>
                      </div>
                      <div className="flex space-x-3 mt-3 sm:mt-0">
                        <button 
                          onClick={() => handleApproveTrophy(student.id, student.name, amount, student.requestedTrophyLessonTitle, student.requestedTrophySessionId, student.requestedTrophyLessonLink)} 
                          className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md bg-yellow-500 hover:bg-yellow-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectTrophy(student.id, student.requestedTrophySessionId, student.requestedTrophyLessonTitle, student.requestedTrophyLessonLink)}
                          className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md bg-gray-400 hover:bg-gray-500 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingStudents.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Pending Student Accounts <span className="ml-3 text-base font-normal text-yellow-700">({pendingStudents.length} waiting)</span>
              </h3>
              <div className="space-y-4">
                {pendingStudents.map(student => (
                  <div key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div>
                      <p className="font-semibold text-yellow-900">{student.name}</p>
                      <p className="text-sm text-gray-600">ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md">{student.displayId}</span></p>
                    </div>
                    <div className="flex space-x-3 mt-2 sm:mt-0">
                      <button onClick={() => handleApproveStudent(student.id)} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-md bg-emerald-500 hover:bg-emerald-600">Approve</button>
                      <button onClick={() => openDeleteModal(student.id, student.name, 'student')} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-md bg-red-500 hover:bg-red-600">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Current Students <span className="ml-3 text-base font-normal text-gray-600">(Total: {totalStudents}, Active: {activeStudents})</span>
            </h3>
            <div className="space-y-4">
              {currentStudents.map(student => (
                <div key={student.id} className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg ${student.isActive ? 'bg-white' : 'bg-gray-100'}`}>
                  <button onClick={() => openAttendanceModal(student)} disabled={!student.isActive || !student.displayId} className="text-left w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="flex items-center">
                      <p className={`font-semibold text-lg ${student.isActive ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-500 line-through'}`}>{student.name}</p>
                      {student.trophyCount > 0 && (
                        <span className="ml-3 text-2xl" title={`${student.trophyCount} Trophies`}>🏆 <span className="text-lg font-bold text-yellow-600">{student.trophyCount}</span></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md">{student.displayId}</span></p>
                  </button>
                  {student.pendingName && (
                    <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:ml-3 flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2">
                      <span className="text-yellow-800 text-sm font-semibold">
                        Wants to rename to "<strong>{student.pendingName}</strong>"
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleApproveNameChange(student.id, student.pendingName); }} className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectNameChange(student.id); }} className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600">Reject</button>
                    </div>
                  )}
                  <div className="flex space-x-3 mt-2 sm:mt-0">
                    <button onClick={() => handleToggleStudentActive(student.id, student.isActive)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${student.isActive ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-red-700'}`}>
                      {student.isActive ? 'Active' : 'Deactivated'}
                    </button>
                    <button onClick={() => openDeleteModal(student.id, student.name, 'student')} title="Delete Permanently" className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-opacity shadow-md bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'bank' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleSaveLessonToBank} className="bg-sky-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">{editingLessonId ? 'Edit Lesson' : 'Lesson Bank Management'}</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Lesson Title</label>
              <input type="text" value={newBankLessonTitle} onChange={(e) => setNewBankLessonTitle(e.target.value)} placeholder="e.g., Algebra Chapter 1" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mb-4 relative">
              <label className="block text-gray-700 mb-2">Lesson Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBankLessonLink.startsWith('smartstudy://') ? '' : newBankLessonLink}
                  onChange={(e) => setNewBankLessonLink(e.target.value)}
                  placeholder="https://..."
                  disabled={newBankLessonLink.startsWith('smartstudy://')}
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowLinkPicker(v => !v)}
                  className="px-4 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 shadow-md flex-shrink-0"
                  title="Choose an app, or enter a link manually"
                >
                  🔗 ▾
                </button>
              </div>
              {newBankLessonLink.startsWith('smartstudy://') && (() => {
                const cId = extractSmartStudyClassId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-sky-800 font-semibold">📚 Smart Study app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink.startsWith('abhidhamma://') && (() => {
                const cId = extractAbhidhammaLessonId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-amber-800 font-semibold">📚 Abhidhamma app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink.startsWith('dhammaschool://') && (() => {
                const cId = extractDhammaschoolClassId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-orange-800 font-semibold">📖 Dhammaschool app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink === 'readingmyanmar://' && (
                <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-blue-800 font-semibold">📚 Reading Myanmar app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}
              {newBankLessonLink === 'speakingmyanmar://' && (
                <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-orange-800 font-semibold">🗣️ Speaking Myanmar app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}
              {newBankLessonLink === 'myanmarpart1and2://' && (
                <div className="mt-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-indigo-800 font-semibold">📘 Myanmar Part 1 & 2 app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}

              {showLinkPicker && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl p-3 max-h-96 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setShowLinkPicker(false)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 border border-gray-200 mb-2 font-semibold text-gray-700"
                  >
                    ✏️ Input link manually
                  </button>
                  <p className="text-xs text-gray-500 font-semibold mt-3 mb-1 uppercase">Or choose app</p>
                  {/* Class ID is chosen later, at Assign Lesson time — not here.
                      That way one Lesson Bank entry can be sent to any class.
                      "Total Number" is still auto-filled immediately though —
                      it's set to the app's whole lesson count (summed across
                      every class), since Trophy Status and other calculations
                      key off of it before a specific class is even chosen. */}
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('smartstudy://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Smart Study Lesson');
                      setShowLinkPicker(false);
                      const list = await loadSmartStudyClassList();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-sky-50 border border-transparent hover:border-sky-200 font-semibold text-gray-800"
                  >
                    📚 Smart Study app
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('abhidhamma://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Abhidhamma Lesson');
                      setShowLinkPicker(false);
                      const list = await loadAbhidhammaClasses();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 font-semibold text-gray-800 mt-1"
                  >
                    📚 Abhidhamma app
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('dhammaschool://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Dhammaschool Lesson');
                      setShowLinkPicker(false);
                      const list = await loadDhammaschoolClasses();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 font-semibold text-gray-800 mt-1"
                  >
                    📖 Dhammaschool app
                  </button>
                  {/* Myanmar Speaking app and Myanmar Reader app don't have Firestore-backed
                      classes/lessons like the other three — they're simple external apps, so
                      picking them just sets the Lesson Bank link directly to their real hosted
                      URL. handleStartLesson's generic http(s) fallback opens them like any
                      other plain link (still gets a study session + Report button, same as
                      any external URL lesson). */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!MYANMAR_SPEAKING_APP_URL) {
                        alert('Myanmar Speaking app URL is not set up yet.');
                        return;
                      }
                      setNewBankLessonLink(MYANMAR_SPEAKING_APP_URL);
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Myanmar Speaking Lesson');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-purple-50 border border-transparent hover:border-purple-200 font-semibold text-gray-800 mt-1"
                  >
                    🗣️ Myanmar Speaking app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!MYANMAR_READER_APP_URL) {
                        alert('Myanmar Reader app URL is not set up yet.');
                        return;
                      }
                      setNewBankLessonLink(MYANMAR_READER_APP_URL);
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Myanmar Reader Lesson');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-teal-50 border border-transparent hover:border-teal-200 font-semibold text-gray-800 mt-1"
                  >
                    📗 Myanmar Reader app
                  </button>
                  {/* Consonant Practice and Burmese Consonant Game are mounted
                      inline (like SmartStudy/Abhidhamma/Dhammaschool), not real
                      hosted URLs — so they get their own custom link scheme,
                      handled specially in handleStartLesson/Continue, same
                      idea as smartstudy://, abhidhamma://, dhammaschool://. */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('readingmyanmar://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('📚 Reading Myanmar app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 font-semibold text-gray-800 mt-1"
                  >
                    📚 Reading Myanmar app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('speakingmyanmar://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('🗣️ Speaking Myanmar app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 font-semibold text-gray-800 mt-1"
                  >
                    🗣️ Speaking Myanmar app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('myanmarpart1and2://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('📘 Myanmar Part 1 & 2 app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 font-semibold text-gray-800 mt-1"
                  >
                    📘 Myanmar Part 1 & 2 app
                  </button>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Details / Instructions</label>
              <input type="text" value={newBankLessonDetails} onChange={(e) => setNewBankLessonDetails(e.target.value)} placeholder="e.g., Complete the workbook" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 mb-2">Unit Name</label>
                <select value={newBankLessonUnitLabel} onChange={(e) => setNewBankLessonUnitLabel(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Chapter">Chapter</option>
                  <option value="Lesson">Lesson</option>
                  <option value="Level">Level</option>
                  <option value="Unit">Unit</option>
                  <option value="Page">Page</option>
                  <option value="Poem">Poem</option>
                  <option value="Movie">Movie</option>
                  <option value="Story">Story</option>
                  <option value="Game">Game</option>
                  <option value="Minute">Minute</option>
                  <option value="Old">Old</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Total Number
                  {(newBankLessonLink.startsWith('smartstudy://') || newBankLessonLink.startsWith('abhidhamma://') || newBankLessonLink.startsWith('dhammaschool://')) && (
                    <span className="ml-2 text-xs font-normal text-emerald-600">(auto-filled: total lessons across the whole app)</span>
                  )}
                </label>
                <input type="number" min="0" value={newBankLessonUnitCount} onChange={(e) => setNewBankLessonUnitCount(e.target.value)} placeholder="e.g., 20" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Max Trophies Available</label>
              <input type="number" min="0" value={newBankLessonTrophyLimit} onChange={(e) => setNewBankLessonTrophyLimit(e.target.value)} placeholder="0 for none" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {parseInt(newBankLessonTrophyLimit) > 0 && parseInt(newBankLessonUnitCount) > 0 && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  {(() => {
                    const tCount = parseInt(newBankLessonTrophyLimit);
                    const uCount = parseInt(newBankLessonUnitCount);
                    const rate = tCount / uCount;
                    if (rate >= 1) {
                      const rounded = Math.round(rate * 10) / 10;
                      return `Every 1 ${newBankLessonUnitLabel} completed ≈ ${rounded} Trophy(s).`;
                    }
                    return `Every ${Math.ceil(uCount / tCount)} ${newBankLessonUnitLabel}(s) completed = 1 Trophy.`;
                  })()}
                </p>
              )}
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md">
              {editingLessonId ? 'Update Lesson' : 'Add to Bank'}
            </button>
            {editingLessonId && (
              <button type="button" onClick={() => setEditingLessonId(null)} className="w-full bg-gray-500 text-white p-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors mt-3 shadow-md">
                Cancel Edit
              </button>
            )}
          </form>
          
          <div className="bg-sky-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-sky-200">
             <h3 className="text-xl font-semibold mb-4 text-gray-800">Lesson Bank List</h3>
             <div className="space-y-3 max-h-96 overflow-y-auto">
               {lessonBank.length === 0 ? <p>No lessons in bank.</p> : 
                lessonBank.map(l => (
                  <div 
                    key={l.id} 
                    draggable
                    onDragStart={() => handleLessonDragStart(l)}
                    onDragEnd={handleLessonDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleLessonDrop(l)}
                    className={`bg-white p-3 rounded-lg group cursor-move ${mergeSourceId === l.id ? 'ring-2 ring-purple-500 opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <button
                        onClick={() => openLink(l.link)}
                        className="text-left w-full"
                        title="Click to open link. Drag onto another lesson to merge."
                      >
                        <p className="font-semibold group-hover:text-indigo-600 transition-colors">
                          {l.title} {l.trophyLimit > 0 && <span className="ml-2 text-sm text-yellow-600">🏆 Max: {l.trophyLimit}</span>}
                        </p>
                        <p className="text-sm text-gray-600">{l.details}</p>
                        <p className="text-sm text-indigo-600 truncate">{l.link}</p>
                      </button>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setEditingLessonId(l.id)} className="text-indigo-600 hover:text-indigo-800" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => openDeleteModal(l.id, l.title, 'lessonBank')} className="text-red-500 hover:text-red-700" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
               }
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Auto-tracks how many Smart Study lessons a student has completed for a
// given class, directly from Smart Study's own quizCompletions collection —
// no manual "Report" needed for smartstudy:// linked lessons.
//
// The studentName passed in is the Tutoring profile name. After a student
// links their Tutoring & Smart Study accounts the roster entry may have been
// renamed, so we also look up the Smart Study roster name (the name used in
// quizCompletions) via the classRoster collection and query with whichever
// name(s) appear there, falling back to the Tutoring name if nothing is found.
function SmartStudyProgressBadge({ classId, studentName, smartStudyNames, compact, onCountChange }) {
  const [completedCount, setCompletedCount] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [badError, setBadError] = useState(false);

  useEffect(() => {
    if (!classId || !studentName) return;
    if (classId.includes('/')) { setBadError(true); return; }

    // Names we know about synchronously (no Firestore round-trip needed).
    // smartStudyNames[classId] is the old SmartStudy name stored at link time.
    const profileSmartStudyName = smartStudyNames?.[classId] || null;
    const initialNames = [...new Set([studentName, profileSmartStudyName].filter(Boolean))];

    const distinctIds = new Set();
    const unsubs = [];
    let live = true; // false once cleanup runs
    let settled = 0;
    // totalExpected starts at initialNames.length; if a roster fetch adds a
    // new name later we increment it first so we don't publish prematurely.
    let totalExpected = initialNames.length;

    const trySetCount = () => {
      if (settled >= totalExpected) setCompletedCount(distinctIds.size);
    };

    const addNameSubscription = (name) => {
      if (!name || !live) return;
      try {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'quizCompletions'),
          where('classId', '==', classId),
          where('studentName', '==', name)
        );
        let firstFire = true;
        const unsub = onSnapshot(q, (snap) => {
          snap.docs.forEach(d => distinctIds.add(d.data().lessonId));
          if (firstFire) { firstFire = false; settled++; }
          trySetCount();
        }, (err) => {
          console.error('Error loading Smart Study completions:', err);
          if (firstFire) { firstFire = false; settled++; }
          trySetCount();
        });
        unsubs.push(unsub);
      } catch (err) {
        console.error('Error setting up Smart Study progress listener:', err);
        settled++;
        trySetCount();
      }
    };

    // Subscribe immediately with known names
    initialNames.forEach(name => addNameSubscription(name));

    // Also do a non-blocking roster lookup to pick up old-linked students
    // whose profile pre-dates the smartStudyNames field (they were linked before
    // smartStudyNames was added, so their old SmartStudy name isn't in the profile
    // but IS in the roster doc).
    if (!profileSmartStudyName) {
      totalExpected++; // hold count until roster check completes
      const rosterRef = doc(
        db, 'artifacts', appId, 'public', 'data', 'classRoster',
        `${classId}_${encodeURIComponent(studentName)}`
      );
      getDoc(rosterRef).then(snap => {
        if (!live) return;
        const rosterName = snap.exists() ? snap.data().studentName : null;
        if (rosterName && !initialNames.includes(rosterName)) {
          // Found a distinct old name — subscribe for it
          totalExpected++; // one more name to settle
          addNameSubscription(rosterName);
        }
        settled++; // roster check itself is now settled
        trySetCount();
      }).catch(() => {
        if (!live) return;
        settled++;
        trySetCount();
      });
    }

    return () => {
      live = false;
      unsubs.forEach(u => u());
    };
  }, [classId, studentName, smartStudyNames]);

  // Notify parent of count changes so lessons can compute 'Start/Continue Lesson X'
  useEffect(() => {
    if (completedCount !== null && onCountChange) onCountChange(completedCount);
  }, [completedCount, onCountChange]);

  useEffect(() => {
    if (!classId || classId.includes('/')) return;
    try {
      getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'classes', classId))
        .then(snap => setTotalCount(snap.exists() ? (snap.data().lessons || []).length : null))
        .catch(() => setTotalCount(null));
    } catch (err) {
      console.error('Error fetching Smart Study class:', err);
    }
  }, [classId]);

  // Trophies for Smart Study now only ever come through the same "Report" +
  // Lesson-completed flow as every other linked app (Abhidhamma/
  // Dhammaschool/Myanmar Reader) — this used to also auto-request trophies
  // live, straight from this badge, the moment completedCount crossed a
  // threshold, entirely separate from the Report button. That caused a
  // request loop: rejecting a request only cleared trophyRequested, it never
  // advanced completedUnits, so the very next re-render saw "not yet
  // requested" again and immediately fired a fresh request — denying it did
  // nothing but produce another identical request a moment later. Removed
  // for good; see handleSubmitFeedback for the one real path a Smart Study
  // trophy request can come from now.

  if (badError) return null;
  if (completedCount === null) return null;
}

function StudentDashboard({ user, studentProfile, studentUid, announcements, onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenMyanmarSpeaking, onOpenConsonantPractice, onOpenBurmeseGame, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2, onLogout }) {
  const [myLessons, setMyLessons] = useState([]);
  const [ssCompletionCounts, setSsCompletionCounts] = useState({}); // classId → SmartStudy completedCount
  const [mySessions, setMySessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [score, setScore] = useState('');
  const [requestTrophyChecked, setRequestTrophyChecked] = useState(false);
  const [requestTrophyAmount, setRequestTrophyAmount] = useState(1);
  const [completedUnitInput, setCompletedUnitInput] = useState('');
  const [todayCompletedInput, setTodayCompletedInput] = useState('');
  const [trophyTapCount, setTrophyTapCount] = useState(0);
  const [redoSession, setRedoSession] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [elapsedTick, setElapsedTick] = useState(Date.now());
  // Shown once each time a student lands on their dashboard ("enters the
  // classroom"); initial value true (not a useEffect) is exactly "show on
  // this mount only" -- switching away and back to 'student' remounts this
  // component so it reappears next time too, matching a fresh greeting.
  const [showGreetingPrompt, setShowGreetingPrompt] = useState(true);

  const handleGreetTeacher = async () => {
    setShowGreetingPrompt(false);
    try {
      await addDoc(greetingsCollection, {
        studentUid,
        studentName: studentProfile?.name || 'Student',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error sending greeting:', e);
    }
  };

const getEffectivePreviousUnit = (lessonKey, sessionForCalc) => {
    const session = sessionForCalc || activeSession;
    if (!session) return 0;
    const unitCount = session.lessonUnitCount || 0;
    const trophyLimit = session.lessonTrophyLimit || 0;
    const completedUnitsMap = studentProfile.completedUnits || {};
    const tracked = completedUnitsMap[lessonKey] || 0;
    if (unitCount > 0 && trophyLimit > 0) {
      const earnedTrophiesMap = studentProfile.earnedTrophies || {};
      const earned = earnedTrophiesMap[lessonKey] || 0;
      const derived = Math.min(unitCount, Math.ceil((earned * unitCount) / trophyLimit));
      return Math.max(tracked, derived);
    }
    return tracked;
  };
  const handleCompletedUnitChange = (value, skipTodaySync) => {
    setCompletedUnitInput(value);
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    const unitCount = targetSession.lessonUnitCount || 0;
    const trophyLimit = targetSession.lessonTrophyLimit || 0;

    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    const enteredUnit = parseInt(value) || 0;

    if (!skipTodaySync) {
      setTodayCompletedInput(String(Math.max(0, enteredUnit - previousHighestUnit)));
    }

    if (unitCount <= 0 || trophyLimit <= 0) return;

    const earnedTrophiesMap = studentProfile.earnedTrophies || {};
    const previouslyEarned = earnedTrophiesMap[lessonKey] || 0;
    const effectiveUnit = Math.max(previousHighestUnit, enteredUnit);

    const deservedSoFar = Math.min(trophyLimit, Math.floor((effectiveUnit * trophyLimit) / unitCount));
    const newlyAvailable = Math.max(0, deservedSoFar - previouslyEarned);

    setRequestTrophyAmount(newlyAvailable > 0 ? newlyAvailable : 1);
    setRequestTrophyChecked(newlyAvailable > 0);
  };

  const handleTodayCountChange = (value) => {
    setTodayCompletedInput(value);
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    const unitCount = targetSession.lessonUnitCount || 0;
    const todayCount = parseInt(value) || 0;
    let newUnit = previousHighestUnit + todayCount;
    if (unitCount > 0) newUnit = Math.min(unitCount, newUnit);
    handleCompletedUnitChange(String(newUnit), true);
  };
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameText, setEditingNameText] = useState('');

  const [praiseModalInfo, setPraiseModalInfo] = useState({ isOpen: false, newTrophy: false, totalTrophies: 0, message: '', emoji: '' });
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const [isLessonOverlayOpen, setIsLessonOverlayOpen] = useState(false);
  const [heartsAnimGivers, setHeartsAnimGivers] = useState([]);
  const hasCheckedHeartsRef = useRef(false);

  useEffect(() => {
    if (studentProfile) {
      setEditingNameText(studentProfile.name || '');
      
      if (studentProfile.justEarnedTrophy) {
        playSound(0);
        setPraiseModalInfo({ 
          isOpen: true, 
          newTrophy: true, 
          totalTrophies: studentProfile.trophyCount, 
          message: "Congratulations!", 
          emoji: '🏆' 
        });
        
        const resetTrophyFlag = async () => {
          try {
            await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), {
              justEarnedTrophy: false
            });
          } catch(e) {}
        };
        resetTrophyFlag();
      }
    }
  }, [studentProfile, studentUid]);

  useEffect(() => {
    if (hasCheckedHeartsRef.current) return;
    if (!studentProfile) return;
    hasCheckedHeartsRef.current = true;

    const currentHearts = studentProfile.heartsReceived || 0;
    const seenHearts = studentProfile.heartsSeenCount || 0;

    if (currentHearts <= seenHearts) return;

    const heartsFromCountsNow = studentProfile.heartsFromCounts || {};
    const giverKeysNow = [...new Set(Object.keys(heartsFromCountsNow).map(k => k.replace(/_name$|_count$/, '')))];
    const giversNow = giverKeysNow.map(k => ({
      name: heartsFromCountsNow[`${k}_name`],
      count: heartsFromCountsNow[`${k}_count`] || 0
    })).filter(g => g.name);

    if (giversNow.length === 0) return;

    setHeartsAnimGivers(giversNow);

    const markSeen = async () => {
      try {
        await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), {
          heartsSeenCount: currentHearts
        });
      } catch (e) {}
    };
    markSeen();

    const clearTimer = setTimeout(() => setHeartsAnimGivers([]), 4500);
    return () => clearTimeout(clearTimer);
  }, [studentProfile, studentUid]);

  const autoSubmitTimerRef = useRef(null);
  const lessonsSectionRef = useRef(null);
  const activeSessionRef = useRef(null);
  const firstLessonRef = useRef(null);
  const hasInitialScrolledRef = useRef(false);

  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    const timer = setTimeout(() => {
      if (hasInitialScrolledRef.current) return;
      hasInitialScrolledRef.current = true;
      if (activeSessionRef.current) {
        activeSessionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstLessonRef.current) {
        firstLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (lessonsSectionRef.current) {
        lessonsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [activeSession, myLessons]);

  const [mySchedule, setMySchedule] = useState([]);
  const [alarmRingCount, setAlarmRingCount] = useState(0); 
  const triggeredAlarmsRef = useRef(new Set()); 
  const alarmTimerRef = useRef(null);

  const prevLessonCount = useRef(0); 

  useEffect(() => {
    if (!studentUid) return;
    // Query by studentUid only and filter status on the client, so no
    // composite index is required (see note on the sessions query above).
    const q = query(lessonsCollection, where("studentUid", "==", studentUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lessonList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(l => l.status === 'pending' || l.status === 'started');
      
      if (lessonList.length > prevLessonCount.current && prevLessonCount.current > 0) {
        playSound(1); 
        setTimeout(() => {
          if (lessonsSectionRef.current) {
            lessonsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
      prevLessonCount.current = lessonList.length;
      
      lessonList.sort((a, b) => {
        const dateA = a.sentAt?.toDate ? a.sentAt.toDate() : new Date(0);
        const dateB = b.sentAt?.toDate ? b.sentAt.toDate() : new Date(0);
        return dateB - dateA; 
      });

      setMyLessons(lessonList);
    }, (error) => {
      console.error("Error fetching student lessons: ", error);
    });
    return () => unsubscribe();
  }, [studentUid]);

  useEffect(() => {
    if (!studentUid) return;

    const activeQ = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
    const unsubActive = onSnapshot(activeQ, (snapshot) => {
      const activeDoc = snapshot.docs[0];
      setActiveSession(activeDoc ? { id: activeDoc.id, ...activeDoc.data() } : null);
    }, (error) => {
      console.error("Error fetching active session:", error);
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // NOTE: Combining an equality filter (studentUid) with a range filter
    // (startTime >=) in Firestore requires a composite index. To avoid the
    // query failing silently when that index is missing, we query by
    // studentUid only and filter the date range on the client.
    const recentQ = query(
      sessionsCollection,
      where("studentUid", "==", studentUid)
    );
    const unsubRecent = onSnapshot(recentQ, (snapshot) => {
      // Use start of year so the attendance count matches the teacher's view
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const sessionList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.endTime && s.startTime && typeof s.startTime.toDate === 'function' && s.startTime.toDate().getTime() >= startOfYear);
      setMySessions(sessionList);
    }, (error) => {
      console.error("Error fetching recent sessions:", error);
    });

    return () => {
      unsubActive();
      unsubRecent();
    };
  }, [studentUid]);
  
  useEffect(() => {
    if (announcements && studentProfile) {
      const seenIds = studentProfile.seenAnnouncements || [];
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      // Shown in the 🔔 dropdown: everyone else's trophy announcements from
      // the past week, newest first — read or not (so a student can still
      // glance back at what they already saw), while the red dot only counts
      // the unseen ones.
      const recent = announcements
        .filter(a => a.studentName !== studentProfile.name)
        .filter(a => {
          const ms = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : nowMs);
          return (nowMs - ms) < ONE_WEEK_MS;
        })
        .sort((a, b) => {
          const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return bMs - aMs;
        })
        .map(a => ({ ...a, _unseen: !seenIds.includes(a.id) }));
      setVisibleAnnouncements(recent);
    }
  }, [announcements, studentProfile]);
  const unreadAnnouncementCount = visibleAnnouncements.filter(a => a._unseen).length;

  useEffect(() => {
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    if (!activeSession || showFeedbackModal) return;

    const now = new Date();
    // Guard: startTime can be null briefly after addDoc with serverTimestamp()
    if (!activeSession.startTime?.toDate) return;
    const sessionStartTime = activeSession.startTime.toDate();
    
    let relevantScheduleEndTime = null;
    const currentOrLastSchedule = mySchedule
      .filter(entry => entry.endTime?.toDate && entry.endTime.toDate() > sessionStartTime) 
      .sort((a, b) => (a.endTime?.toDate?.()?.getTime?.() ?? 0) - (b.endTime?.toDate?.()?.getTime?.() ?? 0))[0]; 
      
    if (currentOrLastSchedule) {
      const scheduleEnd = new Date(currentOrLastSchedule.endTime.toDate().getTime() + 15 * 60 * 1000);
      if (scheduleEnd > now || (now.getTime() - scheduleEnd.getTime()) < 5 * 60 * 1000) { 
        relevantScheduleEndTime = scheduleEnd;
      }
    }

    const maxDurationEndTime = new Date(sessionStartTime.getTime() + 45 * 60 * 1000); 
    const scheduleTriggerEndTime = relevantScheduleEndTime;

    let autoSubmitTime = maxDurationEndTime; 

    if (scheduleTriggerEndTime && scheduleTriggerEndTime < autoSubmitTime) {
      autoSubmitTime = scheduleTriggerEndTime;
    }

    const timeRemaining = autoSubmitTime.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      handleAutoSubmitSession(activeSession, autoSubmitTime);
    } else {
      autoSubmitTimerRef.current = setTimeout(() => {
        handleAutoSubmitSession(activeSession, autoSubmitTime);
      }, timeRemaining);
    }
    
    return () => {
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, [activeSession, showFeedbackModal, mySchedule]);

  useEffect(() => {
    if (!studentUid) return;
    const q = query(teacherScheduleCollection, where("studentUid", "==", studentUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMySchedule(scheduleList);
    }, (error) => {
      console.error("Error fetching student schedule:", error);
    });
    return () => unsubscribe();
  }, [studentUid]);

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      mySchedule.forEach(entry => {
        const startTime = entry.startTime.toDate();
        const diffMins = (now.getTime() - startTime.getTime()) / 60000;
        
        if (diffMins >= 0 && diffMins < 1 && alarmRingCount === 0) {
          const today = new Date().toDateString();
          const alarmId = `${entry.id}-${today}`;
          
          if (!triggeredAlarmsRef.current.has(alarmId)) {
            triggeredAlarmsRef.current.add(alarmId);
            setAlarmRingCount(5); 
          }
        }
      });
    };
    
    const intervalId = setInterval(checkSchedule, 30 * 1000); 
    return () => clearInterval(intervalId);
  }, [mySchedule, alarmRingCount]); 

  const stopAlarm = () => {
    if (alarmRingCount > 0) {
      setAlarmRingCount(0); 
    }
  };

  useEffect(() => {
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);

    if (alarmRingCount > 0) {
      playSound(3); 
      alarmTimerRef.current = setTimeout(() => {
        setAlarmRingCount(count => count - 1);
      }, 10 * 1000); 
      document.addEventListener('mousedown', stopAlarm);
      document.addEventListener('touchstart', stopAlarm);
    } else {
      document.removeEventListener('mousedown', stopAlarm);
      document.removeEventListener('touchstart', stopAlarm);
    }
    
    return () => {
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
      document.removeEventListener('mousedown', stopAlarm);
      document.removeEventListener('touchstart', stopAlarm);
    };
  }, [alarmRingCount]); 
  useEffect(() => {
    if (!activeSession || showFeedbackModal) return;
    const intervalId = setInterval(() => setElapsedTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [activeSession, showFeedbackModal]);
  useEffect(() => {
    // Keeps nowTick fresh so the 1-hour "Report" (redo) button window
    // expires on its own without requiring a manual page refresh.
    const intervalId = setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Myanmar Reader sessions are sent as a plain external link (no
  // myanmarreader:// protocol / classId parsing like the other linked apps),
  // so there's nothing else already pre-filling Score/Lesson completed for
  // them. This queries Myanmar Reader's own Firestore scores directly —
  // written live as the student reads (score 0–1000 per chapter+sheet,
  // isComplete once it crosses 700) — and fills in whichever chapter+sheet
  // they most recently studied (by timestamp), whether or not it's finished.
  //
  // A chapter has two sheets (A and B) that must both be finished before it
  // "counts" — Sheet A alone isn't the chapter being done, so Lesson
  // completed only fills in once a chapter's pair is both done (using
  // chapterComplete, stamped by the reader app itself once it detects both
  // sheets crossed 700), and only a chapter reaching that state is worth a
  // trophy — 2 at once (one per sheet), not 1 at a time as each sheet
  // finishes. requestTrophyChecked/requestTrophyAmount are the same state
  // the other apps' "🏆 +N Trophy!" badge already reads from.
  const [myanmarReaderPendingScoreDocs, setMyanmarReaderPendingScoreDocs] = useState([]);
  useEffect(() => {
    const session = redoSession || activeSession;
    if (!showFeedbackModal || !session || !studentProfile?.name) { setMyanmarReaderPendingScoreDocs([]); return; }
    if (!MYANMAR_READER_APP_URL || !session.lessonLink?.startsWith(MYANMAR_READER_APP_URL)) { setMyanmarReaderPendingScoreDocs([]); return; }
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'artifacts', 'myanmar-reader-app', 'public', 'data', 'scores'),
          where('studentName', '==', studentProfile.name)
        ));
        if (snap.empty) { setMyanmarReaderPendingScoreDocs([]); return; }
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Most recently studied chapter+sheet, complete or not — this is what
        // gets reported. Re-studying an OLD chapter still updates this (its
        // timestamp becomes the newest), so Score always reflects whatever
        // was just done, even if "Lesson completed" (below) stays pointed at
        // a higher chapter finished earlier.
        let latest = null;
        allDocs.forEach(dt => {
          const ts = dt.timestamp?.toMillis ? dt.timestamp.toMillis() : 0;
          if (!latest || ts > latest._ts) latest = { ...dt, _ts: ts };
        });
        if (latest) setScore(`${latest.score ?? 0}/1000 — Chapter ${latest.chapterNum} (Sheet ${latest.sheetName})`);

        // Highest chapter where BOTH sheets are done — recomputed directly
        // from each sheet's own isComplete flag (not the chapterComplete
        // stamp alone), since older completions from before that stamp
        // existed wouldn't have it set and would otherwise never show up
        // here — this is what was silently breaking Lesson completed.
        const sheetStatus = {}; // chapterNum -> { A: bool, B: bool }
        allDocs.forEach(dt => {
          if (dt.chapterNum == null || !dt.sheetName) return;
          sheetStatus[dt.chapterNum] = sheetStatus[dt.chapterNum] || {};
          if (dt.isComplete) sheetStatus[dt.chapterNum][dt.sheetName] = true;
        });
        const fullChapters = Object.entries(sheetStatus).filter(([, s]) => s.A && s.B).map(([ch]) => parseInt(ch));
        if (fullChapters.length > 0) handleCompletedUnitChange(String(Math.max(...fullChapters)));

        // Completed sheets that are part of a fully-done chapter and haven't
        // been turned into a trophy request yet — both sheets of a chapter
        // become pending together, so finishing a chapter always requests
        // exactly 2 trophies at once. Uses the same robust "both sheets
        // complete" check as above, not just the chapterComplete stamp.
        const pending = allDocs.filter(d =>
          d.isComplete && !d.trophyRequested && d.chapterNum != null && fullChapters.includes(d.chapterNum)
        );
        setMyanmarReaderPendingScoreDocs(pending);
        setRequestTrophyAmount(pending.length > 0 ? pending.length : 1);
        setRequestTrophyChecked(pending.length > 0);
      } catch (e) { console.error('Myanmar Reader auto-fill error:', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeedbackModal, redoSession, activeSession, studentProfile?.name]);


  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let monthAttended = 0, monthAbsent = 0;
    let yearAttended = 0, yearAbsent = 0;

    mySchedule.forEach(entry => {
       const entryDate = entry.startTime.toDate();
       if (entryDate > now) return; 

       let isAttended = false;
       let isAbsent = false;

       if (entry.overrideStatus === 'attended') isAttended = true;
       else if (entry.overrideStatus === 'absent') isAbsent = true;
       else {
           const startOfEntryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
           const endOfEntryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
           const didAttend = mySessions.some(s => s.startTime.toDate() >= startOfEntryDay && s.startTime.toDate() <= endOfEntryDay);
           if (didAttend) isAttended = true;
           else isAbsent = true;
       }

       if (entryDate >= startOfMonth) {
           if (isAttended) monthAttended++;
           if (isAbsent) monthAbsent++;
       }
       if (entryDate >= startOfYear) {
           if (isAttended) yearAttended++;
           if (isAbsent) yearAbsent++;
       }
    });

    return { monthAttended, monthAbsent, yearAttended, yearAbsent };
  }, [mySchedule, mySessions]);

  const handleStartLesson = async (lesson) => {
    if (lesson.link && lesson.link.startsWith('dhammaschool://')) {
      const classId = extractDhammaschoolClassId(lesson.link);
      // Mounted inline now (same project as SmartStudy/Abhidhamma/Myanmar
      // Reader) — switch to it directly instead of opening a new tab. The
      // app auto-selects this class and shows all its lessons (student
      // picks which one to start, mirroring how SmartStudy/AbhidhammaApp
      // hand off to a class rather than one specific lesson).
      if (onOpenDhammaschool) {
        onOpenDhammaschool({ studentName: studentProfile?.name || '', classId: classId || '' });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Session for time-tracking + Report button (same pattern as other apps)
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Lesson',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting Dhammaschool session:", e); }
      return;
    }

    const simpleAppSchemes = ['consonantpractice://', 'burmesegame://', 'numberlearning://', 'vowelslearning://', 'animalsound://', 'burmeselearninggames://', 'interactivequiz://', 'myanmarpoems://', 'consonantendings://', 'timeandcalendar://', 'myanmarspelling://', 'myanmarsoundpractice://', 'readingmyanmar://', 'speakingmyanmar://', 'myanmarpart1and2://'];
    if (simpleAppSchemes.some(scheme => lesson.link === scheme || lesson.link.startsWith(scheme))) {
      const openerByLink = {
        'consonantpractice://': onOpenConsonantPractice,
        'burmesegame://': onOpenBurmeseGame,
        'numberlearning://': onOpenNumberLearning,
        'vowelslearning://': onOpenVowelsLearning,
        'animalsound://': onOpenAnimalSound,
        'burmeselearninggames://': onOpenBurmeseLearningGames,
        'interactivequiz://': onOpenInteractiveQuiz,
        'myanmarpoems://': onOpenMyanmarPoems,
        'consonantendings://': onOpenConsonantEndings,
        'timeandcalendar://': onOpenTimeAndCalendar,
        'myanmarspelling://': onOpenMyanmarSpelling,
        'myanmarsoundpractice://': onOpenMyanmarSoundPractice,
        'readingmyanmar://': onOpenReadingMyanmar,
        'speakingmyanmar://': onOpenSpeakingMyanmar,
        'myanmarpart1and2://': onOpenMyanmarPart1And2,
      };
      const matchedScheme = groupSchemeOfLink(lesson.link) || lesson.link;
      const opener = openerByLink[matchedScheme];
      const initialPart = extractGroupPartKey(lesson.link);
      if (opener) opener({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Session for time-tracking + Report button (same pattern as other apps)
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Game',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting game session:", e); }
      return;
    }

    if (lesson.link && lesson.link.startsWith('abhidhamma://')) {
      const lessonId = extractAbhidhammaLessonId(lesson.link);
      if (onOpenAbhidhamma) {
        const ageGroupMap = { storyteller:'storytellers', explorer:'explorers', adventurer:'adventurers', voyager:'voyagers' };
        onOpenAbhidhamma({
          mode: 'student',
          lessonId,
          studentName: studentProfile?.name,
          ageGroup: studentProfile?.smartStudyAgeLevel || null,
        });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Create a session for time-tracking and Report button
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Lesson',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting Abhidhamma session:", e); }
      return;
    }

    if (lesson.link && lesson.link.startsWith('smartstudy://')) {
      const classId = extractSmartStudyClassId(lesson.link);
      if (onOpenSmartStudy) {
        onOpenSmartStudy({
          mode: 'student',
          classId,
          studentName: studentProfile?.name,
          studentUid,
          ageLevel: studentProfile?.smartStudyAgeLevel || null,
          onAgeLevelChosen: async (level) => {
            try {
              await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { smartStudyAgeLevel: level });
            } catch (e) {
              console.error('Error saving age level:', e);
            }
          }
        });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Create a study session for the Smart Study lesson too — so the
      // student sees the Report button, and study time is captured for
      // Student Feedback Reports. Progress/trophies are still auto-tracked
      // via SmartStudyProgressBadge; no manual chapter count is needed.
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Chapter',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) {
        console.error("Error starting Smart Study session:", e);
      }
      return;
    }

    if (activeSession) {
      return;
    }

    try {
      const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
      const activeCheckSnap = await getDocs(activeCheckQuery);
      if (!activeCheckSnap.empty) {
        alert("There is still an active session. Please wait a moment and try again, or submit a report first.");
        return;
      }
    } catch (error) {
      console.error("Error checking for existing active session:", error);
      return;
    }

    let formattedUrl = lesson.link;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    // Myanmar Reader is mounted inline in the same project now (like
    // SmartStudy/Abhidhamma) — switch to it directly instead of opening a
    // new tab, passing the student's exact TutoringApp name the same way
    // the URL param used to (so nothing else about the identity/roster
    // logic on that side needs to change).
    const isMyanmarReaderLesson = MYANMAR_READER_APP_URL && formattedUrl.startsWith(MYANMAR_READER_APP_URL);
    if (isMyanmarSpeakingUrl(formattedUrl) && onOpenMyanmarSpeaking && studentProfile?.name) {
      onOpenMyanmarSpeaking({ studentName: studentProfile.name });
    } else if (isMyanmarReaderLesson && onOpenMyanmarReader && studentProfile?.name) {
      onOpenMyanmarReader({ studentName: studentProfile.name });
    } else {
      openLink(formattedUrl);
    }
    setIsLessonOverlayOpen(true);
    
    try {
      await addDoc(sessionsCollection, {
        studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link, 
        lessonTrophyLimit: lesson.trophyLimit || 0,
        lessonUnitCount: lesson.unitCount || 0,
        lessonUnitLabel: lesson.unitLabel || 'Chapter',
        startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
      });
      if (lesson.status === 'pending') {
        await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' });
      }
    } catch (error) {
      console.error("Error starting lesson:", error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setRedoSession(null);
    setFeedbackNotes('');
    setScore('');
    setCompletedUnitInput('');
    setTodayCompletedInput('');
    setTrophyTapCount(0);
    setShowFeedbackModal(true);

    // Auto-fetch SmartStudy Score and Lesson completed so the feedback modal
    // is pre-filled. Works both when the session link has a classId
    // (e.g. smartstudy://BUDDHA — fetches that class only) AND when it doesn't
    // (smartstudy:// — fetches across all classes, same as myTotalLessonsCompletedAllClasses).
    if (activeSession.lessonLink?.startsWith('smartstudy://')) {
      const ssClassId = extractSmartStudyClassId(activeSession.lessonLink) || null;
      const ssName = studentProfile?.name;
      if (ssName) {
        try {
          const allNames = [...new Set([ssName, ...(Object.values(studentProfile?.smartStudyNames || {}))].filter(Boolean))];
          let totalPts = 0;
          const completedLessonIds = new Set(); // key = lessonId (per-class) or "classId-lessonId" (all-class)
          for (const name of allNames) {
            // If we have a classId: filter by class (matches myLessonsCompleted in SmartStudy)
            // If no classId:         query all classes (matches myTotalLessonsCompletedAllClasses)
            const q = ssClassId
              ? query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('classId', '==', ssClassId), where('studentName', '==', name))
              : query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('studentName', '==', name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              totalPts += (Number(d.data().score) || 0);
              const cId = d.data().classId; const lId = d.data().lessonId;
              if (lId) completedLessonIds.add(ssClassId ? lId : `${cId}-${lId}`);
            });
          }
          if (totalPts > 0) setScore(`${totalPts.toLocaleString()} pts`);
          if (completedLessonIds.size > 0) {
            setCompletedUnitInput(String(completedLessonIds.size));
          }
        } catch (e) {
          console.error('Error fetching SmartStudy score/completions for report modal:', e);
        }
      }
    }
    // Dhammaschool app: fetch total score + completed-lesson count across the whole class for auto-fill
    if (activeSession.lessonLink?.startsWith('dhammaschool://')) {
      const dhammaschoolClassId = activeSession.lessonLink.replace('dhammaschool://', '');
      const stuName = studentProfile?.name;
      if (stuName && dhammaschoolClassId) {
        try {
          const lessonsSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'),
            where('classId', '==', dhammaschoolClassId)
          ));
          const classLessonIds = lessonsSnap.docs.map(d => d.id);
          let totalScore = 0;
          // Dhammaschool app uses its own anonymous Firebase session per device/browser
          // (separate from TutoringApp's studentUid), so completions/scores must be
          // matched by studentName, not by UID.
          const completionsSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions'),
            where('studentName', '==', stuName)
          ));
          const completedLessonIds = new Set(completionsSnap.docs.map(d => d.data().lessonId).filter(lid => classLessonIds.includes(lid)));
          for (const lid of classLessonIds) {
            try {
              const scoresSnap = await getDocs(query(
                collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
                where('lessonId', '==', lid),
                where('studentName', '==', stuName)
              ));
              let best = 0;
              scoresSnap.docs.forEach(d => { best = Math.max(best, Number(d.data().score) || 0); });
              totalScore += best;
            } catch (e) {}
          }
          if (totalScore > 0) setScore(`${totalScore.toLocaleString()} pts`);
          if (completedLessonIds.size > 0) setCompletedUnitInput(String(completedLessonIds.size));
        } catch (e) { console.error('Dhammaschool score fetch:', e); }
      }
    }

    // Abhidhamma: fetch score + lesson count from global_scores
    // Handles both new format (has classId) and old AbhidhammaApp5 format (no classId)
    if (activeSession.lessonLink?.startsWith('abhidhamma://')) {
      const abhiClassId = activeSession.lessonLink.replace('abhidhamma://', '');
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const allNames = [...new Set([stuName, ...(Object.values(studentProfile?.abhidhammaNames||{}))].filter(Boolean))];
          let totalPts=0; const doneLessons=new Set();
          const ABHI_COL = collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
          for (const nm of allNames) {
            // Try with name field (old AbhidhammaApp5 used 'name', new uses 'studentName')
            const [snap1, snap2] = await Promise.all([
              getDocs(query(ABHI_COL, where('name','==',nm))),
              getDocs(query(ABHI_COL, where('studentName','==',nm)))
            ]);
            [...snap1.docs, ...snap2.docs].forEach(d=>{
              const dt=d.data();
              // Include if classId matches OR if no classId (old format)
              if(dt.classId && dt.classId !== abhiClassId) return;
              totalPts += (Number(dt.score)||0);
              if(dt.lessonId) doneLessons.add(dt.lessonId);
            });
          }
          if(totalPts>0) setScore(`${totalPts.toLocaleString()} pts`);
          if(doneLessons.size>0) setCompletedUnitInput(String(doneLessons.size));
        } catch(e) { console.error('Abhi score fetch:', e); }
      }
    }

    // Myanmar Speaking app: fetch today's studied minutes (written by
    // myanmar-speaking-app.jsx as the student uses it) and drop it straight
    // into "Today completed" — there's no chapter/unit structure here, so
    // minutes studied today is what the teacher reviews before awarding a trophy.
    if (isMyanmarSpeakingUrl(activeSession.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const todayKey = new Date().toISOString().split('T')[0];
          const docId = `${sanitizeMyanmarSpeakingKey(stuName)}_${todayKey}`;
          const minutesSnap = await getDoc(doc(db, 'artifacts', MYANMAR_SPEAKING_APP_ID, 'public', 'data', 'daily_minutes', docId));
          if (minutesSnap.exists() && typeof minutesSnap.data().minutes === 'number') {
            // Feeds "Today, completed" through the same path as every other
            // app (adds to the previous cumulative total, capped by the
            // Lesson Bank's "Total Number") — this only works out to a
            // sensible trophy calc when the teacher sets that lesson's Unit
            // Name to "Minute", per the Lesson Bank's Unit Name dropdown.
            handleTodayCountChange(String(minutesSnap.data().minutes));
          }
        } catch (e) { console.error('Myanmar Speaking minutes fetch:', e); }
      }
    }
  };

  const handleOpenRedoReport = async (session) => {
    setRedoSession(session);
    const lessonKey = computeLessonKey(session.lessonTitle, session.lessonLink);
    const prevUnit = getEffectivePreviousUnit(lessonKey, session);
    setCompletedUnitInput(session.completedUnit ? String(session.completedUnit) : '');
    setTodayCompletedInput(session.completedUnit ? String(Math.max(0, session.completedUnit - prevUnit)) : '');
    setTrophyTapCount(0);
    const isPlaceholderNote = !session.feedbackNotes
      || session.feedbackNotes.startsWith('Automatically submitted')
      || session.feedbackNotes === 'Submitted without writing.';
    setFeedbackNotes(isPlaceholderNote ? '' : session.feedbackNotes);
    setScore(session.score && session.score !== 'N/A' ? session.score : '');
    setShowFeedbackModal(true);

    // Re-fetch fresh SmartStudy data so redo report always shows current counts
    if (session.lessonLink?.startsWith('smartstudy://')) {
      const ssClassId = extractSmartStudyClassId(session.lessonLink) || null;
      const ssName = studentProfile?.name;
      if (ssName) {
        try {
          const allNames = [...new Set([ssName, ...(Object.values(studentProfile?.smartStudyNames || {}))].filter(Boolean))];
          let totalPts = 0;
          const completedIds = new Set();
          for (const name of allNames) {
            const q = ssClassId
              ? query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('classId', '==', ssClassId), where('studentName', '==', name))
              : query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('studentName', '==', name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              totalPts += (Number(d.data().score) || 0);
              const cId = d.data().classId; const lId = d.data().lessonId;
              if (lId) completedIds.add(ssClassId ? lId : `${cId}-${lId}`);
            });
          }
          if (totalPts > 0) setScore(`${totalPts.toLocaleString()} pts`);
          if (completedIds.size > 0) setCompletedUnitInput(String(completedIds.size));
        } catch (e) {
          console.error('Error fetching SmartStudy data for redo report:', e);
        }
      }
    }
    // Abhidhamma redo fetch — handle old and new format
    if (session.lessonLink?.startsWith('abhidhamma://')) {
      const abhiClassId = session.lessonLink.replace('abhidhamma://','');
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const allNames=[...new Set([stuName,...(Object.values(studentProfile?.abhidhammaNames||{}))].filter(Boolean))];
          let pts=0; const done=new Set();
          const ABHI_COL=collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
          for(const nm of allNames){
            const [s1,s2]=await Promise.all([getDocs(query(ABHI_COL,where('name','==',nm))),getDocs(query(ABHI_COL,where('studentName','==',nm)))]);
            [...s1.docs,...s2.docs].forEach(d=>{const dt=d.data();if(dt.classId&&dt.classId!==abhiClassId)return;pts+=(Number(dt.score)||0);if(dt.lessonId)done.add(dt.lessonId);});
          }
          if(pts>0) setScore(`${pts.toLocaleString()} pts`);
          if(done.size>0) setCompletedUnitInput(String(done.size));
        }catch(e){console.error('Abhi redo:',e);}
      }
    }
  };
  
  const handleAutoSubmitSession = async (sessionToSubmit, calculatedEndTime) => { 
    if (!sessionToSubmit || !sessionToSubmit.id) return; 
    
    let finalEndTime;
    if (calculatedEndTime) {
      finalEndTime = Timestamp.fromDate(calculatedEndTime);
    } else {
      finalEndTime = Timestamp.fromDate(new Date(sessionToSubmit.startTime.toDate().getTime() + 45 * 60 * 1000));
    }
    
    if (finalEndTime.toDate() <= sessionToSubmit.startTime.toDate()) {
      finalEndTime = Timestamp.fromDate(new Date(sessionToSubmit.startTime.toDate().getTime() + 1 * 60 * 1000));
    }

    const autoFeedbackNotes = "Automatically submitted (45 min max / end of class).";
    const autoScore = "N/A";

    try {
      const sessionDoc = await getDoc(doc(db, `${publicDataPath}/studySessions`, sessionToSubmit.id));
      if (!sessionDoc.exists() || sessionDoc.data().endTime !== null) return;
      
      await updateDoc(doc(db, `${publicDataPath}/studySessions`, sessionToSubmit.id), {
        endTime: finalEndTime, feedbackNotes: autoFeedbackNotes, score: autoScore
      });
      playSound(0); 
    } catch (error) {
      console.error("Error auto-submitting session:", error);
    }
  };
  
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    
    const notes = feedbackNotes.trim() || "Submitted without writing."; 
    
    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const earnedTrophiesMap = studentProfile.earnedTrophies || {};
    const previouslyEarned = earnedTrophiesMap[lessonKey] || 0;
    const maxAvailable = targetSession.lessonTrophyLimit || 0;
    const remainingTrophies = Math.max(0, maxAvailable - previouslyEarned);

    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    const enteredUnit = parseInt(completedUnitInput) || 0;
    const newHighestUnit = Math.max(previousHighestUnit, enteredUnit);
    
    try {
      await updateDoc(doc(db, `${publicDataPath}/studySessions`, targetSession.id), {
        endTime: serverTimestamp(), feedbackNotes: notes, score: score, completedUnit: enteredUnit,
        lessonUnitLabel: targetSession.lessonUnitLabel || 'Chapter',
        previousCompletedUnit: previousHighestUnit
      });
      playSound(0); 

      const studentDocRef = doc(db, `${publicDataPath}/students`, studentUid);
      const studentUpdateData = {};

      if (enteredUnit > 0) {
        studentUpdateData[`completedUnits.${lessonKey}`] = newHighestUnit;
      }

      const isMyanmarReaderSession = MYANMAR_READER_APP_URL && targetSession.lessonLink?.startsWith(MYANMAR_READER_APP_URL);

      if (isMyanmarReaderSession) {
        // One trophy per completed sheet (Sheet A and Sheet B each count
        // separately) that hasn't already been turned into a request —
        // myanmarReaderPendingScoreDocs was computed when the modal opened.
        if (myanmarReaderPendingScoreDocs.length > 0) {
          studentUpdateData.trophyRequested = true;
          studentUpdateData.requestedTrophyAmount = myanmarReaderPendingScoreDocs.length;
          studentUpdateData.requestedTrophyLessonId = targetSession.lessonId;
          studentUpdateData.requestedTrophyLessonTitle = targetSession.lessonTitle;
          studentUpdateData.requestedTrophyLessonLink = targetSession.lessonLink || null;
          studentUpdateData.requestedTrophySessionId = targetSession.id;
          // Mark each completed sheet as requested on Myanmar Reader's own
          // Firestore, so the same completion never gets counted into a
          // second request in a future session.
          try {
            const batch = writeBatch(db);
            myanmarReaderPendingScoreDocs.forEach(d => {
              batch.update(doc(db, 'artifacts', 'myanmar-reader-app', 'public', 'data', 'scores', d.id), { trophyRequested: true });
            });
            await batch.commit();
          } catch (e) { console.error('Error marking Myanmar Reader trophies as requested:', e); }
        }
      } else {
        const unitCount = targetSession.lessonUnitCount || 0;
        if (unitCount > 0 && maxAvailable > 0) {
          const deservedSoFar = Math.min(maxAvailable, Math.floor((newHighestUnit * maxAvailable) / unitCount));
          const autoAmount = Math.max(0, deservedSoFar - previouslyEarned);
          if (autoAmount > 0) {
            studentUpdateData.trophyRequested = true;
            studentUpdateData.requestedTrophyAmount = autoAmount;
            studentUpdateData.requestedTrophyLessonId = targetSession.lessonId;
            studentUpdateData.requestedTrophyLessonTitle = targetSession.lessonTitle;
            studentUpdateData.requestedTrophyLessonLink = targetSession.lessonLink || null;
            studentUpdateData.requestedTrophySessionId = targetSession.id;
          }
        }
      }

      if (Object.keys(studentUpdateData).length > 0) {
        await updateDoc(studentDocRef, studentUpdateData);
      }
      
      setPraiseModalInfo({ 
        isOpen: true, 
        newTrophy: false, 
        totalTrophies: studentProfile?.trophyCount || 0, 
        message: "Session complete!", 
        emoji: '👍' 
      });
      
    } catch (error) {
      } finally {
      setShowFeedbackModal(false);
      setRedoSession(null);
      setFeedbackNotes('');
      setScore('');
      setRequestTrophyChecked(false);
      setRequestTrophyAmount(1);
      setCompletedUnitInput('');
      setTodayCompletedInput('');
      setTrophyTapCount(0);
      setMyanmarReaderPendingScoreDocs([]);
    }
  };

  const handleUpdateStudentName = async () => {
    const trimmed = editingNameText.trim();
    if (!trimmed || !studentUid) return;
    
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentUid);
      if (trimmed === studentProfile?.name) {
        // No actual change — just clear any stale pending request
        await updateDoc(studentDocRef, { pendingName: null });
      } else {
        // Name changes require teacher approval — store as pendingName,
        // the displayed name stays the same until the teacher approves it.
        await updateDoc(studentDocRef, { pendingName: trimmed });
      }
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating student profile:", error);
    }
  };

  const handleCancelPendingNameRequest = async () => {
    if (!studentUid) return;
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { pendingName: null });
    } catch (error) {
      console.error("Error cancelling pending name request:", error);
    }
  };

  const dismissAnnouncement = async (id) => {
    try {
      const studentRef = doc(db, `${publicDataPath}/students`, studentUid);
      await updateDoc(studentRef, {
        seenAnnouncements: arrayUnion(id)
      });
    } catch (error) {
      console.error("Error dismissing announcement:", error);
    }
  };
  
  const dismissAllAnnouncements = async () => {
    try {
      const newIds = visibleAnnouncements.map(a => a.id);
      if (newIds.length === 0) return;
      const studentRef = doc(db, `${publicDataPath}/students`, studentUid);
      await updateDoc(studentRef, {
        seenAnnouncements: arrayUnion(...newIds)
      });
    } catch(error) {
      console.error("Error dismissing all announcements:", error);
    }
  };

  if (studentProfile?.isActive === 'pending') {
    return <PendingScreen name={studentProfile.name} />;
  }
  if (studentProfile?.isActive === false) {
    return <DeactivatedScreen />;
  }
  
  const feedbackSession = redoSession || activeSession;
  const activeLessonKeyForModal = feedbackSession ? computeLessonKey(feedbackSession.lessonTitle, feedbackSession.lessonLink) : '';
  const earnedTrophiesMapForModal = studentProfile?.earnedTrophies || {};
  const previouslyEarnedForModal = feedbackSession ? (earnedTrophiesMapForModal[activeLessonKeyForModal] || 0) : 0;
  const maxAvailableForModal = (() => {
    if (!feedbackSession) return 0;
    // For SmartStudy sessions, derive trophy limit from the session's unitCount
    // (set correctly when lesson was sent via effectiveLessonUnitCount).
    // floor(10 lessons / 5) = 2 trophies — no reference to TeacherDashboard state.
    if (feedbackSession.lessonLink?.startsWith('smartstudy://') && feedbackSession.lessonUnitCount > 0) {
      return computeClassTrophyMax(feedbackSession.lessonUnitCount);
    }
    return feedbackSession.lessonTrophyLimit || 0;
  })();
  const remainingTrophiesForModal = Math.max(0, maxAvailableForModal - previouslyEarnedForModal);
  const previousHighestUnitForModal = feedbackSession ? getEffectivePreviousUnit(activeLessonKeyForModal, feedbackSession) : 0;

  const completedSessions = mySessions
    .filter(s => s.endTime && s.startTime)
    .sort((a, b) => {
      const bT = b.startTime?.toDate?.()?.getTime?.() ?? 0;
      const aT = a.startTime?.toDate?.()?.getTime?.() ?? 0;
      return bT - aT;
    });
    
  const availableLessons = myLessons; 

  return (
    <div className="p-6 relative">
      {isLessonOverlayOpen && (
        <div className="fixed inset-0 z-[9999] bg-indigo-900/95 flex flex-col justify-center items-center p-6 text-center">
           <h2 className="text-white text-2xl md:text-4xl font-bold mb-8">Lesson opened in another tab.</h2>
           <button onClick={() => setIsLessonOverlayOpen(false)} className="bg-red-500 hover:bg-red-600 px-8 py-5 rounded-2xl font-black text-white text-2xl transition-transform transform hover:scale-105 shadow-2xl">
             Close & Return to Dashboard
           </button>
        </div>
      )}
{heartsAnimGivers.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 h-64 z-50 pointer-events-none overflow-hidden">
          <style>{`
            @keyframes heartBubbleUp {
              0% { transform: translateY(0) scale(0.6); opacity: 0; }
              10% { opacity: 1; transform: translateY(-10px) scale(1); }
              85% { opacity: 1; }
              100% { transform: translateY(-220px) scale(0.9); opacity: 0; }
            }
          `}</style>
          {heartsAnimGivers.flatMap((g, gIdx) =>
            Array.from({ length: Math.min(g.count, 5) }).map((_, i) => {
              const leftPercent = 15 + ((gIdx * 5 + i) * 13) % 70;
              const delay = (gIdx * 0.3 + i * 0.25);
              return (
                <div
                  key={`${gIdx}-${i}`}
                  className="absolute bottom-4 flex flex-col items-center"
                  style={{
                    left: `${leftPercent}%`,
                    animation: `heartBubbleUp 3.5s ease-in ${delay}s 1 both`
                  }}
                >
                  <span className="text-3xl drop-shadow-md">❤️</span>
                  <span className="mt-1 text-xs font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {g.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
      <PraiseModal 
        isOpen={praiseModalInfo.isOpen}
        onClose={() => setPraiseModalInfo({ isOpen: false, newTrophy: false, totalTrophies: 0, message: '', emoji: '' })}
        newTrophy={praiseModalInfo.newTrophy} totalTrophies={praiseModalInfo.totalTrophies} message={praiseModalInfo.message} emoji={praiseModalInfo.emoji}
      />
      
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <form onSubmit={handleSubmitFeedback} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <h3 className="text-xl font-semibold mb-4">Lesson Feedback</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">What did you study? (Optional)</label>
              <textarea
                value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} rows="4"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., I finished Algebra Chapter 1."
              ></textarea>
            </div>
            {(()=>{ return (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-gray-700 mb-2 text-sm">Score</label>
                <input
                  type="text" value={score} onChange={(e) => setScore(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="10/10"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 text-sm">Today, completed</label>
                <input
                  type="number" min="0"
                  value={todayCompletedInput}
                  onChange={(e) => handleTodayCountChange(e.target.value)}
                  placeholder="e.g., 3"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="relative">
                <label className="block text-gray-700 mb-2 text-sm">Lesson completed</label>
                {requestTrophyChecked && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm font-bold px-4 py-2 rounded-xl shadow-lg whitespace-nowrap z-20 animate-bounce">
                    🏆 +{requestTrophyAmount} {requestTrophyAmount > 1 ? 'Trophies' : 'Trophy'}!
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <input
                    type="number" min="0" max={feedbackSession?.lessonUnitCount || undefined}
                    value={completedUnitInput}
                    onChange={(e) => {
                      const cap = feedbackSession?.lessonUnitCount || 0;
                      let v = e.target.value;
                      if (cap > 0 && parseInt(v) > cap) v = String(cap);
                      handleCompletedUnitChange(v);
                    }}
                    placeholder="e.g., 5"
                    className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {maxAvailableForModal > 0 && (feedbackSession?.lessonUnitCount || 0) > 0 && remainingTrophiesForModal > 0 && (
                    <button
                      type="button"
                      title="Tap for next trophy number"
                      onClick={() => {
                        const nextTapCount = Math.min(remainingTrophiesForModal, trophyTapCount + 1);
                        setTrophyTapCount(nextTapCount);
                        const neededUnit = Math.min(
                          feedbackSession.lessonUnitCount,
                          Math.ceil(((previouslyEarnedForModal + nextTapCount) * feedbackSession.lessonUnitCount) / maxAvailableForModal)
                        );
                        handleCompletedUnitChange(String(neededUnit));
                      }}
                      className="text-2xl flex-shrink-0 hover:scale-110 transition-transform"
                    >
                      🏆
                    </button>
                  )}
                </div>
              </div>

              {parseInt(completedUnitInput) > 0 && (
                <p className="col-span-3 text-sm font-semibold text-emerald-700 mt-1">
                  {parseInt(completedUnitInput) < previousHighestUnitForModal ? (
                    <>
                      You completed up to {feedbackSession?.lessonUnitLabel || 'Chapter'} {previousHighestUnitForModal}. Now you finished {feedbackSession?.lessonUnitLabel || 'Chapter'} {completedUnitInput}.
                    </>
                  ) : (
                    <>You completed up to {feedbackSession?.lessonUnitLabel || 'Chapter'} {completedUnitInput}.</>
                  )}
                </p>
              )}
            </div>
              );
            })()}
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="text-sm font-semibold">
                {maxAvailableForModal > 0 && (
                  <span className="text-yellow-700">
                    🏆 {previouslyEarnedForModal}{requestTrophyChecked && requestTrophyAmount > 0 ? `+${requestTrophyAmount}` : ''} / {maxAvailableForModal}
                    {remainingTrophiesForModal === 0 && <span className="ml-2 text-emerald-600">✅ All earned</span>}
                  </span>
                )}
              </div>
              <div className="flex space-x-3 ml-auto">
                <button type="button" onClick={() => { setShowFeedbackModal(false); setRedoSession(null); }} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-md">
                  Submit Report
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* One-time "greet your teacher" prompt, shown each time a student
          lands on their dashboard. Sends a greeting doc the teacher's
          dashboard shows as a live toast (see greetingToast in TeacherDashboard). */}
      {showGreetingPrompt && (
        <div className="fixed inset-0 bg-black/40 z-[9700] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <p className="text-4xl mb-3">🙏</p>
            <p className="text-lg font-bold text-gray-800 mb-4">Say hello to your teacher! Tap OK to greet: "Mangalabar"</p>
            <button onClick={handleGreetTeacher} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md">
              OK
            </button>
          </div>
        </div>
      )}

      {/* 🔔 Notifications — fixed top-right, above where the Log Out button
          sits further down the page. Replaces the old always-visible
          "Awesome News Update" cards with a compact bell + unread dot, so
          trophy announcements for OTHER students don't take up permanent
          space on the dashboard. */}
      <div className="fixed top-4 right-4 z-[9500]">
        <button
          onClick={() => setShowNotifDropdown(v => !v)}
          className="relative bg-white hover:bg-gray-50 border border-gray-200 rounded-full w-11 h-11 flex items-center justify-center shadow-lg text-xl"
          title="Notifications"
        >
          🔔
          {unreadAnnouncementCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
              {unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}
            </span>
          )}
        </button>
        {showNotifDropdown && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="font-bold text-gray-700 text-sm">Notifications (past week)</p>
              {visibleAnnouncements.length > 0 && (
                <button onClick={dismissAllAnnouncements} className="text-xs text-gray-400 hover:text-gray-700 font-semibold">
                  Dismiss All
                </button>
              )}
            </div>
            {visibleAnnouncements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No notifications this week.</p>
            )}
            <div className="space-y-2">
              {visibleAnnouncements.map(ann => (
                <div key={ann.id} className={`p-3 rounded-lg border text-sm relative ${ann._unseen ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                  <button onClick={() => dismissAnnouncement(ann.id)} className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-600 text-xs">✕</button>
                  <p className="font-bold text-yellow-900 pr-4">🎉 {ann.studentName}</p>
                  <p className="text-yellow-800">earned their <span className="font-black text-yellow-600">{ann.trophyCount}</span>th trophy! 🏆</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h2 className="text-3xl font-bold mb-6 text-emerald-700">
        {studentProfile?.name}'s Dashboard
      </h2>
      
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-emerald-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        {isEditingName ? (
          <div className="space-y-3 w-full md:w-auto flex-1">
            <h3 className="text-lg font-semibold text-emerald-800 mb-4">Edit Profile</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={editingNameText} onChange={(e) => setEditingNameText(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex space-x-3 pt-4 justify-end">
              <button onClick={() => { setIsEditingName(false); setEditingNameText(studentProfile.pendingName || studentProfile.name); }} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={handleUpdateStudentName} className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-md">
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-between items-center flex-wrap gap-4">
              <div>
                  <div className="flex items-center flex-wrap gap-3 mb-2">
                    <h3 className="text-2xl font-semibold text-emerald-800">Welcome, {studentProfile?.name}</h3>
                    {studentProfile?.trophyCount > 0 && (
                        <span className="text-4xl font-bold text-yellow-600 px-2 py-1 drop-shadow-sm" title={`${studentProfile.trophyCount} Trophies`}>🏆 {studentProfile.trophyCount}</span>
                    )}
                  </div>
                  {studentProfile?.pendingName && (
                    <div className="mb-2 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-1.5">
                      <span className="text-yellow-800 text-sm font-semibold">
                        ⏳ Name change to "<strong>{studentProfile.pendingName}</strong>" is pending teacher approval.
                      </span>
                      <button onClick={handleCancelPendingNameRequest} className="text-xs text-red-600 hover:text-red-800 font-semibold underline">Cancel</button>
                    </div>
                  )}
                  <p className="text-gray-600 text-lg mt-2">Your ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md font-bold text-gray-800">{studentProfile?.displayId}</span></p>

                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <div className="bg-emerald-50 p-3 rounded-xl shadow-sm border border-emerald-100 flex-1">
                        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">This Month's Attendance</p>
                        <div className="mt-1">
                          <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.monthAttended}</span>
                          <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.monthAbsent}</span>
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-xl shadow-sm border border-indigo-100 flex-1">
                        <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide">This Year's Attendance</p>
                        <div className="mt-1">
                          <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.yearAttended}</span>
                          <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.yearAbsent}</span>
                        </div>
                    </div>
                  </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setEditingNameText(studentProfile?.pendingName || studentProfile?.name || ''); setIsEditingName(true); }} className="flex items-center justify-center space-x-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-lg font-semibold transition-colors border border-emerald-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Log out? Use this if you are on a borrowed or shared device. You can log back in anytime with your Student ID.')) {
                      onLogout && onLogout();
                    }
                  }}
                  className="flex items-center justify-center space-x-1 text-gray-600 hover:text-red-700 bg-gray-100 hover:bg-red-50 px-4 py-2.5 rounded-lg font-semibold transition-colors border border-gray-200"
                  title="Log out of this device (e.g. borrowed/shared device)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h6a1 1 0 100-2H4V5h5a1 1 0 000-2H3zm10.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Log Out</span>
                </button>
              </div>
          </div>
        )}
      </div>

      {activeSession && (() => {
        // Same getEffectiveCompletedUnit() used by Available Lessons and the
        // Completed badge there, so the Active Session box (the "Studying
        // Lesson N" text and the Continue button below) never contradicts
        // them -- e.g. showing "Studying Lesson 11" or a plain "Continue
        // Lesson 1" for a 10-lesson class the teacher just marked fully
        // complete via Fix Previously Earned.
        const activeUnitCount = activeSession.lessonUnitCount || 0;
        const pseudoLesson = { title: activeSession.lessonTitle, link: activeSession.lessonLink, unitCount: activeUnitCount, trophyLimit: activeSession.lessonTrophyLimit || 0 };
        const sessionsForActive = completedSessions.filter(s => s.lessonTitle === activeSession.lessonTitle);
        const activeEffectiveCompleted = getEffectiveCompletedUnit(pseudoLesson, studentProfile, sessionsForActive, ssCompletionCounts);
        const isActiveFullyComplete = activeUnitCount > 0 && activeEffectiveCompleted >= activeUnitCount;
        return (
        <div ref={activeSessionRef} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-3">Active Session</h3>
          <p className="text-lg mb-4">
            {activeSession.lessonTitle}
            {activeSession.lessonLink && extractSmartStudyClassId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractSmartStudyClassId(activeSession.lessonLink)}</span>
            )}
            {activeSession.lessonLink && activeSession.lessonLink.startsWith('abhidhamma://') && extractAbhidhammaLessonId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractAbhidhammaLessonId(activeSession.lessonLink)}</span>
            )}
            {activeSession.lessonLink && activeSession.lessonLink.startsWith('dhammaschool://') && extractDhammaschoolClassId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractDhammaschoolClassId(activeSession.lessonLink)}</span>
            )}
          </p>
          {activeUnitCount > 0 && (
            <p className="text-sm mb-4 font-semibold">
              {isActiveFullyComplete
                ? <>✅ Completed — all {activeUnitCount} {activeSession.lessonUnitLabel || 'Chapter'}{activeUnitCount === 1 ? '' : 's'}</>
                : <>Studying {activeSession.lessonUnitLabel || 'Chapter'} {Math.min(activeUnitCount, activeEffectiveCompleted + 1)}</>
              }
            </p>
          )}

          <p className="text-sm mb-4">Started: {formatTimestamp(activeSession.startTime)}</p>
          {activeSession.startTime && typeof activeSession.startTime.toDate === 'function' && (
            <p className="text-sm mb-4 font-semibold">
              Studying for: {(() => {
                const elapsedMs = activeSession.startTime?.toDate ? Math.max(0, elapsedTick - activeSession.startTime.toDate().getTime()) : 0;
                const totalSeconds = Math.floor(elapsedMs / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                return `${mins}m ${secs}s`;
              })()}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button 
              onClick={() => {
                let url = activeSession.lessonLink;
                if (url && url.startsWith('smartstudy://')) {
                  if (onOpenSmartStudy) {
                    onOpenSmartStudy({
                      mode: 'student',
                      classId: extractSmartStudyClassId(url),
                      studentName: studentProfile?.name,
                      studentUid,
                      ageLevel: studentProfile?.smartStudyAgeLevel || null,
                      onAgeLevelChosen: async (level) => {
                        try {
                          await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { smartStudyAgeLevel: level });
                        } catch (e) { console.error('Error saving age level:', e); }
                      }
                    });
                  }
                  return;
                }
                if (url && url.startsWith('abhidhamma://')) {
                  if (onOpenAbhidhamma) {
                    const ageGroupMap = { storyteller:'storytellers', explorer:'explorers', adventurer:'adventurers', voyager:'voyagers' };
                    onOpenAbhidhamma({
                      mode: 'student',
                      lessonId: extractAbhidhammaLessonId(url),
                      studentName: studentProfile?.name,
                      ageGroup: studentProfile?.smartStudyAgeLevel || null,
                    });
                  }
                  return;
                }
                if (url && url.startsWith('dhammaschool://')) {
                  if (onOpenDhammaschool) {
                    onOpenDhammaschool({
                      studentName: studentProfile?.name || '',
                      classId: extractDhammaschoolClassId(url) || '',
                    });
                  }
                  return;
                }
                if (url && url.startsWith('consonantpractice://')) {
                  if (onOpenConsonantPractice) onOpenConsonantPractice({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('burmesegame://')) {
                  if (onOpenBurmeseGame) onOpenBurmeseGame({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('numberlearning://')) {
                  if (onOpenNumberLearning) onOpenNumberLearning({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('vowelslearning://')) {
                  if (onOpenVowelsLearning) onOpenVowelsLearning({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('animalsound://')) {
                  if (onOpenAnimalSound) onOpenAnimalSound({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('burmeselearninggames://')) {
                  if (onOpenBurmeseLearningGames) onOpenBurmeseLearningGames({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('interactivequiz://')) {
                  if (onOpenInteractiveQuiz) onOpenInteractiveQuiz({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarpoems://')) {
                  if (onOpenMyanmarPoems) onOpenMyanmarPoems({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('consonantendings://')) {
                  if (onOpenConsonantEndings) onOpenConsonantEndings({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('timeandcalendar://')) {
                  if (onOpenTimeAndCalendar) onOpenTimeAndCalendar({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarspelling://')) {
                  if (onOpenMyanmarSpelling) onOpenMyanmarSpelling({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarsoundpractice://')) {
                  if (onOpenMyanmarSoundPractice) onOpenMyanmarSoundPractice({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('readingmyanmar://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenReadingMyanmar) onOpenReadingMyanmar({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (url && url.startsWith('speakingmyanmar://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenSpeakingMyanmar) onOpenSpeakingMyanmar({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (url && url.startsWith('myanmarpart1and2://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenMyanmarPart1And2) onOpenMyanmarPart1And2({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
                if (isMyanmarSpeakingUrl(url) && onOpenMyanmarSpeaking && studentProfile?.name) {
                  onOpenMyanmarSpeaking({ studentName: studentProfile.name });
                  setIsLessonOverlayOpen(true);
                  return;
                }
                if (MYANMAR_READER_APP_URL && url.startsWith(MYANMAR_READER_APP_URL) && onOpenMyanmarReader && studentProfile?.name) {
                  onOpenMyanmarReader({ studentName: studentProfile.name });
                  setIsLessonOverlayOpen(true);
                  return;
                }
                openLink(url);
                setIsLessonOverlayOpen(true);
              }} 
              disabled={!activeSession.lessonLink} 
              className="w-full sm:w-1/2 bg-blue-500 text-white p-4 rounded-lg font-bold hover:bg-blue-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50"
            >
              {isActiveFullyComplete ? '✅ Completed — Continue' : 'Continue'}
            </button>
            <div className="w-full sm:w-1/2">
               <button 
                 onClick={handleEndSession} 
                 className="w-full text-white bg-red-500 hover:bg-red-600 p-4 rounded-lg font-bold transition-transform transform hover:scale-105 shadow-md"
               >
                 Report
               </button>
            </div>
          </div>
        </div>
        );
      })()}

      <div ref={lessonsSectionRef} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-gray-200 relative">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Available Lessons</h3>
        {availableLessons.length === 0 ? (
          <p className="text-gray-500">No new lessons from the teacher.</p>
        ) : (
          <div className={`space-y-4 ${activeSession ? 'opacity-60 pointer-events-none select-none' : ''}`}>
            {availableLessons.map((lesson, index) => {
              const isNew = lesson.status === 'pending';
              const divBg = isNew ? 'bg-emerald-50' : 'bg-yellow-50'; 
              const divBorder = isNew ? 'border-emerald-200' : 'border-yellow-200';
              const textHColor = isNew ? 'text-emerald-900' : 'text-yellow-900';
              const textPColor = isNew ? 'text-emerald-700' : 'text-yellow-700';
              const buttonBg = isNew ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-yellow-500 hover:bg-yellow-600';
              
              const lessonKeyList = computeLessonKey(lesson.title, lesson.link);
              const earnedTrophiesMapList = studentProfile?.earnedTrophies || {};
              const previouslyEarnedList = earnedTrophiesMapList[lessonKeyList] || 0;
              const maxAvailableList = lesson.trophyLimit || 0;
              const remainingList = Math.max(0, maxAvailableList - previouslyEarnedList);
              const sessionsForLessonList = completedSessions.filter(s => s.lessonTitle === lesson.title);
              const completedUnitList = getEffectiveCompletedUnit(lesson, studentProfile, sessionsForLessonList, ssCompletionCounts);
              const nextUnitNumber = lesson.unitCount > 0 ? Math.min(lesson.unitCount, completedUnitList + 1) : completedUnitList + 1;
              const latestSessionForLesson = completedSessions.find(s => s.lessonTitle === lesson.title && typeof s.completedUnit === 'number' && s.completedUnit > 0);
              const showNowFinished = !!latestSessionForLesson;
              const isSmartStudyLesson = !!(lesson.link && lesson.link.startsWith('smartstudy://'));
              const ssClassIdForBtn = isSmartStudyLesson ? extractSmartStudyClassId(lesson.link) : null;
              const buttonText = isNew
                ? (lesson.unitCount > 0 ? `Start ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Start Lesson')
                : (lesson.unitCount > 0 ? `Continue ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Continue Lesson');

              const recentCompletedSession = mySessions
                .filter(s => s.lessonTitle === lesson.title && s.endTime && s.startTime)
                .sort((a, b) => {
                  const bT = b.endTime?.toDate?.()?.getTime?.() ?? 0;
                  const aT = a.endTime?.toDate?.()?.getTime?.() ?? 0;
                  return bT - aT;
                })[0];
              const canRedoReport = recentCompletedSession
                && recentCompletedSession.endTime?.toDate
                && (nowTick - recentCompletedSession.endTime.toDate().getTime()) < 60 * 60 * 1000;

              return (
                <div key={lesson.id} ref={index === 0 ? firstLessonRef : null} className={`${divBg} ${divBorder} border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-lg ${textHColor}`}>{lesson.title}</p>
                      {isSmartStudyLesson && ssClassIdForBtn && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {ssClassIdForBtn}</span>
                      )}
                      {lesson.link && lesson.link.startsWith('abhidhamma://') && extractAbhidhammaLessonId(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {extractAbhidhammaLessonId(lesson.link)}</span>
                      )}
                      {lesson.link && lesson.link.startsWith('dhammaschool://') && extractDhammaschoolClassId(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {extractDhammaschoolClassId(lesson.link)}</span>
                      )}
                      {lesson.link && groupSchemeOfLink(lesson.link) && extractGroupPartKey(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {groupPartLabel(groupSchemeOfLink(lesson.link), extractGroupPartKey(lesson.link))}</span>
                      )}
                      {lesson.unitCount > 0 && completedUnitList >= lesson.unitCount && (
                        <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">✅ Completed</span>
                      )}
                    </div>
                    <p className={`text-sm ${textPColor}`}>Sent: {formatTimestamp(lesson.sentAt)}</p>
                    {lesson.details && <p className={`text-sm ${textPColor} font-medium mt-1`}>Lesson ID: {lesson.details}</p>}
                    {lesson.link && lesson.link.startsWith('smartstudy://') && (
                      <SmartStudyProgressBadge
                        classId={extractSmartStudyClassId(lesson.link)}
                        studentName={studentProfile?.name}
                        smartStudyNames={studentProfile?.smartStudyNames || null}
                        onCountChange={(count) => setSsCompletionCounts(prev => ({ ...prev, [extractSmartStudyClassId(lesson.link)]: count }))}
                      />
                    )}
                    {/* One unified message for every app (Smart Study, Abhidhamma,
                        Dhammaschool included) — same line, not split across a
                        <br/>, so it always reads as a single clear sentence:
                        "You completed up to X / Y. Now you finished X." Uses the
                        same getEffectiveCompletedUnit() number as the Completed
                        badge and the Continue button above, so they can never
                        disagree with each other. */}
                    {lesson.unitCount > 0 && (completedUnitList > 0 || showNowFinished) && (
                      <p className="text-sm font-bold text-indigo-700 mt-1">
                        You completed up to {lesson.unitLabel || 'Chapter'} {completedUnitList}{lesson.unitCount > 0 ? ` / ${lesson.unitCount}` : ''}.
                        {showNowFinished && ` Now you finished ${lesson.unitLabel || 'Chapter'} ${latestSessionForLesson.completedUnit}.`}
                      </p>
                    )}
                    {maxAvailableList > 0 && lesson.unitCount > 0 && (
                      <p className={`text-xs ${textPColor} italic mt-1`}>
                        Note: {(() => {
                          const rate = maxAvailableList / lesson.unitCount;
                          if (rate >= 1) {
                            const rounded = Math.round(rate * 10) / 10;
                            return `Every 1 ${lesson.unitLabel || 'Chapter'} completed ≈ ${rounded} Trophy(s).`;
                          }
                          return `Every ${Math.ceil(lesson.unitCount / maxAvailableList)} ${lesson.unitLabel || 'Chapter'}(s) completed = 1 Trophy.`;
                        })()}
                      </p>
                    )}
                    {maxAvailableList > 0 && remainingList > 0 && (
                      <div className="mt-3">
                         <span className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm font-bold px-3 py-1.5 rounded-full shadow-sm">
                           🏆 Remaining Trophies: <span className="text-lg mx-1">{remainingList}</span>
                         </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto gap-2">
                    <button
                      onClick={() => handleStartLesson(lesson)}
                      disabled={!!activeSession}
                      className={`px-5 py-3 rounded-lg text-white font-semibold ${buttonBg} transition-transform transform hover:scale-105 shadow-md flex-shrink-0 w-full sm:w-auto disabled:opacity-50`}
                    >
                      {buttonText}
                    </button>
                    {/* Same 1-hour "Report" window for every linked app, including
                        SmartStudy — handleOpenRedoReport already re-fetches fresh
                        SmartStudy-specific data when needed, so there's no reason
                        this needed to be a special "always show" case. */}
                    {canRedoReport && !activeSession && (
                      <button
                        onClick={() => handleOpenRedoReport(recentCompletedSession)}
                        className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600 shadow-md flex-shrink-0 w-full sm:w-auto"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-1 text-gray-800">Completed Session History</h3>
        <p className="text-sm text-gray-500 mb-4">Showing the last 30 days.</p>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {completedSessions.length === 0 ? (
            <p className="text-gray-500">No completed sessions yet.</p>
          ) : (
            completedSessions.map(session => (
              <div key={session.id} className="bg-emerald-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">{session.lessonTitle}</p>
                <p className="text-sm text-gray-600">Started: {formatTimestamp(session.startTime)}</p>
                <p className="text-sm text-gray-600">Finished: {formatTimestamp(session.endTime)}</p>
                <p className="text-sm text-gray-600">Duration: {getDuration(session.startTime, session.endTime)}</p>
                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold">Feedback:</p>
                  <p className="text-sm text-gray-700 mb-1">{session.feedbackNotes || 'N/A'}</p>
                  <p className="text-sm font-semibold mt-2">Score:</p>
                  <p className="text-sm text-gray-700">{session.score || 'N/A'}</p>
                  {session.completedUnit && session.completedUnit > 0 ? (
                     <p className="text-sm font-semibold text-indigo-600 mt-2">You completed up to {session.lessonUnitLabel || 'Chapter'} {session.completedUnit}.</p>
                  ) : null}
                  {session.awardedTrophies && session.awardedTrophies > 0 ? (
                     <p className="text-sm font-semibold text-yellow-600 mt-2">🏆 Trophies Awarded: {session.awardedTrophies}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EntryDetailsModal({ isOpen, onClose, entry }) {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">Session Details</h3>
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <span className="block text-sm font-medium text-gray-600">Time:</span>
            <span className="block font-semibold text-gray-900">
              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg">
            <span className="block text-sm font-medium text-gray-600">Student:</span>
            <span className="block font-semibold text-gray-900">
              {entry.studentName}
            </span>
          </div>
          {entry.isRecurring && (
            <div className="p-3 bg-violet-100 rounded-lg">
              <p className="font-medium text-violet-800">This is a recurring session.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
}

function AttendanceCountModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4 text-center">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">Attendance Check</h3>
        {data.loading ? (
          <p className="text-gray-600">Calculating...</p>
        ) : data.error ? (
          <p className="text-red-600">Error fetching data.</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-800 mb-2">{data.name}</p>
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {data.attended} / {data.total}
            </div>
            <p className="text-gray-600 mb-6">sessions attended</p>
            {data.starMessages && data.starMessages.length > 0 && (
              <div className="text-left mb-2">
                <p className="font-semibold text-yellow-700 mb-2">⭐ Special Mentions</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.starMessages.map((m, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">{m.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTimestamp(m.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-center">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
}

const praiseMessages = [
  "Great job!", "Well done!", "Session complete!", "Keep up the good work!", 
  "Awesome effort!", "You're a star!", "Amazing!", "Fantastic work!"
];
const praiseEmojis = ['👍', '🎉', '🤩', '✨', '🚀', '🌟', '🥳'];

const getRandomPraise = () => ({ 
  message: praiseMessages[Math.floor(Math.random() * praiseMessages.length)],
  emoji: praiseEmojis[Math.floor(Math.random() * praiseEmojis.length)]
});

function PraiseModal({ isOpen, onClose, newTrophy, totalTrophies, message, emoji }) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;
  const title = newTrophy ? "Congratulations!" : message;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[110]">
      <div className="bg-transparent p-6 w-full max-w-sm mx-4 text-center flex flex-col items-center">
        <div className="text-[150px] leading-none mb-4 animate-bounce drop-shadow-2xl">{newTrophy ? '🏆' : emoji}</div>
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full">
          <h3 className="text-3xl font-black mb-4 text-emerald-700">{title}</h3>
          {newTrophy ? (
            <p className="text-xl text-gray-800 mb-6 font-medium">You earned a new trophy!<br />You now have <span className="font-bold text-yellow-600">{totalTrophies}</span> trophies.</p>
          ) : (
            <p className="text-lg text-gray-700 mb-6 font-medium">Session complete!<br />Keep up the good work!</p>
          )}
          <div className="flex justify-center">
            <button onClick={onClose} className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 shadow-lg w-full">Awesome!</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodaySchedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const q = query(
      teacherScheduleCollection,
      where("startTime", ">=", Timestamp.fromDate(startOfDay)),
      where("startTime", "<=", Timestamp.fromDate(endOfDay))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setSchedule(scheduleList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching today's schedule:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) { 
      const start = new Date();
      start.setHours(hour, 0, 0);
      const end = new Date();
      end.setHours(hour + 1, 0, 0);

      const timeLabel = `${start.toLocaleString('en-US', { hour: 'numeric', hour12: true })} - ${end.toLocaleString('en-US', { hour: 'numeric', hour12: true })}`;

      const entries = schedule.filter(e => { 
        const entryStartHour = e.startTime.toDate().getHours();
        return entryStartHour === hour;
      });

      if (entries.length > 0) { 
        slots.push(
          <div key={hour} className="w-full text-left p-4 rounded-lg bg-red-100 border border-red-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-red-800">{timeLabel}</span>
              <span className="font-bold text-red-900">BUSY</span>
            </div>
            <div className="space-y-2">
              {entries.map(entry => (
                <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left p-2 rounded-lg bg-white hover:bg-red-50 transition-colors">
                  <p className="text-sm text-red-700 font-medium">{entry.studentName}</p>
                </button>
              ))}
            </div>
          </div>
        );
      } else {
        slots.push(
          <div key={hour} className="w-full p-4 rounded-lg bg-emerald-100 border border-emerald-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-800">{timeLabel}</span>
              <span className="font-bold text-emerald-900">FREE</span>
            </div>
          </div>
        );
      }
    }
    return slots;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <EntryDetailsModal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} entry={selectedEntry} />
      
      <h2 className="text-3xl font-bold mb-6 text-violet-700">Today's Schedule</h2>
      <p className="text-lg text-gray-600 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {loading ? (
        <p className="text-gray-600">Loading today's schedule...</p>
      ) : (
        <div className="space-y-3">{renderTimeSlots()}</div>
      )}
    </div>
  );
}

function WeeklySchedule({ role, targetStudentUid }) {
  const [schedule, setSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0); 
  
  const [showCountModal, setShowCountModal] = useState(false);
  const [modalData, setModalData] = useState({ name: '', attended: 0, total: 0, loading: false });
  const [showOverrideModal, setShowOverrideModal] = useState({ isOpen: false, entry: null, newStatus: null });
  const myEntryRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);
  
  const getWeekStart = (offset = 0) => {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7)); 
    const dayOfWeek = today.getDay(); 
    const startDate = new Date(today.setDate(today.getDate() - dayOfWeek));
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  };

  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(weekOffset));

  useEffect(() => {
    setWeekStartDate(getWeekStart(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const q = query(
      teacherScheduleCollection,
      where("startTime", ">=", Timestamp.fromDate(weekStartDate)),
      where("startTime", "<", Timestamp.fromDate(weekEndDate))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setSchedule(scheduleList);
    });
    
    const qSessions = query(
      sessionsCollection,
      where("startTime", ">=", Timestamp.fromDate(weekStartDate)), 
      where("startTime", "<", Timestamp.fromDate(weekEndDate))   
    );
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
    });

    return () => {
      unsubscribe();
      unsubSessions();
    };
  }, [weekStartDate]);
  useEffect(() => {
    if (hasScrolledToMineRef.current || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myEntryRef.current) {
        myEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [schedule, targetStudentUid]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(weekStartDate);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [weekStartDate]);

  const openCountModal = async (studentUid, studentName) => {
    setModalData({ name: studentName, attended: 0, total: 0, loading: true });
    setShowCountModal(true);

    try {
      let scheduleQuery;
      if (studentUid === 'offline') {
          scheduleQuery = query(teacherScheduleCollection, where("studentName", "==", studentName));
      } else {
          scheduleQuery = query(teacherScheduleCollection, where("studentUid", "==", studentUid));
      }
      
      const scheduleSnapshot = await getDocs(scheduleQuery);
      let allScheduled = scheduleSnapshot.docs.map(d => d.data());
      
      const now = new Date();
      allScheduled = allScheduled.filter(e => e.startTime.toDate() <= now);

      if (studentUid === 'offline') {
          allScheduled = allScheduled.filter(e => e.studentUid === 'offline');
      }

      let allSessions = [];
      if (studentUid !== 'offline') {
          const sessionQuery = query(sessionsCollection, where("studentUid", "==", studentUid));
          const sessionSnapshot = await getDocs(sessionQuery);
          allSessions = sessionSnapshot.docs.map(d => d.data());
      }

      let attendedCount = 0;
      allScheduled.forEach(entry => {
        if (entry.overrideStatus === 'attended') {
            attendedCount++;
        } else if (entry.overrideStatus === 'absent') {
            
        } else if (studentUid !== 'offline') {
            const entryDate = entry.startTime.toDate();
            const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 0, 0, 0);
            const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

            const attended = allSessions.find(s =>
                s.startTime.toDate() >= startOfDay &&
                s.startTime.toDate() <= endOfDay
            );
            if (attended) attendedCount++;
        }
      });
      
      let starMessages = [];
      try {
        const starQuery = studentUid === 'offline'
          ? query(starAnnouncementsCollection, where("studentName", "==", studentName))
          : query(starAnnouncementsCollection, where("studentUid", "==", studentUid));
        const starSnap = await getDocs(starQuery);
        starMessages = starSnap.docs
          .map(d => d.data())
          .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      } catch (e) {
        console.error("Error fetching star messages:", e);
      }

      setModalData({ name: studentName, attended: attendedCount, total: allScheduled.length, starMessages, loading: false });
    } catch (e) {
      console.error("Error fetching attendance count:", e);
      setModalData({ name: studentName, attended: 0, total: 0, loading: false, error: true }); 
    }
  }
  
  const openOverrideModal = (entry, newStatus) => {
    let statusText = '';
    if (newStatus === 'attended') statusText = 'Attended';
    else if (newStatus === 'absent') statusText = 'Absent';
    else statusText = 'Automatic';
    
    setShowOverrideModal({
      isOpen: true, entry: entry, newStatus: newStatus, title: 'Confirm Attendance',
      message: `Are you sure you want to mark ${entry.studentName} as ${statusText.toLowerCase()}?`, confirmText: 'Confirm'
    });
  };

  const confirmOverride = async () => {
    const { entry, newStatus } = showOverrideModal;
    if (!entry) return;

    try {
      const docRef = doc(db, `${publicDataPath}/teacherSchedule`, entry.id);
      await updateDoc(docRef, { overrideStatus: newStatus });
    } catch (error) {
      console.error("Error overriding attendance:", error);
    }
    
    setShowOverrideModal({ isOpen: false, entry: null, newStatus: null }); 
  };

  return (
    <div className="p-6">
      <AttendanceCountModal isOpen={showCountModal} onClose={() => setShowCountModal(false)} data={modalData} />
      <ConfirmationModal
        isOpen={showOverrideModal.isOpen} onClose={() => setShowOverrideModal({ isOpen: false, entry: null, newStatus: null })}
        onConfirm={confirmOverride} title={showOverrideModal.title} message={showOverrideModal.message}
        confirmText={showOverrideModal.confirmText} confirmColor="bg-indigo-600 hover:bg-indigo-700"
      />
      
      <h2 className="text-3xl font-bold mb-6 text-violet-700">Teacher's Weekly Schedule</h2>
      
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setWeekOffset(o => o - 1)} className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow-md">&larr; Previous Week</button>
        <h3 className="text-lg font-semibold text-gray-700">
          {weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &nbsp;-&nbsp; {new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </h3>
        <button onClick={() => setWeekOffset(o => o + 1)} className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow-md">Next Week &rarr;</button>
      </div>

      <div className="space-y-6">
        {daysOfWeek.map(day => {
          const dayEntries = schedule.filter(entry => {
            const entryDate = entry.startTime.toDate();
            return entryDate.getDate() === day.getDate() && entryDate.getMonth() === day.getMonth() && entryDate.getFullYear() === day.getFullYear();
          });

          return (
            <div key={day.toISOString()} className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200">
              <h4 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">
                {day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h4>
              <div className="space-y-2">
                {dayEntries.length === 0 ? (
                  <p className="text-gray-500">No sessions scheduled.</p>
                ) : (
                  dayEntries.map(entry => {
                    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
                    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

                    const isOnline = entry.studentUid !== 'offline';
                    const isPast = entry.endTime.toDate() < new Date();
                    let attendanceStatus = 'upcoming';
                    let bgColor = 'bg-violet-50';
                    let attendanceTime = null; 
                    
                    if (entry.overrideStatus === 'attended') {
                        attendanceStatus = 'attended'; bgColor = 'bg-emerald-100';
                    } else if (entry.overrideStatus === 'absent') {
                        attendanceStatus = 'absent'; bgColor = 'bg-red-100';
                    } else if (isOnline) {
                      const attendedSession = sessions
                        .filter(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay)
                        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate())[0]; 
                      
                      if (attendedSession) {
                        attendanceStatus = 'attended'; bgColor = 'bg-emerald-100'; attendanceTime = attendedSession.startTime; 
                      } else if (isPast) {
                        attendanceStatus = 'absent'; bgColor = 'bg-red-100'; 
                      }
                    } else { 
                      if (isPast) {
                        attendanceStatus = 'unmarked'; bgColor = 'bg-orange-50';
                      }
                    }
                    
                    const isMine = targetStudentUid && entry.studentUid === targetStudentUid;
                    
                    return (
                      <div key={entry.id} ref={isMine ? myEntryRef : null} className={`p-3 rounded-lg flex items-center justify-between ${bgColor} ${isMine ? 'ring-2 ring-indigo-500' : ''}`}>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: stringToColor(entry.studentName) }}></div>
                          <button onClick={() => openCountModal(entry.studentUid, entry.studentName)} className="text-left disabled:cursor-not-allowed">
                            <p className={`font-semibold ${attendanceStatus === 'absent' ? 'text-red-900' : (attendanceStatus === 'attended' ? 'text-emerald-900' : 'text-violet-900')}`}>
                              {entry.studentName}{isMine && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>}
                            </p>
                            <p className="text-sm text-gray-700">
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                               {entry.isRecurring && <span className="ml-2 text-xs font-medium bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">Recurring</span>}
                              {attendanceStatus === 'attended' && <span className="ml-2 text-xs font-bold text-emerald-700">(Attended{attendanceTime ? ` at ${formatTime(attendanceTime)}` : ''})</span>}
                              {attendanceStatus === 'absent' && <span className="ml-2 text-xs font-bold text-red-700">(Absent)</span>}
                            </p>
                          </button>
                        </div>
                        
                        {role === 'teacher' && isPast && (
                          <div className="flex space-x-1 flex-shrink-0">
                            {attendanceStatus !== 'attended' && (
                              <button onClick={() => openOverrideModal(entry, 'attended')} title="Mark Attended" className="p-1 rounded-full text-emerald-600 hover:bg-emerald-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                            {attendanceStatus !== 'absent' && (
                              <button onClick={() => openOverrideModal(entry, 'absent')} title="Mark Absent" className="p-1 rounded-full text-red-600 hover:bg-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                            {entry.overrideStatus && (
                              <button onClick={() => openOverrideModal(entry, null)} title="Reset to Automatic" className="p-1 rounded-full text-indigo-600 hover:bg-indigo-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 3a1 1 0 011 1v2.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8 6.586V4a1 1 0 011-1zM12 10a1 1 0 01-1 1H8a1 1 0 010-2h3a1 1 0 011 1zM11.414 13.293a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L10 13.586l1.293-1.293a1 1 0 011.414 1.414l-3 3z" clipRule="evenodd" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function YearAttendanceBoard({ role, targetStudentUid }) {
  const [students, setStudents] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [hiddenOfflineNames, setHiddenOfflineNames] = useState([]);
  const myRowRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(studentsCollection, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Only this year's schedule is needed here — a single range filter on one
    // field doesn't require a composite index, and cuts the download size a
    // lot for classes with years of history.
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(teacherScheduleCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setTeacherSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(sessionsCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(teacherConfigDoc, (docSnap) => {
      if (docSnap.exists()) setHiddenOfflineNames(docSnap.data().hiddenOfflineNames || []);
    });
    return () => unsub();
  }, []);

  const toggleHideOffline = async (name) => {
    try {
      const updated = hiddenOfflineNames.includes(name)
        ? hiddenOfflineNames.filter(n => n !== name)
        : [...hiddenOfflineNames, name];
      await setDoc(teacherConfigDoc, { hiddenOfflineNames: updated }, { merge: true });
    } catch (e) {
      console.error("Error updating hidden list:", e);
    }
  };

  const rankedList = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const offlineNames = [...new Set(teacherSchedule.filter(s => s.studentUid === 'offline').map(s => s.studentName))];
    const offlineEntries = offlineNames.map(name => ({ id: `offline-${name}`, name, isOffline: true }));
    const onlineEntries = students.filter(s => s.isActive === true).map(s => ({ id: s.id, name: s.name, isOffline: false }));
    const allEntries = [...onlineEntries, ...offlineEntries];

    const computed = allEntries.map(entry => {
      let attended = 0, absent = 0;
      teacherSchedule.forEach(sched => {
        const isMatch = entry.isOffline
          ? (sched.studentUid === 'offline' && sched.studentName === entry.name)
          : (sched.studentUid === entry.id);
        if (!isMatch) return;
        const entryDate = sched.startTime.toDate();
        if (entryDate > now || entryDate < startOfYear) return;

        if (sched.overrideStatus === 'attended') attended++;
        else if (sched.overrideStatus === 'absent') absent++;
        else if (!entry.isOffline) {
          const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
          const didAttend = sessions.some(s => s.studentUid === entry.id && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
          if (didAttend) attended++; else absent++;
        } else {
          absent++;
        }
      });
      return { ...entry, attended, absent, total: attended + absent };
    });

    return computed.filter(e => e.total > 0).sort((a, b) => b.attended - a.attended);
  }, [students, teacherSchedule, sessions]);

  const visibleList = rankedList.filter(e => !e.isOffline || !hiddenOfflineNames.includes(e.name));

  useEffect(() => {
    if (hasScrolledToMineRef.current || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myRowRef.current) {
        myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [visibleList, targetStudentUid]);

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">This Year's Attendance</h2>
      <div className="space-y-3">
        {visibleList.length === 0 ? (
          <p className="text-gray-500">No attendance data yet this year.</p>
        ) : (
          visibleList.map((entry, idx) => {
            const isMine = targetStudentUid && !entry.isOffline && entry.id === targetStudentUid;
            return (
            <div key={entry.id} ref={isMine ? myRowRef : null} className={`bg-white p-4 rounded-xl shadow-md flex items-center justify-between border ${isMine ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'}`}>
              <div className="flex items-center">
                <span className="text-xl font-bold text-indigo-400 w-8">{idx + 1}</span>
                <div className="w-3 h-3 rounded-full mx-3 flex-shrink-0" style={{ backgroundColor: stringToColor(entry.name) }}></div>
                <div>
                  <p className="font-semibold text-gray-900">{entry.name} {isMine && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>} {entry.isOffline && <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Offline</span>}</p>
                  <p className="text-sm text-gray-600">Attended {entry.attended} / {entry.total}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-emerald-600">{entry.attended}</span>
                {role === 'teacher' && entry.isOffline && (
                  <button onClick={() => toggleHideOffline(entry.name)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200">
                    Hide
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
      {role === 'teacher' && hiddenOfflineNames.length > 0 && (
        <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="font-semibold text-gray-700 mb-3">Hidden Offline Students</p>
          <div className="flex flex-wrap gap-2">
            {hiddenOfflineNames.map(name => (
              <button key={name} onClick={() => toggleHideOffline(name)} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                {name} (Unhide)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyBoard({ role, targetStudentUid, studentProfile }) {
  const [students, setStudents] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [expandedGivers, setExpandedGivers] = useState(null);
  const myRowRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(studentsCollection, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(teacherScheduleCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setTeacherSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(sessionsCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const rankedList = useMemo(() => {
    return students
      .filter(s => s.isActive === true && (s.trophyCount || 0) > 0)
      .sort((a, b) => (b.trophyCount || 0) - (a.trophyCount || 0));
  }, [students]);
  useEffect(() => {
    if (hasScrolledToMineRef.current || role !== 'student' || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myRowRef.current) {
        myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [rankedList, role, targetStudentUid]);

  const myAttendedThisYear = useMemo(() => {
    if (role !== 'student' || !targetStudentUid) return 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let attended = 0;
    teacherSchedule.forEach(sched => {
      if (sched.studentUid !== targetStudentUid) return;
      const entryDate = sched.startTime.toDate();
      if (entryDate > now || entryDate < startOfYear) return;
      if (sched.overrideStatus === 'attended') attended++;
      else if (sched.overrideStatus === 'absent') return;
      else {
        const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
        const didAttend = sessions.some(s => s.studentUid === targetStudentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
        if (didAttend) attended++;
      }
    });
    return attended;
  }, [teacherSchedule, sessions, targetStudentUid, role]);

  const heartsGivenSoFar = studentProfile?.heartsGivenCount || 0;
  const remainingHearts = role === 'student' ? Math.max(0, myAttendedThisYear - heartsGivenSoFar) : null;

  const handleHeart = async (recipientId) => {
    if (role === 'student' && remainingHearts <= 0) return;
    const giverName = role === 'student' ? (studentProfile?.name || 'A student') : 'Teacher';
    const giverKey = sanitizeKey(giverName);
    try {
      const recipientRef = doc(db, `${publicDataPath}/students`, recipientId);
      const updateData = { heartsReceived: increment(1) };
      updateData[`heartsFromCounts.${giverKey}_name`] = giverName;
      updateData[`heartsFromCounts.${giverKey}_count`] = increment(1);
      await updateDoc(recipientRef, updateData);
      if (role === 'student' && targetStudentUid) {
        const giverRef = doc(db, `${publicDataPath}/students`, targetStudentUid);
        await updateDoc(giverRef, { heartsGivenCount: increment(1) });
      }
    } catch (e) {
      console.error("Error sending heart:", e);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <h2 className="text-3xl font-bold mb-2 text-yellow-600">🏆 Trophies Awarded</h2>
      {role === 'student' && (
        <p className="text-sm text-gray-600 mb-6">
          You can send <span className="font-bold text-rose-600">{remainingHearts}</span> more ❤️ this year (based on {myAttendedThisYear} attended sessions).
        </p>
      )}
      <div className="space-y-3">
        {rankedList.length === 0 ? (
          <p className="text-gray-500">No trophies awarded yet.</p>
        ) : (
          rankedList.map((student, idx) => {
            const isSelf = role === 'student' && student.id === targetStudentUid;
            const heartsFromCounts = student.heartsFromCounts || {};
            const giverKeys = [...new Set(Object.keys(heartsFromCounts).map(k => k.replace(/_name$|_count$/, '')))];
            const givers = giverKeys.map(k => ({
              name: heartsFromCounts[`${k}_name`],
              count: heartsFromCounts[`${k}_count`] || 0
            })).filter(g => g.name).sort((a, b) => b.count - a.count);
            const isExpanded = expandedGivers === student.id;
            return (
              <div key={student.id} ref={isSelf ? myRowRef : null} className={`bg-white p-4 rounded-xl shadow-md border ${isSelf ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-yellow-400 w-8">{idx + 1}</span>
                    <div className="w-3 h-3 rounded-full mx-3 flex-shrink-0" style={{ backgroundColor: stringToColor(student.name) }}></div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.name} {isSelf && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>}</p>
                      <p className="text-sm text-yellow-700 font-bold">🏆 {student.trophyCount}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleHeart(student.id)}
                    disabled={isSelf || (role === 'student' && remainingHearts <= 0)}
                    title={isSelf ? "You can't heart yourself" : (role === 'student' && remainingHearts <= 0 ? "No hearts remaining this year" : "Send a heart")}
                    className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-transform hover:scale-105"
                  >
                    <span className="text-xl">❤️</span>
                    <span className="font-bold text-rose-600">{student.heartsReceived || 0}</span>
                  </button>
                </div>
                {isSelf && givers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => setExpandedGivers(isExpanded ? null : student.id)} className="text-sm text-rose-600 font-semibold hover:underline">
                      {isExpanded ? 'Hide' : 'See'} who sent you hearts ({givers.length})
                    </button>
                    {isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {givers.map((g, i) => (
                          <span key={i} className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full border border-rose-200">{g.name} × {g.count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RoleSelection({ user, onSelectRole, onStudentLogin, teacherUid, onRecoverTeacher }) {
  const [studentName, setStudentName] = useState('');
  const [studentIdLogin, setStudentIdLogin] = useState('');
  const [formError, setFormError] = useState(''); 
  const [view, setView] = useState('new'); 
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPasscode, setRecoveryPasscode] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  // Hidden trigger: tapping "Welcome" 5 times reveals the recovery passcode
  // box directly — no visible "Locked out?" link, so a student or anyone
  // else looking at this screen has no way to even know a recovery path
  // exists. Resets if there's a pause between taps (avoids someone stumbling
  // into it by repeatedly tapping over a long session).
  const [welcomeTapCount, setWelcomeTapCount] = useState(0);
  const welcomeTapTimerRef = useRef(null);
  const handleWelcomeTap = () => {
    if (welcomeTapTimerRef.current) clearTimeout(welcomeTapTimerRef.current);
    const next = welcomeTapCount + 1;
    if (next >= 5) {
      setShowRecovery(true);
      setWelcomeTapCount(0);
      return;
    }
    setWelcomeTapCount(next);
    welcomeTapTimerRef.current = setTimeout(() => setWelcomeTapCount(0), 2000);
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!recoveryPasscode.trim()) { setFormError('Please enter the recovery passcode.'); return; }
    setRecoverySubmitting(true);
    await onRecoverTeacher(recoveryPasscode.trim(), setFormError);
    setRecoverySubmitting(false);
  };

  useEffect(() => {
    const savedId = localStorage.getItem('lastStudentId');
    if (savedId) {
      setStudentIdLogin(savedId);
    }
  }, []);

  const handleSelectStudent = (e) => {
    e.preventDefault();
    setFormError(''); 
    if (studentName.trim()) {
      onSelectRole('student', studentName.trim(), setFormError); 
    } else {
      setFormError('Please enter your name.'); 
    }
  };
  
  const handleStudentLogin = (e) => {
    e.preventDefault();
    setFormError(''); 
    if (studentIdLogin.trim()) {
      onStudentLogin(studentIdLogin.trim().toUpperCase(), (errorMsg) => { 
        if(errorMsg) setFormError(errorMsg); 
      });
    } else {
      setFormError('Please enter your Student ID.'); 
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full">
        {/* Looks and behaves like a plain heading — no underline, no pointer
            cursor, no color change — so there's nothing visually suggesting
            it's tappable. See handleWelcomeTap for what 5 quick taps does. */}
        <h2
          onClick={handleWelcomeTap}
          className="text-2xl font-bold text-center mb-6 text-gray-800 select-none"
        >
          Welcome
        </h2>

        {!teacherUid && (
          <>
            <button onClick={() => { setFormError(''); onSelectRole('teacher', '', setFormError); }} className="w-full bg-indigo-500 text-white p-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors shadow-md">
              I am a Teacher
            </button>
            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink mx-4 text-gray-500">OR</span><div className="flex-grow border-t border-gray-300"></div>
            </div>
          </>
        )}

        {/* Teacher account already exists on this app, but this browser/device
            isn't recognized as it (e.g. cleared storage, new device, another
            app on the same origin signed this session out). A known recovery
            passcode re-associates teacher access with this browser instead of
            needing a manual database fix. No visible entry point into this —
            reached only via the 5-tap "Welcome" trigger above, on purpose. */}
        {teacherUid && showRecovery && (
          <div className="mb-6 text-center">
              <form onSubmit={handleRecoverySubmit} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-left">
                <p className="text-sm font-semibold text-indigo-800 mb-2">Enter your Teacher recovery passcode:</p>
                <input
                  type="password"
                  value={recoveryPasscode}
                  onChange={(e) => setRecoveryPasscode(e.target.value)}
                  placeholder="Recovery passcode"
                  autoFocus
                  className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowRecovery(false); setFormError(''); setRecoveryPasscode(''); }} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={recoverySubmitting} className="flex-1 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 disabled:opacity-50">
                    {recoverySubmitting ? 'Checking...' : 'Recover Access'}
                  </button>
                </div>
              </form>
          </div>
        )}

        <div>
          <div className="flex mb-4 rounded-lg bg-gray-100 p-1">
            <button onClick={() => setView('new')} className={`w-1/2 p-2 rounded-lg font-semibold ${view === 'new' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>New Student</button>
            <button onClick={() => setView('existing')} className={`w-1/2 p-2 rounded-lg font-semibold ${view === 'existing' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>Existing Account</button>
          </div>
          
          {view === 'new' && (
            <form onSubmit={handleSelectStudent}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Create New Student Account</h3>
              {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>} 
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Your Name</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g., John Doe" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-md">Create Account</button>
            </form>
          )}
          
          {view === 'existing' && (
             <form onSubmit={handleStudentLogin}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Login with Existing Account</h3>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Your Student ID</label>
                <input type="text" value={studentIdLogin} onChange={(e) => setStudentIdLogin(e.target.value)} placeholder="ABC123" className="w-full p-3 border rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>} 
              <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-md">Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingScreen({ name }) {
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome, {name}!</h2>
        <p className="text-lg text-gray-700">Your account is waiting for approval from the teacher.</p>
        <p className="text-gray-600 mt-4">Please check back later.</p>
        <div className="mt-6 text-5xl">👍</div>
      </div>
    </div>
  );
}

function DeactivatedScreen() {
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-red-200 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700">Account Deactivated</h2>
        <p className="text-lg text-gray-700">Your account has been deactivated by the teacher.</p>
        <p className="text-gray-600 mt-4">Please contact the teacher if you believe this is an error.</p>
        <div className="mt-6 text-5xl">🚫</div>
      </div>
    </div>
  );
}

export default function TutoringApp({ onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenConsonantPractice, onOpenBurmeseGame, onOpenMyanmarSpeaking, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2 }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [role, setRole] = useState(null); 
  const [studentProfile, setStudentProfile] = useState(null);
  const [teacherUid, setTeacherUid] = useState(null); 
  const [targetStudentUid, setTargetStudentUid] = useState(null); 
  const [view, setView] = useState('login'); 
  const [announcements, setAnnouncements] = useState([]); 
  const [starAnnouncements, setStarAnnouncements] = useState([]);
  const [dismissedStars, setDismissedStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedStarAnnouncements') || '[]');
    } catch (e) { return []; }
  });
  
  const [displayedStar, setDisplayedStar] = useState(null);
  const handledStarIdsRef = useRef(new Set());
  const hasShownStarThisSessionRef = useRef(false);
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  // These four used to share one bottom-center button with Login/Register,
  // cycling through all five on every click -- a student trying to log in
  // could need up to four clicks just to reach the login option. Now they
  // live in their own small square (below the 🔔), and Login/Register is
  // its own always-visible button below.
  const navItems = [
    { label: 'Today', target: 'today' },
    { label: 'Week', target: 'weekly' },
    { label: 'Year', target: 'attendance' },
    { label: '🏆', target: 'trophies' }
  ];
  const handleNavClick = () => {
    setView(navItems[navIndex].target);
    setNavIndex((navIndex + 1) % navItems.length);
  };
  const handleLoginButtonClick = () => {
    if (role === 'teacher') {
      setView('teacher');
    } else if (role === 'student') {
      setView('student');
    } else {
      const savedId = localStorage.getItem('lastStudentId');
      if (savedId) {
        handleStudentLoginById(savedId, () => setView('login'));
      } else {
        setView('login');
      }
    }
  };

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setIsAuthReady(true);
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !db) return; 
    
    const unsubscribe = onSnapshot(teacherConfigDoc, 
      (doc) => {
        if (doc.exists()) {
          setTeacherUid(doc.data().uid);
        } else {
          setTeacherUid(''); 
        }
      }, 
      (error) => {
        console.error("Error fetching teacher config:", error);
        setTeacherUid('');
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  useEffect(() => {
    if (isAuthReady && user && teacherUid !== null) { 
      checkUserRole(user.uid)
        .catch(err => {
          console.error("Critical error during user role check:", err);
          setRole(null);
          setView('today'); 
        })
        .finally(() => {
          setRoleCheckDone(true);
        });
    }
  }, [user, isAuthReady, teacherUid]);
  
  useEffect(() => {
    if (role === 'student' && targetStudentUid) {
      console.log('[DIAG] Attaching student profile listener for uid:', targetStudentUid);
      const studentDocRef = doc(db, `${publicDataPath}/students`, targetStudentUid);
      
      const unsubscribe = onSnapshot(studentDocRef, (doc) => {
        console.log('[DIAG] Student profile snapshot fired. exists:', doc.exists(), 'uid:', targetStudentUid, 'fromCache:', doc.metadata?.fromCache);
        if (doc.exists()) {
          setStudentProfile(doc.data());
        } else {
          console.warn('[DIAG] Student doc does NOT exist — resetting role/view. uid was:', targetStudentUid);
          setRole(null);
          setTargetStudentUid(null);
          setStudentProfile(null);
          if (view !== 'login') setView('today'); 
        }
      }, (error) => {
        console.error("[DIAG] Error listening to student profile:", error);
        setRole(null);
        setTargetStudentUid(null);
        setStudentProfile(null);
        if (view !== 'login') setView('today');
      });

      return () => { console.log('[DIAG] Unsubscribing student profile listener for uid:', targetStudentUid); unsubscribe(); };
    }
  }, [role, targetStudentUid]); 
  
  useEffect(() => {
    if (!db || !isAuthReady) return; 
    
    const q = query(
      announcementsCollection, 
      where("expiresAt", ">", Timestamp.now()), 
      orderBy("expiresAt", "desc"), 
      limit(5)
    );
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const annList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(annList);
    }, (error) => {
      console.error("Error fetching announcements:", error);
    });
    
    return () => unsubscribe();
  }, [isAuthReady]); 

  useEffect(() => {
    if (!db || !isAuthReady) return;
    
    const q = query(
      starAnnouncementsCollection,
      where("expiresAt", ">", Timestamp.now()),
      orderBy("expiresAt", "desc"),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStarAnnouncements(list);
    }, (error) => {
      console.error("Error fetching star announcements:", error);
    });
    
    return () => unsubscribe();
  }, [isAuthReady]);

  const dismissStarAnnouncement = async (id) => {
    setDismissedStars(prev => [...prev, id]);
    if (role === 'student' && targetStudentUid) {
      try {
        await updateDoc(doc(db, `${publicDataPath}/students`, targetStudentUid), {
          seenStarAnnouncements: arrayUnion(id)
        });
      } catch (e) {
        console.error("Error saving seen star announcement:", e);
      }
    } else {
      try {
        const updated = [...dismissedStars, id];
        localStorage.setItem('dismissedStarAnnouncements', JSON.stringify(updated));
      } catch (e) {}
    }
  };
  const seenStarIds = role === 'student'
    ? [...dismissedStars, ...(studentProfile?.seenStarAnnouncements || [])]
    : dismissedStars;
  const starDataReady = roleCheckDone && (role !== 'student' || !!studentProfile);

  useEffect(() => {
    if (!starDataReady || displayedStar || hasShownStarThisSessionRef.current) return;
    const next = starAnnouncements.find(a => !seenStarIds.includes(a.id) && !handledStarIdsRef.current.has(a.id));
    if (!next) return;
    handledStarIdsRef.current.add(next.id);
    hasShownStarThisSessionRef.current = true;
    setDisplayedStar(next);
    dismissStarAnnouncement(next.id);
  }, [starAnnouncements, seenStarIds, starDataReady, displayedStar]);

  useEffect(() => {
    if (!displayedStar) return;
    const timer = setTimeout(() => setDisplayedStar(null), 10000);
    return () => clearTimeout(timer);
  }, [displayedStar?.id]);

  const checkUserRole = async (uid) => {
    console.log('[DIAG] checkUserRole called. uid:', uid, 'current targetStudentUid:', targetStudentUid, 'current view:', view);
    if (!uid || targetStudentUid) { console.log('[DIAG] checkUserRole bailed early (no uid, or targetStudentUid already set)'); return; }

    try { 
      if (teacherUid && uid === teacherUid) {
        console.log('[DIAG] checkUserRole: matched as TEACHER');
        setRole('teacher');
        if(view !== 'teacher') setView('teacher');
        return;
      }

      // If someone explicitly logged in with a displayId (Existing Account flow),
      // honour that choice on refresh — even if this Firebase auth uid also
      // belongs to a different student's primary doc.  Keeps "logged out as A,
      // logged in as B, refresh" from snapping back to A.
      const savedDisplayId = localStorage.getItem('lastStudentId');
      if (savedDisplayId) {
        console.log('[DIAG] checkUserRole: found lastStudentId in localStorage, preferring displayId login:', savedDisplayId);
        handleStudentLoginById(savedDisplayId, () => {
          localStorage.removeItem('lastStudentId');
          setView('login');
        });
        return;
      }

      const studentDocRef = doc(db, `${publicDataPath}/students`, uid);
      const studentDoc = await getDoc(studentDocRef);
      
      if (studentDoc.exists()) {
        console.log('[DIAG] checkUserRole: matched as STUDENT (own uid doc)');
        setRole('student');
        setTargetStudentUid(uid); 
        if(view !== 'student') setView('student');
      } else {
        const q = query(studentsCollection, where("authorizedUids", "array-contains", uid));
        const linkedSnapshot = await getDocs(q);

        if (!linkedSnapshot.empty) {
            const linkedDoc = linkedSnapshot.docs[0];
            console.log('[DIAG] checkUserRole: matched as STUDENT (linked authorizedUids), doc id:', linkedDoc.id);
            setRole('student');
            setTargetStudentUid(linkedDoc.id); 
            setView('student');
            return; 
        }

        console.log('[DIAG] checkUserRole: NOT recognized as teacher or student. Leaving role null.');
        setRole(null); 
        if (view !== 'login') setView('today'); 
      }
    } catch (error) { 
      console.error("[DIAG] Error checking user role:", error);
      setRole(null);
      if (view !== 'login') setView('today'); 
    }
  };

  const handleRecoverTeacherAccess = async (passcode, setFormError) => {
    if (!user) return;
    try {
      const configSnap = await getDoc(teacherConfigDoc);
      if (!configSnap.exists() || !configSnap.data().passcode) {
        setFormError('No recovery passcode has been set for this account yet. Ask whoever manages this app to set one, or fix it directly in the database.');
        return;
      }
      if (configSnap.data().passcode !== passcode) {
        setFormError('Incorrect passcode.');
        return;
      }
      // Correct passcode — reclaim teacher status for this browser/device.
      await setDoc(teacherConfigDoc, { uid: user.uid }, { merge: true });
      setTeacherUid(user.uid);
      setRole('teacher');
      setView('teacher');
    } catch (error) {
      console.error('Error recovering teacher access:', error);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleSelectRole = async (selectedRole, studentName = '', setFormError) => {
    if (!user) return;
    const uid = user.uid;
    
    if (setFormError) setFormError('');

    if (selectedRole === 'teacher' && !teacherUid) {
      try {
        await setDoc(teacherConfigDoc, { uid: uid });
        setTeacherUid(uid);
        setRole('teacher');
        setView('teacher');
      } catch (error) {
        console.error("Error creating teacher account:", error);
        if (setFormError) setFormError('An error occurred. Please try again.');
      }
    } else if (selectedRole === 'student') {
      // Generate a numeric-only 6-digit display ID (all existing IDs are numeric —
      // uid.substring(0,6) previously produced alphanumeric IDs since Firebase
      // anonymous auth UIDs are base62 strings, not numeric).
      const generateNumericDisplayId = async () => {
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = String(Math.floor(100000 + Math.random() * 900000)); // 100000-999999
          const dupSnap = await getDocs(query(studentsCollection, where("displayId", "==", candidate)));
          if (dupSnap.empty) return candidate;
        }
        // Extremely unlikely fallback: timestamp-derived digits
        return String(Date.now()).slice(-6);
      };
      const displayId = await generateNumericDisplayId();
      const newStudentProfile = {
        name: studentName, displayId: displayId, isActive: 'pending', createdAt: serverTimestamp(),
        trophyCount: 0, completedCount: 0, dailySubmissionCount: 0, lastSubmissionDate: null,
        trophyRequested: false, justEarnedTrophy: false, seenAnnouncements: []
      };
      try {
        await setDoc(doc(db, `${publicDataPath}/students`, uid), newStudentProfile);
        setRole('student');
        setTargetStudentUid(uid); 
        setView('student');
      } catch (error) {
        console.error("Error creating new student account:", error);
        if (setFormError) setFormError('An error occurred. Please try again.');
      }
    }
  };
  
  const handleStudentLogout = () => {
    try { localStorage.removeItem('lastStudentId'); } catch (e) {}
    setRole(null);
    setTargetStudentUid(null);
    setStudentProfile(null);
    setView('login');
  };

  const handleStudentLoginById = async (displayId, onError) => {
    console.log('[DIAG] handleStudentLoginById called with displayId:', displayId);
    const q = query(studentsCollection, where("displayId", "==", displayId));
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log('[DIAG] No student found with that displayId');
        onError('Invalid Student ID.'); 
      } else {
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        const studentDocId = studentDoc.id; 
        console.log('[DIAG] Found student doc id:', studentDocId, 'isActive:', studentData.isActive, 'current session uid:', user?.uid);
        
        if (studentData.isActive === true || studentData.isActive === 'pending') {
          setRole('student');
          setTargetStudentUid(studentDocId); 
          setView('student');
          console.log('[DIAG] Set role=student, targetStudentUid=', studentDocId, ', view=student');

          if (user && user.uid !== studentDocId) {
            try {
               const studentRef = doc(db, `${publicDataPath}/students`, studentDocId);
               await updateDoc(studentRef, { authorizedUids: arrayUnion(user.uid) });
               console.log('[DIAG] Linked current session uid to student doc via authorizedUids');
            } catch (err) {
               console.error("[DIAG] Error linking account:", err);
            }
          }
          
          localStorage.setItem('lastStudentId', displayId);

        } else if (studentData.isActive === false) {
          onError('This account has been deactivated.'); 
        } else {
          onError('An error occurred. Please try again.');
        }
      }
    } catch (e) {
      console.error("Error logging in by ID:", e);
      onError('An error occurred. Please try again.'); 
    }
  };

  const renderContent = () => {
    if (!db) {
      return (
        <div className="flex justify-center items-center min-h-screen p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg text-center shadow-md max-w-lg">
            <strong className="font-bold text-lg">Initialization Failed!</strong>
            <p className="mt-2">Could not connect to the database. This can happen due to an invalid configuration or network issues.</p>
            <p className="mt-1">Please check the console (F12) for errors and contact the administrator.</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthReady || !user || teacherUid === null) { 
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-xl font-semibold text-indigo-600">Loading System...</div>
        </div>
      );
    }

    switch (view) {
      case 'teacher':
        if (role !== 'teacher') return <TodaySchedule role={role} />; 
        return <TeacherDashboard user={user} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} onOpenMyanmarReader={onOpenMyanmarReader} onOpenDhammaschool={onOpenDhammaschool} onOpenConsonantPractice={onOpenConsonantPractice} onOpenBurmeseGame={onOpenBurmeseGame} onOpenMyanmarSpeaking={onOpenMyanmarSpeaking} onOpenNumberLearning={onOpenNumberLearning} onOpenVowelsLearning={onOpenVowelsLearning} onOpenAnimalSound={onOpenAnimalSound} onOpenBurmeseLearningGames={onOpenBurmeseLearningGames} onOpenInteractiveQuiz={onOpenInteractiveQuiz} onOpenMyanmarPoems={onOpenMyanmarPoems} onOpenConsonantEndings={onOpenConsonantEndings} onOpenTimeAndCalendar={onOpenTimeAndCalendar} onOpenMyanmarSpelling={onOpenMyanmarSpelling} onOpenMyanmarSoundPractice={onOpenMyanmarSoundPractice} onOpenReadingMyanmar={onOpenReadingMyanmar} onOpenSpeakingMyanmar={onOpenSpeakingMyanmar} onOpenMyanmarPart1And2={onOpenMyanmarPart1And2} />;
      case 'student':
        if (role !== 'student') return <TodaySchedule role={role} />; 
        if (!studentProfile) {
          return (
            <div className="flex justify-center items-center min-h-screen">
              <div className="text-xl font-semibold text-emerald-600">Loading Student Profile...</div>
            </div>
          );
        }
        return <StudentDashboard user={user} studentProfile={studentProfile} studentUid={targetStudentUid} announcements={announcements} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} onOpenMyanmarReader={onOpenMyanmarReader} onOpenDhammaschool={onOpenDhammaschool} onOpenMyanmarSpeaking={onOpenMyanmarSpeaking} onOpenConsonantPractice={onOpenConsonantPractice} onOpenBurmeseGame={onOpenBurmeseGame} onOpenNumberLearning={onOpenNumberLearning} onOpenVowelsLearning={onOpenVowelsLearning} onOpenAnimalSound={onOpenAnimalSound} onOpenBurmeseLearningGames={onOpenBurmeseLearningGames} onOpenInteractiveQuiz={onOpenInteractiveQuiz} onOpenMyanmarPoems={onOpenMyanmarPoems} onOpenConsonantEndings={onOpenConsonantEndings} onOpenTimeAndCalendar={onOpenTimeAndCalendar} onOpenMyanmarSpelling={onOpenMyanmarSpelling} onOpenMyanmarSoundPractice={onOpenMyanmarSoundPractice} onOpenReadingMyanmar={onOpenReadingMyanmar} onOpenSpeakingMyanmar={onOpenSpeakingMyanmar} onOpenMyanmarPart1And2={onOpenMyanmarPart1And2} onLogout={handleStudentLogout} />;
      case 'weekly': 
        return <WeeklySchedule role={role} targetStudentUid={targetStudentUid} />;
      case 'attendance':
        return <YearAttendanceBoard role={role} targetStudentUid={targetStudentUid} />;
      case 'trophies':
        return <TrophyBoard role={role} targetStudentUid={targetStudentUid} studentProfile={studentProfile} />;
      case 'login': 
        return <RoleSelection user={user} onSelectRole={(role, name, setError) => handleSelectRole(role, name, setError)} onStudentLogin={handleStudentLoginById} teacherUid={teacherUid} onRecoverTeacher={handleRecoverTeacherAccess} />;
      case 'today': 
      default:
        return <TodaySchedule role={role} />;
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 font-sans">
      <audio id="notification-sound" src="https://raw.githubusercontent.com/nathantun93/bell/main/message.mp3" preload="auto"></audio>
      {displayedStar && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%]">
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-2xl shadow-2xl p-5">
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-1">⭐ Outstanding Student</p>
            <p className="text-lg font-bold text-yellow-900 mb-1">{displayedStar.studentName}</p>
            <p className="text-yellow-800 mb-3">{displayedStar.message}</p>
            <div className="flex justify-center">
              <button onClick={() => setDisplayedStar(null)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-2 rounded-lg shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthReady && user && (
        <>
          {/* Small square, no taller than the 🔔 (StudentDashboard's bell
              sits at top-4, so this is positioned just below it) -- cycles
              Today/Week/Year/Trophies one at a time on tap, short labels so
              it stays compact on phones. */}
          <div className="fixed top-16 right-4 z-[9400]">
            <button
              onClick={handleNavClick}
              title={navItems[navIndex].target === 'today' ? "Today's Schedule" : navItems[navIndex].target === 'weekly' ? 'Weekly Schedule' : navItems[navIndex].target === 'attendance' ? 'This Year Attended' : 'Trophies Awarded'}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl w-11 h-11 flex items-center justify-center shadow-lg text-[11px] font-bold text-indigo-700 leading-none"
            >
              {navItems[navIndex].label}
            </button>
          </div>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button onClick={handleLoginButtonClick} className="px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition-colors">
              {role === 'teacher' ? 'Teacher' : role === 'student' ? (studentProfile?.name || 'Student') : 'Login / Register'}
            </button>
          </div>
        </>
      )}

      <main>
        {renderContent()}
      </main>
    </div>
  );
}
