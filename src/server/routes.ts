// src/server/routes.ts
import { Router, Response } from 'express';
import { InventoryService } from './inventory-service.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { users, sales, saleItems, inventoryItems } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// -------------------------------------------------------------
// 1. INVENTORY ENDPOINTS
// -------------------------------------------------------------

// List all inventory items
router.get('/inventory', async (req, res: Response) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const lowStockOnly = req.query.lowStock === 'true';

    const items = await InventoryService.getAllItems({ search, category, lowStockOnly });
    res.json({ items });
  } catch (error: any) {
    console.error('API Error /inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
  }
});

// Barcode instant lookup (for hardware USB/Bluetooth scanner guns or camera scan)
router.get('/inventory/barcode/:barcode', async (req, res: Response) => {
  try {
    const { barcode } = req.params;
    const item = await InventoryService.getItemByBarcode(barcode);
    if (!item) {
      return res.status(404).json({ error: `No item found for barcode: ${barcode}` });
    }
    res.json({ item });
  } catch (error: any) {
    console.error('API Error /inventory/barcode:', error);
    res.status(500).json({ error: error.message || 'Barcode scan failed' });
  }
});

// Add new inventory item (Managers and staff)
router.post('/inventory', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const {
      sku,
      barcode,
      name,
      category,
      fabric,
      size,
      color,
      costPrice,
      sellingPrice,
      stockQuantity,
      minStockAlert,
      rackLocation,
      description,
      supplier,
    } = req.body;

    if (!sku || !name || !category || !fabric || !size || !color) {
      return res.status(400).json({ error: 'Missing required item specifications' });
    }

    if (costPrice == null || sellingPrice == null) {
      return res.status(400).json({ error: 'Cost price and selling price are required' });
    }

    const newItem = await InventoryService.addItem({
      sku,
      barcode,
      name,
      category,
      fabric,
      size,
      color,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      stockQuantity: Number(stockQuantity || 0),
      minStockAlert: Number(minStockAlert || 5),
      rackLocation,
      description,
      supplier,
      addedByName: req.dbUser?.displayName || 'Store Staff',
    });

    res.status(201).json({ item: newItem });
  } catch (error: any) {
    console.error('API Error POST /inventory:', error);
    res.status(400).json({ error: error.message || 'Failed to create item' });
  }
});

// Update item (price, stock, details)
router.put('/inventory/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const updated = await InventoryService.updateItem(id, req.body);
    res.json({ item: updated });
  } catch (error: any) {
    console.error('API Error PUT /inventory/:id:', error);
    res.status(400).json({ error: error.message || 'Failed to update item' });
  }
});

// Deduct stock (damage, write-off, sample, manual adjustment)
router.post('/inventory/:id/deduct', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity, reason, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Deduction quantity must be greater than 0' });
    }

    const updated = await InventoryService.deductStock(
      id,
      parseInt(quantity, 10),
      reason || 'MANUAL_DEDUCT',
      notes || '',
      req.dbUser?.displayName || 'Store Staff',
      req.dbUser?.uid
    );

    res.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('API Error POST /inventory/:id/deduct:', error);
    res.status(400).json({ error: error.message || 'Failed to deduct stock' });
  }
});

// Restock item
router.post('/inventory/:id/restock', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Restock quantity must be greater than 0' });
    }

    const updated = await InventoryService.restockItem(
      id,
      parseInt(quantity, 10),
      notes || '',
      req.dbUser?.displayName || 'Store Staff',
      req.dbUser?.uid
    );

    res.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('API Error POST /inventory/:id/restock:', error);
    res.status(400).json({ error: error.message || 'Failed to restock item' });
  }
});

// Delete / Remove item from inventory
router.delete('/inventory/:id', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await InventoryService.deleteItem(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /inventory/:id:', error);
    res.status(400).json({ error: error.message || 'Failed to delete item' });
  }
});

// -------------------------------------------------------------
// 2. REAL-TIME STOCK ALERTS
// -------------------------------------------------------------
router.get('/alerts', async (req, res: Response) => {
  try {
    const alerts = await InventoryService.getStockAlerts();
    res.json({ alerts, count: alerts.length });
  } catch (error: any) {
    console.error('API Error /alerts:', error);
    res.status(500).json({ error: error.message || 'Failed to load stock alerts' });
  }
});

