import { beginCell, Cell, Address, toNano } from '@ton/ton'
import { hasTonRelayer } from './sponsoredRelayers'

const TON_CENTER_API = 'https://toncenter.com/api/v2/jsonRPC'

export async function sendTonExternalMessage(bocBase64: string): Promise<string> {
  if (!hasTonRelayer()) throw new Error('TON relayer not configured')

  const res = await fetch(TON_CENTER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBoc',
      params: [bocBase64],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TON RPC error: ${res.status} ${text}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(`TON RPC error: ${data.error.message}`)

  return data.result as string
}

export function buildExternalMessageBoc(
  walletAddress: string,
  target: string,
  value: string,
  seqno: number,
  signatureBase64: string
): string {
  const bodyCell = beginCell()
    .storeAddress(Address.parse(target))
    .storeCoins(toNano(value))
    .storeUint(seqno, 32)
    .storeRef(Cell.fromBase64(signatureBase64))
    .endCell()

  const externalMsgCell = beginCell()
    .storeAddress(Address.parse(walletAddress))
    .storeCoins(toNano(value))
    .storeRef(bodyCell)
    .endCell()

  return externalMsgCell.toBoc().toString('base64')
}
