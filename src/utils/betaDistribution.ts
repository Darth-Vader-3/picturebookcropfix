/**
 * Beta Testing Cohort & Distribution Manager.
 * Manages beta tester enrollments, feedback submissions, and distribution links.
 */

import { safeGetItem, safeSetItem, safeGetJSON } from './storage';
import { errorMonitor } from './errorMonitoring';

export interface BetaFeedbackItem {
  id: string;
  category: 'bug' | 'feature' | 'ux' | 'audio' | 'general';
  message: string;
  userEmail?: string;
  rating?: number;
  deviceInfo?: string;
  timestamp: string;
}

const BETA_TESTERS_KEY = 'digipicture_beta_testers_v1';
const BETA_FEEDBACK_KEY = 'digipicture_beta_feedback_v1';

const DEFAULT_TESTERS = [
  'tester.primary@gmail.com',
  'earlybird.artist@gmail.com',
  'school.district.evaluator@edu.tz'
];

class BetaDistributionService {
  private testers: string[] = [];
  private feedbackList: BetaFeedbackItem[] = [];

  constructor() {
    const cachedTesters = safeGetJSON<string[]>(BETA_TESTERS_KEY, DEFAULT_TESTERS);
    if (Array.isArray(cachedTesters) && cachedTesters.length > 0) {
      this.testers = cachedTesters;
    } else {
      this.testers = [...DEFAULT_TESTERS];
      safeSetItem(BETA_TESTERS_KEY, this.testers);
    }

    const cachedFeedback = safeGetJSON<BetaFeedbackItem[]>(BETA_FEEDBACK_KEY, []);
    if (Array.isArray(cachedFeedback)) {
      this.feedbackList = cachedFeedback;
    }
  }

  public getTesters(): string[] {
    return [...this.testers];
  }

  public addTester(email: string): boolean {
    const clean = email.trim().toLowerCase();
    if (!clean || this.testers.includes(clean)) return false;
    this.testers.push(clean);
    safeSetItem(BETA_TESTERS_KEY, this.testers);
    errorMonitor.addBreadcrumb('beta', `Enrolled new beta tester: ${clean}`);
    return true;
  }

  public removeTester(email: string): boolean {
    const clean = email.trim().toLowerCase();
    this.testers = this.testers.filter((t) => t !== clean);
    safeSetItem(BETA_TESTERS_KEY, this.testers);
    return true;
  }

  public getBetaInviteUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?beta=true&cohort=flight_test`;
    }
    return 'https://ai.studio/build?beta=true&cohort=flight_test';
  }

  public submitFeedback(item: Omit<BetaFeedbackItem, 'id' | 'timestamp'>): BetaFeedbackItem {
    const newItem: BetaFeedbackItem = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...item,
      timestamp: new Date().toISOString()
    };

    this.feedbackList.unshift(newItem);
    if (this.feedbackList.length > 100) {
      this.feedbackList.pop();
    }

    safeSetItem(BETA_FEEDBACK_KEY, this.feedbackList);
    errorMonitor.addBreadcrumb('beta', `Beta feedback submitted: [${newItem.category}]`, {
      userEmail: newItem.userEmail
    });

    return newItem;
  }

  public getAllFeedback(): BetaFeedbackItem[] {
    return [...this.feedbackList];
  }

  public clearFeedback(): void {
    this.feedbackList = [];
    safeSetItem(BETA_FEEDBACK_KEY, []);
  }
}

export const betaDistribution = new BetaDistributionService();
