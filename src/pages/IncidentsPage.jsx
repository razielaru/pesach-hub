import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/UI/Modal'

const SEV = { critical:'badge-red', high:'badge-red', medium:'badge-orange', low:'badge-blue' }
const SEV_LABEL = { critical:'🔴 קריטי', high:'🟠 גבוה', medium:'🟡 בינוני', low:'🔵 נמוך' }

export default function IncidentsPage() {
  const { currentUnit, showToast } = useStore()
  const [incidents, setIncidents] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', severity:'high' })

  useEffect(() => {
    if (!currentUnit) return
    load()
    const ch = supabase.channel('inc_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents',
        filter: `unit_id=eq.${currentUnit.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    const { data } = await supabase.from('incidents').select('*')
      .eq('unit_id', currentUnit.id).order('created_at', { ascending: false })
    setIncidents(data || [])
  }

  async function save() {
    if (!form.title) return
    await supabase.from('incidents').insert({
      unit_id: currentUnit.id, ...form, status: 'open'
    })
    showToast('חריג דווח — הפיקוד יקבל עדכון 🆘', 'red')
    setModal(false)
    setForm({ title:'', description:'', severity:'high' })
  }

  async function updateStatus(id, status) {
    await supabase.from('incidents').update({ status, resolved_at: status==='resolved' ? new Date().toISOString() : null }).eq('id', id)
    showToast(status === 'resolved' ? 'חריג נסגר ✅' : 'סטטוס עודכן', 'green')
  }

  const open = incidents.filter(i=>i.status==='open')
  const inProg = incidents.filter(i=>i.status==='in_progress')
  const resolved = incidents.filter(i=>i.status==='resolved')

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
            {open.map(i => (
              <IncidentCard key={i.id} incident={i} onUpdate={updateStatus} />
            ))}
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

      <Modal open={modal} onClose={()=>setModal(false)} title="🆘 דיווח חריג">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת החריג</label>
            <input className="form-input" placeholder="לדוג: מדיח תעשייתי מתקלקל" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור מפורט</label>
            <textarea className="form-input h-24 resize-none" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">רמת חומרה</label>
            <select className="form-input" value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>
              <option value="critical">🔴 קריטי — דורש מענה מיידי</option>
              <option value="high">🟠 גבוה — דחוף</option>
              <option value="medium">🟡 בינוני</option>
              <option value="low">🔵 נמוך — לידיעה</option>
            </select>
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={save} saveLabel="🆘 שלח דיווח" saveClass="btn-red" />
      </Modal>
    </div>
  )
}

function IncidentCard({ incident: i, onUpdate }) {
  return (
    <div className="bg-bg3 border border-border2 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${SEV[i.severity]}`}>{SEV_LABEL[i.severity]}</span>
            <span className="font-bold">{i.title}</span>
          </div>
          {i.description && <p className="text-text2 text-sm">{i.description}</p>}
          <div className="text-text3 text-xs mt-1">{new Date(i.created_at).toLocaleString('he-IL')}</div>
        </div>
        <div className="flex gap-2">
          {i.status === 'open' && <button className="btn btn-orange btn-sm" onClick={()=>onUpdate(i.id,'in_progress')}>בטיפול</button>}
          {i.status !== 'resolved' && <button className="btn btn-green btn-sm" onClick={()=>onUpdate(i.id,'resolved')}>✓ נפתר</button>}
        </div>
      </div>
    </div>
  )
}
