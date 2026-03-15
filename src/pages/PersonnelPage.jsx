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
  const [posts, setPosts]         = useState([]) 
  const [modal,  setModal]        = useState(false)
  const [form,   setForm]         = useState({ name:'', role:'סגל', status:'available', targetUnit:'', post_id:'' })
  const [search, setSearch]       = useState('')

  const leafUnits = getLeafUnits(currentUnit.id)
  const canManageMultiple = leafUnits.length > 0

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    try {
      const ids = leafUnits.length > 0 ? leafUnits.map(u => u.id) : [currentUnit.id]
      
      const [persRes, postsRes] = await Promise.all([
        ids.length === 1
          ? supabase.from('personnel').select('*').eq('unit_id', ids[0]).order('name')
          : supabase.from('personnel').select('*').in('unit_id', ids).order('name'),
        ids.length === 1
          ? supabase.from('unit_posts').select('*').eq('unit_id', ids[0]).order('name')
          : supabase.from('unit_posts').select('*').in('unit_id', ids).order('name')
      ])

      setPeople(persRes.data || [])
      setPosts(postsRes.data || [])
    } catch { setPeople([]); setPosts([]) }
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
      name: form.name, 
      role: form.role,
      status: form.status, 
      post_id: form.post_id || null, 
      training_status: 'none'
    })
    
    showToast(`${form.name} נוסף ✅`, 'green')
    setModal(false)
    setForm({ name:'', role:'סגל', status:'available', targetUnit:'', post_id:'' })
    load()
  }

  async function setStatus(id, status) {
    await supabase.from('personnel').update({ status }).eq('id', id)
    setPeople(p => p.map(x => x.id===id ? {...x,status} : x))
  }

  async function assignPost(personId, postId) {
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
    setPeople(p => p.map(x => x.id === personId ? { ...x, post_id: postId || null } : x))
    showToast('שיוך עודכן בהצלחה', 'green')
  }

  async function remove(id) {
    if (!confirm('למחוק איש צוות זה?')) return
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
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-bg2 text-text3 px-1.5 py-0.5 rounded">{p.role}</span>
                {canManageMultiple && p.unit_id !== currentUnit.id && <span className="text-[10px] text-text3 px-1">· {unitLabel(p.unit_id)}</span>}
                
                <select 
                  className="bg-transparent border-none outline-none cursor-pointer text-gold text-[11px] hover:bg-bg3 rounded px-1 transition-colors w-32 truncate"
                  value={p.post_id || ''}
                  onChange={e => assignPost(p.id, e.target.value)}
                  disabled={p.status === 'unavailable'}
                >
                  <option value="">ללא שיוך למקום</option>
                  {posts.filter(post => !canManageMultiple || post.unit_id === p.unit_id).map(post => (
                    <option key={post.id} value={post.id}>{post.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-0.5 flex-shrink-0 ml-auto">
              {Object.entries(STATUS_ICON).map(([k,icon]) => (
                <button key={k} title={STATUS_LABEL[k]} onClick={()=>setStatus(p.id,k)}
                  className={`text-sm px-0.5 transition-all leading-none ${p.status===k?'opacity-100 scale-110':'opacity-25 hover:opacity-60'}`}>{icon}</button>
              ))}
            </div>
            <button className="btn btn-red btn-sm flex-shrink-0 w-7 h-7 p-0 flex items-center justify-center ml-2" onClick={()=>remove(p.id)}>🗑</button>
          </div>
        ))}
        {filtered.length===0 && <div className="card p-8 text-center text-text3">אין אנשים — לחץ "+ הוסף איש צוות"</div>}
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
              <select className="form-input" value={form.targetUnit} onChange={e=>setForm(f=>({...f,targetUnit:e.target.value, post_id:''}))}>
                <option value="">בחר יחידה...</option>
                {leafUnits.map(u=><option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="text-xs text-text3 font-bold block mb-1">שיוך למקום (אופציונלי)</label>
            <select className="form-input border-gold/50 text-gold" value={form.post_id} onChange={e=>setForm(f=>({...f,post_id:e.target.value}))}>
              <option value="">-- ללא שיוך --</option>
              {posts.filter(p => !canManageMultiple || p.unit_id === (form.targetUnit || currentUnit.id)).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.type || 'כללי'})</option>
              ))}
            </select>
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף למערכת"/>
      </Modal>
    </div>
  )
}

