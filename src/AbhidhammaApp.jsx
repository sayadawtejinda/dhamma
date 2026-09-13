import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc, arrayUnion, onSnapshot, query, orderBy, serverTimestamp, addDoc, getDoc, where, getDocs, limit, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import {
  BookOpen, Edit2, Zap, RotateCw, Upload, Download, CheckCircle, MessageCircle, Send, Heart,
  Trophy, Timer, Pause, ChevronDown, ChevronRight, Gamepad2, X, ExternalLink, Youtube, Music,
  User, Baby, Compass, Map, Ship, Globe, Sparkles, Wand2, Lock, CheckCheck, AlertCircle,
  ArrowUp, ArrowDown, Key, ChevronLeft, Users, UserCheck, UserX, Circle, Trash2, Bell,
  ToggleLeft, ToggleRight, Plus, FolderOpen, ImageIcon, FileText, RefreshCw
} from 'lucide-react';
import { auth, db } from './firebase';
import OnlineStatusWidget from './OnlineStatusWidget';

// ─── Constants ───────────────────────────────────────────────────────────────
const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';
const DEFAULT_IMG_BASE  = 'https://raw.githubusercontent.com/nathantun93/dhamma4/main/';
const AUDIO_BASE_URL    = 'https://raw.githubusercontent.com/nathantun93/bell/main/';
const TEACHER_PASSCODE  = '1';

// Normalize an image-base URL the teacher pastes into "Class Default Image URL" / "Lesson Override URL".
// Auto-fixes the #1 reason pasted image links break: a normal github.com page link (blob/tree) instead
// of the raw.githubusercontent.com link, and a missing trailing slash (which mangles filename concatenation).
const normalizeImgBaseUrl = (url) => {
  let u = (url || '').trim();
  if (!u) return u;
  const blobMatch = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/([^/]+)\/?(.*)$/i);
  if (blobMatch) {
    const [, ghUser, ghRepo, ghBranch, ghRest] = blobMatch;
    u = `https://raw.githubusercontent.com/${ghUser}/${ghRepo}/${ghBranch}/${ghRest}`;
  }
  if (!u.endsWith('/')) u += '/';
  return u;
};

const AGE_GROUPS = {
  storytellers: { label: 'Storytellers (5-)',  icon: <Baby className="w-4 h-4"/>, length:'short (~150w)'  },
  explorers:    { label: 'Explorers (6-8)',     icon: <Compass className="w-4 h-4"/>, length:'medium (~300w)' },
  adventurers:  { label: 'Adventurers (9-11)', icon: <Map className="w-4 h-4"/>, length:'long (~450w)'   },
  voyagers:     { label: 'Voyagers (12+)',      icon: <Ship className="w-4 h-4"/>, length:'detailed (~600w)'},
};

// ─── Firestore helpers (lessons as subcollection → no 1MB doc limit) ─────────
const P  = (path) => `artifacts/${ABHIDHAMMA_APP_ID}/public/data/${path}`;
const abhiClassDocRef    = (cId)         => doc(db, P(`classes/${cId}`));
const abhiClassesRef     = ()            => collection(db, P('classes'));
const abhiLessonsRef     = (cId)         => collection(db, P(`classes/${cId}/lessons`));
const abhiLessonDocRef   = (cId, lId)    => doc(db, P(`classes/${cId}/lessons/${lId}`));
// Keyed by studentUid (the shared anonymous-auth uid every part of this app
// already uses), not by name -- a rename just changes the studentName field
// on the SAME doc, so none of the old name-matching/redirect machinery this
// file used to need is necessary anymore.
const abhiRosterDocRef   = (cId, uid)    => doc(db, P(`classRoster/${cId}_${uid}`));
const abhiRosterRef      = ()            => collection(db, P('classRoster'));
const abhiScoresRef      = ()            =>
    // Use original global_scores collection that security rules allow
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'global_scores');
const abhiActivityRef    = ()            => collection(db, P('activity_feed'));
const abhiResultsRef     = (cId,lId,g)   =>
    // Use original path that security rules already allow
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'lessons', lId, 'quiz', g, 'results');
const abhiQRef           = (cId, lId)    =>
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'classes', cId, 'questions', lId, 'items');

// One-time, automatic migration for a student who joined before roster docs
// were keyed by uid: look for their OLD name-keyed doc -- preferring an
// exact tutoringStudentUid match left by the old Link-to-Tutoring system,
// else falling back to their current display name -- and carry its fields
// onto the new uid-keyed doc the first time they're seen under their uid.
// The old doc is marked {migratedTo: uid}, not deleted, as cheap insurance.
// Runs inline the first time a student's roster doc is written (see the
// ping effect below) -- nothing the teacher has to trigger.
const migrateOldAbhiRosterDoc = async (classId, uid, name) => {
  try {
    const byUidSnap = await getDocs(query(abhiRosterRef(), where('classId','==',classId), where('tutoringStudentUid','==',uid)));
    let oldDoc = byUidSnap.docs.find(d => d.id !== `${classId}_${uid}` && !d.data().migratedTo);
    if (!oldDoc && name) {
      const byNameSnap = await getDocs(query(abhiRosterRef(), where('classId','==',classId), where('studentName','==',name)));
      oldDoc = byNameSnap.docs.find(d => d.id !== `${classId}_${uid}` && !d.data().migratedTo);
    }
    if (!oldDoc) return null;
    await setDoc(oldDoc.ref, { migratedTo: uid }, { merge: true });
    const data = { ...oldDoc.data() };
    delete data.renamedTo; delete data.migratedTo; delete data.tutoringStudentUid; delete data.linkedToTutoring;
    delete data.studentName; delete data.name;
    return data;
  } catch (e) { console.error('Roster migration lookup error:', e); return null; }
};

