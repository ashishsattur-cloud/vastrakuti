// src/components/BarcodeTagModal.tsx
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { InventoryItem } from '../types/inventory.ts';
import { X, Printer, Tag, Sparkles } from 'lucide-react';

interface BarcodeTagModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

export const BarcodeTagModal: React.FC<BarcodeTagModalProps> = ({ item, onClose }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (item && svgRef.current) {
      try {
        JsBarcode(svgRef.current, item.barcode, {
          format: 'CODE128',
          width: 2,
          height: 52,
          displayValue: true,
          font: 'JetBrains Mono',
          fontSize: 14,
          margin: 6,
          lineColor: '#1c1917',
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [item]);

  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedPrice = (item.sellingPrice).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Header (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50 print:hidden">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900">Garment Tag & Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Section */}
        <div className="p-6 flex flex-col items-center">
          <div
            id="printable-tag"
            className="w-72 border-2 border-dashed border-stone-300 rounded-xl p-4 bg-amber-50/20 text-center relative shadow-xs print:border-solid print:border-black print:w-72 print:m-auto"
          >
            {/* Tag Hole Simulation */}
            <div className="w-3.5 h-3.5 rounded-full border border-stone-300 bg-stone-100 mx-auto mb-2 print:border-black"></div>

            {/* Brand Title */}
            <div className="flex items-center justify-center space-x-1.5 text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 print:hidden" />
              <span className="text-xs font-bold tracking-widest uppercase">SUTRA COTTON RETAIL</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium mb-2">100% Pure Handloom Heritage</p>

            {/* Product Details */}
            <div className="border-t border-b border-stone-200 py-2 my-2 text-left space-y-1">
              <h4 className="font-bold text-stone-900 text-sm leading-tight line-clamp-2">
                {item.name}
              </h4>
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>Fabric: <strong className="text-stone-800">{item.fabric}</strong></span>
                <span className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold text-stone-900">
                  Size: {item.size}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Color: {item.color}</span>
                <span>Rack: {item.rackLocation || 'A-1'}</span>
              </div>
            </div>

            {/* Barcode SVG */}
            <div className="my-1 flex justify-center bg-white p-1 rounded border border-stone-100">
              <svg ref={svgRef} className="max-w-full h-auto"></svg>
            </div>

            {/* SKU and Price */}
            <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider text-stone-400 block">SKU Code</span>
                <span className="font-mono text-xs font-semibold text-stone-700">{item.sku}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-stone-400 block">M.R.P. (Incl. Taxes)</span>
                <span className="font-bold text-lg text-emerald-800 tracking-tight font-mono">
                  {formattedPrice}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-500 mt-3 text-center print:hidden">
            Barcode is compatible with all USB / Bluetooth 1D scanners and mobile camera scanning.
          </p>
        </div>

        {/* Action Buttons (hidden in print) */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-stone-100 bg-stone-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-200/60 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Price Tag</span>
          </button>
        </div>
      </div>
    </div>
  );
};
