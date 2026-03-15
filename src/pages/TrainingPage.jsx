import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits, UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [posts,  setPosts]  = useState([])
  const [filter, setFilter] = useState('all')

  // Modal states
  const [postModal, setPostModal] = useState(false)
  const [postForm, setPostForm] = useState({ name: '', required: 1, unitId: '' })

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

  async function setTr(id, status) {
    const updates = { training_status: status }
    if (status==='active') updates.training_start = new Date().toISOString().split('T')[0]
    if (status==='done')   updates.training_end   = new Date().toISOString().split('T')[0]
    
    setPeople(prev => prev.map(p => p.id===id ? {...p,...updates} : p))
    
    const { error } = await supabase.from('personnel').update(updates).eq('id', id)
    if (error) { showToast('שגיאה: '+error.message,'red'); load() }
    else showToast(status==='done'?'הוכשר! 🎉':status==='active'?'הכשרה החלה ▶':'איפוס', status==='done'?'green':'gold')
  }

  async function setPost(personId, postId) {
    setPeople(prev => prev.map(p => p.id===personId ? {...p, post_id: postId || null} : p))
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
  }

  async function savePost() {
    if (!postForm.name) return
    const targetUnit = postForm.unitId || currentUnit.id
    await supabase.from('unit_posts').insert({
      unit_id: targetUnit, 
      name: postForm.name, 
      required: postForm.required || 1
    })
    showToast(`מקום "${postForm.name}" נוסף ✅`, 'green')
    setPostForm({ name: '', required: 1, unitId: '' })
    load()
  }

  async function deletePost(id) {
    if (!confirm('למחוק עמדה זו? אנשים ששובצו לכאן יועברו ל"ללא מקום מוגדר".')) return
    await supabase.from('unit_posts').delete().eq('id', id)
    load()
  }

  const applyFilter = arr => filter==='all' ? arr : arr.filter(p=>p.training_status===filter)

  const total = people.length
  const done  = people.filter(p=>p.training_status==='done').length
  const pct   = total ? Math.round(done/total*100) : 0

  const peopleWithPost    = people.filter(p => p.post_id)
  const peopleWithoutPost = people.filter(p => !p.post_id)

  function TrainingButton({ p }) {
    return (
      <div className="flex items-center gap-2">
        <span className={`badge text-[10px] sm:text-xs flex-shrink-0
          ${p.training_status==='done'?'badge-green':p.training_status==='active'?'badge-orange':'badge-dim'}`}>
          {p.training_status==='done'?'✓ הוכשר':p.training_status==='active'?'◉ בהכשרה':'○ טרם'}
        </span>
        {p.training_status==='none'   && <button className="btn btn-orange btn-sm text-xs px-2 sm:px-3" onClick={()=>setTr(p.id,'active')}>▶ התחל</button>}
        {p.training_status==='active' && <button className="btn btn-green btn-sm text-xs px-2 sm:px-3"  onClick={()=>setTr(p.id,'done')}>✓ סיים</button>}
        {p.training_status==='done'   && <button className="btn btn-ghost btn-sm text-xs px-2"  onClick={()=>setTr(p.id,'none')}>↺</button>}
      </div>
    )
  }

  function unitLabel(uid) { return UNITS.find(u => u.id === uid)?.name || '' }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">🎓 הכשרות פוקוס ושיבוץ למקומות</h2>
          <p className="text-text3 text-sm">נהל את ההכשרות ושייך אנשים למקומות (מטבחים/עמדות)</p>
        </div>
        <button onClick={() => setPostModal(true)} className="btn btn-blue bg-blue-900/40 border-blue-500/50 text-blue-300">
          ⚙ ניהול מקומות
        </button>
      </div>

      {/* סיכום */}
      <div className="card p-5 flex items-center gap-6">
        <div className={`text-5xl font-black ${pct===100?'text-green-400':pct>50?'text-orange-400':'text-red-400'}`}>
          {pct}%
        </div>
        <div className="flex-1">
          <div className="font-bold mb-2">{done} מתוך {total} הוכשרו</div>
          <div className="pbar h-3">
            <div className="pbar-fill bg-green-500 transition-all duration-1000" style={{width:`${pct}%`}}/>
          </div>
        </div>
      </div>

      {/* פילטר */}
      <div className="flex gap-2 flex-wrap">
        {[['all','הכל'],['none','טרם'],['active','בהכשרה'],['done','הוכשר']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            className={`ftab ${filter===k?'active':''}`}>{l}</button>
        ))}
      </div>

      {/* ── עמדות + אנשים לפי מקום ── */}
      {posts.map(post => {
        const postPeople = applyFilter(peopleWithPost.filter(p=>p.post_id===post.id))
        if (postPeople.length===0 && filter!=='all') return null
        const postDone = peopleWithPost.filter(p=>p.post_id===post.id&&p.training_status==='done').length
        const postTotal = peopleWithPost.filter(p=>p.post_id===post.id).length
        const postPct  = postTotal ? Math.round(postDone/postTotal*100) : 0

        return (
          <div key={post.id} className="card overflow-hidden border border-border1">
            <div className="bg-bg3 border-b border-border1 px-4 py-3 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="font-black text-lg">📍 {post.name}</span>
                <span className="text-xs font-bold px-2 py-1 bg-bg2 rounded text-text3">תקן: {post.required}</span>
                {canManageMultiple && <span className="text-text3 text-xs">{unitLabel(post.unit_id)}</span>}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className={`text-sm font-bold ${postPct===100?'text-green-400':postPct>50?'text-orange-400':'text-red-400'}`}>
                  {postDone}/{postTotal} הוכשרו ({postPct}%)
                </span>
                <div className="w-24 h-2.5 bg-bg4 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${postPct===100?'bg-green-500':postPct>50?'bg-orange-500':'bg-red-500'}`}
                    style={{width:`${postPct}%`}}/>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border1/50">
              {postPeople.length===0 && (
                <div className="px-4 py-4 text-text3 text-sm text-center">אין אנשים משויכים למקום זה. שייך אותם מ"ללא מקום מוגדר".</div>
              )}
              {postPeople.map(p => (
                <div key={p.id} className={`flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 ${p.status==='unavailable'?'opacity-40':''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.name} {p.status==='unavailable'&&'(לא זמין)'}</div>
                    <div className="text-text3 flex items-center gap-2 mt-1">
                      <span className="text-xs bg-bg2 px-1.5 py-0.5 rounded">{p.role}</span>
                      <select 
                        className="bg-transparent text-[11px] text-gold cursor-pointer outline-none hover:bg-bg3 rounded px-1 py-0.5 transition-colors max-w-[120px] truncate"
                        value={p.post_id || ''}
                        onChange={e => setPost(p.id, e.target.value)}
                        disabled={p.status==='unavailable'}
                      >
                        <option value="">הסר מהמקום</option>
                        {posts.filter(x => !canManageMultiple || x.unit_id === p.unit_id).map(x => (
                          <option key={x.id} value={x.id}>העבר ל{x.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.training_start && (
                      <span className="text-text3 text-xs hidden sm:block flex-shrink-0 mb-1">
                        {p.training_start} {p.training_end ? `← ${p.training_end}` : ''}
                      </span>
                    )}
                    <TrainingButton p={p}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* ── אנשים ללא עמדה ── */}
      {applyFilter(peopleWithoutPost).length > 0 && (
        <div className="card overflow-hidden border border-border1">
          <div className="panel-head bg-bg3">
            <span className="panel-title text-text3">👤 ללא מקום מוגדר</span>
            <span className="text-text3 text-xs">{peopleWithoutPost.length} אנשים</span>
          </div>
          <div className="divide-y divide-border1/50">
            {applyFilter(peopleWithoutPost).map(p => (
              <div key={p.id} className={`flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 ${p.status==='unavailable'?'opacity-40':''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{p.name} {p.status==='unavailable'&&'(לא זמין)'}</div>
                  <div className="text-text3 flex items-center gap-2 mt-1">
                    <span className="text-xs bg-bg2 px-1.5 py-0.5 rounded">{p.role}</span>
                    <select 
                      className="bg-gold/10 border border-gold/30 text-[11px] text-gold cursor-pointer outline-none hover:bg-gold/20 rounded px-2 py-0.5 transition-colors max-w-[140px] truncate"
                      value={p.post_id || ''}
                      onChange={e => setPost(p.id, e.target.value)}
                      disabled={p.status==='unavailable'}
                    >
                      <option value="">-- שייך למקום --</option>
                      {posts.filter(x => !canManageMultiple || x.unit_id === p.unit_id).map(x => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <TrainingButton p={p}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {people.length===0 && (
        <div className="card p-12 text-center text-text3 border border-border1">
          <div className="text-4xl mb-3">👥</div>
          <div>אין כוח אדם — הוסף אנשים בטאב "כוח אדם"</div>
        </div>
      )}

      {/* חלון ניהול מקומות ועמדות */}
      <Modal open={postModal} onClose={() => setPostModal(false)} title="⚙ ניהול מקומות (מטבחים/עמדות)">
        <div className="space-y-4">
          <div className="border border-border1 rounded-xl p-4 bg-bg3/50 space-y-3 mb-4">
            <p className="text-xs text-gold font-bold">➕ הוסף מקום חדש</p>
            <div className="flex gap-2 flex-wrap">
              <input className="form-input flex-1" placeholder="שם (מטבח א', מחסן חמץ...)" value={postForm.name} onChange={e => setPostForm(f => ({...f, name: e.target.value}))} />
              <input type="number" min="1" max="20" className="form-input w-24" placeholder="תקן נדרש" value={postForm.required} onChange={e => setPostForm(f => ({...f, required: parseInt(e.target.value) || 1}))} />
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
