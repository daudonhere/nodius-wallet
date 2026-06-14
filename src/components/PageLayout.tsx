import { Outlet } from 'react-router-dom'
import BottomNavigation from './BottomNavigation'

export default function PageLayout() {
  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}
