import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'

const DEFAULT_COORDS = {
  binyamin:     [31.90, 35.22], shomron:      [32.20, 35.20],
  yehuda:       [31.55, 35.10], etzion:       [31.65, 35.12],
  efraim:       [32.10, 35.28], menashe:      [32.35, 35.10],
  habikaa:      [31.85, 35.45], hativa_35:    [31.78, 35.20],
  hativa_89:    [32.05, 34.90], hativa_900:   [31.95, 35.00],
  hativa_other: [32.15, 34.95], ugdat_877:    [31.70, 35.05],
  ugda_96:      [32.30, 35.05], ugda_98:      [31.80, 35.38],
  pikud:        [31.76, 35.21],
}
const HEALTH_COLOR = { green:'#22c55e', orange:'#f97316', red:'#ef4444' }
const HEALTH_LABEL = { green:'תקין ✓', orange:'דורש תשומת לב', red:'⚠ קריטי' }
const PIN_COLORS   = { blue:'#3b82f6', red:'#ef4444', yellow:'#eab308', purple:'#a855f7', white:'#6b7280' }

function secureOffset(lat, lng) {
  const R = 6371000, dist = 300 + Math.random()*400, bear = Math.random()*2*Math.PI
  const dLat = dist*Math.cos(bear)/R*(180/Math.PI)
  const dLng = dist*Math.sin(bear)/(R*Math.cos(lat*Math.PI/180))*(180/Math.PI)
  return [+(lat+dLat).toFixed(5), +(lng+dLng).toFixed(5)]
}

