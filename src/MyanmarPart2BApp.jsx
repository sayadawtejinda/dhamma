import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, ChevronLeft, ChevronRight, BookOpen, Sparkles, Volume2, X } from 'lucide-react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ── "Myanmar Part 2B" ──
// Unlike the other ported apps in this project, this one arrived as a
// ready-made React component (not a standalone HTML page), so no
// hybrid-wrapper porting was needed -- just renamed from the generic
// `App` export, given the standard entryRequest/onExit/hideOwnOnlineBadge
// props, and given the same online-roster feature as every other app
// here.

// အသံစတင်မည့် အချိန်မှတ်တိုင်များ (Total 273 points)
const audioTimes = [
    0, 3, 6, 9, 12, 14, 16, 19, 22, 25, 29, 32, 35, 38, 42, 46, 49, 53, 55, 57,
    60, 63, 66, 68, 71, 75, 77, 81, 84, 86, 89, 92, 95, 97, 100, 103, 106, 109,
    112, 115, 118, 121, 125, 129, 133, 135, 137, 140, 143, 146, 148, 150, 154,
    159, 162, 164, 167, 170, 173, 176, 179, 182, 185, 188, 191, 194, 196, 198,
    200, 202, 204, 206, 208, 211, 213, 216, 218, 220, 222, 225, 228, 231, 234,
    237, 239, 242, 245, 248, 252, 254, 257, 260, 262, 265, 268, 270, 273, 275,
    278, 281, 283, 287, 289, 292, 295, 298, 301, 304, 308, 311, 314, 317, 320,
    323, 326, 330, 333, 336, 339, 342, 344, 347, 349, 351, 354, 358, 362, 364,
    367, 370, 373, 376, 379, 382, 384, 386, 389, 392, 395, 398, 400, 402, 404,
    407, 409, 412, 415, 418, 421, 424, 427, 430, 433, 437, 440, 443, 446, 449,
    452, 455, 458, 461, 464, 467, 470, 472, 475, 477, 479, 482, 485, 488, 491,
    494, 497, 500, 504, 506, 509, 512, 514, 517, 519, 522, 525, 528, 531, 534,
    537, 540, 543, 546, 549, 551, 554, 557, 560, 563, 567, 569, 571, 573, 576,
    579, 582, 585, 588, 590, 592, 595, 598, 601, 604, 607, 610, 613, 616, 619,
    623, 626, 628, 631, 634, 636, 638, 641, 643, 645, 647, 650, 652, 655, 658,
    661, 664, 667, 669, 671, 673, 676, 679, 681, 685, 689, 692, 695, 699, 703,
    706, 710, 713, 716, 719, 722, 725, 729, 732, 735, 738, 741, 745, 748, 751,
    755, 758, 762, 765, 768, 771, 774, 777, 781, 784
];

