import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { UNITS } from '../lib/units'

const CHAT_CACHE = {}
const CHANNELS = ['כללי', 'לוגיסטיקה', 'כשרות', 'דחוף 🆘']
const COLOR_PALETTE = ['text-blue-400','text-green-400','text-purple-400','text-orange-400','text-pink-400','text-cyan-400','text-yellow-400','text-red-400']
const UNIT_COLORS = UNITS.reduce((acc, unit, index) => {
  acc[unit.id] = COLOR_PALETTE[index % COLOR_PALETTE.length]
  return acc
}, {})

export default function ChatPage() {
  const { currentUnit, isAdmin, isSenior } = useStore()
  const [channel, setChannel] = useState('כללי')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!currentUnit) return
    const cacheKey = `${currentUnit.id}:${channel}`
    if (CHAT_CACHE[cacheKey]) {
      setMessages(CHAT_CACHE[cacheKey])
      setLoading(false)
    }
    load()
    const sub = supabase.channel('chat_rt_' + channel)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages' },
        payload => {
          if (payload.new.channel_name !== channel) return
          setMessages(prev => {
            const next = prev.some(msg => msg.id === payload.new.id) ? prev : [...prev, payload.new]
            CHAT_CACHE[cacheKey] = next
            return next
          })
        })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [currentUnit, channel])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function load() {
    setLoading(true)
    const cacheKey = `${currentUnit.id}:${channel}`
    const { data } = await supabase.from('chat_messages').select('*')
      .eq('channel_name', channel).order('created_at',{ascending:false}).limit(60)
    const next = [...(data || [])].reverse()
    CHAT_CACHE[cacheKey] = next
    setMessages(next)
    setLoading(false)
  }

  function handleImageSelect(e) {
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function compressImage(file) {
    return new Promise(res => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        const ratio = Math.min(MAX/img.width, MAX/img.height, 1)
        canvas.width = img.width * ratio; canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        res(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async function send() {
    if (!text.trim() && !imageFile) return
    setUploading(true)

    let imageData = null
    if (imageFile) {
      try { imageData = await compressImage(imageFile) }
      catch { alert('שגיאה בעיבוד תמונה'); setUploading(false); return }
    }

    // Optimistic update
    const tempMsg = {
      id: 'temp_' + Date.now(),
      unit_id: currentUnit.id,
      unit_name: currentUnit.name,
      channel_name: channel,
      message: text.trim() || '',
      image_url: imageData,
      is_broadcast: isAdmin || isSenior,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => {
      const next = [...prev, tempMsg]
      CHAT_CACHE[`${currentUnit.id}:${channel}`] = next
      return next
    })
    const sentText = text.trim()
    setText(''); clearImage(); setUploading(false)

    await supabase.from('chat_messages').insert({
      unit_id: currentUnit.id,
      unit_name: currentUnit.name,
      channel_name: channel,
      message: sentText,
      image_url: imageData,
      is_broadcast: isAdmin || isSenior,
    })
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function timeStr(ts) { return new Date(ts).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}) }
  function dateStr(ts)  { return new Date(ts).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'}) }

  const grouped = []
  let lastDate = null
  for (const m of messages) {
    const d = dateStr(m.created_at)
    if (d !== lastDate) { grouped.push({type:'date',label:d}); lastDate = d }
    grouped.push({type:'msg',...m})
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xl font-black">💬 צ׳אט יחידות</h2>
        <div className="text-xs text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>חי
        </div>
      </div>

      {/* Channels */}
      <div className="flex gap-1.5 mb-3 flex-shrink-0 flex-wrap">
        {CHANNELS.map(ch => (
          <button key={ch} onClick={() => setChannel(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
              ${channel===ch
                ? ch==='דחוף 🆘' ? 'bg-red-900/40 border-red-500/60 text-red-400' : 'bg-yellow-900/30 border-gold/50 text-gold'
                : 'bg-bg2 border-border1 text-text2 hover:border-border2'}`}>
            {ch}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto card p-4 space-y-1 min-h-0">
        {loading && <div className="text-text3 text-sm text-center py-10">טוען...</div>}
        {!loading && messages.length===0 && (
          <div className="text-text3 text-sm text-center py-10">אין הודעות בערוץ זה<br/><span className="text-xs">היה הראשון! 👇</span></div>
        )}
        {grouped.map((item, i) => {
          if (item.type==='date') return (
            <div key={`d-${i}`} className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border1"/>
              <span className="text-text3 text-xs px-2">{item.label}</span>
              <div className="flex-1 h-px bg-border1"/>
            </div>
          )
          const isMe = item.unit_id === currentUnit?.id
          const isBroadcast = item.is_broadcast && !isMe
          return (
            <div key={item.id} className={`flex gap-2 ${isMe?'flex-row-reverse':'flex-row'} items-end`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-lg bg-bg3 border border-border1 flex items-center justify-center text-xs flex-shrink-0 mb-0.5">
                  {UNITS.find(u=>u.id===item.unit_id)?.icon||'?'}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe?'items-end':'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className={`text-[10px] font-bold ${UNIT_COLORS[item.unit_id]||'text-text3'} ${isBroadcast?'flex items-center gap-1':''}`}>
                    {item.unit_name}
                    {isBroadcast && <span className="bg-gold/20 text-gold text-[9px] px-1.5 py-0.5 rounded-full border border-gold/30">שידור</span>}
                  </span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${isMe ? 'bg-yellow-900/40 border border-gold/30 text-text1 rounded-bl-sm'
                    : isBroadcast ? 'bg-purple-900/30 border border-purple-500/40 text-text1 rounded-br-sm'
                    : 'bg-bg3 border border-border1 text-text1 rounded-br-sm'}`}>
                  {item.image_url && (
                    <div className={item.message ? 'mb-2' : ''}>
                      <img
                        src={item.image_url}
                        alt="תמונה"
                        className="rounded-xl max-w-full max-h-64 object-contain cursor-pointer"
                        onClick={() => window.open(item.image_url,'_blank')}
                        style={{maxWidth:280}}
                      />
                    </div>
                  )}
                  {item.message && <span>{item.message}</span>}
                </div>
                <span className="text-[10px] text-text3 px-1">{timeStr(item.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-bg3 border border-border2 rounded-xl flex-shrink-0">
          <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-border1"/>
          <div className="flex-1 text-xs text-text3 truncate">{imageFile?.name}</div>
          <button onClick={clearImage} className="text-red-400/70 hover:text-red-400 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-2 flex-shrink-0 items-end">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-bg3 border border-border1 hover:border-gold/50 flex items-center justify-center text-lg transition-all"
          title="הוסף תמונה">
          📷
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect}/>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={`הודעה לערוץ "${channel}"... (Enter לשליחה)`}
          className="flex-1 form-input resize-none py-2.5 text-sm"
          style={{minHeight:44,maxHeight:120}}
          disabled={uploading}
        />
        <button onClick={send} disabled={(!text.trim() && !imageFile) || uploading}
          className={`btn px-4 flex-shrink-0 ${channel==='דחוף 🆘'?'bg-red-600 hover:bg-red-500 border-red-500':''} ${(!text.trim()&&!imageFile)||uploading?'opacity-40 cursor-not-allowed':''}`}>
          {uploading ? '⏳' : 'שלח ↑'}
        </button>
      </div>
    </div>
  )
}
