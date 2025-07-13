import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  RefreshCw, 
  Tag, 
  Plus,
  Check,
  Folder,
  FolderOpen,
  Search,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { RegisterSale } from '../types';

interface SaleCategorizeModalProps {
  selectedCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, subcategory?: string) => Promise<void>;
  isLoading: boolean;
  existingSales?: RegisterSale[]; // Add existing sales to extract categories
}

// Predefined business categories for organization
const BUSINESS_CATEGORIES = [
  {
    name: 'Analyse par Type',
    subcategories: ['Ventes Régulières', 'Ventes Promotionnelles', 'Ventes en Lot']
  },
  {
    name: 'Gestion des Retours',
    subcategories: ['Retour Client', 'Produit Défectueux', 'Erreur de Caisse']
  },
  {
    name: 'Ajustements Comptables',
    subcategories: ['Correction de Prix', 'Annulation', 'Modification']
  },
  {
    name: 'Événements Commerciaux',
    subcategories: ['Soldes', 'Black Friday', 'Liquidation', 'Ouverture']
  },
  {
    name: 'Formation et Tests',
    subcategories: ['Test Caisse', 'Formation Vendeur', 'Démonstration']
  },
  {
    name: 'Maintenance Système',
    subcategories: ['Test Système', 'Vérification', 'Calibrage']
  }
];

