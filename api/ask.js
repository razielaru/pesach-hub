import { HALACHA_DB } from './knowledge.js';
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY)
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY לא מוגדר' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });

  try {
    const { messages, systemPrompt } = await req.json();

    // 1. הסרנו את ה-slice! עכשיו הוא קורא את כל 131 העמודים.
    const system = `${systemPrompt}\n\n=== ספר ההכשרות הצבאי (פסח תשפ"ו) ===\n${HALACHA_DB}\n=== סוף הספר ===\n\nהנחיות: ענה בעברית קצרה וברורה. התבסס אך ורק על הספר המצורף. אם צריך אישור חריג, ציין זאת. בסוף כל תשובה: "בכל ספק — פנה לרב היחידה."`;

    // 2. שמנו את המודל החכם והמדויק ביותר (שזמין לך בחשבון)
    const targetModel = "gemini-2.5-pro";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }),
        { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // מעביר streaming ישירות לclient
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
