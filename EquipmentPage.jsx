import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'

export default function EquipmentPage() {
  const { currentUnit, showToast } = useStore()
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', category:'כשרות', have:0, need:10 })

  useEffect(() => { if (currentUnit) load() }, [currentUnit])
  async function load() {
    const { data } = await supabase.from('equipment').select('*').eq('unit_id', currentUnit.id).order('name')
    setItems(data || [])
  }
  async function save() {
    if (!form.name) return
    await supabase.from('equipment').insert({ unit_id: currentUnit.id, ...form })
    showToast('פריט נוסף ✅', 'green'); setModal(false)
    setForm({ name:'', category:'כשרות', have:0, need:10 }); load()
  }
  async function changeQty(id, delta) {
    const item = items.find(i=>i.id===id)
    const newHave = Math.max(0, item.have + delta)
    await supabase.from('equipment').update({ have: newHave }).eq('id', id)
    setItems(prev => prev.map(i => i.id===id ? {...i, have: newHave} : i))
  }

  const full = items.filter(i=>i.have>=i.need).length
  const missing = items.filter(i=>i.have<i.need).length

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">📦 לוגיסטיקה וכשרות</h2>
        <button className="btn" onClick={()=>setModal(true)}>+ הוסף פריט</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="מלא" value={full} color="green" />
        <KpiCard label="חלקי" value={items.filter(i=>i.have>0&&i.have<i.need).length} color="orange" />
        <KpiCard label="חסר" value={missing} color="red" />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full tbl">
          <thead><tr><th>פריט</th><th>קטגוריה</th><th>יש</th><th>נדרש</th><th>%</th><th>עדכון</th></tr></thead>
          <tbody>
            {items.map(e => {
              const pct = Math.min(100, Math.round(e.have/Math.max(e.need,1)*100))
              const cls = pct>=100?'badge-green':pct>=50?'badge-orange':'badge-red'
              const bar = pct>=100?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'
              return (
                <tr key={e.id}>
                  <td className="font-bold">{e.name}</td>
                  <td><span className="badge badge-dim">{e.category}</span></td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
    </div>
  )
}
