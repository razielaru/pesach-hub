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
    const { data } = await supabase.from('training_videos').select('*').order('created_at', { ascending: false })
    setVideos(data || [])
  }

  function getYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\n]+)/)
    return m ? m[1] : null
  }

  async function addVideo() {
    if (!form.title || !form.url) return
    const ytId = getYoutubeId(form.url)
    if (!ytId) { showToast('קישור יוטיוב לא תקין', 'red'); return }
    await supabase.from('training_videos').insert({
      title: form.title, url: form.url, youtube_id: ytId,
      category: form.category, description: form.description,
      added_by: currentUnit?.name, is_global: true,
    })
    showToast('סרטון נוסף ✅', 'green')
    setModal(false); setForm({ title:'', url:'', category:'כשרות', description:'' }); load()
  }

  async function deleteVideo(id) {
    if (!confirm('למחוק סרטון זה?')) return
    await supabase.from('training_videos').delete().eq('id', id)
    showToast('סרטון נמחק', 'red'); load()
  }

  const filtered = filterCat === 'הכל' ? videos : videos.filter(v => v.category === filterCat)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {['הכל', ...VIDEO_CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`ftab ${filterCat === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
        {canEdit && (
          <button className="btn btn-blue btn-sm" onClick={() => setModal(true)}>+ הוסף סרטון</button>
        )}
      </div>

      {/* Playing embed */}
      {playing && (
        <div className="card overflow-hidden">
          <div className="panel-head">
            <span className="panel-title">▶ {playing.title}</span>
            <button onClick={() => setPlaying(null)} className="text-text3 hover:text-text1">✕ סגור</button>
          </div>
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen title={playing.title} />
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 && (
        <div className="card p-10 text-center text-text3">
          {canEdit ? 'אין סרטונים עדיין — לחץ "+ הוסף סרטון"' : 'אין סרטונים בקטגוריה זו'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(v => (
          <div key={v.id} className="card overflow-hidden group">
            <div className="relative cursor-pointer" onClick={() => setPlaying(v)}>
              <img
                src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                alt={v.title}
                className="w-full aspect-video object-cover"
                onError={e => { e.target.src = 'https://placehold.co/320x180/1a1a2e/gold?text=▶' }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center text-2xl text-white shadow-xl">▶</div>
              </div>
              <span className="absolute top-2 right-2 badge badge-gold text-[10px]">{v.category}</span>
            </div>
            <div className="p-3">
              <div className="font-bold text-sm mb-1 line-clamp-2">{v.title}</div>
              {v.description && <div className="text-text3 text-xs mb-2 line-clamp-2">{v.description}</div>}
              <div className="flex items-center justify-between">
                <button onClick={() => setPlaying(v)}
                  className="btn btn-sm text-xs">▶ צפה</button>
                {canEdit && (
                  <button onClick={() => deleteVideo(v.id)}
                    className="text-red-400/50 hover:text-red-400 text-xs transition-colors">🗑 מחק</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🎥 הוספת סרטון הכשרה">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">כותרת *</label>
            <input className="form-input" placeholder="לדוגמה: הגעלת כלים לפסח"
              value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">קישור יוטיוב *</label>
            <input className="form-input" placeholder="https://youtube.com/watch?v=..."
              value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label>
            <select className="form-input" value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              {VIDEO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">תיאור קצר (אופציונלי)</label>
            <input className="form-input" placeholder="על מה הסרטון?"
              value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={addVideo} saveLabel="➕ הוסף סרטון" />
      </Modal>
    </div>
  )
}

// ─── MAIN QnAPage ─────────────────────────────────────────────────────────────
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
      supabase.from('qna').select('answer').eq('question','__training_book__').single(),
    ])
    setQuestions(q.data || [])
    setFaqs(f.data || [])
    setGlobalQ(gq.data || [])
    if (book.data?.answer) setBookUrl(book.data.answer)
  }

  async function askQuestion() {
    if (!form.question) return
    await supabase.from('qna').insert({ unit_id: currentUnit.id, ...form, is_faq: false })
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

  const allTabs = [
    { id: 'questions', label: `❓ שאלות שלי (${myPending.length})` },
    { id: 'faq',       label: '📚 מאגר הלכה (FAQ)' },
    ...(isAdmin || isSenior ? [{ id: 'all', label: `📋 כל השאלות (${globalQ.length})` }] : []),
    { id: 'videos',    label: '🎥 סרטוני הכשרה' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">⚖️ חמ"ל הלכתי — שו"ת</h2>
        {tab !== 'videos' && (
          <button className="btn" onClick={() => setModal(true)}>+ שאל שאלה</button>
        )}
      </div>

      {/* Training book */}
      {bookUrl && tab !== 'videos' && (
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
        {allTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`ftab ${tab === t.id ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* My questions */}
      {tab === 'questions' && (
        <div className="space-y-3">
          {myPending.length === 0 && myAnswered.length === 0 &&
            <div className="card p-10 text-center text-text3">אין שאלות עדיין</div>}
          {[...myPending, ...myAnswered].map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={isAdmin||isSenior}
              onAnswer={() => { setAnswerModal(q); setAnswerText('') }} />
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === 'faq' && (
        <div className="space-y-3">
          {faqs.length === 0 && <div className="card p-10 text-center text-text3">אין שאלות ב-FAQ עדיין</div>}
          {CATEGORIES.map(cat => {
            const catFaqs = faqs.filter(f => f.category === cat)
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
      {tab === 'all' && (isAdmin || isSenior) && (
        <div className="space-y-3">
          {globalQ.filter(q => q.question !== '__training_book__').map(q => (
            <QuestionCard key={q.id} q={q} canAnswer={true}
              onAnswer={() => { setAnswerModal(q); setAnswerText(q.answer || '') }} />
          ))}
        </div>
      )}

      {/* Videos tab */}
      {tab === 'videos' && <VideosTab />}

      {/* Ask Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="❓ שאלה הלכתית">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">נושא</label>
            <select className="form-input" value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text3 font-bold block mb-1">השאלה</label>
            <textarea className="form-input h-28 resize-none"
              placeholder="פרט את השאלה בצורה ברורה..."
              value={form.question}
              onChange={e => setForm(f => ({...f, question: e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_global}
              onChange={e => setForm(f => ({...f, is_global: e.target.checked}))}
              className="w-4 h-4 accent-gold" />
            <span className="text-sm text-text2">שאלה גלויה לכל היחידות</span>
          </label>
        </div>
        <ModalButtons onClose={() => setModal(false)} onSave={askQuestion} saveLabel="📤 שלח שאלה" />
      </Modal>

      {/* Answer Modal */}
      <Modal open={!!answerModal} onClose={() => setAnswerModal(null)} title="✍️ מענה הלכתי">
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
                onChange={e => setAnswerText(e.target.value)} />
            </div>
            <p className="text-text3 text-xs">* התשובה תועבר אוטומטית ל-FAQ ותהיה גלויה לכל היחידות</p>
          </div>
        )}
        <ModalButtons onClose={() => setAnswerModal(null)} onSave={saveAnswer}
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