export default function MapView({ unitStats }) {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})
  const [pins, setPins]         = useState([])
  const [selected, setSelected] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)
  const [pinForm, setPinForm]   = useState({ label:'', note:'', color:'blue' })
  const [locating, setLocating] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const canEdit = isAdmin || isSenior
  const nonAdminUnits = UNITS.filter(u => !u.is_admin)

  useEffect(() => { loadPins() }, [])

  async function loadPins() {
    const { data } = await supabase.from('map_pins').select('*').order('created_at',{ascending:false})
    setPins(data || [])
  }

  async function savePin() {
    if (!pinForm.label.trim() || !pendingLatLng) return
    const [lat,lng] = secureOffset(pendingLatLng.lat, pendingLatLng.lng)
    const { error } = await supabase.from('map_pins').insert({
      label:pinForm.label.trim(), note:pinForm.note, color:pinForm.color,
      lat, lng, created_by:currentUnit?.name,
    })
    if (error) { showToast('שגיאה: '+error.message,'red'); return }
    showToast('נקודה נוספה ✅ (מוסטת ~500מ׳)','green')
    setAddModal(false); setPinForm({label:'',note:'',color:'blue'}); loadPins()
  }

  async function deletePin(id) {
    if (!confirm('למחוק נקודה זו?')) return
    await supabase.from('map_pins').delete().eq('id',id)
    showToast('נקודה נמחקה','red'); loadPins()
  }

  function useMyLocation() {
    if (!navigator.geolocation) { showToast('הדפדפן לא תומך במיקום','red'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPendingLatLng({lat:pos.coords.latitude,lng:pos.coords.longitude})
        setPinForm({label:'',note:'',color:'blue'})
        setLocating(false); setAddModal(true)
      },
      () => { showToast('לא ניתן לקבל מיקום','red'); setLocating(false) },
      {timeout:10000,enableHighAccuracy:true}
    )
  }

  // Init map
  useEffect(() => {
    let attempts = 0
    const tryInit = () => {
      if (!mapRef.current || mapInstance.current) return
      if (!window.L) { if (attempts++<30) setTimeout(tryInit,300); return }
      const L = window.L
      const map = L.map(mapRef.current,{center:[31.9,35.15],zoom:9,zoomControl:false,preferCanvas:true})
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map)
      L.control.zoom({position:'topleft'}).addTo(map)
      map.on('click', e => { if (!canEdit) return; setPendingLatLng(e.latlng); setPinForm({label:'',note:'',color:'blue'}); setAddModal(true) })
      mapInstance.current = map; setMapReady(true)
    }
    tryInit()
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  // Unit markers
  useEffect(() => {
    if (!mapReady||!mapInstance.current||!window.L) return
    Object.entries(markersRef.current).filter(([k])=>!k.startsWith('pin_')).forEach(([,m])=>mapInstance.current.removeLayer(m))
    nonAdminUnits.forEach(u => {
      const coords = DEFAULT_COORDS[u.id]; if (!coords) return
      const s = unitStats?.[u.id]||{}, h = s.health||'orange', color = HEALTH_COLOR[h]
      const short = u.name.replace('חטמ"ר ','').replace('חטיבה ','חט ').replace('אוגדת ','אוג ')
      const icon = window.L.divIcon({className:'',html:`<div style="text-align:center;cursor:pointer;direction:rtl"><div style="background:${color};color:#000;font-weight:900;font-size:11px;padding:3px 8px;border-radius:7px;border:2px solid rgba(0,0,0,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4);white-space:nowrap;font-family:Arial,sans-serif">${u.icon} ${short}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin:0 auto"/></div>`,iconSize:[100,42],iconAnchor:[50,42]})
      const marker = window.L.marker(coords,{icon}).addTo(mapInstance.current)
      marker.on('click',e=>{e.originalEvent?.stopPropagation();setSelected({unit:u,stats:s})})
      markersRef.current[u.id] = marker
    })
  }, [unitStats,mapReady])

  // Custom pins
  useEffect(() => {
    if (!mapReady||!mapInstance.current||!window.L) return
    const L = window.L
    Object.keys(markersRef.current).filter(k=>k.startsWith('pin_')).forEach(k=>{mapInstance.current.removeLayer(markersRef.current[k]);delete markersRef.current[k]})
    pins.forEach(pin => {
      const color = PIN_COLORS[pin.color]||'#3b82f6'
      const icon = L.divIcon({className:'',html:`<div style="text-align:center;direction:rtl"><div style="background:${color};color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;border:2px solid rgba(0,0,0,0.25);box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;font-family:Arial,sans-serif">📍 ${pin.label}</div><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color};margin:0 auto"/></div>`,iconSize:[90,32],iconAnchor:[45,32]})
      const marker = L.marker([pin.lat,pin.lng],{icon}).addTo(mapInstance.current)
      if (pin.note) marker.bindTooltip(pin.note,{direction:'top'})
      if (canEdit) marker.on('contextmenu',()=>deletePin(pin.id))
      markersRef.current['pin_'+pin.id] = marker
    })
  }, [pins,mapReady])

  const h = selected?.stats?.health||'orange'

  return (
    <>
      <style>{`.leaflet-tile{filter:none!important}.leaflet-container{background:#a8c8f0!important}`}</style>

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap text-xs text-text3">
            {[['#22c55e','תקין'],['#f97316','דורש תשומת לב'],['#ef4444','קריטי']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5">
                <div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/>
                <span>{l}</span>
              </div>
            ))}
          </div>
          {canEdit && (
            <button onClick={useMyLocation} disabled={locating} className="btn btn-sm"
              style={{background:'rgba(59,130,246,.15)',borderColor:'rgba(59,130,246,.4)',color:'#60a5fa'}}>
              {locating?'⏳ מאתר...':'📍 הוסף מיקום נוכחי'}
            </button>
          )}
        </div>
        {canEdit && <p className="text-xs text-yellow-400/60">לחץ על המפה להוספת נקודה · לחץ ימני על נקודה למחיקה</p>}

        {/* Map */}
        <div style={{height:520,position:'relative',borderRadius:16,overflow:'hidden',border:'1px solid var(--border1)',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
          <div ref={mapRef} style={{height:'100%',width:'100%',direction:'ltr'}}/>
          {selected && (
            <div style={{position:'absolute',bottom:16,left:16,zIndex:9999,pointerEvents:'all',background:'rgba(10,10,14,0.97)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:16,width:240,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',direction:'rtl'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:22}}>{selected.unit.icon}</span>
                  <div><div style={{fontWeight:900,fontSize:13,color:'#f1f1f1'}}>{selected.unit.name}</div><div style={{fontSize:11,color:'#666'}}>{selected.unit.brigade}</div></div>
                </div>
                <button onClick={()=>setSelected(null)} style={{color:'#666',fontSize:18,lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>✕</button>
              </div>
              <div style={{fontSize:11,fontWeight:900,marginBottom:10,padding:'4px 8px',borderRadius:8,textAlign:'center',background:h==='green'?'rgba(34,197,94,.2)':h==='red'?'rgba(239,68,68,.2)':'rgba(249,115,22,.2)',color:h==='green'?'#4ade80':h==='red'?'#f87171':'#fb923c'}}>{HEALTH_LABEL[h]}</div>
              {[['🎓 הכשרה',selected.stats.trainedPct||0],['🧹 ניקיון',selected.stats.cleanPct||0]].map(([label,val])=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,color:'#888',width:65,flexShrink:0}}>{label}</span>
                  <div style={{flex:1,height:5,background:'#2a2a2a',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',borderRadius:99,width:`${val}%`,background:val>=80?'#22c55e':val>=50?'#f97316':'#ef4444'}}/></div>
                  <span style={{fontSize:11,fontWeight:700,color:'#ccc',width:28}}>{val}%</span>
                </div>
              ))}
              {(selected.stats.openInc||0)>0&&<div style={{marginTop:8,color:'#f87171',fontSize:11,fontWeight:700}}>🆘 {selected.stats.openInc} חריגים פתוחים</div>}
            </div>
          )}
        </div>

        {/* Pins list */}
        {pins.length>0&&(
          <div className="card overflow-hidden">
            <div className="panel-head"><span className="panel-title">📍 נקודות על המפה</span><span className="text-text3 text-xs">{pins.length} נקודות</span></div>
            <div className="divide-y divide-border1/50">
              {pins.map(p=>(
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span>📍</span><span className="font-bold flex-1">{p.label}</span>
                  {p.note&&<span className="text-text3 text-xs truncate max-w-xs">{p.note}</span>}
                  <span className="text-text3 text-xs">{p.created_by}</span>
                  {canEdit&&<button onClick={()=>deletePin(p.id)} className="text-red-400/50 hover:text-red-400 text-xs">🗑</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ ADD PIN MODAL — position:fixed, z-index:999999, above everything ══ */}
      {addModal&&(
        <div
          style={{position:'fixed',inset:0,zIndex:999999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)',direction:'rtl'}}
          onClick={e=>{if(e.target===e.currentTarget)setAddModal(false)}}>
          <div style={{background:'#12121a',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:24,width:'90%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.9)'}}>
            {/* Title */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <span style={{fontWeight:900,fontSize:16,color:'#f1f1f1'}}>📍 הוספת נקודה למפה</span>
              <button onClick={()=>setAddModal(false)} style={{color:'#888',fontSize:20,lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>✕</button>
            </div>
            {/* Warning */}
            <div style={{background:'rgba(234,179,8,.1)',border:'1px solid rgba(234,179,8,.3)',borderRadius:10,padding:'8px 12px',marginBottom:16,fontSize:12,color:'#fbbf24'}}>
              🔒 המיקום יוסט ~500מ׳ אקראי לאבטחת מידע
            </div>
            {/* Name — required */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'#888',fontWeight:700,display:'block',marginBottom:6}}>שם הנקודה *</label>
              <input autoFocus
                style={{width:'100%',background:'#1e1e2e',border:'2px solid #333',borderRadius:10,padding:'10px 14px',fontSize:14,color:'#f1f1f1',outline:'none',boxSizing:'border-box',fontFamily:'inherit',direction:'rtl',transition:'border-color .15s'}}
                placeholder="לדוגמה: מחסן כשרות, עמדת בדיקה..."
                value={pinForm.label}
                onChange={e=>setPinForm(f=>({...f,label:e.target.value}))}
                onFocus={e=>e.target.style.borderColor='#ca8a04'}
                onBlur={e=>e.target.style.borderColor='#333'}
                onKeyDown={e=>{if(e.key==='Enter'&&pinForm.label.trim())savePin()}}
              />
            </div>
            {/* Note */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'#888',fontWeight:700,display:'block',marginBottom:6}}>הערה (אופציונלי)</label>
              <input
                style={{width:'100%',background:'#1e1e2e',border:'2px solid #333',borderRadius:10,padding:'10px 14px',fontSize:14,color:'#f1f1f1',outline:'none',boxSizing:'border-box',fontFamily:'inherit',direction:'rtl',transition:'border-color .15s'}}
                placeholder="מידע נוסף..."
                value={pinForm.note}
                onChange={e=>setPinForm(f=>({...f,note:e.target.value}))}
                onFocus={e=>e.target.style.borderColor='#ca8a04'}
                onBlur={e=>e.target.style.borderColor='#333'}
              />
            </div>
            {/* Color */}
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'#888',fontWeight:700,display:'block',marginBottom:8}}>צבע</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[['blue','🔵 כחול'],['red','🔴 אדום'],['yellow','🟡 צהוב'],['purple','🟣 סגול'],['white','⚫ אפור']].map(([c,l])=>(
                  <button key={c} onClick={()=>setPinForm(f=>({...f,color:c}))}
                    style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:`2px solid ${pinForm.color===c?'#ca8a04':'#333'}`,background:pinForm.color===c?'rgba(202,138,4,.2)':'#1e1e2e',color:pinForm.color===c?'#fbbf24':'#888',fontFamily:'inherit'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Buttons */}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setAddModal(false)}
                style={{padding:'10px 20px',borderRadius:10,border:'1px solid #333',background:'transparent',color:'#888',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
                ביטול
              </button>
              <button onClick={savePin} disabled={!pinForm.label.trim()}
                style={{padding:'10px 20px',borderRadius:10,border:'none',background:pinForm.label.trim()?'#ca8a04':'#2a2a2a',color:pinForm.label.trim()?'#000':'#666',fontSize:14,fontWeight:700,cursor:pinForm.label.trim()?'pointer':'default',fontFamily:'inherit'}}>
                📍 הוסף נקודה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
