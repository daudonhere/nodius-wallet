import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import idl from '../target/idl/nodius_relay.json'
import type { NodiusRelay } from '../target/types/nodius_relay'

const CLUSTER = process.env.CLUSTER || 'devnet'
const RPC = CLUSTER === 'mainnet'
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com'

async function main() {
  const connection = new Connection(RPC, 'confirmed')
  const wallet = Wallet.local()
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program = new Program<NodiusRelay>(idl as any, provider)

  const tx = await program.methods
    .initializeUser()
    .accounts({})
    .rpc()

  console.log('Deployed. Program ID:', program.programId.toBase58())
  console.log('Tx:', tx)
}

main().catch(console.error)