export function SaleCategorizeModal({ 
  selectedCount, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading,
  existingSales = []
}: SaleCategorizeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [categoryMode, setCategoryMode] = useState<'existing' | 'business' | 'custom'>('existing');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract existing categories from sales data with statistics
  const existingCategories = useMemo(() => {
    const categoryStats = new Map<string, {
      count: number;
      totalRevenue: number;
      lastUsed: Date;
      products: Set<string>;
    }>();

    existingSales.forEach(sale => {
      const category = sale.category.trim();
      if (category) {
        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            count: 0,
            totalRevenue: 0,
            lastUsed: sale.date,
            products: new Set()
          });
        }
        
        const stats = categoryStats.get(category)!;
        stats.count += 1;
        stats.totalRevenue += sale.total;
        stats.products.add(sale.product);
        
        if (sale.date > stats.lastUsed) {
          stats.lastUsed = sale.date;
        }
      }
    });

    // Convert to array and sort by usage frequency
    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        name: category,
        count: stats.count,
        totalRevenue: stats.totalRevenue,
        lastUsed: stats.lastUsed,
        productCount: stats.products.size,
        averageValue: stats.totalRevenue / stats.count
      }))
      .sort((a, b) => b.count - a.count); // Sort by most used
  }, [existingSales]);

  // Filter existing categories based on search
  const filteredExistingCategories = useMemo(() => {
    if (!searchTerm) return existingCategories;
    
    return existingCategories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [existingCategories, searchTerm]);

  const handleSave = async () => {
    let category = '';
    let subcategory = '';

    switch (categoryMode) {
      case 'existing':
        category = selectedCategory;
        break;
      case 'business':
        category = selectedCategory;
        subcategory = selectedSubcategory;
        break;
      case 'custom':
        category = customCategory.trim();
        subcategory = customSubcategory.trim();
        break;
    }

    if (!category) return;

    await onSave(category, subcategory || undefined);
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory('');
    
    if (categoryMode === 'business') {
      setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
    }
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
  };

  const isValid = () => {
    switch (categoryMode) {
      case 'existing':
      case 'business':
        return selectedCategory !== '';
      case 'custom':
        return customCategory.trim() !== '';
      default:
        return false;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Catégoriser les Ventes</h3>
                <p className="text-gray-400 text-sm">{selectedCount} vente(s) sélectionnée(s)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Category Selection Mode Toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setCategoryMode('existing')}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  categoryMode === 'existing'
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-gray-700/30 border-gray-600 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Catégories Existantes</span>
                </div>
                <p className="text-xs opacity-80">Utiliser les catégories de vos données</p>
                <p className="text-xs opacity-60 mt-1">({existingCategories.length} disponibles)</p>
              </button>

              <button
                onClick={() => setCategoryMode('business')}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  categoryMode === 'business'
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : 'bg-gray-700/30 border-gray-600 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Folder className="w-5 h-5" />
                  <span className="font-medium">Catégories Business</span>
                </div>
                <p className="text-xs opacity-80">Catégories d'analyse métier</p>
                <p className="text-xs opacity-60 mt-1">(6 catégories prédéfinies)</p>
              </button>

              <button
                onClick={() => setCategoryMode('custom')}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  categoryMode === 'custom'
                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                    : 'bg-gray-700/30 border-gray-600 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Catégorie Personnalisée</span>
                </div>
                <p className="text-xs opacity-80">Créer une nouvelle catégorie</p>
                <p className="text-xs opacity-60 mt-1">(Nom libre)</p>
              </button>
            </div>
          </div>

          {/* Existing Categories from Sales Data */}
          {categoryMode === 'existing' && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Catégories de vos données de vente :</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rechercher une catégorie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {filteredExistingCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {filteredExistingCategories.map((category) => (
                    <motion.button
                      key={category.name}
                      onClick={() => handleCategorySelect(category.name)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                        selectedCategory === category.name
                          ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                          : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{category.name}</span>
                        {selectedCategory === category.name && (
                          <Check className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs opacity-80">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{category.count} ventes</span>
                        </div>
                        <div>
                          <span>{formatCurrency(category.totalRevenue)}</span>
                        </div>
                        <div>
                          <span>{category.productCount} produits</span>
                        </div>
                        <div>
                          <span>Moy: {formatCurrency(category.averageValue)}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs opacity-60 mt-2">
                        Dernière utilisation: {formatDate(category.lastUsed)}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune catégorie trouvée</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">Essayez un autre terme de recherche</p>
                  )}
                </div>
              )}

              {existingCategories.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune catégorie existante trouvée</p>
                  <p className="text-sm mt-1">Utilisez les catégories business ou créez une catégorie personnalisée</p>
                </div>
              )}
            </div>
          )}

          {/* Business Categories */}
          {categoryMode === 'business' && (
            <div className="space-y-3 mb-6">
              <h4 className="text-white font-medium mb-3">Catégories d'analyse métier :</h4>
              
              {BUSINESS_CATEGORIES.map((category) => (
                <div key={category.name} className="space-y-2">
                  <button
                    onClick={() => handleCategorySelect(category.name)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      selectedCategory === category.name
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {expandedCategory === category.name ? (
                        <FolderOpen className="w-5 h-5" />
                      ) : (
                        <Folder className="w-5 h-5" />
                      )}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    
                    {selectedCategory === category.name && (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                  </button>

                  {/* Subcategories */}
                  <AnimatePresence>
                    {expandedCategory === category.name && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-8 space-y-2"
                      >
                        <p className="text-gray-400 text-sm mb-2">Sous-catégories (optionnel) :</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.subcategories.map((subcategory) => (
                            <button
                              key={subcategory}
                              onClick={() => handleSubcategorySelect(subcategory)}
                              className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                                selectedSubcategory === subcategory
                                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                                  : 'bg-gray-700/20 border-gray-600/50 text-gray-300 hover:bg-gray-700/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{subcategory}</span>
                                {selectedSubcategory === subcategory && (
                                  <Check className="w-4 h-4 text-purple-400" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* Custom Category */}
          {categoryMode === 'custom' && (
            <div className="space-y-4 mb-6">
              <h4 className="text-white font-medium mb-3">Créer une catégorie personnalisée :</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nom de la catégorie personnalisée
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="Ex: Ventes Spéciales, Événement Client, Analyse Saisonnière..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Sous-catégorie (optionnel)
                </label>
                <input
                  type="text"
                  value={customSubcategory}
                  onChange={(e) => setCustomSubcategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="Ex: Promotion du jour, Offre limitée, Analyse Q1..."
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {isValid() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h5 className="text-green-400 font-semibold">Aperçu de la catégorisation</h5>
                  <div className="text-gray-300 text-sm mt-2">
                    <p><strong>Catégorie :</strong> {
                      categoryMode === 'custom' ? customCategory : selectedCategory
                    }</p>
                    {((categoryMode === 'custom' && customSubcategory) || 
                      (categoryMode === 'business' && selectedSubcategory)) && (
                      <p><strong>Sous-catégorie :</strong> {
                        categoryMode === 'custom' ? customSubcategory : selectedSubcategory
                      }</p>
                    )}
                    <p className="mt-2 text-gray-400">
                      Cette catégorisation sera appliquée à <strong>{selectedCount}</strong> vente(s) sélectionnée(s).
                      Les données originales ne seront pas modifiées, seules des métadonnées de catégorisation seront ajoutées.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Information */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Tag className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h5 className="text-blue-400 font-semibold">Système de catégorisation intelligent</h5>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>• <strong>Catégories existantes :</strong> Réutilise les catégories de vos données actuelles</li>
                  <li>• <strong>Catégories business :</strong> Catégories prédéfinies pour l'analyse métier</li>
                  <li>• <strong>Catégories personnalisées :</strong> Créez vos propres catégories d'analyse</li>
                  <li>• <strong>Préservation des données :</strong> Aucune modification des ventes originales</li>
                  <li>• <strong>Flexibilité :</strong> Recatégorisation possible à tout moment</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isLoading || !isValid()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                         py-3 px-4 rounded-xl hover:from-purple-600 hover:to-purple-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Catégorisation...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Appliquer la catégorisation</span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                         hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}