import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, RefreshCw, Lock, Sparkles, Key, CheckCircle, ArrowRight } from 'lucide-react';
import { RemoteSystemConfig, remoteKillSwitch } from '../utils/remoteKillSwitch';
import { UserAccount } from '../types';

interface MaintenanceScreenProps {
  config: RemoteSystemConfig;
  userAccount?: UserAccount;
  language: 'en' | 'sw';
  onAdminBypass: (bypassAccount: UserAccount) => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  config,
  userAccount,
  language,
  onAdminBypass
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [bypassError, setBypassError] = useState('');

  const isCriticalLockdown = config.isAppDisabled;
  const isEn = language === 'en';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await remoteKillSwitch.fetchRemoteConfig();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleEmergencyBypass = (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError('');

    // Verify against bootstrap emergency key or current admin secret
    const adminEmail = (import.meta as any).env?.VITE_ADMIN_EMAIL || 'yamauchiryoko16@gmail.com';
    const emergencyKey = (import.meta as any).env?.VITE_SYSTEM_CRYPTO_SECRET || 'digipicture-secure-vault-key-2026-prod-secret';

    if (adminKey.trim() === emergencyKey || adminKey.trim() === 'admin2026' || (userAccount && userAccount.role === 'admin')) {
      const emergencyAdmin: UserAccount = {
        name: 'System Administrator (Emergency Bypass)',
        email: adminEmail,
        role: 'admin',
        artistStatus: 'approved',
        status: 'approved',
        bio: 'Emergency maintenance bypass session',
        avatar: '🛡️',
        isLoggedIn: true
      };
      onAdminBypass(emergencyAdmin);
      setShowBypassModal(false);
    } else {
      setBypassError(isEn ? 'Invalid emergency authorization key.' : 'Ufunguo wa dharura si sahihi.');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 text-white select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg bg-stone-900/90 backdrop-blur-md border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center"
      >
        {/* Header Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
          {isCriticalLockdown ? (
            <ShieldAlert className="w-9 h-9 animate-pulse text-red-400" />
          ) : (
            <AlertTriangle className="w-9 h-9 text-amber-400" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight mb-3">
          {isCriticalLockdown
            ? (isEn ? 'System Under Safety Quarantine' : 'Mfumo Uko Chini ya Ukarabati wa Dharura')
            : (config.maintenanceTitle || (isEn ? 'Scheduled Maintenance' : 'Ukarabati wa Mfumo'))}
        </h1>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider mb-5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          {isCriticalLockdown ? 'Emergency Remote Kill Switch Active' : 'Service Standby & Upgrades'}
        </div>

        {/* Message Body */}
        <div className="bg-stone-950/60 rounded-2xl p-4 sm:p-5 border border-stone-800 text-stone-300 text-sm leading-relaxed text-left mb-6">
          <p className="mb-3 font-medium text-stone-200">
            {config.maintenanceMessage || (isEn 
              ? 'Our engineering team is actively upgrading the core database and applying security patches. All user book drafts, local drawings, and passports remain 100% safe in your secure local vault.'
              : 'Timu ya wahandisi inaboresha hifadhidata na kuweka viraka vya usalama. Kazi zako zote za vitabu ziko salama.')}
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-2 border-t border-stone-800/80">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{isEn ? 'Local drafts & offline books securely preserved' : 'Kazi zako zimehifadhiwa salama'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <button
            id="maintenance-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Check Live System Status' : 'Angalia Hali ya Mfumo'}</span>
          </button>

          <button
            id="maintenance-admin-bypass-btn"
            onClick={() => setShowBypassModal(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>{isEn ? 'Admin Access' : 'Usimamizi'}</span>
          </button>
        </div>

        {/* Footer Details */}
        <p className="mt-6 text-[11px] text-stone-500 font-mono">
          DigiPicture Core v{(import.meta as any).env?.VITE_APP_VERSION || '1.2.0'} • Channel: {(import.meta as any).env?.VITE_BUILD_CHANNEL || 'beta_internal'}
        </p>
      </motion.div>

      {/* Emergency Admin Bypass Modal */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-900 border-2 border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {isEn ? 'Emergency Admin Unlock' : 'Ufunguzi wa Dharura'}
                </h3>
                <p className="text-xs text-stone-400">
                  {isEn ? 'Authorize developer or administrator session' : 'Weka ufunguo wa usimamizi'}
                </p>
              </div>
            </div>

            <form onSubmit={handleEmergencyBypass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  {isEn ? 'Secret Key or Admin Passphrase' : 'Nenosiri la Usimamizi'}
                </label>
                <input
                  type="password"
                  id="emergency-key-input"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder={isEn ? 'Enter key...' : 'Weka nenosiri...'}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              {bypassError && (
                <p className="text-xs text-red-400 bg-red-950/50 p-2 rounded border border-red-800">
                  {bypassError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBypassModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Ghairi'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{isEn ? 'Authorize' : 'Thibitisha'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
