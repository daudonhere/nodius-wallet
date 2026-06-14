import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PageLayout from './components/PageLayout'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import WalletPage from './pages/WalletPage'
import SettingsPage from './pages/SettingsPage'
import TrendingPage from './pages/TrendingPage'
import SwapPage from './pages/SwapPage'
import BridgePage from './pages/BridgePage'
import TransferPage from './pages/TransferPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black flex items-start justify-center">
        <div className="w-full max-w-md mx-auto min-h-screen bg-darkbg relative shadow-2xl lg:my-0 lg:border-x lg:border-white/5">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route element={<PageLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/bridge" element={<BridgePage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/trending" element={<TrendingPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
