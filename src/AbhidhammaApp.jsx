import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, query, orderBy, serverTimestamp, addDoc, getDoc, where, getDocs, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  BookOpen, Edit2, Zap, RotateCw, Upload, Download, CheckCircle,
  MessageCircle, Send, Heart, Trophy, Timer, Pause,
  ChevronDown, ChevronRight, Gamepad2, X, ExternalLink, Youtube, Music, User,
  Baby, Compass, Map, Ship, Globe, Sparkles, ImageIcon, Wand2, Lock, CheckCheck,
  AlertCircle, ArrowUp, ArrowDown, Key, ChevronLeft, Users, UserCheck, UserX, Circle, Trash2, Bell,
  ToggleLeft, ToggleRight, Plus, FolderOpen, Settings
} from 'lucide-react';
import { auth, db } from './firebase';

// ─── Constants ────────────────────────────────────────────────────────────────
const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';
const DEFAULT_IMG_BASE   = 'https://raw.githubusercontent.com/nathantun93/dhamma4/main/';
const AUDIO_BASE_URL     = 'https://raw.githubusercontent.com/nathantun93/bell/main/';
const TEACHER_PASSCODE   = '1';

const AGE_GROUPS = {
  storytellers: { label: 'Storytellers (5-)',  icon: <Baby    className="w-4 h-4"/>, length:'short (~150 words)'   },
  explorers:    { label: 'Explorers (6-8)',     icon: <Compass className="w-4 h-4"/>, length:'medium (~300 words)'  },
  adventurers:  { label: 'Adventurers (9-11)', icon: <Map     className="w-4 h-4"/>, length:'long (~450 words)'    },
  voyagers:     { label: 'Voyagers (12+)',      icon: <Ship    className="w-4 h-4"/>, length:'detailed (~600 words)'},
};

// ─── Firestore helpers (SmartStudy-compatible structure) ─────────────────────
const abhiClassDocRef    = (classId) => doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId);
const abhiClassesRef     = ()        => collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes');
const abhiRosterDocRef   = (classId,name) => doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster',`${classId}_${encodeURIComponent(name)}`);
const abhiScoresRef      = ()        => collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','scores');
const abhiQuestionsRef   = (classId,lessonId) => collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId,'lessonQuestions',lessonId,'items');
const abhiResultsRef     = (classId,lessonId,grp) => collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId,'quizResults',lessonId,grp);
const abhiActivityRef    = ()        => collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','activity_feed');

