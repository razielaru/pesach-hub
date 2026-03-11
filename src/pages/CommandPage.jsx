import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/UI/Modal'
import KpiCard from '../components/UI/KpiCard'

export default function CommandPage() {
  const { currentUnit, showToast } = useStore()
  const [unitStats, setUnitStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'map'
  const [taskModal, setTaskModal] = useState(false)
  const [dispatchModal, setDispatchModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title:'', desc:'', priority:'high', date:'', target:'' })
  const [dispForm, setDispForm] = useState({ unit:'', item:'', qty:1, note:'' })
  const [dispLog, setDispLog] = useState([])

  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const results = {}
    await Promise.all(nonAdminUnits.map(async (u) => {
      const [pers, equip, areas, inc] = await Promise.all([
        supabase.from('personnel').select('training_status,status').eq('unit_id', u.id),
        supabase.from('equipment').select('have,need').eq('unit_id', u.id),
        supabase.from('cleaning_areas').select('status').eq('unit_id', u.id),
        supabase.from('incidents').select('id').eq('unit_id', u.id).eq('status','open'),
      ])
      const p = pers.data || []
      const e = equip.data || []
      const a = areas.data || []
      const trainedPct = p.length ? Math.round(p.filter(x=>x.training_status==='done').length/p.length*100) : 0
      const cleanPct = a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0
      const equipMissing = e.filter(x=>x.have<x.need).length
      const openInc = (inc.data||[]).length
      // Overall health: green=all ok, orange=some issues, red=critical
      let health = 'green'
      if (openInc > 0 || equipMissing > 2) health = 'red'
      else if (trainedPct < 70 || cleanPct < 50 || equipMissing > 0) health = 'orange'
      results[u.id] = { trainedPct, cleanPct, equipMissing, openInc, total: p.length, health,
        available: p.filter(x=>x.status==='available').length }
    }))
    const { data: dl } = await supabase.from('dispatch_log').select('*').order('created_at',{ascending:false}).limit(10)
    setDispLog(dl || [])
    setUnitStats(results)
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
      // Update unit equipment
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

  // Aggregates
  const totals = Object.values(unitStats)
  const avgTrained = totals.length ? Math.round(totals.reduce((a,s)=>a+s.trainedPct,0)/totals.length) : 0
  const totalMissing = totals.reduce((a,s)=>a+s.equipMissing,0)
  const totalInc = totals.reduce((a,s)=>a+s.openInc,0)
  const avgClean = totals.length ? Math.round(totals.reduce((a,s)=>a+s.cleanPct,0)/totals.length) : 0

  const healthColor = { green: 'border-green-500 bg-green-900/10', orange: 'border-orange-500 bg-orange-900/10', red: 'border-red-500 bg-red-900/10 animate-pulse' }
  const healthDot = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500' }
  const healthLabel = { green: 'תקין', orange: 'דורש תשומת לב', red: '⚠ קריטי' }

  if (loading) return <div className="flex items-center justify-center h-64 text-text3">טוען נתונים...</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-black">⭐ דשבורד פיקוד מרכז</h2>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden">
            <button onClick={()=>setViewMode('table')}
              className={`px-4 py-2 text-xs font-bold transition-all
                ${viewMode==='table' ? 'bg-gold text-black' : 'text-text2 hover:text-text1'}`}>
              📋 טבלה
            </button>
            <button onClick={()=>setViewMode('map')}
              className={`px-4 py-2 text-xs font-bold transition-all
                ${viewMode==='map' ? 'bg-gold text-black' : 'text-text2 hover:text-text1'}`}>
              🗺️ מפה
            </button>
          </div>
          <button className="btn btn-blue btn-sm" onClick={()=>setTaskModal(true)}>📋 שלח משימה</button>
          <button className="btn btn-sm" onClick={()=>setDispatchModal(true)}>📦 ניפוק ציוד</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="הכשרה ממוצעת" value={`${avgTrained}%`} color="green" />
        <KpiCard label="ניקיון ממוצע" value={`${avgClean}%`} color="blue" />
        <KpiCard label="ציוד חסר (סה״כ)" value={totalMissing} color="red" />
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
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="font-black">{u.icon} {u.name}</span>
                        <div className="text-xs text-text3">{u.brigade}</div>
                      </td>
                      <td>
                        <span className={`badge ${h==='green'?'badge-green':h==='orange'?'badge-orange':'badge-red'}`}>
                          {healthLabel[h]}
                        </span>
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
                      <td><span className={`badge ${s.equipMissing===0?'badge-green':'badge-red'}`}>{s.equipMissing===0?'✓ תקין':'⚠ '+s.equipMissing+' חסרים'}</span></td>
                      <td>{s.openInc > 0 ? <span className="badge badge-red">🆘 {s.openInc}</span> : <span className="text-text3 text-xs">—</span>}</td>
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
          {/* Brigade groups */}
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
                      <div key={u.id}
                        className={`card p-4 border-2 cursor-pointer hover:-translate-y-1 transition-all
                          ${healthColor[h]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{u.icon}</span>
                          <div className={`w-3 h-3 rounded-full ${healthDot[h]} ${h==='red'?'animate-pulse':''}`} />
                        </div>
                        <div className="font-black text-sm mb-1">{u.name}</div>
                        <div className={`text-xs font-bold ${h==='green'?'text-green-400':h==='orange'?'text-orange-400':'text-red-400'}`}>
                          {healthLabel[h]}
                        </div>
                        {/* Mini stats */}
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
                        {s.openInc > 0 && (
                          <div className="mt-2 text-red-400 text-xs font-bold">🆘 {s.openInc} חריג פתוח</div>
                        )}
                      </div>
                    )
                  })}
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
