import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits, UNITS } from '../lib/units'
import KpiCard from '../components/ui/KpiCard'
import Modal, { ModalButtons } from '../components/ui/Modal'

const TR_STATUS = [
  { val: 'none', label: 'טרם הוזן', cls: 'badge-dim', icon: '❓' },
  { val: 'active', label: 'בהכשרה', cls: 'badge-orange', icon: '🔄' },
  { val: 'done', label: 'הוכשר פוקוס', cls: 'badge-green', icon: '🎓' }
]

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postModal, setPostModal] = useState(false)
  const [postForm, setPostForm] = useState({ name: '', required: 1, unitId: '' })

  const leafUnits = getLeafUnits(currentUnit.id)
  const canManageMultiple = leafUnits.length > 0

  useEffect(() => {
    if (!currentUnit) return
    load()
    const ch = supabase.channel('training_rt_' + currentUnit.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_posts' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    setLoading(true)
    const ids = leafUnits.length > 0 ? leafUnits.map(u => u.id) : [currentUnit.id]
    
    try {
      const [pplRes, postsRes] = await Promise.all([
        ids.length === 1
          ? supabase.from('personnel').select('*').eq('unit_id', ids[0]).order('name')
          : supabase.from('personnel').select('*').in('unit_id', ids).order('name'),
        ids.length === 1
          ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0]).order('name')
          : supabase.from('unit_posts').select('*').in('unit_id', ids).order('name')
      ])
      
      setPeople(pplRes.data || [])
      setPosts(postsRes.data || [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function setStatus(id, newStatus) {
    await supabase.from('personnel').update({ training_status: newStatus }).eq('id', id)
    load()
  }

  async function setPost(personId, postId) {
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
    load()
  }

  // ─── הוספת ומחיקת עמדות (מקומות) ───────────────────────────
  async function savePost() {
    if (!postForm.name) return
    const targetUnit = postForm.unitId || currentUnit.id
    const { error } = await supabase.from('unit_posts').insert({
      unit_id: targetUnit, 
      name: postForm.name, 
      required: postForm.required || 1
    })
    
    if (error) {
      showToast('שגיאה ביצירת המקום', 'red')
    } else {
      showToast(`מקום "${postForm.name}" נוסף בהצלחה ✅`, 'green')
      setPostForm({ name: '', required: 1, unitId: '' })
      load()
    }
  }

  async function deletePost(id) {
    if (!confirm('למחוק מקום/עמדה זו?')) return
    await supabase.from('unit_posts').delete().eq('id', id)
    showToast('הוסר', 'orange')
    load()
  }
  // ─────────────────────────────────────────────────────────────

  function unitLabel(uid) {
    return UNITS.find(u => u.id === uid)?.name || ''
  }

  const counts = { none: 0, active: 0, done: 0 }
  people.forEach(p => { if (counts[p.training_status] !== undefined) counts[p.training_status]++ })
  const total = people.length
  const pct = total ? Math.round((counts.done / total) * 100) : 0

  if (loading) return <div className="text-center text-text3 p-10">טוען נתונים...</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">🎓 הכשרות פוקוס ושיבוץ למקומות</h2>
          <p className="text-text3 text-sm">נהל את ההכשרות ושייך אנשים למקומות (עמדות/מטבחים)</p>
        </div>
        <button onClick={() => setPostModal(true)} className="btn btn-blue bg-blue-900/40 border-blue-500/50 text-blue-300">
          ⚙ ניהול מקומות
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="הוכשרו" value={counts.done} sub={`מתוך ${total}`} color="green" />
        <KpiCard label="בהכשרה" value={counts.active} color="orange" />
        <KpiCard label="טרם הוזן" value={counts.none} color="gray" />
        <KpiCard label="מוכנות הכשרות" value={`${pct}%`} color={pct >= 70 ? 'green' : pct >= 40 ? 'orange' : 'red'} />
      </div>

      {total > 0 && (
        <div className="card p-4 border border-border1">
          <div className="flex justify-between text-xs text-text3 mb-2">
            <span>התקדמות הכשרות כללית</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-bg3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* ─── טבלת כוח אדם ושיבוץ למקומות ─── */}
      <div className="card overflow-hidden border border-border1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg3 border-b border-border1">
              <tr>
                <th className="text-right p-3 font-bold">שם</th>
                <th className="text-right p-3 font-bold">שיבוץ למקום</th>
                <th className="text-right p-3 font-bold">סטטוס הכשרה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border1/50">
              {people.map(p => (
                <tr key={p.id} className={`hover:bg-bg3/50 transition-colors ${p.status === 'unavailable' ? 'opacity-40' : ''}`}>
                  <td className="p-3">
                    <div className="font-bold">{p.name} {p.status === 'unavailable' && '(לא זמין)'}</div>
                    <div className="text-text3 text-xs">
                      {p.role} {canManageMultiple && p.unit_id !== currentUnit.id && ` · ${unitLabel(p.unit_id)}`}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <select 
                      className="form-input text-xs w-full max-w-[150px] bg-bg2 border-border2"
                      value={p.post_id || ''} 
                      onChange={e => setPost(p.id, e.target.value)}
                      disabled={p.status === 'unavailable'}
                    >
                      <option value="">-- ללא מקום --</option>
                      {posts.filter(post => !canManageMultiple || post.unit_id === p.unit_id).map(post => (
                        <option key={post.id} value={post.id}>{post.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {TR_STATUS.map(s => (
                        <button
                          key={s.val}
                          disabled={p.status === 'unavailable'}
                          onClick={() => setStatus(p.id, s.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                            ${p.training_status === s.val 
                              ? `${s.cls} border-transparent shadow-sm` 
                              : 'bg-bg2 border-border2 text-text3 hover:border-gold/30 hover:text-text2'}`}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr><td colSpan="3" className="p-8 text-center text-text3">אין כוח אדם להכשרה. הוסף אנשים דרך מסך "כוח אדם".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── חלון ניהול מקומות ועמדות ─── */}
      <Modal open={postModal} onClose={() => setPostModal(false)} title="⚙ ניהול מקומות (עמדות)">
        <div className="space-y-4">
          <p className="text-text3 text-sm mb-4">המקומות שתגדיר כאן יופיעו ברשימת השיבוץ עבור החיילים.</p>
          
          <div className="border border-border1 rounded-xl p-4 bg-bg3/50 space-y-3 mb-4">
            <p className="text-xs text-gold font-bold">➕ הוסף מקום חדש</p>
            <div className="flex gap-2 flex-wrap">
              <input className="form-input flex-1" placeholder="שם (מטבח א', מחסן חמץ...)" value={postForm.name} onChange={e => setPostForm(f => ({...f, name: e.target.value}))} />
              <input type="number" min="1" max="20" className="form-input w-24" placeholder="תקן נדרש" value={postForm.required} onChange={e => setPostForm(f => ({...f, required: parseInt(e.target.value) || 1}))} title="כמה חיילים צריכים להיות במקום הזה" />
            </div>
            {canManageMultiple && (
              <select className="form-input w-full" value={postForm.unitId} onChange={e => setPostForm(f => ({...f, unitId: e.target.value}))}>
                <option value="">-- בחר לאיזו יחידה שייך המקום --</option>
                {leafUnits.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
              </select>
            )}
            <button className="btn btn-blue w-full" onClick={savePost}>הוסף מקום למאגר</button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-xs text-text3 font-bold mb-2">מקומות קיימים:</p>
            {posts.length === 0 && <div className="text-text3 text-sm text-center py-4">אין מקומות מוגדרים</div>}
            {posts.map(post => {
              const assignedCount = people.filter(p => p.post_id === post.id && p.status !== 'unavailable').length
              return (
                <div key={post.id} className="flex items-center justify-between p-3 bg-bg2 border border-border1 rounded-xl">
                  <div>
                    <div className="font-bold text-sm">{post.name}</div>
                    <div className="text-xs text-text3 flex gap-2 mt-0.5">
                      <span>תקן: {post.required}</span>
                      <span>·</span>
                      <span className={assignedCount < post.required ? 'text-orange-400' : 'text-green-400'}>משובצים: {assignedCount}</span>
                      {canManageMultiple && <><span>·</span><span>{unitLabel(post.unit_id)}</span></>}
                    </div>
                  </div>
                  <button onClick={() => deletePost(post.id)} className="text-red-400/50 hover:text-red-400 text-lg transition-colors" title="מחק מקום">🗑</button>
                </div>
              )
            })}
          </div>
        </div>
        <ModalButtons onClose={() => setPostModal(false)} onSave={() => setPostModal(false)} saveLabel="סיום" />
      </Modal>

    </div>
  )
}
