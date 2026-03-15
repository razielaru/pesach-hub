import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits, UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

const POST_TYPES = ['מפח״ט', 'מפג״ד', 'פלוגה', 'פילבוקס/הגנ״ש', 'ויקווק', 'מטבח', 'מטבחון', 'מחסן חמץ', 'כללי']

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [posts,  setPosts]  = useState([])
  const [expanded, setExpanded] = useState({}) // לכיווץ ופתיחת רשימות
  
  const [postModal, setPostModal] = useState(false)
  const [postForm, setPostForm] = useState({ name: '', type: 'מפח״ט', parent_id: '', unitId: '' })

  const leafUnits = getLeafUnits(currentUnit.id)
  const canManageMultiple = leafUnits.length > 0

  useEffect(() => { 
    if (currentUnit) load() 
    const ch = supabase.channel('tr_rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'personnel' }, () => load())
      .on('postgres_changes', { event:'*', schema:'public', table:'unit_posts' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    try {
      const ids = leafUnits.length > 0 ? leafUnits.map(u=>u.id) : [currentUnit.id]
      const [persRes, postsRes] = await Promise.all([
        ids.length===1
          ? supabase.from('personnel').select('*').eq('unit_id',ids[0])
          : supabase.from('personnel').select('*').in('unit_id',ids),
        ids.length===1
          ? supabase.from('unit_posts').select('*').eq('unit_id',ids[0]).order('name')
          : supabase.from('unit_posts').select('*').in('unit_id',ids).order('name'),
      ])
      setPeople(persRes.data||[])
      setPosts(postsRes.data||[])
    } catch { setPeople([]); setPosts([]) }
  }

  // ── עדכון סטטוס הכשרה של *מקום* (ולא אדם) ──
  async function setKasheringStatus(postId, status) {
    const { error } = await supabase.from('unit_posts').update({ status }).eq('id', postId)
    if (error) showToast('שגיאה בעדכון', 'red')
    else {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
      showToast(status==='done'?'המקום הוכשר! 🍽️':status==='active'?'החל תהליך הכשרה...':'אופס', 'green')
    }
  }

  // ── שיוך אדם למקום ──
  async function setPostAssign(personId, postId) {
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
    load()
  }

  // ── ניהול מקומות ──
  async function savePost() {
    if (!postForm.name) return
    const targetUnit = postForm.unitId || currentUnit.id
    await supabase.from('unit_posts').insert({
      unit_id: targetUnit, 
      name: postForm.name, 
      type: postForm.type,
      parent_id: postForm.parent_id || null,
      status: 'none'
    })
    showToast(`מקום "${postForm.name}" נוסף ✅`, 'green')
    setPostForm({ name: '', type: 'מפח״ט', parent_id: '', unitId: '' })
    load()
  }

  async function deletePost(id) {
    if (!confirm('למחוק מקום זה? כל המקומות שתחתיו יימחקו גם כן!')) return
    await supabase.from('unit_posts').delete().eq('id', id)
    load()
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const rootPosts = posts.filter(p => !p.parent_id)
  const total = posts.length
  const done = posts.filter(p => p.status === 'done').length
  const pct = total ? Math.round(done/total*100) : 0

  function KasheringButtons({ post }) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 bg-bg2 rounded-lg p-1 border border-border2">
        <button onClick={() => setKasheringStatus(post.id, 'none')}   className={`text-xs px-2 py-1 rounded transition-all ${post.status==='none'||!post.status ? 'bg-gray-600 text-white font-bold' : 'text-text3 hover:bg-bg3'}`}>טרם</button>
        <button onClick={() => setKasheringStatus(post.id, 'active')} className={`text-xs px-2 py-1 rounded transition-all ${post.status==='active' ? 'bg-orange-500 text-white font-bold' : 'text-text3 hover:bg-bg3'}`}>בהכשרה</button>
        <button onClick={() => setKasheringStatus(post.id, 'done')}   className={`text-xs px-2 py-1 rounded transition-all ${post.status==='done' ? 'bg-green-500 text-white font-bold' : 'text-text3 hover:bg-bg3'}`}>הוכשר</button>
      </div>
    )
  }

  // פונקציה שמציירת שורת מקום (אבא או בן)
  function renderPost(post, isChild = false) {
    const children = posts.filter(p => p.parent_id === post.id)
    const isExpanded = expanded[post.id] !== false // ברירת מחדל: פתוח
    const assignedPeople = people.filter(p => p.post_id === post.id)

    return (
      <div key={post.id} className={`card border ${isChild ? 'border-l-4 border-l-gold/50 bg-bg1/50 my-2 mr-6' : 'border-border1 mb-4'} overflow-hidden`}>
        {/* כותרת המקום */}
        <div className="bg-bg3 px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            {children.length > 0 && (
              <button onClick={() => toggleExpand(post.id)} className="w-6 h-6 flex items-center justify-center bg-bg2 rounded text-text2 hover:text-gold transition-colors">
                {isExpanded ? '▼' : '◀'}
              </button>
            )}
            <span className="font-black text-lg">{post.name}</span>
            <span className="badge badge-dim text-xs">{post.type}</span>
          </div>
          <KasheringButtons post={post} />
        </div>

        {/* תוכן המקום (אם פתוח או אין ילדים) */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* אנשים שמשובצים למקום הזה */}
            <div className="bg-bg2/50 rounded-xl p-3 border border-border1 border-dashed">
              <div className="text-xs text-text3 font-bold mb-2 flex justify-between">
                <span>צוות הכשרה משובץ:</span>
                <select className="bg-transparent border-none text-gold outline-none text-xs cursor-pointer" onChange={e => setPostAssign(e.target.value, post.id)} value="">
                  <option value="" disabled>+ צרף איש צוות...</option>
                  {people.filter(p => p.post_id !== post.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedPeople.length === 0 && <span className="text-xs text-text3">לא שובץ צוות.</span>}
                {assignedPeople.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-bg3 border border-border2 px-2 py-1 rounded text-xs">
                    <span>{p.name}</span>
                    <button onClick={() => setPostAssign(p.id, null)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* תתי-מקומות */}
            {children.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-text3 font-bold mb-2">תתי-מקומות:</div>
                {children.map(child => renderPost(child, true))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">🎓 הכשרת מקומות ושיבוץ צוותים</h2>
          <p className="text-text3 text-sm">הגדר מקומות (מפח"ט, פלוגה, מטבח), עדכן את הסטטוס שלהם ושבץ חיילים.</p>
        </div>
        <button onClick={() => setPostModal(true)} className="btn btn-blue bg-blue-900/40 border-blue-500/50 text-blue-300">
          ⚙ ניהול מקומות
        </button>
      </div>

      <div className="card p-5 flex items-center gap-6">
        <div className={`text-5xl font-black ${pct===100?'text-green-400':pct>50?'text-orange-400':'text-red-400'}`}>
          {pct}%
        </div>
        <div className="flex-1">
          <div className="font-bold mb-2">{done} מתוך {total} מקומות הוכשרו</div>
          <div className="pbar h-3">
            <div className="pbar-fill bg-green-500 transition-all duration-1000" style={{width:`${pct}%`}}/>
          </div>
        </div>
      </div>

      {/* ── רינדור ההיררכיה ── */}
      <div className="space-y-4">
        {rootPosts.length === 0 && <div className="text-center text-text3 py-10">אין מקומות מוגדרים. לחץ על "ניהול מקומות".</div>}
        {rootPosts.map(post => renderPost(post))}
      </div>

      {/* חלון ניהול מקומות */}
      <Modal open={postModal} onClose={() => setPostModal(false)} title="⚙ ניהול היררכיית מקומות">
        <div className="space-y-4">
          <div className="border border-border1 rounded-xl p-4 bg-bg3/50 space-y-3">
            <p className="text-xs text-gold font-bold">➕ הוסף מקום חדש</p>
            <div className="grid grid-cols-2 gap-3">
              <input className="form-input col-span-2" placeholder="שם המקום (לדוג: עפרה, 408, מטבח חלבי)" value={postForm.name} onChange={e => setPostForm(f => ({...f, name: e.target.value}))} />
              
              <div>
                <label className="text-[10px] text-text3 mb-1 block">סוג המקום</label>
                <select className="form-input" value={postForm.type} onChange={e => setPostForm(f => ({...f, type: e.target.value}))}>
                  {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-text3 mb-1 block">שייך תחת (אופציונלי)</label>
                <select className="form-input" value={postForm.parent_id} onChange={e => setPostForm(f => ({...f, parent_id: e.target.value}))}>
                  <option value="">-- מקום ראשי (עצמאי) --</option>
                  {posts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                </select>
              </div>
            </div>

            {canManageMultiple && (
              <select className="form-input w-full" value={postForm.unitId} onChange={e => setPostForm(f => ({...f, unitId: e.target.value}))}>
                <option value="">-- בחר יחידה ארגונית --</option>
                {leafUnits.map(u => <option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
              </select>
            )}
            <button className="btn btn-blue w-full mt-2" onClick={savePost}>הוסף מקום למאגר</button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-xs text-text3 font-bold mb-2">רשימת המקומות למחיקה מהירה:</p>
            {posts.map(post => (
              <div key={post.id} className="flex justify-between items-center bg-bg2 p-2 rounded text-sm">
                <span>{post.name} <span className="text-text3 text-xs">({post.type})</span></span>
                <button onClick={() => deletePost(post.id)} className="text-red-400">🗑</button>
              </div>
            ))}
          </div>
        </div>
        <ModalButtons onClose={() => setPostModal(false)} onSave={() => setPostModal(false)} saveLabel="סגור" />
      </Modal>

    </div>
  )
}
