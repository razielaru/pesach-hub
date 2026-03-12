import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'

const CATEGORIES = ['כשרות','הגעלה','ניקיון','בדיקת חמץ','הסדר','כללי']
const VIDEO_CATEGORIES = ['כשרות','פסח','שבת','תפילה','כללי']

// ─── VIDEOS TAB ───────────────────────────────────────────────────────────────
function VideosTab() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [videos, setVideos] = useState([])
  const [modal, setModal] = useState(false)
  const [playing, setPlaying] = useState(null)
  const [filterCat, setFilterCat] = useState('הכל')
  const [form, setForm] = useState({ title:'', url:'', category:'כשרות', description:'' })
  const canEdit = isAdmin || isSenior

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('training_videos').select('*').order('created_at',{ascending:false})
    setVideos(data || [])
  }
  function getYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\n]+)/)
    return m ? m[1] : null
  }
  async function addVideo() {
    if (!form.title || !form.url) return
    const ytId = getYoutubeId(form.url)
    if (!ytId) { showToast('קישור יוטיוב לא תקין','red'); return }
    await supabase.from('training_videos').insert({ title:form.title, url:form.url, youtube_id:ytId, category:form.category, description:form.description, added_by:currentUnit?.name, is_global:true })
    showToast('סרטון נוסף ✅','green'); setModal(false); setForm({title:'',url:'',category:'כשרות',description:''}); load()
  }
  async function deleteVideo(id) {
    if (!confirm('למחוק?')) return
    await supabase.from('training_videos').delete().eq('id',id)
    showToast('נמחק','red'); load()
  }
  const filtered = filterCat==='הכל' ? videos : videos.filter(v=>v.category===filterCat)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">{['הכל',...VIDEO_CATEGORIES].map(c=><button key={c} onClick={()=>setFilterCat(c)} className={`ftab ${filterCat===c?'active':''}`}>{c}</button>)}</div>
        {canEdit && <button className="btn btn-blue btn-sm" onClick={()=>setModal(true)}>+ הוסף סרטון</button>}
      </div>
      {playing && (
        <div className="card overflow-hidden">
          <div className="panel-head"><span className="panel-title">▶ {playing.title}</span><button onClick={()=>setPlaying(null)} className="text-text3 hover:text-text1">✕</button></div>
          <div className="relative w-full" style={{paddingBottom:'56.25%'}}><iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={playing.title}/></div>
        </div>
      )}
      {filtered.length===0 && <div className="card p-10 text-center text-text3">{canEdit?'לחץ "+ הוסף סרטון"':'אין סרטונים'}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(v=>(
          <div key={v.id} className="card overflow-hidden group">
            <div className="relative cursor-pointer" onClick={()=>setPlaying(v)}>
              <img src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`} alt={v.title} className="w-full aspect-video object-cover" onError={e=>{e.target.src='https://placehold.co/320x180/1a1a2e/gold?text=▶'}}/>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center text-2xl text-white shadow-xl">▶</div></div>
              <span className="absolute top-2 right-2 badge badge-gold text-[10px]">{v.category}</span>
            </div>
            <div className="p-3">
              <div className="font-bold text-sm mb-1 line-clamp-2">{v.title}</div>
              {v.description && <div className="text-text3 text-xs mb-2 line-clamp-2">{v.description}</div>}
              <div className="flex items-center justify-between">
                <button onClick={()=>setPlaying(v)} className="btn btn-sm text-xs">▶ צפה</button>
                {canEdit && <button onClick={()=>deleteVideo(v.id)} className="text-red-400/50 hover:text-red-400 text-xs">🗑</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="🎥 הוספת סרטון הכשרה">
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">כותרת *</label><input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="שם הסרטון"/></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">קישור יוטיוב *</label><input className="form-input" dir="ltr" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://youtube.com/watch?v=..."/></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label><select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{VIDEO_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">תיאור (אופציונלי)</label><input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="על מה הסרטון?"/></div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={addVideo} saveLabel="➕ הוסף"/>
      </Modal>
    </div>
  )
}

// ─── AI RABBI TAB ─────────────────────────────────────────────────────────────
function AiRabbiTab({ bookUrls }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState([])

  const SYSTEM = `אתה רב צבאי מומחה בהלכות פסח, המלווה את חיילי צבא ההגנה לישראל.
עונה בעברית, בשפה צבאית-מעשית, ברורה ולעניין.
תפקידך לסייע בשאלות הלכתיות: כשרות, ניקיון, הגעלה, ליל הסדר בשטח, בדיקת חמץ, ועוד.
עקרונות:
• הלכה למעשה — פסיקה ברורה
• התחשב במציאות הצבאית (שטח, מבצעים, שמירה בליל הסדר)
• ציין מקור קצר (שו"ע, משנ"ב) כשרלוונטי
• תשובה קצרה ומעשית — עד 200 מילה
• אם השאלה אינה הלכתית — הסבר בנימוס${bookUrls.length>0?`\nחוברות הכשרה זמינות: ${bookUrls.join(', ')}`:''}
תמיד סיים עם: "⚠️ לשאלות מורכבות — פנה לרב יחידה"`

  async function askAI() {
    if (!question.trim() || loading) return
    const q = question.trim()
    setQuestion(''); setLoading(true)
    const newHistory = [...history, {role:'user',q}]
    setHistory(newHistory)

    try {
      const messages = history.flatMap(h=>[
        {role:'user',content:h.q},
        {role:'assistant',content:h.a||''},
      ]).filter(m=>m.content)
      messages.push({role:'user',content:q})

      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:SYSTEM,messages})
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || 'שגיאה בקבלת תשובה'
      setHistory(prev => {
        const updated = [...prev]
        updated[updated.length-1] = {...updated[updated.length-1], a:text}
        return updated.slice(-8)
      })
    } catch {
      setHistory(prev=>{
        const updated=[...prev]
        updated[updated.length-1]={...updated[updated.length-1],a:'שגיאת רשת — נסה שוב'}
        return updated
      })
    }
    setLoading(false)
  }

  const SUGGESTIONS = [
    'האם מותר לאכול קטניות בפסח בצבא?',
    'כיצד מגעילים כלים בתנאי שטח?',
    'מה הדין לגבי שמירה בליל הסדר?',
    'כיצד בודקים חמץ בחדר ישיבה?',
    'מה עושים עם מזון שאינו כשר לפסח בבסיס?',
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 bg-purple-900/10 border-purple-500/30">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <div className="font-black">רב AI — שאלות הלכתיות לפסח</div>
            <div className="text-text3 text-xs">מבוסס בינה מלאכותית · לא מחליף פסיקת רב!</div>
          </div>
        </div>
        {bookUrls.length>0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-text3 font-bold">📚 מקורות:</span>
            {bookUrls.map((url,i)=>(
              <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">חוברת {i+1}</a>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions — only when empty */}
      {history.length===0 && (
        <div>
          <p className="text-xs text-text3 mb-2 font-bold">שאלות נפוצות — לחץ לשאול:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s=>(
              <button key={s} onClick={()=>setQuestion(s)}
                className="text-xs border border-border2 text-text2 hover:text-text1 hover:border-gold/50 px-3 py-1.5 rounded-full transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat history */}
      {history.length>0 && (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1">
          {history.map((item,i)=>(
            <div key={i} className="space-y-3">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="bg-gold/20 border border-gold/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-bold">{item.q}</p>
                </div>
              </div>
              {/* AI bubble */}
              <div className="flex justify-start">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🤖</span>
                    <span className="text-xs text-purple-400 font-bold">רב AI</span>
                  </div>
                  {item.a ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.a}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      {[0,1,2].map(j=><div key={j} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:`${j*0.15}s`}}/>)}
                      <span className="text-xs text-text3">חושב...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="card p-4 sticky bottom-0">
        <div className="flex gap-3 items-end">
          <textarea
            className="form-input flex-1 resize-none text-sm"
            style={{minHeight:72,maxHeight:140}}
            placeholder="שאל שאלה הלכתית... (Enter לשליחה)"
            value={question}
            onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askAI()}}}
            disabled={loading}
          />
          <button onClick={askAI} disabled={!question.trim()||loading}
            className="btn px-5 py-3 flex-shrink-0"
            style={{background:question.trim()&&!loading?'rgba(168,85,247,.3)':'',borderColor:question.trim()&&!loading?'rgba(168,85,247,.5)':'',color:question.trim()&&!loading?'#c084fc':''}}>
            {loading?'⏳':'📤'}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-text3">⚠️ AI בלבד — לשאלות מורכבות פנה לרב יחידה</p>
          {history.length>0 && <button onClick={()=>setHistory([])} className="text-xs text-text3 hover:text-text1">🗑 נקה</button>}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN QnAPage ─────────────────────────────────────────────────────────────
export default function QnAPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [questions, setQuestions]     = useState([])
  const [faqs, setFaqs]               = useState([])
  const [globalQ, setGlobalQ]         = useState([])
  const [modal, setModal]             = useState(false)
  const [answerModal, setAnswerModal] = useState(null)
  const [form, setForm]               = useState({question:'',category:'כשרות',is_global:false})
  const [answerText, setAnswerText]   = useState('')
  const [tab, setTab]                 = useState('questions')
  const [bookUrl, setBookUrl]         = useState('')
  const [bookUrls, setBookUrls]       = useState([])

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const [q,f,gq,book] = await Promise.all([
      supabase.from('qna').select('*').eq('unit_id',currentUnit.id).eq('is_faq',false).neq('question','__training_book__').order('created_at',{ascending:false}),
      supabase.from('qna').select('*').eq('is_faq',true).neq('question','__training_book__').order('created_at',{ascending:false}),
      (isAdmin||isSenior) ? supabase.from('qna').select('*').eq('is_faq',false).neq('question','__training_book__').order('created_at',{ascending:false}) : Promise.resolve({data:[]}),
      supabase.from('qna').select('answer').eq('question','__training_book__').single(),
    ])
    setQuestions(q.data||[])
    setFaqs(f.data||[])
    setGlobalQ(gq.data||[])
    if (book.data?.answer) {
      setBookUrl(book.data.answer)
      setBookUrls(book.data.answer.split(',').map(u=>u.trim()).filter(Boolean))
    }
  }

  async function askQuestion() {
    if (!form.question) return
    await supabase.from('qna').insert({unit_id:currentUnit.id,...form,is_faq:false})
    showToast('שאלה נשלחה ✅','green'); setModal(false); setForm({question:'',category:'כשרות',is_global:false}); load()
  }

  async function saveAnswer() {
    if (!answerText) return
    await supabase.from('qna').update({answer:answerText,answered_by:currentUnit?.name,answered_at:new Date().toISOString(),is_faq:true}).eq('id',answerModal.id)
    showToast('תשובה נשמרה ✅','green'); setAnswerModal(null); setAnswerText(''); load()
  }

  const myPending  = questions.filter(q=>!q.answer)
  const myAnswered = questions.filter(q=>q.answer)

  const allTabs = [
    {id:'questions', label:`❓ שאלות שלי (${myPending.length})`},
    {id:'faq',       label:'📚 מאגר הלכה'},
    ...(isAdmin||isSenior?[{id:'all',label:`📋 כל השאלות (${globalQ.length})`}]:[]),
    {id:'ai',        label:'🤖 רב AI'},
    {id:'videos',    label:'🎥 סרטונים'},
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚖️ חמ"ל הלכתי — שו"ת</h2>
        {tab==='questions' && <button className="btn" onClick={()=>setModal(true)}>+ שאל שאלה</button>}
      </div>

      {bookUrl && tab!=='videos' && tab!=='ai' && (
        <a href={bookUrl} target="_blank" rel="noreferrer" className="card p-4 flex items-center gap-3 border-blue-500/30 bg-blue-900/10 hover:border-blue-400/60 transition-all cursor-pointer no-underline block">
          <span className="text-3xl">📚</span>
          <div className="flex-1"><div className="font-bold">ספר הכשרות — פסח תשפ"ו</div><div className="text-text3 text-xs">לחץ לפתיחה ←</div></div>
          <span className="badge badge-blue">פתח</span>
        </a>
      )}

      <div className="flex gap-2 flex-wrap">
        {allTabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`ftab ${tab===t.id?'active':''}`}>{t.label}</button>)}
      </div>

      {tab==='questions' && (
        <div className="space-y-3">
          {myPending.length===0&&myAnswered.length===0&&<div className="card p-10 text-center text-text3">אין שאלות עדיין</div>}
          {[...myPending,...myAnswered].map(q=><QuestionCard key={q.id} q={q} canAnswer={isAdmin||isSenior} onAnswer={()=>{setAnswerModal(q);setAnswerText('')}}/>)}
        </div>
      )}

      {tab==='faq' && (
        <div className="space-y-3">
          {faqs.length===0&&<div className="card p-10 text-center text-text3">אין FAQ עדיין</div>}
          {CATEGORIES.map(cat=>{
            const cf=faqs.filter(f=>f.category===cat); if(!cf.length) return null
            return <div key={cat} className="card"><div className="panel-head"><span className="panel-title">⚖️ {cat}</span></div><div className="divide-y divide-border1/50">{cf.map(f=><QuestionCard key={f.id} q={f} canAnswer={false}/>)}</div></div>
          })}
        </div>
      )}

      {tab==='all'&&(isAdmin||isSenior)&&(
        <div className="space-y-3">
          {globalQ.filter(q=>q.question!=='__training_book__').map(q=><QuestionCard key={q.id} q={q} canAnswer onAnswer={()=>{setAnswerModal(q);setAnswerText(q.answer||'')}}/>)}
        </div>
      )}

      {tab==='ai' && <AiRabbiTab bookUrls={bookUrls}/>}
      {tab==='videos' && <VideosTab/>}

      <Modal open={modal} onClose={()=>setModal(false)} title="❓ שאלה הלכתית">
        <div className="space-y-3">
          <div><label className="text-xs text-text3 font-bold block mb-1">נושא</label><select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="text-xs text-text3 font-bold block mb-1">השאלה</label><textarea className="form-input h-28 resize-none" placeholder="פרט בצורה ברורה..." value={form.question} onChange={e=>setForm(f=>({...f,question:e.target.value}))}/></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_global} onChange={e=>setForm(f=>({...f,is_global:e.target.checked}))} className="w-4 h-4 accent-gold"/><span className="text-sm text-text2">שאלה גלויה לכל היחידות</span></label>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={askQuestion} saveLabel="📤 שלח"/>
      </Modal>

      <Modal open={!!answerModal} onClose={()=>setAnswerModal(null)} title="✍️ מענה הלכתי">
        {answerModal&&<div className="space-y-3">
          <div className="bg-bg3 rounded-lg p-3 text-sm"><strong>השאלה:</strong> {answerModal.question}</div>
          <div><label className="text-xs text-text3 font-bold block mb-1">התשובה</label><textarea className="form-input h-32 resize-none" placeholder="כתוב את הפסיקה..." value={answerText} onChange={e=>setAnswerText(e.target.value)}/></div>
          <p className="text-text3 text-xs">* תועבר אוטומטית ל-FAQ</p>
        </div>}
        <ModalButtons onClose={()=>setAnswerModal(null)} onSave={saveAnswer} saveLabel="✅ אשר פסיקה" saveClass="btn-green"/>
      </Modal>
    </div>
  )
}

function QuestionCard({q,canAnswer,onAnswer}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="badge badge-gold">{q.category}</span>
            {!q.answer&&<span className="badge badge-orange">ממתין</span>}
            {q.answer&&<span className="badge badge-green">נענה ✓</span>}
            {q.is_faq&&<span className="badge badge-blue">FAQ</span>}
          </div>
          <p className="font-bold text-sm mb-2">❓ {q.question}</p>
          {q.answer&&<div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mt-2"><div className="text-xs text-green-400 font-bold mb-1">✅ {q.answered_by}</div><p className="text-sm">{q.answer}</p></div>}
          <div className="text-text3 text-xs mt-2">{new Date(q.created_at).toLocaleDateString('he-IL')}</div>
        </div>
        {canAnswer&&<button className="btn btn-green btn-sm flex-shrink-0" onClick={onAnswer}>✍️ {q.answer?'ערוך':'ענה'}</button>}
      </div>
    </div>
  )
}
