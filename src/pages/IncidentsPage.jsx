import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getLeafUnits } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

const SEV = { critical:'badge-red', high:'badge-red', medium:'badge-orange', low:'badge-blue' }
const SEV_LABEL = { critical:'🔴 קריטי', high:'🟠 גבוה', medium:'🟡 בינוני', low:'🔵 נמוך' }
const SEV_OPTIONS = [
  { value:'critical', label:'🔴 קריטי — דורש מענה מיידי' },
  { value:'high',     label:'🟠 גבוה — דחוף' },
  { value:'medium',   label:'🟡 בינוני' },
  { value:'low',      label:'🔵 נמוך — לידיעה' },
]

export default function IncidentsPage() {
  const { currentUnit, showToast } = useStore()
  const [incidents, setIncidents] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', severity:'high' })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [classifying, setClassifying] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!currentUnit) return
    load()
    const ch = supabase.channel('inc_page')
      .on('postgres_changes', { event:'*', schema:'public', table:'incidents' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    const subs = getLeafUnits(currentUnit.id)
    const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
    const query = ids.length === 1
      ? supabase.from('incidents').select('*').eq('unit_id', ids[0])
      : supabase.from('incidents').select('*').in('unit_id', ids)
    const { data } = await query.order('created_at', { ascending: false })
    setIncidents(data || [])
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('תמונה גדולה מדי — מקסימום 5MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImagePreview(null); setImageFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function compressImage(file) {
    return new Promise(res => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 900
        const ratio = Math.min(MAX/img.width, MAX/img.height, 1)
        canvas.width = img.width * ratio; canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        res(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // סיווג AI אוטומטי לפי כותרת + תיאור
  async function classifyWithAI() {
    if (!form.title && !form.description) return
    setClassifying(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'classify',
          knowledgeMode: 'none',
          useDualAI: false,
          messages: [{ role: 'user', content:
            `סווג את החריג הבא לפי דחיפות. ענה במילה אחת בלבד: critical / high / medium / low\n\nכותרת: ${form.title}\nתיאור: ${form.description}` }],
          systemPrompt: 'אתה מסווג חריגים צבאיים. ענה במילה אחת בלבד מתוך: critical, high, medium, low. ללא פיסוק.'
        })
      })
      const data = await res.json()
      const sev = data?.text?.trim().toLowerCase().replace(/[^a-z]/g,'')
      if (['critical','high','medium','low'].includes(sev)) {
        setForm(f => ({ ...f, severity: sev }))
        showToast(`AI סיווג: ${sev} ✅`, 'green')
      }
    } catch {}
    setClassifying(false)
  }

  async function save() {
    if (!form.title) return
    let imageData = null
    if (imageFile) {
      try { imageData = await compressImage(imageFile) }
      catch { alert('שגיאה בעיבוד תמונה'); return }
    }
    await supabase.from('incidents').insert({
      unit_id: currentUnit.id, ...form, status: 'open',
      ...(imageData ? { image_url: imageData } : {})
    })
    showToast('חריג דווח — הפיקוד יקבל עדכון 🆘', 'red')
    setModal(false)
    setForm({ title:'', description:'', severity:'high' })
    clearImage()
    load()
  }

  async function updateStatus(id, status) {
    await supabase.from('incidents').update({
      status,
      resolved_at: status==='resolved' ? new Date().toISOString() : null
    }).eq('id', id)
    showToast(status==='resolved' ? 'חריג נסגר ✅' : 'סטטוס עודכן', 'green')
    load()
  }

  const open     = incidents.filter(i => i.status==='open')
  const inProg   = incidents.filter(i => i.status==='in_progress')
  const resolved = incidents.filter(i => i.status==='resolved')

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">🆘 חריגים ובלת"מים</h2>
        <button className="btn btn-red" onClick={()=>setModal(true)}>🆘 דווח חריג</button>
      </div>

      {open.length > 0 && (
        <div className="bg-red-900/20 border-2 border-red-500/60 rounded-xl p-4">
          <div className="font-bold text-red-400 text-sm mb-3">⚠️ חריגים פתוחים — {open.length}</div>
          <div className="space-y-2">
            {open.map(i => <IncidentCard key={i.id} incident={i} onUpdate={updateStatus}/>)}
          </div>
        </div>
      )}

      {inProg.length > 0 && (
        <div className="card">
          <div className="panel-head"><span className="panel-title">🔄 בטיפול</span></div>
          <div className="p-3 space-y-2">{inProg.map(i=><IncidentCard key={i.id} incident={i} onUpdate={updateStatus}/>)}</div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="card opacity-60">
          <div className="panel-head"><span className="panel-title">✅ נסגרו</span></div>
          <div className="p-3 space-y-2">{resolved.map(i=><IncidentCard key={i.id} incident={i} onUpdate={updateStatus}/>)}</div>
        </div>
      )}

      {incidents.length === 0 && (
        <div className="card p-12 text-center text-text3">
          <div className="text-5xl mb-3">✅</div>
          <div className="font-bold">אין חריגים פתוחים</div>
        </div>
      )}

      <Modal open={modal} onClose={()=>{setModal(false);clearImage()}} title="🆘 דיווח חריג">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת החריג</label>
            <input className="form-input" placeholder="לדוג: מדיח תעשייתי מתקלקל"
              value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור מפורט</label>
            <textarea className="form-input h-20 resize-none"
              value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-text3 font-bold">רמת חומרה</label>
              <button onClick={classifyWithAI} disabled={classifying||(!form.title&&!form.description)}
                className="text-xs text-purple-400 border border-purple-500/30 rounded px-2 py-0.5 hover:bg-purple-900/20 disabled:opacity-40 transition-all">
                {classifying ? '⏳ מסווג...' : '🤖 סווג אוטומטי'}
              </button>
            </div>
            <select className="form-input" value={form.severity}
              onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>
              {SEV_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* תמונה */}
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">📷 תמונה (אופציונלי)</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview"
                  className="rounded-xl max-h-44 object-contain border border-border2"/>
                <button onClick={clearImage}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">✕</button>
              </div>
            ) : (
              <label className="btn btn-sm cursor-pointer w-full justify-center"
                style={{background:'rgba(59,130,246,.1)',borderColor:'rgba(59,130,246,.3)',color:'#60a5fa'}}>
                📷 הוסף תמונה (עד 5MB)
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage}/>
              </label>
            )}
          </div>
        </div>
        <ModalButtons onClose={()=>{setModal(false);clearImage()}} onSave={save}
          saveLabel="🆘 שלח דיווח" saveClass="btn-red"/>
      </Modal>
    </div>
  )
}

function IncidentCard({ incident: i, onUpdate }) {
  return (
    <div className="bg-bg3 border border-border2 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`badge ${SEV[i.severity]}`}>{SEV_LABEL[i.severity]}</span>
            <span className="font-bold">{i.title}</span>
          </div>
          {i.description && <p className="text-text2 text-sm">{i.description}</p>}
          {i.image_url && (
            <div className="mt-2">
              <img src={i.image_url} alt="תמונת חריג"
                className="rounded-xl max-h-40 object-contain cursor-pointer border border-border2 hover:border-gold/50 transition-all"
                onClick={() => window.open(i.image_url,'_blank')}/>
            </div>
          )}
          <div className="text-text3 text-xs mt-1">{new Date(i.created_at).toLocaleString('he-IL')}</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {i.status==='open'      && <button className="btn btn-orange btn-sm" onClick={()=>onUpdate(i.id,'in_progress')}>בטיפול</button>}
          {i.status!=='resolved'  && <button className="btn btn-green btn-sm"  onClick={()=>onUpdate(i.id,'resolved')}>✓ נפתר</button>}
        </div>
      </div>
    </div>
  )
}
