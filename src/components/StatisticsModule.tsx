import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  Filter,
  Download,
  Target,
  DollarSign,
  Package,
  Users,
  Monitor,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart,
  TrendingDown
} from 'lucide-react';
import { RegisterSale, Product } from '../types';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { StockAlertsDropdown } from './common/StockAlertsDropdown';
import { useLanguage } from '../contexts/LanguageContext';

interface StatisticsModuleProps {
  registerSales: RegisterSale[];
  products: Product[];
}

interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  totalQuantity: number;
  numberOfTickets: number;
  stockAlerts: number;
  previousPeriodRevenue: number;
  previousPeriodExpenses: number;
  previousPeriodQuantity: number;
  previousPeriodTickets: number;
}

interface ProductStats {
  product: string;
  category: string;
  revenue: number;
  quantity: number;
  averageUnitPrice: number;
  tickets: number;
}

interface SellerStats {
  seller: string;
  revenue: number;
  quantity: number;
  tickets: number;
  averageBasket: number;
}

interface RegisterStats {
  register: string;
  revenue: number;
  quantity: number;
  tickets: number;
}

interface CategoryStats {
  category: string;
  revenue: number;
  quantity: number;
  percentageOfTotal: number;
}

export function StatisticsModule({ registerSales, products }: StatisticsModuleProps) {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedRegister, setSelectedRegister] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [topN, setTopN] = useState(10);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'sellers' | 'registers'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getFilteredSales = () => {
    let filtered = registerSales;
    
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    filtered = filtered.filter(sale => 
      isAfter(sale.date, start) && isBefore(sale.date, end)
    );
    
    if (selectedSeller !== 'all') {
      filtered = filtered.filter(sale => sale.seller === selectedSeller);
    }
    
    if (selectedRegister !== 'all') {
      filtered = filtered.filter(sale => sale.register === selectedRegister);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(sale => sale.category === selectedCategory);
    }
    
    return filtered;
  };

  const getPreviousPeriodSales = () => {
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    
    const previousStart = new Date(currentStart.getTime() - periodLength);
    const previousEnd = new Date(currentStart.getTime() - 1);
    
    return registerSales.filter(sale => 
      isAfter(sale.date, startOfDay(previousStart)) && 
      isBefore(sale.date, endOfDay(previousEnd))
    );
  };

  const filteredSales = getFilteredSales();
  const previousPeriodSales = getPreviousPeriodSales();
  
  const sellers = [...new Set(registerSales.map(s => s.seller))];
  const registers = ['Register1', 'Register2'];
  const categories = [...new Set(registerSales.map(s => s.category))];

  const handleDateRangeChange = (range: '7d' | '30d' | '90d' | 'custom') => {
    setDateRange(range);
    
    if (range !== 'custom') {
      const days = parseInt(range);
      setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const kpiData: KPIData = useMemo(() => {
    const totalRevenue = filteredSales.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = Math.abs(filteredSales.filter(sale => sale.total < 0).reduce((sum, sale) => sum + sale.total, 0));
    const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const numberOfTickets = filteredSales.length;
    const stockAlerts = products.filter(p => p.stock <= p.minStock).length;
    
    const previousPeriodRevenue = previousPeriodSales.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0);
    const previousPeriodExpenses = Math.abs(previousPeriodSales.filter(sale => sale.total < 0).reduce((sum, sale) => sum + sale.total, 0));
    const previousPeriodQuantity = previousPeriodSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const previousPeriodTickets = previousPeriodSales.length;
    
    return {
      totalRevenue,
      totalExpenses,
      totalQuantity,
      numberOfTickets,
      stockAlerts,
      previousPeriodRevenue,
      previousPeriodExpenses,
      previousPeriodQuantity,
      previousPeriodTickets
    };
  }, [filteredSales, previousPeriodSales, products]);

  const productStats: ProductStats[] = useMemo(() => {
    const productMap = new Map<string, ProductStats>();
    
    filteredSales.filter(sale => sale.total >= 0).forEach(sale => {
      const key = sale.product;
      if (!productMap.has(key)) {
        productMap.set(key, {
          product: sale.product,
          category: sale.category,
          revenue: 0,
          quantity: 0,
          averageUnitPrice: 0,
          tickets: 0
        });
      }
      
      const stats = productMap.get(key)!;
      stats.revenue += sale.total;
      stats.quantity += sale.quantity;
      stats.tickets += 1;
    });
    
    return Array.from(productMap.values()).map(stats => ({
      ...stats,
      averageUnitPrice: stats.quantity > 0 ? stats.revenue / stats.quantity : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const sellerStats: SellerStats[] = useMemo(() => {
    const sellerMap = new Map<string, SellerStats>();
    
    filteredSales.filter(sale => sale.total >= 0).forEach(sale => {
      if (!sellerMap.has(sale.seller)) {
        sellerMap.set(sale.seller, {
          seller: sale.seller,
          revenue: 0,
          quantity: 0,
          tickets: 0,
          averageBasket: 0
        });
      }
      
      const stats = sellerMap.get(sale.seller)!;
      stats.revenue += sale.total;
      stats.quantity += sale.quantity;
      stats.tickets += 1;
    });
    
    return Array.from(sellerMap.values()).map(stats => ({
      ...stats,
      averageBasket: stats.tickets > 0 ? stats.revenue / stats.tickets : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const registerStats: RegisterStats[] = useMemo(() => {
    const registerMap = new Map<string, RegisterStats>();
    
    registers.forEach(register => {
      registerMap.set(register, {
        register,
        revenue: 0,
        quantity: 0,
        tickets: 0
      });
    });
    
    filteredSales.filter(sale => sale.total >= 0).forEach(sale => {
      if (registerMap.has(sale.register)) {
        const stats = registerMap.get(sale.register)!;
        stats.revenue += sale.total;
        stats.quantity += sale.quantity;
        stats.tickets += 1;
      }
    });
    
    return Array.from(registerMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const categoryStats: CategoryStats[] = useMemo(() => {
    const categoryMap = new Map<string, CategoryStats>();
    const totalRevenue = filteredSales.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0);
    
    filteredSales.filter(sale => sale.total >= 0).forEach(sale => {
      if (!categoryMap.has(sale.category)) {
        categoryMap.set(sale.category, {
          category: sale.category,
          revenue: 0,
          quantity: 0,
          percentageOfTotal: 0
        });
      }
      
      const stats = categoryMap.get(sale.category)!;
      stats.revenue += sale.total;
      stats.quantity += sale.quantity;
    });
    
    return Array.from(categoryMap.values()).map(stats => ({
      ...stats,
      percentageOfTotal: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-400">
          <ArrowUp className="w-4 h-4 mr-1" />
          <span>+{change.toFixed(1)}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-400">
          <ArrowDown className="w-4 h-4 mr-1" />
          <span>{change.toFixed(1)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-slate-400">
          <Minus className="w-4 h-4 mr-1" />
          <span>0%</span>
        </div>
      );
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const tabs = [
    { id: 'overview', label: t('statistics.overview'), icon: BarChart3 },
    { id: 'products', label: t('statistics.products'), icon: Package },
    { id: 'sellers', label: t('statistics.sellers'), icon: Users },
    { id: 'registers', label: t('statistics.registers'), icon: Monitor }
  ];

  const handleProductClick = (product: Product) => {
    console.log('Product clicked:', product);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('statistics.title')}</h1>
          <p className="text-slate-400">{t('statistics.subtitle')}</p>
        </div>
        
        <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold 
                           py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-600 
                           transition-all duration-200 flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>{t('statistics.exportReport')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="text-slate-400 font-medium">{t('statistics.period')}:</span>
            <div className="flex space-x-2">
              {[
                { value: '7d', label: t('statistics.7days') },
                { value: '30d', label: t('statistics.30days') },
                { value: '90d', label: t('statistics.90days') },
                { value: 'custom', label: t('statistics.custom') }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleDateRangeChange(value as any)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    dateRange === value
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
              <span className="text-slate-400">{t('statistics.to')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">{t('dashboard.allSellers')}</option>
              {sellers.map(seller => (
                <option key={seller} value={seller}>{seller}</option>
              ))}
            </select>
            
            <select
              value={selectedRegister}
              onChange={(e) => setSelectedRegister(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">{t('dashboard.allRegisters')}</option>
              {registers.map(register => (
                <option key={register} value={register}>{register}</option>
              ))}
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">{t('dashboard.allCategories')}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary with Stock Alerts Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl 
                     border border-green-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-slate-400 text-sm">{t('statistics.revenue')}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(kpiData.totalRevenue)}</p>
              </div>
            </div>
          </div>
          {renderChangeIndicator(getPercentageChange(kpiData.totalRevenue, kpiData.previousPeriodRevenue))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 backdrop-blur-xl 
                     border border-pink-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <TrendingDown className="w-6 h-6 text-pink-400" />
              <div>
                <p className="text-slate-400 text-sm">{t('statistics.expenses')}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(kpiData.totalExpenses)}</p>
              </div>
            </div>
          </div>
          {renderChangeIndicator(getPercentageChange(kpiData.totalExpenses, kpiData.previousPeriodExpenses))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl 
                     border border-blue-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-slate-400 text-sm">{t('statistics.totalQuantity')}</p>
                <p className="text-2xl font-bold text-white">{kpiData.totalQuantity}</p>
              </div>
            </div>
          </div>
          {renderChangeIndicator(getPercentageChange(kpiData.totalQuantity, kpiData.previousPeriodQuantity))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl 
                     border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-slate-400 text-sm">{t('statistics.tickets')}</p>
                <p className="text-2xl font-bold text-white">{kpiData.numberOfTickets}</p>
              </div>
            </div>
          </div>
          {renderChangeIndicator(getPercentageChange(kpiData.numberOfTickets, kpiData.previousPeriodTickets))}
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

      {/* Sub-tabs Navigation */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <div className="flex space-x-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Category Analysis */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-green-400" />
                  <span>{t('statistics.categoryAnalysis')}</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-400 font-medium">{t('statistics.category')}</th>
                        <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.revenue')}</th>
                        <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.quantity')}</th>
                        <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.percentTotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStats.map((category, index) => (
                        <tr key={category.category} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="py-3 px-2 text-white font-medium">{category.category}</td>
                          <td className="py-3 px-2 text-right text-green-400 font-semibold">
                            {formatCurrency(category.revenue)}
                          </td>
                          <td className="py-3 px-2 text-center text-white">{category.quantity}</td>
                          <td className="py-3 px-2 text-center text-yellow-400 font-medium">
                            {category.percentageOfTotal.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  <span>{t('statistics.topProducts')} {topN}</span>
                </h3>
                <select
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">#</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">{t('statistics.product')}</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">{t('statistics.category')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.revenue')}</th>
                      <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.quantity')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.avgPrice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStats.slice(0, topN).map((product, index) => (
                      <tr key={product.product} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-2 text-blue-400 font-bold">{index + 1}</td>
                        <td className="py-3 px-2 text-white font-medium">{product.product}</td>
                        <td className="py-3 px-2 text-slate-300">{product.category}</td>
                        <td className="py-3 px-2 text-right text-green-400 font-semibold">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="py-3 px-2 text-center text-white">{product.quantity}</td>
                        <td className="py-3 px-2 text-right text-slate-300">
                          {formatCurrency(product.averageUnitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>{t('statistics.sellerPerformance')}</span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">#</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">{t('statistics.seller')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.revenue')}</th>
                      <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.quantity')}</th>
                      <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.tickets')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.avgBasket')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerStats.map((seller, index) => (
                      <tr key={seller.seller} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-2 text-purple-400 font-bold">{index + 1}</td>
                        <td className="py-3 px-2 text-white font-medium">{seller.seller}</td>
                        <td className="py-3 px-2 text-right text-green-400 font-semibold">
                          {formatCurrency(seller.revenue)}
                        </td>
                        <td className="py-3 px-2 text-center text-white">{seller.quantity}</td>
                        <td className="py-3 px-2 text-center text-white">{seller.tickets}</td>
                        <td className="py-3 px-2 text-right text-slate-300">
                          {formatCurrency(seller.averageBasket)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'registers' && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-green-400" />
                <span>{t('statistics.registerPerformance')}</span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">{t('statistics.register')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.revenue')}</th>
                      <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.quantity')}</th>
                      <th className="text-center py-3 px-2 text-slate-400 font-medium">{t('statistics.tickets')}</th>
                      <th className="text-right py-3 px-2 text-slate-400 font-medium">{t('statistics.percentOfTotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registerStats.map((register, index) => {
                      const totalRevenue = registerStats.reduce((sum, r) => sum + r.revenue, 0);
                      const percentage = totalRevenue > 0 ? (register.revenue / totalRevenue) * 100 : 0;
                      
                      return (
                        <tr key={register.register} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="py-3 px-2 text-white font-medium">{register.register}</td>
                          <td className="py-3 px-2 text-right text-green-400 font-semibold">
                            {formatCurrency(register.revenue)}
                          </td>
                          <td className="py-3 px-2 text-center text-white">{register.quantity}</td>
                          <td className="py-3 px-2 text-center text-white">{register.tickets}</td>
                          <td className="py-3 px-2 text-right text-yellow-400 font-medium">
                            {percentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Key Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl 
                   border border-blue-500/20 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">📊 {t('statistics.keyInsights')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="text-blue-400 font-semibold mb-2">🏆 {t('statistics.bestProduct')}</h4>
            <p className="text-white font-medium text-sm">{productStats[0]?.product || 'N/A'}</p>
            <p className="text-slate-300 text-xs">{formatCurrency(productStats[0]?.revenue || 0)}</p>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <h4 className="text-purple-400 font-semibold mb-2">👤 {t('statistics.bestSeller')}</h4>
            <p className="text-white font-medium text-sm">{sellerStats[0]?.seller || 'N/A'}</p>
            <p className="text-slate-300 text-xs">{formatCurrency(sellerStats[0]?.revenue || 0)}</p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <h4 className="text-green-400 font-semibold mb-2">📦 {t('statistics.mainCategory')}</h4>
            <p className="text-white font-medium text-sm">{categoryStats[0]?.category || 'N/A'}</p>
            <p className="text-slate-300 text-xs">{categoryStats[0]?.percentageOfTotal.toFixed(1)}% {t('statistics.ofRevenue')}</p>
          </div>
          
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
            <h4 className="text-pink-400 font-semibold mb-2">💸 {t('statistics.totalExpenses')}</h4>
            <p className="text-white font-medium text-sm">{formatCurrency(kpiData.totalExpenses)}</p>
            <p className="text-slate-300 text-xs">{t('statistics.refundsWithdrawals')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}