// PersonnelPage.jsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import * as XLSX from 'xlsx'

const STATUS_LABEL = { available:'זמין', zoom:'זום', away:'הגב', leave:'שחרור' }
const STATUS_CLS   = { available:'badge-green', zoom:'badge-blue', away:'badge-orange', leave:'badge-red' }
const TR_LABEL     = { none:'טרם', active:'בהכשרה', done:'הוכשר' }
const TR_CLS       = { none:'badge-dim', active:'badge-orange', done:'badge-green' }

// ─── PERSONNEL TAB ────────────────────────────────────────────────────────────
function PersonnelTab() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', role:'סגל', status:'available', training_status:'none' })
  const [search, setSearch] = useState('')

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const { data } = await supabase.from('personnel').select('*').eq('unit_id', currentUnit.id).order('name')
    setPeople(data || [])
  }
  async function save() {
    if (!form.name) return
    await supabase.from('personnel').insert({ unit_id: currentUnit.id, ...form })
    showToast(`${form.name} נוסף ✅`, 'green')
    setModal(false); setForm({ name:'', role:'סגל', status:'available', training_status:'none' }); load()
  }
  async function setStatus(id, status) {
    await supabase.from('personnel').update({ status }).eq('id', id)
    setPeople(p => p.map(x => x.id===id ? {...x,status} : x))
  }
  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('personnel').delete().eq('id', id)
    load()
  }

  const counts = { available:0, zoom:0, away:0, leave:0 }
  people.forEach(p => { if (counts[p.status]!==undefined) counts[p.status]++ })
  const filtered = search ? people.filter(p=>p.name.includes(search)||p.role.includes(search)) : people

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <input className="form-input w-44" placeholder="חיפוש..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn" onClick={()=>setModal(true)}>+ הוסף</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="זמין" value={counts.available} color="green" />
        <KpiCard label="זום" value={counts.zoom} color="blue" />
        <KpiCard label="הגב" value={counts.away} color="orange" />
        <KpiCard label="שחרור" value={counts.leave} color="red" />
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-bg4 flex items-center justify-center text-lg flex-shrink-0">
              {p.role==='מכשיר'?'🎓':p.role==='ביינש'?'⚖️':p.role==='עורך סדר'?'📜':p.role==='רב'?'✡️':p.role==='קצין בקרה'?'🔍':'👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-text3 text-xs">{p.role}</div>
            </div>
            <span className={`badge ${TR_CLS[p.training_status]}`}>{TR_LABEL[p.training_status]}</span>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(STATUS_LABEL).map(([k,l]) => (
                <button key={k} onClick={()=>setStatus(p.id,k)}
                  className={`badge cursor-pointer transition-all ${p.status===k ? STATUS_CLS[k] : 'badge-dim opacity-50 hover:opacity-100'}`}>
                  {l}
                </button>
              ))}
            </div>
            <button className="btn btn-red btn-sm" onClick={()=>remove(p.id)}>🗑</button>
          </div>
        ))}
        {filtered.length === 0 && <div className="card p-8 text-center text-text3">אין אנשים</div>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="➕ הוספת איש צוות">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs text-text3 font-bold block mb-1">שם + דרגה</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">תפקיד</label>
            <select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option>מכשיר</option><option>ביינש</option><option>עורך סדר</option><option>קצ"ש</option><option>רב</option><option>קצין בקרה</option><option>סגל</option>
            </select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">סטטוס</label>
            <select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="available">זמין</option><option value="zoom">זום</option><option value="away">הגב</option><option value="leave">שחרור</option>
            </select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">הכשרה</label>
            <select className="form-input" value={form.training_status} onChange={e=>setForm(f=>({...f,training_status:e.target.value}))}>
              <option value="none">טרם</option><option value="active">בהכשרה</option><option value="done">הוכשר</option>
            </select></div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>
    </div>
  )
}

