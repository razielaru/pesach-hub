export const maxDuration = 300; 
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });

  if (!process.env.GEMINI_API_KEY)
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY לא מוגדר' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });

  try {
    // במקום לשלוח שאלה ל-AI, אנחנו מושכים את רשימת המודלים מהחשבון שלך
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();

    let responseText = "לא הצלחתי למשוך מודלים";
    
    if (data.models) {
      // מסננים רק מודלים שמסוגלים לייצר טקסט, ושולפים את השם שלהם
      const modelNames = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => `✅ ${m.name.replace('models/', '')}`)
        .join('\n');
        
      responseText = `המודלים הפתוחים עבורך כרגע ב-API הם:\n\n${modelNames}\n\n* תעתיק לפה את השם של המודל שהכי נראה לך (למשל gemini-1.5-pro או משהו דומה שיש לך ברשימה) כדי שנחזיר אותו לקוד האמיתי.`;
    } else {
      responseText = "התקבלה שגיאה מגוגל:\n" + JSON.stringify(data);
    }

    // אורזים את התשובה בפורמט סטרימינג שהצ'אט ב-QnAPage יודע לקרוא
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: responseText }] } }]
    });

    return new Response(`data: ${payload}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
