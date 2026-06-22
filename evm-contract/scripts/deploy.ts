import 'dotenv/config'
import { http, createWalletClient, createPublicClient, isHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia, baseSepolia } from 'viem/chains'
import { readFileSync } from 'fs'

const CHAINS: Record<string, typeof sepolia> = { sepolia, 'base-sepolia': baseSepolia }

async function main() {
  const networkName = process.env.NETWORK || 'sepolia'
  const chain = CHAINS[networkName]
  if (!chain) throw new Error(`Unsupported network: ${networkName}`)

  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY
  if (!pk || !isHex(pk)) throw new Error('Private key not set')

  const account = privateKeyToAccount(pk)
  const rpcUrl = networkName === 'base-sepolia'
    ? 'https://sepolia.base.org'
    : `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

  const artifact = JSON.parse(readFileSync('artifacts/contracts/NodiusRelay.sol/NodiusRelay.json', 'utf-8'))

  console.log(`Deploying NodiusRelay on ${networkName} from ${account.address}`)

  const balance = await publicClient.getBalance({ address: account.address })
  console.log(`Balance: ${balance} wei (${Number(balance) / 1e18} ETH)`)

  if (balance < 0.001e18) {
    console.error('Insufficient balance for deployment')
    process.exit(1)
  }

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const contractAddress = receipt.contractAddress
  if (!contractAddress) throw new Error('Deploy failed - no contract address')

  const domain = await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'DOMAIN_SEPARATOR',
  })

  console.log(`NodiusRelay deployed to ${contractAddress} on ${networkName}`)
  console.log(`Tx hash: ${hash}`)
  try {
    const domain = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'DOMAIN_SEPARATOR',
    })
    console.log(`Domain separator: ${domain}`)
  } catch {
    console.log('Domain separator: (unavailable yet, check in a minute)')
  }
  console.log(`\nAdd to backend .env:`)
  console.log(`RELAY_CONTRACT_${networkName === 'sepolia' ? 'ETH' : 'BASE'}=${contractAddress}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
