import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

// ─── helpers ────────────────────────────────────────────────────────────────
function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/["']/g, '')
}

function mapRow(row, headers) {
  const obj = {}
  headers.forEach((h, i) => { obj[h] = row[i] ?? null })
  return obj
}

// Try to detect which column means what, flexibly
function findCol(keys, ...candidates) {
  for (const c of candidates) {
    const found = keys.find(k => k.includes(c))
    if (found) return found
  }
  return null
}

// ─── component ──────────────────────────────────────────────────────────────
export default function ImportPage() {
  const { currentUnit, showToast } = useStore()
  const [tab, setTab] = useState('personnel') // 'personnel' | 'units'
  const [preview, setPreview] = useState(null)   // { headers, rows, mapped }
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)     // { inserted, skipped, errors }
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  // ── parse file ──
  function handleFile(file) {
    if (!file) return
    setPreview(null); setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) { showToast('הקובץ ריק או לא תקין', 'red'); return }

        const rawHeaders = raw[0].map(normalizeHeader)
        const dataRows   = raw.slice(1).filter(r => r.some(c => c !== ''))

        // Map headers → field names
        const mapped = tab === 'personnel'
          ? mapPersonnelHeaders(rawHeaders)
          : mapUnitsHeaders(rawHeaders)

        setPreview({ headers: rawHeaders, rows: dataRows, mapped, count: dataRows.length })
      } catch (err) {
        showToast('שגיאה בקריאת הקובץ: ' + err.message, 'red')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── header mapping — personnel ──
  function mapPersonnelHeaders(keys) {
    return {
      name:            findCol(keys, 'שם', 'name', 'full'),
      role:            findCol(keys, 'תפקיד', 'role', 'rank', 'דרגה'),
      status:          findCol(keys, 'סטטוס', 'status'),
      training_status: findCol(keys, 'הכשרה', 'training', 'מכשיר'),
      unit_id:         findCol(keys, 'יחידה', 'unit', 'unit_id'),
    }
  }

  // ── header mapping — units ──
  function mapUnitsHeaders(keys) {
    return {
      id:       findCol(keys, 'id', 'מזהה', 'קוד'),
      name:     findCol(keys, 'שם', 'name', 'יחידה'),
      brigade:  findCol(keys, 'חטיבה', 'brigade', 'גזרה'),
      icon:     findCol(keys, 'אייקון', 'icon', 'סמל'),
      pin:      findCol(keys, 'pin', 'קוד', 'סיסמה'),
      is_admin: findCol(keys, 'admin', 'מנהל'),
    }
  }

  // ── get cell value by mapped key ──
  function getVal(row, headers, mappedKey) {
    if (!mappedKey) return null
    const idx = headers.indexOf(mappedKey)
    return idx >= 0 ? (row[idx] ?? null) : null
  }

  // ── import personnel ──
  async function importPersonnel() {
    setImporting(true)
    const { headers, rows, mapped } = preview
    let inserted = 0, skipped = 0, errors = []

    for (const row of rows) {
      const name = getVal(row, headers, mapped.name)
      if (!name) { skipped++; continue }

      // Determine unit_id: from column or fall back to currentUnit
      let unit_id = getVal(row, headers, mapped.unit_id) || currentUnit?.id
      if (!unit_id) { skipped++; errors.push(`חסר unit_id לשורה: ${name}`); continue }

      // Normalize status/training
      const rawStatus = String(getVal(row, headers, mapped.status) || '').trim()
      const status = normalizeStatus(rawStatus) || 'available'

      const rawTr = String(getVal(row, headers, mapped.training_status) || '').trim()
      const training_status = normalizeTrStatus(rawTr) || 'none'

      const role = getVal(row, headers, mapped.role) || 'סגל'

      const { error } = await supabase.from('personnel').insert({
        unit_id, name: String(name).trim(), role: String(role).trim(),
        status, training_status
      })
      if (error) { errors.push(`${name}: ${error.message}`); skipped++ }
      else inserted++
    }

    setResult({ inserted, skipped, errors })
    setImporting(false)
    if (inserted > 0) showToast(`יובאו ${inserted} אנשים ✅`, 'green')
  }

  // ── import units ──
  async function importUnits() {
    setImporting(true)
    const { headers, rows, mapped } = preview
    let inserted = 0, skipped = 0, errors = []

    for (const row of rows) {
      const name = getVal(row, headers, mapped.name)
      if (!name) { skipped++; continue }

      // Generate id from name if not provided
      let id = getVal(row, headers, mapped.id)
      if (!id) id = String(name).trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, '')

      const brigade  = getVal(row, headers, mapped.brigade) || 'כללי'
      const icon     = getVal(row, headers, mapped.icon) || '🛡'
      const pin      = getVal(row, headers, mapped.pin) || null
      const rawAdmin = getVal(row, headers, mapped.is_admin)
      const is_admin = rawAdmin === true || rawAdmin === 1 || String(rawAdmin).includes('כן')

      const { error } = await supabase.from('units').upsert({
        id, name: String(name).trim(), brigade: String(brigade).trim(),
        icon: String(icon).trim(), pin: pin ? String(pin).trim() : null,
        is_admin, is_senior: false
      }, { onConflict: 'id' })

      if (error) { errors.push(`${name}: ${error.message}`); skipped++ }
      else inserted++
    }

    setResult({ inserted, skipped, errors })
    setImporting(false)
    if (inserted > 0) showToast(`יובאו ${inserted} יחידות ✅`, 'green')
  }

  function handleImport() {
    if (!preview) return
    tab === 'personnel' ? importPersonnel() : importUnits()
  }

  // ── status normalizers ──
  function normalizeStatus(s) {
    const lower = s.toLowerCase()
    if (lower.includes('זמין') || lower.includes('avail')) return 'available'
    if (lower.includes('זום') || lower.includes('zoom'))   return 'zoom'
    if (lower.includes('חופש') || lower.includes('leave')) return 'leave'
    if (lower.includes('שטח') || lower.includes('away'))   return 'away'
    return null
  }
  function normalizeTrStatus(s) {
    const lower = s.toLowerCase()
    if (lower.includes('הושלמ') || lower.includes('done') || lower.includes('סיים')) return 'done'
    if (lower.includes('פעיל') || lower.includes('active') || lower.includes('בתהליך')) return 'active'
    if (lower.includes('אין') || lower.includes('none') || lower === '') return 'none'
    return null
  }

  // ── template download ──
  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    if (tab === 'personnel') {
      const ws = XLSX.utils.aoa_to_sheet([
        ['שם מלא', 'תפקיד', 'יחידה (unit_id)', 'סטטוס', 'סטטוס הכשרה'],
        ['ישראל ישראלי', 'מכשירן', 'binyamin', 'זמין', 'הושלמה'],
        ['דוד כהן',      'קצין',   'shomron',  'זמין', 'בתהליך'],
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'כוח אדם')
    } else {
      const ws = XLSX.utils.aoa_to_sheet([
        ['id', 'שם יחידה', 'חטיבה/גזרה', 'אייקון', 'PIN', 'מנהל (כן/לא)'],
        ['new_unit_1', 'יחידה חדשה', 'חטמ"רים', '🛡', '', 'לא'],
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'יחידות')
    }
    XLSX.writeFile(wb, tab === 'personnel' ? 'תבנית_כוח_אדם.xlsx' : 'תבנית_יחידות.xlsx')
  }

  // ── UI ──
  const { mapped, rows, count } = preview || {}

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black">📊 ייבוא מאקסל</h2>
          <p className="text-text3 text-xs mt-0.5">העלה קובץ Excel ויובא אוטומטית לבסיס הנתונים</p>
        </div>
        <button onClick={downloadTemplate}
          className="btn btn-ghost btn-sm text-xs flex items-center gap-1.5">
          ⬇ הורד תבנית {tab === 'personnel' ? 'כוח אדם' : 'יחידות'}
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex bg-bg3 border border-border1 rounded-xl overflow-hidden w-fit">
        {[['personnel','👥 כוח אדם'], ['units','🏢 יחידות']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setPreview(null); setResult(null) }}
            className={`px-5 py-2.5 text-sm font-bold transition-all
              ${tab === id ? 'bg-gold text-black' : 'text-text2 hover:text-text1'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${dragOver ? 'border-gold bg-yellow-900/10' : 'border-border2 hover:border-border1 hover:bg-bg2'}`}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <div className="text-4xl mb-3">📂</div>
        <p className="font-bold text-text1">גרור קובץ לכאן או לחץ לבחירה</p>
        <p className="text-text3 text-sm mt-1">.xlsx / .xls / .csv</p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="card space-y-4">
          <div className="panel-head">
            <span className="panel-title">👁 תצוגה מקדימה — {count} שורות</span>
            <button onClick={handleImport} disabled={importing}
              className={`btn ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {importing ? '⏳ מייבא...' : `⬆ יבא ${count} רשומות`}
            </button>
          </div>

          {/* Column mapping */}
          <div className="bg-bg3 border border-border1 rounded-xl p-4">
            <p className="text-xs font-bold text-text3 mb-3">🗺 מיפוי עמודות שזוהה אוטומטית:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(mapped).map(([field, col]) => (
                <div key={field} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border
                  ${col ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/20 bg-red-900/10'}`}>
                  <span className={col ? 'text-green-400' : 'text-red-400'}>{col ? '✓' : '✗'}</span>
                  <span className="text-text3">{field}</span>
                  {col && <span className="text-text1 font-bold mr-auto truncate max-w-[80px]">← {col}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Sample rows */}
          <div className="overflow-x-auto rounded-xl border border-border1">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-bg3 border-b border-border1">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="text-right px-3 py-2 text-text3 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1/40">
                {rows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="hover:bg-bg3/30">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-text2 whitespace-nowrap max-w-[120px] truncate">
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {count > 5 && (
              <div className="text-center text-text3 text-xs py-2 border-t border-border1">
                ...ועוד {count - 5} שורות
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card border-2 p-5 space-y-3
          ${result.errors.length === 0 ? 'border-green-500/40' : 'border-orange-500/40'}`}>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400 font-black text-2xl">{result.inserted}</span>
            <span className="text-green-400 self-end mb-0.5">יובאו בהצלחה</span>
            {result.skipped > 0 && <>
              <span className="text-orange-400 font-black text-2xl mr-4">{result.skipped}</span>
              <span className="text-orange-400 self-end mb-0.5">דולגו</span>
            </>}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 space-y-1">
              <p className="text-red-400 text-xs font-bold">שגיאות:</p>
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-red-300 text-xs">{e}</p>
              ))}
            </div>
          )}
          <button onClick={() => { setPreview(null); setResult(null) }} className="btn btn-ghost btn-sm text-xs">
            ← ייבוא נוסף
          </button>
        </div>
      )}

      {/* Instructions */}
      {!preview && !result && (
        <div className="card p-5 space-y-3 text-sm text-text2">
          <p className="font-bold text-text1">📋 הוראות:</p>
          <div className="space-y-2 text-xs leading-relaxed">
            {tab === 'personnel' ? <>
              <p>• עמודות מומלצות: <span className="text-gold font-bold">שם מלא, תפקיד, יחידה, סטטוס, סטטוס הכשרה</span></p>
              <p>• ה<span className="text-gold">יחידה</span> צריכה להיות ה-ID של היחידה (binyamin, shomron, וכו')</p>
              <p>• אם אין עמודת יחידה — ייובא ליחידה שלך הנוכחית</p>
              <p>• ערכי הכשרה: <span className="text-green-400">הושלמה / done</span> · <span className="text-orange-400">בתהליך / active</span> · <span className="text-text3">אין / none</span></p>
            </> : <>
              <p>• עמודות מומלצות: <span className="text-gold font-bold">id, שם יחידה, חטיבה, אייקון, PIN</span></p>
              <p>• ה-<span className="text-gold">id</span> צריך להיות ייחודי ובאנגלית (לדוגמה: unit_101)</p>
              <p>• אם אין id — ייוצר אוטומטית משם היחידה</p>
              <p>• יחידות קיימות יעודכנו, חדשות יתווספו</p>
            </>}
          </div>
        </div>
      )}
    </div>
  )
}
