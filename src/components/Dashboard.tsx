import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Users,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  X,
  TrendingDown,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { DashboardStats, RegisterSale, Product } from '../types';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { FirebaseSetup } from './FirebaseSetup';
import { StockAlertsDropdown } from './common/StockAlertsDropdown';
import { calculateTotalQuantitySold } from '../utils/salesCalculations';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  dashboardStats: DashboardStats | null;
  registerSales: RegisterSale[];
  products: Product[];
  loading: boolean;
}

export function Dashboard({ dashboardStats, registerSales, products, loading }: DashboardProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegister, setFilterRegister] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortField, setSortField] = useState<keyof RegisterSale>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(true);
  
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-blue-400/30 border-t-blue-400 rounded-full"
        />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getFilteredSales = () => {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    return registerSales.filter(sale => {
      const matchesDateRange = isAfter(sale.date, start) && isBefore(sale.date, end);
      const matchesSearch = sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegister = filterRegister === 'all' || sale.register === filterRegister;
      const matchesSeller = filterSeller === 'all' || sale.seller === filterSeller;
      const matchesCategory = filterCategory === 'all' || sale.category === filterCategory;
      
      return matchesDateRange && matchesSearch && matchesRegister && matchesSeller && matchesCategory;
    });
  };

  const filteredSalesByPeriod = getFilteredSales();

  const lowStockProducts = useMemo(() => {
    return products.filter(product => product.stock <= product.minStock);
  }, [products]);

  const dynamicStats = useMemo(() => {
    const sales = filteredSalesByPeriod;
    
    const totalSales = sales.length;
    const totalRevenue = sales.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = Math.abs(sales.filter(sale => sale.total < 0).reduce((sum, sale) => sum + sale.total, 0));
    const totalProducts = new Set(sales.map(s => s.product)).size;
    const lowStockAlerts = lowStockProducts.length;

    const productStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) {
        if (!acc[sale.product]) {
          acc[sale.product] = { quantity: 0, revenue: 0 };
        }
        acc[sale.product].quantity += sale.quantity;
        acc[sale.product].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({ product, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const sellerStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) {
        if (!acc[sale.seller]) {
          acc[sale.seller] = { quantity: 0, revenue: 0 };
        }
        acc[sale.seller].quantity += sale.quantity;
        acc[sale.seller].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topSellers = Object.entries(sellerStats)
      .map(([seller, stats]) => ({ seller, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const registerStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) {
        let normalizedRegister = sale.register;
        if (sale.register.toLowerCase().includes('1') || sale.register.toLowerCase().includes('caisse1')) {
          normalizedRegister = 'Register1';
        } else if (sale.register.toLowerCase().includes('2') || sale.register.toLowerCase().includes('caisse2')) {
          normalizedRegister = 'Register2';
        }
        
        if (!acc[normalizedRegister]) {
          acc[normalizedRegister] = { quantity: 0, revenue: 0 };
        }
        acc[normalizedRegister].quantity += sale.quantity;
        acc[normalizedRegister].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const registerPerformance = Object.entries(registerStats)
      .map(([register, stats]) => ({ register, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalSales,
      totalRevenue,
      totalExpenses,
      totalProducts,
      lowStockAlerts,
      topProducts,
      topSellers,
      registerPerformance
    };
  }, [filteredSalesByPeriod, lowStockProducts.length]);

  const filteredSales = filteredSalesByPeriod
    .filter(sale => {
      const matchesSearch = sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegister = filterRegister === 'all' || sale.register === filterRegister;
      const matchesSeller = filterSeller === 'all' || sale.seller === filterSeller;
      const matchesCategory = filterCategory === 'all' || sale.category === filterCategory;
      
      return matchesSearch && matchesRegister && matchesSeller && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const registers = [...new Set(registerSales.map(s => s.register))];
  const sellers = [...new Set(registerSales.map(s => s.seller))];
  const categories = [...new Set(registerSales.map(s => s.category))];

  const handleSort = (field: keyof RegisterSale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const hasActiveFilters = searchTerm || filterRegister !== 'all' || filterSeller !== 'all' || filterCategory !== 'all' ||
    startDate !== format(startOfMonth(new Date()), 'yyyy-MM-dd') ||
    endDate !== format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterRegister('all');
    setFilterSeller('all');
    setFilterCategory('all');
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const handleProductClick = (product: Product) => {
    console.log('Product clicked:', product);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
        <p className="text-slate-400">{t('dashboard.subtitle')}</p>
      </div>

      {showFirebaseSetup && (
        <div className="relative">
          <FirebaseSetup />
          <button
            onClick={() => setShowFirebaseSetup(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">{t('dashboard.filters')}</h3>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white 
                         bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4" />
              <span>{t('dashboard.clearFilters')}</span>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('dashboard.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                         focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('dashboard.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                         focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                         placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <select
            value={filterRegister}
            onChange={(e) => setFilterRegister(e.target.value)}
            className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t('dashboard.allRegisters')}</option>
            {registers.map(register => (
              <option key={register} value={register}>{register}</option>
            ))}
          </select>
          
          <select
            value={filterSeller}
            onChange={(e) => setFilterSeller(e.target.value)}
            className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t('dashboard.allSellers')}</option>
            {sellers.map(seller => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                       focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t('dashboard.allCategories')}</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
          >
            <div className="flex items-center space-x-2 text-blue-400 text-sm">
              <Filter className="w-4 h-4" />
              <span>{t('filters.activeFilters')} - {t('filters.showing')} {filteredSalesByPeriod.length} {t('filters.salesOf')} {registerSales.length} {t('filters.total')}</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Stats with Stock Alerts Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl 
                     border border-blue-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-slate-400 text-sm">{t('dashboard.totalSales')}</p>
              <p className="text-2xl font-bold text-white">{dynamicStats.totalSales}</p>
            </div>
          </div>
          <p className="text-blue-400 text-sm">{t('dashboard.filteredPeriod')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl 
                     border border-green-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-slate-400 text-sm">{t('dashboard.revenue')}</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dynamicStats.totalRevenue)}</p>
            </div>
          </div>
          <p className="text-green-400 text-sm">{t('dashboard.positiveSalesOnly')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 backdrop-blur-xl 
                     border border-pink-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <TrendingDown className="w-6 h-6 text-pink-400" />
            <div>
              <p className="text-slate-400 text-sm">{t('dashboard.expenses')}</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dynamicStats.totalExpenses)}</p>
            </div>
          </div>
          <p className="text-pink-400 text-sm">{t('dashboard.negativeAmounts')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl 
                     border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Package className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-slate-400 text-sm">{t('dashboard.productsSold')}</p>
              <p className="text-2xl font-bold text-white">{dynamicStats.totalProducts}</p>
            </div>
          </div>
          <p className="text-purple-400 text-sm">{t('dashboard.differentItems')}</p>
        </motion.div>

        {/* Stock Alerts Dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StockAlertsDropdown 
            products={products}
            onProductClick={handleProductClick}
          />
        </motion.div>
      </div>

      {/* Top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>{t('dashboard.topProducts')}</span>
            {hasActiveFilters && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                {t('dashboard.filtered')}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.topProducts.length > 0 ? (
              dynamicStats.topProducts.map((product, index) => (
                <div key={product.product} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{product.product}</p>
                      <p className="text-slate-400 text-xs">{product.quantity} {t('dashboard.sold')}</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold text-sm">{formatCurrency(product.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noProductsFound')}</p>
                <p className="text-sm">{t('dashboard.withCurrentFilters')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Sellers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>{t('dashboard.topSellers')}</span>
            {hasActiveFilters && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                {t('dashboard.filtered')}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.topSellers.length > 0 ? (
              dynamicStats.topSellers.map((seller, index) => (
                <div key={seller.seller} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{seller.seller}</p>
                      <p className="text-slate-400 text-xs">{seller.quantity} {t('dashboard.sales')}</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold text-sm">{formatCurrency(seller.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noSellersFound')}</p>
                <p className="text-sm">{t('dashboard.withCurrentFilters')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Register Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-green-400" />
            <span>{t('dashboard.registerPerformance')}</span>
            {hasActiveFilters && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                {t('dashboard.filtered')}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.registerPerformance.length > 0 ? (
              dynamicStats.registerPerformance.map((register, index) => (
                <div key={register.register} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-400 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{register.register}</p>
                      <p className="text-slate-400 text-xs">{register.quantity} {t('dashboard.items')}</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold text-sm">{formatCurrency(register.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noRegistersFound')}</p>
                <p className="text-sm">{t('dashboard.withCurrentFilters')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sales Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <h3 className="text-lg font-semibold text-white">{t('dashboard.salesDetails')}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {[
                  { key: 'product', label: t('table.product') },
                  { key: 'category', label: t('table.category') },
                  { key: 'register', label: t('table.register') },
                  { key: 'date', label: t('table.date') },
                  { key: 'seller', label: t('table.seller') },
                  { key: 'quantity', label: t('table.quantity') },
                  { key: 'price', label: t('table.unitPrice') },
                  { key: 'total', label: t('table.total') }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white
                               transition-colors duration-200"
                    onClick={() => handleSort(key as keyof RegisterSale)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{label}</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.slice(0, 50).map((sale, index) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors duration-200"
                >
                  <td className="py-3 px-4 text-white font-medium">{sale.product}</td>
                  <td className="py-3 px-4 text-slate-300">{sale.category}</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                      {sale.register}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {format(sale.date, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{sale.seller}</td>
                  <td className="py-3 px-4 text-center text-white font-medium">{sale.quantity}</td>
                  <td className="py-3 px-4 text-slate-300">{formatCurrency(sale.price)}</td>
                  <td className={`py-3 px-4 font-semibold ${sale.total >= 0 ? 'text-green-400' : 'text-pink-400'}`}>
                    {formatCurrency(sale.total)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length > 50 && (
            <div className="text-center py-4 text-slate-400">
              {t('filters.showing')} 50 {t('filters.salesOf')} {filteredSales.length}
            </div>
          )}

          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('messages.noSalesFound')}</p>
              <p className="text-sm">{t('dashboard.withCurrentFilters')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}