import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { useTonAddress } from '@tonconnect/ui-react'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useWalletConnection } from './useWalletConnection'
import { fetchPrices, TRENDING_COINS } from '../services/price'
import { notifyPriceAlert } from '../services/notifications'
import { useSettingsStore } from '../stores/settingsStore'
import { useAlertStore } from '../stores/alertStore'
import type { TrendingCoin } from '../types/token'

const HELIUS_KEY = import.meta.env.VITE_HELIUS_API_KEY || ''
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''
const TONAPI_KEY = import.meta.env.VITE_TONAPI_KEY || ''

const solanaConnection = new Connection(
  import.meta.env.VITE_SOLANA_RPC || (HELIUS_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}` : 'https://api.mainnet-beta.solana.com')
)

const EVM_CHAINS = [
  { id: 1, key: 'eth-mainnet', name: 'Ethereum', native: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  { id: 8453, key: 'base-mainnet', name: 'Base', native: 'ETH', icon: 'https://cryptologos.cc/logos/base-base-logo.svg' },
  { id: 137, key: 'polygon-mainnet', name: 'Polygon', native: 'MATIC', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' },
  { id: 42161, key: 'arb-mainnet', name: 'Arbitrum', native: 'ETH', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg' },
]

interface BalanceEntry {
  symbol: string
  balance: string
  usdValue: string
  icon?: string
  chainName?: string
  chainId?: number
}

async function alchemyRpc(network: string, method: string, params: any[]) {
  if (!ALCHEMY_KEY) return null
  const res = await fetch(`https://${network}.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.result
}

async function fetchEvmAssets(address: string): Promise<BalanceEntry[]> {
  const assets: BalanceEntry[] = []

  for (const chain of EVM_CHAINS) {
    const native = await alchemyRpc(chain.key, 'eth_getBalance', [address, 'latest'])
    if (native) {
      const balance = formatUnits(BigInt(native), 18)
      if (Number(balance) > 0) {
        assets.push({ symbol: chain.native, balance, usdValue: balance, icon: chain.icon, chainName: chain.name, chainId: chain.id })
      }
    }

    const tokenBalances = await alchemyRpc(chain.key, 'alchemy_getTokenBalances', [address])
    for (const token of tokenBalances?.tokenBalances || []) {
      if (!token.tokenBalance || token.tokenBalance === '0x0') continue
      const raw = BigInt(token.tokenBalance)
      if (raw === 0n) continue
      const meta = await alchemyRpc(chain.key, 'alchemy_getTokenMetadata', [token.contractAddress])
      const decimals = Number(meta?.decimals ?? 18)
      const balance = formatUnits(raw, decimals)
      if (Number(balance) <= 0) continue
      assets.push({
        symbol: meta?.symbol || token.contractAddress.slice(0, 6),
        balance,
        usdValue: balance,
        icon: meta?.logo || chain.icon,
        chainName: chain.name,
        chainId: chain.id,
      })
    }
  }

  return assets
}

async function fetchSolanaAssets(address: string): Promise<BalanceEntry[]> {
  const assets: BalanceEntry[] = []

  try {
    const lamports = await solanaConnection.getBalance(new PublicKey(address))
    const sol = (lamports / LAMPORTS_PER_SOL).toString()
    if (Number(sol) > 0) assets.push({ symbol: 'SOL', balance: sol, usdValue: sol, icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg', chainName: 'Solana' })
  } catch {}

  if (!HELIUS_KEY) return assets

  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAssetsByOwner', params: { ownerAddress: address, page: 1, limit: 1000, displayOptions: { showFungible: true } } }),
    })
    if (!res.ok) return assets
    const data = await res.json()
    for (const item of data.result?.items || []) {
      const tokenInfo = item.token_info
      const raw = Number(tokenInfo?.balance || 0)
      const decimals = Number(tokenInfo?.decimals || 0)
      if (!raw) continue
      const balance = (raw / 10 ** decimals).toString()
      if (Number(balance) <= 0) continue
      assets.push({
        symbol: tokenInfo?.symbol || item.content?.metadata?.symbol || 'SPL',
        balance,
        usdValue: balance,
        icon: item.content?.links?.image || 'https://cryptologos.cc/logos/solana-sol-logo.svg',
        chainName: 'Solana',
      })
    }
  } catch {}

  return assets
}

async function fetchTonAssets(address: string): Promise<BalanceEntry[]> {
  const headers = TONAPI_KEY ? { Authorization: `Bearer ${TONAPI_KEY}` } : undefined
  const assets: BalanceEntry[] = []

  try {
    const balanceRes = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${encodeURIComponent(address)}`)
    const balanceData = balanceRes.ok ? await balanceRes.json() : null
    const ton = balanceData?.ok && balanceData.result ? (Number(balanceData.result) / 1e9).toString() : '0'
    if (Number(ton) > 0) assets.push({ symbol: 'TON', balance: ton, usdValue: ton, icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg', chainName: 'TON' })
  } catch {}

  try {
    const res = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/jettons`, { headers })
    if (!res.ok) return assets
    const data = await res.json()
    for (const item of data.balances || []) {
      const raw = Number(item.balance || 0)
      const decimals = Number(item.jetton?.decimals || 9)
      if (!raw) continue
      const balance = (raw / 10 ** decimals).toString()
      if (Number(balance) <= 0) continue
      assets.push({
        symbol: item.jetton?.symbol || 'JETTON',
        balance,
        usdValue: balance,
        icon: item.jetton?.image || 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
        chainName: 'TON',
      })
    }
  } catch {}

  return assets
}

export function useBalances() {
  const { evm, solana } = useWalletConnection()
  const tonAddress = useTonAddress()
  const [tokens, setTokens] = useState<BalanceEntry[]>([])
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number }>>({})

  const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC', 'ARB', 'DOGE', 'TON', 'UNI', 'USDC', 'USDT']

  useEffect(() => {
    let cancelled = false

    async function fetchAssets() {
      const results = await Promise.all([
        evm.address ? fetchEvmAssets(evm.address) : Promise.resolve([]),
        solana.address ? fetchSolanaAssets(solana.address) : Promise.resolve([]),
        tonAddress ? fetchTonAssets(tonAddress) : Promise.resolve([]),
      ])
      if (!cancelled) setTokens(results.flat().filter((t) => Number(t.balance) > 0))
    }

    fetchAssets()
    const interval = setInterval(fetchAssets, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [evm.address, solana.address, tonAddress])

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