// ─── SEDER TAB ────────────────────────────────────────────────────────────────
function SederTab() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [assignments, setAssignments] = useState([])
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ base_name:'', rabbi_name:'', participants:'', kit_delivered: false, notes:'' })

  const canEdit = isAdmin || isSenior

  useEffect(() => { load() }, [currentUnit])

  async function load() {
    const query = (isAdmin || isSenior)
      ? supabase.from('seder_assignments').select('*').order('base_name')
      : supabase.from('seder_assignments').select('*').eq('unit_id', currentUnit.id).order('base_name')
    const { data } = await query
    setAssignments(data || [])
  }

  function openAdd() { setEditItem(null); setForm({ base_name:'', rabbi_name:'', participants:'', kit_delivered: false, notes:'' }); setModal(true) }
  function openEdit(a) { setEditItem(a); setForm({ base_name: a.base_name, rabbi_name: a.rabbi_name||'', participants: a.participants||'', kit_delivered: a.kit_delivered||false, notes: a.notes||'' }); setModal(true) }

  async function save() {
    if (!form.base_name) return
    const payload = { ...form, participants: form.participants ? parseInt(form.participants) : null, unit_id: currentUnit.id }
    if (editItem) {
      await supabase.from('seder_assignments').update(payload).eq('id', editItem.id)
      showToast('עודכן ✅', 'green')
    } else {
      await supabase.from('seder_assignments').insert(payload)
      showToast('נוסף ✅', 'green')
    }
    setModal(false); load()
  }

  async function toggleKit(id, current) {
    await supabase.from('seder_assignments').update({ kit_delivered: !current }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id===id ? {...a, kit_delivered: !current} : a))
  }

  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('seder_assignments').delete().eq('id', id)
    load()
  }

  const delivered = assignments.filter(a => a.kit_delivered).length
  const pct = assignments.length ? Math.round(delivered / assignments.length * 100) : 0

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="מוצבים" value={assignments.length} color="blue" />
        <KpiCard label="ערכות נופקו" value={delivered} color="green" />
        <KpiCard label="אחוז מוכנות" value={`${pct}%`} color={pct===100?'green':pct>=50?'orange':'red'} />
      </div>

      {/* Progress bar */}
      {assignments.length > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-xs text-text3 mb-2">
            <span>התקדמות ניפוק ערכות ליל הסדר</span>
            <span className="font-bold">{delivered}/{assignments.length}</span>
          </div>
          <div className="h-3 bg-bg3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${pct===100?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'}`}
              style={{width:`${pct}%`}} />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-text3">{isAdmin||isSenior ? 'כל היחידות' : currentUnit?.name}</span>
        <button className="btn" onClick={openAdd}>+ הוסף מוצב</button>
      </div>

      <div className="space-y-2">
        {assignments.length === 0 && <div className="card p-10 text-center text-text3">אין שיבוצים עדיין — לחץ "הוסף מוצב"</div>}
        {assignments.map(a => (
          <div key={a.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{a.base_name}</div>
              {a.rabbi_name && <div className="text-text3 text-xs">✡ {a.rabbi_name}</div>}
              {a.participants && <div className="text-text3 text-xs">👥 {a.participants} משתתפים</div>}
              {a.notes && <div className="text-text3 text-xs mt-1">📝 {a.notes}</div>}
            </div>
            <button onClick={() => toggleKit(a.id, a.kit_delivered)}
              className={`badge cursor-pointer transition-all ${a.kit_delivered ? 'badge-green' : 'badge-dim'}`}>
              {a.kit_delivered ? '✅ ערכה נופקה' : '⏳ ממתין לניפוק'}
            </button>
            {canEdit && (
              <>
                <button className="btn btn-sm" onClick={() => openEdit(a)}>✏️</button>
                <button className="btn btn-red btn-sm" onClick={() => remove(a.id)}>🗑</button>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editItem ? '✏️ עריכת שיבוץ' : '➕ הוספת מוצב/בסיס'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">שם המוצב / בסיס *</label>
            <input className="form-input" placeholder="לדוגמה: מוצב א, בסיס צבר..."
              value={form.base_name} onChange={e=>setForm(f=>({...f,base_name:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">שם עורך הסדר / הרב</label>
              <input className="form-input" placeholder="ר' ישראל ישראלי"
                value={form.rabbi_name} onChange={e=>setForm(f=>({...f,rabbi_name:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">כמות משתתפים</label>
              <input type="number" className="form-input" min="1"
                value={form.participants} onChange={e=>setForm(f=>({...f,participants:e.target.value}))} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.kit_delivered}
              onChange={e=>setForm(f=>({...f,kit_delivered:e.target.checked}))}
              className="w-4 h-4 accent-gold" />
            <span className="text-sm text-text2">ערכת ליל הסדר נופקה</span>
          </label>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">הערות</label>
            <input className="form-input" placeholder="הערות נוספות..."
              value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel={editItem ? '💾 שמור' : '➕ הוסף'} />
      </Modal>
    </div>
  )
}

// ─── IMPORT TAB ───────────────────────────────────────────────────────────────
function ImportTab() {
  const { currentUnit, showToast } = useStore()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [headers, setHeaders] = useState([])
  const [importType, setImportType] = useState('personnel')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const FIELD_ALIASES = {
    name:    ['שם','name','fullname','שם מלא','שם חייל','שם עובד'],
    role:    ['תפקיד','role','תפקיד','תפקיד בצוות','role'],
    status:  ['סטטוס','status','זמינות'],
  }

  function detectColumn(headers, field) {
    const aliases = FIELD_ALIASES[field] || []
    return headers.findIndex(h => aliases.some(a => h?.toString().trim().toLowerCase() === a.toLowerCase()))
  }

  function handleFile(f) {
    if (!f) return
    setFile(f); setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (!rows.length) return
      const hdrs = rows[0].map(h => h?.toString().trim())
      setHeaders(hdrs)
      setPreview(rows.slice(1, 6).map(row => hdrs.reduce((obj, h, i) => { obj[h] = row[i]; return obj }, {})))
    }
    reader.readAsBinaryString(f)
  }

  async function runImport() {
    if (!file) return
    setImporting(true); setResult(null)
    const reader = new FileReader()
    reader.onload = async e => {
      const wb = XLSX.read(e.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const hdrs = rows[0].map(h => h?.toString().trim())
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''))

      const nameIdx = detectColumn(hdrs, 'name')
      const roleIdx = detectColumn(hdrs, 'role')

      let inserted = 0, skipped = 0
      for (const row of dataRows) {
        const name = nameIdx >= 0 ? row[nameIdx]?.toString().trim() : null
        if (!name) { skipped++; continue }
        const role = roleIdx >= 0 ? row[roleIdx]?.toString().trim() : 'סגל'
        const { error } = await supabase.from('personnel').insert({
          unit_id: currentUnit.id, name, role: role || 'סגל',
          status: 'available', training_status: 'none'
        })
        if (error) skipped++; else inserted++
      }
      setResult({ inserted, skipped, total: dataRows.length })
      setImporting(false)
      if (inserted > 0) showToast(`יובאו ${inserted} אנשים ✅`, 'green')
    }
    reader.readAsBinaryString(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([['שם','תפקיד','סטטוס'],['ישראל ישראלי','סגל','available'],['שרה כהן','מכשיר','available']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'כוח אדם')
    XLSX.writeFile(wb, 'תבנית_כוח_אדם.xlsx')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text3">ייבוא כוח אדם מקובץ Excel — גרור קובץ או לחץ לבחירה</p>
        <button onClick={downloadTemplate} className="btn btn-sm">📥 הורד תבנית</button>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        className="border-2 border-dashed border-border2 rounded-2xl p-10 text-center cursor-pointer hover:border-gold/50 transition-all">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-bold text-text2">{file ? file.name : 'גרור קובץ xlsx / csv לכאן'}</div>
        <div className="text-text3 text-xs mt-1">או לחץ לבחירה</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">👁 תצוגה מקדימה (5 שורות ראשונות)</span>
            <span className="text-text3 text-xs">{headers.length} עמודות זוהו</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead><tr>{headers.map((h,i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>{headers.map((h,j) => <td key={j}>{row[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <button onClick={runImport} disabled={importing}
              className="btn btn-blue w-full">
              {importing ? '⏳ מייבא...' : `📤 ייבא לכוח אדם של ${currentUnit?.name}`}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card p-4 border ${result.inserted > 0 ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
          <div className="font-bold mb-2">{result.inserted > 0 ? '✅ ייבוא הושלם' : '⚠ ייבוא נכשל'}</div>
          <div className="text-sm space-y-1">
            <div className="text-green-400">הוכנסו: {result.inserted} רשומות</div>
            {result.skipped > 0 && <div className="text-red-400">דולגו: {result.skipped} (חסר שם או שגיאה)</div>}
            <div className="text-text3">סה"כ בקובץ: {result.total}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function PersonnelPage() {
  const [tab, setTab] = useState('personnel')

  const tabs = [
    { id: 'personnel', label: '👥 כוח אדם' },
    { id: 'seder',     label: '🕍 שיבוצי ליל הסדר' },
    { id: 'import',    label: '📊 ייבוא אקסל' },
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">👥 כוח אדם ומילואים</h2>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`ftab ${tab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'personnel' && <PersonnelTab />}
      {tab === 'seder'     && <SederTab />}
      {tab === 'import'    && <ImportTab />}
    </div>
  )
}

export default PersonnelPage
