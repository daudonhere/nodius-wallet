import { mnemonicToPrivateKey } from '@ton/crypto'
import { TonClient, WalletContractV4, internal } from '@ton/ton'

const TON_CENTER_API = 'https://toncenter.com/api/v2/jsonRPC'

async function main() {
  const mnemonic = process.env.TON_DEPLOYER_MNEMONIC
  if (!mnemonic) throw new Error('TON_DEPLOYER_MNEMONIC not set')

  const key = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/))
  const deployer = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey })

  const client = new TonClient({ endpoint: TON_CENTER_API })

  console.log('Deployer address:', deployer.address.toString())
  console.log('Balance:', await client.getBalance(deployer.address))

  // Deploy script - compile first with `npm run compile`
  // Then load the compiled contract and deploy
  // const TonGaslessWallet = await import('../build/TonGaslessWallet.tact')
  // ... deploy logic
}

main().catch(console.error)
