// PersonnelPage.jsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import KpiCard from '../components/ui/KpiCard'
import * as XLSX from 'xlsx'
import { getLeafUnits } from '../lib/units'

const STATUS_LABEL = { available:'זמין', zoom:'זום', away:'הגב', leave:'שחרור', unavailable:'אינו זמין' }
const STATUS_CLS   = { available:'badge-green', zoom:'badge-blue', away:'badge-orange', leave:'badge-red', unavailable:'badge-red' }
const STATUS_ICON  = { available:'✅', zoom:'💻', away:'⬅️', leave:'🏠', unavailable:'❌' }
const TR_LABEL     = { none:'טרם', active:'בהכשרה', done:'הוכשר' }
const TR_CLS       = { none:'badge-dim', active:'badge-orange', done:'badge-green' }

// ─── PERSONNEL TAB ────────────────────────────────────────────────────────────
function PersonnelTab() {
  const { currentUnit, showToast } = useStore()
  const [people, setPeople]   = useState([])
  const [posts, setPosts]     = useState([])
  const [modal, setModal]     = useState(false)
  const [postModal, setPostModal] = useState(false)
  const [postForm, setPostForm]   = useState({ name:'', required:1 })
  const [form, setForm]       = useState({ name:'', role:'סגל', status:'available', training_status:'none', post_id:'' })
  const [search, setSearch]   = useState('')
  const [filterPost, setFilterPost] = useState('')

  useEffect(() => { if (currentUnit) { load(); loadPosts() } }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('personnel').select('*').eq('unit_id', ids[0])
      : supabase.from('personnel').select('*').in('unit_id', ids)
    const { data } = await query.order('name')
    setPeople(data || [])
  }

  async function loadPosts() {
    // אוגדה/פיקוד — רואה עמדות של כל היחידות תחתיה
    // יחידת עלה — רק שלה
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('unit_posts').select('*,unit_id').eq('unit_id', ids[0])
      : supabase.from('unit_posts').select('*,unit_id').in('unit_id', ids)
    const { data } = await query.order('name')
    setPosts(data || [])
  }

  async function save() {
    if (!form.name) return
    await supabase.from('personnel').insert({
      unit_id: currentUnit.id, ...form,
      post_id: form.post_id || null
    })
    showToast(`${form.name} נוסף ✅`, 'green')
    setModal(false)
    setForm({ name:'', role:'סגל', status:'available', training_status:'none', post_id:'' })
    load()
  }

  async function savePost() {
    if (!postForm.name) return
    await supabase.from('unit_posts').insert({
      unit_id: currentUnit.id,
      name: postForm.name,
      required: postForm.required || 1
    })
    showToast(`עמדה "${postForm.name}" נוספה ✅`, 'green')
    setPostModal(false)
    setPostForm({ name:'', required:1 })
    loadPosts()
  }

  async function deletePost(id) {
    if (!confirm('למחוק עמדה זו? אנשים המשויכים יהפכו לא משויכים.')) return
    await supabase.from('unit_posts').delete().eq('id', id)
    loadPosts(); load()
  }

  async function setStatus(id, status) {
    await supabase.from('personnel').update({ status }).eq('id', id)
    setPeople(p => p.map(x => x.id===id ? {...x,status} : x))
  }

  async function assignPost(personId, postId) {
    await supabase.from('personnel').update({ post_id: postId || null }).eq('id', personId)
    setPeople(p => p.map(x => x.id===personId ? {...x, post_id: postId||null} : x))
  }

  async function remove(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('personnel').delete().eq('id', id)
    load()
  }

  // ── ניתוח מוכנות כוח אדם ──
  const available = people.filter(p => p.status === 'available')
  const unavailable = people.filter(p => p.status === 'unavailable')

  // מקומות ללא כיסוי מספיק
  const postsWithGap = posts.map(post => {
    const assigned = people.filter(p =>
      p.post_id === post.id && p.status !== 'unavailable'
    ).length
    return { ...post, assigned, gap: Math.max(0, post.required - assigned) }
  })
  const totalGap = postsWithGap.reduce((sum, p) => sum + p.gap, 0)
  const unassigned = people.filter(p => !p.post_id && p.status === 'available').length

  const counts = { available:0, zoom:0, away:0, leave:0, unavailable:0 }
  people.forEach(p => { if (counts[p.status]!==undefined) counts[p.status]++ })

  const filtered = people.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.role.includes(search)
    const matchPost = !filterPost || p.post_id === filterPost
    return matchSearch && matchPost
  })

  return (
    <div className="space-y-5">

      {/* כותרת + כפתורים */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-2 flex-wrap">
          <input className="form-input w-40" placeholder="חיפוש..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-input w-40" value={filterPost} onChange={e=>setFilterPost(e.target.value)}>
            <option value="">כל העמדות</option>
            {posts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__none__">ללא שיוך</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" style={{background:'rgba(139,92,246,.15)',borderColor:'rgba(139,92,246,.4)',color:'#a78bfa'}}
            onClick={()=>setPostModal(true)}>⚙ נהל עמדות</button>
          <button className="btn" onClick={()=>setModal(true)}>+ הוסף</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <KpiCard label="זמין" value={counts.available} color="green" />
        <KpiCard label="זום" value={counts.zoom} color="blue" />
        <KpiCard label="הגב" value={counts.away} color="orange" />
        <KpiCard label="שחרור" value={counts.leave} color="red" />
        <KpiCard label="אינו זמין" value={counts.unavailable} color="red" />
      </div>

      {/* עמדות — סיכום כיסוי */}
      {posts.length > 0 && (
        <div className="card">
          <div className="panel-head">
            <span className="panel-title">📍 כיסוי עמדות</span>
            {totalGap > 0 && <span className="badge badge-red">⚠ {totalGap} חסרים</span>}
            {totalGap === 0 && people.length > 0 && <span className="badge badge-green">✓ מכוסה</span>}
          </div>
          <div className="divide-y divide-border1/50">
            {postsWithGap.map(post => (
              <div key={post.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1">
                  <span className="font-bold text-sm">{post.name}</span>
                  <span className="text-text3 text-xs mr-2">נדרש: {post.required}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${post.gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {post.assigned}/{post.required}
                  </span>
                  {post.gap > 0 && <span className="badge badge-red text-xs">חסר {post.gap}</span>}
                  {post.gap === 0 && post.assigned > 0 && <span className="badge badge-green text-xs">✓ מכוסה</span>}
                </div>
              </div>
            ))}
            {unassigned > 0 && (
              <div className="px-4 py-2 text-xs text-orange-400">
                ⚠ {unassigned} זמינים ללא שיוך לעמדה
              </div>
            )}
          </div>
        </div>
      )}

      {/* רשימת אנשים */}
      <div className="space-y-2">
        {filtered.map(p => {
          const postName = posts.find(x=>x.id===p.post_id)?.name
          return (
            <div key={p.id} className={`card p-3 flex items-center gap-3 ${p.status==='unavailable'?'opacity-60 border-red-500/20':''}`}>
              <div className="w-9 h-9 rounded-full bg-bg4 flex items-center justify-center text-base flex-shrink-0">
                {p.role==='מכשיר'?'🎓':p.role==='ביינש'?'⚖️':p.role==='עורך סדר'?'📜':p.role==='רב'?'✡️':p.role==='קצין בקרה'?'🔍':'👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">
                  {p.name}
                  {p.status==='unavailable' && <span className="text-red-400 text-xs">❌ אינו זמין</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text3 text-xs">{p.role}</span>
                  {postName && <span className="text-purple-400 text-xs">📍 {postName}</span>}
                  {!p.post_id && p.status==='available' && posts.length>0 && <span className="text-orange-400 text-xs">⚠ לא משויך</span>}
                </div>
              </div>
              <span className={`badge text-xs ${TR_CLS[p.training_status]}`}>{TR_LABEL[p.training_status]}</span>
              {/* שיוך עמדה */}
              {posts.length > 0 && (
                <select className="form-input text-xs py-1 w-32 flex-shrink-0"
                  value={p.post_id||''}
                  onChange={e=>assignPost(p.id, e.target.value)}>
                  <option value="">ללא עמדה</option>
                  {posts.map(post=><option key={post.id} value={post.id}>{post.name}</option>)}
                </select>
              )}
              {/* סטטוס */}
              <div className="flex gap-1 flex-wrap">
                {Object.entries(STATUS_LABEL).map(([k,l]) => (
                  <button key={k} onClick={()=>setStatus(p.id,k)} title={l}
                    className={`text-base leading-none transition-all px-0.5 ${p.status===k?'opacity-100 scale-110':'opacity-30 hover:opacity-70'}`}>
                    {STATUS_ICON[k]}
                  </button>
                ))}
              </div>
              <button className="btn btn-red btn-sm flex-shrink-0" onClick={()=>remove(p.id)}>🗑</button>
            </div>
          )
        })}
        {filtered.length === 0 && <div className="card p-8 text-center text-text3">אין אנשים</div>}
      </div>

      {/* Modal — הוספת איש */}
      <Modal open={modal} onClose={()=>setModal(false)} title="➕ הוספת איש צוות">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-text3 font-bold block mb-1">שם + דרגה</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תפקיד</label>
            <select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              <option>מכשיר</option><option>ביינש</option><option>עורך סדר</option><option>קצ"ש</option><option>רב</option><option>קצין בקרה</option><option>סגל</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">סטטוס</label>
            <select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="available">✅ זמין</option>
              <option value="zoom">💻 זום</option>
              <option value="away">⬅️ הגב</option>
              <option value="leave">🏠 שחרור</option>
              <option value="unavailable">❌ אינו זמין</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">הכשרה</label>
            <select className="form-input" value={form.training_status} onChange={e=>setForm(f=>({...f,training_status:e.target.value}))}>
              <option value="none">טרם</option><option value="active">בהכשרה</option><option value="done">הוכשר</option>
            </select>
          </div>
          {posts.length > 0 && (
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">שיוך לעמדה</label>
              <select className="form-input" value={form.post_id} onChange={e=>setForm(f=>({...f,post_id:e.target.value}))}>
                <option value="">ללא עמדה</option>
                {posts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="הוסף" />
      </Modal>

      {/* Modal — ניהול עמדות */}
      <Modal open={postModal} onClose={()=>setPostModal(false)} title="⚙ ניהול עמדות / מקומות">
        <div className="space-y-4">
          {/* רשימה קיימת */}
          {posts.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {postsWithGap.map(post => (
                <div key={post.id} className="flex items-center gap-3 p-2 bg-bg3 rounded-xl">
                  <span className="flex-1 text-sm font-bold">{post.name}</span>
                  <span className="text-xs text-text3">נדרש: {post.required}</span>
                  <span className={`text-xs font-bold ${post.gap>0?'text-red-400':'text-green-400'}`}>
                    {post.assigned} משויכים
                  </span>
                  <button onClick={()=>deletePost(post.id)}
                    className="text-red-400/60 hover:text-red-400 text-sm">🗑</button>
                </div>
              ))}
            </div>
          )}
          {posts.length === 0 && <p className="text-text3 text-sm text-center py-2">אין עמדות מוגדרות</p>}

          {/* הוספת עמדה חדשה */}
          <div className="border-t border-border1 pt-4">
            <p className="text-xs text-text3 font-bold mb-2">הוסף עמדה חדשה</p>
            <div className="flex gap-2">
              <input className="form-input flex-1" placeholder="שם עמדה (מטבח א', עמדת בדיקה...)"
                value={postForm.name} onChange={e=>setPostForm(f=>({...f,name:e.target.value}))} />
              <input type="number" min="1" max="20" className="form-input w-20" placeholder="נדרש"
                value={postForm.required} onChange={e=>setPostForm(f=>({...f,required:parseInt(e.target.value)||1}))} />
              <button className="btn" onClick={savePost}>הוסף</button>
            </div>
            <p className="text-xs text-text3 mt-1">מספר "נדרש" = כמה אנשים חייבים להיות בעמדה זו</p>
          </div>
        </div>
        <ModalButtons onClose={()=>setPostModal(false)} onSave={()=>setPostModal(false)} saveLabel="סגור" />
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
  function openEdit(a) { setEditItem(a); setForm({ base_name:a.base_name, rabbi_name:a.rabbi_name||'', participants:a.participants||'', kit_delivered:a.kit_delivered||false, notes:a.notes||'' }); setModal(true) }

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
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="מוצבים" value={assignments.length} color="blue" />
        <KpiCard label="ערכות נופקו" value={delivered} color="green" />
        <KpiCard label="אחוז מוכנות" value={`${pct}%`} color={pct===100?'green':pct>=50?'orange':'red'} />
      </div>
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
        {assignments.length === 0 && <div className="card p-10 text-center text-text3">אין שיבוצים עדיין</div>}
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
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const FIELD_ALIASES = {
    name: ['שם','name','fullname','שם מלא','שם חייל','שם עובד'],
    role: ['תפקיד','role','תפקיד בצוות'],
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
    const ws = XLSX.utils.aoa_to_sheet([['שם','תפקיד'],['ישראל ישראלי','סגל'],['שרה כהן','מכשיר']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'כוח אדם')
    XLSX.writeFile(wb, 'תבנית_כוח_אדם.xlsx')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text3">ייבוא כוח אדם מקובץ Excel</p>
        <button onClick={downloadTemplate} className="btn btn-sm">📥 הורד תבנית</button>
      </div>
      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        className="border-2 border-dashed border-border2 rounded-2xl p-10 text-center cursor-pointer hover:border-gold/50 transition-all">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-bold text-text2">{file ? file.name : 'גרור קובץ xlsx / csv לכאן'}</div>
        <div className="text-text3 text-xs mt-1">או לחץ לבחירה</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>
      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">👁 תצוגה מקדימה</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead><tr>{headers.map((h,i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{preview.map((row,i) => <tr key={i}>{headers.map((h,j) => <td key={j}>{row[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="p-4">
            <button onClick={runImport} disabled={importing} className="btn btn-blue w-full">
              {importing ? '⏳ מייבא...' : `📤 ייבא לכוח אדם של ${currentUnit?.name}`}
            </button>
          </div>
        </div>
      )}
      {result && (
        <div className={`card p-4 border ${result.inserted > 0 ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
          <div className="font-bold mb-2">{result.inserted > 0 ? '✅ ייבוא הושלם' : '⚠ ייבוא נכשל'}</div>
          <div className="text-sm space-y-1">
            <div className="text-green-400">הוכנסו: {result.inserted} רשומות</div>
            {result.skipped > 0 && <div className="text-red-400">דולגו: {result.skipped}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function PersonnelPage() {
  const [tab, setTab] = useState('personnel')
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">👥 כוח אדם ומילואים</h2>
      <div className="flex gap-2 flex-wrap">
        {[['personnel','👥 כוח אדם'],['seder','🕍 שיבוצי ליל הסדר'],['import','📊 ייבוא אקסל']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`ftab ${tab===id?'active':''}`}>{label}</button>
        ))}
      </div>
      {tab === 'personnel' && <PersonnelTab />}
      {tab === 'seder'     && <SederTab />}
      {tab === 'import'    && <ImportTab />}
    </div>
  )
}

export default PersonnelPage
