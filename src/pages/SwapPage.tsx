import { useEffect, useMemo, useState } from 'react'
import { encodeFunctionData, formatUnits, parseUnits } from 'viem'
import { ArrowLeft, SlidersHorizontal, ChevronDown, ArrowDownUp, Info, Zap, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSendTransaction, useSignTypedData } from '@privy-io/react-auth'
import { useWalletConnection } from '../hooks/useWalletConnection'
import BottomNavigation from '../components/BottomNavigation'
import NeonButton from '../components/NeonButton'
import { getJupiterTokens, getLifiQuote, getLifiTokens, getZeroXQuote } from '../services/swap'
import { submitRelayTx } from '../services/relay'
import { useBalances } from '../hooks/useBalances'
import { useSettingsStore } from '../stores/settingsStore'
import type { SwapQuote } from '../services/swap'

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  Base: 'https://cryptologos.cc/logos/base-base-logo.svg',
  Polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  Arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  Solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  137: 'Polygon',
  42161: 'Arbitrum',
}

const CHAIN_IDS: Record<string, number> = {
  Ethereum: 1,
  Base: 8453,
  Polygon: 137,
  Arbitrum: 42161,
}

const POPULAR_TOKEN_SYMBOLS = new Set(['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'MATIC', 'POL', 'ARB', 'SOL', 'JUP', 'JTO', 'BONK', 'WIF', 'PYTH', 'RAY', 'ORCA'])

const ERC20_APPROVE_ABI = [{
  type: 'function',
  name: 'approve',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

interface SwapToken {
  symbol: string
  name: string
  icon: string
  address: string
  balance: string
  chainName: string
  chainIcon: string
  decimals: number
}

const EMPTY_TOKEN: SwapToken = { symbol: '', name: '', icon: '', address: '', balance: '0', chainName: 'Ethereum', chainIcon: CHAIN_ICONS.Ethereum, decimals: 18 }

const formatUsd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SwapPage() {
  const navigate = useNavigate()
  const { evm } = useWalletConnection()
  const { sendTransaction } = useSendTransaction()
  const { signTypedData } = useSignTypedData()
  const { tokens, prices, isLoadingAssets } = useBalances()
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)

  const [fromToken, setFromToken] = useState<SwapToken>(EMPTY_TOKEN)
  const [toToken, setToToken] = useState<SwapToken>(EMPTY_TOKEN)
  const [fromAmount, setFromAmount] = useState('0')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [tokenPicker, setTokenPicker] = useState<'from' | 'to' | null>(null)
  const [closingTokenPicker, setClosingTokenPicker] = useState(false)
  const [slippage, setSlippage] = useState('Auto')
  const [swapTokenList, setSwapTokenList] = useState<SwapToken[]>([])
  const [loadingTokenList, setLoadingTokenList] = useState(true)
  const [aggregator, setAggregator] = useState<'0x' | 'LI.FI' | 'Jupiter'>('0x')

  const activeChainName = fromToken.chainName || CHAIN_NAMES[evm.chainId || 1] || 'Ethereum'

  const sourceTokenOptions = useMemo<SwapToken[]>(() => tokens
    .filter((token) => token.chainName && token.address && token.decimals != null && Number(token.balance) > 0 && prices[token.symbol]?.price != null)
    .map((token) => ({
      symbol: token.symbol,
      name: token.symbol,
      icon: token.icon || CHAIN_ICONS[token.chainName || 'Ethereum'] || CHAIN_ICONS.Ethereum,
      address: token.address || '',
      balance: token.balance,
      chainName: token.chainName || 'Ethereum',
      chainIcon: CHAIN_ICONS[token.chainName || 'Ethereum'] || CHAIN_ICONS.Ethereum,
      decimals: token.decimals || 18,
    })), [prices, tokens])

  const destinationTokenOptions = useMemo<SwapToken[]>(() => {
    const list = swapTokenList.filter((token) => token.chainName === fromToken.chainName)
    const tokensForChain = list.length ? list : sourceTokenOptions.filter((token) => token.chainName === fromToken.chainName)
    return tokensForChain.map((token) => sourceTokenOptions.find((item) => item.address.toLowerCase() === token.address.toLowerCase()) || token)
  }, [fromToken.chainName, sourceTokenOptions, swapTokenList])

  const fromPrice = prices[fromToken.symbol]?.price ?? 0
  const toPrice = prices[toToken.symbol]?.price ?? 0
  const quoteToAmount = quote?.buyAmount ? formatUnits(BigInt(quote.buyAmount), toToken.decimals) : ''
  const fromUsd = formatUsd(Number(fromAmount || '0') * fromPrice)
  const toAmount = quoteToAmount || '0'
  const toUsd = '~' + formatUsd(Number(toAmount || '0') * toPrice)
  const amountExceedsBalance = Number(fromAmount || '0') > Number(fromToken.balance || '0')
  const slippagePercentage = slippage === 'Auto' ? '0.005' : (parseFloat(slippage) / 100).toString()
  const supportedChain = fromToken.chainName === 'Ethereum' || fromToken.chainName === 'Base' || fromToken.chainName === 'Polygon' || fromToken.chainName === 'Arbitrum'
  const aggregatorOptions = fromToken.chainName === 'Solana' ? (['Jupiter'] as const) : (['0x', 'LI.FI'] as const)
  const isInitialSwapLoading = isLoadingAssets || loadingTokenList
  const pickerTokens = tokenPicker === 'from' ? sourceTokenOptions : destinationTokenOptions

  const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded-full bg-surfaceLight/70 ${className}`} />
  )

  const closeTokenPicker = () => {
    setClosingTokenPicker(true)
    window.setTimeout(() => {
      setTokenPicker(null)
      setClosingTokenPicker(false)
    }, 180)
  }

  const handleAmountChange = (value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return
    setFromAmount(value)
    setQuote(null)
  }

  const handleFlip = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }

  const fetchQuote = async () => {
    if (!fromToken.address || !toToken.address || !fromAmount || parseFloat(fromAmount) === 0 || !supportedChain || amountExceedsBalance) return
    setLoadingQuote(true)
    setError('')
    const amount = parseUnits(fromAmount, fromToken.decimals).toString()
    const chainId = CHAIN_IDS[fromToken.chainName] || 1
    const q = aggregator === 'LI.FI'
      ? await getLifiQuote(chainId, fromToken.address, toToken.address, evm.address || '', amount, slippagePercentage)
      : await getZeroXQuote(fromToken.address, toToken.address, amount, chainId, slippagePercentage)
    setQuote(q)
    if (!q) setError('Could not fetch quote')
    setLoadingQuote(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadTokens() {
      setLoadingTokenList(true)
      const chainName = activeChainName
      const chainId = CHAIN_IDS[chainName]
      const list = chainName === 'Solana'
        ? await getJupiterTokens()
        : chainId
          ? (await getLifiTokens(chainId))
          : []
      if (cancelled) return
      const popularList = list.filter((token) => POPULAR_TOKEN_SYMBOLS.has(token.symbol?.toUpperCase()))
      setSwapTokenList(popularList.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        icon: token.logoURI || CHAIN_ICONS[chainName] || CHAIN_ICONS.Ethereum,
        address: token.address,
        balance: '0',
        chainName,
        chainIcon: CHAIN_ICONS[chainName] || CHAIN_ICONS.Ethereum,
        decimals: token.decimals,
      })))
      setLoadingTokenList(false)
    }
    loadTokens()
    return () => {
      cancelled = true
    }
  }, [activeChainName])

  useEffect(() => {
    setFromToken((current) => sourceTokenOptions.find((token) => token.symbol === current.symbol) || sourceTokenOptions[0] || current)
    setToToken((current) => destinationTokenOptions.find((token) => token.symbol === current.symbol) || destinationTokenOptions.find((token) => token.symbol !== fromToken.symbol) || current)
  }, [sourceTokenOptions, destinationTokenOptions, fromToken.symbol])

  useEffect(() => {
    if (!aggregatorOptions.includes(aggregator as never)) setAggregator(aggregatorOptions[0])
  }, [aggregator, aggregatorOptions])

  useEffect(() => {
    setQuote(null)
    if (!evm.address || !fromAmount || parseFloat(fromAmount) <= 0 || fromToken.address === toToken.address) return
    const timer = setTimeout(() => {
      fetchQuote()
    }, 600)
    return () => clearTimeout(timer)
  }, [aggregator, evm.address, evm.chainId, fromAmount, fromToken.address, fromToken.decimals, toToken.address, slippage])

  const handleSwap = async () => {
    if (!evm.address || !quote?.tx) return
    setSending(true)
    setError('')

    try {
      if (quote.allowanceTarget && fromToken.symbol !== 'ETH') {
        await sendTransaction({
          to: fromToken.address as `0x${string}`,
          data: encodeFunctionData({
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [quote.allowanceTarget as `0x${string}`, parseUnits(fromAmount, fromToken.decimals)],
          }),
          value: 0n,
        })
      }

      if (gasFeeRouting && evm.chainId) {
        const { signature } = await signTypedData({
          domain: {
            name: 'NodiusRelay',
            version: '1',
            chainId: evm.chainId,
            verifyingContract: quote.tx.to as `0x${string}`,
          },
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Execute: [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          },
          primaryType: 'Execute',
          message: {
            target: quote.tx.to as `0x${string}`,
            value: `0x${BigInt(quote.tx.value || '0').toString(16)}`,
            data: quote.tx.data as `0x${string}`,
            nonce: '0x0',
            deadline: `0x${BigInt(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
          },
        })
        const result = await submitRelayTx({
          walletId: evm.address,
          source: 'evm',
          chainId: evm.chainId,
          signedTx: signature,
        })
        setTxHash(result.txHash || '')
      } else {
        const { hash } = await sendTransaction({
          to: quote.tx.to as `0x${string}`,
          data: quote.tx.data as `0x${string}`,
          value: BigInt(quote.tx.value || '0'),
        })
        setTxHash(hash)
      }
    } catch {
      setError('Transaction rejected or failed')
    }
    setSending(false)
  }

  if (txHash) {
    return (
      <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans items-center justify-center gap-4 p-5">
        <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center">
          <Zap size={32} className="text-neon" />
        </div>
        <h2 className="text-xl font-bold">Swap Submitted</h2>
        <p className="text-zinc-400 text-sm font-mono break-all text-center max-w-xs">{txHash}</p>
        <NeonButton onClick={() => navigate(-1)}>Done</NeonButton>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="shrink-0 pt-14 px-5 pb-6 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold tracking-wide">Swap</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors relative">
          <SlidersHorizontal size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        <div className="mt-2 bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg">
          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors group">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">You pay</span>
              <span className="text-zinc-500 font-mono">{isInitialSwapLoading ? '...' : Number(fromToken.balance).toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              {isInitialSwapLoading ? <SkeletonBlock className="w-28 h-9 rounded-xl" /> : (
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-[26px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight"
              />
              )}
              {isInitialSwapLoading ? <SkeletonBlock className="w-28 h-11" /> : <button onClick={() => setTokenPicker('from')} className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm">
                <div className="relative">
                  <img src={fromToken.icon} alt={fromToken.symbol} className="w-[22px] h-[22px] rounded-full" />
                  <img src={fromToken.chainIcon} alt={fromToken.chainName} className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-surfaceLight bg-darkbg" />
                </div>
                <span className="font-bold text-[15px]">{fromToken.symbol}</span>
                <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
              </button>}
            </div>
            <div className="mt-1 text-zinc-500 text-[13px] font-mono">{fromUsd}</div>
          </div>

          <div className="flex justify-center -my-[16px] relative z-10">
            <button onClick={handleFlip} className="w-11 h-11 bg-surface border-[4px] border-[#161616] rounded-full flex items-center justify-center text-zinc-300 hover:text-neon hover:scale-105 hover:rotate-180 transition-all duration-300 shadow-lg group">
              <ArrowDownUp size={18} className="group-hover:drop-shadow-[0_0_8px_#CCFF00]" />
            </button>
          </div>

          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">You receive</span>

            </div>
            <div className="flex justify-between items-center">
              {loadingQuote || isInitialSwapLoading ? <SkeletonBlock className="w-28 h-9 rounded-xl" /> : <input type="text" inputMode="decimal" placeholder="0" value={toAmount} readOnly className="bg-transparent border-none outline-none font-mono text-[26px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight" />}
              {isInitialSwapLoading ? <SkeletonBlock className="w-28 h-11" /> : <button onClick={() => setTokenPicker('to')} className="flex items-center gap-2 bg-[#2775CA]/10 hover:bg-[#2775CA]/20 transition-colors py-2.5 px-3.5 rounded-full border border-[#2775CA]/20 shadow-sm">
                <div className="relative">
                  <img src={toToken.icon} alt={toToken.symbol} className="w-[22px] h-[22px] rounded-full" />
                  <img src={toToken.chainIcon} alt={toToken.chainName} className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-surfaceLight bg-darkbg" />
                </div>
                <span className="font-bold text-[15px]">{toToken.symbol}</span>
                <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
              </button>}
            </div>
            <div className="mt-1 text-zinc-500 text-[13px] font-mono">{toUsd}</div>
          </div>
        </div>

        <div className="mt-6 mb-5 px-1">
          <div className="flex justify-between items-center mb-3 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Slippage Tolerance
              <span className="relative group flex items-center">
                <Info size={14} className="text-zinc-500" />
                <span className="pointer-events-none absolute left-1/2 bottom-6 z-20 w-56 -translate-x-1/2 rounded-xl border border-surfaceLight bg-surface px-3 py-2 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  Maximum price movement allowed before swap fails.
                </span>
              </span>
            </span>
            <span className="text-white font-bold">{slippage}</span>
          </div>
          <div className="flex gap-2.5">
            {['Auto', '0.1%', '0.5%', '1.0%'].map((val) => (
              <button key={val} onClick={() => setSlippage(val)} className={`flex-1 border font-semibold py-2.5 rounded-[14px] text-sm transition-colors ${val === slippage ? 'bg-neon/10 border-neon/30 text-neon font-bold shadow-[0_0_12px_rgba(204,255,0,0.15)]' : 'bg-surface border-surfaceLight text-zinc-400 hover:text-white hover:bg-surfaceLight'}`}>
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Exchange Rate</span>
            {loadingQuote || isInitialSwapLoading ? <SkeletonBlock className="w-32 h-4 rounded-md" /> : <span className="font-mono font-medium text-zinc-200">1 {fromToken.symbol} = {quote?.price ? `${quote.price} ${toToken.symbol}` : formatUsd(fromPrice)}</span>}
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Network Fee</span>
            <div className="flex items-center gap-2">
              {loadingQuote || isInitialSwapLoading ? <SkeletonBlock className="w-20 h-4 rounded-md" /> : gasFeeRouting ? (
                <>
                  <span className="line-through text-zinc-600 font-mono">{quote?.estimatedGas ? `${quote.estimatedGas} gas` : '—'}</span>
                  <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                    <Zap size={12} className="text-neon" />
                    <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-zinc-200">{quote?.estimatedGas ? `${quote.estimatedGas} gas` : '—'}</span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-zinc-400 font-medium">Aggregator</span>
            <div className="flex items-center gap-1.5">
              {isInitialSwapLoading ? <><SkeletonBlock className="w-12 h-7 rounded-lg" /><SkeletonBlock className="w-12 h-7 rounded-lg" /></> : aggregatorOptions.map((item) => (
                <button key={item} onClick={() => { setAggregator(item); setQuote(null) }} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${aggregator === item ? 'bg-neon/10 text-neon border border-neon/20' : 'bg-surfaceLight text-zinc-400 border border-white/5'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-[13px] mt-3">
            <span className="text-zinc-400 font-medium">Route</span>
            {loadingQuote || isInitialSwapLoading ? <SkeletonBlock className="w-28 h-4 rounded-md" /> : (
              <button className="font-medium text-zinc-200 flex items-center gap-1 hover:text-white transition-colors">
                {quote?.sources?.find((source) => Number(source.proportion) > 0)?.name || quote?.route || `${aggregator} Aggregator`}
              </button>
            )}
          </div>
          {(amountExceedsBalance || error) && (
            <div className="mt-3 pt-3 border-t border-surfaceLight">
              <p className="text-xs text-zinc-500 text-center">
                {amountExceedsBalance ? `Insufficient ${fromToken.symbol} balance` : error}
              </p>
            </div>
          )}
        </div>

        {quote && (
          <div className="bg-surface/30 border border-neon/20 rounded-[20px] p-3 mb-4">
            <p className="text-xs text-zinc-400">Quote: {quote.price} | Est. gas: {quote.estimatedGas}</p>
          </div>
        )}

        <NeonButton onClick={quote ? handleSwap : fetchQuote} disabled={!evm.address || sending || loadingQuote || isLoadingAssets || amountExceedsBalance || !fromToken.address || !toToken.address || !fromAmount || parseFloat(fromAmount) <= 0 || !supportedChain}>
          {!supportedChain ? 'Unsupported swap chain'
            : loadingQuote ? <><Loader2 size={18} className="animate-spin" /> Getting Quote...</>
            : sending ? <><Loader2 size={18} className="animate-spin" /> Swapping...</>
            : quote ? 'Execute Swap'
            : 'Get Quote'}
        </NeonButton>
      </main>

      {tokenPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeTokenPicker}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`${closingTokenPicker ? 'swap-token-drawer-out' : 'swap-token-drawer'} relative w-full max-w-md max-h-[75vh] bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-6 flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold">Select Token</h3>
              <button onClick={closeTokenPicker} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pr-1">
              {loadingTokenList ? [0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3.5 p-3.5 rounded-[16px]">
                  <SkeletonBlock className="w-9 h-9" />
                  <div>
                    <SkeletonBlock className="w-16 h-4 mb-2 rounded-md" />
                    <SkeletonBlock className="w-24 h-3 rounded-md" />
                  </div>
                </div>
              )) : pickerTokens.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">No token with balance</div>
              )}
              {!loadingTokenList && pickerTokens.map((token) => {
                const selected = tokenPicker === 'from' ? token.address === fromToken.address : token.address === toToken.address
                const disabled = tokenPicker === 'from' ? token.address === toToken.address : token.address === fromToken.address
                return (
                  <button
                    key={token.address}
                    disabled={disabled}
                    onClick={() => {
                      if (tokenPicker === 'from') setFromToken(token)
                      else setToToken(token)
                      setQuote(null)
                      closeTokenPicker()
                    }}
                    className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'bg-surfaceLight border border-white/5' : 'hover:bg-surfaceLight/50'}`}
                  >
                    <div className="relative shrink-0">
                      <img src={token.icon} alt={token.symbol} className="w-9 h-9 rounded-full" />
                      <img src={token.chainIcon} alt={token.chainName} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface bg-darkbg" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{token.symbol}</p>
                      <p className="text-[11px] text-zinc-500">{tokenPicker === 'from' ? Number(token.balance).toFixed(4) : token.chainName}</p>
                    </div>
                    {selected && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-neon" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
