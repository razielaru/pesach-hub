import { useStore } from '../store/useStore'
import { useState, useEffect } from 'react'
import Dashboard from './Dashboard'
import PersonnelPage from './PersonnelPage'
import TrainingPage from './TrainingPage'
import EquipmentPage from './EquipmentPage'
import CleaningPage from './CleaningPage'
import TasksPage from './TasksPage'
import IncidentsPage from './IncidentsPage'
import QnAPage from './QnAPage'
import TimelinePage from './TimelinePage'
import CommandPage from './CommandPage'
import UnitManagePage from './UnitManagePage'

const NAV = [
  { id: 'dashboard',  label: '🏠 ראשי',        admin: false },
  { id: 'personnel',  label: '👥 כוח אדם',      admin: false },
  { id: 'training',   label: '🎓 הכשרות',       admin: false },
  { id: 'equipment',  label: '📦 ציוד',          admin: false },
  { id: 'cleaning',   label: '🧹 ניקיונות',     admin: false },
  { id: 'tasks',      label: '✅ משימות',        admin: false },
  { id: 'incidents',  label: '🆘 חריגים',        admin: false },
  { id: 'qna',        label: '⚖️ שו"ת',          admin: false },
  { id: 'timeline',   label: '📅 טיימליין',      admin: false },
  { id: 'command',    label: '⭐ פיקוד',          admin: true  },
  { id: 'unitmanage', label: '⚙ ניהול',          admin: true  },
]

export default function AppShell() {
  const { currentUnit, isAdmin, isSenior, activePage, setPage, logout } = useStore()
  const [clock, setClock] = useState('')
  const [days, setDays] = useState(0)

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      const pesach = new Date('2026-04-02')
      setDays(Math.max(0, Math.ceil((pesach - new Date()) / 86400000)))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const canSeeAdmin = isAdmin || isSenior
  const visibleNav = NAV.filter(n => !n.admin || canSeeAdmin)

  const pages = {
    dashboard: <Dashboard />,
    personnel: <PersonnelPage />,
    training:  <TrainingPage />,
    equipment: <EquipmentPage />,
    cleaning:  <CleaningPage />,
    tasks:     <TasksPage />,
    incidents: <IncidentsPage />,
    qna:       <QnAPage />,
    timeline:  <TimelinePage />,
    command:   <CommandPage />,
    unitmanage:<UnitManagePage />,
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg0">
      {/* Top bar */}
      <header className="h-14 bg-bg1 border-b border-border1 flex items-center px-4 gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-xs text-text2">
          <span className="text-base">✡</span>
          <span className="font-bold hidden sm:block">רבנות פיקוד מרכז</span>
        </div>

        <span className="bg-yellow-900/30 border border-yellow-600/40 text-gold
          text-xs font-black px-3 py-1 rounded-full">
          {currentUnit?.name}
        </span>

        {/* Nav */}
        <nav className="flex gap-0.5 mx-auto overflow-x-auto scrollbar-hide">
          {visibleNav.map(n => (
            <button key={n.id}
              onClick={() => setPage(n.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                ${activePage === n.id
                  ? 'bg-yellow-900/30 text-gold'
                  : 'text-text2 hover:text-text1 hover:bg-bg3'}`}>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden md:flex items-center gap-1.5 bg-bg3 border border-border2
            text-gold2 text-xs font-bold px-3 py-1 rounded-full">
            ⏳ {days} ימים
          </span>
          <span className="text-text3 text-xs font-mono hidden md:block">{clock}</span>
          <button onClick={logout}
            className="text-xs text-text3 hover:text-text1 border border-border1
            hover:border-border2 px-3 py-1 rounded-lg transition-all">
            ← החלף
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
        {pages[activePage] || <Dashboard />}
      </main>
    </div>
  )
}
