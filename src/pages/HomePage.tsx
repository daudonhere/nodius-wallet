import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, Bell, Copy, ArrowLeftRight, GitMerge, Upload, ArrowDownToLine, TrendingUp, TrendingDown, Wallet, Coins, Download, X } from 'lucide-react'
import { useTonAddress } from '@tonconnect/ui-react'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useBalances } from '../hooks/useBalances'

const walletIcons: Record<string, string> = {
  EVM: 'https://cryptologos.cc/logos/versions/ethereum-eth-logo-diamond-purple.svg',
  Solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
}

interface WalletCard {
  name: string
  icon: string
  address: string
  copyAddress: string
  balance: string
  usdValue: string
  tokenLine: string
  glow: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [qrWallet, setQrWallet] = useState<WalletCard | null>(null)
  const { tokens, prices } = useBalances()
  const { evm, solana, user, authenticated } = useWalletConnection()
  const tonAddress = useTonAddress()

  const userPhoto = null
  const userName = user?.google?.name || user?.github?.name || user?.discord?.username || 'My Wallet'

  const totalUsdBalance = tokens.reduce((sum, t) => {
    const price = prices[t.symbol]?.price
    return sum + (price && t.balance !== '—' ? parseFloat(t.balance) * price : 0)
  }, 0)

  const balanceLine = tokens.filter(t => t.balance && t.balance !== '—' && parseFloat(t.balance) > 0).length
    ? `${tokens.filter(t => t.balance && t.balance !== '—' && parseFloat(t.balance) > 0).length} assets across chains`
    : '—'

  const anyConnected = (authenticated && evm.connected && evm.address) || (authenticated && solana.connected && solana.address) || !!tonAddress

  const primaryAddress = evm.address || solana.address || tonAddress || ''
  const primaryAddressShort = primaryAddress ? `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}` : ''

  const ethToken = tokens.find(t => t.symbol === 'ETH')
  const solToken = tokens.find(t => t.symbol === 'SOL')
  const tonToken = tokens.find(t => t.symbol === 'TON')

  const wallets: WalletCard[] = [
    ...(anyConnected ? [{
      name: 'Nodius Wallet', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=nodius&size=32', address: primaryAddressShort, copyAddress: primaryAddress, balance: totalUsdBalance.toFixed(2), usdValue: '', tokenLine: balanceLine, glow: 'bg-neon',
    }] : []),
    ...(authenticated && evm.connected && evm.address ? [{
      name: 'EVM', icon: walletIcons.EVM, address: `${evm.address.slice(0, 6)}...${evm.address.slice(-4)}`, copyAddress: evm.address, balance: ethToken?.balance ?? '0', usdValue: ethToken?.balance && prices.ETH?.price ? (parseFloat(ethToken.balance) * prices.ETH.price).toFixed(2) : '0', tokenLine: ethToken?.balance ? `${parseFloat(ethToken.balance).toFixed(4)} ETH` : '', glow: 'bg-neon',
    }] : []),
    ...(authenticated && solana.connected && solana.address ? [{
      name: 'Solana', icon: walletIcons.Solana, address: `${solana.address.slice(0, 4)}...${solana.address.slice(-4)}`, copyAddress: solana.address, balance: solToken?.balance ?? '0', usdValue: solToken?.balance && prices.SOL?.price ? (parseFloat(solToken.balance) * prices.SOL.price).toFixed(2) : '0', tokenLine: solToken?.balance ? `${parseFloat(solToken.balance).toFixed(4)} SOL` : '', glow: 'bg-[#ab9ff2]',
    }] : []),
    ...(tonAddress ? [{
      name: 'TON', icon: walletIcons.TON, address: `${tonAddress.slice(0, 4)}...${tonAddress.slice(-4)}`, copyAddress: tonAddress, balance: tonToken?.balance ?? '—', usdValue: '', tokenLine: tonToken?.balance && tonToken.balance !== '—' ? `${parseFloat(tonToken.balance).toFixed(4)} TON` : '', glow: 'bg-[#0098EA]',
    }] : []),
  ]

  const chainIcons: Record<string, string> = {
    Ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    Base: 'https://cryptologos.cc/logos/base-base-logo.svg',
    Polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    Arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    Solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
  }

  const ownedTokens = tokens.filter(t => t.balance && t.balance !== '—' && parseFloat(t.balance) > 0 && prices[t.symbol]?.price != null)

  interface ChainGroup { name: string; icon: string; tokens: { symbol: string; balance: string; icon?: string; usdValue?: string; change24h?: number }[] }