// ─── AI generation ────────────────────────────────────────────────────────────
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`;
const generateContent = async (prompt, sys) => {
  const payload={contents:[{parts:[{text:prompt}]}],systemInstruction:{parts:[{text:sys}]},generationConfig:{responseMimeType:'application/json'}};
  for(let i=0;i<3;i++){try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();const t=j.candidates?.[0]?.content?.parts?.[0]?.text;if(t)return JSON.parse(t.replace(/^```json\s*|\s*```$/g,'').trim());throw new Error('No content');}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,1000));}}
};
const generateSingleVariant = async (title, content, group) => {
  const conf=AGE_GROUPS[group];
  const tones={storytellers:'Very simple, playful.',explorers:'Simple, clear.',adventurers:'Conversational.',voyagers:'Mature, reflective.'};
  const prompt=`Base Title:"${title}"\nBase Content:"${content}"\nGroup:${group}(${conf.label})\n1.Preserve image filenames/links.\n2.Generate ${conf.length} version. TONE:${tones[group]}\n3.englishTitle+10 discussionQuestions.\n4.**bold** *italic* ==highlight==\n5.Insert ONE image after EACH paragraph.\n6.10 MCQ, 4 options each.\nReturn JSON:{englishTitle,burmese,english,discussionQuestions:[10],quiz:{questions:[{question,options:[4],correctAnswerIndex}]}}`;
  return generateContent(prompt,'Expert curriculum dev. Return JSON only.');
};

// ─── AudioPlayer ──────────────────────────────────────────────────────────────
const AudioPlayer = ({ src }) => {
  const [p,setP]=useState(false);const ref=useRef(null);
  const t=()=>{if(!ref.current){ref.current=new Audio(src);ref.current.onended=()=>setP(false);}if(p)ref.current.pause();else ref.current.play().catch(()=>{});setP(!p);};
  return<button onClick={t} className="inline-flex items-center gap-1 px-2 py-1 bg-pink-600/20 text-pink-400 rounded-full hover:bg-pink-600/40 border border-pink-500/30 mx-1">{p?<Pause className="w-4 h-4"/>:<Music className="w-4 h-4"/>}<span className="text-xs font-bold">Play</span></button>;
};

// ─── SmartContent ─────────────────────────────────────────────────────────────
const SmartContent = ({ text, imageBase }) => {
  if(!text) return null;
  const BASE=imageBase||DEFAULT_IMG_BASE;
  const fmt=s=>s.split(/(\*\*.*?\*\*|\*.*?\*|==.*?==)/g).map((p,i)=>{
    if(p.startsWith('**')&&p.endsWith('**'))return<strong key={i} className="text-yellow-200 font-bold">{p.slice(2,-2)}</strong>;
    if(p.startsWith('*')&&p.endsWith('*'))return<em key={i} className="text-indigo-300 italic">{p.slice(1,-1)}</em>;
    if(p.startsWith('==')&&p.endsWith('=='))return<span key={i} className="bg-yellow-600/40 px-1 rounded text-white border border-yellow-500/30">{p.slice(2,-2)}</span>;
    return p;
  });
  const parts=text.split(/((?:https?:\/\/[^\s]+)|(?:\b[\w-]+\.(?:png|jpg|jpeg|gif|mp3)\b))/gi);
  return<span className="leading-relaxed">{parts.map((p,i)=>{
    if(!p)return null;
    const isUrl=p.match(/^https?:\/\//i),isImg=p.match(/\.(png|jpg|jpeg|gif)$/i),isAu=p.match(/\.mp3$/i);
    if(isUrl){if(p.match(/(youtube|youtu\.be)/i))return<a key={i} href={p} target="_blank" rel="noreferrer" className="inline-flex items-center text-red-400 mx-1"><Youtube className="w-5 h-5 mr-1"/>Video</a>;if(isAu)return<AudioPlayer key={i} src={p}/>;if(isImg)return<div key={i} className="my-2"><img src={p} className="max-w-full h-auto rounded-lg mx-auto" onError={e=>e.target.style.display='none'}/></div>;return<a key={i} href={p} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mx-1">Link<ExternalLink className="w-3 h-3 ml-1 inline"/></a>;}
    if(isImg)return<div key={i} className="my-2"><img src={`${BASE}${p}`} className="max-w-full h-auto rounded-lg mx-auto" onError={e=>e.target.style.display='none'}/></div>;
    if(isAu)return<AudioPlayer key={i} src={`${AUDIO_BASE_URL}${p}`}/>;
    return<span key={i}>{fmt(p)}</span>;
  })}</span>;
};

// ─── QuizModule ───────────────────────────────────────────────────────────────
const QuizModule = ({ classId,lessonId,lessonTitle,userId,userName,ageGroup,quizData,onClose }) => {
  const [state,setState]=useState('playing');const [qi,setQi]=useState(0);const [score,setScore]=useState(0);
  const [tl,setTl]=useState(30);const [show,setShow]=useState(false);const [sel,setSel]=useState(null);const [fb,setFb]=useState(null);const [proc,setProc]=useState(false);const [correct,setCorrect]=useState(0);
  useEffect(()=>{if(state!=='playing'||show)return;const t=setTimeout(()=>setShow(true),5000);return()=>clearTimeout(t);},[state,show,qi]);
  useEffect(()=>{if(state!=='playing'||!show||proc)return;const t=setInterval(()=>setTl(p=>p-1),1000);return()=>clearInterval(t);},[state,show,proc,qi]);
  useEffect(()=>{if(tl<=0&&show&&!proc&&state==='playing')handleAnswer(-1,true);},[tl,show,proc,state]);
  const handleAnswer=async(idx,timeout=false)=>{
    if(proc)return;setProc(true);setSel(idx);
    const q=quizData.questions[qi];const ok=!timeout&&q.correctAnswerIndex!==undefined&&idx===q.correctAnswerIndex;setFb(ok?'correct':'incorrect');
    const pts=ok?Math.max(100,Math.ceil((tl/30)*1000)):0;const nc=ok?correct+1:correct;if(ok)setCorrect(nc);
    setTimeout(async()=>{
      setScore(p=>p+pts);setFb(null);setSel(null);setProc(false);
      if(qi+1<quizData.questions.length){setQi(p=>p+1);setShow(false);setTl(30);}
      else{const fs=score+pts;if(nc<8){setState('failed');return;}setState('finished');
        try{
          // Save quiz result (completion tracking) 
          await addDoc(abhiResultsRef(classId,lessonId,ageGroup),{name:userName,score:fs,userId,group:ageGroup,timestamp:serverTimestamp()});
          // Upsert to abhiScoresRef for leaderboard (best score wins)
          const sRef=doc(abhiScoresRef(),`${userId}_${lessonId}`);
          const prev=await getDoc(sRef);
          if(!prev.exists()||prev.data().score<fs){
            await setDoc(sRef,{classId,lessonId,studentName:userName,name:userName,score:fs,group:ageGroup,userId,timestamp:serverTimestamp()});
          }
          await addDoc(abhiActivityRef(),{type:'quiz_completed',studentName:userName,userId,lessonTitle,classId,lessonId,group:ageGroup,timestamp:serverTimestamp()});
        }catch(e){console.error(e);}
      }
    },1500);
  };
  if(state==='failed')return<div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 p-8 rounded-2xl text-center border border-red-500"><div className="text-6xl mb-4">😔</div><h2 className="text-3xl font-bold text-red-400 mb-2">Not Enough Correct!</h2><p className="text-gray-300 mb-6">Need <span className="text-yellow-400 font-black">8+ correct</span> to pass.</p><button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full">Go Back & Review</button></div></div>;
  if(state==='finished')return<div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 p-8 rounded-2xl text-center"><Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4"/><h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2><p className="text-gray-400 text-lg mb-6">Score: <span className="text-indigo-400 font-bold">{score}</span></p><button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full">Finish</button></div></div>;
  return(
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-8 h-8"/></button>
      <div className="w-full max-w-3xl flex flex-col justify-center">
        <div className="flex justify-between items-center mb-6 px-4"><div className="bg-gray-800 px-4 py-2 rounded-full border border-gray-600 text-white font-bold">Q{qi+1}/{quizData.questions.length}</div>{show&&<div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-xl flex items-center"><Timer className="w-5 h-5 mr-2"/>{tl}s</div>}<div className="bg-indigo-600 px-4 py-2 rounded-full text-white font-bold">Score:{score}</div></div>
        <div className="bg-white text-black p-8 rounded-xl shadow-2xl mb-8 text-center min-h-[200px] flex items-center justify-center relative overflow-hidden"><h2 className="text-2xl md:text-3xl font-bold z-10">{quizData.questions[qi].question}</h2>{fb&&<div className={`absolute inset-0 flex items-center justify-center z-20 ${fb==='correct'?'bg-green-100/90 text-green-700':'bg-red-100/90 text-red-700'}`}><div className="text-4xl font-black">{fb==='correct'?'CORRECT!':'WRONG!'}</div></div>}</div>
        {show?(<div className={`grid gap-4 ${quizData.questions[qi].options.length===2?'grid-cols-2':'grid-cols-1 md:grid-cols-2'}`}>
          {quizData.questions[qi].options.map((opt,idx)=>{let cls="hover:scale-105 active:scale-95";let bg=['bg-red-500','bg-blue-500','bg-yellow-500','bg-green-500'][idx%4];if(fb){cls="cursor-not-allowed opacity-50";if(idx===quizData.questions[qi].correctAnswerIndex)bg="bg-green-600 ring-4 ring-green-300 opacity-100";else if(idx===sel&&fb==='incorrect')bg="bg-red-600 ring-4 ring-red-300 opacity-100";}return<button key={idx} onClick={()=>handleAnswer(idx)} disabled={proc} className={`${bg} text-white font-bold text-lg p-6 rounded-xl shadow-lg transform transition flex items-center ${cls}`}><span className="bg-black/20 w-8 h-8 rounded flex items-center justify-center mr-4">{['A','B','C','D'][idx]}</span>{opt}</button>;})}
        </div>):<div className="text-center py-20"><div className="animate-pulse text-4xl font-black text-yellow-400">Get Ready... (5s)</div></div>}
      </div>
    </div>
  );
};

// ─── NotificationBell ─────────────────────────────────────────────────────────
const NotificationBell = ({ userId, classId }) => {
  const [n,setN]=useState([]);const [open,setOpen]=useState(false);const [lr,setLr]=useState(()=>parseInt(localStorage.getItem(`abhidhamma_notif_${userId}`))||0);
  useEffect(()=>{if(!db||!userId)return;const q=classId?query(abhiActivityRef(),where('classId','==',classId),orderBy('timestamp','desc'),limit(15)):query(abhiActivityRef(),orderBy('timestamp','desc'),limit(15));return onSnapshot(q,snap=>setN(snap.docs.map(d=>({id:d.id,...d.data()}))));},[userId,classId]);
  const uc=n.filter(x=>{const ts=x.timestamp?.toMillis?x.timestamp.toMillis():(x.timestamp?.seconds*1000)||0;return ts>lr;}).length;
  const toggle=()=>{if(!open){const now=Date.now();setLr(now);localStorage.setItem(`abhidhamma_notif_${userId}`,now);}setOpen(!open);};
  return(
    <div className="relative"><button onClick={toggle} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full relative shadow-lg"><Bell className="w-5 h-5 text-gray-300"/>{uc>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{uc>9?'9+':uc}</span>}</button>
    {open&&<div className="absolute right-0 mt-2 w-72 max-w-[90vw] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden"><div className="p-3 border-b border-gray-700 flex justify-between items-center"><h4 className="font-bold text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-400"/>Notifications</h4><button onClick={()=>setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4"/></button></div><div className="max-h-64 overflow-y-auto p-2 space-y-2">{n.length===0?<p className="text-center text-gray-500 text-xs py-6 italic">No notifications</p>:n.map(x=><div key={x.id} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/50 flex items-start gap-3"><Trophy className="w-4 h-4 text-yellow-400 mt-1"/><div><p className="text-xs font-bold text-white"><span className="text-indigo-300">{x.studentName}</span> finished a quiz!</p><p className="text-[10px] text-gray-400 truncate mt-0.5">{x.lessonTitle}</p></div></div>)}</div></div>}
    </div>
  );
};

// ─── AbhiClassRoster (now also includes Link-to-Tutoring, merged into one list) ─
const AbhiClassRoster = ({ userId, classId }) => {
  const [students,setStudents]=useState([]);
  const [aa,setAa]=useState(false);
  const [open,setOpen]=useState(true);
  const [studentStats,setStudentStats]=useState({}); // uid → {rank, completed}

  // Per-student rank + completed-lesson count for this class, shown as a floating badge on each row.
  // Grouped by userId (every score doc already carries one -- see QuizModule's handleAnswer), not by
  // name, so a mid-class rename can't split one student's progress across two leaderboard rows.
  useEffect(()=>{
    if(!classId)return;
    return onSnapshot(query(abhiScoresRef(),where('classId','==',classId)),snap=>{
      const byStudent={};
      snap.docs.forEach(d=>{
        const dt=d.data();const uid=dt.userId;
        if(!uid||!dt.lessonId)return;
        if(!byStudent[uid])byStudent[uid]=new Set();
        byStudent[uid].add(dt.lessonId);
      });
      const ranked=Object.entries(byStudent).sort((a,b)=>b[1].size-a[1].size);
      const stats={};
      ranked.forEach(([uid,set],idx)=>{stats[uid]={rank:idx+1,completed:set.size};});
      setStudentStats(stats);
    },err=>console.error('Roster stats:',err.code));
  },[classId]);

  useEffect(()=>{
    if(!classId)return;
    const q=query(abhiRosterRef(),where('classId','==',classId));
    return onSnapshot(q,snap=>{
      const nowMs=Date.now();
      // migratedTo marks an old name-keyed doc that's already been carried
      // forward onto a uid-keyed one (see migrateOldAbhiRosterDoc) -- it's
      // vestigial, not a second student, so it's excluded here.
      setStudents(snap.docs.filter(d=>!d.data().migratedTo).map(d=>{
        const dt=d.data();const lp=dt.lastPing;
        if(dt.isOnline&&lp){const ms=lp.toMillis?lp.toMillis():(lp.seconds*1000);if((nowMs-ms)/60000>2)return{id:d.id,...dt,isOnline:false};}
        return{id:d.id,...dt};
      }));
    });
  },[classId]);

  useEffect(()=>{
    if(!classId)return;
    return onSnapshot(abhiClassDocRef(classId),snap=>{ if(snap.exists())setAa(snap.data().autoApprove||false); });
  },[classId]);

  // Auto-approve pending when autoApprove is on
  useEffect(()=>{ if(!aa||students.length===0)return; students.filter(s=>s.status==='pending').forEach(s=>{ if(s.id&&s.studentName) approveStu(s.id,s.studentName); }); },[students,aa]);

  const approveStu=async(docId,name)=>{
    const ref=doc(db,P(`classRoster/${docId}`));const snap=await getDoc(ref);if(!snap.exists())return;
    const dt=snap.data();let num=dt.studentNumber;
    if(!num){const max=students.filter(s=>s.status==='approved').reduce((m,s)=>Math.max(m,s.studentNumber||0),0);num=max+1;}
    await updateDoc(ref,{status:'approved',name:name||dt.name,pendingName:null,studentNumber:num});
  };
  const removeStu=async(e,id)=>{e.stopPropagation();if(window.confirm('Remove this student?'))try{await deleteDoc(doc(db,P(`classRoster/${id}`)));}catch(err){console.error(err);}};
  // Only one class can be "open" (autoApprove) at a time — turning this one on turns every other
  // class off, so students always land in whichever single class the teacher currently has open,
  // no matter which class button they tap (see the student Choose Your Class screen).
  const toggleAA=async e=>{
    e.stopPropagation();
    if(!classId)return;
    if(aa){ await updateDoc(abhiClassDocRef(classId),{autoApprove:false}); return; }
    const allSnap=await getDocs(abhiClassesRef());
    const batch=writeBatch(db);
    allSnap.docs.forEach(d=>batch.update(d.ref,{autoApprove:d.id===classId}));
    await batch.commit();
  };

  const approved=students.filter(s=>s.status==='approved').sort((a,b)=>(a.studentNumber||0)-(b.studentNumber||0));
  const pending=students.filter(s=>s.status==='pending');

  if(!classId)return null;
  return(
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 mb-6 overflow-hidden">
      <div onClick={()=>setOpen(!open)} className="p-4 border-b border-gray-700 cursor-pointer flex flex-wrap gap-3 justify-between items-center hover:bg-gray-700/50 transition">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400"/>Roster: {classId}</h3>
          <button onClick={toggleAA} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold ${aa?'bg-green-500/20 text-green-400 border border-green-500/50':'bg-gray-800 text-gray-400 border border-gray-600'}`} title="Auto-approve new students & make this the one 'open' class — turning this on turns it off for every other class, and every student is steered into this class regardless of which one they tap">
            {aa?<ToggleRight className="w-4 h-4"/>:<ToggleLeft className="w-4 h-4"/>}Auto-Approve
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          {pending.length>0&&<span className="text-yellow-400 animate-pulse">{pending.length} Pending</span>}
          <span className="text-gray-400">{approved.length} Total</span>
          {open?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronRight className="w-5 h-5 text-gray-400"/>}
        </div>
      </div>
      {open&&<div className="p-4 space-y-2">
        {/* Pending row */}
        {pending.map(s=>(
          <div key={s.id} className="flex items-center gap-2 p-2.5 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <Circle className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500 shrink-0"/>
            <span className="flex-1 text-white text-sm font-semibold">{s.pendingName||s.studentName}</span>
            <span className="text-xs text-yellow-400 font-bold">Pending</span>
            <button onClick={()=>approveStu(s.id,s.pendingName||s.studentName)} className="p-1 bg-green-600 rounded text-white hover:bg-green-700" title="Approve"><UserCheck className="w-3.5 h-3.5"/></button>
            <button onClick={e=>removeStu(e,s.id)} className="p-1 bg-red-900/50 rounded text-red-400 hover:bg-red-700 hover:text-white" title="Remove"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        ))}
        {/* Approved students — rank shown as a floating badge. Online/inactive
            status lives only in the shared OnlineStatusWidget (see
            AbhiTeacherClassPicker/roster header), not duplicated here. */}
        {approved.map(s=>{
          const stat=studentStats[s.userId];
          return(
            <div key={s.id} className="relative mt-3 first:mt-0 flex items-center gap-2 p-2.5 rounded-lg border bg-gray-700/30 border-gray-600/30">
              {stat&&(
                <span className="absolute -top-2.5 right-2 flex items-center gap-1 text-[10px] font-black text-gray-900 bg-gradient-to-r from-amber-400 to-yellow-400 px-2 py-0.5 rounded-full shadow border border-amber-300 whitespace-nowrap">
                  🏆#{stat.rank} · {stat.completed} done
                </span>
              )}
              <span className="font-bold text-gray-300 text-xs w-5 shrink-0">#{s.studentNumber||'?'}</span>
              <span className="flex-1 text-white text-sm font-semibold min-w-0 truncate">{s.studentName}</span>
              <button onClick={e=>removeStu(e,s.id)} className="p-1 text-gray-600 hover:text-red-400 shrink-0"><Trash2 className="w-3 h-3"/></button>
            </div>
          );
        })}
        {approved.length===0&&pending.length===0&&<p className="text-gray-500 text-sm italic text-center py-4">No students yet. Students will appear here when they join.</p>}
      </div>}
    </div>
  );
};