// ─── AI helpers ───────────────────────────────────────────────────────────────
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`;
const generateContent = async (prompt, sys) => {
  const payload = { contents:[{parts:[{text:prompt}]}], systemInstruction:{parts:[{text:sys}]}, generationConfig:{responseMimeType:'application/json'} };
  for (let i=0;i<3;i++) {
    try {
      const r = await fetch(API_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const t = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if(t) return JSON.parse(t.replace(/^```json\s*|\s*```$/g,'').trim());
      throw new Error('No content');
    } catch(e) { if(i===2) throw e; await new Promise(r=>setTimeout(r,1000)); }
  }
};
const generateSingleVariant = async (title,content,group,imgBase) => {
  const conf = AGE_GROUPS[group];
  const tones = {storytellers:'Very simple, playful.',explorers:'Simple, clear.',adventurers:'Conversational.',voyagers:'Mature, reflective.'};
  const prompt = `Base Title:"${title}"\nBase Content:"${content}"\nGroup:${group}(${conf.label})\n1.Preserve image filenames and links.\n2.Generate ${conf.length} version.\nTONE:${tones[group]}\n3.englishTitle + 10 discussionQuestions.\n4.**bold** *italic* ==highlight==.\n5.Insert ONE image after EACH paragraph in burmese AND english.\n6.10 MCQ questions, 4 options each.\nReturn JSON:{englishTitle,burmese,english,discussionQuestions:[...10 strings],quiz:{questions:[{question,options:[4],correctAnswerIndex}]}}`;
  return generateContent(prompt, 'Expert curriculum developer. Return JSON only. Always include exact image filenames.');
};
const generateLessonVariants = async (title,content,mode,imgBase) => {
  const groups = mode==='junior' ? ['storytellers','explorers'] : ['adventurers','voyagers'];
  const results = {};
  await Promise.all(groups.map(async g => { results[g] = await generateSingleVariant(title,content,g,imgBase); }));
  return results;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const AudioPlayer = ({ src }) => {
  const [playing,setPlaying]=useState(false); const ref=useRef(null);
  const toggle = () => { if(!ref.current){ref.current=new Audio(src);ref.current.onended=()=>setPlaying(false);} if(playing)ref.current.pause();else ref.current.play().catch(()=>{}); setPlaying(!playing); };
  return <button onClick={toggle} className="inline-flex items-center gap-1 px-2 py-1 bg-pink-600/20 text-pink-400 rounded-full hover:bg-pink-600/40 border border-pink-500/30 mx-1">{playing?<Pause className="w-4 h-4"/>:<Music className="w-4 h-4"/>}<span className="text-xs font-bold">Play</span></button>;
};

const SmartContent = ({ text, imageBase }) => {
  if(!text) return null;
  const BASE = imageBase || DEFAULT_IMG_BASE;
  const fmt = (s) => s.split(/(\*\*.*?\*\*|\*.*?\*|==.*?==)/g).map((p,i)=>{
    if(p.startsWith('**')&&p.endsWith('**')) return <strong key={i} className="text-yellow-200 font-bold">{p.slice(2,-2)}</strong>;
    if(p.startsWith('*')&&p.endsWith('*'))   return <em key={i} className="text-indigo-300 italic">{p.slice(1,-1)}</em>;
    if(p.startsWith('==')&&p.endsWith('==')) return <span key={i} className="bg-yellow-600/40 px-1 rounded text-white border border-yellow-500/30">{p.slice(2,-2)}</span>;
    return p;
  });
  const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:\b[\w-]+\.(?:png|jpg|jpeg|gif|mp3)\b))/gi);
  return <span className="leading-relaxed">{parts.map((p,i)=>{
    if(!p) return null;
    const isUrl=p.match(/^https?:\/\//i), isImg=p.match(/\.(png|jpg|jpeg|gif)$/i), isAudio=p.match(/\.mp3$/i);
    if(isUrl){
      if(p.match(/(youtube|youtu\.be)/i)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-400 mx-1"><Youtube className="w-5 h-5 mr-1"/>Video</a>;
      if(isAudio) return <AudioPlayer key={i} src={p}/>;
      if(isImg) return <div key={i} className="my-2"><img src={p} className="max-w-full h-auto rounded-lg mx-auto" onError={e=>e.target.style.display='none'}/></div>;
      return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mx-1">Link<ExternalLink className="w-3 h-3 ml-1 inline"/></a>;
    }
    if(isImg) return <div key={i} className="my-2"><img src={`${BASE}${p}`} className="max-w-full h-auto rounded-lg mx-auto" onError={e=>e.target.style.display='none'}/></div>;
    if(isAudio) return <AudioPlayer key={i} src={`${AUDIO_BASE_URL}${p}`}/>;
    return <span key={i}>{fmt(p)}</span>;
  })}</span>;
};

// ── Class Picker (Student) ────────────────────────────────────────────────────
const AbhiClassPicker = ({ onSelectClass, entryClassId }) => {
  const [classes,setClasses]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    getDocs(abhiClassesRef()).then(snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      setClasses(list.sort((a,b)=>a.id.localeCompare(b.id)));
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  return (
    <div className="p-6 max-w-lg mx-auto mt-10">
      <h2 className="text-3xl font-bold text-amber-700 mb-6 text-center">📚 Choose Your Class</h2>
      {entryClassId && <p className="text-center text-gray-600 mb-4">Your teacher assigned <strong className="text-amber-700">{entryClassId}</strong>.</p>}
      {loading ? <div className="flex justify-center"><RotateCw className="w-8 h-8 animate-spin text-amber-500"/></div>
       : classes.length===0 ? <p className="text-center text-gray-500 italic">No classes found yet.</p>
       : <div className="space-y-3">{classes.map(c=>(
           <button key={c.id} onClick={()=>onSelectClass(c.id,c)}
             className={`w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all flex items-center justify-between ${c.id===entryClassId?'bg-amber-100 border-amber-500 text-amber-800 shadow-lg scale-[1.02]':'bg-white border-gray-200 text-gray-700 hover:border-amber-300'}`}>
             <span>{c.id===entryClassId?'⭐ ':''}{c.id}</span>
             <span className="text-sm font-normal text-gray-400">{(c.lessons||[]).length} lessons</span>
           </button>
         ))}</div>}
    </div>
  );
};

// ── Class Manager (Teacher) ───────────────────────────────────────────────────
const AbhiClassManager = ({ activeClassId, onSelectClass }) => {
  const [classes,setClasses]=useState([]); const [newId,setNewId]=useState(''); const [loading,setLoading]=useState(false);
  useEffect(()=>{
    return onSnapshot(abhiClassesRef(), snap=>setClasses(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id))));
  },[]);
  const createClass = async () => {
    if(!newId.trim()) return;
    loading || setLoading(true);
    try { await setDoc(abhiClassDocRef(newId.trim()),{classId:newId.trim(),lessons:[],autoApprove:false,createdAt:serverTimestamp()},{merge:true}); onSelectClass(newId.trim()); setNewId(''); }
    catch(e){console.error(e);} finally{setLoading(false);}
  };
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4">
      <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2"><FolderOpen className="w-5 h-5"/> Class Management</h3>
      <div className="flex gap-2 mb-3">
        <input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="New Class ID (e.g. Abhidhamma-1)" className="flex-1 bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-amber-500 focus:outline-none text-sm" onKeyDown={e=>e.key==='Enter'&&createClass()}/>
        <button onClick={createClass} disabled={!newId.trim()||loading} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4"/>Create</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {classes.map(c=>(
          <button key={c.id} onClick={()=>onSelectClass(c.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${c.id===activeClassId?'bg-amber-500 text-white border-amber-400':'bg-gray-700 text-gray-300 border-gray-600 hover:border-amber-400'}`}>
            {c.id} <span className="text-xs opacity-70">({(c.lessons||[]).length})</span>
          </button>
        ))}
        {classes.length===0&&<p className="text-gray-500 text-sm italic">No classes yet. Create one above.</p>}
      </div>
    </div>
  );
};

