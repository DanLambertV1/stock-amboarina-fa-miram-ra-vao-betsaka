import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { rebuildCleanDatabase } from '../utils/rebuildCleanDatabase';

interface RebuildDatabaseButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export function RebuildDatabaseButton({ onSuccess, className = '' }: RebuildDatabaseButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    summary: string;
    productsCreated: number;
    salesProcessed: number;
    errors: string[];
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleRebuild = async () => {
    if (isProcessing) return;
    
    if (!confirm('Cette opération va créer une version propre de votre base de données. Continuer ?')) {
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      const result = await rebuildCleanDatabase();
      setResult(result);
      setShowResult(true);
      
      if (result.success && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error rebuilding database:', error);
      setResult({
        success: false,
        summary: `Erreur lors de la reconstruction: ${error}`,
        productsCreated: 0,
        salesProcessed: 0,
        errors: [`${error}`]
      });
      setShowResult(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleRebuild}
        disabled={isProcessing}
        className={`bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                   py-3 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 flex items-center space-x-2 ${className}`}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Reconstruction en cours...</span>
          </>
        ) : (
          <>
            <Database className="w-5 h-5" />
            <span>Reconstruire Base Propre</span>
          </>
        )}
      </button>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && result && (
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
                    result.success 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {result.success ? 'Reconstruction Réussie' : 'Erreur de Reconstruction'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {result.success 
                        ? `${result.productsCreated} produits créés, ${result.salesProcessed} ventes traitées` 
                        : 'La reconstruction a échoué'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResult(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                  {result.summary}
                </pre>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                  <h4 className="text-red-400 font-medium mb-2">Erreurs ({result.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-red-300 text-sm mb-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                  <h4 className="text-green-400 font-medium mb-2">Collections créées</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium">products_clean</span>
                      <span className="text-gray-400">({result.productsCreated} produits uniques)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium">register_sales_clean</span>
                      <span className="text-gray-400">({result.salesProcessed} ventes nettoyées)</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowResult(false)}
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
    </>
  );
}