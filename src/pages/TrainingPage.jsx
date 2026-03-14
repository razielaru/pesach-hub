import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits, UNITS } from '../lib/units'

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [posts,  setPosts]  = useState([])
  const [filter, setFilter] = useState('all')
  const [filterPost, setFilterPost] = useState('')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    try {
      const subs = getLeafUnits(currentUnit.id)
      const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]

      const [persRes, postsRes] = await Promise.all([
        ids.length === 1
          ? supabase.from('personnel').select('*').eq('unit_id', ids[0])
          : supabase.from('personnel').select('*').in('unit_id', ids),
        // unit_posts — כל העמדות של כל היחידות תחת הפיקוד
        ids.length === 1
          ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0])
          : supabase.from('unit_posts').select('*').in('unit_id', ids),
      ])
      setPeople(persRes.data || [])
      setPosts(postsRes.data || [])
    } catch { setPeople([]); setPosts([]) }
  }

  async function setTr(id, status) {
    const updates = { training_status: status }
    if (status === 'active') updates.training_start = new Date().toISOString().split('T')[0]
    if (status === 'done')   updates.training_end   = new Date().toISOString().split('T')[0]
    setPeople(prev => prev.map(p => p.id===id ? {...p,...updates} : p))
    const { error } = await supabase.from('personnel').update(updates).eq('id', id)
    if (error) { showToast('שגיאה: ' + error.message, 'red'); load(); return }
    showToast(status==='done'?'הוכשר! 🎉':status==='active'?'הכשרה החלה ▶':'איפוס', status==='done'?'green':'gold')
  }

  async function assignPost(personId, postId) {
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
    setPeople(prev => prev.map(p => p.id===personId ? {...p, post_id: postId||null} : p))
  }

  const done = people.filter(p => p.training_status==='done').length
  const pct  = people.length ? Math.round(done/people.length*100) : 0

  // סינון
  let filtered = filter === 'all' ? people : people.filter(p => p.training_status===filter)
  if (filterPost === '__none__') filtered = filtered.filter(p => !p.post_id)
  else if (filterPost) filtered = filtered.filter(p => p.post_id === filterPost)

  // סטטיסטיקת עמדות
  const postsWithStats = posts.map(post => {
    const assigned = people.filter(p => p.post_id===post.id)
    const trained  = assigned.filter(p => p.training_status==='done').length
    return { ...post, assigned: assigned.length, trained }
  })

  // שם יחידה לפי unit_id
  function unitName(uid) { return UNITS.find(u=>u.id===uid)?.name || uid }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">🎓 מעקב הכשרות</h2>

      {/* סיכום כללי */}
      <div className="card p-6 flex items-center gap-8">
        <div className={`text-6xl font-black ${pct===100?'text-green-400':pct>50?'text-orange-400':'text-red-400'}`}>{pct}%</div>
        <div className="flex-1">
          <div className="font-bold text-base mb-2">{done} מתוך {people.length} הוכשרו</div>
          <div className="pbar h-3"><div className="pbar-fill bg-green-500" style={{width:`${pct}%`}}/></div>
        </div>
      </div>

      {/* עמדות — סטטוס הכשרה לפי עמדה */}
      {postsWithStats.length > 0 && (
        <div className="card">
          <div className="panel-head"><span className="panel-title">📍 הכשרה לפי עמדה</span></div>
          <div className="divide-y divide-border1/50">
            {postsWithStats.map(post => {
              const pctPost = post.assigned ? Math.round(post.trained/post.assigned*100) : 0
              return (
                <div key={post.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="font-bold text-sm flex-1">{post.name}</span>
                  <span className="text-text3 text-xs">{post.assigned} משויכים</span>
                  <span className={`text-sm font-bold ${pctPost===100?'text-green-400':pctPost>50?'text-orange-400':'text-red-400'}`}>
                    {post.trained}/{post.assigned} הוכשרו
                  </span>
                  <div className="w-24 h-2 bg-bg4 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pctPost===100?'bg-green-500':pctPost>50?'bg-orange-500':'bg-red-500'}`}
                      style={{width:`${pctPost}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* פילטרים */}
      <div className="flex gap-2 flex-wrap">
        {[['all','הכל'],['none','טרם'],['active','בהכשרה'],['done','הוכשר']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} className={`ftab ${filter===k?'active':''}`}>{l}</button>
        ))}
        {posts.length > 0 && (
          <select className="form-input text-xs py-1 w-36 mr-2" value={filterPost} onChange={e=>setFilterPost(e.target.value)}>
            <option value="">כל העמדות</option>
            {posts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__none__">ללא עמדה</option>
          </select>
        )}
      </div>

      {/* טבלה */}
      <div className="card overflow-hidden">
        <table className="w-full tbl">
          <thead>
            <tr>
              <th>שם</th>
              <th>תפקיד</th>
              {getLeafUnits(currentUnit.id).length > 0 && <th>יחידה</th>}
              {posts.length > 0 && <th>עמדה</th>}
              <th>סטטוס</th>
              <th>התחלה</th>
              <th>סיום</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const postName = posts.find(x=>x.id===p.post_id)?.name
              const subs = getLeafUnits(currentUnit.id)
              return (
                <tr key={p.id}>
                  <td className="font-bold">{p.name}</td>
                  <td><span className="badge badge-gold">{p.role}</span></td>
                  {subs.length > 0 && <td className="text-text3 text-xs">{unitName(p.unit_id)}</td>}
                  {posts.length > 0 && (
                    <td>
                      <select className="form-input text-xs py-0.5 w-28"
                        value={p.post_id||''} onChange={e=>assignPost(p.id,e.target.value)}>
                        <option value="">ללא עמדה</option>
                        {posts.map(post=><option key={post.id} value={post.id}>{post.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td>
                    <span className={`badge ${p.training_status==='done'?'badge-green':p.training_status==='active'?'badge-orange':'badge-dim'}`}>
                      {p.training_status==='done'?'✓ הוכשר':p.training_status==='active'?'◉ בהכשרה':'○ טרם'}
                    </span>
                  </td>
                  <td className="text-text3 text-xs">{p.training_start||'—'}</td>
                  <td className="text-text3 text-xs">{p.training_end||'—'}</td>
                  <td>
                    {p.training_status==='none'   && <button className="btn btn-orange btn-sm" onClick={()=>setTr(p.id,'active')}>▶ התחל</button>}
                    {p.training_status==='active' && <button className="btn btn-green btn-sm"  onClick={()=>setTr(p.id,'done')}>✓ סיים</button>}
                    {p.training_status==='done'   && <button className="btn btn-ghost btn-sm"  onClick={()=>setTr(p.id,'none')}>↺</button>}
                  </td>
                </tr>
              )
            })}
            {filtered.length===0 && (
              <tr><td colSpan="8" className="text-center text-text3 py-8">אין אנשים</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
