import { useStore } from '../../store/useStore'

const colors = {
  gold: 'border-yellow-600 text-gold',
  green: 'border-green-500 text-green-400',
  red: 'border-red-500 text-red-400',
  blue: 'border-blue-500 text-blue-400',
}

export default function Toast() {
  const toast = useStore(s => s.toast)
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]
      bg-bg3 border rounded-xl px-5 py-3 text-sm font-bold shadow-2xl
      animate-fade-in ${colors[toast.type] || colors.gold}`}>
      {toast.msg}
    </div>
  )
}
