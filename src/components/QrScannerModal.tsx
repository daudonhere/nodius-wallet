import { useEffect, useRef, useState } from 'react'
import { X, Camera, Upload } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (address: string) => void
  onClose: () => void
}

export default function QrScannerModal({ onScan, onClose }: Props) {
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!cancelled) {
              onScan(decodedText)
              cleanup()
            }
          },
          () => {}
        )
        if (!cancelled) setCameraActive(true)
      } catch {
        if (!cancelled) setError('Could not access camera. You can upload a QR image instead.')
      }
    }
    start()
    return () => { cancelled = true; cleanup() }
  }, [])

  function cleanup() {
    if (scannerRef.current) {
      try { scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const scanner = new Html5Qrcode('qr-reader')
    scanner.scanFile(file, true)
      .then((decodedText) => {
        onScan(decodedText)
        cleanup()
      })
      .catch(() => {
        setError('Could not read QR code from image. Try another image.')
      })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-surfaceLight rounded-[24px] p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-200">Scan QR Code</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div id="qr-reader" className="w-full aspect-square rounded-xl overflow-hidden bg-black mb-4" />

        {error && (
          <p className="text-xs text-zinc-400 text-center mb-3">{error}</p>
        )}

        {!cameraActive && !error && (
          <div className="flex flex-col items-center gap-2 py-8 text-zinc-500">
            <Camera size={32} className="text-zinc-600" />
            <p className="text-sm">Requesting camera...</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-surfaceLight border border-white/5 text-sm font-semibold rounded-xl hover:bg-surfaceLight/80 transition-colors"
        >
          <Upload size={16} />
          Upload QR Image
        </button>
      </div>
    </div>
  )
}
