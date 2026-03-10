export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-bg2 border border-gold rounded-2xl p-7 shadow-2xl
        max-h-[90vh] overflow-y-auto animate-pop
        ${wide ? 'w-[700px]' : 'w-[500px]'} max-w-[95vw]`}>
        <div className="text-lg font-black text-gold mb-5">{title}</div>
        {children}
      </div>
    </div>
  )
}

export function ModalButtons({ onClose, onSave, saveLabel = 'שמור', saveClass = '' }) {
  return (
    <div className="flex gap-3 justify-end mt-5">
      <button className="btn btn-ghost btn-sm" onClick={onClose}>ביטול</button>
      <button className={`btn btn-sm ${saveClass}`} onClick={onSave}>{saveLabel}</button>
    </div>
  )
}
