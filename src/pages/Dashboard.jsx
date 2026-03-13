import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import KpiCard from '../components/ui/KpiCard'
import { getSubordinateUnits, UNITS } from '../lib/units'

const LOGO_CACHE = {}

export default function Dashboard() {
  const { currentUnit, setPage, isSenior, isAdmin } = useStore()
  const [stats, setStats] = useState({ trained:0, active:0, available:0, missingEquip:0, cleanPct:0, total:0 })
  const [tasks, setTasks] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitLogo, setUnitLogo] = useState(LOGO_CACHE[currentUnit?.id] || null)
  const [readiness, setReadiness] = useState(0)
  const [silentUnits, setSilentUnits] = useState([])   // יחידות ללא דיווח 24 שעות
  const [lastActivity, setLastActivity] = useState({}) // unit_id → last created_at
  const days = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))

  useEffect(() => {
    if (!currentUnit) return
    loadStats()
    if (!LOGO_CACHE[currentUnit.id]) loadLogo()
    const ch = supabase.channel('incidents_dash')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'incidents' }, () => loadStats())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function loadStats() {
    const uid = currentUnit.id
    const subs = getSubordinateUnits(uid)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [uid]
    const inF = q => ids.length === 1 ? q.eq('unit_id', ids[0]) : q.in('unit_id', ids)

    const [pers, equip, areas, openTasks, openInc, lastPers, lastInc, lastClean] = await Promise.all([
      inF(supabase.from('personnel').select('status,training_status,unit_id')),
      inF(supabase.from('equipment').select('have,need,unit_id')),
      inF(supabase.from('cleaning_areas').select('status,unit_id,updated_at')),
      inF(supabase.from('tasks').select('id,title,priority,status,assigned_by').neq('status','done').order('created_at',{ascending:false}).limit(4)),
      inF(supabase.from('incidents').select('id,title,severity,unit_id').eq('status','open').order('created_at',{ascending:false}).limit(3)),
      // לצורך זיהוי פעילות אחרונה
      inF(supabase.from('personnel').select('unit_id,created_at').order('created_at',{ascending:false}).limit(200)),
      inF(supabase.from('incidents').select('unit_id,created_at').order('created_at',{ascending:false}).limit(100)),
      inF(supabase.from('cleaning_areas').select('unit_id,updated_at').order('updated_at',{ascending:false}).limit(100)),
    ])

    const p = pers.data||[], e = equip.data||[], a = areas.data||[]
    const trained = p.filter(x=>x.training_status==='done').length
    const missingEquip = e.filter(x=>x.have<x.need).length
    const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
    const openIncCount = openInc.data?.length || 0

    setStats({
      trained, active: p.filter(x=>x.training_status==='active').length,
      available: p.filter(x=>x.status==='available').length,
      missingEquip, cleanPct, total: p.length,
    })
    setTasks(openTasks.data||[])
    setIncidents(openInc.data||[])

    // ── מדד מוכנות לפסח ──
    const trainedPct = p.length ? Math.round(trained/p.length*100) : 0
    const equipScore = missingEquip === 0 ? 100 : Math.max(0, 100 - missingEquip * 12)
    const incScore   = openIncCount === 0 ? 100 : Math.max(0, 100 - openIncCount * 25)
    const r = Math.round(trainedPct*0.35 + cleanPct*0.25 + equipScore*0.25 + incScore*0.15)
    setReadiness(r)

    // ── יחידות ללא דיווח (24 שעות) — רק לאוגדות / פיקוד ──
    if (subs.length > 0) {
      const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString()
      // בנה מפה: unit_id → תאריך פעילות אחרונה
      const activity = {}
      for (const row of [...(lastPers.data||[]), ...(lastInc.data||[])]) {
        const ts = row.created_at
        if (!activity[row.unit_id] || ts > activity[row.unit_id]) activity[row.unit_id] = ts
      }
      for (const row of (lastClean.data||[])) {
        const ts = row.updated_at
        if (!activity[row.unit_id] || ts > activity[row.unit_id]) activity[row.unit_id] = ts
      }
      setLastActivity(activity)

      // יחידות עלים (לא אוגדות) שלא עדכנו
      const leafSubs = subs.filter(u => !u.is_senior && !u.is_admin)
      const silent = leafSubs.filter(u => !activity[u.id] || activity[u.id] < cutoff)
      setSilentUnits(silent)
    }

    setLoading(false)
  }

  async function loadLogo() {
    const { data } = await supabase.from('units').select('logo_url').eq('id', currentUnit.id).single()
    if (data?.logo_url) { LOGO_CACHE[currentUnit.id] = data.logo_url; setUnitLogo(data.logo_url) }
  }

  const priColor = { urgent:'badge badge-red', high:'badge badge-orange', normal:'badge badge-blue' }
  const priLabel = { urgent:'דחוף', high:'גבוה', normal:'בינוני' }
  const readinessColor = readiness >= 80 ? 'text-green-400' : readiness >= 60 ? 'text-orange-400' : 'text-red-400'
  const readinessBg    = readiness >= 80 ? 'bg-green-500'  : readiness >= 60 ? 'bg-orange-500'  : 'bg-red-500'
  const readinessLabel = readiness >= 80 ? 'מוכן לפסח ✅'  : readiness >= 60 ? 'בתהליך 🔄'      : 'דורש טיפול ⚠️'

  function timeSince(ts) {
    const m = Math.floor((Date.now() - new Date(ts)) / 60000)
    if (m < 60) return `לפני ${m} דק'`
    const h = Math.floor(m/60)
    if (h < 24) return `לפני ${h} שעות`
    return `לפני ${Math.floor(h/24)} ימים`
  }

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="card p-6 h-32 bg-bg2"/>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_,i)=><div key={i} className="card h-20 bg-bg2"/>)}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Operational Status Bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon:'🕐', label:'ימים לפסח', val: days, valCls: days<=7?'text-red-400':days<=14?'text-orange-400':'text-gold' },
          { icon:'📊', label:'מוכנות', val:`${readiness}%`, valCls: readinessColor },
          { icon:'👥', label:'מוכשרים', val:`${stats.total?Math.round(stats.trained/stats.total*100):0}%`, valCls:'text-green-400' },
          { icon:'🧹', label:'ניקיון', val:`${stats.cleanPct}%`, valCls: stats.cleanPct>=70?'text-green-400':stats.cleanPct>=40?'text-orange-400':'text-red-400' },
          { icon:'📦', label:'ציוד חסר', val: stats.missingEquip, valCls: stats.missingEquip===0?'text-green-400':'text-red-400' },
          { icon:'🆘', label:'חריגים', val: incidents.length, valCls: incidents.length===0?'text-green-400':'text-red-400 animate-pulse' },
        ].map(item=>(
          <div key={item.label} className="card p-3 text-center border border-border1">
            <div className="text-lg mb-0.5">{item.icon}</div>
            <div className={`text-xl font-black leading-none ${item.valCls}`}>{item.val}</div>
            <div className="text-text3 text-[10px] mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Hero ── */}
      <div className="card p-5 bg-gradient-to-l from-[#1a2040] to-bg2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bg3 border border-border2 flex items-center justify-center overflow-hidden flex-shrink-0">
            {unitLogo
              ? <img src={unitLogo} alt={currentUnit?.name} className="w-full h-full object-cover"/>
              : <span className="text-3xl">{currentUnit?.icon || '✡'}</span>}
          </div>
          <div>
            <h2 className="text-2xl font-black mb-1">שלום, {currentUnit?.name} 👋</h2>
            <p className="text-text2 text-sm">מבצע פסח תשפ"ו — רבנות פיקוד מרכז</p>
          </div>
        </div>

        {/* מדד מוכנות */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <div className={`text-5xl font-black leading-none ${readinessColor}`}>{readiness}%</div>
            <div className="text-text3 text-xs mt-1">{readinessLabel}</div>
            <div className="w-32 pbar h-2.5 rounded-full mt-2">
              <div className={`pbar-fill ${readinessBg} rounded-full`} style={{width:`${readiness}%`}}/>
            </div>
          </div>
          <div className="text-center bg-bg3 rounded-2xl px-6 py-3 border border-border2">
            <div className="text-5xl font-black text-gold2 leading-none">{days}</div>
            <div className="text-text3 text-xs mt-1">ימים לפסח</div>
          </div>
        </div>
      </div>

      {/* ── יחידות ללא דיווח ── */}
      {silentUnits.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <span className="font-bold text-orange-400">{silentUnits.length} יחידות ללא דיווח ב-24 שעות</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {silentUnits.map(u => (
              <span key={u.id} className="flex items-center gap-1.5 bg-orange-900/20 border border-orange-500/30 rounded-lg px-3 py-1.5 text-xs">
                <span>{u.icon}</span>
                <span className="font-bold">{u.name}</span>
                {lastActivity[u.id]
                  ? <span className="text-orange-400/70">{timeSince(lastActivity[u.id])}</span>
                  : <span className="text-orange-400/70">אין נתונים</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── חריגים alert ── */}
      {incidents.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => setPage('incidents')}>
          <span className="text-2xl">🆘</span>
          <div>
            <div className="font-bold text-red-400">{incidents.length} חריג{incidents.length>1?'ים':''} פתוח{incidents.length>1?'ים':''}</div>
            <div className="text-xs text-text3">{incidents[0]?.title}</div>
          </div>
          <span className="mr-auto text-red-400 text-sm">← לחץ לפרטים</span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="הכשרה הושלמה" value={stats.trained} sub={`מתוך ${stats.total}`} color="green"/>
        <KpiCard label="בהכשרה" value={stats.active} color="orange"/>
        <KpiCard label="כוח אדם זמין" value={stats.available} sub={`מתוך ${stats.total}`} color="blue"/>
        <KpiCard label="ציוד חסר" value={stats.missingEquip} sub="פריטים" color="red"/>
        <KpiCard label="ניקיון" value={`${stats.cleanPct}%`} color="gold"/>
      </div>

      {/* ── Tasks + Progress ── */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <div className="panel-head">
            <span className="panel-title">✅ משימות פתוחות</span>
            <button className="btn btn-sm" onClick={() => setPage('tasks')}>הכל ←</button>
          </div>
          <div className="divide-y divide-border1/50">
            {tasks.length===0 && <p className="p-5 text-text3 text-sm">אין משימות פתוחות 🎉</p>}
            {tasks.map(t=>(
              <div key={t.id} className="flex items-center gap-3 p-4">
                <span className={priColor[t.priority]}>{priLabel[t.priority]}</span>
                <span className="font-bold text-sm flex-1">{t.title}</span>
                {t.assigned_by && <span className="badge badge-purple text-xs">מ{t.assigned_by}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="panel-head"><span className="panel-title">📊 פירוט מוכנות</span></div>
          <div className="p-5 space-y-4">
            {[
              { label:'הכשרות', val: stats.total ? Math.round(stats.trained/stats.total*100) : 0,
                color: stats.total && stats.trained/stats.total>=0.7 ? 'bg-green-500' : 'bg-orange-500' },
              { label:'ניקיון', val: stats.cleanPct,
                color: stats.cleanPct>=70 ? 'bg-green-500' : stats.cleanPct>=40 ? 'bg-orange-500' : 'bg-red-500' },
              { label:'ציוד',   val: stats.missingEquip===0 ? 100 : Math.max(10, 100-stats.missingEquip*15),
                color: stats.missingEquip===0 ? 'bg-green-500' : 'bg-red-500' },
              { label:'חריגים', val: incidents.length===0 ? 100 : Math.max(10, 100-incidents.length*30),
                color: incidents.length===0 ? 'bg-green-500' : 'bg-red-500' },
            ].map(item=>(
              <div key={item.label}>
                <div className="flex justify-between text-xs text-text2 mb-1">
                  <span>{item.label}</span>
                  <span className="font-bold">{item.val}%</span>
                </div>
                <div className="pbar"><div className={`pbar-fill ${item.color}`} style={{width:`${item.val}%`}}/></div>
              </div>
            ))}
            <div className="pt-2 border-t border-border1 flex items-center justify-between">
              <span className="text-text3 text-xs">מדד כולל</span>
              <span className={`text-xl font-black ${readinessColor}`}>{readiness}%</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
