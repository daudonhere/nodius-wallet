import { VersionedTransaction } from '@solana/web3.js'
import { getSolanaRelayerKeypair, hasSolanaRelayer } from './sponsoredRelayers'

const JUPITER_API = 'https://quote-api.jup.ag/v6'

export async function buildSponsoredSolanaSwap(
  quoteResponse: any,
  userAddress: string
): Promise<{ partiallySignedTx: string }> {
  if (!hasSolanaRelayer()) throw new Error('Solana relayer not configured')

  const relayer = getSolanaRelayerKeypair()

  const res = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: relayer.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jupiter swap API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  if (!data.swapTransaction) throw new Error('Jupiter did not return swapTransaction')

  const tx = VersionedTransaction.deserialize(
    Uint8Array.from(atob(data.swapTransaction), (c) => c.charCodeAt(0))
  )

  tx.sign([relayer])

  const partiallySignedTx = btoa(
    String.fromCharCode(...tx.serialize())
  )

  return { partiallySignedTx }
}
