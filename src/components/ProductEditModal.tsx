import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  RefreshCw, 
  Package, 
  DollarSign,
  Hash,
  Tag,
  FileText,
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Product, RegisterSale } from '../types';
import { validateStockConfiguration, getDefaultInitialStockDate, formatStockDate } from '../utils/calculateStockFinal';

interface ProductEditModalProps {
  product?: Product; // undefined for create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>) => Promise<void>;
  isLoading: boolean;
  allSales?: RegisterSale[]; // For validation warnings
}

export function ProductEditModal({ 
  product, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading,
  allSales = []
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    initialStock: '',
    initialStockDate: getDefaultInitialStockDate(),
    minStock: '',
    description: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [warnings, setWarnings] = useState<any[]>([]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        initialStock: (product.initialStock || 0).toString(),
        initialStockDate: product.initialStockDate || getDefaultInitialStockDate(),
        minStock: product.minStock.toString(),
        description: product.description || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        price: '',
        initialStock: '',
        initialStockDate: getDefaultInitialStockDate(),
        minStock: '',
        description: ''
      });
    }
    setErrors({});
    setWarnings([]);
  }, [product, isOpen]);

  // Validate stock configuration when relevant fields change
  useEffect(() => {
    if (product && allSales.length > 0) {
      const tempProduct: Product = {
        ...product,
        initialStock: parseInt(formData.initialStock) || 0,
        initialStockDate: formData.initialStockDate
      };
      
      const stockWarnings = validateStockConfiguration(tempProduct, allSales);
      setWarnings(stockWarnings);
    }
  }, [formData.initialStock, formData.initialStockDate, product, allSales]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du produit est requis';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'La catégorie est requise';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Le prix doit être un nombre positif';
    }

    const initialStock = parseInt(formData.initialStock);
    if (isNaN(initialStock) || initialStock < 0) {
      newErrors.initialStock = 'Le stock initial doit être un nombre positif';
    }

    const minStock = parseInt(formData.minStock);
    if (isNaN(minStock) || minStock < 0) {
      newErrors.minStock = 'Le stock minimum doit être un nombre positif';
    }

    if (!formData.initialStockDate) {
      newErrors.initialStockDate = 'La date de stock initial est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const productData: Omit<Product, 'id'> = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      price: parseFloat(formData.price),
      stock: 0, // Will be calculated by the system
      initialStock: parseInt(formData.initialStock),
      initialStockDate: formData.initialStockDate,
      quantitySold: 0, // Will be calculated by the system
      minStock: parseInt(formData.minStock),
      description: formData.description.trim()
    };

    await onSave(productData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!product;

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
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {isEditMode ? 'Modifier le Produit' : 'Ajouter un Produit'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {isEditMode ? `ID: ${product.id}` : 'Créer un nouveau produit'}
                </p>
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

          {/* Stock Configuration Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h5 className="text-blue-400 font-semibold">Gestion du Stock Initial</h5>
                <p className="text-gray-300 text-sm mt-1">
                  La <strong>date d'effet</strong> détermine à partir de quand les ventes affectent le stock. 
                  Les ventes antérieures à cette date seront ignorées dans le calcul du stock final.
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2 mb-6">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border flex items-start space-x-3 ${
                    warning.severity === 'error' 
                      ? 'bg-red-500/10 border-red-500/20'
                      : warning.severity === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                    warning.severity === 'error' 
                      ? 'text-red-400'
                      : warning.severity === 'warning'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                  }`} />
                  <span className={`text-sm ${
                    warning.severity === 'error' 
                      ? 'text-red-300'
                      : warning.severity === 'warning'
                      ? 'text-yellow-300'
                      : 'text-blue-300'
                  }`}>
                    {warning.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Product Name and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Package className="w-4 h-4 inline mr-2" />
                  Nom du Produit
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.name ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="Nom du produit"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Catégorie
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.category ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="Catégorie du produit"
                />
                {errors.category && (
                  <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                )}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Prix Unitaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                             errors.price ? 'border-red-500' : 'border-gray-600'
                           }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
              )}
            </div>

            {/* Stock Configuration */}
            <div className="bg-gray-700/30 rounded-xl p-4 space-y-4">
              <h4 className="text-white font-medium flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>Configuration du Stock</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) => handleInputChange('initialStock', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                 errors.initialStock ? 'border-red-500' : 'border-gray-600'
                               }`}
                    placeholder="0"
                  />
                  {errors.initialStock && (
                    <p className="text-red-400 text-sm mt-1">{errors.initialStock}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date d'Effet
                  </label>
                  <input
                    type="date"
                    value={formData.initialStockDate}
                    onChange={(e) => handleInputChange('initialStockDate', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                 errors.initialStockDate ? 'border-red-500' : 'border-gray-600'
                               }`}
                  />
                  {errors.initialStockDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.initialStockDate}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Les ventes antérieures à cette date seront ignorées
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Stock Minimum (Alerte)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => handleInputChange('minStock', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.minStock ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="5"
                />
                {errors.minStock && (
                  <p className="text-red-400 text-sm mt-1">{errors.minStock}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Description (optionnel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Description du produit..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-8">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                         py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{isEditMode ? 'Sauvegarder les modifications' : 'Créer le produit'}</span>
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