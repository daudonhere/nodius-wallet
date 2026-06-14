export function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false)
  if (Notification.permission === 'granted') return Promise.resolve(true)
  if (Notification.permission === 'denied') return Promise.resolve(false)

  return Notification.requestPermission().then((p) => p === 'granted')
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      icon: '/pwa-icon.svg',
      ...options,
    })
  } catch {}
}

export function notifyTxSent(txHash: string, chain: string) {
  sendNotification('Transaction Sent', {
    body: `${chain}: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
    tag: `tx-${txHash}`,
  })
}

export function notifyTxConfirmed(txHash: string, chain: string) {
  sendNotification('Transaction Confirmed', {
    body: `${chain}: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
    tag: `tx-${txHash}`,
  })
}

export function notifyTxFailed(txHash: string, chain: string) {
  sendNotification('Transaction Failed', {
    body: `${chain}: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`,
    tag: `tx-${txHash}`,
  })
}

export function notifyPriceAlert(symbol: string, price: number, direction: 'above' | 'below', target: number) {
  sendNotification(`Price Alert: ${symbol}`, {
    body: `${symbol} is ${direction} $${target.toLocaleString()} (current: $${price.toLocaleString()})`,
    tag: `price-${symbol}`,
  })
}
