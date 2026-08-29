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
const abhiScoresRef      = ()            =>
    // Use original global_scores collection that security rules allow
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'global_scores');
const abhiActivityRef    = ()            => collection(db, P('activity_feed'));
const abhiResultsRef     = (cId,lId,g)   =>
    // Use original path that security rules already allow
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'lessons', lId, 'quiz', g, 'results');
const abhiQRef           = (cId, lId)    =>
    collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'classes', cId, 'questions', lId, 'items');

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
          await addDoc(abhiActivityRef(),{type:'quiz_completed',studentName:userName,lessonTitle,group:ageGroup,timestamp:serverTimestamp()});
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
const AbhiClassRoster = ({ userId, classId, onLink }) => {
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
        {/* Link to Tutoring */}
        {open&&onLink&&(
          <div className="p-4 border-t border-gray-700 bg-gray-900/30">
            <AbhiLinkToTutoring classId={classId} approved={students.filter(s=>s.status==='approved')} onLink={onLink}/>
          </div>
        )}
    </div>
  );
};

// ─── Link to Tutoring Component ──────────────────────────────────────────────
const AbhiLinkToTutoring = ({ classId, approved, onLink }) => {
  const [tutoringStudents,setTutoringStudents]=useState(null);
  const [pickerFor,setPickerFor]=useState(null);
  const [search,setSearch]=useState('');
  const [linking,setLinking]=useState(false);
  const loadStudents=async()=>{
    if(tutoringStudents!==null)return;
    try{
      const snap=await getDocs(collection(db,'artifacts','dhamma-tutoring-app','public','data','students'));
      setTutoringStudents(snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.isActive!==false).sort((a,b)=>(a.name||'').localeCompare(b.name||'')));
    }catch(e){setTutoringStudents([]);}
  };
  const unlinked=approved.filter(s=>!s.linkedToTutoring);
  const filtered=(tutoringStudents||[]).filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <h4 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">🔗 Link to Tutoring
        {unlinked.length>0&&<span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full border border-orange-500/30">{unlinked.length} unlinked</span>}
        {unlinked.length===0&&approved.length>0&&<span className="text-green-400 text-xs">✅ All linked</span>}
      </h4>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {approved.map(s=>(
          <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
            <span className="flex-1 text-white text-sm">{s.studentName}</span>
            {s.linkedToTutoring
              ? <span className="text-xs text-indigo-400 font-bold">🔗 Linked</span>
              : <button onClick={()=>{setPickerFor(s.studentName);loadStudents();}} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-lg flex-shrink-0">🔗 Link</button>
            }
          </div>
        ))}
        {approved.length===0&&<p className="text-gray-500 text-xs italic">No approved students yet.</p>}
      </div>
      {pickerFor&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-white text-sm">Link "<span className="text-indigo-300">{pickerFor}</span>" to TutoringApp student:</p>
              <button onClick={()=>{setPickerFor(null);setSearch('');}} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search TutoringApp student name…"
              className="w-full p-2 mb-3 bg-gray-900 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-indigo-400" autoFocus/>
            {tutoringStudents===null?<p className="text-gray-400 text-sm text-center py-4 animate-pulse">Loading…</p>
            :filtered.length===0?<p className="text-gray-500 text-sm text-center py-4">No matches.</p>
            :<div className="space-y-1 max-h-56 overflow-y-auto">
              {filtered.map(t=>(
                <button key={t.id} disabled={linking}
                  onClick={async()=>{setLinking(true);await onLink(pickerFor,t.name,t.id);setLinking(false);setPickerFor(null);setSearch('');}}
                  className={`w-full text-left p-2.5 rounded-lg text-sm font-semibold transition ${t.name===pickerFor?'bg-green-700 text-white border border-green-500':'bg-gray-700 hover:bg-indigo-700 text-gray-200'}`}>
                  {t.name}{t.name===pickerFor&&<span className="text-xs text-green-300 ml-2">← same name</span>}
                </button>
              ))}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Q&A Discussion ────────────────────────────────────────────────────────────
const AbhiQA = ({ classId, lessonId, isTeacher, userId, userName, suggestedQuestions=[] }) => {
  const [questions,setQs]=useState([]);const [text,setText]=useState('');const [replyText,setReplyText]=useState({});const [busy,setBusy]=useState(false);
  const [visibleSuggestions,setVisibleSuggestions]=useState([]);const [suggestionPool,setSuggestionPool]=useState([]);
  
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
    <div className="space-y-4 mt-2">
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
    </div>
  );
};


// ─── Teacher Class Picker ──────────────────────────────────────────────────────
const AbhiTeacherClassPicker = ({ onSelectClass, onCreateClass }) => {
  const [classes,setClasses]=useState([]); const [newId,setNewId]=useState(''); const [renaming,setRenaming]=useState(null); const [renameVal,setRenameVal]=useState('');
  useEffect(()=>{ return onSnapshot(abhiClassesRef(),snap=>setClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id)))); },[]);
  const handleRename=async(classId,displayName)=>{if(!displayName.trim())return;await updateDoc(abhiClassDocRef(classId),{displayName:displayName.trim()});setRenaming(null);};
  const handleCreate=async()=>{if(!newId.trim())return;await setDoc(abhiClassDocRef(newId.trim()),{classId:newId.trim(),autoApprove:false,createdAt:serverTimestamp()},{merge:true});onSelectClass(newId.trim());};
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
                  <button onClick={async()=>{if(!window.confirm(`Delete class "${c.id}"? This only removes the class entry, not the lessons/roster inside.`))return;try{await deleteDoc(abhiClassDocRef(c.id));}catch(e){console.error(e);}}} className="text-gray-400 hover:text-red-500 p-2" title="Delete class entry">
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
  const [tab,setTab]=useState('global');
  const [globalData,setGlobalData]=useState(null);
  const [classData,setClassData]=useState(null);

  useEffect(()=>{
    if(tab!=='global'||globalData!==null)return;
    getDocs(abhiScoresRef()).then(snap=>{
      const byStudent={};
      snap.docs.forEach(d=>{
        const dt=d.data();const sn=dt.studentName||dt.name||'?';
        if(!byStudent[sn])byStudent[sn]={name:sn,lessons:new Set(),totalScore:0,userId:dt.userId};
        byStudent[sn].lessons.add(`${dt.classId}_${dt.lessonId}`);
        byStudent[sn].totalScore=(byStudent[sn].totalScore||0)+(dt.score||0);
      });
      const ranked=Object.values(byStudent).map(s=>({...s,count:s.lessons.size})).sort((a,b)=>b.count-a.count||b.totalScore-a.totalScore);
      setGlobalData(ranked);
    }).catch(e=>console.error('Global LB:',e));
  },[tab,globalData]);

  useEffect(()=>{
    if(!classId||tab!=='class'||classData!==null)return;
    getDocs(query(abhiScoresRef(),where('classId','==',classId))).then(snap=>{
      const byStudent={};
      snap.docs.forEach(d=>{
        const dt=d.data();const sn=dt.studentName||dt.name||'?';
        if(!byStudent[sn])byStudent[sn]={name:sn,lessons:new Set(),totalScore:0,userId:dt.userId};
        byStudent[sn].lessons.add(dt.lessonId);
        byStudent[sn].totalScore=(byStudent[sn].totalScore||0)+(dt.score||0);
      });
      const ranked=Object.values(byStudent).map(s=>({...s,count:s.lessons.size})).sort((a,b)=>b.count-a.count||b.totalScore-a.totalScore);
      setClassData(ranked);
    }).catch(e=>console.error('Class LB:',e));
  },[tab,classId,classData]);

  const renderList=(data,isGlobal)=>{
    if(!data)return<div className="flex justify-center py-8"><RotateCw className="w-8 h-8 animate-spin text-amber-400"/></div>;
    if(data.length===0)return<p className="text-center text-gray-500 py-6">No data yet.</p>;
    const medals=['🥇','🥈','🥉'];
    return(
      <div className="space-y-2 max-h-[55vh] overflow-y-auto">
        {data.map((e,idx)=>{
          const isMe=e.userId===userId||(e.name===studentName);
          return(
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${isMe?'bg-amber-900/40 border border-amber-500':'bg-gray-700/50 border border-gray-600/30'}`}>
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
        <div className="flex border-b border-gray-700">
          <button onClick={()=>setTab('global')} className={`flex-1 py-3 text-sm font-bold ${tab==='global'?'text-amber-400 border-b-2 border-amber-400':'text-gray-400 hover:text-white'}`}>🌍 All Classes</button>
          {classId&&<button onClick={()=>setTab('class')} className={`flex-1 py-3 text-sm font-bold ${tab==='class'?'text-teal-400 border-b-2 border-teal-400':'text-gray-400 hover:text-white'}`}>📚 {classId}</button>}
        </div>
        <div className="p-5">
          {tab==='global'&&renderList(globalData,true)}
          {tab==='class'&&renderList(classData,false)}
        </div>
      </div>
    </div>
  );
};

// ─── Student: age-group picker (no name, no approval) ──────────────────────
const AbhiAgeGroupPicker = ({ onComplete }) => {
  const [grp, setGrp] = useState(() => localStorage.getItem('abhidhamma_ageGroup') || null);
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
const AbhiLessonItem = ({ lesson, classId, isTeacher, studentAgeGroup, studentName, userId, onEdit, onGenerateVariants, onTakeQuiz, isGenerating, isOpen, onToggle, classImageBase }) => {
  const [tab,setTab]=useState('content');
  const [isCompleted,setIsCompleted]=useState(false);
  const [hasAsked,setHasAsked]=useState(false);
  const [hasReplied,setHasReplied]=useState(false);
  const [leaderboard,setLb]=useState([]);const [showLb,setShowLb]=useState(false);
  const ref=useRef(null);
  
  useEffect(()=>{if(isOpen&&ref.current){setTimeout(()=>{const y=ref.current.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:'smooth'});},100);}},[isOpen]);
  
  // Track quiz completion
  useEffect(()=>{
    if(!classId||!userId||!lesson.id||!studentAgeGroup)return;
    const u=onSnapshot(query(abhiResultsRef(classId,lesson.id,studentAgeGroup),where('userId','==',userId)),snap=>setIsCompleted(!snap.empty));
    return()=>u();
  },[classId,lesson.id,userId,studentAgeGroup]);
  
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
    getDocs(query(abhiScoresRef(),where('classId','==',classId),where('lessonId','==',lesson.id)))
      .then(snap=>{const s={};snap.docs.forEach(d=>{const dt=d.data();if(!s[dt.userId]||dt.score>s[dt.userId].score)s[dt.userId]=dt;});setLb(Object.values(s).sort((a,b)=>b.score-a.score));})
      .catch(e=>console.error('LB:',e));
  },[showLb,classId,lesson.id]);
  
  const variants=lesson.variants||{};const hasJr=variants.storytellers&&variants.explorers;const hasSr=variants.adventurers&&variants.voyagers;
  let dc='',dt=lesson.title,qa=false,qd=null,discQ=[];
  if(!isTeacher&&studentAgeGroup){const v=variants[studentAgeGroup];if(v){dc=v.english;dt=v.englishTitle||lesson.title;qa=!!v.quiz;qd=v.quiz;discQ=v.discussionQuestions||[];}else dc='Content not available for your age group yet.';}
  const imgBase=lesson.imageBaseUrl||classImageBase||DEFAULT_IMG_BASE;
  
  return(
    <div ref={ref} className={`relative rounded-xl shadow-md overflow-hidden border mb-4 ${isTeacher?'bg-gray-800 border-gray-700':'bg-gray-700 border-gray-600'}`}>
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
            ? <div className="text-white whitespace-pre-wrap leading-relaxed"><SmartContent text={lesson.burmeseContent} imageBase={imgBase}/></div>
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
      {showLb&&<div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4"><div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-700 relative"><button onClick={()=>setShowLb(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button><div className="text-center mb-6"><Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2"/><h3 className="text-2xl font-black text-white">{dt}</h3></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{leaderboard.length===0?<p className="text-center text-gray-500">No scores yet.</p>:leaderboard.map((e,idx)=><div key={idx} className={`flex justify-between items-center p-3 rounded ${e.userId===userId?'bg-indigo-600 border border-indigo-400':'bg-gray-700'}`}><div className="flex items-center gap-3"><span className="font-bold w-6 text-yellow-400">#{idx+1}</span><span className="font-semibold text-white">{e.name}{e.userId===userId&&<span className="text-[10px] bg-white text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-2">ME</span>}</span></div><span className="font-mono font-bold text-indigo-300">{e.score} pts</span></div>)}</div></div></div>}
    </div>
  );
};

// ─── Main AbhidhammaApp ───────────────────────────────────────────────────────
export default function AbhidhammaApp({ entryRequest, onExit }) {
  const [authReady,setAuthReady]=useState(false);const [userId,setUserId]=useState(null);const [isTeacher,setIsTeacher]=useState(false);const [role,setRole]=useState('Student');
  const [classId,setClassId]=useState('');const [classData,setClassData]=useState(null);const [lessons,setLessons]=useState([]);const [allClasses,setAllClasses]=useState([]);
  const [studentProfile,setStudentProfile]=useState(null);const [showWelcome,setShowWelcome]=useState(false);
  const [classStats,setClassStats]=useState({}); // classId → {completedCount, rank}
  const [globalRank,setGlobalRank]=useState(0);     // student's global rank across all classes
  const [totalLessons,setTotalLessons]=useState(0); // total lessons completed by student
  const [showLeaderboard,setShowLeaderboard]=useState(false);
  const [activeQuizId,setActiveQuizId]=useState(null);const [activeQuizData,setActiveQuizData]=useState(null);
  const [openLessonId,setOpenLessonId]=useState(null);const [editingLesson,setEditingLesson]=useState(null);
  const [newTitle,setNewTitle]=useState('');const [newContent,setNewContent]=useState('');const [newImgBase,setNewImgBase]=useState(DEFAULT_IMG_BASE);
  const [importClassId,setImportClassId]=useState('');const [newClassId,setNewClassId]=useState('');
  const [classImageBase,setClassImageBase]=useState(DEFAULT_IMG_BASE); // per-class default image URL
  const [loading,setLoading]=useState(false);const [genId,setGenId]=useState(null);const [msg,setMsg]=useState('');
  const fileRef=useRef(null);const fileLessonsRef=useRef(null);const lastEntry=useRef(null);

  const showMsg = t => { setMsg(t); setTimeout(()=>setMsg(''),4000); };

  useEffect(()=>{ const u=onAuthStateChanged(auth,usr=>{setUserId(usr?usr.uid:null);setAuthReady(true);}); return()=>u(); },[]);
  useEffect(()=>{ if(localStorage.getItem('abhidhamma_isTeacher')==='true'){setIsTeacher(true);setRole('Teacher');} },[]);

  // Restore saved age group profile on load
  useEffect(()=>{
    if (!userId || entryRequest?.studentName) return;
    const saved = localStorage.getItem(`abhidhamma_profile_${userId}`);
    if (saved) try { setStudentProfile(JSON.parse(saved)); } catch(e) {}
  }, [userId]);

  useLayoutEffect(()=>{
    if(!entryRequest||!authReady)return;
    const sig=JSON.stringify({mode:entryRequest.mode,classId:entryRequest.classId||'',name:entryRequest.studentName||''});
    if(sig===lastEntry.current)return;lastEntry.current=sig;
    if(entryRequest.mode==='teacher'){setIsTeacher(true);setRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');}
    else if(entryRequest.mode==='student'&&entryRequest.studentName){
      const am={storyteller:'storytellers',explorer:'explorers',adventurer:'adventurers',voyager:'voyagers'};
      const grp=entryRequest.ageGroup?(am[entryRequest.ageGroup]||entryRequest.ageGroup):'explorers';
      const profile={name:entryRequest.studentName,group:grp,status:'approved'};
      setStudentProfile(profile);
      setRole('Student');
      if(entryRequest.classId){
        enterClass(entryRequest.classId);
        // Create/update roster entry so teacher can see this student
        (async()=>{
          try{
            const rRef=abhiRosterDocRef(entryRequest.classId,entryRequest.studentName);
            const snap=await getDoc(rRef);
            if(snap.exists()){
              await updateDoc(rRef,{status:'approved',group:grp,isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp()});
            }else{
              await setDoc(rRef,{classId:entryRequest.classId,studentName:entryRequest.studentName,name:entryRequest.studentName,group:grp,status:'approved',isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp(),joinedAt:Date.now()});
            }
          }catch(e){console.error('Roster create error:',e);}
        })();
      }
    }
  },[entryRequest,authReady]);

  useEffect(()=>{ return onSnapshot(abhiClassesRef(),snap=>setAllClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id)))); },[]);

  // Compute student's global rank + total lessons
  useEffect(()=>{
    if(!studentProfile)return;
    const name=studentProfile.name;
    (async()=>{
      try{
        const snap=await getDocs(abhiScoresRef());
        // Count distinct classId+lessonId per student
        const byStudent={};
        snap.docs.forEach(d=>{const dt=d.data();const sn=dt.studentName||dt.name;if(!sn)return;if(!byStudent[sn])byStudent[sn]=new Set();byStudent[sn].add(`${dt.classId}_${dt.lessonId}`);});
        const sorted=Object.entries(byStudent).sort((a,b)=>b[1].size-a[1].size);
        const myIdx=sorted.findIndex(([sn])=>sn===name);
        setGlobalRank(myIdx>=0?myIdx+1:0);
        setTotalLessons(byStudent[name]?.size||0);
      }catch(e){}
    })();
  },[studentProfile,classStats]); // re-run after class stats update (quiz completion)

  // Load per-class stats for student (rank + completedCount)
  useEffect(()=>{
    if(!studentProfile||allClasses.length===0)return;
    const name=studentProfile.name;
    (async()=>{
      const stats={};
      for(const c of allClasses){
        try{
          // All scores for this class to compute rank
          const snap=await getDocs(query(abhiScoresRef(),where('classId','==',c.id)));
          const byStudent={};
          snap.docs.forEach(d=>{const {studentName:sn,lessonId:li}=d.data();if(!byStudent[sn])byStudent[sn]=new Set();byStudent[sn].add(li);});
          const ranked=Object.entries(byStudent).sort((a,b)=>b[1].size-a[1].size);
          const myIdx=ranked.findIndex(([sn])=>sn===name);
          stats[c.id]={completedCount:byStudent[name]?.size||0,rank:myIdx>=0?myIdx+1:0,totalLessons:(byStudent[name]?.size||0)};
        }catch(e){}
      }
      setClassStats(stats);
    })();
  },[studentProfile,allClasses.length]);

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

  const enterClass = (cId) => { setClassId(cId);setImportClassId(cId);setOpenLessonId(null); };

  // ── Link to Tutoring (same pattern as SmartStudy) ────────────────────────
  const handleLinkStudentToTutoring = async (oldName, newName, tutoringStudentUid) => {
    if (!classId || !oldName || !newName) return;
    setLoading(true);
    // 1. Store abhidhammaNames in TutoringApp student profile
    if (tutoringStudentUid && oldName !== newName) {
      try {
        await updateDoc(doc(db,'artifacts','dhamma-tutoring-app','public','data','students',tutoringStudentUid),
          { [`abhidhammaNames.${classId}`]: oldName });
      } catch(e) { console.error('TutoringApp profile update:', e); }
    }
    // 2. If same name — just mark as linked
    if (oldName === newName) {
      await setDoc(abhiRosterDocRef(classId,newName),{linkedToTutoring:true},{merge:true});
      setLoading(false);
      showMsg(`✅ Linked "${newName}" to Tutoring.`);
      return;
    }
    // 3. Rename scores
    try {
      const scoresSnap = await getDocs(query(abhiScoresRef(),where('classId','==',classId),where('studentName','==',oldName)));
      if (!scoresSnap.empty) {
        const batch = writeBatch(db);
        scoresSnap.docs.forEach(d => batch.update(d.ref,{studentName:newName}));
        await batch.commit();
      }
    } catch(e) { console.error('Scores rename:', e); }
    // 4. Rename quiz results across all lessons
    try {
      const lessonsSnap = await getDocs(abhiLessonsRef(classId));
      for (const lDoc of lessonsSnap.docs) {
        for (const g of Object.keys(AGE_GROUPS)) {
          const rSnap = await getDocs(query(abhiResultsRef(classId,lDoc.id,g),where('name','==',oldName)));
          if (!rSnap.empty) {
            const batch = writeBatch(db);
            rSnap.docs.forEach(d => batch.update(d.ref,{name:newName}));
            await batch.commit();
          }
        }
      }
    } catch(e) { console.error('Quiz results rename:', e); }
    // 5. Move roster doc
    try {
      const oldRef = abhiRosterDocRef(classId,oldName);
      const oldSnap = await getDoc(oldRef);
      const newData = oldSnap.exists() ? {...oldSnap.data(),studentName:newName,name:newName,linkedToTutoring:true} : {linkedToTutoring:true};
      await setDoc(abhiRosterDocRef(classId,newName),newData,{merge:true});
      if (oldSnap.exists()) await deleteDoc(oldRef);
    } catch(e) { console.error('Roster rename:', e); }
    setLoading(false);
    showMsg(`✅ Linked "${oldName}" → "${newName}". Records renamed.`);
  };

  // Ping roster every 60s so teacher sees who is online (works for both entry paths)
  useEffect(()=>{
    if(!studentProfile||!classId||studentProfile.status!=='approved') return;
    const name=studentProfile.name;
    const ping=async()=>{
      try{
        const rRef=abhiRosterDocRef(classId,name);
        await updateDoc(rRef,{isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp()});
      }catch(e){
        // Doc might not exist yet if WelcomeModal hasn't run — create it
        try{
          const rRef=abhiRosterDocRef(classId,name);
          await setDoc(rRef,{classId,studentName:name,name,group:studentProfile.group||'explorers',status:'approved',isOnline:true,lastPing:serverTimestamp(),lastSeen:serverTimestamp(),joinedAt:Date.now()},{merge:true});
        }catch(e2){console.error('Ping create error:',e2);}
      }
    };
    ping();
    const interval=setInterval(ping,60000);
    const handleOffline=()=>{ try{ updateDoc(abhiRosterDocRef(classId,name),{isOnline:false,lastSeen:serverTimestamp()}); }catch(e){} };
    window.addEventListener('beforeunload',handleOffline);
    return()=>{ clearInterval(interval); handleOffline(); window.removeEventListener('beforeunload',handleOffline); };
  },[studentProfile,classId]);
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
        // Roster — use original doc ID if available for accurate restore
        for(const stu of(data.roster||data.students||[])){
          // Rebuild the correct document ID: classId_encodedStudentName
          const sName=stu.studentName||stu.name||'';
          const docId=`${tgt}_${encodeURIComponent(sName)}`;
          const rRef=doc(db,P(`classRoster/${docId}`));
          const{id,...rData}=stu;
          await setDoc(rRef,{...rData,classId:tgt,studentName:sName,isOnline:false},{merge:true});
        }
        // Scores + Activity
        for(const s of(data.scores||[])){const{id,timestamp,...r}=s;await setDoc(doc(abhiScoresRef(),id||`s${Date.now()}`),{...r,classId:tgt,timestamp:toDate(timestamp)});}
        for(const a of(data.activityFeed||[])){const{id,timestamp,...r}=a;await setDoc(doc(abhiActivityRef(),id||`a${Date.now()}`),{...r,timestamp:toDate(timestamp)});}
        // Quiz results
        for(const[key,rList]of Object.entries(data.quizResults||{})){const parts=key.split('_');const g=parts.pop();const lId=parts.join('_');for(const r of rList){const{id,timestamp,...rest}=r;await setDoc(doc(abhiResultsRef(tgt,lId,g),id||`r${Date.now()}`),{...rest,timestamp:toDate(timestamp)});}}
        // Q&A discussions
        for(const[lessonId,qList]of Object.entries(data.questions||{})){for(const q of qList){const{id,...rest}=q;await setDoc(doc(abhiQRef(tgt,lessonId),id||`q${Date.now()}`),{...rest});}}
        showMsg(`✅ Restored ${raw.length} lessons + records + discussions into "${tgt}".`);
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
      {/* Floating stats bar — visible to students */}
      {role==='Student'&&studentProfile&&(totalLessons>0||globalRank>0)&&(
        <AbhiFloatingStats rank={globalRank} totalLessons={totalLessons}/>
      )}
      {activeQuizId&&activeQuizData&&<QuizModule classId={classId} lessonId={activeQuizId} lessonTitle={lessons.find(l=>l.id===activeQuizId)?.title||''} userId={userId} userName={studentProfile?.name||'Student'} ageGroup={studentProfile?.group} quizData={activeQuizData} onClose={()=>{setActiveQuizId(null);setActiveQuizData(null);}}/>}
      {msg&&<div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold">{msg}</div>}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-amber-400">📚 Abhidhamma App</span>
            {isTeacher&&(<div className="flex gap-2"><button onClick={()=>setRole(r=>r==='Teacher'?'Student':'Teacher')} className={`px-4 py-2 font-bold rounded shadow-lg ${role==='Teacher'?'bg-purple-600':'bg-teal-600'}`}>{role==='Teacher'?'Student View':'Teacher View'}</button></div>)}
            {studentProfile?.status==='approved'&&<span className="bg-gray-700 px-3 py-1 rounded text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4"/>{studentProfile.name}</span>}
          </div>
          <div className="flex items-center gap-3">
            {classId&&<span className="text-gray-400 text-sm font-semibold">· {classId}</span>}
            {role==='Student'&&studentProfile&&(
              <button onClick={()=>setShowLeaderboard(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-yellow-400 shadow-lg" title="Champions Board">
                <Trophy className="w-5 h-5"/>
              </button>
            )}
            <NotificationBell userId={userId}/>
          </div>
        </header>

        {/* ── TEACHER VIEW ── */}
        {role==='Teacher'&&(
          <div className="space-y-6">

            {!classId&&<AbhiTeacherClassPicker onSelectClass={enterClass} onCreateClass={enterClass}/>}
            {classId&&<AbhiClassRoster userId={userId} classId={classId} onLink={handleLinkStudentToTutoring}/>}
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
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-900 rounded border border-amber-600/40">
                  <span className="text-amber-400 text-xs ml-1 whitespace-nowrap font-semibold">🖼 Class Default Image URL:</span>
                  <input value={classImageBase} onChange={e=>setClassImageBase(e.target.value)} placeholder={DEFAULT_IMG_BASE}
                    className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-amber-600/40 px-1 focus:border-amber-400"
                    onBlur={async()=>{ if(classId) await updateDoc(abhiClassDocRef(classId),{imageBaseUrl:classImageBase||DEFAULT_IMG_BASE}).catch(()=>{}); }}/>
                </div>
                <div className="flex items-center gap-2 mb-4 p-2 bg-gray-900 rounded border border-gray-600"><span className="text-gray-400 text-xs ml-1 whitespace-nowrap">🖼 Lesson Override URL:</span><input value={newImgBase} onChange={e=>setNewImgBase(e.target.value)} placeholder={classImageBase||DEFAULT_IMG_BASE} className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-gray-600 px-1 focus:border-teal-500"/></div>
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
            {classId&&(<div className="space-y-4">{lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons in <strong>{classId}</strong> yet. Import or add a lesson above.</p>}{lessons.map(l=><AbhiLessonItem key={l.id} lesson={l} classId={classId} isTeacher userId={userId} onEdit={lesson=>{setEditingLesson(lesson);setNewTitle(lesson.title);setNewContent(lesson.burmeseContent);setNewImgBase(lesson.imageBaseUrl||DEFAULT_IMG_BASE);window.scrollTo({top:0,behavior:'smooth'});}} onGenerateVariants={handleGenerateVariants} classImageBase={classImageBase} onTakeQuiz={()=>{}} isGenerating={genId===l.id} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}/>)}</div>)}
          </div>
        )}

        {/* ── STUDENT VIEW ── */}
        {role==='Student'&&(
          <div>
            {/* Step 1: No age group yet → show picker (fullscreen) */}
            {!studentProfile&&(
              <AbhiAgeGroupPicker onComplete={grp => {
                const label = AGE_GROUPS[grp]?.label?.split(' ')[0] || 'Student';
                const p = { group: grp, status: 'approved', name: label };
                setStudentProfile(p);
                if (userId) localStorage.setItem(`abhidhamma_profile_${userId}`, JSON.stringify(p));
              }}/>
            )}

            {/* Step 2: Has profile, no class → show class list (SmartStudy-style) */}
            {studentProfile&&!classId&&(
              <div className="p-6 max-w-lg mx-auto mt-10">
                <h2 className="text-3xl font-bold text-amber-700 mb-2 text-center">📚 Choose Your Class</h2>
                <p className="text-center text-amber-600 text-sm mb-6 font-semibold">
                  {AGE_GROUPS[studentProfile.group]?.label}
                </p>
                {allClasses.length===0
                  ? <p className="text-center text-gray-500 italic">No classes found yet.</p>
                  : <div className="space-y-3">
                      {allClasses.map(c => (
                        <button key={c.id} onClick={() => enterClass(c.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all ${
                            c.id===entryRequest?.classId
                              ? 'bg-amber-100 border-amber-500 text-amber-800 shadow-lg scale-[1.02]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                          }`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span>{c.id===entryRequest?.classId?'⭐ ':''}{c.displayName||c.id}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {classStats[c.id]?.rank>0&&(
                                <span className="text-xs font-bold text-yellow-700 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full">🏆 Rank #{classStats[c.id].rank}</span>
                              )}
                              {classStats[c.id]?.completedCount>0?(
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">{classStats[c.id].completedCount} completed</span>
                              ):null}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                }
              </div>
            )}

            {/* Step 3: Has profile + class → show lessons */}
            {studentProfile&&classId&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Class: <span className="text-amber-400">{classId}</span></h2>
                  <button onClick={()=>{setClassId('');setClassData(null);setLessons([]);}}
                    className="text-sm text-gray-400 hover:text-white underline">← Change Class</button>
                </div>
                {lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons yet.</p>}
                {lessons.map(l=>(
                  <AbhiLessonItem key={l.id} lesson={l} classId={classId} isTeacher={false} userId={userId}
                    studentAgeGroup={studentProfile.group} studentName={studentProfile.name}
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
