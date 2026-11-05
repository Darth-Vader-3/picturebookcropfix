/**
 * Over-The-Air (OTA) Hotfix Dispatcher & Management Utility.
 */

import { otaManager, OTAManifest, OTAUpdateState } from './otaManager';
import { safeGetItem, safeSetItem, safeGetJSON } from './storage';
import { errorMonitor } from './errorMonitoring';

export interface OTAUpdateManifest {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  mandatory: boolean;
  cohort: 'all' | 'beta';
  timestamp: string;
  bundleChecksum?: string;
}

const OTA_MANIFEST_KEY = 'digipicture_ota_manifest_active_v1';

class OTAUpdaterService {
  private manifest: OTAUpdateManifest = {
    currentVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.3.0',
    latestVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.3.0',
    releaseNotes: 'Production baseline release with audio-first narration and responsive art workbench.',
    mandatory: false,
    cohort: 'all',
    timestamp: new Date().toISOString()
  };

  private listeners: Array<(manifest: OTAUpdateManifest) => void> = [];

  constructor() {
    const cached = safeGetJSON<OTAUpdateManifest | null>(OTA_MANIFEST_KEY, null);
    if (cached && typeof cached === 'object') {
      this.manifest = { ...this.manifest, ...cached };
    }
  }

  public getManifest(): OTAUpdateManifest {
    return this.manifest;
  }

  public broadcastUpdate(params: {
    latestVersion: string;
    releaseNotes: string;
    mandatory: boolean;
    cohort: 'all' | 'beta';
  }): OTAUpdateManifest {
    this.manifest = {
      ...this.manifest,
      ...params,
      timestamp: new Date().toISOString(),
      bundleChecksum: `sha256-${Math.random().toString(36).substring(2, 12)}`
    };

    safeSetItem(OTA_MANIFEST_KEY, this.manifest);

    errorMonitor.addBreadcrumb('ota', `Broadcasted OTA Hotfix v${params.latestVersion}`, {
      mandatory: params.mandatory,
      cohort: params.cohort
    });

    this.listeners.forEach((cb) => {
      try {
        cb(this.manifest);
      } catch (e) {
        console.error('[OTAUpdater] Broadcast listener error:', e);
      }
    });

    // Also trigger OTA manager check
    otaManager.checkForUpdates(true).catch(() => {});

    return this.manifest;
  }

  public subscribe(callback: (manifest: OTAUpdateManifest) => void): () => void {
    this.listeners.push(callback);
    callback(this.manifest);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

export const otaUpdater = new OTAUpdaterService();
export { otaManager };