// ── Per-class Roster (Teacher) ────────────────────────────────────────────────
const AbhiClassRoster = ({ userId, classId }) => {
  const [students,setStudents]=useState([]); const [isOpen,setIsOpen]=useState(true);
  const [nowTime,setNowTime]=useState(Date.now()); const [autoApprove,setAutoApprove]=useState(false);
  useEffect(()=>{const i=setInterval(()=>setNowTime(Date.now()),10000);return()=>clearInterval(i);},[]);
  useEffect(()=>{
    if(!classId) return;
    const q=query(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster'),where('classId','==',classId));
    return onSnapshot(q,snap=>{
      const now=Date.now();
      setStudents(snap.docs.map(d=>{
        const data=d.data(); const lp=data.lastPing;
        if(data.isOnline&&lp){const pm=lp.toMillis?lp.toMillis():(lp.seconds*1000); if((now-pm)/60000>2) return{id:d.id,...data,isOnline:false};}
        return{id:d.id,...data};
      }));
    });
  },[classId]);
  useEffect(()=>{
    if(!classId||!db) return;
    const ref=doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classes',classId);
    return onSnapshot(ref,snap=>{if(snap.exists()) setAutoApprove(snap.data().autoApprove||false);});
  },[classId]);
  const toggleAutoApprove=async e=>{e.stopPropagation();if(!classId)return;await updateDoc(abhiClassDocRef(classId),{autoApprove:!autoApprove});};
  const handleApprove=async(docId,name)=>{
    const ref=doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster',docId);
    const snap=await getDoc(ref); if(!snap.exists()) return;
    const data=snap.data(); let num=data.studentNumber;
    if(!num){const max=students.filter(s=>s.status==='approved').reduce((m,s)=>Math.max(m,s.studentNumber||0),0); num=max+1;}
    await updateDoc(ref,{status:'approved',name:name||data.name,pendingName:null,studentNumber:num});
  };
  useEffect(()=>{if(autoApprove)students.filter(s=>s.status==='pending').forEach(s=>handleApprove(s.id,s.pendingName||s.name));},[students,autoApprove]);
  const handleReject=id=>updateDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster',id),{status:'rejected',pendingName:null});
  const handleRemove=async(e,id)=>{e.stopPropagation();try{await deleteDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster',id));}catch(err){console.error(err);}};
  if(!classId) return null;
  const pending=students.filter(s=>s.status==='pending');
  const online=students.filter(s=>s.status==='approved'&&s.isOnline).sort((a,b)=>(a.studentNumber||0)-(b.studentNumber||0));
  const offline=students.filter(s=>s.status==='approved'&&!s.isOnline).sort((a,b)=>(a.studentNumber||0)-(b.studentNumber||0)).map(s=>{
    let isWarning=false; const ct=s.lastSeen||s.lastPing;
    if(ct){const ms=ct.toMillis?ct.toMillis():(ct.seconds*1000); const d=(nowTime-ms)/60000; if(d>=3&&d<=8)isWarning=true;}
    return{...s,isWarning};
  });
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 mb-6 overflow-hidden">
      <div onClick={()=>setIsOpen(!isOpen)} className="p-4 border-b border-gray-700 cursor-pointer flex flex-wrap gap-3 justify-between items-center hover:bg-gray-700 transition">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400"/> Roster: {classId}</h3>
          <button onClick={toggleAutoApprove} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold ${autoApprove?'bg-green-500/20 text-green-400 border border-green-500/50':'bg-gray-800 text-gray-400 border border-gray-600'}`}>
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
      {isOpen&&(
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pending {pending.length>0&&<span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse inline-block ml-1"/>}</h4>
            {pending.length===0?<p className="text-gray-500 text-sm italic">No pending requests.</p>:null}
            {pending.map(s=>(
              <div key={s.id} className="bg-gray-800 p-3 rounded-lg border border-yellow-600/30 flex justify-between items-center">
                <div><p className="font-bold text-white">{s.pendingName||s.name}</p>{s.pendingName&&<p className="text-xs text-yellow-400">Previous: {s.name}</p>}</div>
                <div className="flex gap-2"><button onClick={()=>handleApprove(s.id,s.pendingName||s.name)} className="p-2 bg-green-600 rounded text-white"><UserCheck className="w-4 h-4"/></button><button onClick={()=>handleReject(s.id)} className="p-2 bg-red-600 rounded text-white"><UserX className="w-4 h-4"/></button></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Online ({online.length})</h4>
              <div className="flex flex-wrap gap-2">
                {online.length===0&&<span className="text-gray-600 text-sm italic">Nobody online.</span>}
                {online.map(s=>(
                  <div key={s.id} className="bg-indigo-900/60 border border-indigo-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500"/><span className="font-bold text-indigo-300">#{s.studentNumber}</span><span className="text-white">{s.name}</span>
                    <button onClick={e=>handleRemove(e,s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Offline ({offline.length})</h4>
              <div className="flex flex-wrap gap-2">
                {offline.length===0&&<span className="text-gray-600 text-sm italic">None.</span>}
                {offline.map(s=>(
                  <div key={s.id} className={`border px-3 py-1.5 rounded-full flex items-center gap-2 text-sm ${s.isWarning?'bg-red-950/80 border-red-500':'bg-gray-800 border-gray-600 opacity-60 hover:opacity-100'}`}>
                    <Circle className={`w-2 h-2 flex-shrink-0 ${s.isWarning?'fill-red-500 text-red-500':'fill-gray-500 text-gray-500'}`}/>
                    <span className={`font-bold ${s.isWarning?'text-red-300':'text-gray-400'}`}>#{s.studentNumber}</span>
                    <span className={s.isWarning?'text-white':'text-gray-300'}>{s.name}</span>
                    <button onClick={e=>handleRemove(e,s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
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

// ── WelcomeModal ──────────────────────────────────────────────────────────────
const AbhiWelcomeModal = ({ userId, classId, onStudentComplete, onTeacherComplete }) => {
  const [step,setStep]=useState('role_select'); const [name,setName]=useState(''); const [group,setGroup]=useState(null);
  const [passcode,setPasscode]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);

  const handleSubmit = async () => {
    if(!name.trim()||!group) return;
    setBusy(true);
    try {
      const rosterRef = abhiRosterDocRef(classId, name.trim());
      const classRef  = abhiClassDocRef(classId);
      const [rosterSnap,classSnap] = await Promise.all([getDoc(rosterRef),getDoc(classRef)]);
      const autoApprove = classSnap.exists() ? classSnap.data().autoApprove : false;
      const status = autoApprove ? 'approved' : 'pending';
      if(rosterSnap.exists()){
        const d=rosterSnap.data();
        if(d.status==='approved') { onStudentComplete({...d,name:d.name,group:d.group||group}); return; }
        await updateDoc(rosterRef,{pendingName:name.trim(),group,status});
      } else {
        await setDoc(rosterRef,{classId,studentName:name.trim(),name:name.trim(),group,status,joinedAt:Date.now()});
      }
      if(autoApprove) { const snap=await getDoc(rosterRef); onStudentComplete({...snap.data(),name:snap.data().name,group}); }
      else setStep('waiting');
    } catch(e){console.error(e);} finally{setBusy(false);}
  };

  useEffect(()=>{
    if(!userId||!classId||step!=='waiting') return;
    return onSnapshot(abhiRosterDocRef(classId,name.trim()),(snap)=>{
      if(snap.exists()&&snap.data().status==='approved') onStudentComplete({...snap.data()});
      else if(snap.exists()&&snap.data().status==='rejected') setStep('role_select');
    });
  },[userId,classId,step]);

  return (
    <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
      <div className="bg-amber-900/90 border border-amber-500 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        {step==='role_select'&&<div>
          <Globe className="w-16 h-16 mx-auto text-amber-400 mb-4 animate-pulse"/>
          <h2 className="text-3xl font-black text-white mb-8">📚 Abhidhamma App</h2>
          <div className="space-y-4">
            <button onClick={()=>setStep('student')} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-3"><User className="w-6 h-6"/>Student</button>
            <button onClick={()=>setStep('teacher')} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-3"><Key className="w-6 h-6"/>Teacher</button>
          </div>
        </div>}
        {step==='student'&&<div>
          <User className="w-16 h-16 mx-auto text-cyan-400 mb-4"/>
          <h2 className="text-2xl font-black text-white mb-4">Student Setup</h2>
          {classId&&<p className="text-amber-200 text-sm mb-4">Class: <strong>{classId}</strong></p>}
          <input className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 outline-none" placeholder="Your Full Name" value={name} onChange={e=>setName(e.target.value)} disabled={busy}/>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(AGE_GROUPS).map(([k,v])=>(
              <button key={k} onClick={()=>setGroup(k)} disabled={busy} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${group===k?'bg-cyan-500 border-cyan-300 text-white scale-105':'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}>
                {v.icon}<span className="text-xs font-bold">{v.label}</span>
              </button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={!name||!group||busy} className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-xl py-4 rounded-xl">
            {busy?<RotateCw className="w-6 h-6 mx-auto animate-spin"/>:'ENTER'}
          </button>
        </div>}
        {step==='waiting'&&<div>
          <Lock className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-pulse"/>
          <h2 className="text-2xl font-black text-white mb-4">Waiting for Approval…</h2>
          <RotateCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin"/>
        </div>}
        {step==='teacher'&&<div>
          <Wand2 className="w-16 h-16 mx-auto text-purple-400 mb-4 animate-pulse"/>
          <h2 className="text-3xl font-black text-white mb-4">Teacher Login</h2>
          <input type="password" className="w-full p-4 rounded-xl text-black font-bold text-center text-xl mb-4 outline-none" placeholder="Passcode" value={passcode} onChange={e=>{setPasscode(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&(passcode===TEACHER_PASSCODE?onTeacherComplete():setError('Incorrect.'))}/>
          {error&&<p className="text-red-400 mb-4 text-sm font-bold">{error}</p>}
          <button onClick={()=>passcode===TEACHER_PASSCODE?onTeacherComplete():setError('Incorrect.')} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xl py-4 rounded-xl">LOGIN</button>
        </div>}
      </div>
    </div>
  );
};

// ─── LessonItem (simplified, reuses SmartContent) ─────────────────────────────
const AbhiLessonItem = ({ lesson, isTeacher, studentAgeGroup, studentName, onEdit, onGenerateVariants, onTakeQuiz, isGenerating, classId, userId, imageBase, isOpen, onToggle }) => {
  const [tab,setTab]=useState('content');
  const variants=lesson.variants||{};
  const hasJr=variants.storytellers&&variants.explorers;
  const hasSr=variants.adventurers&&variants.voyagers;
  let displayContent='', displayTitle=lesson.title, quizAvailable=false, quizData=null, discQ=[];
  if(!isTeacher&&studentAgeGroup){
    const v=variants[studentAgeGroup];
    if(v){displayContent=v.english;displayTitle=v.englishTitle||lesson.title;quizAvailable=!!v.quiz;quizData=v.quiz;discQ=v.discussionQuestions||[];}
    else displayContent='Content not available for your age group yet.';
  }
  const imgBase = lesson.imageBaseUrl || imageBase || DEFAULT_IMG_BASE;
  return (
    <div className={`relative rounded-xl shadow-md overflow-hidden border mb-4 ${isTeacher?'bg-gray-800 border-gray-700':'bg-gray-700 border-gray-600'}`}>
      {isGenerating&&<div className="absolute inset-0 bg-gray-900/80 z-10 flex flex-col items-center justify-center"><RotateCw className="w-12 h-12 text-teal-400 animate-spin mb-4"/><p className="text-white font-bold">Generating…</p></div>}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-gray-600/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isOpen?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronRight className="w-5 h-5 text-gray-400"/>}
          <h3 className={`text-lg font-bold ${isTeacher?'text-teal-300':'text-white'}`}>{displayTitle}</h3>
          {isTeacher&&<span className="text-xs text-gray-500">{hasJr&&hasSr?<span className="text-green-400">✓ Ready</span>:<span className="text-yellow-500">Pending</span>}</span>}
        </div>
        {isTeacher&&<div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onEdit(lesson)} className="p-2 bg-blue-600 rounded text-white hover:bg-blue-700"><Edit2 className="w-3 h-3"/></button>
          <button onClick={()=>onGenerateVariants(lesson,'junior')} className="px-3 py-1 bg-purple-600 rounded text-white text-xs font-bold hover:bg-purple-700"><Zap className="w-3 h-3 inline"/> Jr.</button>
          <button onClick={()=>onGenerateVariants(lesson,'senior')} className="px-3 py-1 bg-pink-600 rounded text-white text-xs font-bold hover:bg-pink-700"><Zap className="w-3 h-3 inline"/> Sr.</button>
        </div>}
      </div>
      {isOpen&&<div className="border-t border-gray-600/50">
        <div className="flex border-b border-gray-700">
          <button onClick={()=>setTab('content')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${tab==='content'?'text-teal-400 border-b-2 border-teal-400 bg-gray-800':'text-gray-400 hover:text-white'}`}><BookOpen className="w-4 h-4"/>Lesson</button>
        </div>
        <div className="p-5">
          {isTeacher
            ? <div className="text-white whitespace-pre-wrap leading-relaxed"><SmartContent text={lesson.burmeseContent} imageBase={imgBase}/></div>
            : <div>
                <div className="text-yellow-100 whitespace-pre-wrap leading-relaxed text-lg"><SmartContent text={displayContent} imageBase={imgBase}/></div>
                {quizAvailable&&<button onClick={e=>{e.stopPropagation();onTakeQuiz(lesson.id,displayTitle,quizData);}} className="mt-4 w-full py-3 font-black rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center gap-2"><Gamepad2 className="w-6 h-6"/>PLAY QUIZ</button>}
              </div>}
        </div>
      </div>}
    </div>
  );
};

