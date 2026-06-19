import { Keypair, PublicKey } from '@solana/web3.js'
import { mnemonicToPrivateKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'

function parseSolanaSecret(value: string): Uint8Array {
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) return Uint8Array.from(JSON.parse(trimmed))
  return Uint8Array.from(Buffer.from(trimmed, 'base64'))
}

export function hasSolanaRelayer() {
  return !!process.env.SOLANA_RELAYER_PRIVATE_KEY?.trim()
}

export function hasTonRelayer() {
  return !!process.env.TON_RELAYER_MNEMONIC?.trim()
}

export function getSolanaRelayerKeypair() {
  const key = process.env.SOLANA_RELAYER_PRIVATE_KEY
  if (!key) throw new Error('SOLANA_RELAYER_PRIVATE_KEY is not configured')
  return Keypair.fromSecretKey(parseSolanaSecret(key))
}

export async function getTonRelayerWallet() {
  const mnemonic = process.env.TON_RELAYER_MNEMONIC
  if (!mnemonic) throw new Error('TON_RELAYER_MNEMONIC is not configured')
  const words = mnemonic.trim().split(/\s+/)
  if (words.length !== 24) throw new Error('TON_RELAYER_MNEMONIC must contain 24 words')
  const keyPair = await mnemonicToPrivateKey(words)
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
  return { wallet, keyPair }
}

export async function getSponsoredRelayerInfo() {
  const solana = hasSolanaRelayer()
    ? getSolanaRelayerKeypair().publicKey.toBase58()
    : null
  const ton = hasTonRelayer()
    ? (await getTonRelayerWallet()).wallet.address.toString()
    : null

  return {
    solana: {
      configured: !!solana,
      address: solana,
    },
    ton: {
      configured: !!ton,
      address: ton,
    },
  }
}

export function assertSolanaFeePayer(publicKey: PublicKey) {
  const relayer = getSolanaRelayerKeypair().publicKey
  if (!relayer.equals(publicKey)) throw new Error('Transaction fee payer must be Solana relayer')
}
