export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendSSE("⚠️ שגיאה: GEMINI_API_KEY לא נמצא ב-Environment Variables של Vercel. אנא הגדר אותו.");
  }

  try {
    // שלב א': בדיקה אם גוגל בכלל עונה לנו ומה המודלים שיש לך
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();

    if (data.error) {
      return sendSSE(`⚠️ שגיאה מגוגל: ${data.error.message}\nקוד שגיאה: ${data.error.status}`);
    }

    const modelList = data.models
      ? data.models.map(m => m.name.replace('models/', '')).join(', ')
      : "לא נמצאו מודלים";

    return sendSSE(`🔍 חיבור תקין!\n\nהמודלים הזמינים עבורך הם:\n${modelList}\n\n* תעתיק לי את השמות שמופיעים כאן כדי שנבחר את הנכון.`);

  } catch (e) {
    return sendSSE(`⚠️ תקלה טכנית בשרת: ${e.message}`);
  }
}

// פונקציית עזר לשליחת הודעה בפורמט שהצ'אט שלך מבין
function sendSSE(text) {
  const payload = JSON.stringify({
    candidates: [{ content: { parts: [{ text: text }] } }]
  });
  return new Response(`data: ${payload}\n\n`, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  });
}
