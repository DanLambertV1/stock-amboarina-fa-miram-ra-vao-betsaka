export interface RegisterSale {
  id: string;
  product: string;
  category: string;
  register: string;
  date: Date;
  seller: string;
  quantity: number;
  price: number;
  total: number;
  created_at?: Date;
}

export interface ImportPreview {
  data: RegisterSale[];
  duplicates: RegisterSale[];
  errors: ImportError[];
  totals: {
    byProduct: { [key: string]: { quantity: number; revenue: number } };
    bySeller: { [key: string]: { quantity: number; revenue: number } };
    byRegister: { [key: string]: { quantity: number; revenue: number } };
    overall: { quantity: number; revenue: number };
  };
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number; // Final quantity (calculated)
  initialStock?: number; // Initial quantity from stock import
  initialStockDate?: string; // Effective date for initial stock (YYYY-MM-DD)
  quantitySold?: number; // Quantity sold from sales import
  minStock: number;
  description?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  activeRegisters: number;
  topProducts: { product: string; quantity: number; revenue: number }[];
  topSellers: { seller: string; quantity: number; revenue: number }[];
  registerPerformance: { register: string; quantity: number; revenue: number }[];
  dailyTrend: { date: string; quantity: number; revenue: number }[];
}

export interface Alert {
  id: string;
  type: 'low-stock' | 'high-sales' | 'system' | 'duplicate';
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}