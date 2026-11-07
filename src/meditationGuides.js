// The guided meditations of the Shrine Room. To add one, add an entry to MEDITATION_GUIDES below -- nothing else needs touching:
//
//   id     a short unique word or number, never changed afterwards
//   title  the name shown in the drop-down list of the duration picker
//   audio  the recording file NAMES (the files live in the audio folder). Either language may be left out and added later:
//            { en: 'Ryan meditation 3.m4a', my: 'Ryan meditation 3 Myanmar.m4a' }   or   { en: 'Ryan meditation 3.m4a' }   or   {}
//   text   all the lines together, one line each, in pairs: a Myanmar line and its English line (either order is fine -- the
//          language is told by the letters). About 30 pairs for a 5-minute recording. Blank lines are ignored.
//
// While a recording plays, the line shown follows the recording (the lines are spread evenly over its length) and both repeat
// until the sit ends. With no recording for the chosen language, a new line appears every 9 seconds.
// The first entry is the one shown first; the others are chosen from the drop-down.

// Every sound file in the audio folder, found by its file name (no need to import each one by hand).
const AUDIO_FILES = import.meta.glob('../audio/*.{m4a,mp3,ogg,wav,aac}', { eager: true, query: '?url', import: 'default' });
export const audioUrlByName = (name) => (name ? AUDIO_FILES[`../audio/${name}`] || null : null);

const isMyanmar = (line) => /[\u1000-\u109F]/.test(line);
// "Myanmar line / English line" pairs -> [{ my, en }]
export const linesFromText = (text) => {
  const rows = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rows.length % 2) console.warn('Meditation text: an odd number of lines -- every Myanmar line needs its English line');
  const out = [];
  for (let i = 0; i + 1 < rows.length; i += 2) {
    const [a, b] = [rows[i], rows[i + 1]];
    out.push(isMyanmar(a) || !isMyanmar(b) ? { my: a, en: b } : { en: a, my: b });
  }
  return out;
};

