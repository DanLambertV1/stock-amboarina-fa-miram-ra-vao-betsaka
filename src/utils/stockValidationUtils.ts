import { Product } from '../types';
import { parseISO, isValid } from 'date-fns';

export interface StockValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  cleanedData: any[];
  duplicates: DuplicateInfo[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'critical' | 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
  autoFix?: boolean;
  fixedValue?: any;
}

export interface ValidationSuggestion {
  type: 'format' | 'naming' | 'data' | 'structure';
  message: string;
  impact: 'high' | 'medium' | 'low';
  autoApplicable: boolean;
}

export interface DuplicateInfo {
  rows: number[];
  product: string;
  category: string;
  conflictType: 'exact' | 'similar' | 'price_conflict';
  recommendation: string;
}

export interface ValidationStatistics {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
  categoriesFound: string[];
  priceRange: { min: number; max: number; average: number };
  stockRange: { min: number; max: number; total: number };
}

// Configuration de validation intelligente
const VALIDATION_CONFIG = {
  price: {
    min: 0.01,
    max: 100000,
    warningThreshold: 10000
  },
  stock: {
    min: 0,
    max: 999999,
    warningThreshold: 1000
  },
  name: {
    minLength: 2,
    maxLength: 100,
    forbiddenChars: /[<>{}[\]\\]/g
  },
  category: {
    minLength: 2,
    maxLength: 50,
    commonCategories: [
      'CONFISERIES', 'BOISSONS', 'ALIMENTAIRE', 'GRATTAGE', 'FDJ',
      'TABAC', 'HYGIENE', 'ENTRETIEN', 'DIVERS'
    ]
  }
};

// Normalisation intelligente des noms de colonnes
function normalizeColumnName(name: string): string {
  const cleaned = name.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const lowerCleaned = cleaned.toLowerCase();
  
  const mappings: { [key: string]: string } = {
    // Nom du produit
    'product': 'name',
    'produit': 'name',
    'article': 'name',
    'nom': 'name',
    'name': 'name',
    'designation': 'name',
    'libelle': 'name',
    
    // Catégorie
    'category': 'category',
    'categorie': 'category',
    'type': 'category',
    'famille': 'category',
    'group': 'category',
    'groupe': 'category',
    
    // Prix
    'price': 'price',
    'prix': 'price',
    'montant': 'price',
    'tarif': 'price',
    'cout': 'price',
    'cost': 'price',
    'value': 'price',
    'valeur': 'price',
    
    // Stock
    'stock': 'stock',
    'quantity': 'stock',
    'quantite': 'stock',
    'qty': 'stock',
    'qte': 'stock',
    'inventaire': 'stock',
    'disponible': 'stock',
    
    // Stock minimum
    'minstock': 'minStock',
    'stockmin': 'minStock',
    'minimum': 'minStock',
    'seuil': 'minStock',
    'alerte': 'minStock',
    
    // Description
    'description': 'description',
    'desc': 'description',
    'details': 'description',
    'commentaire': 'description',
    'note': 'description',
    'remarque': 'description'
  };
  
  // Correspondance exacte
  if (mappings[lowerCleaned]) {
    return mappings[lowerCleaned];
  }
  
  // Correspondance partielle
  for (const [key, value] of Object.entries(mappings)) {
    if (lowerCleaned.includes(key) || key.includes(lowerCleaned)) {
      return value;
    }
  }
  
  return cleaned;
}

