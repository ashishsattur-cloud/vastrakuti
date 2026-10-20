// src/components/Header.tsx
import React, { useState } from 'react';
import {
  ShoppingCart,
  Layers,
  BarChart3,
  AlertTriangle,
  Barcode,
  Camera,
  Globe,
  UserCheck,
  Shield,
  LogIn,
  LogOut,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useInventory } from '../context/InventoryContext.tsx';

interface HeaderProps {
  activeTab: 'pos' | 'inventory' | 'analytics' | 'alerts';
  setActiveTab: (tab: 'pos' | 'inventory' | 'analytics' | 'alerts') => void;
  onOpenScanner: () => void;
  onOpenSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  onOpenSync,
}) => {
  const { user, firebaseUser, signInWithGoogle, signOut, switchRole } = useAuth();
  const { alerts, cart, refreshInventory } = useInventory();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cartItemsCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const criticalStockCount = alerts.length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshInventory();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top Banner for Urgent Stock Alerts if any items are 0 stock */}
      {alerts.some((i) => i.stockQuantity === 0) && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2 mx-auto">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              Real-Time Stock Alert: Some cotton items are completely SOLD OUT. Deductions and restocks are being tracked.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('alerts')}
            className="text-[11px] underline font-bold uppercase tracking-wider hover:text-rose-100"
          >
            Review Stock
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('pos')}>
            <div className="w-10 h-10 rounded-xl bg-amber-800 text-amber-50 flex items-center justify-center font-bold text-lg shadow-sm border border-amber-900/40">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-stone-900 text-base tracking-tight font-serif">
                  SUTRA
                </span>
                <span className="text-xs uppercase tracking-widest text-amber-800 font-semibold font-mono">
                  Cotton POS
                </span>
              </div>
              <p className="text-[10px] text-stone-500 font-medium">Handloom & Organic Retail</p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center space-x-1 bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'pos'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-700" />
              <span>POS Terminal</span>
              {cartItemsCount > 0 && (
                <span className="bg-amber-800 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'inventory'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              <span>Inventory & Barcodes</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
              <span>Sales Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition relative ${
                activeTab === 'alerts'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Stock Alerts</span>
              {criticalStockCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {criticalStockCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Controls: Scanner, Sync, RBAC Switcher, Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Refresh Data */}
            <button
              onClick={handleManualRefresh}
              title="Refresh inventory and stock status"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-700' : ''}`} />
            </button>

            {/* Quick Camera Barcode Scanner Button */}
            <button
              onClick={onOpenScanner}
              title="Open Barcode Camera Scanner"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition"
            >
              <Barcode className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Scan Gun / Camera</span>
            </button>

            {/* 3rd-Party Sync Button (Manager only or enabled) */}
            <button
              onClick={onOpenSync}
              title="Third-Party API & E-Commerce Sync"
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition"
            >
              <Globe className="w-4 h-4 text-emerald-700" />
              <span>API Sync</span>
            </button>

            {/* Role-Based Access Control Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  user.role === 'manager'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="capitalize">{user.role}</span>
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-stone-200 p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="font-semibold text-stone-900">{user.displayName}</p>
                    <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Switch Role (RBAC)
                    </p>
                    <button
                      onClick={() => {
                        switchRole('manager');
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                        user.role === 'manager'
                          ? 'bg-amber-100 font-bold text-amber-900'
                          : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span>Manager (Full Access)</span>
                      {user.role === 'manager' && <UserCheck className="w-3.5 h-3.5 text-amber-800" />}
                    </button>
                    <button
                      onClick={() => {
                        switchRole('employee');
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                        user.role === 'employee'
                          ? 'bg-blue-100 font-bold text-blue-900'
                          : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span>Employee (POS & Cashier)</span>
                      {user.role === 'employee' && <UserCheck className="w-3.5 h-3.5 text-blue-800" />}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-stone-100">
                    {firebaseUser ? (
                      <button
                        onClick={() => {
                          signOut();
                          setRoleMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          signInWithGoogle();
                          setRoleMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-amber-900 hover:bg-amber-50 rounded-xl font-medium"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign in with Google</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Tab Bar */}
        <div className="flex md:hidden border-t border-stone-200/60 py-2 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === 'pos' ? 'bg-amber-800 text-white' : 'text-stone-600 bg-stone-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS ({cartItemsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === 'inventory' ? 'bg-amber-800 text-white' : 'text-stone-600 bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-amber-800 text-white' : 'text-stone-600 bg-stone-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
              activeTab === 'alerts' ? 'bg-rose-700 text-white' : 'text-rose-700 bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerts ({criticalStockCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
