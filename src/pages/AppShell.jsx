import { useStore } from '../store/useStore'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import PersonnelPage from './PersonnelPage'
import TrainingPage from './TrainingPage'
import EquipmentPage from './EquipmentPage'
import CleaningPage from './CleaningPage'
import TasksPage from './TasksPage'
import IncidentsPage from './IncidentsPage'
import QnAPage from './QnAPage'
import TimelinePage from './TimelinePage'
import CommandPage from './CommandPage'
import UnitManagePage from './UnitManagePage'
import ChatPage from './ChatPage'

const BOTTOM_NAV = [
  { id: 'dashboard', label: 'ראשי',       icon: '🏠' },
  { id: 'personnel', label: 'כוח אדם',    icon: '👥' },
  { id: 'training',  label: 'הכשרה',      icon: '🎓' },
  { id: 'qna',       label: 'שו״ת הלכתי', icon: '⚖️' },
  { id: 'chat',      label: 'צ׳אט',       icon: '💬' },
]

const FULL_NAV = [
  { id: 'dashboard',  label: '🏠 ראשי',             admin: false, seniorOnly: false },
  { id: 'personnel',  label: '👥 כוח אדם',          admin: false, seniorOnly: false },
  { id: 'training',   label: '🎓 הכשרות',           admin: false, seniorOnly: false },
  { id: 'equipment',  label: '📦 ציוד',             admin: false, seniorOnly: false },
  { id: 'cleaning',   label: '🧹 ניקיונות',         admin: false, seniorOnly: false },
  { id: 'tasks',      label: '✅ משימות',           admin: false, seniorOnly: false },
  { id: 'incidents',  label: '🆘 חריגים',           admin: false, seniorOnly: false },
  { id: 'qna',        label: '⚖️ שו"ת הלכתי',        admin: false, seniorOnly: false },
  { id: 'timeline',   label: '📅 לוח שנה',          admin: false, seniorOnly: false },
  { id: 'chat',       label: "💬 צ'אט יחידות",      admin: false, seniorOnly: false },
  { id: 'command',    label: '⭐ פיקוד על',         admin: false, seniorOnly: true  }, 
  { id: 'unitmanage', label: '⚙ ניהול',             admin: true,  seniorOnly: false }, 
]