// မြန်မာစာသားနှင့် အင်္ဂလိပ်ဘာသာပြန်များ
const rawDataWithTranslations = [
  // အခန်း ၁၅
  [
    [["မိုးစင်စင်လင်းပြီ။", "It is bright daylight."], ["ပြတင်းများ ဖွင့်ထားပါ။", "Open the windows."], ["သတင်းစာ နေ့စဉ်ကြည့်ရှုပါ။", "Read the newspaper daily."], ["သတင်းထူး ပါလျှင် ပြောပါ။", "Tell me if there is any special news."]],
    [["တွင်းရေ ကြည်လင်၏။", "The well water is clear."], ["ရေငင်နေသလား။", "Are you drawing water?"], ["ရေအိုးကို ပင့်ပေးပါ။", "Please lift the water pot for me."], ["အချင်းချင်း ကူညီရမည်။", "We must help each other."]],
    [["ပညာရှိနှင့် ယှဉ်တွဲပါ။", "Associate with the wise."], ["စဉ်းစားတွေးခေါ် ဆင်ခြင်ပါ။", "Think and reason carefully."], ["ယဉ်ယဉ်ကျေးကျေး ပြောဆိုပါ။", "Speak politely."], ["စည်းမျဉ်းစည်းကမ်းကို လေးစားပါ။", "Respect the rules and regulations."]],
    [["လယ်ကွင်းပြင်မှာ ရေဖွေးဖွေး။", "The paddy field is flooded with water."], ["ပျိုမေလေးများ လယ်ထဲဆင်းကြမည်။", "Young ladies will go down into the field."], ["ပျော်ပျော်ရွှင်ရွှင် သီချင်းဆိုကြ၏။", "They sing songs joyfully."], ["ပျိုးပင်များ သယ်လာကြသည်။", "They bring the seedlings."]]
  ],
  // အခန်း ၁၆
  [
    [["ပြည်ထောင်စုသား ညီနောင်များတို့။", "Brethren of the Union."], ["ကောင်းစားစေကြောင်း", "For prosperity and betterment,"], ["အားဖြည့်လောင်း၍", "Pouring in our strength,"], ["စုပေါင်းညီညာ ကြိုးပမ်းပါ။", "Strive together in unity."]],
    [["ရွာနံဘေးက ချောင်းကလေး။", "The little stream beside the village."], ["လောင်းလှေကို လှော်ကြမည်။", "We will row the longboat."], ["ဖောင် မျောလာသည်။", "A raft is floating down."], ["သဲသောင်ကို ရှောင်ပါ။", "Avoid the sandbank."]],
    [["စာကြောင်းကို ဖြောင့် အောင်ရေးပါ။", "Write the line straight."], ["မစောင်းပါစေနှင့်။", "Do not let it slant."], ["အရေးအသား ကောင်းအောင်ကြိုးစားပါ။", "Try to improve your handwriting."], ["အစကောင်းမှ အနှောင်းသေချာမည်။", "A good start ensures a good ending."]],
    [["ကျောင်းသားလူငယ်များ", "Young students"], ["ရိုးသားဖြောင့်မှန်ကြသည်။", "are honest and straightforward."], ["အများအကျိုးဆောင်ကြ၏။", "They serve the public interest."], ["ချီးကျူးစရာကောင်းသည်။", "It is praiseworthy."]]
  ],
  // အခန်း ၁၇
  [
    [["ရွာထဲကရေအိုင်။", "The pond in the village."], ["သည်အိုင်က ခြင်လာသည်။", "Mosquitoes come from this pond."], ["ခြင်နိုင်ဆေး ဖျန်းပါ။", "Spray mosquito repellent."], ["လူတိုင်းမှာ တာဝန်ရှိသည်။", "Everyone has a responsibility."]],
    [["အားကစားပြိုင်ပွဲ ကျင်းပသည်။", "A sports competition is held."], ["အတန်းတိုင်းက ယှဉ်ပြိုင်သည်။", "Every class competes."], ["ကျန်းမာကြံ့ခိုင် တို့ယှဉ်ပြိုင်။", "We compete with health and strength."], ["အနိုင်ရသူ ဆုပေးမည်။", "Winners will be awarded."]],
    [["အမိမြန်မာနိုင်ငံတော်။", "Mother Myanmar."], ["တိုင်းရင်းသားများ စုပေါင်းနေထိုင်ကြ၏။", "National races live together."], ["အချင်းချင်း ကူညီရိုင်းပင်းကြသည်။", "They help and support each other."], ["ဝိုင်းဝန်းထမ်းဆောင်ကြံတိုင်းအောင်။", "Let us all serve together successfully."]],
    [["မိုးဖြိုင်ဖြိုင်ရွာပြီ။", "It is raining heavily."], ["တောရိုင်းကို ရှင်းပါ။", "Clear the wild bushes."], ["မြေဩဇာ နိုင်နိုင်ထည့်ပါ။", "Add plenty of fertilizer."], ["အပင်များ ထွားကျိုင်းမည်။", "The plants will grow strong."], ["အသီးလှိုင်လှိုင် ပေါမည်။", "Fruits will be abundant."]]
  ],
  // အခန်း ၁၈
  [
    [["မိုးတိမ်ထူသည်။", "The clouds are thick."], ["လေငြိမ်နေ၏။", "The wind is still."], ["အိမ်ထဲမှာ ရေဒီယိုနားထောင်ပါ။", "Listen to the radio inside the house."], ["မိုးလေဝသသတင်း အကြိမ်ကြိမ် ကြားရသည်။", "Weather reports are heard repeatedly."]],
    [["လမင်း ထိန်ထိန်သာ၏။", "The moon shines brightly."], ["ညအချိန် ကစားမည်။", "We will play at night."], ["မီးအိမ်ကလေးကို ငြိမ်းပါ။", "Put out the little lantern."], ["စိန်ပြေးတမ်း ကစားရအောင်။", "Let's play hide-and-seek."]],
    [["ရွာထဲမှာ အငြိမ့်ပွဲရှိသလား။", "Is there an Anyeint (traditional dance) in the village?"], ["ဆိုင်းသံတခြိမ့်ခြိမ့် ကြားရသည်။", "The resounding music of the Saing Waing is heard."], ["မိန်းကလေးများ ဖြီးလိမ်းနေပြီ။", "The girls are dressing up."], ["ယိမ်းအက ငြိမ့်ညောင်းလှသည်။", "The group dance is very graceful."], ["ပွဲသိမ်းလျှင် အိမ်ပြန်ကြမည်။", "We will go home when the show ends."]],
    [["ကထိန်ပွဲကြီး နီးလာပြီ။", "The grand Kahtein festival is drawing near."], ["ပွဲတော်အချိန် မီရဲ့ လား။", "Will we make it in time for the festival?"], ["ပုသိမ်ထီး ရပါစေမည်။", "You will get a Pathein umbrella."], ["မစိုးရိမ်ပါနှင့်။", "Do not worry."], ["အချိန်မီပါသည်။", "We are right on time."]]
  ],
  // အခန်း ၁၉
  [
    [["စံပယ်သုံးကုံး", "Three jasmine garlands."], ["ဘယ်လိုသုံးမလဲ။", "How will you use them?"], ["ပြုံး၍ မေးသည်။", "Asked with a smile."], ["ဆံထုံးမှာ ပန်မည်။", "I will wear them in my hair bun."]],
    [["ဟင်းမျိုးစုံပြီ။", "Various dishes are ready."], ["ခုံပေါ်မှာ အကုန်ချထားပါ။", "Place them all on the table."], ["ယင်မအုံပါစေနှင့်။", "Do not let flies swarm them."], ["အားလုံး လုံအောင် ဖုံးထားပါ။", "Cover them all securely."]],
    [["မိုးအုံ့လျှင် အေးသည်။", "It is cold when it is cloudy."], ["တံခါးလုံရဲ့လား။", "Are the doors shut tight?"], ["ချမ်း၍ တုန်နေသည်။", "Shivering from the cold."], ["စောင်လုံလုံ ခြုံထားပါ။", "Wrap yourself warmly in a blanket."]],
    [["တောင်ကုန်းနားက ယုန်ကလေး။", "The little rabbit near the hill."], ["ခုန်၍ ခုန်၍ ပြေး။", "Hopping and running away."], ["မယုံလျှင် သွား၍မေး။", "If you don't believe, go and ask."], ["မကြုံစဖူး ထူးလှသေး။", "It is unprecedented and truly extraordinary."]]
  ],
  // အခန်း ၂၀
  [
    [["ဇွန်ပန်းရုံအနီး။", "Near the jasmine bush."], ["လှည်းဘီးနွံထဲ ကျွံနေသည်။", "The cartwheel is stuck in the mud."], ["ကူ၍ တွန်းပေးကြပါ။", "Please help push it."], ["လေးလွန်း၍ မတွန်းနိုင်ဘူးလား။", "Is it too heavy to push?"], ["ပြိုင်တူတွန်းလျှင် ရွေ့နိုင်ပါသည်။", "If we push together, it will move."]],
    [["နေမွန်းတည့်ပြီ။", "It is exactly noon."], ["အပူရှိန် အလွန်ပြင်းသည်။", "The heat is very intense."], ["လွန်လွန်ကဲကဲ မကစားရ။", "Do not play excessively."], ["ခွန်အား ကုန်ခန်းမည်။", "Your energy will be drained."], ["ပင်ပန်းနွမ်းနယ်မည်။", "You will become exhausted."]],
    [["ရိုးသား၍ ပညာထူးချွန်သူ။", "A person who is honest and outstanding in education."], ["အကျင့်ကောင်းမွန်သူ။", "A person of good character."], ["အများအကျိုး ကိုယ်ကျိုးစွန့်သူ။", "One who sacrifices personal gain for public good."], ["တာဝန်ကျေပွန်သူ။", "One who fulfills their duties."], ["ထိုသူတို့ကို ချီးမွမ်းရမည်။", "We must praise such people."]],
    [["ခွန်အားကြီးသော လယ်သမားများ။", "Strong farmers."], ["စုပေါင်းထွန်ကြမည်။", "They will plow together."], ["နည်းလမ်းကောင်းများ ညွှန်ပြထားသည်", "Good methods are guided."], ["သီးနှံဖွံ့ဖြိုးမည်။", "Crops will flourish."], ["ကိုင်းကျွန်းမှီ ကျွန်းကိုင်းမှီ။", "Islands depend on branches, branches depend on islands (Mutual dependence)."]]
  ],
  // အခန်း ၂၁
  [
    [["ကျောင်းတက် မပျက်ပါစေနှင့်။", "Do not miss school."], ["ကျောင်းမှန်မှန်တက် စာမခက်။", "If you attend regularly, lessons are not hard."], ["မပျက်မကွက် စာကိုကျက်။", "Study your lessons without fail."], ["အပျင်းမဖက် ဉာဏ်ထက်မြက်။", "Avoid laziness, and your mind will be sharp."]],
    [["စက်မှုလယ်ယာ အားပေးပါ။", "Encourage mechanized farming."], ["ထွန်စက်နှင့် ထွန်ယက်ပါ။", "Plow with a tractor."], ["သီးနှံအထွက်တိုးမည်။", "Crop yields will increase."], ["ကြက် ငှက် ဝက်မွေးမြူပါ။", "Breed chickens, birds, and pigs."], ["ဝင်ငွေတိုးတက်လာမည်။", "Your income will improve."]],
    [["လင်းကြက်တွန်သံ ကြားရသည်။", "The morning rooster's crow is heard."], ["နံနက်ချိန်ခါ နေထွက်လာပြီ။", "The sun has risen in the morning."], ["ငှက်ကလေးများ ပျံဝဲနေကြ၏။", "Little birds are flying around."], ["မြက်ခင်းပြင် စိမ်းစိုနေသည်။", "The lawn is lush and green."]],
    [["အစာကို ညက်ညက်ဝါးပါ။", "Chew your food thoroughly."], ["ကျန်းမာရေးအတွက် ကောင်းမည်။", "It will be good for your health."], ["သွက်သွက်လက်လက်လည်းရှိမည်။", "You will be agile and active."], ["အသက်လည်း ရှည်မည်။", "You will also live a long life."]]
  ],
  // အခန်း ၂၂
  [
    [["ပဲတီကို အပင်ဖောက်သည်။", "Sprout the green grams."], ["အညှောက်ထွက်လာ၏။", "Shoots begin to appear."], ["ပဲပင်ပေါက် ရပြီ။", "We got bean sprouts."], ["လိုသလောက် စားပါ။", "Eat as much as you need."], ["ကျန်းမာရေးကိုအထောက်အကူပြုသည်။", "It supports good health."]],
    [["ခလောက်သံ ဒိုးဒိုးဒေါင်ဒေါင် ကြားရသည်။", "The rattling sound of the wooden bell is heard."], ["လှည်းရောက်လာပြီလား။", "Has the cart arrived?"], ["ကောက်လှိုင်းစည်းများ တင်ကြသည်။", "They load the paddy sheaves."], ["တလင်းထဲအရောက် တောက်လျှောက် မောင်းပါ။", "Drive straight until you reach the threshing floor."]],
    [["မိုးတဖြောက်ဖြောက်ရွာသည်။", "It is raining lightly (pitter-patter)."], ["ခမောက်ဆောင်း၍ လမ်းလျှောက်ပါ။", "Wear a bamboo hat and walk."], ["မျိုးစေ့များ အပင်ပေါက်လာပြီ။", "The seeds have sprouted."], ["မညှိုးမခြောက်ပါစေနှင့်။", "Do not let them wither or dry up."], ["မြေတောင်မြှောက်ပေးပါ။", "Earth up the soil around them."]],
    [["ကျောင်းသားလူငယ်များ။", "Young students."], ["ရောက်လေရာမှာ ကူညီ၏။", "They help wherever they go."], ["အများကိုလည်း ထောက်ထားသည်။", "They are considerate of others."], ["လူအများက ချီးမြှောက်ကြသည်။", "People praise and elevate them."], ["ထွန်းပေါက်အောင် ကြိုးစားသည်၊", "They strive for success."]]
  ],
  // အခန်း ၂၃
  [
    [["ပူအိုက်သောရာသီ။", "A hot and stuffy season."], ["ငိုက်မနေပါနှင့်။", "Do not doze off."], ["တောင်လေ တိုက်လာပြီ။", "The south wind is blowing."], ["အမှိုက်များ လွင့်နေသည်။", "Garbage is flying around."], ["လိုက်၍ သိမ်းဆည်းပါ။", "Go and collect it."]],
    [["ကျောင်းစာကြည့်တိုက် ဖွင့်ပြီ။", "The school library is open."], ["ကြိုက်ရာစာစောင် ကြည့်ရှုနိုင်သည်။", "You can read any publication you like."], ["အချိန်ရှိခိုက် လုံ့လစိုက်ရမည်။", "We must exert effort while there is time."], ["စာကြည့်ခန်း၌ အမှိုက်မပစ်ရ။", "Do not litter in the reading room."], ["စည်းကမ်းကို လိုက်နာပါ။", "Follow the rules."]],
    [["သူတို့ ကောက်စိုက် သွားကြသည်။", "They went to plant paddy."], ["ကလေးများပါ လိုက်သွားကြသည်။", "Children went along too."], ["သိုက်သိုက်ဝန်းဝန်းရှိသည်။", "They are in a happy gathering."], ["လယ်ထဲတွင် ပုစွန်လုံး နှိုက်ကြသေးသည်။", "They even catch crabs in the field."]],
    [["လူငယ်များ ဆိုက်ရောက်လာပြီ။", "The youths have arrived."], ["လှိုက်လှိုက်လှဲလှဲ ကြိုဆိုကြသည်။", "They are warmly welcomed."], ["သိုက်သိုက်မြိုက်မြိုက်ရှိသည်။", "It is quite grand and proper."], ["အခိုက်အတန့် နားနေပါဦး။", "Rest for a moment."], ["ထိုက်ထိုက်တန်တန် ဂုဏ်ပြုသည်။", "They are honored deservingly."]]
  ],
  // အခန်း ၂၄
  [
    [["ပြည်တွင်းဖြစ်ကို အားပေးပါ။", "Support domestic products."], ["ချစ်ချစ်ခင်ခင် နေကြပါ။", "Live lovingly together."], ["အပြစ်တွေ့လျှင် ပြုပြင်ပါ။", "If you find a fault, correct it."], ["စနစ်တကျ ရှိပါစေ။", "Be systematic."], ["တာဝန် မလစ်ဟင်းပါစေနှင့်။", "Do not neglect your duty."]],
    [["ဤကလေး တစ်တစ်ရစ်ရစ်ဝသည်။", "This child is adorably chubby."], ["အသားလည်း ကျစ်သည်။", "The flesh is also firm."], ["တခစ်ခစ် ရယ်လိုက်သေးသည်။", "Giggling softly."], ["ချစ်စရာ အလွန်ကောင်းသည်။", "Extremely cute."], ["လက်နှစ် ဖက်ဖြင့် ပွေ့ချီပါ။", "Hold and carry with both arms."]],
    [["ဟင်းကျန်ထမင်းကျန် အရမ်းမပစ်ရ။", "Do not throw leftover food recklessly."], ["အိမ်အနီး၌ မညစ်ပေစေနှင့်။", "Do not make it dirty near the house."], ["ညစ်ပေလျှင် ကြွက်ပေါမည်။", "If it is dirty, mice will breed."], ["ကြွက်ပေါလျှင် ရောဂါဖြစ်မည်။", "If mice breed, disease will occur."], ["ရောဂါဖြစ်လျှင် ပူပင်ရသည်။", "If disease occurs, we will suffer anxiety."]],
    [["နှစ်သစ်ကူးပွဲတော် ကျင်းပသည်။", "The New Year festival is held."], ["ဆိုင်များ ဖွင့်လှစ် ရောင်းချ၏။", "Shops are open and selling."], ["ဈေးသည်များ အော်ဟစ်ရောင်းကြသည်။", "Vendors shout to sell their goods."], ["ဈေးဆစ်၍ ဝယ်ခဲ့ပါ။", "Bargain before buying."], ["ပစ်တိုင်းထောင်နှင့် ကွမ်းအစ်ဝယ်ခဲ့သည်။", "Bought a tumbling toy and a betel box."]]
  ],
  // အခန်း ၂၅
  [
    [["သူနာပြုတပ်သား မောင်မှတ်။", "Medic soldier Maung Hmat."], ["ဝတ်စုံ ဝတ်ထားသည်။", "He is wearing his uniform."], ["ကြက်ခြေနီ လက်ပတ်ရှိသည်။", "He has a Red Cross armband."], ["ဖြောင့်မတ်တည်ကြည်သည်။", "He is upright and steadfast."], ["မွန်မြတ်သော စေတနာရှိသည်။", "He has noble goodwill."]],
    [["လူငယ်များ ခြင်းခတ်ကြသည်။", "Youths are playing cane ball."], ["အဝတ်ဆင်တူ ဝတ်ထားသည်။", "They wear matching clothes."], ["ဖနောင့်နှင့် ဆတ်၍ခတ်သည်။", "Kicking briskly with the heel."], ["ဝိုင်းသုံးလေးပတ်လည်သည်။", "They go around three or four times."], ["ဖျတ်ဖျတ်လတ်လတ်ရှိကြသည်။", "They are very active and agile."]],
    [["သစ်စက်နားမှာ ရပ်မကြည့်ရ။", "Do not stand and watch near the sawmill."], ["သစ်တုံးများ ခွဲဖြတ်နေသည်။", "They are cutting logs."], ["မပြတ်မလပ် ဆောင်ရွက်သည်။", "They work continuously."], ["ပျဉ်ချပ်များ ထပ်ထားသည်။", "Wooden planks are stacked."], ["သပ်သပ်ရပ်ရပ်ရှိသည်။", "It looks neat and tidy."]],
    [["ရေတွင်းရေကန်ကို ဝင်းခတ်ပါ။", "Fence the wells and ponds."], ["ကျွဲနွားများ မကပ်စေရ။", "Keep cattle away."], ["ကန်ပေါင်ပေါ်တွင် အဝတ်မလျှော်ရ။", "Do not wash clothes on the pond bank."], ["ရေမဝပ်အောင် မပြတ်သတိပြုပါ။", "Always ensure water doesn't stagnate."], ["လူကြီးများကစောင့်ကြပ်ကြည့်ရှုနေသည်။", "Adults are watching and guarding."]]
  ],
  // အခန်း ၂၆
  [
    [["လူကလေး အိပ်ချင်ပြီ။", "The little boy is sleepy."], ["တေးဆို၍ သိပ်ပါ။", "Sing a lullaby to put him to sleep."], ["မျက်စိ မှိတ်လာပြီ။", "His eyes are closing."], ["တိတ်တိတ်ဆိတ်ဆိတ် နေကြပါ။", "Stay quiet and silent."], ["အထိတ်တလန့် မဖြစ်ပါစေနှင့်", "Do not startle or frighten him."]],
    [["ဆိတ်နှင့်ကြက် မွေးထားသည်။", "Goats and chickens are bred."], ["ဆန်ကွဲတစ်အိတ် လိုချင်သည်။", "I want a bag of broken rice."], ["အဖိတ်နေ့ လာယူပါမည်။", "I will come and take it on the eve of the Sabbath."], ["တစ်ဆိတ်ကူညီပါ။", "Please help a little."], ["စိတ်မရှိပါနှင့်။", "Please do not be offended."]],
    [["ကိုဖိုးဆိတ် ကြိတ်ထိုးနေသည်။", "Ko Pho Seik is boxing playfully."], ["အိမ်ရိပ်မှာ စပါးပုံရှိ၏။", "There is a pile of paddy in the shade of the house."], ["ဆန်တစ်စိတ်လောက် ကြိတ်ပေးပါ။", "Please mill about a quarter basket of rice."], ["ဖျင်အိတ်နှင့် ထည့်ယူမည်လား။", "Will you take it in a cotton bag?"], ["မဖိတ် မစဉ်ပါစေနှင့်။", "Do not spill or scatter it."]],
    [["ကောက်ရိတ်ပြိုင်ပွဲ ကျင်းပသည်။", "A reaping competition is held."], ["အကြိတ်အနယ် ပြိုင်ကြသည်။", "They compete fiercely."], ["ကြိတ်ကြိတ်တိုး စည်ကားသည်။", "It is very crowded and bustling."], ["ကောက်ညှင်း ငချိပ်ကျွေးသည်။", "Black sticky rice is served."], ["ပိတ်အင်္ကျီနှင့် လွယ်အိတ်များဆုချသည်။", "Cotton shirts and satchels are awarded as prizes."]]
  ],
  // အခန်း ၂၇
  [
    [["မေမေနားမှာ တကုပ်ကုပ်။", "Huddling near mother."], ["ညီလေး ဘာတွေလုပ်။", "Little brother, what are you doing?"], ["အိုးပုတ် ချိုးရုပ် ဖိုးဝရုပ်။", "Clay pots, dove toys, Pho Wa toys."], ["ပလုတ်တုတ်တုတ် တလှုပ်လှုပ်။", "Chubby and wiggling."], ["ညီလေး ဒါတွေလုပ်။", "Little brother is making these."]],
    [["တရုတ်စံကားပင်။", "Frangipani tree."], ["နွားတင်းကုပ်နားမှာ ရှိသည်။", "It is near the cowshed."], ["အဆုပ်အဆုပ် ပွင့်သည်။", "It blooms in clusters."], ["အပွင့်ကို ပြုတ်ပါ။", "Boil the flowers."], ["လက်သုပ် သုပ်စားရအောင်။", "Let's make a salad to eat."]],
    [["မှန်တာလုပ် ဟုတ်တာပြော။", "Do what is right, say what is true."], ["တစ်ချက်ခုတ် နှစ်ချက်ပြတ်။", "Kill two birds with one stone."], ["တစ်လုတ်စားဖူး သူ့ကျေးဇူး။", "A single bite eaten creates gratitude."], ["အချိန်မီချုပ် အစုတ်သက်သာ။", "A stitch in time saves nine."]],
    [["ရွှေလက်ခုပ် အုပ်ကာတီး။", "Clap your golden hands."], ["ပျောသီးမှည့်မှည့် စားရအောင်။", "Let's eat ripe bananas."], ["နှမ်းပျစ်ဖက်ထုပ် ပေါက်ပေါက်ဆုပ်။", "Sesame crisps, wrapped snacks, popcorn balls."], ["ရွှေနှုတ်အပြည့် ဝါးရအောင်။", "Let's chew with a mouth full."]]
  ],
    // အခန်း ၂၈
  [
    [["သီတင်းကျွတ်ပြီ။", "Thadingyut has arrived."], ["မိုးလေကင်းလွတ်တော့မည်။", "The rain and wind will soon clear."], ["မီးပုံးပျံ လွှတ်ကြရအောင်။", "Let's release a hot-air balloon."], ["မီးစာကို ရေနံဆွတ်ထားပါ။", "Soak the wick with kerosene."], ["မှိုင်းဝမှ လွှတ်ပါ။", "Release it when full of smoke."]],
    [["ကျောင်းသူများ ကြက်ခွပ်တမ်းကစား ကြသည်။", "Schoolgirls are playing the cockfighting game."], ["ကျောင်းသားများ စွန်လွှတ်နေကြသည်။", "Schoolboys are flying kites."], ["လမ်းပေါ်မှာ စွန်မလွှတ်ရ။", "Do not fly kites on the road."], ["ဘေးလွတ်ရာမှာ ကစားပါ။", "Play in a safe, clear area."], ["စွန်ပြတ်လျှင် တစ်ဇွတ်ထိုးမလိုက်ရ။", "If the kite string breaks, do not chase it blindly."]],
    [["စာကို ပီပီသသရွတ်ဖတ်ပါ။", "Read the text clearly and articulately."], ["ကဗျာကို အလွတ်ကျက်မှတ်ပါ။", "Memorize the poem by heart."], ["စာကို တတွတ်တွတ်ရွတ်ဆိုပါ။", "Recite the lesson repeatedly."], ["ပထမဆု ဆွတ်ခူးနိုင်ရမည်။", "You must win the first prize."]],
    [["လွတ်လပ်ရေးကို ထိန်းသိမ်းပါ။", "Safeguard independence."], ["ညီညွတ်ရေးကို ကြိုးပမ်းပါ။", "Strive for unity."], ["ရွတ်ရွတ်ချွံချွံ ဆောင်ရွက်ပါ။", "Carry out duties courageously."], ["တာဝန် မချွတ်ယွင်းပါစေနှင့်။", "Do not fail in your duty."], ["ပြည်သူ့ ကျင့်ဝတ်ကို အထွတ်အမြတ်ထားပါ။", "Hold public ethics in high esteem."]]
  ],
  // အခန်း ၂၉
  [
    [["ဆရာ့မေတ္တာ စေတနာ။", "Teacher's love and goodwill."], ["တာဝန်ဝတ္တရား မပျက်ပါ။", "Never failing in their duties."], ["တတ်သိလိမ္မာ တပည့်တို့။", "Clever and well-behaved disciples."], ["အနန္တဂိုဏ်းဝင် မှတ်ပါစို့။", "Let's regard them as part of the Infinite Five."]],
    [["မန္တလေးတက္ကသိုလ်မှ လေ့လာရေးအဖွဲ့။", "The study team from Mandalay University."], ["ပုပ္ပါးတောင်ပေါ် တက်ခဲ့သည်။", "They climbed Mount Popa."], ["စန္ဒကူးပင်များ လေ့လာခဲ့သည်။", "They studied sandalwood trees."], ["ပုဂံတွင် အာနန္ဒာဘုရားဖူးခဲ့သည်။", "They visited Ananda Temple in Bagan."], ["ဗုဒ္ဓဟူးနေ့က ပြန်ရောက်ခဲ့ကြသည်။", "They returned on Wednesday."]],
    [["ကန္ဒရဝတီ ငွေတောင်ပြည်။", "Kandarawaddy, the Silver Mountain State."], ["ဒွေးမယ်နော်တို့ ကိန္ဒရီ။", "Dwe Mae Naw, the Kinnari."], ["ပုံဝတ္ထုကောင်း ဇာတ်လမ်းရှည်။", "A good story, a long epic."], ["ကြားဖူးခဲ့သော ဒဏ္ဍာရီ။", "The myth we have heard of."]],
    [["နံရံမှာ ပြက္ခဒိန်တစ်ခု။", "A calendar on the wall."], ["မြန်မာသက္ကရာဇ် ဘယ်နှခုနှစ်လဲ။", "What is the Myanmar year?"], ["ဓမ္မစကြာနေ့က ဘယ်လမှာလဲ။", "In which month is Dhammacakka Day?"], ["သတ္တမလက ဘာလလဲ။", "What is the seventh month?"], ["ခရစ္စမတ်နေ့ တွေ့လား။", "Did you see Christmas Day?"]]
  ]
];

