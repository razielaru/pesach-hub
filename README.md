# 🕍 פסח-האב — רבנות פיקוד מרכז

מערכת ניהול מבצע פסח תשפ"ו

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hosting**: Vercel

---

## 🚀 הקמה — 5 צעדים

### 1. Supabase — הרצת הסכמה
1. כנס ל-[supabase.com](https://supabase.com) → הפרויקט שלך
2. לחץ **SQL Editor** → **New query**
3. העתק את כל תוכן `supabase/schema.sql`
4. לחץ **Run**

### 2. משתני סביבה מקומיים
צור קובץ `.env.local` בשורש הפרויקט:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

הערכים נמצאים ב-Supabase → Settings → API

### 3. הפעלה מקומית
```bash
npm install
npm run dev
```

### 4. העלאה ל-GitHub
```bash
git init
git add .
git commit -m "pesach hub initial"
git remote add origin https://github.com/YOUR_USER/pesach-hub.git
git push -u origin main
```

### 5. Deploy ב-Vercel
1. כנס ל-[vercel.com](https://vercel.com) → Import Project
2. חבר את ה-repo
3. **Framework Preset**: Vite
4. הוסף Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. לחץ **Deploy** ✅

---

## 🔑 קודי כניסה

| יחידה | קוד |
|-------|-----|
| פיקוד מרכז | `1234` |
| אוגדת 877 | `8770` |
| אוגדת 96 | `9600` |
| אוגדת 98 | `9800` |
| שאר היחידות | ללא קוד |

ניתן לשנות קודים דרך: פיקוד מרכז → ⚙ ניהול יחידות

---

## 📁 מבנה הפרויקט

```
src/
├── pages/         ← כל דפי האפליקציה
├── components/ui/ ← רכיבים משותפים
├── lib/           ← Supabase client + units config
├── store/         ← Zustand state
└── App.jsx
supabase/
└── schema.sql     ← כל הטבלאות + נתוני ברירת מחדל
```
