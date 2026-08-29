import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc, arrayUnion, onSnapshot, query, orderBy, serverTimestamp, addDoc, getDoc, where, getDocs, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  BookOpen, Edit2, Zap, RotateCw, Upload, Download, CheckCircle, MessageCircle, Send, Heart,
  Trophy, Timer, Pause, ChevronDown, ChevronRight, Gamepad2, X, ExternalLink, Youtube, Music,
  User, Baby, Compass, Map, Ship, Globe, Sparkles, Wand2, Lock, CheckCheck, AlertCircle,
  ArrowUp, ArrowDown, Key, ChevronLeft, Users, UserCheck, UserX, Circle, Trash2, Bell,
  ToggleLeft, ToggleRight, Plus, FolderOpen, ImageIcon, FileText, RefreshCw
} from 'lucide-react';
import { auth, db } from './firebase';

// ─── Constants ───────────────────────────────────────────────────────────────
const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';
const DEFAULT_IMG_BASE  = 'https://raw.githubusercontent.com/nathantun93/dhamma4/main/';
const AUDIO_BASE_URL    = 'https://raw.githubusercontent.com/nathantun93/bell/main/';
const TEACHER_PASSCODE  = '1';

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
const abhiRosterDocRef   = (cId, name)   => doc(db, P(`classRoster/${cId}_${encodeURIComponent(name)}`));
const abhiRosterRef      = ()            => collection(db, P('classRoster'));
const abhiScoresRef      = ()            => collection(db, P('scores'));
const abhiActivityRef    = ()            => collection(db, P('activity_feed'));
const abhiResultsRef     = (cId,lId,g)   => collection(db, P(`classes/${cId}/quizResults/${lId}/${g}`));

