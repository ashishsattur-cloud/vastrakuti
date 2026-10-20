// src/App.tsx
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { InventoryProvider, useInventory } from './context/InventoryContext.tsx';
import { Header } from './components/Header.tsx';
import { PosTerminal } from './pages/PosTerminal.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { ScannerModal } from './components/ScannerModal.tsx';
import { SyncModal } from './components/SyncModal.tsx';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Keyboard } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'analytics' | 'alerts'>('pos');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const { notification, dismissNotification } = useInventory();

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification Container */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-bounce-short">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-start space-x-3 text-xs font-semibold backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900'
                : notification.type === 'warning'
                ? 'bg-amber-50/95 border-amber-300 text-amber-900'
                : 'bg-stone-50/95 border-stone-300 text-stone-900'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-stone-600 shrink-0" />}

            <div className="flex-1 leading-relaxed">{notification.message}</div>

            <button
              onClick={dismissNotification}
              className="text-stone-400 hover:text-stone-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setScannerOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
      />

      {/* Main View Port */}
      <main className="flex-1 pb-16">
        {activeTab === 'pos' && <PosTerminal onOpenScanner={() => setScannerOpen(true)} />}
        {activeTab === 'inventory' && <InventoryPage onOpenScanner={() => setScannerOpen(true)} />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'alerts' && <AlertsPage />}
      </main>

      {/* Bottom Bar: POS Hardware Status and Hotkeys Helper (Desktop / Laptop) */}
      <footer className="bg-white border-t border-stone-200 py-2.5 px-6 text-[11px] text-stone-500 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-stone-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>USB / Bluetooth Barcode Gun Listener: Active</span>
            </span>
            <span>•</span>
            <span>Cloud SQL PostgreSQL Relational Database</span>
            <span>•</span>
            <span>Atomic Stock Lock: Enabled</span>
          </div>

          <div className="flex items-center space-x-3 text-stone-600 font-mono">
            <span className="flex items-center space-x-1 bg-stone-100 px-1.5 py-0.5 rounded">
              <Keyboard className="w-3 h-3 text-stone-400" />
              <span>Laser Gun: Trigger Scan Anywhere</span>
            </span>
            <span className="bg-stone-100 px-1.5 py-0.5 rounded">F2: Barcode Focus</span>
            <span className="bg-stone-100 px-1.5 py-0.5 rounded">Esc: Close Modal</span>
          </div>
        </div>
      </footer>

      {/* Camera Barcode Scanner Modal */}
      <ScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />

      {/* 3rd-Party Sync & Webhook Modal */}
      <SyncModal isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </AuthProvider>
  );
}
