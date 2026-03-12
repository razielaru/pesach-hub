import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import Modal, { ModalButtons } from '../components/ui/Modal'

const CATEGORIES = ['כשרות', 'פסח', 'שבת', 'תפילה', 'כללי']

const DEFAULT_VIDEOS = []

function getYouTubeId(input) {
  if (!input) return null
  // Already just an ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  // Full URL
  const match = input.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function VideosPage() {
  const { currentUnit, isAdmin, isSenior, showToast } = useStore()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('הכל')
  const [playing, setPlaying] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'כשרות', youtube_url: '', description: '', is_global: false })

  const canEdit = isAdmin || isSenior

  useEffect(() => { load() }, [currentUnit])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('training_videos')
      .select('*')
      .or(`is_global.eq.true,unit_id.eq.${currentUnit?.id}`)
      .order('created_at', { ascending: false })
    setVideos(data?.length ? data : DEFAULT_VIDEOS)
    setLoading(false)
  }

  async function save() {
    const ytId = getYouTubeId(form.youtube_url)
    if (!form.title || !ytId) {
      showToast('שם וקישור יוטיוב תקין חובה', 'red'); return
    }
    const { error } = await supabase.from('training_videos').insert({
      unit_id: currentUnit?.id,
      title: form.title,
      category: form.category,
      youtube_id: ytId,
      description: form.description,
      is_global: canEdit ? form.is_global : false,
    })
    if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
    showToast('סרטון נוסף ✅', 'green')
    setModal(false)
    setForm({ title: '', category: 'כשרות', youtube_url: '', description: '', is_global: false })
    load()
  }

  async function del(id) {
    if (!confirm('למחוק סרטון זה?')) return
    const { error } = await supabase.from('training_videos').delete().eq('id', id)
    if (error) { showToast('שגיאה: ' + error.message, 'red'); return }
    setVideos(prev => prev.filter(v => v.id !== id))
    showToast('סרטון נמחק 🗑', 'red')
  }

  const allCats = ['הכל', ...CATEGORIES]
  const filtered = catFilter === 'הכל' ? videos : videos.filter(v => v.category === catFilter)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">🎥 סרטוני הכשרה הלכתית</h2>
          <p className="text-text3 text-xs mt-0.5">{videos.length} סרטונים זמינים</p>
        </div>
        <button className="btn" onClick={() => setModal(true)}>+ הוסף סרטון</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {allCats.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
              ${catFilter === cat
                ? 'bg-yellow-900/30 border-gold/50 text-gold'
                : 'bg-bg2 border-border1 text-text2 hover:border-border2'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPlaying(null)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-lg">{playing.title}</h3>
              <button onClick={() => setPlaying(null)} className="text-text3 hover:text-text1 text-2xl">✕</button>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={playing.title}
              />
            </div>
            {playing.description && (
              <p className="mt-3 text-text2 text-sm">{playing.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Video grid */}
      {loading ? (
        <div className="text-text3 text-center py-10">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-text3">
          <div className="text-4xl mb-2">🎬</div>
          <p>אין סרטונים בקטגוריה זו</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <div key={v.id}
              className="card overflow-hidden group hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              onClick={() => setPlaying(v)}>

              {/* Thumbnail */}
              <div className="relative aspect-video bg-bg3 overflow-hidden">
                <img
                  src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { e.target.style.display = 'none' }}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
                  <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-xl
                    group-hover:scale-110 transition-transform">
                    <span className="text-white text-2xl mr-[-2px]">▶</span>
                  </div>
                </div>
                {/* Category badge */}
                <span className="absolute top-2 right-2 bg-black/70 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {v.category}
                </span>
                {v.is_global && (
                  <span className="absolute top-2 left-2 bg-purple-900/80 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    פיקוד
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-black text-sm leading-snug mb-1 group-hover:text-gold transition-colors">
                  {v.title}
                </h3>
                {v.description && (
                  <p className="text-text3 text-xs line-clamp-2">{v.description}</p>
                )}
                {canEdit && (
                  <button onClick={e => { e.stopPropagation(); del(v.id) }}
                    className="mt-2 text-red-400/50 hover:text-red-400 text-xs transition-colors">
                    🗑 מחק
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add video modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="🎥 הוספת סרטון הכשרה">
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">כותרת הסרטון *</label>
          <input className="form-input" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="לדוגמה: הגעלת כלים לפסח" />
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">קישור YouTube *</label>
          <input className="form-input" dir="ltr" value={form.youtube_url}
            onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
            placeholder="https://youtu.be/... או youtube.com/watch?v=..." />
          {form.youtube_url && (
            <div className="mt-1">
              {getYouTubeId(form.youtube_url)
                ? <span className="text-green-400 text-xs">✓ קישור תקין</span>
                : <span className="text-red-400 text-xs">✗ קישור לא זוהה</span>}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">קטגוריה</label>
          <select className="form-input" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-text3 font-bold block mb-1">תיאור (אופציונלי)</label>
          <textarea className="form-input" rows={2} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="תיאור קצר של הסרטון..." />
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <input type="checkbox" id="global" checked={form.is_global}
              onChange={e => setForm(f => ({ ...f, is_global: e.target.checked }))}
              className="w-4 h-4 accent-yellow-500" />
            <label htmlFor="global" className="text-sm font-bold cursor-pointer">
              גלוי לכל היחידות (שידור פיקוד)
            </label>
          </div>
        )}
        <ModalButtons onClose={() => setModal(false)} onSave={save} saveLabel="הוסף סרטון" />
      </Modal>
    </div>
  )
}
