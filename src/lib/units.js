export const UNITS = [
  // חטמ"רים
  { id: 'binyamin',   name: 'חטמ"ר בנימין',  icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'shomron',    name: 'חטמ"ר שומרון',  icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'yehuda',     name: 'חטמ"ר יהודה',   icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'etzion',     name: 'חטמ"ר עציון',   icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'efraim',     name: 'חטמ"ר אפרים',   icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'menashe',    name: 'חטמ"ר מנשה',    icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  { id: 'habikaa',    name: 'חטמ"ר הבקעה',   icon: '🛡', brigade: 'חטמ"רים',  pin: null,   is_admin: false, is_senior: false },
  // חטיבות
  { id: 'hativa_35',  name: 'חטיבה 35',       icon: '⚔', brigade: 'חטיבות',   pin: null,   is_admin: false, is_senior: false },
  { id: 'hativa_89',  name: 'חטיבה 89',       icon: '⚔', brigade: 'חטיבות',   pin: null,   is_admin: false, is_senior: false },
  { id: 'hativa_900', name: 'חטיבה 900',      icon: '⚔', brigade: 'חטיבות',   pin: null,   is_admin: false, is_senior: false },
  // אוגדות — דורשות PIN
  { id: 'ugdat_877',  name: 'אוגדת 877',       icon: '🎖', brigade: 'אוגדות',   pin: '8770', is_admin: false, is_senior: true  },
  { id: 'ugda_96',    name: 'אוגדת 96',        icon: '🎖', brigade: 'אוגדות',   pin: '9600', is_admin: false, is_senior: true  },
  { id: 'ugda_98',    name: 'אוגדת 98',        icon: '🎖', brigade: 'אוגדות',   pin: '9800', is_admin: false, is_senior: true  },
  // פיקוד מרכז — Admin
  { id: 'pikud',      name: 'פיקוד מרכז',      icon: '⭐', brigade: 'פיקוד',    pin: '1234', is_admin: true,  is_senior: true  },
]

export const BRIGADES = [...new Set(UNITS.map(u => u.brigade))]