// -------------------------------------------------------------
// 3. SECURE CHECKOUT WITH CONCURRENCY OVERSOLD PROTECTION
// -------------------------------------------------------------
router.post('/checkout', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const { items, paymentMethod, discountAmount, customerName, customerPhone, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    const result = await InventoryService.processCheckout({
      items,
      paymentMethod: paymentMethod || 'CASH',
      discountAmount: Number(discountAmount || 0),
      customerName,
      customerPhone,
      notes,
      cashierUid: req.dbUser?.uid,
      cashierName: req.dbUser?.displayName || 'POS Cashier',
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('API Error POST /checkout:', error);
    // Return 409 Conflict if stock collision or insufficient stock
    const isStockError = error.message?.includes('Stock Alert') || error.message?.includes('collision');
    res.status(isStockError ? 409 : 400).json({
      error: error.message || 'Checkout failed',
      isStockConflict: isStockError,
    });
  }
});

// -------------------------------------------------------------
// 4. SALES & INVOICES
// -------------------------------------------------------------
router.get('/sales', async (req, res: Response) => {
  try {
    const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(50);
    res.json({ sales: allSales });
  } catch (error: any) {
    console.error('API Error /sales:', error);
    res.status(500).json({ error: error.message || 'Failed to load sales' });
  }
});

router.get('/sales/:id', async (req, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const saleList = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (saleList.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));

    res.json({ sale: saleList[0], items });
  } catch (error: any) {
    console.error('API Error /sales/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sale record' });
  }
});

// -------------------------------------------------------------
// 5. SALES ANALYTICS DASHBOARD
// -------------------------------------------------------------
router.get('/analytics', async (req, res: Response) => {
  try {
    const data = await InventoryService.getAnalytics();
    res.json(data);
  } catch (error: any) {
    console.error('API Error /analytics:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate analytics' });
  }
});

// -------------------------------------------------------------
// 6. THIRD-PARTY API INTEGRATION & REAL-TIME SYNC
// -------------------------------------------------------------
router.post('/sync/trigger', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const { platform = 'Shopify Retail Connector' } = req.body;

    // Simulate multi-channel inventory sync: fetches all stock, updates timestamps
    const items = await InventoryService.getAllItems();
    const log = await InventoryService.recordSyncLog({
      platform,
      endpoint: 'https://api.external-retail.com/v1/inventory/sync',
      direction: 'OUTBOUND',
      status: 'SUCCESS',
      itemsSynced: items.length,
      details: `Synchronized ${items.length} cotton apparel SKUs with remote retail catalog`,
    });

    res.json({ success: true, log, syncedCount: items.length });
  } catch (error: any) {
    console.error('API Error /sync/trigger:', error);
    res.status(500).json({ error: error.message || 'Sync operation failed' });
  }
});

// Inbound webhook from external ecommerce (e.g. WooCommerce/Shopify order placed online)
router.post('/sync/webhook', async (req, res: Response) => {
  try {
    const { platform = 'WooCommerce Webhook', sku, quantityDeducted = 1 } = req.body;

    let itemsSynced = 0;
    let details = 'Webhook received';

    if (sku) {
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.sku, sku)).limit(1);
      if (items.length > 0) {
        const item = items[0];
        await InventoryService.deductStock(
          item.id,
          quantityDeducted,
          'API_SYNC',
          `Order from online channel ${platform}`,
          'Automated Sync Webhook'
        );
        itemsSynced = 1;
        details = `Deducted ${quantityDeducted} units for SKU ${sku} via ${platform} webhook`;
      }
    }

    const log = await InventoryService.recordSyncLog({
      platform,
      endpoint: '/api/sync/webhook',
      direction: 'INBOUND',
      status: 'SUCCESS',
      itemsSynced,
      details,
    });

    res.json({ success: true, log });
  } catch (error: any) {
    console.error('API Error /sync/webhook:', error);
    res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

// Sync logs history
router.get('/sync/logs', async (req, res: Response) => {
  try {
    const logs = await InventoryService.getSyncLogs();
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Export catalog as CSV / JSON for external accounting software (Tally, Zoho, Quickbooks)
router.get('/sync/export', async (req, res: Response) => {
  try {
    const items = await InventoryService.getAllItems();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="cotton_inventory_export.json"');
    res.json({
      exportDate: new Date().toISOString(),
      store: 'Sutra Cotton Retail',
      totalProducts: items.length,
      items,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// -------------------------------------------------------------
// 7. USER & STAFF MANAGEMENT
// -------------------------------------------------------------
router.get('/staff', async (req, res: Response) => {
  try {
    const staffList = await db.select().from(users);
    res.json({ staff: staffList });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/staff/role', requireAuth('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;
    if (!['manager', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await db.update(users).set({ role }).where(eq(users.id, userId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;