// Validation intelligente du prix
function validatePrice(value: any, row: number): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[]; cleanedValue?: number } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!value || value === '') {
    errors.push({
      row,
      field: 'price',
      value,
      message: 'Le prix est obligatoire',
      severity: 'critical',
      suggestion: 'Ajoutez un prix valide (ex: 1.50)'
    });
    return { isValid: false, errors, warnings };
  }
  
  // Nettoyage du prix
  let cleaned = value.toString().trim();
  cleaned = cleaned.replace(/[€$£¥₹]/g, ''); // Supprimer symboles monétaires
  cleaned = cleaned.replace(/\s/g, ''); // Supprimer espaces
  cleaned = cleaned.replace(',', '.'); // Format français vers anglais
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    errors.push({
      row,
      field: 'price',
      value,
      message: 'Format de prix invalide',
      severity: 'error',
      suggestion: 'Utilisez un format numérique (ex: 1.50, 2,30)'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed < VALIDATION_CONFIG.price.min) {
    errors.push({
      row,
      field: 'price',
      value,
      message: `Prix trop bas (minimum: ${VALIDATION_CONFIG.price.min}€)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed > VALIDATION_CONFIG.price.max) {
    errors.push({
      row,
      field: 'price',
      value,
      message: `Prix trop élevé (maximum: ${VALIDATION_CONFIG.price.max}€)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed > VALIDATION_CONFIG.price.warningThreshold) {
    warnings.push({
      row,
      field: 'price',
      value,
      message: `Prix élevé détecté (${parsed}€) - Vérifiez la valeur`,
      autoFix: false
    });
  }
  
  // Arrondir à 2 décimales
  const rounded = Math.round(parsed * 100) / 100;
  if (rounded !== parsed) {
    warnings.push({
      row,
      field: 'price',
      value,
      message: `Prix arrondi à 2 décimales`,
      autoFix: true,
      fixedValue: rounded
    });
  }
  
  return { isValid: true, errors, warnings, cleanedValue: rounded };
}

// Validation intelligente du stock
function validateStock(value: any, row: number): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[]; cleanedValue?: number } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (value === '' || value === null || value === undefined) {
    // Stock par défaut à 0 si non spécifié
    warnings.push({
      row,
      field: 'stock',
      value,
      message: 'Stock non spécifié, défini à 0 par défaut',
      autoFix: true,
      fixedValue: 0
    });
    return { isValid: true, errors, warnings, cleanedValue: 0 };
  }
  
  const parsed = parseInt(value.toString().trim());
  
  if (isNaN(parsed)) {
    errors.push({
      row,
      field: 'stock',
      value,
      message: 'Quantité de stock invalide',
      severity: 'error',
      suggestion: 'Utilisez un nombre entier (ex: 10, 25)'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed < VALIDATION_CONFIG.stock.min) {
    errors.push({
      row,
      field: 'stock',
      value,
      message: `Stock négatif non autorisé`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed > VALIDATION_CONFIG.stock.max) {
    errors.push({
      row,
      field: 'stock',
      value,
      message: `Stock trop élevé (maximum: ${VALIDATION_CONFIG.stock.max})`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (parsed > VALIDATION_CONFIG.stock.warningThreshold) {
    warnings.push({
      row,
      field: 'stock',
      value,
      message: `Stock très élevé détecté (${parsed}) - Vérifiez la valeur`,
      autoFix: false
    });
  }
  
  return { isValid: true, errors, warnings, cleanedValue: parsed };
}

// Validation intelligente du nom
function validateName(value: any, row: number): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[]; cleanedValue?: string } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!value || value.toString().trim() === '') {
    errors.push({
      row,
      field: 'name',
      value,
      message: 'Le nom du produit est obligatoire',
      severity: 'critical'
    });
    return { isValid: false, errors, warnings };
  }
  
  let cleaned = value.toString().trim();
  
  // Supprimer caractères interdits
  if (VALIDATION_CONFIG.name.forbiddenChars.test(cleaned)) {
    const original = cleaned;
    cleaned = cleaned.replace(VALIDATION_CONFIG.name.forbiddenChars, '');
    warnings.push({
      row,
      field: 'name',
      value,
      message: 'Caractères spéciaux supprimés du nom',
      autoFix: true,
      fixedValue: cleaned
    });
  }
  
  // Normaliser espaces multiples
  if (/\s{2,}/.test(cleaned)) {
    cleaned = cleaned.replace(/\s+/g, ' ');
    warnings.push({
      row,
      field: 'name',
      value,
      message: 'Espaces multiples normalisés',
      autoFix: true,
      fixedValue: cleaned
    });
  }
  
  if (cleaned.length < VALIDATION_CONFIG.name.minLength) {
    errors.push({
      row,
      field: 'name',
      value,
      message: `Nom trop court (minimum: ${VALIDATION_CONFIG.name.minLength} caractères)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (cleaned.length > VALIDATION_CONFIG.name.maxLength) {
    errors.push({
      row,
      field: 'name',
      value,
      message: `Nom trop long (maximum: ${VALIDATION_CONFIG.name.maxLength} caractères)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  return { isValid: true, errors, warnings, cleanedValue: cleaned };
}

// Validation intelligente de la catégorie
function validateCategory(value: any, row: number): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[]; cleanedValue?: string } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!value || value.toString().trim() === '') {
    errors.push({
      row,
      field: 'category',
      value,
      message: 'La catégorie est obligatoire',
      severity: 'critical',
      suggestion: 'Utilisez une catégorie comme: CONFISERIES, BOISSONS, ALIMENTAIRE'
    });
    return { isValid: false, errors, warnings };
  }
  
  let cleaned = value.toString().trim().toUpperCase();
  
  // Normaliser espaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  if (cleaned.length < VALIDATION_CONFIG.category.minLength) {
    errors.push({
      row,
      field: 'category',
      value,
      message: `Catégorie trop courte (minimum: ${VALIDATION_CONFIG.category.minLength} caractères)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (cleaned.length > VALIDATION_CONFIG.category.maxLength) {
    errors.push({
      row,
      field: 'category',
      value,
      message: `Catégorie trop longue (maximum: ${VALIDATION_CONFIG.category.maxLength} caractères)`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }
  
  // Suggestion de catégorie commune
  const similarCategory = VALIDATION_CONFIG.category.commonCategories.find(cat => 
    cat.includes(cleaned) || cleaned.includes(cat) || 
    levenshteinDistance(cat, cleaned) <= 2
  );
  
  if (similarCategory && similarCategory !== cleaned) {
    warnings.push({
      row,
      field: 'category',
      value,
      message: `Catégorie similaire suggérée: "${similarCategory}"`,
      autoFix: true,
      fixedValue: similarCategory
    });
  }
  
  return { isValid: true, errors, warnings, cleanedValue: cleaned };
}

// Calcul de distance de Levenshtein pour suggestions
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Détection intelligente des doublons
function detectDuplicates(data: any[]): DuplicateInfo[] {
  const duplicates: DuplicateInfo[] = [];
  const seen = new Map<string, number[]>();
  
  data.forEach((row, index) => {
    if (!row.name || !row.category) return;
    
    const key = `${row.name.toLowerCase().trim()}|${row.category.toLowerCase().trim()}`;
    
    if (seen.has(key)) {
      const existingRows = seen.get(key)!;
      const existingRow = data[existingRows[0]];
      
      // Déterminer le type de conflit
      let conflictType: 'exact' | 'similar' | 'price_conflict' = 'exact';
      let recommendation = 'Supprimer le doublon';
      
      if (existingRow.price !== row.price) {
        conflictType = 'price_conflict';
        recommendation = `Conflit de prix: ${existingRow.price}€ vs ${row.price}€ - Vérifier manuellement`;
      }
      
      // Ajouter ou mettre à jour le doublon
      const existingDuplicate = duplicates.find(d => d.rows.includes(existingRows[0]));
      if (existingDuplicate) {
        existingDuplicate.rows.push(index + 2); // +2 pour numéro de ligne Excel
      } else {
        duplicates.push({
          rows: [...existingRows.map(r => r + 2), index + 2],
          product: row.name,
          category: row.category,
          conflictType,
          recommendation
        });
      }
      
      existingRows.push(index);
    } else {
      seen.set(key, [index]);
    }
  });
  
  return duplicates;
}

// Fonction principale de validation intelligente
export function validateStockData(rawData: any[], existingProducts: Product[] = []): StockValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];
  const cleanedData: any[] = [];
  
  console.log('🔍 Démarrage de la validation intelligente des données Stock...');
  
  if (rawData.length === 0) {
    errors.push({
      row: 0,
      field: 'structure',
      value: null,
      message: 'Aucune donnée trouvée dans le fichier',
      severity: 'critical'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      suggestions,
      cleanedData: [],
      duplicates: [],
      statistics: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        warningRows: 0,
        duplicateRows: 0,
        categoriesFound: [],
        priceRange: { min: 0, max: 0, average: 0 },
        stockRange: { min: 0, max: 0, total: 0 }
      }
    };
  }
  
  // Analyser la structure des colonnes
  const firstRow = rawData[0];
  const rawColumns = Object.keys(firstRow).filter(key => key !== '_rowIndex');
  const normalizedColumns = rawColumns.map(col => normalizeColumnName(col));
  
  console.log('📋 Colonnes détectées:', rawColumns);
  console.log('🔄 Colonnes normalisées:', normalizedColumns);
  
  // Vérifier les colonnes obligatoires
  const requiredFields = ['name', 'category', 'price'];
  const missingFields = requiredFields.filter(field => !normalizedColumns.includes(field));
  
  if (missingFields.length > 0) {
    errors.push({
      row: 1,
      field: 'structure',
      value: missingFields,
      message: `Colonnes obligatoires manquantes: ${missingFields.join(', ')}`,
      severity: 'critical',
      suggestion: 'Ajoutez les colonnes: Nom/Produit, Catégorie, Prix'
    });
  }
  
  // Créer le mapping des colonnes
  const columnMapping: { [key: string]: string } = {};
  rawColumns.forEach((rawCol, index) => {
    columnMapping[normalizedColumns[index]] = rawCol;
  });
  
  // Suggestions d'amélioration de structure
  if (!normalizedColumns.includes('stock')) {
    suggestions.push({
      type: 'structure',
      message: 'Colonne "Stock" manquante - Les quantités seront définies à 0 par défaut',
      impact: 'medium',
      autoApplicable: true
    });
  }
  
  if (!normalizedColumns.includes('minStock')) {
    suggestions.push({
      type: 'structure',
      message: 'Colonne "Stock Minimum" manquante - Sera calculé automatiquement (20% du stock)',
      impact: 'low',
      autoApplicable: true
    });
  }
  
  // Validation ligne par ligne
  const validRows: any[] = [];
  const prices: number[] = [];
  const stocks: number[] = [];
  const categories = new Set<string>();
  
  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 pour numéro de ligne Excel
    const cleanedRow: any = { _originalRow: rowNumber };
    let rowValid = true;
    let hasWarnings = false;
    
    // Validation du nom
    if (columnMapping.name) {
      const nameValidation = validateName(row[columnMapping.name], rowNumber);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
        rowValid = false;
      } else {
        cleanedRow.name = nameValidation.cleanedValue;
        warnings.push(...nameValidation.warnings);
        if (nameValidation.warnings.length > 0) hasWarnings = true;
      }
    }
    
    // Validation de la catégorie
    if (columnMapping.category) {
      const categoryValidation = validateCategory(row[columnMapping.category], rowNumber);
      if (!categoryValidation.isValid) {
        errors.push(...categoryValidation.errors);
        rowValid = false;
      } else {
        cleanedRow.category = categoryValidation.cleanedValue;
        categories.add(categoryValidation.cleanedValue!);
        warnings.push(...categoryValidation.warnings);
        if (categoryValidation.warnings.length > 0) hasWarnings = true;
      }
    }
    
    // Validation du prix
    if (columnMapping.price) {
      const priceValidation = validatePrice(row[columnMapping.price], rowNumber);
      if (!priceValidation.isValid) {
        errors.push(...priceValidation.errors);
        rowValid = false;
      } else {
        cleanedRow.price = priceValidation.cleanedValue;
        prices.push(priceValidation.cleanedValue!);
        warnings.push(...priceValidation.warnings);
        if (priceValidation.warnings.length > 0) hasWarnings = true;
      }
    }
    
    // Validation du stock (optionnel)
    if (columnMapping.stock) {
      const stockValidation = validateStock(row[columnMapping.stock], rowNumber);
      if (!stockValidation.isValid) {
        errors.push(...stockValidation.errors);
        rowValid = false;
      } else {
        cleanedRow.stock = stockValidation.cleanedValue;
        stocks.push(stockValidation.cleanedValue!);
        warnings.push(...stockValidation.warnings);
        if (stockValidation.warnings.length > 0) hasWarnings = true;
      }
    } else {
      cleanedRow.stock = 0;
      stocks.push(0);
    }
    
    // Stock minimum (optionnel, calculé automatiquement)
    if (columnMapping.minStock) {
      const minStockValidation = validateStock(row[columnMapping.minStock], rowNumber);
      if (minStockValidation.isValid) {
        cleanedRow.minStock = minStockValidation.cleanedValue;
      } else {
        cleanedRow.minStock = Math.max(Math.ceil(cleanedRow.stock * 0.2), 5);
      }
    } else {
      cleanedRow.minStock = Math.max(Math.ceil(cleanedRow.stock * 0.2), 5);
    }
    
    // Description (optionnel)
    if (columnMapping.description) {
      cleanedRow.description = row[columnMapping.description]?.toString().trim() || '';
    } else {
      cleanedRow.description = '';
    }
    
    if (rowValid) {
      validRows.push(cleanedRow);
      cleanedData.push(cleanedRow);
    }
  });
  
  // Détection des doublons
  const duplicates = detectDuplicates(cleanedData);
  
  // Vérification contre les produits existants
  const existingProductNames = new Set(
    existingProducts.map(p => `${p.name.toLowerCase().trim()}|${p.category.toLowerCase().trim()}`)
  );
  
  cleanedData.forEach((row, index) => {
    const key = `${row.name.toLowerCase().trim()}|${row.category.toLowerCase().trim()}`;
    if (existingProductNames.has(key)) {
      warnings.push({
        row: row._originalRow,
        field: 'name',
        value: row.name,
        message: 'Produit déjà existant dans le stock - Sera ignoré lors de l\'import',
        autoFix: false
      });
    }
  });
  
  // Calcul des statistiques
  const statistics: ValidationStatistics = {
    totalRows: rawData.length,
    validRows: validRows.length,
    errorRows: rawData.length - validRows.length,
    warningRows: warnings.length,
    duplicateRows: duplicates.reduce((sum, dup) => sum + dup.rows.length, 0),
    categoriesFound: Array.from(categories),
    priceRange: prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((sum, p) => sum + p, 0) / prices.length
    } : { min: 0, max: 0, average: 0 },
    stockRange: stocks.length > 0 ? {
      min: Math.min(...stocks),
      max: Math.max(...stocks),
      total: stocks.reduce((sum, s) => sum + s, 0)
    } : { min: 0, max: 0, total: 0 }
  };
  
  // Suggestions intelligentes basées sur l'analyse
  if (statistics.categoriesFound.length > 10) {
    suggestions.push({
      type: 'data',
      message: `Beaucoup de catégories détectées (${statistics.categoriesFound.length}) - Considérez une standardisation`,
      impact: 'medium',
      autoApplicable: false
    });
  }
  
  if (statistics.priceRange.max > 1000) {
    suggestions.push({
      type: 'data',
      message: 'Prix élevés détectés - Vérifiez les unités (€ vs centimes)',
      impact: 'high',
      autoApplicable: false
    });
  }
  
  if (duplicates.length > 0) {
    suggestions.push({
      type: 'data',
      message: `${duplicates.length} doublons détectés - Nettoyage recommandé avant import`,
      impact: 'high',
      autoApplicable: true
    });
  }
  
  console.log('✅ Validation terminée:', {
    totalRows: statistics.totalRows,
    validRows: statistics.validRows,
    errors: errors.length,
    warnings: warnings.length,
    duplicates: duplicates.length
  });
  
  return {
    isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0,
    errors,
    warnings,
    suggestions,
    cleanedData,
    duplicates,
    statistics
  };
}