import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };

// קיצוץ ל-3000 תווים להקשר כדי לא להעמיס על המודל
const HALACHA_SUMMARY = HALACHA_DB.slice(0, 3000);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY לא מוגדר בשרת. אנא הוסף אותו ב-Vercel." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const enhancedSystemPrompt = `${systemPrompt}

=== קטע מספר ההכשרות הצבאי (פסח תשפ"ו) ===
${HALACHA_SUMMARY}
=== סוף הקטע ===

הנחיות:
ענה בעברית קצרה, ברורה ומקצועית.
אם השאלה מחוץ להלכות פסח או כשרות — ציין זאת מיד אל תמציא הלכות.
אם יש ספק הלכתי או מקרה חריג — המלץ לפנות לרב היחידה.
`;

    // קריאה ל-Gemini עם הכתובת הבטוחה ביותר: gemini-1.5-flash-latest
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: enhancedSystemPrompt }]
          },
          contents: messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.1 // שומר על פסיקה מדויקת, ללא יצירתיות יתר
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error Details:", errorText);
      return new Response(
        JSON.stringify({
          error: "שגיאה בחיבור למודל ההלכה",
          details: errorText
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({
          error: "לא התקבלה תשובה תקינה מרב ה-AI",
          details: data
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Server Execution Error:", error.message);
    return new Response(
      JSON.stringify({ error: "שגיאת שרת פנימית", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
