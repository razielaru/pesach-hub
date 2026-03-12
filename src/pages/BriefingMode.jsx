import { useEffect, useState, useCallback } from 'react'
import supabase from '../supabaseClient'
import { UNITS } from '../lib/units'

// ─── SmartAlerts engine (shared logic) ────────────────────────────────────
export function useSmartAlerts(unitStats, daysLeft) {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!unitStats || Object.keys(unitStats).length === 0) return
    const found = []

    Object.entries(unitStats).forEach(([uid, s]) => {
      const unit = UNITS.find(u => u.id === uid)
      if (!unit) return
      const name = unit.name

      // אם קרוב לפסח ועדיין לא סיימו הכשרות
      if (daysLeft <= 5 && s.trainedPct < 50)
        found.push({ id: `tr-${uid}`, level: 'critical', icon: '🆘',
          text: `${name} — רק ${s.trainedPct}% הכשרות הושלמו! נותרו ${daysLeft} ימים`,
          unit: uid })

      else if (daysLeft <= 10 && s.trainedPct < 70)
        found.push({ id: `tr-${uid}`, level: 'warning', icon: '⚠️',
          text: `${name} — ${s.trainedPct}% הכשרות, פיגור מאחורי הזמנים`,
          unit: uid })

      // ניקיון — פיגור
      if (daysLeft <= 7 && s.cleanPct < 40)
        found.push({ id: `cl-${uid}`, level: 'critical', icon: '🧹',
          text: `${name} — ${s.cleanPct}% ניקיון בלבד, ${daysLeft} ימים לפסח!`,
          unit: uid })

      // חריגים פתוחים קריטיים
      if (s.openInc >= 3)
        found.push({ id: `inc-${uid}`, level: 'critical', icon: '🆘',
          text: `${name} — ${s.openInc} חריגים פתוחים ללא מענה`,
          unit: uid })
      else if (s.openInc > 0)
        found.push({ id: `inc1-${uid}`, level: 'warning', icon: '⚠️',
          text: `${name} — ${s.openInc} חריג פתוח`,
          unit: uid })

      // ציוד חסר קריטי
      if (s.equipMissing >= 5)
        found.push({ id: `eq-${uid}`, level: 'critical', icon: '📦',
          text: `${name} — ${s.equipMissing} פריטי ציוד חסרים`,
          unit: uid })

      // אין כוח אדם בכלל
      if (s.total === 0)
        found.push({ id: `kd-${uid}`, level: 'info', icon: 'ℹ️',
          text: `${name} — אין נתוני כוח אדם במערכת`,
          unit: uid })
    })

    // מיין: קריטי ראשון, אז אזהרה
    found.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.level] - order[b.level]
    })

    setAlerts(found)
  }, [unitStats, daysLeft])

  return alerts
}

