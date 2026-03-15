import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

// קואורדינטות ברירת מחדל לכל יחידה (פיזור על פי ישובים)
const DEFAULT_COORDS = {
  binyamin:     [31.90, 35.22],
  shomron:      [32.20, 35.20],
  yehuda:       [31.55, 35.10],
  etzion:       [31.65, 35.12],
  efraim:       [32.10, 35.28],
  menashe:      [32.35, 35.10],
  habikaa:      [31.85, 35.45],
  hativa_35:    [31.78, 35.20],
  hativa_89:    [32.05, 34.90],
  hativa_900:   [31.95, 35.00],
  hativa_other: [32.15, 34.95],
  ugdat_877:    [31.70, 35.05],
  ugda_96:      [32.30, 35.05],
  ugda_98:      [31.80, 35.38],
  pikud:        [31.76, 35.21],
}

const HEALTH_COLOR = { green: '#22c55e', orange: '#f97316', red: '#ef4444', gray: '#6b7280' }
const HEALTH_LABEL = { green: 'תקין ✓', orange: 'דורש תשומת לב', red: '⚠ קריטי', gray: 'אין נתונים' }
const PIN_COLORS   = { blue:'#3b82f6', red:'#ef4444', yellow:'#eab308', purple:'#a855f7', white:'#e5e7eb', green:'#22c55e', orange:'#f97316' }
const PIN_TYPES = [
  { value:'general',   label:'📍 כללי',          color:'blue'   },
  { value:'kitchen',   label:'🍳 מטבח',           color:'orange' },
  { value:'storage',   label:'📦 מחסן/אספקה',     color:'purple' },
  { value:'base',      label:'🏕 בסיס/עמדה',      color:'green'  },
  { value:'checkpoint',label:'🔍 עמדת בדיקה',     color:'yellow' },
  { value:'alert',     label:'🆘 דיווח בעיה',     color:'red'    },
]

// הסטה ביטחונית — 300-700 מטר אקראי
function secureOffset(lat, lng) {
  const R = 6371000
  const dist = 300 + Math.random() * 400          // 300-700m
  const bear = Math.random() * 2 * Math.PI
  const dLat = (dist * Math.cos(bear)) / R * (180 / Math.PI)
  const dLng = (dist * Math.sin(bear)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI)
  return [+(lat + dLat).toFixed(5), +(lng + dLng).toFixed(5)]
}

