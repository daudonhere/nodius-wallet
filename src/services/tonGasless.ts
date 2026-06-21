import { beginCell, Address, Cell } from '@ton/core'
import nacl from 'tweetnacl'

const STORAGE_KEY = 'nodius_ton_gasless_key'

export interface TonGaslessKeypair {
  secretKey: Uint8Array
  publicKey: Uint8Array
}

export function generateKeypair(): TonGaslessKeypair {
  const kp = nacl.sign.keyPair()
  return { secretKey: kp.secretKey, publicKey: kp.publicKey }
}

export function saveKeypair(kp: TonGaslessKeypair) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    secretKey: Array.from(kp.secretKey),
    publicKey: Array.from(kp.publicKey),
  }))
}

export function loadKeypair(): TonGaslessKeypair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { secretKey, publicKey } = JSON.parse(raw)
    return { secretKey: Uint8Array.from(secretKey), publicKey: Uint8Array.from(publicKey) }
  } catch {
    return null
  }
}

export function clearKeypair() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getPublicKeyHex(): string {
  const kp = loadKeypair()
  if (!kp) return ''
  return Buffer.from(kp.publicKey).toString('hex')
}

export function signSwapMessage(
  secretKey: Uint8Array,
  target: string,
  value: string,
  payload: Cell,
  seqno: number
): string {
  const cell = beginCell()
    .storeAddress(Address.parse(target))
    .storeCoins(BigInt(value))
    .storeSlice(payload.beginParse())
    .storeUint(seqno, 32)
    .endCell()

  const hash = cell.hash()
  const sig = nacl.sign.detached(hash, secretKey)
  return btoa(String.fromCharCode(...sig))
}
