export type TxType = 'send' | 'receive' | 'swap' | 'bridge'
export type TxStatus = 'completed' | 'pending' | 'failed'
export type TxFilter = 'all' | 'sent' | 'received' | 'swap'

export interface Transaction {
  id: string
  type: TxType
  token: string
  tokenLogo: string
  label: string
  amount: string
  usdValue: string
  date: string
  status: TxStatus
  txHash?: string
  chainId?: number
}
