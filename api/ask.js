import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };
const HALACHA_SUMMARY = HALACHA_DB.slice(0, 3000);

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ text: "❌ שגיאה: מפתח ה-API לא מוגדר." }), { headers: { "Content-Type": "application/json" } });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const enhancedSystemPrompt = `${systemPrompt}

=== קטע מספר ההכשרות הצבאי (פסח תשפ"ו) ===
${HALACHA_SUMMARY}
=== סוף הקטע ===

הנחיות:
ענה בעברית קצרה, ברורה ומקצועית.
אם השאלה מחוץ להלכות פסח או כשרות — ציין זאת מיד ואל תמציא הלכות.
אם יש ספק הלכתי או מקרה חריג — המלץ לפנות לרב היחידה.`;

    const targetModel = "gemini-2.5-flash";
    
    // שינוי הכתובת ל-streamGenerateContent כדי לקבל זרם של מילים
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

    // הזרמת התשובה (Stream) ישירות לדפדפן בזמן אמת!
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
