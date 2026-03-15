import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import KpiCard from '../components/ui/KpiCard'
import { getLeafUnits, UNITS } from '../lib/units'

const LOGO_CACHE = {}

export default function Dashboard() {
  const { currentUnit, activePage, setPage, isSenior, isAdmin } = useStore()
  
  const [stats, setStats] = useState({ trained:0, active:0, available:0, missingEquip:0, cleanPct:0, total:0 })
  const [tasks, setTasks] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitLogo, setUnitLogo] = useState(LOGO_CACHE[currentUnit?.id] || null)
  const [readiness, setReadiness] = useState(0)
  const [silentUnits, setSilentUnits] = useState([])
  const [lastActivity, setLastActivity] = useState({})
  const days = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))

  useEffect(() => {
    if (!currentUnit || activePage !== 'dashboard') return
    loadStats()
    if (!LOGO_CACHE[currentUnit.id]) loadLogo()
    
    const ch = supabase.channel('dashboard_rt_' + currentUnit.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'incidents' },   () => loadStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'personnel' },   () => loadStats())
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

      // חסינות תקלות: מושכים הכל (*) כדי למנוע קריסות של שמות עמודות
      const [pers, equip, areas, openTasks, openInc, postsRes, lastPers, lastInc, lastClean] = await Promise.all([
        inF(supabase.from('personnel').select('*')),
        inF(supabase.from('equipment').select('*')),
        inF(supabase.from('cleaning_areas').select('*')),
        inF(supabase.from('tasks').select('*').neq('status','done').order('created_at',{ascending:false}).limit(4)),
        inF(supabase.from('incidents').select('*').eq('status','open').order('created_at',{ascending:false}).limit(3)),
        (ids.length === 1
          ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0])
          : supabase.from('unit_posts').select('*').in('unit_id', ids)
        ),
        inF(supabase.from('personnel').select('*').order('created_at',{ascending:false}).limit(200)),
        inF(supabase.from('incidents').select('*').order('created_at',{ascending:false}).limit(100)),
        inF(supabase.from('cleaning_areas').select('*').order('updated_at',{ascending:false}).limit(100)),
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

      const posts = postsRes.data || []
      const hasData = p.length > 0 || a.length > 0 || e.length > 0
      if (!hasData) { setReadiness(-1); setLoading(false); return }

      const trainedPct = p.length ? Math.round(trained/p.length*100) : 0
      const unavailablePct = p.length ? Math.round(p.filter(x=>x.status==='unavailable').length/p.length*100) : 0
      const personnelScore = p.length ? Math.max(0, 100 - unavailablePct * 1.5) : 0

      let postScore = 100
      if (posts.length > 0) {
        const availPeople = p.filter(x=>x.status!=='unavailable')
        const totalRequired = posts.reduce((s,post)=>s+post.required,0)
        const totalCovered = Math.min(availPeople.length, totalRequired)
        postScore = totalRequired > 0 ? Math.round(totalCovered/totalRequired*100) : 100
      }

      const hasEquip = e.length > 0
      const equipScore = !hasEquip ? null : missingEquip === 0 ? 100 : Math.max(0, 100 - missingEquip * 12)
      const hasClean = a.length > 0

      let total = 0, weight = 0
      if (p.length > 0)       { total += trainedPct    * 0.25; weight += 0.25 }
      if (p.length > 0)       { total += personnelScore * 0.15; weight += 0.15 }
      if (posts.length > 0)   { total += postScore      * 0.20; weight += 0.20 }
      if (hasClean)           { total += cleanPct       * 0.20; weight += 0.20 }
      if (hasEquip)           { total += equipScore     * 0.20; weight += 0.20 }
      const r = weight > 0 ? Math.round(total / weight) : 0
      setReadiness(r)

      if (subs.length > 0) {
        const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString()
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

        const leafSubs = subs.filter(u => !u.is_senior && !u.is_admin)
        const silent = leafSubs.filter(u => !activity[u.id] || activity[u.id] < cutoff)
        setSilentUnits(silent)
      }

      setLoading(false)
    } catch(err) {
      console.error('loadStats error:', err)
      setLoading(false)
    }
  }

  async function loadLogo() {
    const { data } = await supabase.from('units').select('logo_url').eq('id', currentUnit.id).single()
    if (data?.logo_url) { LOGO_CACHE[currentUnit.id] = data.logo_url; setUnitLogo(data.logo_url) }
  }

  const priColor = { urgent:'badge badge-red', high:'badge badge-orange', normal:'badge badge-blue' }
  const priLabel = { urgent:'דחוף', high:'גבוה', normal:'בינוני' }
  const noData = readiness === -1
  const readinessColor = noData ? 'text-text3' : readiness >= 80 ? 'text-green-400' : readiness >= 60 ? 'text-orange-400' : 'text-red-400'
  const readinessBg    = noData ? 'bg-border2'  : readiness >= 80 ? 'bg-green-500'  : readiness >= 60 ? 'bg-orange-500'  : 'bg-red-500'
  const readinessLabel = noData ? 'טרם הוזנו נתונים' : readiness >= 80 ? 'מוכן לפסח ✅' : readiness >= 60 ? 'בתהליך 🔄' : 'דורש טיפול ⚠️'
  const readinessDisplay = noData ? '—' : readiness + '%'

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
            <div className="w-32 pbar h-2.5 rounded-full mt-2"><div className={`pbar-fill ${readinessBg} rounded-full`} style={{width:`${readinessDisplay}`}}/></div>
          </div>
          <div className="text-center bg-bg3 rounded-2xl px-6 py-3 border border-border2">
            <div className="text-5xl font-black text-gold2 leading-none">{days}</div>
            <div className="text-text3 text-xs mt-1">ימים לפסח</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon:'🕐', label:'ימים לפסח', val: days, valCls: days<=7?'text-red-400':days<=14?'text-orange-400':'text-gold' },
          { icon:'📊', label:'מוכנות', val:`${readinessDisplay}`, valCls: readinessColor },
          { icon:'👥', label:'כוח אדם', val: stats.total, valCls: stats.total>0?'text-blue-400':'text-text3' },
          { icon:'🎓', label:'הכשרה', val:`${stats.total?Math.round(stats.trained/stats.total*100):0}%`, valCls: stats.total&&stats.trained/stats.total>=0.7?'text-green-400':stats.total?'text-orange-400':'text-text3' },
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

      {silentUnits.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span><span className="font-bold text-orange-400">{silentUnits.length} יחידות ללא דיווח ב-24 שעות</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {silentUnits.map(u => (
              <span key={u.id} className="flex items-center gap-1.5 bg-orange-900/20 border border-orange-500/30 rounded-lg px-3 py-1.5 text-xs">
                <span>{u.icon}</span><span className="font-bold">{u.name}</span>
                {lastActivity[u.id] ? <span className="text-orange-400/70">{timeSince(lastActivity[u.id])}</span> : <span className="text-orange-400/70">אין נתונים</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 cursor-pointer" onClick={() => setPage('incidents')}>
          <span className="text-2xl">🆘</span>
          <div>
            <div className="font-bold text-red-400">{incidents.length} חריג{incidents.length>1?'ים':''} פתוח{incidents.length>1?'ים':''}</div>
            <div className="text-xs text-text3">{incidents[0]?.title}</div>
          </div>
          <span className="mr-auto text-red-400 text-sm">← לחץ לפרטים</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="כוח אדם" value={stats.total} sub="אנשים" color="blue"/>
        <KpiCard label="בהכשרה" value={stats.active} color="orange"/>
        <KpiCard label="כוח אדם זמין" value={stats.available} sub={`מתוך ${stats.total}`} color="blue"/>
        <KpiCard label="ציוד חסר" value={stats.missingEquip} sub="פריטים" color="red"/>
        <KpiCard label="הכשרה" value={`${stats.total?Math.round(stats.trained/stats.total*100):0}%`} sub={`${stats.trained} מתוך ${stats.total}`} color="green"/>
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
          <div className="panel-head"><span className="panel-title">📊 פירוט מוכנות</span></div>
          <div className="p-5 space-y-4">
            {[
              { label:'כוח אדם', val: stats.total > 0 ? Math.round(stats.available/stats.total*100) : 0, color: stats.total>0 ? 'bg-blue-500' : 'bg-border2', text: stats.total===0 ? 'אין נתונים' : `${stats.available}/${stats.total}` },
              { label:'הכשרה', val: stats.total ? Math.round(stats.trained/stats.total*100) : 0, color: stats.total ? (stats.trained/stats.total>=0.7?'bg-green-500':'bg-orange-500') : 'bg-border2' },
              { label:'ציוד', val: noData ? 0 : stats.missingEquip===0 && stats.total===0 ? 0 : stats.missingEquip===0 ? 100 : Math.max(5, 100-stats.missingEquip*15), color: noData||stats.total===0 ? 'bg-border2' : stats.missingEquip===0?'bg-green-500':'bg-red-500', text: noData ? 'אין נתונים' : stats.missingEquip===0 && stats.total===0 ? 'אין נתונים' : null },
              { label:'חריגים', val: noData ? 0 : incidents.length===0 && stats.total===0 ? 0 : incidents.length===0 ? 100 : Math.max(5, 100-incidents.length*30), color: noData||stats.total===0 ? 'bg-border2' : incidents.length===0?'bg-green-500':'bg-red-500', text: noData ? 'אין נתונים' : incidents.length===0 && stats.total===0 ? 'אין נתונים' : null },
            ].map(item=>(
              <div key={item.label}>
                <div className="flex justify-between text-xs text-text2 mb-1"><span>{item.label}</span><span className={`font-bold ${item.text?'text-text3':''}`}>{item.text || item.val+'%'}</span></div>
                <div className="pbar"><div className={`pbar-fill ${item.color}`} style={{width:`${item.val}%`}}/></div>
              </div>
            ))}
            <div className="pt-2 border-t border-border1 flex items-center justify-between"><span className="text-text3 text-xs">מדד כולל</span><span className={`text-xl font-black ${readinessColor}`}>{readinessDisplay}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
