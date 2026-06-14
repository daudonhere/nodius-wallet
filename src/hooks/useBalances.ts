import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress } from '@tonconnect/ui-react'
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { fetchPrices, TRENDING_COINS } from '../services/price'
import type { TrendingCoin } from '../types/token'

const solanaConnection = new Connection(
  import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
)

interface BalanceEntry {
  symbol: string
  balance: string
  usdValue: string
  icon?: string
}

export function useBalances() {
  const { address: evmAddress, isConnected } = useAccount()
  const { data: ethData } = useBalance({ address: evmAddress })
  const ethBalance = ethData ? { symbol: ethData.symbol, formatted: formatUnits(ethData.value, ethData.decimals) } : null
  const solanaWallet = useSolanaWallet()
  const tonAddress = useTonAddress()

  const [solBalance, setSolBalance] = useState<string>('')
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number }>>({})

  const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC', 'ARB', 'DOGE', 'TON', 'UNI']

  useEffect(() => {
    fetchPrices(SYMBOLS).then(setPrices)
    const interval = setInterval(() => fetchPrices(SYMBOLS).then(setPrices), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!solanaWallet.publicKey) { setSolBalance(''); return }
    solanaConnection.getBalance(solanaWallet.publicKey).then((b) =>
      setSolBalance((b / LAMPORTS_PER_SOL).toFixed(4))
    )
  }, [solanaWallet.publicKey])

  const tokens: BalanceEntry[] = []
  if (ethBalance) tokens.push({ symbol: 'ETH', balance: ethBalance.formatted, usdValue: ethBalance.formatted, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' })
  if (solBalance) tokens.push({ symbol: 'SOL', balance: solBalance, usdValue: solBalance, icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg' })
  if (tonAddress) tokens.push({ symbol: 'TON', balance: '—', usdValue: '', icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg' })

  const trending: TrendingCoin[] = TRENDING_COINS.map((c) => {
    const p = prices[c.symbol]
    return {
      ...c,
      price: p?.price != null ? `$${p.price.toLocaleString()}` : '—',
      change: p?.change24h != null ? `${p.change24h >= 0 ? '+' : ''}${p.change24h.toFixed(2)}%` : '—',
      up: p?.change24h != null ? p.change24h >= 0 : true,
    }
  })

  return { tokens, trending, prices, isConnected }
}
