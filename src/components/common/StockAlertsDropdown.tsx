import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  ChevronDown, 
  Package, 
  TrendingDown,
  X,
  ExternalLink
} from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface StockAlertsDropdownProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  className?: string;
}

export function StockAlertsDropdown({ products, onProductClick, className = '' }: StockAlertsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  
  // Filter products with stock alerts
  const lowStockProducts = products.filter(product => product.stock <= product.minStock);
  const outOfStockProducts = lowStockProducts.filter(product => product.stock === 0);
  const criticalStockProducts = lowStockProducts.filter(product => product.stock > 0);
  
  const alertCount = lowStockProducts.length;

  if (alertCount === 0) {
    return (
      <div className={`bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl 
                       border border-green-500/20 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-slate-800/50 text-green-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">{t('stockAlerts.status')}</p>
            <p className="text-2xl font-bold text-white">{t('stockAlerts.allGood')}</p>
            <p className="text-green-400 text-xs">{t('stockAlerts.noAlerts')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-xl 
                   border border-red-500/20 rounded-xl p-6 transition-all duration-300
                   hover:border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800/50 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-slate-400 text-sm font-medium mb-1">{t('stockAlerts.title')}</p>
              <p className="text-2xl font-bold text-white">{alertCount}</p>
              <p className="text-red-400 text-xs">
                {outOfStockProducts.length > 0 
                  ? `${outOfStockProducts.length} ${t('stockAlerts.outOfStock')}`
                  : t('stockAlerts.lowStockItems')
                }
              </p>
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl 
                       border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-white font-medium text-sm">{t('stockAlerts.title')} ({alertCount})</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto">
              {/* Out of Stock Section */}
              {outOfStockProducts.length > 0 && (
                <div className="p-4 border-b border-slate-700/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <h4 className="text-red-400 font-medium text-sm">
                      {t('stockAlerts.outOfStock')} ({outOfStockProducts.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {outOfStockProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ x: 4 }}
                        onClick={() => onProductClick?.(product)}
                        className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 
                                   rounded-lg cursor-pointer hover:bg-red-500/15 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{product.name}</p>
                          <p className="text-slate-400 text-xs">{product.category}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-red-500/30 text-red-300 px-2 py-1 rounded-full text-xs font-medium">
                            0 {t('stockAlerts.units')}
                          </span>
                          {onProductClick && (
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock Section */}
              {criticalStockProducts.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <h4 className="text-orange-400 font-medium text-sm">
                      {t('stockAlerts.lowStock')} ({criticalStockProducts.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {criticalStockProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ x: 4 }}
                        onClick={() => onProductClick?.(product)}
                        className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 
                                   rounded-lg cursor-pointer hover:bg-orange-500/15 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{product.name}</p>
                          <p className="text-slate-400 text-xs">{product.category}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-orange-500/30 text-orange-300 px-2 py-1 rounded-full text-xs font-medium">
                            {product.stock} / {product.minStock}
                          </span>
                          {onProductClick && (
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
              <p className="text-slate-400 text-xs text-center">
                {t('stockAlerts.clickToView')} • {t('stockAlerts.totalAlerts')}: {alertCount}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}