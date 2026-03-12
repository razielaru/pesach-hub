import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PikudDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUnits: 0,
    avgCleaning: 0,
    totalMissingEquip: 0,
    totalTrained: 0,
    unitDetails: []
  })

  useEffect(() => { loadPikudData() }, [])

  async function loadPikudData() {
    try {
      // משיכת כל הנתונים של כל היחידות בבת אחת (יעיל ומהיר)
      const [uRes, pRes, cRes, eRes] = await Promise.all([
        supabase.from('units').select('id,name,brigade,logo_url,icon'),
        supabase.from('personnel').select('unit_id,training_status'),
        supabase.from('cleaning_areas').select('unit_id,status'),
        supabase.from('equipment').select('unit_id,have,need')
      ])

      const units = uRes.data || []
      const personnel = pRes.data || []
      const cleaning = cRes.data || []
      const equipment = eRes.data || []

      let globalTrained = 0;
      let globalMissing = 0;

      const unitDetails = units.map(u => {
        // חישוב כוח אדם ליחידה
        const uPers = personnel.filter(p => p.unit_id === u.id)
        const trained = uPers.filter(p => p.training_status === 'done').length
        globalTrained += trained

        // חישוב ציוד חסר ליחידה
        const uEquip = equipment.filter(e => e.unit_id === u.id)
        const missing = uEquip.reduce((sum, eq) => sum + Math.max(0, eq.need - eq.have), 0)
        globalMissing += missing

        // חישוב אחוזי ניקיון ליחידה
        const uClean = cleaning.filter(c => c.unit_id === u.id)
        const cleanPct = uClean.length ? Math.round((uClean.filter(c => c.status === 'clean').length / uClean.length) * 100) : 0

        return { ...u, trained, totalPers: uPers.length, missing, cleanPct }
      }).sort((a, b) => a.brigade.localeCompare(b.brigade)) // מיון לפי שיוך למסגרת (אוגדה/חטיבה)

      // ממוצע ניקיון פיקודי
      const avgClean = unitDetails.length > 0 
        ? Math.round(unitDetails.reduce((sum, u) => sum + u.cleanPct, 0) / unitDetails.length) 
        : 0;

      setStats({
        totalUnits: units.length,
        avgCleaning: avgClean,
        totalMissingEquip: globalMissing,
        totalTrained: globalTrained,
        unitDetails
      })
    } catch (error) {
      console.error("Error loading pikud data", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold animate-pulse text-gold">טוען נתוני פיקוד...</div>

  return (
    <div className="space-y-6">
      {/* אזור הכותרת */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border1 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gold">🌍 חפ"ק רבנות — תמונת מצב פיקודית</h2>
          <p className="text-sm text-text3 mt-1">ריכוז נתונים בזמן אמת לכלל יחידות פקמ"ז</p>
        </div>
        
        {/* כפתור ההדפסה שמוסתר בזמן ההדפסה עצמה */}
        <button 
          onClick={() => window.print()} 
          className="print:hidden btn bg-gold text-black border-none hover:bg-gold2 flex items-center gap-2"
        >
          <span className="text-lg">🖨️</span> הפק דו"ח (PDF)
        </button>
      </div>

      {/* מדדים מרכזיים (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center border-t-4 border-t-blue-500">
          <div className="text-3xl font-black">{stats.totalUnits}</div>
          <div className="text-xs text-text3 mt-1 font-bold">יחידות פעילות</div>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-green-500">
          <div className="text-3xl font-black">{stats.avgCleaning}%</div>
          <div className="text-xs text-text3 mt-1 font-bold">ממוצע הכשרות/ניקיון</div>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-orange-500">
          <div className="text-3xl font-black">{stats.totalTrained}</div>
          <div className="text-xs text-text3 mt-1 font-bold">חיילים הוכשרו לפסח</div>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-red-500">
          <div className="text-3xl font-black text-red-400">{stats.totalMissingEquip}</div>
          <div className="text-xs text-text3 mt-1 font-bold">פריטי ציוד חסרים</div>
        </div>
      </div>

      {/* טבלת פירוט היחידות */}
      <div className="card overflow-hidden mt-6">
        <div className="panel-head bg-bg3">
          <span className="panel-title text-sm">📋 פירוט סטטוס לפי יחידה</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-bg2 border-b border-border1 text-text3 text-xs">
              <tr>
                <th className="p-3 font-bold">יחידה</th>
                <th className="p-3 font-bold">שיוך</th>
                <th className="p-3 font-bold">סטטוס ניקיון</th>
                <th className="p-3 font-bold">הוכשרו</th>
                <th className="p-3 font-bold">ציוד חסר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border1/30">
              {stats.unitDetails.map(u => (
                <tr key={u.id} className="hover:bg-bg3/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg4 flex items-center justify-center overflow-hidden border border-border2 flex-shrink-0">
                        {u.logo_url ? <img src={u.logo_url} className="w-full h-full object-cover" /> : <span>{u.icon}</span>}
                      </div>
                      <span className="font-bold">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-text3 text-xs">{u.brigade}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${u.cleanPct >= 80 ? 'text-green-400' : u.cleanPct >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                        {u.cleanPct}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-bg0 overflow-hidden hidden sm:block">
                        <div className={`h-full ${u.cleanPct >= 80 ? 'bg-green-500' : u.cleanPct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${u.cleanPct}%`}} />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="badge badge-dim">{u.trained} / {u.totalPers}</span>
                  </td>
                  <td className="p-3">
                    {u.missing > 0 ? (
                      <span className="badge badge-red">{u.missing} פריטים</span>
                    ) : (
                      <span className="badge badge-green">תקין ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* תאריך ושעת הפקה (מוצג בעיקר בהדפסה) */}
      <div className="text-left text-xs text-text3 mt-8">
        הופק באמצעות מערכת פסח-האב פקמ"ז | {new Date().toLocaleString('he-IL')}
      </div>
    </div>
  )
}