// ─── Main AbhidhammaApp ───────────────────────────────────────────────────────
export default function AbhidhammaApp({ entryRequest, onExit }) {
  const [isAuthReady,setIsAuthReady]=useState(false);
  const [userId,setUserId]=useState(null);
  const [isTeacher,setIsTeacher]=useState(false);
  const [currentRole,setCurrentRole]=useState('Student');
  const [currentClassId,setCurrentClassId]=useState('');
  const [classData,setClassData]=useState(null);
  const [lessons,setLessons]=useState([]);
  const [studentProfile,setStudentProfile]=useState(null);
  const [showWelcome,setShowWelcome]=useState(false);
  const [activeQuizLessonId,setActiveQuizLessonId]=useState(null);
  const [activeQuizData,setActiveQuizData]=useState(null);
  const [openLessonId,setOpenLessonId]=useState(null);
  const [editingLesson,setEditingLesson]=useState(null);
  const [newLessonTitle,setNewLessonTitle]=useState('');
  const [newLessonContent,setNewLessonContent]=useState('');
  const [newLessonImageBase,setNewLessonImageBase]=useState(DEFAULT_IMG_BASE);
  const [importClassId,setImportClassId]=useState('');
  const [isLoading,setIsLoading]=useState(false);
  const [generatingLessonId,setGeneratingLessonId]=useState(null);
  const [message,setMessage]=useState('');
  const fileInputRef=useRef(null);
  const lastEntryRef=useRef(null);

  const showMessage = t => { setMessage(t); setTimeout(()=>setMessage(''),3500); };

  // Auth
  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>{setUserId(u?u.uid:null);setIsAuthReady(true);});
    return()=>unsub();
  },[]);

  // Teacher restore
  useEffect(()=>{ if(localStorage.getItem('abhidhamma_isTeacher')==='true'){setIsTeacher(true);setCurrentRole('Teacher');} },[]);

  // entryRequest from TutoringApp
  useLayoutEffect(()=>{
    if(!entryRequest||!isAuthReady) return;
    const sig=JSON.stringify({mode:entryRequest.mode,classId:entryRequest.classId||'',lessonId:entryRequest.lessonId||''});
    if(sig===lastEntryRef.current) return;
    lastEntryRef.current=sig;
    if(entryRequest.mode==='teacher'){
      setIsTeacher(true); setCurrentRole('Teacher');
      localStorage.setItem('abhidhamma_isTeacher','true');
    } else if(entryRequest.mode==='student'&&entryRequest.studentName){
      const ageMap={storyteller:'storytellers',explorer:'explorers',adventurer:'adventurers',voyager:'voyagers'};
      const grp = entryRequest.ageGroup ? (ageMap[entryRequest.ageGroup]||entryRequest.ageGroup) : null;
      const profile={name:entryRequest.studentName,group:grp||'explorers',status:'approved'};
      setStudentProfile(profile);
      setCurrentRole('Student');
      if(entryRequest.classId) enterClass(entryRequest.classId);
    }
  },[entryRequest,isAuthReady]);

  // Load class data when classId changes
  useEffect(()=>{
    if(!currentClassId||!isAuthReady) return;
    const unsub=onSnapshot(abhiClassDocRef(currentClassId),snap=>{
      if(snap.exists()){setClassData(snap.data());setLessons(snap.data().lessons||[]);}
      else{setClassData(null);setLessons([]);}
    });
    return()=>unsub();
  },[currentClassId,isAuthReady]);

  const enterClass = (classId) => {
    setCurrentClassId(classId);
    setImportClassId(classId);
    setOpenLessonId(null);
  };

  const handleStudentEnterClass = (classId) => {
    if(!studentProfile){setShowWelcome(true); return;}
    enterClass(classId);
  };

  // Teacher: save lesson to class doc's lessons array
  const handleSaveLesson = async e => {
    e.preventDefault();
    if(!newLessonTitle.trim()||!newLessonContent.trim()||!currentClassId) return showMessage('Fill title, content and select a class!');
    setIsLoading(true);
    try {
      const lessonEntry = {
        id: editingLesson ? editingLesson.id : `lesson_${Date.now()}`,
        title: newLessonTitle.trim(),
        burmeseContent: newLessonContent.trim(),
        imageBaseUrl: newLessonImageBase.trim()||DEFAULT_IMG_BASE,
        variants: editingLesson?.variants || {},
        createdAt: editingLesson?.createdAt || Date.now(),
      };
      const classRef=abhiClassDocRef(currentClassId);
      if(editingLesson){
        const updated=lessons.map(l=>l.id===editingLesson.id?lessonEntry:l);
        await updateDoc(classRef,{lessons:updated});
      } else {
        await updateDoc(classRef,{lessons:arrayUnion(lessonEntry)});
      }
      setNewLessonTitle(''); setNewLessonContent(''); setNewLessonImageBase(DEFAULT_IMG_BASE); setEditingLesson(null);
      showMessage('Lesson saved!');
    } catch(err){console.error(err);showMessage('Error saving lesson.');} finally{setIsLoading(false);}
  };

  const handleDeleteLesson = async (lessonId) => {
    if(!currentClassId) return;
    const lesson=lessons.find(l=>l.id===lessonId);
    if(!lesson) return;
    await updateDoc(abhiClassDocRef(currentClassId),{lessons:arrayRemove(lesson)});
  };

  // AI generation (saves variants into the lesson inside the class doc)
  const handleGenerateVariants = async (lesson, mode) => {
    if(!currentClassId){showMessage('Select a class first!');return;}
    setGeneratingLessonId(lesson.id);
    try {
      const newVariants=await generateLessonVariants(lesson.title,lesson.burmeseContent,mode,lesson.imageBaseUrl);
      const updated=lessons.map(l=>l.id===lesson.id?{...l,variants:{...l.variants,...newVariants}}:l);
      await updateDoc(abhiClassDocRef(currentClassId),{lessons:updated});
      showMessage('Generated!');
    } catch(e){showMessage('Error generating.');console.error(e);} finally{setGeneratingLessonId(null);}
  };

  // Export (full data dump)
  const handleExportLessons = async () => {
    setIsLoading(true); showMessage('Exporting…');
    try {
      const toMs=ts=>{if(!ts)return null;if(typeof ts.toMillis==='function')return ts.toMillis();if(ts.seconds)return ts.seconds*1000;return null;};
      const [classesSnap,scoresSnap,actSnap,rosterSnap]=await Promise.all([
        getDocs(abhiClassesRef()),
        getDocs(abhiScoresRef()),
        getDocs(abhiActivityRef()),
        getDocs(collection(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster')),
      ]);
      const exportData={
        version:3,
        classes: classesSnap.docs.map(d=>({id:d.id,...d.data(),createdAt:toMs(d.data().createdAt)})),
        scores:  scoresSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),
        activityFeed: actSnap.docs.map(d=>({id:d.id,...d.data(),timestamp:toMs(d.data().timestamp)})),
        classRoster: rosterSnap.docs.map(d=>({id:d.id,...d.data()})),
        quizResults:{},
      };
      for(const cd of classesSnap.docs){
        for(const lesson of (cd.data().lessons||[])){
          for(const grp of Object.keys(AGE_GROUPS)){
            const rSnap=await getDocs(abhiResultsRef(cd.id,lesson.id,grp));
            if(!rSnap.empty) exportData.quizResults[`${cd.id}_${lesson.id}_${grp}`]=rSnap.docs.map(r=>({id:r.id,...r.data(),timestamp:toMs(r.data().timestamp)}));
          }
        }
      }
      const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a');
      a.href=url; a.download=`abhidhamma_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      showMessage('Exported!');
    } catch(e){console.error(e);showMessage('Error exporting!');} finally{setIsLoading(false);}
  };

  // Import — assign to a class
  const handleImportLessons = (event) => {
    const file=event.target.files[0]; if(!file) return;
    const targetClassId=importClassId.trim();
    if(!targetClassId){showMessage('Enter a Class ID for this import!');event.target.value='';return;}
    const reader=new FileReader();
    reader.onload=async e=>{
      try {
        const data=JSON.parse(e.target.result);
        setIsLoading(true);
        const toDate=ts=>ts?new Date(ts):serverTimestamp();

        // Version 3: full class-based export (re-import)
        if(data.version===3){
          for(const c of(data.classes||[])){
            const{id,createdAt,...rest}=c;
            await setDoc(abhiClassDocRef(id),{...rest,classId:id,createdAt:toDate(createdAt)},{merge:true});
          }
          for(const s of(data.scores||[])){const{id,timestamp,...r}=s;await setDoc(doc(abhiScoresRef(),id),{...r,timestamp:toDate(timestamp)});}
          for(const a of(data.activityFeed||[])){const{id,timestamp,...r}=a;await setDoc(doc(abhiActivityRef(),id),{...r,timestamp:toDate(timestamp)});}
          for(const rr of(data.classRoster||[])){const{id,...r}=rr;await setDoc(doc(db,'artifacts',ABHIDHAMMA_APP_ID,'public','data','classRoster',id),r);}
          for(const[key,rList]of Object.entries(data.quizResults||{})){
            const parts=key.split('_'); const grp=parts.pop(); const lessonId=parts.pop(); const cId=parts.join('_');
            for(const r of rList){const{id,timestamp,...rest}=r;await setDoc(doc(abhiResultsRef(cId,lessonId,grp),id),{...rest,timestamp:toDate(timestamp)});}
          }
          showMessage(`Imported ${(data.classes||[]).length} classes.`);
          return;
        }

        // Flat lessons import → add to target class
        const rawLessons=Array.isArray(data)?data:(data.lessons||[]);
        if(rawLessons.length===0){showMessage('No lessons found in file.');return;}
        const imageBase=data.imageBaseUrl||newLessonImageBase||DEFAULT_IMG_BASE;
        const newLessons=rawLessons.map((l,i)=>({
          id:l.id||`imported_${Date.now()}_${i}`,
          title:l.title||`Lesson ${i+1}`,
          burmeseContent:l.burmeseContent||l.content||'',
          imageBaseUrl:l.imageBaseUrl||imageBase,
          variants:l.variants||{},
          createdAt:l.timestamp||Date.now(),
        }));
        // Merge into class (avoid duplicate IDs)
        const classRef=abhiClassDocRef(targetClassId);
        const classSnap=await getDoc(classRef);
        const existingLessons=classSnap.exists()?(classSnap.data().lessons||[]):[];
        const existingIds=new Set(existingLessons.map(l=>l.id));
        const toAdd=newLessons.filter(l=>!existingIds.has(l.id));
        await setDoc(classRef,{classId:targetClassId,lessons:[...existingLessons,...toAdd]},{merge:true});
        showMessage(`Imported ${toAdd.length} lessons into class "${targetClassId}".`);
        if(!currentClassId) enterClass(targetClassId);
      } catch(err){showMessage(`Error: ${err.message}`);}
      finally{setIsLoading(false);event.target.value='';}
    };
    reader.readAsText(file);
  };

  if(!isAuthReady) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><RotateCw className="animate-spin w-8 h-8 text-amber-400"/></div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8 pt-16">
      <style>{`.animate-bounce-in{animation:bounceIn .5s ease-out}@keyframes bounceIn{0%{transform:scale(.5);opacity:0}80%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}`}</style>

      {/* WelcomeModal */}
      {showWelcome&&<AbhiWelcomeModal userId={userId} classId={currentClassId} onStudentComplete={p=>{setStudentProfile(p);setShowWelcome(false);}} onTeacherComplete={()=>{setIsTeacher(true);setCurrentRole('Teacher');localStorage.setItem('abhidhamma_isTeacher','true');setShowWelcome(false);}}/>}

      {message&&<div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 font-bold">{message}</div>}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-amber-400">📚 Abhidhamma App</span>
            {isTeacher?(
              <div className="flex gap-2">
                <button onClick={()=>setCurrentRole(r=>r==='Teacher'?'Student':'Teacher')} className={`px-4 py-2 font-bold rounded shadow-lg ${currentRole==='Teacher'?'bg-purple-600':'bg-teal-600'}`}>{currentRole==='Teacher'?'Student View':'Teacher View'}</button>
                <button onClick={()=>{setIsTeacher(false);setCurrentRole('Student');localStorage.removeItem('abhidhamma_isTeacher');}} className="px-4 py-2 font-bold rounded bg-red-600 hover:bg-red-700">Logout</button>
              </div>
            ):(
              <button onClick={()=>setShowWelcome(true)} className="px-4 py-2 font-bold rounded bg-gray-600 hover:bg-gray-500 flex items-center gap-2"><Key className="w-4 h-4"/>Teacher Login</button>
            )}
            {studentProfile?.status==='approved'&&<span className="bg-gray-700 px-3 py-1 rounded text-gray-300 font-medium flex items-center gap-2"><User className="w-4 h-4"/>{studentProfile.name}</span>}
          </div>
          <div className="text-gray-400 text-sm font-semibold">{currentRole} View {currentClassId&&`· ${currentClassId}`}</div>
        </header>

        {/* ── Teacher View ─── */}
        {currentRole==='Teacher'&&(
          <div className="space-y-6">
            {/* Class Manager */}
            <AbhiClassManager activeClassId={currentClassId} onSelectClass={enterClass}/>

            {/* Roster for current class */}
            {currentClassId&&<AbhiClassRoster userId={userId} classId={currentClassId}/>}

            {/* Lesson form */}
            {currentClassId&&(
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-teal-300">{editingLesson?'Edit Lesson':'Add Lesson'} — <span className="text-amber-400">{currentClassId}</span></h3>
                  <div className="flex gap-2">
                    {/* Import */}
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded p-1">
                      <input value={importClassId} onChange={e=>setImportClassId(e.target.value)} placeholder="Class ID for import" className="bg-transparent text-white text-xs focus:outline-none w-32 px-2"/>
                      <label className="cursor-pointer bg-indigo-600 p-1.5 rounded hover:bg-indigo-700 flex items-center gap-1 text-xs text-white font-semibold">
                        <input type="file" accept=".json" onChange={handleImportLessons} className="hidden" ref={fileInputRef}/>
                        <Upload className="w-3 h-3"/> Import
                      </label>
                    </div>
                    <button onClick={handleExportLessons} disabled={isLoading} className="bg-pink-600 p-2 rounded hover:bg-pink-700 text-white text-xs font-semibold flex items-center gap-1"><Download className="w-3 h-3"/> Export</button>
                  </div>
                </div>
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <input value={newLessonTitle} onChange={e=>setNewLessonTitle(e.target.value)} placeholder="Lesson Title" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={isLoading}/>
                  <textarea value={newLessonContent} onChange={e=>setNewLessonContent(e.target.value)} placeholder="Lesson Content (Burmese)" rows="6" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white focus:border-teal-500 focus:outline-none" disabled={isLoading}/>
                  <div className="flex gap-2 items-center bg-gray-900 p-2 rounded border border-gray-600">
                    <span className="text-gray-400 text-xs ml-2 whitespace-nowrap">🖼 Image URL:</span>
                    <input value={newLessonImageBase} onChange={e=>setNewLessonImageBase(e.target.value)} placeholder={DEFAULT_IMG_BASE} className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-gray-600 focus:border-teal-500 px-1" disabled={isLoading}/>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={isLoading} className="flex-1 bg-teal-600 p-3 rounded hover:bg-teal-700 flex justify-center items-center font-bold">
                      {isLoading?<RotateCw className="animate-spin w-5 h-5 mr-2"/>:<BookOpen className="w-5 h-5 mr-2"/>}{editingLesson?'Update':'Save'}
                    </button>
                    {editingLesson&&<button type="button" onClick={()=>{setEditingLesson(null);setNewLessonTitle('');setNewLessonContent('');setNewLessonImageBase(DEFAULT_IMG_BASE);}} className="bg-gray-600 p-3 rounded hover:bg-gray-500">Cancel</button>}
                  </div>
                </form>
              </div>
            )}

            {/* Lesson list */}
            {currentClassId&&(
              <div className="space-y-4">
                {lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons in <strong>{currentClassId}</strong> yet.</p>}
                {lessons.map(l=>(
                  <AbhiLessonItem key={l.id} lesson={l} isTeacher classId={currentClassId} userId={userId}
                    imageBase={classData?.imageBaseUrl||DEFAULT_IMG_BASE}
                    onEdit={l=>{setEditingLesson(l);setNewLessonTitle(l.title);setNewLessonContent(l.burmeseContent);setNewLessonImageBase(l.imageBaseUrl||DEFAULT_IMG_BASE);window.scrollTo({top:0,behavior:'smooth'});}}
                    onGenerateVariants={handleGenerateVariants} onTakeQuiz={()=>{}} isGenerating={generatingLessonId===l.id}
                    isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Student View ─── */}
        {currentRole==='Student'&&(
          <div>
            {/* Class picker if no class selected */}
            {!currentClassId&&(
              <AbhiClassPicker entryClassId={entryRequest?.classId} onSelectClass={cId=>{
                if(!studentProfile){setCurrentClassId(cId);setShowWelcome(true);}
                else enterClass(cId);
              }}/>
            )}

            {/* Welcome if no profile */}
            {currentClassId&&!studentProfile&&!showWelcome&&(
              <div className="text-center mt-10">
                <button onClick={()=>setShowWelcome(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-xl text-xl">Enter Class</button>
              </div>
            )}

            {/* Lessons */}
            {currentClassId&&studentProfile&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Class: <span className="text-amber-400">{currentClassId}</span></h2>
                  <button onClick={()=>{setCurrentClassId('');setClassData(null);setLessons([]);}} className="text-sm text-gray-400 hover:text-white underline">← Change Class</button>
                </div>
                {lessons.length===0&&<p className="text-center text-gray-500 py-6">No lessons yet in this class.</p>}
                {lessons.map(l=>(
                  <AbhiLessonItem key={l.id} lesson={l} isTeacher={false} classId={currentClassId} userId={userId}
                    studentAgeGroup={studentProfile.group} studentName={studentProfile.name}
                    imageBase={classData?.imageBaseUrl||DEFAULT_IMG_BASE}
                    onGenerateVariants={()=>{}} onEdit={()=>{}} onTakeQuiz={(id,title,data)=>{setActiveQuizLessonId(id);setActiveQuizData(data);}}
                    isGenerating={false} isOpen={openLessonId===l.id} onToggle={()=>setOpenLessonId(openLessonId===l.id?null:l.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