// ─── Q&A Discussion ────────────────────────────────────────────────────────────
const AbhiQA = ({ classId, lessonId, isTeacher, userId, userName, suggestedQuestions=[] }) => {
  const [questions,setQs]=useState([]);const [text,setText]=useState('');const [replyText,setReplyText]=useState({});const [busy,setBusy]=useState(false);
  const [visibleSuggestions,setVisibleSuggestions]=useState([]);const [suggestionPool,setSuggestionPool]=useState([]);
  const qaTopRef=useRef(null);const qaBottomRef=useRef(null);
  const scrollToTop=()=>qaTopRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  const scrollToBottom=()=>qaBottomRef.current?.scrollIntoView({behavior:'smooth',block:'end'});
  
  // Critical: update suggestions when prop changes (prop may arrive after mount)
  useEffect(()=>{
    if(suggestedQuestions.length>0){
      setVisibleSuggestions(suggestedQuestions.slice(0,3));
      setSuggestionPool(suggestedQuestions.slice(3));
    }
  },[suggestedQuestions]);
  
  useEffect(()=>{
    if(!classId||!lessonId) return;
    return onSnapshot(
      abhiQRef(classId, lessonId),
      snap => setQs(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0))),
      err  => console.error('AbhiQA error:', err.code, err.message)
    );
  },[classId,lessonId]);

  const handleUseSuggestion=(s,idx)=>{
    setText(s);
    if(suggestionPool.length>0){const ri=Math.floor(Math.random()*suggestionPool.length);const nv=[...visibleSuggestions];nv[idx]=suggestionPool[ri];setVisibleSuggestions(nv);setSuggestionPool(p=>p.filter((_,i)=>i!==ri));}
  };
  const ask=async()=>{if(!text.trim()||busy)return;setBusy(true);try{await addDoc(abhiQRef(classId,lessonId),{studentId:userId,studentName:userName||'Student',text:text.trim(),timestamp:serverTimestamp(),replies:[],likes:[]});}catch(e){console.error(e);}finally{setText('');setBusy(false);}};
  const reply=async(qId)=>{const t=replyText[qId];if(!t?.trim()||busy)return;setBusy(true);try{const r={id:crypto.randomUUID(),userId,userName:userName||(isTeacher?'Teacher':'Student'),role:isTeacher?'Teacher':'Student',text:t.trim(),timestamp:new Date().toISOString(),likes:[]};await updateDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId,'questions',lessonId,'items',qId),{replies:arrayUnion(r)});}catch(e){console.error(e);}finally{setReplyText(p=>({...p,[qId]:''}));setBusy(false);}};
  const toggleLike=async(qId,replyId=null)=>{const ref=doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId,'questions',lessonId,'items',qId);try{const snap=await getDoc(ref);const data=snap.data();if(replyId){const rs=data.replies.map(r=>r.id===replyId?{...r,likes:r.likes?.includes(userId)?r.likes.filter(id=>id!==userId):[...(r.likes||[]),userId]}:r);await updateDoc(ref,{replies:rs});}else{const lks=data.likes||[];await updateDoc(ref,{likes:lks.includes(userId)?lks.filter(id=>id!==userId):[...lks,userId]});}}catch(e){console.error(e);}};

    return(
    <div className="space-y-4 mt-2" ref={qaTopRef}>
      {questions.length>3&&(
        <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
          <button onClick={scrollToTop} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg" title="အပေါ်ဆုံးသို့"><ArrowUp className="w-5 h-5"/></button>
          <button onClick={scrollToBottom} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg" title="အောက်ဆုံးသို့"><ArrowDown className="w-5 h-5"/></button>
        </div>
      )}
      {/* AI Suggested Questions */}
      {!isTeacher && visibleSuggestions.length > 0 && (
        <div className="bg-indigo-900/30 p-3 rounded-xl border border-indigo-500/30">
          <p className="text-indigo-300 text-xs font-bold mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3"/> Curious? Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {visibleSuggestions.map((sq,idx)=>(
              <button key={idx} onClick={()=>handleUseSuggestion(sq,idx)}
                className="text-left text-xs bg-indigo-800/50 hover:bg-indigo-700 text-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-600 transition hover:scale-105 active:scale-95 max-w-[250px]">
                {sq}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Q&A list */}
      {questions.map(q=>(
        <div key={q.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1"><span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 mr-2">{q.studentName||'Student'}</span><span className="text-white font-medium">{q.text}</span></div>
            <button onClick={()=>toggleLike(q.id)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${q.likes?.includes(userId)?'text-pink-500 bg-pink-500/10':'text-gray-500 hover:bg-gray-700'}`}><Heart className={`w-3 h-3 ${q.likes?.includes(userId)?'fill-current':''}`}/>{q.likes?.length||0}</button>
          </div>
          <div className="ml-3 pl-3 border-l-2 border-gray-700 space-y-2 mt-2">
            {q.replies?.map((r,i)=>(
              <div key={i} className={`text-sm p-2 rounded-lg ${r.role==='Teacher'?'bg-teal-900/20 border border-teal-800/50':'bg-gray-700/30 border border-gray-600/50'}`}>
                <span className={`text-xs font-bold mr-1 ${r.role==='Teacher'?'text-teal-400':'text-gray-400'}`}>{r.userName||r.role}:</span>
                <span className="text-gray-200">{r.text}</span>
                <button onClick={()=>toggleLike(q.id,r.id)} className={`ml-2 text-xs ${r.likes?.includes(userId)?'text-pink-400':'text-gray-600 hover:text-pink-400'}`}><Heart className={`w-3 h-3 inline ${r.likes?.includes(userId)?'fill-current':''}`}/>{r.likes?.length||0}</button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2"><input value={replyText[q.id]||''} onChange={e=>setReplyText(p=>({...p,[q.id]:e.target.value}))} placeholder="Write a reply…" className="flex-1 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none" onKeyDown={e=>e.key==='Enter'&&reply(q.id)}/><button onClick={()=>reply(q.id)} disabled={busy} className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700"><Send className="w-4 h-4"/></button></div>
        </div>
      ))}
      {/* Ask input */}
      <div className="pt-2 border-t border-gray-700">
        <div className="flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Ask a question…" className="flex-1 bg-gray-900 text-white text-sm p-3 rounded-xl border border-gray-600 focus:border-indigo-500 focus:outline-none" disabled={busy} onKeyDown={e=>e.key==='Enter'&&ask()}/>
          <button onClick={ask} disabled={busy||!text} className="bg-green-600 px-4 py-2 rounded-xl text-white font-bold hover:bg-green-700">Ask</button>
        </div>
      </div>
      <div ref={qaBottomRef}/>
    </div>
  );
};


// ─── Teacher Class Picker ──────────────────────────────────────────────────────
const AbhiTeacherClassPicker = ({ onSelectClass, onCreateClass }) => {
  const [classes,setClasses]=useState([]); const [newId,setNewId]=useState(''); const [renaming,setRenaming]=useState(null); const [renameVal,setRenameVal]=useState('');
  useEffect(()=>{ return onSnapshot(abhiClassesRef(),snap=>setClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id)))); },[]);
  const handleRename=async(classId,displayName)=>{if(!displayName.trim())return;await updateDoc(abhiClassDocRef(classId),{displayName:displayName.trim()});setRenaming(null);};
  const handleCreate=async()=>{
    if(!newId.trim())return;
    try{ await setDoc(abhiClassDocRef(newId.trim()),{classId:newId.trim(),autoApprove:false,createdAt:serverTimestamp()},{merge:true}); }
    catch(e){ console.error('Class create:',e); }
    onSelectClass(newId.trim());
  };
  return(
    <div className="max-w-lg mx-auto mt-10 p-6 space-y-6">
      <h2 className="text-3xl font-bold text-amber-700 text-center">Teacher — Choose Class</h2>
      {classes.length>0&&(
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Existing Classes</p>
          {classes.map(c=>(
            <div key={c.id} className="flex items-center gap-2">
              {renaming===c.id?(
                <>
                  <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)} placeholder="Display name" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" onKeyDown={e=>{if(e.key==='Enter'){handleRename(c.id,renameVal);}if(e.key==='Escape')setRenaming(null);}}/>
                  <button onClick={()=>handleRename(c.id,renameVal)} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-600">Save</button>
                  <button onClick={()=>setRenaming(null)} className="bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-400">Cancel</button>
                </>
              ):(
                <>
                  <button onClick={()=>onSelectClass(c.id)} className={`flex-1 p-3 rounded-xl border-2 text-left font-bold text-lg transition-all flex items-center justify-between bg-white border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50`}>
                    <span>{c.displayName||c.id}</span>
                    {c.displayName&&<span className="text-xs font-normal text-gray-400 ml-2">({c.id})</span>}
                  </button>
                  <button onClick={()=>{setRenaming(c.id);setRenameVal(c.displayName||c.id);}} className="text-gray-400 hover:text-amber-500 p-2" title="Rename display name">
                    <Edit2 className="w-4 h-4"/>
                  </button>
                  <button onClick={async()=>{if(!window.confirm(`Delete class "${c.id}" + ALL lessons, roster & scores? Cannot be undone.`))return;try{
                      const[lSnap,rSnap,actSnap]=await Promise.all([
                        getDocs(abhiLessonsRef(c.id)),
                        getDocs(query(abhiRosterRef(),where('classId','==',c.id))),
                        getDocs(query(abhiActivityRef(),where('classId','==',c.id)))
                      ]);
                      await Promise.all([
                        ...lSnap.docs.map(d=>deleteDoc(d.ref)),
                        ...rSnap.docs.map(d=>deleteDoc(d.ref)),
                        ...actSnap.docs.map(d=>deleteDoc(d.ref)),
                        deleteDoc(abhiClassDocRef(c.id))
                      ]);
                    }catch(e){console.error(e);}}} className="text-gray-400 hover:text-red-500 p-2" title="Delete class + all contents">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Create / Enter Class ID</p>
        <div className="flex gap-2">
          <input value={newId} onChange={e=>setNewId(e.target.value.toUpperCase())} placeholder="e.g. PARAMI" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono font-bold text-gray-900 bg-white placeholder-gray-400" onKeyDown={e=>e.key==='Enter'&&handleCreate()}/>
          <button onClick={handleCreate} disabled={!newId.trim()} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4"/>Enter</button>
        </div>
      </div>
    </div>
  );
};

// ─── Floating Stats Bar ──────────────────────────────────────────────────────
const AbhiFloatingStats = ({ rank, totalLessons }) => {
  const [pos,setPos]=useState({x:null,y:72});
  const dragging=useRef(false);const offset=useRef({x:0,y:0});
  const startDrag=(cx,cy,el)=>{dragging.current=true;const rect=el.getBoundingClientRect();offset.current={x:cx-rect.left,y:cy-rect.top};};
  const onMove=(cx,cy)=>{if(!dragging.current)return;setPos({x:cx-offset.current.x,y:cy-offset.current.y});};
  const stopDrag=()=>{dragging.current=false;};
  useEffect(()=>{const mm=e=>onMove(e.clientX,e.clientY);const tm=e=>{if(e.touches[0])onMove(e.touches[0].clientX,e.touches[0].clientY);};window.addEventListener('mousemove',mm);window.addEventListener('touchmove',tm);window.addEventListener('mouseup',stopDrag);window.addEventListener('touchend',stopDrag);return()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('touchmove',tm);window.removeEventListener('mouseup',stopDrag);window.removeEventListener('touchend',stopDrag);};},[]);
  const style=pos.x===null?{left:'50%',top:`${pos.y}px`,transform:'translateX(-50%)'}:{left:`${pos.x}px`,top:`${pos.y}px`};
  if(!rank&&!totalLessons) return null;
  return(
    <div onMouseDown={e=>startDrag(e.clientX,e.clientY,e.currentTarget)} onTouchStart={e=>e.touches[0]&&startDrag(e.touches[0].clientX,e.touches[0].clientY,e.currentTarget)}
      style={{position:'fixed',zIndex:70,cursor:'grab',...style}} className="bg-gray-800/95 border border-amber-500 rounded-full shadow-2xl px-5 py-2 flex items-center gap-4 select-none backdrop-blur-md">
      <span className="flex items-center gap-1 text-yellow-400 font-black"><Trophy className="w-4 h-4"/> #{rank||'-'}</span>
      <span className="text-gray-500">|</span>
      <span className="flex items-center gap-1 text-teal-300 font-bold"><BookOpen className="w-4 h-4"/> {totalLessons} Lessons</span>
    </div>
  );
};

// ─── Global & Class Leaderboard Modal ────────────────────────────────────────
const AbhiLeaderboardModal = ({ classId, studentName, userId, onClose }) => {
  const [classData,setClassData]=useState(null);
  const meRef=useRef(null);

  useEffect(()=>{
    if(classData&&meRef.current) setTimeout(()=>meRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),150);
  },[classData]);

  useEffect(()=>{
    if(!classId||classData!==null)return;
    // Load all scores and filter client-side (no Firestore index needed)
    getDocs(abhiScoresRef()).then(snap=>{
      const byStudent={};
      snap.docs.forEach(d=>{
        const dt=d.data();
        if(dt.classId!==classId)return; // strict filter — must match exact class
        const sn=dt.studentName||dt.name||'?';
        if(!byStudent[sn])byStudent[sn]={name:sn,lessons:new Set(),totalScore:0,userId:dt.userId};
        byStudent[sn].lessons.add(dt.lessonId);
        byStudent[sn].totalScore=(byStudent[sn].totalScore||0)+(dt.score||0);
      });
      const ranked=Object.values(byStudent).map(s=>({...s,count:s.lessons.size})).sort((a,b)=>b.count-a.count||b.totalScore-a.totalScore);
      setClassData(ranked);
    }).catch(e=>console.error('Class LB:',e));
  },[classId,classData]);

  const renderList=(data,isGlobal)=>{
    if(!data)return<div className="flex justify-center py-8"><RotateCw className="w-8 h-8 animate-spin text-amber-400"/></div>;
    if(data.length===0)return<p className="text-center text-gray-500 py-6">No data yet.</p>;
    const medals=['🥇','🥈','🥉'];
    return(
      <div className="space-y-2 max-h-[55vh] overflow-y-auto">
        {data.map((e,idx)=>{
          const isMe=e.userId===userId||(e.name===studentName);
          return(
            <div key={idx} ref={isMe?meRef:null} className={`flex items-center gap-3 p-3 rounded-xl ${isMe?'bg-amber-900/40 border border-amber-500':'bg-gray-700/50 border border-gray-600/30'}`}>
              <span className="w-8 text-center font-black text-lg">{medals[idx]||`#${idx+1}`}</span>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{e.name}{isMe&&<span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-bold ml-2">YOU</span>}</p>
                <p className="text-xs text-gray-400">{e.count} lesson{e.count!==1?'s':''} • {e.totalScore.toLocaleString()} pts</p>
              </div>
              <span className="text-yellow-400 font-bold text-sm">{e.count} 📚</span>
            </div>
          );
        })}
      </div>
    );
  };

  return(
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700">
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-400"/> Champions Board</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
        </div>
        <div className="p-1 bg-teal-900/30 border-b border-gray-700">
          <p className="text-center text-teal-400 text-sm font-bold py-2">📚 {classId} — Class Standings</p>
        </div>
        <div className="p-5">
          {renderList(classData,false)}
        </div>
      </div>
    </div>
  );
};

// ─── Student: age-group picker (no name, no approval) ──────────────────────
const AbhiAgeGroupPicker = ({ onComplete, initialGroup }) => {
  const [grp, setGrp] = useState(() => initialGroup || localStorage.getItem('abhidhamma_ageGroup') || null);
  return (
    <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
      <div className="bg-indigo-900/90 border border-indigo-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <Globe className="w-16 h-16 mx-auto text-cyan-400 mb-4 animate-pulse"/>
        <h2 className="text-3xl font-black text-white mb-2">📚 Abhidhamma</h2>
        <p className="text-indigo-300 mb-6">Choose your age group to continue</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Object.entries(AGE_GROUPS).map(([k,v]) => (
            <button key={k} onClick={() => setGrp(k)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${
                grp===k
                  ? 'bg-cyan-500 border-cyan-300 text-white scale-105 shadow-lg'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
              }`}>
              {v.icon}
              <span className="text-xs font-bold">{v.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (!grp) return;
            localStorage.setItem('abhidhamma_ageGroup', grp);
            onComplete(grp);
          }}
          disabled={!grp}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition">
          ENTER
        </button>
      </div>
    </div>
  );
};

// ─── Teacher: passcode-only modal ────────────────────────────────────────────
const AbhiTeacherLogin = ({ onComplete, onClose }) => {
  const [pass, setPass] = useState(''); const [err, setErr] = useState('');
  const tryLogin = () => { if (pass === TEACHER_PASSCODE) onComplete(); else setErr('Incorrect passcode.'); };
  return (
    <div className="fixed inset-0 bg-gray-900/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-purple-900/95 border border-purple-500 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
        <Wand2 className="w-16 h-16 mx-auto text-purple-400 mb-4 animate-pulse"/>
        <h2 className="text-3xl font-black text-white mb-4">Teacher Login</h2>
        <input type="password" autoFocus
          className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 focus:ring-4 ring-purple-400 outline-none"
          placeholder="Passcode" value={pass}
          onChange={e => { setPass(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && tryLogin()}/>
        {err && <p className="text-red-400 mb-4 text-sm font-bold">{err}</p>}
        <button onClick={tryLogin} disabled={!pass}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-black text-xl py-4 rounded-xl">
          LOGIN
        </button>
      </div>
    </div>
  );
};


// ─── LessonItem ───────────────────────────────────────────────────────────────
const AbhiLessonItem = ({ lesson, classId, isTeacher, studentAgeGroup, studentName, userId, onEdit, onGenerateVariants, onTakeQuiz, isGenerating, isOpen, onToggle, classImageBase }) => {
  const [tab,setTab]=useState('content');
  const [isCompleted,setIsCompleted]=useState(false);
  const [hasAsked,setHasAsked]=useState(false);
  const [hasReplied,setHasReplied]=useState(false);
  const [leaderboard,setLb]=useState([]);const [showLb,setShowLb]=useState(false);
  const [imgUrlDraft,setImgUrlDraft]=useState(lesson.imageBaseUrl||'');
  const [imgSaving,setImgSaving]=useState(false);
  const [imgSavingAll,setImgSavingAll]=useState(false);
  const [imgSaved,setImgSaved]=useState(false);
  const ref=useRef(null);
  const meLbRef=useRef(null);
  
  // Keep the draft in sync with the live saved value (e.g. after a save round-trips through Firestore)
  useEffect(()=>{ setImgUrlDraft(lesson.imageBaseUrl||''); },[lesson.imageBaseUrl]);

  // Save just this lesson's image override directly — independent of the Title/Content edit form,
  // so it can't be lost by forgetting to press "Edit" first or by an empty title/content blocking submit.
  const saveImgUrl = async () => {
    if(!classId||!lesson.id)return;
    setImgSaving(true);
    try{
      const norm=normalizeImgBaseUrl(imgUrlDraft);
      await updateDoc(abhiLessonDocRef(classId,lesson.id),{imageBaseUrl:norm||''});
      setImgUrlDraft(norm||'');
      setImgSaved(true);setTimeout(()=>setImgSaved(false),2500);
    }catch(e){console.error('Image URL save:',e);}
    finally{setImgSaving(false);}
  };

  // Save this image URL to EVERY lesson in the class (folder change applies to all at once)
  const saveImgUrlToAllLessons = async () => {
    if(!classId)return;
    if(!window.confirm('Change the image folder for ALL lessons in this class?'))return;
    setImgSavingAll(true);
    try{
      const norm=normalizeImgBaseUrl(imgUrlDraft);
      const snap=await getDocs(abhiLessonsRef(classId));
      const batch=writeBatch(db);
      snap.docs.forEach(d=>batch.update(d.ref,{imageBaseUrl:norm||''}));
      await batch.commit();
      setImgUrlDraft(norm||'');
      setImgSaved(true);setTimeout(()=>setImgSaved(false),2500);
    }catch(e){console.error('Image URL save-all:',e);}
    finally{setImgSavingAll(false);}
  };
  
  useEffect(()=>{if(isOpen&&ref.current){setTimeout(()=>{const y=ref.current.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:'smooth'});},100);}},[isOpen]);
  
  // Track quiz completion by userId -- global_scores docs are keyed
  // `${userId}_${lessonId}` (see QuizModule's handleAnswer), so this is a
  // direct doc subscription, stable across any rename.
  useEffect(()=>{
    if(!classId||!lesson.id||!userId)return;
    return onSnapshot(doc(abhiScoresRef(),`${userId}_${lesson.id}`),snap=>{setIsCompleted(snap.exists());},err=>console.error('Completion track:',err.code));
  },[classId,lesson.id,userId]);
  
  // Track Q&A participation for quiz unlock (ask + reply)
  useEffect(()=>{
    if(!classId||!userId||!lesson.id||isTeacher)return;
    return onSnapshot(abhiQRef(classId,lesson.id),snap=>{
      let asked=false,replied=false;
      snap.docs.forEach(d=>{
        const q=d.data();
        if(q.studentId===userId) asked=true;
        if(q.replies) q.replies.forEach(r=>{if(r.userId===userId) replied=true;});
      });
      setHasAsked(asked); setHasReplied(replied);
    },err=>console.error('QA track:',err.code));
  },[classId,lesson.id,userId,isTeacher]);
  
  // Leaderboard
  useEffect(()=>{
    if(!showLb||!classId||!lesson.id)return;
    getDocs(abhiScoresRef())
      .then(snap=>{
        const s={};
        snap.docs.forEach(d=>{
          const dt=d.data();
          if(dt.classId!==classId||dt.lessonId!==lesson.id)return;
          if(!s[dt.userId]||dt.score>s[dt.userId].score)s[dt.userId]=dt;
        });
        setLb(Object.values(s).sort((a,b)=>b.score-a.score));
      })
      .catch(e=>console.error('LB:',e));
   },[showLb,classId,lesson.id]);

  useEffect(()=>{
    if(showLb&&meLbRef.current) setTimeout(()=>meLbRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),150);
  },[showLb,leaderboard]);
  
  const variants=lesson.variants||{};const hasJr=variants.storytellers&&variants.explorers;const hasSr=variants.adventurers&&variants.voyagers;
  let dc='',dt=lesson.title,qa=false,qd=null,discQ=[];
  if(!isTeacher&&studentAgeGroup){const v=variants[studentAgeGroup];if(v){dc=v.english;dt=v.englishTitle||lesson.title;qa=!!v.quiz;qd=v.quiz;discQ=v.discussionQuestions||[];}else dc='Content not available for your age group yet.';}
  const imgBase=lesson.imageBaseUrl||classImageBase||DEFAULT_IMG_BASE;
  
  // Once a student has asked + answered a discussion question (unlocking
  // the quiz) but hasn't taken it yet, a floating shortcut stays pinned to
  // the screen's corner regardless of which tab (Lesson/Discussion) is
  // open -- so a student who wants to keep browsing classmates' Q&A first
  // can, without losing track of the quiz, and one who wants to jump
  // straight to it doesn't have to scroll back to find the unlock box.
  // Outside the tab==='content' block on purpose (unlike the lock box
  // above it, which is content-tab-only) so it's visible from Discussion
  // too. Tied to isOpen so only the lesson the student is actually looking
  // at shows one, not every unlocked-but-uncompleted lesson at once.
  const quizJustUnlocked = isOpen && !isTeacher && qa && !isCompleted && hasAsked && hasReplied;

  return(
    <div ref={ref} className={`relative rounded-xl shadow-md overflow-hidden border mb-4 ${isTeacher?'bg-gray-800 border-gray-700':'bg-gray-700 border-gray-600'}`}>
      {quizJustUnlocked && (
        <button
          onClick={()=>onTakeQuiz(lesson.id,dt,qd)}
          className="fixed top-16 right-4 z-40 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:scale-105 transition animate-pulse"
        >
          <Gamepad2 className="w-5 h-5"/> Quiz Unlocked!
        </button>
      )}
      {isGenerating&&<div className="absolute inset-0 bg-gray-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl"><RotateCw className="w-12 h-12 text-teal-400 animate-spin mb-4"/><p className="text-white font-bold">Generating…</p></div>}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-gray-600/50 flex justify-between items-center">
        <div className="flex items-center gap-3">{isOpen?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronRight className="w-5 h-5 text-gray-400"/>}
          <div className="flex flex-col">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isTeacher?'text-teal-300':'text-white'}`}>
              {dt}
              {isCompleted&&<span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/30"><CheckCheck className="w-3 h-3"/>Done</span>}
            </h3>
            {isTeacher&&<span className="text-xs text-gray-500">{hasJr&&hasSr?<span className="text-green-400">✓ Ready</span>:<span className="text-yellow-500">Pending: {!hasJr&&'Jr '}{!hasSr&&'Sr'}</span>}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e=>{e.stopPropagation();setShowLb(true);}} className="p-2 text-yellow-500 hover:text-yellow-400 rounded-full z-20"><Trophy className="w-5 h-5"/></button>
          {isTeacher&&<div className="flex items-center gap-1 mr-2" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onEdit(lesson)} className="p-2 bg-blue-600 rounded hover:bg-blue-700 text-white"><Edit2 className="w-3 h-3"/></button>
            <button onClick={()=>onGenerateVariants(lesson,'junior')} className="px-3 py-1 bg-purple-600 rounded text-white text-xs font-bold flex items-center gap-1 hover:bg-purple-700"><Zap className="w-3 h-3"/>Jr.</button>
            <button onClick={()=>onGenerateVariants(lesson,'senior')} className="px-3 py-1 bg-pink-600 rounded text-white text-xs font-bold flex items-center gap-1 hover:bg-pink-700"><Zap className="w-3 h-3"/>Sr.</button>
          </div>}
        </div>
      </div>
      {isOpen&&<div className="border-t border-gray-600/50">
        <div className="flex border-b border-gray-700">
          <button onClick={()=>setTab('content')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${tab==='content'?'text-teal-400 border-b-2 border-teal-400 bg-gray-800':'text-gray-400 hover:text-white'}`}><BookOpen className="w-4 h-4"/>Lesson</button>
          <button onClick={()=>setTab('discussion')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${tab==='discussion'?'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800':'text-gray-400 hover:text-white'}`}><MessageCircle className="w-4 h-4"/>Discussion</button>
        </div>
        <div className="p-5">
          {tab==='content'&&(isTeacher
            ? <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-gray-700" onClick={e=>e.stopPropagation()}>
                  <span className="text-gray-400 text-xs whitespace-nowrap">🖼 Image URL:</span>
                  <input value={imgUrlDraft} onChange={e=>{setImgUrlDraft(e.target.value);setImgSaved(false);}}
                    placeholder={classImageBase||DEFAULT_IMG_BASE}
                    className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-gray-600 px-1 focus:border-teal-500"/>
                  <button onClick={saveImgUrl} disabled={imgSaving||imgSavingAll} type="button"
                    className="text-xs font-bold px-2 py-1 bg-teal-600 hover:bg-teal-700 rounded text-white disabled:opacity-50 whitespace-nowrap">
                    {imgSaving?'Saving…':'Save (this lesson)'}
                  </button>
                  <button onClick={saveImgUrlToAllLessons} disabled={imgSaving||imgSavingAll} type="button"
                    className="text-xs font-bold px-2 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white disabled:opacity-50 whitespace-nowrap">
                    {imgSavingAll?'Saving…':'Save to ALL lessons'}
                  </button>
                  {imgSaved&&<CheckCircle className="w-4 h-4 text-green-400 shrink-0"/>}
                </div>
                <div className="text-white whitespace-pre-wrap leading-relaxed"><SmartContent text={lesson.burmeseContent} imageBase={imgBase}/></div>
              </div>
            : <div className="space-y-4">
                <div className="text-yellow-100 whitespace-pre-wrap leading-relaxed text-lg"><SmartContent text={dc} imageBase={imgBase}/></div>
                {qa&&(()=>{
                  // Quiz is locked until student asks 1 question AND replies 1
                  const isLocked = !isCompleted && (!hasAsked || !hasReplied);
                  return isLocked ? (
                    <div className="bg-gray-800/80 p-4 rounded-xl border border-indigo-600/40 flex flex-col items-center text-center">
                      <Lock className="w-8 h-8 text-indigo-400 mb-2"/>
                      <p className="text-white font-bold text-sm mb-1">Quiz Locked 🔒</p>
                      <p className="text-gray-400 text-xs mb-3">Complete discussion tasks to unlock:</p>
                      <div className="flex flex-col gap-1 mb-3 text-xs font-semibold">
                        <span className={hasAsked?'text-green-400':'text-gray-500'}>{hasAsked?'✅':'○'} Ask 1 Question</span>
                        <span className={hasReplied?'text-green-400':'text-gray-500'}>{hasReplied?'✅':'○'} Answer 1 Question</span>
                      </div>
                      <button onClick={()=>setTab('discussion')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">Go to Discussion →</button>
                    </div>
                  ) : (
                    <button onClick={e=>{e.stopPropagation();onTakeQuiz(lesson.id,dt,qd);}}
                      className={`w-full py-3 font-black rounded-xl shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2 ${isCompleted?'bg-gradient-to-r from-green-600 to-teal-600 text-white':'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}`}>
                      {isCompleted?<><Trophy className="w-6 h-6"/>QUIZ COMPLETED</>:<><Gamepad2 className="w-6 h-6"/>PLAY QUIZ</>}
                    </button>
                  );
                })()}
              </div>
          )}
          {tab==='discussion'&&<AbhiQA classId={classId} lessonId={lesson.id} isTeacher={isTeacher} userId={userId} userName={studentName||'Teacher'} suggestedQuestions={discQ}/>}
        </div>
      </div>}
      {showLb&&<div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-700 relative"><button onClick={()=>setShowLb(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button><div className="text-center mb-6"><Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2"/><h3 className="text-2xl font-black text-white">{dt}</h3></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{leaderboard.length===0?<p className="text-center text-gray-500">No scores yet.</p>:leaderboard.map((e,idx)=>{const isMe=e.userId===userId||(e.studentName||e.name)===studentName;return<div key={idx} ref={isMe?meLbRef:null} className={`flex justify-between items-center p-3 rounded ${isMe?'bg-indigo-600 border border-indigo-400':'bg-gray-700'}`}><div className="flex items-center gap-3"><span className="font-bold w-6 text-yellow-400">#{idx+1}</span><span className="font-semibold text-white">{e.name}{isMe&&<span className="text-[10px] bg-white text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-2">ME</span>}</span></div><span className="font-mono font-bold text-indigo-300">{e.score} pts</span></div>;})}</div></div></div>}
    </div>
  );
};

// ─── Main AbhidhammaApp ───────────────────────────────────────────────────────
export default function AbhidhammaApp({ entryRequest, onExit }) {
  const [authReady,setAuthReady]=useState(false);const [userId,setUserId]=useState(null);
  // Read localStorage immediately so first render already has correct role (no flash/conflict)
  const [isTeacher,setIsTeacher]=useState(()=>localStorage.getItem('abhidhamma_isTeacher')==='true');
  const [role,setRole]=useState(()=>localStorage.getItem('abhidhamma_isTeacher')==='true'?'Teacher':'Student');
  const [classId,setClassId]=useState('');const [classData,setClassData]=useState(null);const [lessons,setLessons]=useState([]);const [allClasses,setAllClasses]=useState([]);
  // When a teacher has exactly one class "open" (Auto-Approve on), every student is steered into
  // that class regardless of which class button they tap — see the Choose Your Class screen below.
  const openClassId = allClasses.find(c=>c.autoApprove)?.id || null;
  const [studentProfile,setStudentProfile]=useState(null);const [showWelcome,setShowWelcome]=useState(false);
  const [pendingEntry,setPendingEntry]=useState(null); // {name, group, classId} known from a deep-link, before age group is confirmed
  // pendingEntry/entryRequest only carry a classId on the exact visit that came in through
  // TutoringApp's "Start Lesson" deep-link — reopening the app later (same tab, or a saved
  // bookmark) loses that info even though the assignment is still current, so the "Choose
  // Your Class" highlight/hint would silently stop showing. Persisting it means it keeps
  // showing until the teacher assigns something new (a fresh deep-link overwrites it).
  const [assignedClassId,setAssignedClassId]=useState(()=>localStorage.getItem('abhidhamma_assigned_classId')||'');
  const [classStats,setClassStats]=useState({}); // classId → {completedCount, totalLessons, rank}
  const [showLeaderboard,setShowLeaderboard]=useState(false);
  const [activeQuizId,setActiveQuizId]=useState(null);const [activeQuizData,setActiveQuizData]=useState(null);
  const [openLessonId,setOpenLessonId]=useState(null);const [editingLesson,setEditingLesson]=useState(null);
  const [newTitle,setNewTitle]=useState('');const [newContent,setNewContent]=useState('');const [newImgBase,setNewImgBase]=useState(DEFAULT_IMG_BASE);
  // Gold coins for the wallet system -- same derived-score pattern as
  // SmartStudy (quiz score / 50, never actually spent at the source), and
  // the same click-to-deposit-into-Shrine-Room flow. abhiCoinsTransferred
  // (read back from the Shrine Room roster doc) is subtracted from the
  // displayed total so the same points don't count in both places at once.
  const ABHI_POINTS_PER_COIN=50;
  const [myAbhiTotalScore,setMyAbhiTotalScore]=useState(0);
  const [abhiCoinsTransferredOut,setAbhiCoinsTransferredOut]=useState(0);
  const abhiCoinBalance=Math.max(0,Math.floor(myAbhiTotalScore/ABHI_POINTS_PER_COIN)-abhiCoinsTransferredOut);
  useEffect(()=>{
    if(role!=='Student'||!userId)return;
    const unsub=onSnapshot(query(abhiScoresRef(),where('userId','==',userId)),snap=>{
      let total=0;snap.forEach(d=>{total+=d.data().score||0;});
      setMyAbhiTotalScore(total);
    });
    return unsub;
  },[role,userId]);
  useEffect(()=>{
    if(role!=='Student'||!studentProfile?.name)return;
    const sanitize=k=>(k||'unknown').trim().replace(/[.$#/\[\]]/g,'_');
    getDoc(doc(db,'artifacts/shrine-room-app/public/data/roster',sanitize(studentProfile.name)))
      .then(snap=>setAbhiCoinsTransferredOut(snap.exists()?(snap.data().abhidhammaCoinsTransferred||0):0))
      .catch(()=>{});
  },[role,studentProfile?.name]);
  const handleDepositAbhiCoinsToShrineRoom=async()=>{
    const depositable=abhiCoinBalance;
    if(depositable<=0)return;
    const confirmed=window.confirm(`Deposit ${depositable} gold coin(s) into your Shrine Room wallet?`);
    if(!confirmed)return;
    const sanitize=k=>(k||'unknown').trim().replace(/[.$#/\[\]]/g,'_');
    const shrineRef=doc(db,'artifacts/shrine-room-app/public/data/roster',sanitize(studentProfile.name));
    try{
      // increment() (not "current balance + depositable") -- coinBalance
      // is also written concurrently from Shrine Room's own purchases and
      // from SmartStudy/Myanmar Poems' identical deposit buttons, so
      // reading the balance and writing back a computed absolute number
      // is a lost-update race: whichever write commits last would
      // silently discard the others.
      const shrineSnap=await getDoc(shrineRef);
      const SHRINE_STARTER_COINS=20;
      const newTransferredOut=abhiCoinsTransferredOut+depositable;
      await setDoc(shrineRef,{studentName:studentProfile.name,coinBalance:shrineSnap.exists()?increment(depositable):SHRINE_STARTER_COINS+depositable,abhidhammaCoinsTransferred:newTransferredOut},{merge:true});
      setAbhiCoinsTransferredOut(newTransferredOut);
    }catch(e){console.error('Error depositing coins to Shrine Room:',e);}
  };
  // Sequential image numbering across the whole class -- scans every
  // lesson already in this class (plus whatever's typed in the content
  // box right now) for "NNN.jpg"-style filenames and returns one past the
  // highest number found, so lesson 2 naturally continues from wherever
  // lesson 1 left off (001-005 -> 006-010 -> ...) instead of the teacher
  // having to track/type the next number by hand.
  const contentTextareaRef=useRef(null);
  const getNextImageNumber=()=>{
    // Exactly 3 digits (with a word boundary before them) -- matches the
    // "001.jpg" convention only, so an unrelated longer number elsewhere
    // in a lesson's content (a photo's own filename, a date, etc.) never
    // gets picked up as if it were part of this numbering scheme.
    const nums=[];
    lessons.forEach(l=>{for(const m of String(l.burmeseContent||'').matchAll(/\b(\d{3})\.(?:jpg|jpeg|png)\b/gi))nums.push(parseInt(m[1],10));});
    for(const m of String(newContent||'').matchAll(/\b(\d{3})\.(?:jpg|jpeg|png)\b/gi))nums.push(parseInt(m[1],10));
    return String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  };
  const insertNextImage=()=>{
    const token=`${getNextImageNumber()}.jpg`;
    const ta=contentTextareaRef.current;
    if(ta && document.activeElement===ta){
      const start=ta.selectionStart,end=ta.selectionEnd;
      const next=newContent.slice(0,start)+token+newContent.slice(end);
      setNewContent(next);
      requestAnimationFrame(()=>{ta.focus();ta.selectionStart=ta.selectionEnd=start+token.length;});
    }else{
      setNewContent(prev=>prev+(prev&&!prev.endsWith('\n')?'\n':'')+token);
    }
  };
  const [importClassId,setImportClassId]=useState('');const [newClassId,setNewClassId]=useState('');
  const [classImageBase,setClassImageBase]=useState(DEFAULT_IMG_BASE);
  const [teacherPreviewGroup,setTeacherPreviewGroup]=useState('storytellers'); // teacher preview mode age group // per-class default image URL
  const [loading,setLoading]=useState(false);const [genId,setGenId]=useState(null);const [msg,setMsg]=useState('');
  const fileRef=useRef(null);const fileLessonsRef=useRef(null);const lastEntry=useRef(null);

  const showMsg = t => { setMsg(t); setTimeout(()=>setMsg(''),4000); };

  useEffect(()=>{ const u=onAuthStateChanged(auth,usr=>{setUserId(usr?usr.uid:null);setAuthReady(true);}); return()=>u(); },[]);
  // isTeacher & role initialized from localStorage in useState lazy initializer above

  // Note: we intentionally do NOT auto-restore a cached age-group profile and skip the picker anymore —
  // students should reconfirm their age group each time they open the app, since it can change as they
  // grow. AbhiAgeGroupPicker still pre-selects their last choice from localStorage as a convenience.

  useLayoutEffect(()=>{
    if(!entryRequest||!authReady)return;
    const sig=JSON.stringify({mode:entryRequest.mode,classId:entryRequest.classId||'',name:entryRequest.studentName||''});
    if(sig===lastEntry.current)return;lastEntry.current=sig;
    if(entryRequest.mode==='teacher'){setIsTeacher(true);setRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');}
    else if(entryRequest.mode==='student'&&entryRequest.studentName){
      const am={storyteller:'storytellers',explorer:'explorers',adventurer:'adventurers',voyager:'voyagers'};
      const grp=entryRequest.ageGroup?(am[entryRequest.ageGroup]||entryRequest.ageGroup):'explorers';
      // Name (and suggested class/group) is already known — remember it, but still show the age-group
      // picker first so the student can confirm/update their group before landing on Choose Your Class.
      setPendingEntry({name:entryRequest.studentName,group:grp,classId:entryRequest.classId||''});
      setRole('Student');
      if(entryRequest.classId) { setAssignedClassId(entryRequest.classId); localStorage.setItem('abhidhamma_assigned_classId', entryRequest.classId); }
    }
  },[entryRequest,authReady]);

  useEffect(()=>{ return onSnapshot(abhiClassesRef(),snap=>setAllClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id)))); },[]);

  // Load per-class stats for student: rank, lessons they've completed, and the class's total lesson
  // count (so the UI can show "9 / 10 completed" or "✅ all completed"). Also drives the floating
  // rank/lessons badge for whichever class is currently open (classStats[classId]).
  // Live (onSnapshot) per class, not a one-off getDocs — so a badge/rank updates immediately right
  // after a lesson quiz is submitted, instead of only refreshing on next class switch/reload.
  // Matches "me" by studentName only — linkedToTutoring already guarantees the roster name is
  // correct, so a separate userId match is unnecessary.
  useEffect(()=>{
    if(!studentProfile||allClasses.length===0){ setClassStats({}); return; }
    const name=studentProfile.name;
    const unsubs=allClasses.map(c=>
      onSnapshot(query(abhiScoresRef(),where('classId','==',c.id)), async scoresSnap=>{
        try{
          const lessonsSnap=await getDocs(abhiLessonsRef(c.id));
          const byStudent={};
          scoresSnap.docs.forEach(d=>{
            const dt=d.data();const li=dt.lessonId;
            if(dt.classId!==c.id||!li)return;
            const sn=dt.studentName||dt.name;
            if(sn){ if(!byStudent[sn])byStudent[sn]=new Set(); byStudent[sn].add(li); }
          });
          const ranked=Object.entries(byStudent).sort((a,b)=>b[1].size-a[1].size);
          const myIdx=ranked.findIndex(([sn])=>sn===name);
          setClassStats(prev=>({...prev,[c.id]:{completedCount:byStudent[name]?.size||0,totalLessons:lessonsSnap.size,rank:myIdx>=0?myIdx+1:0}}));
        }catch(e){ console.error('Class stats load ('+c.id+'):', e.code||e.message||e); }
      }, err=>console.error('Class stats listener ('+c.id+'):', err.code||err.message||err))
    );
    return ()=>unsubs.forEach(u=>u());
  },[studentProfile,allClasses]);

  // Load lessons from SUBCOLLECTION (no 1MB limit!)
  useEffect(()=>{
    if(!classId||!authReady)return;
    const u1=onSnapshot(abhiClassDocRef(classId),snap=>{if(snap.exists()){setClassData(snap.data());setClassImageBase(snap.data().imageBaseUrl||DEFAULT_IMG_BASE);}else setClassData(null);});
    const u2=onSnapshot(
      abhiLessonsRef(classId),
      snap => setLessons(
        snap.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0))
      ),
      err => console.error('Lessons load error:', err.code, err.message)
    );
    return()=>{u1();u2();};
  },[classId,authReady]);

  const enterClass = (cId) => {
    // Reset all class-specific state to prevent stale data rendering
    setClassId(cId);
    setImportClassId(cId);
    setOpenLessonId(null);
    setLessons([]);       // clear previous class's lessons
    setClassData(null);   // clear previous class's data
    setNewTitle('');
    setNewContent('');
    setEditingLesson(null);
  };

  // Ping roster every 60s — skip if teacher mode. Keyed by userId now, so a
  // rename is just a changed `name`/`studentName` field on the same doc —
  // no redirect-pointer following needed.
  useEffect(()=>{
    if(!studentProfile||!classId||!userId||studentProfile.status!=='approved'||isTeacher) return;
    const name=studentProfile.name;
    const rRef=abhiRosterDocRef(classId,userId);
    const ping=async()=>{
      let snap;
      try{ snap=await getDoc(rRef); }
      catch(e){ console.error('Ping read error:',e); return; } // can't even read — try again next cycle

      if(snap.exists()){
        try{ await updateDoc(rRef,{studentName:name,name,isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp()}); }
        catch(e){ console.error('Ping heartbeat error:',e); }
        return;
      }

      // Doc genuinely doesn't exist yet under this uid -- either a first-time
      // student, or one who joined before roster docs were keyed by uid.
      // Check for an old name-keyed doc to carry forward before creating a
      // fresh one (see migrateOldAbhiRosterDoc).
      try{
        const migrated=await migrateOldAbhiRosterDoc(classId,userId,name);
        await setDoc(rRef,{
          ...(migrated||{}),
          classId,userId,studentName:name,name,
          group:(migrated&&migrated.group)||studentProfile.group||'explorers',
          status:'approved',isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp(),
          joinedAt:(migrated&&migrated.joinedAt)||Date.now(),
        },{merge:true});
      }catch(e2){console.error('Ping create error:',e2);}
    };
    ping();
    const interval=setInterval(ping,60000);
    const handleOffline=()=>{ try{ updateDoc(rRef,{isOnline:false,lastSeen:serverTimestamp()}); }catch(e){} };
    window.addEventListener('beforeunload',handleOffline);
    return()=>{ clearInterval(interval); handleOffline(); window.removeEventListener('beforeunload',handleOffline); };
  },[studentProfile,classId,userId]);
  const createClass = async () => {
    if(!newClassId.trim())return;
    await setDoc(abhiClassDocRef(newClassId.trim()),{classId:newClassId.trim(),autoApprove:false,createdAt:serverTimestamp()},{merge:true});
    enterClass(newClassId.trim());setNewClassId('');
  };

  const handleSaveLesson = async e => {
    e.preventDefault();
    if(!newTitle.trim()||!newContent.trim()||!classId){showMsg('Fill all fields and select a class!');return;}
    setLoading(true);
    try{
      const lId=editingLesson?editingLesson.id:`lesson_${Date.now()}`;
      const entry={id:lId,classId,title:newTitle.trim(),burmeseContent:newContent.trim(),imageBaseUrl:normalizeImgBaseUrl(newImgBase)||DEFAULT_IMG_BASE,variants:editingLesson?.variants||{},createdAt:editingLesson?.createdAt||serverTimestamp()};
      await setDoc(abhiLessonDocRef(classId,lId),entry,{merge:true});
      setNewTitle('');setNewContent('');setNewImgBase(DEFAULT_IMG_BASE);setEditingLesson(null);showMsg('Saved!');
    }catch(err){console.error(err);showMsg('Error saving.');}finally{setLoading(false);}
  };

  const handleDeleteLesson = async (lessonId) => {
    if(!classId)return;
    try{await deleteDoc(abhiLessonDocRef(classId,lessonId));}catch(e){console.error(e);}
  };

  const handleGenerateVariants = async (lesson, mode) => {
    if(!classId){showMsg('Select a class first!');return;}setGenId(lesson.id);
    try{
      const nv={};const grps=mode==='junior'?['storytellers','explorers']:['adventurers','voyagers'];
      await Promise.all(grps.map(async g=>{nv[g]=await generateSingleVariant(lesson.title,lesson.burmeseContent,g);}));
      await updateDoc(abhiLessonDocRef(classId,lesson.id),{variants:{...lesson.variants,...nv}});
      showMsg('Generated!');
    }catch(e){showMsg('Error.');console.error(e);}finally{setGenId(null);}
  };

  // ── Export Lessons Only ──────────────────────────────────────────────────────
  const handleExportLessonsOnly = async () => {
    if(!classId||lessons.length===0){showMsg('No lessons to export.');return;}
    setLoading(true);
    try{
      const data={classId,timestamp:new Date().toISOString(),lessons};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`abhidhamma-lessons-${classId}-${Date.now()}.json`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      showMsg(`Exported ${lessons.length} lessons.`);
    }finally{setLoading(false);}
  };

  // ── Export Full Backup ───────────────────────────────────────────────────────
  const handleExportFull = async () => {
    if(!classId){showMsg('Select a class first.');return;}setLoading(true);showMsg('Exporting…');
    try{
      const toMs=ts=>{if(!ts)return null;if(typeof ts.toMillis==='function')return ts.toMillis();if(ts.seconds)return ts.seconds*1000;return null;};
      const[rosterSnap,scoresSnap,actSnap]=await Promise.all([getDocs(query(abhiRosterRef(),where('classId','==',classId))),getDocs(query(abhiScoresRef(),where('classId','==',classId))),getDocs(query(abhiActivityRef(),where('classId','==',classId)))]);
      const data={version:3,classId,timestamp:new Date().toISOString(),lessons,roster:rosterSnap.docs.map(d=>({id:d.id,...d.data()})),scores:scoresSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),activityFeed:actSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),quizResults:{}};
      data.questions={};
      for(const l of lessons){
        const qSnap=await getDocs(abhiQRef(classId,l.id));
        if(!qSnap.empty) data.questions[l.id]=qSnap.docs.map(d=>({id:d.id,...d.data()}));
        for(const g of Object.keys(AGE_GROUPS)){const rs=await getDocs(abhiResultsRef(classId,l.id,g));if(!rs.empty)data.quizResults[`${l.id}_${g}`]=rs.docs.map(r=>({id:r.id,...r.data(),timestamp:toMs(r.data().timestamp)}));}}
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`abhidhamma-full-${classId}-${Date.now()}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);
      showMsg('Full backup exported!');
    }catch(e){console.error(e);showMsg('Error exporting!');}finally{setLoading(false);}
  };

  // ── Import Lessons Only → each lesson as SEPARATE Firestore doc (no 1MB limit) ──
  const handleImportLessonsOnly = (event) => {
    const file=event.target.files[0];if(!file)return;
    const tgt=importClassId.trim();if(!tgt){showMsg('Set Class ID for import!');event.target.value='';return;}
    const reader=new FileReader();
    reader.onload=async e=>{
      try{
        const data=JSON.parse(e.target.result);setLoading(true);
        const raw=Array.isArray(data)?data:(data.lessons||[]);
        if(raw.length===0){showMsg('No lessons found.');return;}
        const imgBase=normalizeImgBaseUrl(data.imageBaseUrl||newImgBase)||DEFAULT_IMG_BASE;

        // Check existing lessons to avoid duplicates
        const existSnap=await getDocs(abhiLessonsRef(tgt));
        const existIds=new Set(existSnap.docs.map(d=>d.id));

        // Ensure class doc exists
        await setDoc(abhiClassDocRef(tgt),{classId:tgt,autoApprove:false,createdAt:serverTimestamp()},{merge:true});

        let added=0,skipped=0;
        for(const[i,l]of raw.entries()){
          const lId=l.id||`imported_${Date.now()}_${i}`;
          if(existIds.has(lId)){skipped++;continue;}
          const entry={id:lId,classId:tgt,title:l.title||`Lesson ${i+1}`,burmeseContent:l.burmeseContent||l.content||'',imageBaseUrl:normalizeImgBaseUrl(l.imageBaseUrl)||imgBase,variants:l.variants||{},createdAt:l.timestamp||serverTimestamp()};
          // Store each lesson as its own document — no 1MB limit!
          await setDoc(abhiLessonDocRef(tgt,lId),entry);
          added++;
        }
        showMsg(`✅ Imported ${added} lessons (${skipped} skipped) into "${tgt}". Student records untouched.`);
        if(!classId)enterClass(tgt);
      }catch(err){console.error(err);showMsg(`Error: ${err.message}`);}
      finally{setLoading(false);event.target.value='';}
    };
    reader.readAsText(file);
  };

  // ── Import Full Backup ───────────────────────────────────────────────────────
    const handleImportFull = (event) => {
    const file=event.target.files[0];if(!file)return;
    const tgt=importClassId.trim();if(!tgt){showMsg('Set Class ID for import!');event.target.value='';return;}
    const reader=new FileReader();
    reader.onload=async e=>{
      const errors=[];
      try{
        const data=JSON.parse(e.target.result);setLoading(true);
        const toDate=ts=>ts?new Date(ts):serverTimestamp();
        const raw=Array.isArray(data)?data:(data.lessons||[]);
        const imgBase=normalizeImgBaseUrl(data.imageBaseUrl||newImgBase)||DEFAULT_IMG_BASE;
        await setDoc(abhiClassDocRef(tgt),{classId:tgt,autoApprove:false,createdAt:serverTimestamp()},{merge:true});
        try{
          for(const[i,l]of raw.entries()){
            const lId=l.id||`imported_${Date.now()}_${i}`;
            await setDoc(abhiLessonDocRef(tgt,lId),{id:lId,classId:tgt,title:l.title||`Lesson ${i+1}`,burmeseContent:l.burmeseContent||l.content||'',imageBaseUrl:normalizeImgBaseUrl(l.imageBaseUrl)||imgBase,variants:l.variants||{},createdAt:toDate(l.timestamp)});
          }
        }catch(err){console.error('Lessons restore:',err);errors.push('lessons');}
        try{
          for(const stu of(data.roster||data.students||[])){
            const sName=stu.studentName||stu.name||'';
            const docId=`${tgt}_${encodeURIComponent(sName)}`;
            const rRef=doc(db,P(`classRoster/${docId}`));
            const{id,...rData}=stu;
            await setDoc(rRef,{...rData,classId:tgt,studentName:sName,isOnline:false},{merge:true});
          }
        }catch(err){console.error('Roster restore:',err);errors.push('roster');}
        try{
          for(const s of[...(data.scores||[]),...(data.globalScores||[])]){
            const{id,timestamp,...r}=s;
            const docId=id||`${r.userId||'u'}_${r.lessonId||Date.now()}`;
            await setDoc(doc(abhiScoresRef(),docId),{...r,classId:tgt,timestamp:toDate(timestamp)});
          }
        }catch(err){console.error('Scores restore:',err);errors.push('scores');}
        try{
          for(const a of(data.activityFeed||[])){const{id,timestamp,...r}=a;await setDoc(doc(abhiActivityRef(),id||`a${Date.now()}_${Math.random().toString(36).slice(2,7)}`),{...r,classId:r.classId||tgt,timestamp:toDate(timestamp)});}
        }catch(err){console.error('Activity restore:',err);errors.push('notifications');}
        try{
          for(const[key,rList]of Object.entries(data.quizResults||{})){const parts=key.split('_');const g=parts.pop();const lId=parts.join('_');if(!lId)continue;for(const r of rList){const{id,timestamp,...rest}=r;await setDoc(doc(abhiResultsRef(tgt,lId,g),id||`r${Date.now()}`),{...rest,timestamp:toDate(timestamp)});}}
        }catch(err){console.error('Quiz results restore:',err);errors.push('quiz results');}
        try{
          for(const[lessonId,qList]of Object.entries(data.questions||{})){for(const q of qList){const{id,...rest}=q;await setDoc(doc(abhiQRef(tgt,lessonId),id||`q${Date.now()}`),{...rest});}}
        }catch(err){console.error('Q&A restore:',err);errors.push('discussions');}
        showMsg(errors.length?`⚠ "${tgt}" ထဲ ဝင်ပေမဲ့ ဒီအပိုင်းတွေမှာ error တက်ခဲ့တယ်: ${errors.join(', ')}. Console ကြည့်ပါ။`:`✅ Restored ${raw.length} lesson(s) into "${tgt}".`);
        if(!classId)enterClass(tgt);
      }catch(err){console.error(err);showMsg(`Error: ${err.message}`);}
      finally{setLoading(false);event.target.value='';}
    };
    reader.readAsText(file);
  };

  if(!authReady)return<div className="min-h-screen bg-gray-900 flex items-center justify-center"><RotateCw className="animate-spin w-8 h-8 text-amber-400"/></div>;

  return(
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8 pt-16">
      <style>{`.animate-bounce-in{animation:bounceIn .5s ease-out}@keyframes bounceIn{0%{transform:scale(.5);opacity:0}80%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}`}</style>
      <input type="file" ref={fileLessonsRef} onChange={handleImportLessonsOnly} accept=".json" className="hidden"/>
      <input type="file" ref={fileRef}        onChange={handleImportFull}         accept=".json" className="hidden"/>
      {/* Teacher login modal (opens via header "Teacher Login" button) */}
      {showWelcome&&<AbhiTeacherLogin onComplete={()=>{setIsTeacher(true);setRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');setShowWelcome(false);}} onClose={()=>setShowWelcome(false)}/>}
      {showLeaderboard&&<AbhiLeaderboardModal classId={classId} studentName={studentProfile?.name} userId={userId} onClose={()=>setShowLeaderboard(false)}/>}
      {/* Floating stats bar — visible to students, shows rank + completed lessons for the open class */}
      {role==='Student'&&studentProfile&&classId&&((classStats[classId]?.completedCount>0)||(classStats[classId]?.rank>0))&&(
        <AbhiFloatingStats rank={classStats[classId]?.rank||0} totalLessons={classStats[classId]?.completedCount||0}/>
      )}
      {activeQuizId&&activeQuizData&&<QuizModule classId={classId} lessonId={activeQuizId} lessonTitle={lessons.find(l=>l.id===activeQuizId)?.title||''} userId={userId} userName={studentProfile?.name||'Student'} ageGroup={studentProfile?.group} quizData={activeQuizData} onClose={()=>{setActiveQuizId(null);setActiveQuizData(null);}}/>}
      {msg&&<div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold">{msg}</div>}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-amber-400">📚 Abhidhamma App</span>
            {isTeacher&&(<div className="flex gap-2 flex-wrap items-center">
              {/* Change Class — always visible in teacher mode */}
              {classId&&<button onClick={()=>{setClassId('');setLessons([]);setClassData(null);setRole('Teacher');}} className="px-3 py-2 font-bold rounded bg-amber-700 hover:bg-amber-600 text-white text-sm flex items-center gap-1"><ChevronLeft className="w-4 h-4"/>Change Class</button>}
              <button onClick={()=>setRole(r=>r==='Teacher'?'Student':'Teacher')} className={`px-4 py-2 font-bold rounded shadow-lg ${role==='Teacher'?'bg-purple-600':'bg-teal-600'}`}>{role==='Teacher'?'Student View':'Teacher View'}</button>
              {role==='Student'&&<button onClick={()=>setTeacherPreviewGroup(g=>{const ks=Object.keys(AGE_GROUPS);return ks[(ks.indexOf(g)+1)%ks.length];})} className="px-4 py-2 font-bold rounded bg-cyan-700 hover:bg-cyan-600 text-white flex items-center gap-2">{AGE_GROUPS[teacherPreviewGroup]?.icon}{AGE_GROUPS[teacherPreviewGroup]?.label?.split(' ')[0]}</button>}
            </div>)}
            {studentProfile?.status==='approved'&&<span className="bg-gray-700 px-3 py-1 rounded text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4"/>{studentProfile.name}</span>}
          </div>
          <div className="flex items-center gap-3">
            {classId&&<span className="text-gray-400 text-sm font-semibold">· {classId}</span>}
            {/* Trophy + Notification only when inside a class */}
            {classId&&role==='Student'&&studentProfile&&(
              <button onClick={()=>setShowLeaderboard(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-yellow-400 shadow-lg" title="Champions Board">
                <Trophy className="w-5 h-5"/>
              </button>
            )}
            {classId&&<NotificationBell userId={userId} classId={classId}/>}
          </div>
        </header>

        <OnlineStatusWidget
          rosterPath={P('classRoster')}
          isTeacherMode={role==='Teacher'}
          studentName={role==='Student'?studentProfile?.name:null}
          coinBalance={role==='Student'?abhiCoinBalance:null}
          onCoinClick={role==='Student'?handleDepositAbhiCoinsToShrineRoom:undefined}
          filterDocs={d=>d.status==='approved'&&(!classId||d.classId===classId)}
          panelTitle="📚 Students"
          teacherLabel="👩‍🏫 Teacher"
          renderActivity={s=>(
            <span className="text-gray-600">{s.classId}{s.group?` · ${AGE_GROUPS[s.group]?.label?.split(' ')[0]||s.group}`:''}</span>
          )}
        />

        {/* ── TEACHER VIEW ── */}
        {role==='Teacher'&&(
          <div className="space-y-6">

            {!classId&&<AbhiTeacherClassPicker onSelectClass={enterClass} onCreateClass={enterClass}/>}
            {classId&&<AbhiClassRoster key={classId} userId={userId} classId={classId}/>}
            {classId&&(
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                {/* Import/Export bar — Import target class shown prominently */}
                <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-amber-600/30 space-y-3">
                  {/* Import target class input */}
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs font-bold whitespace-nowrap shrink-0">📥 Import → Class ID:</span>
                    <input value={importClassId} onChange={e=>setImportClassId(e.target.value.toUpperCase())}
                      placeholder="e.g. PARAMI"
                      className="flex-1 bg-gray-800 text-amber-200 text-sm font-mono font-black px-3 py-1.5 rounded border border-amber-500/40 focus:outline-none focus:border-amber-400 uppercase"
                      title="All imported data goes to this class ID"/>
                    {importClassId.trim()&&<span className="text-green-400 text-xs font-bold whitespace-nowrap">Will import to: {importClassId.trim()}</span>}
                  </div>
                  {/* Import buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={()=>fileLessonsRef.current?.click()} disabled={!importClassId.trim()||loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                      title="Import lessons only (no student data)">
                      <Upload className="w-3 h-3"/>📚 Import Lessons
                    </button>
                    <button onClick={()=>fileRef.current?.click()} disabled={!importClassId.trim()||loading}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                      title="Restore full backup including student records">
                      <Upload className="w-3 h-3"/>📦 Restore All
                    </button>
                    <span className="text-gray-600 self-center">|</span>
                    <button onClick={handleExportLessonsOnly} disabled={loading}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
                      <Download className="w-3 h-3"/>📚 Export Lessons
                    </button>
                    <button onClick={handleExportFull} disabled={loading}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
                      <Download className="w-3 h-3"/>📦 Full Backup
                    </button>
                    <span className="text-gray-600 self-center">|</span>
                    <button onClick={async()=>{
                        if(!classId)return;
                        if(!window.confirm(`⚠️ Delete class "${classId}" and everything in it?\n\nThis deletes its lessons, roster, scores, quiz results, and notifications for THIS class only — other classes are untouched.\n\nThis CANNOT be undone!`))return;
                        const input=window.prompt(`Type ${classId} to confirm:`);
                        if(input!==classId)return;
                        setLoading(true);showMsg(`Deleting class ${classId}…`);
                        try{
                          const [lessonsSnap,rosterSnap,scoresSnap,activitySnap]=await Promise.all([
                            getDocs(abhiLessonsRef(classId)),
                            getDocs(query(abhiRosterRef(),where('classId','==',classId))),
                            getDocs(query(abhiScoresRef(),where('classId','==',classId))),
                            getDocs(query(abhiActivityRef(),where('classId','==',classId)))
                          ]);
                          // Quiz results live under a separate top-level lessons/{lessonId}/quiz/{group}/results
                          // path — delete those for every lesson + age group in this class first.
                          for(const lDoc of lessonsSnap.docs){
                            for(const g of Object.keys(AGE_GROUPS)){
                              const rSnap=await getDocs(abhiResultsRef(classId,lDoc.id,g));
                              await Promise.all(rSnap.docs.map(d=>deleteDoc(d.ref)));
                            }
                          }
                          await Promise.all([
                            ...lessonsSnap.docs.map(d=>deleteDoc(d.ref)),
                            ...rosterSnap.docs.map(d=>deleteDoc(d.ref)),
                            ...scoresSnap.docs.map(d=>deleteDoc(d.ref)),
                            ...activitySnap.docs.map(d=>deleteDoc(d.ref))
                          ]);
                          await deleteDoc(abhiClassDocRef(classId));
                          showMsg(`✅ Deleted class "${classId}" and all its data.`);
                          setClassId('');
                        }catch(e){console.error(e);showMsg('Error: '+e.message);}finally{setLoading(false);}
                      }} disabled={loading||!classId}
                      className="bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1" title="Delete this class and everything tied to it (lessons, roster, scores, quiz results, notifications) — other classes are untouched">
                      🗑 Delete This Class
                    </button>
                  </div>
                  {!importClassId.trim()&&<p className="text-amber-500/70 text-xs">⚠ Enter a Class ID above before importing</p>}
                </div>
                <h3 className="text-xl font-bold text-teal-300 mb-4">{editingLesson?'Edit Lesson':'Add Lesson'} — <span className="text-amber-400">{classId}</span></h3>
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={loading}/>
                  <textarea ref={contentTextareaRef} value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Lesson Content (Burmese)" rows="6" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={loading}/>
                  <button type="button" onClick={insertNextImage} disabled={loading} className="text-sm bg-gray-700 hover:bg-gray-600 text-teal-300 px-3 py-2 rounded flex items-center gap-1">
                    <ImageIcon className="w-4 h-4"/> Insert Next Image ({getNextImageNumber()}.jpg)
                  </button>
                  <div className="flex gap-2">
                    <button type="submit" disabled={loading} className="flex-1 bg-teal-600 p-3 rounded hover:bg-teal-700 flex justify-center items-center font-bold">{loading?<RotateCw className="animate-spin w-5 h-5 mr-2"/>:<BookOpen className="w-5 h-5 mr-2"/>}{editingLesson?'Update':'Save Lesson'}</button>
                    {editingLesson&&<button type="button" onClick={()=>{setEditingLesson(null);setNewTitle('');setNewContent('');setNewImgBase(DEFAULT_IMG_BASE);}} className="bg-gray-600 p-3 rounded hover:bg-gray-500">Cancel</button>}
                  </div>
                </form>
              </div>
            )}
            {classId&&(<div className="space-y-4">{lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons in <strong>{classId}</strong> yet. Import or add a lesson above.</p>}{lessons.map(l=><AbhiLessonItem key={l.id} lesson={l} classId={classId} isTeacher userId={userId} onEdit={lesson=>{setEditingLesson(lesson);setNewTitle(lesson.title);setNewContent(lesson.burmeseContent);setNewImgBase(lesson.imageBaseUrl||DEFAULT_IMG_BASE);window.scrollTo({top:0,behavior:'smooth'});}} onGenerateVariants={handleGenerateVariants} classImageBase={classImageBase} onTakeQuiz={()=>{}} isGenerating={genId===l.id} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}</div>)}
          </div>
        )}

        {/* ── STUDENT VIEW ── */}
        {role==='Student'&&(
          <div>
            {/* Teacher in Student View: bypass picker, show lessons directly */}
            {isTeacher && !classId && (
              <div className="p-6 max-w-lg mx-auto mt-10">
                <h2 className="text-3xl font-bold text-amber-700 mb-2 text-center">📚 Choose Class to Preview</h2>
                <p className="text-center text-amber-600 text-sm mb-6">{AGE_GROUPS[teacherPreviewGroup]?.label} preview</p>
                {allClasses.length===0?<p className="text-center text-gray-500 italic">No classes yet.</p>
                :<div className="space-y-3">{allClasses.map(c=>(
                  <button key={c.id} onClick={()=>enterClass(c.id)} className="w-full p-4 rounded-xl border-2 text-left font-bold text-lg bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50 transition-all flex justify-between items-center">
                    <span>{c.displayName||c.id}</span><span className="text-xs text-gray-400">{c.id}</span>
                  </button>
                ))}</div>}
              </div>
            )}
            {/* Step 1: Real student only (isTeacher guard prevents flash on teacher accounts).
                Always shown on open (even for a known deep-link student) so they can confirm/update
                their age group as they grow — no name field needed since the name is already known. */}
            {!isTeacher && !studentProfile&&(
              <AbhiAgeGroupPicker initialGroup={pendingEntry?.group} onComplete={grp => {
                let cachedName=null;
                if(userId){try{cachedName=JSON.parse(localStorage.getItem(`abhidhamma_profile_${userId}`)||'null')?.name||null;}catch(e){}}
                const label = AGE_GROUPS[grp]?.label?.split(' ')[0] || 'Student';
                const name = pendingEntry?.name || cachedName || label;
                const p = { group: grp, status: 'approved', name };
                setStudentProfile(p);
                if (userId) localStorage.setItem(`abhidhamma_profile_${userId}`, JSON.stringify(p));
              }}/>
            )}

            {/* Step 2: Has profile, no class → show class list (SmartStudy-style) */}
            {studentProfile&&!classId&&(
              <div className="p-6 max-w-lg mx-auto mt-10">
                <h2 className="text-3xl font-bold text-amber-700 mb-2 text-center">📚 Choose Your Class</h2>
                <p className="text-center text-amber-600 text-sm mb-2 font-semibold">
                  {AGE_GROUPS[studentProfile.group]?.label}
                </p>
                {(pendingEntry?.classId||entryRequest?.classId||assignedClassId) && !openClassId && (
                  <p className="text-gray-600 text-center mb-6">Your teacher assigned <span className="font-bold text-amber-700">{pendingEntry?.classId||entryRequest?.classId||assignedClassId}</span> — tap it below to start.</p>
                )}
                {openClassId && (
                  <p className="text-gray-600 text-center mb-6">Your teacher currently has <span className="font-bold text-amber-700">{allClasses.find(c=>c.id===openClassId)?.displayName||openClassId}</span> open — tap any class below to join it.</p>
                )}
                {allClasses.length===0
                  ? <p className="text-center text-gray-500 italic">No classes found yet.</p>
                  : <div className="space-y-3">
                      {allClasses.map(c => {
                        const stat=classStats[c.id];
                        const allDone=stat&&stat.totalLessons>0&&stat.completedCount>=stat.totalLessons;
                        return(
                        <button key={c.id} onClick={() => enterClass(openClassId||c.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all ${
                            c.id===(openClassId||pendingEntry?.classId||entryRequest?.classId||assignedClassId)
                              ? 'bg-amber-100 border-amber-500 text-amber-800 shadow-lg scale-[1.02]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                          }`}>
                          <div className="flex items-center justify-between gap-2 flex-nowrap">
                            <span className="truncate min-w-0 flex-1">{c.id===(openClassId||pendingEntry?.classId||entryRequest?.classId||assignedClassId)?'⭐ ':''}{c.displayName||c.id}</span>
                            <div className="flex items-center gap-2 flex-nowrap shrink-0">
                              {stat?.rank>0&&(
                                <span className="text-xs font-bold text-yellow-700 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap">🏆 Rank #{stat.rank}</span>
                              )}
                              {stat?.completedCount>0&&(
                                allDone
                                  ? <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full whitespace-nowrap">✅ all completed</span>
                                  : <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap">{stat.completedCount}{stat.totalLessons?` / ${stat.totalLessons}`:''} completed</span>
                              )}
                            </div>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                }
              </div>
            )}

            {/* Step 3: Has profile + class → show lessons */}
            {studentProfile&&classId&&(
              <div key={classId} className="space-y-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold text-white">Class: <span className="text-amber-400">{classId}</span></h2>
                  <button onClick={()=>{setClassId('');setClassData(null);setLessons([]);}}
                    className="text-sm text-gray-400 hover:text-white underline">← Change Class</button>
                </div>
                                {lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons yet.</p>}
                {lessons.map(l=>(
                  <AbhiLessonItem key={l.id} lesson={l} classId={classId}
                    isTeacher={false} userId={userId}
                    studentAgeGroup={isTeacher ? teacherPreviewGroup : studentProfile.group}
                    studentName={isTeacher ? (AGE_GROUPS[teacherPreviewGroup]?.label||'Preview') : studentProfile.name}
                    classImageBase={classImageBase} onGenerateVariants={()=>{}} onEdit={()=>{}}
                    onTakeQuiz={(id,title,data)=>{setActiveQuizId(id);setActiveQuizData(data);}}
                    isGenerating={false} isOpen={openLessonId===l.id}
                    onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
