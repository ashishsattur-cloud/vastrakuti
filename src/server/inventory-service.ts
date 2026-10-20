// src/server/inventory-service.ts
import { db } from '../db/index.ts';
import {
  inventoryItems,
  sales,
  saleItems,
  stockAdjustments,
  syncApiLogs,
  users,
} from '../db/schema.ts';
import { eq, desc, sql, and, lte, or, ilike } from 'drizzle-orm';

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

export class InventoryService {
  /**
   * Fetch inventory items with optional search filter and low-stock filter
   */
  static async getAllItems(filter?: { search?: string; category?: string; lowStockOnly?: boolean }) {
    try {
      let query = db.select().from(inventoryItems);

      const conditions = [];

      if (filter?.search) {
        const searchTerm = `%${filter.search.trim()}%`;
        conditions.push(
          or(
            ilike(inventoryItems.name, searchTerm),
            ilike(inventoryItems.sku, searchTerm),
            ilike(inventoryItems.barcode, searchTerm),
            ilike(inventoryItems.fabric, searchTerm),
            ilike(inventoryItems.color, searchTerm)
          )
        );
      }

      if (filter?.category && filter.category !== 'All') {
        conditions.push(eq(inventoryItems.category, filter.category));
      }

      if (filter?.lowStockOnly) {
        conditions.push(lte(inventoryItems.stockQuantity, inventoryItems.minStockAlert));
      }

      if (conditions.length > 0) {
        // @ts-ignore
        return await query.where(and(...conditions)).orderBy(inventoryItems.name);
      }

      return await query.orderBy(inventoryItems.name);
    } catch (error) {
      console.error('Failed to get inventory items:', error);
      throw new Error('Could not retrieve inventory items. Database error.', { cause: error });
    }
  }

