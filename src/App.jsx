import { useStore } from './store/useStore'
import LoginPage from './pages/LoginPage'
import AppShell from './pages/AppShell'
import Toast from './components/UI/Toast'

export default function App() {
  const currentUnit = useStore(s => s.currentUnit)

  return (
    <>
      {!currentUnit ? <LoginPage /> : <AppShell />}
      <Toast />
    </>
  )
}