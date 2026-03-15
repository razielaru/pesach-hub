export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return new Response(
      `data: ${JSON.stringify({candidates:[{content:{parts:[{text:'❌ GEMINI_API_KEY לא מוגדר ב-Vercel Environment Variables.'}]}}]})}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );

  try {
    const { messages, systemPrompt } = await req.json();

    const system = (systemPrompt || 'אתה רב צבאי מומחה בהלכות פסח. ענה בעברית קצרה וברורה לחיילים.') +
      '\n\nבסוף כל תשובה: "בכל ספק — פנה לרב היחידה."';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: (messages||[]).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `שגיאה מ-Gemini (${res.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson?.error?.message || errMsg;
      } catch {}
      return new Response(
        `data: ${JSON.stringify({candidates:[{content:{parts:[{text:`❌ ${errMsg}`}]}}]})}\n\n`,
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    });

  } catch (e) {
    return new Response(
      `data: ${JSON.stringify({candidates:[{content:{parts:[{text:`❌ שגיאת שרת: ${e.message}`}]}}]})}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
