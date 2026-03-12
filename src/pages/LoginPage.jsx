import { useState, useEffect } from 'react'
import { UNITS, BRIGADES } from '../lib/units'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'

// Cache גלובלי — נשמר בזיכרון כל עוד הדף פתוח
const LOGIN_CACHE = { logos: null, loaded: false }

export default function LoginPage() {
  const setUnit = useStore(s => s.setUnit)
  const [pinTarget, setPinTarget] = useState(null)
  const [pinVal, setPinVal] = useState('')
  const [pinError, setPinError] = useState('')
  const [unitLogos, setUnitLogos] = useState(LOGIN_CACHE.logos || {})

  const pesach = new Date('2026-04-02')
  const days = Math.max(0, Math.ceil((pesach - new Date()) / 86400000))

  useEffect(() => {
    // אם כבר טענו — לא טוענים שוב
    if (LOGIN_CACHE.loaded) return
    supabase.from('units').select('id,logo_url,pin').then(({ data }) => {
      if (!data) return
      const logos = {}
      data.forEach(u => { if (u.logo_url) logos[u.id] = u.logo_url })
      LOGIN_CACHE.logos = logos
      LOGIN_CACHE.loaded = true
      setUnitLogos(logos)
      data.forEach(row => {
        const u = UNITS.find(x => x.id === row.id)
        if (u && row.pin !== undefined) u.pin = row.pin
      })
    })
  }, [])


  function handleUnitClick(unit) {
    if (unit.pin) {
      setPinTarget(unit)
      setPinVal('')
      setPinError('')
    } else {
      setUnit(unit)
    }
  }

  function pinPress(d) {
    if (pinVal.length >= 4) return
    const next = pinVal + d
    setPinVal(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === pinTarget.pin) {
          setUnit(pinTarget)
          setPinTarget(null)
        } else {
          setPinError('קוד שגוי, נסה שוב')
          setPinVal('')
        }
      }, 120)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{background:'radial-gradient(ellipse at center, #1a1f35 0%, #08090e 70%)'}}>

      {/* Header */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_8px_32px_rgba(212,165,32,.3)]"
        style={{background:'linear-gradient(135deg,#d4a520,#8b6914)'}}>
        ✡
      </div>
      <h1 className="text-3xl font-black mb-1">רבנות פיקוד מרכז</h1>
      <p className="text-gold font-bold mb-1">מבצע פסח תשפ"ו</p>
      <p className="text-text3 text-sm mb-8">⏳ {days} ימים לפסח · בחר יחידה להתחבר</p>

      {/* Units grid */}
      <div className="w-full max-w-4xl space-y-6">
        {BRIGADES.map(brigade => {
          const brigadeUnits = UNITS.filter(u => u.brigade === brigade)
          return (
            <div key={brigade}>
              <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-3 pr-1">
                {brigade}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {brigadeUnits.map(unit => {
                  const logo = unitLogos[unit.id]
                  return (
                    <button key={unit.id}
                      onClick={() => handleUnitClick(unit)}
                      className={`
                        relative bg-bg2 border rounded-xl p-5 text-center
                        hover:-translate-y-1 hover:shadow-xl transition-all duration-200
                        group overflow-hidden
                        ${unit.is_admin
                          ? 'border-yellow-600/50 bg-yellow-900/10'
                          : unit.is_senior
                            ? 'border-purple-500/40 bg-purple-900/8'
                            : 'border-border1 hover:border-border2'}
                      `}>
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5
                        ${unit.is_admin ? 'bg-gold2' : unit.is_senior ? 'bg-purple-500' : 'bg-border2'}
                        opacity-60 group-hover:opacity-100`} />

                      {/* Logo or icon */}
                      <div className="flex justify-center mb-2">
                        {logo
                          ? <img src={logo} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt={unit.name} />
                          : <span className="text-3xl">{unit.icon}</span>}
                      </div>

                      <div className="font-black text-sm">{unit.name}</div>
                      <div className={`text-xs mt-1 ${unit.is_admin ? 'text-gold' : unit.is_senior ? 'text-purple-400' : 'text-text3'}`}>
                        {unit.is_admin ? 'פיקוד — גישה מלאה' : unit.is_senior ? '🔒 דורש קוד' : 'יחידה'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* PIN Modal */}
      {pinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <div className="bg-bg2 border border-gold rounded-2xl p-8 w-80 text-center shadow-2xl">
            {unitLogos[pinTarget.id] && (
              <img src={unitLogos[pinTarget.id]} className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" />
            )}
            <div className="text-xl font-black text-gold mb-1">{pinTarget.name}</div>
            <div className="text-text3 text-sm mb-5">הכנס קוד כניסה (4 ספרות)</div>
            <div className="flex justify-center gap-3 mb-5">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all
                  ${i < pinVal.length ? 'bg-gold scale-110' : 'bg-border2'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                <button key={i}
                  onClick={() => k === '⌫' ? (setPinVal(p=>p.slice(0,-1)), setPinError('')) : k ? pinPress(k) : null}
                  className={`py-3.5 rounded-xl text-lg font-bold transition-all
                    ${k === '⌫' ? 'bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
                      : k ? 'bg-bg3 border border-border2 hover:border-gold hover:text-gold'
                      : 'opacity-0 pointer-events-none'}`}>
                  {k}
                </button>
              ))}
            </div>
            {pinError && <div className="text-red-400 text-xs font-bold mb-2">{pinError}</div>}
            <button onClick={() => { setPinTarget(null); setPinVal(''); setPinError('') }}
              className="text-text3 text-sm hover:text-text1 transition-colors mt-1">
              ← ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