export const MEDITATION_GUIDES = [
  {
    id: 1,
    title: 'Meditation 1',
    audio: { en: 'Ryan meditation 1.m4a' },
    text: `
တင်ပလ္လင်ခွေထိုင်ပါ။
Sit down comfortably with your legs crossed.
သက်တောင့် သက်သာ ခါးကို ဖြောင့်ထားပါ။
Keep your back straight and relaxed.
မျက်စိမှိတ်ထားပါ။
Gently close your eyes.
ဘာမှ မကြည့်ရ။
Don't look at anything around you.
ဘာမှ နားမထောင်ရ။
Don't listen to any sounds.
ဘာမှ မနမ်းရှူရ။
Don't focus on any smells.
ဘာမှ အရသာခံ မစားရ။
Don't taste anything.
ကြမ်းပြင်ကလွဲ၍ ဘာနဲ့မှ မထိရ။
Feel only the floor beneath you and nothing else.
အေးအေးဆေးဆေး အသက်ရှု။
Take slow, gentle breaths.
ခန္ဓာကိုယ်နေရာအနှံ့ကို ဖြေလျော့ပေးပါ။
Relax your whole body from head to toe.
မျက်နှာကို ဖြေလျော့ပါ။
Softly relax your face.
နဖူးကို ဖြေလျော့ပါ။
Smooth out your forehead and relax.
ပခုံးကို ဖြေလျော့ပါ။
Let your shoulders drop and loosen up.
ရင်ဘတ်ကို ဖြေလျော့ပါ။
Relax your chest.
တောင့်တောင့်တင်းတင်း မဖြစ်စေပါနဲ့။
Don't hold any tightness or tension.
လူရော စိတ်ရော အနားပေးပါ။
Give both your body and mind a peaceful rest.
တဖြည်းဖြည်း ငြိမ်လာတဲ့ထိ စောင့်ပေးပါ။
Wait patiently until everything feels quiet inside.
ဝင်လေ ထွက်လေကို အာရုံစူးစိုက်ပြီ စိတ်နဲ့ သိပေးနေပါ။
Focus on your breathing in and out, and gently notice each breath.
မျက်စိ မဖွင့်မိစေနဲ့။
Keep your eyes softly closed without opening them.
မျက်လုံးကိုပါ ငြိမ်အောင်လုပ်ပါ။
Let your eyes rest completely still behind your eyelids.
ဗုဒ္ဓရုပ်ပွားတော်လို ငြိမ်အောင် လေ့ကျင့်ပါ။
Practice sitting as peaceful and still as a Buddha statue.
မျောက်တစ်ကောင်လို စိတ်ကို မပြေးစေနဲ့။
Don't let your mind jump around like a playful little monkey.
စိတ်ငြိမ်ပြီ အေးသွားတဲ့ထိ လေ့ကျင့်ပါ။
Practice until your mind feels quiet, cool, and calm.
သင့်စိတ်ကို ဘယ်မှ မသွားရဘူးလို့ ပြောပါ။
Gently tell your mind to stay right here.
သင့်စိတ်ရဲ့ အရှင်သခင်ဖြစ်အောင် လုပ်ပါ။
Be the gentle master of your own thoughts.
လောကကြီးမှာ အေးချမ်းသူတွေ အများကြီးလိုတယ်။
The world needs many peaceful hearts.
ငါ့စိတ်အေးချမ်းအောင် ငါကြိုးစားမယ်။
I will do my best to bring peace to my own heart.
တရားထိုင်ဖို့ အချိန်ပြည့်သွားရင်လည်း ဖြည်းဖြည်းထပါ။
When your meditation time is finished, stand up very slowly.
ရင်ထဲက အေးနေတာကို မပျောက်စေနဲ့။
Keep that cool, gentle quietness inside your heart all day long.
`,
  },
  {
    id: 2,
    title: 'Meditation 2',
    audio: { en: 'Ryan meditation 2.m4a' },
    text: `
ငါ အေးချမ်းတဲ့သူတစ်ယောက် ဖြစ်ချင်တယ်။
I want to be a peaceful person.
စိတ်လေး ငြိမ်မှပဲ အေးချမ်းမှာပါ။
Only a calm mind brings peace.
စိတ်ငြိမ်ဖို့အတွက် စိတ်ကို အနားပေး ဖြေလျော့ဖို့ လိုတယ်။
To be calm, we need to relax our mind.
ခန္ဓာကိုယ်နဲ့ ကြွက်သားတွေကိုလည်း လျော့ပေးရမယ်။
We should relax our body, too.
ငါ့စိတ်ငြိမ်အောင် တခြားသူက လုပ်ပေးလို့ မရဘူး။
No one else can make my mind calm.
ငါ အေးချမ်းဖို့အတွက် ငါ့မှာပဲ တာဝန်ရှိတယ်။
I am responsible for my own peace.
ဘုရားရှင်လို အေးချမ်းချင်လို့ ဘုရားကို ကိုးကွယ်တာပါ။
I follow the Buddha because I want to be peaceful like Him.
ဘုရားရှင်ရဲ့ စိတ်တော်က တည်ငြိမ်ပြီး အေးချမ်းတယ်။
The Buddha’s mind is calm and peaceful.
ဝင်လေထွက်လေကို သတိထားကြည့်ရင် စိတ်တည်ငြိမ်လာမယ်။
Watching our breath can help us stay calm.
ဝင်လေထွက်လေကို ကြာကြာလေး စိုက်ကြည့်ပေးဖို့ လိုတယ်။
We need to watch our breath for a longer time.
တခြားအတွေးတွေ ရောမလာအောင် ဂရုစိုက်ရမယ်။
We should avoid getting distracted by other thoughts.
တည်ငြိမ်နေတဲ့ စိတ်လေးက နူးညံ့တယ်။
A calm mind is gentle.
တည်ငြိမ်နေတဲ့ စိတ်လေးက အေးချမ်းတယ်။
A calm mind is peaceful.
ပညာရှိတွေက ကိုယ့်စိတ်ကို ကိုယ်တိုင် ဆုံးမရမယ်လို့ ပြောကြတယ်။
Wise people say we must train our own mind.
စိတ်ငြိမ်အောင် ကျင့်ယူနေတာဟာ စိတ်ကို ဆုံးမနေတာပါပဲ။
Making our mind calm is training our mind.
ပညာသင်တာ ပိုက်ဆံရှာဖို့ တစ်ခုတည်းအတွက် မဟုတ်ပါဘူး။
We learn not just to earn money.
စိတ်ချမ်းသာမှု ရဖို့လည်း ပါတာပေါ့။
It is also to find inner happiness.
လူကြီးဖြစ်လာရင်လည်း စိတ်ချမ်းသာအောင် ဆက်ကျင့်ရဦးမှာပဲ။
Even when we grow up, we must care for our happiness.
စိတ်ချမ်းသာမှုဆိုတာ အမြဲမပြတ် ကြိုးစားရမယ့် အလုပ်ပါ။
Happiness is a lifelong process.
စိတ်ငြိမ်တဲ့သူဆိုတာ သတ္တိရှိတဲ့သူပါပဲ။
A calm person is a brave person.
စိတ်ငြိမ်တဲ့သူဆိုတာ ဂုဏ်သိက္ခာရှိတဲ့သူပါပဲ။
A calm person is a respectful person.
စိတ်ငြိမ်အောင် ကြိုးစားရတာ တကယ်ပဲ ကျေနပ်ဖို့ကောင်းပါတယ်။
Trying to keep the mind calm feels rewarding.
စိတ်ငြိမ်နေရင် အကြာကြီး ထိုင်နိုင်လာလိမ့်မယ်။
When our mind is calm, we can sit for a longer time.
ငြိမ်ငြိမ်လေး နေတတ်တာဟာ အနားယူနေတာပါပဲ။
Being still is a form of rest.
အနားယူမှ ခွန်အားတွေ ပြန်ပြည့်လာတာပါ။
Resting recharges our energy.
အိပ်စက်နေတဲ့အချိန်ကိုလည်း အနားယူတယ်လို့ ခေါ်တာပါပဲ။
Sleeping is also called resting.
ဒါပေမဲ့ အိပ်နေတဲ့အချိန်မှာ သတိမရှိလှဘူး။
But we are not aware while sleeping.
အခုလို တရားထိုင်မှ သတိရှိရှိနဲ့ အနားယူတာလို့ ခေါ်ပါတယ်။
Meditating is resting with full awareness.
ဝင်လေထွက်လေကို သိနေတာကို သတိရှိတယ်လို့ ခေါ်တာပါ။
Knowing our breath is being mindful.
သတိရှိနေတဲ့သူဟာ လေးစားထိုက်သူပါပဲ။
A mindful person deserves respect.
`,
  },
].map(g => ({ ...g, lines: linesFromText(g.text), audioUrl: { en: audioUrlByName(g.audio?.en), my: audioUrlByName(g.audio?.my) } }));
