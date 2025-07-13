import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  RefreshCw, 
  Edit, 
  Calendar, 
  User, 
  Package, 
  DollarSign,
  Hash,
  Monitor,
  Tag
} from 'lucide-react';
import { RegisterSale } from '../types';
import { format } from 'date-fns';

interface SaleEditModalProps {
  sale: RegisterSale;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<RegisterSale>) => Promise<void>;
  isLoading: boolean;
}

export function SaleEditModal({ sale, isOpen, onClose, onSave, isLoading }: SaleEditModalProps) {
  const [formData, setFormData] = useState({
    product: sale.product,
    category: sale.category,
    register: sale.register,
    date: format(sale.date, 'yyyy-MM-dd'),
    time: format(sale.date, 'HH:mm'),
    seller: sale.seller,
    quantity: sale.quantity.toString(),
    price: sale.price.toString(),
    total: sale.total.toString()
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when sale changes
  useEffect(() => {
    setFormData({
      product: sale.product,
      category: sale.category,
      register: sale.register,
      date: format(sale.date, 'yyyy-MM-dd'),
      time: format(sale.date, 'HH:mm'),
      seller: sale.seller,
      quantity: sale.quantity.toString(),
      price: sale.price.toString(),
      total: sale.total.toString()
    });
    setErrors({});
    setHasChanges(false);
  }, [sale]);

  // Check for changes
  useEffect(() => {
    const originalDateTime = new Date(`${format(sale.date, 'yyyy-MM-dd')}T${format(sale.date, 'HH:mm')}`);
    const currentDateTime = new Date(`${formData.date}T${formData.time}`);
    
    const changed = 
      formData.product !== sale.product ||
      formData.category !== sale.category ||
      formData.register !== sale.register ||
      currentDateTime.getTime() !== sale.date.getTime() ||
      formData.seller !== sale.seller ||
      parseFloat(formData.quantity) !== sale.quantity ||
      parseFloat(formData.price) !== sale.price ||
      parseFloat(formData.total) !== sale.total;
    
    setHasChanges(changed);
  }, [formData, sale]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.product.trim()) {
      newErrors.product = 'Le nom du produit est requis';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'La catégorie est requise';
    }

    if (!formData.seller.trim()) {
      newErrors.seller = 'Le vendeur est requis';
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'La quantité doit être un nombre positif';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price)) {
      newErrors.price = 'Le prix doit être un nombre valide';
    }

    const total = parseFloat(formData.total);
    if (isNaN(total)) {
      newErrors.total = 'Le total doit être un nombre valide';
    }

    if (!formData.date) {
      newErrors.date = 'La date est requise';
    }

    if (!formData.time) {
      newErrors.time = 'L\'heure est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const updates: Partial<RegisterSale> = {
      product: formData.product.trim(),
      category: formData.category.trim(),
      register: formData.register,
      date: new Date(`${formData.date}T${formData.time}`),
      seller: formData.seller.trim(),
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      total: parseFloat(formData.total)
    };

    await onSave(updates);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-calculate total when quantity or price changes
    if (field === 'quantity' || field === 'price') {
      const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(formData.quantity);
      const price = field === 'price' ? parseFloat(value) : parseFloat(formData.price);
      
      if (!isNaN(quantity) && !isNaN(price)) {
        const total = quantity * price;
        setFormData(prev => ({ ...prev, total: total.toFixed(2) }));
      }
    }
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
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Modifier la Vente</h3>
                <p className="text-gray-400 text-sm">ID: {sale.id}</p>
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

          {/* Form */}
          <div className="space-y-6">
            {/* Product and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Package className="w-4 h-4 inline mr-2" />
                  Produit
                </label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => handleInputChange('product', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.product ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="Nom du produit"
                />
                {errors.product && (
                  <p className="text-red-400 text-sm mt-1">{errors.product}</p>
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

            {/* Register and Seller */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Monitor className="w-4 h-4 inline mr-2" />
                  Caisse
                </label>
                <select
                  value={formData.register}
                  onChange={(e) => handleInputChange('register', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Register1">Register1</option>
                  <option value="Register2">Register2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Vendeur
                </label>
                <input
                  type="text"
                  value={formData.seller}
                  onChange={(e) => handleInputChange('seller', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.seller ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="Nom du vendeur"
                />
                {errors.seller && (
                  <p className="text-red-400 text-sm mt-1">{errors.seller}</p>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.date ? 'border-red-500' : 'border-gray-600'
                             }`}
                />
                {errors.date && (
                  <p className="text-red-400 text-sm mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Heure
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.time ? 'border-red-500' : 'border-gray-600'
                             }`}
                />
                {errors.time && (
                  <p className="text-red-400 text-sm mt-1">{errors.time}</p>
                )}
              </div>
            </div>

            {/* Quantity, Price, and Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Hash className="w-4 h-4 inline mr-2" />
                  Quantité
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.quantity ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="1"
                />
                {errors.quantity && (
                  <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Total (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => handleInputChange('total', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                               errors.total ? 'border-red-500' : 'border-gray-600'
                             }`}
                  placeholder="0.00"
                />
                {errors.total && (
                  <p className="text-red-400 text-sm mt-1">{errors.total}</p>
                )}
              </div>
            </div>

            {/* Warning about changes */}
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
              >
                <div className="flex items-start space-x-3">
                  <Edit className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h5 className="text-yellow-400 font-semibold">Modifications détectées</h5>
                    <p className="text-gray-300 text-sm mt-1">
                      Les modifications apportées à cette vente affecteront les statistiques et les calculs de stock.
                      Assurez-vous que les informations sont correctes avant de sauvegarder.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-8">
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
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
                  <span>Sauvegarder les modifications</span>
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