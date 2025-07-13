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
  Users,
  Monitor,
  Clipboard,
  MousePointer,
  Package,
  RefreshCw,
  TrendingDown,
  DollarSign,
  FileText,
  Hash,
  Copy
} from 'lucide-react';
import { RegisterSale, ImportPreview } from '../types';
import { validateAndProcessImportWithExistingData } from '../utils/importUtils';
import { importFromExcel, exportToExcel, parseClipboardData } from '../utils/excelUtils';

interface ImportModuleProps {
  onImportSales: (sales: RegisterSale[]) => Promise<boolean>;
  onRefreshData: () => void;
  existingSales?: RegisterSale[]; // ✅ NEW: Pass existing sales for duplicate detection
}

export function ImportModule({ onImportSales, onRefreshData, existingSales = [] }: ImportModuleProps) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (file: File) => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setPreview(null);

    try {
      const rawData = await importFromExcel(file);
      // ✅ ENHANCED: Use the new function with existing sales comparison
      const processedPreview = validateAndProcessImportWithExistingData(rawData, existingSales);
      
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
      // ✅ ENHANCED: Use the new function with existing sales comparison
      const processedPreview = validateAndProcessImportWithExistingData(rawData, existingSales);
      
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

  const confirmImport = async () => {
    if (!preview || preview.data.length === 0) return;

    setImporting(true);
    try {
      const success = await onImportSales(preview.data);
      
      if (success) {
        const positiveTransactions = preview.data.filter(sale => sale.total >= 0).length;
        const negativeTransactions = preview.data.filter(sale => sale.total < 0).length;
        
        let message = `${preview.data.length} transactions importées avec succès.`;
        if (negativeTransactions > 0) {
          message += ` Inclut ${negativeTransactions} remboursements/retraits et ${positiveTransactions} ventes.`;
        }
        if (preview.duplicates.length > 0) {
          message += ` ${preview.duplicates.length} doublons détectés et exclus.`;
        }
        message += ` Les quantités vendues ont été automatiquement mises à jour dans le module Stock.`;
        
        setImportResult({
          success: true,
          message,
          count: preview.data.length
        });
        setShowPreview(false);
        setPreview(null);
        
        // Refresh all data to show updated stocks
        setTimeout(() => {
          onRefreshData();
        }, 1000);
      } else {
        setImportResult({
          success: false,
          message: 'Erreur lors de l\'enregistrement des données'
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Erreur lors de l\'importation des données'
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        PRODUIT: 'MISES TIRAGE & SPORT',
        CATEGORIE: 'FDJ - MISES TIRAGE & SPORT',
        CAISSE: 'caisse1',
        DATE: '04/05/2025',
        VENDEUR: 'MARTIAL',
        QUANTITE: 17,
        MONTANT: '266,50 €'
      },
      {
        PRODUIT: 'REMBT GAINS TIRAGE & SPORT',
        CATEGORIE: 'FDJ - REMBT GAINS TIRAGE & SPORT',
        CAISSE: 'caisse1',
        DATE: '04/05/2025',
        VENDEUR: 'MARTIAL',
        QUANTITE: 9,
        MONTANT: '-78,70 €'
      },
      {
        PRODUIT: 'VEGAS (02)',
        CATEGORIE: 'Grattage',
        CAISSE: 'caisse1',
        DATE: '04/05/2025',
        VENDEUR: 'MARTIAL',
        QUANTITE: 2,
        MONTANT: '6,00 €'
      }
    ];
    
    exportToExcel(template, 'modele-import-ventes-globalva-martial');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Import Données de Ventes</h1>
        <p className="text-gray-400">Importez vos données depuis fichiers Excel ou presse-papiers</p>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
      </AnimatePresence>

      {/* Duplicate Detection Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                   border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Copy className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Détection Intelligente des Doublons</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">🔍 Critères de Détection</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Produit identique</strong> (nom exact)</li>
              <li>• <strong>Catégorie identique</strong></li>
              <li>• <strong>Caisse identique</strong></li>
              <li>• <strong>Date identique</strong> (même jour)</li>
              <li>• <strong>Vendeur identique</strong></li>
              <li>• <strong>Quantité identique</strong></li>
              <li>• <strong>Montant identique</strong> (prix et total)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-2">✅ Avantages</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Évite les doublons</strong> lors d'imports multiples</li>
              <li>• <strong>Détection précise</strong> basée sur tous les champs</li>
              <li>• <strong>Rapport détaillé</strong> des doublons trouvés</li>
              <li>• <strong>Import sécurisé</strong> sans corruption des données</li>
              <li>• <strong>Préservation</strong> des données existantes</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h5 className="text-green-400 font-semibold">🛡️ Protection Automatique</h5>
              <p className="text-gray-300 text-sm mt-1">
                Le système compare automatiquement chaque ligne avec <strong>{existingSales.length.toLocaleString()} ventes existantes</strong> et les nouvelles lignes du même import. 
                Les doublons exacts sont automatiquement exclus et signalés dans le rapport d'import.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calculation Logic Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                   border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Logique de Calcul - Montant = Valeur Totale</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">💰 Colonne MONTANT</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Représente la valeur totale</strong> de la vente</li>
              <li>• <strong>Utilisée directement</strong> dans les calculs de CA</li>
              <li>• <strong>Pas de multiplication</strong> avec la quantité</li>
              <li>• <strong>Support des négatifs</strong> pour remboursements</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-2">📊 Exemple de Calcul</h4>
            <div className="bg-gray-700/30 rounded-lg p-3 text-sm">
              <div className="text-gray-300 space-y-1">
                <div>BANCO (01) — Qté: 3 — Montant: 3,00 €</div>
                <div>PACTOLE (05) — Qté: 2 — Montant: 4,00 €</div>
                <div className="border-t border-gray-600 pt-1 mt-2">
                  <div className="text-green-400">→ Total Ventes = 3,00 € + 4,00 € = 7,00 €</div>
                  <div className="text-blue-400">→ Total Quantité = 3 + 2 = 5</div>
                  <div className="text-purple-400">→ Nombre de Lignes = 2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h5 className="text-green-400 font-semibold">✅ Calcul Correct</h5>
              <p className="text-gray-300 text-sm mt-1">
                La colonne <strong>MONTANT</strong> contient déjà la valeur totale de chaque vente. 
                Aucune multiplication n'est effectuée - les montants sont additionnés directement pour obtenir le chiffre d\'affaires.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Import methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag & Drop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
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
              Télécharger le modèle Excel (format MARTIAL)
            </button>
          </div>
        </motion.div>

        {/* Clipboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
        transition={{ delay: 0.4 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Format de Données Compatible - Modèle MARTIAL</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-3">📋 Colonnes Reconnues Automatiquement</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">PRODUIT</span>
                <span className="text-gray-400">Nom du produit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">CATEGORIE</span>
                <span className="text-gray-400">Catégorie du produit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">CAISSE</span>
                <span className="text-gray-400">Nom de la caisse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">DATE</span>
                <span className="text-gray-400">Date de vente (DD/MM/YYYY)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">VENDEUR</span>
                <span className="text-gray-400">Nom du vendeur</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">QUANTITE</span>
                <span className="text-gray-400">Quantité (pour stock)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">MONTANT</span>
                <span className="text-gray-400">Valeur totale de vente</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">🔄 Logique de Calcul</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• <strong>MONTANT = Valeur totale :</strong> Utilisé directement pour le CA</li>
              <li>• <strong>Pas de multiplication :</strong> Quantité et montant restent séparés</li>
              <li>• <strong>Montants négatifs :</strong> Remboursements supportés (ex: -78,70 €)</li>
              <li>• <strong>Format français :</strong> Virgule comme séparateur décimal</li>
              <li>• <strong>Symboles monétaires :</strong> €, $, £ automatiquement supprimés</li>
              <li>• <strong>Quantité pour stock :</strong> Transférée vers le module Stock</li>
              <li>• <strong>Calcul CA :</strong> Somme directe des montants</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h5 className="text-green-400 font-semibold">✅ Votre Format Excel MARTIAL est Compatible !</h5>
              <div className="text-gray-300 text-sm mt-2">
                <p>Votre fichier avec les colonnes <strong>PRODUIT, CATEGORIE, CAISSE, DATE, VENDEUR, QUANTITE, MONTANT</strong> sera automatiquement reconnu et traité.</p>
                <p className="mt-2">Le système mappera automatiquement :</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 ml-4">
                  <div>• <strong>PRODUIT</strong> → Product</div>
                  <div>• <strong>CATEGORIE</strong> → Category</div>
                  <div>• <strong>CAISSE</strong> → Register</div>
                  <div>• <strong>VENDEUR</strong> → Seller</div>
                  <div>• <strong>QUANTITE</strong> → Quantity</div>
                  <div>• <strong>MONTANT</strong> → Amount (valeur totale)</div>
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
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Eye className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Aperçu de l'Import</h3>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Clear Summary - Number of rows, total amount, and total quantity */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Hash className="w-6 h-6 text-blue-400" />
                    <span className="text-blue-400 font-medium">Nouvelles Ventes</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{preview.data.length}</p>
                  <p className="text-blue-400 text-sm mt-1">Transactions à importer</p>
                </div>

                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    <span className="text-green-400 font-medium">Montant Total</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(preview.totals.overall.revenue)}
                  </p>
                  <p className="text-green-400 text-sm mt-1">Somme des montants</p>
                </div>

                <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Package className="w-6 h-6 text-purple-400" />
                    <span className="text-purple-400 font-medium">Quantité Totale</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{preview.totals.overall.quantity}</p>
                  <p className="text-purple-400 text-sm mt-1">Pour mise à jour stock</p>
                </div>

                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Copy className="w-6 h-6 text-orange-400" />
                    <span className="text-orange-400 font-medium">Doublons Détectés</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{preview.duplicates.length}</p>
                  <p className="text-orange-400 text-sm mt-1">Exclus automatiquement</p>
                </div>
              </div>

              {/* Duplicates Section */}
              {preview.duplicates.length > 0 && (
                <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Copy className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 font-medium">
                      Doublons Détectés ({preview.duplicates.length})
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">
                    Ces transactions ont été automatiquement exclues car elles correspondent exactement à des ventes déjà présentes :
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {preview.duplicates.slice(0, 5).map((duplicate, index) => (
                        <div key={index} className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-300">
                            <div><strong>Produit:</strong> {duplicate.product}</div>
                            <div><strong>Vendeur:</strong> {duplicate.seller}</div>
                            <div><strong>Quantité:</strong> {duplicate.quantity}</div>
                            <div><strong>Montant:</strong> {formatCurrency(duplicate.total)}</div>
                          </div>
                        </div>
                      ))}
                      {preview.duplicates.length > 5 && (
                        <div className="text-center text-orange-400 text-sm">
                          ... et {preview.duplicates.length - 5} autres doublons
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Breakdown by positive/negative */}
              {preview.data.some(sale => sale.total < 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Ventes Positives</span>
                    </div>
                    <div className="text-white">
                      <div className="text-2xl font-bold">
                        {preview.data.filter(sale => sale.total >= 0).length} lignes
                      </div>
                      <div className="text-green-400 font-semibold">
                        {formatCurrency(preview.data.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Remboursements</span>
                    </div>
                    <div className="text-white">
                      <div className="text-2xl font-bold">
                        {preview.data.filter(sale => sale.total < 0).length} lignes
                      </div>
                      <div className="text-red-400 font-semibold">
                        {formatCurrency(preview.data.filter(sale => sale.total < 0).reduce((sum, sale) => sum + sale.total, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="mb-6">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Erreurs détectées ({preview.errors.length})</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {preview.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm text-red-300 mb-1">
                          Ligne {error.row}: {error.message}
                        </div>
                      ))}
                      {preview.errors.length > 5 && (
                        <div className="text-sm text-red-400 mt-2">
                          ... et {preview.errors.length - 5} autres erreurs
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sample data preview */}
              {preview.data.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">
                    Aperçu des nouvelles données (premiers 5 éléments) :
                  </h4>
                  <div className="bg-gray-700/30 rounded-xl p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-400">Produit</th>
                          <th className="text-left py-2 text-gray-400">Catégorie</th>
                          <th className="text-center py-2 text-gray-400">Qté</th>
                          <th className="text-right py-2 text-gray-400">Montant</th>
                          <th className="text-left py-2 text-gray-400">Vendeur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.slice(0, 5).map((item, index) => (
                          <tr key={index} className="border-b border-gray-600/50">
                            <td className="py-2 text-white truncate max-w-32">{item.product}</td>
                            <td className="py-2 text-gray-300 truncate max-w-24">{item.category}</td>
                            <td className="py-2 text-center text-blue-400 font-medium">{item.quantity}</td>
                            <td className={`py-2 text-right font-semibold ${item.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(item.total)}
                            </td>
                            <td className="py-2 text-gray-300">{item.seller}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.data.length > 5 && (
                      <div className="text-center py-2 text-gray-400 text-sm">
                        ... et {preview.data.length - 5} autres lignes
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
                      <span>Importation...</span>
                    </>
                  ) : (
                    <span>
                      Confirmer l'Import ({preview.data.length} nouvelles ventes - {formatCurrency(preview.totals.overall.revenue)})
                      {preview.duplicates.length > 0 && ` • ${preview.duplicates.length} doublons exclus`}
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