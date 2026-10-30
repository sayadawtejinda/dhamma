# ၃၂ ကောဋ္ဌာသ ပုံ — Gemini prompt လမ်းညွှန်

Gemini ကို **အင်္ဂလိပ်လို** ရေးခိုင်းရင် ပိုမှန်ပါတယ်။ ပုံတစ်ပုံချင်း သီးသန့်ဆွဲခိုင်းရင် ပုံစံတွေ မတူဘဲ ကွဲသွားတတ်လို့ **chat တစ်ခုတည်းထဲမှာ အဆင့် ၃ ဆင့်** နဲ့ လုပ်ပါ။

## အဆင့် ၁ — Style ကို အရင်သတ်မှတ် (chat အသစ်တစ်ခုမှာ တစ်ခါတည်း ပို့ပါ)

```
I am making a set of 32 educational anatomy illustrations for a Buddhist
meditation lesson on the 32 parts of the body (kotthasa).
Please remember this fixed style for every image in this chat:
- Clean flat-vector educational illustration, soft colours, white background, 1:1 square.
- ONE standing human figure, front view (unless I say otherwise), neutral, calm, no clothes
  details, no face details, no gender emphasis, respectful, NOT gory, NOT realistic surgery.
- The figure is drawn as a light-grey, semi-transparent body outline so the inside can be seen.
- The ONE body part I name is drawn clearly in its true position and shape, filled with a
  strong colour (red / orange / blue), with a thin outline.
- All other organs: either not drawn, or very faint grey.
- A thin pointer line from the highlighted part to a small label in English with the Pali
  name, e.g. "Hair of the head (kesā)".
- Optional: a small circular zoomed inset (magnifier) of the detail, in the same style.
- Do not add any other text, logos or watermarks.
Reply only "OK" and wait for the first part.
```

## အဆင့် ၂ — ပုံတစ်ပုံချင်းစီ (အောက်က template ထဲမှာ အပိုင်းအမည်ကို ဖြည့်)

```
Same figure, same style, same size, same colours as before.
Part: <PART>.
Show: <WHAT TO SHOW>.
Highlight only this part. Label: "<LABEL>".
```

## အဆင့် ၃ — မကြိုက်ရင် တစ်ဆင့်ချင်း ပြင်ခိုင်း (ပုံအသစ်ပြန်မဆွဲခိုင်းနဲ့)

- `Keep everything exactly the same, only make the highlighted part bigger.`
- `Same image, but remove the other organs and keep only the body outline.`
- `Same image, but move the label so it does not cover the body.`

အရေးကြီး: ပုံကောင်းတစ်ပုံ ရပြီဆိုရင် အဲဒီပုံကို **ပြန်ပို့ပြီး** `Use this exact figure and style as the template for the next part` လို့ ပြောပါ။ နောက်ပုံတွေ ပိုတူလာပါလိမ့်မယ်။

---

## ၃၂ ပုဒ် — `<PART>` / `<WHAT TO SHOW>` / `<LABEL>`

### ပထဝီ (၂၀)

