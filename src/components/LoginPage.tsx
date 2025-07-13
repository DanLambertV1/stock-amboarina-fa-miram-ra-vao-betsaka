import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn,
  AlertCircle,
  RefreshCw,
  UserPlus,
  User,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './common/LanguageSelector';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'seller' | 'viewer'>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  const { login, signUp } = useAuth();

  const validateForm = () => {
    if (!email || !password) {
      setAuthError(t('login.fillAllFields'));
      return false;
    }

    if (password.length < 8) {
      setAuthError(t('login.passwordMinLength'));
      return false;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setAuthError(t('login.nameRequired'));
        return false;
      }

      if (password !== confirmPassword) {
        setAuthError(t('login.passwordsNotMatch'));
        return false;
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        setAuthError(t('login.passwordRequirements'));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const success = await signUp(email, password, name, role);
        
        if (success) {
          setSignUpSuccess(true);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setName('');
          setRole('manager');
          
          setTimeout(() => {
            setSignUpSuccess(false);
            setIsSignUp(false);
          }, 2000);
        }
      } else {
        const success = await login(email, password);
        
        if (success) {
          onLoginSuccess();
        }
      }
    } catch (error: any) {
      setAuthError(error.message || t('login.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRole('manager');
    setAuthError('');
    setSignUpSuccess(false);
  };

  const switchMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Minimal Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Language Selector */}
        <div className="absolute top-0 right-0">
          <LanguageSelector />
        </div>

        {/* Clean Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl 
                       flex items-center justify-center mx-auto mb-4"
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            {t('app.title')}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 text-sm"
          >
            {t('app.subtitle')}
          </motion.p>
        </div>

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8"
        >
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {isSignUp ? t('login.createAccount') : t('login.title')}
            </h2>
            
            {!signUpSuccess && (
              <button
                type="button"
                onClick={switchMode}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200 
                           flex items-center space-x-1"
              >
                {isSignUp ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('common.back')}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{t('login.signUp')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {signUpSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('login.accountCreated')}</h3>
                <p className="text-slate-400 text-sm">{t('login.canNowSignIn')}</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Name Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t('login.fullName')}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={isSignUp}
                          className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white
                                     placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 
                                     focus:ring-blue-500/20 transition-all duration-200"
                          placeholder={t('login.yourFullName')}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    {t('login.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white
                                 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 
                                 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder={t('login.yourEmail')}
                    />
                  </div>
                </div>

                {/* Role Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t('login.role')}
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        required={isSignUp}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white
                                   focus:outline-none focus:border-blue-500 focus:ring-2 
                                   focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="viewer">{t('roles.viewer')}</option>
                        <option value="seller">{t('roles.seller')}</option>
                        <option value="manager">{t('roles.manager')}</option>
                        <option value="admin">{t('roles.admin')}</option>
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white
                                 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 
                                 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder={isSignUp ? t('login.minCharacters') : t('login.yourPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 
                                 hover:text-white transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t('login.confirmPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={isSignUp}
                          className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white
                                     placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 
                                     focus:ring-blue-500/20 transition-all duration-200"
                          placeholder={t('login.repeatPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 
                                     hover:text-white transition-colors duration-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember Me (Login Only) */}
                {!isSignUp && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded 
                                   focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-400">{t('login.rememberMe')}</span>
                    </label>
                  </div>
                )}

                {/* Error Message */}
                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-red-400 text-sm">{authError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password || (isSignUp && (!name || !confirmPassword))}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold 
                             py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-600 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isSignUp ? t('login.creating') : t('login.signingIn')}</span>
                    </>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                      <span>{isSignUp ? t('login.createAccount') : t('login.signIn')}</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-slate-400 text-sm"
        >
          <p>© 2024 Global VA MADA</p>
        </motion.div>
      </motion.div>
    </div>
  );
}