import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Filter,
  Download,
  ArrowUpDown,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw,
  Package,
  FileSpreadsheet,
  Upload,
  Loader,
  BarChart3,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Product, RegisterSale } from '../types';
import { exportToExcel } from '../utils/excelUtils';
import { useViewState, useScrollPosition } from '../hooks/useViewState';
import { ProductEditModal } from './ProductEditModal';
import { StockImportModule } from './StockImportModule';
import { RebuildDatabaseButton } from './RebuildDatabaseButton';
import { calculateStockFinal } from '../utils/calculateStockFinal';
import { useLanguage } from '../contexts/LanguageContext';

interface StockModuleProps {
  products: Product[];
  registerSales: RegisterSale[];
  loading: boolean;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onAddProducts: (products: Omit<Product, 'id'>[]) => Promise<boolean>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onDeleteProducts: (productIds: string[]) => Promise<boolean>;
  onRefreshData: () => void;
  autoSyncProductsFromSales: () => Promise<{ created: Product[]; summary: string; }>;
  isRecalculating?: boolean;
}

const StockModule: React.FC<StockModuleProps> = ({ 
  products, 
  registerSales, 
  loading,
  isRecalculating,
  onAddProduct, 
  onAddProducts,
  onUpdateProduct, 
  onDeleteProduct,
  onDeleteProducts,
  onRefreshData,
  autoSyncProductsFromSales
}) => {
  const { viewState, updateState, updateFilters, updateSelectedItems, updateModals } = useViewState('stock');
  useScrollPosition('stock');
  const { t } = useLanguage();

  // Initialize state from viewState with stable defaults
  const [searchTerm, setSearchTerm] = useState(viewState.searchTerm || '');
  const [filterCategory, setFilterCategory] = useState(viewState.filters?.category || 'all');
  const [filterStockLevel, setFilterStockLevel] = useState(viewState.filters?.stockLevel || 'all');
  const [sortField, setSortField] = useState<keyof Product>(viewState.sortField as keyof Product || 'name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(viewState.sortDirection || 'asc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(viewState.selectedItems || new Set());
  const [currentPage, setCurrentPage] = useState(viewState.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(viewState.itemsPerPage || 50);
  const [showAddModal, setShowAddModal] = useState(viewState.modals?.addModal || false);
  const [showEditModal, setShowEditModal] = useState(viewState.modals?.editModal || false);
  const [showDeleteModal, setShowDeleteModal] = useState(viewState.modals?.deleteModal || false);
  const [showImportModal, setShowImportModal] = useState(viewState.modals?.importModal || false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'import'>(viewState.activeTab as 'list' | 'import' || 'list');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    summary: string;
    created: Product[];
  } | null>(null);

  // Debounced state updates to prevent excessive re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateState({
        searchTerm,
        currentPage,
        itemsPerPage,
        sortField,
        sortDirection,
        scrollPosition: viewState.scrollPosition,
        activeTab
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, itemsPerPage, sortField, sortDirection, activeTab]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters({ category: filterCategory, stockLevel: filterStockLevel });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterCategory, filterStockLevel]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSelectedItems(selectedProducts);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedProducts]);

  useEffect(() => {
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

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => {
        setNotification(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
  };

  // Memoized filtered products to improve performance
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
        
        let matchesStockLevel = true;
        if (filterStockLevel === 'out') {
          matchesStockLevel = product.stock === 0;
        } else if (filterStockLevel === 'low') {
          matchesStockLevel = product.stock > 0 && product.stock <= product.minStock;
        } else if (filterStockLevel === 'ok') {
          matchesStockLevel = product.stock > product.minStock;
        }
        
        return matchesSearch && matchesCategory && matchesStockLevel;
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
  }, [products, searchTerm, filterCategory, filterStockLevel, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const categories = [...new Set(products.map(p => p.category))];

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(product => ({
      Name: product.name,
      Category: product.category,
      Price: product.price,
      Stock: product.stock,
      'Min Stock': product.minStock,
      'Quantity Sold': product.quantitySold || 0,
      Description: product.description || ''
    }));
    
    exportToExcel(exportData, `stock-${new Date().toISOString().split('T')[0]}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterStockLevel('all');
    setCurrentPage(1);
  };

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

  // Add product handler
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  // Edit product handler
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    setIsUpdating(true);
    try {
      await onAddProduct(productData);
      setShowAddModal(false);
      showNotification('success', 'Produit ajouté avec succès');
    } catch (error) {
      console.error('Error adding product:', error);
      showNotification('error', 'Erreur lors de l\'ajout du produit');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProduct = async (updates: Partial<Product>) => {
    if (!editingProduct) return;

    setIsUpdating(true);
    try {
      await onUpdateProduct(editingProduct.id, updates);
      setShowEditModal(false);
      setEditingProduct(null);
      showNotification('success', 'Produit mis à jour avec succès');
    } catch (error) {
      console.error('Error updating product:', error);
      showNotification('error', 'Erreur lors de la mise à jour du produit');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete product handler
  const handleDeleteProduct = (product: Product) => {
    setSelectedProducts(new Set([product.id]));
    setShowDeleteModal(true);
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedProducts.size === 0) return;

    setIsDeleting(true);
    try {
      if (selectedProducts.size === 1) {
        const productId = Array.from(selectedProducts)[0];
        await onDeleteProduct(productId);
      } else {
        await onDeleteProducts(Array.from(selectedProducts));
      }
      
      setSelectedProducts(new Set());
      setShowDeleteModal(false);
      showNotification('success', `${selectedProducts.size} produit(s) supprimé(s) avec succès`);
    } catch (error) {
      console.error('Error deleting products:', error);
      showNotification('error', 'Erreur lors de la suppression des produits');
    } finally {
      setIsDeleting(false);
    }
  };

  // Import handlers
  const handleShowImport = () => {
    setActiveTab('import');
  };

  // Auto-sync products from sales
  const handleAutoSync = async () => {
    try {
      const result = await autoSyncProductsFromSales();
      setSyncResult(result);
      
      if (result.created.length > 0) {
        showNotification('success', `${result.created.length} produits créés avec succès`);
      } else {
        showNotification('info', 'Aucun nouveau produit à créer');
      }
    } catch (error) {
      console.error('Error auto-syncing products:', error);
      showNotification('error', 'Erreur lors de la synchronisation automatique');
    }
  };

  // Calculate stock statistics
  const stockStats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    
    return { totalStock, totalValue, outOfStock, lowStock };
  }, [products]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Get stock status class
  const getStockStatusClass = (product: Product) => {
    if (product.stock === 0) {
      return 'bg-red-500/20 text-red-400';
    } else if (product.stock <= product.minStock) {
      return 'bg-orange-500/20 text-orange-400';
    } else {
      return 'bg-green-500/20 text-green-400';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
        />
        <p className="text-white text-lg">Chargement des données de stock...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion du Stock</h1>
          <p className="text-gray-400">Gérez votre inventaire et suivez les niveaux de stock</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'list'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Liste des Produits
          </button>
          
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'import'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Import Stock
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification?.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-center space-x-3 min-w-80 ${
              notification.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : notification.type === 'error'
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              )}
              <span className="font-medium flex-1">{notification.message}</span>
              <button
                onClick={() => setNotification(prev => prev ? { ...prev, show: false } : null)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recalculation indicator */}
      {isRecalculating && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-500/20 border border-blue-500/30 text-blue-400 
                       p-4 rounded-xl shadow-xl backdrop-blur-xl flex items-center space-x-3">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Recalcul des stocks en cours...</span>
        </div>
      )}

      {activeTab === 'list' ? (
        <>
          {/* Stock Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Produits</p>
                  <p className="text-2xl font-bold text-white">{products.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Valeur Stock</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(stockStats.totalValue)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Unités en Stock</p>
                  <p className="text-2xl font-bold text-white">{stockStats.totalStock}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Alertes Stock</p>
                  <p className="text-2xl font-bold text-white">{stockStats.outOfStock + stockStats.lowStock}</p>
                  <p className="text-xs text-gray-500">
                    {stockStats.outOfStock} ruptures, {stockStats.lowStock} stocks faibles
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddProduct}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                         py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                         transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un Produit</span>
            </button>
            
            <button
              onClick={handleShowImport}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                         py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                         transition-all duration-200 flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Import Stock</span>
            </button>
            
            <button
              onClick={handleExport}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                         py-3 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 
                         transition-all duration-200 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Exporter Excel</span>
            </button>
            
            <button
              onClick={onRefreshData}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold 
                         py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 
                         transition-all duration-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Actualiser</span>
            </button>
            
            <button
              onClick={handleAutoSync}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold 
                         py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-600 
                         transition-all duration-200 flex items-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Auto-Sync Produits</span>
            </button>
          </div>

          {/* Actions de sélection multiple */}
          {selectedProducts.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                         border border-blue-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">
                    {selectedProducts.size} produit(s) sélectionné(s)
                  </span>
                  {selectedProducts.size < filteredProducts.length && (
                    <button
                      onClick={selectAllFiltered}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      Sélectionner tous les produits filtrés ({filteredProducts.length})
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
                    className="bg-gray-500/20 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-500/30 
                               transition-all duration-200 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Filtres */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Filter className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Filtres</h3>
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-gray-400 hover:text-white transition-colors duration-200"
              >
                Effacer les filtres
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                             placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           focus:outline-none focus:border-blue-500"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={filterStockLevel}
                onChange={(e) => setFilterStockLevel(e.target.value)}
                className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           focus:outline-none focus:border-blue-500"
              >
                <option value="all">Tous les niveaux de stock</option>
                <option value="out">Rupture de stock</option>
                <option value="low">Stock faible</option>
                <option value="ok">Stock OK</option>
              </select>
            </div>
          </motion.div>

          {/* Pagination Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-4"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">Affichage par page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                             focus:outline-none focus:border-blue-500"
                >
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-gray-400 text-sm">
                  {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length}
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 
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
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                    className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 
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
            className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-4 px-4">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        {selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0 ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    {[
                      { key: 'name', label: 'Produit' },
                      { key: 'category', label: 'Catégorie' },
                      { key: 'price', label: 'Prix' },
                      { key: 'stock', label: 'Stock' },
                      { key: 'minStock', label: 'Stock Min' },
                      { key: 'quantitySold', label: 'Vendu' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-left py-4 px-4 text-gray-400 font-medium cursor-pointer hover:text-white
                                   transition-colors duration-200"
                        onClick={() => handleSort(key as keyof Product)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{label}</span>
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                    ))}
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.01 }}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors duration-200 ${
                        selectedProducts.has(product.id) ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleSelectProduct(product.id)}
                          className="text-gray-400 hover:text-blue-400 transition-colors duration-200"
                        >
                          {selectedProducts.has(product.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-white font-medium">{product.name}</td>
                      <td className="py-4 px-4">
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">{formatCurrency(product.price)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusClass(product)}`}>
                          {product.stock} unités
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-300">{product.minStock}</td>
                      <td className="py-4 px-4 text-center text-gray-300">{product.quantitySold || 0}</td>
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
                            onClick={() => handleDeleteProduct(product)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 
                                       transition-all duration-200"
                            title="Supprimer le produit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun produit trouvé</p>
                  <p className="text-sm mt-1">Essayez de modifier vos filtres ou d'ajouter de nouveaux produits</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : (
        <StockImportModule
          products={products}
          onUpdateProduct={onUpdateProduct}
          onAddProduct={onAddProduct}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductEditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveProduct}
          isLoading={isUpdating}
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
          onSave={handleUpdateProduct}
          isLoading={isUpdating}
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
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmer la suppression</h3>
                  <p className="text-gray-400 text-sm">
                    {selectedProducts.size === 1 
                      ? 'Cette action est irréversible' 
                      : `Supprimer ${selectedProducts.size} produits ?`}
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <h4 className="text-red-400 font-semibold mb-2">Attention :</h4>
                <div className="text-gray-300 text-sm space-y-1">
                  <div>• Les produits seront définitivement supprimés</div>
                  <div>• Les données de vente associées resteront intactes</div>
                  <div>• Cette action ne peut pas être annulée</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmer la suppression</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Sync Result Modal */}
      <AnimatePresence>
        {syncResult && (
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
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    syncResult.success 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {syncResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {syncResult.success ? 'Synchronisation Réussie' : 'Erreur de Synchronisation'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {syncResult.created.length} produits créés
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSyncResult(null)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                  {syncResult.summary}
                </pre>
              </div>

              <button
                onClick={() => setSyncResult(null)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                           py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 
                           transition-all duration-200"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StockModule;