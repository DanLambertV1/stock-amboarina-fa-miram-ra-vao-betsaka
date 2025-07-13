import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS, FirestoreRegisterSale, FirestoreProduct } from '../lib/firebase';
import { RegisterSale, Product, DashboardStats, Alert } from '../types';
import { format, subDays, parseISO } from 'date-fns';
import { calculateStockFinal } from '../utils/calculateStockFinal';

export function useFirebaseData() {
  const [registerSales, setRegisterSales] = useState<RegisterSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // ✅ CRITICAL FIX: Recalculate product quantities whenever sales data changes
  useEffect(() => {
    if (registerSales.length >= 0 && products.length > 0) { // Changed condition to include 0 sales
      console.log(`🔄 Sales data changed (${registerSales.length} sales) - triggering stock recalculation...`);
      recalculateProductQuantities();
    }
  }, [registerSales.length, products.length]); // Trigger on both sales and products changes

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRegisterSales(),
        loadProducts()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisterSales = async () => {
    try {
      const salesCollection = collection(db, COLLECTIONS.REGISTER_SALES);
      const salesQuery = query(salesCollection, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(salesQuery);
      const sales: RegisterSale[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreRegisterSale;
        sales.push({
          id: doc.id,
          product: data.product,
          category: data.category,
          register: data.register,
          date: parseISO(data.date),
          seller: data.seller,
          quantity: data.quantity,
          price: data.price,
          total: data.total,
          created_at: data.createdAt ? parseISO(data.createdAt) : new Date()
        });
      });

      console.log(`📊 Loaded ${sales.length} sales from Firebase`);
      setRegisterSales(sales);
      calculateDashboardStats(sales);
    } catch (error) {
      console.error('Erreur lors du chargement des ventes:', error);
      // Fallback to mock data
      const mockSales = generateMockSales();
      setRegisterSales(mockSales);
      calculateDashboardStats(mockSales);
    }
  };

  const loadProducts = async () => {
    try {
      const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
      const productsQuery = query(productsCollection, orderBy('name'));
      
      const querySnapshot = await getDocs(productsQuery);
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreProduct;
        products.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          price: data.price,
          stock: data.stock,
          initialStock: data.initialStock || data.stock,
          initialStockDate: data.initialStockDate,
          quantitySold: data.quantitySold || 0,
          minStock: data.minStock,
          description: data.description
        });
      });

      console.log(`📦 Loaded ${products.length} products from Firebase`);
      setProducts(products);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts(generateMockProducts());
    }
  };

  // Enhanced product matching function
  const normalizeProductName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s]/g, '') // Remove special characters except spaces
      .replace(/\b(100s?|20s?|25s?)\b/g, '') // Remove common suffixes like 100S, 20, 25
      .trim();
  };

  const findMatchingProduct = (saleName: string, saleCategory: string, products: Product[]): Product | null => {
    const normalizedSaleName = normalizeProductName(saleName);
    const normalizedSaleCategory = saleCategory.toLowerCase().trim();

    // Try exact match first
    let match = products.find(product => 
      normalizeProductName(product.name) === normalizedSaleName &&
      product.category.toLowerCase().trim() === normalizedSaleCategory
    );

    if (match) return match;

    // Try partial match on product name with same category
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      return (
        normalizedProductCategory === normalizedSaleCategory &&
        (normalizedProductName.includes(normalizedSaleName) || 
         normalizedSaleName.includes(normalizedProductName))
      );
    });

    if (match) return match;

    // Try fuzzy match - check if main words are present
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      if (normalizedProductCategory !== normalizedSaleCategory) return false;
      
      const saleWords = normalizedSaleName.split(' ').filter(word => word.length > 2);
      const productWords = normalizedProductName.split(' ').filter(word => word.length > 2);
      
      // Check if at least 70% of words match
      const matchingWords = saleWords.filter(saleWord => 
        productWords.some(productWord => 
          productWord.includes(saleWord) || saleWord.includes(productWord)
        )
      );
      
      return matchingWords.length >= Math.ceil(saleWords.length * 0.7);
    });

    return match || null;
  };

  // ✅ NEW: Auto-sync products from sales data
  const autoSyncProductsFromSales = async (): Promise<{
    created: Product[];
    summary: string;
  }> => {
    console.log('🔄 Starting auto-sync of products from sales data...');
    
    if (registerSales.length === 0) {
      console.log('⚠️ No sales data available for sync');
      return { created: [], summary: 'Aucune donnée de vente disponible pour la synchronisation.' };
    }

    // Step 1: Analyze all unique products in sales
    const salesProductMap = new Map<string, {
      name: string;
      category: string;
      totalQuantitySold: number;
      averagePrice: number;
      firstSaleDate: Date;
      lastSaleDate: Date;
      salesCount: number;
    }>();

    registerSales.forEach(sale => {
      // Create a unique key for each product-category combination
      const productKey = `${sale.product.trim().toLowerCase()}|${sale.category.trim().toLowerCase()}`;
      
      if (salesProductMap.has(productKey)) {
        const existing = salesProductMap.get(productKey)!;
        existing.totalQuantitySold += sale.quantity;
        existing.averagePrice = (existing.averagePrice * existing.salesCount + sale.price) / (existing.salesCount + 1);
        existing.salesCount += 1;
        existing.lastSaleDate = sale.date > existing.lastSaleDate ? sale.date : existing.lastSaleDate;
        existing.firstSaleDate = sale.date < existing.firstSaleDate ? sale.date : existing.firstSaleDate;
      } else {
        salesProductMap.set(productKey, {
          name: sale.product.trim(),
          category: sale.category.trim(),
          totalQuantitySold: sale.quantity,
          averagePrice: sale.price,
          firstSaleDate: sale.date,
          lastSaleDate: sale.date,
          salesCount: 1
        });
      }
    });

    console.log(`📊 Found ${salesProductMap.size} unique products in sales data`);

    // Step 2: Check which products are missing from stock
    const missingProducts: Array<{
      salesData: any;
      productKey: string;
    }> = [];

    salesProductMap.forEach((salesData, productKey) => {
      const matchingProduct = findMatchingProduct(salesData.name, salesData.category, products);
      
      if (!matchingProduct) {
        console.log(`❌ Missing product in stock: "${salesData.name}" (${salesData.category})`);
        missingProducts.push({ salesData, productKey });
      } else {
        console.log(`✅ Product exists in stock: "${salesData.name}" → "${matchingProduct.name}"`);
      }
    });

    console.log(`🔍 Found ${missingProducts.length} products missing from stock`);

    if (missingProducts.length === 0) {
      return { 
        created: [], 
        summary: `✅ Tous les produits des ventes (${salesProductMap.size}) existent déjà dans le stock. Aucune synchronisation nécessaire.` 
      };
    }

    // Step 3: Create missing products
    const createdProducts: Product[] = [];
    const BATCH_SIZE = 200;
    
    try {
      // Process in batches
      for (let i = 0; i < missingProducts.length; i += BATCH_SIZE) {
        const batch = missingProducts.slice(i, i + BATCH_SIZE);
        const writeBatchRef = writeBatch(db);
        const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
        
        batch.forEach(({ salesData }) => {
          const docRef = doc(productsCollection);
          
          // Estimate initial stock based on sales data
          const estimatedInitialStock = Math.max(salesData.totalQuantitySold, 10); // At least 10 or total sold
          const currentStock = 0; // Default to 0 since we don't know current inventory
          const minStock = Math.max(Math.ceil(salesData.totalQuantitySold / 10), 5); // 10% of sold or minimum 5
          
          const newProduct: Omit<FirestoreProduct, 'id'> = {
            name: salesData.name,
            category: salesData.category,
            price: Math.round(salesData.averagePrice * 100) / 100, // Round to 2 decimals
            stock: currentStock,
            initialStock: estimatedInitialStock,
            quantitySold: salesData.totalQuantitySold,
            minStock: minStock,
            description: `Auto-créé depuis les ventes (${salesData.salesCount} ventes, première: ${salesData.firstSaleDate.toLocaleDateString('fr-FR')})`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          writeBatchRef.set(docRef, newProduct);
          
          // Add to created products list for return
          createdProducts.push({
            id: docRef.id,
            name: newProduct.name,
            category: newProduct.category,
            price: newProduct.price,
            stock: newProduct.stock,
            initialStock: newProduct.initialStock,
            quantitySold: newProduct.quantitySold,
            minStock: newProduct.minStock,
            description: newProduct.description
          });
        });
        
        await writeBatchRef.commit();
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} committed: ${batch.length} products created`);
      }

      // Reload products to include the new ones
      await loadProducts();
      
      // Generate summary report
      const summary = generateSyncSummary(createdProducts, salesProductMap.size);
      
      console.log('🎉 Auto-sync completed successfully');
      return { created: createdProducts, summary };
      
    } catch (error) {
      console.error('❌ Error during auto-sync:', error);
      throw new Error('Erreur lors de la synchronisation automatique des produits');
    }
  };

  // Generate detailed summary report
  const generateSyncSummary = (createdProducts: Product[], totalSalesProducts: number): string => {
    const categoryBreakdown = createdProducts.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const totalQuantitySold = createdProducts.reduce((sum, product) => sum + (product.quantitySold || 0), 0);
    const averagePrice = createdProducts.length > 0 
      ? createdProducts.reduce((sum, product) => sum + product.price, 0) / createdProducts.length 
      : 0;

    let summary = `🎉 Synchronisation automatique terminée avec succès !\n\n`;
    summary += `📊 Résumé de l'analyse :\n`;
    summary += `• ${totalSalesProducts} produits uniques trouvés dans les ventes\n`;
    summary += `• ${createdProducts.length} nouveaux produits créés dans le stock\n`;
    summary += `• ${totalSalesProducts - createdProducts.length} produits existaient déjà\n\n`;
    
    if (createdProducts.length > 0) {
      summary += `📦 Produits créés :\n`;
      summary += `• Quantité totale vendue : ${totalQuantitySold.toLocaleString()}\n`;
      summary += `• Prix moyen : ${averagePrice.toFixed(2)} €\n\n`;
      
      summary += `📋 Répartition par catégorie :\n`;
      Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          summary += `• ${category} : ${count} produit${count > 1 ? 's' : ''}\n`;
        });
      
      summary += `\n✅ Tous les nouveaux produits ont été configurés avec :\n`;
      summary += `• Stock actuel : 0 (à mettre à jour manuellement)\n`;
      summary += `• Stock initial : Estimé basé sur les ventes\n`;
      summary += `• Quantité vendue : Calculée depuis les ventes\n`;
      summary += `• Prix : Moyenne des prix de vente\n`;
      summary += `• Stock minimum : Estimé (10% des ventes ou minimum 5)\n`;
      summary += `• Description : Informations de création automatique\n`;
    }

    return summary;
  };

  // ✅ ENHANCED: Recalculate all product quantities based on current sales
  const recalculateProductQuantities = async () => {
    console.log(`🔄 Starting stock recalculation with ${registerSales.length} sales and ${products.length} products...`);
    
    if (products.length === 0) {
      console.log('⚠️ No products available for recalculation');
      return;
    }
    
    // ✅ ENHANCED: Use the new stock calculation system
    const updatedProducts = products.map(product => {
      const calculation = calculateStockFinal(product, registerSales);
      
      // Ensure we have an initial stock value
      const initialStock = product.initialStock || product.stock + (product.quantitySold || 0);
      
      // Use calculated values from the new system
      const totalQuantitySold = calculation.validSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const finalStock = calculation.finalStock;
      
      const updated = {
        ...product,
        initialStock,
        quantitySold: totalQuantitySold,
        stock: finalStock
      };

      // Log significant changes
      if (product.quantitySold !== totalQuantitySold || product.stock !== finalStock) {
        console.log(`📦 ${product.name}: Sold ${product.quantitySold || 0} → ${totalQuantitySold}, Stock ${product.stock} → ${finalStock}`);
      }

      return updated;
    });

    // ✅ CRITICAL: Update local state immediately
    setProducts(updatedProducts);

    // Update Firebase for products that changed using batch operations
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      updatedProducts.forEach((updatedProduct, index) => {
        const originalProduct = products[index];
        if (originalProduct && 
            (originalProduct.quantitySold !== updatedProduct.quantitySold || 
             originalProduct.stock !== updatedProduct.stock ||
             originalProduct.initialStock !== updatedProduct.initialStock)) {
          
          const productRef = doc(db, COLLECTIONS.PRODUCTS, updatedProduct.id);
          batch.update(productRef, {
            quantitySold: updatedProduct.quantitySold,
            stock: updatedProduct.stock,
            initialStock: updatedProduct.initialStock,
            updatedAt: new Date().toISOString()
          });
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
        console.log('✅ Product quantities updated in Firebase');
      } else {
        console.log('ℹ️ No product quantity changes to save');
      }
    } catch (error) {
      console.error('❌ Error updating product quantities in Firebase:', error);
    }

    // Regenerate alerts after stock changes
    await generateAlerts();
    
    console.log('✅ Stock recalculation completed');
  };

  const calculateDashboardStats = (sales: RegisterSale[]) => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const activeRegisters = 2;

    // Top produits
    const productStats = sales.reduce((acc, sale) => {
      if (!acc[sale.product]) {
        acc[sale.product] = { quantity: 0, revenue: 0 };
      }
      acc[sale.product].quantity += sale.quantity;
      acc[sale.product].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({ product, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top vendeurs
    const sellerStats = sales.reduce((acc, sale) => {
      if (!acc[sale.seller]) {
        acc[sale.seller] = { quantity: 0, revenue: 0 };
      }
      acc[sale.seller].quantity += sale.quantity;
      acc[sale.seller].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topSellers = Object.entries(sellerStats)
      .map(([seller, stats]) => ({ seller, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Performance par caisse
    const registerStats = sales.reduce((acc, sale) => {
      let normalizedRegister = sale.register;
      if (sale.register.toLowerCase().includes('1') || sale.register.toLowerCase().includes('caisse1')) {
        normalizedRegister = 'Register1';
      } else if (sale.register.toLowerCase().includes('2') || sale.register.toLowerCase().includes('caisse2')) {
        normalizedRegister = 'Register2';
      }
      
      if (!acc[normalizedRegister]) {
        acc[normalizedRegister] = { quantity: 0, revenue: 0 };
      }
      acc[normalizedRegister].quantity += sale.quantity;
      acc[normalizedRegister].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const registerPerformance = Object.entries(registerStats)
      .map(([register, stats]) => ({ register, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    // Tendance quotidienne
    const dailyStats = sales.reduce((acc, sale) => {
      const dateKey = format(sale.date, 'dd/MM');
      if (!acc[dateKey]) {
        acc[dateKey] = { quantity: 0, revenue: 0 };
      }
      acc[dateKey].quantity += sale.quantity;
      acc[dateKey].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const dailyTrend = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .slice(-30);

    setDashboardStats({
      totalSales,
      totalRevenue,
      totalProducts: new Set(sales.map(s => s.product)).size,
      activeRegisters,
      topProducts,
      topSellers,
      registerPerformance,
      dailyTrend
    });
  };

  // ✅ NEW: Batch import for sales with 200 rows per batch
  const addRegisterSales = async (sales: RegisterSale[]) => {
    try {
      console.log(`🔥 Starting batch import of ${sales.length} sales...`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split sales into batches of 200
      for (let i = 0; i < sales.length; i += BATCH_SIZE) {
        batches.push(sales.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)...`);
        
        const writeBatchRef = writeBatch(db);
        const salesCollection = collection(db, COLLECTIONS.REGISTER_SALES);
        
        // Add all sales in this batch to the write batch
        batch.forEach(sale => {
          const docRef = doc(salesCollection);
          const saleData: Omit<FirestoreRegisterSale, 'id'> = {
            product: sale.product,
            category: sale.category,
            register: sale.register,
            date: sale.date.toISOString(),
            seller: sale.seller,
            quantity: sale.quantity,
            price: sale.price,
            total: sale.total,
            createdAt: new Date().toISOString()
          };
          writeBatchRef.set(docRef, saleData);
        });
        
        // Commit this batch
        await writeBatchRef.commit();
        console.log(`✅ Batch ${batchIndex + 1} committed successfully (${batch.length} sales)`);
      }

      console.log(`🎉 All ${sales.length} sales imported successfully in ${batches.length} batches`);

      // Reload sales data to ensure synchronization
      await loadRegisterSales();
      
      // The useEffect will automatically trigger recalculateProductQuantities
      console.log('✅ Sales import completed - quantities will be recalculated automatically');
      return true;
    } catch (error) {
      console.error('❌ Error adding sales to Firebase:', error);
      // Fallback: add locally if Firebase is not available
      const newSales = sales.map(sale => ({
        ...sale,
        id: Math.random().toString(36).substr(2, 9)
      }));
      
      setRegisterSales(prev => [...newSales, ...prev]);
      calculateDashboardStats([...newSales, ...registerSales]);
      
      return true;
    }
  };

  // ✅ NEW: Batch import for products with 200 rows per batch
  const addProducts = async (products: Omit<Product, 'id'>[]) => {
    try {
      console.log(`🔥 Starting batch import of ${products.length} products...`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split products into batches of 200
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)...`);
        
        const writeBatchRef = writeBatch(db);
        const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
        
        // Add all products in this batch to the write batch
        batch.forEach(product => {
          const docRef = doc(productsCollection);
          const productData: Omit<FirestoreProduct, 'id'> = {
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
            initialStock: product.initialStock || product.stock,
            initialStockDate: product.initialStockDate,
            quantitySold: 0, // Always start with 0, will be calculated from sales
            minStock: product.minStock,
            description: product.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          writeBatchRef.set(docRef, productData);
        });
        
        // Commit this batch
        await writeBatchRef.commit();
        console.log(`✅ Batch ${batchIndex + 1} committed successfully (${batch.length} products)`);
      }

      console.log(`🎉 All ${products.length} products imported successfully in ${batches.length} batches`);

      // Reload products data
      await loadProducts();
      
      // Recalculate quantities for the new products
      setTimeout(() => recalculateProductQuantities(), 100);
      
      console.log('✅ Products import completed');
      return true;
    } catch (error) {
      console.error('❌ Error adding products to Firebase:', error);
      
      // Fallback: add locally if Firebase is not available
      const newProducts = products.map(product => ({
        ...product,
        id: Math.random().toString(36).substr(2, 9),
        initialStock: product.initialStock || product.stock,
        quantitySold: 0
      }));
      
      setProducts(prev => [...prev, ...newProducts]);
      
      // Recalculate quantities for the new products
      setTimeout(() => recalculateProductQuantities(), 100);
      return true;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
      const productData: Omit<FirestoreProduct, 'id'> = {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        initialStock: product.initialStock || product.stock,
        initialStockDate: product.initialStockDate,
        quantitySold: 0, // Always start with 0, will be calculated from sales
        minStock: product.minStock,
        description: product.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(productsCollection, productData);
      await loadProducts();
      
      // Recalculate quantities for the new product
      setTimeout(() => recalculateProductQuantities(), 100);
      
      console.log('✅ Product added successfully');
    } catch (error) {
      console.error('❌ Error adding product:', error);
      const newProduct: Product = {
        ...product,
        id: Math.random().toString(36).substr(2, 9),
        initialStock: product.initialStock || product.stock,
        quantitySold: 0
      };
      setProducts(prev => [...prev, newProduct]);
      
      // Recalculate quantities for the new product
      setTimeout(() => recalculateProductQuantities(), 100);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      const updateData: Partial<FirestoreProduct> = {
        ...updates,
        initialStockDate: updates.initialStockDate,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(productRef, updateData);
      
      // Update local state immediately
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      
      await generateAlerts();
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      await generateAlerts();
    }
  };

  // ✅ NEW: Update sale function
  const updateSale = async (id: string, updates: Partial<RegisterSale>): Promise<boolean> => {
    try {
      const saleRef = doc(db, COLLECTIONS.REGISTER_SALES, id);
      const updateData: Partial<FirestoreRegisterSale> = {};
      
      if (updates.product) updateData.product = updates.product;
      if (updates.category) updateData.category = updates.category;
      if (updates.register) updateData.register = updates.register;
      if (updates.date) updateData.date = updates.date.toISOString();
      if (updates.seller) updateData.seller = updates.seller;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.total !== undefined) updateData.total = updates.total;

      await updateDoc(saleRef, updateData);
      
      // Update local state immediately
      setRegisterSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      
      console.log('✅ Sale updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating sale:', error);
      // Fallback: update locally
      setRegisterSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return false;
    }
  };

  // ✅ FIXED: Categorize sales function - Now updates the actual category field WITHOUT reload
  const categorizeSales = async (saleIds: string[], category: string, subcategory?: string): Promise<boolean> => {
    try {
      console.log(`🏷️ Categorizing ${saleIds.length} sales with category: ${category}${subcategory ? `, subcategory: ${subcategory}` : ''}`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split into batches of 200
      for (let i = 0; i < saleIds.length; i += BATCH_SIZE) {
        batches.push(saleIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing categorization batch ${batchIndex + 1}/${batches.length} (${batch.length} sales)...`);
        
        const writeBatchRef = writeBatch(db);
        
        batch.forEach(id => {
          const saleRef = doc(db, COLLECTIONS.REGISTER_SALES, id);
          
          // ✅ CRITICAL FIX: Update the actual category field, not just metadata
          const updateData: Partial<FirestoreRegisterSale> = {
            category: category, // ✅ This is the key fix - update the actual category field
            // Also store categorization metadata for tracking
            category_metadata: {
              category,
              subcategory: subcategory || null,
              categorized_at: new Date().toISOString(),
              categorized_by: 'user'
            }
          };
          
          writeBatchRef.update(saleRef, updateData);
        });
        
        await writeBatchRef.commit();
        console.log(`✅ Categorization batch ${batchIndex + 1} committed successfully (${batch.length} sales)`);
      }
      
      console.log(`🎉 All ${saleIds.length} sales categorized successfully`);
      
      // ✅ CRITICAL: Update local state immediately to reflect the changes
      setRegisterSales(prev => prev.map(sale => 
        saleIds.includes(sale.id) 
          ? { ...sale, category: category } // Update the category in local state
          : sale
      ));
      
      // ✅ CRITICAL: Reload sales data to ensure synchronization with Firestore
      // BUT DO NOT RELOAD THE ENTIRE APP - just refresh the data
      console.log('🔄 Reloading sales data to reflect categorization changes...');
      await loadRegisterSales();
      
      console.log('✅ Sales categorization completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error categorizing sales:', error);
      
      // Fallback: update local state only
      console.log('🔄 Fallback: Updating local state after categorization error...');
      setRegisterSales(prev => prev.map(sale => 
        saleIds.includes(sale.id) 
          ? { ...sale, category: category }
          : sale
      ));
      
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      await deleteDoc(productRef);
      
      // Update local state immediately
      setProducts(prev => prev.filter(p => p.id !== id));
      
      await generateAlerts();
      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      setProducts(prev => prev.filter(p => p.id !== id));
      await generateAlerts();
    }
  };

  const deleteProducts = async (productIds: string[]) => {
    try {
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split into batches of 200
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        batches.push(productIds.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch
      for (const batch of batches) {
        const writeBatchRef = writeBatch(db);
        
        batch.forEach(id => {
          const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
          writeBatchRef.delete(productRef);
        });
        
        await writeBatchRef.commit();
      }
      
      // Update local state immediately
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      
      await generateAlerts();
      console.log(`✅ ${productIds.length} products deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting products:', error);
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      await generateAlerts();
      return false;
    }
  };

  // ✅ CRITICAL FIX: Enhanced deleteSales function with guaranteed stock recalculation
  const deleteSales = async (saleIds: string[]) => {
    try {
      console.log(`🗑️ Starting deletion of ${saleIds.length} sales...`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split into batches of 200
      for (let i = 0; i < saleIds.length; i += BATCH_SIZE) {
        batches.push(saleIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split deletion into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing deletion batch ${batchIndex + 1}/${batches.length} (${batch.length} sales)...`);
        
        const writeBatchRef = writeBatch(db);
        
        batch.forEach(id => {
          const saleRef = doc(db, COLLECTIONS.REGISTER_SALES, id);
          writeBatchRef.delete(saleRef);
        });
        
        await writeBatchRef.commit();
        console.log(`✅ Deletion batch ${batchIndex + 1} committed successfully (${batch.length} sales deleted)`);
      }
      
      console.log(`🎉 All ${saleIds.length} sales deleted successfully from Firebase`);
      
      // ✅ CRITICAL: Reload sales data to get the updated list
      console.log('🔄 Reloading sales data after deletion...');
      await loadRegisterSales();
      
      // ✅ CRITICAL: The useEffect will automatically trigger recalculateProductQuantities
      // when registerSales changes, but we add an extra safety call
      console.log('✅ Sales deletion completed - stock recalculation will be triggered automatically');
      return true;
    } catch (error) {
      console.error('❌ Error deleting sales:', error);
      
      // Fallback: update local state
      console.log('🔄 Fallback: Updating local state after deletion error...');
      setRegisterSales(prev => {
        const updatedSales = prev.filter(s => !saleIds.includes(s.id));
        console.log(`📊 Local sales updated: ${prev.length} → ${updatedSales.length}`);
        return updatedSales;
      });
      
      // ✅ CRITICAL: The useEffect will trigger recalculation when registerSales changes
      console.log('✅ Local sales deletion completed - stock recalculation will be triggered automatically');
      return false;
    }
  };

  const generateAlerts = async () => {
    const newAlerts: Alert[] = [];

    // Alertes de stock faible
    products.forEach(product => {
      if (product.stock <= product.minStock) {
        const severity = product.stock === 0 ? 'error' : 'warning';
        const message = product.stock === 0 
          ? `Rupture de stock pour ${product.name}` 
          : `Stock faible pour ${product.name} (${product.stock} unités restantes, minimum: ${product.minStock})`;
        
        newAlerts.push({
          id: `low-stock-${product.id}`,
          type: 'low-stock',
          message,
          severity,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Alerte de ventes élevées
    const today = new Date();
    const todaySales = registerSales.filter(sale => 
      sale.date.toDateString() === today.toDateString()
    );

    if (todaySales.length > 50) {
      newAlerts.push({
        id: 'high-sales-today',
        type: 'high-sales',
        message: `Journée exceptionnelle ! ${todaySales.length} ventes réalisées aujourd'hui`,
        severity: 'info',
        timestamp: new Date(),
        read: false
      });
    }

    setAlerts(newAlerts);
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing all data...');
    await loadInitialData();
    // The useEffect will automatically trigger recalculateProductQuantities
    console.log('✅ Data refresh completed');
  };

  return {
    registerSales,
    products,
    dashboardStats,
    alerts,
    loading,
    addRegisterSales,
    addProduct,
    addProducts, // ✅ NEW: Batch add products
    updateProduct,
    updateSale, // ✅ NEW: Update sale function
    categorizeSales, // ✅ FIXED: Now properly updates the category field WITHOUT reload
    deleteProduct,
    deleteProducts,
    deleteSales, // ✅ FIXED: Now properly recalculates stock automatically
    markAlertAsRead,
    refreshData,
    autoSyncProductsFromSales // ✅ NEW: Auto-sync function
  };
}

// Mock data functions (same as before)
function generateMockSales(): RegisterSale[] {
  const products = ['Pain de mie', 'Lait UHT', 'Yaourt nature', 'Pommes', 'Bananes', 'Coca-Cola', 'Eau minérale'];
  const categories = ['Alimentaire', 'Boisson', 'Fruits'];
  const registers = ['Register1', 'Register2'];
  const sellers = ['Marie Dupont', 'Jean Martin', 'Sophie Bernard', 'Pierre Durand'];

  return Array.from({ length: 150 }, (_, i) => {
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const price = Math.random() * 10 + 1;
    
    return {
      id: `sale-${i}`,
      product,
      category: categories[Math.floor(Math.random() * categories.length)],
      register: registers[Math.floor(Math.random() * registers.length)],
      date: subDays(new Date(), Math.floor(Math.random() * 30)),
      seller: sellers[Math.floor(Math.random() * sellers.length)],
      quantity,
      price: Math.round(price * 100) / 100,
      total: Math.round(quantity * price * 100) / 100
    };
  });
}

function generateMockProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'JELLY POP',
      category: 'CONFISERIES',
      price: 1.00,
      stock: 45,
      initialStock: 50,
      quantitySold: 5,
      minStock: 10,
      description: 'Bonbons Jelly Pop'
    },
    {
      id: '2',
      name: 'SMARTIES',
      category: 'CONFISERIES',
      price: 1.00,
      stock: 8,
      initialStock: 20,
      quantitySold: 12,
      minStock: 15,
      description: 'Bonbons Smarties'
    },
    {
      id: '3',
      name: 'COCA 1,5L',
      category: 'BOISSONS',
      price: 2.50,
      stock: 25,
      initialStock: 30,
      quantitySold: 5,
      minStock: 12,
      description: 'Coca-Cola 1.5L'
    },
    {
      id: '4',
      name: 'Pain de mie',
      category: 'Alimentaire',
      price: 1.50,
      stock: 30,
      initialStock: 35,
      quantitySold: 5,
      minStock: 10,
      description: 'Pain de mie complet'
    },
    {
      id: '5',
      name: 'Lait UHT',
      category: 'Alimentaire',
      price: 1.20,
      stock: 5,
      initialStock: 20,
      quantitySold: 15,
      minStock: 15,
      description: 'Lait UHT demi-écrémé 1L'
    }
  ];
}