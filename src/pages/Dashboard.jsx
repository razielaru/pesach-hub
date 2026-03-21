import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import KpiCard from '../components/ui/KpiCard'
import { getLeafUnits, UNITS } from '../lib/units'
import PushSetup from '../components/PushSetup'

const LOGO_CACHE = {}
const DASHBOARD_CACHE = {}

export default function Dashboard() {
  const { currentUnit, activePage, setPage, isSenior, isAdmin } = useStore()
  
  const [stats, setStats] = useState({ totalPersonnel:0, cleanPct:0, kashrutPct:0, totalPosts:0, equipPct:0, missingEquip:0 })
  const [tasks, setTasks] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitLogo, setUnitLogo] = useState(LOGO_CACHE[currentUnit?.id] || null)
  const [readiness, setReadiness] = useState(0)
  const [silentUnits, setSilentUnits] = useState([])
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false)

  useEffect(() => {
    if (!currentUnit) return
    const cached = DASHBOARD_CACHE[currentUnit.id]
    if (!cached) return
    setStats(cached.stats)
    setTasks(cached.tasks)
    setIncidents(cached.incidents)
    setReadiness(cached.readiness)
    setLoading(false)
  }, [currentUnit])
  
  const days = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))

  useEffect(() => {
    if (!currentUnit || activePage !== 'dashboard') return
    loadStats()
    if (!LOGO_CACHE[currentUnit.id]) loadLogo()
    
    const ch = supabase.channel('dashboard_rt_' + currentUnit.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'incidents' },   () => loadStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'personnel' },   () => loadStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'unit_posts' },  () => loadStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'equipment' },   () => loadStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'cleaning_areas' }, () => loadStats())
      .subscribe()
      
    return () => supabase.removeChannel(ch)
  }, [currentUnit, activePage])

  async function loadStats() {
    try {
      const uid = currentUnit.id
      const subs = getLeafUnits(uid) || []
      const ids = Array.from(new Set([uid, ...subs.map(u => u.id)]))
      const inF = q => ids.length === 1 ? q.eq('unit_id', ids[0]) : q.in('unit_id', ids)

      // חזרנו למשוך גם את הציוד!
      const [pers, postsRes, areas, equip, openTasks, openInc] = await Promise.all([
        inF(supabase.from('personnel').select('id, unit_id')),
        inF(supabase.from('unit_posts').select('id, unit_id, status')),
        inF(supabase.from('cleaning_areas').select('id, unit_id, status')),
        inF(supabase.from('equipment').select('id, unit_id, have, need')),
        inF(supabase.from('tasks').select('id, title, priority, status, assigned_by').neq('status','done').order('created_at',{ascending:false}).limit(4)),
        inF(supabase.from('incidents').select('id, title, severity, unit_id').eq('status','open').order('created_at',{ascending:false}).limit(3)),
      ])

      const p = pers?.data || [], pts = postsRes?.data || [], a = areas?.data || [], e = equip?.data || []
      
      const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
      const kashrutDone = pts.filter(x=>x.status==='done').length
      const kashrutPct = pts.length ? Math.round(kashrutDone/pts.length*100) : 0
      
      // חישובי הציוד שחזרו
      const missingEquip = e.filter(x=>x.have<x.need).length
      const totalNeed = e.reduce((sum, x) => sum + (x.need || 0), 0)
      const totalHave = e.reduce((sum, x) => sum + Math.min(x.have || 0, x.need || 0), 0)
      const equipPct = totalNeed > 0 ? Math.round((totalHave / totalNeed) * 100) : 0

      const openIncCount = openInc?.data?.length || 0

      const nextStats = {
        totalPersonnel: p.length,
        cleanPct,
        kashrutPct,
        totalPosts: pts.length,
        equipPct,
        missingEquip
      }
      const nextTasks = openTasks?.data || []
      const nextIncidents = openInc?.data || []

      setStats(nextStats)
      setTasks(nextTasks)
      setIncidents(nextIncidents)

      if (pts.length === 0 && p.length === 0 && totalNeed === 0) { setReadiness(-1); setLoading(false); return }

      // שקלול מוכנות כולל ציוד, הכשרת מקומות וניקיון
      let total = 0, weight = 0
      if (pts.length > 0) { total += kashrutPct * 0.40; weight += 0.40 }
      if (a.length > 0)   { total += cleanPct   * 0.35; weight += 0.35 }
      if (totalNeed > 0)  { total += equipPct   * 0.25; weight += 0.25 }
      
      let r = weight > 0 ? Math.round(total / weight) : 0
      r = Math.max(0, r - (openIncCount * 10)) // קנס חריגים
      
      setReadiness(r)
      DASHBOARD_CACHE[currentUnit.id] = {
        stats: nextStats,
        tasks: nextTasks,
        incidents: nextIncidents,
        readiness: r,
      }
    } catch(err) { console.error(err) } 
    finally { setLoading(false) }
  }

  async function loadLogo() {
    const { data } = await supabase.from('units').select('logo_url').eq('id', currentUnit.id).single()
    if (data?.logo_url) { LOGO_CACHE[currentUnit.id] = data.logo_url; setUnitLogo(data.logo_url) }
  }

  const localCriticalAlerts = []
  if (stats.totalPosts > 0 && stats.kashrutPct < 50) localCriticalAlerts.push({ icon: '🎓', message: `פער קריטי בהכשרת מקומות (כרגע ${stats.kashrutPct}%)` })
  incidents.forEach(inc => localCriticalAlerts.push({ icon: '🆘', message: `חריג פתוח: ${inc.title}` }))
  const showCriticalPopup = localCriticalAlerts.length > 0 && !alertsAcknowledged

  const priColor = { urgent:'badge badge-red', high:'badge badge-orange', normal:'badge badge-blue' }
  const priLabel = { urgent:'דחוף', high:'גבוה', normal:'בינוני' }
  const noData = readiness === -1
  const readinessColor = noData ? 'text-text3' : readiness >= 80 ? 'text-green-400' : readiness >= 60 ? 'text-orange-400' : 'text-red-400'
  const readinessBg    = noData ? 'bg-border2'  : readiness >= 80 ? 'bg-green-500'  : readiness >= 60 ? 'bg-orange-500'  : 'bg-red-500'
  const readinessLabel = noData ? 'טרם הוזנו נתונים' : readiness >= 80 ? 'מוכן לפסח ✅' : readiness >= 60 ? 'בתהליך 🔄' : 'דורש טיפול ⚠️'
  const readinessDisplay = noData ? '—' : readiness + '%'

  if (loading) return <div className="space-y-5 animate-pulse"><div className="card p-6 h-32 bg-bg2"/></div>

  return (
    <div className="space-y-5">
      <PushSetup />
      
      {showCriticalPopup && (
        <div className="bg-[#cc0000] rounded-2xl p-5 shadow-[0_4px_20px_rgba(204,0,0,0.4)] border-2 border-red-400 relative overflow-hidden animate-in slide-in-from-top-4">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, transparent 10px, transparent 20px)'}}></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
              <span className="text-3xl animate-pulse">🚨</span>התרעת מוכנות קריטית!
            </h2>
            <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-3">
              {localCriticalAlerts.map((a, i) => (
                <div key={i} className="text-white flex items-start gap-2">
                  <span className="text-xl leading-none">{a.icon}</span><div className="font-bold">{a.message}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setAlertsAcknowledged(true)} className="w-full bg-white text-[#cc0000] hover:bg-gray-100 font-black text-lg py-3 rounded-xl shadow-lg transition-all">קראתי ואישרתי</button>
          </div>
        </div>
      )}
      
      <div className="card p-5 bg-gradient-to-l from-[#1a2040] to-bg2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bg3 border border-border2 flex items-center justify-center overflow-hidden flex-shrink-0">
            {unitLogo ? <img src={unitLogo} alt={currentUnit?.name} className="w-full h-full object-cover"/> : <span className="text-3xl">{currentUnit?.icon || '✡'}</span>}
          </div>
          <div>
            <h2 className="text-2xl font-black mb-1">שלום, {currentUnit?.name} 👋</h2>
            <p className="text-text2 text-sm">מבצע פסח תשפ"ו — רבנות פיקוד מרכז</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <div className={`text-5xl font-black leading-none ${readinessColor}`}>{readinessDisplay}</div>
            <div className="text-text3 text-xs mt-1">{readinessLabel}</div>
          </div>
          <div className="text-center bg-bg3 rounded-2xl px-6 py-3 border border-border2">
            <div className="text-5xl font-black text-gold2 leading-none">{days}</div>
            <div className="text-text3 text-xs mt-1">ימים לפסח</div>
          </div>
        </div>
      </div>

      {/* ── ה-KPI המעודכנים לפי בקשתך עם כמות עמודות מותאמת ── */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
        {[
          { icon:'🕐', label:'ימים לפסח', val: days, valCls: days<=7?'text-red-400':days<=14?'text-orange-400':'text-gold' },
          { icon:'📊', label:'מוכנות', val:`${readinessDisplay}`, valCls: readinessColor },
          { icon:'👥', label:'כוח אדם', val: stats.totalPersonnel, valCls: stats.totalPersonnel>0?'text-blue-400':'text-text3' },
          { icon:'🎓', label:'הכשרה (אחוז)', val:`${stats.kashrutPct}%`, valCls: stats.totalPosts&&stats.kashrutPct>=70?'text-green-400':stats.totalPosts?'text-orange-400':'text-text3' },
          { icon:'📍', label:'מקומות להכשרה', val: stats.totalPosts, valCls: stats.totalPosts>0?'text-purple-400':'text-text3' },
          { icon:'📦', label:'ציוד (אחוז)', val: `${stats.equipPct}%`, valCls: stats.equipPct>=80?'text-green-400':stats.equipPct>=40?'text-orange-400':'text-red-400' },
          { icon:'🆘', label:'חריגים', val: incidents.length, valCls: incidents.length===0?'text-green-400':'text-red-400 animate-pulse' },
        ].map(item=>(
          <div key={item.label} className="card p-3 text-center border border-border1 flex flex-col justify-center">
            <div className="text-lg mb-0.5">{item.icon}</div>
            <div className={`text-xl font-black leading-none ${item.valCls}`}>{item.val}</div>
            <div className="text-text3 text-[10px] mt-1 whitespace-nowrap">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <div className="panel-head"><span className="panel-title">✅ משימות פתוחות</span><button className="btn btn-sm" onClick={() => setPage('tasks')}>הכל ←</button></div>
          <div className="divide-y divide-border1/50">
            {tasks.length===0 && <p className="p-5 text-text3 text-sm">אין משימות פתוחות 🎉</p>}
            {tasks.map(t=>(
              <div key={t.id} className="flex items-center gap-3 p-4">
                <span className={priColor[t.priority]}>{priLabel[t.priority]}</span><span className="font-bold text-sm flex-1">{t.title}</span>
                {t.assigned_by && <span className="badge badge-purple text-xs">מ{t.assigned_by}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="panel-head"><span className="panel-title">📊 פירוט מוכנות (פס מבצעי)</span></div>
          <div className="p-5 space-y-4">
            {[
              { label:'הכשרת מקומות', val: stats.kashrutPct, color: stats.kashrutPct>=70?'bg-green-500':stats.kashrutPct>0?'bg-orange-500':'bg-border2' },
              { label:'ניקיון', val: stats.cleanPct, color: stats.cleanPct>=70?'bg-green-500':stats.cleanPct>0?'bg-orange-500':'bg-border2' },
              { label:'ציוד למבצע', val: stats.equipPct, color: stats.equipPct>=80?'bg-green-500':stats.equipPct>0?'bg-orange-500':'bg-border2' },
            ].map(item=>(
              <div key={item.label}>
                <div className="flex justify-between text-xs text-text2 mb-1"><span>{item.label}</span><span className="font-bold">{item.val}%</span></div>
                <div className="pbar"><div className={`pbar-fill ${item.color}`} style={{width:`${item.val}%`}}/></div>
              </div>
            ))}
            
            {incidents.length > 0 && (
              <div className="text-red-400 text-xs font-bold pt-2 border-t border-border1">⚠️ שים לב: קיימים {incidents.length} חריגים שמורידים את הציון הכולל!</div>
            )}
            <div className="pt-2 border-t border-border1 flex items-center justify-between"><span className="text-text3 text-xs">מדד כולל</span><span className={`text-xl font-black ${readinessColor}`}>{readinessDisplay}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
