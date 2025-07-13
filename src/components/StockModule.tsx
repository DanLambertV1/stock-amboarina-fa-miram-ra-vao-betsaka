import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  RefreshCw,
  Search, 
  Edit,
  Trash2,
  Filter,
  Download,
  ArrowUpDown,
  Calendar,
  DollarSign,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  X,
  Eye,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Product, RegisterSale } from '../types';
import { format, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { exportToExcel } from '../utils/excelUtils';
import { useViewState, useScrollPosition } from '../hooks/useViewState';
import { StockImportModule } from './StockImportModule';
import { RebuildDatabaseButton } from './RebuildDatabaseButton';
import { ProductEditModal } from './ProductEditModal';
import { 
  calculateStockFinal, 
  calculateAggregatedStockStats, 
  validateStockConfiguration,
  formatStockDate 
} from '../utils/calculateStockFinal';
import { calculateTotalQuantitySold } from '../utils/salesCalculations';

interface StockModuleProps {
  products: Product[];
  registerSales: RegisterSale[];
  loading: boolean;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onAddProducts: (products: Omit<Product, 'id'>[]) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onDeleteProducts: (productIds: string[]) => Promise<void>;
  onRefreshData: () => void;
  autoSyncProductsFromSales: () => Promise<{
    created: Product[];
    summary: string;
  }>;
}

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  stock: string;
  minStock: string;
  description: string;
}

