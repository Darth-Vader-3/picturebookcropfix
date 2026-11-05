/**
 * Remote Kill Switch & Feature Flags Subsystem.
 * Provides remote configuration, instantaneous emergency kill switches,
 * maintenance mode gates, and version constraints with local fallback caching.
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetItem, safeSetItem, safeGetJSON } from './storage';
import { errorMonitor } from './errorMonitoring';

export interface RemoteSystemConfig {
  isAppDisabled: boolean;
  maintenanceMode: boolean;
  maintenanceTitle?: string;
  maintenanceMessage: string;
  maintenanceReason?: string;
  minRequiredVersion: string;
  activeHotfixVersion?: string;
  emergencyBanner?: string | null;
  emergencyBypassToken?: string;
  allowedRolesDuringMaintenance: string[];
  features: {
    enableDrawingStudio: boolean;
    enableAiNarrations: boolean;
    enableReviews: boolean;
    enableDirectMessages: boolean;
    enableCommunityUploads: boolean;
    enableBetaFeedback: boolean;
    audioNarration?: boolean;
    aiGeneration?: boolean;
    artistWorkbench?: boolean;
    betaFeedback?: boolean;
    readerComments?: boolean;
    cloudSync?: boolean;
    [key: string]: boolean | undefined;
  };
  featureFlags?: Record<string, boolean>;
  lastUpdated?: string;
  updatedBy?: string;
}

const DEFAULT_SYSTEM_CONFIG: RemoteSystemConfig = {
  isAppDisabled: false,
  maintenanceMode: false,
  maintenanceTitle: 'Scheduled System Maintenance',
  maintenanceMessage: 'DigiPicture is currently undergoing scheduled platform upgrades to improve stability and security. We will be back online shortly!',
  maintenanceReason: '',
  minRequiredVersion: '1.0.0',
  activeHotfixVersion: '1.3.0',
  emergencyBanner: null,
  emergencyBypassToken: 'ADMIN-OVERRIDE-2026',
  allowedRolesDuringMaintenance: ['admin'],
  features: {
    enableDrawingStudio: true,
    enableAiNarrations: true,
    enableReviews: true,
    enableDirectMessages: true,
    enableCommunityUploads: true,
    enableBetaFeedback: true,
    audioNarration: true,
    aiGeneration: true,
    artistWorkbench: true,
    betaFeedback: true,
    readerComments: true,
    cloudSync: true
  },
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

const LOCAL_STORAGE_KEY = 'digipicture_remote_config_v1';
const LOCAL_OVERRIDE_KEY = 'digipicture_local_config_override_v1';

class RemoteKillSwitchService {
  private currentConfig: RemoteSystemConfig = DEFAULT_SYSTEM_CONFIG;
  private listeners: Array<(config: RemoteSystemConfig) => void> = [];
  private unsubscribeFirestore?: () => void;
  private isSimulatedLocally = false;

  constructor() {
    this.loadInitialCache();
    this.initRemoteSubscription();
  }

  /**
   * Loads fast local cache on initial tick to avoid blocking rendering
   */
  private loadInitialCache() {
    try {
      const cached = safeGetJSON<RemoteSystemConfig | null>(LOCAL_STORAGE_KEY, null);
      if (cached && typeof cached === 'object') {
        this.currentConfig = { 
          ...DEFAULT_SYSTEM_CONFIG, 
          ...cached,
          features: {
            ...DEFAULT_SYSTEM_CONFIG.features,
            ...(cached.features || {})
          }
        };
      }

      // Check local testing overrides in development/beta
      const localOverride = safeGetJSON<Partial<RemoteSystemConfig> | null>(LOCAL_OVERRIDE_KEY, null);
      if (localOverride && typeof localOverride === 'object') {
        this.currentConfig = { ...this.currentConfig, ...localOverride };
        this.isSimulatedLocally = true;
      }
    } catch (e) {
      console.warn('[KillSwitch] Failed to load local config cache:', e);
    }
  }

  /**
   * Initializes real-time listener for remote config doc in Firestore
   */
  private initRemoteSubscription() {
    if (!db) return;

    try {
      const configDocRef = doc(db, 'system_config', 'app_control');
      
      this.unsubscribeFirestore = onSnapshot(configDocRef, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<RemoteSystemConfig>;
          const merged: RemoteSystemConfig = {
            ...DEFAULT_SYSTEM_CONFIG,
            ...remoteData,
            features: {
              ...DEFAULT_SYSTEM_CONFIG.features,
              ...(remoteData.features || {})
            }
          };

          if (!this.isSimulatedLocally) {
            this.currentConfig = merged;
            safeSetItem(LOCAL_STORAGE_KEY, merged);
            this.notifyListeners();
          }
        } else {
          this.ensureConfigExists();
        }
      }, (error) => {
        console.warn('[KillSwitch] Realtime listener notice:', error?.message || error);
      });
    } catch (err) {
      console.warn('[KillSwitch] Realtime listener error:', err);
    }
  }

  public async ensureConfigExists() {
    if (!db) return;
    try {
      const configDocRef = doc(db, 'system_config', 'app_control');
      const snap = await getDoc(configDocRef);
      if (!snap.exists()) {
        await setDoc(configDocRef, DEFAULT_SYSTEM_CONFIG, { merge: true });
      }
    } catch (err) {
      console.warn('[KillSwitch] ensureConfigExists notice:', err);
    }
  }

  public async fetchRemoteConfig(): Promise<RemoteSystemConfig> {
    if (!db) return this.currentConfig;
    try {
      const configDocRef = doc(db, 'system_config', 'app_control');
      const snap = await getDoc(configDocRef);
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<RemoteSystemConfig>;
        this.currentConfig = {
          ...DEFAULT_SYSTEM_CONFIG,
          ...remoteData,
          features: {
            ...DEFAULT_SYSTEM_CONFIG.features,
            ...(remoteData.features || {})
          }
        };
        safeSetItem(LOCAL_STORAGE_KEY, this.currentConfig);
        this.notifyListeners();
      }
    } catch (err) {
      console.warn('[KillSwitch] fetchRemoteConfig notice:', err);
    }
    return this.currentConfig;
  }

  /**
   * Synchronously updates configuration locally and persists
   */
  public updateConfig(partial: Partial<RemoteSystemConfig>): RemoteSystemConfig {
    const updated: RemoteSystemConfig = {
      ...this.currentConfig,
      ...partial,
      features: {
        ...this.currentConfig.features,
        ...(partial.features || {})
      },
      lastUpdated: new Date().toISOString()
    };
    this.currentConfig = updated;
    safeSetItem(LOCAL_STORAGE_KEY, updated);
    this.notifyListeners();

    // Async push to Firestore if connected
    if (db) {
      try {
        const configDocRef = doc(db, 'system_config', 'app_control');
        setDoc(configDocRef, updated, { merge: true }).catch(() => {});
      } catch {}
    }

    return updated;
  }

  /**
   * Sets an individual feature flag toggle
   */
  public setFeatureFlag(flagKey: string, isEnabled: boolean): RemoteSystemConfig {
    const updatedFeatures = {
      ...this.currentConfig.features,
      [flagKey]: isEnabled
    };
    return this.updateConfig({ features: updatedFeatures });
  }

  /**
   * Updates remote configuration in Firestore (Admin only)
   */
  public async publishRemoteConfig(newConfig: Partial<RemoteSystemConfig>, adminEmail: string): Promise<boolean> {
    if (!db) return false;
    try {
      const configDocRef = doc(db, 'system_config', 'app_control');
      const payload: RemoteSystemConfig = {
        ...this.currentConfig,
        ...newConfig,
        lastUpdated: new Date().toISOString(),
        updatedBy: adminEmail
      };

      await setDoc(configDocRef, payload, { merge: true });
      this.currentConfig = payload;
      safeSetItem(LOCAL_STORAGE_KEY, payload);
      this.notifyListeners();

      errorMonitor.addBreadcrumb('killswitch', `Remote configuration updated by ${adminEmail}`, {
        isAppDisabled: payload.isAppDisabled,
        maintenanceMode: payload.maintenanceMode
      });
      return true;
    } catch (err) {
      errorMonitor.captureException(err, {
        category: 'killswitch',
        severity: 'error',
        context: { action: 'publishRemoteConfig', adminEmail }
      });
      throw err;
    }
  }

  /**
   * Local simulation toggle for Beta testing
   */
  public setLocalSimulation(override: Partial<RemoteSystemConfig> | null) {
    if (override === null) {
      this.isSimulatedLocally = false;
      safeSetItem(LOCAL_OVERRIDE_KEY, null);
      this.fetchRemoteConfig();
    } else {
      this.isSimulatedLocally = true;
      this.currentConfig = { ...this.currentConfig, ...override };
      safeSetItem(LOCAL_OVERRIDE_KEY, override);
      this.notifyListeners();
    }
  }

  public isSimulating(): boolean {
    return this.isSimulatedLocally;
  }

  public getConfig(): RemoteSystemConfig {
    return this.currentConfig;
  }

  /**
   * Checks if user is permitted to use the app given current kill switch / maintenance status
   */
  public isAccessBlocked(userRole?: string): { blocked: boolean; reason?: 'app_disabled' | 'maintenance' | 'version_outdated'; message: string } {
    const currentVer = (import.meta as any).env?.VITE_APP_VERSION || '1.3.0';

    // 1. Critical Remote Kill Switch
    if (this.currentConfig.isAppDisabled) {
      return {
        blocked: true,
        reason: 'app_disabled',
        message: this.currentConfig.maintenanceReason || this.currentConfig.maintenanceMessage || 'This application has been temporarily disabled by engineering administrators for critical system verification.'
      };
    }

    // 2. Scheduled Maintenance Mode (allows admins to bypass)
    if (this.currentConfig.maintenanceMode) {
      const isAllowed = userRole && this.currentConfig.allowedRolesDuringMaintenance.includes(userRole);
      if (!isAllowed) {
        return {
          blocked: true,
          reason: 'maintenance',
          message: this.currentConfig.maintenanceReason || this.currentConfig.maintenanceMessage
        };
      }
    }

    // 3. Minimum Required Version Constraint
    if (this.currentConfig.minRequiredVersion && this.isVersionLower(currentVer, this.currentConfig.minRequiredVersion)) {
      return {
        blocked: true,
        reason: 'version_outdated',
        message: `Your app version (${currentVer}) is no longer supported. Please update to version ${this.currentConfig.minRequiredVersion} or higher.`
      };
    }

    return { blocked: false, message: '' };
  }

  /**
   * Compares semver strings (returns true if v1 < v2)
   */
  public isVersionLower(v1: string, v2: string): boolean {
    const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  }

  public subscribe(callback: (config: RemoteSystemConfig) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentConfig);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentConfig);
      } catch (err) {
        console.error('[KillSwitch] Listener execution error:', err);
      }
    });
  }

  public destroy() {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
    }
    this.listeners = [];
  }
}

export const remoteKillSwitch = new RemoteKillSwitchService();
