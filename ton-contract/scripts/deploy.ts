import { mnemonicToPrivateKey } from '@ton/crypto'
import { TonClient, WalletContractV4, internal } from '@ton/ton'
import { Address, beginCell } from '@ton/core'
import fs from 'fs'
import { TonGaslessWallet } from '../build/TonGaslessWallet_TonGaslessWallet'

for (const envPath of ['./.env', '../nodius-backend/.env']) {
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([^=]+)=(.*)$/)
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
    }
  }
}

const TON_CENTER_API = 'https://testnet.toncenter.com/api/v2/jsonRPC'

async function main() {
  const mnemonic = process.env.TON_DEPLOYER_MNEMONIC || process.env.TON_RELAYER_MNEMONIC
  if (!mnemonic) throw new Error('TON_DEPLOYER_MNEMONIC or TON_RELAYER_MNEMONIC not set')

  const key = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/))
  const deployer = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey })

  const client = new TonClient({
    endpoint: TON_CENTER_API,
    apiKey: process.env.TONCENTER_API_KEY,
  })
  const deployerBalance = await client.getBalance(deployer.address)

  console.log('Deployer address:', deployer.address.toString())
  console.log('Balance:', deployerBalance > 0n ? `${Number(deployerBalance) / 1e9} TON` : '0 (need test TON from faucet)')

  if (deployerBalance < 100_000_000n) {
    console.log('\n⚠️  Deployer needs test TON. Get from:')
    console.log('  https://t.me/testgiver_ton_bot')
    console.log('  or faucet.ton.org/testnet')
    console.log(`Send to: ${deployer.address.toString()}`)
    console.log('\nThen run: npm run deploy')
    process.exit(0)
  }

  const ownerPubKey = BigInt('0x' + Buffer.from(key.publicKey).toString('hex'))
  const wallet = await TonGaslessWallet.fromInit(ownerPubKey)

  console.log('\nTonGaslessWallet address:', wallet.address.toString())
  console.log('Owner pubkey:', ownerPubKey.toString(16))

  const seqno = await client.getContractState(deployer.address).then(
    () => client.runMethod(deployer.address, 'seqno').then(r => r.stack.readNumber()).catch(() => 0),
    () => 0
  )

  const transfer = deployer.createTransfer({
    seqno,
    secretKey: key.secretKey,
    messages: [internal({
      to: wallet.address,
      value: 50_000_000n,
      init: wallet.init,
      body: beginCell().storeUint(0, 32).storeUint(0, 64).endCell(),
    })],
  })

  await client.sendExternalMessage(deployer, transfer)
  console.log('\n✅ Deployment sent! Tx hash available from TonCenter explorer.')
  console.log(`View: https://testnet.tonviewer.com/${wallet.address.toString()}`)
}

main().catch(console.error)
