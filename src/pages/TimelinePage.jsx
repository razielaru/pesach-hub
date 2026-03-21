import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import { readPageCache, writePageCache } from '../lib/pageCache'

export default function TimelinePage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [milestones, setMilestones] = useState([])
  const [statuses, setStatuses] = useState({})
  const [view, setView] = useState('calendar')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', due_date:'', category:'כללי' })
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2))

  const CATEGORIES_COLOR = {
    ניקיון:'bg-blue-500', כשרות:'bg-yellow-500', לוגיסטיקה:'bg-purple-500',
    הכשרה:'bg-green-500', סדר:'bg-orange-500', כללי:'bg-gray-500'
  }
  const CATEGORIES = Object.keys(CATEGORIES_COLOR)

  useEffect(() => {
    if (!currentUnit) return
    const cached = readPageCache(`timeline:${currentUnit.id}`)
    if (cached) {
      setMilestones(cached.milestones || [])
      setStatuses(cached.statuses || {})
    }
    load()
  }, [currentUnit])

  async function load() {
    const [ms, st] = await Promise.all([
      supabase.from('milestones').select('*').order('due_date'),
      supabase.from('milestone_status').select('*').eq('unit_id', currentUnit.id),
    ])
    setMilestones(ms.data || [])
    const map = {}
    ;(st.data || []).forEach(status => { map[status.milestone_id] = status })
    setStatuses(map)
    writePageCache(`timeline:${currentUnit.id}`, { milestones: ms.data || [], statuses: map })
  }

  async function addMilestone() {
    if (!form.title || !form.due_date) return
    await supabase.from('milestones').insert({
      title: form.title,
      description: form.description,
      due_date: form.due_date,
      category: form.category,
      sort_order: 99,
    })
    showToast('אבן דרך נוספה ✅', 'green')
    setModal(false)
    setForm({ title:'', description:'', due_date:'', category:'כללי' })
    load()
  }

  async function deleteMilestone(id, event) {
    event.stopPropagation()
    if (!confirm('למחוק אבן דרך זו לצמיתות?')) return
    await supabase.from('milestone_status').delete().eq('milestone_id', id)
    await supabase.from('milestones').delete().eq('id', id)
    showToast('אבן דרך נמחקה', 'red')
    load()
  }

  async function cycleMs(milestone) {
    const cur = statuses[milestone.id]?.status || 'pending'
    const next = { pending:'in_progress', in_progress:'done', done:'pending' }[cur]
    await supabase.from('milestone_status').upsert({
      milestone_id: milestone.id,
      unit_id: currentUnit.id,
      status: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'milestone_id,unit_id' })
    setStatuses(prev => ({ ...prev, [milestone.id]: { ...prev[milestone.id], status: next } }))
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= totalDays; day += 1) cells.push(day)

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  const dayNames = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

  function getMsForDay(day) {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return milestones.filter(milestone => milestone.due_date === dateStr)
  }

  const stDot = { pending:'bg-border2', in_progress:'bg-orange-500', done:'bg-green-500' }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-black">📅 טיימליין — יומן מבצעי</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden">
            <button onClick={() => setView('calendar')} className={`px-4 py-2 text-xs font-bold transition-all ${view==='calendar'?'bg-gold text-black':'text-text2 hover:text-text1'}`}>📅 יומן</button>
            <button onClick={() => setView('list')} className={`px-4 py-2 text-xs font-bold transition-all ${view==='list'?'bg-gold text-black':'text-text2 hover:text-text1'}`}>📋 רשימה</button>
          </div>
          {(isAdmin || isSenior) && (
            <button className="btn btn-sm" onClick={() => setModal(true)}>+ הוסף אבן דרך</button>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(new Date(year, month - 1))}>→</button>
            <span className="panel-title text-base">{monthNames[month]} {year}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(new Date(year, month + 1))}>←</button>
          </div>

          <div className="grid grid-cols-7 border-b border-border1">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-bold text-text3 py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, index) => {
              const dayMs = getMsForDay(day)
              const today = new Date()
              const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
              return (
                <div key={index} className={`min-h-[80px] p-1.5 border-b border-l border-border1/50 relative ${!day ? 'bg-bg0/50' : 'hover:bg-bg3/50'} ${index % 7 === 0 ? 'border-l-0' : ''}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-bold inline-flex w-6 h-6 items-center justify-center rounded-full ${isToday ? 'bg-gold text-black' : 'text-text3'}`}>{day}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayMs.map(milestone => {
                          const status = statuses[milestone.id]?.status || 'pending'
                          const color = CATEGORIES_COLOR[milestone.category] || 'bg-gray-500'
                          return (
                            <div
                              key={milestone.id}
                              onClick={() => cycleMs(milestone)}
                              title={milestone.title}
                              className={`text-[9px] font-bold px-1 py-0.5 rounded cursor-pointer text-white truncate flex items-center gap-1 ${color} ${status==='done'?'opacity-50 line-through':''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stDot[status]}`}/>
                              {milestone.title}
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

          <div className="p-3 flex flex-wrap gap-2 border-t border-border1">
            {CATEGORIES.map(category => (
              <span key={category} className="flex items-center gap-1 text-xs text-text3">
                <span className={`w-2.5 h-2.5 rounded ${CATEGORIES_COLOR[category]}`}/>
                {category}
              </span>
            ))}
            <span className="flex items-center gap-1 text-xs text-text3 mr-3"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"/> בתהליך</span>
            <span className="flex items-center gap-1 text-xs text-text3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/> הושלם</span>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-border2" />
          <div className="space-y-4">
            {milestones.map(milestone => {
              const status = statuses[milestone.id]?.status || 'pending'
              const due = new Date(milestone.due_date)
              const overdue = due < new Date() && status !== 'done'
              const color = CATEGORIES_COLOR[milestone.category] || 'bg-gray-500'
              return (
                <div key={milestone.id} className="flex gap-4 items-start">
                  <div
                    onClick={() => cycleMs(milestone)}
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 cursor-pointer transition-all hover:scale-110 ${status==='done'?'bg-green-900/30 border-green-500':status==='in_progress'?'bg-orange-900/30 border-orange-500':'bg-bg3 border-border2'}`}
                  >
                    <span className="text-lg">{status==='done'?'✓':status==='in_progress'?'◉':'○'}</span>
                  </div>
                  <div
                    onClick={() => cycleMs(milestone)}
                    className={`card flex-1 p-4 border-2 cursor-pointer hover:-translate-y-0.5 transition-all ${status==='done'?'border-green-500/30 opacity-70':status==='in_progress'?'border-orange-500/50':'border-border1'}`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${color}`}>{milestone.category}</span>
                        <span className="font-black">{milestone.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${status==='done'?'badge-green':status==='in_progress'?'badge-orange':'badge-dim'}`}>
                          {status==='done'?'✓ הושלם':status==='in_progress'?'בתהליך':'ממתין'}
                        </span>
                        {(isAdmin || isSenior) && (
                          <button onClick={event => deleteMilestone(milestone.id, event)} className="text-red-400/50 hover:text-red-400 transition-colors text-sm" title="מחק אבן דרך">🗑</button>
                        )}
                      </div>
                    </div>
                    {milestone.description && <p className="text-text3 text-xs mb-1">{milestone.description}</p>}
                    <div className={`text-xs font-bold ${overdue ? 'text-red-400' : 'text-text3'}`}>
                      📅 {due.toLocaleDateString('he-IL')} {overdue && '— באיחור!'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="➕ הוספת אבן דרך">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור (אופציונלי)</label>
            <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(category => <option key={category}>{category}</option>)}
              </select>
            </div>
          </div>
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={addMilestone} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}
