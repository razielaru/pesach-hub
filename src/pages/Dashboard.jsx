import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS, getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import BriefingMode, { useSmartAlerts } from './BriefingMode'
import MapView from './MapView'
import DutyOfficerAI from './DutyOfficerAI'
import PushSetup from '../components/PushSetup'

export default function CommandPage() {
  const { currentUnit, activePage, showToast } = useStore()
  const [unitStats, setUnitStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('table')
  const [briefing, setBriefing] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [dispatchModal, setDispatchModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title:'', desc:'', priority:'high', date:'', target:'' })
  const [dispForm, setDispForm] = useState({ unit:'', item:'', qty:1, note:'' })
  const [dispLog, setDispLog] = useState([])
  
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false)

  const nonAdminUnits = getLeafUnits(currentUnit?.id || '')

  useEffect(() => {
    if (!currentUnit || activePage !== 'command') return
    loadAll()
    
    const ch = supabase.channel('command_rt_' + currentUnit.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'personnel' },      () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'equipment' },      () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'cleaning_areas' }, () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'incidents' },      () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'dispatch_log' },   () => loadAll())
      .subscribe()
      
    return () => supabase.removeChannel(ch)
  }, [currentUnit, activePage])

  async function loadAll() {
    const unitIds = nonAdminUnits.map(u => u.id)
    if (unitIds.length === 0) { setLoading(false); return }

    const [persRes, equipRes, areasRes, incRes, dlRes] = await Promise.all([
      supabase.from('personnel').select('*').in('unit_id', unitIds),
      supabase.from('equipment').select('*').in('unit_id', unitIds),
      supabase.from('cleaning_areas').select('*').in('unit_id', unitIds),
      supabase.from('incidents').select('*').eq('status','open').in('unit_id', unitIds),
      supabase.from('dispatch_log').select('*').order('created_at',{ascending:false}).limit(20),
    ])

    const pers  = persRes.data  || []
    const equip = equipRes.data || []
    const areas = areasRes.data || []
    const incs  = incRes.data   || []

    const stats = {}
    nonAdminUnits.forEach(u => {
      const p = pers.filter(x => x.unit_id === u.id)
      const e = equip.filter(x => x.unit_id === u.id)
      const a = areas.filter(x => x.unit_id === u.id)
      
      const trainedPct = p.length ? Math.round(p.filter(x=>x.training_status==='done').length/p.length*100) : 0
      const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
      
      const missingEquip = e.filter(x=>x.have<x.need).length
      const totalNeed = e.reduce((sum, x) => sum + (x.need || 0), 0)
      const totalHave = e.reduce((sum, x) => sum + Math.min(x.have || 0, x.need || 0), 0)
      const equipPct = totalNeed > 0 ? Math.round((totalHave / totalNeed) * 100) : 0

      const openInc = incs.filter(x => x.unit_id === u.id).length
      
      const health = p.length === 0 ? 'gray'
        : openInc>0 || trainedPct<50 || (totalNeed>0 && equipPct<40) ? 'red' 
        : trainedPct<80 || (totalNeed>0 && equipPct<80) ? 'orange'
        : 'green'
        
      stats[u.id] = { trainedPct, equipPct, missingEquip, cleanPct, openInc, health, personnel: p.length }
    })
    setUnitStats(stats)
    setDispLog(dlRes.data || [])
    setLoading(false)
  }

  async function sendTask() {
    if (!taskForm.title) return
    const senderName = currentUnit?.name || 'פיקוד'
    const targets = taskForm.target ? [taskForm.target] : nonAdminUnits.map(u=>u.id)
    const rows = targets.map(uid => ({
      unit_id: uid, title: taskForm.title,
      description: taskForm.desc, priority: taskForm.priority,
      due_date: taskForm.date || null, status: 'todo', assigned_by: senderName
    }))
    await supabase.from('tasks').insert(rows)
    const targetName = taskForm.target ? UNITS.find(u=>u.id===taskForm.target)?.name : 'כל היחידות תחתי'
    showToast(`משימה נשלחה ל${targetName} ✅`, 'green')
    setTaskModal(false)
    setTaskForm({ title:'', desc:'', priority:'high', date:'', target:'' })
  }

  async function saveDispatch() {
    if (!dispForm.unit || !dispForm.item) return
    const { error } = await supabase.from('dispatch_log').insert({
      unit_id: dispForm.unit, item_name: dispForm.item,
      quantity: dispForm.qty, notes: dispForm.note,
      dispatched_by: currentUnit?.name
    })
    if (!error) {
      const { data: existing } = await supabase.from('equipment')
        .select('*').eq('unit_id', dispForm.unit).eq('name', dispForm.item).maybeSingle()
      if (existing) {
        await supabase.from('equipment').update({ have: existing.have + dispForm.qty }).eq('id', existing.id)
      } else {
        await supabase.from('equipment').insert({ unit_id: dispForm.unit, name: dispForm.item,
          category: 'ניפוק', have: dispForm.qty, need: dispForm.qty })
      }
      showToast('ניפוק נרשם ✅', 'green')
      setDispatchModal(false)
      loadAll()
    }
  }

  const totals = Object.values(unitStats)
  const avgTrained = totals.length ? Math.round(totals.reduce((a,s)=>a+s.trainedPct,0)/totals.length) : 0
  const avgClean = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0
  const avgEquip = totals.length ? Math.round(totals.reduce((a,s)=>a+(s.equipPct||0),0)/totals.length) : 0
  
  const totalMissing = totals.reduce((a,s)=>a+s.missingEquip,0)
  const totalInc = totals.reduce((a,s)=>a+s.openInc,0)
  
  let totalScore = 0, weight = 0
  if (avgTrained > 0) { totalScore += avgTrained * 0.4; weight += 0.4 }
  if (avgClean > 0)   { totalScore += avgClean * 0.3; weight += 0.3 }
  if (avgEquip > 0)   { totalScore += avgEquip * 0.3; weight += 0.3 }
  
  let globalReadiness = weight > 0 ? Math.round(totalScore / weight) : 0
  globalReadiness = Math.max(0, globalReadiness - (totalInc * 10))

  if ((avgEquip > 0 && avgEquip < 40) || (avgTrained > 0 && avgTrained < 50)) {
    globalReadiness = Math.min(globalReadiness, 50)
  }

  async function exportPDF() {
    window.print()
  }

  const daysLeft = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))
  const smartAlerts = useSmartAlerts(unitStats, daysLeft)
  const criticalAlerts = smartAlerts.filter(a => a.level === 'critical')

  const healthColor = { green: 'border-green-500 bg-green-900/10', orange: 'border-orange-500 bg-orange-900/10', red: 'border-red-500 bg-red-900/10 animate-pulse', gray: 'border-border2 bg-bg3' }
  const healthDot = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500', gray: 'bg-border2' }
  const healthLabel = { green: 'תקין', orange: 'דורש תשומת לב', red: '⚠ קריטי', gray: 'אין נתונים' }

  if (loading) return <div className="flex items-center justify-center h-64 text-text3">טוען נתונים...</div>

  // חלון הפריצה: מוצג כבאנר "פיקוד העורף" עליון ולא כהחשכת מסך
  const showCriticalPopup = criticalAlerts.length > 0 && !alertsAcknowledged

  return (
    <div className="space-y-5">
      <PushSetup />
      
      {/* ── התרעת "פיקוד העורף" מובנית במסך ── */}
      {showCriticalPopup && (
        <div className="bg-[#cc0000] rounded-2xl p-5 shadow-[0_4px_20px_rgba(204,0,0,0.4)] border-2 border-red-400 relative overflow-hidden animate-in slide-in-from-top-4">
          {/* פסי אזהרה ברקע */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, transparent 10px, transparent 20px)'}}></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
              <span className="text-3xl animate-pulse">🚨</span>
              התרעת מוכנות קריטית!
            </h2>
            <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {criticalAlerts.map(a => (
                <div key={a.id} className="text-white flex items-start gap-2">
                  <span className="text-xl leading-none">{a.icon}</span>
                  <div>
                    <div className="font-bold leading-tight">{a.message}</div>
                    {a.unit && <div className="text-red-200 text-xs mt-1">יחידה: {a.unit}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setAlertsAcknowledged(true)} 
              className="w-full bg-white text-[#cc0000] hover:bg-gray-100 font-black text-lg py-3 rounded-xl shadow-lg transition-all">
              קראתי ואישרתי
            </button>
          </div>
        </div>
      )}

      {briefing && <BriefingMode unitStats={unitStats} onClose={() => setBriefing(false)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">⭐ פיקוד על — {currentUnit?.name}</h2>
          <p className="text-text3 text-xs mt-0.5">{nonAdminUnits.length} יחידות תחת פיקוד</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden">
            {[['table','📋 טבלה'],['map','🗺️ מפה'],['compare','📊 השוואה'],['ai','🎖️ קצין תורן']].map(([id,label])=>(
              <button key={id} onClick={()=>setViewMode(id)} className={`px-3 py-2 text-xs font-bold transition-all ${viewMode===id?'bg-gold text-black':'text-text2 hover:text-text1'}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => setBriefing(true)} className="btn text-xs px-3 py-2 bg-purple-900/40 border-purple-500/50 text-purple-300 hover:bg-purple-800/50">🖥 הערכת מצב</button>
          <button className="btn btn-blue btn-sm" onClick={()=>setTaskModal(true)}>📋 שלח משימה</button>
          <button className="btn btn-sm" onClick={()=>setDispatchModal(true)}>📦 ניפוק ציוד</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="הכשרה ממוצעת" value={`${avgTrained}%`} color={avgTrained>=70?'green':avgTrained>=50?'orange':'red'}/>
        <KpiCard label="ניקיון ממוצע" value={`${avgClean}%`} color={avgClean>=70?'green':avgClean>=50?'orange':'red'}/>
        <KpiCard label="ציוד בממוצע" value={`${avgEquip}%`} color={avgEquip>=80?'green':'orange'}/>
        <KpiCard label="חריגים פתוחים" value={totalInc} color={totalInc===0?'green':'red'}/>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3"><span className="text-sm font-black">📊 פס מצב מבצעי</span><span className="text-text3 text-xs">{new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'הכשרה', val:avgTrained, color:avgTrained>=70?'bg-green-500':avgTrained>=50?'bg-orange-500':'bg-red-500', icon:'🎓' },
            { label:'ניקיון', val:avgClean,  color:avgClean>=70?'bg-green-500':avgClean>=50?'bg-orange-500':'bg-red-500',     icon:'🧹' },
            { label:'ציוד', val:avgEquip,    color:avgEquip===0?'bg-border2':avgEquip>=80?'bg-green-500':avgEquip>=50?'bg-orange-500':'bg-red-500', icon:'📦', text: avgEquip===0?'אין נתונים':`${avgEquip}%` },
          ].map(item => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-text3">{item.icon} {item.label}</span><span className="font-bold text-text1">{item.text || item.val+'%'}</span></div>
              <div className="h-2.5 bg-bg4 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${item.color}`} style={{width:`${item.val}%`}}/></div>
            </div>
          ))}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-text3">🆘 חריגים</span><span className={`font-bold ${totalInc===0?'text-green-400':'text-red-400'}`}>{totalInc===0?'נקי':`${totalInc} פתוחים`}</span></div>
            <div className="h-2.5 bg-bg4 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${totalInc===0?'bg-green-500':'bg-red-500 animate-pulse'}`} style={{width:'100%'}}/></div>
          </div>
        </div>
        
        {((avgEquip > 0 && avgEquip < 40) || (avgTrained > 0 && avgTrained < 50)) && (
          <div className="mt-3 text-red-400 text-xs font-bold">⛔ פקטור חוסם: מדד הפיקוד הוגבל ל-50% עקב פערים קריטיים בהכשרות או בציוד ביחידות.</div>
        )}
      </div>

      {viewMode === 'table' && (
        <div className="card overflow-x-auto">
          <div className="panel-head"><span className="panel-title">📋 מצב יחידות — {currentUnit?.name}</span></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border1 text-text3 text-xs">
                <th className="text-right p-3 font-bold">יחידה</th><th className="text-center p-3 font-bold">הכשרה</th><th className="text-center p-3 font-bold">ניקיון</th><th className="text-center p-3 font-bold">ציוד</th><th className="text-center p-3 font-bold">חריגים</th><th className="text-center p-3 font-bold">מצב</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border1/50">
              {nonAdminUnits.map(u => {
                const s = unitStats[u.id] || {}
                return (
                  <tr key={u.id} className="hover:bg-bg3/50 transition-colors">
                    <td className="p-3"><div className="flex items-center gap-2"><span className="text-base">{u.icon}</span><div><div className="font-bold">{u.name}</div><div className="text-text3 text-xs">{s.personnel||0} אנשים</div></div></div></td>
                    <td className="p-3 text-center"><span className={`font-bold ${s.trainedPct>=70?'text-green-400':s.trainedPct>=40?'text-orange-400':'text-red-400'}`}>{s.trainedPct||0}%</span></td>
                    <td className="p-3 text-center"><span className={`font-bold ${s.cleanPct>=70?'text-green-400':s.cleanPct>=40?'text-orange-400':'text-red-400'}`}>{s.cleanPct||0}%</span></td>
                    <td className="p-3 text-center"><span className={`font-bold ${s.equipPct>=80?'text-green-400':s.equipPct>=40?'text-orange-400':'text-red-400'}`}>{s.equipPct||0}%</span></td>
                    <td className="p-3 text-center"><span className={`font-bold ${s.openInc===0?'text-green-400':'text-red-400'}`}>{s.openInc||0}</span></td>
                    <td className="p-3 text-center"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border ${healthColor[s.health||'green']}`}><span className={`w-1.5 h-1.5 rounded-full ${healthDot[s.health||'green']}`}/>{healthLabel[s.health||'green']}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'map' && <MapView unitStats={unitStats} />}

      {viewMode === 'ai' && <DutyOfficerAI />}
    </div>
  )
}
