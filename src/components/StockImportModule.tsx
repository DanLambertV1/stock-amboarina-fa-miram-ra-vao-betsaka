import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Download,
  AlertTriangle,
  TrendingUp,
  Package,
  RefreshCw,
  MousePointer,
  Clipboard,
  Plus,
  Edit,
  Calendar,
  BarChart3,
  Info
} from 'lucide-react';
import { Product } from '../types';
import { importFromExcel, exportToExcel, parseClipboardData } from '../utils/excelUtils';
import { validateStockImport, StockImportData, StockImportPreview } from '../utils/stockImportUtils';

interface StockImportModuleProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onRefreshData: () => void;
}

interface ImportResult {
  updated: Array<{
    product: Product;
    oldStock: number;
    newStock: number;
    addedQuantity: number;
  }>;
  created: Array<{
    product: Omit<Product, 'id'>;
    quantity: number;
  }>;
  summary: string;
}

export function StockImportModule({ 
  products, 
  onUpdateProduct, 
  onAddProduct, 
  onRefreshData 
}: StockImportModuleProps) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<StockImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    result?: ImportResult;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (file: File) => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setPreview(null);

    try {
      const rawData = await importFromExcel(file);
      const processedPreview = validateStockImport(rawData);
      
      setPreview(processedPreview);
      setShowPreview(true);
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'importation'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileImport(file);
    }
    event.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileImport(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleClipboardImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setImportResult({
          success: false,
          message: 'Le presse-papiers est vide'
        });
        return;
      }

      setImporting(true);
      setImportResult(null);
      setPreview(null);

      const rawData = parseClipboardData(text);
      const processedPreview = validateStockImport(rawData);
      
      setPreview(processedPreview);
      setShowPreview(true);
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Erreur lors de la lecture du presse-papiers. Assurez-vous d\'avoir copié des données depuis Excel.'
      });
    } finally {
      setImporting(false);
    }
  };

  // Enhanced product matching function
  const findMatchingProduct = (importData: StockImportData): Product | null => {
    const normalizeString = (str: string) => 
      str.toLowerCase().trim().replace(/\s+/g, ' ');

    const normalizedImportProduct = normalizeString(importData.product);
    const normalizedImportCategory = normalizeString(importData.category);

    // Try exact match first
    let match = products.find(product => 
      normalizeString(product.name) === normalizedImportProduct &&
      normalizeString(product.category) === normalizedImportCategory
    );

    if (match) return match;

    // Try partial match on product name with same category
    match = products.find(product => {
      const normalizedProductName = normalizeString(product.name);
      const normalizedProductCategory = normalizeString(product.category);
      
      return (
        normalizedProductCategory === normalizedImportCategory &&
        (normalizedProductName.includes(normalizedImportProduct) || 
         normalizedImportProduct.includes(normalizedProductName))
      );
    });

    if (match) return match;

    // Try fuzzy match - check if main words are present
    match = products.find(product => {
      const normalizedProductName = normalizeString(product.name);
      const normalizedProductCategory = normalizeString(product.category);
      
      if (normalizedProductCategory !== normalizedImportCategory) return false;
      
      const importWords = normalizedImportProduct.split(' ').filter(word => word.length > 2);
      const productWords = normalizedProductName.split(' ').filter(word => word.length > 2);
      
      // Check if at least 70% of words match
      const matchingWords = importWords.filter(importWord => 
        productWords.some(productWord => 
          productWord.includes(importWord) || importWord.includes(productWord)
        )
      );
      
      return matchingWords.length >= Math.ceil(importWords.length * 0.7);
    });

    return match || null;
  };

  const confirmImport = async () => {
    if (!preview || preview.data.length === 0) return;

    // Split data into batches of 100 items
    const BATCH_SIZE = 100;
    const batches = [];
    
    for (let i = 0; i < preview.data.length; i += BATCH_SIZE) {
      batches.push(preview.data.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Split import into ${batches.length} batches of max ${BATCH_SIZE} items each`);
    
    setImporting(true);
    try {
      const updated: ImportResult['updated'] = [];
      const created: ImportResult['created'] = [];
      let processedCount = 0;

      // Process each batch sequentially
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`);
        
        // Process each item in the current batch
        for (const importData of batch) {
          const matchingProduct = findMatchingProduct(importData);

          if (matchingProduct) {
            // Update existing product
            const oldStock = matchingProduct.stock;
            const newStock = oldStock + importData.quantity;
            
            await onUpdateProduct(matchingProduct.id, {
              stock: newStock,
              // Update initialStock if it's not set or if new stock is higher
              initialStock: Math.max(matchingProduct.initialStock || oldStock, newStock)
            });

            updated.push({
              product: matchingProduct,
              oldStock,
              newStock,
              addedQuantity: importData.quantity
            });
          } else {
            // Create new product
            const newProduct: Omit<Product, 'id'> = {
              name: importData.product.trim(),
              category: importData.category.trim(),
              price: 0, // To be set later
              stock: importData.quantity,
              initialStock: importData.quantity,
              quantitySold: 0,
              minStock: Math.max(Math.ceil(importData.quantity * 0.2), 5), // 20% of stock or minimum 5
              description: `Créé automatiquement le ${importData.date.toLocaleDateString('fr-FR')}`
            };

            await onAddProduct(newProduct);
            
            created.push({
              product: newProduct,
              quantity: importData.quantity
            });
          }
          
          processedCount++;
        }
        
        // Update progress after each batch
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed. Progress: ${processedCount}/${preview.data.length} items (${Math.round(processedCount/preview.data.length*100)}%)`);
      }

      // Generate summary report
      const totalUpdated = updated.length;
      const totalCreated = created.length;
      const totalQuantityAdded = updated.reduce((sum, item) => sum + item.addedQuantity, 0);
      const totalNewStock = created.reduce((sum, item) => sum + item.quantity, 0);

      let summary = `✅ Import de stock terminé avec succès !\n\n`;
      summary += `📊 Résumé de l'opération :\n`;
      summary += `• ${totalUpdated} produits existants mis à jour\n`;
      summary += `• ${totalCreated} nouveaux produits créés\n`;
      summary += `• ${totalQuantityAdded + totalNewStock} unités ajoutées au total\n`;
      summary += `• Traité en ${batches.length} lots de ${BATCH_SIZE} produits maximum\n\n`;

      if (totalUpdated > 0) {
        summary += `🔄 Produits mis à jour :\n`;
        updated.forEach(item => {
          summary += `• ${item.product.name} : ${item.oldStock} → ${item.newStock} (+${item.addedQuantity})\n`;
        });
        summary += `\n`;
      }

      if (totalCreated > 0) {
        summary += `🆕 Nouveaux produits créés :\n`;
        created.forEach(item => {
          summary += `• ${item.product.name} (${item.product.category}) : ${item.quantity} unités\n`;
        });
        summary += `\n`;
      }

      summary += `⚠️ Note importante :\n`;
      summary += `• Les nouveaux produits ont un prix de 0€ - À définir manuellement\n`;
      summary += `• Le stock minimum a été calculé automatiquement (20% du stock)\n`;
      summary += `• Vérifiez les données dans le module Stock`;

      const result: ImportResult = { updated, created, summary };

      setImportResult({
        success: true,
        message: `${totalUpdated + totalCreated} produits traités avec succès`,
        result
      });

      setShowPreview(false);
      setPreview(null);
      
      // Refresh data to show updated stocks
      setTimeout(() => {
        onRefreshData();
      }, 1000);

    } catch (error) {
      setImportResult({
        success: false,
        message: 'Erreur lors de l\'import des données de stock'
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        Product: 'JELLY POP',
        Category: 'CONFISERIES',
        Quantity: 50,
        Date: '15/01/2025'
      },
      {
        Product: 'COCA 1,5L',
        Category: 'BOISSONS',
        Quantity: 24,
        Date: '15/01/2025'
      },
      {
        Product: 'NOUVEAU PRODUIT',
        Category: 'ALIMENTAIRE',
        Quantity: 30,
        Date: '15/01/2025'
      }
    ];
    
    exportToExcel(template, 'modele-import-stock-globalva');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Import Stock - Mise à Jour des Quantités</h1>
        <p className="text-gray-400">Mettez à jour vos stocks en masse depuis un fichier Excel</p>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-6 rounded-xl border ${
              importResult.success
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/20 border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {importResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 mt-1" />
                )}
                <div className="flex-1">
                  <h4 className={`font-semibold mb-2 ${
                    importResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {importResult.success ? 'Import Réussi' : 'Erreur d\'Import'}
                  </h4>
                  <p className={`text-sm mb-3 ${
                    importResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {importResult.message}
                  </p>
                  
                  {importResult.result && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <pre className="text-green-300 text-sm whitespace-pre-wrap font-mono">
                        {importResult.result.summary}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="text-gray-400 hover:text-white ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                   border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Comment ça fonctionne</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-blue-400 font-semibold mb-3">🔄 Mise à Jour des Stocks</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• <strong>Produit trouvé :</strong> La quantité est ajoutée au stock existant</li>
              <li>• <strong>Correspondance :</strong> Basée sur le nom et la catégorie</li>
              <li>• <strong>Exemple :</strong> Stock actuel 10 + Import 5 = Nouveau stock 15</li>
              <li>• <strong>Historique :</strong> L'ancien stock est conservé dans l'historique</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">🆕 Création Automatique</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• <strong>Produit non trouvé :</strong> Créé automatiquement</li>
              <li>• <strong>Stock initial :</strong> Quantité importée</li>
              <li>• <strong>Prix :</strong> Défini à 0€ (à configurer manuellement)</li>
              <li>• <strong>Stock minimum :</strong> Calculé automatiquement (20%)</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h5 className="text-green-400 font-semibold">✅ Format Excel Attendu (traité par lots de 100)</h5>
              <p className="text-gray-300 text-sm mt-1">
                <strong>Colonnes requises :</strong> Product (nom), Category (catégorie), Quantity (quantité à ajouter)
                <br />
                <strong>Colonne optionnelle :</strong> Date (information uniquement)
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Current stock overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>État Actuel du Stock</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
            <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{products.length}</p>
            <p className="text-blue-400 text-sm">Produits en stock</p>
          </div>
          
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {products.reduce((sum, p) => sum + p.stock, 0).toLocaleString()}
            </p>
            <p className="text-green-400 text-sm">Unités totales</p>
          </div>
          
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
            <Edit className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {new Set(products.map(p => p.category)).size}
            </p>
            <p className="text-purple-400 text-sm">Catégories</p>
          </div>
          
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {products.filter(p => p.stock <= p.minStock).length}
            </p>
            <p className="text-orange-400 text-sm">Alertes stock</p>
          </div>
        </div>
      </motion.div>

      {/* Import methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag & Drop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <MousePointer className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Glisser-Déposer</h3>
              <p className="text-gray-400 text-sm">Faites glisser votre fichier Excel ici</p>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-blue-400 bg-blue-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 bg-blue-500/20 rounded-full">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {dragActive ? 'Relâchez pour importer' : 'Glissez votre fichier Excel ici'}
                </p>
                <p className="text-gray-400 text-sm">
                  Fichiers Excel (.xlsx, .xls)
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Excel File */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Fichier Excel</h3>
              <p className="text-gray-400 text-sm">Sélectionnez un fichier Excel</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            disabled={importing}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                       py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>{importing ? 'Traitement...' : 'Choisir un fichier Excel'}</span>
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={downloadTemplate}
              className="text-green-400 hover:text-green-300 text-sm underline"
            >
              Télécharger le modèle Excel
            </button>
          </div>
        </motion.div>

        {/* Clipboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Clipboard className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Presse-papiers</h3>
              <p className="text-gray-400 text-sm">Coller depuis Excel</p>
            </div>
          </div>

          <button
            onClick={handleClipboardImport}
            disabled={importing}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                       py-4 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Clipboard className="w-5 h-5" />
            <span>{importing ? 'Traitement...' : 'Coller les données'}</span>
          </button>

          <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-purple-300 text-xs">
              💡 Sélectionnez et copiez vos données depuis Excel puis cliquez sur "Coller les données"
            </p>
          </div>
        </motion.div>
      </div>

      {/* Format explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Format de Données - Import Stock</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-3">📋 Colonnes Requises</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Product</span>
                  <span className="text-green-400 text-xs">OBLIGATOIRE</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Nom exact du produit (pour correspondance)</p>
              </div>
              
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Category</span>
                  <span className="text-green-400 text-xs">OBLIGATOIRE</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Catégorie du produit (pour correspondance)</p>
              </div>
              
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Quantity</span>
                  <span className="text-green-400 text-xs">OBLIGATOIRE</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Quantité à ajouter au stock existant</p>
              </div>
              
              <div className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Date</span>
                  <span className="text-blue-400 text-xs">OPTIONNEL</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">Date d'inventaire (information uniquement)</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">🔄 Logique de Traitement</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <h5 className="text-green-400 font-medium mb-1">✅ Produit Existant</h5>
                <p className="text-gray-300 text-xs">
                  Stock actuel + Quantité importée = Nouveau stock
                  <br />
                  <span className="text-green-400">Exemple: 10 + 5 = 15 unités</span>
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <h5 className="text-blue-400 font-medium mb-1">🆕 Nouveau Produit</h5>
                <p className="text-gray-300 text-xs">
                  Création automatique avec:
                  <br />
                  • Stock = Quantité importée
                  <br />
                  • Prix = 0€ (à définir)
                  <br />
                  • Stock min = 20% du stock
                </p>
              </div>
              
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <h5 className="text-orange-400 font-medium mb-1">🔍 Correspondance</h5>
                <p className="text-gray-300 text-xs">
                  Basée sur nom + catégorie
                  <br />
                  Recherche exacte puis approximative
                  <br />
                  <span className="text-orange-400">Sensible à la casse et aux espaces</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h5 className="text-green-400 font-semibold">✅ Exemple de Fichier Excel Valide</h5>
              <div className="mt-2 bg-gray-800/50 rounded-lg p-3 font-mono text-xs">
                <div className="grid grid-cols-4 gap-4 text-gray-400 border-b border-gray-600 pb-1">
                  <span>Product</span>
                  <span>Category</span>
                  <span>Quantity</span>
                  <span>Date</span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-white mt-1">
                  <span>JELLY POP</span>
                  <span>CONFISERIES</span>
                  <span>50</span>
                  <span>15/01/2025</span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-white">
                  <span>COCA 1,5L</span>
                  <span>BOISSONS</span>
                  <span>24</span>
                  <span>15/01/2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Eye className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Aperçu de l'Import Stock</h3>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                  <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{preview.data.length}</p>
                  <p className="text-blue-400 text-sm">Lignes à traiter</p>
                </div>

                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {preview.data.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                  <p className="text-green-400 text-sm">Unités à ajouter</p>
                </div>

                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{preview.errors.length}</p>
                  <p className="text-red-400 text-sm">Erreurs détectées</p>
                </div>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">
                      Erreurs détectées ({preview.errors.length})
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {preview.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                        <div className="text-red-300">
                          <strong>Ligne {error.row}:</strong> {error.message}
                        </div>
                      </div>
                    ))}
                    {preview.errors.length > 10 && (
                      <div className="text-center text-red-400 text-sm">
                        ... et {preview.errors.length - 10} autres erreurs
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview data */}
              {preview.data.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">
                    Aperçu des données valides (premiers 10 éléments) :
                  </h4>
                  <div className="bg-gray-700/30 rounded-xl p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-400">Produit</th>
                          <th className="text-left py-2 text-gray-400">Catégorie</th>
                          <th className="text-center py-2 text-gray-400">Quantité</th>
                          <th className="text-left py-2 text-gray-400">Date</th>
                          <th className="text-left py-2 text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.slice(0, 10).map((item, index) => {
                          const matchingProduct = findMatchingProduct(item);
                          const isUpdate = !!matchingProduct;
                          
                          return (
                            <tr key={index} className="border-b border-gray-600/50">
                              <td className="py-2 text-white font-medium">{item.product}</td>
                              <td className="py-2 text-gray-300">{item.category}</td>
                              <td className="py-2 text-center text-blue-400 font-medium">+{item.quantity}</td>
                              <td className="py-2 text-gray-300">{item.date.toLocaleDateString('fr-FR')}</td>
                              <td className="py-2">
                                {isUpdate ? (
                                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                                    Mise à jour ({matchingProduct.stock} → {matchingProduct.stock + item.quantity})
                                  </span>
                                ) : (
                                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                                    Création (stock: {item.quantity})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {preview.data.length > 10 && (
                      <div className="text-center py-2 text-gray-400 text-sm">
                        ... et {preview.data.length - 10} autres lignes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={confirmImport}
                  disabled={preview.data.length === 0 || importing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                             flex items-center justify-center space-x-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Import en cours par lots de 100...</span>
                    </>
                  ) : (
                    <span>
                      Confirmer l'Import ({preview.data.length} lignes - {preview.data.reduce((sum, item) => sum + item.quantity, 0)} unités)
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}