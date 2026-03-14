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

    const system = `${systemPrompt}

=== ספר ההכשרות הצבאי (פסח תשפ"ו) ===
${HALACHA_DB.slice(0, 8000)}
=== סוף הספר ===

הנחיות: ענה בעברית קצרה וברורה. התבסס על הספר בלבד. בסוף כל תשובה: "בכל ספק — פנה לרב היחידה."`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
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