// အရောင်များ သတ်မှတ်ချက် (Part A, B, C, D အတွက် လှပသော အရောင်များ)
const partColors = [
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', hover: 'hover:bg-rose-100', active: 'border-rose-500 bg-rose-100', shadow: 'shadow-rose-100' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', hover: 'hover:bg-amber-100', active: 'border-amber-500 bg-amber-100', shadow: 'shadow-amber-100' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', hover: 'hover:bg-emerald-100', active: 'border-emerald-500 bg-emerald-100', shadow: 'shadow-emerald-100' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', hover: 'hover:bg-indigo-100', active: 'border-indigo-500 bg-indigo-100', shadow: 'shadow-indigo-100' },
];

// ဒေတာများကို React Component အတွက် အဆင်ပြေအောင် ဖွဲ့စည်းခြင်း
const chaptersData = [];
let timeIndex = 0;

for (let i = 0; i < rawDataWithTranslations.length; i++) {
  const chapterNum = i + 15;
  const partsData = [];
  const partsList = ['a', 'b', 'c', 'd'];

  for (let j = 0; j < rawDataWithTranslations[i].length; j++) {
    const lines = rawDataWithTranslations[i][j];
    const linesData = [];

    for (let k = 0; k < lines.length; k++) {
      linesData.push({
        textMy: lines[k][0], // မြန်မာ
        textEn: lines[k][1], // English
        time: audioTimes[timeIndex],
        globalIndex: timeIndex
      });
      timeIndex++;
    }

    partsData.push({
      id: partsList[j],
      colorTheme: partColors[j % 4],
      image: `https://raw.githubusercontent.com/nathantun93/Pic/main/${chapterNum}-0${j + 1}.png`,
      lines: linesData
    });
  }

  chaptersData.push({
    chapter: chapterNum,
    parts: partsData
  });
}

