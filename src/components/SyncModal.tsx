// src/components/SyncModal.tsx
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, Globe, CheckCircle2, ShieldCheck, ArrowUpDown, Code } from 'lucide-react';
import { SyncLog } from '../types/inventory.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useInventory } from '../context/InventoryContext.tsx';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { getAuthHeaders } = useAuth();
  const { showToast } = useInventory();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('Shopify Retail Connector');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/sync/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Sync logs error:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform: selectedPlatform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      showToast(`Synced ${data.syncedCount} items with ${selectedPlatform}`, 'success');
      await fetchLogs();
    } catch (err: any) {
      showToast(err.message || 'Sync error', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/sync/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sutra_cotton_inventory_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Inventory export downloaded successfully', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900">Third-Party API & Multi-Channel Sync</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Active Integration Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Shopify / WooCommerce</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-stone-500 mt-2">Bi-directional stock sync & webhooks active</p>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Accounting / ERP</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-stone-500 mt-2">JSON & CSV reports for Tally / Zoho Books</p>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">REST API Gateway</span>
                <Code className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-[11px] text-stone-500 mt-2">Real-time webhooks on <code>/api/sync/webhook</code></p>
            </div>
          </div>

          {/* Trigger Sync Panel */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <h4 className="font-semibold text-stone-900 text-sm flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-amber-700" />
              <span>Real-Time Inventory Catalog Sync</span>
            </h4>
            <p className="text-xs text-stone-600">
              Synchronize in-store stock counts with your online storefronts to prevent overselling of limited artisanal weaves.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
              >
                <option value="Shopify Retail Connector">Shopify Online Store</option>
                <option value="WooCommerce Handloom Portal">WooCommerce Handloom Store</option>
                <option value="Amazon / Flipkart Retail">Marketplace Channels</option>
                <option value="Central ERP Webhook">Central Warehouse ERP</option>
              </select>

              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="flex items-center justify-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing Catalog...' : 'Trigger Sync Now'}</span>
              </button>

              <button
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Export JSON Catalog</span>
              </button>
            </div>
          </div>

          {/* Webhook Endpoint Instructions */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800">Inbound Webhook Endpoint for E-Commerce Orders:</span>
              <span className="font-mono text-[11px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded">POST /api/sync/webhook</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              When an online order is placed on Shopify or WooCommerce, send a POST request with payload:
            </p>
            <pre className="bg-stone-900 text-amber-200 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto">
{`{
  "platform": "Shopify",
  "sku": "CK-IND-L",
  "quantityDeducted": 1
}`}
            </pre>
          </div>

          {/* Recent Sync Audit Log */}
          <div>
            <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider mb-2">
              Recent Sync Event Logs
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 text-xs">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between hover:bg-stone-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-stone-900">{log.platform}</span>
                        <span className="text-[10px] font-mono uppercase bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                          {log.direction}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[11px]">{log.details}</p>
                    </div>
                    <div className="text-right text-[10px] text-stone-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-stone-400 text-xs">
                  No sync events recorded yet. Click "Trigger Sync Now" above to initiate a channel sync.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-200/60 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