  const chainGroups = ownedTokens.reduce<Record<string, ChainGroup>>((acc, t) => {
    const chainName = t.chainName || 'Other'
    const icon = chainIcons[chainName] || t.icon || walletIcons.EVM
    if (!acc[chainName]) acc[chainName] = { name: chainName, icon, tokens: [] }
    const priceInfo = prices[t.symbol]
    acc[chainName].tokens.push({
      symbol: t.symbol,
      balance: t.balance,
      icon: t.icon,
      usdValue: priceInfo?.price != null ? (parseFloat(t.balance) * priceInfo.price).toFixed(2) : undefined,
      change24h: priceInfo?.change24h ?? undefined,
    })
    return acc
  }, {})

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('div:first-child')?.clientWidth ?? 1
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + 16)))
  }

  return (
    <>
      <header className="sticky top-0 pt-10 pb-6 px-5 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={userPhoto || 'https://i.pravatar.cc/150?u=default'}
              alt="Profile"
              className="w-11 h-11 rounded-full object-cover border-2 border-surfaceLight"
            />
            {(evm.connected || solana.connected || tonAddress) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-darkbg rounded-full" />
            )}
          </div>
          <div>
            <p className="text-lg font-bold">{userName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 relative hover:text-neon hover:border-neon transition-colors">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-neon rounded-full shadow-[0_0_8px_#CCFF00]" />
          </button>
        </div>
      </header>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
          <div className="absolute left-5 right-5 top-28 z-40">
            <div className="bg-surface border border-surfaceLight rounded-[20px] p-4 flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-surfaceLight">
                <h4 className="text-sm font-bold text-zinc-200">Notifications</h4>
                <button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                <div className="flex items-center gap-3 py-2 border-b border-surfaceLight last:border-0">
                  <div className="w-8 h-8 rounded-full bg-neon/10 flex items-center justify-center shrink-0">
                    <Bell size={14} className="text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">Welcome to Nodius Wallet</p>
                    <p className="text-xs text-zinc-600 truncate">Get started by connecting your first wallet</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2 border-b border-surfaceLight last:border-0">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <ArrowLeftRight size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">Swap feature available</p>
                    <p className="text-xs text-zinc-600 truncate">Trade across EVM and Solana</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <GitMerge size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">Bridge is live</p>
                    <p className="text-xs text-zinc-600 truncate">Cross-chain transfers now supported</p>
                  </div>
                </div>
              </div>
              <button className="w-full text-xs text-neon font-semibold hover:text-white transition-colors text-center pt-3 border-t border-surfaceLight mt-1">Read All</button>
            </div>
          </div>
        </>
      )}

      {wallets.length === 0 ? (
        <div className="mt-4 mb-5 px-5">
          <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] rounded-[28px] p-10 border border-neon flex flex-col items-center justify-center gap-4 text-center" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="w-16 h-16 rounded-full bg-surface border border-surfaceLight flex items-center justify-center">
              <Wallet size={28} className="text-neon" />
            </div>
            <div>
              <h3 className="text-base font-bold">No Wallet Connected</h3>
              <p className="text-sm text-zinc-500 mt-1">Connect a blockchain to see your wallet</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 mb-5">
          <div ref={wallets.length > 1 ? scrollRef : undefined} onScroll={wallets.length > 1 ? handleScroll : undefined} className={`flex gap-4 ${wallets.length > 1 ? 'overflow-x-auto snap-x snap-mandatory hide-scrollbar px-5 pb-2' : 'px-5'}`}>
            {wallets.map((wallet) => (
              <div key={wallet.name} className={`bg-gradient-to-br from-[#111111] to-[#0a0a0a] rounded-[28px] p-6 border border-neon relative overflow-hidden ${wallets.length > 1 ? 'snap-center shrink-0 w-[88%]' : 'w-full'}`} style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
                <div className={`absolute -right-10 -top-10 w-32 h-32 ${wallet.glow} opacity-10 rounded-full blur-[40px]`} />
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-2.5 bg-surfaceLight/50 px-3 py-1.5 rounded-full border border-white/5">
                    <img src={wallet.icon} alt={wallet.name} className="w-5 h-5" />
                    <span className="text-xs font-semibold text-zinc-300">{wallet.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setQrWallet(wallet) }}
                    className="w-8 h-8 rounded-full bg-surfaceLight/50 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-neon hover:border-neon transition-colors"
                  >
                    <QrCode size={15} />
                  </button>
                </div>
                <div className="relative z-10">
                  <p className="text-xs text-zinc-400 font-medium mb-1">{wallet.name === 'Nodius Wallet' ? 'Total Portfolio' : wallet.name}</p>
                  <h2 className="text-[32px] font-bold font-mono tracking-tight mb-1">
                    {wallet.name === 'Nodius Wallet'
                      ? `$${totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : wallet.usdValue
                        ? `$${parseFloat(wallet.usdValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : wallet.balance !== '—'
                          ? `${parseFloat(wallet.balance).toFixed(4)}`
                          : '—'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono mb-3">{wallet.tokenLine || '—'}</p>
                  {wallet.address && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500 font-mono bg-surfaceLight/50 px-2 py-1 rounded-md">{wallet.address}</p>
                      <button className="text-zinc-400 hover:text-neon" onClick={() => navigator.clipboard.writeText(wallet.copyAddress)}>
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {wallets.length > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              {wallets.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-neon w-4' : 'bg-zinc-600'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-5 mb-8">
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => navigate('/swap')} className="bg-surface border rounded-[16px] p-3 flex flex-col items-center justify-center gap-1.5 border-neon hover:border-neon hover:bg-surfaceLight transition-all group" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="w-10 h-10 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-neon group-hover:text-neon group-hover:border-neon transition-colors">
              <ArrowLeftRight size={18} />
            </div>
            <span className="text-[11px] font-semibold">Swap</span>
          </button>
          <button onClick={() => navigate('/bridge')} className="bg-surface border rounded-[16px] p-3 flex flex-col items-center justify-center gap-1.5 border-neon hover:border-neon hover:bg-surfaceLight transition-all group" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="w-10 h-10 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-neon group-hover:text-neon group-hover:border-neon transition-colors">
              <GitMerge size={18} />
            </div>
            <span className="text-[11px] font-semibold">Bridge</span>
          </button>
          <button onClick={() => navigate('/transfer')} className="bg-surface border rounded-[16px] p-3 flex flex-col items-center justify-center gap-1.5 border-neon hover:border-neon hover:bg-surfaceLight transition-all group" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="w-10 h-10 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-neon group-hover:text-neon group-hover:border-neon transition-colors">
              <Upload size={18} />
            </div>
            <span className="text-[11px] font-semibold">Transfer</span>
          </button>
          <button onClick={() => wallets[0] && setQrWallet(wallets[0])} disabled={wallets.length === 0} className="bg-surface border rounded-[16px] p-3 flex flex-col items-center justify-center gap-1.5 border-neon hover:border-neon hover:bg-surfaceLight transition-all group disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="w-10 h-10 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-neon group-hover:text-neon group-hover:border-neon transition-colors">
              <ArrowDownToLine size={18} />
            </div>
            <span className="text-[11px] font-semibold">Receive</span>
          </button>
        </div>
      </div>

      <div className="px-5">
        <h3 className="text-base font-bold mb-5 flex items-center gap-2">
          <Coins size={16} className="text-neon" />
          Asset
        </h3>
        {ownedTokens.length > 0 ? (
          <div className="flex flex-col gap-6">
            {Object.values(chainGroups).map((group) => (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-3">
                  <img src={group.icon} alt={group.name} className="w-5 h-5 rounded-full" />
                  <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{group.name}</h4>
                </div>
                <div className="flex flex-col gap-2">
                  {group.tokens.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight">
                      <div className="flex items-center gap-3.5">
                        <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full" />
                        <div>
                          <h4 className="font-bold text-[15px]">{token.symbol}</h4>
                          <p className="text-[11px] text-zinc-500 font-medium">{parseFloat(token.balance).toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold text-[15px] font-mono">
                          {token.usdValue != null
                            ? `$${parseFloat(token.usdValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </h4>
                        {token.change24h != null && (
                          <div className={`flex items-center justify-end gap-1 mt-0.5 ${token.change24h >= 0 ? 'text-neon' : 'text-red-500'}`}>
                            {token.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            <p className="text-xs font-semibold">{token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Coins size={24} className="text-zinc-600" />
            <p className="text-sm text-zinc-500">
              {authenticated || tonAddress ? 'No tokens with balance' : 'No asset connected'}
            </p>
          </div>
        )}
      </div>

      {qrWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQrWallet(null)} />
          <div className="relative bg-surface border border-surfaceLight rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-zinc-200">Receive</h3>
              <button onClick={() => setQrWallet(null)} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrWallet.copyAddress)}`}
                  alt="QR Code"
                  className="w-56 h-56"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white p-1 shadow-lg">
                    <img src={qrWallet.icon} alt={qrWallet.name} className="w-full h-full rounded-full" />
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{qrWallet.name}</p>
              <p className="text-xs text-zinc-500 font-mono bg-darkbg border border-surfaceLight px-3 py-1.5 rounded-lg break-all text-center max-w-full">
                {qrWallet.copyAddress}
              </p>
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = `https://api.qrserver.com/v1/create-qr-code/?size=560x560&data=${encodeURIComponent(qrWallet.copyAddress)}`
                  a.download = `nodius-${qrWallet.name.toLowerCase()}-address.png`
                  a.click()
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-neon text-darkbg text-sm font-bold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                <Download size={16} />
                Save QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
