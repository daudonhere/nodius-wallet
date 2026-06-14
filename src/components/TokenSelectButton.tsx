import { ChevronDown } from 'lucide-react'

interface Props {
  symbol: string
  icon: string
  onClick?: () => void
  selected?: boolean
}

export default function TokenSelectButton({ symbol, icon, onClick, selected }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 ${selected ? 'bg-[#2775CA]/10 border border-[#2775CA]/20' : 'bg-surfaceLight hover:bg-surfaceLight/80 border border-white/5'} transition-colors py-2.5 px-3.5 rounded-full shadow-sm`}
    >
      <img src={icon} alt={symbol} className="w-[22px] h-[22px]" />
      <span className="font-bold text-[15px]">{symbol}</span>
      <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
    </button>
  )
}
