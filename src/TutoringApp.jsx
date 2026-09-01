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
// TODO: replace with the actual hosted URL once the Dhammaschool app app is deployed.
const DHAMMASCHOOL_APP_URL = 'https://YOUR-DHAMMASCHOOL-URL-HERE';

const extractDhammaschoolLessonId = (link) => {
  if (!link || !link.startsWith('dhammaschool://')) return null;
  return link.replace('dhammaschool://', '') || null;
};

const sanitizeKey = (key) => {
  if (!key || typeof key !== 'string') return 'unknown_lesson';
  return key.replace(/[\.\#\$\/\[\]]/g, '_');
};
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

function TeacherDashboard({ user, onOpenSmartStudy, onOpenAbhidhamma }) {
  const [students, setStudents] = useState([]);
  const [lessonBank, setLessonBank] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [teacherSchedule, setTeacherSchedule] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [viewMode, setViewMode] = useState('send'); 
  const [reportTab, setReportTab] = useState('feedback'); 
  const [showAllReports, setShowAllReports] = useState(false); 
  const [teacherConfigData, setTeacherConfigData] = useState(null);
  
  const [newBankLessonTitle, setNewBankLessonTitle] = useState('');
  const [newBankLessonLink, setNewBankLessonLink] = useState('');
  const [newBankLessonDetails, setNewBankLessonDetails] = useState(''); 
  const [newBankLessonTrophyLimit, setNewBankLessonTrophyLimit] = useState(0);
  const [newBankLessonUnitLabel, setNewBankLessonUnitLabel] = useState('Chapter');
  const [newBankLessonUnitCount, setNewBankLessonUnitCount] = useState(0);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [smartStudyClasses, setSmartStudyClasses] = useState(null); // null = not loaded yet
  const [pickerAppSelected, setPickerAppSelected] = useState(false); // true once "Smart Study app" is chosen, showing Class ID list
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
  // SmartStudy completion counts for the selected student (loaded when student+lesson are selected)
  const [ssStudentClassCount, setSsStudentClassCount] = useState(null);   // per-class (e.g. BUDDHA)
  const [ssStudentTotalCount, setSsStudentTotalCount] = useState(null);   // all classes combined
  const [abhiStudentCount, setAbhiStudentCount] = useState(null);
  const [abhiStudentScore, setAbhiStudentScore] = useState(null);
  const [abhiTotalCount,   setAbhiTotalCount]   = useState(null); // total lessons in the abhi class
  const [sendAbhidhammaClassId, setSendAbhidhammaClassId] = useState(''); // class chosen in Send Action for abhidhamma:// lessons
  const [sendDhammaschoolLessonId, setSendDhammaschoolLessonId] = useState(''); // lesson chosen in Send Action for dhammaschool:// lessons
  const [dhammaschoolLessons, setDhammaschoolLessons] = useState(null); // null = not yet loaded
  const [dhammaschoolLoading, setDhammaschoolLoading] = useState(false);
  const [dhammaschoolStudentProgress, setDhammaschoolStudentProgress] = useState(null); // { completed:boolean, score:number }
  const [abhidhammaClasses, setAbhidhammaClasses] = useState(null);   // null = not yet loaded
  const [abhidhammaLoading, setAbhidhammaLoading] = useState(false);
  const [sendTargetType, setSendTargetType] = useState('student'); 
  const [selectedGroupId, setSelectedGroupId] = useState(''); 
  const [sendStudentSearch, setSendStudentSearch] = useState(''); 
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false); 
  const [directTrophyAmount, setDirectTrophyAmount] = useState(1);
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

  // Dhammaschool app — student completion + score for Assign Lesson
  useEffect(() => {
    setDhammaschoolStudentProgress(null);
    if (!sendDhammaschoolLessonId || !selectedStudentUid) return;
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    (async () => {
      try {
        const compRef = doc(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions', `${sendDhammaschoolLessonId}_${student.id}`);
        const compSnap = await getDoc(compRef);
        let bestScore = 0;
        try {
          const scoresSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
            where('lessonId', '==', sendDhammaschoolLessonId),
            where('studentName', '==', student.name)
          ));
          scoresSnap.docs.forEach(d => { bestScore = Math.max(bestScore, Number(d.data().score) || 0); });
        } catch (e) {}
        setDhammaschoolStudentProgress({ completed: compSnap.exists(), score: bestScore });
      } catch (e) {
        console.error('Dhammaschool progress fetch:', e);
        setDhammaschoolStudentProgress({ completed: false, score: 0 });
      }
    })();
  }, [sendDhammaschoolLessonId, selectedStudentUid]);

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

  const loadDhammaschoolLessons = async () => {
    if (dhammaschoolLessons !== null) return;
    setDhammaschoolLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'));
      const list = snap.docs
        .map(d => ({ id: d.id, name: d.data().name || d.id, isPublic: d.data().isPublic || false }))
        .filter(l => l.isPublic); // only lessons the teacher made public
      list.sort((a, b) => a.name.localeCompare(b.name));
      setDhammaschoolLessons(list);
    } catch (err) {
      console.error('Error loading Dhammaschool lessons:', err);
      setDhammaschoolLessons([]);
    }
    setDhammaschoolLoading(false);
  };

  const loadAbhidhammaClasses = async () => {
    if (abhidhammaClasses !== null) return;
    setAbhidhammaLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes'));
      const list = snap.docs.map(d => ({ classId: d.id, displayName: d.data().displayName || d.id }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setAbhidhammaClasses(list);
    } catch (err) {
      console.error('Error loading Abhidhamma classes:', err);
      setAbhidhammaClasses([]);
    }
    setAbhidhammaLoading(false);
  };

  const loadSmartStudyClassList = async () => {
    if (smartStudyClasses !== null) return; // already loaded/cached
    setPickerLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
      const list = snap.docs.map(d => ({ classId: d.id, lessonCount: (d.data().lessons || []).length }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setSmartStudyClasses(list);
    } catch (err) {
      console.error('Error loading Smart Study classes:', err);
      setSmartStudyClasses([]);
    }
    setPickerLoading(false);
  };

  const chooseSmartStudyClass = (classId) => {
    setNewBankLessonLink(`smartstudy://${classId}`);
    if (!newBankLessonTitle.trim()) setNewBankLessonTitle(`Smart Study: ${classId}`);
    setShowLinkPicker(false);
    setPickerAppSelected(false);
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
        await updateDoc(lessonDoc, lessonData);
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
    // For SmartStudy, use the selected class's lesson count as effective
    // unitCount so student receives correct number even if bank entry not saved.
    const ssSelectedClass = (sendSmartStudyClassId && smartStudyClasses)
      ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
      : null;
    const effectiveLessonUnitCount = (ssSelectedClass && lessonToSend?.link === 'smartstudy://')
      ? (ssSelectedClass.lessonCount || 0)
      : (lessonToSend?.unitCount || 0);
    const effectiveLessonTrophyLimit = (ssSelectedClass && lessonToSend?.link === 'smartstudy://')
      ? Math.max(1, Math.floor((ssSelectedClass.lessonCount || 0) / 5))
      : (lessonToSend?.trophyLimit || 0);
    // For Smart Study lessons stored without a classId, substitute the one
    // chosen in the Send Action class picker.
    const effectiveLessonLink = (() => {
      if (!lessonToSend?.link) return '';
      if (lessonToSend.link === 'smartstudy://' && sendSmartStudyClassId) return `smartstudy://${sendSmartStudyClassId}`;
      if (lessonToSend.link === 'abhidhamma://' && sendAbhidhammaClassId) return `abhidhamma://${sendAbhidhammaClassId}`;
      return lessonToSend.link;
    })();

    if (!lessonToSend) return;

    const deleteExistingLessons = async (sUid, title) => {
      const q = query(lessonsCollection, where("studentUid", "==", sUid), where("title", "==", title));
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
            await deleteExistingLessons(studentUid, lessonToSend.title);
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
          await deleteExistingLessons(selectedStudentUid, lessonToSend.title);
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

  const handleAwardDirectTrophies = async (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentUid);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);

    if (!student || !lesson) return;

    const lessonKey = sanitizeKey(lesson.title);
    const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
    const maxAvailable = lesson.trophyLimit || 0;
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
            const unitCount = lesson.unitCount || 0;
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
    } catch (error) {
      console.error("Error approving student:", error);
    }
  };

  const handleApproveTrophy = async (studentId, studentName, amount = 1, lessonTitle = null, sessionId = null) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      
      const updateData = {
        trophyRequested: false,
        trophyCount: increment(amount),
        justEarnedTrophy: true,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophySessionId: null
      };
      
      if (lessonTitle) {
        updateData[`earnedTrophies.${sanitizeKey(lessonTitle)}`] = increment(amount);
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

  const handleRejectTrophy = async (studentId, sessionId, lessonTitle) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      const updateData = {
        trophyRequested: false,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophySessionId: null
      };

      if (sessionId && lessonTitle) {
        const sessionDoc = await getDoc(doc(db, `${publicDataPath}/studySessions`, sessionId));
        if (sessionDoc.exists()) {
          const previousCompletedUnit = sessionDoc.data().previousCompletedUnit || 0;
          updateData[`completedUnits.${sanitizeKey(lessonTitle)}`] = previousCompletedUnit;
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
          <button onClick={() => setViewMode('students')} className={`py-2 px-4 font-medium ${viewMode === 'students' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600 hover:text-rose-600'}`}>
            Students
            {(pendingStudents.length > 0 || trophyRequests.length > 0) && (
              <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">{pendingStudents.length + trophyRequests.length}</span>
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
            <select value={selectedBankLessonId} onChange={(e) => { setSelectedBankLessonId(e.target.value); setSendSmartStudyClassId(''); setSendAbhidhammaClassId(''); }} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>-- Select a lesson --</option>
              {lessonBank.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} ({lesson.details})</option>)}
            </select>
          </div>

          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'smartstudy://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">📚 Smart Study app — choose a Class ID</label>
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

          {/* Dhammaschool app — lesson picker (no class-ID concept in this app, just individual public lessons) */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'dhammaschool://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📖 Dhammaschool app — choose a Lesson</label>
                {dhammaschoolLessons === null ? (
                  <button type="button" onClick={loadDhammaschoolLessons}
                    className="w-full p-3 border rounded-lg bg-orange-50 text-orange-700 font-semibold hover:bg-orange-100"
                  >
                    Load Dhammaschool lessons…
                  </button>
                ) : dhammaschoolLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading lessons…</p>
                ) : dhammaschoolLessons.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No public lessons found in Dhammaschool app yet.</p>
                ) : (
                  <select
                    value={sendDhammaschoolLessonId}
                    onChange={(e) => setSendDhammaschoolLessonId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>-- Choose a lesson --</option>
                    {dhammaschoolLessons.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {/* Dhammaschool app — student progress (completion + score) */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedStudentUid || !selectedLesson || selectedLesson.link !== 'dhammaschool://' || !sendDhammaschoolLessonId) return null;
            const student = students.find(s => s.id === selectedStudentUid);
            if (!student) return null;
            return (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-orange-800 font-bold mb-1">Student Progress on this Dhammaschool Lesson:</p>
                {dhammaschoolStudentProgress === null
                  ? <p className="text-sm text-orange-600">Loading…</p>
                  : dhammaschoolStudentProgress.completed
                    ? <p className="text-sm text-orange-700">{student.name} completed this lesson · Score: <strong>{(dhammaschoolStudentProgress.score || 0).toLocaleString()} pts</strong></p>
                    : <p className="text-sm text-orange-600">Not completed yet.</p>
                }
              </div>
            );
          })()}

          {/* Abhidhamma student progress (when abhi class selected) */}


          {selectedStudentUid && selectedBankLessonId && sendTargetType === 'student' && (() => {
              const student = students.find(s => s.id === selectedStudentUid);
              const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
              if (!student || !lesson) return null;
              
              const lessonKey = sanitizeKey(lesson.title);
              const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
              // When a SmartStudy class is selected, use per-class trophy limit and unit count
              const ssClassForTrophy = (sendSmartStudyClassId && smartStudyClasses)
                ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
                : null;
              const effectiveUnitCountForDisplay = ssClassForTrophy
                ? (ssClassForTrophy.lessonCount || 0)
                : (lesson.unitCount || 0);
              const maxAvailable = ssClassForTrophy
                ? Math.max(1, Math.floor((ssClassForTrophy.lessonCount || 0) / 5))
                : (lesson.trophyLimit || 0);
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
                          Student Progress on this {lesson.link?.startsWith('abhidhamma://') && sendAbhidhammaClassId ? `${sendAbhidhammaClassId} ` : ssClassForTrophy ? `${ssClassForTrophy.classId} ` : ''}Lesson:
                        </p>
                        {(() => {
                          const isAbhi = lesson.link?.startsWith('abhidhamma://');
                          const displayedCompleted = isAbhi
                            ? (abhiStudentCount ?? completedUnit)
                            : ssClassForTrophy
                              ? (ssStudentClassCount ?? completedUnit)
                              : (ssStudentTotalCount ?? completedUnit);
                          const displayedTotal = isAbhi
                            ? (abhiTotalCount ?? effectiveUnitCountForDisplay)
                            : effectiveUnitCountForDisplay;
                          const unitLabel = isAbhi ? 'Lesson' : (lesson.unitLabel || 'Lesson');
                          return displayedCompleted > 0 ? (
                            <p className="text-sm text-indigo-700">
                              {student.name} completed up to {unitLabel} {displayedCompleted} / {displayedTotal}.
                            </p>
                          ) : (
                            <p className="text-sm text-indigo-700">No progress reported yet for this lesson.</p>
                          );
                        })()}
                      </div>
                    )}

                    {maxAvailable > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-bold mb-2">
                          Trophy Status{lesson.link?.startsWith('abhidhamma://') && sendAbhidhammaClassId ? ` for ${sendAbhidhammaClassId}` : ssClassForTrophy ? ` for ${ssClassForTrophy.classId}` : ' for this Lesson'}:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                          <li>Max Available: <strong>{maxAvailable}</strong></li>
                          <li>Previously Earned: <strong>{previouslyEarned}</strong></li>
                          <li>Remaining to Award: <strong>{remaining}</strong></li>
                        </ul>
                        
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
                          <p className="font-semibold text-gray-900">{session.lessonTitle}</p>
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
                          onClick={() => handleApproveTrophy(student.id, student.name, amount, student.requestedTrophyLessonTitle, student.requestedTrophySessionId)} 
                          className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md bg-yellow-500 hover:bg-yellow-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectTrophy(student.id, student.requestedTrophySessionId, student.requestedTrophyLessonTitle)}
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
                  onClick={() => { setShowLinkPicker(v => !v); if (!showLinkPicker) loadSmartStudyClassList(); }}
                  className="px-4 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 shadow-md flex-shrink-0"
                  title="Choose a Smart Study lesson, or enter a link manually"
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
              {newBankLessonLink === 'abhidhamma://' && (
                <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-amber-800 font-semibold">📚 Abhidhamma app — lesson chosen in Send Action</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}
              {newBankLessonLink === 'dhammaschool://' && (
                <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-orange-800 font-semibold">📖 Dhammaschool app — lesson chosen in Send Action</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}

              {showLinkPicker && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl p-3 max-h-96 overflow-y-auto">
                  {pickerAppSelected ? (
                    <div>
                      <button type="button" onClick={() => setPickerAppSelected(false)} className="text-sm text-indigo-600 font-semibold mb-3 hover:underline">
                        ← Back
                      </button>
                      <p className="font-bold text-gray-800 mb-2">📚 Smart Study app — choose a Class ID</p>
                      {pickerLoading ? (
                        <p className="text-gray-500 text-sm">Loading classes...</p>
                      ) : smartStudyClasses && smartStudyClasses.length > 0 ? (
                        <div className="space-y-1">
                          {smartStudyClasses.map(c => (
                            <button
                              type="button"
                              key={c.classId}
                              onClick={() => chooseSmartStudyClass(c.classId)}
                              className="w-full text-left p-2 rounded-lg hover:bg-sky-50 border border-transparent hover:border-sky-200 flex justify-between items-center"
                            >
                              <span className="font-semibold text-gray-800">{c.classId}</span>
                              <span className="text-xs text-gray-500">{c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No Smart Study classes found yet.</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowLinkPicker(false)}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 border border-gray-200 mb-2 font-semibold text-gray-700"
                      >
                        ✏️ Input link manually
                      </button>
                      <p className="text-xs text-gray-500 font-semibold mt-3 mb-1 uppercase">Or choose app</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBankLessonLink('smartstudy://');
                          if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Smart Study Lesson');
                          setShowLinkPicker(false);
                          setPickerAppSelected(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-sky-50 border border-transparent hover:border-sky-200 font-semibold text-gray-800"
                      >
                        📚 Smart Study app
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBankLessonLink('abhidhamma://');
                          if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Abhidhamma Lesson');
                          setShowLinkPicker(false);
                          setPickerAppSelected(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 font-semibold text-gray-800 mt-1"
                      >
                        📚 Abhidhamma app
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBankLessonLink('dhammaschool://');
                          if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Dhammaschool Lesson');
                          setShowLinkPicker(false);
                          setPickerAppSelected(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 font-semibold text-gray-800 mt-1"
                      >
                        📖 Dhammaschool app
                      </button>
                    </div>
                  )}
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
                <label className="block text-gray-700 mb-2">Total Number</label>
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
function SmartStudyProgressBadge({ classId, studentName, smartStudyNames, compact, autoTrophy, onCountChange }) {
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

  // Auto-request trophies based on Smart Study completion count — no manual
  // report needed. Only runs on the student side (autoTrophy prop supplied).
  // Still goes through the teacher's normal Approve step, same as any other
  // trophy request, for consistency and safety.
  useEffect(() => {
    if (!autoTrophy || completedCount === null) return;
    const { studentUid, unitCount, trophyLimit, lessonKey, earnedSoFar, alreadyRequested, completedUnitsTracked } = autoTrophy;
    if (!studentUid || !unitCount || !trophyLimit || alreadyRequested) return;
    const effectiveUnit = Math.min(unitCount, completedCount);
    if (effectiveUnit <= completedUnitsTracked && earnedSoFar >= trophyLimit) return;
    const deservedSoFar = Math.min(trophyLimit, Math.floor((effectiveUnit * trophyLimit) / unitCount));
    const newlyAvailable = Math.max(0, deservedSoFar - earnedSoFar);
    if (newlyAvailable <= 0 && effectiveUnit <= completedUnitsTracked) return;
    (async () => {
      try {
        const updateData = {};
        if (effectiveUnit > completedUnitsTracked) updateData[`completedUnits.${lessonKey}`] = effectiveUnit;
        if (newlyAvailable > 0) {
          updateData.trophyRequested = true;
          updateData.requestedTrophyAmount = newlyAvailable;
          updateData.requestedTrophyLessonId = null;
          updateData.requestedTrophyLessonTitle = `Smart Study: ${classId}`;
          updateData.requestedTrophySessionId = null;
        }
        if (Object.keys(updateData).length > 0) {
          await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), updateData);
        }
      } catch (err) {
        console.error('Error auto-requesting Smart Study trophy:', err);
      }
    })();
  }, [autoTrophy, completedCount, classId]);

  if (badError) return null;
  if (completedCount === null) return null;
}

function StudentDashboard({ user, studentProfile, studentUid, announcements, onOpenSmartStudy, onOpenAbhidhamma, onLogout }) { 
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

    const lessonKey = sanitizeKey(targetSession.lessonTitle);
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
    const lessonKey = sanitizeKey(targetSession.lessonTitle);
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
      const unseen = announcements.filter(a => a.studentName !== studentProfile.name && !seenIds.includes(a.id));
      
      const latestPerStudent = {};
      unseen.forEach(a => {
         if (!latestPerStudent[a.studentName] || a.trophyCount > latestPerStudent[a.studentName].trophyCount) {
             latestPerStudent[a.studentName] = a;
         }
      });
      
      setVisibleAnnouncements(Object.values(latestPerStudent));
    }
  }, [announcements, studentProfile]);

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
      const lessonId = extractDhammaschoolLessonId(lesson.link);
      // Standalone HTML app — open in a new tab with query params.
      // NOTE: the Dhammaschool app HTML file needs a small addition to read
      // these params on load (auto-fill student name + jump straight to the
      // lesson, skipping the "Join Class" name modal), matching how
      // SmartStudy/AbhidhammaApp auto-enter students. See snippet below.
      const params = new URLSearchParams({
        student: studentProfile?.name || '',
        lesson: lessonId || '',
      });
      window.open(`${DHAMMASCHOOL_APP_URL}?${params.toString()}`, '_blank', 'noopener,noreferrer');
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
    openLink(formattedUrl);
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
    // Dhammaschool app: fetch score + completion for auto-fill
    if (activeSession.lessonLink?.startsWith('dhammaschool://')) {
      const dhammaschoolLessonId = activeSession.lessonLink.replace('dhammaschool://', '');
      const stuName = studentProfile?.name;
      if (stuName && dhammaschoolLessonId) {
        try {
          const scoresSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
            where('lessonId', '==', dhammaschoolLessonId),
            where('studentName', '==', stuName)
          ));
          let bestScore = 0;
          scoresSnap.docs.forEach(d => { bestScore = Math.max(bestScore, Number(d.data().score) || 0); });
          if (bestScore > 0) setScore(`${bestScore.toLocaleString()} pts`);
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
  };

  const handleOpenRedoReport = async (session) => {
    setRedoSession(session);
    const lessonKey = sanitizeKey(session.lessonTitle);
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
    
    const lessonKey = sanitizeKey(targetSession.lessonTitle);
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
      
      const unitCount = targetSession.lessonUnitCount || 0;
      if (unitCount > 0 && maxAvailable > 0) {
        const deservedSoFar = Math.min(maxAvailable, Math.floor((newHighestUnit * maxAvailable) / unitCount));
        const autoAmount = Math.max(0, deservedSoFar - previouslyEarned);
        if (autoAmount > 0) {
          studentUpdateData.trophyRequested = true;
          studentUpdateData.requestedTrophyAmount = autoAmount;
          studentUpdateData.requestedTrophyLessonId = targetSession.lessonId;
          studentUpdateData.requestedTrophyLessonTitle = targetSession.lessonTitle;
          studentUpdateData.requestedTrophySessionId = targetSession.id;
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
    }
  };

  const handleUpdateStudentName = async () => {
    if (!editingNameText.trim() || !studentUid) return;
    
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentUid);
      await updateDoc(studentDocRef, { name: editingNameText.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating student profile:", error);
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
  const activeLessonKeyForModal = feedbackSession ? sanitizeKey(feedbackSession.lessonTitle) : '';
  const earnedTrophiesMapForModal = studentProfile?.earnedTrophies || {};
  const previouslyEarnedForModal = feedbackSession ? (earnedTrophiesMapForModal[activeLessonKeyForModal] || 0) : 0;
  const maxAvailableForModal = (() => {
    if (!feedbackSession) return 0;
    // For SmartStudy sessions, derive trophy limit from the session's unitCount
    // (set correctly when lesson was sent via effectiveLessonUnitCount).
    // floor(10 lessons / 5) = 2 trophies — no reference to TeacherDashboard state.
    if (feedbackSession.lessonLink?.startsWith('smartstudy://') && feedbackSession.lessonUnitCount > 0) {
      return Math.max(1, Math.floor(feedbackSession.lessonUnitCount / 5));
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
      
      <div className="max-w-4xl mx-auto space-y-4 mb-6">
        {visibleAnnouncements.length > 1 && (
          <div className="flex justify-end mb-2">
            <button onClick={dismissAllAnnouncements} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded-lg font-semibold shadow-sm transition-colors">
              Dismiss All Notifications
            </button>
          </div>
        )}
        {visibleAnnouncements.map(ann => (
          <div key={ann.id} className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 p-5 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-7xl opacity-10 pointer-events-none select-none">🌟</div>
            <div className="flex-1 pr-4 z-10">
              <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-1 flex items-center">
                <span className="mr-2">🗞️</span> Awesome News Update
              </p>
              <p className="text-xl font-bold text-yellow-900 mb-1">
                Let's all congratulate {ann.studentName}! 🎉
              </p>
              <p className="text-yellow-800 text-base">
                {ann.studentName} has proudly earned their <span className="font-black text-2xl text-yellow-600 mx-1">{ann.trophyCount}</span>th trophy! 🏆 Keep up the fantastic work!
              </p>
            </div>
            <button
              onClick={() => dismissAnnouncement(ann.id)}
              className="mt-4 md:mt-0 whitespace-nowrap text-sm bg-white border border-yellow-300 hover:bg-yellow-50 text-yellow-700 px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all hover:scale-105 active:scale-95 z-10"
            >
              Got it!
            </button>
          </div>
        ))}
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
              <button onClick={() => { setIsEditingName(false); setEditingNameText(studentProfile.name); }} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
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
                <button onClick={() => setIsEditingName(true)} className="flex items-center justify-center space-x-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-lg font-semibold transition-colors border border-emerald-200">
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

      {activeSession && (
        <div ref={activeSessionRef} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-3">Active Session</h3>
          <p className="text-lg mb-4">{activeSession.lessonTitle}</p>
          {activeSession.lessonUnitCount > 0 && (
            <p className="text-sm mb-4 font-semibold">
              Studying {activeSession.lessonUnitLabel || 'Chapter'} {(studentProfile?.completedUnits?.[sanitizeKey(activeSession.lessonTitle)] || 0) + 1}
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
                if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
                openLink(url);
                setIsLessonOverlayOpen(true);
              }} 
              disabled={!activeSession.lessonLink} 
              className="w-full sm:w-1/2 bg-blue-500 text-white p-4 rounded-lg font-bold hover:bg-blue-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50"
            >
              Continue
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
      )}

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
              
              const lessonKeyList = sanitizeKey(lesson.title);
              const earnedTrophiesMapList = studentProfile?.earnedTrophies || {};
              const previouslyEarnedList = earnedTrophiesMapList[lessonKeyList] || 0;
              const maxAvailableList = lesson.trophyLimit || 0;
              const remainingList = Math.max(0, maxAvailableList - previouslyEarnedList);
              const completedUnitsMapList = studentProfile?.completedUnits || {};
              const trackedCompletedUnit = completedUnitsMapList[lessonKeyList] || 0;
              const derivedCompletedUnit = (lesson.unitCount > 0 && maxAvailableList > 0)
                ? Math.min(lesson.unitCount, Math.ceil((previouslyEarnedList * lesson.unitCount) / maxAvailableList))
                : 0;
              const completedUnitList = Math.max(trackedCompletedUnit, derivedCompletedUnit);
              const nextUnitNumber = lesson.unitCount > 0 ? Math.min(lesson.unitCount, completedUnitList + 1) : completedUnitList + 1;
              const latestSessionForLesson = completedSessions.find(s => s.lessonTitle === lesson.title && typeof s.completedUnit === 'number' && s.completedUnit > 0);
              const showNowFinished = !!latestSessionForLesson;
              const isSmartStudyLesson = !!(lesson.link && lesson.link.startsWith('smartstudy://'));
              const ssClassIdForBtn = isSmartStudyLesson ? extractSmartStudyClassId(lesson.link) : null;
              const ssCount = ssClassIdForBtn != null ? (ssCompletionCounts[ssClassIdForBtn] ?? null) : null;
              // Next SmartStudy lesson number = completions done + 1 (capped at unitCount)
              const ssNextNum = ssCount !== null
                ? (lesson.unitCount > 0 ? Math.min(lesson.unitCount, ssCount + 1) : ssCount + 1)
                : null;
              const buttonText = isSmartStudyLesson
                ? (ssNextNum !== null
                  ? (isNew ? `Start ${lesson.unitLabel || 'Lesson'} ${ssNextNum}` : `Continue ${lesson.unitLabel || 'Lesson'} ${ssNextNum}`)
                  : (isNew ? `Start ${lesson.unitLabel || 'Lesson'}` : `Continue ${lesson.unitLabel || 'Lesson'}`))
                : (isNew
                  ? (lesson.unitCount > 0 ? `Start ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Start Lesson')
                  : (lesson.unitCount > 0 ? `Continue ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Continue Lesson'));

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
                        autoTrophy={{
                          studentUid,
                          unitCount: lesson.unitCount || 0,
                          trophyLimit: lesson.trophyLimit || 0,
                          lessonKey: lessonKeyList,
                          earnedSoFar: previouslyEarnedList,
                          completedUnitsTracked: trackedCompletedUnit,
                          alreadyRequested: !!studentProfile?.trophyRequested
                        }}
                      />
                    )}
                    {lesson.link && lesson.link.startsWith('smartstudy://') && ssCompletionCounts[extractSmartStudyClassId(lesson.link)] > 0 && (
                      <p className="text-sm font-bold text-indigo-700 mt-1">
                        You completed up to {lesson.unitLabel || 'Lesson'} {ssCompletionCounts[extractSmartStudyClassId(lesson.link)]}
                        {lesson.unitCount > 0 ? ` / ${lesson.unitCount}` : ''}.
                      </p>
                    )}
                    {lesson.unitCount > 0 && (completedUnitList > 0 || showNowFinished) && !(lesson.link && lesson.link.startsWith('smartstudy://')) && (
                      <p className="text-sm font-bold text-indigo-700 mt-1">
                        You completed up to {lesson.unitLabel || 'Chapter'} {Math.max(completedUnitList, latestSessionForLesson?.completedUnit || 0)}{lesson.unitCount > 0 ? ` / ${lesson.unitCount}` : ''}.
                        {showNowFinished && (
                          <>
                            <br />
                            Now you finished {lesson.unitLabel || 'Chapter'} {latestSessionForLesson.completedUnit}.
                          </>
                        )}
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
                    {/* SmartStudy: always show Report (student may have done lessons any time) */}
                    {isSmartStudyLesson && !activeSession && (
                      <button
                        onClick={async () => {
                          // Create a brief session so handleEndSession can fetch SmartStudy data
                          try {
                            const chk = await getDocs(query(sessionsCollection, where("studentUid","==",studentUid), where("endTime","==",null)));
                            if (chk.empty) {
                              await addDoc(sessionsCollection, {
                                studentUid, lessonId: lesson.id, lessonTitle: lesson.title,
                                lessonLink: lesson.link,
                                lessonTrophyLimit: lesson.trophyLimit || 0,
                                lessonUnitCount: lesson.unitCount || 0,
                                lessonUnitLabel: lesson.unitLabel || 'Lesson',
                                startTime: serverTimestamp(), endTime: null,
                                feedbackNotes: null, score: null, awardedTrophies: 0
                              });
                            }
                          } catch(e) { console.error('Report session create:', e); }
                          // Wait briefly for onSnapshot to pick up the session, then open modal
                          setTimeout(() => handleEndSession(), 400);
                        }}
                        className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600 shadow-md flex-shrink-0 w-full sm:w-auto"
                      >
                        Report
                      </button>
                    )}
                    {/* Non-SmartStudy: 1-hour redo window as before */}
                    {!isSmartStudyLesson && canRedoReport && !activeSession && (
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

function RoleSelection({ user, onSelectRole, onStudentLogin, teacherUid }) {
  const [studentName, setStudentName] = useState('');
  const [studentIdLogin, setStudentIdLogin] = useState('');
  const [formError, setFormError] = useState(''); 
  const [view, setView] = useState('new'); 

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
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Welcome</h2>
        
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

export default function TutoringApp({ onOpenSmartStudy, onOpenAbhidhamma }) {
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
  const navItems = [
    { label: "Today's Schedule", target: 'today' },
    { label: 'Weekly Schedule', target: 'weekly' },
    { label: 'This Year Attended', target: 'attendance' },
    { label: 'Trophies Awarded', target: 'trophies' },
    { label: 'Login / Register', target: 'login' }
  ];
  const handleNavClick = () => {
    const target = navItems[navIndex].target;
    if (target === 'login') {
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
    } else {
      setView(target);
    }
    setNavIndex((navIndex + 1) % navItems.length);
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
      const displayId = uid.substring(0, 6).toUpperCase();
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
        return <TeacherDashboard user={user} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} />;
      case 'student':
        if (role !== 'student') return <TodaySchedule role={role} />; 
        if (!studentProfile) {
          return (
            <div className="flex justify-center items-center min-h-screen">
              <div className="text-xl font-semibold text-emerald-600">Loading Student Profile...</div>
            </div>
          );
        }
        return <StudentDashboard user={user} studentProfile={studentProfile} studentUid={targetStudentUid} announcements={announcements} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} onLogout={handleStudentLogout} />;
      case 'weekly': 
        return <WeeklySchedule role={role} targetStudentUid={targetStudentUid} />;
      case 'attendance':
        return <YearAttendanceBoard role={role} targetStudentUid={targetStudentUid} />;
      case 'trophies':
        return <TrophyBoard role={role} targetStudentUid={targetStudentUid} studentProfile={studentProfile} />;
      case 'login': 
        return <RoleSelection user={user} onSelectRole={(role, name, setError) => handleSelectRole(role, name, setError)} onStudentLogin={handleStudentLoginById} teacherUid={teacherUid} />;
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button onClick={handleNavClick} className="px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition-colors">
            {navItems[navIndex].target === 'login'
              ? (role === 'teacher' ? 'Teacher' : role === 'student' ? (studentProfile?.name || 'Student') : 'Login / Register')
              : navItems[navIndex].label}
          </button>
        </div>
      )}

      <main>
        {renderContent()}
      </main>
    </div>
  );
}
