// src/components/ScanAndAddModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Barcode, Plus, PackageCheck, AlertCircle, Sparkles } from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';
import { playScanSuccessSound, playErrorSound } from '../utils/sound.ts';

interface ScanAndAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddItemWithBarcode: (barcode: string) => void;
}

export const ScanAndAddModal: React.FC<ScanAndAddModalProps> = ({
  isOpen,
  onClose,
  onOpenAddItemWithBarcode,
}) => {
  const { restockItem, showToast } = useInventory();
  const [barcode, setBarcode] = useState('');
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [restockQty, setRestockQty] = useState<number>(5);
  const [isRestocking, setIsRestocking] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBarcode('');
      setFoundItem(null);
      setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || barcode).trim();
    if (!code) return;

    setIsSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/inventory/barcode/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setFoundItem(data.item);
        playScanSuccessSound();
      } else {
        setFoundItem(null);
        playErrorSound();
      }
    } catch (e) {
      setFoundItem(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRestockExisting = async () => {
    if (!foundItem) return;
    setIsRestocking(true);
    try {
      await restockItem(foundItem.id, restockQty, 'Stock batch added via Scan & Add to Inventory');
      showToast(`Added ${restockQty} units to "${foundItem.name}"`, 'success');
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Restock failed', 'error');
    } finally {
      setIsRestocking(false);
    }
  };

  const handleCreateNew = () => {
    onClose();
    onOpenAddItemWithBarcode(barcode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <Barcode className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900">Scan & Add to Inventory</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-600">
            Scan any cotton garment tag with your USB/Bluetooth barcode gun or enter the barcode number below to add new or existing stock to inventory.
          </p>

          {/* Barcode Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                data-barcode-input="true"
                placeholder="Scan or enter barcode (e.g. 8901234001)..."
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  setSearched(false);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 bg-stone-50"
              />
            </div>
            <button
              type="submit"
              disabled={!barcode.trim() || isSearching}
              className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
            >
              {isSearching ? 'Checking...' : 'Check Barcode'}
            </button>
          </form>

          {/* Search Result 1: Existing Garment Found */}
          {searched && foundItem && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Existing Garment Found in Inventory:</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs space-y-1">
                <div className="font-bold text-stone-900 text-sm">{foundItem.name}</div>
                <div className="text-stone-500 font-mono text-[11px] flex justify-between">
                  <span>SKU: {foundItem.sku}</span>
                  <span>Category: {foundItem.category}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-100 text-stone-700">
                  <span>Size: <strong>{foundItem.size}</strong> • {foundItem.color}</span>
                  <span>Current Stock: <strong className="font-mono text-emerald-800">{foundItem.stockQuantity} units</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-stone-700 font-semibold">Add Quantity:</span>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border border-stone-300 bg-white"
                  />
                </div>

                <button
                  onClick={handleRestockExisting}
                  disabled={isRestocking}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRestocking ? 'Updating...' : `Add +${restockQty} to Inventory`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Search Result 2: New Item (Not found in catalog) */}
          {searched && !foundItem && !isSearching && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>New Barcode! This garment is not yet in your inventory.</span>
              </div>
              <p className="text-xs text-stone-600">
                Barcode <strong>{barcode}</strong> can now be assigned to a new cotton kurta, saree, shirt, or fabric.
              </p>

              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-xs transition active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create New Garment with Barcode {barcode}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200/60 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
