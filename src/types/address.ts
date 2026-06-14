export type AddressChain = 'evm' | 'solana' | 'ton'

export interface AddressBookEntry {
  id: string
  label: string
  address: string
  chain: AddressChain
  createdAt: number
}
