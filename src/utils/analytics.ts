/**
 * Privacy-First Telemetry & Product Analytics Subsystem.
 * Tracks screen transitions, onboarding funnel metrics, and feature engagement.
 * COPPA & GDPR compliant: zero PII, masked parameters, fully anonymized session tokens.
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetItem, safeSetItem, safeGetJSON } from './storage';
import { errorMonitor } from './errorMonitoring';

export type AnalyticsEventType =
  | 'session_start'
  | 'onboarding_start'
  | 'onboarding_step'
  | 'onboarding_complete'
  | 'screen_view'
  | 'book_open'
  | 'page_turn'
  | 'interactive_element_tap'
  | 'audio_narration_toggle'
  | 'quiz_completed'
  | 'workbench_tool_select'
  | 'book_created'
  | 'book_published'
  | 'search_performed'
  | 'filter_applied'
  | 'theme_changed'
  | 'ota_update_applied'
  | 'feedback_submitted'
  | 'crash_reported';

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  timestamp: string;
  sessionId: string;
  environment: string;
  appVersion: string;
  metadata?: Record<string, any>;
}

const SESSION_KEY = 'digipicture_analytics_session_v1';
const OPT_OUT_KEY = 'digipicture_telemetry_opt_out';

class AnalyticsService {
  private sessionId: string = '';
  private isOptedOut: boolean = false;
  private eventQueue: AnalyticsEvent[] = [];
  private maxQueueSize = 50;

  constructor() {
    this.initSession();
  }

  private initSession() {
    this.isOptedOut = safeGetJSON<boolean>(OPT_OUT_KEY, false);

    let currentSession = safeGetItem(SESSION_KEY) || '';
    if (!currentSession) {
      currentSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      safeSetItem(SESSION_KEY, currentSession);
    }
    this.sessionId = currentSession;

    // Track session boot event
    this.trackEvent('session_start', {
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown'
    });
  }

  public trackEvent(eventType: AnalyticsEventType, metadata?: Record<string, any>) {
    if (this.isOptedOut) return;

    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      environment: (import.meta as any).env?.VITE_APP_ENV || 'production',
      appVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.2.0',
      metadata: metadata ? errorMonitor.sanitizeContext(metadata) : undefined
    };

    // Add to local circular queue
    this.eventQueue.unshift(event);
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.pop();
    }

    // Add breadcrumb to error monitor for contextual crash analysis
    errorMonitor.addBreadcrumb('analytics', `[Event] ${eventType}`, event.metadata);

    // If connected to Firestore in Beta/Production track, persist anonymously in batch
    this.persistEvent(event);
  }

  public trackScreenView(screenName: 'shelf' | 'reading' | 'workbench' | 'admin', context?: Record<string, any>) {
    this.trackEvent('screen_view', { screenName, ...context });
  }

  public trackOnboardingFunnel(step: number, stepName: string, totalSteps: number) {
    this.trackEvent('onboarding_step', { step, stepName, totalSteps });
    if (step === totalSteps) {
      this.trackEvent('onboarding_complete', { totalSteps });
    }
  }

  public getRecentEvents(): AnalyticsEvent[] {
    return [...this.eventQueue];
  }

  public setOptOut(optOut: boolean) {
    this.isOptedOut = optOut;
    safeSetItem(OPT_OUT_KEY, optOut);
  }

  public isTelemetryEnabled(): boolean {
    return !this.isOptedOut;
  }

  private async persistEvent(event: AnalyticsEvent) {
    if (!db) return;
    try {
      // Fire-and-forget anonymous telemetry record
      const col = collection(db, 'analytics_events');
      await addDoc(col, event);
    } catch {
      // Fail silently to never block main UI loop
    }
  }
}

export const analytics = new AnalyticsService();
