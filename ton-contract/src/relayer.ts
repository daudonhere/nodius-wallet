import { mnemonicToPrivateKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'

export function hasRelayer() {
  return !!process.env.TON_RELAYER_MNEMONIC?.trim()
}

export async function getRelayerWallet() {
  const mnemonic = process.env.TON_RELAYER_MNEMONIC
  if (!mnemonic) throw new Error('TON_RELAYER_MNEMONIC is not configured')
  const words = mnemonic.trim().split(/\s+/)
  if (words.length !== 24) throw new Error('TON_RELAYER_MNEMONIC must contain 24 words')
  const keyPair = await mnemonicToPrivateKey(words)
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
  return { wallet, keyPair }
}
