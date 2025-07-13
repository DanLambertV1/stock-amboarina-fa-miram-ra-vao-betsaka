import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Upload,
  Bell,
  Settings,
  LogOut,
  PieChart,
  User,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadAlerts: number;
}

export function Sidebar({ isOpen, activeTab, onTabChange, unreadAlerts }: SidebarProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  
  const { user, logout, sessionDuration } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3 },
    { id: 'sales', label: t('nav.sales'), icon: ShoppingCart },
    { id: 'stock', label: t('nav.stock'), icon: Package },
    { id: 'statistics', label: t('nav.analytics'), icon: PieChart },
    { id: 'import', label: t('nav.import'), icon: Upload },
  ];

  const systemItems = [
    { id: 'notifications', label: t('nav.alerts'), icon: Bell },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    
    try {
      await logout();
      setLogoutSuccess(true);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
    setIsLoggingOut(false);
    setLogoutSuccess(false);
  };

  if (!user) return null;

  return (
    <>
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl 
                   border-r border-slate-700/50 z-50"
      >
        <div className="p-6">
          {/* Clean Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg 
                            flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{t('app.title')}</h1>
              <p className="text-xs text-slate-400">{t('app.subtitle')}</p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="mb-6">
            <LanguageSelector />
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full 
                              flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user.name}</p>
                <p className="text-slate-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{sessionDuration}</span>
              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                {t(`roles.${user.role}`)}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 mb-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                             ${isActive 
                               ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                               : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                             }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* System Items */}
          <div className="pt-6 border-t border-slate-700/50">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1
                             ${isActive 
                               ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                               : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                             }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.id === 'notifications' && unreadAlerts > 0 && (
                    <span className="ml-auto bg-blue-400 text-slate-900 text-xs px-2 py-1 rounded-full font-medium">
                      {unreadAlerts}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Logout */}
          <div className="absolute bottom-6 left-6 right-6">
            <motion.button
              onClick={handleLogoutClick}
              whileHover={{ x: 4 }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 
                         hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 
                         border border-red-500/20 hover:border-red-500/40"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">{t('nav.logout')}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
            >
              {!logoutSuccess ? (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t('sidebar.confirmLogout')}</h3>
                      <p className="text-slate-400 text-sm">{t('sidebar.endSession')}</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleLogoutConfirm}
                      disabled={isLoggingOut}
                      className="flex-1 bg-red-500 text-white font-semibold 
                                 py-3 px-4 rounded-xl hover:bg-red-600 
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-all duration-200"
                    >
                      {isLoggingOut ? t('sidebar.loggingOut') : t('common.confirm')}
                    </button>
                    
                    <button
                      onClick={handleLogoutCancel}
                      disabled={isLoggingOut}
                      className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-xl 
                                 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-all duration-200"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('sidebar.loggedOut')}</h3>
                  <p className="text-slate-400 text-sm">{t('sidebar.redirecting')}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}