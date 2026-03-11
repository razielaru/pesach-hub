import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/UI/Modal'

// ══ CLEANING ══
export function CleaningPage() {
  const { currentUnit, showToast } = useStore()
  const [areas, setAreas] = useState([])
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])
  async function load() {
    const { data } = await supabase.from('cleaning_areas').select('*').eq('unit_id', currentUnit.id).order('name')
    setAreas(data || [])
  }
  async function cycle(a) {
    const next = { dirty:'partial', partial:'clean', clean:'dirty' }[a.status]
    await supabase.from('cleaning_areas').update({ status: next, updated_at: new Date().toISOString() }).eq('id', a.id)
    setAreas(prev => prev.map(x => x.id===a.id ? {...x, status: next} : x))
  }
  async function addArea() {
    if (!name) return
    await supabase.from('cleaning_areas').insert({ unit_id: currentUnit.id, name, status: 'dirty' })
    setName(''); setModal(false); load()
  }

  const clean = areas.filter(a=>a.status==='clean').length
  const pct = areas.length ? Math.round(clean/areas.length*100) : 0
  const icons = { clean:'✅', partial:'🔄', dirty:'🧹' }
  const labels = { clean:'נקי', partial:'בתהליך', dirty:'לא נוקה' }
  const cls = { clean:'border-green-500/50 bg-green-900/10', partial:'border-orange-500/50 bg-orange-900/10', dirty:'border-border1' }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">🧹 יום הניקיונות</h2>
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-black ${pct>=80?'text-green-400':pct>=50?'text-orange-400':'text-red-400'}`}>{pct}%</span>
          <button className="btn" onClick={()=>setModal(true)}>+ אזור</button>
        </div>
      </div>
      <div className="w-full pbar h-3 rounded-full">
        <div className={`pbar-fill ${pct>=80?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'}`} style={{width:`${pct}%`}}/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {areas.map(a => (
          <div key={a.id} onClick={()=>cycle(a)}
            className={`card border-2 p-4 text-center cursor-pointer hover:-translate-y-1 transition-all ${cls[a.status]}`}>
            <div className="text-3xl mb-2">{icons[a.status]}</div>
            <div className="font-black text-sm mb-1">{a.name}</div>
            <span className={`badge ${a.status==='clean'?'badge-green':a.status==='partial'?'badge-orange':'badge-red'}`}>
              {labels[a.status]}
            </span>
            <div className="text-text3 text-[10px] mt-2">לחץ לשינוי</div>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="🧹 הוספת אזור ניקיון">
        <div><label className="text-xs text-text3 font-bold block mb-1">שם האזור</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <ModalButtons onClose={()=>setModal(false)} onSave={addArea} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}

// ══ TASKS ══
export function TasksPage() {
  const { currentUnit, showToast } = useStore()
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', priority:'normal', due_date:'' })

  useEffect(() => { if (currentUnit) load() }, [currentUnit])
  async function load() {
    const { data } = await supabase.from('tasks').select('*').eq('unit_id', currentUnit.id).order('created_at',{ascending:false})
    setTasks(data || [])
  }
  async function save() {
    if (!form.title) return
    await supabase.from('tasks').insert({ unit_id: currentUnit.id, ...form, status:'todo' })
    showToast('משימה נוספה ✅','green'); setModal(false)
    setForm({ title:'', description:'', priority:'normal', due_date:'' }); load()
  }
  async function cycleStatus(t) {
    const next = { todo:'doing', doing:'done', done:'todo' }[t.status]
    await supabase.from('tasks').update({ status: next }).eq('id', t.id)
    setTasks(prev => prev.map(x => x.id===t.id ? {...x,status:next} : x))
  }
  async function del(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }

  const pCls={urgent:'badge-red',high:'badge-orange',normal:'badge-blue'}
  const pLbl={urgent:'דחוף',high:'גבוה',normal:'בינוני'}
  const sCls={todo:'badge-dim',doing:'badge-orange',done:'badge-green'}
  const sLbl={todo:'לביצוע',doing:'בתהליך',done:'הושלם'}
  const shown = filter==='all' ? tasks : tasks.filter(t=>t.status===filter)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">✅ ניהול משימות</h2>
        <button className="btn" onClick={()=>setModal(true)}>+ משימה</button>
      </div>
      <div className="flex gap-2">
        {[['all','הכל'],['todo','לביצוע'],['doing','בתהליך'],['done','הושלם']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} className={`ftab ${filter===k?'active':''}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map(t => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{t.title}</span>
                <span className={`badge ${pCls[t.priority]}`}>{pLbl[t.priority]}</span>
                {t.assigned_by && <span className="badge badge-purple">📤 מ{t.assigned_by}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${sCls[t.status]}`}>{sLbl[t.status]}</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>cycleStatus(t)}>→ הבא</button>
                <button className="btn btn-red btn-sm" onClick={()=>del(t.id)}>🗑</button>
              </div>
            </div>
            {(t.description||t.due_date) && (
              <div className="text-text3 text-xs mt-1">
                {t.description}{t.description&&t.due_date?' · ':''}{t.due_date&&`📅 ${new Date(t.due_date).toLocaleDateString('he-IL')}`}
              </div>
            )}
          </div>
        ))}
        {shown.length===0 && <div className="card p-10 text-center text-text3">אין משימות</div>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="✅ משימה חדשה">
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">כותרת</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">תיאור</label>
            <input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text3 font-bold block mb-1">עדיפות</label>
              <select className="form-input" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                <option value="urgent">דחוף</option><option value="high">גבוה</option><option value="normal">בינוני</option>
              </select></div>
            <div><label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} /></div>
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}

