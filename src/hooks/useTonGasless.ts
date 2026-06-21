import { useCallback, useSyncExternalStore } from 'react'
import {
  generateKeypair,
  loadKeypair,
  saveKeypair,
  clearKeypair,
  getPublicKeyHex,
} from '../services/tonGasless'

let cached: ReturnType<typeof loadKeypair> = loadKeypair()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return cached
}

function emit() {
  cached = loadKeypair()
  listeners.forEach((l) => l())
}

export function useTonGasless() {
  const keypair = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const createKeypair = useCallback(() => {
    const kp = generateKeypair()
    saveKeypair(kp)
    emit()
  }, [])

  const removeKeypair = useCallback(() => {
    clearKeypair()
    emit()
  }, [])

  return {
    keypair,
    hasKey: !!keypair,
    publicKeyHex: keypair ? getPublicKeyHex() : '',
    createKeypair,
    removeKeypair,
  }
}
