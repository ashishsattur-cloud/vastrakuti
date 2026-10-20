// src/components/ScannerModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Bluetooth, Usb, Zap, Volume2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.tsx';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const { scanBarcode } = useInventory();
  const [activeTab, setActiveTab] = useState<'camera' | 'hardware'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const scannerId = 'reader-viewport';
      const element = document.getElementById(scannerId);
      if (!element) return;

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      setIsScanning(true);

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // On successful scan
          await scanBarcode(decodedText);
          // Briefly pause then continue
        },
        () => {
          // Ignore normal scan frame misses
        }
      );
    } catch (err: any) {
      console.warn('Camera scan init warning:', err);
      setCameraError(
        err?.message || 'Camera permission not granted or camera unavailable. You can use USB/Bluetooth scanner or enter barcode manually.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Ignored
      }
      setIsScanning(false);
      html5QrCodeRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900">Barcode Scanner Integration</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center space-x-2 pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-amber-700 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Mobile / Camera Scanner</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('hardware');
            }}
            className={`flex items-center space-x-2 pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'hardware'
                ? 'border-amber-700 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>Bluetooth & USB Guns</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'camera' ? (
            <div className="space-y-4">
              <p className="text-xs text-stone-600">
                Point your mobile phone, tablet, or laptop camera directly at any cotton garment barcode sticker (CODE128 or EAN13).
              </p>

              {cameraError ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-semibold">Camera Access Note:</p>
                  <p>{cameraError}</p>
                  <p className="text-stone-600">
                    Pro-tip: Physical USB & Bluetooth barcode scanner guns are always active in background and require no camera permission.
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-stone-800 shadow-inner">
                  <div id="reader-viewport" className="w-full h-full"></div>
                  {/* Aiming Reticle Overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-amber-400 rounded-lg relative opacity-85 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Audio chime confirms scan instantly</span>
                </span>
                <span className="font-mono text-emerald-700 font-semibold">Ready</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-stone-700">
              <div className="flex items-start space-x-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80">
                <Zap className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-950 text-xs uppercase tracking-wide">
                    Zero-Driver Hardware Integration Active
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Sutra POS automatically listens for barcode gun pulses across the entire application. You do NOT need to focus any text field before pulling the trigger!
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center space-x-3 p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Usb className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-stone-900 text-xs">USB Handheld Barcode Guns (Symbol, Zebra, Honeywell, TVS)</h5>
                    <p className="text-[11px] text-stone-500">Plug into your laptop/desktop USB port. Scan any tag to immediately add to cart.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Bluetooth className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-stone-900 text-xs">Bluetooth Mobile Barcode Guns & Ring Scanners</h5>
                    <p className="text-[11px] text-stone-500">Pair via Bluetooth with your laptop or iPad in HID Keyboard mode.</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl text-xs text-stone-600 border border-stone-200">
                <p className="font-semibold text-stone-800 mb-1">Quick Test:</p>
                <p>Pick up your scanner and scan any printed tag barcode, or type the code <code>8901234001</code> and hit Enter.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-stone-100 bg-stone-50">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-200/60 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
