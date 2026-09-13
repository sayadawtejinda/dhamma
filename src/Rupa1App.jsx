import React, { useState, useEffect } from 'react';
import { 
  Eye, Ear, Mountain, Droplets, Flame, Wind, Palette, 
  Flower2, Utensils, Wheat, Activity, User, Heart, Cloud, 
  Sun, Apple, X, Info, Brain, Target, Zap, Layers, ChevronDown, ChevronUp,
  Maximize, Minimize, RefreshCcw, Timer, ActivitySquare, BookOpen, ExternalLink
} from 'lucide-react';

// --- ရုပ် (၂၈) ပါး အသေးစိတ် အချက်အလက်များ (Rupa 28 Details) ---
const rupa28 = {
  pathavi: { 
    id: 1, name: 'ပထဝီဓာတ်', icon: Mountain, color: 'text-amber-700', bg: 'bg-amber-100',
    lakkhana: 'ခက်မာခြင်း ( = တောင့်မာခြင်း, ခိုင်မာခြင်း) သဘော',
    rasa: 'မိမိမှကြွင်းသော ကလာပ်တူ ရုပ်တရားတို့၏ တည်ရာဖြစ်ခြင်း',
    paccupatthana: 'မိမိမှကြွင်းသော ကလာပ်တူ ရုပ်တရားတို့ကို အောက်က ခံထားတတ်သော သဘောတရား',
    padatthana: 'မိမိမှကြွင်းသော ကလာပ်တူ ဓာတ် (၃)ပါး'
  },
  apo: { 
    id: 2, name: 'အာပေါဓာတ်', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100',
    lakkhana: 'ယိုစီးခြင်းသဘော',
    rasa: 'အတူဖြစ်သော ရုပ်တရားတို့ကို တိုးပွားစေခြင်း',
    paccupatthana: 'ကလာပ်တူ ရုပ်တရားတို့ကို ဖွဲ့စည်းခြင်းသဘောတရား',
    padatthana: 'မိမိမှ ကြွင်းသော ကလာပ်တူ ဓာတ် (၃)ပါး'
  },
  tejo: { 
    id: 3, name: 'တေဇောဓာတ်', icon: Flame, color: 'text-red-600', bg: 'bg-red-100',
    lakkhana: 'ပူမှုသဘော (အေးမှုသဘော)',
    rasa: 'ကလာပ်တူ ရုပ်တရားတို့ကို ရင့်ကျက်စေခြင်း',
    paccupatthana: 'ကလာပ်တူ ရုပ်တရားတို့ကို နူးညံ့အောင် လျော်စွာ ပြုပြင်ပေးတတ်သော သဘောတရား',
    padatthana: 'မိမိမှကြွင်းသော ကလာပ်တူ ဓာတ် (၃)ပါး'
  },
  vayo: { 
    id: 4, name: 'ဝါယောဓာတ်', icon: Wind, color: 'text-teal-600', bg: 'bg-teal-100',
    lakkhana: 'ထောက်ကန်မှုသဘော (တောင့်မာစေမှုသဘော)',
    rasa: 'တွန်းကန်ခြင်း (ရွေ့ရှားစေခြင်း)',
    paccupatthana: 'အတူဖြစ်သော ရုပ်တရားတို့ကို တစ်နေရာမှ တစ်နေရာသို့ ရှေးရှူ သယ်ဆောင်ပေးတတ်သော သဘောတရား',
    padatthana: 'မိမိမှကြွင်းသော ကလာပ်တူ ဓာတ် (၃)ပါး'
  },
  cakkhu: { 
    id: 5, name: 'စက္ခုပသာဒ', icon: Eye, color: 'text-blue-700', bg: 'bg-blue-200',
    lakkhana: 'ရူပါရုံကို မြင်တွေ့လိုသော ရူပတဏှာလျှင် အကြောင်းရင်းခံ ရှိသော ကံကြောင့် ဖြစ်သော မဟာဘုတ်တို့ကို ကြည်လင်စေခြင်းသဘော',
    rasa: 'ရူပါရုံတို့၌ (ရူပါရုံတို့ဘက်သို့) ပုဂ္ဂိုလ်ကိုလည်းကောင်း, ဝီထိစိတ်အစဉ်ကိုလည်းကောင်း ဆွဲဆောင်သွားခြင်း',
    paccupatthana: 'စက္ခုဝိညာဏ်၏ တည်ရာဖြစ်ခြင်း သဘောတရား',
    padatthana: 'ရူပါရုံကို မြင်တွေ့လိုသော ရူပတဏှာလျှင် အကြောင်းရင်းခံ ရှိသော ကံကြောင့် ဖြစ်သော (စက္ခုပသာဒ၏ မှီရာ) ကလာပ်တူ မဟာဘုတ်'
  },
  sota: { 
    id: 6, name: 'သောတပသာဒ', icon: Ear, color: 'text-amber-700', bg: 'bg-amber-200',
    lakkhana: 'သဒ္ဒါရုံကို ကြားလိုသော သဒ္ဒတဏှာလျှင် အကြောင်းရင်းခံရှိသော ကံကြောင့် ဖြစ်သော မဟာဘုတ်တို့ကို ကြည်လင်စေခြင်းသဘော',
    rasa: 'သဒ္ဒါရုံတို့၌ (သဒ္ဒါရုံတို့ဘက်သို့) ဝီထိစိတ်အစဉ်ကို ဆွဲဆောင်သွားခြင်း',
    paccupatthana: 'သောတဝိညာဏ်၏ တည်ရာဖြစ်ခြင်းသဘောတရား',
    padatthana: 'သဒ္ဒါရုံကိုကြားလိုသော သဒ္ဒတဏှာလျှင် အကြောင်းရင်းခံရှိသော ကံကြောင့်ဖြစ်သော (သောတပသာဒ၏မှီရာ) မဟာဘုတ်'
  },
  ghana: { 
    id: 7, name: 'ဃာနပသာဒ', icon: Flower2, color: 'text-pink-700', bg: 'bg-pink-200',
    lakkhana: 'ဂန္ဓာရုံကို နမ်းရှူလိုသော ဂန္ဓတဏှာလျှင် အကြောင်းရင်းခံရှိသောကံကြောင့် ဖြစ်သော မဟာဘုတ်တို့ကို ကြည်လင်စေခြင်းသဘော',
    rasa: 'ဂန္ဓာရုံတို့၌ (ဂန္ဓာရုံတို့ဘက်သို့) ဝီထိစိတ်အစဉ်ကို ဆွဲဆောင်သွားခြင်း',
    paccupatthana: 'ဃာနဝိညာဏ်၏ တည်ရာဖြစ်ခြင်းသဘောတရား',
    padatthana: 'ဂန္ဓာရုံကို နမ်းရှူလိုသော ဂန္ဓတဏှာလျှင် အကြောင်းရင်းခံရှိသော ကံကြောင့်ဖြစ်သော (ဃာနပသာဒ၏မှီရာ) မဟာဘုတ်'
  },
  jivha: { 
    id: 8, name: 'ဇိဝှါပသာဒ', icon: Utensils, color: 'text-orange-700', bg: 'bg-orange-200',
    lakkhana: 'ရသာရုံကို လျက်လို စားလို သောက်လိုသော ရသတဏှာလျှင် အကြောင်းရင်းခံရှိသောကံကြောင့် ဖြစ်သော မဟာဘုတ်တို့ကို ကြည်လင်စေခြင်းသဘော',
    rasa: 'ရသာရုံတို့၌ (ရသာရုံတို့ဘက်သို့) ဝီထိစိတ်အစဉ်ကို ဆွဲဆောင်သွားခြင်း',
    paccupatthana: 'ဇိဝှါဝိညာဏ်၏ တည်ရာဖြစ်ခြင်းသဘောတရား',
    padatthana: 'ရသာရုံကို လျက်လို စားလို သောက်လိုသော ရသတဏှာလျှင် အကြောင်းရင်းခံရှိသောကံကြောင့် ဖြစ်သော (ဇိဝှါပသာဒ၏ မှီရာ) မဟာဘုတ်'
  },
  kaya: { 
    id: 9, name: 'ကာယပသာဒ', icon: User, color: 'text-emerald-700', bg: 'bg-emerald-200',
    lakkhana: 'ဖောဋ္ဌဗ္ဗာရုံကို တွေ့ထိလိုသော ဖောဋ္ဌဗ္ဗတဏှာလျှင် အကြောင်းရင်းခံရှိသောကံကြောင့် ဖြစ်သော မဟာဘုတ်တို့ကို ကြည်လင်စေခြင်းသဘော',
    rasa: 'ဖောဋ္ဌဗ္ဗာရုံတို့၌ (ဖောဋ္ဌဗ္ဗာရုံတို့ဘက်သို့) ဝီထိစိတ်အစဉ်ကို ဆွဲဆောင်သွားခြင်း',
    paccupatthana: 'ကာယဝိညာဏ်၏ တည်ရာဖြစ်ခြင်းသဘောတရား',
    padatthana: 'ဖောဋ္ဌဗ္ဗာရုံကို တွေ့ထိလိုသော ဖောဋ္ဌဗ္ဗတဏှာလျှင် အကြောင်းရင်းခံရှိသော ကံကြောင့်ဖြစ်သော (ကာယပသာဒ၏ မှီရာ) မဟာဘုတ်'
  },
  vanna: { 
    id: 10, name: 'ရူပါရုံ', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-100',
    lakkhana: 'စက္ခုပသာဒ၌ (ကို) ထိခိုက်ခြင်းသဘော (ရိုက်ခတ်ခြင်းသဘော)',
    rasa: 'စက္ခုဝိညာဏ်၏ အာရုံဖြစ်ခြင်း',
    paccupatthana: 'စက္ခုဝိညာဏ်၏ကျက်စားရာ အာရုံစားကျက်ဖြစ်ခြင်းသဘောတရား',
    padatthana: 'မိမိ (ရူပါရုံ)၏ မှီရာ ကလာပ်တူ မဟာဘုတ် (၄)ပါး'
  },
  sadda: { 
    id: 11, name: 'သဒ္ဒါရုံ', icon: Ear, color: 'text-teal-600', bg: 'bg-teal-200',
    lakkhana: 'သောတပသာဒ၌ (ကို) ထိခိုက်ခြင်း (ရိုက်ခတ်ခြင်း) သဘော',
    rasa: 'သောတဝိညာဏ်၏ အာရုံဖြစ်ခြင်း',
    paccupatthana: 'သောတဝိညာဏ်၏ ကျက်စားရာ အာရုံစားကျက်ဖြစ်ခြင်း သဘောတရား',
    padatthana: 'မိမိ (သဒ္ဒါရုံ)၏ မှီရာ ကလာပ်တူ မဟာဘုတ် (၄)ပါး'
  },
  gandha: { 
    id: 12, name: 'ဂန္ဓာရုံ', icon: Flower2, color: 'text-pink-600', bg: 'bg-pink-100',
    lakkhana: 'ဃာနပသာဒ၌ (ကို) ထိခိုက်ခြင်း (ရိုက်ခတ်ခြင်း) သဘော',
    rasa: 'ဃာနဝိညာဏ်၏ အာရုံဖြစ်ခြင်း',
    paccupatthana: 'ဃာနဝိညာဏ်၏ ကျက်စားရာ အာရုံစားကျက်ဖြစ်ခြင်း သဘောတရား',
    padatthana: 'မိမိ (ဂန္ဓာရုံ)၏မှီရာ ကလာပ်တူ မဟာဘုတ် (၄)ပါး'
  },
  rasa: { 
    id: 13, name: 'ရသာရုံ', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100',
    lakkhana: 'ဇိဝှါပသာဒ၌ (ကို) ထိခိုက်ခြင်း (ရိုက်ခတ်ခြင်း) သဘော',
    rasa: 'ဇိဝှါဝိညာဏ်၏ အာရုံဖြစ်ခြင်း',
    paccupatthana: 'ဇိဝှါဝိညာဏ်၏ ကျက်စားရာ အာရုံစားကျက်ဖြစ်ခြင်း သဘောတရား',
    padatthana: 'မိမိ (ရသာရုံ)၏ မှီရာ ကလာပ်တူ မဟာဘုတ် (၄)ပါး'
  },
  itthi: { 
    id: 14, name: 'ဣတ္ထိဘာဝရုပ်', icon: Heart, color: 'text-fuchsia-700', bg: 'bg-fuchsia-200',
    lakkhana: 'အမျိုးသ္မီး ဖြစ်ကြောင်းသဘော',
    rasa: 'ဤသူကား အမျိုးသ္မီးဟု ထင်ရှားပြခြင်း',
    paccupatthana: 'အမျိုးသ္မီး အသွင်သဏ္ဌာန်, အမှတ်အသား, အပြုအမူ, အသွင်အပြင်တို့၏အကြောင်းဖြစ်ခြင်း သဘောတရား',
    padatthana: 'ဣတ္ထိန္ဒြေ၏မှီရာ ကလာပ်တူ ကမ္မဇမဟာဘုတ်'
  },
  pum: { 
    id: 15, name: 'ပုမ္ဘာဝရုပ်', icon: Zap, color: 'text-indigo-700', bg: 'bg-indigo-200',
    lakkhana: 'အမျိုးသားဖြစ်ကြောင်းသဘော',
    rasa: 'ဤသူကား အမျိုးသားဟု ထင်ရှားပြခြင်း',
    paccupatthana: 'အမျိုးသား အသွင်သဏ္ဌာန်, အမှတ်အသား, အပြုအမူ, အသွင်အပြင်တို့၏အကြောင်းဖြစ်ခြင်း သဘောတရား',
    padatthana: 'ပုရိသိန္ဒြေ၏မှီရာ ကမ္မဇမဟာဘုတ်'
  },
  jivita: { 
    id: 16, name: 'ဇီဝိတရုပ်', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-100',
    lakkhana: 'အတူဖြစ်သော ကလာပ်တူ ကမ္မဇရုပ်တို့ကို စောင့်ရှောက်ခြင်းသဘော',
    rasa: 'ထိုကလာပ်တူ ကမ္မဇရုပ်တို့ကို ဥပါဒ်မှသည် ဘင်သို့တိုင်အောင် ဖြစ်စေခြင်း (အသက်ရှည်စေခြင်း)',
    paccupatthana: 'ထိုကလာပ်တူ ကမ္မဇရုပ်တို့ကို ဘင်မတိုင်မီ အသက်ရှည်အောင် တည်အောင် ထားတတ်သော သဘောတရား',
    padatthana: 'မိမိသည် ဖြစ်စေအပ် မျှစေအပ် အသက်ရှည်စေအပ်သော ကလာပ်တူ ကမ္မဇမဟာဘုတ်'
  },
  hadaya: { 
    id: 17, name: 'ဟဒယဝတ္ထု', icon: Brain, color: 'text-red-700', bg: 'bg-red-200',
    lakkhana: 'မနောဓာတ် + မနောဝိညာဏဓာတ်တို့၏ မှီရာဖြစ်ခြင်းသဘော',
    rasa: 'ထိုဓာတ်နှစ်ပါးတို့၏သာလျှင် တည်ရာဖြစ်ခြင်း',
    paccupatthana: 'ထိုဓာတ်နှစ်ပါးတို့ကို ထမ်းဆောင်ထားတတ်သော သဘောတရား',
    padatthana: 'မိမိ (ဟဒယဝတ္ထု)၏ မှီရာ ကလာပ်တူ ကမ္မဇမဟာဘုတ်'
  },
  oja: { 
    id: 18, name: 'ကဗဠီကာရ အာဟာရ (ဩဇာ)', icon: Wheat, color: 'text-green-600', bg: 'bg-green-100',
    lakkhana: 'စားမျိုအပ်သော အစာအာဟာရ၏ အဆီအစေး ဩဇာသဘော',
    rasa: 'အာဟာရဇရုပ်ကို ဆောင်ခြင်း တည်စေခြင်း',
    paccupatthana: 'အာဟာရဇရုပ်ကို ဖြစ်စေခြင်းဖြင့် ရူပကာယကို ထောက်ပံ့ခိုင်ခံ့စေတတ်သော သဘောတရား',
    padatthana: 'စားမျိုအပ်သော အစာအာဟာရ'
  },
  akasa: {
    id: 19, name: 'အာကာသဓာတ်', icon: Maximize, color: 'text-slate-600', bg: 'bg-slate-200',
    lakkhana: 'ရုပ်ကလာပ်တို့ကို ပိုင်းခြားတတ်သောသဘော',
    rasa: 'ရုပ်ကလာပ်တို့၏ အဆုံးအပိုင်းအခြားကို ထင်ရှားပြခြင်း',
    paccupatthana: 'ရုပ်ကလာပ်တို့၏ နယ်ခြားဒေသ သဘောတရား (မဟာဘုတ်တို့၏ မထိအပ်သည်၏အဖြစ်၊ အပေါက်အကြား၏အဖြစ်)',
    padatthana: 'အပိုင်းခြားခံရသော ရုပ်ကလာပ်များ'
  },
  kayaVinnatti: { 
    id: 20, name: 'ကာယဝိညတ်', icon: ActivitySquare, color: 'text-violet-600', bg: 'bg-violet-200',
    lakkhana: 'ရှေ့သို့တက်ခြင်းစသည်ကို ဖြစ်စေတတ်သော စိတ္တဇဝါယောဓာတ်၏ အတူဖြစ်သော ရူပကာယကို ထောက်ပံ့ခိုင်ခံ့စေခြင်း၊ လှုပ်ရှားစေခြင်း၏အကြောင်းဖြစ်သော အမူအရာ အထူးသဘော',
    rasa: 'လှုပ်ရှားသောသူ၏ အတွင်းသဘော အလိုဆန္ဒကို သူတစ်ပါးအား ထင်ရှားပြခြင်း',
    paccupatthana: 'ကိုယ်တုန်လှုပ်ခြင်း၏ အကြောင်းဖြစ်ခြင်း သဘောတရား',
    padatthana: 'စိတ်ကြောင့်ဖြစ်သော စိတ္တဇဝါယောဓာတ်'
  },
  vaciVinnatti: { 
    id: 21, name: 'ဝစီဝိညတ်', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-200',
    lakkhana: 'စကားသံအထူးကို ဖြစ်စေတတ်သော, စကားသံဖြစ်ရာဌာန၌ တည်သော ကမ္မဇပထဝီဓာတ်ကို ထိခိုက်ခြင်း၏ အကြောင်းဖြစ်သော ထူးခြားသောအမူအရာသဘော',
    rasa: 'စကားပြောဆိုသူ၏ အတွင်းသဘော အလိုဆန္ဒကို သူတစ်ပါးအား ထင်ရှားပြခြင်း',
    paccupatthana: 'စကားသံဖြစ်ပေါ်ခြင်း၏ အကြောင်းဖြစ်ခြင်း သဘောတရား',
    padatthana: 'စိတ်ကြောင့်ဖြစ်သော စိတ္တဇပထဝီဓာတ်'
  },
  lahuta: { 
    id: 22, name: 'လဟုတာ', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'ရုပ်အစစ်တို့၏ မလေးမလံ မနှေးကံမှုသဘော (ပေါ့ပါးမှုသဘော)',
    rasa: 'ထိုရုပ်တို့၏ လေးလံမှုကို ပယ်ဖျောက်ခြင်း',
    paccupatthana: 'ထိုရုပ်တို့၏ ပေါ့ပေါ့ပါးပါး လျင်လျင်မြန်မြန် ပြောင်းရွှေ့ပြန်လှန်၍ ဖြစ်ခြင်းသဘောတရား',
    padatthana: 'ပေါ့ပါးသော ထိုရုပ်များ'
  },
  muduta: { 
    id: 23, name: 'မုဒုတာ', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'ရုပ်အစစ်တို့၏ မခက်ထန် မကြမ်းတမ်းမှုသဘော (နူးညံ့မှုသဘော)',
    rasa: 'ထိုရုပ်တို့၏ ခက်ထန်ကြမ်းတမ်းမှုကို ပယ်ဖျောက်ခြင်း',
    paccupatthana: 'အလုံးစုံသော ကိုယ်မှုကိစ္စတို့၌ မဆန့်ကျင်သော သဘောတရား',
    padatthana: 'နူးညံ့သော ထိုရုပ်များ'
  },
  kammannata: { 
    id: 24, name: 'ကမ္မညတာ', icon: Target, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'ကိုယ်မှုကိစ္စတို့အားလျော်စွာ အမှု၌ ခံ့ညားမှု အချိုးကျ အဆင်ပြေမှုသဘော',
    rasa: 'ကိုယ်မှုကိစ္စ၌ မခံ့ညားမှုကို ပယ်ဖျောက်ခြင်း',
    paccupatthana: 'ရုပ်တို့၏ အားမနည်းသည့် သဘောတရား',
    padatthana: 'အမှု၌ ခံ့ညားသော ထိုရုပ်များ'
  },
  upacaya: {
    id: 25, name: 'ဥပစယ', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-100',
    lakkhana: 'ဘဝတစ်ခု၌ ရုပ်အစစ်တို့၏ ရှေးဦးအစ ဖြစ်ခြင်းသဘော',
    rasa: 'ဣန္ဒြေပြည့်စုံသည့်တိုင်အောင် အထက်အထက်၌ တိုးတက်၍ ဖြစ်ခြင်းသဘော',
    paccupatthana: 'ရုပ်တရားတို့ကို ပေါ်လာစေသကဲ့သို့ ဖြစ်ခြင်း',
    padatthana: 'ဖြစ်ဆဲရုပ်များ'
  },
  santati: {
    id: 26, name: 'သန္တတိ', icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-100',
    lakkhana: 'ဣန္ဒြေပြည့်စုံပြီးနောက် ရုပ်အစစ်တို့၏ ရှေ့နောက် အစဉ်မပြတ် ဆက်ကာ ဆက်ကာ ဖြစ်ခြင်းသဘော',
    rasa: 'ရှေ့နောက် အစဉ်မပြတ် အဆင့်ဆင့် ဖွဲ့စပ်ခြင်း',
    paccupatthana: 'အဆက်မပြတ် ဖြစ်တတ်သော သဘောတရား',
    padatthana: 'ရှေ့နောက် အစဉ်မပြတ် ဖွဲ့စပ်အပ်သကဲ့သို့ဖြစ်သော ရုပ်တရား'
  },
  jarata: {
    id: 27, name: 'ဇရတာ', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-100',
    lakkhana: 'ရုပ်အစစ်တို့၏ ရင့်ကျက်ခြင်း ဟောင်းခြင်းသဘော',
    rasa: 'ပျက်ခြင်း ဘင်သို့ ကပ်၍ဆောင်ခြင်း',
    paccupatthana: 'ဆိုင်ရာသဘာဝလက္ခဏာ မကင်းသေးသော်လည်း အသစ်၏ အဖြစ်မှ ကင်းခြင်းသဘောတရား',
    padatthana: 'ရင့်ကျက်ဆဲရုပ်များ'
  },
  aniccata: {
    id: 28, name: 'အနိစ္စတာ', icon: Minimize, color: 'text-red-500', bg: 'bg-red-100',
    lakkhana: 'ရုပ်အစစ်တို့၏ ထက်ဝန်းကျင်အားဖြင့် ပြိုပျက်ခြင်းသဘော',
    rasa: 'ရုပ်အစစ်တို့ကို နစ်မြုပ်စေခြင်း',
    paccupatthana: 'ရုပ်အစစ်တို့၏ ကုန်ခြင်း ပျက်ခြင်း သဘောတရား',
    padatthana: 'ထက်ဝန်းကျင်အားဖြင့် ပြိုပျက်ဆဲသော ရုပ်များ'
  }
};