// ─── Briefing Mode Component ──────────────────────────────────────────────
export default function BriefingMode({ unitStats, onClose }) {
  const [slide, setSlide] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const daysLeft = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))
  const smartAlerts = useSmartAlerts(unitStats, daysLeft)

  const nonAdminUnits = UNITS.filter(u => !u.is_admin)
  const totals = Object.values(unitStats)
  const avgTrained = totals.length ? Math.round(totals.reduce((a,s)=>a+s.trainedPct,0)/totals.length) : 0
  const avgClean   = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0
  const totalMissing = totals.reduce((a,s)=>a+s.equipMissing,0)
  const totalInc     = totals.reduce((a,s)=>a+s.openInc,0)
  const greenUnits   = totals.filter(s=>s.health==='green').length
  const redUnits     = totals.filter(s=>s.health==='red').length

  const SLIDES = [
    { id: 'overview', label: 'סקירה כללית' },
    { id: 'training', label: 'הכשרות' },
    { id: 'cleaning', label: 'ניקיון' },
    { id: 'alerts',   label: `התראות (${smartAlerts.filter(a=>a.level==='critical').length})` },
  ]

  // Auto-advance slides
  useEffect(() => {
    if (!autoPlay) return
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 8000)
    return () => clearInterval(t)
  }, [autoPlay, SLIDES.length])

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setSlide(s => (s + 1) % SLIDES.length)
      if (e.key === 'ArrowRight') setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length)
      if (e.key === ' ') setAutoPlay(p => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [SLIDES.length, onClose])

  const now = new Date().toLocaleString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  })

  // ── health color helpers ──
  function hColor(pct, goodThresh=80, warnThresh=50) {
    if (pct >= goodThresh) return 'text-green-400'
    if (pct >= warnThresh) return 'text-orange-400'
    return 'text-red-400'
  }
  function hBg(pct, goodThresh=80, warnThresh=50) {
    if (pct >= goodThresh) return 'bg-green-500'
    if (pct >= warnThresh) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#080c1a] flex flex-col" dir="rtl">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="text-3xl">✡</span>
          <div>
            <div className="text-white font-black text-lg leading-tight">רבנות פיקוד מרכז</div>
            <div className="text-yellow-400/70 text-xs">מבצע פסח תשפ״ו — הערכת מצב</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Days counter */}
          <div className="text-center">
            <div className={`text-5xl font-black leading-none ${daysLeft <= 3 ? 'text-red-400 animate-pulse' : daysLeft <= 7 ? 'text-orange-400' : 'text-yellow-400'}`}>
              {daysLeft}
            </div>
            <div className="text-white/50 text-xs mt-0.5">ימים לפסח</div>
          </div>

          {/* Clock */}
          <div className="text-white/40 text-sm text-left hidden md:block">
            <div className="font-mono text-lg text-white/70">{new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-xs">{now.split(',')[0]}</div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={() => setAutoPlay(p => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                ${autoPlay ? 'bg-green-900/40 border-green-500/50 text-green-400' : 'bg-bg3 border-border2 text-text3'}`}>
              {autoPlay ? '⏸ עצור' : '▶ הפעל'}
            </button>
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all">
              ✕ סגור
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide nav ── */}
      <div className="flex gap-1 px-8 pt-4">
        {SLIDES.map((s, i) => (
          <button key={s.id} onClick={() => { setSlide(i); setAutoPlay(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border
              ${slide === i
                ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
                : 'border-white/10 text-white/40 hover:text-white/70'}`}>
            {s.label}
          </button>
        ))}
        {/* Progress bar */}
        {autoPlay && (
          <div className="flex-1 flex items-center px-4">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div key={slide} className="h-full bg-yellow-400/60 rounded-full animate-[briefing-progress_8s_linear_forwards]"
                style={{ animation: 'briefing_progress 8s linear forwards' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Slide content ── */}
      <div className="flex-1 px-8 py-6 overflow-hidden">

        {/* SLIDE 0 — Overview */}
        {slide === 0 && (
          <div className="h-full flex flex-col gap-6">
            <h2 className="text-3xl font-black text-white">📊 סקירה כללית — כל יחידות הפיקוד</h2>

            {/* Big KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
              {[
                { label: 'הכשרה ממוצעת', val: `${avgTrained}%`, color: hColor(avgTrained), sub: 'מכלל הכוח' },
                { label: 'ניקיון ממוצע',  val: `${avgClean}%`,   color: hColor(avgClean),   sub: 'מכלל האזורים' },
                { label: 'ציוד חסר',      val: totalMissing,     color: totalMissing>0?'text-red-400':'text-green-400', sub: 'פריטים' },
                { label: 'חריגים פתוחים', val: totalInc,         color: totalInc>0?'text-red-400':'text-green-400', sub: 'ממתינים לטיפול' },
              ].map(k => (
                <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className={`text-6xl font-black leading-none mb-2 ${k.color}`}>{k.val}</div>
                  <div className="text-white/80 font-bold">{k.label}</div>
                  <div className="text-white/40 text-xs mt-1">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Unit health grid */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {nonAdminUnits.map(u => {
                  const s = unitStats[u.id] || {}
                  const h = s.health || 'orange'
                  return (
                    <div key={u.id}
                      className={`rounded-xl p-3 border-2 text-center
                        ${h==='green' ? 'border-green-500/50 bg-green-900/15'
                          : h==='red' ? 'border-red-500/60 bg-red-900/20 animate-pulse'
                          : 'border-orange-500/50 bg-orange-900/15'}`}>
                      <div className="text-2xl mb-1">{u.icon}</div>
                      <div className="text-white font-black text-xs leading-tight">{u.name}</div>
                      <div className={`text-xs font-bold mt-1
                        ${h==='green'?'text-green-400':h==='red'?'text-red-400':'text-orange-400'}`}>
                        {h==='green'?'✓ תקין':h==='red'?'⚠ קריטי':'~ עיכוב'}
                      </div>
                      <div className="text-white/40 text-[10px] mt-1">{s.trainedPct||0}% הכשרה</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1 — Training */}
        {slide === 1 && (
          <div className="h-full flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white">🎓 סטטוס הכשרות — כל היחידות</h2>
            <div className="flex-1 overflow-auto space-y-3">
              {[...nonAdminUnits]
                .sort((a,b) => (unitStats[b.id]?.trainedPct||0) - (unitStats[a.id]?.trainedPct||0))
                .map(u => {
                  const s = unitStats[u.id] || {}
                  const pct = s.trainedPct || 0
                  return (
                    <div key={u.id} className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3">
                      <span className="text-2xl w-8">{u.icon}</span>
                      <span className="text-white font-bold w-36 flex-shrink-0">{u.name}</span>
                      <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${hBg(pct)}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-2xl font-black w-16 text-right ${hColor(pct)}`}>{pct}%</span>
                      <span className="text-white/40 text-xs w-24 text-right">
                        {s.total > 0 ? `${Math.round(s.total * pct / 100)}/${s.total} אנשים` : 'אין נתון'}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* SLIDE 2 — Cleaning */}
        {slide === 2 && (
          <div className="h-full flex flex-col gap-4">
            <h2 className="text-3xl font-black text-white">🧹 סטטוס ניקיון — כל היחידות</h2>
            <div className="flex-1 overflow-auto space-y-3">
              {[...nonAdminUnits]
                .sort((a,b) => (unitStats[b.id]?.cleanPct||0) - (unitStats[a.id]?.cleanPct||0))
                .map(u => {
                  const s = unitStats[u.id] || {}
                  const pct = s.cleanPct || 0
                  return (
                    <div key={u.id} className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3">
                      <span className="text-2xl w-8">{u.icon}</span>
                      <span className="text-white font-bold w-36 flex-shrink-0">{u.name}</span>
                      <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${hBg(pct)}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-2xl font-black w-16 text-right ${hColor(pct)}`}>{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* SLIDE 3 — Smart Alerts */}
        {slide === 3 && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white">🔔 התראות חכמות אוטומטיות</h2>
              <span className="bg-red-900/40 border border-red-500/50 text-red-400 px-3 py-1 rounded-full text-sm font-bold">
                {smartAlerts.filter(a=>a.level==='critical').length} קריטי
                {' · '}
                {smartAlerts.filter(a=>a.level==='warning').length} אזהרה
              </span>
            </div>
            <div className="flex-1 overflow-auto space-y-3">
              {smartAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="text-7xl">✅</div>
                  <div className="text-white/70 text-2xl font-bold">כל היחידות עומדות בדרישות!</div>
                </div>
              ) : smartAlerts.map(a => (
                <div key={a.id}
                  className={`flex items-center gap-4 rounded-xl px-5 py-4 border
                    ${a.level==='critical'
                      ? 'bg-red-900/30 border-red-500/50'
                      : a.level==='warning'
                        ? 'bg-orange-900/30 border-orange-500/50'
                        : 'bg-blue-900/30 border-blue-500/30'}`}>
                  <span className="text-3xl">{a.icon}</span>
                  <span className={`text-lg font-bold
                    ${a.level==='critical'?'text-red-200':a.level==='warning'?'text-orange-200':'text-blue-200'}`}>
                    {a.text}
                  </span>
                  <span className={`mr-auto px-3 py-1 rounded-full text-xs font-black border
                    ${a.level==='critical'
                      ? 'bg-red-900/50 border-red-500/40 text-red-400'
                      : a.level==='warning'
                        ? 'bg-orange-900/50 border-orange-500/40 text-orange-400'
                        : 'bg-blue-900/50 border-blue-500/40 text-blue-400'}`}>
                    {a.level==='critical'?'קריטי':a.level==='warning'?'אזהרה':'מידע'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-8 py-3 border-t border-white/10 flex items-center justify-between text-white/30 text-xs">
        <span>← → לניווט בין שקפים · Space להשהיה · Esc לסגירה</span>
        <span className="flex gap-2">
          {SLIDES.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-yellow-400' : 'bg-white/20'}`} />
          ))}
        </span>
        <span>רבנות פיקוד מרכז · {now}</span>
      </div>
    </div>
  )
}
