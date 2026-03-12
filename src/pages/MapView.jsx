import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'
import Modal, { ModalButtons } from '../components/ui/Modal'

// קואורדינטות ברירת מחדל לכל יחידה
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

const HEALTH_COLOR = { green: '#22c55e', orange: '#f97316', red: '#ef4444' }
const HEALTH_LABEL = { green: 'תקין ✓', orange: 'דורש תשומת לב', red: '⚠ קריטי' }
const PIN_COLORS   = { blue:'#3b82f6', red:'#ef4444', yellow:'#eab308', purple:'#a855f7', white:'#e5e7eb' }

function secureOffset(lat, lng) {
  const R = 6371000
  const dist = 300 + Math.random() * 400
  const bear = Math.random() * 2 * Math.PI
  const dLat = (dist * Math.cos(bear)) / R * (180 / Math.PI)
  const dLng = (dist * Math.sin(bear)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI)
  return [+(lat + dLat).toFixed(5), +(lng + dLng).toFixed(5)]
}

// Force Leaflet tiles to show in full color (override any dark CSS)
const TILE_STYLE = `
  .leaflet-tile { filter: none !important; }
  .leaflet-container { background: #a8c8f0 !important; }
  .leaflet-pane { z-index: 400 !important; }
  .leaflet-top, .leaflet-bottom { z-index: 500 !important; }
`