export default function AppShell() {
  const { currentUnit, isAdmin, isSenior, activePage, setPage, logout } = useStore()
  const [clock, setClock] = useState('')
  const [days, setDays] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertDismissed, setAlertDismissed] = useState(new Set())
  const [newAlertText, setNewAlertText] = useState('')
  const [showAlertInput, setShowAlertInput] = useState(false)

  // ── מנגנון שער ההזדהות החדש ──
  const [showGate, setShowGate] = useState(false)
  const [gatePeople, setGatePeople] = useState([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    if (!currentUnit || isAdmin || isSenior) return
    const authKey = `auth_${currentUnit.id}`
    if (sessionStorage.getItem(authKey)) return // כבר הזדהה בסשן הזה

    async function checkAuth() {
      const { data } = await supabase.from('personnel').select('*').eq('unit_id', currentUnit.id).order('name')
      if (!data || data.length === 0) {
        // אין חיילים בכלל ביחידה? נאפשר כניסה חד פעמית כדי שיוכלו להקים את היחידה
        sessionStorage.setItem(authKey, 'first_time_admin')
        sessionStorage.setItem('canEdit', 'true')
      } else {
        setGatePeople(data)
        setShowGate(true)
      }
    }
    checkAuth()
  }, [currentUnit, isAdmin, isSenior])

  function handleGateLogin() {
    if (!selectedPersonId) return
    const person = gatePeople.find(p => p.id === selectedPersonId)
    const isPrivileged = ['רב', 'קצין שליטה'].includes(person.role)
    
    if (isPrivileged) {
      // חייב קוד PIN — אם לא הוגדר קוד בכלל, חסום כניסה
      if (!person.pin_code) {
        setPinError(true)
        return // אין קוד מוגדר — פנה למנהל
      }
      if (person.pin_code !== pinInput) {
        setPinError(true)
        return
      }
      sessionStorage.setItem('canEdit', 'true')
    } else {
      sessionStorage.setItem('canEdit', 'false')
    }
    
    sessionStorage.setItem(`auth_${currentUnit.id}`, person.id)
    setShowGate(false)
  }

  // שאר שעון ומבזקים...
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDays(Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000)))
    }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  // ── מנגנון המבזקים עם Push Notifications ──
  useEffect(() => {
    // 1. בקשת הרשאה מהדפדפן לשלוח התראות
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    loadAlerts()
    
    const sub = supabase.channel('alerts_rt').on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_alerts' }, (payload) => {
      loadAlerts() // תמיד לרענן את רשימת המבזקים באפליקציה

      // 2. אם זה מבזק חדש שנכנס עכשיו, נקפיץ התראה (פוש) למכשיר
      if (payload.eventType === 'INSERT' && payload.new.is_active) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('📢 מבזק חמ"ל חדש!', {
            body: payload.new.message,
          });
        }
      }
    }).subscribe()
    
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadAlerts() {
    const { data } = await supabase.from('broadcast_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5)
    setAlerts(data || [])
  }
  async function sendAlert() {
    if (!newAlertText.trim()) return
    await supabase.from('broadcast_alerts').insert({ message: newAlertText.trim(), sent_by: currentUnit?.name, is_active: true })
    // שלח Push לכל המכשירים הרשומים
    try {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📢 מבזק חמ"ל: ' + currentUnit?.name,
          body: newAlertText.trim()
        })
      })
    } catch {}
    setNewAlertText(''); setShowAlertInput(false)
  }
  async function deleteAlert(id) {
    await supabase.from('broadcast_alerts').update({ is_active: false }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const canSeeAdmin = isAdmin
  const canSeeSenior = isAdmin || isSenior
  const visibleNav = FULL_NAV.filter(n => { if (n.admin) return canSeeAdmin; if (n.seniorOnly) return canSeeSenior; return true })
  const visibleAlerts = alerts.filter(a => !alertDismissed.has(a.id))

  const pages = {
    dashboard: <Dashboard />, personnel: <PersonnelPage />, training: <TrainingPage />,
    equipment: <EquipmentPage />, cleaning: <CleaningPage />, tasks: <TasksPage />,
    incidents: <IncidentsPage />, qna: <QnAPage />, timeline: <TimelinePage />,
    command: <CommandPage />, unitmanage: <UnitManagePage />, chat: <ChatPage />,
  }

  function navTo(id) { setPage(id); setMenuOpen(false) }

  function handleLogout() {
    sessionStorage.clear()
    logout()
  }

  // ── מסך החסימה וההזדהות ──
  if (showGate) {
    const selected = gatePeople.find(p => p.id === selectedPersonId)
    const needsPin = selected && ['רב', 'קצין שליטה'].includes(selected.role)
    
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center p-4" dir="rtl">
        <div className="card p-6 w-full max-w-sm border border-gold/30 shadow-[0_0_20px_rgba(245,200,66,0.15)] space-y-5">
          <div className="text-center mb-2">
            <div className="text-5xl mb-3">🛡️</div>
            <h2 className="text-2xl font-black text-gold">הזדהות חמ"ל</h2>
            <p className="text-sm text-text3 mt-1">יחידה: {currentUnit.name}</p>
          </div>
          
          <div>
            <label className="text-sm text-text2 font-bold mb-1 block">מי אתה?</label>
            <select className="form-input w-full bg-bg3 border-border2 text-text1" value={selectedPersonId} onChange={e => { setSelectedPersonId(e.target.value); setPinError(false); setPinInput(''); }}>
              <option value="">-- בחר את שמך מהרשימה --</option>
              {gatePeople.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
            </select>
          </div>
          
          {needsPin && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-sm text-text2 font-bold mb-1 block text-center">קוד אבטחה אישי</label>
              <input type="password" pattern="[0-9]*" inputMode="numeric" maxLength="4" 
                className={`form-input w-full text-center tracking-[1em] font-mono text-2xl h-12 bg-bg2 ${pinError ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-gold/50 text-gold focus:border-gold'}`} 
                value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }} placeholder="••••" />
              {pinError && <p className="text-red-400 text-xs mt-1 text-center font-bold">קוד שגוי. נסה שוב.</p>}
              <p className="text-[10px] text-text3 text-center mt-2">הרשאת סגל פיקוד דורשת קוד בעל 4 ספרות שהוגדר מראש</p>
            </div>
          )}
          
          <button onClick={handleGateLogin} disabled={!selectedPersonId} className="btn w-full btn-blue h-12 text-lg mt-2 disabled:opacity-50">
            היכנס למערכת
          </button>
        </div>
      </div>
    )
  }

  // ── שאר האפליקציה הרגילה ──
  return (
    <div className="min-h-screen flex flex-col bg-bg0" dir="rtl">
      {/* Top bar */}
      <header className="h-14 bg-bg1 border-b border-border1 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden w-8 h-8 rounded-lg bg-bg3 border border-border1 flex flex-col items-center justify-center gap-1">
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}/>
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? 'opacity-0' : ''}`}/>
            <span className={`w-4 h-0.5 bg-text2 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}/>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg">✡</span><span className="bg-yellow-900/30 border border-yellow-600/40 text-gold text-xs font-black px-3 py-1 rounded-full max-w-[130px] truncate">{currentUnit?.name}</span>
          </div>
        </div>
        <nav className="hidden lg:flex gap-0.5 mx-auto overflow-x-auto scrollbar-hide">
          {visibleNav.map(n => <button key={n.id} onClick={() => navTo(n.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activePage === n.id ? 'bg-yellow-900/30 text-gold' : 'text-text2 hover:text-text1 hover:bg-bg3'}`}>{n.label}</button>)}
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:flex items-center gap-1.5 bg-bg3 border border-border2 text-gold2 text-xs font-bold px-3 py-1 rounded-full">⏳ {days} ימים</span>
          <span className="text-text3 text-xs font-mono hidden md:block">{clock}</span>
          {canSeeSenior && <button onClick={() => setShowAlertInput(!showAlertInput)} className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${showAlertInput ? 'bg-yellow-900/40 border-gold text-gold' : 'bg-bg3 border-border1 text-text2 hover:border-border2'}`}>📢</button>}
          <button onClick={handleLogout} className="hidden sm:block text-xs text-text3 hover:text-text1 border border-border1 hover:border-border2 px-3 py-1 rounded-lg transition-all">← התנתק</button>
        </div>
      </header>

      {showAlertInput && canSeeSenior && (
        <div className="bg-yellow-900/20 border-b border-gold/30 px-4 py-2 flex gap-2 items-center z-40">
          <span className="text-gold text-sm flex-shrink-0">📢 מבזק:</span>
          <input className="flex-1 bg-bg3 border border-border2 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold" value={newAlertText} onChange={e => setNewAlertText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAlert()} placeholder='לדוגמה: "שעת השריפה עודכנה ל-10:00"' />
          <button onClick={sendAlert} className="btn btn-sm">שלח</button><button onClick={() => setShowAlertInput(false)} className="text-text3 hover:text-text1">✕</button>
        </div>
      )}

      {visibleAlerts.map(alert => (
        <div key={alert.id} className="bg-red-900/25 border-b border-red-500/40 px-4 py-2.5 flex items-center gap-3 z-40">
          <span className="text-red-400 text-base flex-shrink-0">🚨</span>
          <div className="flex-1 min-w-0"><span className="text-red-200 text-sm font-bold">{alert.message}</span>{alert.sent_by && <span className="text-red-400/70 text-xs mr-2">— {alert.sent_by}</span>}</div>
          {canSeeAdmin && <button onClick={() => deleteAlert(alert.id)} className="text-red-400/60 hover:text-red-400 text-xs border border-red-500/20 rounded px-1.5 py-0.5 flex-shrink-0">🗑</button>}
          <button onClick={() => setAlertDismissed(prev => new Set([...prev, alert.id]))} className="text-red-400/60 hover:text-red-300 text-xs flex-shrink-0">✕</button>
        </div>
      ))}

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-bg1 border-l border-border1 flex flex-col lg:hidden shadow-2xl">
            <div className="h-14 flex items-center px-4 border-b border-border1 gap-3"><span className="text-gold font-black">📋 תפריט</span><div className="flex-1" /><button onClick={() => setMenuOpen(false)} className="text-text3 hover:text-text1 text-lg">✕</button></div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {visibleNav.map(n => <button key={n.id} onClick={() => navTo(n.id)} className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${activePage === n.id ? 'bg-yellow-900/30 text-gold border border-gold/30' : 'text-text2 hover:bg-bg3 hover:text-text1'}`}>{n.label}</button>)}
            </nav>
            <div className="p-4 border-t border-border1"><button onClick={() => { handleLogout(); setMenuOpen(false) }} className="w-full btn text-sm border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">← התנתק מהיחידה</button></div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-24 lg:pb-4"><div className="max-w-5xl mx-auto px-4 py-5">{pages[activePage] || <Dashboard />}</div></main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-bg2/95 backdrop-blur-md border-t border-border1 z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center h-16 px-1">
          {BOTTOM_NAV.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)} className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all rounded-xl ${activePage === n.id ? 'text-gold' : 'text-gray-300 hover:text-white hover:bg-bg3/50'}`}>
              <span className={`text-2xl transition-transform ${activePage === n.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,200,66,0.6)]' : 'opacity-80'}`}>{n.icon}</span>
              <span className={`text-[11px] font-bold ${activePage === n.id ? 'text-gold' : 'text-gray-300'}`}>{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