const allRupasArray = Object.values(rupa28).sort((a, b) => a.id - b.id);

// --- အခြေခံရုပ်တရားများ စုစည်းမှု ---
const baseElements = [
  rupa28.pathavi, rupa28.apo, rupa28.tejo, rupa28.vayo, 
  rupa28.vanna, rupa28.gandha, rupa28.rasa, rupa28.oja
];

const lahutadiElements = [ rupa28.lahuta, rupa28.muduta, rupa28.kammannata ];

// --- အခြေခံ ကလာပ်များ (Common Kalapas) ---
const cittajaAtthaka = { id: 'cittaja', title: 'စိတ္တဇ သုဒ္ဓဋ္ဌကကလာပ်', count: 8, icon: Cloud, theme: 'from-orange-500 to-amber-400', elements: [...baseElements], originLink: 'cittaja' };
const utujaAtthaka = { id: 'utuja', title: 'ဥတုဇ သုဒ္ဓဋ္ဌကကလာပ်', count: 8, icon: Sun, theme: 'from-red-500 to-orange-400', elements: [...baseElements], originLink: 'utuja' };
const aharajaAtthaka = { id: 'aharaja', title: 'အာဟာရဇ သုဒ္ဓဋ္ဌကကလာပ်', count: 8, icon: Apple, theme: 'from-lime-500 to-green-400', elements: [...baseElements], originLink: 'aharaja' };
const jivitaNavaka = { id: 'jivita', title: 'ဇီဝိတနဝကကလာပ်', count: 9, icon: Activity, theme: 'from-violet-500 to-purple-400', elements: [...baseElements, rupa28.jivita] };
const kayaDasaka = { id: 'kaya', title: 'ကာယဒသကကလာပ်', count: 10, icon: User, theme: 'from-emerald-500 to-green-400', elements: [...baseElements, rupa28.jivita, rupa28.kaya] };
const bhavaDasaka = { id: 'bhava', title: 'ဘာဝဒသကကလာပ်', count: 10, icon: Heart, theme: 'from-pink-500 to-rose-400', elements: [...baseElements, rupa28.jivita, rupa28.itthi] }; // Default bhava is set to itthi here
const cittajaSaddaNavaka = { id: 'c7', title: 'အဿာသ ပဿာသ စိတ္တဇ သဒ္ဒ နဝက', count: 9, icon: Wind, theme: 'from-pink-500 to-fuchsia-400', elements: [...baseElements, rupa28.sadda] };

