import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { useTonAddress } from '@tonconnect/ui-react'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useWalletConnection } from './useWalletConnection'
import { fetchPrices, TRENDING_COINS } from '../services/price'
import { notifyPriceAlert } from '../services/notifications'
import { useSettingsStore } from '../stores/settingsStore'
import { useAlertStore } from '../stores/alertStore'
import type { TrendingCoin } from '../types/token'

const solanaConnection = new Connection(
  import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
)

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

interface BalanceEntry {
  symbol: string
  balance: string
  usdValue: string
  icon?: string
}

export function useBalances() {
  const { evm, solana } = useWalletConnection()
  const tonAddress = useTonAddress()

  const [ethBalance, setEthBalance] = useState<string>('')
  const [solBalance, setSolBalance] = useState<string>('')
  const [tonBalance, setTonBalance] = useState<string>('')
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number }>>({})

  const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC', 'ARB', 'DOGE', 'TON', 'UNI']

  useEffect(() => {
    if (!evm.address) { setEthBalance(''); return }
    publicClient.getBalance({ address: evm.address as `0x${string}` }).then((b) =>
      setEthBalance(formatUnits(b, 18))
    )
  }, [evm.address])

  useEffect(() => {
    if (!solana.address) { setSolBalance(''); return }
    try {
      solanaConnection.getBalance(new PublicKey(solana.address)).then((b) =>
        setSolBalance((b / LAMPORTS_PER_SOL).toFixed(4))
      )
    } catch {}
  }, [solana.address])

  useEffect(() => {
    if (!tonAddress) { setTonBalance(''); return }
    fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${encodeURIComponent(tonAddress)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.ok && data.result) setTonBalance((Number(data.result) / 1e9).toFixed(4))
        else setTonBalance('')
      })
      .catch(() => setTonBalance(''))
  }, [tonAddress])

  useEffect(() => {
    const fetchAndCheck = async () => {
      const data = await fetchPrices(SYMBOLS)
      setPrices(data)

      if (!useSettingsStore.getState().pushNotifications) return

      const alerts = useAlertStore.getState().alerts
      const setPrice = useAlertStore.getState().setPrice
      const markTriggered = useAlertStore.getState().markTriggered

      for (const alert of alerts) {
        if (alert.triggered) continue
        const price = data[alert.symbol]?.price
        if (price == null) continue
        setPrice(alert.symbol, price)
        const triggered = alert.direction === 'above' ? price >= alert.targetPrice : price <= alert.targetPrice
        if (triggered) {
          markTriggered(alert.id)
          notifyPriceAlert(alert.symbol, price, alert.direction, alert.targetPrice)
        }
      }
    }

    fetchAndCheck()
    const interval = setInterval(fetchAndCheck, 30_000)
    return () => clearInterval(interval)
  }, [])

  const tokens: BalanceEntry[] = []
  if (ethBalance) tokens.push({ symbol: 'ETH', balance: ethBalance, usdValue: ethBalance, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' })
  if (solBalance) tokens.push({ symbol: 'SOL', balance: solBalance, usdValue: solBalance, icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg' })
  if (tonAddress) tokens.push({ symbol: 'TON', balance: tonBalance || '0', usdValue: tonBalance || '0', icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg' })

  const trending: TrendingCoin[] = TRENDING_COINS.map((c) => {
    const p = prices[c.symbol]
    return {
      ...c,
      price: p?.price != null ? `$${p.price.toLocaleString()}` : '—',
      change: p?.change24h != null ? `${p.change24h >= 0 ? '+' : ''}${p.change24h.toFixed(2)}%` : '—',
      up: p?.change24h != null ? p.change24h >= 0 : true,
    }
  })

  return { tokens, trending, prices, isConnected: evm.connected || solana.connected || !!tonAddress }
}
