import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, query } from 'firebase/firestore';
import { Search, Plus, Trash2, Check, Copy, Edit3, X, History, Download, Upload, Save, Edit2, Zap, ShieldCheck, Database, Trash } from 'lucide-react';

// Firebase configuration using environment variables
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'wiki-autolinker-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [newKeywordsArea, setNewKeywordsArea] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [view, setView] = useState('input'); // 'input', 'review', 'final'
  const [processedLinks, setProcessedLinks] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Auth initialization (Rule 3: Auth before Queries)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Persistent Keywords (Rule 1 & 2: Firestore Pattern)
  useEffect(() => {
    if (!user) return;
    
    const keywordsCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'keywords');
    
    const unsubscribe = onSnapshot(keywordsCollection, (snapshot) => {
      const k = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKeywords(k);
    }, (error) => {
      console.error("Firestore Error (Read):", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Bulk Add Keywords with Persistence
  const addKeywordsBulk = async (e) => {
    e.preventDefault();
    if (!newKeywordsArea.trim() || !user) return;
    
    const wordsToAdd = newKeywordsArea
      .split('\n')
      .map(w => w.trim())
      .filter(w => w !== '' && !keywords.some(existing => existing.word === w));

    if (wordsToAdd.length === 0) {
      setNewKeywordsArea('');
      return;
    }

    try {
      const batch = writeBatch(db);
      wordsToAdd.forEach(word => {
        const newDocRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'keywords'));
        batch.set(newDocRef, { word, createdAt: Date.now() });
      });
      await batch.commit();
      setNewKeywordsArea('');
    } catch (err) {
      console.error("Bulk Add Error:", err);
    }
  };

  const deleteKeyword = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'keywords', id));
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const saveEdit = async (id) => {
    if (!editingValue.trim() || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'keywords', id), {
        word: editingValue.trim()
      });
      setEditingId(null);
    } catch (err) {
      console.error("Update Error:", err);
    }
  };

  // Improved Process Engine with Global Duplication Protection and Advanced Citation Removal
  const processToLinks = () => {
    let formattedText = inputText;
    
    // 1. Remove Citations like [၈၆], [၁၈၁၊ ၁၈၂], [၁၀၊ ၁၁၊ ၂၄၂]
    // Regex matches square brackets containing Burmese/Latin digits and optional Burmese/Latin commas or spaces
    formattedText = formattedText.replace(/\[[၀-၉\d\s၊,]+\]/g, '');
    
    // 2. Formatting: Headers and Bold
    formattedText = formattedText.replace(/^==([^=]+)==\s*$/gm, '===$1===');
    formattedText = formattedText.replace(/^###\s*(.+)$/gm, '===$1===');
    formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, "'''$1'''");

    // 3. First Pass: Identify all existing links
    const existingLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    let preLinkedWords = new Set();
    let protectedRanges = [];
    let match;
    
    while ((match = existingLinkRegex.exec(formattedText)) !== null) {
      // Add both the target and the display text to protected set
      preLinkedWords.add(match[1].trim());
      if (match[2]) preLinkedWords.add(match[2].trim());
      protectedRanges.push({ start: match.index, end: match.index + match[0].length });
    }

    // 4. Second Pass: Find keywords
    // Keywords logic: If word contains '|', split into [target, display]
    const sortedKeywords = [...keywords].map(k => {
      if (k.word.includes('|')) {
        const parts = k.word.split('|');
        return { ...k, target: parts[0].trim(), searchWord: parts[1].trim() };
      }
      return { ...k, target: k.word, searchWord: k.word };
    }).sort((a, b) => b.searchWord.length - a.searchWord.length);

    let tempLinks = [];

    sortedKeywords.forEach(k => {
      if (preLinkedWords.has(k.searchWord)) return;

      const escapedWord = k.searchWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'g');
      let wordMatch;
      let count = 0;

      while ((wordMatch = regex.exec(formattedText)) !== null) {
        if (count > 0) break; 

        const isInsideExisting = protectedRanges.some(range => 
          wordMatch.index >= range.start && wordMatch.index < range.end
        );

        if (!isInsideExisting) {
          tempLinks.push({
            target: k.target,
            display: k.searchWord,
            index: wordMatch.index,
            active: true,
            id: Math.random().toString(36).substr(2, 9)
          });
          count++; 
        }
      }
    });

    tempLinks.sort((a, b) => a.index - b.index);
    let finalLinks = [];
    let occupiedIndices = new Set();
    let globallyLinked = new Set();

    tempLinks.forEach(link => {
      let isOverlap = false;
      for (let i = link.index; i < link.index + link.display.length; i++) {
        if (occupiedIndices.has(i)) {
          isOverlap = true;
          break;
        }
      }

      if (!isOverlap && !globallyLinked.has(link.display)) {
        finalLinks.push(link);
        globallyLinked.add(link.display);
        for (let i = link.index; i < link.index + link.display.length; i++) {
          occupiedIndices.add(i);
        }
      }
    });

    setInputText(formattedText);
    setProcessedLinks(finalLinks);
    setView('review');
  };

  const generateFinalText = () => {
    let output = "";
    let lastIdx = 0;
    const sortedActiveLinks = [...processedLinks].filter(l => l.active).sort((a, b) => a.index - b.index);
    sortedActiveLinks.forEach(link => {
      output += inputText.substring(lastIdx, link.index);
      // Format as [[Target|Display]] if they are different, otherwise [[Word]]
      if (link.target !== link.display) {
        output += `[[${link.target}|${link.display}]]`;
      } else {
        output += `[[${link.display}]]`;
      }
      lastIdx = link.index + link.display.length;
    });
    output += inputText.substring(lastIdx);
    return output;
  };

  const copyToClipboard = () => {
    const text = generateFinalText();
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleLink = (id) => {
    setProcessedLinks(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `}
      </style>

      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center flex flex-col items-center">
          <div className="bg-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <Zap className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Wiki Linker Pro</h1>
          <p className="text-slate-500 font-medium">Auto-linking & Citation Cleaner</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Keyword Management */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Database size={20} className="text-indigo-500" />
                  Keywords စီမံရန်
                </h2>
                <div className="flex gap-1 text-slate-400">
                   {!user && <span className="text-[10px] animate-pulse">Connecting...</span>}
                </div>
              </div>
              
              <form onSubmit={addKeywordsBulk} className="flex flex-col gap-2 mb-6">
                <textarea
                  value={newKeywordsArea}
                  onChange={(e) => setNewKeywordsArea(e.target.value)}
                  placeholder="စာလုံးများကို တစ်ကြောင်းချင်းစီ ရိုက်ထည့်ပါ...&#10;ဥပမာ- သာရိပုတ္တရာထေရ်|အရှင်သာရိပုတ္တရာ"
                  className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm bg-slate-50"
                />
                <button 
                  type="submit"
                  disabled={!user}
                  className="bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98]"
                >
                  <Plus size={18} /> စာရင်းထဲသို့ ထည့်မည်
                </button>
              </form>

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">သိမ်းဆည်းထားသော စာလုံးများ ({keywords.length})</p>
                </div>
                {keywords.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8 italic bg-slate-50 rounded-lg">စာရင်းမရှိသေးပါ</p>
                ) : (
                  keywords.sort((a,b) => b.createdAt - a.createdAt).map((k) => (
                    <div key={k.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg group border border-transparent hover:border-indigo-100 hover:bg-indigo-50 transition-all">
                      {editingId === k.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => saveEdit(k.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(k.id)}
                            className="flex-1 text-sm border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{k.word}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {setEditingId(k.id); setEditingValue(k.word);}} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={14}/></button>
                            <button onClick={() => deleteKeyword(k.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {view === 'input' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[550px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <Edit3 size={20} className="text-indigo-500" />
                    ဆောင်းပါးစာသားထည့်ပါ
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full border border-red-100">
                      <Trash size={12} /> Auto-Clean Citations
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-600 bg-green-50 px-2.5 py-1.5 rounded-full border border-green-100">
                      <ShieldCheck size={12} /> Smart Protection
                    </span>
                  </div>
                </div>
                <textarea
                  className="w-full h-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4 flex-1 text-lg leading-relaxed bg-slate-50 placeholder:text-slate-300"
                  placeholder="ဒီမှာ စာသားများကို ရိုက်ထည့်ပါ..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                ></textarea>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 mb-4">
                  <p className="font-bold mb-1 flex items-center gap-1.5"><ShieldCheck size={14}/> လုပ်ဆောင်ချက်များ:</p>
                  <ul className="list-disc ml-5 space-y-0.5">
                    <li><code>[၁၈၁၊ ၁၈၂]</code> ကဲ့သို့သော ကိုးကားနံပါတ် အများအပြားပါသည်များကိုပါ ဖျက်ထုတ်ပေးပါမည်။</li>
                    <li><code>အမည်ရင်း|အမည်ကွဲ</code> ပုံစံဖြင့် Keywords ထည့်ပါက လင့်များကို နီးစပ်ရာစာသားဖြင့် ချိတ်ပေးပါမည်။</li>
                    <li>မူရင်းတွင် လင့်ချိတ်ပြီးသား စာလုံးများကို ကျော်သွားပါမည်။</li>
                  </ul>
                </div>
                <button
                  onClick={processToLinks}
                  disabled={!inputText || keywords.length === 0}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition-all shadow-lg shadow-indigo-100 active:scale-[0.99]"
                >
                  စတင်ပြင်ဆင်မည်
                </button>
              </div>
            )}

            {view === 'review' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <History size={20} className="text-amber-500" />
                    ရလဒ်ကို စစ်ဆေးပါ
                  </h2>
                  <button onClick={() => setView('input')} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                   <p className="text-lg leading-loose whitespace-pre-wrap text-slate-700">
                    {inputText.split('').map((char, i) => {
                      const link = processedLinks.find(l => l.index === i);
                      if (link) {
                        return (
                          <span 
                            key={link.id} 
                            onClick={() => toggleLink(link.id)}
                            className={`cursor-pointer px-1.5 py-0.5 rounded transition-all font-bold select-none ${
                              link.active 
                                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-700' 
                                : 'text-slate-300 line-through decoration-slate-400'
                            }`}
                          >
                            {link.active 
                              ? (link.target !== link.display ? `[[${link.target}|${link.display}]]` : `[[${link.display}]]`)
                              : link.display
                            }
                          </span>
                        );
                      }
                      const isInsideLink = processedLinks.some(l => i > l.index && i < l.index + l.display.length);
                      return isInsideLink ? null : char;
                    })}
                   </p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setView('input')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all border border-slate-200">
                    ပြန်ပြင်မည်
                  </button>
                  <button onClick={() => setView('final')} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    အတည်ပြုမည်
                  </button>
                </div>
              </div>
            )}

            {view === 'final' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-green-600">
                    <Check size={20} />
                    အဆင်သင့်ဖြစ်ပါပြီ
                  </h2>
                  <button onClick={() => setView('input')} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="relative group">
                  <textarea
                    readOnly
                    className="w-full h-[450px] p-6 bg-slate-900 text-indigo-100 border border-slate-800 rounded-xl font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                    value={generateFinalText()}
                  ></textarea>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-4 right-4 bg-indigo-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                  >
                    {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                    {copySuccess ? 'Copied!' : 'Copy Result'}
                  </button>
                </div>

                <button
                  onClick={() => { setInputText(''); setView('input'); }}
                  className="w-full mt-6 bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  အသစ်တစ်ခု ထပ်လုပ်မည်
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}