// ပုံမပေါ်ပါက ပြသပေးမည့် Component
const ImageWithFallback = ({ src, alt, colorTheme }) => {
  const [error, setError] = useState(false);

  return (
    <div className={`w-full h-52 flex items-center justify-center overflow-hidden border-b-4 ${colorTheme.border} bg-white`}>
      {!error ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain p-2 transition-transform duration-500 hover:scale-105"
          onError={() => setError(true)}
        />
      ) : (
        <div className={`${colorTheme.text} flex flex-col items-center opacity-70`}>
          <Sparkles size={48} className="mb-2" />
          <span className="text-sm font-medium">ပုံမရှိပါ</span>
        </div>
      )}
    </div>
  );
};

const P2B_ROSTER_PATH = 'artifacts/myanmar-part2b-app/public/data/roster';
const sanitizeP2bKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

export default function MyanmarPart2BApp({ entryRequest, onExit, hideOwnOnlineBadge }) {
  const [currentChapter, setCurrentChapter] = useState(15);
  // လက်ရှိ ဖွင့်နေသော အသံ
  const [playingIndex, setPlayingIndex] = useState(null);
  // လက်ရှိ ရွေးချယ်ထားသော စာကြောင်း (အသံပိတ်သွားလည်း အင်္ဂလိပ်စာ ဆက်ပေါ်နေစေရန်)
  const [selectedIndex, setSelectedIndex] = useState(null);
  const audioRef = useRef(null);

  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, P2B_ROSTER_PATH, sanitizeP2bKey(studentName));
    const ping = () => setDoc(rosterRef, { studentName, isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30000);
    const goOffline = () => { updateDoc(rosterRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [studentName]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, P2B_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Myanmar Part 2B roster listen error:', e));
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowForOnlineCheck(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isRosterEntryOnline = (s) => {
    const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
    return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 5 * 60 * 1000;
  };
  const weeklyRosterList = onlineStudents
    .filter(s => {
      const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
      return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 7 * 24 * 60 * 60 * 1000;
    })
    .map(s => ({ ...s, _isOnlineNow: isRosterEntryOnline(s) }))
    .sort((a, b) => {
      if (a._isOnlineNow !== b._isOnlineNow) return b._isOnlineNow ? 1 : -1;
      const aMs = a.lastSeen?.toMillis ? a.lastSeen.toMillis() : 0;
      const bMs = b.lastSeen?.toMillis ? b.lastSeen.toMillis() : 0;
      return bMs - aMs;
    });
  const onlineCount = onlineStudents.filter(isRosterEntryOnline).length;

  // စာကြောင်းတစ်ကြောင်းကို နှိပ်လိုက်သောအခါ
  const handleLineClick = (globalIndex, time) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingIndex === globalIndex) {
      // ဖွင့်နေဆဲ စာကြောင်းကို ပြန်နှိပ်လျှင် ရပ်မည်
      audio.pause();
      setPlayingIndex(null);
      // ရွေးချယ်မှုကိုတော့ မပိတ်ဘူး (English ဆက်ပေါ်နေအောင်)
    } else {
      // အသစ်ဖွင့်မည်
      setSelectedIndex(globalIndex);
      setPlayingIndex(globalIndex);
      audio.currentTime = time;
      audio.play().catch(e => console.error("Audio playback error:", e));
    }
  };

  // အသံဖွင့်နေစဉ် အချိန်ပြောင်းလဲမှု စစ်ဆေးခြင်း
  const handleTimeUpdate = () => {
    if (playingIndex !== null && audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      // နောက်စာကြောင်း၏ အချိန် (သို့မဟုတ်) နောက်ဆုံးစာကြောင်းဖြစ်ပါက ၃ စက္ကန့်အကြာတွင် ရပ်မည်
      const nextTime = playingIndex < audioTimes.length - 1
          ? audioTimes[playingIndex + 1]
          : audioTimes[playingIndex] + 3;

      if (currentTime >= nextTime) {
        audioRef.current.pause();
        setPlayingIndex(null);
      }
    }
  };

  const currentChapterData = chaptersData.find(c => c.chapter === currentChapter);

  return (
    <>
    <div className="min-h-screen bg-slate-50 font-sans pb-16 selection:bg-yellow-200">
      {/* လှပသော ခေါင်းစဉ်ပိုင်း (Header) */}
      <header className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-sm">
              သူငယ်တန်း မြန်မာစာ
            </h1>
          </div>

          <div className="relative">
            <select
              value={currentChapter}
              onChange={(e) => {
                setCurrentChapter(Number(e.target.value));
                setPlayingIndex(null);
                setSelectedIndex(null);
                if (audioRef.current) audioRef.current.pause();
              }}
              className="appearance-none border-2 border-white/30 bg-white/10 text-white rounded-xl py-2 pl-5 pr-12 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-white cursor-pointer backdrop-blur-sm shadow-sm transition-all hover:bg-white/20"
            >
              {Array.from({ length: 29 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="text-gray-800">အခန်း {num}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none rotate-90" size={20}/>
          </div>
        </div>
      </header>

      {/* ပင်မစာမျက်နှာ */}
      <main className="max-w-5xl mx-auto px-4 mt-8">
        {!currentChapterData ? (
          // အခန်း ၁ မှ ၁၄ အထိ Data မရှိသေးသောအခါ ပြသမည့် နေရာ
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center border-4 border-dashed border-blue-200 mt-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
            <div className="bg-gradient-to-tr from-blue-100 to-purple-100 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <BookOpen className="text-blue-500" size={56} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-3">အခန်း {currentChapter}</h2>
            <p className="text-gray-500 text-lg font-medium">ဤအခန်းအတွက် အချက်အလက်များ မထည့်သွင်းရသေးပါ။</p>
            <button
              onClick={() => setCurrentChapter(15)}
              className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-md flex items-center justify-center mx-auto gap-2"
            >
              <Sparkles size={20} /> အခန်း ၁၅ သို့ သွားမည်
            </button>
          </div>
        ) : (
          <>
            {/* အခန်း ၁၅ မှ ၂၉ အတွက် အကြောင်းအရာများ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {currentChapterData.parts.map((part) => (
                <div key={part.id} className={`rounded-3xl shadow-lg border-2 ${part.colorTheme.border} overflow-hidden bg-white flex flex-col transform transition-all hover:-translate-y-1 hover:${part.colorTheme.shadow}`}>
                  <ImageWithFallback src={part.image} alt={`Chapter ${currentChapter} Part ${part.id}`} colorTheme={part.colorTheme} />

                  <div className={`flex-1 p-5 sm:p-6 ${part.colorTheme.bg} bg-opacity-30`}>
                    <div className="flex flex-col gap-3">
                      {part.lines.map((line) => {
                        const isPlaying = playingIndex === line.globalIndex;
                        const isSelected = selectedIndex === line.globalIndex;

                        return (
                          <div
                            key={line.globalIndex}
                            className={`flex flex-col rounded-2xl transition-all duration-300 border-l-4 overflow-hidden ${
                              isSelected
                                ? `${part.colorTheme.active} shadow-md`
                                : `border-transparent ${part.colorTheme.hover} bg-white shadow-sm`
                            }`}
                          >
                            <button
                              onClick={() => handleLineClick(line.globalIndex, line.time)}
                              className="w-full flex items-start sm:items-center gap-4 text-left p-4 focus:outline-none"
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform ${
                                isPlaying ? `bg-blue-600 text-white animate-pulse` : `bg-white ${part.colorTheme.text} border-2 ${part.colorTheme.border}`
                              }`}>
                                {isPlaying ? <Volume2 size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                              </div>
                              <span className={`text-xl sm:text-2xl leading-relaxed font-medium ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                {line.textMy}
                              </span>
                            </button>

                            {/* အင်္ဂလိပ်ဘာသာပြန် (ရွေးချယ်ထားချိန်မှသာ ပေါ်မည်) */}
                            <div className={`transition-all duration-500 ease-in-out ${isSelected ? 'max-h-40 opacity-100 mb-4 px-4 pl-16 sm:pl-18' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white shadow-sm inline-block">
                                  <span className="text-gray-700 font-medium text-base sm:text-lg flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded-md">EN</span>
                                    {line.textEn}
                                  </span>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* အခန်းပြောင်းရန် ခလုတ်များ */}
            <div className="mt-12 flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <button
                onClick={() => {
                  if (currentChapter > 1) {
                    setCurrentChapter(currentChapter - 1);
                    setPlayingIndex(null);
                    setSelectedIndex(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  if (audioRef.current) audioRef.current.pause();
                }}
                disabled={currentChapter === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                  currentChapter === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-md'
                }`}
              >
                <ChevronLeft size={24} /> ယခင်အခန်း
              </button>

              <div className="hidden sm:flex font-bold text-gray-400">
                အခန်း {currentChapter} / ၂၉
              </div>

              <button
                onClick={() => {
                  if (currentChapter < 29) {
                    setCurrentChapter(currentChapter + 1);
                    setPlayingIndex(null);
                    setSelectedIndex(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  if (audioRef.current) audioRef.current.pause();
                }}
                disabled={currentChapter === 29}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                  currentChapter === 29 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                နောက်အခန်း <ChevronRight size={24} />
              </button>
            </div>
          </>
        )}
      </main>

      {/* အသံဖွင့်မည့် အပိုင်း (Global Audio Player) */}
      <audio
        ref={audioRef}
        src={encodeURI("https://raw.githubusercontent.com/nathantun93/bell/main/သူငယ်တန်း2.mp3")}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlayingIndex(null)}
      />
    </div>
    {!hideOwnOnlineBadge && (
      <>
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-16 right-4 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">📖 Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
              <button onClick={() => setShowOnlinePanel(false)} className="text-gray-400 hover:text-gray-700"><X size={22}/></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Showing everyone active in the last 7 days.</p>
            <div className="space-y-2">
              {weeklyRosterList.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s._isOnlineNow ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-800">{s.studentName}</span>
                  </div>
                  <span className="text-xs text-gray-400">{s._isOnlineNow ? 'Online now' : 'Active this week'}</span>
                </div>
              ))}
              {weeklyRosterList.length === 0 && <p className="text-center text-gray-400 py-6">No students active this week yet.</p>}
            </div>
          </div>
        </div>
      )}
      </>
    )}
    </>
  );
}