function SederTab() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [assignments, setAssignments] = useState([])
  const [modal, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ base_name:'', rabbi_name:'', participants:'', kit_delivered:false, notes:'' })
  const canEdit = isAdmin || isSenior

  useEffect(() => { load() }, [currentUnit])

  async function load() {
    const q = (isAdmin||isSenior)
      ? supabase.from('seder_assignments').select('*').order('base_name')
      : supabase.from('seder_assignments').select('*').eq('unit_id', currentUnit.id).order('base_name')
    const { data } = await q
    setAssignments(data || [])
  }

  function openAdd()  { setEditItem(null); setForm({base_name:'',rabbi_name:'',participants:'',kit_delivered:false,notes:''}); setModal(true) }
  function openEdit(a){ setEditItem(a);    setForm({base_name:a.base_name,rabbi_name:a.rabbi_name||'',participants:a.participants||'',kit_delivered:a.kit_delivered||false,notes:a.notes||''}); setModal(true) }

  async function save() {
    if (!form.base_name) return
    const payload = { ...form, participants: form.participants ? parseInt(form.participants) : null, unit_id: currentUnit.id }
    if (editItem) await supabase.from('seder_assignments').update(payload).eq('id', editItem.id)
    else          await supabase.from('seder_assignments').insert(payload)
    showToast(editItem?'עודכן ✅':'נוסף ✅','green'); setModal(false); load()
  }

  async function toggleKit(id, cur) {
    await supabase.from('seder_assignments').update({ kit_delivered: !cur }).eq('id', id)
    setAssignments(p => p.map(a => a.id===id ? {...a,kit_delivered:!cur} : a))
  }

  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('seder_assignments').delete().eq('id', id); load()
  }

  const delivered = assignments.filter(a=>a.kit_delivered).length
  const pct = assignments.length ? Math.round(delivered/assignments.length*100) : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="מוצבים" value={assignments.length} color="blue"/>
        <KpiCard label="ערכות נופקו" value={delivered} color="green"/>
        <KpiCard label="מוכנות" value={`${pct}%`} color={pct===100?'green':pct>=50?'orange':'red'}/>
      </div>
      {assignments.length>0 && (
        <div className="card p-4">
          <div className="flex justify-between text-xs text-text3 mb-2">
            <span>ניפוק ערכות ליל הסדר</span>
            <span className="font-bold">{delivered}/{assignments.length}</span>
          </div>
          <div className="h-3 bg-bg3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct===100?'bg-green-500':pct>=50?'bg-orange-500':'bg-red-500'}`}
              style={{width:`${pct}%`}}/>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <span className="text-sm text-text3">{isAdmin||isSenior?'כל היחידות':currentUnit?.name}</span>
        <button className="btn" onClick={openAdd}>+ הוסף מוצב</button>
      </div>
      <div className="space-y-2">
        {assignments.length===0 && <div className="card p-10 text-center text-text3">אין שיבוצים עדיין</div>}
        {assignments.map(a=>(
          <div key={a.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{a.base_name}</div>
              {a.rabbi_name && <div className="text-text3 text-xs">✡ {a.rabbi_name}</div>}
              {a.participants && <div className="text-text3 text-xs">👥 {a.participants} משתתפים</div>}
              {a.notes && <div className="text-text3 text-xs mt-1">📝 {a.notes}</div>}
            </div>
            <button onClick={()=>toggleKit(a.id,a.kit_delivered)}
              className={`badge cursor-pointer ${a.kit_delivered?'badge-green':'badge-dim'}`}>
              {a.kit_delivered?'✅ ערכה נופקה':'⏳ ממתין'}
            </button>
            {canEdit && (
              <>
                <button className="btn btn-sm" onClick={()=>openEdit(a)}>✏️</button>
                <button className="btn btn-red btn-sm" onClick={()=>remove(a.id)}>🗑</button>
              </>
            )}
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title={editItem?'✏️ עריכת שיבוץ':'➕ הוספת מוצב'}>
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">שם המוצב *</label>
            <input className="form-input" value={form.base_name} onChange={e=>setForm(f=>({...f,base_name:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text3 font-bold block mb-1">עורך הסדר / הרב</label>
              <input className="form-input" value={form.rabbi_name} onChange={e=>setForm(f=>({...f,rabbi_name:e.target.value}))}/></div>
            <div><label className="text-xs text-text3 font-bold block mb-1">כמות משתתפים</label>
              <input type="number" className="form-input" value={form.participants} onChange={e=>setForm(f=>({...f,participants:e.target.value}))}/></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.kit_delivered}
              onChange={e=>setForm(f=>({...f,kit_delivered:e.target.checked}))} className="w-4 h-4 accent-gold"/>
            <span className="text-sm">ערכת ליל הסדר נופקה</span>
          </label>
          <div><label className="text-xs text-text3 font-bold block mb-1">הערות</label>
            <input className="form-input" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel={editItem?'💾 שמור':'➕ הוסף'}/>
      </Modal>
    </div>
  )
}

function ImportTab() {
  const { currentUnit, showToast } = useStore()
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState([])
  const [headers, setHeaders] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult]   = useState(null)
  const fileRef = useRef()

  function detectCol(hdrs, aliases) {
    return hdrs.findIndex(h => aliases.some(a => h?.toString().trim().toLowerCase()===a.toLowerCase()))
  }

  function handleFile(f) {
    if (!f) return
    setFile(f); setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type:'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header:1 })
      if (!rows.length) return
      const hdrs = rows[0].map(h=>h?.toString().trim())
      setHeaders(hdrs)
      setPreview(rows.slice(1,6).map(row=>hdrs.reduce((obj,h,i)=>({...obj,[h]:row[i]}),{})))
    }
    reader.readAsBinaryString(f)
  }

  async function runImport() {
    if (!file) return
    setImporting(true); setResult(null)
    const reader = new FileReader()
    reader.onload = async e => {
      const wb = XLSX.read(e.target.result, { type:'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header:1 })
      const hdrs = rows[0].map(h=>h?.toString().trim())
      const dataRows = rows.slice(1).filter(r=>r.some(c=>c!==undefined&&c!==''))
      const nameIdx = detectCol(hdrs, ['שם','name','fullname','שם מלא','שם חייל'])
      const roleIdx = detectCol(hdrs, ['תפקיד','role'])
      let inserted=0, skipped=0
      for (const row of dataRows) {
        const name = nameIdx>=0 ? row[nameIdx]?.toString().trim() : null
        if (!name) { skipped++; continue }
        const role = roleIdx>=0 ? row[roleIdx]?.toString().trim() : 'סגל'
        const { error } = await supabase.from('personnel').insert({
          unit_id: currentUnit.id, name, role: role||'סגל',
          status: 'available', training_status: 'none'
        })
        if (error) skipped++; else inserted++
      }
      setResult({ inserted, skipped, total: dataRows.length })
      setImporting(false)
      if (inserted>0) showToast(`יובאו ${inserted} אנשים ✅`,'green')
    }
    reader.readAsBinaryString(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([['שם','תפקיד'],['ישראל ישראלי','סגל'],['שרה כהן','מכשיר']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'כוח אדם')
    XLSX.writeFile(wb, 'תבנית_כוח_אדם.xlsx')
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text3">ייבוא מקובץ Excel</p>
        <button onClick={downloadTemplate} className="btn btn-sm">📥 הורד תבנית</button>
      </div>
      <div onClick={()=>fileRef.current?.click()}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0])}}
        className="border-2 border-dashed border-border2 rounded-2xl p-10 text-center cursor-pointer hover:border-gold/50 transition-all">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-bold text-text2">{file?file.name:'גרור קובץ xlsx/csv לכאן'}</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e=>handleFile(e.target.files[0])}/>
      </div>
      {preview.length>0 && (
        <div className="card overflow-hidden">
          <div className="panel-head"><span className="panel-title">👁 תצוגה מקדימה</span></div>
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
              <tbody>{preview.map((row,i)=><tr key={i}>{headers.map((h,j)=><td key={j}>{row[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="p-4">
            <button onClick={runImport} disabled={importing} className="btn btn-blue w-full">
              {importing?'⏳ מייבא...':`📤 ייבא לכוח אדם של ${currentUnit?.name}`}
            </button>
          </div>
        </div>
      )}
      {result && (
        <div className={`card p-4 border ${result.inserted>0?'border-green-500/30 bg-green-900/10':'border-red-500/30 bg-red-900/10'}`}>
          <div className="font-bold mb-1">{result.inserted>0?'✅ ייבוא הושלם':'⚠ נכשל'}</div>
          <div className="text-sm text-green-400">הוכנסו: {result.inserted}</div>
          {result.skipped>0 && <div className="text-sm text-red-400">דולגו: {result.skipped}</div>}
        </div>
      )}
    </div>
  )
}

export function PersonnelPage() {
  const [tab, setTab] = useState('personnel')
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">👥 ניהול כוח אדם</h2>
      <div className="flex gap-2 flex-wrap">
        {[['personnel','👥 כוח אדם'],['seder','🕍 ליל הסדר'],['import','📊 ייבוא']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} className={`ftab ${tab===id?'active':''}`}>{l}</button>
        ))}
      </div>
      {tab==='personnel' && <PersonnelTab/>}
      {tab==='seder'     && <SederTab/>}
      {tab==='import'    && <ImportTab/>}
    </div>
  )
}
export default PersonnelPage
