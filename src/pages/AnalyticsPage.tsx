// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Layers,
  ArrowUpRight,
  Printer,
  Calendar,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AnalyticsData, Sale, SaleItem } from '../types/inventory.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ReceiptModal } from '../components/ReceiptModal.tsx';

export const AnalyticsPage: React.FC = () => {
  const { getAuthHeaders, user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  const isManager = user.role === 'manager';

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleViewReceipt = async (sale: Sale) => {
    try {
      const res = await fetch(`/api/sales/${sale.id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedSale(json.sale);
        setSelectedSaleItems(json.items || []);
        setShowReceipt(true);
      }
    } catch (e) {
      console.error('Error fetching sale details:', e);
    }
  };

  const formatCurrency = (amt: number) => {
    return amt.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-700" />
        <p className="text-sm">Calculating real-time sales and inventory analytics...</p>
      </div>
    );
  }

  const { summary, topSelling, categorySales, recentAdjustments, recentSales } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-stone-900">Sales Analytics & Financial Insights</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time revenue, gross margin calculation, top-selling cotton apparel, and audit logs.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Today's Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {formatCurrency(summary.todayRevenue)}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{summary.todayOrders} Orders completed today</span>
          </div>
        </div>

        {/* Total Lifetime Sales */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Total Gross Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="text-xs text-stone-500">
            Across <strong>{summary.totalSalesCount}</strong> total invoices
          </div>
        </div>

        {/* Gross Profit & Margin (Confidential - Highlighted for Managers) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Estimated Gross Profit</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {isManager ? formatCurrency(summary.grossProfit) : '••••••'}
          </div>
          <div className="text-xs font-semibold text-indigo-800">
            {isManager ? `${summary.profitMarginPct}% Gross Margin` : 'Confidential (Manager Only)'}
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Live Stock Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {formatCurrency(summary.inventoryValuation)}
          </div>
          <div className="text-xs text-stone-500">
            <strong>{summary.totalStockUnits}</strong> units across all racks
          </div>
        </div>
      </div>

      {/* Two Column Layout: Category Distribution & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-700" />
            <span>Sales by Garment Category</span>
          </h3>

          <div className="space-y-3 pt-1">
            {Object.keys(categorySales).length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No category sales recorded yet</p>
            ) : (
              Object.entries(categorySales).map(([category, stats]) => {
                const maxRevenue = Math.max(...Object.values(categorySales).map((c) => c.revenue), 1);
                const percent = Math.round((stats.revenue / maxRevenue) * 100);

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-stone-800 font-semibold">{category}</span>
                      <span className="font-mono text-stone-900">
                        {formatCurrency(stats.revenue)} ({stats.units} units)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-800 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Selling Cotton Garments */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>Top-Selling Cotton Weaves</span>
          </h3>

          <div className="space-y-3 pt-1">
            {topSelling.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No product sales recorded yet</p>
            ) : (
              topSelling.map((item, idx) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center font-mono text-[11px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-stone-900">{item.name}</h4>
                      <p className="text-[11px] font-mono text-stone-500">SKU: {item.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold font-mono text-stone-900 block">
                      {formatCurrency(item.revenue)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {item.unitsSold} units sold
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Invoices Log */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-stone-900 text-sm">Recent POS Transactions</h3>
          </div>
          <span className="text-xs text-stone-500">Last 50 sales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-amber-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-stone-500">
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-stone-700 font-medium">{sale.cashierName || 'Cashier'}</td>
                    <td className="py-3 px-3 text-stone-600">{sale.customerName || 'Walk-in'}</td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-stone-100 text-stone-800">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewReceipt(sale)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-amber-800 hover:bg-amber-100 text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustments Audit Log (Deductions & Restocks) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-stone-700" />
            <h3 className="font-bold text-stone-900 text-sm">Stock Audit & Deduction History</h3>
          </div>
          <span className="text-xs text-stone-500">Damage write-offs, samples & audits</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Adjusted By</th>
                <th className="py-3 px-3 text-center">Change Qty</th>
                <th className="py-3 px-3 text-center">Stock Transition</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No stock adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                recentAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 text-stone-500 text-[11px] font-mono">
                      {new Date(adj.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-stone-900 text-[11px]">
                        {adj.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-600">{adj.adjustedByName || 'Staff'}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span
                        className={
                          adj.changeQuantity < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }
                      >
                        {adj.changeQuantity > 0 ? `+${adj.changeQuantity}` : adj.changeQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-500">
                      {adj.previousQuantity} → <strong className="text-stone-900">{adj.newQuantity}</strong>
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-[11px] italic">
                      {adj.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          items={selectedSaleItems}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};