export default function StockModule({
  products,
  registerSales,
  loading,
  onAddProduct,
  onAddProducts,
  onUpdateProduct,
  onDeleteProduct,
  onDeleteProducts,
  onRefreshData,
  autoSyncProductsFromSales
}: StockModuleProps) {
  const { viewState, updateState, updateFilters, updateDateRange, updateSelectedItems, updateModals } = useViewState('stock');
  useScrollPosition('stock');

  // Initialize state from viewState with stable defaults
  const [searchTerm, setSearchTerm] = useState(viewState.searchTerm || '');
  const [filterCategory, setFilterCategory] = useState(viewState.filters?.category || 'all');
  const [filterStockLevel, setFilterStockLevel] = useState(viewState.filters?.stockLevel || 'all');
  const [sortField, setSortField] = useState<keyof Product>(viewState.sortField as keyof Product || 'name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(viewState.sortDirection || 'asc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(viewState.selectedItems || new Set());
  const [currentPage, setCurrentPage] = useState(viewState.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(viewState.itemsPerPage || 50);
  const [activeTab, setActiveTab] = useState<'list' | 'import'>(viewState.activeTab as 'list' | 'import' || 'list');
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(viewState.modals?.deleteModal || false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(viewState.modals?.importModal || false);
  const [syncNotification, setSyncNotification] = useState<{
    show: boolean;
    message: string;
    count: number;
  } | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    price: '',
    stock: '',
    minStock: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ CRITICAL FIX: Enhanced filtering with exact Sales module logic
  const [startDate, setStartDate] = useState(viewState.dateRange?.start || '');
  const [endDate, setEndDate] = useState(viewState.dateRange?.end || '');
  const [filterSeller, setFilterSeller] = useState(viewState.filters?.seller || 'all');
  const [filterRegister, setFilterRegister] = useState(viewState.filters?.register || 'all');

  // Get unique values for filters (same as Sales module)
  const categories = [...new Set(products.map(p => p.category))];
  const sellers = [...new Set(registerSales.map(s => s.seller))];
  const registers = [...new Set(registerSales.map(s => s.register))];

  // Calculate total quantity sold using the same function as in SalesModule
  const totalQuantitySold = useMemo(() => {
    return calculateTotalQuantitySold(registerSales);
  }, [registerSales]);

  // ✅ CRITICAL FIX: Filter sales data EXACTLY like Sales module
  const getFilteredSales = () => {
    let filtered = registerSales;
    
    // Date range filtering (same logic as Sales module)
    if (startDate || endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = sale.date;
        let matchesDateRange = true;
        
        if (startDate) {
          const startDateObj = startOfDay(new Date(startDate));
          matchesDateRange = matchesDateRange && saleDate >= startDateObj;
        }
        
        if (endDate) {
          const endDateObj = endOfDay(new Date(endDate));
          matchesDateRange = matchesDateRange && saleDate <= endDateObj;
        }
        
        return matchesDateRange;
      });
    }
    
    // Seller filtering
    if (filterSeller !== 'all') {
      filtered = filtered.filter(sale => sale.seller === filterSeller);
    }
    
    // Register filtering
    if (filterRegister !== 'all') {
      filtered = filtered.filter(sale => sale.register === filterRegister);
    }
    
    return filtered;
  };

  // ✅ CRITICAL FIX: Calculate metrics from FILTERED sales data
  const filteredSales = getFilteredSales();

  // Enhanced product matching function (same as useFirebaseData)
  const normalizeProductName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\b(100s?|20s?|25s?)\b/g, '')
      .trim();
  };

  const findMatchingProduct = (saleName: string, saleCategory: string, products: Product[]): Product | null => {
    const normalizedSaleName = normalizeProductName(saleName);
    const normalizedSaleCategory = saleCategory.toLowerCase().trim();

    // Try exact match first
    let match = products.find(product => 
      normalizeProductName(product.name) === normalizedSaleName &&
      product.category.toLowerCase().trim() === normalizedSaleCategory
    );

    if (match) return match;

    // Try partial match on product name with same category
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      return (
        normalizedProductCategory === normalizedSaleCategory &&
        (normalizedProductName.includes(normalizedSaleName) || 
         normalizedSaleName.includes(normalizedProductName))
      );
    });

    if (match) return match;

    // Try fuzzy match
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      if (normalizedProductCategory !== normalizedSaleCategory) return false;
      
      const saleWords = normalizedSaleName.split(' ').filter(word => word.length > 2);
      const productWords = normalizedProductName.split(' ').filter(word => word.length > 2);
      
      const matchingWords = saleWords.filter(saleWord => 
        productWords.some(productWord => 
          productWord.includes(saleWord) || saleWord.includes(productWord)
        )
      );
      
      return matchingWords.length >= Math.ceil(saleWords.length * 0.7);
    });

    return match || null;
  };

  // ✅ CRITICAL FIX: Calculate sales metrics using FILTERED sales and exact matching
  const salesMetrics = useMemo(() => {
    console.log('🔍 Calculating Stock module metrics from filtered sales:', {
      totalSales: registerSales.length,
      filteredSales: filteredSales.length,
      dateRange: { startDate, endDate },
      filterSeller,
      filterRegister
    });

    const productSalesMap = new Map<string, {
      quantitySold: number;
      revenue: number;
      salesCount: number;
    }>();

    // Process FILTERED sales to calculate metrics per product
    filteredSales.forEach(sale => {
      // Find matching product using the same logic as useFirebaseData
      const matchingProduct = findMatchingProduct(sale.product, sale.category, products);
      
      if (matchingProduct) {
        const productId = matchingProduct.id;
        const existing = productSalesMap.get(productId);
        
        if (existing) {
          existing.quantitySold += sale.quantity;
          existing.revenue += sale.total; // Use sale.total directly (not quantity * price)
          existing.salesCount += 1;
        } else {
          productSalesMap.set(productId, {
            quantitySold: sale.quantity,
            revenue: sale.total, // Use sale.total directly
            salesCount: 1
          });
        }
        
        console.log(`📊 Matched sale "${sale.product}" → "${matchingProduct.name}": +${sale.quantity} units, +€${sale.total}`);
      } else {
        console.warn(`⚠️ No matching product found for sale: "${sale.product}" (${sale.category})`);
      }
    });

    // Calculate totals
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalSalesCount = 0;

    productSalesMap.forEach(metrics => {
      totalUnitsSold += metrics.quantitySold;
      totalRevenue += metrics.revenue;
      totalSalesCount += metrics.salesCount;
    });

    console.log('📈 Stock module calculated metrics:', {
      totalUnitsSold,
      totalRevenue,
      totalSalesCount,
      productSalesMap: Object.fromEntries(
        Array.from(productSalesMap.entries()).map(([id, metrics]) => {
          const product = products.find(p => p.id === id);
          return [product?.name || id, metrics];
        })
      )
    });

    return {
      totalUnitsSold,
      totalRevenue,
      totalSalesCount,
      productSalesMap
    };
  }, [filteredSales, products, startDate, endDate, filterSeller, filterRegister]);

  // ✅ CRITICAL FIX: Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search term filtering
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filtering
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Stock level filtering
    if (filterStockLevel !== 'all') {
      filtered = filtered.filter(product => {
        switch (filterStockLevel) {
          case 'in-stock':
            return product.stock > product.minStock;
          case 'low-stock':
            return product.stock > 0 && product.stock <= product.minStock;
          case 'out-of-stock':
            return product.stock === 0;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [products, searchTerm, filterCategory, filterStockLevel]);

  // Calculate dynamic statistics based on filtered data
  const dynamicStats = useMemo(() => {
    // Use the new calculation system that respects initial stock dates
    const aggregatedStats = calculateAggregatedStockStats(filteredProducts, registerSales);
    
    // Calculate revenue from filtered sales that match filtered products
    const filteredRevenue = filteredSales.reduce((sum, sale) => {
      const matchingProduct = filteredProducts.find(product => {
        const calculation = calculateStockFinal(product, registerSales);
        return calculation.validSales.some(validSale => validSale.id === sale.id);
      });
      return matchingProduct ? sum + sale.total : sum;
    }, 0);

    return {
      totalProducts: aggregatedStats.totalProducts,
      totalStock: aggregatedStats.totalStock,
      totalSold: aggregatedStats.totalSold,
      totalRevenue: filteredRevenue,
      outOfStock: aggregatedStats.outOfStock,
      lowStock: aggregatedStats.lowStock,
      inconsistentStock: aggregatedStats.inconsistentStock
    };
  }, [filteredProducts, filteredSales, registerSales]);

  // Debounced state updates
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateState({
        searchTerm,
        currentPage,
        itemsPerPage,
        sortField,
        sortDirection,
        activeTab
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, itemsPerPage, sortField, sortDirection, activeTab]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters({ 
        category: filterCategory, 
        stockLevel: filterStockLevel,
        seller: filterSeller,
        register: filterRegister
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterCategory, filterStockLevel, filterSeller, filterRegister]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateDateRange({ start: startDate, end: endDate });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [startDate, endDate]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSelectedItems(selectedProducts);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedProducts]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateModals({ 
        addModal: showAddModal, 
        editModal: showEditModal, 
        deleteModal: showDeleteModal,
        importModal: showImportModal
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showAddModal, showEditModal, showDeleteModal, showImportModal]);

  // Auto-hide sync notification after 5 seconds
  React.useEffect(() => {
    if (syncNotification?.show) {
      const timer = setTimeout(() => {
        setSyncNotification(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncNotification?.show]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const sortedProducts = filteredProducts.sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(product => {
      const calculation = calculateStockFinal(product, registerSales);
      const warnings = validateStockConfiguration(product, registerSales);
      
      return {
      Name: product.name,
      Category: product.category,
      Price: product.price,
      InitialStock: product.initialStock || 0,
      InitialStockDate: product.initialStockDate ? formatStockDate(product.initialStockDate) : '',
      QuantitySold: calculation.validSales.reduce((sum, sale) => sum + sale.quantity, 0),
      FinalStock: calculation.finalStock,
      MinStock: product.minStock,
      Value: calculation.finalStock * product.price,
      Description: product.description || '',
      HasWarnings: warnings.length > 0 ? 'Oui' : 'Non',
      Warnings: warnings.map(w => w.message).join('; ')
      };
    });
    
    exportToExcel(exportData, `stock-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterStockLevel('all');
    setFilterSeller('all');
    setFilterRegister('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterStockLevel !== 'all' ||
    filterSeller !== 'all' || filterRegister !== 'all' || startDate || endDate;

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Selection handlers
  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map(product => product.id)));
    }
  };

  const selectAllFiltered = () => {
    setSelectedProducts(new Set(filteredProducts.map(product => product.id)));
  };

  // Enhanced autoSyncProductsFromSales with notification
  const handleAutoSyncProducts = async () => {
    try {
      const result = await autoSyncProductsFromSales();
      
      // Show notification with count of created products
      setSyncNotification({
        show: true,
        message: "Synchronisation réussie !",
        count: result.created.length
      });
      
      // Refresh data
      onRefreshData();
      
      return result;
    } catch (error) {
      console.error('Error syncing products:', error);
      return { created: [], summary: 'Erreur lors de la synchronisation' };
    }
  };

  // Handle add product
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  // Handle save product (add or edit)
  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    setIsSaving(true);
    try {
      if (editingProduct) {
        // Edit existing product
        await onUpdateProduct(editingProduct.id, productData);
      } else {
        // Add new product
        await onAddProduct(productData);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingProduct(null);
      onRefreshData();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      stock: '',
      minStock: '',
      description: ''
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Le nom du produit est requis';
    }

    if (!formData.category.trim()) {
      errors.category = 'La catégorie est requise';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      errors.price = 'Le prix doit être un nombre positif';
    }

    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      errors.stock = 'Le stock doit être un nombre positif ou zéro';
    }

    const minStock = parseInt(formData.minStock);
    if (isNaN(minStock) || minStock < 0) {
      errors.minStock = 'Le stock minimum doit être un nombre positif ou zéro';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        initialStock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        description: formData.description.trim()
      };

      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, productData);
        setShowEditModal(false);
      } else {
        await onAddProduct(productData);
        setShowAddModal(false);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedProducts.size === 0) return;

    try {
      if (selectedProducts.size === 1) {
        await onDeleteProduct(Array.from(selectedProducts)[0]);
      } else {
        await onDeleteProducts(Array.from(selectedProducts));
      }
      
      setSelectedProducts(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting products:', error);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">Gestion du Stock</h1>
          <p className="text-slate-400">Gérez votre inventaire et suivez vos stocks en temps réel</p>
        </div>
        
        <div className="flex space-x-3 flex-shrink-0">
          <button
            onClick={onRefreshData}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Sync Notification Toast */}
      <AnimatePresence>
        {syncNotification?.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-auto min-w-96"
          >
            <div className="bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-xl shadow-2xl backdrop-blur-xl flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{syncNotification.message}</p>
                <p className="text-sm">{syncNotification.count} nouveaux produits ajoutés au stock</p>
              </div>
              <button
                onClick={() => setSyncNotification(prev => prev ? { ...prev, show: false } : null)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.button
          onClick={handleAutoSyncProducts}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                     py-4 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 
                     transition-all duration-200 flex items-center space-x-3"
        >
          <RefreshCw className="w-6 h-6" />
          <div className="text-left">
            <p className="font-semibold">Sync Products</p>
            <p className="text-xs opacity-80">from Sales</p>
          </div>
        </motion.button>

        <motion.button
          onClick={handleAddProduct}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                     py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                     transition-all duration-200 flex items-center space-x-3"
        >
          <Plus className="w-6 h-6" />
          <div className="text-left">
            <p className="font-semibold">Ajouter</p>
            <p className="text-xs opacity-80">Produit</p>
          </div>
        </motion.button>

        <motion.button
          onClick={handleExport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                     py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                     transition-all duration-200 flex items-center space-x-3"
        >
          <Download className="w-6 h-6" />
          <div className="text-left">
            <p className="font-semibold">Exporter</p>
            <p className="text-xs opacity-80">Excel</p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setActiveTab('import')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold 
                     py-4 px-6 rounded-xl hover:from-orange-600 hover:to-orange-700 
                     transition-all duration-200 flex items-center space-x-3"
        >
          <Upload className="w-6 h-6" />
          <div className="text-left">
            <p className="font-semibold">Importer</p>
            <p className="text-xs opacity-80">Stock</p>
          </div>
        </motion.button>

        <RebuildDatabaseButton 
          onSuccess={onRefreshData}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                     py-4 px-6 rounded-xl hover:from-red-600 hover:to-red-700 
                     transition-all duration-200 flex items-center space-x-3"
        />
      </div>

      {/* ✅ FIXED: Dynamic Statistics Cards with filtered metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl 
                     border border-blue-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Package className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-slate-400 text-sm">RÉFÉRENCES</p>
              <p className="text-slate-400 text-xs">actives</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{dynamicStats.totalProducts}</p>
          <p className="text-blue-400 text-sm">Total Produits</p>
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
              <p className="text-slate-400 text-sm">UNITÉS</p>
              <p className="text-slate-400 text-xs">en stock</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{dynamicStats.totalStock.toLocaleString()}</p>
          <p className="text-green-400 text-sm">Stock Total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl 
                     border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <DollarSign className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-slate-400 text-sm">CA TOTAL</p>
              <p className="text-slate-400 text-xs">chiffre d'affaires</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(dynamicStats.totalRevenue)}</p>
          <p className="text-purple-400 text-sm">Chiffre d'Affaires</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-xl 
                     border border-red-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <TrendingDown className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-slate-400 text-sm">RUPTURES</p>
              <p className="text-slate-400 text-xs">stock 0</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{dynamicStats.outOfStock}</p>
          <p className="text-red-400 text-sm">Ruptures Stock</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl 
                     border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-gray-400 text-sm">Total Vendus (unités)</p>
              <p className="text-2xl font-bold text-white">{salesMetrics.totalUnitsSold}</p>
              {hasActiveFilters && (
                <p className="text-xs text-purple-300 mt-1">
                  Basé sur {filteredSales.length} ventes filtrées
                </p>
              )}
            </div>
          </div>
          <p className="text-purple-400 text-xs mt-1">
            {hasActiveFilters ? 'Unités vendues (filtrées)' : 'Unités vendues (total)'}
          </p>
        </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-xl 
                   border border-yellow-500/20 rounded-xl p-6"
      >
        <div className="flex items-center space-x-3 mb-3">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="text-slate-400 text-sm">Stock Incohérent</p>
            <p className="text-2xl font-bold text-white">{dynamicStats.inconsistentStock}</p>
          </div>
        </div>
        <p className="text-yellow-400 text-sm">Ventes antérieures</p>
      </motion.div>
    </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'list'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Liste des Produits</span>
          </button>
          
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'import'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Import Stock</span>
          </button>
        </div>

        {activeTab === 'import' ? (
          <StockImportModule
            products={products}
            onUpdateProduct={onUpdateProduct}
            onAddProduct={onAddProduct}
            onRefreshData={onRefreshData}
          />
        ) : (
          <>
            {/* ✅ ENHANCED: Complete filtering system like Sales module */}
            <div className="flex items-center space-x-3 mb-4">
              <Filter className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Filtres Avancés</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-sm text-slate-400 hover:text-white transition-colors duration-200"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                             placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={filterStockLevel}
                onChange={(e) => setFilterStockLevel(e.target.value)}
                className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tous les niveaux</option>
                <option value="in-stock">En stock</option>
                <option value="low-stock">Stock faible</option>
                <option value="out-of-stock">Rupture</option>
              </select>

              <select
                value={filterSeller}
                onChange={(e) => setFilterSeller(e.target.value)}
                className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tous les vendeurs</option>
                {sellers.map(seller => (
                  <option key={seller} value={seller}>{seller}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                value={filterRegister}
                onChange={(e) => setFilterRegister(e.target.value)}
                className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Toutes les caisses</option>
                {registers.map(register => (
                  <option key={register} value={register}>{register}</option>
                ))}
              </select>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  📅 Date de début (incluse)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                             focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  📅 Date de fin (incluse)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white
                             focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* ✅ NEW: Filter status indicator */}
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
              >
                <div className="flex items-center space-x-2 text-blue-400 text-sm">
                  <Filter className="w-4 h-4" />
                  <span>
                    Filtres actifs - Affichage de {filteredProducts.length} produits sur {products.length} total
                    {(startDate || endDate) && ` • Ventes filtrées: ${filteredSales.length} sur ${registerSales.length}`}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Actions de sélection multiple */}
            {selectedProducts.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                           border border-blue-500/30 rounded-2xl p-4 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">
                      {selectedProducts.size} produit(s) sélectionné(s)
                    </span>
                    {selectedProducts.size < sortedProducts.length && (
                      <button
                        onClick={selectAllFiltered}
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        Sélectionner tous les produits filtrés ({sortedProducts.length})
                      </button>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDeleteSelected}
                      className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 
                                 transition-all duration-200 flex items-center space-x-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedProducts(new Set())}
                      className="bg-slate-500/20 text-slate-400 px-4 py-2 rounded-lg hover:bg-slate-500/30 
                                 transition-all duration-200 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Pagination Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800/30 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 mb-6"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400 text-sm">Affichage par page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                               focus:outline-none focus:border-cyan-500"
                  >
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-slate-400 text-sm">
                    {startIndex + 1}-{Math.min(endIndex, sortedProducts.length)} sur {sortedProducts.length}
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Products Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800/30 backdrop-blur-xl border border-slate-700 rounded-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Liste des Produits ({sortedProducts.length} résultats)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-4 px-4">
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-white transition-colors duration-200"
                        >
                          {selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0 ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      {[
                        { key: 'name', label: 'Nom' },
                        { key: 'category', label: 'Catégorie' },
                        { key: 'price', label: 'Prix' },
                        { key: 'initialStock', label: 'Stock Initial' },
                        { key: 'quantitySold', label: 'Vendu' },
                        { key: 'stock', label: 'Stock Final' },
                        { key: 'minStock', label: 'Stock Min' },
                        { key: 'revenue', label: 'Valeur' },
                        { key: 'lastSale', label: 'Dernière Vente' },
                        { key: 'lastModified', label: 'Modifié le' },
                        { key: 'status', label: 'Statut' }
                      ].map(({ key, label }) => (
                        <th
                          key={key}
                          className="text-left py-4 px-4 text-slate-400 font-medium cursor-pointer hover:text-white
                                     transition-colors duration-200"
                          onClick={() => key !== 'revenue' && key !== 'lastSale' && key !== 'lastModified' && key !== 'status' && handleSort(key as keyof Product)}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{label}</span>
                            {key !== 'revenue' && key !== 'lastSale' && key !== 'lastModified' && key !== 'status' && <ArrowUpDown className="w-4 h-4" />}
                          </div>
                        </th>
                      ))}
                      <th className="text-left py-4 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {paginatedProducts.map((product, index) => {
                    const calculation = calculateStockFinal(product, registerSales);
                    const warnings = validateStockConfiguration(product, registerSales);
                    const lastSale = calculation.validSales.length > 0 
                      ? calculation.validSales.sort((a, b) => b.date.getTime() - a.date.getTime())[0]
                      : null;
                    
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.01 }}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors duration-200 ${
                          selectedProducts.has(product.id) ? 'bg-cyan-500/10' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <button
                            onClick={() => toggleSelectProduct(product.id)}
                            className="text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                          >
                            {selectedProducts.has(product.id) ? (
                              <CheckSquare className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-medium">{product.name}</span>
                            {warnings.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                                  Stock non confirmé
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300">{formatCurrency(product.price)}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="text-blue-400 font-medium">{product.initialStock || 0}</div>
                          {product.initialStockDate && (
                            <div className="text-xs text-slate-500 flex items-center justify-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatStockDate(product.initialStockDate)}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-orange-400 font-medium">
                          {calculation.validSales.reduce((sum, sale) => sum + sale.quantity, 0)}
                        </td>
                        <td className="py-4 px-4 text-center text-white font-medium">{calculation.finalStock}</td>
                        <td className="py-4 px-4 text-center text-yellow-400 font-medium">{product.minStock}</td>
                        <td className="py-4 px-4 text-right text-green-400 font-semibold">
                          {formatCurrency(calculation.finalStock * product.price)}
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-sm">
                          {lastSale ? format(lastSale.date, 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-sm">-</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            calculation.finalStock === 0 
                              ? 'bg-red-500/20 text-red-400' 
                              : calculation.finalStock <= product.minStock
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {calculation.finalStock === 0 ? 'Rupture' : calculation.finalStock <= product.minStock ? 'Stock Faible' : 'En Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditProduct(product)}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 
                                         transition-all duration-200"
                              title="Modifier le produit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedProducts(new Set([product.id]));
                                setShowDeleteModal(true);
                              }}
                              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 
                                         transition-all duration-200"
                              title="Supprimer le produit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                       </motion.tr>
                    );
                   })}
                  </tbody>
                </table>
                
                {sortedProducts.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun produit trouvé avec les filtres actuels</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductEditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveProduct}
          isLoading={isSaving}
          allSales={registerSales}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          isLoading={isSaving}
          allSales={registerSales}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmer la suppression</h3>
                  <p className="text-slate-400 text-sm">Cette action est irréversible</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <h4 className="text-red-400 font-semibold mb-2">Produits à supprimer :</h4>
                <div className="text-slate-300 text-sm">
                  <div>• <strong>{selectedProducts.size}</strong> produit(s) sélectionné(s)</div>
                  <div>• Les données de stock seront définitivement perdues</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                             transition-all duration-200"
                >
                  Confirmer la suppression
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-xl 
                             hover:bg-slate-500 transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}