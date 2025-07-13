import { useState, useEffect } from 'react';
import { Product, Sale, Analytics, Alert } from '../types';
import { generateMockData } from '../utils/mockData';

export function useData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => {
      const mockData = generateMockData();
      setProducts(mockData.products);
      setSales(mockData.sales);
      setAnalytics(mockData.analytics);
      setAlerts(mockData.alerts);
      setLoading(false);
    }, 1000);
  }, []);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addSale = (sale: Omit<Sale, 'id'>) => {
    const newSale: Sale = {
      ...sale,
      id: Math.random().toString(36).substr(2, 9),
    };
    setSales(prev => [newSale, ...prev]);
    
    // Mettre à jour le stock
    sale.products.forEach(item => {
      updateProduct(item.productId, {
        stock: products.find(p => p.id === item.productId)!.stock - item.quantity
      });
    });
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  return {
    products,
    sales,
    analytics,
    alerts,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addSale,
    markAlertAsRead,
  };
}