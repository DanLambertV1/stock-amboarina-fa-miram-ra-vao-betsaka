import { Product, RegisterSale } from '../types';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

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
  // Default values
  const initialStock = product.initialStock || 0;
  const initialStockDate = product.initialStockDate;
  
  // Find all sales for this product
  const productSales = findProductSales(product, allSales);
  
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
  const stockDate = parseISO(initialStockDate);
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
function findProductSales(product: Product, allSales: RegisterSale[]): RegisterSale[] {
  const normalizeString = (str: string) => 
    str.toLowerCase().trim().replace(/\s+/g, ' ');

  const normalizedProductName = normalizeString(product.name);
  const normalizedProductCategory = normalizeString(product.category);

  return allSales.filter(sale => {
    const normalizedSaleName = normalizeString(sale.product);
    const normalizedSaleCategory = normalizeString(sale.category);
    
    // Exact match first
    if (normalizedSaleName === normalizedProductName && 
        normalizedSaleCategory === normalizedProductCategory) {
      return true;
    }
    
    // Fuzzy match for similar names in same category
    if (normalizedSaleCategory === normalizedProductCategory) {
      return normalizedSaleName.includes(normalizedProductName) || 
             normalizedProductName.includes(normalizedSaleName);
    }
    
    return false;
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
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format date for display
 */
export function formatStockDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}