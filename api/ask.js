import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };
const HALACHA_SUMMARY = HALACHA_DB.slice(0, 3000);

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ text: "❌ שגיאה: מפתח ה-API לא מוגדר ב-Vercel." }), { headers: { "Content-Type": "application/json" } });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    const enhancedSystemPrompt = `${systemPrompt}\n=== קטע ספר ===\n${HALACHA_SUMMARY}\n=== סוף ===`;

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
      if (response.status === 404) {
        // המודל לא נמצא - מושכים את הרשימה ומדפיסים אותה כטקסט בתוך הצ'אט!
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const listData = await listRes.json();
        const models = listData.models ? listData.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini')).join('\n') : "לא הצלחתי למשוך רשימה";
        
        return new Response(JSON.stringify({ 
          text: `❌ המודל ${targetModel} לא מאושר במפתח הזה.\n\nהנה המודלים שכן זמינים לך (צלם לי את זה):\n${models}` 
        }), { headers: { "Content-Type": "application/json" } });
      }
      
      const err = await response.text();
      return new Response(JSON.stringify({ text: `❌ שגיאת גוגל כללית:\n${err}` }), { headers: { "Content-Type": "application/json" } });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ text: data.candidates[0].content.parts[0].text }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ text: `❌ קריסת שרת פנימית:\n${error.message}` }), { headers: { "Content-Type": "application/json" } });
  }
}
