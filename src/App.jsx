import { Suspense, lazy } from 'react'
import { useStore } from './store/useStore'
import Toast from './components/ui/Toast'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const AppShell = lazy(() => import('./pages/AppShell'))

export default function App() {
  const currentUnit = useStore(s => s.currentUnit)

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-bg0 flex items-center justify-center text-text2">טוען...</div>}>
        {!currentUnit ? <LoginPage /> : <AppShell />}
      </Suspense>
      <Toast />
    </>
  )
}
