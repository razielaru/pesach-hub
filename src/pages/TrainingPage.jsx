import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits, UNITS } from '../lib/units'

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [posts,  setPosts]  = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    try {
      const leafUnits = getLeafUnits(currentUnit.id)
      const ids = leafUnits.length > 0 ? leafUnits.map(u=>u.id) : [currentUnit.id]
      const [persRes, postsRes] = await Promise.all([
        ids.length===1
          ? supabase.from('personnel').select('*').eq('unit_id',ids[0])
          : supabase.from('personnel').select('*').in('unit_id',ids),
        ids.length===1
          ? supabase.from('unit_posts').select('*').eq('unit_id',ids[0])
          : supabase.from('unit_posts').select('*').in('unit_id',ids),
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

  // סינון לפי סטטוס
  const applyFilter = arr => filter==='all' ? arr : arr.filter(p=>p.training_status===filter)

  // חישוב כללי
  const total = people.length
  const done  = people.filter(p=>p.training_status==='done').length
  const pct   = total ? Math.round(done/total*100) : 0

  // קבוצה 1: אנשים עם עמדה מוגדרת — מקובצים לפי עמדה
  // קבוצה 2: אנשים ללא עמדה
  const peopleWithPost    = people.filter(p => p.post_id)
  const peopleWithoutPost = people.filter(p => !p.post_id)

  function TrainingButton({ p }) {
    return (
      <div className="flex items-center gap-2">
        <span className={`badge text-xs flex-shrink-0
          ${p.training_status==='done'?'badge-green':p.training_status==='active'?'badge-orange':'badge-dim'}`}>
          {p.training_status==='done'?'✓ הוכשר':p.training_status==='active'?'◉ בהכשרה':'○ טרם'}
        </span>
        {p.training_status==='none'   && <button className="btn btn-orange btn-sm text-xs" onClick={()=>setTr(p.id,'active')}>▶ התחל</button>}
        {p.training_status==='active' && <button className="btn btn-green btn-sm text-xs"  onClick={()=>setTr(p.id,'done')}>✓ סיים</button>}
        {p.training_status==='done'   && <button className="btn btn-ghost btn-sm text-xs"  onClick={()=>setTr(p.id,'none')}>↺</button>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">🎓 מעקב הכשרות</h2>

      {/* סיכום */}
      <div className="card p-5 flex items-center gap-6">
        <div className={`text-5xl font-black ${pct===100?'text-green-400':pct>50?'text-orange-400':'text-red-400'}`}>
          {pct}%
        </div>
        <div className="flex-1">
          <div className="font-bold mb-2">{done} מתוך {total} הוכשרו</div>
          <div className="pbar h-3">
            <div className="pbar-fill bg-green-500" style={{width:`${pct}%`}}/>
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
          <div key={post.id} className="card overflow-hidden">
            {/* כותרת עמדה */}
            <div className="panel-head">
              <div className="flex items-center gap-3">
                <span className="panel-title">📍 {post.name}</span>
                {getLeafUnits(currentUnit.id).length>0 && (
                  <span className="text-text3 text-xs">
                    {UNITS.find(u=>u.id===post.unit_id)?.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${postPct===100?'text-green-400':postPct>50?'text-orange-400':'text-red-400'}`}>
                  {postDone}/{postTotal} הוכשרו ({postPct}%)
                </span>
                <div className="w-20 h-2 bg-bg4 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${postPct===100?'bg-green-500':postPct>50?'bg-orange-500':'bg-red-500'}`}
                    style={{width:`${postPct}%`}}/>
                </div>
              </div>
            </div>

            {/* אנשים בעמדה */}
            <div className="divide-y divide-border1/50">
              {postPeople.length===0 && (
                <div className="px-4 py-3 text-text3 text-sm">אין אנשים משויכים לעמדה זו</div>
              )}
              {postPeople.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm">{p.name}</span>
                    <span className="text-text3 text-xs mr-2">{p.role}</span>
                  </div>
                  {p.training_start && (
                    <span className="text-text3 text-xs hidden sm:block">
                      {p.training_start} {p.training_end ? `← ${p.training_end}` : ''}
                    </span>
                  )}
                  <TrainingButton p={p}/>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* ── אנשים ללא עמדה ── */}
      {applyFilter(peopleWithoutPost).length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title text-text3">👤 ללא עמדה מוגדרת</span>
            <span className="text-text3 text-xs">{peopleWithoutPost.length} אנשים</span>
          </div>
          <div className="divide-y divide-border1/50">
            {applyFilter(peopleWithoutPost).map(p => (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-text3 text-xs mr-2">{p.role}</span>
                </div>
                {p.training_start && (
                  <span className="text-text3 text-xs hidden sm:block">
                    {p.training_start}{p.training_end?` ← ${p.training_end}`:''}
                  </span>
                )}
                <TrainingButton p={p}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {people.length===0 && (
        <div className="card p-12 text-center text-text3">
          <div className="text-4xl mb-3">👥</div>
          <div>אין כוח אדם — הוסף אנשים בטאב "כוח אדם"</div>
        </div>
      )}
    </div>
  )
}