export default function MapView({ unitStats }) {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})
  const [pins, setPins]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [addModal, setAddModal]   = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)
  const [pinForm, setPinForm]     = useState({ label:'', note:'', color:'blue' })
  const [locating, setLocating]   = useState(false)
  const [mapReady, setMapReady]   = useState(false)

  const canEdit = isAdmin || isSenior
  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  useEffect(() => { loadPins() }, [])

  async function loadPins() {
    const { data } = await supabase.from('map_pins').select('*').order('created_at', { ascending: false })
    setPins(data || [])
  }

  async function savePin() {
    if (!pinForm.label || !pendingLatLng) return
    const [lat, lng] = secureOffset(pendingLatLng.lat, pendingLatLng.lng)
    const { error } = await supabase.from('map_pins').insert({
      label: pinForm.label, note: pinForm.note, color: pinForm.color,
      lat, lng, created_by: currentUnit?.name,
    })
    if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
    showToast('נקודה נוספה ✅ (מוסטת ~500מ׳ לאבטחה)', 'green')
    setAddModal(false); setPinForm({ label:'', note:'', color:'blue' }); loadPins()
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
    // Wait for Leaflet to load (injected via index.html)
    let attempts = 0
    const tryInit = () => {
      if (!mapRef.current) return
      if (!window.L) {
        if (attempts++ < 20) setTimeout(tryInit, 300)
        return
      }
      if (mapInstance.current) return

      const L = window.L
      const map = L.map(mapRef.current, {
        center: [31.9, 35.15],
        zoom: 9,
        zoomControl: false,
        preferCanvas: true,
      })

      // ✅ Colorful OpenStreetMap — NOT dark CartoDB
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map)

      L.control.zoom({ position: 'topleft' }).addTo(map)

      map.on('click', (e) => {
        if (!canEdit) return
        setPendingLatLng(e.latlng)
        setAddModal(true)
      })

      mapInstance.current = map
      setMapReady(true)
    }

    tryInit()
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // ── Unit markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.L) return
    // Remove old unit markers
    Object.entries(markersRef.current)
      .filter(([k]) => !k.startsWith('pin_'))
      .forEach(([, m]) => mapInstance.current.removeLayer(m))

    nonAdminUnits.forEach(u => {
      const coords = DEFAULT_COORDS[u.id]
      if (!coords) return
      const s = unitStats?.[u.id] || {}
      const h = s.health || 'orange'
      const color = HEALTH_COLOR[h]
      const shortName = u.name
        .replace('חטמ"ר ','')
        .replace('חטיבה ','חט ')
        .replace('אוגדת ','אוג ')

      const icon = window.L.divIcon({
        className: '',
        html: `<div style="text-align:center;cursor:pointer;direction:rtl">
          <div style="background:${color};color:#000;font-weight:900;font-size:11px;
            padding:3px 8px;border-radius:7px;border:2px solid rgba(0,0,0,0.3);
            box-shadow:0 2px 8px rgba(0,0,0,0.4);white-space:nowrap;
            font-family:Arial,sans-serif">
            ${u.icon} ${shortName}
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;
            border-right:6px solid transparent;border-top:8px solid ${color};margin:0 auto"/>
        </div>`,
        iconSize: [100, 42], iconAnchor: [50, 42],
      })

      const marker = window.L.marker(coords, { icon }).addTo(mapInstance.current)
      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation()
        setSelected({ unit: u, stats: s })
      })
      markersRef.current[u.id] = marker
    })
  }, [unitStats, mapReady])

  // ── Custom pins ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.L) return
    const L = window.L
    Object.keys(markersRef.current)
      .filter(k => k.startsWith('pin_'))
      .forEach(k => {
        mapInstance.current.removeLayer(markersRef.current[k])
        delete markersRef.current[k]
      })

    pins.forEach(pin => {
      const color = PIN_COLORS[pin.color] || '#3b82f6'
      const icon = L.divIcon({
        className: '',
        html: `<div style="text-align:center;direction:rtl">
          <div style="background:${color};color:#000;font-size:10px;font-weight:800;
            padding:2px 7px;border-radius:5px;border:2px solid rgba(0,0,0,0.25);
            box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;
            font-family:Arial,sans-serif">
            📍 ${pin.label}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;
            border-right:5px solid transparent;border-top:7px solid ${color};margin:0 auto"/>
        </div>`,
        iconSize: [90, 32], iconAnchor: [45, 32],
      })
      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(mapInstance.current)
      if (pin.note) marker.bindTooltip(pin.note, { direction: 'top', permanent: false })
      if (canEdit) marker.on('contextmenu', () => deletePin(pin.id))
      markersRef.current['pin_' + pin.id] = marker
    })
  }, [pins, mapReady])

  const h = selected?.stats?.health || 'orange'

  return (
    <>
      {/* Inject CSS to force colorful tiles and keep modal above map */}
      <style>{TILE_STYLE}</style>

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap text-xs text-text3">
            {[['bg-green-500','תקין'],['bg-orange-500','דורש תשומת לב'],['bg-red-500','קריטי']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${c}`}/>
                <span>{l}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-blue-400"><span>📍</span><span>נקודה מותאמת</span></div>
          </div>
          {canEdit && (
            <button onClick={useMyLocation} disabled={locating}
              className="btn btn-sm flex items-center gap-2"
              style={{background:'rgba(59,130,246,.15)',borderColor:'rgba(59,130,246,.4)',color:'#60a5fa'}}>
              {locating ? '⏳ מאתר...' : '📍 הוסף מיקום נוכחי'}
            </button>
          )}
        </div>

        {canEdit && (
          <p className="text-xs text-yellow-400/60">
            לחץ על המפה להוספת נקודה · לחץ ימני על נקודה למחיקה · המיקום מוסט ~500מ׳ לאבטחה
          </p>
        )}

        {/* Map container — position relative so unit panel can be absolute inside */}
        <div className="rounded-2xl overflow-hidden border border-border1 shadow-2xl"
          style={{ height: '520px', position: 'relative' }}>

          {/* Leaflet map */}
          <div ref={mapRef} style={{ height: '100%', width: '100%', direction: 'ltr' }} />

          {/* Unit detail panel — INSIDE map div, z-index above Leaflet (which is 400-500) */}
          {selected && (
            <div style={{
              position: 'absolute', bottom: '16px', left: '16px',
              zIndex: 9999, pointerEvents: 'all',
              background: 'rgba(15,15,20,0.97)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '16px', width: '240px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'24px' }}>{selected.unit.icon}</span>
                  <div>
                    <div style={{ fontWeight:900, fontSize:'13px', color:'#f1f1f1' }}>{selected.unit.name}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{selected.unit.brigade}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ color:'#888', fontSize:'18px', lineHeight:1, background:'none', border:'none', cursor:'pointer' }}>✕</button>
              </div>

              <div style={{
                fontSize:'11px', fontWeight:900, marginBottom:'12px',
                padding:'4px 8px', borderRadius:'8px', textAlign:'center',
                background: h==='green'?'rgba(34,197,94,.2)':h==='red'?'rgba(239,68,68,.2)':'rgba(249,115,22,.2)',
                color: h==='green'?'#4ade80':h==='red'?'#f87171':'#fb923c',
              }}>
                {HEALTH_LABEL[h]}
              </div>

              {[['🎓 הכשרה', selected.stats.trainedPct||0],['🧹 ניקיון', selected.stats.cleanPct||0]].map(([label,val])=>(
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'11px', color:'#888', width:'70px' }}>{label}</span>
                  <div style={{ flex:1, height:'6px', background:'#2a2a2a', borderRadius:'99px', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:'99px',
                      width:`${val}%`,
                      background: val>=80?'#22c55e':val>=50?'#f97316':'#ef4444'
                    }}/>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:700, color:'#ccc', width:'30px' }}>{val}%</span>
                </div>
              ))}

              {(selected.stats.openInc||0) > 0 && (
                <div style={{ marginTop:'8px', color:'#f87171', fontSize:'11px', fontWeight:700 }}>
                  🆘 {selected.stats.openInc} חריגים פתוחים
                </div>
              )}
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
              {pins.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span>📍</span>
                  <span className="font-bold flex-1">{p.label}</span>
                  {p.note && <span className="text-text3 text-xs truncate max-w-32">{p.note}</span>}
                  <span className="text-text3 text-xs">{p.created_by}</span>
                  {canEdit && (
                    <button onClick={() => deletePin(p.id)}
                      className="text-red-400/50 hover:text-red-400 text-xs transition-colors">🗑</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal — rendered OUTSIDE the map div, with very high z-index */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="📍 הוספת נקודה למפה">
        <div className="space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
            🔒 המיקום יוסט ~500מ׳ אקראי לצורכי אבטחת מידע
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">שם הנקודה *</label>
            <input className="form-input" placeholder="לדוגמה: מחסן כשרות, עמדת בדיקה..."
              value={pinForm.label} onChange={e => setPinForm(f => ({...f, label: e.target.value}))}
              autoFocus />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">הערה (אופציונלי)</label>
            <input className="form-input" placeholder="מידע נוסף..."
              value={pinForm.note} onChange={e => setPinForm(f => ({...f, note: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">צבע</label>
            <div className="flex gap-2 flex-wrap">
              {[['blue','🔵 כחול'],['red','🔴 אדום'],['yellow','🟡 צהוב'],['purple','🟣 סגול'],['white','⚪ לבן']].map(([c,l]) => (
                <button key={c} onClick={() => setPinForm(f => ({...f, color: c}))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${pinForm.color===c ? 'border-gold bg-gold/20 text-gold' : 'border-border2 text-text3 hover:border-border1'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ModalButtons onClose={() => setAddModal(false)} onSave={savePin} saveLabel="📍 הוסף נקודה" />
      </Modal>
    </>
  )
}
