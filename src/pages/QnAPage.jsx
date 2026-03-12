import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'
import VideosPage from './VideosPage'

const CATEGORIES = ['כשרות','הגעלה','ניקיון','בדיקת חמץ','הסדר','כללי']

const QUICK_QUESTIONS = [
  'איך מכשירים נירוסטה?',
  'מה דין מיקרוגל?',
  'איך בודקים חמץ?',
  'מה דין כלי חרס?',
  'איך מכשירים תנור?',
]

export default function QnAPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [questions, setQuestions] = useState([])
  const [faqs, setFaqs] = useState([])
  const [globalQ, setGlobalQ] = useState([])
  const [modal, setModal] = useState(false)
  const [answerModal, setAnswerModal] = useState(null)
  const [form, setForm] = useState({ question:'', category:'כשרות', is_global: false })
  const [answerText, setAnswerText] = useState('')
  const [tab, setTab] = useState('questions')
  const [bookUrl, setBookUrl] = useState('')
  // AI Rabbi
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const aiBottomRef = useRef(null)
  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const [q, f, gq, book] = await Promise.all([
      supabase.from('qna').select('*').eq('unit_id', currentUnit.id)
        .eq('is_faq', false).neq('question','__training_book__').order('created_at',{ascending:false}),
      supabase.from('qna').select('*').eq('is_faq', true)
        .neq('question','__training_book__').order('created_at',{ascending:false}),
      (isAdmin || isSenior)
        ? supabase.from('qna').select('*').eq('is_faq', false)
            .neq('question','__training_book__').order('created_at',{ascending:false})
        : Promise.resolve({ data: [] }),
      // חיפוש ספר הכשרות לפי יחידה ספציפית — מונע שגיאת .single() כשיש כמה שורות
      supabase.from('qna').select('answer')
        .eq('question','__training_book__')
        .eq('unit_id', currentUnit.id)
        .maybeSingle(),
    ])
    setQuestions(q.data || [])
    setFaqs(f.data || [])
    setGlobalQ(gq.data || [])
    if (book.data?.answer) setBookUrl(book.data.answer)
  }

  async function askQuestion() {
    if (!form.question) return
    await supabase.from('qna').insert({
      unit_id: currentUnit.id, ...form, is_faq: false
    })
    showToast('שאלה נשלחה ✅', 'green')
    setModal(false)
    setForm({ question:'', category:'כשרות', is_global: false })
    load()
  }

  async function saveAnswer() {
    if (!answerText) return
    await supabase.from('qna').update({
      answer: answerText,
      answered_by: currentUnit?.name,
      answered_at: new Date().toISOString(),
      is_faq: true,
    }).eq('id', answerModal.id)
    showToast('תשובה נשמרה ועברה ל-FAQ ✅', 'green')
    setAnswerModal(null); setAnswerText(''); load()
  }

  const myPending = questions.filter(q => !q.answer)
  const myAnswered = questions.filter(q => q.answer)

  async function askAI(text) {
    if (!text.trim() || aiLoading) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...aiMessages, userMsg]
    setAiMessages(newMsgs)
    setAiInput('')
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          systemPrompt: 'אתה רב צבאי מומחה בהלכות פסח. ענה בעברית, בצורה קצרה וברורה לחיילים. התבסס על ספר ההכשרות הצבאי.'
        })
      })
      if (!res.ok) throw new Error(`שגיאת שרת ${res.status}`)
      const data = await res.json()
      const reply = data.content?.[0]?.text || data.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה'
      setAiMessages([...newMsgs, { role: 'assistant', content: reply }])
      setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setAiError('שגיאת חיבור — בדוק שה-GEMINI_API_KEY מוגדר ב-Vercel')
    }
    setAiLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚖️ חמ"ל הלכתי — שו"ת</h2>
        <button className="btn" onClick={()=>setModal(true)}>+ שאל שאלה</button>
      </div>

      {/* Training book */}
      {bookUrl && (
        <a href={bookUrl} target="_blank" rel="noreferrer"
          className="card p-4 flex items-center gap-3 border-blue-500/30 bg-blue-900/10 hover:border-blue-400/60 transition-all cursor-pointer no-underline block">
          <span className="text-3xl">📚</span>
          <div className="flex-1">
            <div className="font-bold">ספר הכשרות — פסח תשפ"ו</div>
            <div className="text-text3 text-xs">לחץ לפתיחה ←</div>
          </div>
          <span className="badge badge-blue">פתח</span>
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          ['questions', `❓ שאלות שלי (${myPending.length})`],
          ['faq', '📚 מאגר הלכה (FAQ)'],
          ['ai', '🤖 רב AI'],
          ['videos', '🎥 סרטוני הכשרה'],
          ...(isAdmin || isSenior ? [['all', `📋 כל השאלות (${globalQ.length})`]] : []),
        ].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            className={`ftab ${tab===k?'active':''}`}>{l}</button>
        ))}
      </div>

      {tab === 'videos' && <VideosPage />}

      {/* AI Rabbi Tab */}
      {tab === 'ai' && (
        <div className="space-y-3">
          <div className="card p-4 bg-yellow-900/10 border-yellow-500/20">
            <div className="font-bold text-sm mb-1">🤖 רב AI — שאלות הלכתיות לפסח</div>
            <div className="text-text3 text-xs">מבוסס בינה מלאכותית · לא מחליף פסיקת רב · לשאלות מורכבות פנה לרב יחידה</div>
          </div>
          {/* Quick questions */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => askAI(q)}
                className="btn btn-sm text-xs" style={{background:'rgba(234,179,8,.1)',borderColor:'rgba(234,179,8,.3)',color:'#fbbf24'}}>
                {q}
              </button>
            ))}
          </div>
          {/* Messages */}
          <div className="card p-4 space-y-3 min-h-[200px]">
            {aiMessages.length === 0 && (
              <div className="text-center text-text3 py-8">שאל שאלה הלכתית...</div>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  m.role==='user'
                    ? 'bg-gold/20 border border-gold/30 text-text1'
                    : 'bg-bg3 border border-border1 text-text1'
                }`}>
                  {m.role==='assistant' && <div className="text-xs text-yellow-400 font-bold mb-1">🤖 רב AI</div>}
                  <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-bg3 border border-border1 rounded-xl px-4 py-2 text-sm text-text3">
                  ✍️ מנסח תשובה...
                </div>
              </div>
            )}
            {aiError && (
              <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                ⚠️ {aiError}
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>
          {/* Input */}
          <div className="flex gap-2">
            <textarea
              className="form-input flex-1 resize-none h-12"
              placeholder="שאל שאלה הלכתית... (Enter לשליחה)"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); askAI(aiInput) } }}
            />
            <button className="btn btn-gold" onClick={() => askAI(aiInput)} disabled={aiLoading}>
              {aiLoading ? '⏳' : '📤'}
            </button>
          </div>
          {aiMessages.length > 0 && (
            <button className="text-xs text-text3 hover:text-text2" onClick={() => { setAiMessages([]); setAiError('') }}>
              🗑 נקה שיחה
            </button>
          )}
          <p className="text-text3 text-xs">⚠️ AI בלבד — לשאלות מורכבות פנה לרב יחידה</p>
        </div>
      )}

      {/* My questions */}
      {tab === 'questions' && (
        <div className="space-y-3">
          {myPending.length === 0 && myAnswered.length === 0 &&
            <div className="card p-10 text-center text-text3">אין שאלות עדיין</div>}
          {[...myPending, ...myAnswered].map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={isAdmin||isSenior}
              onAnswer={()=>{setAnswerModal(q);setAnswerText('')}} />
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === 'faq' && (
        <div className="space-y-3">
          {faqs.length === 0 && <div className="card p-10 text-center text-text3">אין שאלות ב-FAQ עדיין</div>}
          {CATEGORIES.map(cat => {
            const catFaqs = faqs.filter(f=>f.category===cat)
            if (!catFaqs.length) return null
            return (
              <div key={cat} className="card">
                <div className="panel-head"><span className="panel-title">⚖️ {cat}</span></div>
                <div className="divide-y divide-border1/50">
                  {catFaqs.map(f => <QuestionCard key={f.id} q={f} canAnswer={false} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All questions (admin) */}
      {tab === 'all' && (isAdmin||isSenior) && (
        <div className="space-y-3">
          {globalQ.filter(q=>q.question!=='__training_book__').map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={true}
              onAnswer={()=>{setAnswerModal(q);setAnswerText(q.answer||'')}} />
          ))}
        </div>
      )}

      {/* Ask Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="❓ שאלה הלכתית">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">נושא</label>
            <select className="form-input" value={form.category}
              onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">השאלה</label>
            <textarea className="form-input h-28 resize-none"
              placeholder="פרט את השאלה בצורה ברורה..."
              value={form.question}
              onChange={e=>setForm(f=>({...f,question:e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_global}
              onChange={e=>setForm(f=>({...f,is_global:e.target.checked}))}
              className="w-4 h-4 accent-gold" />
            <span className="text-sm text-text2">שאלה גלויה לכל היחידות</span>
          </label>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={askQuestion} saveLabel="📤 שלח שאלה" />
      </Modal>

      {/* Answer Modal */}
      <Modal open={!!answerModal} onClose={()=>setAnswerModal(null)} title="✍️ מענה הלכתי">
        {answerModal && (
          <div className="space-y-3">
            <div className="bg-bg3 rounded-lg p-3 text-sm">
              <strong>השאלה:</strong> {answerModal.question}
            </div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">התשובה ההלכתית</label>
              <textarea className="form-input h-32 resize-none"
                placeholder="כתוב את הפסיקה..."
                value={answerText}
                onChange={e=>setAnswerText(e.target.value)} />
            </div>
            <p className="text-text3 text-xs">* התשובה תועבר אוטומטית ל-FAQ ותהיה גלויה לכל היחידות</p>
          </div>
        )}
        <ModalButtons onClose={()=>setAnswerModal(null)} onSave={saveAnswer}
          saveLabel="✅ אשר פסיקה" saveClass="btn-green" />
      </Modal>
    </div>
  )
}

function QuestionCard({ q, canAnswer, onAnswer }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="badge badge-gold">{q.category}</span>
            {!q.answer && <span className="badge badge-orange">ממתין לתשובה</span>}
            {q.answer && <span className="badge badge-green">נענה ✓</span>}
            {q.is_faq && <span className="badge badge-blue">FAQ</span>}
          </div>
          <p className="font-bold text-sm mb-2">❓ {q.question}</p>
          {q.answer && (
            <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mt-2">
              <div className="text-xs text-green-400 font-bold mb-1">✅ תשובה — {q.answered_by}</div>
              <p className="text-sm">{q.answer}</p>
            </div>
          )}
          <div className="text-text3 text-xs mt-2">
            {new Date(q.created_at).toLocaleDateString('he-IL')}
          </div>
        </div>
        {canAnswer && (
          <button className="btn btn-green btn-sm flex-shrink-0" onClick={onAnswer}>
            ✍️ {q.answer ? 'ערוך' : 'ענה'}
          </button>
        )}
      </div>
    </div>
  )
}
