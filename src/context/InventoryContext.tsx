// src/context/InventoryContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, CartItem, CheckoutPayload } from '../types/inventory.ts';
import { useAuth } from './AuthContext.tsx';
import { playScanSuccessSound, playErrorSound, playCheckoutSuccessSound } from '../utils/sound.ts';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  alerts: InventoryItem[];
  cart: CartItem[];
  discountAmount: number;
  lastScannedBarcode: string | null;
  scannerConnected: boolean;
  notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string } | null;
  addToCart: (item: InventoryItem, quantity?: number) => boolean;
  removeFromCart: (itemId: number) => void;
  updateCartQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number) => void;
  scanBarcode: (barcode: string) => Promise<InventoryItem | null>;
  checkout: (payload: Omit<CheckoutPayload, 'items' | 'discountAmount'>) => Promise<any>;
  addItem: (itemData: any) => Promise<InventoryItem>;
  updateItem: (id: number, data: Partial<InventoryItem>) => Promise<InventoryItem>;
  deductStock: (id: number, quantity: number, reason: string, notes: string) => Promise<void>;
  restockItem: (id: number, quantity: number, notes: string) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  refreshInventory: () => Promise<void>;
  dismissNotification: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('sutra_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scannerConnected, setScannerConnected] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('sutra_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch Inventory
  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      console.error('Inventory fetch error:', err);
      showToast('Could not load inventory catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch Stock Alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.warn('Alerts fetch warning:', err);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchAlerts();

    // Poll stock alerts every 20 seconds to prevent overselling across counters
    const interval = setInterval(() => {
      fetchAlerts();
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchInventory, fetchAlerts]);

  // Scan Barcode function
  const scanBarcode = useCallback(
    async (code: string): Promise<InventoryItem | null> => {
      const cleaned = code.trim();
      if (!cleaned) return null;

      try {
        setLastScannedBarcode(cleaned);
        const res = await fetch(`/api/inventory/barcode/${encodeURIComponent(cleaned)}`);

        if (!res.ok) {
          playErrorSound();
          showToast(`No cotton product matched barcode "${cleaned}"`, 'error');
          return null;
        }

        const data = await res.json();
        const matchedItem: InventoryItem = data.item;

        if (matchedItem.stockQuantity <= 0) {
          playErrorSound();
          showToast(`"${matchedItem.name}" is OUT OF STOCK (0 units left)`, 'warning');
          return matchedItem;
        }

        // Add to cart
        addToCart(matchedItem, 1);
        playScanSuccessSound();
        showToast(`Scanned & added: ${matchedItem.name} (${matchedItem.size})`, 'success');
        return matchedItem;
      } catch (err: any) {
        playErrorSound();
        showToast('Barcode lookup error: ' + err.message, 'error');
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cart, showToast]
  );

  // USB / Bluetooth Hardware Scanner Keystroke Listener
  // Hardware guns type barcodes at rapid speeds (< 40ms per keystroke) ending in Enter.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard textarea or input that is not barcode-specific
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isBarcodeInput = target.getAttribute('data-barcode-input') === 'true';

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const barcode = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          e.preventDefault();
          scanBarcode(barcode);
        }
        return;
      }

      // Scanner keystroke timing filter: hardware guns deliver rapid bursts
      // If time between keystrokes > 200ms and not a fast burst, reset buffer unless barcode input focused
      if (timeDiff > 180 && !isBarcodeInput) {
        barcodeBufferRef.current = '';
      }

      // Record alphanumeric and hyphen characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isInput || isBarcodeInput) {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanBarcode]);

  // Cart operations
  const addToCart = useCallback(
    (item: InventoryItem, quantity: number = 1): boolean => {
      // Find current quantity in cart
      const existing = cart.find((c) => c.item.id === item.id);
      const currentCartQty = existing ? existing.quantity : 0;
      const requestedTotal = currentCartQty + quantity;

      if (requestedTotal > item.stockQuantity) {
        playErrorSound();
        showToast(
          `Cannot add more! Only ${item.stockQuantity} in stock for ${item.name} (${item.size})`,
          'warning'
        );
        return false;
      }

      setCart((prevCart) => {
        const idx = prevCart.findIndex((c) => c.item.id === item.id);
        if (idx >= 0) {
          const newCart = [...prevCart];
          newCart[idx] = {
            ...newCart[idx],
            quantity: newCart[idx].quantity + quantity,
          };
          return newCart;
        } else {
          return [...prevCart, { item, quantity }];
        }
      });

      return true;
    },
    [cart, showToast]
  );

  const removeFromCart = useCallback((itemId: number) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }, []);

  const updateCartQuantity = useCallback(
    (itemId: number, newQty: number) => {
      if (newQty <= 0) {
        removeFromCart(itemId);
        return;
      }

      const cartItem = cart.find((c) => c.item.id === itemId);
      if (!cartItem) return;

      if (newQty > cartItem.item.stockQuantity) {
        playErrorSound();
        showToast(
          `Stock limit: only ${cartItem.item.stockQuantity} units available for ${cartItem.item.name}`,
          'warning'
        );
        return;
      }

      setCart((prev) =>
        prev.map((c) => (c.item.id === itemId ? { ...c, quantity: newQty } : c))
      );
    },
    [cart, removeFromCart, showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountAmount(0);
    localStorage.removeItem('sutra_cart');
  }, []);

  const setDiscount = useCallback((amount: number) => {
    setDiscountAmount(Math.max(0, amount));
  }, []);

  // POS Checkout Execution
  const checkout = useCallback(
    async (payload: Omit<CheckoutPayload, 'items' | 'discountAmount'>) => {
      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }

      const checkoutItems = cart.map((c) => ({
        itemId: c.item.id,
        quantity: c.quantity,
        unitPrice: c.item.sellingPrice,
      }));

      const body: CheckoutPayload = {
        ...payload,
        items: checkoutItems,
        discountAmount,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        playErrorSound();
        throw new Error(data.error || 'Checkout transaction failed');
      }

      playCheckoutSuccessSound();
      clearCart();
      await fetchInventory();
      await fetchAlerts();

      showToast(`Sale completed! Invoice: ${data.invoiceNumber}`, 'success');
      return data;
    },
    [cart, discountAmount, getAuthHeaders, clearCart, fetchInventory, fetchAlerts, showToast]
  );

  // Add Item
  const addItem = useCallback(
    async (itemData: any) => {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      await fetchInventory();
      await fetchAlerts();
      showToast(`Item "${data.item.name}" added successfully with Barcode ${data.item.barcode}`, 'success');
      return data.item;
    },
    [getAuthHeaders, fetchInventory, fetchAlerts, showToast]
  );

  // Update Item
  const updateItem = useCallback(
    async (id: number, updateData: Partial<InventoryItem>) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      await fetchInventory();
      await fetchAlerts();
      showToast('Product specifications updated', 'success');
      return data.item;
    },
    [getAuthHeaders, fetchInventory, fetchAlerts, showToast]
  );

  // Deduct Stock
  const deductStock = useCallback(
    async (id: number, quantity: number, reason: string, notes: string) => {
      const res = await fetch(`/api/inventory/${id}/deduct`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity, reason, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deduct stock');
      }

      await fetchInventory();
      await fetchAlerts();
      showToast(`Deducted ${quantity} units: ${reason.replace(/_/g, ' ')}`, 'info');
    },
    [getAuthHeaders, fetchInventory, fetchAlerts, showToast]
  );

  // Restock Item
  const restockItem = useCallback(
    async (id: number, quantity: number, notes: string) => {
      const res = await fetch(`/api/inventory/${id}/restock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restock item');
      }

      await fetchInventory();
      await fetchAlerts();
      showToast(`Restocked ${quantity} units successfully`, 'success');
    },
    [getAuthHeaders, fetchInventory, fetchAlerts, showToast]
  );

  // Delete Item
  const deleteItem = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      await fetchInventory();
      await fetchAlerts();
      showToast('Item deleted from catalog', 'info');
    },
    [getAuthHeaders, fetchInventory, fetchAlerts, showToast]
  );

  return (
    <InventoryContext.Provider
      value={{
        items,
        loading,
        alerts,
        cart,
        discountAmount,
        lastScannedBarcode,
        scannerConnected,
        notification,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        setDiscount,
        scanBarcode,
        checkout,
        addItem,
        updateItem,
        deductStock,
        restockItem,
        deleteItem,
        refreshInventory: fetchInventory,
        dismissNotification,
        showToast,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