  /**
   * Quick scan by barcode (for USB/Bluetooth scanner gun or camera)
   */
  static async getItemByBarcode(barcode: string) {
    try {
      const results = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.barcode, barcode.trim()))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      console.error('Failed to lookup barcode:', error);
      throw new Error('Barcode lookup failed.', { cause: error });
    }
  }

  /**
   * Get single item by ID
   */
  static async getItemById(id: number) {
    try {
      const results = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      console.error('Failed to lookup item by ID:', error);
      throw new Error('Item lookup failed.', { cause: error });
    }
  }

  /**
   * Add a new inventory item with auto-generated barcode if missing
   */
  static async addItem(data: {
    sku: string;
    barcode?: string;
    name: string;
    category: string;
    fabric: string;
    size: string;
    color: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockAlert?: number;
    rackLocation?: string;
    description?: string;
    supplier?: string;
    addedByName?: string;
  }) {
    try {
      // Auto-generate standard EAN13-like barcode if not provided
      const barcode = data.barcode?.trim() || '890' + Math.floor(100000000 + Math.random() * 900000000).toString();

      const [newItem] = await db
        .insert(inventoryItems)
        .values({
          sku: data.sku.trim().toUpperCase(),
          barcode,
          name: data.name.trim(),
          category: data.category,
          fabric: data.fabric,
          size: data.size,
          color: data.color,
          costPrice: Math.round(data.costPrice),
          sellingPrice: Math.round(data.sellingPrice),
          stockQuantity: Math.max(0, Math.round(data.stockQuantity)),
          minStockAlert: data.minStockAlert ? Math.round(data.minStockAlert) : 5,
          rackLocation: data.rackLocation || 'General Storage',
          description: data.description || '',
          supplier: data.supplier || 'In-house Cotton Mill',
        })
        .returning();

      // Log initial stock as restock adjustment
      if (newItem.stockQuantity > 0) {
        await db.insert(stockAdjustments).values({
          itemId: newItem.id,
          adjustedByName: data.addedByName || 'Store Admin',
          changeQuantity: newItem.stockQuantity,
          previousQuantity: 0,
          newQuantity: newItem.stockQuantity,
          reason: 'RESTOCK',
          notes: 'Initial inventory creation',
        });
      }

      return newItem;
    } catch (error: any) {
      console.error('Failed to add inventory item:', error);
      if (error?.code === '23505') {
        throw new Error('An item with this SKU or Barcode already exists. Please use a unique value.');
      }
      throw new Error('Failed to create inventory item.', { cause: error });
    }
  }

  /**
   * Update existing item
   */
  static async updateItem(id: number, data: Partial<typeof inventoryItems.$inferInsert>) {
    try {
      const [updated] = await db
        .update(inventoryItems)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, id))
        .returning();

      return updated;
    } catch (error: any) {
      console.error('Failed to update inventory item:', error);
      if (error?.code === '23505') {
        throw new Error('SKU or Barcode is already in use by another item.');
      }
      throw new Error('Failed to update inventory item.', { cause: error });
    }
  }

  /**
   * Deduct (remove) stock from an item with audit logging
   * Used for damages, samples, returns, or manual count adjustments
   */
  static async deductStock(
    itemId: number,
    deductQty: number,
    reason: string,
    notes: string,
    adjustedByName: string,
    adjustedByUid?: string
  ) {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      if (item.stockQuantity < deductQty) {
        throw new Error(`Cannot deduct ${deductQty} units. Only ${item.stockQuantity} currently available in stock.`);
      }

      const newQty = item.stockQuantity - deductQty;

      // Update stock
      const [updated] = await db
        .update(inventoryItems)
        .set({
          stockQuantity: newQty,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, itemId))
        .returning();

      // Log adjustment
      await db.insert(stockAdjustments).values({
        itemId,
        adjustedByUid: adjustedByUid || null,
        adjustedByName: adjustedByName || 'Staff Member',
        changeQuantity: -deductQty,
        previousQuantity: item.stockQuantity,
        newQuantity: newQty,
        reason: reason || 'MANUAL_DEDUCT',
        notes: notes || 'Stock deducted via inventory management',
      });

      return updated;
    } catch (error: any) {
      console.error('Failed to deduct stock:', error);
      throw new Error(error.message || 'Failed to deduct stock.', { cause: error });
    }
  }

  /**
   * Restock (add) quantity to an existing item
   */
  static async restockItem(
    itemId: number,
    restockQty: number,
    notes: string,
    adjustedByName: string,
    adjustedByUid?: string
  ) {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const newQty = item.stockQuantity + restockQty;

      const [updated] = await db
        .update(inventoryItems)
        .set({
          stockQuantity: newQty,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, itemId))
        .returning();

      await db.insert(stockAdjustments).values({
        itemId,
        adjustedByUid: adjustedByUid || null,
        adjustedByName: adjustedByName || 'Staff Member',
        changeQuantity: restockQty,
        previousQuantity: item.stockQuantity,
        newQuantity: newQty,
        reason: 'RESTOCK',
        notes: notes || 'Stock batch replenished',
      });

      return updated;
    } catch (error: any) {
      console.error('Failed to restock item:', error);
      throw new Error(error.message || 'Failed to restock item.', { cause: error });
    }
  }

  /**
   * Delete item
   */
  static async deleteItem(id: number) {
    try {
      // Cleanly remove associated adjustments and sale items so item can be fully removed from inventory
      await db.delete(stockAdjustments).where(eq(stockAdjustments.itemId, id));
      await db.delete(saleItems).where(eq(saleItems.itemId, id));
      await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      throw new Error(error.message || 'Failed to delete item.', { cause: error });
    }
  }

  /**
   * ATOMIC CHECKOUT & OVERSOLD PREVENTION
   * Uses atomic database updates to ensure stock never drops below 0 during peak concurrent sales.
   */
  static async processCheckout(payload: CheckoutPayload) {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cart is empty. Please add items before checking out.');
    }

    // Step 1: Pre-validate all items and verify sufficient stock
    const itemIds = payload.items.map((i) => i.itemId);
    const dbItems = await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.id} IN (${sql.join(itemIds.map((id) => sql`${id}`), sql`, `)})`);

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));

    // Check availability
    for (const cartItem of payload.items) {
      const item = itemMap.get(cartItem.itemId);
      if (!item) {
        throw new Error(`Item ID ${cartItem.itemId} was not found in inventory.`);
      }
      if (item.stockQuantity < cartItem.quantity) {
        throw new Error(
          `Stock Alert: Insufficient stock for "${item.name}" (${item.size}/${item.color}). Requested: ${cartItem.quantity}, Available: ${item.stockQuantity}.`
        );
      }
    }

    // Step 2: Atomic update per item ensuring stock_quantity >= quantity
    // If any item fails the atomic decrement condition, abort and rollback.
    const successfulDeductions: { itemId: number; qty: number; prevQty: number; newQty: number }[] = [];

    try {
      for (const cartItem of payload.items) {
        const result = await db
          .update(inventoryItems)
          .set({
            stockQuantity: sql`${inventoryItems.stockQuantity} - ${cartItem.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryItems.id, cartItem.itemId),
              sql`${inventoryItems.stockQuantity} >= ${cartItem.quantity}`
            )
          )
          .returning();

        if (result.length === 0) {
          const item = itemMap.get(cartItem.itemId);
          throw new Error(
            `Concurrent stock collision: "${item?.name || 'Item'}" was just purchased by another counter. Available stock is insufficient.`
          );
        }

        successfulDeductions.push({
          itemId: cartItem.itemId,
          qty: cartItem.quantity,
          prevQty: result[0].stockQuantity + cartItem.quantity,
          newQty: result[0].stockQuantity,
        });
      }

      // Step 3: Compute totals
      let subtotal = 0;
      for (const cartItem of payload.items) {
        subtotal += cartItem.unitPrice * cartItem.quantity;
      }

      const discount = Math.min(subtotal, Math.max(0, payload.discountAmount || 0));
      // Standard 5% GST on cotton garments below threshold (or 5% flat textile rate)
      const taxAmount = Math.round((subtotal - discount) * 0.05);
      const totalAmount = subtotal - discount + taxAmount;

      const invoiceNumber =
        'INV-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      // Step 4: Record Sale Header
      const [saleRecord] = await db
        .insert(sales)
        .values({
          invoiceNumber,
          cashierUid: payload.cashierUid || null,
          cashierName: payload.cashierName || 'Cashier Desk',
          subtotal,
          discountAmount: discount,
          taxAmount,
          totalAmount,
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName || 'Walk-in Customer',
          customerPhone: payload.customerPhone || '',
          notes: payload.notes || '',
          status: 'COMPLETED',
        })
        .returning();

      // Step 5: Record Sale Items & Adjustments Log
      for (const cartItem of payload.items) {
        const item = itemMap.get(cartItem.itemId)!;
        await db.insert(saleItems).values({
          saleId: saleRecord.id,
          itemId: item.id,
          itemSku: item.sku,
          itemName: item.name,
          itemSize: item.size,
          itemColor: item.color,
          unitCost: item.costPrice,
          unitPrice: cartItem.unitPrice,
          quantity: cartItem.quantity,
          totalPrice: cartItem.unitPrice * cartItem.quantity,
        });

        const deduction = successfulDeductions.find((d) => d.itemId === item.id);
        if (deduction) {
          await db.insert(stockAdjustments).values({
            itemId: item.id,
            adjustedByName: payload.cashierName || 'POS Checkout',
            changeQuantity: -cartItem.quantity,
            previousQuantity: deduction.prevQty,
            newQuantity: deduction.newQty,
            reason: 'SALE',
            notes: `Invoice ${invoiceNumber}`,
          });
        }
      }

      return {
        success: true,
        sale: saleRecord,
        invoiceNumber,
        itemsCount: payload.items.length,
        totalAmount,
      };
    } catch (err: any) {
      // If error occurred during checkout after some deductions were applied, revert them
      for (const d of successfulDeductions) {
        await db
          .update(inventoryItems)
          .set({
            stockQuantity: sql`${inventoryItems.stockQuantity} + ${d.qty}`,
          })
          .where(eq(inventoryItems.id, d.itemId));
      }
      throw new Error(err.message || 'Checkout failed due to concurrency or database constraint.', { cause: err });
    }
  }

  /**
   * Real-time Stock Alerts: Fetches out-of-stock and low-stock items
   */
  static async getStockAlerts() {
    try {
      const lowStockItems = await db
        .select()
        .from(inventoryItems)
        .where(lte(inventoryItems.stockQuantity, inventoryItems.minStockAlert))
        .orderBy(inventoryItems.stockQuantity);

      return lowStockItems;
    } catch (error) {
      console.error('Failed to get stock alerts:', error);
      throw new Error('Failed to retrieve stock alerts.', { cause: error });
    }
  }

  /**
   * Analytics Dashboard metrics
   */
  static async getAnalytics() {
    try {
      const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));
      const allSaleItems = await db.select().from(saleItems);
      const allItems = await db.select().from(inventoryItems);
      const adjustments = await db.select().from(stockAdjustments).orderBy(desc(stockAdjustments.createdAt)).limit(10);

      const totalRevenue = allSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalSalesCount = allSales.length;

      // Compute total cost of sold items to determine gross profit
      const totalCostOfGoodsSold = allSaleItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
      const totalSubtotal = allSales.reduce((sum, s) => sum + s.subtotal, 0);
      const grossProfit = Math.max(0, totalSubtotal - totalCostOfGoodsSold);
      const profitMarginPct = totalSubtotal > 0 ? Math.round((grossProfit / totalSubtotal) * 100) : 0;

      // Today's sales
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todaySales = allSales.filter((s) => s.createdAt && new Date(s.createdAt) >= startOfDay);
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

      // Low stock counts
      const lowStockCount = allItems.filter((i) => i.stockQuantity <= i.minStockAlert && i.stockQuantity > 0).length;
      const outOfStockCount = allItems.filter((i) => i.stockQuantity === 0).length;
      const totalStockUnits = allItems.reduce((sum, i) => sum + i.stockQuantity, 0);
      const inventoryValuation = allItems.reduce((sum, i) => sum + i.sellingPrice * i.stockQuantity, 0);

      // Top selling items
      const itemSalesCount: Record<string, { name: string; sku: string; unitsSold: number; revenue: number }> = {};
      for (const si of allSaleItems) {
        if (!itemSalesCount[si.itemSku]) {
          itemSalesCount[si.itemSku] = {
            name: si.itemName,
            sku: si.itemSku,
            unitsSold: 0,
            revenue: 0,
          };
        }
        itemSalesCount[si.itemSku].unitsSold += si.quantity;
        itemSalesCount[si.itemSku].revenue += si.totalPrice;
      }

      const topSelling = Object.values(itemSalesCount)
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 5);

      // Sales by category
      const categorySales: Record<string, { units: number; revenue: number }> = {};
      for (const si of allSaleItems) {
        const item = allItems.find((i) => i.id === si.itemId);
        const cat = item?.category || 'Cotton Apparel';
        if (!categorySales[cat]) {
          categorySales[cat] = { units: 0, revenue: 0 };
        }
        categorySales[cat].units += si.quantity;
        categorySales[cat].revenue += si.totalPrice;
      }

      return {
        summary: {
          todayRevenue,
          todayOrders: todaySales.length,
          totalRevenue,
          totalSalesCount,
          grossProfit,
          profitMarginPct,
          totalStockUnits,
          inventoryValuation,
          lowStockCount,
          outOfStockCount,
        },
        topSelling,
        categorySales,
        recentAdjustments: adjustments,
        recentSales: allSales.slice(0, 8),
      };
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
      throw new Error('Failed to generate sales analytics.', { cause: error });
    }
  }

  /**
   * Third party sync simulation and webhook integration
   */
  static async recordSyncLog(data: {
    platform: string;
    endpoint?: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    itemsSynced: number;
    details: string;
  }) {
    try {
      const [log] = await db
        .insert(syncApiLogs)
        .values({
          platform: data.platform,
          endpoint: data.endpoint || '/api/sync',
          direction: data.direction,
          status: data.status,
          itemsSynced: data.itemsSynced,
          details: data.details,
        })
        .returning();

      return log;
    } catch (error) {
      console.error('Failed to log API sync:', error);
      throw new Error('API Sync logging failed.', { cause: error });
    }
  }

  static async getSyncLogs() {
    try {
      return await db.select().from(syncApiLogs).orderBy(desc(syncApiLogs.createdAt)).limit(15);
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
      throw new Error('Could not fetch sync logs.', { cause: error });
    }
  }
}
