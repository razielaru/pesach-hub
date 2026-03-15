import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// חיבור למסד הנתונים של היחידות
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // חייבים לקבל בקשת POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // טעינת המפתחות שהזנת ב-Vercel
  webpush.setVapidDetails(
    'mailto:razielarusiidfrav@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    const { unit_id, title, body } = req.body;

    // משיכת רשימת הטלפונים (המנויים) של היחידה הרלוונטית
    let query = supabase.from('push_subscriptions').select('subscription');
    if (unit_id) query = query.eq('unit_id', unit_id);
    
    const { data: subs } = await query;

    if (!subs || subs.length === 0) return res.status(200).json({ message: 'No devices found' });

    const payload = JSON.stringify({ title, body, url: '/' });

    // שיגור ההתראה לכל המכשירים במקביל!
    await Promise.all(subs.map(s => 
      webpush.sendNotification(s.subscription, payload).catch(async (e) => {
        // מחיקת מנויים ישנים (טלפונים שהחליפו דפדפן וכו') כדי לא להעמיס על השרת
        if (e.statusCode === 410 || e.statusCode === 404) {
           await supabase.from('push_subscriptions').delete().eq('subscription', s.subscription);
        }
      })
    ));

    res.status(200).json({ success: true, count: subs.length });
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).json({ error: err.message });
  }
}
