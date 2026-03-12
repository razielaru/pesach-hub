import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import BriefingMode, { useSmartAlerts } from './BriefingMode'

export default function CommandPage() {
  const { currentUnit, showToast } = useStore()
  const [unitStats, setUnitStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('table')
  const [briefing, setBriefing] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [dispatchModal, setDispatchModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title:'', desc:'', priority:'high', date:'', target:'' })
  const [dispForm, setDispForm] = useState({ unit:'', item:'', qty:1, note:'' })
  const [dispLog, setDispLog] = useState([])

  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  useEffect(() => { loadAll() }, [])

  async function loadUnitSafe(u) {
    try {
      const withTimeout = (promise, ms = 6000) =>
        Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej('timeout'), ms))])

      const [pers, equip, areas, inc] = await Promise.all([
        withTimeout(supabase.from('personnel').select('training_status,status').eq('unit_id', u.id)),
        withTimeout(supabase.from('equipment').select('have,need').eq('unit_id', u.id)),
        withTimeout(supabase.from('cleaning_areas').select('status').eq('unit_id', u.id)),
        withTimeout(supabase.from('incidents').select('id').eq('unit_id', u.id).eq('status','open')),
      ])
      const p = pers.data || []
      const e = equip.data || []
      const a = areas.data || []
      const trainedPct = p.length ? Math.round(p.filter(x=>x.training_status==='done').length/p.length*100) : 0
      const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
      const equipMissing = e.filter(x=>x.have<x.need).length
      const openInc = (inc.data||[]).length
      let health = 'green'
      if (openInc > 0 || equipMissing > 2) health = 'red'
      else if (trainedPct < 70 || cleanPct < 50 || equipMissing > 0) health = 'orange'
      return { trainedPct, cleanPct, equipMissing, openInc, total: p.length, health,
        available: p.filter(x=>x.status==='available').length }
    } catch {
      return { trainedPct: 0, cleanPct: 0, equipMissing: 0, openInc: 0, total: 0, health: 'orange', available: 0 }
    }
  }

  async function loadAll() {
    setLoading(true)

    // Show UI after 600ms regardless — don't block forever
    const showTimer = setTimeout(() => setLoading(false), 600)

    // Load dispatch log immediately (fast)
    supabase.from('dispatch_log').select('*').order('created_at',{ascending:false}).limit(10)
      .then(({ data }) => setDispLog(data || []))

    // Load each unit independently and update state as results arrive
    await Promise.allSettled(
      nonAdminUnits.map(async (u) => {
        const stats = await loadUnitSafe(u)
        setUnitStats(prev => ({ ...prev, [u.id]: stats }))
      })
    )

    clearTimeout(showTimer)
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
    showToast(`משימה נשלחה ל${taskForm.target ? UNITS.find(u=>u.id===taskForm.target)?.name : 'כל היחידות'} ✅`, 'green')
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
        .select('*').eq('unit_id', dispForm.unit).eq('name', dispForm.item).single()
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
  const totalMissing = totals.reduce((a,s)=>a+s.equipMissing,0)
  const totalInc = totals.reduce((a,s)=>a+s.openInc,0)
  const avgClean = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0
  const daysLeft = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))
  const smartAlerts = useSmartAlerts(unitStats, daysLeft)
  const criticalAlerts = smartAlerts.filter(a => a.level === 'critical')

  const healthColor = { green: 'border-green-500 bg-green-900/10', orange: 'border-orange-500 bg-orange-900/10', red: 'border-red-500 bg-red-900/10 animate-pulse' }
  const healthDot = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500' }
  const healthLabel = { green: 'תקין', orange: 'דורש תשומת לב', red: '⚠ קריטי' }

  const loadedCount = Object.keys(unitStats).length

  if (loading && loadedCount === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-text3 text-sm">טוען נתונים...</div>
      <div className="w-48 h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full animate-pulse" style={{width:'60%'}} />
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {briefing && <BriefingMode unitStats={unitStats} onClose={() => setBriefing(false)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black">⭐ דשבורד פיקוד מרכז</h2>
          {loading && loadedCount > 0 && (
            <span className="text-xs text-text3 bg-bg3 border border-border1 px-2 py-1 rounded-full animate-pulse">
              טוען {loadedCount}/{nonAdminUnits.length}...
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden">
            {[['table','📋 טבלה'],['map','🗺️ מפה'],['compare','📊 השוואה']].map(([id,label])=>(
              <button key={id} onClick={()=>setViewMode(id)}
                className={`px-3 py-2 text-xs font-bold transition-all ${viewMode===id?'bg-gold text-black':'text-text2 hover:text-text1'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setBriefing(true)}
            className="btn text-xs px-3 py-2 bg-purple-900/40 border-purple-500/50 text-purple-300 hover:bg-purple-800/50">
            🖥 הערכת מצב
          </button>
          <button className="btn btn-blue btn-sm" onClick={()=>setTaskModal(true)}>📋 שלח משימה</button>
          <button className="btn btn-sm" onClick={()=>setDispatchModal(true)}>📦 ניפוק ציוד</button>
        </div>
      </div>

      {/* Smart alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.slice(0,3).map(a=>(
            <div key={a.id} className="bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-lg">{a.icon}</span>
              <span className="text-red-200 text-sm font-bold flex-1">{a.text}</span>
              <span className="badge badge-red text-[10px]">קריטי</span>
            </div>
          ))}
          {criticalAlerts.length > 3 && <p className="text-red-400/70 text-xs text-center">ועוד {criticalAlerts.length-3} התראות — לחץ הערכת מצב לתמונה מלאה</p>}
        </div>
      )}
      {smartAlerts.filter(a=>a.level==='warning').length > 0 && criticalAlerts.length === 0 && (
        <div className="bg-orange-900/15 border border-orange-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span>⚠️</span>
          <span className="text-orange-200 text-sm font-bold">{smartAlerts.filter(a=>a.level==='warning').length} אזהרות פעילות — לחץ הערכת מצב לפרטים</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="הכשרה ממוצעת" value={`${avgTrained}%`} color="green" />
        <KpiCard label="ניקיון ממוצע" value={`${avgClean}%`} color="blue" />
        <KpiCard label='ציוד חסר (סה"כ)' value={totalMissing} color="red" />
        <KpiCard label="חריגים פתוחים" value={totalInc} color={totalInc > 0 ? 'red' : 'green'} />
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">📋 כל היחידות — מבט פיקודי</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead><tr>
                <th>יחידה</th><th>מצב כללי</th><th>הכשרה</th>
                <th>ניקיון</th><th>ציוד</th><th>חריגים</th><th>פעולה</th>
              </tr></thead>
              <tbody>
                {nonAdminUnits.map(u => {
                  const s = unitStats[u.id] || {}
                  const h = s.health || 'orange'
                  const isLoaded = !!unitStats[u.id]
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="font-black">{u.icon} {u.name}</span>
                        <div className="text-xs text-text3">{u.brigade}</div>
                      </td>
                      <td>
                        {!isLoaded
                          ? <span className="badge badge-dim text-[10px]">טוען...</span>
                          : <span className={`badge ${h==='green'?'badge-green':h==='orange'?'badge-orange':'badge-red'}`}>{healthLabel[h]}</span>
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="pbar w-20">
                            <div className="pbar-fill bg-green-500" style={{ width:`${s.trainedPct||0}%` }} />
                          </div>
                          <span className="text-xs text-text3">{s.trainedPct||0}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${(s.cleanPct||0)>=80?'badge-green':(s.cleanPct||0)>=50?'badge-orange':'badge-red'}`}>{s.cleanPct||0}%</span></td>
                      <td><span className={`badge ${(s.equipMissing||0)===0?'badge-green':'badge-red'}`}>{(s.equipMissing||0)===0?'✓ תקין':'⚠ '+s.equipMissing+' חסרים'}</span></td>
                      <td>{(s.openInc||0) > 0 ? <span className="badge badge-red">🆘 {s.openInc}</span> : <span className="text-text3 text-xs">—</span>}</td>
                      <td><button className="btn btn-sm" onClick={()=>setTaskModal(true)}>📋 משימה</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <p className="text-text3 text-xs">לחץ על יחידה לפרטים · ירוק=תקין · כתום=דורש תשומת לב · אדום=קריטי</p>
          {['חטמ"רים','חטיבות','אוגדות'].map(brigade => {
            const bUnits = nonAdminUnits.filter(u=>u.brigade===brigade)
            return (
              <div key={brigade}>
                <div className="text-xs text-text3 uppercase font-bold tracking-widest mb-2">{brigade}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {bUnits.map(u => {
                    const s = unitStats[u.id] || {}
                    const h = s.health || 'orange'
                    return (
                      <div key={u.id} className={`card p-4 border-2 cursor-pointer hover:-translate-y-1 transition-all ${healthColor[h]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{u.icon}</span>
                          <div className={`w-3 h-3 rounded-full ${healthDot[h]} ${h==='red'?'animate-pulse':''}`} />
                        </div>
                        <div className="font-black text-sm mb-1">{u.name}</div>
                        <div className={`text-xs font-bold ${h==='green'?'text-green-400':h==='orange'?'text-orange-400':'text-red-400'}`}>{healthLabel[h]}</div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-text3 w-10">🎓</span>
                            <div className="pbar flex-1"><div className="pbar-fill bg-green-500" style={{width:`${s.trainedPct||0}%`}}/></div>
                            <span className="text-[10px] text-text3">{s.trainedPct||0}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-text3 w-10">🧹</span>
                            <div className="pbar flex-1"><div className="pbar-fill bg-blue-500" style={{width:`${s.cleanPct||0}%`}}/></div>
                            <span className="text-[10px] text-text3">{s.cleanPct||0}%</span>
                          </div>
                        </div>
                        {(s.openInc||0) > 0 && <div className="mt-2 text-red-400 text-xs font-bold">🆘 {s.openInc} חריג פתוח</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* COMPARE VIEW */}
      {viewMode === 'compare' && (
        <div className="space-y-5">
          {['חטמ"רים','חטיבות','אוגדות'].map(brigade => {
            const bUnits = nonAdminUnits.filter(u => u.brigade === brigade)
            if (bUnits.length === 0) return null
            return (
              <div key={brigade} className="card overflow-hidden">
                <div className="panel-head">
                  <span className="panel-title font-black">{brigade} — השוואה</span>
                  <span className="text-text3 text-xs">{bUnits.length} יחידות</span>
                </div>
                <div className="p-4 space-y-5">
                  {[{key:'trainedPct',label:'🎓 הכשרות'},{key:'cleanPct',label:'🧹 ניקיון'}].map(m => (
                    <div key={m.key}>
                      <div className="text-xs font-bold text-text3 mb-2">{m.label}</div>
                      <div className="space-y-2">
                        {[...bUnits].sort((a,b)=>(unitStats[b.id]?.[m.key]||0)-(unitStats[a.id]?.[m.key]||0)).map(u => {
                          const val = unitStats[u.id]?.[m.key] || 0
                          const color = val>=80?'bg-green-500':val>=50?'bg-orange-500':'bg-red-500'
                          return (
                            <div key={u.id} className="flex items-center gap-3">
                              <span className="text-sm w-6">{u.icon}</span>
                              <span className="text-xs font-bold text-text2 w-28 flex-shrink-0 truncate">{u.name}</span>
                              <div className="flex-1 h-5 bg-bg3 rounded-full overflow-hidden border border-border1">
                                <div className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5 ${color}`}
                                  style={{width:`${Math.max(val,3)}%`}}>
                                  {val>=15 && <span className="text-[10px] font-black text-white">{val}%</span>}
                                </div>
                              </div>
                              {val<15 && <span className="text-xs font-black text-text2 w-8">{val}%</span>}
                              {val<30 && <span className="badge badge-red text-[9px]">⚠</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div className="text-xs font-bold text-text3 mb-2">🆘 חריגים פתוחים</div>
                    <div className="flex gap-2 flex-wrap">
                      {bUnits.map(u => {
                        const inc = unitStats[u.id]?.openInc || 0
                        return (
                          <div key={u.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs
                            ${inc>0?'border-red-500/40 bg-red-900/15 text-red-300':'border-green-500/30 bg-green-900/10 text-green-400'}`}>
                            <span>{u.icon}</span>
                            <span className="font-bold">{inc>0?`${inc} חריג`:'✓ תקין'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dispatch log */}
      <div className="card">
        <div className="panel-head">
          <span className="panel-title">📦 יומן ניפוקים</span>
          <button className="btn btn-sm" onClick={()=>setDispatchModal(true)}>+ ניפוק חדש</button>
        </div>
        <div className="divide-y divide-border1/50">
          {dispLog.length === 0 && <p className="p-4 text-text3 text-sm">אין ניפוקים עדיין</p>}
          {dispLog.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="text-blue-400 font-bold">{UNITS.find(u=>u.id===d.unit_id)?.name}</span>
              <span>{d.item_name} × {d.quantity}</span>
              {d.notes && <span className="text-text3">— {d.notes}</span>}
              <span className="mr-auto text-text3 text-xs">{new Date(d.created_at).toLocaleDateString('he-IL')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Send Task Modal */}
      <Modal open={taskModal} onClose={()=>setTaskModal(false)} title="📋 שלח משימה ליחידה">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">יחידה יעד</label>
            <select className="form-input" value={taskForm.target} onChange={e=>setTaskForm(f=>({...f,target:e.target.value}))}>
              <option value="">— כל היחידות —</option>
              {nonAdminUnits.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת</label>
            <input className="form-input" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור</label>
            <input className="form-input" value={taskForm.desc} onChange={e=>setTaskForm(f=>({...f,desc:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">עדיפות</label>
              <select className="form-input" value={taskForm.priority} onChange={e=>setTaskForm(f=>({...f,priority:e.target.value}))}>
                <option value="urgent">דחוף</option><option value="high">גבוה</option><option value="normal">בינוני</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label>
              <input type="date" className="form-input" value={taskForm.date} onChange={e=>setTaskForm(f=>({...f,date:e.target.value}))} />
            </div>
          </div>
        </div>
        <ModalButtons onClose={()=>setTaskModal(false)} onSave={sendTask} saveLabel="📤 שלח" saveClass="btn-blue" />
      </Modal>

      {/* Dispatch Modal */}
      <Modal open={dispatchModal} onClose={()=>setDispatchModal(false)} title="📦 ניפוק ציוד ליחידה">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">יחידה</label>
            <select className="form-input" value={dispForm.unit} onChange={e=>setDispForm(f=>({...f,unit:e.target.value}))}>
              <option value="">בחר יחידה</option>
              {nonAdminUnits.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">פריט</label>
            <input className="form-input" placeholder="הגדות / מצות / חומר ניקיון..." value={dispForm.item} onChange={e=>setDispForm(f=>({...f,item:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">כמות</label>
              <input type="number" className="form-input" min="1" value={dispForm.qty} onChange={e=>setDispForm(f=>({...f,qty:+e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">הערה</label>
              <input className="form-input" value={dispForm.note} onChange={e=>setDispForm(f=>({...f,note:e.target.value}))} />
            </div>
          </div>
        </div>
        <ModalButtons onClose={()=>setDispatchModal(false)} onSave={saveDispatch} saveLabel="אשר ניפוק" />
      </Modal>
    </div>
  )
}
