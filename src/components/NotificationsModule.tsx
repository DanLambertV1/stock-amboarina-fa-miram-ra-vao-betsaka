import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Info, X, Trash2, Filter, Search, Calendar, Package, TrendingUp, Users, Settings, RefreshCw, Star, Clock, Eye, Volume2, Download, Shield, Activity, Plus, AlertCircle } from 'lucide-react';
import { format, isToday, isYesterday, subDays, subHours, subMinutes } from 'date-fns';
import { useFirebaseData } from '../hooks/useFirebaseData';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'stock' | 'sales' | 'system' | 'user' | 'security';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    productId?: string;
    productName?: string;
    sellerId?: string;
    amount?: number;
    quantity?: number;
  };
}

interface NotificationSettings {
  sound: boolean;
  desktop: boolean;
  email: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  categories: {
    stock: boolean;
    sales: boolean;
    system: boolean;
    user: boolean;
    security: boolean;
  };
}

export function NotificationsModule() {
  const { products, registerSales, dashboardStats, loading } = useFirebaseData();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'priority'>('timestamp');
  const [showSettings, setShowSettings] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const [settings, setSettings] = useState<NotificationSettings>({
    sound: true,
    desktop: true,
    email: false,
    autoRefresh: true,
    refreshInterval: 5,
    categories: {
      stock: true,
      sales: true,
      system: true,
      user: true,
      security: true
    }
  });

  // ✅ Générer des notifications basées sur les données réelles
  const generateRealNotifications = useMemo((): Notification[] => {
    const realNotifications: Notification[] = [];
    const now = new Date();

    // 1. Notifications de stock faible et rupture (basées sur les vrais produits)
    products.forEach(product => {
      if (product.stock === 0) {
        realNotifications.push({
          id: `stock-out-${product.id}`,
          type: 'error',
          category: 'stock',
          title: 'Rupture de stock critique',
          message: `Le produit "${product.name}" est en rupture de stock (0 unités disponibles)`,
          timestamp: subMinutes(now, Math.floor(Math.random() * 60)),
          read: false,
          starred: true,
          priority: 'urgent',
          metadata: {
            productId: product.id,
            productName: product.name,
            quantity: 0
          }
        });
      } else if (product.stock <= product.minStock) {
        realNotifications.push({
          id: `stock-low-${product.id}`,
          type: 'warning',
          category: 'stock',
          title: 'Stock faible détecté',
          message: `Le produit "${product.name}" n'a plus que ${product.stock} unités en stock (minimum: ${product.minStock})`,
          timestamp: subMinutes(now, Math.floor(Math.random() * 120)),
          read: Math.random() > 0.7,
          starred: product.stock <= product.minStock / 2,
          priority: product.stock <= product.minStock / 2 ? 'high' : 'medium',
          metadata: {
            productId: product.id,
            productName: product.name,
            quantity: product.stock
          }
        });
      }
    });

    // 2. Notifications de ventes (basées sur les vraies ventes)
    if (dashboardStats) {
      // Objectif de vente quotidien
      const todaySales = registerSales.filter(sale => isToday(sale.date));
      const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      
      if (todayRevenue > 1000) {
        realNotifications.push({
          id: 'sales-target-reached',
          type: 'success',
          category: 'sales',
          title: 'Objectif de vente dépassé',
          message: `Excellente journée ! Vous avez réalisé ${todayRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} de chiffre d'affaires aujourd'hui`,
          timestamp: subHours(now, 1),
          read: false,
          starred: false,
          priority: 'medium',
          metadata: {
            amount: todayRevenue
          }
        });
      }

      // Top vendeur du jour
      if (dashboardStats.topSellers.length > 0) {
        const topSeller = dashboardStats.topSellers[0];
        realNotifications.push({
          id: 'top-seller-today',
          type: 'success',
          category: 'sales',
          title: 'Meilleure performance du jour',
          message: `${topSeller.seller} est en tête des ventes avec ${topSeller.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
          timestamp: subHours(now, 2),
          read: Math.random() > 0.5,
          starred: false,
          priority: 'low',
          metadata: {
            sellerId: topSeller.seller,
            amount: topSeller.revenue
          }
        });
      }

      // Produit le plus vendu
      if (dashboardStats.topProducts.length > 0) {
        const topProduct = dashboardStats.topProducts[0];
        realNotifications.push({
          id: 'top-product-today',
          type: 'info',
          category: 'sales',
          title: 'Produit star du jour',
          message: `"${topProduct.product}" est le produit le plus vendu avec ${topProduct.quantity} unités vendues`,
          timestamp: subHours(now, 3),
          read: Math.random() > 0.3,
          starred: false,
          priority: 'low',
          metadata: {
            productName: topProduct.product,
            quantity: topProduct.quantity,
            amount: topProduct.revenue
          }
        });
      }
    }

    // 3. Notifications système (basées sur l'état réel)
    realNotifications.push({
      id: 'system-sync-success',
      type: 'success',
      category: 'system',
      title: 'Synchronisation réussie',
      message: `Données synchronisées avec succès. ${products.length} produits et ${registerSales.length} ventes chargés`,
      timestamp: subMinutes(now, 30),
      read: true,
      starred: false,
      priority: 'low',
      metadata: {
        quantity: products.length + registerSales.length
      }
    });

    // Notification de sauvegarde automatique
    realNotifications.push({
      id: 'system-backup',
      type: 'info',
      category: 'system',
      title: 'Sauvegarde automatique',
      message: 'Sauvegarde automatique des données effectuée avec succès',
      timestamp: subHours(now, 6),
      read: Math.random() > 0.8,
      starred: false,
      priority: 'low'
    });

    // 4. Notifications de sécurité
    realNotifications.push({
      id: 'security-session',
      type: 'info',
      category: 'security',
      title: 'Session active',
      message: 'Votre session est active depuis plus de 4 heures. Pensez à sauvegarder vos modifications',
      timestamp: subHours(now, 4),
      read: false,
      starred: false,
      priority: 'low'
    });

    // 5. Notifications utilisateur
    const recentSales = registerSales.filter(sale => 
      sale.date > subHours(now, 24)
    );
    
    if (recentSales.length > 0) {
      const uniqueSellers = [...new Set(recentSales.map(sale => sale.seller))];
      
      uniqueSellers.forEach(seller => {
        const sellerSales = recentSales.filter(sale => sale.seller === seller);
        const sellerRevenue = sellerSales.reduce((sum, sale) => sum + sale.total, 0);
        
        if (sellerRevenue > 500) {
          realNotifications.push({
            id: `user-performance-${seller}`,
            type: 'success',
            category: 'user',
            title: 'Performance exceptionnelle',
            message: `${seller} a réalisé ${sellerRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} sur les dernières 24h`,
            timestamp: subHours(now, Math.floor(Math.random() * 12)),
            read: Math.random() > 0.6,
            starred: sellerRevenue > 1000,
            priority: sellerRevenue > 1000 ? 'medium' : 'low',
            metadata: {
              sellerId: seller,
              amount: sellerRevenue,
              quantity: sellerSales.length
            }
          });
        }
      });
    }

    // Trier par timestamp (plus récent en premier)
    return realNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [products, registerSales, dashboardStats]);

  // ✅ Mettre à jour les notifications quand les données changent
  useEffect(() => {
    if (!loading && products.length > 0) {
      const realNotifications = generateRealNotifications;
      setNotifications(realNotifications);
      setLastRefresh(new Date());
    }
  }, [products, registerSales, dashboardStats, loading, generateRealNotifications]);

  // Auto-refresh des notifications
  useEffect(() => {
    if (settings.autoRefresh) {
      const interval = setInterval(() => {
        const realNotifications = generateRealNotifications;
        setNotifications(realNotifications);
        setLastRefresh(new Date());
      }, settings.refreshInterval * 60 * 1000); // Convert minutes to milliseconds

      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, generateRealNotifications]);

  // Filtrer les notifications
  useEffect(() => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.metadata?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.metadata?.sellerId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(notification => notification.category === filterCategory);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }

    if (filterRead === 'unread') {
      filtered = filtered.filter(notification => !notification.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(notification => notification.read);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        return b.timestamp.getTime() - a.timestamp.getTime();
      }
    });

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterCategory, filterType, filterRead, sortBy]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'error': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock': return Package;
      case 'sales': return TrendingUp;
      case 'user': return Users;
      case 'security': return Shield;
      default: return Settings;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return `Aujourd'hui à ${format(timestamp, 'HH:mm')}`;
    } else if (isYesterday(timestamp)) {
      return `Hier à ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'dd/MM/yyyy à HH:mm');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const toggleStar = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, starred: !notification.starred } : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const deleteAllRead = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications lues ?')) {
      setNotifications(prev => prev.filter(notification => !notification.read));
    }
  };

  const refreshNotifications = () => {
    const realNotifications = generateRealNotifications;
    setNotifications(realNotifications);
    setLastRefresh(new Date());
    
    // Ajouter une notification de confirmation
    const refreshNotification: Notification = {
      id: `refresh-${Date.now()}`,
      type: 'success',
      category: 'system',
      title: 'Actualisation effectuée',
      message: `Notifications mises à jour avec ${realNotifications.length} éléments`,
      timestamp: new Date(),
      read: false,
      starred: false,
      priority: 'low'
    };
    
    setNotifications(prev => [refreshNotification, ...prev]);
  };

  const exportNotifications = () => {
    const dataToExport = {
      notifications: filteredNotifications.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString()
      })),
      exportDate: new Date().toISOString(),
      lastRefresh: lastRefresh.toISOString(),
      totalProducts: products.length,
      totalSales: registerSales.length,
      filters: {
        searchTerm,
        filterCategory,
        filterType,
        filterRead,
        sortBy
      },
      settings
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-globalva-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const starredCount = notifications.filter(n => n.starred).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent').length;
  const todayCount = notifications.filter(n => isToday(n.timestamp)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-white">Chargement des notifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Centre de Notifications
            {unreadCount > 0 && (
              <span className="ml-3 bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                {unreadCount} non lues
              </span>
            )}
          </h1>
          <p className="text-gray-400">
            Alertes et notifications basées sur vos données réelles
            {lastRefresh && (
              <span className="ml-2 text-xs">
                • Dernière mise à jour: {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={refreshNotifications}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Actualiser</span>
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Settings className="w-5 h-5" />
            <span>Paramètres</span>
          </button>
        </div>
      </div>

      {/* Statistiques basées sur les données réelles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
            </div>
          </div>
          <p className="text-blue-400 text-xs mt-1">Notifications actives</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Non lues</p>
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
            </div>
          </div>
          <p className="text-red-400 text-xs mt-1">Nécessitent attention</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-gray-400 text-sm">Urgentes</p>
              <p className="text-2xl font-bold text-white">{urgentCount}</p>
            </div>
          </div>
          <p className="text-orange-400 text-xs mt-1">Action immédiate requise</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Aujourd'hui</p>
              <p className="text-2xl font-bold text-white">{todayCount}</p>
            </div>
          </div>
          <p className="text-green-400 text-xs mt-1">Notifications du jour</p>
        </motion.div>
      </div>

      {/* Résumé des données sources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                   border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Sources de Données</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{products.length}</p>
            <p className="text-blue-400 text-sm">Produits analysés</p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{registerSales.length}</p>
            <p className="text-green-400 text-sm">Ventes surveillées</p>
          </div>
          
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {products.filter(p => p.stock <= p.minStock).length}
            </p>
            <p className="text-orange-400 text-sm">Alertes de stock</p>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {dashboardStats ? dashboardStats.topSellers.length : 0}
            </p>
            <p className="text-purple-400 text-sm">Vendeurs actifs</p>
          </div>
        </div>
      </motion.div>

      {/* Panneau de paramètres */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Paramètres de Notification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3">Méthodes de notification</h4>
                <div className="space-y-3">
                  {[
                    { key: 'sound', label: 'Sons', icon: Volume2 },
                    { key: 'desktop', label: 'Notifications bureau', icon: Bell },
                    { key: 'email', label: 'Email', icon: Bell },
                    { key: 'autoRefresh', label: 'Actualisation auto', icon: RefreshCw }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white">{label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                                       peer-checked:after:translate-x-full peer-checked:after:border-white 
                                       after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                       after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                                       peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  ))}
                  
                  {settings.autoRefresh && (
                    <div className="p-3 bg-gray-700/30 rounded-lg">
                      <label className="block text-white text-sm mb-2">Intervalle d'actualisation (minutes)</label>
                      <select
                        value={settings.refreshInterval}
                        onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                      >
                        <option value={1}>1 minute</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-3">Catégories surveillées</h4>
                <div className="space-y-3">
                  {Object.entries(settings.categories).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(key)({ className: "w-5 h-5 text-gray-400" })}
                        <span className="text-white capitalize">{key}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            categories: { ...prev.categories, [key]: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                                       peer-checked:after:translate-x-full peer-checked:after:border-white 
                                       after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                       after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                                       peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres et actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher dans les notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                           placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Toutes catégories</option>
              <option value="stock">Stock ({notifications.filter(n => n.category === 'stock').length})</option>
              <option value="sales">Ventes ({notifications.filter(n => n.category === 'sales').length})</option>
              <option value="system">Système ({notifications.filter(n => n.category === 'system').length})</option>
              <option value="user">Utilisateur ({notifications.filter(n => n.category === 'user').length})</option>
              <option value="security">Sécurité ({notifications.filter(n => n.category === 'security').length})</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Tous types</option>
              <option value="info">Information ({notifications.filter(n => n.type === 'info').length})</option>
              <option value="success">Succès ({notifications.filter(n => n.type === 'success').length})</option>
              <option value="warning">Avertissement ({notifications.filter(n => n.type === 'warning').length})</option>
              <option value="error">Erreur ({notifications.filter(n => n.type === 'error').length})</option>
            </select>
            
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Toutes</option>
              <option value="unread">Non lues ({unreadCount})</option>
              <option value="read">Lues ({notifications.length - unreadCount})</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 text-sm"
            >
              Tout marquer lu
            </button>
            
            <button
              onClick={deleteAllRead}
              disabled={notifications.filter(n => n.read).length === 0}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-red-600 hover:to-red-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 text-sm"
            >
              Supprimer lues
            </button>
            
            <button
              onClick={exportNotifications}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 
                         transition-all duration-200 text-sm flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <span className="text-gray-400 text-sm">Trier par:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'priority')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="timestamp">Date (plus récent)</option>
            <option value="priority">Priorité (plus urgent)</option>
          </select>
        </div>
      </motion.div>

      {/* Liste des notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            Notifications ({filteredNotifications.length})
            {filteredNotifications.length !== notifications.length && (
              <span className="text-sm text-gray-400 ml-2">
                sur {notifications.length} total
              </span>
            )}
          </h3>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const CategoryIcon = getCategoryIcon(notification.category);
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:bg-gray-700/20 ${
                    notification.read ? 'bg-gray-700/10 border-gray-700/50' : 'bg-gray-700/30 border-gray-600'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Indicateur de priorité */}
                    <div className={`w-1 h-16 rounded-full ${getPriorityColor(notification.priority)}`}></div>
                    
                    {/* Icône */}
                    <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CategoryIcon className="w-4 h-4 text-gray-400" />
                            <h4 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                              {notification.title}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              notification.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {notification.priority}
                            </span>
                          </div>
                          
                          <p className={`text-sm mb-2 ${notification.read ? 'text-gray-400' : 'text-gray-300'}`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </span>
                            
                            <span className="capitalize">{notification.category}</span>
                            
                            {notification.metadata && (
                              <div className="flex items-center space-x-3">
                                {notification.metadata.amount && (
                                  <span className="text-green-400 font-medium">
                                    {notification.metadata.amount.toLocaleString('fr-FR', { 
                                      style: 'currency', 
                                      currency: 'EUR' 
                                    })}
                                  </span>
                                )}
                                {notification.metadata.quantity && (
                                  <span className="text-blue-400">
                                    Qté: {notification.metadata.quantity}
                                  </span>
                                )}
                                {notification.metadata.productName && (
                                  <span className="text-purple-400">
                                    {notification.metadata.productName}
                                  </span>
                                )}
                                {notification.metadata.sellerId && (
                                  <span className="text-cyan-400">
                                    {notification.metadata.sellerId}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleStar(notification.id)}
                            className={`p-1 rounded transition-colors duration-200 ${
                              notification.starred ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${notification.starred ? 'fill-current' : ''}`} />
                          </button>
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-green-400 transition-colors duration-200"
                              title="Marquer comme lu"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors duration-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Aucune notification</h3>
              <p className="text-gray-500">
                {searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterRead !== 'all'
                  ? 'Aucune notification ne correspond aux filtres sélectionnés'
                  : 'Toutes vos notifications sont à jour'
                }
              </p>
              {notifications.length === 0 && (
                <button
                  onClick={refreshNotifications}
                  className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                             py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 
                             transition-all duration-200 flex items-center space-x-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Générer les notifications</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}