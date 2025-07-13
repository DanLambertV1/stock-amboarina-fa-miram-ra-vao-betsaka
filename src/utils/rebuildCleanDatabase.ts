import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  writeBatch, 
  doc, 
  getDoc,
  Firestore
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { RegisterSale, Product } from '../types';

/**
 * Creates a stable signature for a product based on name and category
 * @param name Product name
 * @param category Product category
 * @returns Stable signature string
 */
export function createProductSignature(name: string, category: string): string {
  return `${name.toLowerCase().trim()}|${category.toLowerCase().trim()}`;
}

/**
 * Interface for a clean product in the products_clean collection
 */
interface CleanProduct {
  id: string;
  name: string;
  category: string;
  signature: string;
  price: number;
  stock: number;
  initialStock?: number;
  initialStockDate?: string;
  quantitySold?: number;
  minStock: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for a clean sale in the register_sales_clean collection
 */
interface CleanSale {
  id: string;
  product_id: string;
  product_signature: string;
  product: string;
  category: string;
  register: string;
  date: string;
  seller: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  cleaned: boolean;
}

/**
 * Rebuilds a clean database by importing sales data
 * @param salesData Optional array of sales data to process (if not provided, reads from Firestore)
 * @param firestore Optional Firestore instance (for testing)
 * @returns Summary of the operation
 */
export async function rebuildCleanDatabase(
  salesData?: RegisterSale[],
  firestore: Firestore = db
): Promise<{
  success: boolean;
  productsCreated: number;
  salesProcessed: number;
  errors: string[];
  summary: string;
}> {
  console.log('🔄 Starting clean database rebuild...');
  
  const errors: string[] = [];
  const productSignatureMap = new Map<string, string>(); // signature -> product_id
  let productsCreated = 0;
  let salesProcessed = 0;
  
  try {
    // Step 1: Get sales data if not provided
    let sales: RegisterSale[] = [];
    if (salesData) {
      sales = salesData;
    } else {
      console.log('📊 Fetching sales data from Firestore...');
      const salesCollection = collection(firestore, COLLECTIONS.REGISTER_SALES);
      const salesSnapshot = await getDocs(salesCollection);
      
      sales = salesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          product: data.product,
          category: data.category,
          register: data.register,
          date: new Date(data.date),
          seller: data.seller,
          quantity: data.quantity,
          price: data.price,
          total: data.total,
          created_at: data.createdAt ? new Date(data.createdAt) : new Date()
        };
      });
      
      console.log(`📊 Fetched ${sales.length} sales records`);
    }
    
    if (sales.length === 0) {
      return {
        success: false,
        productsCreated: 0,
        salesProcessed: 0,
        errors: ['No sales data found to process'],
        summary: 'No sales data found to process'
      };
    }
    
    // Step 2: Process sales in batches
    const BATCH_SIZE = 500;
    const batches = [];
    
    for (let i = 0; i < sales.length; i += BATCH_SIZE) {
      batches.push(sales.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${batches.length} batches of max ${BATCH_SIZE} sales each`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} sales)...`);
      
      const writeBatchRef = writeBatch(firestore);
      
      // Process each sale in the batch
      for (const sale of batch) {
        try {
          // Generate product signature
          const signature = createProductSignature(sale.product, sale.category);
          
          // Check if we've already processed this product signature
          let productId = productSignatureMap.get(signature);
          
          if (!productId) {
            // Check if product exists in products_clean
            const productsCleanCollection = collection(firestore, 'products_clean');
            const productQuery = query(productsCleanCollection, where('signature', '==', signature));
            const productSnapshot = await getDocs(productQuery);
            
            if (!productSnapshot.empty) {
              // Product exists, use its ID
              productId = productSnapshot.docs[0].id;
              productSignatureMap.set(signature, productId);
            } else {
              // Create new product in products_clean
              const newProductRef = doc(collection(firestore, 'products_clean'));
              productId = newProductRef.id;
              
              const newProduct: Omit<CleanProduct, 'id'> = {
                name: sale.product,
                category: sale.category,
                signature,
                price: sale.price,
                stock: 0, // Will be calculated later
                initialStock: 0,
                minStock: 5, // Default value
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              writeBatchRef.set(newProductRef, newProduct);
              productSignatureMap.set(signature, productId);
              productsCreated++;
            }
          }
          
          // Create clean sale record
          const newSaleRef = doc(collection(firestore, 'register_sales_clean'));
          
          const cleanSale: Omit<CleanSale, 'id'> = {
            product_id: productId,
            product_signature: signature,
            product: sale.product,
            category: sale.category,
            register: sale.register,
            date: sale.date.toISOString(),
            seller: sale.seller,
            quantity: sale.quantity,
            price: sale.price,
            total: sale.total,
            createdAt: new Date().toISOString(),
            cleaned: true
          };
          
          writeBatchRef.set(newSaleRef, cleanSale);
          salesProcessed++;
          
        } catch (error) {
          console.error('Error processing sale:', error);
          errors.push(`Error processing sale ${sale.id}: ${error}`);
        }
      }
      
      // Commit the batch
      await writeBatchRef.commit();
      console.log(`✅ Batch ${batchIndex + 1} committed successfully`);
    }
    
    // Step 3: Generate summary
    const summary = `
🎉 Database rebuild completed successfully!

📊 Summary:
• ${salesProcessed} sales processed and cleaned
• ${productsCreated} unique products created
• ${errors.length} errors encountered

✅ Collections created/updated:
• products_clean: Contains deduplicated products with stable signatures
• register_sales_clean: Contains cleaned sales with product references

🔍 Each product is identified by a stable signature:
• Signature format: name.toLowerCase().trim() + '|' + category.toLowerCase().trim()
• Original product names and categories are preserved
• Each sale is linked to the correct product via product_id
    `.trim();
    
    console.log('✅ Clean database rebuild completed');
    
    return {
      success: true,
      productsCreated,
      salesProcessed,
      errors,
      summary
    };
    
  } catch (error) {
    console.error('❌ Error rebuilding clean database:', error);
    return {
      success: false,
      productsCreated,
      salesProcessed,
      errors: [`Fatal error: ${error}`],
      summary: `Failed to rebuild clean database: ${error}`
    };
  }
}

/**
 * Utility function to get a clean product by signature
 * @param signature Product signature
 * @param firestore Firestore instance
 * @returns Clean product or null if not found
 */
export async function getCleanProductBySignature(
  signature: string,
  firestore: Firestore = db
): Promise<CleanProduct | null> {
  try {
    const productsCleanCollection = collection(firestore, 'products_clean');
    const productQuery = query(productsCleanCollection, where('signature', '==', signature));
    const productSnapshot = await getDocs(productQuery);
    
    if (!productSnapshot.empty) {
      const doc = productSnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as CleanProduct;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting clean product by signature:', error);
    return null;
  }
}

/**
 * Utility function to get clean sales for a product
 * @param productId Product ID
 * @param firestore Firestore instance
 * @returns Array of clean sales
 */
export async function getCleanSalesForProduct(
  productId: string,
  firestore: Firestore = db
): Promise<CleanSale[]> {
  try {
    const salesCleanCollection = collection(firestore, 'register_sales_clean');
    const salesQuery = query(salesCleanCollection, where('product_id', '==', productId));
    const salesSnapshot = await getDocs(salesQuery);
    
    return salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CleanSale[];
  } catch (error) {
    console.error('Error getting clean sales for product:', error);
    return [];
  }
}