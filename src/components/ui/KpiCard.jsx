const accentMap = {
  gold: 'bg-gold',
  green: 'bg-green-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
}
const valMap = {
  gold: 'text-gold',
  green: 'text-green-400',
  red: 'text-red-400',
  orange: 'text-orange-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
}

export default function KpiCard({ label, value, sub, color = 'gold' }) {
  return (
    <div className="kpi-card">
      <div className={`absolute top-0 right-0 w-1 h-full rounded-r-xl ${accentMap[color]}`} />
      <div className="text-[10px] font-bold text-text3 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-4xl font-black leading-none ${valMap[color]}`}>{value}</div>
      {sub && <div className="text-xs text-text3 mt-1.5">{sub}</div>}
    </div>
  )
}
