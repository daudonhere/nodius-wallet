import hre from 'hardhat'

export async function deployContract(name: string, args: unknown[] = []) {
  const [deployer] = await hre.viem.getWalletClients()
  console.log(`Deploying ${name} from ${deployer.account.address}`)
  const contract = await hre.viem.deployContract(name, args)
  return contract
}
