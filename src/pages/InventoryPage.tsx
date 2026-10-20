// src/pages/InventoryPage.tsx
import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Barcode,
  Tag,
  MinusCircle,
  PackagePlus,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { AddItemModal } from '../components/AddItemModal.tsx';
import { DeductItemModal } from '../components/DeductItemModal.tsx';
import { RestockModal } from '../components/RestockModal.tsx';
import { BarcodeTagModal } from '../components/BarcodeTagModal.tsx';
import { ScanAndAddModal } from '../components/ScanAndAddModal.tsx';

const CATEGORIES = ['All', 'Kurtas', 'Sarees', 'Shirts', 'Dupattas', 'Bottomwear', 'Fabrics'];

export const InventoryPage: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const { items, loading, deleteItem, showToast } = useInventory();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [scanAndAddOpen, setScanAndAddOpen] = useState(false);
  const [addItemBarcode, setAddItemBarcode] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deductItem, setDeductItem] = useState<InventoryItem | null>(null);
  const [restockItemData, setRestockItemData] = useState<InventoryItem | null>(null);
  const [tagItem, setTagItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const isManager = user.role === 'manager';

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery) ||
      item.fabric.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.rackLocation && item.rackLocation.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.stockQuantity <= item.minStockAlert && item.stockQuantity > 0;
    } else if (stockFilter === 'out') {
      matchesStock = item.stockQuantity === 0;
    }

    return matchesCategory && matchesSearch && matchesStock;
  });

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await deleteItem(itemToDelete.id);
      showToast(`Item "${itemToDelete.name}" was successfully removed from inventory.`, 'success');
      setItemToDelete(null);
    } catch (e: any) {
      showToast(e.message || 'Cannot remove item. Query failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Actions Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-stone-900">Cotton Garment Inventory</h2>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              {items.length} Products
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Manage stock levels, deduct damaged garments, print barcode tags, and restock batches.
          </p>
        </div>

        {/* Action Buttons: Scan & Add to Inventory AND Manual Add */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={() => setScanAndAddOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 transition active:scale-95 shadow-xs"
          >
            <Barcode className="w-4 h-4 text-amber-200" />
            <span>Scan & Add to Inventory</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setAddItemBarcode(null);
              setAddModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item Manually</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, SKU, barcode (e.g. 890123...), fabric weave, color, or rack location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          {/* Stock Filter Radios */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                stockFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              All Stock
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1 ${
                stockFilter === 'low'
                  ? 'bg-amber-100 text-amber-900 font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Low Stock</span>
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                stockFilter === 'out' ? 'bg-rose-100 text-rose-900 font-bold shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sold Out
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table with Distinct Action Buttons */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3.5 px-4">Garment & Fabric</th>
                <th className="py-3.5 px-3">SKU & Barcode</th>
                <th className="py-3.5 px-3">Size / Color</th>
                <th className="py-3.5 px-3">Rack</th>
                <th className="py-3.5 px-3 text-right">Selling Price</th>
                {isManager && <th className="py-3.5 px-3 text-right">Cost Price</th>}
                <th className="py-3.5 px-3 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-right">Management Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No items match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOutOfStock = item.stockQuantity === 0;
                  const isLowStock = item.stockQuantity <= item.minStockAlert && !isOutOfStock;

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/20 transition">
                      {/* Product Name & Category */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 text-sm leading-snug">{item.name}</div>
                        <div className="text-[11px] text-stone-500 flex items-center space-x-1.5 mt-0.5">
                          <span className="font-medium text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                            {item.category}
                          </span>
                          <span>•</span>
                          <span>{item.fabric}</span>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-stone-900">{item.sku}</div>
                        <div className="text-[11px] text-stone-400 flex items-center space-x-1">
                          <Barcode className="w-3 h-3 text-stone-400" />
                          <span>{item.barcode}</span>
                        </div>
                      </td>

                      {/* Size / Color */}
                      <td className="py-3 px-3">
                        <div className="inline-block bg-stone-100 text-stone-800 font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                          {item.size}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{item.color}</div>
                      </td>

                      {/* Rack Location */}
                      <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">
                        {item.rackLocation || 'Shelf A-1'}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 text-sm">
                        {formatCurrency(item.sellingPrice)}
                      </td>

                      {/* Cost Price */}
                      {isManager && (
                        <td className="py-3 px-3 text-right font-mono text-stone-500 text-xs">
                          {formatCurrency(item.costPrice)}
                        </td>
                      )}

                      {/* Stock Level with Alert Flag */}
                      <td className="py-3 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold font-mono text-[11px]">
                            <span>0 OUT</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold font-mono text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>{item.stockQuantity} LOW</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold font-mono text-[11px]">
                            {item.stockQuantity} In Stock
                          </span>
                        )}
                        <span className="block text-[9px] text-stone-400 mt-0.5">
                          alert @ {item.minStockAlert}
                        </span>
                      </td>

                      {/* Action Buttons: Deduct, Restock, Remove, Edit, Tag */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                          {/* BUTTON: Deduct Stock */}
                          <button
                            onClick={() => setDeductItem(item)}
                            title="Deduct Damaged Stock or Sample"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition active:scale-95"
                          >
                            <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Deduct</span>
                          </button>

                          {/* BUTTON: Restock */}
                          <button
                            onClick={() => setRestockItemData(item)}
                            title="Restock Garment Quantity"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition active:scale-95"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Restock</span>
                          </button>

                          {/* BUTTON: Print Tag */}
                          <button
                            onClick={() => setTagItem(item)}
                            title="Generate & Print Garment Barcode Tag"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 text-xs font-medium transition"
                          >
                            <Tag className="w-3.5 h-3.5 text-amber-700" />
                            <span>Tag</span>
                          </button>

                          {/* BUTTON: Edit */}
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setAddModalOpen(true);
                            }}
                            title="Edit Item Details"
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* BUTTON: Delete / Remove */}
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            disabled={deletingId === item.id}
                            title="Remove Garment from Catalog"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {addModalOpen && (
        <AddItemModal
          isOpen={addModalOpen}
          editItem={editingItem}
          initialBarcode={addItemBarcode || undefined}
          onClose={() => {
            setAddModalOpen(false);
            setEditingItem(null);
            setAddItemBarcode(null);
          }}
        />
      )}

      {scanAndAddOpen && (
        <ScanAndAddModal
          isOpen={scanAndAddOpen}
          onClose={() => setScanAndAddOpen(false)}
          onOpenAddItemWithBarcode={(newBarcode) => {
            setAddItemBarcode(newBarcode);
            setEditingItem(null);
            setAddModalOpen(true);
          }}
        />
      )}

      {deductItem && (
        <DeductItemModal item={deductItem} onClose={() => setDeductItem(null)} />
      )}

      {restockItemData && (
        <RestockModal item={restockItemData} onClose={() => setRestockItemData(null)} />
      )}

      {tagItem && (
        <BarcodeTagModal item={tagItem} onClose={() => setTagItem(null)} />
      )}

      {/* In-App Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center space-x-2 text-rose-700">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-semibold text-stone-900">Remove from Inventory</h3>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-700">
                Are you sure you want to completely remove this cotton garment from inventory?
              </p>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="font-bold text-stone-900 text-sm">{itemToDelete.name}</div>
                <div className="text-stone-500 font-mono text-[11px] flex justify-between">
                  <span>SKU: {itemToDelete.sku}</span>
                  <span>Barcode: {itemToDelete.barcode}</span>
                </div>
                <div className="text-stone-600 pt-1 border-t border-stone-200">
                  Size: <strong>{itemToDelete.size}</strong> • {itemToDelete.color} • Current Stock: <strong>{itemToDelete.stockQuantity} units</strong>
                </div>
              </div>

              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                Warning: This will permanently remove the item, its barcode tags, and related stock records from the database.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-stone-100 bg-stone-50">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-200/60 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === itemToDelete.id}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingId === itemToDelete.id ? 'Removing...' : 'Yes, Remove Garment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
