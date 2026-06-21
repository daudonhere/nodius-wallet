import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

const { StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: App } = await import('./App.tsx')
const { default: WalletProvider } = await import('./providers/WalletProvider')
await import('./styles/globals.css')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
)
