import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

export default function CleaningPage() {
  const { currentUnit, showToast } = useStore()
  const [areas, setAreas]   = useState([])  // cleaning_areas
  const [posts, setPosts]   = useState([])  // unit_posts
  
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', post_id: '' })

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]

    const [areasRes, postsRes] = await Promise.all([
      ids.length === 1
        ? supabase.from('cleaning_areas').select('*').eq('unit_id', ids[0]).order('name')
        : supabase.from('cleaning_areas').select('*').in('unit_id', ids).order('name'),
      ids.length === 1
        ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0]).order('name')
        : supabase.from('unit_posts').select('*').in('unit_id', ids).order('name'),
    ])
    setAreas(areasRes.data || [])
    setPosts(postsRes.data || [])
  }

  async function saveArea() {
    if (!form.name || !form.post_id) { showToast('חובה להזין שם ולבחור מקום', 'orange'); return }
    const targetPost = posts.find(p => p.id === form.post_id)
    
    await supabase.from('cleaning_areas').insert({
      unit_id: targetPost.unit_id,
      post_id: form.post_id,
      name: form.name,
      status: 'dirty'
    })
    showToast('יעד ניקיון נוסף ✅', 'green')
    setModal(false)
    setForm({ name: '', post_id: '' })
    load()
  }

  async function updateStatus(id, status) {
    await supabase.from('cleaning_areas').update({ status }).eq('id', id)
    load()
  }

  async function removeArea(id) {
    if (!confirm('למחוק יעד ניקיון זה?')) return
    await supabase.from('cleaning_areas').delete().eq('id', id)
    load()
  }

  const cleanCount = areas.filter(a => a.status === 'clean').length
  const total = areas.length
  const pct = total ? Math.round((cleanCount / total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black">🧹 ניקיון לפי מקומות</h2>
          <p className="text-sm text-text3">הוסף יעדי ניקיון ספציפיים (מטבחון, מקרר) תחת המקומות שהגדרת.</p>
        </div>
        <button className="btn" onClick={() => setModal(true)}>+ הוסף יעד לניקיון</button>
      </div>

      <div className="card p-5 flex items-center gap-6">
        <div className={`text-5xl font-black ${pct === 100 ? 'text-green-400' : pct > 50 ? 'text-orange-400' : 'text-red-400'}`}>
          {pct}%
        </div>
        <div className="flex-1">
          <div className="font-bold mb-2">{cleanCount} מתוך {total} יעדים נקיים לחלוטין</div>
          <div className="pbar h-3">
            <div className="pbar-fill bg-green-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 && <p className="text-center text-text3 py-10">אין מקומות מוגדרים. הגדר אותם קודם בטאב "הכשרות".</p>}
        {posts.map(post => {
          const postAreas = areas.filter(a => a.post_id === post.id)
          if (postAreas.length === 0) return null

          return (
            <div key={post.id} className="card overflow-hidden border border-border1">
              <div className="bg-bg3 px-4 py-2 border-b border-border1 font-bold">📍 {post.name} ({post.type})</div>
              <div className="divide-y divide-border1/50">
                {postAreas.map(area => (
                  <div key={area.id} className="flex justify-between items-center px-4 py-3 hover:bg-bg2/50">
                    <span className="font-bold">{area.name}</span>
                    <div className="flex gap-2 items-center">
                      <select className={`form-input text-xs font-bold py-1 ${area.status === 'clean' ? 'bg-green-900/30 text-green-400 border-green-500/50' : 'bg-red-900/30 text-red-400 border-red-500/50'}`}
                        value={area.status} onChange={e => updateStatus(area.id, e.target.value)}>
                        <option value="dirty" className="text-black">❌ מלוכלך</option>
                        <option value="clean" className="text-black">✨ נקי לפסח</option>
                      </select>
                      <button onClick={() => removeArea(area.id)} className="text-red-400 hover:text-red-300">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="➕ הוספת יעד ניקיון ספציפי">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">באיזה מקום מדובר?</label>
            <select className="form-input" value={form.post_id} onChange={e => setForm(f => ({...f, post_id: e.target.value}))}>
              <option value="">-- בחר מקום אב --</option>
              {posts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">שם יעד הניקיון (מקרר, כיורים, מטבחון חלבי)</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={saveArea} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}
