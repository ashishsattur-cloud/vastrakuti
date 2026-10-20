// src/pages/AlertsPage.tsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  PackagePlus,
  Tag,
  MinusCircle,
  Barcode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';
import { RestockModal } from '../components/RestockModal.tsx';
import { BarcodeTagModal } from '../components/BarcodeTagModal.tsx';
import { DeductItemModal } from '../components/DeductItemModal.tsx';

export const AlertsPage: React.FC = () => {
  const { alerts, items } = useInventory();
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [tagItem, setTagItem] = useState<InventoryItem | null>(null);
  const [deductItem, setDeductItem] = useState<InventoryItem | null>(null);

  const outOfStockItems = alerts.filter((i) => i.stockQuantity === 0);
  const lowStockItems = alerts.filter((i) => i.stockQuantity > 0);

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-stone-900">Real-Time Stock Alerts</h2>
            <span className="text-xs font-mono font-bold bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full">
              {alerts.length} Warnings Active
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Prevent overselling during festive peak rush. Track depleted sizes and trigger immediate weaver restocks.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-xl font-semibold">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>{outOfStockItems.length} Sold Out (0)</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{lowStockItems.length} Low Stock</span>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">All Cotton Stock Levels Are Healthy</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Every cotton kurta, saree, and garment in your inventory is currently above its minimum threshold.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((item) => {
            const isSoldOut = item.stockQuantity === 0;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition bg-white shadow-xs ${
                  isSoldOut ? 'border-rose-300 bg-rose-50/15' : 'border-amber-300 bg-amber-50/15'
                }`}
              >
                <div>
                  {/* Top Status */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-md">
                      {item.category} • {item.fabric}
                    </span>

                    {isSoldOut ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-xs">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>OUT OF STOCK</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>LOW STOCK ALERT</span>
                      </span>
                    )}
                  </div>

                  {/* Title and details */}
                  <h4 className="font-bold text-stone-900 text-base leading-snug">{item.name}</h4>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-stone-50 p-3 rounded-xl border border-stone-200/80 font-mono">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-sans">SKU / Barcode</span>
                      <span className="font-semibold text-stone-900">{item.sku}</span>
                      <div className="text-[11px] text-stone-500">{item.barcode}</div>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-sans">Size / Rack</span>
                      <span className="font-semibold text-stone-900">
                        Size: {item.size} • {item.color}
                      </span>
                      <div className="text-[11px] text-stone-500">{item.rackLocation || 'Rack A-1'}</div>
                    </div>
                  </div>

                  {/* Stock Gauge */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-500">Current Stock:</span>{' '}
                      <strong className={`font-mono text-sm ${isSoldOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {item.stockQuantity} units
                      </strong>
                    </div>
                    <div className="text-stone-400 font-mono text-[11px]">
                      Min Alert Threshold: <strong>{item.minStockAlert}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="font-bold font-mono text-stone-900 text-sm">
                    {formatCurrency(item.sellingPrice)}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setTagItem(item)}
                      title="Print Barcode Tag"
                      className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 transition"
                    >
                      <Tag className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeductItem(item)}
                      disabled={item.stockQuantity === 0}
                      title="Deduct Damaged Stock"
                      className="p-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200 transition disabled:opacity-30"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setRestockItem(item)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition active:scale-95 shadow-xs"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Restock Batch</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {restockItem && (
        <RestockModal item={restockItem} onClose={() => setRestockItem(null)} />
      )}
      {tagItem && (
        <BarcodeTagModal item={tagItem} onClose={() => setTagItem(null)} />
      )}
      {deductItem && (
        <DeductItemModal item={deductItem} onClose={() => setDeductItem(null)} />
      )}
    </div>
  );
};