// ─── AI generation ────────────────────────────────────────────────────────────
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`;
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
        try{await addDoc(abhiResultsRef(classId,lessonId,ageGroup),{name:userName,score:fs,userId,group:ageGroup,timestamp:serverTimestamp()});await addDoc(abhiActivityRef(),{type:'quiz_completed',studentName:userName,lessonTitle,group:ageGroup,timestamp:serverTimestamp()});}catch(e){console.error(e);}
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
const NotificationBell = ({ userId }) => {
  const [n,setN]=useState([]);const [open,setOpen]=useState(false);const [lr,setLr]=useState(()=>parseInt(localStorage.getItem(`abhidhamma_notif_${userId}`))||0);
  useEffect(()=>{if(!db||!userId)return;const q=query(abhiActivityRef(),orderBy('timestamp','desc'),limit(15));return onSnapshot(q,snap=>setN(snap.docs.map(d=>({id:d.id,...d.data()}))));},[userId]);
  const uc=n.filter(x=>{const ts=x.timestamp?.toMillis?x.timestamp.toMillis():(x.timestamp?.seconds*1000)||0;return ts>lr;}).length;
  const toggle=()=>{if(!open){const now=Date.now();setLr(now);localStorage.setItem(`abhidhamma_notif_${userId}`,now);}setOpen(!open);};
  return(
    <div className="relative"><button onClick={toggle} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full relative shadow-lg"><Bell className="w-5 h-5 text-gray-300"/>{uc>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{uc>9?'9+':uc}</span>}</button>
    {open&&<div className="absolute right-0 mt-2 w-72 max-w-[90vw] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden"><div className="p-3 border-b border-gray-700 flex justify-between items-center"><h4 className="font-bold text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-400"/>Notifications</h4><button onClick={()=>setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4"/></button></div><div className="max-h-64 overflow-y-auto p-2 space-y-2">{n.length===0?<p className="text-center text-gray-500 text-xs py-6 italic">No notifications</p>:n.map(x=><div key={x.id} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/50 flex items-start gap-3"><Trophy className="w-4 h-4 text-yellow-400 mt-1"/><div><p className="text-xs font-bold text-white"><span className="text-indigo-300">{x.studentName}</span> finished a quiz!</p><p className="text-[10px] text-gray-400 truncate mt-0.5">{x.lessonTitle}</p></div></div>)}</div></div>}
    </div>
  );
};

// ─── AbhiClassRoster ──────────────────────────────────────────────────────────
const AbhiClassRoster = ({ userId, classId }) => {
  const [students,setStudents]=useState([]);const [open,setOpen]=useState(true);const [now,setNow]=useState(Date.now());const [aa,setAa]=useState(false);
  useEffect(()=>{const i=setInterval(()=>setNow(Date.now()),10000);return()=>clearInterval(i);},[]);
  useEffect(()=>{if(!classId)return;const q=query(abhiRosterRef(),where('classId','==',classId));return onSnapshot(q,snap=>{const n=Date.now();setStudents(snap.docs.map(d=>{const dt=d.data(),lp=dt.lastPing;if(dt.isOnline&&lp){const pm=lp.toMillis?lp.toMillis():(lp.seconds*1000);if((n-pm)/60000>2)return{id:d.id,...dt,isOnline:false};}return{id:d.id,...dt};}));});},[classId]);
  useEffect(()=>{if(!classId||!db)return;return onSnapshot(abhiClassDocRef(classId),snap=>{if(snap.exists())setAa(snap.data().autoApprove||false);});},[classId]);
  const toggleAA=async e=>{e.stopPropagation();if(!classId)return;await updateDoc(abhiClassDocRef(classId),{autoApprove:!aa});};
  const approve=async(docId,name)=>{const ref=doc(db,P(`classRoster/${docId}`));const snap=await getDoc(ref);if(!snap.exists())return;const dt=snap.data();let num=dt.studentNumber;if(!num){const max=students.filter(s=>s.status==='approved').reduce((m,s)=>Math.max(m,s.studentNumber||0),0);num=max+1;}await updateDoc(ref,{status:'approved',name:name||dt.name,pendingName:null,studentNumber:num});};
  useEffect(()=>{if(aa)students.filter(s=>s.status==='pending').forEach(s=>approve(s.id,s.pendingName||s.name));},[students,aa]);
  const reject=id=>updateDoc(doc(db,P(`classRoster/${id}`)),{status:'rejected',pendingName:null});
  const remove=async(e,id)=>{e.stopPropagation();try{await deleteDoc(doc(db,P(`classRoster/${id}`)));}catch(err){console.error(err);}};
  if(!classId)return null;
  const pending=students.filter(s=>s.status==='pending');const online=students.filter(s=>s.status==='approved'&&s.isOnline).sort((a,b)=>(a.studentNumber||0)-(b.studentNumber||0));const offline=students.filter(s=>s.status==='approved'&&!s.isOnline).sort((a,b)=>(a.studentNumber||0)-(b.studentNumber||0)).map(s=>{let w=false;const ct=s.lastSeen||s.lastPing;if(ct){const ms=ct.toMillis?ct.toMillis():(ct.seconds*1000);const d=(now-ms)/60000;if(d>=3&&d<=8)w=true;}return{...s,isWarning:w};});
  return(
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 mb-6 overflow-hidden">
      <div onClick={()=>setOpen(!open)} className="p-4 border-b border-gray-700 cursor-pointer flex flex-wrap gap-3 justify-between items-center hover:bg-gray-700 transition">
        <div className="flex items-center gap-4"><h3 className="font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400"/>Roster: {classId}</h3><button onClick={toggleAA} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold ${aa?'bg-green-500/20 text-green-400 border border-green-500/50':'bg-gray-800 text-gray-400 border border-gray-600'}`}>{aa?<ToggleRight className="w-4 h-4"/>:<ToggleLeft className="w-4 h-4"/>}Auto-Approve</button></div>
        <div className="flex items-center gap-4 text-sm font-semibold"><span className="text-yellow-400">{pending.length} Pending</span><span className="text-green-400">{online.length} Online</span><span className="text-gray-400">{online.length+offline.length} Total</span>{open?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronLeft className="w-5 h-5 text-gray-400"/>}</div>
      </div>
      {open&&<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50">
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pending {pending.length>0&&<span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse inline-block ml-1"/>}</h4>
          {pending.length===0&&<p className="text-gray-500 text-sm italic">None.</p>}
          {pending.map(s=><div key={s.id} className="bg-gray-800 p-3 rounded-lg border border-yellow-600/30 flex justify-between items-center"><div><p className="font-bold text-white">{s.pendingName||s.name}</p>{s.pendingName&&<p className="text-xs text-yellow-400">Previous: {s.name}</p>}</div><div className="flex gap-2"><button onClick={()=>approve(s.id,s.pendingName||s.name)} className="p-2 bg-green-600 rounded text-white"><UserCheck className="w-4 h-4"/></button><button onClick={()=>reject(s.id)} className="p-2 bg-red-600 rounded text-white"><UserX className="w-4 h-4"/></button></div></div>)}
        </div>
        <div className="space-y-4">
          <div><h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Online ({online.length})</h4><div className="flex flex-wrap gap-2">{online.length===0&&<span className="text-gray-600 text-sm italic">Nobody.</span>}{online.map(s=><div key={s.id} className="bg-indigo-900/60 border border-indigo-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm"><Circle className="w-2 h-2 fill-green-500 text-green-500"/><span className="font-bold text-indigo-300">#{s.studentNumber}</span><span className="text-white">{s.name}</span><button onClick={e=>remove(e,s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button></div>)}</div></div>
          <div><h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Offline ({offline.length})</h4><div className="flex flex-wrap gap-2">{offline.length===0&&<span className="text-gray-600 text-sm italic">None.</span>}{offline.map(s=><div key={s.id} className={`border px-3 py-1.5 rounded-full flex items-center gap-2 text-sm ${s.isWarning?'bg-red-950/80 border-red-500':'bg-gray-800 border-gray-600 opacity-60 hover:opacity-100'}`}><Circle className={`w-2 h-2 flex-shrink-0 ${s.isWarning?'fill-red-500 text-red-500':'fill-gray-500 text-gray-500'}`}/><span className={`font-bold ${s.isWarning?'text-red-300':'text-gray-400'}`}>#{s.studentNumber}</span><span className={s.isWarning?'text-white':'text-gray-300'}>{s.name}</span><button onClick={e=>remove(e,s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button></div>)}</div></div>
        </div>
      </div>}
    </div>
  );
};

// ─── WelcomeModal ─────────────────────────────────────────────────────────────
const AbhiWelcomeModal = ({ userId, classId, onStudentComplete, onTeacherComplete }) => {
  const [step,setStep]=useState('role_select');const [name,setName]=useState('');const [grp,setGrp]=useState(null);const [pass,setPass]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
  const handleSubmit=async()=>{if(!name.trim()||!grp)return;setBusy(true);try{const rRef=abhiRosterDocRef(classId,name.trim());const cRef=abhiClassDocRef(classId);const[rSnap,cSnap]=await Promise.all([getDoc(rRef),getDoc(cRef)]);const aa=cSnap.exists()?cSnap.data().autoApprove:false;const status=aa?'approved':'pending';if(rSnap.exists()){const d=rSnap.data();if(d.status==='approved'){onStudentComplete({...d});return;}await updateDoc(rRef,{pendingName:name.trim(),group:grp,status});}else{await setDoc(rRef,{classId,studentName:name.trim(),name:name.trim(),group:grp,status,joinedAt:Date.now()});}if(aa){const s=await getDoc(rRef);onStudentComplete({...s.data()});}else setStep('waiting');}catch(e){console.error(e);}finally{setBusy(false);}};
  useEffect(()=>{if(!userId||!classId||step!=='waiting')return;return onSnapshot(abhiRosterDocRef(classId,name.trim()),snap=>{if(snap.exists()&&snap.data().status==='approved')onStudentComplete({...snap.data()});else if(snap.exists()&&snap.data().status==='rejected')setStep('role_select');});},[userId,classId,step]);
  return(
    <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
      <div className="bg-amber-900/90 border border-amber-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative">
        {step!=='role_select'&&step!=='waiting'&&<button onClick={()=>{setStep('role_select');setErr('');setPass('');}} className="absolute top-4 left-4 text-amber-300 hover:text-white"><ChevronLeft className="w-8 h-8"/></button>}
        {step==='role_select'&&<div><Globe className="w-16 h-16 mx-auto text-amber-400 mb-4 animate-pulse"/><h2 className="text-3xl font-black text-white mb-8">📚 Abhidhamma App</h2><div className="space-y-4"><button onClick={()=>setStep('student')} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-3"><User className="w-6 h-6"/>Student</button><button onClick={()=>setStep('teacher')} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-3"><Key className="w-6 h-6"/>Teacher</button></div></div>}
        {step==='student'&&<div><User className="w-16 h-16 mx-auto text-cyan-400 mb-4 animate-pulse"/><h2 className="text-2xl font-black text-white mb-2">Student Setup</h2>{classId&&<p className="text-amber-200 text-sm mb-4">Class: <strong>{classId}</strong></p>}<input className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 outline-none" placeholder="Your Full Name" value={name} onChange={e=>setName(e.target.value)} disabled={busy}/><div className="grid grid-cols-2 gap-3 mb-6">{Object.entries(AGE_GROUPS).map(([k,v])=><button key={k} onClick={()=>setGrp(k)} disabled={busy} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${grp===k?'bg-cyan-500 border-cyan-300 text-white scale-105':'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}>{v.icon}<span className="text-xs font-bold">{v.label}</span></button>)}</div><button onClick={handleSubmit} disabled={!name||!grp||busy} className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-xl py-4 rounded-xl">{busy?<RotateCw className="w-6 h-6 mx-auto animate-spin"/>:'ENTER'}</button></div>}
        {step==='waiting'&&<div><Lock className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-pulse"/><h2 className="text-2xl font-black text-white mb-4">Waiting for Approval…</h2><RotateCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin"/></div>}
        {step==='teacher'&&<div><Wand2 className="w-16 h-16 mx-auto text-purple-400 mb-4 animate-pulse"/><h2 className="text-3xl font-black text-white mb-4">Teacher Login</h2><input type="password" className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 outline-none" placeholder="Passcode" value={pass} onChange={e=>{setPass(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&(pass===TEACHER_PASSCODE?onTeacherComplete():setErr('Incorrect.'))}/>{err&&<p className="text-red-400 mb-4 text-sm font-bold">{err}</p>}<button onClick={()=>pass===TEACHER_PASSCODE?onTeacherComplete():setErr('Incorrect.')} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xl py-4 rounded-xl">LOGIN</button></div>}
      </div>
    </div>
  );
};

// ─── LessonItem ───────────────────────────────────────────────────────────────
const AbhiLessonItem = ({ lesson, classId, isTeacher, studentAgeGroup, studentName, userId, onEdit, onGenerateVariants, onTakeQuiz, isGenerating, isOpen, onToggle }) => {
  const [tab,setTab]=useState('content');const [isCompleted,setIsCompleted]=useState(false);const [leaderboard,setLb]=useState([]);const [showLb,setShowLb]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{if(isOpen&&ref.current){setTimeout(()=>{const y=ref.current.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:'smooth'});},100);}},[isOpen]);
  useEffect(()=>{if(!classId||!userId||!lesson.id||!studentAgeGroup)return;const u=onSnapshot(query(abhiResultsRef(classId,lesson.id,studentAgeGroup),where('userId','==',userId)),snap=>setIsCompleted(!snap.empty));return()=>u();},[classId,lesson.id,userId,studentAgeGroup]);
  useEffect(()=>{if(!showLb||!classId||!lesson.id)return;getDocs(query(abhiScoresRef(),where('classId','==',classId),where('lessonId','==',lesson.id))).then(snap=>{const s={};snap.docs.forEach(d=>{const dt=d.data();if(!s[dt.userId]||dt.score>s[dt.userId].score)s[dt.userId]=dt;});setLb(Object.values(s).sort((a,b)=>b.score-a.score));});},[showLb,classId,lesson.id]);
  const variants=lesson.variants||{};const hasJr=variants.storytellers&&variants.explorers;const hasSr=variants.adventurers&&variants.voyagers;
  let dc='',dt=lesson.title,qa=false,qd=null;
  if(!isTeacher&&studentAgeGroup){const v=variants[studentAgeGroup];if(v){dc=v.english;dt=v.englishTitle||lesson.title;qa=!!v.quiz;qd=v.quiz;}else dc='Content not available for your age group yet.';}
  const imgBase=lesson.imageBaseUrl||DEFAULT_IMG_BASE;
  return(
    <div ref={ref} className={`relative rounded-xl shadow-md overflow-hidden border mb-4 ${isTeacher?'bg-gray-800 border-gray-700':'bg-gray-700 border-gray-600'}`}>
      {isGenerating&&<div className="absolute inset-0 bg-gray-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl"><RotateCw className="w-12 h-12 text-teal-400 animate-spin mb-4"/><p className="text-white font-bold">Generating…</p></div>}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-gray-600/50 flex justify-between items-center">
        <div className="flex items-center gap-3">{isOpen?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronRight className="w-5 h-5 text-gray-400"/>}
          <div className="flex flex-col"><h3 className={`text-lg font-bold flex items-center gap-2 ${isTeacher?'text-teal-300':'text-white'}`}>{dt}{isCompleted&&<span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/30"><CheckCheck className="w-3 h-3"/>Done</span>}</h3>{isTeacher&&<span className="text-xs text-gray-500">{hasJr&&hasSr?<span className="text-green-400">✓ Ready</span>:<span className="text-yellow-500">Pending: {!hasJr&&'Jr '}{!hasSr&&'Sr'}</span>}</span>}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e=>{e.stopPropagation();setShowLb(true);}} className="p-2 text-yellow-500 hover:text-yellow-400 rounded-full z-20"><Trophy className="w-5 h-5"/></button>
          {isTeacher&&<div className="flex items-center gap-1 mr-2" onClick={e=>e.stopPropagation()}><button onClick={()=>onEdit(lesson)} className="p-2 bg-blue-600 rounded hover:bg-blue-700 text-white"><Edit2 className="w-3 h-3"/></button><button onClick={()=>onGenerateVariants(lesson,'junior')} className="px-3 py-1 bg-purple-600 rounded text-white text-xs font-bold flex items-center gap-1 hover:bg-purple-700"><Zap className="w-3 h-3"/>Jr.</button><button onClick={()=>onGenerateVariants(lesson,'senior')} className="px-3 py-1 bg-pink-600 rounded text-white text-xs font-bold flex items-center gap-1 hover:bg-pink-700"><Zap className="w-3 h-3"/>Sr.</button></div>}
        </div>
      </div>
      {isOpen&&<div className="border-t border-gray-600/50 p-5">
        {isTeacher?<div className="text-white whitespace-pre-wrap leading-relaxed"><SmartContent text={lesson.burmeseContent} imageBase={imgBase}/></div>
        :<div className="space-y-4">
          <div className="text-yellow-100 whitespace-pre-wrap leading-relaxed text-lg"><SmartContent text={dc} imageBase={imgBase}/></div>
          {qa&&<button onClick={e=>{e.stopPropagation();onTakeQuiz(lesson.id,dt,qd);}} className={`w-full py-3 font-black rounded-xl shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2 ${isCompleted?'bg-gradient-to-r from-green-600 to-teal-600 text-white':'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}`}>{isCompleted?<><Trophy className="w-6 h-6"/>QUIZ COMPLETED</>:<><Gamepad2 className="w-6 h-6"/>PLAY QUIZ ({studentAgeGroup})</>}</button>}
        </div>}
      </div>}
      {showLb&&<div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-700 relative"><button onClick={()=>setShowLb(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button><div className="text-center mb-6"><Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2"/><h3 className="text-2xl font-black text-white">{dt}</h3></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{leaderboard.length===0?<p className="text-center text-gray-500">No scores yet.</p>:leaderboard.map((e,idx)=><div key={idx} className={`flex justify-between items-center p-3 rounded ${e.userId===userId?'bg-indigo-600 border border-indigo-400':'bg-gray-700'}`}><div className="flex items-center gap-3"><span className="font-bold w-6 text-yellow-400">#{idx+1}</span><span className="font-semibold text-white">{e.name}{e.userId===userId&&<span className="text-[10px] bg-white text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-2">ME</span>}</span></div><span className="font-mono font-bold text-indigo-300">{e.score} pts</span></div>)}</div></div></div>}
    </div>
  );
};

// ─── Main AbhidhammaApp ───────────────────────────────────────────────────────
export default function AbhidhammaApp({ entryRequest, onExit }) {
  const [authReady,setAuthReady]=useState(false);const [userId,setUserId]=useState(null);const [isTeacher,setIsTeacher]=useState(false);const [role,setRole]=useState('Student');
  const [classId,setClassId]=useState('');const [classData,setClassData]=useState(null);const [lessons,setLessons]=useState([]);const [allClasses,setAllClasses]=useState([]);
  const [studentProfile,setStudentProfile]=useState(null);const [showWelcome,setShowWelcome]=useState(false);
  const [activeQuizId,setActiveQuizId]=useState(null);const [activeQuizData,setActiveQuizData]=useState(null);
  const [openLessonId,setOpenLessonId]=useState(null);const [editingLesson,setEditingLesson]=useState(null);
  const [newTitle,setNewTitle]=useState('');const [newContent,setNewContent]=useState('');const [newImgBase,setNewImgBase]=useState(DEFAULT_IMG_BASE);
  const [importClassId,setImportClassId]=useState('');const [newClassId,setNewClassId]=useState('');
  const [loading,setLoading]=useState(false);const [genId,setGenId]=useState(null);const [msg,setMsg]=useState('');
  const fileRef=useRef(null);const fileLessonsRef=useRef(null);const lastEntry=useRef(null);

  const showMsg = t => { setMsg(t); setTimeout(()=>setMsg(''),4000); };

  useEffect(()=>{ const u=onAuthStateChanged(auth,usr=>{setUserId(usr?usr.uid:null);setAuthReady(true);}); return()=>u(); },[]);
  useEffect(()=>{ if(localStorage.getItem('abhidhamma_isTeacher')==='true'){setIsTeacher(true);setRole('Teacher');} },[]);

  useLayoutEffect(()=>{
    if(!entryRequest||!authReady)return;
    const sig=JSON.stringify({mode:entryRequest.mode,classId:entryRequest.classId||'',name:entryRequest.studentName||''});
    if(sig===lastEntry.current)return;lastEntry.current=sig;
    if(entryRequest.mode==='teacher'){setIsTeacher(true);setRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');}
    else if(entryRequest.mode==='student'&&entryRequest.studentName){
      const am={storyteller:'storytellers',explorer:'explorers',adventurer:'adventurers',voyager:'voyagers'};
      setStudentProfile({name:entryRequest.studentName,group:entryRequest.ageGroup?(am[entryRequest.ageGroup]||entryRequest.ageGroup):'explorers',status:'approved'});
      setRole('Student');if(entryRequest.classId)enterClass(entryRequest.classId);
    }
  },[entryRequest,authReady]);

  useEffect(()=>{ return onSnapshot(abhiClassesRef(),snap=>setAllClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id)))); },[]);

  // Load lessons from SUBCOLLECTION (no 1MB limit!)
  useEffect(()=>{
    if(!classId||!authReady)return;
    const u1=onSnapshot(abhiClassDocRef(classId),snap=>{if(snap.exists())setClassData(snap.data());else setClassData(null);});
    const u2=onSnapshot(query(abhiLessonsRef(classId),orderBy('createdAt','asc')),snap=>{setLessons(snap.docs.map(d=>({id:d.id,...d.data()})));});
    return()=>{u1();u2();};
  },[classId,authReady]);

  const enterClass = (cId) => { setClassId(cId);setImportClassId(cId);setOpenLessonId(null); };
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
      const entry={id:lId,classId,title:newTitle.trim(),burmeseContent:newContent.trim(),imageBaseUrl:newImgBase.trim()||DEFAULT_IMG_BASE,variants:editingLesson?.variants||{},createdAt:editingLesson?.createdAt||serverTimestamp()};
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
      const[rosterSnap,scoresSnap,actSnap]=await Promise.all([getDocs(query(abhiRosterRef(),where('classId','==',classId))),getDocs(query(abhiScoresRef(),where('classId','==',classId))),getDocs(abhiActivityRef())]);
      const data={version:3,classId,timestamp:new Date().toISOString(),lessons,roster:rosterSnap.docs.map(d=>({id:d.id,...d.data()})),scores:scoresSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),activityFeed:actSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),quizResults:{}};
      for(const l of lessons){for(const g of Object.keys(AGE_GROUPS)){const rs=await getDocs(abhiResultsRef(classId,l.id,g));if(!rs.empty)data.quizResults[`${l.id}_${g}`]=rs.docs.map(r=>({id:r.id,...r.data(),timestamp:toMs(r.data().timestamp)}));}}
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
        const imgBase=data.imageBaseUrl||newImgBase||DEFAULT_IMG_BASE;

        // Check existing lessons to avoid duplicates
        const existSnap=await getDocs(abhiLessonsRef(tgt));
        const existIds=new Set(existSnap.docs.map(d=>d.id));

        // Ensure class doc exists
        await setDoc(abhiClassDocRef(tgt),{classId:tgt,autoApprove:false,createdAt:serverTimestamp()},{merge:true});

        let added=0,skipped=0;
        for(const[i,l]of raw.entries()){
          const lId=l.id||`imported_${Date.now()}_${i}`;
          if(existIds.has(lId)){skipped++;continue;}
          const entry={id:lId,classId:tgt,title:l.title||`Lesson ${i+1}`,burmeseContent:l.burmeseContent||l.content||'',imageBaseUrl:l.imageBaseUrl||imgBase,variants:l.variants||{},createdAt:l.timestamp||serverTimestamp()};
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
      try{
        const data=JSON.parse(e.target.result);setLoading(true);
        const toDate=ts=>ts?new Date(ts):serverTimestamp();
        const raw=Array.isArray(data)?data:(data.lessons||[]);
        const imgBase=data.imageBaseUrl||newImgBase||DEFAULT_IMG_BASE;
        await setDoc(abhiClassDocRef(tgt),{classId:tgt,autoApprove:false,createdAt:serverTimestamp()},{merge:true});
        // Lessons → subcollection docs
        for(const[i,l]of raw.entries()){
          const lId=l.id||`imported_${Date.now()}_${i}`;
          await setDoc(abhiLessonDocRef(tgt,lId),{id:lId,classId:tgt,title:l.title||`Lesson ${i+1}`,burmeseContent:l.burmeseContent||l.content||'',imageBaseUrl:l.imageBaseUrl||imgBase,variants:l.variants||{},createdAt:toDate(l.timestamp)});
        }
        // Roster
        for(const stu of(data.roster||[])){const rRef=abhiRosterDocRef(tgt,stu.studentName||stu.name||'');await setDoc(rRef,{...stu,classId:tgt},{merge:true});}
        // Scores + Activity
        for(const s of(data.scores||[])){const{id,timestamp,...r}=s;await setDoc(doc(abhiScoresRef(),id||`s${Date.now()}`),{...r,classId:tgt,timestamp:toDate(timestamp)});}
        for(const a of(data.activityFeed||[])){const{id,timestamp,...r}=a;await setDoc(doc(abhiActivityRef(),id||`a${Date.now()}`),{...r,timestamp:toDate(timestamp)});}
        // Quiz results
        for(const[key,rList]of Object.entries(data.quizResults||{})){const parts=key.split('_');const g=parts.pop();const lId=parts.join('_');for(const r of rList){const{id,timestamp,...rest}=r;await setDoc(doc(abhiResultsRef(tgt,lId,g),id||`r${Date.now()}`),{...rest,timestamp:toDate(timestamp)});}}
        showMsg(`✅ Restored ${raw.length} lessons + student records into "${tgt}".`);
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
      {showWelcome&&<AbhiWelcomeModal userId={userId} classId={classId} onStudentComplete={p=>{setStudentProfile(p);setShowWelcome(false);}} onTeacherComplete={()=>{setIsTeacher(true);setRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');setShowWelcome(false);}}/>}
      {activeQuizId&&activeQuizData&&<QuizModule classId={classId} lessonId={activeQuizId} lessonTitle={lessons.find(l=>l.id===activeQuizId)?.title||''} userId={userId} userName={studentProfile?.name||'Student'} ageGroup={studentProfile?.group} quizData={activeQuizData} onClose={()=>{setActiveQuizId(null);setActiveQuizData(null);}}/>}
      {msg&&<div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold">{msg}</div>}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-amber-400">📚 Abhidhamma App</span>
            {isTeacher?(<div className="flex gap-2"><button onClick={()=>setRole(r=>r==='Teacher'?'Student':'Teacher')} className={`px-4 py-2 font-bold rounded shadow-lg ${role==='Teacher'?'bg-purple-600':'bg-teal-600'}`}>{role==='Teacher'?'Student View':'Teacher View'}</button><button onClick={()=>{setIsTeacher(false);setRole('Student');localStorage.removeItem('abhidhamma_isTeacher');}} className="px-4 py-2 font-bold rounded bg-red-600 hover:bg-red-700">Logout</button></div>):(<button onClick={()=>setShowWelcome(true)} className="px-4 py-2 font-bold rounded bg-gray-600 hover:bg-gray-500 flex items-center gap-2"><Key className="w-4 h-4"/>Teacher Login</button>)}
            {studentProfile?.status==='approved'&&<span className="bg-gray-700 px-3 py-1 rounded text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4"/>{studentProfile.name}</span>}
          </div>
          <div className="flex items-center gap-3"><div className="text-gray-400 text-sm font-semibold">{role} View {classId&&`· ${classId}`}</div><NotificationBell userId={userId}/></div>
        </header>

        {/* ── TEACHER VIEW ── */}
        {role==='Teacher'&&(
          <div className="space-y-6">
            {/* Class Manager */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2"><FolderOpen className="w-5 h-5"/>Class Management</h3>
              <div className="flex gap-2 mb-3"><input value={newClassId} onChange={e=>setNewClassId(e.target.value)} placeholder="New Class ID" className="flex-1 bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-amber-500 focus:outline-none text-sm" onKeyDown={e=>e.key==='Enter'&&createClass()}/><button onClick={createClass} disabled={!newClassId.trim()} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4"/>Create</button></div>
              <div className="flex flex-wrap gap-2">{allClasses.map(c=><button key={c.id} onClick={()=>enterClass(c.id)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${c.id===classId?'bg-amber-500 text-white border-amber-400':'bg-gray-700 text-gray-300 border-gray-600 hover:border-amber-400'}`}>{c.id}<span className="text-xs opacity-70 ml-1">({lessons.length > 0 && c.id===classId ? lessons.length : '?'})</span></button>)}{allClasses.length===0&&<p className="text-gray-500 text-sm italic">No classes yet.</p>}</div>
            </div>
            {classId&&<AbhiClassRoster userId={userId} classId={classId}/>}
            {classId&&(
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                {/* Import/Export bar */}
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]"><span className="text-gray-400 text-xs whitespace-nowrap">Class ID for import:</span><input value={importClassId} onChange={e=>setImportClassId(e.target.value)} className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-gray-600 px-1 focus:border-amber-400"/></div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={handleExportLessonsOnly} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Download className="w-3 h-3"/>📚 Lessons</button>
                    <button onClick={()=>fileLessonsRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Upload className="w-3 h-3"/>📚 Import Lessons</button>
                    <button onClick={handleExportFull} disabled={loading} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Download className="w-3 h-3"/>📦 Full Backup</button>
                    <button onClick={()=>fileRef.current?.click()} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Upload className="w-3 h-3"/>📦 Restore All</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4 p-2 bg-gray-900 rounded border border-gray-600"><span className="text-gray-400 text-xs ml-1 whitespace-nowrap">🖼 Image URL:</span><input value={newImgBase} onChange={e=>setNewImgBase(e.target.value)} placeholder={DEFAULT_IMG_BASE} className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-gray-600 px-1 focus:border-teal-500"/></div>
                <h3 className="text-xl font-bold text-teal-300 mb-4">{editingLesson?'Edit Lesson':'Add Lesson'} — <span className="text-amber-400">{classId}</span></h3>
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={loading}/>
                  <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Lesson Content (Burmese)" rows="6" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={loading}/>
                  <div className="flex gap-2">
                    <button type="submit" disabled={loading} className="flex-1 bg-teal-600 p-3 rounded hover:bg-teal-700 flex justify-center items-center font-bold">{loading?<RotateCw className="animate-spin w-5 h-5 mr-2"/>:<BookOpen className="w-5 h-5 mr-2"/>}{editingLesson?'Update':'Save Lesson'}</button>
                    {editingLesson&&<button type="button" onClick={()=>{setEditingLesson(null);setNewTitle('');setNewContent('');setNewImgBase(DEFAULT_IMG_BASE);}} className="bg-gray-600 p-3 rounded hover:bg-gray-500">Cancel</button>}
                  </div>
                </form>
              </div>
            )}
            {classId&&(<div className="space-y-4">{lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons in <strong>{classId}</strong> yet. Import or add a lesson above.</p>}{lessons.map(l=><AbhiLessonItem key={l.id} lesson={l} classId={classId} isTeacher userId={userId} onEdit={lesson=>{setEditingLesson(lesson);setNewTitle(lesson.title);setNewContent(lesson.burmeseContent);setNewImgBase(lesson.imageBaseUrl||DEFAULT_IMG_BASE);window.scrollTo({top:0,behavior:'smooth'});}} onGenerateVariants={handleGenerateVariants} onTakeQuiz={()=>{}} isGenerating={genId===l.id} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}</div>)}
          </div>
        )}

        {/* ── STUDENT VIEW ── */}
        {role==='Student'&&(
          <div>
            {!classId&&(
              <div className="p-6 max-w-lg mx-auto mt-10"><h2 className="text-3xl font-bold text-amber-700 mb-6 text-center">📚 Choose Your Class</h2>
                {allClasses.length===0?<p className="text-center text-gray-500 italic">No classes found yet.</p>:<div className="space-y-3">{allClasses.map(c=><button key={c.id} onClick={()=>{if(!studentProfile){setClassId(c.id);setShowWelcome(true);}else enterClass(c.id);}} className={`w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all flex items-center justify-between ${c.id===entryRequest?.classId?'bg-amber-100 border-amber-500 text-amber-800 shadow-lg scale-[1.02]':'bg-white border-gray-200 text-gray-700 hover:border-amber-300'}`}><span>{c.id===entryRequest?.classId?'⭐ ':''}{c.id}</span></button>)}</div>}
              </div>
            )}
            {classId&&!studentProfile&&!showWelcome&&<div className="text-center mt-10"><button onClick={()=>setShowWelcome(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl text-xl">Enter Class</button></div>}
            {classId&&studentProfile&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-white">Class: <span className="text-amber-400">{classId}</span></h2><button onClick={()=>{setClassId('');setClassData(null);setLessons([]);}} className="text-sm text-gray-400 hover:text-white underline">← Change Class</button></div>
                {lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons yet.</p>}
                {lessons.map(l=><AbhiLessonItem key={l.id} lesson={l} classId={classId} isTeacher={false} userId={userId} studentAgeGroup={studentProfile.group} studentName={studentProfile.name} onGenerateVariants={()=>{}} onEdit={()=>{}} onTakeQuiz={(id,title,data)=>{setActiveQuizId(id);setActiveQuizData(data);}} isGenerating={false} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
