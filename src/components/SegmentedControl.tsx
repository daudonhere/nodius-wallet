interface Option<T extends string = string> {
  key: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (key: T) => void
}

export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="bg-darkbg border border-surfaceLight p-1 rounded-xl flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${
            value === opt.key
              ? 'bg-surfaceLight text-white border border-white/5 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
