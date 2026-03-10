import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'

const CATEGORIES = ['כשרות','הגעלה','ניקיון','בדיקת חמץ','הסדר','כללי']

export default function QnAPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [questions, setQuestions] = useState([])
  const [faqs, setFaqs] = useState([])
  const [modal, setModal] = useState(false)
  const [answerModal, setAnswerModal] = useState(null)
  const [form, setForm] = useState({ question:'', category:'כשרות' })
  const [answerText, setAnswerText] = useState('')
  const [tab, setTab] = useState('questions') // questions | faq

  useEffect(() => { if (currentUnit) load() }, [currentUnit])

  async function load() {
    const [q, f] = await Promise.all([
      supabase.from('qna').select('*').eq('unit_id', currentUnit.id).eq('is_faq',false).order('created_at',{ascending:false}),
      supabase.from('qna').select('*').eq('is_faq',true).order('created_at',{ascending:false}),
    ])
    setQuestions(q.data || [])
    setFaqs(f.data || [])
  }

  async function askQuestion() {
    if (!form.question) return
    await supabase.from('qna').insert({ unit_id: currentUnit.id, ...form })
    showToast('שאלה נשלחה לרב היחידה ✅', 'green')
    setModal(false)
    setForm({ question:'', category:'כשרות' })
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
    setAnswerModal(null)
    setAnswerText('')
    load()
  }

  async function markFaq(id, val) {
    await supabase.from('qna').update({ is_faq: val }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚖️ חמ"ל הלכתי — שו"ת</h2>
        <button className="btn" onClick={()=>setModal(true)}>+ שאל שאלה</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['questions','❓ שאלות פתוחות'],['faq','📚 מאגר הלכה (FAQ)']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`ftab ${tab===k?'active':''}`}>{l}</button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="space-y-3">
          {questions.length === 0 && <div className="card p-10 text-center text-text3">אין שאלות פתוחות</div>}
          {questions.map(q => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <span className="badge badge-gold">{q.category}</span>
                    {!q.answer && <span className="badge badge-orange">ממתין לתשובה</span>}
                    {q.answer && <span className="badge badge-green">נענה</span>}
                  </div>
                  <p className="font-bold text-sm mb-2">❓ {q.question}</p>
                  {q.answer && (
                    <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mt-2">
                      <div className="text-xs text-green-400 font-bold mb-1">תשובה מאת: {q.answered_by}</div>
                      <p className="text-sm text-text1">{q.answer}</p>
                    </div>
                  )}
                  <div className="text-text3 text-xs mt-2">{new Date(q.created_at).toLocaleDateString('he-IL')}</div>
                </div>
                {(isAdmin || isSenior) && !q.answer && (
                  <button className="btn btn-green btn-sm flex-shrink-0" onClick={()=>{ setAnswerModal(q); setAnswerText('') }}>
                    ✍️ ענה
                  </button>
                )}
                {(isAdmin || isSenior) && q.answer && !q.is_faq && (
                  <button className="btn btn-sm flex-shrink-0" onClick={()=>markFaq(q.id,true)}>
                    📚 FAQ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'faq' && (
        <div className="space-y-3">
          <p className="text-text3 text-sm">שאלות שנענו ואושרו כהלכה — גלויות לכל היחידות</p>
          {faqs.length === 0 && <div className="card p-10 text-center text-text3">אין שאלות ב-FAQ עדיין</div>}
          {CATEGORIES.map(cat => {
            const catFaqs = faqs.filter(f=>f.category===cat)
            if (!catFaqs.length) return null
            return (
              <div key={cat} className="card">
                <div className="panel-head"><span className="panel-title">⚖️ {cat}</span></div>
                <div className="divide-y divide-border1/50">
                  {catFaqs.map(f => (
                    <div key={f.id} className="p-4">
                      <p className="font-bold text-sm mb-2">❓ {f.question}</p>
                      <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
                        <div className="text-xs text-green-400 font-bold mb-1">✅ {f.answered_by}</div>
                        <p className="text-sm">{f.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ask Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="❓ שאלה הלכתית">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">נושא</label>
            <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">השאלה</label>
            <textarea className="form-input h-28 resize-none" placeholder="פרט את השאלה בצורה ברורה..." value={form.question} onChange={e=>setForm(f=>({...f,question:e.target.value}))} />
          </div>
        </div>
        <ModalButtons onClose={()=>setModal(false)} onSave={askQuestion} saveLabel="📤 שלח שאלה" />
      </Modal>

      {/* Answer Modal */}
      <Modal open={!!answerModal} onClose={()=>setAnswerModal(null)} title="✍️ מענה הלכתי">
        {answerModal && (
          <div className="space-y-3">
            <div className="bg-bg3 rounded-lg p-3 text-sm"><strong>השאלה:</strong> {answerModal.question}</div>
            <div>
              <label className="text-xs text-text3 font-bold block mb-1">התשובה ההלכתית</label>
              <textarea className="form-input h-32 resize-none" placeholder="כתוב את הפסיקה..." value={answerText} onChange={e=>setAnswerText(e.target.value)} />
            </div>
            <p className="text-text3 text-xs">* התשובה תועבר אוטומטית ל-FAQ ותהיה גלויה לכל היחידות</p>
          </div>
        )}
        <ModalButtons onClose={()=>setAnswerModal(null)} onSave={saveAnswer} saveLabel="✅ אשר פסיקה" saveClass="btn-green" />
      </Modal>
    </div>
  )
}
