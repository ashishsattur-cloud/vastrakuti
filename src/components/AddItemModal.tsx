// src/components/AddItemModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, RefreshCw, Barcode } from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: InventoryItem | null;
  initialBarcode?: string;
}

const CATEGORIES = ['Kurtas', 'Sarees', 'Shirts', 'Dupattas', 'Bottomwear', 'Fabrics'];
const FABRICS = [
  '100% Pure Organic Cotton',
  'Mulmul Cotton',
  'Khadi Cotton',
  'Chanderi Cotton',
  'Kota Doria Cotton',
  'Cotton Linen Blend',
  'Pochampally Ikat Cotton',
  'Handloom Slub Cotton',
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, editItem, initialBarcode }) => {
  const { addItem, updateItem } = useInventory();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Kurtas',
    fabric: '100% Pure Organic Cotton',
    size: 'M',
    color: 'Indigo Blue',
    costPrice: 900,
    sellingPrice: 1999,
    stockQuantity: 10,
    minStockAlert: 5,
    rackLocation: 'Rack A-1',
    description: '',
    supplier: 'Artisan Textile Weavers',
  });

  const generateBarcodeAndSKU = () => {
    const randomBarcode = initialBarcode || '890' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const catCode = formData.category.slice(0, 2).toUpperCase();
    const sizeCode = formData.size.slice(0, 2).toUpperCase();
    const randomSku = `${catCode}-${sizeCode}-${Math.floor(100 + Math.random() * 900)}`;

    setFormData((prev) => ({
      ...prev,
      barcode: randomBarcode,
      sku: randomSku,
    }));
  };

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        sku: editItem.sku,
        barcode: editItem.barcode,
        category: editItem.category,
        fabric: editItem.fabric,
        size: editItem.size,
        color: editItem.color,
        costPrice: editItem.costPrice,
        sellingPrice: editItem.sellingPrice,
        stockQuantity: editItem.stockQuantity,
        minStockAlert: editItem.minStockAlert,
        rackLocation: editItem.rackLocation || 'Rack A-1',
        description: editItem.description || '',
        supplier: editItem.supplier || '',
      });
    } else {
      const generatedBarcode = initialBarcode || '890' + Math.floor(100000000 + Math.random() * 900000000).toString();
      setFormData({
        name: '',
        sku: 'CK-M-' + Math.floor(100 + Math.random() * 900),
        barcode: generatedBarcode,
        category: 'Kurtas',
        fabric: '100% Pure Organic Cotton',
        size: 'M',
        color: 'Indigo Blue',
        costPrice: 900,
        sellingPrice: 1999,
        stockQuantity: 12,
        minStockAlert: 5,
        rackLocation: 'Rack A-1',
        description: '',
        supplier: 'Artisan Textile Weavers',
      });
    }
    setError(null);
  }, [editItem, isOpen, initialBarcode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (editItem) {
        await updateItem(editItem.id, formData);
      } else {
        await addItem(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900">
              {editItem ? 'Edit Cotton Garment' : 'Add Item to Inventory'}
            </h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Garment Title / Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Handloom Chikankari Cotton Kurta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
            />
          </div>

          {/* Barcode & SKU Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 flex items-center space-x-1">
                  <Barcode className="w-3.5 h-3.5 text-amber-700" />
                  <span>Barcode (EAN/CODE128) *</span>
                </label>
                {!editItem && (
                  <button
                    type="button"
                    onClick={generateBarcodeAndSKU}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto Generate</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="Barcode number (e.g. 8901234009)"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CK-IND-L"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>
          </div>

          {/* Category & Fabric */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Garment Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cotton Fabric / Weave *
              </label>
              <select
                value={formData.fabric}
                onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              >
                {FABRICS.map((fab) => (
                  <option key={fab} value={fab}>
                    {fab}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Size & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Size *
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Color / Dye *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Indigo Blue, Earthy Ochre"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>
          </div>

          {/* Cost Price & Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/50">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Wholesale Cost Price (₹ / $) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Retail Selling Price (M.R.P.) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
              <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                Est. Markup:{' '}
                {formData.costPrice > 0
                  ? Math.round(((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Initial Stock & Low Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Current Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Min Stock Alert Level (Threshold) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
              <span className="text-[10px] text-stone-500 block mt-1">
                Triggers real-time stock alert banner when stock falls to this level
              </span>
            </div>
          </div>

          {/* Rack Location & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Rack / Shelf Location
              </label>
              <input
                type="text"
                placeholder="e.g. Section B - Rack 2"
                value={formData.rackLocation}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Weaver / Supplier Co-op
              </label>
              <input
                type="text"
                placeholder="e.g. Bagru Artisan Co-op"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Fabric Description & Weaving Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Hand-spun organic cotton with natural vegetable dye. Dry clean or gentle cold wash only."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : editItem ? 'Update Garment' : 'Save Item & Generate Barcode'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
