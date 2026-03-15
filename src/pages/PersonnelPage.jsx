import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import * as XLSX from 'xlsx'
import { getLeafUnits, UNITS } from '../lib/units'

const STATUS_LABEL = { available:'זמין', zoom:'זום', away:'הגב', leave:'שחרור', unavailable:'אינו זמין' }
const STATUS_CLS   = { available:'badge-green', zoom:'badge-blue', away:'badge-orange', leave:'badge-red', unavailable:'badge-red' }
const STATUS_ICON  = { available:'✅', zoom:'💻', away:'⬅️', leave:'🏠', unavailable:'❌' }

function PersonnelTab() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople]       = useState([])
  const [modal,  setModal]        = useState(false)
  const [form,   setForm]         = useState({ name:'', role:'סגל', status:'available', targetUnit:'' })
  const [search, setSearch]       = useState('')

  const leafUnits = getLeafUnits(currentUnit.id)
  const canManageMultiple = leafUnits.length > 0

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    try {
      const ids = leafUnits.length > 0 ? leafUnits.map(u => u.id) : [currentUnit.id]
      const q = ids.length === 1
        ? supabase.from('personnel').select('*').eq('unit_id', ids[0])
        : supabase.from('personnel').select('*').in('unit_id', ids)
      const { data } = await q.order('name')
      setPeople(data || [])
    } catch { setPeople([]) }
  }

  async function save() {
    if (!form.name) return
    let targetUnitId = currentUnit.id
    if (canManageMultiple) {
      if (form.targetUnit) targetUnitId = form.targetUnit
      else { alert('בחר יחידה יעד לאיש הצוות'); return }
    }
    await supabase.from('personnel').insert({
      unit_id: targetUnitId,
      name: form.name, role: form.role,
      status: form.status, training_status: 'none' // נשמר ב-DB טכנית אבל לא רלוונטי
    })
    showToast(`${form.name} נוסף ✅`, 'green')
    setModal(false)
    setForm({ name:'', role:'סגל', status:'available', targetUnit:'' })
    load()
  }

  async function setStatus(id, status) {
    await supabase.from('personnel').update({ status }).eq('id', id)
    setPeople(p => p.map(x => x.id===id ? {...x,status} : x))
  }

  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('personnel').delete().eq('id', id); load()
  }

  const counts = { available:0, zoom:0, away:0, leave:0, unavailable:0 }
  people.forEach(p => { if (counts[p.status]!==undefined) counts[p.status]++ })

  const filtered = search ? people.filter(p => p.name.includes(search) || p.role.includes(search)) : people

  function unitLabel(uid) { return UNITS.find(u=>u.id===uid)?.name || '' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <input className="form-input w-44" placeholder="חיפוש שם / תפקיד..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn" onClick={()=>setModal(true)}>+ הוסף איש צוות</button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <KpiCard label="זמין" value={counts.available} color="green"/>
        <KpiCard label="זום" value={counts.zoom} color="blue"/>
        <KpiCard label="הגב" value={counts.away} color="orange"/>
        <KpiCard label="שחרור" value={counts.leave} color="red"/>
        <KpiCard label="אינו זמין" value={counts.unavailable} color="red"/>
      </div>

      <div className="space-y-1.5">
        {filtered.map(p => (
          <div key={p.id} className={`card px-3 py-2.5 flex flex-wrap items-center gap-2 ${p.status==='unavailable'?'opacity-50':''}`}>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">{p.name}</div>
              <div className="text-text3 text-xs truncate">
                {p.role} {canManageMultiple && p.unit_id !== currentUnit.id && ` · ${unitLabel(p.unit_id)}`}
              </div>
            </div>
            <div className="flex gap-0.5 flex-shrink-0 ml-auto">
              {Object.entries(STATUS_ICON).map(([k,icon]) => (
                <button key={k} title={STATUS_LABEL[k]} onClick={()=>setStatus(p.id,k)}
                  className={`text-sm px-0.5 transition-all leading-none ${p.status===k?'opacity-100 scale-110':'opacity-25 hover:opacity-60'}`}>{icon}</button>
              ))}
            </div>
            <button className="btn btn-red btn-sm flex-shrink-0 w-7 h-7 p-0 flex items-center justify-center" onClick={()=>remove(p.id)}>🗑</button>
          </div>
        ))}
        {filtered.length===0 && <div className="card p-8 text-center text-text3">אין אנשים — לחץ "+ הוסף"</div>}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="➕ הוספת איש צוות">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-text3 font-bold block mb-1">שם + דרגה</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תפקיד</label>
            <select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option>מכשיר</option><option>ביינש</option><option>עורך סדר</option>
              <option>קצ"ש</option><option>רב</option><option>קצין בקרה</option><option>סגל</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">סטטוס זמינות</label>
            <select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="available">✅ זמין</option><option value="zoom">💻 זום</option><option value="away">⬅️ הגב</option>
              <option value="leave">🏠 שחרור</option><option value="unavailable">❌ אינו זמין</option>
            </select>
          </div>
          {canManageMultiple && (
            <div className="col-span-2">
              <label className="text-xs text-text3 font-bold block mb-1">⚠ יחידה יעד *</label>
              <select className="form-input" value={form.targetUnit} onChange={e=>setForm(f=>({...f,targetUnit:e.target.value}))}>
                <option value="">בחר יחידה...</option>
                {leafUnits.map(u=><option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף"/>
      </Modal>
    </div>
  )
}

// שאר הקובץ נשאר כמו שהוא (טאב סדר, וייבוא) - פשוט תשאיר את ה-Export למטה
// ...
// המשך הקוד לטאבים האחרים...
export function PersonnelPage() {
  const [tab, setTab] = useState('personnel')
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">👥 ניהול כוח אדם</h2>
      <div className="flex gap-2 flex-wrap">
        {[['personnel','👥 כוח אדם']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} className={`ftab ${tab===id?'active':''}`}>{l}</button>
        ))}
      </div>
      {tab==='personnel' && <PersonnelTab/>}
    </div>
  )
}
export default PersonnelPage
