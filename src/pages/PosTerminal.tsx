// src/pages/PosTerminal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  ShoppingBag,
  Camera,
  Percent,
  CheckCircle2,
  User,
  Phone,
  Tag,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  PackagePlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { InventoryItem, Sale, SaleItem } from '../types/inventory.ts';
import { useInventory } from '../context/InventoryContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { ReceiptModal } from '../components/ReceiptModal.tsx';
import { ScanAndAddModal } from '../components/ScanAndAddModal.tsx';
import { AddItemModal } from '../components/AddItemModal.tsx';

const CATEGORIES = ['All', 'Kurtas', 'Sarees', 'Shirts', 'Dupattas', 'Bottomwear', 'Fabrics'];

export const PosTerminal: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const {
    items,
    loading,
    cart,
    discountAmount,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setDiscount,
    scanBarcode,
    checkout,
    showToast,
  } = useInventory();

  const { user } = useAuth();

  // POS Workflow View Mode: 'shopping' or 'billing'
  const [posMode, setPosMode] = useState<'shopping' | 'billing'>('shopping');

  // Barcode / SKU input specifically for Add to Cart
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Billing & Payment States
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);

  // Completed sale receipt
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedSaleItems, setCompletedSaleItems] = useState<SaleItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  // Scan & Add to Inventory Modal States
  const [scanAndAddOpen, setScanAndAddOpen] = useState(false);
  const [addItemBarcode, setAddItemBarcode] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [posMode]);

  // Handle Barcode Submit -> Add to Cart
  const handleAddToCartSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) {
      showToast('Please enter or scan a barcode first', 'warning');
      return;
    }

    const scanned = await scanBarcode(code);
    if (scanned) {
      setBarcodeInput('');
    }
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, c) => sum + c.item.sellingPrice * c.quantity, 0);

  const handleDiscountPercentChange = (pctStr: string) => {
    setDiscountPercent(pctStr);
    const pct = parseFloat(pctStr) || 0;
    const computedDiscount = Math.round((subtotal * Math.min(100, Math.max(0, pct))) / 100);
    setDiscount(computedDiscount);
  };

  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableSubtotal * 0.05); // 5% GST on cotton textiles
  const grandTotal = taxableSubtotal + taxAmount;

  const cashGivenNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashGivenNum - grandTotal);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery) ||
      item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fabric.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add items first.', 'warning');
      return;
    }

    if (paymentMethod === 'CASH' && cashGivenNum > 0 && cashGivenNum < grandTotal) {
      showToast(`Tendered cash is less than grand total (${grandTotal})`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await checkout({
        paymentMethod,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        cashierUid: user.uid,
        cashierName: user.displayName,
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });

      const mappedSale: Sale = {
        id: result.sale.id,
        invoiceNumber: result.invoiceNumber,
        cashierUid: user.uid,
        cashierName: user.displayName,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount: grandTotal,
        paymentMethod,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        notes: null,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      const mappedItems: SaleItem[] = cart.map((c, idx) => ({
        id: idx + 1,
        saleId: result.sale.id,
        itemId: c.item.id,
        itemSku: c.item.sku,
        itemName: c.item.name,
        itemSize: c.item.size,
        itemColor: c.item.color,
        unitCost: c.item.costPrice,
        unitPrice: c.item.sellingPrice,
        quantity: c.quantity,
        totalPrice: c.item.sellingPrice * c.quantity,
      }));

      setCompletedSale(mappedSale);
      setCompletedSaleItems(mappedItems);
      setShowReceipt(true);

      // Reset form and back to shopping
      setCustomerName('');
      setCustomerPhone('');
      setCashTendered('');
      setDiscountPercent('0');
      setPosMode('shopping');
    } catch (err: any) {
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Action Header: Scan & Add to Inventory AND Add to Cart Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Add to Cart Barcode Input & Button */}
          <form onSubmit={handleAddToCartSubmit} className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-amber-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                data-barcode-input="true"
                placeholder="Scan Garment Tag or enter barcode / SKU to Add to Cart..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-stone-50"
              />
            </div>

            {/* BUTTON 1: Add to Cart */}
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition whitespace-nowrap active:scale-95 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Cart</span>
            </button>
          </form>

          {/* Action Group: Scan & Add to Inventory + Camera */}
          <div className="flex items-center space-x-2">
            {/* BUTTON 2: Scan & Add to Inventory */}
            <button
              type="button"
              onClick={() => setScanAndAddOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition active:scale-95 shadow-xs"
            >
              <PackagePlus className="w-4 h-4 text-amber-200" />
              <span>Scan & Add to Inventory</span>
            </button>

            {/* Camera Scanner Trigger */}
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
            >
              <Camera className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>
        </div>
      </div>

      {/* POS WORKFLOW: SHOPPING MODE vs BILLING MODE */}
      {posMode === 'shopping' ? (
        /* SHOPPING STAGE: Catalog Browser + Active Cart with 'Proceed to Billing' */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane: Garment Catalog & Category Browser (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Tabs & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by garment title, SKU, fabric (e.g. Mulmul, Chanderi), or color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
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

            {/* Product Cards Grid */}
            {loading ? (
              <div className="p-12 text-center text-stone-400 text-sm">Loading cotton inventory...</div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-semibold text-stone-700">No cotton apparel matches your filter</p>
                <p className="text-xs text-stone-400">Try searching for "Kurta", "Saree", or "Khadi"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const isOutOfStock = item.stockQuantity === 0;
                  const isLowStock = item.stockQuantity <= item.minStockAlert && !isOutOfStock;
                  const cartQty = cart.find((c) => c.item.id === item.id)?.quantity || 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition relative shadow-xs hover:border-amber-400 ${
                        isOutOfStock
                          ? 'opacity-60 border-stone-200 bg-stone-50/50'
                          : 'border-stone-200/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          {item.category}
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            SOLD OUT
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Only {item.stockQuantity} left</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                            {item.stockQuantity} in stock
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                          {item.fabric} • {item.color}
                        </p>

                        <div className="flex items-center space-x-2 mt-2 text-[11px] text-stone-600 font-mono">
                          <span className="bg-stone-100 px-1.5 py-0.5 rounded font-semibold text-stone-900">
                            Size: {item.size}
                          </span>
                          <span>SKU: {item.sku}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100">
                        <div>
                          <span className="text-[10px] uppercase text-stone-400 block font-sans">M.R.P.</span>
                          <span className="font-bold text-base text-stone-900 font-mono">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        </div>

                        <button
                          onClick={() => addToCart(item, 1)}
                          disabled={isOutOfStock}
                          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-xs ${
                            isOutOfStock
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : 'bg-emerald-800 text-white hover:bg-emerald-900'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add {cartQty > 0 ? `(${cartQty})` : ''}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Pane: Active Cart + "Finish Shopping & Proceed to Billing" */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-md p-5 sticky top-24 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-stone-900 text-base">Active Customer Cart</h3>
                <span className="bg-amber-100 text-amber-900 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, c) => sum + c.quantity, 0)} items
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 divide-y divide-stone-100">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-stone-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-xs font-medium">Cart is currently empty</p>
                  <p className="text-[11px] text-stone-400">
                    Scan garment tag with USB/Bluetooth barcode gun or click "+ Add" on items above
                  </p>
                </div>
              ) : (
                cart.map(({ item, quantity }) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="space-y-0.5 max-w-[55%]">
                      <h5 className="font-semibold text-stone-900 truncate">{item.name}</h5>
                      <p className="text-[11px] text-stone-500 font-mono">
                        {item.size} • {item.color} • {formatCurrency(item.sellingPrice)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                        <button
                          onClick={() => updateCartQuantity(item.id, quantity - 1)}
                          className="p-1 text-stone-600 hover:bg-stone-200 rounded-l-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-stone-900 text-xs">{quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, quantity + 1)}
                          className="p-1 text-stone-600 hover:bg-stone-200 rounded-r-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono font-bold text-stone-900 w-16 text-right">
                        {formatCurrency(item.sellingPrice * quantity)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Subtotal Summary */}
            <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Total Items:</span>
                <span className="font-mono font-semibold">{cart.reduce((sum, c) => sum + c.quantity, 0)} pieces</span>
              </div>
              <div className="flex justify-between text-stone-900 font-bold text-base pt-1 border-t border-stone-200">
                <span>Estimated Subtotal:</span>
                <span className="font-mono text-lg text-emerald-800">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* BUTTON: Finish Shopping & Proceed to Billing */}
            <button
              onClick={() => {
                if (cart.length === 0) {
                  showToast('Please add items to cart before proceeding to billing', 'warning');
                  return;
                }
                setPosMode('billing');
              }}
              disabled={cart.length === 0}
              className="w-full py-3.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm tracking-wide shadow-md transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>Finish Shopping & Proceed to Billing</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>

            <p className="text-[10px] text-stone-400 text-center">
              Clicking "Proceed to Billing" takes you to the customer invoice, payment mode, and receipt print step.
            </p>
          </div>
        </div>
      ) : (
        /* BILLING & PAYMENT STAGE: Complete Billing Terminal */
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-stone-200 shadow-lg p-6 space-y-6">
          {/* Top Bar: Back to Shopping Button */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <button
              onClick={() => setPosMode('shopping')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Shopping (Add More Garments)</span>
            </button>

            <div className="text-right">
              <span className="text-[11px] text-stone-500 block uppercase font-mono">Step 2 of 2</span>
              <h3 className="font-bold text-stone-900 text-lg">Billing & Secure Checkout</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Order Summary Items */}
            <div className="space-y-4">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
                <span>Invoice Items ({cart.length})</span>
              </h4>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 p-2 text-xs">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="py-2 px-2 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-stone-900">{item.name}</div>
                      <div className="text-stone-500 font-mono text-[11px]">
                        Size: {item.size} • {item.color} • {quantity} × {formatCurrency(item.sellingPrice)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      {formatCurrency(item.sellingPrice * quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Customer Details */}
              <div className="space-y-2 pt-2">
                <h5 className="font-semibold text-stone-800 text-xs uppercase tracking-wide">
                  Customer Receipt Information
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-700"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Phone (WhatsApp Receipt)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payment & Final Total */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4">
              <h4 className="font-bold text-stone-900 text-sm">Select Payment Method</h4>

              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-1 text-emerald-700" />
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('UPI')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === 'UPI'
                      ? 'bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-1 text-indigo-700" />
                  <span>UPI / QR</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === 'CARD'
                      ? 'bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-1 text-blue-700" />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('SPLIT')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === 'SPLIT'
                      ? 'bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Percent className="w-4 h-4 mb-1 text-purple-700" />
                  <span>Split</span>
                </button>
              </div>

              {/* Cash Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600 font-semibold">Cash Given by Customer:</span>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-28 px-2 py-1 text-right font-mono font-bold rounded-lg border border-stone-300 bg-stone-50"
                    />
                  </div>
                  {cashGivenNum > 0 && (
                    <div className="flex items-center justify-between text-stone-700 font-semibold pt-1 border-t border-stone-100">
                      <span>Change Due to Customer:</span>
                      <span className="font-mono text-emerald-800 font-bold text-sm">
                        {formatCurrency(changeDue)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Calculation */}
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-stone-600">
                  <div className="flex items-center space-x-1">
                    <span>Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => handleDiscountPercentChange(e.target.value)}
                      className="w-12 px-1.5 py-0.5 text-center font-mono rounded border border-stone-300 bg-white"
                    />
                  </div>
                  <span className="font-mono text-emerald-700 font-semibold">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>GST (5% Handloom Cotton):</span>
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                </div>

                <div className="flex justify-between text-stone-900 font-bold text-base pt-2 border-t border-stone-200">
                  <span>Grand Total to Pay:</span>
                  <span className="font-mono text-xl text-emerald-800">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Complete Billing Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm tracking-wide shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>
                  {isProcessing ? 'Processing Transaction...' : `Complete Billing & Print Receipt (${formatCurrency(grandTotal)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan & Add to Inventory Modal */}
      {scanAndAddOpen && (
        <ScanAndAddModal
          isOpen={scanAndAddOpen}
          onClose={() => setScanAndAddOpen(false)}
          onOpenAddItemWithBarcode={(newBarcode) => {
            setAddItemBarcode(newBarcode);
          }}
        />
      )}

      {/* Add Item Modal (opened with prefilled barcode if triggered from Scan & Add) */}
      {addItemBarcode && (
        <AddItemModal
          isOpen={true}
          initialBarcode={addItemBarcode}
          onClose={() => setAddItemBarcode(null)}
        />
      )}

      {/* Invoice Receipt Modal */}
      {showReceipt && completedSale && (
        <ReceiptModal
          sale={completedSale}
          items={completedSaleItems}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};
