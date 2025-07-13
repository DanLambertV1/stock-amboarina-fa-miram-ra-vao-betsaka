import { Product, RegisterSale } from '../types';
import { startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  category: string;
  type: 'sale' | 'import' | 'adjustment' | 'initial';
  quantity: number; // Positive for additions, negative for sales
  date: Date;
  reference?: string; // Sale ID, import batch ID, etc.
  description?: string;
}

export interface HistoricalStockState {
  productId: string;
  productName: string;
  category: string;
  stockAtDate: number;
  initialStock: number;
  totalSold: number;
  totalAdded: number;
  lastMovementDate?: Date;
  movements: StockMovement[];
}

export interface HistoricalStockSummary {
  totalProducts: number;
  totalStock: number;
  productsSold: number; // Total quantity sold in the period
  outOfStockItems: number;
  lowStockItems: number;
  stockByCategory: { [category: string]: number };
  movementsSummary: {
    totalSales: number;
    totalImports: number;
    totalAdjustments: number;
  };
}

/**
 * Generate stock movements from current data
 * This reconstructs the movement history from sales and current stock
 */
export function generateStockMovements(
  products: Product[],
  sales: RegisterSale[]
): StockMovement[] {
  const movements: StockMovement[] = [];

  // Create initial stock movements for each product
  products.forEach(product => {
    if (product.initialStock && product.initialStock > 0) {
      movements.push({
        id: `initial-${product.id}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        type: 'initial',
        quantity: product.initialStock,
        date: new Date(2024, 0, 1), // Default initial date
        description: 'Stock initial'
      });
    }
  });

  // Create sale movements (negative quantities)
  sales.forEach(sale => {
    // Find matching product
    const product = products.find(p => 
      p.name.toLowerCase().trim() === sale.product.toLowerCase().trim() &&
      p.category.toLowerCase().trim() === sale.category.toLowerCase().trim()
    );

    if (product) {
      movements.push({
        id: `sale-${sale.id}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        type: 'sale',
        quantity: -sale.quantity, // Negative for sales
        date: sale.date,
        reference: sale.id,
        description: `Vente - ${sale.seller} (${sale.register})`
      });
    }
  });

  // Sort movements by date
  movements.sort((a, b) => a.date.getTime() - b.date.getTime());

  return movements;
}

/**
 * Calculate historical stock state for a specific date
 */
export function calculateHistoricalStock(
  products: Product[],
  movements: StockMovement[],
  targetDate: Date
): HistoricalStockState[] {
  const endOfTargetDate = endOfDay(targetDate);
  const historicalStates: HistoricalStockState[] = [];

  products.forEach(product => {
    // Get all movements for this product up to the target date
    const productMovements = movements.filter(movement => 
      movement.productId === product.id &&
      isBefore(movement.date, endOfTargetDate) || 
      movement.date.getTime() === endOfTargetDate.getTime()
    );

    // Calculate stock at the target date
    let stockAtDate = 0;
    let totalSold = 0;
    let totalAdded = 0;
    let lastMovementDate: Date | undefined;

    productMovements.forEach(movement => {
      if (movement.quantity > 0) {
        totalAdded += movement.quantity;
        stockAtDate += movement.quantity;
      } else {
        totalSold += Math.abs(movement.quantity);
        stockAtDate += movement.quantity; // Already negative
      }
      
      if (!lastMovementDate || movement.date > lastMovementDate) {
        lastMovementDate = movement.date;
      }
    });

    // Ensure stock doesn't go negative
    stockAtDate = Math.max(0, stockAtDate);

    historicalStates.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      stockAtDate,
      initialStock: product.initialStock || 0,
      totalSold,
      totalAdded,
      lastMovementDate,
      movements: productMovements
    });
  });

  return historicalStates;
}

/**
 * Calculate summary statistics for historical stock
 */
