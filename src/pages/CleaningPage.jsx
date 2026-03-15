import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'

const COMMON_AREAS = ['מטבח', 'מטבחון', 'מטבחון מח״ט', 'פינת קפה', 'וויקוק', 'טרקלין', 'חלביה', 'פתיה', 'כוורת']

export default function CleaningPage() {
  const { currentUnit, showToast, isAdmin, isSenior } = useStore()
  
  // ── בדיקת הרשאות: מנהלים, או מי שהזין PIN נכון בשער ההזדהות ──
  const canEdit = isAdmin || isSenior || sessionStorage.getItem('canEdit') === 'true'

  const [areas, setAreas]   = useState([])
  const [posts, setPosts]   = useState([])
  const [people, setPeople] = useState([])
  const [customNames, setCustomNames] = useState({})
  const [expanded, setExpanded] = useState({})

  useEffect(() => { 
    if (currentUnit) load() 
    const ch = supabase.channel('clean_rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'cleaning_areas' }, () => load())
      .on('postgres_changes', { event:'*', schema:'public', table:'unit_posts' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]

    const [areasRes, postsRes, persRes] = await Promise.all([
      ids.length === 1 ? supabase.from('cleaning_areas').select('*').eq('unit_id', ids[0]).order('name') : supabase.from('cleaning_areas').select('*').in('unit_id', ids).order('name'),
      ids.length === 1 ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0]).order('name') : supabase.from('unit_posts').select('*').in('unit_id', ids).order('name'),
      ids.length === 1 ? supabase.from('personnel').select('id, name, role, unit_id').eq('unit_id', ids[0]).order('name') : supabase.from('personnel').select('id, name, role, unit_id').in('unit_id', ids).order('name')
    ])
    
    setAreas(areasRes.data || []); setPosts(postsRes.data || []); setPeople(persRes.data || [])
  }

  async function addArea(postId, areaName) {
    if (!areaName || !areaName.trim()) return
    const targetPost = posts.find(p => p.id === postId)
    const { data, error } = await supabase.from('cleaning_areas').insert({ unit_id: targetPost.unit_id, post_id: postId, name: areaName.trim(), status: 'dirty' }).select()
    if (error) showToast('שגיאה בהוספת יעד', 'red')
    else { showToast(`"${areaName.trim()}" נוסף לניקיון ✅`, 'green'); setAreas(prev => [...prev, ...data]); setCustomNames(prev => ({ ...prev, [postId]: '' })) }
  }

  async function updateStatus(id, status) {
    await supabase.from('cleaning_areas').update({ status }).eq('id', id)
    setAreas(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }
  
  async function assignPerson(id, personId) {
    await supabase.from('cleaning_areas').update({ assigned_to: personId || null }).eq('id', id)
    setAreas(prev => prev.map(a => a.id === id ? { ...a, assigned_to: personId || null } : a))
    showToast('האחראי עודכן ✅', 'green')
  }

  async function removeArea(id) {
    if (!confirm('למחוק יעד ניקיון זה?')) return
    await supabase.from('cleaning_areas').delete().eq('id', id)
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }

  const validAreas = areas.filter(a => posts.some(p => p.id === a.post_id))
  const cleanCount = validAreas.filter(a => a.status === 'clean').length
  const total = validAreas.length
  const pct = total ? Math.round((cleanCount / total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black">🧹 ניקיון לפי מקומות</h2>
          <p className="text-sm text-text3">המקומות מסונכרנים מטאב "הכשרות". הוסף להם יעדי ניקיון ספציפיים.</p>
        </div>
      </div>

      <div className="card p-5 flex items-center gap-6">
        <div className={`text-5xl font-black ${pct === 100 ? 'text-green-400' : pct > 50 ? 'text-orange-400' : 'text-red-400'}`}>{pct}%</div>
        <div className="flex-1">
          <div className="font-bold mb-2">{cleanCount} מתוך {total} יעדים נקיים לחלוטין</div>
          <div className="pbar h-3"><div className="pbar-fill bg-green-500 transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 && (
          <div className="card p-10 text-center border border-border1 text-text3">
            <div className="text-4xl mb-3">📍</div>
            <p className="font-bold text-lg mb-1">אין מקומות מוגדרים במסד הנתונים</p>
            <p className="text-sm">כדי להוסיף יעדי ניקיון, עליך קודם ליצור את המקומות הראשיים תחת טאב <b>הכשרות</b>.</p>
          </div>
        )}

        {posts.map(post => {
          const postAreas = areas.filter(a => a.post_id === post.id)
          const isExpanded = expanded[post.id] === true // סגור כברירת מחדל
          const postCleanCount = postAreas.filter(a => a.status === 'clean').length
          const postPct = postAreas.length ? Math.round((postCleanCount / postAreas.length) * 100) : 0

          return (
            <div key={post.id} className="card overflow-hidden border border-border1">
              <div className="bg-bg3 px-4 py-3 border-b border-border1 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(post.id)} className="w-6 h-6 flex items-center justify-center bg-bg2 rounded text-text2 hover:text-gold transition-colors">{isExpanded ? '▼' : '◀'}</button>
                  <span className="font-black text-lg">📍 {post.name}</span>
                  <span className="badge badge-dim text-xs hidden sm:inline-block">{post.type}</span>
                </div>
                {postAreas.length > 0 && <div className="flex items-center gap-2"><span className={`text-sm font-bold ${postPct===100?'text-green-400':postPct>50?'text-orange-400':'text-red-400'}`}>{postPct}% נקי</span></div>}
              </div>

              {isExpanded && (
                <div className="bg-bg1">
                  <div className="divide-y divide-border1/50">
                    {postAreas.length === 0 && <p className="px-4 py-4 text-sm text-text3 text-center">לא הוגדרו יעדי ניקיון למקום זה.</p>}
                    {postAreas.map(area => (
                      <div key={area.id} className="flex flex-col sm:flex-row sm:items-center px-4 py-3 hover:bg-bg2/50 gap-3 sm:gap-2">
                        <div className="flex-1 font-bold min-w-0 flex items-center gap-3"><span className="truncate">{area.name}</span></div>
                        <div className="flex gap-2 items-center w-full sm:w-auto">
                          
                          {/* גם חייל פשוט יכול לשנות אחראי וסטטוס ניקיון */}
                          <select className="form-input text-xs py-1.5 flex-1 sm:w-32 bg-bg2 border-border2 text-text2 cursor-pointer" value={area.assigned_to || ''} onChange={e => assignPerson(area.id, e.target.value)}>
                            <option value="">-- ללא אחראי --</option>
                            {people.filter(p => p.unit_id === post.unit_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          
                          <select className={`form-input text-xs font-bold py-1.5 flex-1 sm:w-auto cursor-pointer ${area.status === 'clean' ? 'bg-green-900/30 text-green-400 border-green-500/50' : 'bg-red-900/30 text-red-400 border-red-500/50'}`} value={area.status} onChange={e => updateStatus(area.id, e.target.value)}>
                            <option value="dirty" className="text-black">❌ מלוכלך</option>
                            <option value="clean" className="text-black">✨ נקי לפסח</option>
                          </select>
                          
                          {/* רק מי שיש לו הרשאות יכול למחוק יעד ניקיון! */}
                          {canEdit && <button onClick={() => removeArea(area.id)} className="btn btn-sm border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white flex-shrink-0" title="מחק יעד">🗑</button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* רק מי שיש לו הרשאות רואה את אזור הוספת היעדים */}
                  {canEdit && (
                    <div className="p-4 bg-bg2/50 border-t border-border1 border-dashed">
                      <p className="text-xs text-text3 font-bold mb-2">➕ הוסף יעדי ניקיון ל{post.name}:</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {COMMON_AREAS.map(area => <button key={area} onClick={() => addArea(post.id, area)} className="bg-bg3 border border-border2 hover:border-gold/50 hover:text-gold text-xs px-2.5 py-1.5 rounded-lg transition-all text-text2">+ {area}</button>)}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" className="form-input flex-1 text-sm bg-bg3" placeholder="יעד אחר (לדוגמה: מקרר חלבי)..." value={customNames[post.id] || ''} onChange={e => setCustomNames(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addArea(post.id, customNames[post.id])} />
                        <button onClick={() => addArea(post.id, customNames[post.id])} className="btn btn-blue btn-sm">הוסף</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
