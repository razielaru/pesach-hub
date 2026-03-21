import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import { readPageCache, writePageCache } from '../lib/pageCache'

export default function EquipmentPage() {
  const { currentUnit, showToast, isAdmin, isSenior } = useStore()
  const [items, setItems] = useState([])
  const [dispLog, setDispLog] = useState([])
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState('inventory') // 'inventory' | 'dispatch'
  const [form, setForm] = useState({ name:'', category:'כשרות', have:0, need:10 })
  const [dispForm, setDispForm] = useState({ item:'', qty:1, note:'' })
  const [dispModal, setDispModal] = useState(false)

  useEffect(() => {
    if (!currentUnit) return
    const cached = readPageCache(`equipment:${currentUnit.id}`)
    if (cached) {
      setItems(cached.items || [])
      setDispLog(cached.dispLog || [])
    }
    load()
  }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]

    let eqQuery = supabase.from('equipment').select('*').order('name')
    let dlQuery = supabase.from('dispatch_log').select('*').order('created_at', { ascending: false }).limit(50)

    if (ids.length === 1) {
      eqQuery = eqQuery.eq('unit_id', ids[0])
      dlQuery = dlQuery.eq('unit_id', ids[0])
    } else {
      eqQuery = eqQuery.in('unit_id', ids)
      dlQuery = dlQuery.in('unit_id', ids)
    }

    const [eq, dl] = await Promise.all([eqQuery, dlQuery])
    setItems(eq.data || [])
    setDispLog(dl.data || [])
    writePageCache(`equipment:${currentUnit.id}`, { items: eq.data || [], dispLog: dl.data || [] })
  }

  async function save() {
    if (!form.name) return
    await supabase.from('equipment').insert({ unit_id: currentUnit.id, ...form })
    showToast('פריט נוסף ✅', 'green'); setModal(false)
    setForm({ name:'', category:'כשרות', have:0, need:10 }); load()
  }

  async function deleteItem(id) {
    if (!confirm('למחוק פריט לגמרי?')) return
    await supabase.from('equipment').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('פריט נמחק', 'red')
  }

  async function changeQty(id, delta) {
    const item = items.find(i=>i.id===id)
    const newHave = Math.max(0, item.have + delta)
    await supabase.from('equipment').update({ have: newHave }).eq('id', id)
    setItems(prev => prev.map(i => i.id===id ? {...i, have: newHave} : i))
  }

  async function saveDispatch() {
    if (!dispForm.item) return
    await supabase.from('dispatch_log').insert({
      unit_id: currentUnit.id,
      item_name: dispForm.item,
      quantity: dispForm.qty,
      notes: dispForm.note,
      dispatched_by: currentUnit?.name
    })
    // Update equipment quantity
    const existing = items.find(i=>i.name===dispForm.item)
    if (existing) {
      await supabase.from('equipment').update({ have: existing.have + dispForm.qty }).eq('id', existing.id)
    } else {
      // Create new item if doesn't exist
      await supabase.from('equipment').insert({
        unit_id: currentUnit.id,
        name: dispForm.item,
        category: 'ניפוק',
        have: dispForm.qty,
        need: dispForm.qty
      })
    }
    // Notify via broadcast if unit is not admin
    if (!isAdmin && !isSenior) {
      await supabase.from('broadcast_alerts').insert({
        message: `📦 ${currentUnit.name} דרשה: ${dispForm.item} × ${dispForm.qty}${dispForm.note ? ' — ' + dispForm.note : ''}`,
        sent_by: currentUnit.name,
        is_active: false // informational only
      })
    }
    showToast('ניפוק נרשם ✅', 'green')
    setDispModal(false); setDispForm({ item:'', qty:1, note:'' }); load()
  }

  const full = items.filter(i=>i.have>=i.need).length
  const missing = items.filter(i=>i.have<i.need).length

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">📦 לוגיסטיקה וכשרות</h2>
        <div className="flex gap-2">
          {tab === 'inventory' && <button className="btn" onClick={()=>setModal(true)}>+ פריט</button>}
          {tab === 'dispatch' && <button className="btn btn-blue btn-sm" onClick={()=>setDispModal(true)}>+ ניפוק חדש</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={()=>setTab('inventory')} className={`ftab ${tab==='inventory'?'active':''}`}>📦 מלאי</button>
        <button onClick={()=>setTab('dispatch')} className={`ftab ${tab==='dispatch'?'active':''}`}>📋 יומן ניפוקים</button>
      </div>

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (<>
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="מלא" value={full} color="green" />
          <KpiCard label="חלקי" value={items.filter(i=>i.have>0&&i.have<i.need).length} color="orange" />
          <KpiCard label="חסר" value={missing} color="red" />
        </div>
        <div className="card overflow-hidden">
          <table className="w-full tbl">
            <thead><tr><th>פריט</th><th>קטגוריה</th>{(isAdmin||isSenior)&&<th>יחידה</th>}<th>יש</th><th>נדרש</th><th>%</th><th>עדכון</th><th></th></tr></thead>
            <tbody>
              {items.map(e => {
                const pct = Math.min(100, Math.round(e.have/Math.max(e.need,1)*100))
                const cls = pct>=100?'badge-green':pct>=50?'badge-orange':'badge-red'
                const bar = pct>=100?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'
                return (
                  <tr key={e.id}>
                    <td className="font-bold">{e.name}</td>
                    <td><span className="badge badge-dim">{e.category}</span></td>
                    {(isAdmin||isSenior)&&<td className="text-text3 text-xs">{e.unit_id}</td>}
                    <td className="font-bold text-base">{e.have}</td>
                    <td className="text-text3">{e.need}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="pbar w-20"><div className={`pbar-fill ${bar}`} style={{width:`${pct}%`}}/></div>
                        <span className={`badge ${cls}`}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-green btn-sm" onClick={()=>changeQty(e.id,1)}>+</button>
                        <button className="btn btn-red btn-sm" onClick={()=>changeQty(e.id,-1)}>−</button>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm opacity-40 hover:opacity-100 transition-opacity"
                        style={{color:'#f87171'}} onClick={()=>deleteItem(e.id)}>🗑</button>
                    </td>
                  </tr>
                )
              })}
              {items.length===0 && <tr><td colSpan={8} className="text-center text-text3 py-8">אין פריטים</td></tr>}
            </tbody>
          </table>
        </div>
      </>)}

      {/* DISPATCH TAB */}
      {tab === 'dispatch' && (
        <div className="card">
          <div className="divide-y divide-border1/50">
            {dispLog.length === 0 && <p className="p-8 text-center text-text3">אין ניפוקים עדיין</p>}
            {dispLog.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center text-xl flex-shrink-0">📦</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{d.item_name} <span className="text-gold">× {d.quantity}</span></div>
                  {d.notes && <div className="text-text3 text-xs">{d.notes}</div>}
                  {d.dispatched_by && <div className="text-text3 text-xs">מאת: {d.dispatched_by}</div>}
                </div>
                <div className="text-text3 text-xs">{new Date(d.created_at).toLocaleDateString('he-IL')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add item modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="📦 הוספת פריט">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs text-text3 font-bold block mb-1">שם הפריט</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label>
            <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              <option>כשרות</option><option>ניקיון</option><option>לוגיסטיקה</option><option>אחר</option>
            </select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">יש</label>
            <input type="number" className="form-input" value={form.have} onChange={e=>setForm(f=>({...f,have:+e.target.value}))} /></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">נדרש</label>
            <input type="number" className="form-input" value={form.need} onChange={e=>setForm(f=>({...f,need:+e.target.value}))} /></div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>

      {/* Dispatch modal */}
      <Modal open={dispModal} onClose={()=>setDispModal(false)} title="📋 ניפוק חדש">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">פריט</label>
            <input className="form-input" list="items-list" value={dispForm.item}
              onChange={e=>setDispForm(f=>({...f,item:e.target.value}))} />
            <datalist id="items-list">
              {items.map(i=><option key={i.id} value={i.name}/>)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text3 font-bold block mb-1">כמות</label>
              <input type="number" className="form-input" min="1" value={dispForm.qty}
                onChange={e=>setDispForm(f=>({...f,qty:+e.target.value}))} /></div>
            <div><label className="text-xs text-text3 font-bold block mb-1">הערה</label>
              <input className="form-input" value={dispForm.note}
                onChange={e=>setDispForm(f=>({...f,note:e.target.value}))} /></div>
          </div>
        </div>
        <ModalButtons onClose={()=>setDispModal(false)} onSave={saveDispatch} saveLabel="אשר ניפוק" />
      </Modal>
    </div>
  )
}
