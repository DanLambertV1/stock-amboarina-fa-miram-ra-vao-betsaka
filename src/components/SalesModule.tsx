import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
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
  RefreshCw,
  Tag,
  Save,
  X,
  Package,
  CheckCircle
} from 'lucide-react';
import { RegisterSale } from '../types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { exportToExcel } from '../utils/excelUtils';
import { useViewState, useScrollPosition } from '../hooks/useViewState';
import { SaleEditModal } from './SaleEditModal';
import { calculateTotalQuantitySold } from '../utils/salesCalculations';
import { SaleCategorizeModal } from './SaleCategorizeModal';

interface SalesModuleProps {
  registerSales: RegisterSale[];
  onRefreshData: () => void;
  onDeleteSales?: (saleIds: string[]) => Promise<boolean>;
  onUpdateSale?: (saleId: string, updates: Partial<RegisterSale>) => Promise<boolean>;
  onCategorizeSales?: (saleIds: string[], category: string, subcategory?: string) => Promise<boolean>;
}

export function SalesModule({ 
  registerSales, 
  onRefreshData, 
  onDeleteSales,
  onUpdateSale,
  onCategorizeSales 
}: SalesModuleProps) {
  const { viewState, updateState, updateFilters, updateDateRange, updateSelectedItems, updateModals } = useViewState('sales');
  useScrollPosition('sales');

  // Initialize state from viewState with stable defaults
  const [searchTerm, setSearchTerm] = useState(viewState.searchTerm || '');
  const [filterRegister, setFilterRegister] = useState(viewState.filters?.register || 'all');
  const [filterSeller, setFilterSeller] = useState(viewState.filters?.seller || 'all');
  const [filterCategory, setFilterCategory] = useState(viewState.filters?.category || 'all');
  const [sortField, setSortField] = useState<keyof RegisterSale>(viewState.sortField as keyof RegisterSale || 'date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(viewState.sortDirection || 'desc');
  const [dateRange, setDateRange] = useState(viewState.dateRange || { start: '', end: '' });
  const [selectedSales, setSelectedSales] = useState<Set<string>>(viewState.selectedItems || new Set());
  const [currentPage, setCurrentPage] = useState(viewState.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(viewState.itemsPerPage || 50);
  const [showDeleteModal, setShowDeleteModal] = useState(viewState.modals?.deleteModal || false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategorizeModal, setShowCategorizeModal] = useState(false);
  const [editingSale, setEditingSale] = useState<RegisterSale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  
  // ✅ NEW: Toast notification state
  const [toastNotification, setToastNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  // Debounced state updates to prevent excessive re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateState({
        searchTerm,
        currentPage,
        itemsPerPage,
        sortField,
        sortDirection,
        scrollPosition: viewState.scrollPosition
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, itemsPerPage, sortField, sortDirection]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters({ register: filterRegister, seller: filterSeller, category: filterCategory });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterRegister, filterSeller, filterCategory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateDateRange(dateRange);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [dateRange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSelectedItems(selectedSales);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedSales]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateModals({ deleteModal: showDeleteModal });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showDeleteModal]);

  // ✅ NEW: Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toastNotification.show) {
      const timer = setTimeout(() => {
        setToastNotification(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification.show]);

  // ✅ NEW: Show toast notification function
  const showToast = (type: 'success' | 'error', message: string) => {
    setToastNotification({ show: true, type, message });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // ✅ FIXED: Improved date filtering logic
  const filteredSales = registerSales
    .filter(sale => {
      const matchesSearch = sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegister = filterRegister === 'all' || sale.register === filterRegister;
      const matchesSeller = filterSeller === 'all' || sale.seller === filterSeller;
      const matchesCategory = filterCategory === 'all' || sale.category === filterCategory;
      
      // ✅ FIXED: Proper date range filtering
      let matchesDateRange = true;
      if (dateRange.start || dateRange.end) {
        const saleDate = sale.date;
        
        if (dateRange.start) {
          // Start of the selected start date (00:00:00)
          const startDate = startOfDay(new Date(dateRange.start));
          matchesDateRange = matchesDateRange && saleDate >= startDate;
        }
        
        if (dateRange.end) {
          // End of the selected end date (23:59:59.999)
          const endDate = endOfDay(new Date(dateRange.end));
          matchesDateRange = matchesDateRange && saleDate <= endDate;
        }
      }
      
      return matchesSearch && matchesRegister && matchesSeller && matchesCategory && matchesDateRange;
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

  // Pagination logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

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

  const handleExport = () => {
    const exportData = filteredSales.map(sale => ({
      Product: sale.product,
      Category: sale.category,
      Register: sale.register,
      Date: format(sale.date, 'dd/MM/yyyy HH:mm'),
      Seller: sale.seller,
      Quantity: sale.quantity,
      Amount: sale.price,
      Total: sale.total
    }));
    
    exportToExcel(exportData, `ventes-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRegister('all');
    setFilterSeller('all');
    setFilterCategory('all');
    setDateRange({ start: '', end: '' });
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
  const toggleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSales.size === paginatedSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(paginatedSales.map(sale => sale.id)));
    }
  };

  const selectAllFiltered = () => {
    setSelectedSales(new Set(filteredSales.map(sale => sale.id)));
  };

  // Edit sale handler
  const handleEditSale = (sale: RegisterSale) => {
    setEditingSale(sale);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updates: Partial<RegisterSale>) => {
    if (!editingSale || !onUpdateSale) return;

    setIsUpdating(true);
    try {
      const success = await onUpdateSale(editingSale.id, updates);
      if (success) {
        setShowEditModal(false);
        setEditingSale(null);
        onRefreshData();
        showToast('success', 'Vente modifiée avec succès');
      } else {
        showToast('error', 'Erreur lors de la modification de la vente');
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      showToast('error', 'Erreur lors de la modification de la vente');
    } finally {
      setIsUpdating(false);
    }
  };

  // Categorize sales handler
  const handleCategorizeSales = () => {
    if (selectedSales.size === 0) return;
    setShowCategorizeModal(true);
  };

  // ✅ FIXED: Updated categorization handler without reload
  const handleSaveCategorization = async (category: string, subcategory?: string) => {
    if (selectedSales.size === 0 || !onCategorizeSales) return;

    setIsCategorizing(true);
    try {
      const success = await onCategorizeSales(Array.from(selectedSales), category, subcategory);
      if (success) {
        setShowCategorizeModal(false);
        setSelectedSales(new Set());
        
        // ✅ CRITICAL FIX: Show toast notification instead of reloading
        const subcategoryText = subcategory ? ` (${subcategory})` : '';
        showToast('success', `${selectedSales.size} vente(s) catégorisée(s) en "${category}"${subcategoryText} avec succès`);
        
        // ✅ NO RELOAD: The data is already updated in the hook, just refresh if needed
        // onRefreshData(); // This is optional since the hook already updates the data
      } else {
        showToast('error', 'Erreur lors de la catégorisation des ventes');
      }
    } catch (error) {
      console.error('Error categorizing sales:', error);
      showToast('error', 'Erreur lors de la catégorisation des ventes');
    } finally {
      setIsCategorizing(false);
    }
  };

  // Smart deletion
  const handleSmartDelete = () => {
    if (selectedSales.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!onDeleteSales || selectedSales.size === 0) return;

    setIsDeleting(true);
    try {
      const success = await onDeleteSales(Array.from(selectedSales));
      if (success) {
        setSelectedSales(new Set());
        setShowDeleteModal(false);
        onRefreshData();
        showToast('success', `${selectedSales.size} vente(s) supprimée(s) avec succès`);
      } else {
        showToast('error', 'Erreur lors de la suppression des ventes');
      }
    } catch (error) {
      console.error('Error deleting sales:', error);
      showToast('error', 'Erreur lors de la suppression des ventes');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculs des totaux pour les données filtrées
  const totalQuantity = calculateTotalQuantitySold(filteredSales);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion des Ventes</h1>
          <p className="text-gray-400">Consultez et analysez toutes vos transactions</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onRefreshData}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Actualiser</span>
          </button>
          
          <button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Exporter Excel</span>
          </button>
        </div>
      </div>

      {/* ✅ NEW: Toast Notification */}
      <AnimatePresence>
        {toastNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-center space-x-3 min-w-80 ${
              toastNotification.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}>
              {toastNotification.type === 'success' ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              )}
              <span className="font-medium flex-1">{toastNotification.message}</span>
              <button
                onClick={() => setToastNotification(prev => ({ ...prev, show: false }))}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ventes Filtrées</p>
              <p className="text-2xl font-bold text-white">{filteredSales.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">CA Total</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Plus className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Quantité Totale</p>
              <p className="text-2xl font-bold text-white">{totalQuantity}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ticket Moyen</p>
              <p className="text-xl font-bold text-white">{formatCurrency(averageTicket)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions de sélection multiple */}
      {selectedSales.size > 0 && (
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
                {selectedSales.size} vente(s) sélectionnée(s)
              </span>
              {selectedSales.size < filteredSales.length && (
                <button
                  onClick={selectAllFiltered}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Sélectionner toutes les ventes filtrées ({filteredSales.length})
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              {onCategorizeSales && (
                <button
                  onClick={handleCategorizeSales}
                  className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500/30 
                             transition-all duration-200 flex items-center space-x-2 text-sm"
                >
                  <Tag className="w-4 h-4" />
                  <span>Catégoriser</span>
                </button>
              )}
              
              {onDeleteSales && (
                <button
                  onClick={handleSmartDelete}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 
                             transition-all duration-200 flex items-center space-x-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              )}
              
              <button
                onClick={() => setSelectedSales(new Set())}
                className="bg-gray-500/20 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-500/30 
                           transition-all duration-200 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filtres avancés */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Filtres Avancés</h3>
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-gray-400 hover:text-white transition-colors duration-200"
          >
            Effacer les filtres
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <select
            value={filterRegister}
            onChange={(e) => setFilterRegister(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Toutes les caisses</option>
            {registers.map(register => (
              <option key={register} value={register}>{register}</option>
            ))}
          </select>
          
          <select
            value={filterSeller}
            onChange={(e) => setFilterSeller(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tous les vendeurs</option>
            {sellers.map(seller => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        {/* ✅ IMPROVED: Better date filter UI with clear labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              📅 Date de début (incluse)
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
            {dateRange.start && (
              <p className="text-xs text-gray-500 mt-1">
                Inclut toutes les ventes à partir du {new Date(dateRange.start).toLocaleDateString('fr-FR')} à 00:00
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              📅 Date de fin (incluse)
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
            {dateRange.end && (
              <p className="text-xs text-gray-500 mt-1">
                Inclut toutes les ventes jusqu'au {new Date(dateRange.end).toLocaleDateString('fr-FR')} à 23:59
              </p>
            )}
          </div>
        </div>

        {/* ✅ NEW: Date filter status indicator */}
        {(dateRange.start || dateRange.end) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
          >
            <div className="flex items-center space-x-2 text-blue-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                Filtre actif: 
                {dateRange.start && dateRange.end ? (
                  ` Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                ) : dateRange.start ? (
                  ` À partir du ${new Date(dateRange.start).toLocaleDateString('fr-FR')}`
                ) : (
                  ` Jusqu'au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                )}
                {` - ${filteredSales.length} ventes trouvées`}
              </span>
            </div>
          </motion.div>
        )}
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
                         focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-400 text-sm">
              {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} sur {filteredSales.length}
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
                          ? 'bg-cyan-500 text-white'
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

      {/* Tableau des ventes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">
            Détail des Ventes ({filteredSales.length} résultats)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-4">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {selectedSales.size === paginatedSales.length && paginatedSales.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                {[
                  { key: 'product', label: 'Produit' },
                  { key: 'category', label: 'Catégorie' },
                  { key: 'register', label: 'Caisse' },
                  { key: 'date', label: 'Date' },
                  { key: 'seller', label: 'Vendeur' },
                  { key: 'quantity', label: 'Quantité' },
                  { key: 'price', label: 'Montant Unit.' },
                  { key: 'total', label: 'Total' }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left py-4 px-4 text-gray-400 font-medium cursor-pointer hover:text-white
                               transition-colors duration-200"
                    onClick={() => handleSort(key as keyof RegisterSale)}
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
              {paginatedSales.map((sale, index) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors duration-200 ${
                    selectedSales.has(sale.id) ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <button
                      onClick={() => toggleSelectSale(sale.id)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                    >
                      {selectedSales.has(sale.id) ? (
                        <CheckSquare className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-white font-medium">{sale.product}</td>
                  <td className="py-4 px-4">
                    <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                      {sale.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                      {sale.register}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">
                    {format(sale.date, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="py-4 px-4 text-gray-300">{sale.seller}</td>
                  <td className="py-4 px-4 text-center text-white font-medium">{sale.quantity}</td>
                  <td className="py-4 px-4 text-gray-300">{formatCurrency(sale.price)}</td>
                  <td className={`py-4 px-4 font-semibold ${sale.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      {onUpdateSale && (
                        <button 
                          onClick={() => handleEditSale(sale)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 
                                     transition-all duration-200"
                          title="Modifier la vente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {onDeleteSales && (
                        <button 
                          onClick={() => {
                            setSelectedSales(new Set([sale.id]));
                            setShowDeleteModal(true);
                          }}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 
                                     transition-all duration-200"
                          title="Supprimer la vente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length > 50 && (
            <div className="text-center py-4 text-gray-400">
              Affichage de {Math.min(50, filteredSales.length)} ventes sur {filteredSales.length}
            </div>
          )}

          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune vente trouvée avec les filtres actuels</p>
              {(dateRange.start || dateRange.end) && (
                <p className="text-sm mt-2">
                  Vérifiez vos filtres de date - les ventes doivent être dans la période sélectionnée
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && onUpdateSale && (
        <SaleEditModal
          sale={editingSale}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingSale(null);
          }}
          onSave={handleSaveEdit}
          isLoading={isUpdating}
        />
      )}

      {/* Categorize Sales Modal */}
      {showCategorizeModal && onCategorizeSales && (
        <SaleCategorizeModal
          selectedCount={selectedSales.size}
          isOpen={showCategorizeModal}
          onClose={() => setShowCategorizeModal(false)}
          onSave={handleSaveCategorization}
          isLoading={isCategorizing}
          existingSales={registerSales}
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
                  <p className="text-gray-400 text-sm">Cette action est irréversible</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <h4 className="text-red-400 font-semibold mb-2">Données à supprimer :</h4>
                <div className="text-gray-300 text-sm space-y-1">
                  <div>• <strong>{selectedSales.size}</strong> vente(s) sélectionnée(s)</div>
                  <div>• Montant total : <strong>{formatCurrency(
                    Array.from(selectedSales).reduce((sum, id) => {
                      const sale = registerSales.find(s => s.id === id);
                      return sum + (sale?.total || 0);
                    }, 0)
                  )}</strong></div>
                  <div>• Les quantités vendues seront également supprimées du stock</div>
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
    </div>
  );
}