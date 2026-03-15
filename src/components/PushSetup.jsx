import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const VAPID_PUBLIC = 'BBWxx_HlNrtcnpD8tz_z-quSEBk0SJG_IiuNT-ySppVibY6f2M1EY_oE74axRc9UelXfYGt0QfGMMeFgpN8csjY'

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out
}

export default function PushSetup() {
  const { currentUnit, showToast } = useStore()
  const [status, setStatus] = useState('loading') // loading | not-supported | needs-enable | registered | error

  useEffect(() => {
    if (!currentUnit) return
    checkStatus()
  }, [currentUnit])

  async function checkStatus() {
    // בדוק תמיכה
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('not-supported'); return
    }
    // בדוק הרשאה
    if (Notification.permission !== 'granted') {
      setStatus('needs-enable'); return
    }
    // בדוק שיש subscription פעיל ורשום ב-Supabase
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setStatus('needs-enable'); return }

      // וודא שהסאב רשום ב-Supabase — אם לא, רשום אותו
      const endpoint = sub.endpoint
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('unit_id', currentUnit.id)
        .limit(1)

      if (!data || data.length === 0) {
        // יש subscription בדפדפן אבל לא ב-Supabase — רשום
        await supabase.from('push_subscriptions').insert({
          unit_id: currentUnit.id,
          subscription: sub.toJSON()
        })
      }
      setStatus('registered')
    } catch (e) {
      console.error(e)
      setStatus('needs-enable')
    }
  }

  async function enable() {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        showToast('יש לאשר קבלת התראות בהגדרות הדפדפן', 'orange')
        setStatus('needs-enable'); return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // בטל subscription ישן אם קיים
      const oldSub = await reg.pushManager.getSubscription()
      if (oldSub) await oldSub.unsubscribe()

      // צור subscription חדש
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC)
      })

      // מחק רשומות ישנות של היחידה הזו ורשום חדש
      await supabase.from('push_subscriptions').delete().eq('unit_id', currentUnit.id)
      await supabase.from('push_subscriptions').insert({
        unit_id: currentUnit.id,
        subscription: sub.toJSON()
      })

      setStatus('registered')
      showToast('🔔 התראות פוש חוברו בהצלחה!', 'green')
    } catch (err) {
      console.error(err)
      showToast('שגיאה: ' + err.message, 'red')
      setStatus('error')
    }
  }

  async function testPush() {
    showToast('שולח התראת ניסיון...', 'orange')
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: currentUnit.id,
          title: '🚨 חמ"ל פסח: התראה חיה!',
          body: 'החיבור בוצע בהצלחה! מערכת השליטה מוכנה.'
        })
      })
      const data = await res.json()
      if (data.count > 0) showToast(`📲 התראה נשלחה ל-${data.count} מכשירים!`, 'green')
      else showToast('לא נמצאו מכשירים רשומים — נסה להפעיל שוב', 'orange')
    } catch (e) {
      showToast('שגיאה בשליחה: ' + e.message, 'red')
    }
  }

  if (status === 'loading') return null
  if (status === 'not-supported') return (
    <div className="text-xs text-text3 text-center py-1">⚠️ הדפדפן לא תומך בהתראות (השתמש בכרום אנדרואיד)</div>
  )

  return (
    <div className="flex gap-2 mb-2">
      {status === 'needs-enable' || status === 'error' ? (
        <button onClick={enable}
          className="flex-1 btn bg-purple-900/40 border-purple-500/50 text-purple-300 hover:bg-purple-800/50">
          🔔 הפעל קבלת התראות לפלאפון
        </button>
      ) : (
        <button onClick={testPush}
          className="flex-1 btn bg-green-900/40 border-green-500/50 text-green-300 hover:bg-green-800/50">
          📲 מחובר ✓ — לחץ לבדיקת התראה
        </button>
      )}
    </div>
  )
}
