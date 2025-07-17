import { Product, RegisterSale } from '../types';
import { format, parseISO, isAfter, isBefore, startOfDay, isValid } from 'date-fns';

export interface StockCalculationResult {
  finalStock: number;
  validSales: RegisterSale[];
  ignoredSales: RegisterSale[];
  hasInconsistentStock: boolean;
  warningMessage?: string;
}

export interface StockValidationWarning {
  type: 'sales_before_stock_date' | 'no_initial_stock_date' | 'future_stock_date';
  message: string;
  severity: 'warning' | 'error' | 'info';
}

/**
 * Calculate final stock for a product considering initial stock date
 * Sales before the initial stock date are ignored in the calculation
 */
export function calculateStockFinal(
  product: Product, 
  allSales: RegisterSale[]
): StockCalculationResult {
  // Early return for performance if no sales
  if (allSales.length === 0) {
    return {
      finalStock: product.initialStock || 0,
      validSales: [],
      ignoredSales: [],
      hasInconsistentStock: false
    };
  }

  // Default values
  const initialStock = product.initialStock || 0;
  const initialStockDate = product.initialStockDate;
  
  // Find all sales for this product
  const productSales = findProductSalesOptimized(product, allSales);
  
  // Early return if no product sales found
  if (productSales.length === 0) {
    return {
      finalStock: initialStock,
      validSales: [],
      ignoredSales: [],
      hasInconsistentStock: false
    };
  }
  
  // If no initial stock date is set, use all sales (legacy behavior)
  if (!initialStockDate) {
    const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
    return {
      finalStock: Math.max(0, initialStock - totalSold),
      validSales: productSales,
      ignoredSales: [],
      hasInconsistentStock: false
    };
  }
  
  // Parse the initial stock date
  let stockDate: Date;
  try {
    stockDate = parseISO(initialStockDate);
    if (!isValid(stockDate)) {
      // Fallback to current date if invalid
      stockDate = new Date();
    }
  } catch (error) {
    // Fallback to current date if parsing fails
    stockDate = new Date();
  }
  
  const stockDateStart = startOfDay(stockDate);
  
  // Separate sales before and after the stock date
  const salesBeforeStockDate: RegisterSale[] = [];
  const salesAfterStockDate: RegisterSale[] = [];
  
  productSales.forEach(sale => {
    if (isBefore(sale.date, stockDateStart)) {
      salesBeforeStockDate.push(sale);
    } else {
      salesAfterStockDate.push(sale);
    }
  });
  
  // Calculate final stock using only sales after the stock date
  const validSoldQuantity = salesAfterStockDate.reduce((sum, sale) => sum + sale.quantity, 0);
  const finalStock = Math.max(0, initialStock - validSoldQuantity);
  
  // Determine if there are inconsistencies
  const hasInconsistentStock = salesBeforeStockDate.length > 0;
  let warningMessage: string | undefined;
  
  if (hasInconsistentStock) {
    const ignoredQuantity = salesBeforeStockDate.reduce((sum, sale) => sum + sale.quantity, 0);
    warningMessage = `${salesBeforeStockDate.length} vente(s) antérieure(s) à la date de stock (${ignoredQuantity} unités ignorées)`;
  }
  
  return {
    finalStock,
    validSales: salesAfterStockDate,
    ignoredSales: salesBeforeStockDate,
    hasInconsistentStock,
    warningMessage
  };
}

/**
 * Find all sales that match a specific product
 */
function findProductSalesOptimized(product: Product, allSales: RegisterSale[]): RegisterSale[] {
  const normalizeString = (str: string) => 
    str.toLowerCase().trim().replace(/\s+/g, ' ');

  const normalizedProductName = normalizeString(product.name);
  const normalizedProductCategory = normalizeString(product.category);
  
  // Create a product signature for faster matching
  const productSignature = `${normalizedProductName}|${normalizedProductCategory}`;

  // First pass: exact match using signature (much faster)
  const exactMatches = allSales.filter(sale => {
    const normalizedSaleName = normalizeString(sale.product);
    const normalizedSaleCategory = normalizeString(sale.category);
    const saleSignature = `${normalizedSaleName}|${normalizedSaleCategory}`;
    
    return saleSignature === productSignature;
  });
  
  // If we found exact matches, return them immediately
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Second pass: fuzzy match only if no exact matches found
  return allSales.filter(sale => {
    const normalizedSaleName = normalizeString(sale.product);
    const normalizedSaleCategory = normalizeString(sale.category);
    
    return normalizedSaleCategory === normalizedProductCategory && 
           (normalizedSaleName.includes(normalizedProductName) || 
            normalizedProductName.includes(normalizedSaleName));
  });
}

/**
 * Validate stock configuration and return warnings
 */
export function validateStockConfiguration(
  product: Product, 
  allSales: RegisterSale[]
): StockValidationWarning[] {
  const warnings: StockValidationWarning[] = [];
  
  // Check if initial stock date is set
  if (!product.initialStockDate) {
    warnings.push({
      type: 'no_initial_stock_date',
      message: 'Aucune date de stock initial définie - toutes les ventes sont prises en compte',
      severity: 'info'
    });
    return warnings;
  }
  
  // Check if stock date is in the future
  const stockDate = parseISO(product.initialStockDate);
  const today = new Date();
  
  if (isAfter(stockDate, today)) {
    warnings.push({
      type: 'future_stock_date',
      message: 'La date de stock initial est dans le futur',
      severity: 'warning'
    });
  }
  
  // Check for sales before stock date
  const productSales = findProductSales(product, allSales);
  const salesBeforeStockDate = productSales.filter(sale => 
    isBefore(sale.date, startOfDay(stockDate))
  );
  
  if (salesBeforeStockDate.length > 0) {
    const ignoredQuantity = salesBeforeStockDate.reduce((sum, sale) => sum + sale.quantity, 0);
    warnings.push({
      type: 'sales_before_stock_date',
      message: `${salesBeforeStockDate.length} vente(s) antérieure(s) détectée(s) (${ignoredQuantity} unités)`,
      severity: 'warning'
    });
  }
  
  return warnings;
}

/**
 * Calculate aggregated stock statistics for multiple products
 */
export function calculateAggregatedStockStats(
  products: Product[],
  allSales: RegisterSale[]
): {
  totalProducts: number;
  totalStock: number;
  totalSold: number;
  outOfStock: number;
  lowStock: number;
  inconsistentStock: number;
} {
  let totalStock = 0;
  let totalSold = 0;
  let outOfStock = 0;
  let lowStock = 0;
  let inconsistentStock = 0;
  
  products.forEach(product => {
    const calculation = calculateStockFinal(product, allSales);
    
    totalStock += calculation.finalStock;
    totalSold += calculation.validSales.reduce((sum, sale) => sum + sale.quantity, 0);
    
    if (calculation.finalStock === 0) {
      outOfStock++;
    } else if (calculation.finalStock <= product.minStock) {
      lowStock++;
    }
    
    if (calculation.hasInconsistentStock) {
      inconsistentStock++;
    }
  });
  
  return {
    totalProducts: products.length,
    totalStock,
    totalSold,
    outOfStock,
    lowStock,
    inconsistentStock
  };
}

/**
 * Get default initial stock date (today)
 */
export function getDefaultInitialStockDate(): string {
  try {
    return format(new Date(), 'yyyy-MM-dd');
  } catch (error) {
    // Fallback in case of error
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Format date for display
 */
export function formatStockDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy');
    }
    return dateString;
  } catch {
    return dateString;
  }
}