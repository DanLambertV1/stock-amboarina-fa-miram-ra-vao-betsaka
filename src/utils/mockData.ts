import { Product, Sale, Analytics, Alert } from '../types';
import { subDays, format } from 'date-fns';

export function generateMockData() {
  const products: Product[] = [
    {
      id: '1',
      name: 'MacBook Pro M2',
      price: 2499,
      stock: 15,
      category: 'Ordinateurs',
      minStock: 5,
      description: 'MacBook Pro 14" avec puce M2'
    },
    {
      id: '2',
      name: 'iPhone 15 Pro',
      price: 1199,
      stock: 3,
      category: 'Smartphones',
      minStock: 10,
      description: 'iPhone 15 Pro 128GB'
    },
    {
      id: '3',
      name: 'AirPods Pro',
      price: 279,
      stock: 25,
      category: 'Audio',
      minStock: 8,
      description: 'AirPods Pro avec réduction de bruit'
    },
    {
      id: '4',
      name: 'iPad Air',
      price: 699,
      stock: 12,
      category: 'Tablettes',
      minStock: 6,
      description: 'iPad Air 10.9" avec puce M1'
    },
    {
      id: '5',
      name: 'Apple Watch Series 9',
      price: 449,
      stock: 8,
      category: 'Wearables',
      minStock: 5,
      description: 'Apple Watch Series 9 45mm'
    }
  ];

  const sales: Sale[] = [
    {
      id: '1',
      date: new Date(),
      products: [
        { productId: '1', productName: 'MacBook Pro M2', quantity: 1, unitPrice: 2499, total: 2499 }
      ],
      total: 2499,
      customerName: 'Jean Dupont',
      paymentMethod: 'card',
      status: 'completed'
    },
    {
      id: '2',
      date: subDays(new Date(), 1),
      products: [
        { productId: '2', productName: 'iPhone 15 Pro', quantity: 2, unitPrice: 1199, total: 2398 },
        { productId: '3', productName: 'AirPods Pro', quantity: 1, unitPrice: 279, total: 279 }
      ],
      total: 2677,
      customerName: 'Marie Martin',
      paymentMethod: 'card',
      status: 'completed'
    }
  ];

  const salesTrend = Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'dd/MM'),
    sales: Math.floor(Math.random() * 20) + 5,
    revenue: Math.floor(Math.random() * 50000) + 10000
  }));

  const analytics: Analytics = {
    totalSales: 156,
    totalRevenue: 487650,
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock <= p.minStock).length,
    salesTrend,
    topProducts: [
      { name: 'iPhone 15 Pro', sales: 45, revenue: 53955 },
      { name: 'MacBook Pro M2', sales: 32, revenue: 79968 },
      { name: 'AirPods Pro', sales: 28, revenue: 7812 },
      { name: 'iPad Air', sales: 22, revenue: 15378 },
      { name: 'Apple Watch Series 9', sales: 18, revenue: 8082 }
    ]
  };

  const alerts: Alert[] = [
    {
      id: '1',
      type: 'low-stock',
      message: 'Stock faible pour iPhone 15 Pro (3 unités restantes)',
      severity: 'warning',
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      type: 'high-sales',
      message: 'Ventes exceptionnelles aujourd\'hui (+25% par rapport à hier)',
      severity: 'info',
      timestamp: subDays(new Date(), 1),
      read: false
    }
  ];

  return { products, sales, analytics, alerts };
}