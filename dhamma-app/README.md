# Dhamma Class - Tutoring Dashboard

ဆရာ/ကျောင်းသား tutoring dashboard app။ Firebase (Firestore + Anonymous Auth) ကို data backend အနေနဲ့ သုံးထားပြီး GitHub Pages ပေါ်မှာ host လုပ်ဖို့ ပြင်ဆင်ထားပါတယ်။

## GitHub Pages ပေါ်တင်နည်း (Setup)

### 1) ဒီ files အားလုံးကို GitHub repo ထဲ upload လုပ်ပါ
- Repo: `https://github.com/sayadawtejinda/dhamma`
- GitHub ဝဘ်ဆိုဒ်ပေါ်ကနေ "Add file" > "Upload files" ကို သုံးပြီး ဒီ folder ထဲက files/folders အားလုံး (index.html, package.json, vite.config.js, src/, .github/) ကို repo ရဲ့ root ထဲကို တင်ပါ
- **folder structure အတိအကျ ထိန်းထားဖို့ အရေးကြီးပါတယ်** — `src/App.jsx` ဆိုတာ `src` folder ထဲမှာ ရှိနေရပါမယ်၊ root မှာ မဟုတ်ပါ

### 2) GitHub Pages ကို Enable လုပ်ပါ
- Repo > **Settings** > **Pages**
- "Build and deployment" > **Source** ကို **"GitHub Actions"** လို့ ရွေးပါ (Deploy from a branch မဟုတ်ပါ)

### 3) Push/Upload ပြီးတာနဲ့ auto-deploy ဖြစ်ပါမယ်
- `.github/workflows/deploy.yml` ကြောင့် `main` branch ကို push/upload လိုက်တိုင်း GitHub Actions က app ကို build လုပ်ပြီး Pages ပေါ် အလိုအလျောက် တင်ပေးပါမယ်
- Repo > **Actions** tab မှာ progress ကို ကြည့်နိုင်ပါတယ် (green checkmark ရလာရင် ပြီးပါပြီ)
- App URL က `https://sayadawtejinda.github.io/dhamma/` ဖြစ်ပါမယ်

### 4) Firestore Security Rules ချိတ်ပါ
- Firebase Console > Firestore Database > **Rules** tab
- ဒီ repo ထဲက `firestore.rules` ဖိုင်ထဲက content ကို copy ပြီး Rules editor ထဲ paste လုပ်ပြီး **Publish** နှိပ်ပါ

## နောက်ပိုင်း Update လုပ်ချင်ရင်
- `src/App.jsx` (ဒါမှမဟုတ် တခြား file) ကို ပြင်ပြီး GitHub ပေါ် ပြန် upload (သို့) commit လုပ်ရုံပါပဲ — GitHub Actions က အလိုအလျောက် ပြန် build/deploy လုပ်ပေးပါမယ်
- Firebase config ကို ပြောင်းစရာ လိုရင် `src/firebaseConfig.js` ကို ပြင်ပါ

## ပထမဆုံး အသုံးပြုသူ (ဆရာ) Setup
- App ကို ပထမဆုံး ဖွင့်တဲ့အခါ "Login / Register" ခလုပ်ကို နှိပ်ပြီး **"I am a Teacher"** ကို ရွေးချယ်ပါ (ပထမဆုံး ဝင်ရောက်သူကသာ teacher ဖြစ်နိုင်ပါတယ်)
- ကျောင်းသားများက "New Student" ဒါမှမဟုတ် "Existing Account" (Student ID နဲ့) ကနေ ဝင်ရောက်ကြရပါမယ်
