// ══════════════════════════════════════════════════════
// היררכיה מלאה:
//   פיקוד מרכז  → רואה הכל
//   אוגדת 877   → בנימין, שומרון, יהודה, עציון, אפרים, מנשה
//   אוגדת 96    → חטמ"ר הבקעה
//   אוגדת 98    → חטיבה 89, חטיבת הצנחנים (35), חטיבות היתר
//   פיקוד ישיר  → חטיבה 900
// ══════════════════════════════════════════════════════

export const UNITS = [
  // ── חטמ"רים תחת אוגדת 877 ──
  { id: 'binyamin',     name: 'חטמ"ר בנימין',        icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  { id: 'shomron',      name: 'חטמ"ר שומרון',        icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  { id: 'yehuda',       name: 'חטמ"ר יהודה',         icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  { id: 'etzion',       name: 'חטמ"ר עציון',         icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  { id: 'efraim',       name: 'חטמ"ר אפרים',         icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  { id: 'menashe',      name: 'חטמ"ר מנשה',          icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugdat_877', pin: null,   is_admin: false, is_senior: false },
  // ── חטמ"ר הבקעה תחת אוגדת 96 ──
  { id: 'habikaa',      name: 'חטמ"ר הבקעה',         icon: '🛡', brigade: 'חטמ"רים', ugda: 'ugda_96',   pin: null,   is_admin: false, is_senior: false },
  // ── חטיבות תחת אוגדת 98 ──
  { id: 'hativa_35',    name: 'חטיבת הצנחנים (35)',  icon: '🪂', brigade: 'חטיבות',  ugda: 'ugda_98',   pin: null,   is_admin: false, is_senior: false },
  { id: 'hativa_89',    name: 'חטיבה 89',             icon: '⚔', brigade: 'חטיבות',  ugda: 'ugda_98',   pin: null,   is_admin: false, is_senior: false },
  { id: 'hativa_other', name: 'חטיבות היתר',         icon: '⚔', brigade: 'חטיבות',  ugda: 'ugda_98',   pin: null,   is_admin: false, is_senior: false },
  // ── חטיבה 900 — תחת פיקוד ישיר ──
  { id: 'hativa_900',   name: 'חטיבה 900',            icon: '⚔', brigade: 'חטיבות',  ugda: 'pikud',     pin: null,   is_admin: false, is_senior: false },
  // ── אוגדות ──
  { id: 'ugdat_877',    name: 'אוגדת 877',             icon: '🎖', brigade: 'אוגדות',  ugda: 'pikud',     pin: '8770', is_admin: false, is_senior: true  },
  { id: 'ugda_96',      name: 'אוגדת 96',              icon: '🎖', brigade: 'אוגדות',  ugda: 'pikud',     pin: '9600', is_admin: false, is_senior: true  },
  { id: 'ugda_98',      name: 'אוגדת 98',              icon: '🎖', brigade: 'אוגדות',  ugda: 'pikud',     pin: '9800', is_admin: false, is_senior: true  },
  // ── פיקוד מרכז ──
  { id: 'pikud',        name: 'פיקוד מרכז',            icon: '⭐', brigade: 'פיקוד',   ugda: null,        pin: '1234', is_admin: true,  is_senior: true  },
]

export const BRIGADES = [...new Set(UNITS.map(u => u.brigade))]

// ══ פונקציות היררכיה ══

/**
 * החזר יחידות-עלים (לא אוגדות, לא פיקוד) שהיחידה מנהלת ישירות.
 * פיקוד → כל היחידות חוץ ממנו.
 * אוגדה → כל היחידות שה-ugda שלהן = id האוגדה.
 * יחידת-עלה → רשימה ריקה.
 */
export function getSubordinateUnits(unitId) {
  if (unitId === 'pikud') {
    // הפיקוד רואה הכל — כולל אוגדות וכולל יחידות עלה
    return UNITS.filter(u => u.id !== 'pikud')
  }
  const unit = UNITS.find(u => u.id === unitId)
  if (unit?.is_senior) {
    // אוגדה — רק יחידות-עלה ישירות
    return UNITS.filter(u => u.ugda === unitId)
  }
  return []
}

/**
 * רק יחידות-עלה (לא אוגדות) — לטבלאות ולשליחת משימות.
 */
export function getLeafUnits(unitId) {
  return getSubordinateUnits(unitId).filter(u => !u.is_senior && !u.is_admin)
}

/**
 * האם יחידה יכולה לנהל יחידה אחרת?
 */
export function canManage(managerId, targetId) {
  if (managerId === targetId) return false
  if (managerId === 'pikud') return true
  return getSubordinateUnits(managerId).some(u => u.id === targetId)
}
