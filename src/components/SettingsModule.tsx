import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette, 
  Globe, 
  Download, 
  Upload, 
  Trash2, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertTriangle,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Lock,
  Key,
  FileText,
  HardDrive,
  Wifi,
  Zap
} from 'lucide-react';

interface UserSettings {
  profile: {
    name: string;
    email: string;
    role: string;
    avatar: string;
    language: string;
    timezone: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
    lowStock: boolean;
    highSales: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    colorScheme: 'blue' | 'purple' | 'green' | 'orange';
    fontSize: 'small' | 'medium' | 'large';
    animations: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
    loginNotifications: boolean;
  };
  system: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    dataRetention: number;
    performanceMode: boolean;
    debugMode: boolean;
  };
}

interface SystemInfo {
  version: string;
  lastUpdate: Date;
  storage: {
    used: number;
    total: number;
  };
  performance: {
    cpu: number;
    memory: number;
    uptime: string;
  };
}

export function SettingsModule() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'system' | 'about'>('profile');
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      name: 'Gestionnaire Global VA MADA',
      email: 'admin@globalvamada.com',
      role: 'Administrateur',
      avatar: '',
      language: 'fr',
      timezone: 'Europe/Paris'
    },
    notifications: {
      email: true,
      push: true,
      sound: true,
      lowStock: true,
      highSales: true,
      systemUpdates: true,
      weeklyReports: false
    },
    appearance: {
      theme: 'dark',
      colorScheme: 'blue',
      fontSize: 'medium',
      animations: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginNotifications: true
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: 365,
      performanceMode: false,
      debugMode: false
    }
  });

  const [systemInfo] = useState<SystemInfo>({
    version: '2.1.0',
    lastUpdate: new Date('2024-01-15'),
    storage: {
      used: 2.4,
      total: 10
    },
    performance: {
      cpu: 15,
      memory: 68,
      uptime: '7 jours, 14 heures'
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'system', label: 'Système', icon: Database },
    { id: 'about', label: 'À propos', icon: Settings }
  ];

  const updateSettings = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage
      localStorage.setItem('globalva_settings', JSON.stringify(settings));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Mot de passe modifié avec succès');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = async () => {
    setExportingData(true);
    try {
      const dataToExport = {
        settings,
        exportDate: new Date().toISOString(),
        version: systemInfo.version
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `globalva-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting settings:', error);
      alert('Erreur lors de l\'export des paramètres');
    } finally {
      setExportingData(false);
    }
  };

  const importSettings = async (file: File) => {
    setImportingData(true);
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      if (importedData.settings) {
        setSettings(importedData.settings);
        await saveSettings();
        alert('Paramètres importés avec succès');
      } else {
        alert('Format de fichier invalide');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      alert('Erreur lors de l\'import des paramètres');
    } finally {
      setImportingData(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      setSettings({
        profile: {
          name: 'Gestionnaire Global VA MADA',
          email: 'admin@globalvamada.com',
          role: 'Administrateur',
          avatar: '',
          language: 'fr',
          timezone: 'Europe/Paris'
        },
        notifications: {
          email: true,
          push: true,
          sound: true,
          lowStock: true,
          highSales: true,
          systemUpdates: true,
          weeklyReports: false
        },
        appearance: {
          theme: 'dark',
          colorScheme: 'blue',
          fontSize: 'medium',
          animations: true
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          passwordExpiry: 90,
          loginNotifications: true
        },
        system: {
          autoBackup: true,
          backupFrequency: 'daily',
          dataRetention: 365,
          performanceMode: false,
          debugMode: false
        }
      });
      alert('Paramètres réinitialisés aux valeurs par défaut');
    }
  };

  const enableTwoFactor = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateSettings('security', 'twoFactorAuth', true);
      alert('Authentification à deux facteurs activée');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      alert('Erreur lors de l\'activation de l\'authentification à deux facteurs');
    } finally {
      setSaving(false);
    }
  };

  const disableTwoFactor = async () => {
    if (confirm('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?')) {
      setSaving(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateSettings('security', 'twoFactorAuth', false);
        alert('Authentification à deux facteurs désactivée');
      } catch (error) {
        console.error('Error disabling 2FA:', error);
        alert('Erreur lors de la désactivation de l\'authentification à deux facteurs');
      } finally {
        setSaving(false);
      }
    }
  };

  const runSystemDiagnostic = async () => {
    setSaving(true);
    try {
      // Simulate diagnostic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Diagnostic système terminé. Aucun problème détecté.');
    } catch (error) {
      console.error('Error running diagnostic:', error);
      alert('Erreur lors du diagnostic système');
    } finally {
      setSaving(false);
    }
  };

  const clearCache = async () => {
    if (confirm('Êtes-vous sûr de vouloir vider le cache ? Cela peut améliorer les performances.')) {
      setSaving(true);
      try {
        // Clear localStorage cache
        const settingsBackup = localStorage.getItem('globalva_settings');
        localStorage.clear();
        if (settingsBackup) {
          localStorage.setItem('globalva_settings', settingsBackup);
        }
        
        // Simulate cache clearing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert('Cache vidé avec succès');
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Erreur lors du vidage du cache');
      } finally {
        setSaving(false);
      }
    }
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('globalva_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Informations Personnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nom complet</label>
            <input
              type="text"
              value={settings.profile.name}
              onChange={(e) => updateSettings('profile', 'name', e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={settings.profile.email}
              onChange={(e) => updateSettings('profile', 'email', e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Rôle</label>
            <select
              value={settings.profile.role}
              onChange={(e) => updateSettings('profile', 'role', e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="Administrateur">Administrateur</option>
              <option value="Gestionnaire">Gestionnaire</option>
              <option value="Vendeur">Vendeur</option>
              <option value="Observateur">Observateur</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Langue</label>
            <select
              value={settings.profile.language}
              onChange={(e) => updateSettings('profile', 'language', e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Changer le Mot de Passe</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Confirmer le mot de passe</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le nouveau mot de passe"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <button 
            onClick={changePassword}
            disabled={!newPassword || !confirmPassword || saving}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {saving ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Préférences de Notification</h3>
        
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Notifications par email', icon: Mail },
            { key: 'push', label: 'Notifications push', icon: Smartphone },
            { key: 'sound', label: 'Sons de notification', icon: Volume2 }
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">{label}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications[key as keyof typeof settings.notifications]}
                  onChange={(e) => updateSettings('notifications', key, e.target.checked)}
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

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Alertes Système</h3>
        
        <div className="space-y-4">
          {[
            { key: 'lowStock', label: 'Alertes de stock faible', description: 'Recevoir des notifications quand le stock est bas' },
            { key: 'highSales', label: 'Alertes de ventes élevées', description: 'Notifications pour les pics de ventes' },
            { key: 'systemUpdates', label: 'Mises à jour système', description: 'Notifications des nouvelles versions' },
            { key: 'weeklyReports', label: 'Rapports hebdomadaires', description: 'Résumé des performances chaque semaine' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
              <div>
                <div className="text-white font-medium">{label}</div>
                <div className="text-gray-400 text-sm">{description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications[key as keyof typeof settings.notifications]}
                  onChange={(e) => updateSettings('notifications', key, e.target.checked)}
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
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Thème et Couleurs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Thème</label>
            <div className="space-y-2">
              {[
                { value: 'light', label: 'Clair', icon: Sun },
                { value: 'dark', label: 'Sombre', icon: Moon },
                { value: 'auto', label: 'Automatique', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={settings.appearance.theme === value}
                    onChange={(e) => updateSettings('appearance', 'theme', e.target.value)}
                    className="text-cyan-500"
                  />
                  <Icon className="w-5 h-5 text-gray-400" />
                  <span className="text-white">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Schéma de couleurs</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'blue', color: 'bg-blue-500' },
                { value: 'purple', color: 'bg-purple-500' },
                { value: 'green', color: 'bg-green-500' },
                { value: 'orange', color: 'bg-orange-500' }
              ].map(({ value, color }) => (
                <label key={value} className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="colorScheme"
                    value={value}
                    checked={settings.appearance.colorScheme === value}
                    onChange={(e) => updateSettings('appearance', 'colorScheme', e.target.value)}
                    className="text-cyan-500"
                  />
                  <div className={`w-4 h-4 rounded-full ${color}`}></div>
                  <span className="text-white capitalize">{value}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Interface</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Taille de police</label>
            <select
              value={settings.appearance.fontSize}
              onChange={(e) => updateSettings('appearance', 'fontSize', e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="small">Petite</option>
              <option value="medium">Moyenne</option>
              <option value="large">Grande</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div>
              <div className="text-white font-medium">Animations</div>
              <div className="text-gray-400 text-sm">Activer les animations de l'interface</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.appearance.animations}
                onChange={(e) => updateSettings('appearance', 'animations', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                             peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Authentification</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <Key className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">Authentification à deux facteurs</div>
                <div className="text-gray-400 text-sm">Sécurité renforcée avec code SMS/Email</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {settings.security.twoFactorAuth && (
                <button
                  onClick={disableTwoFactor}
                  disabled={saving}
                  className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-sm hover:bg-red-500/30 
                             disabled:opacity-50 transition-all duration-200"
                >
                  Désactiver
                </button>
              )}
              {!settings.security.twoFactorAuth && (
                <button
                  onClick={enableTwoFactor}
                  disabled={saving}
                  className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm hover:bg-green-500/30 
                             disabled:opacity-50 transition-all duration-200"
                >
                  Activer
                </button>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => e.target.checked ? enableTwoFactor() : disableTwoFactor()}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                               peer-checked:after:translate-x-full peer-checked:after:border-white 
                               after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                               after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                               peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">Notifications de connexion</div>
                <div className="text-gray-400 text-sm">Alertes lors de nouvelles connexions</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.loginNotifications}
                onChange={(e) => updateSettings('security', 'loginNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                             peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Politiques de Sécurité</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Délai d'expiration de session (minutes)</label>
            <select
              value={settings.security.sessionTimeout}
              onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 heure</option>
              <option value={120}>2 heures</option>
              <option value={480}>8 heures</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Expiration du mot de passe (jours)</label>
            <select
              value={settings.security.passwordExpiry}
              onChange={(e) => updateSettings('security', 'passwordExpiry', parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
              <option value={180}>180 jours</option>
              <option value={365}>1 an</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Sauvegarde et Données</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <HardDrive className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">Sauvegarde automatique</div>
                <div className="text-gray-400 text-sm">Sauvegarde régulière des données</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.system.autoBackup}
                onChange={(e) => updateSettings('system', 'autoBackup', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                             peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Fréquence de sauvegarde</label>
              <select
                value={settings.system.backupFrequency}
                onChange={(e) => updateSettings('system', 'backupFrequency', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
                disabled={!settings.system.autoBackup}
              >
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Rétention des données (jours)</label>
              <select
                value={settings.system.dataRetention}
                onChange={(e) => updateSettings('system', 'dataRetention', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                           focus:outline-none focus:border-cyan-500"
              >
                <option value={90}>90 jours</option>
                <option value={180}>180 jours</option>
                <option value={365}>1 an</option>
                <option value={730}>2 ans</option>
                <option value={1825}>5 ans</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance et Maintenance</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">Mode performance</div>
                <div className="text-gray-400 text-sm">Optimise les performances au détriment de la batterie</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.system.performanceMode}
                onChange={(e) => updateSettings('system', 'performanceMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                             peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">Mode debug</div>
                <div className="text-gray-400 text-sm">Active les logs détaillés pour le débogage</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.system.debugMode}
                onChange={(e) => updateSettings('system', 'debugMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                             peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={runSystemDiagnostic}
              disabled={saving}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 
                         text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 
                         disabled:opacity-50 transition-all duration-200"
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
              <span>Diagnostic Système</span>
            </button>
            
            <button
              onClick={clearCache}
              disabled={saving}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 
                         text-white font-semibold py-3 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 
                         disabled:opacity-50 transition-all duration-200"
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              <span>Vider le Cache</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gestion des Données</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={exportSettings}
            disabled={exportingData}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 
                       text-white font-semibold py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 
                       disabled:opacity-50 transition-all duration-200"
          >
            {exportingData ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>Exporter</span>
          </button>
          
          <label className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 
                            text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 
                            cursor-pointer transition-all duration-200">
            {importingData ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span>Importer</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && importSettings(e.target.files[0])}
              className="hidden"
            />
          </label>
          
          <button
            onClick={resetToDefaults}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 
                       text-white font-semibold py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                       transition-all duration-200"
          >
            <Trash2 className="w-5 h-5" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Informations Système</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-gray-400 text-sm">Version</div>
              <div className="text-white font-semibold">{systemInfo.version}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Dernière mise à jour</div>
              <div className="text-white font-semibold">{systemInfo.lastUpdate.toLocaleDateString('fr-FR')}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Temps de fonctionnement</div>
              <div className="text-white font-semibold">{systemInfo.performance.uptime}</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-gray-400 text-sm mb-2">Stockage utilisé</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                  style={{ width: `${(systemInfo.storage.used / systemInfo.storage.total) * 100}%` }}
                ></div>
              </div>
              <div className="text-white text-sm mt-1">
                {systemInfo.storage.used} GB / {systemInfo.storage.total} GB
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-2">Utilisation CPU</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full"
                  style={{ width: `${systemInfo.performance.cpu}%` }}
                ></div>
              </div>
              <div className="text-white text-sm mt-1">{systemInfo.performance.cpu}%</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-2">Utilisation mémoire</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${systemInfo.performance.memory}%` }}
                ></div>
              </div>
              <div className="text-white text-sm mt-1">{systemInfo.performance.memory}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-xl 
                     border border-cyan-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">À propos de Global VA MADA</h3>
        
        <div className="space-y-3 text-gray-300">
          <p>
            Système de gestion des ventes et du stock développé spécialement pour Global VA MADA.
            Cette application permet de suivre en temps réel les performances de vos caisses,
            gérer votre inventaire et analyser vos données de vente.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-2">Fonctionnalités</h4>
              <ul className="text-sm space-y-1">
                <li>• Suivi des ventes en temps réel</li>
                <li>• Gestion complète du stock</li>
                <li>• Analyses et statistiques avancées</li>
                <li>• Import/Export Excel</li>
                <li>• Alertes intelligentes</li>
              </ul>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-2">Support</h4>
              <ul className="text-sm space-y-1">
                <li>• Documentation en ligne</li>
                <li>• Support technique 24/7</li>
                <li>• Mises à jour automatiques</li>
                <li>• Formation utilisateur</li>
                <li>• Sauvegarde cloud</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
          <p className="text-gray-400">Configurez votre application selon vos préférences</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-purple-600 
                       disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* Success notification */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-xl 
                       flex items-center space-x-3"
          >
            <Check className="w-5 h-5" />
            <span>Paramètres sauvegardés avec succès</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs navigation */}
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'appearance' && renderAppearanceTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'system' && renderSystemTab()}
          {activeTab === 'about' && renderAboutTab()}
        </motion.div>
      </div>
    </div>
  );
}