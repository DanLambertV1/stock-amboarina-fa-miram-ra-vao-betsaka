import React from 'react';
import { AlertCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvnLRDGEzEPT0lndhb24cJu0un8D3bm6w",
  authDomain: "plaisir-des-jeux.firebaseapp.com",
  projectId: "plaisir-des-jeux",
  storageBucket: "plaisir-des-jeux.firebasestorage.app",
  messagingSenderId: "188768357815",
  appId: "1:188768357815:web:a078b688777e270090ac32",
  measurementId: "G-RC8YEL8P7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Analytics
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export { analytics };

// Configure auth settings for production
auth.useDeviceLanguage(); // Use device language for auth UI
auth.settings.appVerificationDisabledForTesting = false; // Enable app verification

export default app;

// Firestore collection names
export const COLLECTIONS = {
  REGISTER_SALES: 'register_sales',
  PRODUCTS: 'products',
  USERS: 'users',
  ALERTS: 'alerts',
  SETTINGS: 'settings'
} as const;

// Firestore data types
export interface FirestoreRegisterSale {
  id: string;
  product: string;
  category: string;
  register: string;
  date: string; // ISO string
  seller: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string; // ISO string
  // ✅ NEW: Categorization metadata field
  category_metadata?: {
    category: string;
    subcategory?: string | null;
    categorized_at: string;
    categorized_by: string;
  };
}

export interface FirestoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number; // Final quantity
  initialStock?: number; // Initial quantity from stock import
  initialStockDate?: string; // Effective date for initial stock (YYYY-MM-DD)
  quantitySold?: number; // Quantity sold from sales import
  minStock: number;
  description?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface FirestoreUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'seller' | 'viewer';
  createdAt: string; // ISO string
  lastLogin?: string; // ISO string
}

export interface FirestoreAlert {
  id: string;
  type: 'low-stock' | 'high-sales' | 'system' | 'duplicate';
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string; // ISO string
  read: boolean;
  userId?: string;
}

// Environment configuration
export const ENV_CONFIG = {
  isDevelopment: true,
  isProduction: true,
  apiUrl: 'https://plaisir-des-jeux.firebaseapp.com',
  enableAnalytics: true,
  enablePerformanceMonitoring: true,
  logLevel: 'error' // Only log errors in production
};

// Security configuration for production
export const SECURITY_CONFIG = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  requireEmailVerification: true,
  enableTwoFactorAuth: false, // Can be enabled later
  passwordMinLength: 8,
  passwordRequireSpecialChars: true
};

// Performance configuration
export const PERFORMANCE_CONFIG = {
  enableOfflineSupport: true,
  cacheSizeBytes: 40 * 1024 * 1024, // 40MB
  enablePersistence: true,
  syncSettings: {
    cacheSizeBytes: 40 * 1024 * 1024
  }
};

// React component export
export const FirebaseSetup: React.FC = () => {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-blue-900">Firebase Configuration</h3>
      </div>
      <p className="mt-2 text-sm text-blue-700">
        Firebase is configured and ready. Project ID: {ENV_CONFIG.apiUrl}
      </p>
    </div>
  );
};