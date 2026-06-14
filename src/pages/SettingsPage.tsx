import type { ReactNode } from 'react'
import { Search, Moon, Coins, Globe, Zap, Fuel, Fingerprint, BellRing, Blocks, LifeBuoy, LogOut, ChevronRight, Copy, Camera, QrCode, Rocket } from 'lucide-react'

type ToggleItem = {
  icon: typeof Moon
  label: string
  description?: string
}

function ToggleRow({ icon: Icon, label, description }: ToggleItem) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-surfaceLight/50">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-300">
          <Icon size={16} />
        </div>
        <div>
          <span className="text-sm font-semibold block">{label}</span>
          {description && <span className="text-[11px] text-zinc-500">{description}</span>}
        </div>
      </div>
      <div className="w-12 h-6.5 bg-neon rounded-full relative cursor-pointer flex items-center px-0.5">
        <div className="w-5.5 h-5.5 bg-black rounded-full absolute right-0.5 shadow-sm" />
      </div>
    </div>
  )
}

function ChevronRow({ icon: Icon, label, right }: { icon: typeof Moon; label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-surfaceLight/50 cursor-pointer group">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-300">
          <Icon size={16} />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-zinc-400 group-hover:text-neon transition-colors">
        {right}
        <ChevronRight size={14} />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <>
      <header className="sticky top-0 pt-14 px-5 pb-4 flex items-center justify-between z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white hover:border-neon/50 transition-colors">
          <Search size={18} />
        </button>
      </header>

      <div className="px-5 mb-8">
        <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-surfaceLight rounded-[24px] p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-neon opacity-10 rounded-full blur-[30px]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <img src="https://i.pravatar.cc/150?u=alex" alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-surfaceLight" />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-surfaceLight border-2 border-[#111111] rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-neon/20 hover:border-neon transition-all">
                <Camera size={10} />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold">Alex.eth</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-zinc-400 font-mono bg-darkbg/50 px-2 py-1 rounded-md border border-white/5">0x4F9...A1b2</p>
                <button className="text-zinc-500 hover:text-neon transition-colors">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-400 hover:text-neon transition-colors relative z-10">
            <QrCode size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 mb-8">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">General</h3>
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] px-4">
          <ToggleRow icon={Moon} label="Dark Mode" description="Saves battery life" />
          <ChevronRow icon={Coins} label="Local Currency" right={<span className="text-xs font-semibold uppercase">USD ($)</span>} />
          <ChevronRow
            icon={Globe}
            label="Default Network"
            right={
              <div className="flex items-center gap-1.5 bg-surfaceLight px-2 py-1 rounded-md border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#627EEA]" />
                <span className="text-xs font-semibold">Ethereum</span>
              </div>
            }
          />
        </div>
      </div>

      <div className="px-5 mb-8">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Transactions &amp; Fees</h3>
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] px-4">
          <ToggleRow icon={Zap} label="0 Gas Fee Routing" description="Auto-select gasless paths" />
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-300">
                  <Fuel size={16} />
                </div>
                <span className="text-sm font-semibold">Default Gas Speed</span>
              </div>
            </div>
            <div className="bg-darkbg border border-surfaceLight p-1 rounded-xl flex gap-1">
              <button className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg text-zinc-400 hover:text-white transition-colors">Slow</button>
              <button className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg bg-surfaceLight text-white border border-white/5 shadow-sm">Normal</button>
              <button className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5">
                <Rocket size={14} className="text-neon" />
                Fast
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-8">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Security &amp; Notifications</h3>
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] px-4">
          <ToggleRow icon={Fingerprint} label="Biometric Unlock" />
          <ToggleRow icon={BellRing} label="Push Notifications" description="Alerts & price movements" />
          <ChevronRow
            icon={Blocks}
            label="Connected dApps"
            right={<span className="text-xs font-semibold bg-surfaceLight px-2 py-1 rounded-md">3 Active</span>}
          />
        </div>
      </div>

      <div className="px-5 mb-6">
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] px-4">
          <ChevronRow icon={LifeBuoy} label="Help Center" />
          <div className="flex items-center gap-3.5 py-4 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-colors">
              <LogOut size={16} />
            </div>
            <span className="text-sm font-semibold text-red-500">Disconnect Wallet</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-zinc-600 mt-6 font-mono">Neon Aggregator v1.2.4</p>
      </div>
    </>
  )
}