| # | PART | WHAT TO SHOW | LABEL |
|---|------|--------------|-------|
| 1 | Head hair | Front view of head and shoulders; the full head of hair coloured strongly, body faint. Small magnifier inset: a few strands of hair. | Hair of the head (kesā) |
| 2 | Body hair | Whole body outline; fine body hairs drawn on arms, chest and legs, coloured. Magnifier inset: skin with a few hairs. | Body hair (lomā) |
| 3 | Nails | One hand and one foot, palm side hidden so the finger and toe nails are clearly seen, nails coloured. | Nails (nakhā) |
| 4 | Teeth | Face in side view with the mouth slightly open; all teeth coloured, rest of the face faint. | Teeth (dantā) |
| 5 | Skin | Whole body outline with the outer skin layer coloured. Magnifier inset: cross-section of skin layers. | Skin (taco) |
| 6 | Flesh (muscle) | Whole body showing the muscles under the skin, all muscles coloured red; skeleton not drawn. | Flesh (maṃsa) |
| 7 | Sinews (tendons) | Arm and leg showing tendons and sinews as white-yellow cords connecting muscle to bone, coloured. | Sinews (nahāru) |
| 8 | Bones | Whole skeleton inside the body outline, bones coloured; other organs not drawn. | Bones (aṭṭhi) |
| 9 | Bone marrow | One long bone (thigh bone) cut lengthwise, the marrow inside coloured. Small body outline beside it showing where the bone is. | Bone marrow (aṭṭhimiñjā) |
| 10 | Kidneys | Torso; two bean-shaped kidneys at the back of the upper abdomen, coloured; other organs faint. | Kidneys (vakka) |
| 11 | Heart | Torso; the heart in the middle-left of the chest, coloured; other organs faint. | Heart (hadaya) |
| 12 | Liver | Torso; liver in the upper right abdomen under the ribs, coloured; other organs faint. | Liver (yakana) |
| 13 | Membranes | Torso; the thin membranes around the heart and lungs and lining the abdomen, drawn as thin coloured sheets. | Membranes (kilomaka) |
| 14 | Spleen | Torso; spleen in the upper left abdomen, coloured; other organs faint. | Spleen (pihaka) |
| 15 | Lungs | Torso; both lungs inside the chest, coloured; other organs faint. | Lungs (papphāsa) |
| 16 | Large intestine | Torso; the large intestine framing the abdomen, coloured; other organs faint. | Large intestine (anta) |
| 17 | Small intestine | Torso; the coiled small intestine in the centre of the abdomen, coloured. | Small intestine (antaguṇa) |
| 18 | Undigested food | Torso; the stomach with food inside, the food coloured. | Undigested food (udariya) |
| 19 | Faeces | Torso, lower abdomen; the rectum / lower end of the bowel, schematic, coloured. Keep it clean and abstract, not graphic. | Excrement (karīsa) |
| 20 | Brain | Head side view; the brain inside the skull, coloured; skull faint. | Brain (matthaluṅga) |

### အာပေါ (၁၂)

| # | PART | WHAT TO SHOW | LABEL |
|---|------|--------------|-------|
| 21 | Bile | Torso; liver and gallbladder, the gallbladder and its green bile coloured. | Bile (pitta) |
| 22 | Phlegm | Torso; airways and throat, thin layer of mucus coloured, schematic. | Phlegm (semha) |
| 23 | Pus | A schematic small inflamed skin spot in cross-section with pus inside, coloured. Not gory. | Pus (pubba) |
| 24 | Blood | Whole body outline; arteries red and veins blue running through the body, heart small in the centre. | Blood (lohita) |
| 25 | Sweat | Skin with sweat droplets on the forehead and arm; magnifier inset: sweat gland and duct in skin. | Sweat (sedo) |
| 26 | Solid fat | Cross-section of arm showing the yellow fat layer under the skin, coloured. | Solid fat (medo) |
| 27 | Tears | Face, front view; eye with a tear drop, the tear gland and duct coloured. | Tears (assu) |
| 28 | Liquid fat | Skin of forehead / palm with a thin oily sheen, magnifier inset of oil on skin. | Liquid fat (vasā) |
| 29 | Saliva | Head side view; mouth with salivary glands under the tongue and cheek, coloured. | Saliva (kheḷo) |
| 30 | Snot | Head side view; the nasal cavity with mucus, coloured. | Snot (siṅghāṇikā) |
| 31 | Synovial fluid | Knee joint cross-section; the fluid inside the joint capsule coloured. | Synovial fluid (lasikā) |
| 32 | Urine | Torso; kidneys, ureters and bladder, the bladder with urine coloured. | Urine (mutta) |

---

## မှတ်ချက်

- အလုပ်မဖြစ်ရင် `Make the highlight stronger and the rest of the body paler.` လို့ပဲ ပြောပါ။
- ဆံပင်လိုမျိုး "အသားပေးပြချင်" ရင် `WHAT TO SHOW` ထဲမှာ `Make this part the largest and most prominent thing in the image.` ထပ်ထည့်ပါ။
- ခန္ဓာကိုယ်ထဲက အစိတ်အပိုင်း (အသည်း၊ နှလုံး) တွေဆိုရင် တည်နေရာမှန်ဖို့ `in its correct anatomical position` ထည့်ပါ။
- Pali အမည်ပေါင်းစပ်တာကို ပုံထဲက စာနဲ့ မဟုတ်ဘဲ app ထဲက စာနဲ့ ပြမယ်ဆိုရင် `Do not put any text in the image.` လို့ ပြောပြီး label ကို ကျွန်တော်တို့ app က ထည့်တာ ပိုကောင်းပါတယ်။ Gemini ဟာ ရောမစာ ပါဠိကို မှားတတ်လို့ပါ။