export default function MapView({ unitStats }) {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})
  const [pins, setPins]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [addModal, setAddModal]   = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)   // from map click
  const [pinForm, setPinForm]     = useState({ label:'', note:'', color:'blue', type:'general' })
  const [locating, setLocating]   = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const heatLayerRef = useRef(null)

  const canEdit = isAdmin || isSenior
  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  useEffect(() => { loadPins() }, [])

  async function loadPins() {
    const { data } = await supabase.from('map_pins').select('*').order('created_at', { ascending: false })
    setPins(data || [])
  }

  async function savePin() {
    if (!pendingLatLng) return
    const labelToUse = pinForm.label || (PIN_TYPES.find(t=>t.value===pinForm.type)?.label || '📍 נקודה')
    const [lat, lng] = secureOffset(pendingLatLng.lat, pendingLatLng.lng)
    const { error } = await supabase.from('map_pins').insert({
      label: labelToUse, note: pinForm.note, color: pinForm.color, location_type: pinForm.type,
      lat, lng, created_by: currentUnit?.name,
    })
    if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
    showToast('נקודה נוספה ✅ (מוסטת ~500מ׳ לאבטחה)', 'green')
    setAddModal(false); setPinForm({ label:'', note:'', color:'blue', type:'general' }); loadPins()
  }

  async function deletePin(id) {
    if (!confirm('למחוק נקודה זו?')) return
    await supabase.from('map_pins').delete().eq('id', id)
    showToast('נקודה נמחקה', 'red'); loadPins()
  }

  function useMyLocation() {
    if (!navigator.geolocation) { showToast('הדפדפן לא תומך במיקום', 'red'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        setAddModal(true)
      },
      () => { showToast('לא ניתן לקבל מיקום', 'red'); setLocating(false) },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // ── Init Map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    if (!window.L) { setTimeout(() => {}, 500); return }
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [31.9, 35.15],
      zoom: 9,
      zoomControl: false,
    })

    // צבעוני ויפה — OpenStreetMap ברירת מחדל
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topleft' }).addTo(map)

    map.on('click', (e) => {
      if (!canEdit) return
      setPendingLatLng(e.latlng)
      setAddModal(true)
    })

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // ── Unit markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstance.current) return
    Object.entries(markersRef.current).filter(([k]) => !k.startsWith('pin_'))
      .forEach(([, m]) => mapInstance.current.removeLayer(m))

    nonAdminUnits.forEach(u => {
      const coords = DEFAULT_COORDS[u.id]
      if (!coords) return
      const s = unitStats[u.id] || {}
      const h = s.health || (Object.keys(s).length === 0 ? 'gray' : 'orange')
      const color = HEALTH_COLOR[h]
      const shortName = u.name.replace('חטמ"ר ','').replace('חטיבה ','חט ').replace('אוגדת ','אוג ')

      const icon = window.L.divIcon({
        className: '',
        html: `<div style="text-align:center;cursor:pointer">
          <div style="background:${color};color:#000;font-weight:900;font-size:11px;
            padding:3px 7px;border-radius:6px;border:2px solid rgba(0,0,0,0.25);
            box-shadow:0 3px 10px rgba(0,0,0,0.35);white-space:nowrap">
            ${u.icon} ${shortName}
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;
            border-right:6px solid transparent;border-top:8px solid ${color};margin:0 auto"/>
        </div>`,
        iconSize: [90, 40], iconAnchor: [45, 40],
      })

      const marker = window.L.marker(coords, { icon }).addTo(mapInstance.current)
      marker.on('click', (e) => { e.originalEvent.stopPropagation(); setSelected({ unit: u, stats: s }) })
      markersRef.current[u.id] = marker
    })
  }, [unitStats])

  // ── Custom pins ───────────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstance.current) return
    Object.keys(markersRef.current).filter(k => k.startsWith('pin_'))
      .forEach(k => { mapInstance.current.removeLayer(markersRef.current[k]); delete markersRef.current[k] })

    pins.forEach(pin => {
      const color = PIN_COLORS[pin.color] || '#3b82f6'
      const icon = L.divIcon({
        className: '',
        html: `<div style="text-align:center">
          <div style="background:${color};color:#000;font-size:10px;font-weight:800;
            padding:2px 7px;border-radius:5px;border:2px solid rgba(0,0,0,0.2);
            box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap">
            📍 ${pin.label}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;
            border-right:5px solid transparent;border-top:7px solid ${color};margin:0 auto"/>
        </div>`,
        iconSize: [80, 30], iconAnchor: [40, 30],
      })
      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(mapInstance.current)
      if (pin.note) marker.bindTooltip(pin.note, { direction: 'top' })
      if (canEdit) marker.on('contextmenu', () => deletePin(pin.id))
      markersRef.current['pin_' + pin.id] = marker
    })
  }, [pins])

  // ── Heat Map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.L) return
    // הסר שכבה קיימת
    if (heatLayerRef.current) {
      mapInstance.current.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }
    if (!showHeatmap) return

    // בנה נקודות heat לפי מספר חריגים + ציוד חסר
    const points = []
    Object.entries(unitStats || {}).forEach(([uid, s]) => {
      const coords = DEFAULT_COORDS[uid]
      if (!coords) return
      const intensity = (s.openInc || 0) * 3 + (s.equipMissing || 0)
      if (intensity > 0) {
        // כמה נקודות לפי עצמה
        for (let i = 0; i < Math.min(intensity, 10); i++) {
          const jitter = 0.01
          points.push([
            coords[0] + (Math.random()-0.5)*jitter,
            coords[1] + (Math.random()-0.5)*jitter,
            intensity / 10
          ])
        }
      }
    })

    if (points.length === 0) {
      // הצג הודעה קטנה על המפה שאין נתוני בעיות
      const noDataDiv = window.L.divIcon({
        className: '',
        html: '<div style="background:rgba(0,0,0,0.7);color:#888;padding:6px 12px;border-radius:8px;font-size:12px;white-space:nowrap">אין בעיות לתצוגת heat map</div>',
        iconSize: [200, 30]
      })
      const m = window.L.marker([31.9, 35.15], { icon: noDataDiv }).addTo(heatGroup)
      heatGroup.addTo(mapInstance.current)
      heatLayerRef.current = heatGroup
      return
    }

    // Leaflet heat בסיסי — ריבועים צבעוניים כ-fallback (אין leaflet.heat ב-CDN)
    const heatGroup = window.L.layerGroup()
    points.forEach(([lat, lng, val]) => {
      const size = Math.max(20, val * 40)
      const alpha = Math.min(0.7, val * 0.8)
      const color = val > 0.6 ? '#ef4444' : val > 0.3 ? '#f97316' : '#eab308'
      window.L.circle([lat, lng], {
        radius: size * 50,
        color: 'transparent',
        fillColor: color,
        fillOpacity: alpha,
      }).addTo(heatGroup)
    })
    heatGroup.addTo(mapInstance.current)
    heatLayerRef.current = heatGroup
  }, [showHeatmap, unitStats])


  const h = selected?.stats?.health || 'orange'

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap text-xs text-text3">
          {[['bg-green-500','תקין'],['bg-orange-500','דורש תשומת לב'],['bg-red-500','קריטי'],['bg-gray-500','אין נתונים']].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${c}`}/><span>{l}</span></div>
          ))}
          <div className="flex items-center gap-1.5 text-blue-400"><span>📍</span><span>נקודה מותאמת</span></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowHeatmap(h => !h)}
            className={`btn btn-sm flex items-center gap-2 transition-all ${showHeatmap
              ? 'bg-red-900/40 border-red-500/60 text-red-400'
              : 'bg-bg3 border-border1 text-text3 hover:text-text1'}`}>
            🌡️ {showHeatmap ? 'הסתר Heat Map' : 'הצג Heat Map'}
          </button>
          {canEdit && (
            <button onClick={useMyLocation} disabled={locating}
              className="btn btn-sm flex items-center gap-2"
              style={{background:'rgba(59,130,246,.15)',borderColor:'rgba(59,130,246,.4)',color:'#60a5fa'}}>
              {locating ? '⏳ מאתר...' : '📍 הוסף מיקום נוכחי'}
            </button>
          )}
        </div>
      </div>

      {canEdit && <p className="text-xs text-yellow-400/60">לחץ על המפה להוספת נקודה · לחץ ימני על נקודה למחיקה · המיקום מוסט ~500מ׳ לאבטחה</p>}

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-border1 shadow-2xl" style={{height:'520px'}}>
        <div ref={mapRef} style={{height:'100%',width:'100%',direction:'ltr'}} />

        {/* Unit detail panel — over map, high z-index */}
        {selected && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-bg1/97 backdrop-blur-md border border-border1 rounded-2xl p-4 w-60 shadow-2xl"
            style={{pointerEvents:'all'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selected.unit.icon}</span>
                <div>
                  <div className="font-black text-sm">{selected.unit.name}</div>
                  <div className="text-text3 text-xs">{selected.unit.brigade}</div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="text-text3 hover:text-text1 text-xl leading-none">✕</button>
            </div>
            <div className={`text-xs font-black mb-3 px-2 py-1 rounded-lg text-center
              ${h==='green'?'bg-green-900/40 text-green-400':h==='red'?'bg-red-900/40 text-red-400':'bg-orange-900/40 text-orange-400'}`}>
              {HEALTH_LABEL[h]}
            </div>
            {[['🎓 הכשרה', selected.stats.trainedPct||0],['🧹 ניקיון', selected.stats.cleanPct||0]].map(([label,val])=>(
              <div key={label} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-text3 w-20">{label}</span>
                <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${val>=80?'bg-green-500':val>=50?'bg-orange-500':'bg-red-500'}`} style={{width:`${val}%`}}/>
                </div>
                <span className="text-xs font-bold text-text2 w-8">{val}%</span>
              </div>
            ))}
            {selected.stats.openInc > 0 && <div className="mt-2 text-red-400 text-xs font-bold">🆘 {selected.stats.openInc} חריגים פתוחים</div>}
          </div>
        )}
      </div>

      {/* Pins list */}
      {pins.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">📍 נקודות על המפה</span>
            <span className="text-text3 text-xs">{pins.length} נקודות · מוצגות בהסטה ביטחונית</span>
          </div>
          <div className="divide-y divide-border1/50">
            {pins.map(p=>(
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span>📍</span>
                <span className="font-bold flex-1">{p.label}</span>
                {p.note && <span className="text-text3 text-xs truncate max-w-32">{p.note}</span>}
                <span className="text-text3 text-xs">{p.created_by}</span>
                {canEdit && <button onClick={()=>deletePin(p.id)} className="text-red-400/50 hover:text-red-400 text-xs">🗑</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add pin modal — high z-index, outside map div */}
      <Modal open={addModal} onClose={()=>setAddModal(false)} title="📍 הוספת נקודה למפה">
        <div className="space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
            🔒 המיקום יוסט ~500מ׳ אקראי לצורכי אבטחת מידע
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">שם הנקודה *</label>
            {/* סוג מיקום */}
            <div className="grid grid-cols-3 gap-1.5 mb-1">
              {PIN_TYPES.map(t => (
                <button key={t.value} onClick={() => setPinForm(f => ({...f, type:t.value, color:t.color}))}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${pinForm.type===t.value
                    ? 'bg-gold/20 border-gold/60 text-gold' : 'bg-bg3 border-border1 text-text2 hover:border-border2'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <input className="form-input" placeholder="שם הנקודה (אופציונלי — ברירת מחדל לפי סוג)"
              value={pinForm.label} onChange={e=>setPinForm(f=>({...f,label:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&savePin()}/>
            <input className="form-input" placeholder="לדוגמה: מחסן כשרות, עמדת בדיקה..."
              style={{display:'none'}}
              value={pinForm.label} onChange={e=>setPinForm(f=>({...f,label:e.target.value}))}
              autoFocus />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">הערה (אופציונלי)</label>
            <input className="form-input" placeholder="מידע נוסף..."
              value={pinForm.note} onChange={e=>setPinForm(f=>({...f,note:e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">צבע</label>
            <div className="flex gap-2 flex-wrap">
              {[['blue','🔵 כחול'],['red','🔴 אדום'],['yellow','🟡 צהוב'],['purple','🟣 סגול'],['white','⚪ לבן']].map(([c,l])=>(
                <button key={c} onClick={()=>setPinForm(f=>({...f,color:c}))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${pinForm.color===c?'border-gold bg-gold/20 text-gold':'border-border2 text-text3 hover:border-border1'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ModalButtons onClose={()=>setAddModal(false)} onSave={savePin} saveLabel="📍 הוסף נקודה" />
      </Modal>
    </div>
  )
}