// --- ၄၂-ကောဋ္ဌာသအတွက် ရုပ်ကလာပ်စုများ ---
const kalapas53 = [kayaDasaka, bhavaDasaka, jivitaNavaka, cittajaAtthaka, utujaAtthaka, aharajaAtthaka]; // ၅၃ ပါး
const kalapas33 = [jivitaNavaka, cittajaAtthaka, utujaAtthaka, aharajaAtthaka]; // ၃၃ ပါး
const kalapas16 = [cittajaAtthaka, utujaAtthaka]; // ၁၆ ပါး
const kalapas8 = [utujaAtthaka]; // ၈ ပါး
const kalapas9_pacaka = [jivitaNavaka]; // ၉ ပါး (ပါစကတေဇော)
const kalapas9_vayo = [cittajaSaddaNavaka]; // ၉ ပါး (ဝင်သက်ထွက်သက်)

// --- ဒွါရ ၆-ပါး (Doors Data) ---
const doorsData = {
  eye: {
    title: 'စက္ခုဒွါရ (မျက်စိ) ၌ ဖြစ်သော ရုပ် ၆၃-ပါး',
    total: 63,
    kalapas: [
      { id: 'cakkhu', title: 'စက္ခုဒသကကလာပ်', count: 10, icon: Eye, theme: 'from-blue-500 to-cyan-400', elements: [...baseElements, rupa28.jivita, rupa28.cakkhu] },
      ...kalapas53
    ]
  },
  ear: {
    title: 'သောတဒွါရ (နား) ၌ ဖြစ်သော ရုပ် ၆၃-ပါး',
    total: 63,
    kalapas: [
      { id: 'sota', title: 'သောတဒသကကလာပ်', count: 10, icon: Ear, theme: 'from-amber-500 to-orange-400', elements: [...baseElements, rupa28.jivita, rupa28.sota] },
      ...kalapas53
    ]
  },
  nose: {
    title: 'ဃာနဒွါရ (နှာခေါင်း) ၌ ဖြစ်သော ရုပ် ၆၃-ပါး',
    total: 63,
    kalapas: [
      { id: 'ghana', title: 'ဃာနဒသကကလာပ်', count: 10, icon: Flower2, theme: 'from-fuchsia-500 to-pink-400', elements: [...baseElements, rupa28.jivita, rupa28.ghana] },
      ...kalapas53
    ]
  },
  tongue: {
    title: 'ဇိဝှါဒွါရ (လျှာ) ၌ ဖြစ်သော ရုပ် ၆၃-ပါး',
    total: 63,
    kalapas: [
      { id: 'jivha', title: 'ဇိဝှါဒသကကလာပ်', count: 10, icon: Utensils, theme: 'from-red-500 to-orange-500', elements: [...baseElements, rupa28.jivita, rupa28.jivha] },
      ...kalapas53
    ]
  },
  body: {
    title: 'ကာယဒွါရ (ကိုယ်) ၌ ဖြစ်သော ရုပ် ၅၃-ပါး',
    total: 53,
    kalapas: [...kalapas53]
  },
  mind: {
    title: 'မနောဒွါရ (နှလုံး) ၌ ဖြစ်သော ရုပ် ၆၃-ပါး',
    total: 63,
    kalapas: [
      { id: 'hadaya', title: 'ဟဒယဝတ္ထုဒသကကလာပ်', count: 10, icon: Brain, theme: 'from-rose-600 to-red-400', elements: [...baseElements, rupa28.jivita, rupa28.hadaya] },
      ...kalapas53
    ]
  }
};

