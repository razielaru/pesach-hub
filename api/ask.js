import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };

// אין יותר חיתוך! מעבירים לרב ה-AI את כל הספר במלואו
const HALACHA_SUMMARY = HALACHA_DB;

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ text: "❌ שגיאה: מפתח ה-API לא מוגדר." }), { headers: { "Content-Type": "application/json" } });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const enhancedSystemPrompt = `${systemPrompt}

=== ספר ההכשרות הצבאי המלא (פסח תשפ"ו) ===
${HALACHA_SUMMARY}
=== סוף הספר ===

הנחיות קריטיות:
1. ענה בעברית קצרה, ברורה ומקצועית לחיילים.
2. אתה פוסק אך ורק על בסיס "ספר ההכשרות הצבאי" המצורף. אל תמציא הלכות או תשתמש בידע כללי. 
3. אם יש כלי שכתוב לגביו "אין להכשיר" או דורש אישור חריג, ציין זאת במפורש בדיוק כמו שכתוב בספר.
4. אם השאלה מחוץ להלכות פסח או כשרות — ציין זאת מיד.
5. הוסף בסוף התשובה: בכל מקרה של ספק, פנה לרב היחידה.`;

    const targetModel = "gemini-2.5-pro";
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: enhancedSystemPrompt }] },
          contents: messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })),
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ text: `❌ שגיאה בחיבור למודל:\n${err}` }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ text: `❌ שגיאת שרת:\n${error.message}` }), { headers: { "Content-Type": "application/json" } });
  }
}
