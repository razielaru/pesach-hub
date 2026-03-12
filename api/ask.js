import { HALACHA_DB } from './knowledge.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { messages, systemPrompt } = await req.json();

    // אנחנו משרשרים את ההנחיות שלך יחד עם כל התוכן של ספר הכשרות
    const enhancedSystemPrompt = `${systemPrompt}\n\n=== מאגר ההלכות המחייב (ספר הכשרות) ===\n${HALACHA_DB}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // System Instruction מכריח את המודל לא לסטות מההנחיות ומהספר
        systemInstruction: {
          parts: [{ text: enhancedSystemPrompt }]
        },
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { 
          maxOutputTokens: 1000, 
          temperature: 0.1 // טמפרטורה כמעט אפס כדי למנוע יצירתיות והמצאות הלכתיות
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("API Error:", data);
      return new Response(JSON.stringify({ error: "שגיאה בחיבור למודל" }), { status: 500 });
    }

    return new Response(JSON.stringify({ text: data.candidates[0].content.parts[0].text }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
