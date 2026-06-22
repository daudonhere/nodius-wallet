import { VersionedTransaction, Transaction, SystemProgram, PublicKey } from '@solana/web3.js'
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

export async function buildSponsoredSolanaTransfer(
  to: string,
  lamports: number,
  userAddress: string,
): Promise<{ partiallySignedTx: string }> {
  if (!hasSolanaRelayer()) throw new Error('Solana relayer not configured')

  const relayer = getSolanaRelayerKeypair()
  const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

  const bhRes = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [] }),
  })
  const bhData = await bhRes.json() as any
  const blockhash = bhData.result?.value?.blockhash
  const lastValidBlockHeight = bhData.result?.value?.lastValidBlockHeight
  if (!blockhash) throw new Error('Failed to get Solana blockhash')

  const tx = new Transaction({
    feePayer: relayer.publicKey,
    blockhash,
    lastValidBlockHeight,
  })

  tx.add(SystemProgram.transfer({
    fromPubkey: new PublicKey(userAddress),
    toPubkey: new PublicKey(to),
    lamports,
  }))

  tx.partialSign(relayer)

  const serialized = tx.serialize({ requireAllSignatures: false })
  const partiallySignedTx = Array.from(serialized).map((b) => b.toString(16).padStart(2, '0')).join('')

  return { partiallySignedTx }
}
