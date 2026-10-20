// src/components/DeductItemModal.tsx
import React, { useState } from 'react';
import { X, MinusCircle, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';

interface DeductItemModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

const REASONS = [
  { value: 'DAMAGE_WRITE_OFF', label: 'Damaged Stock / Snagged Weave (Write-off)' },
  { value: 'DEFECT', label: 'Color Bleeding or Dye Flaw' },
  { value: 'DISPLAY_SAMPLE', label: 'Store Window Display / Mannequin Sample' },
  { value: 'MANUAL_DEDUCT', label: 'Physical Audit Count Correction' },
  { value: 'SUPPLIER_RETURN', label: 'Return to Weaver / Supplier' },
];

export const DeductItemModal: React.FC<DeductItemModalProps> = ({ item, onClose }) => {
  const { deductStock } = useInventory();
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('DAMAGE_WRITE_OFF');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Deduction quantity must be at least 1.');
      return;
    }
    if (quantity > item.stockQuantity) {
      setError(`Cannot deduct ${quantity} units. Only ${item.stockQuantity} in stock.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await deductStock(item.id, quantity, reason, notes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to deduct stock');
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = Math.max(0, item.stockQuantity - quantity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <MinusCircle className="w-5 h-5 text-rose-700" />
            <h3 className="font-semibold text-stone-900">Deduct Stock / Write-Off</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Summary Card */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1">
            <div className="font-bold text-stone-900 text-sm">{item.name}</div>
            <div className="flex justify-between text-stone-500 font-mono">
              <span>SKU: {item.sku}</span>
              <span>Barcode: {item.barcode}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-stone-200 text-stone-700">
              <span>Size: <strong>{item.size}</strong> • {item.color}</span>
              <span>Available Stock: <strong className="font-mono text-stone-900">{item.stockQuantity}</strong></span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quantity to Deduct *
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                max={item.stockQuantity}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 transition"
              />
              <span className="text-xs text-stone-500 whitespace-nowrap">
                New Stock: <strong className={`font-mono ${remaining <= item.minStockAlert ? 'text-rose-600' : 'text-stone-900'}`}>{remaining}</strong>
              </span>
            </div>
          </div>

          {remaining <= item.minStockAlert && (
            <div className="flex items-center space-x-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Deducting will trigger a Low Stock Alert (threshold: {item.minStockAlert}).</span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Reason for Removal *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 transition"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Audit Notes / Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Discovered hem tear during display setup; logged for write-off."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-200/60 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || item.stockQuantity === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <MinusCircle className="w-4 h-4" />
              <span>{submitting ? 'Deducting...' : 'Confirm Stock Deduction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
