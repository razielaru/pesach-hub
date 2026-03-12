import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };
const HALACHA_SUMMARY = HALACHA_DB.slice(0, 3000);

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY לא מוגדר בשרת." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const enhancedSystemPrompt = `${systemPrompt}
=== קטע מספר ההכשרות הצבאי (פסח תשפ"ו) ===
${HALACHA_SUMMARY}
=== סוף הקטע ===
הנחיות: ענה בעברית קצרה, ברורה ומקצועית. אם מחוץ להלכות פסח ציין זאת. אם יש ספק המלץ לפנות לרב.`;

    // ננסה את המודל הרגיל
    const targetModel = "gemini-1.5-pro";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      const errorText = await response.text();
      
      // הרעיון שלך מיושם כאן: אם המודל לא נמצא, נמשוך את רשימת המודלים המורשים
      if (response.status === 404) {
        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
          const listData = await listRes.json();
          const availableModels = listData.models ? listData.models.map(m => m.name.replace('models/', '')) : ["לא הצלחתי למשוך רשימה"];
          
          return new Response(
            JSON.stringify({ 
              error: `המודל לא נמצא. הנה רשימת המודלים שזמינים למפתח שלך:`, 
              available_models: availableModels,
              original_error: errorText
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        } catch (e) {
           return new Response(JSON.stringify({ error: "שגיאה במשיכת רשימת המודלים", details: e.message }), { status: 500 });
        }
      }

      return new Response(
        JSON.stringify({ error: "שגיאה בחיבור למודל", details: errorText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "שגיאת שרת פנימית", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
