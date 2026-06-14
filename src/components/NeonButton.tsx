import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClick?: () => void
  fullWidth?: boolean
  disabled?: boolean
}

export default function NeonButton({ children, onClick, fullWidth = true, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : ''} bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
