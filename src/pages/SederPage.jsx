import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

export default function SederPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({
    unit_id: '', base_name: '', rabbi_name: '', participants: '',
    kit_delivered: false, notes: ''
  })

  const canEdit = isAdmin || isSenior

  useEffect(() => { load() }, [currentUnit])

  async function load() {
    setLoading(true)
    let q = supabase.from('seder_assignments').select('*').order('base_name')
    if (!canEdit) q = q.eq('unit_id', currentUnit?.id)
    const { data } = await q
    setAssignments(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ unit_id: currentUnit?.id || '', base_name: '', rabbi_name: '', participants: '', kit_delivered: false, notes: '' })
    setModal(true)
  }

  function openEdit(a) {
    setEditItem(a)
    setForm({ unit_id: a.unit_id, base_name: a.base_name, rabbi_name: a.rabbi_name || '',
      participants: a.participants || '', kit_delivered: a.kit_delivered || false, notes: a.notes || '' })
    setModal(true)
  }

  async function save() {
    if (!form.base_name) return
    const payload = {
      unit_id: form.unit_id || currentUnit?.id,
      base_name: form.base_name,
      rabbi_name: form.rabbi_name,
      participants: form.participants ? parseInt(form.participants) : null,
      kit_delivered: form.kit_delivered,
      notes: form.notes,
    }
    if (editItem) {
      await supabase.from('seder_assignments').update(payload).eq('id', editItem.id)
      showToast('עודכן ✅', 'green')
    } else {
      await supabase.from('seder_assignments').insert(payload)
      showToast('שיבוץ נוסף ✅', 'green')
    }
    setModal(false); load()
  }

  async function toggleKit(a) {
    await supabase.from('seder_assignments').update({ kit_delivered: !a.kit_delivered }).eq('id', a.id)
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, kit_delivered: !x.kit_delivered } : x))
  }

  async function del(id) {
    if (!confirm('למחוק שיבוץ זה?')) return
    await supabase.from('seder_assignments').delete().eq('id', id)
    showToast('נמחק', 'gold'); load()
  }

  const totalKits = assignments.filter(a => a.kit_delivered).length
  const totalParticipants = assignments.reduce((s, a) => s + (parseInt(a.participants) || 0), 0)
  const unitName = (id) => UNITS.find(u => u.id === id)?.name || id

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">🕍 שיבוצי ליל הסדר</h2>
          <p className="text-text3 text-xs mt-0.5">מיפוי עורכי סדר, מוצבים וערכות</p>
        </div>
        {canEdit && (
          <button className="btn" onClick={openNew}>+ הוסף שיבוץ</button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-gold2">{assignments.length}</div>
          <div className="text-text3 text-xs mt-1">מוצבים / בסיסים</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-3xl font-black ${totalKits === assignments.length && assignments.length > 0 ? 'text-green-400' : 'text-orange-400'}`}>
            {totalKits}/{assignments.length}
          </div>
          <div className="text-text3 text-xs mt-1">ערכות נופקו</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-blue-400">{totalParticipants || '—'}</div>
          <div className="text-text3 text-xs mt-1">משתתפים צפויים</div>
        </div>
      </div>

      {/* Progress bar kits */}
      {assignments.length > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-xs text-text2 mb-2">
            <span>⚙ ערכות ליל הסדר — {Math.round(totalKits/assignments.length*100)}% נופקו</span>
            <span className={totalKits === assignments.length ? 'text-green-400 font-bold' : 'text-orange-400'}>
              {totalKits === assignments.length ? '✅ הכל נופק!' : `${assignments.length - totalKits} ממתין`}
            </span>
          </div>
          <div className="pbar h-2.5 rounded-full">
            <div className={`pbar-fill rounded-full transition-all duration-500 ${totalKits === assignments.length ? 'bg-green-500' : 'bg-orange-500'}`}
              style={{ width: `${assignments.length ? (totalKits/assignments.length*100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-text3 text-center py-10">טוען...</div>
      ) : assignments.length === 0 ? (
        <div className="card p-10 text-center text-text3">
          <div className="text-4xl mb-3">🕍</div>
          <p>אין שיבוצים עדיין</p>
          {canEdit && <button className="btn mt-4" onClick={openNew}>הוסף ראשון</button>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border1 text-text3 text-xs">
                  <th className="text-right p-3 font-bold">מוצב / בסיס</th>
                  {canEdit && <th className="text-right p-3 font-bold">יחידה</th>}
                  <th className="text-right p-3 font-bold">עורך הסדר / רב</th>
                  <th className="text-center p-3 font-bold">משתתפים</th>
                  <th className="text-center p-3 font-bold">ערכה נופקה</th>
                  <th className="text-right p-3 font-bold">הערות</th>
                  {canEdit && <th className="p-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1/40">
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-bg3/40 transition-colors">
                    <td className="p-3 font-black">{a.base_name}</td>
                    {canEdit && <td className="p-3 text-text2 text-xs">{unitName(a.unit_id)}</td>}
                    <td className="p-3">
                      {a.rabbi_name
                        ? <span className="flex items-center gap-1.5"><span className="text-gold">✡</span>{a.rabbi_name}</span>
                        : <span className="text-text3 text-xs italic">לא שובץ</span>}
                    </td>
                    <td className="p-3 text-center">
                      {a.participants
                        ? <span className="badge badge-blue">{a.participants}</span>
                        : <span className="text-text3">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleKit(a)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all
                          ${a.kit_delivered
                            ? 'bg-green-900/30 border-green-500/40 text-green-400'
                            : 'bg-bg3 border-border2 text-text3 hover:border-orange-500/50'}`}>
                        {a.kit_delivered ? '✅ נופקה' : '⏳ ממתין'}
                      </button>
                    </td>
                    <td className="p-3 text-text2 text-xs max-w-[150px] truncate">{a.notes || '—'}</td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(a)} className="btn btn-ghost btn-sm text-xs">✏️</button>
                          <button onClick={() => del(a.id)} className="btn btn-ghost btn-sm text-xs text-red-400">🗑</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border1/40">
            {assignments.map(a => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-black">{a.base_name}</div>
                    {canEdit && <div className="text-text3 text-xs">{unitName(a.unit_id)}</div>}
                  </div>
                  <button onClick={() => toggleKit(a)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all
                      ${a.kit_delivered ? 'bg-green-900/30 border-green-500/40 text-green-400' : 'bg-bg3 border-border2 text-text3'}`}>
                    {a.kit_delivered ? '✅' : '⏳'}
                  </button>
                </div>
                {a.rabbi_name && <div className="text-sm"><span className="text-gold">✡</span> {a.rabbi_name}</div>}
                {a.participants && <div className="text-xs text-text2">👥 {a.participants} משתתפים</div>}
                {a.notes && <div className="text-xs text-text3">{a.notes}</div>}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(a)} className="btn btn-ghost btn-sm text-xs">✏️ ערוך</button>
                    <button onClick={() => del(a.id)} className="btn btn-ghost btn-sm text-xs text-red-400">🗑 מחק</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? '✏️ עריכת שיבוץ' : '🕍 הוספת שיבוץ'}>
        {canEdit && (
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">יחידה</label>
            <select className="form-input" value={form.unit_id} onChange={e => setForm(f=>({...f, unit_id: e.target.value}))}>
              <option value="">בחר יחידה</option>
              {UNITS.filter(u => !u.is_admin).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">מוצב / בסיס *</label>
          <input className="form-input" value={form.base_name} onChange={e => setForm(f=>({...f, base_name: e.target.value}))} placeholder="שם המוצב או הבסיס" />
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">שם עורך הסדר / הרב</label>
          <input className="form-input" value={form.rabbi_name} onChange={e => setForm(f=>({...f, rabbi_name: e.target.value}))} placeholder="סגן רוחני / רב יחידה" />
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">מספר משתתפים צפויים</label>
          <input className="form-input" type="number" min="0" value={form.participants} onChange={e => setForm(f=>({...f, participants: e.target.value}))} placeholder="כמה חיילים?" />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="kit" checked={form.kit_delivered} onChange={e => setForm(f=>({...f, kit_delivered: e.target.checked}))}
            className="w-4 h-4 accent-yellow-500" />
          <label htmlFor="kit" className="text-sm font-bold cursor-pointer">ערכת ליל הסדר נופקה ✅</label>
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">הערות</label>
          <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f=>({...f, notes: e.target.value}))} placeholder="מידע נוסף..." />
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={save} saveLabel={editItem ? 'עדכן' : 'הוסף'} />
      </Modal>
    </div>
  )
}
