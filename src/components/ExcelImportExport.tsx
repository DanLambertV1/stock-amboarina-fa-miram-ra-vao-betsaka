import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Product, Sale } from '../types';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';

interface ExcelImportExportProps {
  products: Product[];
  sales: Sale[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
}

export function ExcelImportExport({ products, sales, onAddProduct }: ExcelImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const handleExportProducts = () => {
    exportToExcel(products, 'produits');
  };

  const handleExportSales = () => {
    const salesData = sales.map(sale => ({
      id: sale.id,
      date: sale.date.toLocaleDateString('fr-FR'),
      customerName: sale.customerName || 'Client Anonyme',
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      productsCount: sale.products.length
    }));
    
    exportToExcel(salesData, 'ventes');
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const data = await importFromExcel(file);
      
      let importedCount = 0;
      const errors: string[] = [];

      for (const item of data) {
        try {
          // Valider les données
          if (!item.name || !item.price || !item.category) {
            errors.push(`Ligne ${importedCount + 1}: Données manquantes`);
            continue;
          }

          const product: Omit<Product, 'id'> = {
            name: item.name,
            price: parseFloat(item.price) || 0,
            stock: parseInt(item.stock) || 0,
            category: item.category,
            minStock: parseInt(item.minStock) || 0,
            description: item.description || ''
          };

          onAddProduct(product);
          importedCount++;
        } catch (error) {
          errors.push(`Ligne ${importedCount + 1}: Erreur de format`);
        }
      }

      if (importedCount > 0) {
        setImportResult({
          success: true,
          message: `${importedCount} produits importés avec succès`,
          count: importedCount
        });
      } else {
        setImportResult({
          success: false,
          message: 'Aucun produit valide trouvé',
        });
      }

      if (errors.length > 0) {
        console.warn('Erreurs d\'importation:', errors);
      }

    } catch (error) {
      setImportResult({
        success: false,
        message: 'Erreur lors de l\'importation du fichier'
      });
    } finally {
      setImporting(false);
      // Réinitialiser l'input
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Exemple Produit',
        price: 99.99,
        stock: 10,
        category: 'Exemple Catégorie',
        minStock: 5,
        description: 'Description du produit'
      }
    ];
    
    exportToExcel(template, 'modele-produits');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Import/Export Excel</h1>
        <p className="text-gray-400">Gérez vos données avec des fichiers Excel</p>
      </div>

      {/* Notifications */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center justify-between ${
            importResult.success
              ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center space-x-3">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{importResult.message}</span>
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <Download className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Exporter les Données</h3>
              <p className="text-gray-400 text-sm">Téléchargez vos données au format Excel</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleExportProducts}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                         py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                         transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Exporter les Produits ({products.length})</span>
            </button>

            <button
              onClick={handleExportSales}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                         py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                         transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Exporter les Ventes ({sales.length})</span>
            </button>

            <div className="bg-gray-700/30 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">Formats disponibles :</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• CSV (Compatible Excel)</li>
                <li>• Encodage UTF-8</li>
                <li>• Séparateur virgule</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Import */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Importer des Produits</h3>
              <p className="text-gray-400 text-sm">Ajoutez des produits depuis un fichier Excel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportProducts}
                disabled={importing}
                className="hidden"
                id="file-import"
              />
              <label
                htmlFor="file-import"
                className={`cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-4 bg-blue-500/20 rounded-full">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {importing ? 'Importation en cours...' : 'Cliquez pour sélectionner un fichier'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Formats supportés: CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                         py-3 px-4 rounded-xl hover:from-purple-600 hover:to-purple-700 
                         transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le Modèle</span>
            </button>

            <div className="bg-gray-700/30 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2">Format requis :</h4>
              <div className="text-gray-400 text-sm space-y-1">
                <p><strong>Colonnes obligatoires :</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• name (nom du produit)</li>
                  <li>• price (prix)</li>
                  <li>• stock (quantité en stock)</li>
                  <li>• category (catégorie)</li>
                  <li>• minStock (stock minimum)</li>
                  <li>• description (optionnel)</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Guide d'utilisation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-xl 
                   border border-cyan-500/30 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Guide d'Utilisation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-3">📤 Export</h4>
            <ol className="text-gray-300 text-sm space-y-2">
              <li>1. Cliquez sur "Exporter les Produits" ou "Exporter les Ventes"</li>
              <li>2. Le fichier CSV sera téléchargé automatiquement</li>
              <li>3. Ouvrez le fichier avec Excel ou Google Sheets</li>
              <li>4. Modifiez les données selon vos besoins</li>
            </ol>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">📥 Import</h4>
            <ol className="text-gray-300 text-sm space-y-2">
              <li>1. Téléchargez le modèle Excel</li>
              <li>2. Remplissez le modèle avec vos données</li>
              <li>3. Sauvegardez au format CSV ou Excel</li>
              <li>4. Importez le fichier via la zone de dépôt</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h5 className="text-yellow-400 font-semibold">Conseils Importants</h5>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li>• Vérifiez que tous les champs obligatoires sont remplis</li>
                <li>• Utilisez des nombres valides pour les prix et quantités</li>
                <li>• Évitez les caractères spéciaux dans les noms</li>
                <li>• Sauvegardez vos données avant d'importer</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}