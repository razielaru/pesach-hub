import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

// המפתח הציבורי שלך
const VAPID_PUBLIC = 'BBWxx_HlNrtcnpD8tz_z-quSEBk0SJG_IiuNT-ySppVibY6f2M1EY_oE74axRc9UelXfYGt0QfGMMeFgpN8csjY';

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSetup() {
  const { currentUnit, showToast } = useStore()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setEnabled(true)
    }
  }, [])

  async function enable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('הדפדפן לא תומך בהתראות פוש (מומלץ כרום באנדרואיד)', 'red')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        showToast('יש לאשר קבלת התראות בהגדרות הדפדפן', 'orange')
        return
      }
      
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC)
      })

      // שמירת המנוי במסד הנתונים
      await supabase.from('push_subscriptions').insert({
        unit_id: currentUnit.id,
        subscription: sub
      })
      
      setEnabled(true)
      showToast('🔔 התראות פוש חוברו בהצלחה!', 'green')
    } catch(err) {
      console.error(err)
      showToast('שגיאה בחיבור מערכת ההתראות', 'red')
    }
  }

  async function testPush() {
    showToast('שולח התראה מבצעית...', 'orange')
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         unit_id: currentUnit.id,
         title: '🚨 חמ"ל פסח: התראה חיה!', 
         body: 'החיבור בוצע בהצלחה! מערכת השליטה מוכנה.'
      })
    })
  }

  return (
    <div className="flex gap-2 mb-2">
      {!enabled ? (
        <button onClick={enable} className="flex-1 btn bg-purple-900/40 border-purple-500/50 text-purple-300 hover:bg-purple-800/50">
          🔔 הפעל קבלת התראות לפלאפון
        </button>
      ) : (
        <button onClick={testPush} className="flex-1 btn bg-green-900/40 border-green-500/50 text-green-300 hover:bg-green-800/50 animate-pulse">
          📲 מערכת מחוברת! לחץ לבדיקת התראה עכשיו
        </button>
      )}
    </div>
  )
}