// --- သမုဋ္ဌာန် ၄-ပါး (Origins Data) ---
const originsData = {
  kammaja: {
    title: 'ကမ္မဇရုပ်ကလာပ် (၉) မျိုး',
    total: 9,
    kalapas: [
      doorsData.eye.kalapas[0], doorsData.ear.kalapas[0], doorsData.nose.kalapas[0], doorsData.tongue.kalapas[0], 
      kayaDasaka,
      { id: 'itthi', title: 'ဣတ္ထိဘာဝဒသက ကလာပ်', count: 10, icon: Heart, theme: 'from-pink-500 to-rose-400', elements: [...baseElements, rupa28.jivita, rupa28.itthi] },
      { id: 'pum', title: 'ပုမ္ဘာဝဒသက ကလာပ်', count: 10, icon: Zap, theme: 'from-indigo-500 to-blue-400', elements: [...baseElements, rupa28.jivita, rupa28.pum] },
      doorsData.mind.kalapas[0], jivitaNavaka
    ]
  },
  cittaja: {
    title: 'စိတ္တဇရုပ်ကလာပ် (၈) မျိုး',
    total: 8,
    kalapas: [
      cittajaAtthaka,
      { id: 'c2', title: 'ကာယဝိညတ္တိ နဝက ကလာပ်', count: 9, icon: User, theme: 'from-orange-500 to-amber-400', elements: [...baseElements, rupa28.kayaVinnatti] },
      { id: 'c3', title: 'လဟုတာဒေကဒသက ကလာပ်', count: 11, icon: Wind, theme: 'from-amber-500 to-orange-400', elements: [...baseElements, ...lahutadiElements] },
      { id: 'c4', title: 'ကာယဝိညတ္တိ လဟုတာဒိဒွါဒသက', count: 12, icon: Target, theme: 'from-orange-600 to-red-400', elements: [...baseElements, rupa28.kayaVinnatti, ...lahutadiElements] },
      { id: 'c5', title: 'ဝစီဝိညတ္တိ ဒသက ကလာပ်', count: 10, icon: Activity, theme: 'from-red-500 to-rose-400', elements: [...baseElements, rupa28.vaciVinnatti, rupa28.sadda] },
      { id: 'c6', title: 'ဝစီဝိညတ္တိ သဒ္ဒ လဟုတာဒိ တေရသက', count: 13, icon: Ear, theme: 'from-rose-500 to-pink-500', elements: [...baseElements, rupa28.vaciVinnatti, ...lahutadiElements, rupa28.sadda] },
      cittajaSaddaNavaka,
      { id: 'c8', title: 'အဿာသ ပဿာသ စိတ္တဇ သဒ္ဒ လဟုတာဒိဒွါဒသက', count: 12, icon: Cloud, theme: 'from-fuchsia-500 to-purple-500', elements: [...baseElements, rupa28.sadda, ...lahutadiElements] },
    ]
  },
  utuja: {
    title: 'ဥတုဇရုပ်ကလာပ် (၄) မျိုး',
    total: 4,
    kalapas: [
      utujaAtthaka,
      { id: 'u2', title: 'ဥတုဇ သဒ္ဒ နဝက ကလာပ်', count: 9, icon: Ear, theme: 'from-orange-500 to-amber-500', elements: [...baseElements, rupa28.sadda] },
      { id: 'u3', title: 'လဟုတာဒေကဒသက ကလာပ်', count: 11, icon: Wind, theme: 'from-amber-500 to-yellow-500', elements: [...baseElements, ...lahutadiElements] },
      { id: 'u4', title: 'သဒ္ဒ လဟုတာဒိဒွါဒသက ကလာပ်', count: 12, icon: Cloud, theme: 'from-yellow-500 to-lime-500', elements: [...baseElements, rupa28.sadda, ...lahutadiElements] },
    ]
  },
  aharaja: {
    title: 'အာဟာရဇရုပ်ကလာပ် (၂) မျိုး',
    total: 2,
    kalapas: [
      aharajaAtthaka,
      { id: 'a2', title: 'လဟုတာဒေကဒသက ကလာပ်', count: 11, icon: Wind, theme: 'from-green-500 to-emerald-400', elements: [...baseElements, ...lahutadiElements] },
    ]
  }
};

