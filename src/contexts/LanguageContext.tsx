import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// French translations
const translations = {
  fr: {
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    'common.refresh': 'Actualiser',
    'common.confirm': 'Confirmer',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.all': 'Tous',
    'common.none': 'Aucun',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.success': 'Succès',
    'common.error': 'Erreur',
    'common.warning': 'Attention',
    'common.info': 'Information',

    // App
    'app.title': 'Global VA MADA',
    'app.subtitle': 'Système de Suivi des Ventes',

    // Navigation
    'nav.dashboard': 'Tableau de Bord',
    'nav.sales': 'Ventes',
    'nav.stock': 'Stock',
    'nav.statistics': 'Statistiques',
    'nav.analytics': 'Analyses',
    'nav.import': 'Import Données',
    'nav.notifications': 'Notifications',
    'nav.alerts': 'Alertes',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',

    // Dashboard
    'dashboard.title': 'Tableau de Bord',
    'dashboard.subtitle': 'Vue d\'ensemble de vos performances de ventes',
    'dashboard.totalSales': 'Total Ventes',
    'dashboard.revenue': 'Chiffre d\'Affaires',
    'dashboard.expenses': 'Dépenses',
    'dashboard.productsSold': 'Produits Vendus',
    'dashboard.stockAlerts': 'Alertes Stock',
    'dashboard.topProducts': 'Top Produits',
    'dashboard.topSellers': 'Top Vendeurs',
    'dashboard.registerPerformance': 'Performance Caisses',
    'dashboard.salesDetails': 'Détail des Ventes',
    'dashboard.filters': 'Filtres',
    'dashboard.clearFilters': 'Effacer les filtres',
    'dashboard.startDate': 'Date de début',
    'dashboard.endDate': 'Date de fin',
    'dashboard.allRegisters': 'Toutes les caisses',
    'dashboard.allSellers': 'Tous les vendeurs',
    'dashboard.allCategories': 'Toutes les catégories',
    'dashboard.filteredPeriod': 'Période filtrée',
    'dashboard.positiveSalesOnly': 'Ventes positives uniquement',
    'dashboard.negativeAmounts': 'Montants négatifs',
    'dashboard.differentItems': 'Articles différents',
    'dashboard.filtered': 'Filtré',
    'dashboard.noProductsFound': 'Aucun produit trouvé',
    'dashboard.noSellersFound': 'Aucun vendeur trouvé',
    'dashboard.noRegistersFound': 'Aucune caisse trouvée',
    'dashboard.withCurrentFilters': 'avec les filtres actuels',
    'dashboard.sold': 'vendus',
    'dashboard.sales': 'ventes',
    'dashboard.items': 'articles',

    // Stock Alerts
    'stockAlerts.title': 'Alertes Stock',
    'stockAlerts.status': 'État du Stock',
    'stockAlerts.allGood': 'Tout va bien',
    'stockAlerts.noAlerts': 'Aucune alerte',
    'stockAlerts.outOfStock': 'Rupture de Stock',
    'stockAlerts.lowStock': 'Stock Faible',
    'stockAlerts.lowStockItems': 'Articles en stock faible',
    'stockAlerts.units': 'unités',
    'stockAlerts.clickToView': 'Cliquez sur les articles pour voir les détails',
    'stockAlerts.totalAlerts': 'Total alertes',

    // Login
    'login.title': 'Connexion',
    'login.subtitle': 'Système de Gestion des Ventes',
    'login.signIn': 'Se connecter',
    'login.signUp': 'Créer un compte',
    'login.createAccount': 'Créer un compte',
    'login.email': 'Adresse email',
    'login.password': 'Mot de passe',
    'login.confirmPassword': 'Confirmer le mot de passe',
    'login.fullName': 'Nom complet',
    'login.role': 'Rôle',
    'login.rememberMe': 'Se souvenir de moi',
    'login.forgotPassword': 'Mot de passe oublié ?',
    'login.accountCreated': 'Compte créé',
    'login.canNowSignIn': 'Vous pouvez maintenant vous connecter',
    'login.signingIn': 'Connexion...',
    'login.creating': 'Création...',
    'login.fillAllFields': 'Veuillez remplir tous les champs obligatoires',
    'login.passwordMinLength': 'Le mot de passe doit contenir au moins 8 caractères',
    'login.nameRequired': 'Le nom est requis',
    'login.passwordsNotMatch': 'Les mots de passe ne correspondent pas',
    'login.passwordRequirements': 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre',
    'login.minCharacters': 'Min 8 caractères',
    'login.yourPassword': 'Votre mot de passe',
    'login.yourFullName': 'Votre nom complet',
    'login.yourEmail': 'votre@email.com',
    'login.repeatPassword': 'Répétez le mot de passe',
    'login.errorOccurred': 'Une erreur est survenue',

    // Roles
    'roles.admin': 'Administrateur',
    'roles.manager': 'Gestionnaire',
    'roles.seller': 'Vendeur',
    'roles.viewer': 'Observateur',

    // Sidebar
    'sidebar.sessionDuration': 'Durée de session',
    'sidebar.confirmLogout': 'Confirmer la déconnexion',
    'sidebar.endSession': 'Terminer votre session actuelle',
    'sidebar.loggingOut': 'Déconnexion...',
    'sidebar.loggedOut': 'Déconnecté',
    'sidebar.redirecting': 'Redirection...',

    // Statistics
    'statistics.title': 'Statistiques Avancées',
    'statistics.subtitle': 'Analyses détaillées de vos performances de ventes',
    'statistics.exportReport': 'Exporter Rapport',
    'statistics.period': 'Période',
    'statistics.7days': '7 jours',
    'statistics.30days': '30 jours',
    'statistics.90days': '90 jours',
    'statistics.custom': 'Personnalisé',
    'statistics.to': 'à',
    'statistics.revenue': 'Chiffre d\'Affaires',
    'statistics.expenses': 'Dépenses',
    'statistics.totalQuantity': 'Quantité Totale',
    'statistics.tickets': 'Tickets',
    'statistics.overview': 'Vue d\'ensemble',
    'statistics.products': 'Produits',
    'statistics.sellers': 'Vendeurs',
    'statistics.registers': 'Caisses',
    'statistics.categoryAnalysis': 'Analyse par Catégorie',
    'statistics.category': 'Catégorie',
    'statistics.quantity': 'Quantité',
    'statistics.percentTotal': '% Total',
    'statistics.topProducts': 'Top Produits',
    'statistics.product': 'Produit',
    'statistics.avgPrice': 'Prix Moyen',
    'statistics.sellerPerformance': 'Performance Vendeurs',
    'statistics.seller': 'Vendeur',
    'statistics.avgBasket': 'Panier Moyen',
    'statistics.registerPerformance': 'Performance Caisses',
    'statistics.register': 'Caisse',
    'statistics.percentOfTotal': '% du Total',
    'statistics.keyInsights': 'Insights Clés',
    'statistics.bestProduct': 'Meilleur Produit',
    'statistics.bestSeller': 'Meilleur Vendeur',
    'statistics.mainCategory': 'Catégorie Principale',
    'statistics.totalExpenses': 'Total Dépenses',
    'statistics.ofRevenue': 'du CA',
    'statistics.refundsWithdrawals': 'Remboursements et retraits',

    // Table headers
    'table.product': 'Produit',
    'table.category': 'Catégorie',
    'table.register': 'Caisse',
    'table.date': 'Date',
    'table.seller': 'Vendeur',
    'table.quantity': 'Quantité',
    'table.unitPrice': 'Prix Unitaire',
    'table.total': 'Total',
    'table.actions': 'Actions',

    // Filters
    'filters.activeFilters': 'Filtres actifs',
    'filters.showing': 'Affichage de',
    'filters.salesOf': 'ventes sur',
    'filters.total': 'total',

    // Time
    'time.today': 'Aujourd\'hui',
    'time.yesterday': 'Hier',
    'time.thisWeek': 'Cette semaine',
    'time.thisMonth': 'Ce mois',
    'time.lastMonth': 'Le mois dernier',

    // Status
    'status.active': 'Actif',
    'status.inactive': 'Inactif',
    'status.pending': 'En attente',
    'status.completed': 'Terminé',
    'status.cancelled': 'Annulé',

    // Messages
    'messages.noDataFound': 'Aucune donnée trouvée',
    'messages.noSalesFound': 'Aucune vente trouvée',
    'messages.loadingData': 'Chargement des données...',
    'messages.dataUpdated': 'Données mises à jour',
    'messages.operationSuccess': 'Opération réussie',
    'messages.operationFailed': 'Opération échouée',

    // Language
    'language.french': 'Français',
    'language.english': 'English',
    'language.selectLanguage': 'Choisir la langue',
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.all': 'All',
    'common.none': 'None',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.warning': 'Warning',
    'common.info': 'Information',

    // App
    'app.title': 'Global VA MADA',
    'app.subtitle': 'Sales Management System',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.sales': 'Sales',
    'nav.stock': 'Stock',
    'nav.statistics': 'Statistics',
    'nav.analytics': 'Analytics',
    'nav.import': 'Import Data',
    'nav.notifications': 'Notifications',
    'nav.alerts': 'Alerts',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of your sales performance',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.revenue': 'Revenue',
    'dashboard.expenses': 'Expenses',
    'dashboard.productsSold': 'Products Sold',
    'dashboard.stockAlerts': 'Stock Alerts',
    'dashboard.topProducts': 'Top Products',
    'dashboard.topSellers': 'Top Sellers',
    'dashboard.registerPerformance': 'Register Performance',
    'dashboard.salesDetails': 'Sales Details',
    'dashboard.filters': 'Filters',
    'dashboard.clearFilters': 'Clear filters',
    'dashboard.startDate': 'Start Date',
    'dashboard.endDate': 'End Date',
    'dashboard.allRegisters': 'All registers',
    'dashboard.allSellers': 'All sellers',
    'dashboard.allCategories': 'All categories',
    'dashboard.filteredPeriod': 'Filtered period',
    'dashboard.positiveSalesOnly': 'Positive sales only',
    'dashboard.negativeAmounts': 'Negative amounts',
    'dashboard.differentItems': 'Different items',
    'dashboard.filtered': 'Filtered',
    'dashboard.noProductsFound': 'No products found',
    'dashboard.noSellersFound': 'No sellers found',
    'dashboard.noRegistersFound': 'No registers found',
    'dashboard.withCurrentFilters': 'with current filters',
    'dashboard.sold': 'sold',
    'dashboard.sales': 'sales',
    'dashboard.items': 'items',

    // Stock Alerts
    'stockAlerts.title': 'Stock Alerts',
    'stockAlerts.status': 'Stock Status',
    'stockAlerts.allGood': 'All Good',
    'stockAlerts.noAlerts': 'No stock alerts',
    'stockAlerts.outOfStock': 'Out of Stock',
    'stockAlerts.lowStock': 'Low Stock',
    'stockAlerts.lowStockItems': 'Low stock items',
    'stockAlerts.units': 'units',
    'stockAlerts.clickToView': 'Click on items to view details',
    'stockAlerts.totalAlerts': 'Total alerts',

    // Login
    'login.title': 'Sign In',
    'login.subtitle': 'Sales Management System',
    'login.signIn': 'Sign In',
    'login.signUp': 'Sign Up',
    'login.createAccount': 'Create Account',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.confirmPassword': 'Confirm Password',
    'login.fullName': 'Full Name',
    'login.role': 'Role',
    'login.rememberMe': 'Remember me',
    'login.forgotPassword': 'Forgot password?',
    'login.accountCreated': 'Account Created',
    'login.canNowSignIn': 'You can now sign in',
    'login.signingIn': 'Signing in...',
    'login.creating': 'Creating...',
    'login.fillAllFields': 'Please fill in all required fields',
    'login.passwordMinLength': 'Password must be at least 8 characters',
    'login.nameRequired': 'Name is required',
    'login.passwordsNotMatch': 'Passwords do not match',
    'login.passwordRequirements': 'Password must contain uppercase, lowercase and number',
    'login.minCharacters': 'Min 8 characters',
    'login.yourPassword': 'Your password',
    'login.yourFullName': 'Your full name',
    'login.yourEmail': 'your@email.com',
    'login.repeatPassword': 'Repeat password',
    'login.errorOccurred': 'An error occurred',

    // Roles
    'roles.admin': 'Admin',
    'roles.manager': 'Manager',
    'roles.seller': 'Seller',
    'roles.viewer': 'Viewer',

    // Sidebar
    'sidebar.sessionDuration': 'Session duration',
    'sidebar.confirmLogout': 'Confirm Logout',
    'sidebar.endSession': 'End your current session',
    'sidebar.loggingOut': 'Logging out...',
    'sidebar.loggedOut': 'Logged Out',
    'sidebar.redirecting': 'Redirecting...',

    // Statistics
    'statistics.title': 'Advanced Analytics',
    'statistics.subtitle': 'Detailed analysis of your sales performance',
    'statistics.exportReport': 'Export Report',
    'statistics.period': 'Period',
    'statistics.7days': '7 days',
    'statistics.30days': '30 days',
    'statistics.90days': '90 days',
    'statistics.custom': 'Custom',
    'statistics.to': 'to',
    'statistics.revenue': 'Revenue',
    'statistics.expenses': 'Expenses',
    'statistics.totalQuantity': 'Total Quantity',
    'statistics.tickets': 'Tickets',
    'statistics.overview': 'Overview',
    'statistics.products': 'Products',
    'statistics.sellers': 'Sellers',
    'statistics.registers': 'Registers',
    'statistics.categoryAnalysis': 'Category Analysis',
    'statistics.category': 'Category',
    'statistics.quantity': 'Quantity',
    'statistics.percentTotal': '% Total',
    'statistics.topProducts': 'Top Products',
    'statistics.product': 'Product',
    'statistics.avgPrice': 'Avg Price',
    'statistics.sellerPerformance': 'Seller Performance',
    'statistics.seller': 'Seller',
    'statistics.avgBasket': 'Avg Basket',
    'statistics.registerPerformance': 'Register Performance',
    'statistics.register': 'Register',
    'statistics.percentOfTotal': '% of Total',
    'statistics.keyInsights': 'Key Insights',
    'statistics.bestProduct': 'Best Product',
    'statistics.bestSeller': 'Best Seller',
    'statistics.mainCategory': 'Main Category',
    'statistics.totalExpenses': 'Total Expenses',
    'statistics.ofRevenue': 'of revenue',
    'statistics.refundsWithdrawals': 'Refunds & withdrawals',

    // Table headers
    'table.product': 'Product',
    'table.category': 'Category',
    'table.register': 'Register',
    'table.date': 'Date',
    'table.seller': 'Seller',
    'table.quantity': 'Quantity',
    'table.unitPrice': 'Unit Price',
    'table.total': 'Total',
    'table.actions': 'Actions',

    // Filters
    'filters.activeFilters': 'Active filters',
    'filters.showing': 'Showing',
    'filters.salesOf': 'sales of',
    'filters.total': 'total',

    // Time
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.thisWeek': 'This week',
    'time.thisMonth': 'This month',
    'time.lastMonth': 'Last month',

    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',

    // Messages
    'messages.noDataFound': 'No data found',
    'messages.noSalesFound': 'No sales found',
    'messages.loadingData': 'Loading data...',
    'messages.dataUpdated': 'Data updated',
    'messages.operationSuccess': 'Operation successful',
    'messages.operationFailed': 'Operation failed',

    // Language
    'language.french': 'Français',
    'language.english': 'English',
    'language.selectLanguage': 'Select Language',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('globalva_language');
    return (saved as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('globalva_language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}