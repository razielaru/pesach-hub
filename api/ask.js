import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };

// קיצוץ ל-3000 תווים להקשר
const HALACHA_SUMMARY = HALACHA_DB.slice(0, 3000);

export default async function handler(req) {

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // בדיקה שה-API KEY קיים
  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY לא מוגדר בשרת" }),
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
ענה בעברית קצרה וברורה.
אם השאלה מחוץ להלכות פסח או כשרות — ציין זאת.
אם יש ספק הלכתי — המלץ לפנות לרב היחידה.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            temperature: 0.1
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "שגיאה בחיבור למודל";
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "לא התקבלה תשובה מהמודל" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

  }
}
