import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'
import { readPageCache, writePageCache } from '../lib/pageCache'

export default function TasksPage() {
  const { currentUnit, showToast } = useStore()
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', priority:'normal', due_date:'' })

  useEffect(() => {
    if (!currentUnit) return
    const cached = readPageCache(`tasks:${currentUnit.id}`)
    if (cached) setTasks(cached)
    load()
  }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('tasks').select('*').eq('unit_id', ids[0])
      : supabase.from('tasks').select('*').in('unit_id', ids)
    const { data } = await query.order('created_at', { ascending: false })
    setTasks(data || [])
    writePageCache(`tasks:${currentUnit.id}`, data || [])
  }

  async function save() {
    if (!form.title) return
    await supabase.from('tasks').insert({ unit_id: currentUnit.id, ...form, status:'todo' })
    showToast('משימה נוספה ✅', 'green')
    setModal(false)
    setForm({ title:'', description:'', priority:'normal', due_date:'' })
    load()
  }

  async function cycleStatus(task) {
    const next = { todo:'doing', doing:'done', done:'todo' }[task.status]
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    setTasks(prev => prev.map(item => item.id === task.id ? { ...item, status: next } : item))
  }

  async function del(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }

  const pCls = { urgent:'badge-red', high:'badge-orange', normal:'badge-blue' }
  const pLbl = { urgent:'דחוף', high:'גבוה', normal:'בינוני' }
  const sCls = { todo:'badge-dim', doing:'badge-orange', done:'badge-green' }
  const sLbl = { todo:'לביצוע', doing:'בתהליך', done:'הושלם' }
  const shown = filter === 'all' ? tasks : tasks.filter(task => task.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">✅ ניהול משימות</h2>
        <button className="btn" onClick={() => setModal(true)}>+ משימה</button>
      </div>
      <div className="flex gap-2">
        {[['all','הכל'],['todo','לביצוע'],['doing','בתהליך'],['done','הושלם']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`ftab ${filter===key?'active':''}`}>{label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map(task => (
          <div key={task.id} className="card p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{task.title}</span>
                <span className={`badge ${pCls[task.priority]}`}>{pLbl[task.priority]}</span>
                {task.assigned_by && <span className="badge badge-purple">📤 מ{task.assigned_by}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${sCls[task.status]}`}>{sLbl[task.status]}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => cycleStatus(task)}>→ הבא</button>
                <button className="btn btn-red btn-sm" onClick={() => del(task.id)}>🗑</button>
              </div>
            </div>
            {(task.description || task.due_date) && (
              <div className="text-text3 text-xs mt-1">
                {task.description}{task.description && task.due_date ? ' · ' : ''}{task.due_date && `📅 ${new Date(task.due_date).toLocaleDateString('he-IL')}`}
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <div className="card p-10 text-center text-text3">אין משימות</div>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="✅ משימה חדשה">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור</label>
            <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">עדיפות</label>
              <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="urgent">דחוף</option>
                <option value="high">גבוה</option>
                <option value="normal">בינוני</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">תאריך יעד</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}
