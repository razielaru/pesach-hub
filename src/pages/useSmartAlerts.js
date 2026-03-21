import { useEffect, useState } from 'react'
import { UNITS } from '../lib/units'

export function useSmartAlerts(unitStats, daysLeft) {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!unitStats || Object.keys(unitStats).length === 0) return
    const found = []

    Object.entries(unitStats).forEach(([uid, s]) => {
      const unit = UNITS.find(u => u.id === uid)
      if (!unit) return
      const name = unit.name

      if (daysLeft <= 5 && s.trainedPct < 50) {
        found.push({ id: `tr-${uid}`, level: 'critical', icon: '🆘', text: `${name} — רק ${s.trainedPct}% הכשרות הושלמו! נותרו ${daysLeft} ימים`, unit: uid })
      } else if (daysLeft <= 10 && s.trainedPct < 70) {
        found.push({ id: `tr-${uid}`, level: 'warning', icon: '⚠️', text: `${name} — ${s.trainedPct}% הכשרות, פיגור מאחורי הזמנים`, unit: uid })
      }

      if (daysLeft <= 7 && s.cleanPct < 40) {
        found.push({ id: `cl-${uid}`, level: 'critical', icon: '🧹', text: `${name} — ${s.cleanPct}% ניקיון בלבד, ${daysLeft} ימים לפסח!`, unit: uid })
      }

      if (s.openInc >= 3) {
        found.push({ id: `inc-${uid}`, level: 'critical', icon: '🆘', text: `${name} — ${s.openInc} חריגים פתוחים ללא מענה`, unit: uid })
      } else if (s.openInc > 0) {
        found.push({ id: `inc1-${uid}`, level: 'warning', icon: '⚠️', text: `${name} — ${s.openInc} חריג פתוח`, unit: uid })
      }

      if (s.equipMissing >= 5) {
        found.push({ id: `eq-${uid}`, level: 'critical', icon: '📦', text: `${name} — ${s.equipMissing} פריטי ציוד חסרים`, unit: uid })
      }

      if (s.total === 0) {
        found.push({ id: `kd-${uid}`, level: 'info', icon: 'ℹ️', text: `${name} — אין נתוני כוח אדם במערכת`, unit: uid })
      }
    })

    found.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.level] - order[b.level]
    })

    setAlerts(found)
  }, [unitStats, daysLeft])

  return alerts
}