// --- ၄၂-ကောဋ္ဌာသ (42 Kotthasa Data) ---
const kotthasaData = {
  pathavi: {
    title: 'ပထဝီကောဋ္ဌာသ (၂၀)',
    total: 20,
    items: [
      { id: 'p1', name: 'ဆံပင်', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p2', name: 'အမွေး', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p3', name: 'လက်သည်း၊ ခြေသည်း', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p4', name: 'သွား', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p5', name: 'အရေ', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p6', name: 'အသား', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p7', name: 'အကြော', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p8', name: 'အရိုး', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p9', name: 'ရိုးတွင်းခြင်ဆီ', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p10', name: 'ကျောက်ကပ်', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p11', name: 'နှလုံး', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p12', name: 'အသည်း', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p13', name: 'အမြှေး', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p14', name: 'အဖျဉ်း', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p15', name: 'အဆုတ်', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p16', name: 'အူမ', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p17', name: 'အူသိမ်', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p18', name: 'အစာသစ်', count: 8, kalapas: kalapas8, icon: Wheat, desc: 'ဥတုဇဩဇဋ္ဌမကရုပ် (၈) မျိုးသာ ရှိ၏။' },
      { id: 'p19', name: 'အစာဟောင်း', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'ဥတုဇဩဇဋ္ဌမကရုပ် (၈) မျိုးသာ ရှိ၏။' },
      { id: 'p20', name: 'ဦးနှောက်', count: 53, kalapas: kalapas53, icon: Brain },
    ]
  },
  apo: {
    title: 'အာပေါကောဋ္ဌာသ (၁၂)',
    total: 12,
    items: [
      { id: 'ap1', name: 'သည်းခြေ', count: 53, kalapas: kalapas53, icon: Droplets, desc: 'ဗဒ္ဓသည်းခြေ၊ အဗဒ္ဓသည်းခြေ နှစ်မျိုးလုံး၌ (၅၃) မျိုး ရှိ၏။' },
      { id: 'ap2', name: 'သလိပ်', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap3', name: 'ပြည်', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'ဥတုဇဩဇဋ္ဌမကရုပ် (၈) မျိုးသာ ရှိ၏။' },
      { id: 'ap4', name: 'သွေး', count: 53, kalapas: kalapas53, icon: Droplets, desc: 'သန္နိစိတလောဟိတ၊ သံသရဏလောဟိတ နှစ်မျိုးလုံး၌ (၅၃) မျိုး ရှိ၏။' },
      { id: 'ap5', name: 'ချွေး', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'စိတ္တဇ (၈) + ဥတုဇ (၈) = ၁၆ မျိုး ရှိ၏။' },
      { id: 'ap6', name: 'အဆီခဲ', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap7', name: 'မျက်ရည်', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'စိတ္တဇ (၈) + ဥတုဇ (၈) = ၁၆ မျိုး ရှိ၏။' },
      { id: 'ap8', name: 'ဆီကြည်', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap9', name: 'တံတွေး', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'စိတ္တဇ (၈) + ဥတုဇ (၈) = ၁၆ မျိုး ရှိ၏။' },
      { id: 'ap10', name: 'နှပ်', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'စိတ္တဇ (၈) + ဥတုဇ (၈) = ၁၆ မျိုး ရှိ၏။' },
      { id: 'ap11', name: 'အစေး / အစစ်', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap12', name: 'ကျင်ငယ်', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'ဥတုဇဩဇဋ္ဌမကရုပ် (၈) မျိုးသာ ရှိ၏။' },
    ]
  },
  tejo: {
    title: 'တေဇောကောဋ္ဌာသ (၄)',
    total: 4,
    items: [
      { id: 't1', name: 'သန္တပ္ပနတေဇော', count: 33, kalapas: kalapas33, icon: Flame, desc: 'ပြင်းစွာပူလောင်သော တေဇော' },
      { id: 't2', name: 'ဍာဟတေဇော', count: 33, kalapas: kalapas33, icon: Flame, desc: 'အလွန့်အလွန် ပြင်းထန်စွာ ထက်ဝန်းကျင် ပူလောင်သော တေဇော' },
      { id: 't3', name: 'ဇီရဏတေဇော', count: 33, kalapas: kalapas33, icon: Flame, desc: 'အိုစေ, ရင့်ကျက်စေ, ဆွေးမြည့်စေသော တေဇော' },
      { id: 't4', name: 'ပါစကတေဇော', count: 9, kalapas: kalapas9_pacaka, icon: Flame, desc: 'အစာကိုကြေကျက်စေသော တေဇော (ဇီဝိတနဝကကလာပ်)' },
    ]
  },
  vayo: {
    title: 'ဝါယောကောဋ္ဌာသ (၆)',
    total: 6,
    items: [
      { id: 'v1', name: 'ဥဒ္ဓင်္ဂမဝါတာ', count: 33, kalapas: kalapas33, icon: Wind, desc: 'အထက်သို့ ဆန်တက်သောလေ' },
      { id: 'v2', name: 'အဓောဂမဝါတာ', count: 33, kalapas: kalapas33, icon: Wind, desc: 'အောက်သို့ စုန်ဆင်းသောလေ' },
      { id: 'v3', name: 'ကုစ္ဆိသယဝါတာ', count: 33, kalapas: kalapas33, icon: Wind, desc: 'ဝမ်းဗိုက်အတွင်း အူ၏ အပြင်ဘက်၌ တည်ရှိသောလေ' },
      { id: 'v4', name: 'ကောဋ္ဌာသယဝါတာ', count: 33, kalapas: kalapas33, icon: Wind, desc: 'အူအတွင်း၌ တည်ရှိသောလေ' },
      { id: 'v5', name: 'အင်္ဂမင်္ဂါနုသာရိနောဝါတာ', count: 33, kalapas: kalapas33, icon: Wind, desc: 'ကိုယ်အင်္ဂါကြီးငယ်သို့ အစဉ်လျှောက်သော အကြောအတွင်း၌ တည်ရှိသောလေ' },
      { id: 'v6', name: 'အဿာသပဿာသောဝါတာ', count: 9, kalapas: kalapas9_vayo, icon: Wind, desc: 'ဝင်သက်လေ-ထွက်သက်လေ' },
    ]
  }
};


// --- Navigation Tabs ---
const navigationTabs = [
  { id: 'doors', name: 'ဒွါရ (၆) ပါး', icon: Eye, activeClass: 'bg-white text-blue-700 shadow-sm border-blue-200', inactiveClass: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-transparent' },
  { id: 'kotthasa', name: '၄၂-ကောဋ္ဌာသ', icon: Layers, activeClass: 'bg-white text-emerald-700 shadow-sm border-emerald-200', inactiveClass: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border-transparent' },
  { id: 'origins', name: 'သမုဋ္ဌာန် (၄) ပါး', icon: Sun, activeClass: 'bg-white text-amber-600 shadow-sm border-amber-200', inactiveClass: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 border-transparent' },
  { id: 'rupa28', name: 'ရုပ် (၂၈) ပါး', icon: BookOpen, activeClass: 'bg-white text-indigo-700 shadow-sm border-indigo-200', inactiveClass: 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent' },
  ];

const doorSubTabs = [
  { id: 'eye', name: 'စက္ခု (မျက်စိ)', icon: Eye, activeClass: 'bg-blue-500 text-white border-blue-600', inactiveClass: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { id: 'ear', name: 'သောတ (နား)', icon: Ear, activeClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'nose', name: 'ဃာန (နှာခေါင်း)', icon: Flower2, activeClass: 'bg-pink-500 text-white border-pink-600', inactiveClass: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { id: 'tongue', name: 'ဇိဝှါ (လျှာ)', icon: Utensils, activeClass: 'bg-red-500 text-white border-red-600', inactiveClass: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200' },
  { id: 'body', name: 'ကာယ (ကိုယ်)', icon: User, activeClass: 'bg-emerald-500 text-white border-emerald-600', inactiveClass: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { id: 'mind', name: 'မနော (နှလုံး)', icon: Brain, activeClass: 'bg-rose-500 text-white border-rose-600', inactiveClass: 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200' },
];

const originSubTabs = [
  { id: 'kammaja', name: 'ကမ္မဇ (ကံကြောင့်)', icon: Heart, activeClass: 'bg-pink-500 text-white border-pink-600', inactiveClass: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { id: 'cittaja', name: 'စိတ္တဇ (စိတ်ကြောင့်)', icon: Cloud, activeClass: 'bg-sky-500 text-white border-sky-600', inactiveClass: 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200' },
  { id: 'utuja', name: 'ဥတုဇ (ဥတုကြောင့်)', icon: Sun, activeClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'aharaja', name: 'အာဟာရဇ (အာဟာရကြောင့်)', icon: Apple, activeClass: 'bg-lime-600 text-white border-lime-700', inactiveClass: 'text-lime-800 bg-lime-50 hover:bg-lime-100 border-lime-200' },
];

const kotthasaSubTabs = [
  { id: 'pathavi', name: 'ပထဝီ (၂၀)', icon: Mountain, activeClass: 'bg-amber-700 text-white border-amber-800', inactiveClass: 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'apo', name: 'အာပေါ (၁၂)', icon: Droplets, activeClass: 'bg-blue-600 text-white border-blue-700', inactiveClass: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { id: 'tejo', name: 'တေဇော (၄)', icon: Flame, activeClass: 'bg-red-600 text-white border-red-700', inactiveClass: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200' },
  { id: 'vayo', name: 'ဝါယော (၆)', icon: Wind, activeClass: 'bg-teal-600 text-white border-teal-700', inactiveClass: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200' },
];

export default function App({ initialPage = null, onPageChange = null } = {}) {
  // View state management
  const [activeTab, setActiveTab] = useState(() => initialPage?.activeTab ?? 'rupa28');
  const [activeDoor, setActiveDoor] = useState(() => initialPage?.activeDoor ?? 'eye');
  const [activeOrigin, setActiveOrigin] = useState(() => initialPage?.activeOrigin ?? 'kammaja');
  const [activeKotthasa, setActiveKotthasa] = useState(() => initialPage?.activeKotthasa ?? 'pathavi');

  // Reports the current top-level "page" (which of the 4 main tabs, and
  // which sub-tab within it) up to the language-switcher wrapper so it can
  // be fed back in as `initialPage` if the user switches language and lands
  // back on this same component (or the other language's sibling, seeded
  // with these language-neutral ids). See src/RupaApp.jsx.
  useEffect(() => {
    onPageChange?.({ activeTab, activeDoor, activeOrigin, activeKotthasa });
  }, [activeTab, activeDoor, activeOrigin, activeKotthasa]);

  const [activeKalapa, setActiveKalapa] = useState(null);
  const [activeKotthasaItem, setActiveKotthasaItem] = useState(null);
  const [activeRupaElement, setActiveRupaElement] = useState(null); // For detailed Rupa popup

  // Get current active data
  const subTabs = activeTab === 'doors' ? doorSubTabs : (activeTab === 'origins' ? originSubTabs : (activeTab === 'kotthasa' ? kotthasaSubTabs : []));
  const activeSubTab = activeTab === 'doors' ? activeDoor : (activeTab === 'origins' ? activeOrigin : activeKotthasa);
  const setActiveSubTab = activeTab === 'doors' ? setActiveDoor : (activeTab === 'origins' ? setActiveOrigin : setActiveKotthasa);

  const currentData = activeTab === 'doors' ? doorsData[activeDoor] : 
                     (activeTab === 'origins' ? originsData[activeOrigin] : (activeTab === 'kotthasa' ? kotthasaData[activeKotthasa] : null));

  // --- Rupa Detail Modal (လက္ခဏာ, ရသ, ပစ္စုပဋ္ဌာန်, ပဒဋ္ဌာန် ပြရန်) ---
  const RupaDetailModal = ({ rupa, onClose }) => {
    if (!rupa) return null;
    const Icon = rupa.icon;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="p-5 text-white bg-gradient-to-r from-indigo-600 to-blue-500 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icon size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{rupa.name}</h2>
                <p className="text-indigo-100 text-sm font-medium">အသေးစိတ် အချက်အလက်များ</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="ပိတ်မည်">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-5 bg-slate-50">
            {/* လက္ခဏာ */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
              <h3 className="text-blue-700 font-bold mb-2 flex items-center gap-2">
                <Target size={18} /> လက္ခဏာ (Lakkhana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.lakkhana}</p>
            </div>
            
            {/* ရသ */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
              <h3 className="text-amber-700 font-bold mb-2 flex items-center gap-2">
                <Activity size={18} /> ရသ (Rasa)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.rasa}</p>
            </div>

            {/* ပစ္စုပဋ္ဌာန် */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
              <h3 className="text-emerald-700 font-bold mb-2 flex items-center gap-2">
                <Eye size={18} /> ပစ္စုပဋ္ဌာန် (Paccupatthana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.paccupatthana}</p>
            </div>

            {/* ပဒဋ္ဌာန် */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-500">
              <h3 className="text-purple-700 font-bold mb-2 flex items-center gap-2">
                <Layers size={18} /> ပဒဋ္ဌာန် (Padatthana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.padatthana}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Kalapa Modal Component ---
  const Modal = ({ kalapa, onClose }) => {
    if (!kalapa) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className={`p-6 text-white bg-gradient-to-r ${kalapa.theme} flex justify-between items-start`}>
            <div>
              <h2 className="text-2xl font-bold mb-1">{kalapa.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="ပိတ်မည်">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <Info size={18} />
              <p className="text-sm">ဤကလာပ်တွင် ပါဝင်သောရုပ်တရားပေါင်း <strong>{kalapa.count}</strong> ပါး ရှိပါသည်။ အသေးစိတ်သိရန် ရုပ်တရားများကို နှိပ်ပါ။</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kalapa.elements.map((el, idx) => {
                const Icon = el.icon;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveRupaElement(el)}
                    className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group"
                  >
                    <div className={`w-12 h-12 rounded-full ${el.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={el.color} size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                        <span className="text-xs text-slate-400 w-4">{idx + 1}.</span> 
                        {el.name}
                      </div>
                      <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        လက္ခဏာစသည်ကို ကြည့်ရန် နှိပ်ပါ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Kotthasa Modal Component ---
  const KotthasaModal = ({ item, onClose }) => {
    if (!item) return null;
    const [expandedKalapa, setExpandedKalapa] = useState(null);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="p-6 text-white bg-gradient-to-r from-slate-800 to-slate-700 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={24} className="text-slate-300" />
                <h2 className="text-2xl font-bold">{item.name}</h2>
              </div>
              <p className="text-slate-300 text-sm font-medium">ရုပ်စုစုပေါင်း ({item.count}) ပါး</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="ပိတ်မည်">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {item.desc && (
              <div className="flex items-start gap-2 mb-4 text-blue-800 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <Info size={20} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{item.desc}</p>
              </div>
            )}
            
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Layers size={18} /> ပါဝင်သော ရုပ်ကလာပ်များ
            </h3>
            
            <div className="space-y-3">
              {item.kalapas.map((kalapa, index) => {
                const Icon = kalapa.icon;
                const isExpanded = expandedKalapa === index;
                
                return (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:border-slate-300">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedKalapa(isExpanded ? null : index)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${kalapa.theme} flex items-center justify-center text-white`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{kalapa.title}</h4>
                          <p className="text-xs text-slate-500">ရုပ် {kalapa.count} ပါး</p>
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kalapa.elements.map((el, elIdx) => (
                          <div 
                            key={elIdx} 
                            onClick={() => setActiveRupaElement(el)}
                            className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200 hover:text-blue-700"
                            title="အသေးစိတ်ကြည့်ရန် နှိပ်ပါ"
                          >
                            <el.icon size={14} className={el.color} />
                            <span className="font-medium">{el.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                <Brain size={28} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                ရုပ်တရားများ လေ့လာရန်
              </h1>
            </div>

            {/* Main Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-wrap justify-center sm:justify-end gap-1">
              {navigationTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                      isActive ? tab.activeClass : tab.inactiveClass
                    }`}
                  >
                    <Icon size={16} />
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Sub-tabs selection */}
          {subTabs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-6 pb-2 scrollbar-hide">
              {subTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border ${
                      isActive
                        ? `${tab.activeClass} shadow-md`
                        : tab.inactiveClass
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-bold text-sm">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              {activeTab === 'rupa28' ? 'ရုပ် (၂၈) ပါး အသေးစိတ်' : currentData?.title}
            </h2>
            <p className="text-slate-600 max-w-2xl text-sm sm:text-base font-medium">
              {activeTab === 'rupa28' 
                ? ''
                : (activeTab === 'kotthasa' 
                    ? ''
                    : '')
              }
            </p>
          </div>
          {activeTab !== 'rupa28' && currentData && (
            <div className="mt-4 sm:mt-0 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold shadow-sm border border-blue-200">
              စုစုပေါင်း အရေအတွက် : {currentData.total}
            </div>
          )}
        </div>

        {/* Dynamic Grid Rendering */}
        {activeTab === 'rupa28' ? (
          /* Rupa 28 Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allRupasArray.map((rupa) => {
              const Icon = rupa.icon;
              return (
                <div 
                  key={rupa.id}
                  onClick={() => setActiveRupaElement(rupa)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col items-center text-center hover:border-indigo-400"
                >
                  <div className={`w-14 h-14 rounded-full ${rupa.bg} transition-colors flex items-center justify-center group-hover:scale-110 duration-300 mb-3`}>
                    <Icon size={28} className={rupa.color} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">
                    {rupa.id}. {rupa.name}
                  </h3>
                  <div className="mt-3 text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-3 py-1 rounded-full">
                    အသေးစိတ် ကြည့်ရန်
                  </div>
                </div>
              )
            })}
          </div>
        ) : activeTab === 'kotthasa' ? (
          /* 42 Kotthasa Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentData.items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={`${item.id}-${index}`}
                  onClick={() => setActiveKotthasaItem(item)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col items-center text-center hover:border-blue-400"
                >
                  <div className={`w-14 h-14 rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors flex items-center justify-center text-slate-500 group-hover:text-blue-600 mb-3`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">{item.name}</h3>
                  
                  <div className="mt-auto inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    ရုပ် {item.count} ပါး
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Doors & Origins Kalapas Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentData.kalapas.map((kalapa, index) => {
              const Icon = kalapa.icon;
              return (
                <div 
                  key={`${kalapa.id}-${index}`}
                  onClick={() => setActiveKalapa(kalapa)}
                  className={`relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br ${kalapa.theme}`}
                >
                  <div className="absolute -right-6 -top-6 text-white/20 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                    <Icon size={120} strokeWidth={1} />
                  </div>
                  
                  {/* Origin Link Button */}
                  {kalapa.originLink && activeTab !== 'origins' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('origins');
                        setActiveOrigin(kalapa.originLink);
                      }}
                      className="absolute top-3 right-3 z-10 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center group/btn"
                      title="အခြား ဆက်စပ်သမုဋ္ဌာန်ရုပ်များ ဆက်ကြည့်ရန်"
                    >
                      <ExternalLink size={18} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                  )}

                  <div className="relative p-6 h-full flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1 leading-tight">{kalapa.title}</h3>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-sm">
                        ရုပ် {kalapa.count} ပါး
                      </span>
                      <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        ကြည့်မည် &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal kalapa={activeKalapa} onClose={() => setActiveKalapa(null)} />
      <KotthasaModal item={activeKotthasaItem} onClose={() => setActiveKotthasaItem(null)} />
      <RupaDetailModal rupa={activeRupaElement} onClose={() => setActiveRupaElement(null)} />

    </div>
  );
}