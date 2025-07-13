import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Initialize Firebase collections with sample data
export async function initializeFirebaseCollections() {
  try {
    console.log('🔥 Initializing Firebase collections...');

    // Check if collections already exist
    const productsSnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    const salesSnapshot = await getDocs(collection(db, COLLECTIONS.REGISTER_SALES));

    // Initialize products collection if empty
    if (productsSnapshot.empty) {
      console.log('📦 Creating sample products...');
      
      const sampleProducts = [
        {
          name: 'JELLY POP',
          category: 'CONFISERIES',
          price: 1.00,
          stock: 45,
          minStock: 10,
          description: 'Bonbons Jelly Pop',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'SMARTIES',
          category: 'CONFISERIES',
          price: 1.00,
          stock: 8,
          minStock: 15,
          description: 'Bonbons Smarties',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'COCA 1,5L',
          category: 'BOISSONS',
          price: 2.50,
          stock: 25,
          minStock: 12,
          description: 'Coca-Cola 1.5L',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Pain de mie',
          category: 'Alimentaire',
          price: 1.50,
          stock: 30,
          minStock: 10,
          description: 'Pain de mie complet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Lait UHT',
          category: 'Alimentaire',
          price: 1.20,
          stock: 5,
          minStock: 15,
          description: 'Lait UHT demi-écrémé 1L',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const product of sampleProducts) {
        const docRef = doc(collection(db, COLLECTIONS.PRODUCTS));
        await setDoc(docRef, product);
      }

      console.log('✅ Sample products created successfully');
    }

    // Initialize sales collection if empty (optional sample data)
    if (salesSnapshot.empty) {
      console.log('💰 Creating sample sales...');
      
      const sampleSales = [
        {
          product: 'JELLY POP',
          category: 'CONFISERIES',
          register: 'Register1',
          date: new Date().toISOString(),
          seller: 'LALA',
          quantity: 1,
          price: 1.00,
          total: 1.00,
          createdAt: new Date().toISOString()
        },
        {
          product: 'SMARTIES',
          category: 'CONFISERIES',
          register: 'Register1',
          date: new Date().toISOString(),
          seller: 'LALA',
          quantity: 1,
          price: 1.00,
          total: 1.00,
          createdAt: new Date().toISOString()
        },
        {
          product: 'COCA 1,5L',
          category: 'BOISSONS',
          register: 'Register2',
          date: new Date().toISOString(),
          seller: 'MARIE',
          quantity: 2,
          price: 2.50,
          total: 5.00,
          createdAt: new Date().toISOString()
        }
      ];

      for (const sale of sampleSales) {
        const docRef = doc(collection(db, COLLECTIONS.REGISTER_SALES));
        await setDoc(docRef, sale);
      }

      console.log('✅ Sample sales created successfully');
    }

    console.log('🎉 Firebase initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Firebase collections:', error);
    return false;
  }
}

// Firestore security rules (to be added in Firebase Console)
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products collection rules
    match /products/{productId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Register sales collection rules
    match /register_sales/{saleId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    
    // Allow read/write access to other documents for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`;

// Firebase Storage rules (if needed)
export const STORAGE_SECURITY_RULES = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Change this in production!
    }
  }
}
`;