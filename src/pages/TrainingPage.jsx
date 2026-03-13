// TrainingPage.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'

export default function TrainingPage() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])
  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('personnel').select('*').eq('unit_id', ids[0])
      : supabase.from('personnel').select('*').in('unit_id', ids)
    const { data } = await query.order('name')
    setPeople(data || [])
  }
  async function setTr(id, status) {
    const updates = { training_status: status }
    if (status === 'active') updates.training_start = new Date().toISOString().split('T')[0]
    if (status === 'done') updates.training_end = new Date().toISOString().split('T')[0]
    // Optimistic update
    setPeople(prev => prev.map(p => p.id===id ? {...p, ...updates} : p))
    const { error } = await supabase.from('personnel').update(updates).eq('id', id)
    if (error) { showToast('שגיאה: ' + error.message, 'red'); load(); return }
    showToast(status==='done'?'הוכשר! 🎉':status==='active'?'הכשרה החלה ▶':'איפוס', status==='done'?'green':'gold')
  }

  const done = people.filter(p=>p.training_status==='done').length
  const pct = people.length ? Math.round(done/people.length*100) : 0
  const filtered = filter==='all' ? people : people.filter(p=>p.training_status===filter)

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">🎓 מעקב הכשרות</h2>
      <div className="card p-6 flex items-center gap-8">
        <div className={`text-6xl font-black ${pct===100?'text-green-400':pct>50?'text-orange-400':'text-red-400'}`}>{pct}%</div>
        <div className="flex-1">
          <div className="font-bold text-base mb-2">{done} מתוך {people.length} הוכשרו</div>
          <div className="pbar h-3"><div className="pbar-fill bg-green-500" style={{width:`${pct}%`}}/></div>
        </div>
      </div>
      <div className="flex gap-2">
        {[['all','הכל'],['none','טרם'],['active','בהכשרה'],['done','הוכשר']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} className={`ftab ${filter===k?'active':''}`}>{l}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full tbl">
          <thead><tr><th>שם</th><th>תפקיד</th><th>סטטוס</th><th>התחלה</th><th>סיום</th><th>פעולה</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-bold">{p.name}</td>
                <td><span className="badge badge-gold">{p.role}</span></td>
                <td><span className={`badge ${p.training_status==='done'?'badge-green':p.training_status==='active'?'badge-orange':'badge-dim'}`}>
                  {p.training_status==='done'?'✓ הוכשר':p.training_status==='active'?'◉ בהכשרה':'○ טרם'}</span></td>
                <td className="text-text3 text-xs">{p.training_start||'—'}</td>
                <td className="text-text3 text-xs">{p.training_end||'—'}</td>
                <td>
                  {p.training_status==='none' && <button className="btn btn-orange btn-sm" onClick={()=>setTr(p.id,'active')}>▶ התחל</button>}
                  {p.training_status==='active' && <button className="btn btn-green btn-sm" onClick={()=>setTr(p.id,'done')}>✓ סיים</button>}
                  {p.training_status==='done' && <button className="btn btn-ghost btn-sm" onClick={()=>setTr(p.id,'none')}>↺</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
