import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { AuthProvider } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SalesModule } from './components/SalesModule';
import StockModule from './components/StockModule';
import { ImportModule } from './components/ImportModule';
import { StatisticsModule } from './components/StatisticsModule';
import { SettingsModule } from './components/SettingsModule';
import { NotificationsModule } from './components/NotificationsModule';
import { ViewStateProvider } from './hooks/useViewState';
import { LanguageProvider } from './contexts/LanguageContext';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAuth } from './hooks/useAuth';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const {
    registerSales,
    products,
    dashboardStats,
    alerts,
    loading,
    addRegisterSales,
    addProduct,
    addProducts,
    updateProduct,
    updateSale,
    categorizeSales,
    deleteProduct,
    deleteProducts,
    deleteSales,
    markAlertAsRead,
    refreshData,
    autoSyncProductsFromSales
  } = useFirebaseData();

  const unreadAlerts = alerts.filter(alert => !alert.read).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-blue-400/30 border-t-blue-400 rounded-full"
        />
      </div>
    );
  }

  if (!isAuthenticated || !user || !user.role) {
    return (
      <LoginPage onLoginSuccess={() => {
        window.location.reload();
      }} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            dashboardStats={dashboardStats} 
            registerSales={registerSales}
            products={products}
            loading={loading} 
          />
        );
      case 'sales':
        return (
          <SalesModule 
            registerSales={registerSales}
            onRefreshData={refreshData}
            onDeleteSales={deleteSales}
            onUpdateSale={updateSale}
            onCategorizeSales={categorizeSales}
          />
        );
      case 'stock':
        return (
          <StockModule
            products={products}
            registerSales={registerSales}
            loading={loading}
            onAddProduct={addProduct}
            onAddProducts={addProducts}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onDeleteProducts={deleteProducts}
            onRefreshData={refreshData}
            autoSyncProductsFromSales={autoSyncProductsFromSales}
          />
        );
      case 'statistics':
        return (
          <StatisticsModule 
            registerSales={registerSales}
            products={products}
          />
        );
      case 'import':
        return (
          <ImportModule 
            onImportSales={addRegisterSales}
            onRefreshData={refreshData}
            existingSales={registerSales}
          />
        );
      case 'notifications':
        return <NotificationsModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return (
          <Dashboard 
            dashboardStats={dashboardStats} 
            registerSales={registerSales}
            products={products}
            loading={loading} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Minimal Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadAlerts={unreadAlerts}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Clean Top Bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-4">
              {unreadAlerts > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="absolute -top-1 -right-1 bg-blue-400 text-slate-900 text-xs 
                                   rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {unreadAlerts}
                  </span>
                </motion.div>
              )}

              <div className="text-right">
                <p className="text-white font-medium text-sm">{user.name}</p>
                <p className="text-slate-400 text-xs">{user.role}</p>
              </div>

              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 
                              rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page Content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ViewStateProvider>
          <AppContent />
        </ViewStateProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;