// src/components/RestockModal.tsx
import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';

interface RestockModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({ item, onClose }) => {
  const { restockItem } = useInventory();
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>('Batch replenishment received from weaver');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Restock quantity must be at least 1.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await restockItem(item.id, quantity, notes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restock item');
    } finally {
      setSubmitting(false);
    }
  };

  const newTotal = item.stockQuantity + quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-5 h-5 text-emerald-700" />
            <h3 className="font-semibold text-stone-900">Restock Garment Inventory</h3>
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
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1">
            <div className="font-bold text-stone-900 text-sm">{item.name}</div>
            <div className="flex justify-between text-stone-500 font-mono">
              <span>SKU: {item.sku}</span>
              <span>Barcode: {item.barcode}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-stone-200 text-stone-700">
              <span>Size: <strong>{item.size}</strong> • {item.color}</span>
              <span>Current Stock: <strong className="font-mono text-stone-900">{item.stockQuantity}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quantity Received *
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
              />
              <span className="text-xs text-stone-500 whitespace-nowrap">
                New Total: <strong className="font-mono text-emerald-700 font-bold">{newTotal}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Restock Memo / Supplier Batch #
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>

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
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Add Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
