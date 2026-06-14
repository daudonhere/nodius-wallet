import type { Transaction } from '../types/transaction'

const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || ''
const SOLSCAN_KEY = import.meta.env.VITE_SOLSCAN_API_KEY || ''

const ETHERSCAN_BASES: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  137: 'https://api.polygonscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  8453: 'https://api.basescan.org/api',
}

interface EtherscanTx {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  gasUsed: string
  gasPrice: string
  isError: string
}

interface EtherscanTokenTx {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  tokenSymbol: string
  tokenDecimal: string
  tokenName: string
}

function parseEtherscanValue(value: string, decimals: number = 18): string {
  const val = BigInt(value)
  const divisor = BigInt(10) ** BigInt(decimals)
  const whole = val / divisor
  const frac = val % divisor
  return `${whole}.${frac.toString().padStart(decimals, '0').slice(0, 6)}`
}

export async function fetchEVMHistory(address: string, chainId: number = 1): Promise<Transaction[]> {
  const base = ETHERSCAN_BASES[chainId]
  if (!base || !ETHERSCAN_KEY) return []

  const [normalRes, tokenRes] = await Promise.all([
    fetch(`${base}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_KEY}`),
    fetch(`${base}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_KEY}`),
  ])

  const normal: { result: EtherscanTx[] } = await normalRes.json()
  const token: { result: EtherscanTokenTx[] } = await tokenRes.json()

  const txs: Transaction[] = []

  if (normal.result) {
    for (const tx of normal.result) {
      const isSend = tx.from.toLowerCase() === address.toLowerCase()
      const valEth = parseEtherscanValue(tx.value)
      txs.push({
        id: `evm-${chainId}-${tx.hash}`,
        type: isSend ? 'send' : 'receive',
        token: 'ETH',
        tokenLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
        label: isSend
          ? `To ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
          : `From ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`,
        amount: isSend ? `-${valEth} ETH` : `+${valEth} ETH`,
        usdValue: '',
        date: new Date(Number(tx.timeStamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: tx.isError === '1' ? 'failed' : 'completed',
        txHash: tx.hash,
        chainId,
      })
    }
  }

  if (token.result) {
    for (const tx of token.result) {
      const isSend = tx.from.toLowerCase() === address.toLowerCase()
      const val = parseEtherscanValue(tx.value, Number(tx.tokenDecimal) || 18)
      txs.push({
        id: `evm-token-${chainId}-${tx.hash}`,
        type: isSend ? 'send' : 'receive',
        token: tx.tokenSymbol,
        tokenLogo: '',
        label: isSend
          ? `To ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
          : `From ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`,
        amount: isSend ? `-${val} ${tx.tokenSymbol}` : `+${val} ${tx.tokenSymbol}`,
        usdValue: '',
        date: new Date(Number(tx.timeStamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'completed',
        txHash: tx.hash,
        chainId,
      })
    }
  }

  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

interface SolscanTx {
  txHash: string
  blockTime: number
  status: string
  fee: number
  transferInfo?: {
    sourceOwner: string
    destOwner: string
    tokenAddress: string
    amount: number
    tokenSymbol: string
    tokenIcon: string
  }[]
  solTransfers?: {
    sourceOwner: string
    destOwner: string
    amount: number
  }[]
}

export async function fetchSolanaHistory(address: string): Promise<Transaction[]> {
  if (!SOLSCAN_KEY) return []

  try {
    const res = await fetch(
      `https://pro-api.solscan.io/v2/account/transactions?address=${address}&page=1&pageSize=50`,
      { headers: { Authorization: `Bearer ${SOLSCAN_KEY}` } }
    )
    if (!res.ok) return []

    const data = await res.json()
    const txs: Transaction[] = []

    if (data.data) {
      for (const tx of data.data as SolscanTx[]) {
        const status: 'completed' | 'pending' | 'failed' = tx.status === 'Success' ? 'completed' : tx.status === 'Pending' ? 'pending' : 'failed'
        const date = new Date(tx.blockTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

        if (tx.transferInfo) {
          for (const t of tx.transferInfo) {
            const isSend = t.sourceOwner === address
            const amount = (t.amount / 10 ** 9).toFixed(4)
            txs.push({
              id: `sol-${tx.txHash}-${t.tokenAddress}`,
              type: isSend ? 'send' : 'receive',
              token: t.tokenSymbol || 'SPL',
              tokenLogo: t.tokenIcon || '',
              label: isSend
                ? `To ${t.destOwner.slice(0, 6)}...${t.destOwner.slice(-4)}`
                : `From ${t.sourceOwner.slice(0, 6)}...${t.sourceOwner.slice(-4)}`,
              amount: isSend ? `-${amount}` : `+${amount}`,
              usdValue: '',
              date,
              status,
              txHash: tx.txHash,
            })
          }
        }

        if (tx.solTransfers) {
          for (const t of tx.solTransfers) {
            const isSend = t.sourceOwner === address
            if (isSend || t.destOwner === address) {
              const amount = (t.amount / 10 ** 9).toFixed(4)
              txs.push({
                id: `sol-sol-${tx.txHash}`,
                type: isSend ? 'send' : 'receive',
                token: 'SOL',
                tokenLogo: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
                label: isSend
                  ? `To ${t.destOwner.slice(0, 6)}...${t.destOwner.slice(-4)}`
                  : `From ${t.sourceOwner.slice(0, 6)}...${t.sourceOwner.slice(-4)}`,
                amount: isSend ? `-${amount} SOL` : `+${amount} SOL`,
                usdValue: '',
                date,
                status,
                txHash: tx.txHash,
              })
            }
          }
        }
      }
    }

    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    return []
  }
}
