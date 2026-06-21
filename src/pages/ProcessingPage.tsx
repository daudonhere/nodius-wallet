import { useEffect, useState } from 'react'
import { Loader2, ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'

const MESSAGES = [
  'Connecting to wallet…',
  'Verifying transaction…',
  'Estimating gas fees…',
  'Processing…',
  'Broadcasting to network…',
  'Almost there…',
]

const TOTAL_MS = 10_000
const MESSAGE_INTERVAL = TOTAL_MS / MESSAGES.length

export default function ProcessingPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'processing' | 'success'>('processing')
  const [msgIndex, setMsgIndex] = useState(0)
  const [fade, setFade] = useState(true)
  const [checkVisible, setCheckVisible] = useState(false)

  useEffect(() => {
    if (phase !== 'processing') return

    const msgTimer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setMsgIndex((i) => {
          const next = (i + 1) % MESSAGES.length
          return next
        })
        setFade(true)
      }, 200)
    }, MESSAGE_INTERVAL)

    const doneTimer = setTimeout(() => {
      clearInterval(msgTimer)
      setPhase('success')
      setTimeout(() => setCheckVisible(true), 150)
      setTimeout(() => navigate('/home', { replace: true }), 2500)
    }, TOTAL_MS)

    return () => {
      clearInterval(msgTimer)
      clearTimeout(doneTimer)
    }
  }, [phase, navigate])

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 pt-10 pb-6 px-5 flex items-center gap-3 z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[22px] font-bold tracking-tight">{phase === 'success' ? 'Complete' : 'Processing'}</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 pb-32 z-10 px-5">
        {phase === 'processing' ? (
          <>
            <Loader2 size={48} className="animate-spin text-neon" />
            <div className={`transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-[15px] text-zinc-400 font-medium text-center">{MESSAGES[msgIndex]}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className={`w-20 h-20 rounded-full bg-neon/10 flex items-center justify-center transition-all duration-500 ${checkVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
              <Check size={40} className="text-neon" />
            </div>
            <p className="text-[17px] text-zinc-200 font-semibold text-center">Transaction Complete</p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  )
}
