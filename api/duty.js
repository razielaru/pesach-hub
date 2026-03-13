// AI קצין תורן — שאלות על נתוני המערכת בזמן אמת
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ text: '❌ GEMINI_API_KEY לא מוגדר' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { question, unitData } = await req.json();

    const systemPrompt = `אתה קצין תורן AI של רבנות פיקוד מרכז. 
תפקידך לנתח נתוני מצב מבצעי בזמן אמת ולענות על שאלות מפקד.
ענה בעברית, בצורה תמציתית, מקצועית וצבאית.
מבנה תשובה: נקודות עיקריות, המלצת פעולה.
`;

    const dataContext = `=== נתוני מצב נוכחי ===
תאריך: ${new Date().toLocaleDateString('he-IL')}
ימים לפסח: ${Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))}

${JSON.stringify(unitData, null, 2)}
=== סוף נתונים ===`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: dataContext + '\n\nשאלה: ' + question }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'שגיאה לא ידועה';
      return new Response(JSON.stringify({ text: `❌ שגיאה: ${msg}` }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה';
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ text: `❌ שגיאת שרת: ${err.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
