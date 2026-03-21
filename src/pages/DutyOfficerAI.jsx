// קצין תורן AI — שאלות על נתוני המערכת בזמן אמת
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { getSubordinateUnits } from '../lib/units'
import { readPageCache, writePageCache } from '../lib/pageCache'

const QUICK_OPS = [
  'איזו יחידה הכי לא מוכנה לפסח?',
  'מה הסיכונים העיקריים מבחינת כשרות?',
  'אילו יחידות צריכות עזרה דחופה?',
  'תן לי תקציר מצב לדיווח לפיקוד',
  'מה עדיפות הטיפול הלילה?',
  'כמה חיילים מוכשרים בסך הכל?',
]

export default function DutyOfficerAI() {
  const { currentUnit } = useStore()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [unitData, setUnitData] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!currentUnit) return
    const cached = readPageCache(`duty-ai:${currentUnit.id}`)
    if (cached) setUnitData(cached)
    loadUnitData()
  }, [currentUnit])

  async function loadUnitData() {
    setLoadingData(true)
    try {
      const subs = getSubordinateUnits(currentUnit.id)
      const ids = subs.length > 0 ? subs.map(u => u.id) : [currentUnit.id]
      const inF = q => ids.length === 1 ? q.eq('unit_id', ids[0]) : q.in('unit_id', ids)

      const [pers, equip, areas, tasks, incs] = await Promise.all([
        inF(supabase.from('personnel').select('unit_id,training_status')),
        inF(supabase.from('equipment').select('unit_id,name,have,need')),
        inF(supabase.from('cleaning_areas').select('unit_id,status')),
        inF(supabase.from('tasks').select('unit_id,status')),
        inF(supabase.from('incidents').select('unit_id,title,severity,status')),
      ])

      const persByUnit = groupByUnit(pers.data || [])
      const equipByUnit = groupByUnit(equip.data || [])
      const areasByUnit = groupByUnit(areas.data || [])
      const tasksByUnit = groupByUnit(tasks.data || [])
      const incsByUnit = groupByUnit(incs.data || [])

      // סיכום לפי יחידה
      const summary = {}
      for (const u of subs.length > 0 ? subs : [currentUnit]) {
        const p  = persByUnit[u.id] || []
        const e  = equipByUnit[u.id] || []
        const a  = areasByUnit[u.id] || []
        const t  = tasksByUnit[u.id] || []
        const i  = (incsByUnit[u.id] || []).filter(x=>x.status==='open')
        summary[u.name] = {
          כוח_אדם: p.length,
          מוכשרים: p.filter(x=>x.training_status==='done').length,
          בהכשרה: p.filter(x=>x.training_status==='active').length,
          ציוד_חסר: e.filter(x=>x.have<x.need).map(x=>`${x.name}(${x.have}/${x.need})`),
          ניקיון_נקי: a.filter(x=>x.status==='clean').length,
          ניקיון_סך: a.length,
          משימות_פתוחות: t.filter(x=>x.status!=='done').length,
          חריגים_פתוחים: i.map(x=>`${x.severity}: ${x.title}`),
        }
      }
      setUnitData(summary)
      writePageCache(`duty-ai:${currentUnit.id}`, summary)
    } catch(e) {
      console.error(e)
    }
    setLoadingData(false)
  }

  function groupByUnit(items) {
    return items.reduce((acc, item) => {
      if (!acc[item.unit_id]) acc[item.unit_id] = []
      acc[item.unit_id].push(item)
      return acc
    }, {})
  }

  async function ask(q) {
    if (!q.trim() || loading || !unitData) return
    const userMsg = { role: 'user', text: q.trim() }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setLoading(true)

    try {
      const res = await fetch('/api/duty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), unitData })
      })
      const data = await res.json()
      const reply = data.text || '❌ לא התקבלה תשובה'
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `❌ שגיאת חיבור: ${e.message}` }])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎖️</span>
          <span className="font-bold text-sm">קצין תורן AI</span>
          {loadingData
            ? <span className="text-text3 text-xs">טוען נתונים...</span>
            : unitData
              ? <span className="flex items-center gap-1 text-green-400 text-xs"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>נתונים עדכניים</span>
              : <span className="text-orange-400 text-xs">לא ניתן לטעון נתונים</span>
          }
        </div>
        <button onClick={loadUnitData} className="btn btn-sm btn-ghost text-xs" disabled={loadingData}>
          🔄 רענן נתונים
        </button>
      </div>

      {/* Chat area */}
      <div className="card p-4 min-h-[280px] max-h-[400px] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6 text-text3">
            <div className="text-4xl mb-2">🎖️</div>
            <div className="font-bold text-sm mb-1">קצין תורן AI</div>
            <div className="text-xs">שאל אותי כל שאלה על מצב היחידות תחת פיקודך</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role==='user' ? 'flex-row-reverse' : 'flex-row'} gap-2 items-end`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-xs flex-shrink-0">🎖️</div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed
              ${m.role==='user'
                ? 'bg-yellow-900/30 border border-gold/30 text-text1 rounded-bl-sm'
                : 'bg-purple-900/20 border border-purple-500/30 text-text1 rounded-br-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-xs">🎖️</div>
            <div className="bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-2xl rounded-br-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                <span className="text-xs text-purple-400 mr-1">מנתח נתונים...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick questions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_OPS.map(q => (
          <button key={q} onClick={() => ask(q)} disabled={loading || !unitData}
            className="text-xs px-3 py-1.5 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-900/40 transition-all disabled:opacity-40">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="שאל שאלה על מצב היחידות..."
          className="flex-1 form-input text-sm"
          disabled={loading || !unitData}
        />
        <button onClick={() => ask(question)} disabled={!question.trim() || loading || !unitData}
          className="btn px-4 bg-purple-900/40 border-purple-500/50 text-purple-300 hover:bg-purple-800/50 disabled:opacity-40">
          שאל ↑
        </button>
      </div>

      {messages.length > 0 && (
        <button onClick={() => setMessages([])} className="text-xs text-text3 hover:text-text1">
          🗑 נקה שיחה
        </button>
      )}
    </div>
  )
}
