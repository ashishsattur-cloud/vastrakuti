// src/components/ReceiptModal.tsx
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, CheckCircle, Sparkles } from 'lucide-react';
import { Sale, SaleItem } from '../types/inventory.ts';

interface ReceiptModalProps {
  sale: Sale | null;
  items?: SaleItem[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, items = [], onClose }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (sale && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, sale.invoiceNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: true,
          font: 'JetBrains Mono',
          fontSize: 12,
          margin: 4,
          lineColor: '#1c1917',
        });
      } catch (e) {
        console.warn('Receipt barcode render error:', e);
      }
    }
  }, [sale]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6 print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Header (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50 print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-stone-900">Sale Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6">
          <div
            id="printable-receipt"
            className="w-full bg-white font-mono text-xs text-stone-900 border border-stone-200 rounded-xl p-5 shadow-xs space-y-3 print:border-none print:p-0"
          >
            {/* Store Banner */}
            <div className="text-center border-b border-dashed border-stone-300 pb-3">
              <div className="flex items-center justify-center space-x-1.5 text-stone-900 font-bold text-sm tracking-widest uppercase">
                <Sparkles className="w-4 h-4 text-amber-700 print:hidden" />
                <span>SUTRA COTTON RETAIL</span>
              </div>
              <p className="text-[11px] text-stone-600">Pure Handloom & Organic Cottons</p>
              <p className="text-[10px] text-stone-500 mt-1">
                42 Handloom Square, Craft Heritage Lane<br />
                GSTIN: 29AABCS1234F1Z8 • Ph: +91 98765 00000
              </p>
            </div>

            {/* Invoice Meta */}
            <div className="text-[11px] space-y-1 text-stone-600 border-b border-dashed border-stone-300 pb-2">
              <div className="flex justify-between">
                <span>Invoice: <strong className="text-stone-900">{sale.invoiceNumber}</strong></span>
                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier: {sale.cashierName || 'Staff'}</span>
                <span>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between pt-0.5">
                  <span>Customer: {sale.customerName}</span>
                  {sale.customerPhone && <span>{sale.customerPhone}</span>}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="border-b border-dashed border-stone-300 pb-3">
              <div className="flex justify-between font-bold text-stone-800 pb-1 border-b border-stone-200 text-[10px] uppercase">
                <span>Item / Size</span>
                <span className="text-center w-10">Qty</span>
                <span className="text-right w-16">Price</span>
              </div>

              <div className="space-y-1.5 pt-2">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div key={item.id} className="text-stone-700">
                      <div className="font-semibold text-stone-900 truncate">{item.itemName}</div>
                      <div className="flex justify-between text-[11px] text-stone-600">
                        <span className="text-[10px] text-stone-500">Size: {item.itemSize || 'Free'} • {item.itemColor}</span>
                        <span className="text-center w-10">{item.quantity}</span>
                        <span className="text-right w-16 font-semibold text-stone-900">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-stone-500 text-center py-1">Items listed on receipt record</div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-stone-300 pb-2">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>GST (5% Textile):</span>
                <span>{formatCurrency(sale.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-900 font-bold text-sm pt-1 border-t border-stone-200">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[10px] pt-0.5">
                <span>Payment Method:</span>
                <span className="font-semibold uppercase text-stone-800">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Barcode */}
            <div className="flex flex-col items-center pt-1">
              <svg ref={barcodeRef} className="max-w-full"></svg>
            </div>

            {/* Footer Notice */}
            <div className="text-center text-[9px] text-stone-500 pt-1 leading-relaxed">
              Exchange within 7 days with original invoice & tag intact.<br />
              Dry clean handloom silks & vegetable dyes recommended.<br />
              *** Thank You For Supporting Artisans ***
            </div>
          </div>
        </div>

        {/* Buttons (hidden in print) */}
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
            <span>Print Thermal Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
