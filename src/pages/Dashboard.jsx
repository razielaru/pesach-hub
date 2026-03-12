import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import KpiCard from '../components/ui/KpiCard'

export default function Dashboard() {
  const { currentUnit, setPage } = useStore()
  const [stats, setStats] = useState({ trained:0, active:0, available:0, missingEquip:0, cleanPct:0, total:0 })
  const [tasks, setTasks] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const days = Math.max(0, Math.ceil((new Date('2026-04-02') - new Date()) / 86400000))

  useEffect(() => {
    if (!currentUnit) return
    load()
    // Realtime subscription for incidents
    const ch = supabase.channel('incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents',
        filter: `unit_id=eq.${currentUnit.id}` },
        () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUnit])

  async function load() {
    const uid = currentUnit.id
    const [pers, equip, areas, openTasks, openInc] = await Promise.all([
      supabase.from('personnel').select('status,training_status').eq('unit_id', uid),
      supabase.from('equipment').select('have,need').eq('unit_id', uid),
      supabase.from('cleaning_areas').select('status').eq('unit_id', uid),
      supabase.from('tasks').select('*').eq('unit_id', uid).neq('status','done').order('created_at', { ascending: false }).limit(4),
      supabase.from('incidents').select('*').eq('unit_id', uid).eq('status','open').order('created_at', { ascending: false }).limit(3),
    ])
    const p = pers.data || []
    const e = equip.data || []
    const a = areas.data || []
    setStats({
      trained: p.filter(x=>x.training_status==='done').length,
      active: p.filter(x=>x.training_status==='active').length,
      available: p.filter(x=>x.status==='available').length,
      missingEquip: e.filter(x=>x.have<x.need).length,
      cleanPct: a.length ? Math.round(a.filter(x=>x.status==='clean').length/a.length*100) : 0,
      total: p.length,
    })
    setTasks(openTasks.data || [])
    setIncidents(openInc.data || [])
    setLoading(false)
  }

  const sevColor = { critical:'text-red-400', high:'text-red-400', medium:'text-orange-400', low:'text-blue-400' }
  const priColor = { urgent:'badge badge-red', high:'badge badge-orange', normal:'badge badge-blue' }
  const priLabel = { urgent:'דחוף', high:'גבוה', normal:'בינוני' }

  if (loading) return <div className="flex items-center justify-center h-64 text-text3">טוען...</div>

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card p-6 bg-gradient-to-l from-[#1a2040] to-bg2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black mb-1">שלום, {currentUnit?.name} 👋</h2>
          <p className="text-text2 text-sm">מבצע פסח תשפ"ו — רבנות פיקוד מרכז</p>
        </div>
        <div className="text-center bg-bg3 rounded-2xl px-8 py-4 border border-border2">
          <div className="text-6xl font-black text-gold2 leading-none">{days}</div>
          <div className="text-text3 text-xs mt-1">ימים לפסח</div>
        </div>
      </div>

      {/* Open incidents alert */}
      {incidents.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => setPage('incidents')}>
          <span className="text-2xl">🆘</span>
          <div>
            <div className="font-bold text-red-400">{incidents.length} חריג{incidents.length > 1 ? 'ים' : ''} פתוח{incidents.length > 1 ? 'ים' : ''}</div>
            <div className="text-xs text-text3">{incidents[0]?.title}</div>
          </div>
          <span className="mr-auto text-red-400 text-sm">← לחץ לפרטים</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="הכשרה הושלמה" value={stats.trained} sub={`מתוך ${stats.total}`} color="green" />
        <KpiCard label="בהכשרה" value={stats.active} color="orange" />
        <KpiCard label="כוח אדם זמין" value={stats.available} sub={`מתוך ${stats.total}`} color="blue" />
        <KpiCard label="ציוד חסר" value={stats.missingEquip} sub="פריטים" color="red" />
        <KpiCard label="ניקיון" value={`${stats.cleanPct}%`} color="gold" />
      </div>

      {/* Tasks + progress */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <div className="panel-head">
            <span className="panel-title">✅ משימות פתוחות</span>
            <button className="btn btn-sm" onClick={() => setPage('tasks')}>הכל ←</button>
          </div>
          <div className="divide-y divide-border1/50">
            {tasks.length === 0 && <p className="p-5 text-text3 text-sm">אין משימות פתוחות 🎉</p>}
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <span className={priColor[t.priority]}>{priLabel[t.priority]}</span>
                <span className="font-bold text-sm">{t.title}</span>
                {t.assigned_by && <span className="badge badge-purple text-xs mr-auto">מ{t.assigned_by}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="panel-head">
            <span className="panel-title">📊 סטטוס מהיר</span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'הכשרות', val: stats.total ? Math.round(stats.trained/stats.total*100) : 0, color: 'bg-green-500' },
              { label: 'ניקיון', val: stats.cleanPct, color: 'bg-gold' },
              { label: 'ציוד', val: stats.missingEquip === 0 ? 100 : 30, color: stats.missingEquip === 0 ? 'bg-green-500' : 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-text2 mb-1">
                  <span>{item.label}</span><span>{item.val}%</span>
                </div>
                <div className="pbar">
                  <div className={`pbar-fill ${item.color}`} style={{ width: `${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
