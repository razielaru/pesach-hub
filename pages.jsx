import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

// ══ CLEANING ══
export function CleaningPage() {
  const { currentUnit, showToast } = useStore()
  const [areas, setAreas]   = useState([])  // cleaning_areas
  const [posts, setPosts]   = useState([])  // unit_posts — המקור האחד
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]

    const [areasRes, postsRes] = await Promise.all([
      ids.length === 1
        ? supabase.from('cleaning_areas').select('*').eq('unit_id', ids[0]).order('name')
        : supabase.from('cleaning_areas').select('*').in('unit_id', ids).order('name'),
      supabase.from('unit_posts').select('*').eq('unit_id', currentUnit.id).order('name'),
    ])
    setAreas(areasRes.data || [])
    setPosts(postsRes.data || [])
  }

  async function syncFromPosts() {
    setSyncing(true)
    const existingNames = areas.map(a => a.name)
    const toAdd = posts.filter(p => !existingNames.includes(p.name))
    for (const p of toAdd) {
      await supabase.from('cleaning_areas').insert({ unit_id: currentUnit.id, name: p.name, status: 'dirty' })
    }
    showToast(`${toAdd.length} אזורים נוספו מהמקומות ✅`, 'green')
    setSyncing(false)
    load()
  }

  async function cycle(a) {
    const next = { dirty:'partial', partial:'clean', clean:'dirty' }[a.status]
    await supabase.from('cleaning_areas').update({ status: next, updated_at: new Date().toISOString() }).eq('id', a.id)
    setAreas(prev => prev.map(x => x.id===a.id ? {...x, status: next} : x))
  }

  async function addArea(name) {
    if (!name) return
    await supabase.from('cleaning_areas').insert({ unit_id: currentUnit.id, name, status: 'dirty' })
    load()
  }

  async function deleteArea(id) {
    await supabase.from('cleaning_areas').delete().eq('id', id)
    load()
  }

  const clean = areas.filter(a=>a.status==='clean').length
  const pct = areas.length ? Math.round(clean/areas.length*100) : 0
  const icons  = { clean:'✅', partial:'🔄', dirty:'🧹' }
  const labels = { clean:'נקי', partial:'בתהליך', dirty:'לא נוקה' }
  const cls    = { clean:'border-green-500/50 bg-green-900/10', partial:'border-orange-500/50 bg-orange-900/10', dirty:'border-border1' }

  const [addName, setAddName] = useState('')
  const [addModal, setAddModal] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-black">🧹 יום הניקיונות</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-3xl font-black ${pct>=80?'text-green-400':pct>=50?'text-orange-400':'text-red-400'}`}>{pct}%</span>
          {posts.length > 0 && (
            <button onClick={syncFromPosts} disabled={syncing}
              className="btn btn-sm" style={{background:'rgba(139,92,246,.15)',borderColor:'rgba(139,92,246,.4)',color:'#a78bfa'}}>
              {syncing ? '⏳' : '🔄 ייבא מקומות'}
            </button>
          )}
          <button className="btn btn-sm" onClick={()=>setAddModal(true)}>+ הוסף אזור</button>
        </div>
      </div>

      {posts.length > 0 && areas.length === 0 && (
        <div className="card p-4 border border-purple-500/30 bg-purple-900/10 flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <div className="font-bold text-sm">יש לך {posts.length} מקומות מוגדרים בכוח אדם</div>
            <div className="text-text3 text-xs">לחץ "ייבא מקומות" כדי להוסיף אותם אוטומטית כאזורי ניקיון</div>
          </div>
        </div>
      )}

      <div className="w-full pbar h-3 rounded-full">
        <div className={`pbar-fill ${pct>=80?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'}`} style={{width:`${pct}%`}}/>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {areas.map(a => (
          <div key={a.id} className={`card border-2 p-4 text-center cursor-pointer hover:-translate-y-1 transition-all relative group ${cls[a.status]}`}>
            <button onClick={()=>deleteArea(a.id)}
              className="absolute top-1 left-1 text-red-400/0 group-hover:text-red-400/60 hover:text-red-400 text-xs transition-all">✕</button>
            <div onClick={()=>cycle(a)}>
              <div className="text-3xl mb-2">{icons[a.status]}</div>
              <div className="font-black text-sm mb-1">{a.name}</div>
              <span className={`badge ${a.status==='clean'?'badge-green':a.status==='partial'?'badge-orange':'badge-red'}`}>
                {labels[a.status]}
              </span>
              <div className="text-text3 text-[10px] mt-2">לחץ לשינוי</div>
            </div>
          </div>
        ))}
        {areas.length === 0 && (
          <div className="col-span-4 card p-10 text-center text-text3">
            <div className="text-4xl mb-2">🧹</div>
            <div>אין אזורי ניקיון — הוסף ידנית או ייבא מהמקומות</div>
          </div>
        )}
      </div>

      <Modal open={addModal} onClose={()=>setAddModal(false)} title="🧹 הוספת אזור ניקיון">
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">שם האזור</label>
          <input className="form-input" value={addName} onChange={e=>setAddName(e.target.value)}
            placeholder="מטבח א', שירותים, חדר אוכל..." />
          {posts.length > 0 && (
            <div className="mt-3">
              <label className="text-xs text-text3 font-bold block mb-1">או בחר ממקומות קיימים</label>
              <div className="flex flex-wrap gap-1.5">
                {posts.map(p => (
                  <button key={p.id} onClick={()=>setAddName(p.name)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${addName===p.name?'bg-gold/20 border-gold/50 text-gold':'bg-bg3 border-border1 text-text2 hover:border-border2'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <ModalButtons onClose={()=>setAddModal(false)} onSave={()=>{addArea(addName);setAddName('');setAddModal(false)}} saveLabel="הוסף" />
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
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('tasks').select('*').eq('unit_id', ids[0])
      : supabase.from('tasks').select('*').in('unit_id', ids)
    const { data } = await query.order('created_at', {ascending: false})
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

// ══ TIMELINE — Google Calendar style ══
export function TimelinePage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [milestones, setMilestones] = useState([])
  const [statuses, setStatuses] = useState({})
  const [view, setView] = useState('calendar') // 'calendar' | 'list'
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', due_date:'', category:'כללי' })
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2)) // March 2026

  const CATEGORIES_COLOR = {
    ניקיון:'bg-blue-500', כשרות:'bg-yellow-500', לוגיסטיקה:'bg-purple-500',
    הכשרה:'bg-green-500', סדר:'bg-orange-500', כללי:'bg-gray-500'
  }
  const CATEGORIES = Object.keys(CATEGORIES_COLOR)

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const [ms, st] = await Promise.all([
      supabase.from('milestones').select('*').order('due_date'),
      supabase.from('milestone_status').select('*').eq('unit_id', currentUnit.id),
    ])
    setMilestones(ms.data || [])
    const map = {}
    ;(st.data||[]).forEach(s => { map[s.milestone_id] = s })
    setStatuses(map)
  }

  async function addMilestone() {
    if (!form.title || !form.due_date) return
    await supabase.from('milestones').insert({
      title: form.title, description: form.description,
      due_date: form.due_date, category: form.category, sort_order: 99
    })
    showToast('אבן דרך נוספה ✅', 'green')
    setModal(false); setForm({ title:'', description:'', due_date:'', category:'כללי' }); load()
  }

  async function deleteMilestone(id, e) {
    e.stopPropagation()
    if (!confirm('למחוק אבן דרך זו לצמיתות?')) return
    await supabase.from('milestone_status').delete().eq('milestone_id', id)
    await supabase.from('milestones').delete().eq('id', id)
    showToast('אבן דרך נמחקה', 'red')
    load()
  }

  async function cycleMs(ms) {
    const cur = statuses[ms.id]?.status || 'pending'
    const next = { pending:'in_progress', in_progress:'done', done:'pending' }[cur]
    await supabase.from('milestone_status').upsert({
      milestone_id: ms.id, unit_id: currentUnit.id, status: next,
      updated_at: new Date().toISOString()
    }, { onConflict: 'milestone_id,unit_id' })
    setStatuses(prev => ({ ...prev, [ms.id]: { ...prev[ms.id], status: next } }))
  }

  // Calendar helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  const dayNames = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

  function getMsForDay(day) {
    if (!day) return []
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return milestones.filter(ms => ms.due_date === dateStr)
  }

  const stDot = { pending:'bg-border2', in_progress:'bg-orange-500', done:'bg-green-500' }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-black">📅 טיימליין — יומן מבצעי</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden">
            <button onClick={()=>setView('calendar')}
              className={`px-4 py-2 text-xs font-bold transition-all ${view==='calendar'?'bg-gold text-black':'text-text2 hover:text-text1'}`}>
              📅 יומן
            </button>
            <button onClick={()=>setView('list')}
              className={`px-4 py-2 text-xs font-bold transition-all ${view==='list'?'bg-gold text-black':'text-text2 hover:text-text1'}`}>
              📋 רשימה
            </button>
          </div>
          {(isAdmin||isSenior) && (
            <button className="btn btn-sm" onClick={()=>setModal(true)}>+ הוסף אבן דרך</button>
          )}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="card overflow-hidden">
          {/* Month nav */}
          <div className="panel-head">
            <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentMonth(new Date(year, month-1))}>→</button>
            <span className="panel-title text-base">{monthNames[month]} {year}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentMonth(new Date(year, month+1))}>←</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-bold text-text3 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayMs = getMsForDay(day)
              const today = new Date()
              const isToday = day && today.getDate()===day && today.getMonth()===month && today.getFullYear()===year
              return (
                <div key={i}
                  className={`min-h-[80px] p-1.5 border-b border-l border-border1/50 relative overflow-hidden
                    ${!day ? 'bg-bg0/50' : 'hover:bg-bg3/50'}
                    ${i % 7 === 0 ? 'border-l-0' : ''}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-bold inline-flex w-6 h-6 items-center justify-center rounded-full
                        ${isToday ? 'bg-gold text-black' : 'text-text3'}`}>
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayMs.map(ms => {
                          const st = statuses[ms.id]?.status || 'pending'
                          const color = CATEGORIES_COLOR[ms.category] || 'bg-gray-500'
                          return (
                            <div key={ms.id}
                              onClick={() => cycleMs(ms)}
                              title={ms.title}
                              className={`text-[9px] font-bold px-1 py-0.5 rounded cursor-pointer
                                text-white break-words whitespace-normal flex items-start gap-1
                                ${color} ${st==='done'?'opacity-50 line-through':''}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px] ${stDot[st]}`}/>
                              <span>{ms.title}</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="p-3 flex flex-wrap gap-2 border-t border-border1">
            {CATEGORIES.map(cat => (
              <span key={cat} className="flex items-center gap-1 text-xs text-text3">
                <span className={`w-2.5 h-2.5 rounded ${CATEGORIES_COLOR[cat]}`}/>
                {cat}
              </span>
            ))}
            <span className="flex items-center gap-1 text-xs text-text3 mr-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"/> בתהליך
            </span>
            <span className="flex items-center gap-1 text-xs text-text3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"/> הושלם
            </span>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-border2" />
          <div className="space-y-4">
            {milestones.map(ms => {
              const st = statuses[ms.id]?.status || 'pending'
              const due = new Date(ms.due_date)
              const overdue = due < new Date() && st !== 'done'
              const color = CATEGORIES_COLOR[ms.category] || 'bg-gray-500'
              return (
                <div key={ms.id} className="flex gap-4 items-start">
                  <div onClick={()=>cycleMs(ms)}
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                      flex-shrink-0 border-2 cursor-pointer transition-all hover:scale-110
                      ${st==='done'?'bg-green-900/30 border-green-500':st==='in_progress'?'bg-orange-900/30 border-orange-500':'bg-bg3 border-border2'}`}>
                    <span className="text-lg">{st==='done'?'✓':st==='in_progress'?'◉':'○'}</span>
                  </div>
                  <div onClick={()=>cycleMs(ms)}
                    className={`card flex-1 p-4 border-2 cursor-pointer hover:-translate-y-0.5 transition-all
                      ${st==='done'?'border-green-500/30 opacity-70':st==='in_progress'?'border-orange-500/50':'border-border1'}`}>
                    <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${color}`}>{ms.category}</span>
                        <span className="font-black">{ms.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${st==='done'?'badge-green':st==='in_progress'?'badge-orange':'badge-dim'}`}>
                          {st==='done'?'✓ הושלם':st==='in_progress'?'בתהליך':'ממתין'}
                        </span>
                        {(isAdmin||isSenior) && (
                          <button onClick={e=>deleteMilestone(ms.id,e)}
                            className="text-red-400/50 hover:text-red-400 transition-colors text-sm"
                            title="מחק אבן דרך">🗑</button>
                        )}
                      </div>
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
      )}

      {/* Add milestone modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="➕ הוספת אבן דרך">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור (אופציונלי)</label>
            <input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label>
              <input type="date" className="form-input" value={form.due_date}
                onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label>
              <select className="form-input" value={form.category}
                onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={addMilestone} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}

// ══ UNIT MANAGE ══
export function UnitManagePage() {
  const { currentUnit, showToast, isAdmin } = useStore()
  const [units, setUnits] = useState([])
  const [pinModal, setPinModal] = useState(null)
  const [pinVal, setPinVal] = useState('')
  const [bookModal, setBookModal] = useState(false)
  const [bookUrl, setBookUrl] = useState('')
  const [bookLoading, setBookLoading] = useState(false)
  const [pushSubs, setPushSubs] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('units').select('*').order('name')
    setUnits(data || [])
    const { data: subs } = await supabase.from('push_subscriptions').select('id,unit_id,created_at').order('created_at',{ascending:false})
    setPushSubs(subs || [])
    const { data: setting } = await supabase.from('qna')
      .select('answer').eq('question', '__training_book__').eq('unit_id','pikud').maybeSingle()
    if (setting?.answer) setBookUrl(setting.answer)
  }

  async function revokePush(subId) {
    if (!confirm('לנתק מכשיר זה מהתראות?')) return
    await supabase.from('push_subscriptions').delete().eq('id', subId)
    showToast('מכשיר נותק ✅', 'green')
    load()
  }

  async function revokeUnitPush(unitId) {
    if (!confirm('לנתק את כל מכשירי היחידה מהתראות?')) return
    await supabase.from('push_subscriptions').delete().eq('unit_id', unitId)
    showToast('כל מכשירי היחידה נותקו ✅', 'green')
    load()
  }

  async function uploadLogo(unitId, file) {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      const SIZE = 200
      canvas.width = SIZE; canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE)
      const compressed = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(url)
      const { error } = await supabase.from('units').update({ logo_url: compressed }).eq('id', unitId)
      if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
      showToast('לוגו עודכן ✅', 'green')
      load()
    }
    img.src = url
  }

  async function savePin() {
    if (pinVal && !/^\d{4}$/.test(pinVal)) { alert('קוד חייב להיות 4 ספרות'); return }
    await supabase.from('units').update({ pin: pinVal || null }).eq('id', pinModal)
    showToast('קוד עודכן ✅','green'); setPinModal(null); setPinVal(''); load()
  }

  async function saveBook() {
    setBookLoading(true)
    const { data: existing } = await supabase.from('qna')
      .select('id').eq('question', '__training_book__').eq('unit_id','pikud').maybeSingle()
    if (existing) {
      await supabase.from('qna').update({ answer: bookUrl }).eq('id', existing.id)
    } else {
      await supabase.from('qna').insert({
        unit_id: 'pikud', question: '__training_book__',
        answer: bookUrl, category: 'מערכת', is_faq: false
      })
    }
    showToast('קישור ספר ההכשרות עודכן ✅', 'green')
    setBookLoading(false); setBookModal(false)
  }

  const nonAdmin = units

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚙ ניהול יחידות</h2>
        <button className="btn btn-blue btn-sm" onClick={()=>setBookModal(true)}>
          📚 ספר הכשרות
        </button>
      </div>

      {bookUrl && (
        <div className="card p-4 flex items-center gap-3 bg-blue-900/10 border-blue-500/30">
          <span className="text-2xl">📚</span>
          <div className="flex-1">
            <div className="font-bold text-sm">ספר ההכשרות מוגדר</div>
            <div className="text-text3 text-xs truncate">{bookUrl}</div>
          </div>
          <a href={bookUrl} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm">פתח ←</a>
        </div>
      )}

      <div className="card">
        <div className="panel-head"><span className="panel-title">🖼 לוגואים, קודי כניסה — מופיעים בדף הכניסה</span></div>
        <div className="divide-y divide-border1/50">
          {nonAdmin.map(u => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-14 h-14 rounded-xl bg-bg4 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden border border-border2">
                {u.logo_url
                  ? <img src={u.logo_url} className="w-full h-full object-cover" alt={u.name} />
                  : <span>{u.icon}</span>}
              </div>
              <div className="flex-1">
                <div className="font-black">{u.name}</div>
                <div className="text-text3 text-xs">{u.brigade} · קוד: {u.pin||'ללא קוד'}</div>
                {u.logo_url && <div className="text-green-400 text-xs">✓ לוגו מוגדר</div>}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <label className="btn btn-sm cursor-pointer" style={{background:'rgba(59,130,246,.15)',borderColor:'rgba(59,130,246,.4)',color:'#60a5fa'}}>
                  🖼 העלה לוגו
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e=>e.target.files[0]&&uploadLogo(u.id,e.target.files[0])} />
                </label>
                {u.logo_url && (
                  <button className="btn btn-sm" style={{background:'rgba(239,68,68,.15)',borderColor:'rgba(239,68,68,.4)',color:'#f87171'}}
                    onClick={async()=>{
                      await supabase.from('units').update({logo_url:null}).eq('id',u.id)
                      showToast('לוגו הוסר','gold'); load()
                    }}>🗑 הסר</button>
                )}
                <button className="btn btn-sm" onClick={()=>{ setPinModal(u.id); setPinVal(u.pin||'') }}>🔒 קוד</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PIN Modal */}
      <Modal open={!!pinModal} onClose={()=>setPinModal(null)} title="🔒 הגדרת קוד כניסה">
        <div><label className="text-xs text-text3 font-bold block mb-1">קוד 4 ספרות (ריק = ללא קוד)</label>
          <input type="password" maxLength={4} className="form-input" value={pinVal}
            onChange={e=>setPinVal(e.target.value)} /></div>
        <ModalButtons onClose={()=>setPinModal(null)} onSave={savePin} saveLabel="שמור" saveClass="btn-red" />
      </Modal>

      {/* Book Modal */}
      <Modal open={bookModal} onClose={()=>setBookModal(false)} title="📚 ספר הכשרות — קישור">
        <div className="space-y-3">
          <p className="text-text3 text-sm">הכנס קישור לספר ההכשרות (Google Drive, PDF, וכו'). יופיע לכל המשתמשים בחמ"ל ההלכתי.</p>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">קישור לספר</label>
            <input className="form-input" placeholder="https://drive.google.com/..." value={bookUrl}
              onChange={e=>setBookUrl(e.target.value)} />
          </div>
        </div>
        <ModalButtons onClose={()=>setBookModal(false)} onSave={saveBook}
          saveLabel={bookLoading ? 'שומר...' : '💾 שמור'} />
      </Modal>
    </div>
  )
}

export default CleaningPage