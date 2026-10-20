// src/db/schema.ts
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table with role-based access control (RBAC)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('employee'), // 'manager' | 'employee'
  pinCode: text('pin_code'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Inventory items tailored for retail cotton garments
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'Kurtas', 'Sarees', 'Shirts', 'Dupattas', 'Bottomwear', 'Fabrics'
  fabric: text('fabric').notNull(), // e.g., '100% Organic Cotton', 'Mulmul Cotton', 'Chanderi Cotton', 'Khadi'
  size: text('size').notNull(), // 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'
  color: text('color').notNull(),
  costPrice: integer('cost_price').notNull(), // In cents or paisa (e.g. 1500 = $15.00)
  sellingPrice: integer('selling_price').notNull(), // In cents or paisa (e.g. 3500 = $35.00)
  stockQuantity: integer('stock_quantity').notNull().default(0),
  minStockAlert: integer('min_stock_alert').notNull().default(5),
  rackLocation: text('rack_location'),
  description: text('description'),
  imageUrl: text('image_url'),
  supplier: text('supplier'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sales transactions
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  cashierUid: text('cashier_uid'),
  cashierName: text('cashier_name'),
  subtotal: integer('subtotal').notNull(),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'CASH', 'CARD', 'UPI', 'SPLIT'
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  notes: text('notes'),
  status: text('status').notNull().default('COMPLETED'), // 'COMPLETED', 'REFUNDED'
  createdAt: timestamp('created_at').defaultNow(),
});

// Individual items within each sale transaction
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .references(() => sales.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: integer('item_id')
    .references(() => inventoryItems.id, { onDelete: 'cascade' })
    .notNull(),
  itemSku: text('item_sku').notNull(),
  itemName: text('item_name').notNull(),
  itemSize: text('item_size'),
  itemColor: text('item_color'),
  unitCost: integer('unit_cost').notNull(),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: integer('total_price').notNull(),
});

// Stock adjustments log (deductions, damages, restocking, audits)
export const stockAdjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .references(() => inventoryItems.id, { onDelete: 'cascade' })
    .notNull(),
  adjustedByUid: text('adjusted_by_uid'),
  adjustedByName: text('adjusted_by_name'),
  changeQuantity: integer('change_quantity').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  reason: text('reason').notNull(), // 'SALE', 'DAMAGE_WRITE_OFF', 'DEFECT', 'DISPLAY_SAMPLE', 'MANUAL_DEDUCT', 'RESTOCK', 'SUPPLIER_RETURN', 'API_SYNC'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3rd-party API inventory sync logs
export const syncApiLogs = pgTable('sync_api_logs', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(), // 'Shopify', 'WooCommerce', 'ERP Webhook', 'CSV Sync'
  endpoint: text('endpoint'),
  direction: text('direction').notNull(), // 'INBOUND' | 'OUTBOUND'
  status: text('status').notNull(), // 'SUCCESS' | 'FAILED' | 'PENDING'
  itemsSynced: integer('items_synced').default(0),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  adjustments: many(stockAdjustments),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  saleItems: many(saleItems),
  adjustments: many(stockAdjustments),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  cashier: one(users, {
    fields: [sales.cashierUid],
    references: [users.uid],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  item: one(inventoryItems, {
    fields: [saleItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [stockAdjustments.itemId],
    references: [inventoryItems.id],
  }),
  user: one(users, {
    fields: [stockAdjustments.adjustedByUid],
    references: [users.uid],
  }),
}));
