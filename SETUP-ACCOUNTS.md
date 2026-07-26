# Fresh accounts setup — Firebase + Google Cloud + Vercel

මේ project එක **අලුත්** Google / Firebase / Vercel accounts වලින් හදන්න.

පරණ Heart Academy Firebase project භාවිතා නොකරන්න.

---

## Admin access — fmheartradio@gmail.com

CMS + Firestore write access **මේ email එකට** locked කරලා තියෙනවා:

`fmheartradio@gmail.com`

### Firebase Console එකේ කළ යුතු දේ (ඒම Gmail එකෙන්)

1. https://console.firebase.google.com → project එක open කරන්න (`fmheartradio@gmail.com`)
2. **Authentication → Sign-in method**
   - **Google** → Enable → Project support email = `fmheartradio@gmail.com`
   - **Email/Password** → Enable (optional fallback)
3. **Authentication → Settings → Authorized domains**
   - `localhost` තියෙන්න ඕනේ
   - production: `fmheart.lk`, `*.vercel.app`
4. Rules deploy:

```bash
npx firebase login
# fmheartradio@gmail.com එකෙන් login වෙන්න
npx firebase use fmheart
npx firebase deploy --only firestore:rules,storage
```

5. `/admin` → **Continue with Google** → `fmheartradio@gmail.com` තෝරන්න

වෙනත් email එකකටත් access දෙන්න ඕනේ නම්:
- `firestore.rules` + `storage.rules` ඇතුළේ email list එකට add කරන්න
- `.env.local` → `NEXT_PUBLIC_ADMIN_EMAILS=fmheartradio@gmail.com,other@email.com`

---

## 1) Google account (අලුත්)

1. https://accounts.google.com → Create account  
2. මේ account එකෙන්ම Firebase + Google Cloud + AdSense + Analytics හදන්න (එක account එකක් පහසුයි)

---

## 2) Firebase + Google Cloud project

1. https://console.firebase.google.com → **Add project**  
2. Project name: `fmheart` (හෝ `fmheart-lk`)  
3. Google Analytics: optional (අලුතෙන් enable කරන්න පුළුවන්)  
4. Project create වුණාම:

### Authentication
- Build → Authentication → Get started  
- Sign-in method → **Email/Password** → Enable  
- Users → Add user → ඔබේ editor email + password

### Firestore
- Build → Firestore Database → Create database  
- Start in **production mode**  
- Location: `asia-south1` (Mumbai) හෝ `asia-southeast1`

### Storage (optional — cover images)
- Build → Storage → Get started

### Web app config
- Project Overview → Add app → **Web** (`</>`)  
- App nickname: `fmheart-web`  
- Copy the `firebaseConfig` values → `.env.local`

```bash
cp .env.example .env.local
# Then paste apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
```

### Deploy rules (local machine)

```bash
npx firebase login
npx firebase use fmheart
npx firebase deploy --only firestore:rules,storage
```

`.firebaserc` එකේ project id ඔබේ නමට වෙනස් කරන්න නම්:

```bash
npx firebase use --add
```

---

## 3) Vercel (අලුත් account)

1. https://vercel.com/signup → Continue with Google (ඒම අලුත් account)  
2. Import Git repo **හෝ** CLI:

```bash
npx vercel login
npx vercel
```

3. Vercel → Project → Settings → Environment Variables  
   - `.env.local` එකේ `NEXT_PUBLIC_*` variables ඔක්කොම add කරන්න  
4. Domain: `fmheart.lk` → Domains → Add → DNS records Vercel කියන විදිහට set කරන්න  
5. Region: `sin1` (Singapore) — `vercel.json` එකේ දාලා තියෙනවා

Production deploy:

```bash
npx vercel --prod
```

---

## 4) Google AdSense (optional, අලුත්/වෙනම)

1. https://www.google.com/adsense → Sign up with same Google account  
2. Site: `https://fmheart.lk`  
3. Approval ඊට පස්සේ Publisher ID (`ca-pub-xxxx`) → `.env.local` + Vercel env

---

## 5) Verify

```bash
npm run dev
```

- http://localhost:3000 — homepage + live radio  
- http://localhost:3000/admin — Firebase login → article publish  
- Firebase keys නැත්නම් site mock data වලින් වැඩ කරනවා

---

## Security checklist

- [ ] Service account JSON / private keys repo එකට commit නොකරන්න  
- [ ] `.env.local` gitignore වෙලා තියෙනවා  
- [ ] Firestore rules deploy කරලා තියෙනවා  
- [ ] Admin user password ශක්තිමත් එකක්  
- [ ] Vercel env vars production + preview දෙකටම set කරලා තියෙනවා
