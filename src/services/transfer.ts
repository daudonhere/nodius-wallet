import { type PublicKey, SystemProgram, Transaction as SolanaTx, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js'

export async function transferSolana(
  from: PublicKey,
  to: PublicKey,
  amountSol: string,
  connection: Connection,
  signTransaction: (tx: SolanaTx) => Promise<SolanaTx>
): Promise<string> {
  const lamports = Math.floor(parseFloat(amountSol) * LAMPORTS_PER_SOL)
  const ix = SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
  const blockhash = await connection.getLatestBlockhash()
  const tx = new SolanaTx({ feePayer: from, blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight }).add(ix)
  const signed = await signTransaction(tx)
  return connection.sendRawTransaction(signed.serialize())
}

export async function transferTON(
  amountTon: string,
  destination: string,
  sender: (tx: any) => Promise<any>
): Promise<string> {
  const nanoAmount = BigInt(Math.floor(parseFloat(amountTon) * 1e9))
  const tx = {
    validUntil: Date.now() + 60000,
    messages: [
      {
        address: destination,
        amount: nanoAmount.toString(),
      },
    ],
  }
  const result = await sender(tx)
  return result?.boc ?? ''
}