// ══ TIMELINE ══
export function TimelinePage() {
  const { currentUnit } = useStore()
  const [milestones, setMilestones] = useState([])
  const [statuses, setStatuses] = useState({})

  useEffect(() => { if (currentUnit) load() }, [currentUnit])
  async function load() {
    const [ms, st] = await Promise.all([
      supabase.from('milestones').select('*').order('sort_order'),
      supabase.from('milestone_status').select('*').eq('unit_id', currentUnit.id),
    ])
    setMilestones(ms.data || [])
    const map = {}
    ;(st.data||[]).forEach(s => { map[s.milestone_id] = s })
    setStatuses(map)
  }
  async function cycleMs(ms) {
    const cur = statuses[ms.id]?.status || 'pending'
    const next = { pending:'in_progress', in_progress:'done', done:'pending' }[cur]
    await supabase.from('milestone_status').upsert({
      milestone_id: ms.id, unit_id: currentUnit.id, status: next, updated_at: new Date().toISOString()
    }, { onConflict: 'milestone_id,unit_id' })
    setStatuses(prev => ({ ...prev, [ms.id]: { ...prev[ms.id], status: next } }))
  }

  const stCls = { pending:'border-border1', in_progress:'border-orange-500/50 bg-orange-900/8', done:'border-green-500/50 bg-green-900/8' }
  const stLabel = { pending:'ממתין', in_progress:'בתהליך', done:'✓ הושלם' }
  const stBadge = { pending:'badge-dim', in_progress:'badge-orange', done:'badge-green' }
  const catColor = { ניקיון:'text-blue-400', כשרות:'text-gold', לוגיסטיקה:'text-purple-400', הכשרה:'text-green-400', סדר:'text-orange-400' }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">📅 טיימליין אבני דרך</h2>
      <div className="relative">
        <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-border2" />
        <div className="space-y-4">
          {milestones.map((ms, i) => {
            const st = statuses[ms.id]?.status || 'pending'
            const due = new Date(ms.due_date)
            const overdue = due < new Date() && st !== 'done'
            return (
              <div key={ms.id} className="flex gap-4 items-start">
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                  border-2 cursor-pointer transition-all hover:scale-110
                  ${st==='done'?'bg-green-900/30 border-green-500':st==='in_progress'?'bg-orange-900/30 border-orange-500':'bg-bg3 border-border2'}`}
                  onClick={() => cycleMs(ms)}>
                  <span className="text-lg">{st==='done'?'✓':st==='in_progress'?'◉':'○'}</span>
                </div>
                <div className={`card flex-1 p-4 border-2 cursor-pointer hover:-translate-y-0.5 transition-all ${stCls[st]}`}
                  onClick={() => cycleMs(ms)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${catColor[ms.category]||'text-text3'}`}>{ms.category}</span>
                      <span className="font-black">{ms.title}</span>
                    </div>
                    <span className={`badge ${stBadge[st]}`}>{stLabel[st]}</span>
                  </div>
                  {ms.description && <p className="text-text3 text-xs mb-1">{ms.description}</p>}
                  <div className={`text-xs font-bold ${overdue?'text-red-400':'text-text3'}`}>
                    📅 {due.toLocaleDateString('he-IL')} {overdue && '— באיחור!'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══ UNIT MANAGE ══
export function UnitManagePage() {
  const { currentUnit, showToast } = useStore()
  const [units, setUnits] = useState([])
  const [pinModal, setPinModal] = useState(null)
  const [pinVal, setPinVal] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('units').select('*').eq('is_admin', false).order('name')
    setUnits(data || [])
  }
  async function uploadLogo(unitId, file) {
    const ext = file.name.split('.').pop()
    const path = `logos/${unitId}.${ext}`
    await supabase.storage.from('unit-logos').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('unit-logos').getPublicUrl(path)
    await supabase.from('units').update({ logo_url: data.publicUrl }).eq('id', unitId)
    showToast('לוגו עודכן ✅','green'); load()
  }
  async function savePin() {
    if (pinVal && !/^\d{4}$/.test(pinVal)) { alert('קוד חייב להיות 4 ספרות'); return }
    await supabase.from('units').update({ pin: pinVal || null }).eq('id', pinModal)
    showToast('קוד עודכן ✅','green'); setPinModal(null); setPinVal(''); load()
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚙ ניהול יחידות — לוגואים וקודים</h2>
      </div>
      <div className="card">
        <div className="panel-head"><span className="panel-title">🖼 ניהול יחידות</span></div>
        <div className="divide-y divide-border1/50">
          {units.map(u => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-bg4 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden border border-border2">
                {u.logo_url ? <img src={u.logo_url} className="w-full h-full object-cover" /> : u.icon}
              </div>
              <div className="flex-1">
                <div className="font-black">{u.name}</div>
                <div className="text-text3 text-xs">{u.brigade} · קוד: {u.pin||'ללא קוד'}</div>
              </div>
              <div className="flex gap-2">
                <label className="btn btn-blue btn-sm cursor-pointer">
                  🖼 לוגו
                  <input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files[0]&&uploadLogo(u.id,e.target.files[0])} />
                </label>
                <button className="btn btn-sm" onClick={()=>{ setPinModal(u.id); setPinVal(u.pin||'') }}>🔒 קוד</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal open={!!pinModal} onClose={()=>setPinModal(null)} title="🔒 הגדרת קוד כניסה">
        <div><label className="text-xs text-text3 font-bold block mb-1">קוד 4 ספרות (ריק = ללא קוד)</label>
          <input type="password" maxLength={4} className="form-input" value={pinVal} onChange={e=>setPinVal(e.target.value)} /></div>
        <ModalButtons onClose={()=>setPinModal(null)} onSave={savePin} saveLabel="שמור" saveClass="btn-red" />
      </Modal>
    </div>
  )
}

export default CleaningPage
