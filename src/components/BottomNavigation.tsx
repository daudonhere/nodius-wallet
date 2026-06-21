import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, History, Wallet, Settings, Coins } from 'lucide-react'

const tabs = [
  { id: 'home', label: 'Home', icon: LayoutGrid, path: '/home' },
  { id: 'history', label: 'History', icon: History, path: '/history' },
  { id: 'token', label: 'Token', icon: Coins, path: '/trending' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
] as const

export default function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  const homePaths = ['/home', '/swap', '/bridge', '/transfer']

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md border-t border-white/5 pb-[34px] pt-4 px-6 z-40 bg-darkbg/85 backdrop-blur-[12px]"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="flex justify-between items-center">
        {tabs.map((tab) => {
          const isActive = tab.id === 'home' ? homePaths.includes(location.pathname) : location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1.5 transition-colors group ${isActive ? 'text-neon' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <div className="relative">
                <Icon className="text-[22px]" />
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-neon rounded-full" />
                )}
              </div>
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