export function calculateHistoricalSummary(
  historicalStates: HistoricalStockState[],
  products: Product[],
  startDate?: Date,
  endDate?: Date
): HistoricalStockSummary {
  const totalProducts = historicalStates.length;
  const totalStock = historicalStates.reduce((sum, state) => sum + state.stockAtDate, 0);
  
  // Calculate products sold in the specific period (if dates provided)
  let productsSold = 0;
  let totalSales = 0;
  let totalImports = 0;
  let totalAdjustments = 0;

  if (startDate && endDate) {
    const startOfPeriod = startOfDay(startDate);
    const endOfPeriod = endOfDay(endDate);

    historicalStates.forEach(state => {
      const periodMovements = state.movements.filter(movement =>
        isAfter(movement.date, startOfPeriod) && 
        (isBefore(movement.date, endOfPeriod) || movement.date.getTime() === endOfPeriod.getTime())
      );

      periodMovements.forEach(movement => {
        if (movement.type === 'sale') {
          productsSold += Math.abs(movement.quantity);
          totalSales += Math.abs(movement.quantity);
        } else if (movement.type === 'import' || movement.type === 'initial') {
          totalImports += movement.quantity;
        } else if (movement.type === 'adjustment') {
          totalAdjustments += Math.abs(movement.quantity);
        }
      });
    });
  } else {
    // If no period specified, use total sold from historical states
    productsSold = historicalStates.reduce((sum, state) => sum + state.totalSold, 0);
    totalSales = productsSold;
  }

  // Count out of stock and low stock items
  const outOfStockItems = historicalStates.filter(state => state.stockAtDate === 0).length;
  
  const lowStockItems = historicalStates.filter(state => {
    const product = products.find(p => p.id === state.productId);
    return product && state.stockAtDate > 0 && state.stockAtDate <= product.minStock;
  }).length;

  // Group stock by category
  const stockByCategory: { [category: string]: number } = {};
  historicalStates.forEach(state => {
    if (!stockByCategory[state.category]) {
      stockByCategory[state.category] = 0;
    }
    stockByCategory[state.category] += state.stockAtDate;
  });

  return {
    totalProducts,
    totalStock,
    productsSold,
    outOfStockItems,
    lowStockItems,
    stockByCategory,
    movementsSummary: {
      totalSales,
      totalImports,
      totalAdjustments
    }
  };
}

/**
 * Get stock movements for a specific period
 */
export function getMovementsInPeriod(
  movements: StockMovement[],
  startDate: Date,
  endDate: Date
): StockMovement[] {
  const startOfPeriod = startOfDay(startDate);
  const endOfPeriod = endOfDay(endDate);

  return movements.filter(movement =>
    isAfter(movement.date, startOfPeriod) && 
    (isBefore(movement.date, endOfPeriod) || movement.date.getTime() === endOfPeriod.getTime())
  ).sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Reconstruct stock timeline for a product
 */
export function getProductStockTimeline(
  productId: string,
  movements: StockMovement[],
  startDate: Date,
  endDate: Date
): Array<{ date: Date; stock: number; movement?: StockMovement }> {
  const productMovements = movements
    .filter(m => m.productId === productId)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const timeline: Array<{ date: Date; stock: number; movement?: StockMovement }> = [];
  let currentStock = 0;

  // Calculate initial stock at start date
  const movementsBeforeStart = productMovements.filter(m => 
    isBefore(m.date, startOfDay(startDate))
  );
  
  movementsBeforeStart.forEach(movement => {
    currentStock += movement.quantity;
  });

  // Add starting point
  timeline.push({
    date: startOfDay(startDate),
    stock: Math.max(0, currentStock)
  });

  // Process movements in the period
  const movementsInPeriod = productMovements.filter(m =>
    isAfter(m.date, startOfDay(startDate)) && 
    (isBefore(m.date, endOfDay(endDate)) || m.date.getTime() === endOfDay(endDate).getTime())
  );

  movementsInPeriod.forEach(movement => {
    currentStock += movement.quantity;
    timeline.push({
      date: movement.date,
      stock: Math.max(0, currentStock),
      movement
    });
  });

  return timeline;
}

/**
 * Validate stock consistency
 */
export function validateStockConsistency(
  products: Product[],
  movements: StockMovement[]
): Array<{ productId: string; productName: string; issue: string; currentStock: number; calculatedStock: number }> {
  const issues: Array<{ productId: string; productName: string; issue: string; currentStock: number; calculatedStock: number }> = [];

  products.forEach(product => {
    const productMovements = movements.filter(m => m.productId === product.id);
    
    let calculatedStock = 0;
    productMovements.forEach(movement => {
      calculatedStock += movement.quantity;
    });
    
    calculatedStock = Math.max(0, calculatedStock);

    if (Math.abs(calculatedStock - product.stock) > 0.01) { // Allow for small rounding differences
      issues.push({
        productId: product.id,
        productName: product.name,
        issue: 'Stock calculé ne correspond pas au stock actuel',
        currentStock: product.stock,
        calculatedStock
      });
    }
  });

  return issues;
}