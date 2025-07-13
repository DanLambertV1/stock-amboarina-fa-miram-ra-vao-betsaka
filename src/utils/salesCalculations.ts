import { RegisterSale } from '../types';

/**
 * Calculate the total quantity sold across all sales
 * This function is used by both Stock and Sales modules to ensure consistent calculations
 */
export function calculateTotalQuantitySold(sales: RegisterSale[]): number {
  return sales.reduce((sum, sale) => sum + sale.quantity, 0);
}

/**
 * Calculate the total revenue from all sales
 */
export function calculateTotalRevenue(sales: RegisterSale[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

/**
 * Calculate the average ticket value
 */
export function calculateAverageTicket(sales: RegisterSale[]): number {
  if (sales.length === 0) return 0;
  return calculateTotalRevenue(sales) / sales.length;
}

/**
 * Get unique categories from sales
 */
export function getUniqueCategories(sales: RegisterSale[]): string[] {
  return [...new Set(sales.map(sale => sale.category))];
}

/**
 * Get unique sellers from sales
 */
export function getUniqueSellers(sales: RegisterSale[]): string[] {
  return [...new Set(sales.map(sale => sale.seller))];
}

/**
 * Get unique registers from sales
 */
export function getUniqueRegisters(sales: RegisterSale[]): string[] {
  return [...new Set(sales.map(sale => sale.register))];
}