import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS, getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import BriefingMode, { useSmartAlerts } from './BriefingMode'
import MapView from './MapView'
import DutyOfficerAI from './DutyOfficerAI'

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

    // גם פה - חסינות תקלות על ידי משיכת הכל (*)
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
      const equipMissing = e.filter(x=>x.have<x.need).length
      const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
      const openInc = incs.filter(x => x.unit_id === u.id).length
      
      const hasPersonnel = p.length > 0
      const health = !hasPersonnel ? 'gray'
        : openInc>0 || trainedPct<40 ? 'red'
        : trainedPct<70 || equipMissing>2 ? 'orange'
        : 'green'
      stats[u.id] = { trainedPct, equipMissing, cleanPct, openInc, health, personnel: p.length }
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

  async function exportPDF() {
    const daysLeft = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))
    const date = new Date().toLocaleDateString('he-IL')
    const totals = Object.values(unitStats)
    const avgTrained = totals.length ? Math.round(totals.reduce((a,s)=>a+s.trainedPct,0)/totals.length) : 0
    const avgClean = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0
    const totalMissing = totals.reduce((a,s)=>a+s.equipMissing,0)
    const totalInc = totals.reduce((a,s)=>a+s.openInc,0)
    const readiness = Math.round((avgTrained*0.35 + avgClean*0.25 + (totalMissing===0?100:Math.max(0,100-totalMissing*10))*0.2 + (totalInc===0?100:Math.max(0,100-totalInc*20))*0.2))

    const rows = nonAdminUnits.map(u => {
      const s = unitStats[u.id] || {}
      return `<tr style="border-bottom:1px solid #333">
        <td style="padding:8px;font-weight:bold">${u.icon||''} ${u.name}</td>
        <td style="padding:8px;text-align:center;color:${s.trainedPct>=70?'#4ade80':'#f87171'}">${s.trainedPct||0}%</td>
        <td style="padding:8px;text-align:center;color:${s.cleanPct>=70?'#4ade80':'#f87171'}">${s.cleanPct||0}%</td>
        <td style="padding:8px;text-align:center;color:${s.equipMissing===0?'#4ade80':'#f87171'}">${s.equipMissing||0}</td>
        <td style="padding:8px;text-align:center;color:${s.openInc===0?'#4ade80':'#f87171'}">${s.openInc||0}</td>
        <td style="padding:8px;text-align:center"><span style="padding:2px 8px;border-radius:4px;background:${s.health==='green'?'#166534':s.health==='orange'?'#7c2d12':'#7f1d1d'};color:${s.health==='green'?'#4ade80':s.health==='orange'?'#fb923c':'#f87171'}">${s.health==='green'?'תקין':s.health==='orange'?'דורש תשומת לב':'קריטי'}</span></td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
<title>דוח מצב פסח — ${date}</title>
<style>body{font-family:Arial,sans-serif;background:#111;color:#e0e0e0;padding:40px;direction:rtl}
h1{color:#f5c842;border-bottom:2px solid #f5c842;padding-bottom:10px}h2{color:#a0aec0;margin-top:30px}
table{width:100%;border-collapse:collapse;background:#1a1a2e}th{background:#1e3a5f;padding:10px 8px;color:#93c5fd}
.kpi{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}.kpi-box{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px 24px;text-align:center;min-width:120px}
.kpi-val{font-size:2em;font-weight:bold;color:#f5c842}.kpi-lbl{color:#888;font-size:.85em;margin-top:4px}
</style></head><body>
<h1>⭐ דוח מצב פסח — ${currentUnit?.name}</h1>
<p style="color:#888">תאריך: ${date} | ${daysLeft} ימים לפסח | מבצע פסח תשפ"ו</p>
<div style="text-align:center;margin:20px 0">
  <div style="font-size:3em;font-weight:bold;color:${readiness>=80?'#4ade80':readiness>=60?'#fb923c':'#f87171'}">${readiness}%</div>
  <div style="color:#888;margin-top:8px">מדד מוכנות לפסח</div>
</div>
<h2>🔢 סיכום</h2>
<div class="kpi">
  <div class="kpi-box"><div class="kpi-val">${avgTrained}%</div><div class="kpi-lbl">הכשרה ממוצעת</div></div>
  <div class="kpi-box"><div class="kpi-val">${avgClean}%</div><div class="kpi-lbl">ניקיון ממוצע</div></div>
  <div class="kpi-box"><div class="kpi-val" style="color:${totalMissing===0?'#4ade80':'#f87171'}">${totalMissing}</div><div class="kpi-lbl">ציוד חסר</div></div>
  <div class="kpi-box"><div class="kpi-val" style="color:${totalInc===0?'#4ade80':'#f87171'}">${totalInc}</div><div class="kpi-lbl">חריגים פתוחים</div></div>
</div>
<h2>📋 מצב יחידות</h2>
<table><thead><tr><th>יחידה</th><th>הכשרה</th><th>ניקיון</th><th>ציוד חסר</th><th>חריגים</th><th>מצב</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="color:#555;font-size:.8em;margin-top:40px;border-top:1px solid #333;padding-top:10px">
  pesach-hub | רבנות ${currentUnit?.name}</p></body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  const totals = Object.values(unitStats)
  const avgTrained = totals.length ? Math.round(totals.reduce((a,s)=>a+s.trainedPct,0)/totals.length) : 0
  const totalMissing = totals.reduce((a,s)=>a+s.equipMissing,0)
  const totalInc = totals.reduce((a,s)=>a+s.openInc,0)
  const avgClean = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0
  const daysLeft = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))
  const smartAlerts = useSmartAlerts(unitStats, daysLeft)
  const criticalAlerts = smartAlerts.filter(a => a.level === 'critical')

  const healthColor = { green: 'border-green-500 bg-green-900/10', orange: 'border-orange-500 bg-orange-900/10', red: 'border-red-500 bg-red-900/10 animate-pulse', gray: 'border-border2 bg-bg3' }
  const healthDot = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500', gray: 'bg-border2' }
  const healthLabel = { green: 'תקין', orange: 'דורש תשומת לב', red: '⚠ קריטי', gray: 'אין נתונים' }

  if (loading) return <div className="flex items-center justify-center h-64 text-text3">טוען נתונים...</div>

  return (
    <div className="space-y-5">
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
          <button onClick={exportPDF} className="btn btn-sm bg-green-900/30 border-green-500/40 text-green-400 hover:bg-green-800/40">📄 ייצא PDF</button>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.slice(0,3).map(a=>(
            <div key={a.id} className="bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-red-400 text-lg">{a.icon}</span>
              <div className="flex-1"><span className="text-red-300 text-sm font-bold">{a.message}</span>{a.unit && <span className="text-red-400/70 text-xs mr-2">— {a.unit}</span>}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="הכשרה ממוצעת" value={`${avgTrained}%`} color={avgTrained>=70?'green':avgTrained>=50?'orange':'red'}/>
        <KpiCard label="ניקיון ממוצע" value={`${avgClean}%`} color={avgClean>=70?'green':avgClean>=50?'orange':'red'}/>
        <KpiCard label="ציוד חסר" value={totalMissing} sub="פריטים" color={totalMissing===0?'green':'red'}/>
        <KpiCard label="חריגים פתוחים" value={totalInc} color={totalInc===0?'green':'red'}/>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3"><span className="text-sm font-black">📊 פס מצב מבצעי</span><span className="text-text3 text-xs">{new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'הכשרה', val:avgTrained, color:avgTrained>=70?'bg-green-500':avgTrained>=50?'bg-orange-500':'bg-red-500', icon:'🎓' },
            { label:'ניקיון', val:avgClean,  color:avgClean>=70?'bg-green-500':avgClean>=50?'bg-orange-500':'bg-red-500',     icon:'🧹' },
            { label:'ציוד', val: totals.length===0||totals.every(s=>s.personnel===0) ? 0 : totalMissing===0?100:Math.max(0,100-totalMissing*8), color: totals.length===0||totals.every(s=>s.personnel===0) ? 'bg-border2' : totalMissing===0?'bg-green-500':totalMissing<=3?'bg-orange-500':'bg-red-500', icon:'📦', text: totals.length===0||totals.every(s=>s.personnel===0) ? 'אין נתונים' : totalMissing===0?'מלא':`חסר ${totalMissing}` },
            { label:'חריגים', val: totals.length===0||totals.every(s=>s.personnel===0) ? 0 : totalInc===0?100:Math.max(0,100-totalInc*15), color: totals.length===0||totals.every(s=>s.personnel===0) ? 'bg-border2' : totalInc===0?'bg-green-500':totalInc<=2?'bg-orange-500':'bg-red-500', icon:'🆘', text: totals.length===0||totals.every(s=>s.personnel===0) ? 'אין נתונים' : totalInc===0?'נקי':`${totalInc} פתוחים` },
          ].map(item => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-text3">{item.icon} {item.label}</span><span className="font-bold text-text1">{item.text || item.val+'%'}</span></div>
              <div className="h-2.5 bg-bg4 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${item.color}`} style={{width:`${item.val}%`}}/></div>
            </div>
          ))}
        </div>
        {nonAdminUnits.filter(u => !unitStats[u.id] || unitStats[u.id].personnel === 0).length > 0 && (
          <div className="mt-3 pt-3 border-t border-border1"><span className="text-xs text-orange-400 font-bold">⚠️ יחידות ללא נתונים: </span><span className="text-xs text-text3">{nonAdminUnits.filter(u => !unitStats[u.id] || unitStats[u.id].personnel === 0).map(u=>u.name).join(' · ')}</span></div>
        )}
      </div>

      {viewMode === 'table' && (
        <div className="card overflow-x-auto">
          <div className="panel-head"><span className="panel-title">📋 מצב יחידות — {currentUnit?.name}</span></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border1 text-text3 text-xs">
                <th className="text-right p-3 font-bold">יחידה</th><th className="text-center p-3 font-bold">הכשרה</th><th className="text-center p-3 font-bold">ניקיון</th><th className="text-center p-3 font-bold">ציוד חסר</th><th className="text-center p-3 font-bold">חריגים</th><th className="text-center p-3 font-bold">מצב</th>
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
                    <td className="p-3 text-center"><span className={`font-bold ${s.equipMissing===0?'text-green-400':'text-red-400'}`}>{s.equipMissing||0}</span></td>
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

      {viewMode === 'compare' && (
        <div className="space-y-3">
          {nonAdminUnits.map(u => {
            const s = unitStats[u.id] || {}
            return (
              <div key={u.id} className={`card p-4 border-2 ${healthColor[s.health||'green']}`}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2"><span className="text-xl">{u.icon}</span><div><div className="font-black">{u.name}</div><div className="text-text3 text-xs">{u.brigade}</div></div></div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthColor[s.health||'green']}`}><span className={`w-2 h-2 rounded-full ${healthDot[s.health||'green']}`}/>{healthLabel[s.health||'green']}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label:'הכשרה', val:s.trainedPct||0, color:s.trainedPct>=70?'bg-green-500':s.trainedPct>=40?'bg-orange-500':'bg-red-500' },
                    { label:'ניקיון', val:s.cleanPct||0, color:s.cleanPct>=70?'bg-green-500':s.cleanPct>=40?'bg-orange-500':'bg-red-500' },
                    { label:'ציוד', val:s.equipMissing===0?100:30, color:s.equipMissing===0?'bg-green-500':'bg-red-500', text:s.equipMissing===0?'מלא':`חסר ${s.equipMissing}` },
                    { label:'חריגים', val:s.openInc===0?100:20, color:s.openInc===0?'bg-green-500':'bg-red-500', text:s.openInc===0?'נקי':`${s.openInc} פתוחים` },
                  ].map(item=>(
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-text3 mb-1"><span>{item.label}</span><span className="font-bold text-text1">{item.text||`${item.val}%`}</span></div>
                      <div className="pbar"><div className={`pbar-fill ${item.color}`} style={{width:`${item.val}%`}}/></div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {dispLog.length > 0 && (
            <div className="card">
              <div className="panel-head"><span className="panel-title">📦 יומן ניפוק אחרון</span></div>
              <div className="divide-y divide-border1/50">
                {dispLog.slice(0,8).map(d=>(
                  <div key={d.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className="text-text3 text-xs w-24 flex-shrink-0">{new Date(d.created_at).toLocaleDateString('he-IL')}</span>
                    <span className="font-bold flex-1">{d.item_name}</span>
                    <span className="badge badge-blue">כמות: {d.quantity}</span>
                    <span className="text-text3 text-xs">{UNITS.find(u=>u.id===d.unit_id)?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={taskModal} onClose={()=>setTaskModal(false)} title="📋 שליחת משימה ליחידות">
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">כותרת המשימה</label><input className="form-input" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))}/></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">תיאור</label><input className="form-input" value={taskForm.desc} onChange={e=>setTaskForm(f=>({...f,desc:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text3 font-bold block mb-1">עדיפות</label><select className="form-input" value={taskForm.priority} onChange={e=>setTaskForm(f=>({...f,priority:e.target.value}))}><option value="urgent">דחוף</option><option value="high">גבוה</option><option value="normal">בינוני</option></select></div>
            <div><label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label><input type="date" className="form-input" value={taskForm.date} onChange={e=>setTaskForm(f=>({...f,date:e.target.value}))}/></div>
          </div>
          <div><label className="text-xs text-text3 font-bold block mb-1">יחידת יעד</label><select className="form-input" value={taskForm.target} onChange={e=>setTaskForm(f=>({...f,target:e.target.value}))}><option value="">כל היחידות תחתי</option>{nonAdminUnits.map(u=><option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}</select></div>
        </div>
        <ModalButtons onClose={()=>setTaskModal(false)} onSave={sendTask} saveLabel="📋 שלח משימה"/>
      </Modal>

      <Modal open={dispatchModal} onClose={()=>setDispatchModal(false)} title="📦 ניפוק ציוד">
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">יחידה</label><select className="form-input" value={dispForm.unit} onChange={e=>setDispForm(f=>({...f,unit:e.target.value}))}><option value="">בחר יחידה</option>{nonAdminUnits.map(u=><option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}</select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">פריט</label><input className="form-input" placeholder="לדוג: קנקן, אנכיה..." value={dispForm.item} onChange={e=>setDispForm(f=>({...f,item:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text3 font-bold block mb-1">כמות</label><input type="number" min="1" className="form-input" value={dispForm.qty} onChange={e=>setDispForm(f=>({...f,qty:parseInt(e.target.value)||1}))}/></div>
            <div><label className="text-xs text-text3 font-bold block mb-1">הערות</label><input className="form-input" value={dispForm.note} onChange={e=>setDispForm(f=>({...f,note:e.target.value}))}/></div>
          </div>
        </div>
        <ModalButtons onClose={()=>setDispatchModal(false)} onSave={saveDispatch} saveLabel="📦 רשום ניפוק"/>
      </Modal>
      
      {viewMode === 'ai' && <DutyOfficerAI />}
    </div>
  )
}
