// src/types/inventory.ts

export interface InventoryItem {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  fabric: string;
  size: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  rackLocation: string | null;
  description: string | null;
  imageUrl: string | null;
  supplier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export interface SaleItem {
  id: number;
  saleId: number;
  itemId: number;
  itemSku: string;
  itemName: string;
  itemSize: string | null;
  itemColor: string | null;
  unitCost: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  cashierUid: string | null;
  cashierName: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: number;
  itemId: number;
  adjustedByName: string | null;
  changeQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  notes: string | null;
  createdAt: string;
}

export interface SyncLog {
  id: number;
  platform: string;
  endpoint: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  itemsSynced: number;
  details: string | null;
  createdAt: string;
}

export interface AnalyticsData {
  summary: {
    todayRevenue: number;
    todayOrders: number;
    totalRevenue: number;
    totalSalesCount: number;
    grossProfit: number;
    profitMarginPct: number;
    totalStockUnits: number;
    inventoryValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  topSelling: Array<{
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }>;
  categorySales: Record<string, { units: number; revenue: number }>;
  recentAdjustments: StockAdjustment[];
  recentSales: Sale[];
}

export type UserRole = 'manager' | 'employee';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isFirebaseUser?: boolean;
}

export interface CheckoutItemRequest {
  itemId: number;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutPayload {
  items: CheckoutItemRequest[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  discountAmount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  cashierUid?: string;
  cashierName?: string;
}

