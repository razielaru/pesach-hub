import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'

export default function ChatPage() {
  const { currentUnit, isAdmin, isSenior } = useStore()
  const [channel, setChannel] = useState('כללי') // channel name
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  const CHANNELS = ['כללי', 'לוגיסטיקה', 'כשרות', 'דחוף 🆘']

  useEffect(() => {
    if (!currentUnit) return
    load()

    // Realtime subscription
    const sub = supabase.channel('chat_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages'
      }, payload => {
        if (payload.new.channel_name === channel) {
          setMessages(prev => [...prev, payload.new])
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [currentUnit, channel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_name', channel)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    setLoading(false)
  }

  async function send() {
    if (!text.trim()) return
    const msg = {
      unit_id: currentUnit.id,
      unit_name: currentUnit.name,
      channel_name: channel,
      message: text.trim(),
      is_broadcast: isAdmin || isSenior,
      created_at: new Date().toISOString(),
      id: 'temp_' + Date.now(),
    }
    // Optimistic update — show immediately
    setMessages(prev => [...prev, msg])
    setText('')
    await supabase.from('chat_messages').insert({
      unit_id: msg.unit_id,
      unit_name: msg.unit_name,
      channel_name: msg.channel_name,
      message: msg.message,
      is_broadcast: msg.is_broadcast,
    })
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function timeStr(ts) {
    return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }
  function dateStr(ts) {
    return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
  }

  // Group messages by date
  const grouped = []
  let lastDate = null
  for (const m of messages) {
    const d = dateStr(m.created_at)
    if (d !== lastDate) { grouped.push({ type: 'date', label: d }); lastDate = d }
    grouped.push({ type: 'msg', ...m })
  }

  const unitColors = {}
  const palette = ['text-blue-400','text-green-400','text-purple-400','text-orange-400',
    'text-pink-400','text-cyan-400','text-yellow-400','text-red-400']
  UNITS.forEach((u, i) => { unitColors[u.id] = palette[i % palette.length] })

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xl font-black">💬 צ׳אט יחידות</h2>
        <div className="text-xs text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          חי
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1.5 mb-3 flex-shrink-0 flex-wrap">
        {CHANNELS.map(ch => (
          <button key={ch} onClick={() => setChannel(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
              ${channel === ch
                ? ch === 'דחוף 🆘'
                  ? 'bg-red-900/40 border-red-500/60 text-red-400'
                  : 'bg-yellow-900/30 border-gold/50 text-gold'
                : 'bg-bg2 border-border1 text-text2 hover:border-border2'}`}>
            {ch}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto card p-4 space-y-1 min-h-0">
        {loading && <div className="text-text3 text-sm text-center py-10">טוען...</div>}
        {!loading && messages.length === 0 && (
          <div className="text-text3 text-sm text-center py-10">
            אין הודעות בערוץ זה עדיין.<br/>
            <span className="text-xs">היה הראשון לשלוח! 👇</span>
          </div>
        )}

        {grouped.map((item, i) => {
          if (item.type === 'date') return (
            <div key={`d-${i}`} className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border1" />
              <span className="text-text3 text-xs px-2">{item.label}</span>
              <div className="flex-1 h-px bg-border1" />
            </div>
          )

          const isMe = item.unit_id === currentUnit?.id
          const isBroadcast = item.is_broadcast && !isMe

          return (
            <div key={item.id}
              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
              {/* Avatar */}
              {!isMe && (
                <div className="w-7 h-7 rounded-lg bg-bg3 border border-border1 flex items-center justify-center text-xs flex-shrink-0 mb-0.5">
                  {UNITS.find(u => u.id === item.unit_id)?.icon || '?'}
                </div>
              )}

              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className={`text-[10px] font-bold ${unitColors[item.unit_id] || 'text-text3'} ${isBroadcast ? 'flex items-center gap-1' : ''}`}>
                    {item.unit_name}
                    {isBroadcast && <span className="bg-gold/20 text-gold text-[9px] px-1.5 py-0.5 rounded-full border border-gold/30">שידור</span>}
                  </span>
                )}
                <div className={`
                  px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${isMe
                    ? 'bg-yellow-900/40 border border-gold/30 text-text1 rounded-bl-sm'
                    : isBroadcast
                      ? 'bg-purple-900/30 border border-purple-500/40 text-text1 rounded-br-sm'
                      : 'bg-bg3 border border-border1 text-text1 rounded-br-sm'
                  }
                `}>
                  {item.message}
                </div>
                <span className="text-[10px] text-text3 px-1">{timeStr(item.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 flex-shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={`הודעה לערוץ "${channel}"... (Enter לשליחה)`}
          className="flex-1 form-input resize-none py-2.5 text-sm"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button onClick={send} disabled={!text.trim()}
          className={`btn px-4 flex-shrink-0 transition-all
            ${channel === 'דחוף 🆘' ? 'bg-red-600 hover:bg-red-500 border-red-500' : ''}
            ${!text.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}>
          שלח ↑
        </button>
      </div>
    </div>
  )
}
