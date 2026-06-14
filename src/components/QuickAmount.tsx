interface Props {
  onSelect: (pct: string) => void
}

const presets = ['25%', '50%', '75%', 'Max']

export default function QuickAmount({ onSelect }: Props) {
  return (
    <div className="flex gap-1.5">
      {presets.map((pct) => (
        <button
          key={pct}
          onClick={() => onSelect(pct)}
          className="text-[11px] font-bold bg-surfaceLight border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:border-neon/30 transition-colors"
        >
          {pct}
        </button>
      ))}
    </div>
  )
}
