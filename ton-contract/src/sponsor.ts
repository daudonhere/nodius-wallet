import { beginCell, Cell, Address, TonClient } from '@ton/ton'
import { hasRelayer } from './relayer'

const TON_CENTER_API = 'https://testnet.toncenter.com/api/v2/jsonRPC'

export function buildSignedExecuteBody(
  targetAddress: string,
  valueCoins: string,
  payloadBase64: string,
  seqno: number,
  signatureBase64: string
): Cell {
  return beginCell()
    .storeAddress(Address.parse(targetAddress))
    .storeCoins(BigInt(valueCoins))
    .storeRef(Cell.fromBase64(payloadBase64))
    .storeUint(seqno, 32)
    .storeRef(Cell.fromBase64(signatureBase64))
    .endCell()
}

export async function sendExternalMessage(
  walletAddress: string,
  bodyCell: Cell
): Promise<string> {
  if (!hasRelayer()) throw new Error('TON relayer not configured')

  const client = new TonClient({ endpoint: TON_CENTER_API })
  const contract = { address: Address.parse(walletAddress) }

  await client.sendExternalMessage(contract, bodyCell)

  return 'TON external message sent'
}
