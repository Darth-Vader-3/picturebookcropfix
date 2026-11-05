import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_BOOKS, playChime, talkToMe, hushNow, scanForInappropriateContent, calculateReadingTimeMinutes, maskEmail } from './data';
import { PictureBook, BookPage, ArtFormType, Subscriber, ReportItem, BookReview, DirectMessage, UserStamp, UserBadge } from './types';
import {
  Search,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Sparkles,
  HelpCircle,
  FolderHeart,
  Volume2,
  VolumeX,
  Compass,
  ArrowBigLeft,
  FileImage,
  Paintbrush,
  Maximize,
  Hammer,
  Bookmark,
  User,
  Mail,
  Check,
  Star,
  MessageSquare,
  Share2,
  Shuffle,
  Send,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Bell,
  X,
  Award,
  Lock,
  ShieldCheck
} from 'lucide-react';

import EducationTips from './components/EducationTips';
import ArtistWorkbench from './components/ArtistWorkbench';
import AdminDashboard from './components/AdminDashboard';
import AuthModal, { UserAccount } from './components/AuthModal';
import { LegalComplianceModal } from './components/LegalComplianceModal';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { SendMessageModal } from './components/SendMessageModal';
import { ArtistProfileModal } from './components/ArtistProfileModal';
import { OTAUpdateNotification } from './components/OTAUpdateNotification';
import { IllustrationReferenceViewer } from './components/IllustrationReferenceViewer';
import { useThemeSync } from './hooks/useThemeSync';
import { remoteKillSwitch, RemoteSystemConfig } from './utils/remoteKillSwitch';
import { errorMonitor } from './utils/errorMonitoring';
import { analytics } from './utils/analytics';

// Import Firebase Firestore helpers
import { 
  saveBookToFirestore, 
  fetchBooksFromFirestore, 
  deleteBookFromFirestore,
  subscribeToBooks,
  verifyAndActivateArtistInFirestore,
  signOutFromFirebaseAndClearSession,
  purgeAllApplicationDataFromCloudAndLocal,
  auth,
  onAuthStateChanged,
  getUserAndArtistDoc,
  fetchProfileFromFirestore
} from './firebase';

// Import translation helpers
import { TRANSLATIONS, getLocalizedBook } from './translations';
import { safeSetItem, safeGetItem, safeGetJSON, safeParseJSON } from './utils/storage';
import { verifySessionToken, validateProtectedRouteAccess, sanitizeInput, sanitizeSqlInjection } from './utils/security';

// Helper to map curated book pages or custom uploads to their artist illustrations
const getPageIllustration = (page: BookPage, book: PictureBook): string => {
  // Ensure reading property keys matching Firestore schema: imageUrl, illustrationUrl, mediaUrl, or image
  const direct = page.imageUrl || page.illustrationUrl || page.mediaUrl || (page as any)?.image;
  if (direct && typeof direct === 'string' && direct.trim() !== '' && direct.trim() !== 'undefined' && direct.trim() !== 'null') {
    return direct.trim();
  }
  
  // Curated books map to high-quality beautiful artwork pictures
  const mappings: Record<string, string> = {
    'book-1-page-1': 'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&q=80&w=600', // pottery wheel shaping
    'book-1-page-2': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600', // flower tapestry / collage
    'book-1-page-3': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=600', // clay toy on table
    'book-2-page-1': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=600', // watercolor forest green deer painting
    'book-2-page-2': 'https://images.unsplash.com/photo-1547970894-3f91a28574f8?auto=format&fit=crop&q=80&w=600', // beautiful gazelle in forest
    'book-2-page-3': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600', // autumn maple leaves background
    'book-3-page-1': 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=600', // collage/origami papercraft waves
    'book-3-page-2': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600', // glowing star undersea diamond
    'book-3-page-3': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600', // origami papercraft submarine
  };

  if (!book.isCustom && mappings[page.id]) {
    return mappings[page.id];
  }

  // Custom books fallback to coverImage if available, else empty string
  return book.isCustom && book.coverImage ? book.coverImage : '';
};

export default function App() {
  // Language state for internationalization: 'en' (English) | 'sw' (Swahili)
  const [language, setLanguage] = useState<'en' | 'sw'>(() => {
    try {
      const saved = safeGetItem('digipicture_language');
      return (saved as 'en' | 'sw') || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      safeSetItem('digipicture_language', language);
    } catch (e) {
      console.error('Failed to save language setting:', e);
    }
  }, [language]);

  // Books collection (with local storage offline persistence)
  const [booksList, setBooksList] = useState<PictureBook[]>(() => {
    try {
      const deletedList = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
      const deletedIds = new Set<string>(Array.isArray(deletedList) ? deletedList : []);
      const parsed = safeGetJSON<PictureBook[]>('digipicture_custom_books', []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validCustom = parsed.filter(b => b && b.id && !deletedIds.has(b.id));
        const validInitial = INITIAL_BOOKS.filter(b => b && b.id && !deletedIds.has(b.id));
        return [...validCustom, ...validInitial];
      }
      return INITIAL_BOOKS.filter(b => b && b.id && !deletedIds.has(b.id));
    } catch (e) {
      console.error("Failed to load local books:", e);
    }
    return INITIAL_BOOKS;
  });

  // Dynamically translate/localize our books based on selected language
  const localizedBooksList = useMemo(() => {
    return booksList.map(book => getLocalizedBook(book, language));
  }, [booksList, language]);
  
  // App view modes: 'shelf' | 'reading' | 'workbench' | 'admin'
  const [appMode, setAppMode] = useState<'shelf' | 'reading' | 'workbench' | 'admin'>('shelf');
  
  // Settings overlay state
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // User Authentication & Account Role State (Defaults to Guest Explorer on first open / initial load)
  const [userAccount, setUserAccount] = useState<UserAccount>(() => {
    return {
      role: 'student',
      name: 'Guest Explorer',
      email: '',
      username: '@guest',
      avatar: '🐣',
      isLoggedIn: false
    };
  });

  // Unified theme synchronization hook
  const { theme, isNight, setTheme, toggleTheme, syncTheme } = useThemeSync(userAccount, appMode);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'rights'>('terms');

  // User Profile state
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; avatar: string }>(() => {
    const saved = safeGetJSON<{ name: string; email: string; avatar: string } | null>('digipicture_user_profile', null);
    if (saved && typeof saved === 'object' && saved.name) {
      return saved;
    }
    return {
      name: userAccount.name || "Guest Explorer",
      email: userAccount.email || "",
      avatar: userAccount.avatar || "🐣"
    };
  });

  // Guided Onboarding Tutorial State (Appears on first visit or when triggered manually)
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return safeGetItem('picturebook_tutorial_completed') !== 'true';
  });
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialAudience, setTutorialAudience] = useState<'reader' | 'artist'>('reader');

  const [remoteConfig, setRemoteConfig] = useState<RemoteSystemConfig>(() => remoteKillSwitch.getConfig());

  // Subscribe to Remote Kill Switch & System Config updates
  useEffect(() => {
    const unsubscribe = remoteKillSwitch.subscribe((cfg) => {
      setRemoteConfig(cfg);
    });
    return unsubscribe;
  }, []);

  // Track screen transitions for privacy-safe analytics & breadcrumbs
  useEffect(() => {
    analytics.trackScreenView(appMode);
    errorMonitor.addBreadcrumb('navigation', `User switched appMode to ${appMode}`, undefined, 'info');
  }, [appMode]);

  // Determine if application is blocked due to emergency kill switch, maintenance, or version deprecation
  const accessCheck = useMemo(() => {
    return remoteKillSwitch.isAccessBlocked(userAccount.role);
  }, [remoteConfig, userAccount.role]);

  // Reader Notification Preferences
  const [notifyNewReleases, setNotifyNewReleases] = useState<boolean>(() => {
    const saved = safeGetItem('digipicture_notify_new_releases');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    try {
      safeSetItem('digipicture_notify_new_releases', String(notifyNewReleases));
    } catch (e) {
      console.error("Failed to save notifyNewReleases setting:", e);
    }
  }, [notifyNewReleases]);

  const [notifyArtistUpdates, setNotifyArtistUpdates] = useState<boolean>(() => {
    const saved = safeGetItem('digipicture_notify_artist_updates');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    try {
      safeSetItem('digipicture_notify_artist_updates', String(notifyArtistUpdates));
    } catch (e) {
      console.error("Failed to save notifyArtistUpdates setting:", e);
    }
  }, [notifyArtistUpdates]);

  // Validate active session token on load
  useEffect(() => {
    const validateActiveSession = async () => {
      try {
        const token = sessionStorage.getItem('digipicture_auth_token');
        if (token) {
          const verification = await verifySessionToken(token);
          if (!verification.isValid) {
            console.warn('[Session Security] Session token invalid or expired:', verification.reason);
            sessionStorage.removeItem('digipicture_auth_token');
            if (userAccount.isLoggedIn) {
              setUserAccount({
                role: 'student',
                name: 'Guest Explorer',
                email: '',
                username: '@guest',
                avatar: '🐣',
                isLoggedIn: false
              });
              setDbNotification({
                type: 'error',
                message: language === 'en'
                  ? '🔒 Your session has expired. Please log in again.'
                  : '🔒 Kipindi chako kimekwisha. Tafadhali ingia tena.'
              });
            }
          }
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    };
    validateActiveSession();
  }, []);

  // Fast onAuthStateChanged authentication routing with optimistic UI mounting
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        try {
          // Parallel Firestore lookup to quickly synchronize profile permissions
          const { userDoc, artistDoc } = await getUserAndArtistDoc(currentUser.email, currentUser.uid);
          const found = artistDoc || userDoc;
          if (found) {
            setUserAccount(prev => ({
              ...prev,
              role: found.role || (found.isArtist ? 'artist' : 'student'),
              status: found.status || 'approved',
              artistStatus: found.artistStatus || found.status || 'approved',
              name: found.name || currentUser.displayName || prev.name,
              email: currentUser.email || prev.email,
              username: found.username || prev.username,
              avatar: found.avatar || prev.avatar,
              phone: found.phone || prev.phone,
              bio: found.bio || prev.bio,
              isLoggedIn: true
            }));
          }
        } catch (err) {
          console.warn("Background auth profile sync notice:", err);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (showTutorial) {
      if (userAccount.role === 'artist') {
        setTutorialAudience('artist');
      } else {
        setTutorialAudience('reader');
      }
    }
  }, [showTutorial, userAccount.role]);

  useEffect(() => {
    if (appMode === 'admin') {
      const access = validateProtectedRouteAccess(userAccount, 'admin');
      if (!access.isAuthorized) {
        setAppMode('shelf');
        setDbNotification({
          type: 'error',
          message: access.errorMessage || (language === 'en' ? 'Access Denied. Administrator credentials required.' : 'Ufikiaji Umekataliwa. Ruhusa ya Admin inahitajika.')
        });
      }
    } else if (appMode === 'workbench') {
      const access = validateProtectedRouteAccess(userAccount, 'artist');
      if (!access.isAuthorized) {
        setAppMode('shelf');
        setDbNotification({
          type: 'error',
          message: access.errorMessage || (language === 'en' ? 'Access Denied. Artist account required.' : 'Ufikiaji Umekataliwa. Akaunti ya msanii inahitajika.')
        });
      }
    }
  }, [appMode, userAccount, language]);

  // Handle incoming email verification links from URL query params
  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const emailToVerify = urlParams.get('verify_email') || urlParams.get('email');
        if (emailToVerify) {
          const cleanEmail = emailToVerify.trim().toLowerCase();
          
          // Activate in Firebase Firestore database
          await verifyAndActivateArtistInFirestore(cleanEmail);

          // 1. Check pending registrations first
          let pendingList = safeGetJSON<any[]>('digipicture_pending_registrations', []);
          const pendingAccount = Array.isArray(pendingList) ? pendingList.find((a: any) => a && a.email?.toLowerCase() === cleanEmail) : null;

          let registered = safeGetJSON<any[]>('digipicture_registered_artists', []);
          if (!Array.isArray(registered)) registered = [];
          const foundIndex = registered.findIndex((a: any) => a && a.email?.toLowerCase() === cleanEmail);

          if (pendingAccount) {
            const verifiedAccount = { ...pendingAccount, isEmailVerified: true };
            if (foundIndex !== -1) {
              registered[foundIndex] = verifiedAccount;
            } else {
              registered.push(verifiedAccount);
            }
            safeSetItem('digipicture_registered_artists', registered);

            // Clean up pending list
            const updatedPending = pendingList.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail);
            safeSetItem('digipicture_pending_registrations', updatedPending);

            setShowAuthModal(true);
            playChime('sparkle');
          } else if (foundIndex !== -1) {
            registered[foundIndex].isEmailVerified = true;
            safeSetItem('digipicture_registered_artists', registered);
            setShowAuthModal(true);
            playChime('sparkle');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Failed to process email verification URL:", e);
      }
    };
    processEmailVerification();
  }, []);

  // Support secret admin route access (/secret-admin-gate, #secret-admin-gate, ?route=secret-admin-gate)
  useEffect(() => {
    const handleSecretRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        path.includes('/secret-admin-gate') ||
        hash.includes('secret-admin-gate') ||
        search.includes('route=secret-admin-gate') ||
        search.includes('secret-admin-gate')
      ) {
        setAppMode('admin');
      }
    };
    handleSecretRoute();
    window.addEventListener('popstate', handleSecretRoute);
    window.addEventListener('hashchange', handleSecretRoute);
    return () => {
      window.removeEventListener('popstate', handleSecretRoute);
      window.removeEventListener('hashchange', handleSecretRoute);
    };
  }, []);

  // UI Data Masking state for Settings screen email field
  const [isSettingsEmailRevealed, setIsSettingsEmailRevealed] = useState<boolean>(false);

  // Keep userAccount synced to localStorage and userProfile
  useEffect(() => {
    try {
      localStorage.setItem('digipicture_user_account', JSON.stringify(userAccount));
      setUserProfile({
        name: userAccount.name || 'User',
        email: userAccount.email || '',
        avatar: userAccount.avatar || '🎨'
      });
    } catch (e) {
      console.error("Failed to save user account:", e);
    }
  }, [userAccount]);

  // Keep a local draft for the editing form inside modal
  const [profileForm, setProfileForm] = useState({
    name: userProfile.name,
    email: userProfile.email,
    avatar: userProfile.avatar
  });

  // Sync draft form with profile when modal is opened
  useEffect(() => {
    if (showSettings) {
      setProfileForm({
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar
      });
    }
  }, [showSettings, userProfile]);

  // Automatically persist user profile when it changes
  useEffect(() => {
    try {
      localStorage.setItem('digipicture_user_profile', JSON.stringify(userProfile));
    } catch (e) {
      console.error("Failed to save user profile:", e);
    }
  }, [userProfile]);

  // General App sound settings state
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('digipicture_sound_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem('digipicture_sound_enabled', String(isSoundEnabled));
    } catch (e) {
      console.error("Failed to save sound settings:", e);
    }
  }, [isSoundEnabled]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'settings' | 'bookmarks' | 'reports' | 'messages'>('profile');
  const [isMobileSettingsNavOpen, setIsMobileSettingsNavOpen] = useState<boolean>(false);

  // Local sound wrapper respecting the isSoundEnabled setting
  const playAppChime = (sound: 'pop' | 'bubble' | 'sparkle' | 'clay' | 'wood') => {
    if (isSoundEnabled) {
      playChime(sound);
    }
  };

  // Active book selection
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Saved student bookmarks/progress mapping bookId -> pageIndex
  const [bookmarks, setBookmarks] = useState<Record<string, number>>(() => {
    return safeGetJSON<Record<string, number>>('digipicture_bookmarks', {});
  });

  // Automatically persist bookmarks whenever they change
  useEffect(() => {
    try {
      safeSetItem('digipicture_bookmarks', bookmarks);
    } catch (e) {
      console.error("Failed to save bookmarks:", e);
    }
  }, [bookmarks]);

  // Derived reading history items array
  const history = useMemo(() => {
    return Object.entries(bookmarks)
      .map(([bookId, pageIdx]) => {
        const book = localizedBooksList.find(b => b.id === bookId);
        if (!book || pageIdx === undefined) return null;
        return {
          bookId,
          pageIdx,
          book
        };
      })
      .filter((item): item is { bookId: string; pageIdx: number; book: PictureBook } => item !== null);
  }, [bookmarks, localizedBooksList]);

  // Search & Filtering shelf state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // all, sculpture, painting, craft, animation
  const [shelfSortBy, setShelfSortBy] = useState<'recent' | 'title' | 'rating'>('recent');
  const [shelfPage, setShelfPage] = useState<number>(1);
  const itemsPerShelf = 6;

  // Helper to format relative update/created timestamp
  const getRelativeTimeString = (dateStr?: string, lang: string = 'en') => {
    if (!dateStr) return null;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return null;
    const diffMs = Date.now() - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return lang === 'en' ? 'Just updated ✨' : 'Imesasishwa hivi punde ✨';
    if (diffMins < 60) return lang === 'en' ? `${diffMins}m ago` : `dk ${diffMins} zilizopita`;
    if (diffHours < 24) return lang === 'en' ? `${diffHours}h ago` : `saa ${diffHours} zilizopita`;
    if (diffDays < 7) return lang === 'en' ? `${diffDays}d ago` : `siku ${diffDays} zilizopita`;
    return new Date(dateStr).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-US', { month: 'short', day: 'numeric' });
  };

  // Text-to-speech Auto Play state for story
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Photo filters state for Picture art form page
  const [currentPhotoFilter, setCurrentPhotoFilter] = useState<string>('normal');

  // Active left column view mode for reading: 'interactive' | 'reference'
  const [leftViewTab, setLeftViewTab] = useState<'interactive' | 'reference'>('interactive');

  // Live database connection & loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [dbNotification, setDbNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Complete Auth Sign-Out & Session Clearance
  const handleCompleteLogout = async () => {
    try {
      await signOutFromFirebaseAndClearSession();
    } catch (err) {
      console.warn("Sign out notice:", err);
    }

    // Reset account state to completely unauthenticated Guest Explorer
    setUserAccount({
      role: 'student',
      name: 'Guest Explorer',
      email: '',
      username: '@guest',
      avatar: '🐣',
      isLoggedIn: false
    });

    // Reset view mode back to library shelf and close modals
    setAppMode('shelf');
    setShowAuthModal(false);
    setShowSettings(false);

    setDbNotification({
      type: 'info',
      message: language === 'en'
        ? '🔒 Logged out successfully. All persistent sessions cleared.'
        : '🔒 Umetoka kikamilifu. Vipindi vyote vimefutwa.'
    });
    setTimeout(() => setDbNotification(null), 4000);
    playAppChime('pop');
  };

  // Complete Application Data Purge (Firestore artists, books, registrations & LocalStorage)
  const handlePurgeAllData = async () => {
    setIsLoading(true);
    try {
      await purgeAllApplicationDataFromCloudAndLocal();
      setBooksList([]);
      setReadingProgress({});
      setSubscribers([]);
      setDirectMessages([]);
      setBookReviews({});
      setUserAccount({
        role: 'student',
        name: 'Guest Explorer',
        avatar: '🐣',
        email: '',
        username: '@guest',
        isLoggedIn: false
      });
      setAppMode('shelf');
      setDbNotification({
        type: 'info',
        message: language === 'en'
          ? '🗑️ All application data (Cloud Firestore collections, Auth sessions, and Local storage) has been completely deleted.'
          : '🗑️ Data zote za programu (Firestore na Local) zimefutwa kikamilifu.'
      });
      setTimeout(() => setDbNotification(null), 5000);
      playAppChime('pop');
    } catch (err) {
      console.error("Purge data error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Remember reading progress mapping bookId -> lastActivePageIndex
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>(() => {
    return safeGetJSON<Record<string, number>>('digipicture_reading_progress', {});
  });

  // Automatically persist reading progress whenever active book / page index changes
  useEffect(() => {
    if (selectedBookId && activePageIndex !== undefined) {
      setReadingProgress((prev) => {
        const updated = { ...prev, [selectedBookId]: activePageIndex };
        safeSetItem('digipicture_reading_progress', updated);
        return updated;
      });
    }
  }, [selectedBookId, activePageIndex]);

  // Compute a secure, private key for the current reader account
  const userStorageKey = useMemo(() => {
    if (userAccount.email && userAccount.email.trim()) {
      return `user_${userAccount.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
    if (userAccount.username && userAccount.username.trim() && userAccount.username !== '@guest') {
      return `user_${userAccount.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
    return 'user_private_local_reader';
  }, [userAccount.email, userAccount.username]);

  // Private User Collected Scene Stamps: stampId -> UserStamp
  const [userStamps, setUserStamps] = useState<Record<string, UserStamp>>(() => {
    const initialKey = userAccount.email ? `user_${userAccount.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'user_private_local_reader';
    return safeGetJSON<Record<string, UserStamp>>(`digipicture_stamps_${initialKey}`, {});
  });

  // Private User Earned Milestone Badges: badgeId -> UserBadge
  const [userBadges, setUserBadges] = useState<Record<string, UserBadge>>(() => {
    const initialKey = userAccount.email ? `user_${userAccount.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'user_private_local_reader';
    return safeGetJSON<Record<string, UserBadge>>(`digipicture_badges_${initialKey}`, {});
  });

  // Sync private stamps and badges whenever user account / login state changes
  useEffect(() => {
    const loadedStamps = safeGetJSON<Record<string, UserStamp>>(`digipicture_stamps_${userStorageKey}`, {});
    const loadedBadges = safeGetJSON<Record<string, UserBadge>>(`digipicture_badges_${userStorageKey}`, {});
    setUserStamps(loadedStamps);
    setUserBadges(loadedBadges);
  }, [userStorageKey]);

  // Persist private user stamps
  useEffect(() => {
    safeSetItem(`digipicture_stamps_${userStorageKey}`, userStamps);
  }, [userStamps, userStorageKey]);

  // Persist private user badges
  useEffect(() => {
    safeSetItem(`digipicture_badges_${userStorageKey}`, userBadges);
  }, [userBadges, userStorageKey]);

  // Reward Modal & Badges Passport Modal states
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [recentReward, setRecentReward] = useState<{
    bookId: string;
    bookTitle: string;
    author: string;
    artForm: string;
    stampTitle: string;
    stampIcon: string;
    unlockedAt?: string;
  } | null>(null);

  const [showBadgesPassportModal, setShowBadgesPassportModal] = useState<boolean>(false);
  const [passportActiveTab, setPassportActiveTab] = useState<'stamps' | 'badges'>('stamps');

  // Helper to generate the unique stamp identity for any scene/page
  const getPageStampIdentity = (page: BookPage, pageIdx: number, book: PictureBook) => {
    const artForm = page.artForm || book.artForms[0] || 'picture';
    const stampIcon =
      artForm === 'sculpture' ? '🏺'
      : artForm === 'painting' ? '🎨'
      : artForm === 'craft' ? '✂️'
      : artForm === 'animation' ? '🎭'
      : '📷';

    const stampTitle =
      language === 'en'
        ? `${page.title || `Page ${pageIdx + 1}`} Stamp`
        : `Muhuri wa ${page.title || `Ukurasa ${pageIdx + 1}`}`;

    return {
      stampId: `${book.id}_page_${pageIdx}`,
      stampIcon,
      stampTitle,
      artForm
    };
  };

  // Handler to stamp the current page / scene and update private badges
  const handleStampCurrentScene = (book: PictureBook, pageIdx: number) => {
    const page = book.pages[pageIdx];
    if (!page) return;

    const { stampId, stampIcon, stampTitle, artForm } = getPageStampIdentity(page, pageIdx, book);
    const isAlreadyStamped = !!userStamps[stampId];

    if (isAlreadyStamped) {
      playAppChime('pop');
      setShowBadgesPassportModal(true);
      return;
    }

    const formattedDate = new Date().toLocaleDateString(language === 'sw' ? 'sw-TZ' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const newStamp: UserStamp = {
      id: stampId,
      bookId: book.id,
      bookTitle: book.title,
      pageIndex: pageIdx,
      pageNumber: pageIdx + 1,
      pageTitle: page.title,
      author: book.author,
      artForm: artForm,
      stampTitle: stampTitle,
      stampIcon: stampIcon,
      stampedAt: formattedDate
    };

    const updatedStamps = { ...userStamps, [stampId]: newStamp };
    setUserStamps(updatedStamps);

    // Compute and award milestone badges
    const updatedBadges = { ...userBadges };

    // Milestone 1: First Stamp
    if (Object.keys(userStamps).length === 0 && !updatedBadges['first_stamp']) {
      updatedBadges['first_stamp'] = {
        id: 'first_stamp',
        badgeTitle: language === 'en' ? 'First Discovery Badge 🌟' : 'Beji ya Kwanza ya Maajabu 🌟',
        badgeIcon: '🌟',
        description: language === 'en' ? 'Collected your very first storybook scene stamp!' : 'Umekusanya muhuri wako wa kwanza kabisa wa hadithi!',
        category: 'collector',
        unlockedAt: formattedDate
      };
    }

    // Milestone 2: Book Completed (All pages of this book stamped)
    const allBookPageIds = book.pages.map((_, idx) => `${book.id}_page_${idx}`);
    const isBookFullyStamped = allBookPageIds.every(id => updatedStamps[id]);
    const bookMasterBadgeId = `book_master_${book.id}`;

    if (isBookFullyStamped && !updatedBadges[bookMasterBadgeId]) {
      updatedBadges[bookMasterBadgeId] = {
        id: bookMasterBadgeId,
        badgeTitle: language === 'en' ? `Master of "${book.title}" 🏆` : `Mtafiti Mkuu wa "${book.title}" 🏆`,
        badgeIcon: stampIcon || '🏆',
        description: language === 'en'
          ? `Collected all scene stamps in "${book.title}"!`
          : `Umekusanya mahuri yote ya kurasa katika kitabu cha "${book.title}"!`,
        category: 'book_master',
        unlockedAt: formattedDate,
        bookId: book.id,
        bookTitle: book.title
      };
    }

    // Milestone 3: 5 Scene Stamps Collector Badge
    const totalStampsCount = Object.keys(updatedStamps).length;
    if (totalStampsCount >= 5 && !updatedBadges['collector_5']) {
      updatedBadges['collector_5'] = {
        id: 'collector_5',
        badgeTitle: language === 'en' ? 'Dedicated Art Explorer ⭐' : 'Mpelelezi Hodari wa Sanaa ⭐',
        badgeIcon: '⭐',
        description: language === 'en' ? 'Collected 5 unique story scene stamps!' : 'Umekusanya mahuri 5 ya kipekee ya kurasa!',
        category: 'collector',
        unlockedAt: formattedDate
      };
    }

    setUserBadges(updatedBadges);
    playAppChime('sparkle');

    setRecentReward({
      bookId: book.id,
      bookTitle: book.title,
      author: book.author,
      artForm: artForm,
      stampTitle: newStamp.stampTitle,
      stampIcon: newStamp.stampIcon,
      unlockedAt: newStamp.stampedAt
    });
    setShowRewardModal(true);

    setDbNotification({
      type: 'success',
      message: language === 'en'
        ? `🎖️ Stamped "${page.title}"! Added to your private stamp vault.`
        : `🎖️ Umepiga muhuri ukurasa wa "${page.title}"! Umehifadhiwa kwenye mkusanyiko wako binafsi.`
    });
    setTimeout(() => setDbNotification(null), 3500);
  };



  // Book Reviews & Ratings state given by students and parents
  const [bookReviews, setBookReviews] = useState<Record<string, BookReview[]>>(() => {
    return safeGetJSON<Record<string, BookReview[]>>('digipicture_reviews', {});
  });

  useEffect(() => {
    safeSetItem('digipicture_reviews', bookReviews);
  }, [bookReviews]);

  // Direct messages sent to artists from students / parents
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    return safeGetJSON<DirectMessage[]>('digipicture_direct_messages', []);
  });

  useEffect(() => {
    safeSetItem('digipicture_direct_messages', directMessages);
  }, [directMessages]);

  // Student Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    return safeGetJSON<Subscriber[]>('digipicture_subscriptions', []);
  });

  useEffect(() => {
    safeSetItem('digipicture_subscriptions', subscribers);
  }, [subscribers]);

  // Direct Message Modal State
  const [showDirectMessageModal, setShowDirectMessageModal] = useState<boolean>(false);
  const [dmArtistName, setDmArtistName] = useState<string>('');
  const [dmBookTitle, setDmBookTitle] = useState<string>('');
  const [dmSenderName, setDmSenderName] = useState<string>(userProfile.name || 'Parent / Reader');
  const [dmSenderRole, setDmSenderRole] = useState<string>('Student');
  const [dmSenderEmail, setDmSenderEmail] = useState<string>(userProfile.email || 'youremail@gmail.com');
  const [dmMessage, setDmMessage] = useState<string>('');

  const handleOpenDirectMessageModal = (artistName: string, bookTitle?: string) => {
    setDmArtistName(artistName);
    setDmBookTitle(bookTitle || '');
    setShowDirectMessageModal(true);
    playChime('pop');
  };

  const handleSubmitDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessage.trim() || !dmArtistName || !dmSenderName.trim() || !dmSenderEmail.trim()) {
      setDbNotification({
        type: 'error',
        message: 'Please provide all required sender details (name, email address, and message).'
      });
      return;
    }

    const currentUid = auth.currentUser?.uid || userAccount?.uid || 'guest';
    const newDM: DirectMessage = {
      id: `dm-${Date.now()}`,
      artistName: dmArtistName,
      bookTitle: dmBookTitle,
      senderName: dmSenderName.trim(),
      senderRole: dmSenderRole,
      senderEmail: dmSenderEmail.trim(),
      senderUid: currentUid,
      message: dmMessage.trim(),
      messageText: dmMessage.trim(),
      sentAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setDirectMessages(prev => [newDM, ...prev]);
    setShowDirectMessageModal(false);
    playChime('sparkle');
    setDbNotification({
      type: 'success',
      message: `💌 Message sent directly to artist "${dmArtistName}"! They will receive your note.`
    });
    setTimeout(() => setDbNotification(null), 5000);
  };

  // Share Modal State for sharing books & sharing app
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareTarget, setShareTarget] = useState<{ type: 'book' | 'app'; book?: PictureBook }>({ type: 'app' });
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  const handleOpenShareModal = (type: 'book' | 'app', book?: PictureBook) => {
    setShareTarget({ type, book });
    setShareCopied(false);
    setShowShareModal(true);
    playChime('pop');
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      playChime('sparkle');
      setTimeout(() => setShareCopied(false), 3000);
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
    });
  };

  // Reviews Modal State
  const [showReviewsModal, setShowReviewsModal] = useState<boolean>(false);
  const [reviewingBook, setReviewingBook] = useState<PictureBook | null>(null);
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState<string>('');
  const [newReviewerName, setNewReviewerName] = useState<string>(userProfile.name || 'Parent / Student');
  const [newReviewerRole, setNewReviewerRole] = useState<'Student' | 'Parent' | 'Teacher' | 'Reader'>('Parent');

  const handleOpenReviewsModal = (book: PictureBook) => {
    setReviewingBook(book);
    setNewReviewRating(5);
    setNewReviewComment('');
    setNewReviewerName(userProfile.name || 'Parent / Student');
    setNewReviewerRole('Parent');
    setShowReviewsModal(true);
    playChime('pop');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingBook || !newReviewComment.trim()) return;

    const newRev: BookReview = {
      id: `rev-${Date.now()}`,
      bookId: reviewingBook.id,
      reviewerName: newReviewerName.trim() || 'Anonymous Reader',
      reviewerRole: newReviewerRole,
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    setBookReviews(prev => ({
      ...prev,
      [reviewingBook.id]: [newRev, ...(prev[reviewingBook.id] || [])]
    }));

    setNewReviewComment('');
    playChime('sparkle');
    setDbNotification({
      type: 'success',
      message: `⭐ Thank you! Your review for "${reviewingBook.title}" has been added.`
    });
    setTimeout(() => setDbNotification(null), 4000);
  };

  // Helper to compute average rating and count for a book
  const getBookRatingInfo = (book: PictureBook) => {
    const list = bookReviews[book.id] || [];
    if (list.length === 0) {
      return { average: 5.0, count: 0 };
    }
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / list.length) * 10) / 10;
    return { average: avg, count: list.length };
  };

  // "Surprise Me!" Feature - random book selector
  const handleSurpriseMe = () => {
    playChime('sparkle');
    const publishedBooks = localizedBooksList.filter(b => b.status !== 'draft' && b.status !== 'flagged');
    if (publishedBooks.length === 0) return;

    // Pick random book different from currently selected if possible
    const pool = publishedBooks.filter(b => b.id !== selectedBookId);
    const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : publishedBooks[0];

    setSelectedBookId(choice.id);
    const savedPos = readingProgress[choice.id] || 0;
    setActivePageIndex(savedPos);
    setAppMode('reading');
    setIsAutoPlaying(false);
    hushNow();

    setDbNotification({
      type: 'info',
      message: `🎁 Surprise! Opened "${choice.title}" for you!`
    });
    setTimeout(() => setDbNotification(null), 4000);
  };

  // Artist Profile Modal State (for readers & students viewing artist bio, email, phone number)
  const [showArtistProfileModal, setShowArtistProfileModal] = useState<boolean>(false);
  const [profileArtistDetails, setProfileArtistDetails] = useState<{
    uid?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    specialization?: string;
    bio: string;
    email: string;
    phone: string;
    avatar: string;
    categories?: string[];
    booksCount: number;
  } | null>(null);

  const handleOpenArtistProfileModal = async (artistName: string) => {
    if (!artistName) return;

    // Look up in registered artists in localStorage
    const registeredList = safeGetJSON<any[]>('digipicture_registered_artists', []);

    const normName = artistName.trim().toLowerCase();
    let found = Array.isArray(registeredList) ? registeredList.find(a => 
      (a.name || '').trim().toLowerCase() === normName || 
      (a.name || '').trim().toLowerCase().includes(normName) ||
      (a.username || '').trim().toLowerCase() === normName ||
      (a.email || '').trim().toLowerCase() === normName
    ) : undefined;

    if (!found && userAccount && (
      (userAccount.name || '').trim().toLowerCase() === normName ||
      (userAccount.username || '').trim().toLowerCase() === normName ||
      (userAccount.email || '').trim().toLowerCase() === normName
    )) {
      found = userAccount as any;
    }

    // Calculate books by this artist
    const booksByArtist = booksList.filter(b => (b.author || '').trim().toLowerCase() === normName || (b.author || '').trim().toLowerCase().includes(normName));

    // Single source of truth lookup directly from Firestore using UID first, email fallback
    const candidateUid = found?.uid || (auth.currentUser && (auth.currentUser.displayName?.toLowerCase() === normName || auth.currentUser.email?.toLowerCase() === normName) ? auth.currentUser.uid : null);
    const candidateEmail = found?.email || (artistName.includes('@') ? artistName : undefined);

    let docData: any = null;
    try {
      docData = await fetchProfileFromFirestore(candidateUid, candidateEmail);
    } catch (err) {
      console.warn("Error fetching artist profile from Firestore:", err);
    }

    if (docData) {
      setProfileArtistDetails({
        uid: docData.uid || candidateUid || undefined,
        name: docData.name || `${docData.firstName || ''} ${docData.lastName || ''}`.trim() || found?.name || artistName,
        firstName: docData.firstName || found?.firstName || '',
        lastName: docData.lastName || found?.lastName || '',
        username: docData.username || found?.username || '',
        specialization: docData.specialization || found?.specialization || '',
        bio: docData.bio || found?.bio || '',
        email: docData.email || found?.email || '',
        phone: docData.phone || found?.phone || '',
        avatar: docData.avatar || found?.avatar || '🎨',
        categories: Array.isArray(docData.categories) && docData.categories.length > 0 ? docData.categories : (found?.categories || ['Storybook Illustration']),
        booksCount: booksByArtist.length
      });
      setShowArtistProfileModal(true);
      playChime('pop');
      return;
    }

    if (found) {
      setProfileArtistDetails({
        uid: found.uid || candidateUid || undefined,
        name: found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || artistName,
        firstName: found.firstName || '',
        lastName: found.lastName || '',
        username: found.username || '',
        specialization: found.specialization || '',
        bio: found.bio || '',
        email: found.email || '',
        phone: found.phone || '',
        avatar: found.avatar || '🎨',
        categories: found.categories || ['Storybook Illustration'],
        booksCount: booksByArtist.length
      });
      setShowArtistProfileModal(true);
      playChime('pop');
    } else {
      setProfileArtistDetails({
        uid: candidateUid || undefined,
        name: artistName,
        firstName: '',
        lastName: '',
        username: '',
        specialization: '',
        bio: '',
        email: candidateEmail || '',
        phone: '',
        avatar: '🎨',
        categories: ['Storybook Illustration'],
        booksCount: booksByArtist.length
      });
      setShowArtistProfileModal(true);
      playChime('pop');
    }
  };

  // Reports collection for parent/guardian content reports & automated moderation
  const [reportsList, setReportsList] = useState<ReportItem[]>(() => {
    return safeGetJSON<ReportItem[]>('digipicture_reports', []);
  });

  // Automatically persist reports
  useEffect(() => {
    safeSetItem('digipicture_reports', reportsList);
  }, [reportsList]);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportingBook, setReportingBook] = useState<PictureBook | null>(null);
  const [reportReason, setReportReason] = useState<string>('Inappropriate Content or Language');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>(userProfile.name || 'Parent / Guardian');
  const [reporterRole, setReporterRole] = useState<string>('Parent');
  const [reporterEmail, setReporterEmail] = useState<string>(userProfile.email || 'youremail@gmail.com');

  const handleOpenReportModal = (book: PictureBook) => {
    setReportingBook(book);
    setReportReason('Inappropriate Content or Language');
    setReportDetails('');
    setReporterName(userProfile.name || 'Parent / Guardian');
    setReporterRole('Parent');
    setReporterEmail(userProfile.email || 'youremail@gmail.com');
    setShowReportModal(true);
    playChime('pop');
  };

  // Automated content removal & report handler
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingBook) return;

    // Execute automated content moderation scan
    const fullText = `${reportingBook.title} ${reportingBook.description} ${reportingBook.pages.map(p => `${p.title} ${p.narrative}`).join(' ')}`;
    const autoScan = scanForInappropriateContent(fullText);

    const newReport: ReportItem = {
      id: `report-${Date.now()}`,
      bookId: reportingBook.id,
      bookTitle: reportingBook.title,
      bookAuthor: reportingBook.author,
      reporterName: reporterName.trim() || 'Parent / Guardian',
      reporterRole: reporterRole || 'Parent',
      reporterEmail: reporterEmail.trim() || 'parent@example.com',
      reason: reportReason,
      details: reportDetails.trim() || 'Parent submitted a moderation review request.',
      timestamp: new Date().toISOString(),
      autoScanFlagged: autoScan.isFlagged,
      autoScanReason: autoScan.isFlagged ? `Automated scan found: ${autoScan.matchedWords.join(', ')}` : undefined,
      status: 'pending'
    };

    setReportsList(prev => [newReport, ...prev]);

    // AUTOMATED CONTENT REMOVAL: Automatically set status to 'flagged' so it is immediately removed from the public library shelf!
    setBooksList((prev) => {
      const updated = prev.map((b) => {
        if (b.id === reportingBook.id) {
          return { ...b, status: 'flagged' as const };
        }
        return b;
      });
      const customOnly = updated.filter(b => b.isCustom);
      safeSetItem('digipicture_custom_books', customOnly);
      return updated;
    });

    setShowReportModal(false);
    playChime('sparkle');
    setDbNotification({
      type: 'info',
      message: language === 'en'
        ? `🚩 Thank you! Report submitted. "${reportingBook.title}" was flagged and automatically hidden from the public bookshelf pending moderation.`
        : `🚩 Ahsante! Ripoti imewasilishwa. "${reportingBook.title}" imezuiwa isionekane kwa watoto.`
    });
    setTimeout(() => setDbNotification(null), 6000);
  };

  // Real-time synchronization of picturebooks from Firestore & initial load
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = subscribeToBooks((firestoreBooks) => {
      if (firestoreBooks && firestoreBooks.length > 0) {
        setBooksList((prev) => {
          // Merge firestoreBooks with initial/local books, avoiding duplicates
          const firestoreIds = new Set(firestoreBooks.map(b => b.id));
          const deletedIds = new Set<string>(safeGetJSON<string[]>('digipicture_deleted_book_ids', []));
          
          const validFirestoreBooks = firestoreBooks.filter(b => !deletedIds.has(b.id));
          const otherBooks = prev.filter(b => !firestoreIds.has(b.id) && !deletedIds.has(b.id));
          
          return [...validFirestoreBooks, ...otherBooks];
        });
      }
      setIsLoading(false);
    });

    // Fallback one-time fetch to guarantee initial state is populated
    fetchBooksFromFirestore()
      .then((initialBooks) => {
        if (initialBooks && initialBooks.length > 0) {
          setBooksList((prev) => {
            const firestoreIds = new Set(initialBooks.map(b => b.id));
            const deletedIds = new Set<string>(safeGetJSON<string[]>('digipicture_deleted_book_ids', []));
            const validInitialBooks = initialBooks.filter(b => !deletedIds.has(b.id));
            const otherBooks = prev.filter(b => !firestoreIds.has(b.id) && !deletedIds.has(b.id));
            return [...validInitialBooks, ...otherBooks];
          });
        }
      })
      .catch((err) => {
        console.warn("Initial Firestore book fetch note:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Find selected book matching ID
  const activeBook = useMemo(() => {
    return localizedBooksList.find((b) => b.id === selectedBookId) || null;
  }, [localizedBooksList, selectedBookId]);

  // Find active page matching index
  const activePage = useMemo(() => {
    if (!activeBook) return null;
    return activeBook.pages[activePageIndex] || activeBook.pages[0];
  }, [activeBook, activePageIndex]);

  // Handle publishing a new book from Artist workbench
  const handlePublishBook = async (newBook: PictureBook) => {
    setIsPublishing(true);
    
    try {
      const nowIso = new Date().toISOString();
      const bookWithTime: PictureBook = {
        ...newBook,
        id: newBook.id || `book-custom-${Date.now()}`,
        createdAt: newBook.createdAt || nowIso,
        updatedAt: nowIso
      };

      const savedBook = await saveBookToFirestore(bookWithTime);

      setBooksList((prev) => {
        const customOnly = [savedBook, ...prev.filter(b => b.isCustom && b.id !== savedBook.id)];
        safeSetItem('digipicture_custom_books', customOnly);
        return [...customOnly, ...INITIAL_BOOKS.filter(b => b.id !== savedBook.id)];
      });

      setSelectedBookId(savedBook.id);
      setActivePageIndex(0);
      setLeftViewTab('reference');
      playChime('sparkle');

      setDbNotification({
        type: 'success',
        message: TRANSLATIONS[language].publishedSuccess.replace('{title}', savedBook.title)
      });
      setTimeout(() => {
        setDbNotification(null);
      }, 6000);
    } catch (err) {
      console.error("Database publish failed, falling back to local storage:", err);
      
      const nowIso = new Date().toISOString();
      const fallbackBook: PictureBook = {
        ...newBook,
        createdAt: newBook.createdAt || nowIso,
        updatedAt: nowIso
      };

      // Fallback: save to local storage only
      setBooksList((prev) => {
        const customOnly = [fallbackBook, ...prev.filter(b => b.isCustom && b.id !== newBook.id)];
        safeSetItem('digipicture_custom_books', customOnly);
        return [...customOnly, ...INITIAL_BOOKS];
      });

      setSelectedBookId(fallbackBook.id);
      setActivePageIndex(0);
      setLeftViewTab('reference');
      playChime('sparkle');

      setDbNotification({
        type: 'error',
        message: TRANSLATIONS[language].savedLocally.replace('{error}', err instanceof Error ? err.message : String(err))
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle updating an existing picture book
  const handleUpdateBook = async (updatedBook: PictureBook) => {
    setIsPublishing(true);
    try {
      const nowIso = new Date().toISOString();
      // If we are updating an initial book, we should copy it to the custom list
      const bookToSave: PictureBook = {
        ...updatedBook,
        isCustom: true,
        createdAt: updatedBook.createdAt || nowIso,
        updatedAt: nowIso
      };

      // Also persist to firestore if supported
      saveBookToFirestore(bookToSave).catch(e => console.warn("Firestore sync update notice:", e));
      
      setBooksList((prev) => {
        const isAlreadyCustom = prev.some((b) => b.id === bookToSave.id && b.isCustom);
        
        let newCustomOnly;
        const currentCustoms = prev.filter(b => b.isCustom);
        if (isAlreadyCustom) {
          newCustomOnly = currentCustoms.map(b => b.id === bookToSave.id ? bookToSave : b);
        } else {
          newCustomOnly = [bookToSave, ...currentCustoms.filter(b => b.id !== bookToSave.id)];
        }
        
        safeSetItem('digipicture_custom_books', newCustomOnly);
        
        const remainingInitials = INITIAL_BOOKS.filter(b => b.id !== bookToSave.id);
        return [...newCustomOnly, ...remainingInitials];
      });

      setSelectedBookId(bookToSave.id);
      setActivePageIndex(0);
      setLeftViewTab('reference');
      playChime('sparkle');
    } catch (err) {
      console.error("Local update failed:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle deleting a picture book (Content moderation / Takedown by Admin)
  const handleDeleteBook = async (bookId: string, bookData?: PictureBook) => {
    setIsPublishing(true);
    try {
      const targetBook = bookData || booksList.find(b => b.id === bookId);

      // 1. Add to permanent deleted book IDs blacklist
      try {
        const deletedIds = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
        const validList = Array.isArray(deletedIds) ? [...deletedIds] : [];
        if (!validList.includes(bookId)) {
          validList.push(bookId);
          safeSetItem('digipicture_deleted_book_ids', validList);
        }
      } catch (e) {
        console.error("Error updating deleted book blacklist:", e);
      }

      // 2. Delete from Firestore completely (books & picturebooks collections + storage images)
      await deleteBookFromFirestore(bookId, targetBook);
      
      // 3. Delete from local state and custom storage
      setBooksList((prev) => {
        const remaining = prev.filter(b => b.id !== bookId);
        const customOnly = remaining.filter(b => b.isCustom);
        safeSetItem('digipicture_custom_books', customOnly);
        return remaining;
      });

      // 4. Clean up any related user state
      setBookmarks(prev => {
        const copy = { ...prev };
        delete copy[bookId];
        return copy;
      });
      setReadingProgress(prev => {
        const copy = { ...prev };
        delete copy[bookId];
        return copy;
      });
      setReportsList(prev => prev.filter(r => r.bookId !== bookId));

      // Clear selection if deleted book was open
      if (selectedBookId === bookId) {
        setSelectedBookId(null);
        setAppMode('shelf');
      }

      setDbNotification({
        type: 'success',
        message: language === 'en' 
          ? `Picture book taken down and deleted completely from the app! 🗑️` 
          : `Kitabu kimeondolewa kabisa kwenye programu! 🗑️`
      });
      setTimeout(() => setDbNotification(null), 4000);
      playChime('bubble');
    } catch (err) {
      console.error("Database delete failed:", err);
      // Fallback to local delete
      setBooksList((prev) => {
        const remaining = prev.filter(b => b.id !== bookId);
        const customOnly = remaining.filter(b => b.isCustom);
        safeSetItem('digipicture_custom_books', customOnly);
        return remaining;
      });
      
      setDbNotification({
        type: 'success',
        message: language === 'en' 
          ? `Picture book removed from app! 🗑️` 
          : `Kitabu kimeondolewa kwenye programu! 🗑️`
      });
      setTimeout(() => setDbNotification(null), 4000);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle deleting a student subscriber profile (Moderation by Admin)
  const handleDeleteSubscriber = (subscriberId: string) => {
    setSubscribers((prev) => {
      const remaining = prev.filter(s => s.id !== subscriberId);
      try {
        localStorage.setItem('digipicture_subscriptions', JSON.stringify(remaining));
      } catch (err) {
        console.error("Failed to save subscriptions:", err);
      }
      return remaining;
    });
    playChime('bubble');
    setDbNotification({
      type: 'success',
      message: language === 'en'
        ? `Student subscriber profile removed. 🗑️`
        : `Wasifu wa mwanafunzi umefutwa. 🗑️`
    });
    setTimeout(() => setDbNotification(null), 3000);
  };

  // Helper to get timestamp from book for sorting
  const getBookTimestamp = (book: PictureBook): number => {
    const timeStr = book.updatedAt || book.createdAt;
    if (!timeStr) return 0;
    const timeNum = new Date(timeStr).getTime();
    return isNaN(timeNum) ? 0 : timeNum;
  };

  // Filter & sort picturebooks based on query, focus medium, and recent update/add timestamp
  const filteredBooks = useMemo(() => {
    const list = localizedBooksList.filter((book) => {
      // Exclude drafts, pending_review, pending_approval, and flagged books from the public children's library shelf
      if (book.status === 'draft' || book.status === 'flagged' || book.status === 'pending_review' || book.status === 'pending_approval') {
        return false;
      }
      if (book.isCustom && book.status && book.status !== 'published') {
        return false;
      }

      const matchSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.contributors && book.contributors.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        book.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchFilter =
        selectedFilter === 'all' ||
        book.artForms.includes(selectedFilter as ArtFormType);

      return matchSearch && matchFilter;
    });

    return [...list].sort((a, b) => {
      if (shelfSortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (shelfSortBy === 'rating') {
        const ratingA = getBookRatingInfo(a).average;
        const ratingB = getBookRatingInfo(b).average;
        if (ratingB !== ratingA) return ratingB - ratingA;
      }
      // Default: 'recent' - sort by most recently added or updated picturebook!
      const timeA = getBookTimestamp(a);
      const timeB = getBookTimestamp(b);

      if (timeB !== timeA) {
        return timeB - timeA;
      }

      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [localizedBooksList, searchQuery, selectedFilter, shelfSortBy]);

  // Paginated books on the shelf list
  const paginatedBooks = useMemo(() => {
    const startIdx = (shelfPage - 1) * itemsPerShelf;
    return filteredBooks.slice(startIdx, startIdx + itemsPerShelf);
  }, [filteredBooks, shelfPage]);

  const totalShelfPages = Math.ceil(filteredBooks.length / itemsPerShelf);

  // Navigations in shelf
  const goNextShelfPage = () => {
    if (shelfPage < totalShelfPages) {
      setShelfPage((p) => p + 1);
      playChime('pop');
    }
  };

  const goPrevShelfPage = () => {
    if (shelfPage > 1) {
      setShelfPage((p) => p - 1);
      playChime('pop');
    }
  };

  // Select a book to start reading
  const handleSelectBook = (bookId: string) => {
    playChime('sparkle');
    setSelectedBookId(bookId);
    setActivePageIndex(0);
    setIsAutoPlaying(false);
    hushNow();
    setAppMode('reading');

    // Auto-select reference tab if first page contains custom uploaded media
    const targetBook = booksList.find((b) => b.id === bookId);
    const firstPage = targetBook?.pages[0];
    setLeftViewTab(firstPage?.mediaUrl ? 'reference' : 'interactive');
  };

  // Resume a book from a saved bookmark index
  const handleResumeBook = (bookId: string, pageIndex: number) => {
    playChime('sparkle');
    setSelectedBookId(bookId);
    setActivePageIndex(pageIndex);
    setIsAutoPlaying(false);
    hushNow();
    setAppMode('reading');

    // Auto-select reference tab if target page contains custom uploaded media
    const targetBook = booksList.find((b) => b.id === bookId);
    const targetPage = targetBook?.pages[pageIndex];
    setLeftViewTab(targetPage?.mediaUrl ? 'reference' : 'interactive');
  };

  // Go to next page inside book
  const handleNextPage = () => {
    if (activeBook && activePageIndex < activeBook.pages.length - 1) {
      playChime('pop');
      setActivePageIndex((prev) => prev + 1);
      hushNow();
      setIsAutoPlaying(false);
      
      const nextPage = activeBook.pages[activePageIndex + 1];
      setLeftViewTab(nextPage?.mediaUrl ? 'reference' : 'interactive');
    }
  };

  const handlePrevPage = () => {
    if (activePageIndex > 0 && activeBook) {
      playChime('pop');
      setActivePageIndex((prev) => prev - 1);
      hushNow();
      setIsAutoPlaying(false);

      const prevPage = activeBook.pages[activePageIndex - 1];
      setLeftViewTab(prevPage?.mediaUrl ? 'reference' : 'interactive');
    }
  };

  // Keyboard navigation for reading mode (Next / Previous page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode !== 'reading') return;
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, activeBook, activePageIndex]);

  const handleHome = () => {
    playChime('bubble');
    hushNow();
    setIsAutoPlaying(false);
    setAppMode('shelf');
    setSelectedBookId(null);
  };

  // Auto Play Narration Voice
  const startNarratorAutoPlay = () => {
    if (!activePage) return;
    playChime('sparkle');
    setIsAutoPlaying(true);
    talkToMe(activePage.narrative, () => {
      setIsAutoPlaying(false);
      // Automatically advance page if possible
      if (activeBook && activePageIndex < activeBook.pages.length - 1) {
        setActivePageIndex(prev => prev + 1);
      }
    });
  };

  const stopNarratorAutoPlay = () => {
    hushNow();
    setIsAutoPlaying(false);
    playChime('pop');
  };

  // Color mappings for decorative child-friendly framing grids
  const getBorderColorClass = (colorName: string) => {
    const isNight = theme === 'night';
    if (isNight) {
      switch (colorName) {
        case 'green':
          return 'border-emerald-700 bg-slate-900 text-slate-100 hover:border-emerald-500';
        case 'blue':
          return 'border-cyan-700 bg-slate-900 text-slate-100 hover:border-cyan-500';
        case 'purple':
          return 'border-purple-700 bg-slate-900 text-slate-100 hover:border-purple-500';
        case 'orange':
        default:
          return 'border-orange-700 bg-slate-900 text-slate-100 hover:border-orange-500';
      }
    }
    switch (colorName) {
      case 'green':
        return 'border-emerald-400 bg-emerald-50';
      case 'blue':
        return 'border-cyan-400 bg-cyan-50';
      case 'purple':
        return 'border-purple-400 bg-purple-50';
      case 'orange':
      default:
        return 'border-orange-400 bg-orange-50';
    }
  };

  // If application is placed under remote maintenance or emergency kill switch, render Quarantine screen
  if (accessCheck.blocked) {
    return (
      <MaintenanceScreen
        config={remoteConfig}
        userAccount={userAccount}
        language={language}
        onAdminBypass={(bypassAccount) => {
          setUserAccount(bypassAccount);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden box-border transition-colors duration-300 selection:bg-orange-200 ${
      theme === 'night' ? 'bg-slate-950 text-slate-100' : 'bg-brand-cream text-gray-900'
    }`}>
      
      {/* ==================== ADMIN MODE OR WORKBENCH MODE ==================== */}
      {appMode === 'admin' ? (
        <AdminDashboard
          userAccount={userAccount}
          language={language}
          theme={theme}
          booksList={booksList}
          onDeleteBook={async (bookId, bookData) => {
            await handleDeleteBook(bookId, bookData);
          }}
          onSelectBook={(book) => {
            setSelectedBookId(book.id);
            setActivePageIndex(0);
            setLeftViewTab('reference');
            setAppMode('reading');
            playChime('sparkle');
          }}
          onExitAdmin={() => {
            setAppMode('shelf');
            playChime('bubble');
          }}
          onLogout={handleCompleteLogout}
          onPurgeAllData={handlePurgeAllData}
          onUpdateUserAccount={(updated) => {
            setUserAccount((prev) => ({ ...prev, ...updated }));
          }}
          onApproveBook={async (book) => {
            await handlePublishBook(book);
          }}
        />
      ) : appMode === 'workbench' ? (
        <ArtistWorkbench
          onPublish={handlePublishBook}
          onUpdate={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
          onDeleteSubscriber={handleDeleteSubscriber}
          onClose={() => { setAppMode('shelf'); playChime('bubble'); }}
          onLogout={handleCompleteLogout}
          onOpenBook={(book) => {
            setSelectedBookId(book.id);
            setActivePageIndex(0);
            setLeftViewTab('reference');
            setAppMode('reading');
            playChime('sparkle');
          }}
          isPublishing={isPublishing}
          booksList={booksList}
          subscribers={subscribers}
          language={language}
          setLanguage={setLanguage}
          userAccount={userAccount}
          onUpdateUserAccount={setUserAccount}
          directMessages={directMessages}
          bookReviews={bookReviews}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <div className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden box-border">
          
          {/* ==================== SHELF MODE HEADER ==================== */}
          <header className={`w-full max-w-full p-2.5 sm:p-4 shadow-md select-none transition-colors duration-300 border-b-6 box-border ${
            theme === 'night'
              ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-100 border-slate-950'
              : 'bg-gradient-to-r from-orange-400 via-orange-550 to-brand-orange text-white border-brand-orange-dark'
          }`}>
            <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap overflow-x-hidden">
              
              {/* Brand Logo and Title in Header */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-11 sm:h-11 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 shrink-0">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow text-white" />
                </div>
                
                <h1 className="font-display font-medium text-xs sm:text-xl tracking-normal text-white drop-shadow-sm ml-0.5 select-none truncate min-w-0">
                  {appMode === 'reading' && activeBook
                    ? activeBook.title.toUpperCase()
                    : TRANSLATIONS[language].appTitle.toUpperCase()}
                </h1>
              </div>

              {/* Action Buttons: Creative Workbench / Settings */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">

                {/* Account Role / Login Switcher Button - only shown when not logged in as an artist */}
                {(!userAccount.isLoggedIn || userAccount.role !== 'artist') && (
                  <button
                    onClick={() => { setShowAuthModal(true); playAppChime('pop'); }}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 border-2 rounded-full shadow cursor-pointer active:scale-95 transition flex items-center gap-1 sm:gap-1.5 select-none font-display text-[11px] sm:text-xs font-black ${
                      theme === 'night'
                        ? 'bg-emerald-950 text-emerald-200 border-emerald-600 hover:bg-emerald-900'
                        : 'bg-emerald-400 text-[#064E3B] border-emerald-600 hover:bg-emerald-300'
                    }`}
                    id="header-role-login-btn"
                    title="Account Portal & Sign In"
                  >
                    <span className="text-xs sm:text-sm">
                      {userAccount.role === 'artist' ? '🎨' : '🎓'}
                    </span>
                    <span className="hidden sm:inline">
                      {language === 'en' ? 'Sign In / Account' : 'Ingia / Akaunti'}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                      theme === 'night'
                        ? 'bg-slate-800 text-amber-200'
                        : 'bg-white/60 text-[#3B1A08]'
                    }`}>
                      {userAccount.isLoggedIn ? (language === 'en' ? 'Reader' : 'Msomaji') : (language === 'en' ? 'Log In' : 'Ingia')}
                    </span>
                  </button>
                )}

                {/* Open Artist Creator Studio Header Button when logged in or signed up as an artist */}
                {userAccount.role === 'artist' && userAccount.isLoggedIn && (
                  <button
                    onClick={() => {
                      setAppMode('workbench');
                      playAppChime('sparkle');
                    }}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 border-2 rounded-full shadow cursor-pointer active:scale-95 transition flex items-center gap-1 sm:gap-1.5 select-none font-display text-[11px] sm:text-xs font-bold ${
                      theme === 'night'
                        ? 'bg-amber-950 text-amber-200 border-amber-600 hover:bg-amber-900'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-amber-600 hover:brightness-105'
                    }`}
                    id="header-open-creator-studio-btn"
                    title={language === 'en' ? 'Open Artist Creator Studio Dashboard' : 'Fungua Studio ya Msanii'}
                  >
                    <span className="text-xs sm:text-sm">🎨</span>
                    <span className="hidden lg:inline">
                      {language === 'en' ? 'Open Artist Creator Studio' : 'Fungua Studio ya Msanii'}
                    </span>
                    <span className="inline lg:hidden">
                      {language === 'en' ? 'Creator Studio' : 'Studio'}
                    </span>
                  </button>
                )}

                {/* Digital Reward Stamps & Badges Button */}
                <button
                  onClick={() => { setShowBadgesPassportModal(true); playAppChime('sparkle'); }}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 border-2 rounded-full shadow cursor-pointer active:scale-95 transition flex items-center gap-1 select-none text-[11px] sm:text-xs font-display font-black ${
                    theme === 'night'
                      ? 'bg-slate-900 border-slate-700 text-amber-200 hover:bg-slate-800'
                      : 'bg-amber-200 border-amber-500 text-[#3B1A08] hover:bg-amber-300'
                  }`}
                  id="header-badges-passport-btn"
                  title="My Digital Stamps & Badges Passport"
                >
                  <span className="text-xs sm:text-sm">🎖️</span>
                  <span className={`hidden md:inline font-black ${theme === 'night' ? 'text-amber-200' : 'text-[#3B1A08]'}`}>{language === 'en' ? 'Stamps' : 'Mahuri'}</span>
                  {(Object.keys(userStamps).length + Object.keys(userBadges).length) > 0 && (
                    <span className="relative flex items-center justify-center ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative bg-amber-700 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                        {Object.keys(userStamps).length + Object.keys(userBadges).length}
                      </span>
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setShowSettings(true); setActiveSettingsTab('profile'); playAppChime('pop'); }}
                  className={`p-1 sm:pl-2 sm:pr-3 sm:py-1 border-2 rounded-full shadow cursor-pointer active:scale-95 transition flex items-center gap-1 sm:gap-1.5 select-none ${
                    theme === 'night'
                      ? 'bg-slate-900 border-slate-700 text-amber-100 hover:bg-slate-800'
                      : 'bg-white border-brand-orange-dark text-[#3B1A08] hover:bg-orange-50'
                  }`}
                  id="profile-settings-trigger-button"
                  title="My Profile & Settings"
                >
                  <span className={`text-sm sm:text-lg leading-none p-1 sm:p-1.5 rounded-full ${theme === 'night' ? 'bg-slate-800 text-slate-100' : 'bg-orange-100'}`}>
                    {userProfile.avatar}
                  </span>
                  <span className={`text-xs font-display font-black hidden sm:inline ${theme === 'night' ? 'text-amber-100' : 'text-[#3B1A08]'}`}>
                    {userProfile.name.split(' ')[0]}
                  </span>
                  <Settings className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5px] animate-spin-slow ${theme === 'night' ? 'text-amber-300' : 'text-brand-orange'}`} />
                </button>
              </div>

            </div>
          </header>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthenticate={(account) => {
              setUserAccount(account);
              setShowAuthModal(false);
              playAppChime('sparkle');
              if (account.role === 'admin' && account.isLoggedIn) {
                setAppMode('admin');
              } else if (account.role === 'artist' && account.isLoggedIn) {
                setAppMode('workbench');
              } else {
                setAppMode('shelf');
              }
            }}
            currentAccount={userAccount}
            language={language}
            theme={theme}
            onLogout={handleCompleteLogout}
          />

          {/* ==================== SETTINGS & USER PROFILE OVERLAY PANEL ==================== */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className={`rounded-3xl border-4 w-[92vw] sm:w-[80vw] md:w-[50vw] max-w-lg max-h-[85vh] md:max-h-[70vh] shadow-2xl relative animate-scale-up overflow-hidden flex flex-col my-auto transition-colors duration-300 ${
                theme === 'night' ? 'bg-slate-900 border-slate-950 text-slate-100' : 'bg-white border-amber-300 text-gray-900'
              }`}>
                
                {/* Modal Title and close button */}
                <div className={`p-4 sm:p-5 text-white flex items-center justify-between border-b-4 transition-colors duration-300 ${
                  theme === 'night' ? 'bg-gradient-to-r from-slate-950 to-slate-900 border-slate-950' : 'bg-gradient-to-r from-orange-400 to-amber-400 border-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌟</span>
                    <h3 className="font-display font-bold text-base sm:text-lg">
                      {TRANSLATIONS[language].userProfileTitle}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setShowSettings(false); setIsMobileSettingsNavOpen(false); playAppChime('bubble'); }}
                    className="w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Desktop Tabs */}
                {(() => {
                  const isArtistUser = userAccount?.role === 'artist' || (userProfile as any)?.role === 'artist';
                  const desktopNavTabs = [
                    { id: 'profile' as const, icon: '👤', title: language === 'en' ? 'Profile' : 'Wasifu', count: null },
                    { id: 'settings' as const, icon: '⚙️', title: language === 'en' ? 'Settings' : 'Mipangilio', count: null },
                    { id: 'bookmarks' as const, icon: '🔖', title: 'History', count: history.length },
                    ...(isArtistUser
                      ? [{ id: 'messages' as const, icon: '💬', title: 'Direct Msgs', count: directMessages.length }]
                      : []),
                    { id: 'reports' as const, icon: '📧', title: 'Contact & Reports', count: reportsList.length }
                  ];
                  return (
                    <div className={`hidden sm:flex border-b p-2 gap-1 select-none transition-colors duration-300 ${
                      theme === 'night' ? 'bg-slate-950/80 border-slate-800' : 'bg-amber-50/50 border-orange-100'
                    }`}>
                      {desktopNavTabs.map((tab) => {
                        const label = `${tab.icon} ${tab.title}${tab.count !== null ? ` (${tab.count})` : ''}`;
                        const isActive = activeSettingsTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            id={`settings-desktop-tab-${tab.id}`}
                            type="button"
                            onClick={() => {
                              setActiveSettingsTab(tab.id);
                              playAppChime('pop');
                            }}
                            className={`flex-1 py-2 px-1 text-center font-display font-bold text-[11px] rounded-xl cursor-pointer transition ${
                              isActive
                                ? 'bg-amber-500 text-white shadow-sm'
                                : (theme === 'night' ? 'text-slate-300 hover:bg-slate-800' : 'text-amber-950 hover:bg-orange-100/40')
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Mobile Dropdown Navigation */}
                <div className={`block sm:hidden border-b p-2.5 select-none transition-colors duration-300 ${
                  theme === 'night' ? 'bg-slate-950/90 border-slate-800' : 'bg-amber-50/80 border-orange-100'
                }`}>
                  {(() => {
                    const isArtistUser = userAccount?.role === 'artist' || (userProfile as any)?.role === 'artist';
                    const settingsNavTabs = [
                      { id: 'profile' as const, icon: '👤', title: language === 'en' ? 'Profile' : 'Wasifu', count: null },
                      { id: 'settings' as const, icon: '⚙️', title: language === 'en' ? 'Settings' : 'Mipangilio', count: null },
                      { id: 'bookmarks' as const, icon: '🔖', title: 'History', count: history.length },
                      ...(isArtistUser
                        ? [{ id: 'messages' as const, icon: '💬', title: 'Direct Msgs', count: directMessages.length }]
                        : []),
                      { id: 'reports' as const, icon: '📧', title: 'Contact & Reports', count: reportsList.length }
                    ];
                    const currentTab = settingsNavTabs.find(t => t.id === activeSettingsTab) || settingsNavTabs[0];
                    return (
                      <div className="relative">
                        <button
                          id="settings-mobile-dropdown-btn"
                          type="button"
                          onClick={() => {
                            setIsMobileSettingsNavOpen(!isMobileSettingsNavOpen);
                            playAppChime('pop');
                          }}
                          className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between font-display font-bold text-xs cursor-pointer transition shadow-xs ${
                            theme === 'night'
                              ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-750'
                              : 'bg-white border-amber-200 text-gray-900 hover:bg-amber-50/60'
                          }`}
                          aria-expanded={isMobileSettingsNavOpen}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{currentTab.icon}</span>
                            <span className="truncate">{currentTab.title}</span>
                            {currentTab.count !== null && (
                              <span className={`px-2 py-0.5 text-[11px] rounded-full font-semibold shrink-0 ${
                                theme === 'night' ? 'bg-slate-700 text-amber-300' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {currentTab.count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-gray-400">
                            {isMobileSettingsNavOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isMobileSettingsNavOpen && (
                          <div className={`mt-2 rounded-xl border shadow-lg overflow-hidden transition-all duration-200 ${
                            theme === 'night'
                              ? 'bg-slate-900 border-slate-700 divide-y divide-slate-800'
                              : 'bg-white border-amber-200 divide-y divide-orange-50'
                          }`}>
                            {settingsNavTabs.map((tab) => {
                              const isActive = activeSettingsTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  id={`settings-mobile-option-${tab.id}`}
                                  type="button"
                                  onClick={() => {
                                    setActiveSettingsTab(tab.id);
                                    setIsMobileSettingsNavOpen(false);
                                    playAppChime('pop');
                                  }}
                                  className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left font-display text-xs cursor-pointer transition ${
                                    isActive
                                      ? (theme === 'night' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-amber-500 text-white font-bold')
                                      : (theme === 'night' ? 'text-slate-300 hover:bg-slate-800 font-medium' : 'text-gray-700 hover:bg-orange-50 font-medium')
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-base shrink-0">{tab.icon}</span>
                                    <span className="truncate">{tab.title}</span>
                                    {tab.count !== null && (
                                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold shrink-0 ${
                                        isActive
                                          ? (theme === 'night' ? 'bg-amber-400 text-slate-900' : 'bg-white text-amber-700')
                                          : (theme === 'night' ? 'bg-slate-800 text-slate-300' : 'bg-amber-100 text-amber-800')
                                      }`}>
                                        {tab.count}
                                      </span>
                                    )}
                                  </div>
                                  {isActive && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Tab content wrapper */}
                <div className="p-5 sm:p-6 flex-1 overflow-y-auto max-h-[60vh]">
                  
                  {/* ==================== TAB 1: USER PROFILE ==================== */}
                  {activeSettingsTab === 'profile' && (
                    <div className="space-y-4 text-left animate-fade-in">
                      
                      {/* Active Account Role Card */}
                      <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
                        userAccount.role === 'artist'
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-emerald-50 border-emerald-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                            userAccount.role === 'artist' ? 'bg-amber-400 text-amber-955' : 'bg-emerald-400 text-teal-955'
                          }`}>
                            {userAccount.role === 'artist' ? '🎨' : '🎓'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-extrabold text-xs text-gray-900">
                                {userAccount.role === 'artist'
                                  ? (language === 'en' ? 'Artist Account' : 'Akaunti ya Msanii')
                                  : (language === 'en' ? 'Student Account' : 'Akaunti ya Mwanafunzi')}
                              </span>
                              {userAccount.role === 'artist' && (
                                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                                  {language === 'en' ? 'Studio Access' : 'Studio'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                              {userAccount.role === 'artist'
                                ? (userAccount.username || userAccount.email || 'Registered Artist')
                                : (language === 'en' ? 'No password required for students' : 'Bila nenosiri')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {userAccount.isLoggedIn && (
                            <button
                              type="button"
                              onClick={handleCompleteLogout}
                              className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold font-display rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                              id="settings-logout-btn"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Log Out' : 'Toka'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Interactive Avatar Buddy selector */}
                      <div>
                        <label className={`block text-[11px] font-display font-bold uppercase mb-2 ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                          {TRANSLATIONS[language].profileAvatar}
                        </label>
                        <div className={`grid grid-cols-5 gap-2 p-3 rounded-2xl border transition-colors duration-300 ${
                          theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/50 border-orange-100'
                        }`}>
                          {['🦊', '🦁', '🐼', '🐨', '🦄', '🐯', '🐙', '🐸', '🐘', '🦋'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setProfileForm(prev => ({ ...prev, avatar: emoji }));
                                playAppChime('pop');
                              }}
                              className={`w-11 h-11 text-2xl flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                                profileForm.avatar === emoji
                                  ? 'bg-amber-500 scale-110 shadow-md ring-3 ring-amber-200'
                                  : (theme === 'night'
                                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-white'
                                      : 'bg-white hover:bg-orange-50 hover:scale-105 border border-orange-100')
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Name input */}
                      <div>
                        <label className={`block text-[11px] font-display font-bold uppercase mb-1.5 flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                          <User className="w-3.5 h-3.5 text-orange-400" />
                          {TRANSLATIONS[language].profileName}
                        </label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your real or nickname..."
                          className={`w-full px-4 py-2.5 focus:border-brand-orange-dark focus:outline-none rounded-xl text-xs font-sans placeholder-gray-400 font-medium border transition-colors duration-300 ${
                            theme === 'night' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>

                      {/* Email input with UI data masking for shoulder-surfing protection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-[11px] font-display font-bold uppercase flex items-center gap-1.5 ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                            <Mail className="w-3.5 h-3.5 text-orange-400" />
                            {TRANSLATIONS[language].profileEmail}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsSettingsEmailRevealed(!isSettingsEmailRevealed)}
                            className="text-[10px] text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {isSettingsEmailRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isSettingsEmailRevealed ? 'Mask' : 'Reveal'}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={isSettingsEmailRevealed ? "email" : "text"}
                            autoComplete="off"
                            name="no-autofill-settings-email"
                            value={isSettingsEmailRevealed ? profileForm.email : maskEmail(profileForm.email)}
                            onChange={(e) => {
                              if (!isSettingsEmailRevealed) setIsSettingsEmailRevealed(true);
                              setProfileForm(prev => ({ ...prev, email: e.target.value }));
                            }}
                            onFocus={() => setIsSettingsEmailRevealed(true)}
                            placeholder="your.email@example.com"
                            className={`w-full px-4 py-2.5 focus:border-brand-orange-dark focus:outline-none rounded-xl text-xs font-sans placeholder-gray-400 font-medium border pr-10 transition-colors duration-300 ${
                              theme === 'night' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setIsSettingsEmailRevealed(!isSettingsEmailRevealed)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 p-1 rounded cursor-pointer"
                            title="Toggle shoulder surfing protection"
                          >
                            {isSettingsEmailRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <span>🛡️</span> UI email masking active to protect private information from shoulder surfing.
                        </p>
                      </div>

                      {/* Save changes button */}
                      <button
                        onClick={() => {
                          setUserProfile({
                            name: profileForm.name || "Guest Explorer",
                            email: profileForm.email || "youremail@gmail.com",
                            avatar: profileForm.avatar
                          });
                          playAppChime('sparkle');
                          setDbNotification({
                            type: 'success',
                            message: TRANSLATIONS[language].profileUpdated
                          });
                          setTimeout(() => setDbNotification(null), 3000);
                        }}
                        className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-display font-bold text-xs rounded-2xl shadow border-b-4 border-teal-700 active:translate-y-1 active:border-b-0 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        {TRANSLATIONS[language].saveProfile}
                      </button>

                    </div>
                  )}

                  {/* ==================== TAB 2: APP SETTINGS ==================== */}
                  {activeSettingsTab === 'settings' && (
                    <div className="space-y-4 text-left animate-fade-in">
                      
                      {/* Language Preference Setting */}
                      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/30 border-orange-100'
                      }`}>
                        <label className={`block text-[11px] font-display font-bold uppercase mb-2 ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                          🌐 {TRANSLATIONS[language].languageLabel}
                        </label>
                        <div className={`flex p-1 rounded-xl border select-none shadow-sm transition-colors duration-300 ${
                          theme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-orange-100'
                        }`}>
                          <button
                            onClick={() => { setLanguage('en'); playAppChime('pop'); }}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              language === 'en'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : (theme === 'night' ? 'text-slate-300 hover:bg-slate-800' : 'text-amber-955 hover:bg-orange-50')
                            }`}
                          >
                            🇬🇧 English
                          </button>
                          <button
                            onClick={() => { setLanguage('sw'); playAppChime('pop'); }}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              language === 'sw'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : (theme === 'night' ? 'text-slate-300 hover:bg-slate-800' : 'text-amber-955 hover:bg-orange-50')
                            }`}
                          >
                            🇰🇪 Kiswahili
                          </button>
                        </div>
                      </div>

                      {/* Theme Setting (Day / Night Mode Toggle) */}
                      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/30 border-orange-100'
                      }`}>
                        <label className={`block text-[11px] font-display font-bold uppercase mb-2 ${
                          theme === 'night' ? 'text-slate-300' : 'text-orange-850'
                        }`}>
                          🌓 {TRANSLATIONS[language].themeSettings}
                        </label>
                        <div className={`flex p-1 rounded-xl border select-none shadow-sm transition-colors duration-300 ${
                          theme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-orange-100'
                        }`}>
                          <button
                            onClick={() => { setTheme('day'); playAppChime('pop'); }}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              theme === 'day'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : (theme === 'night' ? 'text-slate-300 hover:bg-slate-800' : 'text-amber-955 hover:bg-orange-50')
                            }`}
                          >
                            {TRANSLATIONS[language].dayMode}
                          </button>
                          <button
                            onClick={() => { setTheme('night'); playAppChime('sparkle'); }}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                              theme === 'night'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-amber-955 hover:bg-orange-50'
                            }`}
                          >
                            {TRANSLATIONS[language].nightMode}
                          </button>
                        </div>
                      </div>

                      {/* App Guided Tour Setting / Action */}
                      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/30 border-orange-100'
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="pr-2">
                            <label className={`block text-[11px] font-display font-bold uppercase mb-0.5 ${
                              theme === 'night' ? 'text-slate-300' : 'text-orange-850'
                            }`}>
                              💡 {language === 'en' ? 'App Guided Tour' : 'Mwongozo wa App'}
                            </label>
                            <p className={`text-[10px] leading-relaxed ${
                              theme === 'night' ? 'text-slate-400' : 'text-amber-900'
                            }`}>
                              {language === 'en'
                                ? 'Launch the interactive step-by-step tutorial tour of the library, reader controls, and 3D artwork tools.'
                                : 'Fungua mwongozo wa hatua kwa hatua wa maktaba, vidhibiti vya msomaji, na zana za sanaa za 3D.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettings(false);
                              setTutorialStep(0);
                              setTutorialAudience(userAccount.role === 'artist' ? 'artist' : 'reader');
                              setShowTutorial(true);
                              playChime('pop');
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-display font-bold text-xs rounded-xl shadow-xs border-b-2 border-amber-700 active:translate-y-0.5 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                            id="settings-start-guided-tour-btn"
                          >
                            <span>💡</span>
                            <span>{language === 'en' ? 'Start Tour' : 'Anza Mwongozo'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Sound Preference Toggle */}
                      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/30 border-orange-100'
                      }`}>
                        <div className="pr-3">
                          <label className={`block text-[11px] font-display font-bold uppercase ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                            🔊 {TRANSLATIONS[language].soundSettings}
                          </label>
                          <p className={`text-[10px] mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-amber-900'}`}>
                            {language === 'en' ? 'Manage play sounds and custom effects' : 'Dhibiti sauti za kucheza na athari maalum'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSound = !isSoundEnabled;
                            setIsSoundEnabled(nextSound);
                            if (nextSound) {
                              playChime('sparkle');
                            }
                          }}
                          aria-checked={isSoundEnabled}
                          role="switch"
                          className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out outline-none select-none ${
                            isSoundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          id="settings-sound-toggle-btn"
                        >
                          <span
                            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                              isSoundEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Creator Studio Workbench Access (Only for logged-in Artists) */}
                      {userAccount.role === 'artist' && userAccount.isLoggedIn && (
                        <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                          theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-orange-50/30 border-orange-100'
                        }`}>
                          <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${theme === 'night' ? 'text-slate-300' : 'text-orange-850'}`}>
                            🛠️ {TRANSLATIONS[language].creativeWorkshopSetup}
                          </label>
                          <p className={`text-[10px] mb-3 leading-relaxed ${theme === 'night' ? 'text-slate-400' : 'text-orange-900'}`}>
                            {TRANSLATIONS[language].creativeWorkshopDesc}
                          </p>
                          <button
                            onClick={() => {
                              setShowSettings(false);
                              setAppMode('workbench');
                              playAppChime('sparkle');
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-display font-bold text-xs rounded-xl shadow border-b-2 border-amber-700 active:translate-y-0.5 active:border-b-0 hover:brightness-105 transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            🎨 {TRANSLATIONS[language].openArtistWorkbench}
                          </button>
                        </div>
                      )}

                      {/* Notifications Preferences */}
                      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/50 border-orange-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Bell className="w-4 h-4 text-amber-500" />
                          <label className={`block text-[11px] font-display font-bold uppercase ${
                            theme === 'night' ? 'text-slate-300' : 'text-orange-850'
                          }`}>
                            {language === 'en' ? 'Notifications' : 'Arifa'}
                          </label>
                        </div>
                        
                        {/* Toggle 1: New Book Releases */}
                        <div className="flex items-center justify-between py-2 border-b border-orange-100/50 dark:border-slate-850">
                          <div className="pr-2">
                            <span className={`text-xs font-display font-bold block ${
                              theme === 'night' ? 'text-slate-200' : 'text-gray-800'
                            }`}>
                              ✨ {language === 'en' ? 'New Book Releases' : 'Vitabu Vipya Vilivyochapishwa'}
                            </span>
                            <span className={`text-[10px] ${
                              theme === 'night' ? 'text-slate-400' : 'text-gray-600'
                            }`}>
                              {language === 'en'
                                ? 'Alerts when artists publish new interactive picture books'
                                : 'Arifa wasanii wanapochapisha vitabu vipya vya picha'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !notifyNewReleases;
                              setNotifyNewReleases(next);
                              playAppChime('pop');
                            }}
                            aria-checked={notifyNewReleases}
                            role="switch"
                            className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out outline-none select-none ${
                              notifyNewReleases ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            id="toggle-notify-new-releases-btn"
                          >
                            <span
                              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                                notifyNewReleases ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Toggle 2: Artist Application Updates */}
                        <div className="flex items-center justify-between py-2 pt-3">
                          <div className="pr-2">
                            <span className={`text-xs font-display font-bold block ${
                              theme === 'night' ? 'text-slate-200' : 'text-gray-800'
                            }`}>
                              🎨 {language === 'en' ? 'Artist Application Updates' : 'Taarifa za Maombi ya Wasanii'}
                            </span>
                            <span className={`text-[10px] ${
                              theme === 'night' ? 'text-slate-400' : 'text-gray-600'
                            }`}>
                              {language === 'en'
                                ? 'Updates on creator studio status and approvals'
                                : 'Taarifa kuhusu hali ya maombi ya wasanii na studio'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !notifyArtistUpdates;
                              setNotifyArtistUpdates(next);
                              playAppChime('pop');
                            }}
                            aria-checked={notifyArtistUpdates}
                            role="switch"
                            className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out outline-none select-none ${
                              notifyArtistUpdates ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            id="toggle-notify-artist-updates-btn"
                          >
                            <span
                              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                                notifyArtistUpdates ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Legal & Compliance Section */}
                      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/50 border-orange-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">📜</span>
                          <label className={`block text-[11px] font-display font-bold uppercase ${
                            theme === 'night' ? 'text-slate-300' : 'text-orange-850'
                          }`}>
                            {language === 'en' ? 'Legal & Compliance' : 'Sheria & Usalama'}
                          </label>
                        </div>
                        <p className={`text-[10px] mb-3 leading-relaxed ${
                          theme === 'night' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {language === 'en'
                            ? 'Review our Terms of Service, community standards, and user privacy rights.'
                            : 'Kagua vigezo vya huduma, miongozo ya jamii, na haki zako za faragha.'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLegalModalTab('terms');
                              setShowLegalModal(true);
                              playAppChime('pop');
                            }}
                            className="py-2 px-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-left font-display font-bold text-[11px] text-amber-900 dark:text-amber-300 hover:bg-amber-100/50 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>📄</span>
                            <span>{language === 'en' ? 'Terms of Service' : 'Vigezo vya Huduma'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLegalModalTab('rights');
                              setShowLegalModal(true);
                              playAppChime('pop');
                            }}
                            className="py-2 px-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-left font-display font-bold text-[11px] text-amber-900 dark:text-amber-300 hover:bg-amber-100/50 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>🛡️</span>
                            <span>{language === 'en' ? 'Data Rights' : 'Haki za Data'}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ==================== TAB 4: REPORTS / CONTACT / MODERATION ==================== */}
                  {activeSettingsTab === 'reports' && (
                    <div className="space-y-4 animate-fade-in text-left">
                      
                      {/* Section A: Contact Support Header */}
                      <div className={`p-4 rounded-2xl border ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-orange-50/50 border-orange-100'
                      }`}>
                        <h3 className={`font-display font-bold text-xs uppercase flex items-center gap-1.5 ${
                          theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                        }`}>
                          <span>📧</span> {language === 'en' ? 'Contact Support & Safety Desk' : 'Wasiliana na Dawati la Usalama'}
                        </h3>
                        <p className={`text-[10px] mt-1 leading-relaxed ${
                          theme === 'night' ? 'text-slate-400' : 'text-amber-900'
                        }`}>
                          {language === 'en'
                            ? "Have questions, feedback, or content safety concerns? Reports submitted by parents are consolidated here for automated and manual moderation review."
                            : "Una maswali, maoni au wasiwasi wa usalama wa maudhui? Ripoti zote zilizowasilishwa na wazazi zimekusanywa hapa."}
                        </p>
                      </div>

                      {/* Section B: Consolidated Reports List */}
                      <div>
                        <h4 className={`font-display font-bold text-xs mb-2 flex items-center justify-between ${
                          theme === 'night' ? 'text-slate-300' : 'text-amber-950'
                        }`}>
                          <span>🚩 {language === 'en' ? 'Consolidated Reports & Automated Moderation' : 'Ripoti Zilizokusanywa Na Udhibiti'}</span>
                          <span className="text-[10px] bg-orange-100 text-orange-850 px-2 py-0.5 rounded-full font-bold">
                            {reportsList.length} {reportsList.length === 1 ? 'Report' : 'Reports'}
                          </span>
                        </h4>

                        {reportsList.length === 0 ? (
                          <div className={`p-6 rounded-2xl border border-dashed text-center ${
                            theme === 'night' ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-amber-50/30 border-orange-200 text-amber-900'
                          }`}>
                            <span className="text-2xl block mb-1">✅</span>
                            <p className="text-xs font-display font-medium">
                              {language === 'en' ? "No pending reports or flagged content! Public library is clean." : "Hakuna ripoti zozote au maudhui yaliyozuiwa!"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {reportsList.map((report) => {
                              const relatedBook = booksList.find(b => b.id === report.bookId);
                              return (
                                <div
                                  key={report.id}
                                  className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition ${
                                    theme === 'night' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-orange-200 text-gray-800'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
                                    <div>
                                      <strong className="font-display font-bold text-amber-955 block text-xs">
                                        📖 Book: "{report.bookTitle}"
                                      </strong>
                                      <span className="text-[10px] text-gray-500 block">
                                        Author/Contributors: {report.bookAuthor}
                                      </span>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      relatedBook?.status === 'flagged'
                                        ? 'bg-red-100 text-red-800 border border-red-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}>
                                      {relatedBook?.status === 'flagged' ? '🚩 Flagged & Hidden' : '⏳ Pending'}
                                    </span>
                                  </div>

                                  <div className="text-[11px] space-y-1">
                                    <p>
                                      <strong>Reporter:</strong> {report.reporterName} ({report.reporterRole}) — <em>{report.reporterEmail}</em>
                                    </p>
                                    <p>
                                      <strong>Reason:</strong> <span className="text-red-600 font-semibold">{report.reason}</span>
                                    </p>
                                    {report.details && (
                                      <p className="bg-gray-50 p-2 rounded-xl border border-gray-200 text-[10px] text-gray-700 italic">
                                        "{report.details}"
                                      </p>
                                    )}
                                    {report.autoScanFlagged && report.autoScanReason && (
                                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-medium">
                                        🚨 <strong>Automated Moderation Scan:</strong> {report.autoScanReason}
                                      </div>
                                    )}
                                  </div>

                                  {/* Administrative Moderation Action Buttons */}
                                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Restore book to published shelf
                                        setBooksList((prev) => {
                                          const updated = prev.map((b) => b.id === report.bookId ? { ...b, status: 'published' as const } : b);
                                          const customOnly = updated.filter(b => b.isCustom);
                                          safeSetItem('digipicture_custom_books', customOnly);
                                          return updated;
                                        });
                                        // Remove report
                                        setReportsList(prev => prev.filter(r => r.id !== report.id));
                                        playAppChime('sparkle');
                                        setDbNotification({
                                          type: 'success',
                                          message: `Cleared flag and restored "${report.bookTitle}" to the public library shelf! 🟢`
                                        });
                                        setTimeout(() => setDbNotification(null), 4000);
                                      }}
                                      className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-display font-bold text-[10px] rounded-xl border border-emerald-300 transition cursor-pointer"
                                    >
                                      🟢 Restore Book to Library
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to permanently delete "${report.bookTitle}"?`)) {
                                          handleDeleteBook(report.bookId);
                                          setReportsList(prev => prev.filter(r => r.id !== report.id));
                                        }
                                      }}
                                      className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-800 font-display font-bold text-[10px] rounded-xl border border-red-300 transition cursor-pointer"
                                    >
                                      🔴 Permanently Delete Book
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReportsList(prev => prev.filter(r => r.id !== report.id));
                                        playAppChime('pop');
                                      }}
                                      className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-display font-bold text-[10px] rounded-xl border border-gray-300 transition cursor-pointer ml-auto"
                                    >
                                      🗑️ Dismiss Log
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                  {activeSettingsTab === 'bookmarks' && (
                    <div className="space-y-3 animate-fade-in text-left">
                      
                      {history.length === 0 ? (
                        <div className={`text-center py-8 px-4 rounded-2xl border border-dashed transition-colors duration-300 ${
                          theme === 'night' ? 'bg-slate-950/50 border-slate-800 text-slate-400' : 'bg-amber-50/30 border-orange-200 text-amber-900'
                        }`}>
                          <span className="text-3xl mb-2.5 block">🔖</span>
                          <p className="text-xs leading-relaxed font-display font-medium">
                            {language === 'en'
                              ? 'No reading history found. Start reading books to track your history here!'
                              : 'Hakuna historia ya usomaji iliyopatikana. Anza kusoma vitabu kufuatilia historia yako hapa!'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {history.map((item) => {
                            const { bookId, pageIdx, book } = item;
                            const pageTitle = book.pages[pageIdx]?.title || `Page ${pageIdx + 1}`;

                            return (
                              <div
                                key={bookId}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors duration-300 ${
                                  theme === 'night' ? 'bg-slate-950 border-slate-805 hover:bg-slate-850' : 'bg-amber-50/40 border-orange-150 hover:bg-amber-50/80'
                                }`}
                              >
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className={`w-10 h-12 object-cover rounded-lg border flex-shrink-0 transition-colors duration-300 ${
                                    theme === 'night' ? 'border-slate-800' : 'border-orange-200'
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 overflow-hidden">
                                  <h4 className={`font-display font-bold text-[11px] truncate ${
                                    theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                                  }`}>
                                    {book.title.toUpperCase()}
                                  </h4>
                                  <p className={`text-[10px] font-medium truncate mt-0.5 ${
                                    theme === 'night' ? 'text-amber-400' : 'text-orange-700'
                                  }`}>
                                    📍 {language === 'en' ? `Page ${pageIdx + 1}: ${pageTitle}` : `Ukurasa ${pageIdx + 1}: ${pageTitle}`}
                                  </p>
                                  <div className="flex gap-1.5 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowSettings(false);
                                        handleResumeBook(bookId, pageIdx);
                                      }}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-[9px] rounded-lg shadow-xs transition cursor-pointer border-none"
                                    >
                                      📖 {language === 'en' ? 'Resume' : 'Endelea'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBookmarks((prev) => {
                                          const updated = { ...prev };
                                          delete updated[bookId];
                                          return updated;
                                        });
                                        playAppChime('pop');
                                      }}
                                      className={`px-2 py-1 font-display font-bold text-[9px] rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                                        theme === 'night'
                                          ? 'bg-red-950/40 hover:bg-red-950/80 text-red-400 border-red-900'
                                          : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300'
                                      }`}
                                    >
                                      🗑️ {language === 'en' ? 'Remove' : 'Ondoa'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  )}

                  {/* ==================== TAB 5: DIRECT MESSAGES (ARTISTS ONLY) ==================== */}
                  {activeSettingsTab === 'messages' && (userAccount?.role === 'artist' || (userProfile as any)?.role === 'artist') && (
                    <div className="space-y-3 animate-fade-in text-left">
                      <h4 className={`font-display font-bold text-xs mb-2 flex items-center justify-between ${
                        theme === 'night' ? 'text-slate-300' : 'text-amber-950'
                      }`}>
                        <span>💬 {language === 'en' ? 'Direct Messages from Readers & Parents' : 'Ujumbe wa Moja kwa Moja kutoka kwa Wasomaji'}</span>
                        <span className="text-[10px] bg-orange-100 text-orange-850 px-2 py-0.5 rounded-full font-bold">
                          {directMessages.length} Messages
                        </span>
                      </h4>

                      {directMessages.length === 0 ? (
                        <div className={`p-8 rounded-2xl border border-dashed text-center ${
                          theme === 'night' ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-amber-50/30 border-orange-200 text-amber-900'
                        }`}>
                          <span className="text-3xl block mb-1.5">💌</span>
                          <p className="text-xs font-display font-medium">
                            {language === 'en' ? "No direct messages yet! Messages sent by readers to artists will appear here." : "Bado hakuna ujumbe wa moja kwa moja!"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {directMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition ${
                                theme === 'night' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-orange-200 text-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                <div>
                                  <strong className="font-display font-bold text-amber-955 text-xs">
                                    👤 {msg.senderName} ({msg.senderRole || 'Reader'})
                                  </strong>
                                  {msg.senderEmail && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono block">
                                      ✉️ {msg.senderEmail}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-400 block">
                                    To Artist: {msg.artistName} {msg.bookTitle ? `• Re: "${msg.bookTitle}"` : ''}
                                  </span>
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">
                                  {new Date(msg.createdAt || msg.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[11px] bg-orange-50/50 p-2 rounded-xl border border-orange-100 text-amber-955 leading-relaxed font-medium">
                                "{msg.message}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className={`p-4 border-t flex items-center justify-between select-none transition-colors duration-300 ${
                  theme === 'night' ? 'bg-slate-950 border-slate-805' : 'bg-amber-50 border-orange-100'
                }`}>
                  <p className="text-[10px] text-gray-400 font-sans">
                    ©2026 PictureBook Applet Container
                  </p>
                  <button
                    onClick={() => { setShowSettings(false); playAppChime('bubble'); }}
                    className={`px-4 py-1.5 border rounded-xl text-xs font-display font-bold cursor-pointer active:scale-95 transition ${
                      theme === 'night'
                        ? 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-750'
                        : 'bg-gray-150 hover:bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                    id="settings-close-footer"
                  >
                    {language === 'en' ? 'Close' : 'Funga'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ==================== SCREEN 1: THE BOOKSHELF ==================== */}
          {appMode === 'shelf' && (
            <main className="flex-1 max-w-5xl mx-auto w-full max-w-full px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-5 sm:gap-6 box-border overflow-x-hidden">

              {/* Children friendly filter & search block */}
              <div className={`p-3.5 sm:p-4 w-full max-w-full rounded-3xl border-3 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between transition-colors duration-300 box-border ${
                theme === 'night' ? 'bg-slate-900 border-slate-950 text-slate-100' : 'bg-white border-orange-100'
              }`}>
                
                {/* Search Bar matching image #1 */}
                <div className="relative w-full max-w-full md:max-w-sm box-border">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShelfPage(1); }}
                    placeholder={TRANSLATIONS[language].searchPlaceholder}
                    className={`w-full max-w-full pl-11 pr-4 py-2.5 focus:border-brand-orange-dark focus:outline-none rounded-full text-xs font-sans placeholder-gray-400 font-medium border transition-colors duration-300 box-border ${
                      theme === 'night' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    id="shelf-search-input"
                  />
                </div>

                {/* Kids Filter Buttons & Surprise Me Action */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-display select-none w-full max-w-full box-border">
                  <span className={`font-bold mr-1 text-[11px] uppercase ${theme === 'night' ? 'text-slate-300' : 'text-amber-955'}`}>
                    {TRANSLATIONS[language].artMediaLabel}
                  </span>
                  {[
                    { id: 'all', name: TRANSLATIONS[language].filterAll, color: theme === 'night' ? 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-850' : 'bg-orange-100 text-orange-950 hover:bg-orange-200/50' },
                    { id: 'sculpture', name: TRANSLATIONS[language].filterSculpture, color: theme === 'night' ? 'bg-slate-950 text-amber-300 border border-amber-950 hover:bg-amber-950/30' : 'bg-amber-100 text-amber-955 hover:bg-amber-250/50' },
                    { id: 'painting', name: TRANSLATIONS[language].filterPainting, color: theme === 'night' ? 'bg-slate-950 text-emerald-300 border border-emerald-950 hover:bg-emerald-950/30' : 'bg-emerald-100 text-emerald-955 hover:bg-emerald-250/50' },
                    { id: 'craft', name: TRANSLATIONS[language].filterCraft, color: theme === 'night' ? 'bg-slate-950 text-blue-300 border border-blue-950 hover:bg-blue-950/30' : 'bg-blue-100 text-blue-955 hover:bg-blue-250/50' },
                    { id: 'animation', name: TRANSLATIONS[language].filterAnimation, color: theme === 'night' ? 'bg-slate-950 text-indigo-300 border border-indigo-950 hover:bg-indigo-950/30' : 'bg-indigo-100 text-indigo-955 hover:bg-indigo-250/50' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      id={`filter-tab-${filter.id}`}
                      onClick={() => { setSelectedFilter(filter.id); setShelfPage(1); playChime('pop'); }}
                      className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer active:scale-95 ${
                        selectedFilter === filter.id
                          ? 'bg-amber-700 text-white shadow-sm ring-2 ring-orange-200'
                          : `${filter.color}`
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}

                  <button
                    onClick={handleSurpriseMe}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-display font-bold text-xs rounded-full shadow-md transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer ml-1"
                    id="surprise-me-button"
                    title="Pick a random story book for me!"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Surprise Me!' : 'Nipatie Hadithi!'}</span>
                  </button>
                </div>

              </div>

              {/* Shelf Library Grid */}
              <div className="flex-1 w-full max-w-full bg-amber-50/20 p-3 sm:p-4 border-2 border-dashed border-orange-200/50 rounded-3xl relative box-border overflow-x-hidden">
                
                {/* Dashboard Shelf Sorting & Count Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3.5 pb-3 border-b border-orange-200/80 select-none w-full max-w-full box-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-display font-bold text-amber-955 flex items-center gap-1.5">
                      <span>📚</span>
                      <span>
                        {language === 'en'
                          ? `Showing ${filteredBooks.length} Picture Books`
                          : `Inaonyesha Vitabu ${filteredBooks.length}`}
                      </span>
                    </span>
                    {shelfSortBy === 'recent' && (
                      <span className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-orange-300 shadow-2xs flex items-center gap-1 animate-fadeIn">
                        <span>⚡</span>
                        <span>{language === 'en' ? 'Sorted by: Recently Added / Updated' : 'Imepangwa: Vilivyoongezwa Karibuni'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-display flex-nowrap shrink-0 max-w-full overflow-x-auto pb-0.5">
                    <span className="text-[11px] font-bold text-amber-900 shrink-0 whitespace-nowrap">
                      {language === 'en' ? 'Sort by:' : 'Panga kwa:'}
                    </span>
                    <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-amber-200/80 shadow-2xs flex-nowrap shrink-0">
                      <button
                        type="button"
                        onClick={() => { setShelfSortBy('recent'); setShelfPage(1); playChime('pop'); }}
                        className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                          shelfSortBy === 'recent'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-amber-900 hover:bg-amber-100/70'
                        }`}
                        title="Sort by most recently added or updated"
                      >
                        <span>🕒</span>
                        <span>{language === 'en' ? 'Recently Updated' : 'Iliyosasishwa'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShelfSortBy('title'); setShelfPage(1); playChime('pop'); }}
                        className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                          shelfSortBy === 'title'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-amber-900 hover:bg-amber-100/70'
                        }`}
                        title="Sort alphabetically by title"
                      >
                        <span>🔤</span>
                        <span>{language === 'en' ? 'Title A-Z' : 'Jina A-Z'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShelfSortBy('rating'); setShelfPage(1); playChime('pop'); }}
                        className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                          shelfSortBy === 'rating'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-amber-900 hover:bg-amber-100/70'
                        }`}
                        title="Sort by highest review rating"
                      >
                        <span>⭐</span>
                        <span>{language === 'en' ? 'Highest Rated' : 'Nyota za Juu'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {filteredBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 select-none w-full max-w-full">
                    <span className="text-5xl mb-3 animate-pulse">📚</span>
                    <h3 className="font-display font-medium text-amber-955 text-base">{TRANSLATIONS[language].noBooksFound}</h3>
                    <p className="text-xs text-amber-900 mt-1 max-w-xs">
                      {language === 'en'
                        ? "Try searching another tag or open the Artist Workbench to publish a custom picture book."
                        : "Jaribu kutafuta lebo nyingine au ufungue Studio ya Msanii ili kuchapisha kitabu chako cha picha."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-full box-border" id="books-grid-shelf">
                    {paginatedBooks.map((book) => {
                      const readingTime = calculateReadingTimeMinutes(book);
                      const ratingInfo = getBookRatingInfo(book);
                      const savedProgress = readingProgress[book.id];

                      return (
                        <div
                          key={book.id}
                          id={`book-card-${book.id}`}
                          onClick={() => handleSelectBook(book.id)}
                          className={`group relative w-full max-w-full box-border rounded-2xl sm:rounded-3xl border-3 sm:border-4 transition transform hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden text-center flex flex-col justify-between ${getBorderColorClass(
                            book.accentColor
                          )}`}
                        >
                          {/* Cover Image inside card with Badges */}
                          <div className={`aspect-square w-full overflow-hidden border-b-3 sm:border-b-4 border-dashed transition-colors duration-300 relative flex items-center justify-center p-1 ${
                            theme === 'night' ? 'bg-slate-950 border-slate-805' : 'bg-amber-50/50 border-dashed-orange-200'
                          }`}>
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-contain group-hover:scale-104 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Recently Updated / Created Timestamp Badge */}
                            {(book.updatedAt || book.createdAt) && (
                              <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-black/75 backdrop-blur-xs text-amber-200 font-display font-bold text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1 select-none z-10" title={`Updated: ${book.updatedAt || book.createdAt}`}>
                                <span>🕒</span>
                                <span className="truncate max-w-[65px] sm:max-w-none">{getRelativeTimeString(book.updatedAt || book.createdAt, language)}</span>
                              </div>
                            )}

                            {/* Estimated Reading Time Badge */}
                            <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-black/70 backdrop-blur-xs text-amber-300 font-display font-bold text-[8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1 select-none">
                              <span>⏱️</span>
                              <span>{readingTime}m</span>
                            </div>

                            {/* Reviews & Ratings Badge */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReviewsModal(book);
                              }}
                              className="absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-[8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-600 shadow-sm flex items-center gap-1 select-none transition cursor-pointer"
                              title="View ratings and reviews"
                            >
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current text-yellow-200" />
                              <span>{ratingInfo.average} ({ratingInfo.count})</span>
                            </button>
                          </div>

                          {/* Card metadata label footer inside */}
                          <div className={`p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between gap-1.5 sm:gap-2 select-none transition-colors duration-300 ${
                            theme === 'night' ? 'bg-slate-900' : 'bg-white'
                          }`}>
                            <div>
                              <h3 className={`font-display font-medium text-xs sm:text-sm text-balance line-clamp-1 transition-colors ${
                                theme === 'night' ? 'text-slate-100' : 'text-amber-955 group-hover:text-amber-900'
                              }`}>
                                {book.title.toUpperCase()}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenArtistProfileModal(book.author);
                                }}
                                className={`text-[10px] font-sans mt-0.5 font-bold truncate hover:underline cursor-pointer flex items-center gap-1 ${
                                  theme === 'night' ? 'text-amber-400 hover:text-amber-300' : 'text-amber-800 hover:text-orange-600'
                                }`}
                                title="Click to view artist bio & contact info"
                              >
                                <span>👤</span> {TRANSLATIONS[language].byAuthor.replace('{author}', book.author)}
                              </button>
                            </div>

                            {/* Interactive tags labels */}
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {book.artForms.map((af) => (
                                <span
                                  key={af}
                                  className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full tracking-wide scale-90 transition-colors ${
                                    theme === 'night' ? 'bg-slate-950 text-slate-300 border border-slate-805' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {af}
                                </span>
                              ))}
                              {book.isCustom && (
                                <span className="text-[8px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full scale-90">
                                  {TRANSLATIONS[language].customTag}
                                </span>
                              )}
                            </div>

                            {/* Resume Reading Progress / Bookmark Banner */}
                            {(savedProgress !== undefined && savedProgress > 0) || bookmarks[book.id] !== undefined ? (
                              <div className="pt-1.5 border-t border-dashed border-orange-100 flex items-center justify-center gap-1.5 w-full">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const pageToResume = bookmarks[book.id] !== undefined ? bookmarks[book.id] : savedProgress;
                                    handleResumeBook(book.id, pageToResume || 0);
                                  }}
                                  className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 border-b-2 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer shadow-xs transition duration-150"
                                  title={language === 'en' ? "Resume reading where you stopped" : "Endelea kusoma ulipoachia"}
                                >
                                  <Bookmark className="w-3.5 h-3.5 fill-current text-white" />
                                  {language === 'en' 
                                    ? `Resume Page ${(bookmarks[book.id] !== undefined ? bookmarks[book.id] : savedProgress) + 1}` 
                                    : `Endelea Ukurasa ${(bookmarks[book.id] !== undefined ? bookmarks[book.id] : savedProgress) + 1}`}
                                </button>
                              </div>
                            ) : null}

                            {/* Card Quick Social & Community Action Bar */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5 text-[10px] font-display">
                              {!(userAccount.role === 'artist' && userAccount.isLoggedIn) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDirectMessageModal(book.author, book.title);
                                  }}
                                  className="flex-1 py-1 px-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-amber-900 border border-orange-200 font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                                  title="Send direct message to artist"
                                >
                                  <MessageSquare className="w-3 h-3 text-orange-500" />
                                  <span>Message</span>
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenShareModal('book', book);
                                }}
                                className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                                title="Share book to social media"
                              >
                                <Share2 className="w-3 h-3 text-indigo-500" />
                                <span>Share</span>
                              </button>
                            </div>
                          </div>

                          {/* Dynamic absolute color bottom tag bar inside card mockup */}
                          <div
                            className={`h-2.5 w-full ${
                              book.accentColor === 'green'
                                ? 'bg-emerald-500'
                                : book.accentColor === 'blue'
                                ? 'bg-cyan-500'
                                : book.accentColor === 'purple'
                                ? 'bg-purple-500'
                                : 'bg-orange-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Shelf Paginations matched to image #1 circles */}
              {totalShelfPages > 1 && (
                <div className="flex items-center justify-center gap-2 select-none">
                  <button
                    onClick={goPrevShelfPage}
                    disabled={shelfPage === 1}
                    className="p-1.5 rounded-full bg-white border border-orange-200 text-brand-orange disabled:opacity-40 disabled:hover:bg-white hover:bg-orange-100 cursor-pointer transition shadow-sm"
                    id="prev-shelf-page-button"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[3px]" />
                  </button>

                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: totalShelfPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => { setShelfPage(pageNum); playChime('pop'); }}
                          className={`w-8 h-8 rounded-full font-display text-xs font-bold transition flex items-center justify-center border ${
                            shelfPage === pageNum
                              ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                              : 'bg-white text-orange-850 hover:bg-orange-100/50 border-orange-200'
                          }`}
                          id={`shelf-page-dot-${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={goNextShelfPage}
                    disabled={shelfPage === totalShelfPages}
                    className="p-1.5 rounded-full bg-white border border-orange-200 text-brand-orange disabled:opacity-40 disabled:hover:bg-white hover:bg-orange-100 cursor-pointer transition shadow-sm"
                    id="next-shelf-page-button"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[3px]" />
                  </button>
                </div>
              )}

            </main>
          )}

          {/* ==================== SCREEN 2: ACTIVE READING MODE ==================== */}
          {appMode === 'reading' && activeBook && activePage && (
            <main className="flex-1 max-w-6xl mx-auto w-full max-w-full px-3 sm:px-4 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5 justify-between box-border overflow-x-hidden">
              
              {/* Back button and page specs banner */}
              <div className="flex flex-wrap items-center justify-between text-xs font-display">
                <button
                  onClick={handleHome}
                  className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1 inline-flex ${
                    theme === 'night'
                      ? 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
                      : 'bg-white border-orange-200 text-brand-orange hover:bg-orange-100/40'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5px]" /> {TRANSLATIONS[language].backToLibrary}
                </button>

                <div className={`border rounded-full px-3.5 py-1 capitalize font-semibold tracking-wide ${
                  theme === 'night'
                    ? 'bg-slate-800 border-slate-700 text-amber-200'
                    : 'bg-amber-100 border-amber-200 text-amber-955'
                }`}>
                  🎨 {TRANSLATIONS[language].artMediumInsight}: <strong className="underline underline-offset-2 ml-0.5">
                    {activePage.artForm === 'painting' ? TRANSLATIONS[language].filterPainting.replace(/🎨\s*/, '')
                     : activePage.artForm === 'sculpture' ? TRANSLATIONS[language].filterSculpture.replace(/🏺\s*/, '')
                     : activePage.artForm === 'craft' ? TRANSLATIONS[language].filterCraft.replace(/✂️\s*/, '')
                     : activePage.artForm === 'animation' ? TRANSLATIONS[language].filterAnimation.replace(/🎭\s*/, '')
                     : (language === 'en' ? "CAMERA PICTURE" : "PICHA YA KAMERA")}
                  </strong>
                </div>
              </div>

              {/* Visual Reading Progress Indicator at Top of Reading Mode */}
              {(() => {
                const totalPages = activeBook.pages.length;
                const currentPageNum = activePageIndex + 1;
                const progressPercentage = Math.round((currentPageNum / totalPages) * 100);
                const isFinished = currentPageNum === totalPages;

                return (
                  <div className={`rounded-2xl p-3.5 sm:p-4 border-2 shadow-sm flex flex-col gap-2.5 select-none transition-colors duration-300 ${
                    theme === 'night'
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white/95 border-orange-200 text-gray-900'
                  }`}>
                    {/* Top Row: Labels and Stats */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-display">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shadow-2xs ${
                          theme === 'night'
                            ? 'bg-slate-800 border-slate-700 text-amber-300'
                            : (isFinished ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-orange-100 border-orange-200 text-orange-700')
                        }`}>
                          {isFinished ? <Sparkles className="w-4 h-4 text-amber-400" /> : <BookOpen className="w-4 h-4 text-orange-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-xs sm:text-sm ${
                              theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                            }`}>
                              {language === 'en' ? 'Reading Progress' : 'Maendeleo ya Usomaji'}
                            </span>
                            {isFinished && (
                              <span className="text-[10px] font-extrabold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs border border-amber-500 animate-bounce">
                                🎉 {language === 'en' ? 'Book Completed!' : 'Imekamilika!'}
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] font-medium ${
                            theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                          }`}>
                            {language === 'en'
                              ? `Finished ${currentPageNum} of ${totalPages} Pages`
                              : `Umemaliza kurasa ${currentPageNum} kati ya ${totalPages}`}
                          </p>
                        </div>
                      </div>

                      {/* Right Badge: Percentage & Finished Pages Pill */}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full font-bold text-xs border shadow-2xs ${
                          theme === 'night'
                            ? (isFinished ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-amber-200 border-slate-700')
                            : (isFinished ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-orange-50 text-orange-850 border-orange-200')
                        }`}>
                          {progressPercentage}% {language === 'en' ? 'Read' : 'Imesomwa'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Track with Segment Markers */}
                    <div className="space-y-1.5">
                      <div className={`relative w-full h-3.5 sm:h-4 rounded-full border p-0.5 shadow-inner flex items-center overflow-hidden ${
                        theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-orange-100/90 border-orange-200'
                      }`}>
                        {/* Smooth Animated Fill Bar */}
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 transition-all duration-500 ease-out shadow-xs relative overflow-hidden"
                          style={{ width: `${progressPercentage}%` }}
                        >
                          {/* Shimmer Light Effect */}
                          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                        </div>
                      </div>

                      {/* Interactive Page Dot Ticks underneath Progress Bar */}
                      <div className="flex items-center justify-between px-0.5 pt-0.5">
                        {activeBook.pages.map((p, pIdx) => {
                          const pageNum = pIdx + 1;
                          const isPageRead = pIdx <= activePageIndex;
                          const isCurrentPage = pIdx === activePageIndex;

                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => {
                                setActivePageIndex(pIdx);
                                playChime('pop');
                                hushNow();
                                setIsAutoPlaying(false);
                              }}
                              className={`group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110 active:scale-95`}
                              title={`Jump to Page ${pageNum}: ${p.title}`}
                              id={`progress-page-tick-${pageNum}`}
                            >
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full font-mono text-[9px] sm:text-[10px] font-bold flex items-center justify-center border transition-all ${
                                isCurrentPage
                                  ? (theme === 'night' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-2 ring-amber-400/50 scale-110 font-black' : 'bg-orange-500 text-white border-amber-600 shadow-sm ring-2 ring-orange-300 scale-110')
                                  : isPageRead
                                  ? (theme === 'night' ? 'bg-amber-900/60 text-amber-200 border-amber-700' : 'bg-amber-400 text-amber-955 border-amber-500')
                                  : (theme === 'night' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-400 hover:text-amber-300' : 'bg-white text-gray-400 border-gray-250 hover:border-orange-300 hover:text-orange-600')
                              }`}>
                                {isPageRead && !isCurrentPage ? (
                                  <Check className="w-3 h-3 stroke-[3px]" />
                                ) : (
                                  pageNum
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Main reading dashboard split container matching image #2 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
                
                {/* 1. Left Column: Storybook Page Artwork (Span 7) */}
                <div className="lg:col-span-7 flex flex-col min-h-[380px] md:min-h-[460px]">
                  <div className={`flex-1 rounded-3xl p-5 border-4 shadow-md flex flex-col select-none overflow-hidden relative ${
                    theme === 'night'
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white border-orange-200 text-gray-900'
                  }`}>
                    {/* Corner Ornaments */}
                    <div className={`absolute top-3 left-3 text-xs ${theme === 'night' ? 'text-amber-400/30' : 'text-orange-300'}`}>✨</div>
                    <div className={`absolute top-3 right-3 text-xs ${theme === 'night' ? 'text-amber-400/30' : 'text-orange-300'}`}>✨</div>
                    <div className={`absolute bottom-3 left-3 text-xs ${theme === 'night' ? 'text-amber-400/30' : 'text-orange-300'}`}>✨</div>
                    <div className={`absolute bottom-3 right-3 text-xs ${theme === 'night' ? 'text-amber-400/30' : 'text-orange-300'}`}>✨</div>

                    {/* Stage Title Banner */}
                    <div className={`flex items-center justify-between border-b pb-3 mb-4 flex-shrink-0 ${
                      theme === 'night' ? 'border-slate-800' : 'border-orange-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🖼️</span>
                        <h3 className={`font-display font-bold text-sm tracking-tight ${
                          theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          {TRANSLATIONS[language].referenceView}
                        </h3>
                      </div>
                      <span className={`text-[9px] uppercase font-mono font-bold px-2.5 py-1 rounded-full border ${
                        theme === 'night'
                          ? 'bg-slate-800 text-amber-200 border-slate-700'
                          : 'bg-amber-100 text-amber-800 border-amber-200/50'
                      }`}>
                        {activePage.artForm === 'painting' ? TRANSLATIONS[language].filterPainting
                         : activePage.artForm === 'sculpture' ? TRANSLATIONS[language].filterSculpture
                         : activePage.artForm === 'craft' ? TRANSLATIONS[language].filterCraft
                         : activePage.artForm === 'animation' ? TRANSLATIONS[language].filterAnimation
                         : (language === 'en' ? "📷 Picture" : "📷 Picha")}
                      </span>
                    </div>

                    {/* Artwork Display Stage */}
                    <div className={`flex-1 rounded-2xl border-2 p-3 flex items-center justify-center relative overflow-hidden ${
                      theme === 'night'
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-amber-50/40 border-orange-100/70'
                    }`}>
                      <IllustrationReferenceViewer
                        key={`${activeBook.id}-page-${activePageIndex}`}
                        page={activePage}
                        book={activeBook}
                        theme={theme}
                        language={language}
                        currentPhotoFilter={currentPhotoFilter}
                        onUpdatePageIllustration={(newUrl) => {
                          const updatedPages = activeBook.pages.map((p, idx) => {
                            if (idx === activePageIndex) {
                              return {
                                ...p,
                                mediaUrl: newUrl,
                                imageUrl: newUrl,
                                localDataUrl: newUrl
                              };
                            }
                            return p;
                          });
                          const updatedBook = { ...activeBook, pages: updatedPages };
                          handleUpdateBook(updatedBook);
                          playAppChime('sparkle');
                        }}
                        onOpenWorkbench={() => {
                          setAppMode('workbench');
                          playAppChime('sparkle');
                        }}
                      />
                    </div>

                    {/* User-Private Digital Stamps & Badges Action Bar (In place of old interactive discoveries) */}
                    {(() => {
                      const { stampId, stampIcon, stampTitle } = getPageStampIdentity(activePage, activePageIndex, activeBook);
                      const isStamped = !!userStamps[stampId];
                      const stampedBookPagesCount = activeBook.pages.filter((_, idx) => !!userStamps[`${activeBook.id}_page_${idx}`]).length;

                      return (
                        <div className={`mt-3 p-3 border-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-display shadow-2xs select-none ${
                          theme === 'night'
                            ? 'bg-slate-950 border-slate-800 text-slate-200'
                            : 'bg-gradient-to-r from-amber-50 via-orange-50/90 to-amber-100/60 border-amber-300/90 text-amber-955'
                        }`}>
                          <div className={`flex items-center gap-2 flex-wrap ${
                            theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                          }`}>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-base">{stampIcon}</span>
                              <span className="font-extrabold">{stampTitle}</span>
                            </div>
                            <span className={`text-[11px] font-semibold ${
                              theme === 'night' ? 'text-slate-300' : 'text-amber-800'
                            }`}>
                              ({stampedBookPagesCount}/{activeBook.pages.length} {language === 'en' ? 'stamped' : 'mahuri'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => handleStampCurrentScene(activeBook, activePageIndex)}
                              id="stamp-scene-badge-button"
                              className={`px-3.5 py-1.5 rounded-xl font-display font-extrabold text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-xs active:scale-95 border ${
                                isStamped
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-200'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600 hover:shadow-md animate-pulse'
                              }`}
                              title={isStamped ? (language === 'en' ? 'Scene Stamped! Click to view Passport' : 'Imepigwa Muhuri! Bofya kuona Pasipoti') : (language === 'en' ? 'Stamp this scene to collect badge!' : 'Piga muhuri kukusanya beji!')}
                            >
                              {isStamped ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                  <span>{language === 'en' ? 'Scene Stamped! ⭐' : 'Imepigwa Muhuri! ⭐'}</span>
                                </>
                              ) : (
                                <>
                                  <Award className="w-3.5 h-3.5" />
                                  <span>{language === 'en' ? 'Stamp Scene & Collect Badge' : 'Piga Muhuri & Kusanya Beji'}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPassportActiveTab('stamps');
                                setShowBadgesPassportModal(true);
                                playAppChime('pop');
                              }}
                              className={`p-1.5 border rounded-xl transition cursor-pointer ${
                                theme === 'night'
                                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                              }`}
                              title={language === 'en' ? 'View My Private Badge Passport' : 'Tazama Pasipoti Yangu ya Beji'}
                              id="view-private-passport-mini-btn"
                            >
                              <span className="text-xs">🎖️</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Camera Filter Controls ONLY for Picture Art Form Page */}
                    {activePage.artForm === 'picture' && (
                      <div className={`mt-4 p-3 rounded-2xl border flex flex-col gap-2 ${
                        theme === 'night'
                          ? 'bg-slate-950 border-slate-800 text-slate-200'
                          : 'bg-orange-50/50 border-orange-150/60'
                      }`}>
                        <span className={`text-[11px] font-display font-bold flex items-center gap-1 ${
                          theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          📸 {TRANSLATIONS[language].lensFilterLabel}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'normal', name: language === 'en' ? '☀️ Golden Daylight' : '☀️ Mwangaza wa Dhahabu' },
                            { id: 'sunset', name: language === 'en' ? '🌅 Warm Sunset' : '🌅 Machweo ya Joto' },
                            { id: 'cyan', name: language === 'en' ? '❄️ Cool Winter' : '❄️ Baridi ya Winter' },
                            { id: 'mono', name: language === 'en' ? '📷 Charcoal Pencil' : '📷 Penseli ya Mkaa' }
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => { setCurrentPhotoFilter(f.id); playChime('pop'); }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-display font-medium border transition cursor-pointer active:scale-95 ${
                                currentPhotoFilter === f.id
                                  ? (theme === 'night' ? 'bg-amber-600 text-white font-bold shadow-xs border-amber-500' : 'bg-amber-700 text-white font-bold shadow-xs border-amber-800')
                                  : (theme === 'night' ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-amber-200' : 'bg-white border-orange-200 text-amber-900 hover:bg-orange-100/50')
                              }`}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soft caption with Artist Actions: Message, Share, and Review */}
                    <div className={`mt-4 p-3 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 select-none ${
                      theme === 'night'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-orange-100'
                    }`}>
                      <div className="text-left">
                        <button
                          type="button"
                          onClick={() => handleOpenArtistProfileModal(activeBook.author)}
                          className={`text-[11px] font-bold transition cursor-pointer flex items-center gap-1 group ${
                            theme === 'night' ? 'text-amber-200 hover:text-amber-300' : 'text-amber-955 hover:text-orange-600'
                          }`}
                          title="Click to view artist profile, bio & contact information"
                        >
                          <span>🎨 {language === 'en' ? "Educator / Artist: " : "Mwalimu / Msanii: "}</span>
                          <span className={`font-extrabold ${theme === 'night' ? 'group-hover:text-amber-300' : 'group-hover:text-orange-600'}`}>{activeBook.author}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
                            theme === 'night'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-orange-100 text-orange-800 border-orange-200'
                          }`}>ℹ️ Bio</span>
                        </button>
                        <p className={`text-[9px] mt-0.5 ${
                          theme === 'night' ? 'text-slate-300' : 'text-amber-850'
                        }`}>
                          {language === 'en' ? "Click author name or Profile to view bio, contact details, or message!" : "Bofya msanii kuona wasifu, mawasiliano, au kutuma ujumbe!"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenArtistProfileModal(activeBook.author)}
                          className={`px-2.5 py-1.5 font-display font-bold text-[10px] rounded-xl border shadow-xs transition flex items-center gap-1 cursor-pointer ${
                            theme === 'night'
                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                          }`}
                          title="View artist bio, email & contact phone number"
                        >
                          <span>👤</span>
                          <span>{language === 'en' ? "Artist Profile" : "Wasifu"}</span>
                        </button>

                        {!(userAccount.role === 'artist' && userAccount.isLoggedIn) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDirectMessageModal(activeBook.author, activeBook.title)}
                            className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-display font-bold text-[10px] rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                            id="reader-message-artist-btn"
                            title="Send direct message to artist"
                          >
                            <MessageSquare className="w-3 h-3 text-white" />
                            <span>{language === 'en' ? "Message" : "Ujumbe"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenShareModal('book', activeBook)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-display font-bold text-[10px] rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                          id="reader-share-book-btn"
                          title="Share book to social media"
                        >
                          <Share2 className="w-3 h-3 text-white" />
                          <span>{language === 'en' ? "Share" : "Shirikisha"}</span>
                        </button>

                        {!(userAccount.role === 'artist' && userAccount.isLoggedIn) && (
                          <button
                            type="button"
                            onClick={() => handleOpenReviewsModal(activeBook)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-[10px] rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                            id="reader-review-book-btn"
                            title="Rate and write review for book"
                          >
                            <Star className="w-3 h-3 fill-current text-yellow-200" />
                            <span>{language === 'en' ? "Review" : "Tathmini"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Right Column: Traditional Narrative paragraphs & Action Speak Buttons (Span 5) */}
                <div className={`lg:col-span-5 p-5 rounded-3xl border-3 shadow-sm flex flex-col justify-between gap-4 ${
                  theme === 'night'
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white border-orange-100 text-gray-900'
                }`}>
                  
                  {/* Narrative details */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2.5 py-1 rounded-md font-display font-bold uppercase ${
                          theme === 'night'
                            ? 'bg-slate-800 text-amber-200 border border-slate-700'
                            : 'bg-orange-100 text-orange-950'
                        }`}>
                          {language === 'en' ? `Page ${activePage.pageNumber} scene` : `Ukurasa ${activePage.pageNumber} mandhari`}
                        </span>
                        {activePage.artistName && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            theme === 'night'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                              : 'bg-amber-100 text-amber-900 border-amber-200'
                          }`}>
                            🎨 {activePage.artistName}
                          </span>
                        )}
                      </div>

                      {/* Action buttons in header: Read Aloud placed directly next to Bookmark Page */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Auto Play Narrations / Read Aloud Button */}
                        <button
                          type="button"
                          onClick={isAutoPlaying ? stopNarratorAutoPlay : startNarratorAutoPlay}
                          className={`px-3 py-1.5 rounded-xl font-display font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer active:scale-95 border shadow-xs ${
                            isAutoPlaying
                              ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                          }`}
                          id="narrator-autoplay-toggle"
                          title={isAutoPlaying ? TRANSLATIONS[language].stopSpeaking : TRANSLATIONS[language].speakAloud}
                        >
                          {isAutoPlaying ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                              <span>{TRANSLATIONS[language].stopSpeaking}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{TRANSLATIONS[language].speakAloud}</span>
                            </>
                          )}
                        </button>

                        {/* Bookmark Page / Save Progress Button */}
                        <button
                          onClick={() => {
                            const isBookmarked = bookmarks[activeBook.id] === activePageIndex;
                            setBookmarks((prev) => {
                              const next = { ...prev };
                              if (isBookmarked) {
                                delete next[activeBook.id];
                              } else {
                                next[activeBook.id] = activePageIndex;
                              }
                              return next;
                            });
                            playChime(isBookmarked ? 'pop' : 'sparkle');
                            setDbNotification({
                              type: 'success',
                              message: isBookmarked
                                ? TRANSLATIONS[language].bookmarkRemoved
                                : TRANSLATIONS[language].pageBookmarked
                            });
                            setTimeout(() => setDbNotification(null), 3000);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-display font-bold text-[10px] sm:text-xs flex items-center gap-1.5 border transition cursor-pointer active:scale-95 ${
                            bookmarks[activeBook.id] === activePageIndex
                              ? (theme === 'night' ? 'bg-amber-600 border-amber-500 text-white shadow-sm' : 'bg-amber-500 border-amber-600 text-white shadow-sm')
                              : (theme === 'night' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' : 'bg-orange-50/50 border-orange-200 text-amber-955 hover:bg-orange-100/40')
                          }`}
                          title={TRANSLATIONS[language].bookmarkPage}
                          id="bookmark-page-toggle"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${bookmarks[activeBook.id] === activePageIndex ? 'fill-current' : ''}`} />
                          <span>
                            {bookmarks[activeBook.id] === activePageIndex
                              ? (language === 'en' ? 'Bookmarked! 🔖' : 'Imewekewa Alama! 🔖')
                              : TRANSLATIONS[language].bookmarkPage}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    <h2 className={`font-display font-bold text-lg sm:text-xl leading-tight select-text ${
                      theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {activePage.title}
                    </h2>

                    <div className={`text-xs sm:text-sm font-sans leading-relaxed space-y-4 max-h-[220px] overflow-y-auto pr-1 select-text ${
                      theme === 'night' ? 'text-slate-200' : 'text-gray-800'
                    }`}>
                      {activePage.narrative.split("\n\n").map((para, pIdx) => (
                        <p key={pIdx} className="font-medium">{para}</p>
                      ))}
                    </div>
                  </div>

                  {/* Artist Image Download Permission and Family Copyright Q&A Section */}
                  <div className={`mt-2 p-3.5 rounded-2xl border-2 text-left select-none space-y-3 ${
                    theme === 'night'
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-orange-50/50 border-orange-100'
                  }`}>
                    
                    {/* Part A: Dynamic save to phone action */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-display font-bold flex items-center gap-1 ${
                          theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          💾 {language === 'en' ? "Download Artwork" : "Pakua Sanaa"}
                        </span>
                        
                        {/* Interactive dynamic badge based on specific artist's choice */}
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase border ${
                          (activeBook.downloadPermission || 'yes') === 'yes'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : (activeBook.downloadPermission || 'yes') === 'no'
                            ? 'bg-red-100 text-red-850 border-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {(activeBook.downloadPermission || 'yes') === 'yes'
                            ? (language === 'en' ? '🟢 Allowed' : '🟢 Inaruhusiwa')
                            : (activeBook.downloadPermission || 'yes') === 'no'
                            ? (language === 'en' ? '🔴 Restricted' : '🔴 Imezuiwa')
                            : (language === 'en' ? '🟡 Watermark' : '🟡 Nembo')}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const policy = activeBook.downloadPermission || 'yes';
                          if (policy === 'yes') {
                            playChime('sparkle');
                            setDbNotification({
                              type: 'success',
                              message: language === 'en'
                                ? `🎉 Download Success! Successfully saved artwork for "${activePage.title}" to your family gallery.`
                                : `🎉 Imepakuliwa! Picha ya "${activePage.title}" imehifadhiwa kwenye maktaba yako ya familia.`
                            });
                          } else if (policy === 'no') {
                            playChime('wood');
                            setDbNotification({
                              type: 'error',
                              message: language === 'en'
                                ? `🔒 Restricted: Artist "${activeBook.author}" protects their copyright. Downloads are disabled.`
                                : `🔒 Imezuiwa: Msanii "${activeBook.author}" analinda hakimiliki yake. Upakuaji umezuiwa.`
                            });
                          } else if (policy === 'watermark') {
                            playChime('sparkle');
                            setDbNotification({
                              type: 'success',
                              message: language === 'en'
                                ? `🖼️ Stamped & Saved! A copy watermarked with "© PictureBook - ${activeBook.author}" has been downloaded.`
                                : `🖼️ Imewekewa Nembo! Nakala yenye nembo ya "© PictureBook - ${activeBook.author}" imehifadhiwa.`
                            });
                          }
                          setTimeout(() => setDbNotification(null), 5000);
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition border-b-2 active:translate-y-0.5 active:border-b-0 ${
                          (activeBook.downloadPermission || 'yes') === 'no'
                            ? (theme === 'night' ? 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-800 cursor-not-allowed' : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-150 cursor-not-allowed')
                            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-amber-700 shadow-xs'
                        }`}
                        id="download-artwork-action-button"
                      >
                        <span>⬇️</span>
                        {language === 'en' 
                          ? `Save Illustration to Phone` 
                          : `Hifadhi Picha Kwenye Simu`}
                      </button>

                      {/* Report This Book Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReportModal(activeBook)}
                        className={`w-full py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition border shadow-xs mt-1.5 ${
                          theme === 'night'
                            ? 'bg-red-950/50 border-red-800 text-red-200 hover:bg-red-900/60'
                            : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700'
                        }`}
                        id="report-this-book-button"
                      >
                        <span>🚩</span>
                        {language === 'en' ? "Report This Book (Parent Moderation)" : "Ripoti Kitabu Hiki (Usalama wa Mtoto)"}
                      </button>
                    </div>

                    {/* Part B: Interactive Accordion Q&A based on the required feature description */}
                    <div className={`pt-2 border-t border-dashed ${
                      theme === 'night' ? 'border-slate-800' : 'border-orange-200'
                    }`}>
                      <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                        theme === 'night'
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-white border-orange-100'
                      }`}>
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs">❓</span>
                          <span className={`text-[10px] font-display font-extrabold leading-tight ${
                            theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                          }`}>
                            {language === 'en' 
                              ? "Can a child or parent download and save an artist's image to their phone?" 
                              : "Je, mtoto au mzazi anaweza kupakua na kuhifadhi picha ya msanii kwenye simu zao?"}
                          </span>
                        </div>
                        
                        <div className={`p-2 rounded-lg border text-[9px] leading-normal font-medium ${
                          theme === 'night'
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-amber-50/50 border-amber-100 text-amber-900'
                        }`}>
                          <p className={`font-extrabold mb-0.5 uppercase ${
                            theme === 'night' ? 'text-amber-400' : 'text-orange-600'
                          }`}>
                            {language === 'en' ? "✨ Answer: It is decided by each artist" : "✨ Jibu: Inaamuliwa na kila msanii"}
                          </p>
                          <p>
                            {language === 'en'
                              ? "To support original storytellers, we give creators absolute control over their art. Select and see policies dynamically per book!"
                              : "Ili kuwasaidia wasimuliaji wa hadithi asili, tunawapa wabunifu udhibiti kamili wa sanaa zao. Chagua na uone sera kila kitabu!"}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Lower widget: Art educational tip popover */}
              <div className="mt-1">
                <EducationTips tipText={activePage.educationBuddyTip} theme={theme} />
              </div>

            </main>
          )}

          {/* ==================== FOOTER ==================== */}
          <footer className="bg-gradient-to-r from-orange-400 via-orange-500 to-brand-orange text-white py-2.5 px-4 text-xs font-display font-medium select-none border-t-3 border-brand-orange-dark flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
            <p className="tracking-wide text-center sm:text-left">
              ©2026 DigiPicture PictureBook • Safe & Family-Friendly
            </p>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('terms');
                  setShowLegalModal(true);
                  playAppChime('pop');
                }}
                className="hover:underline cursor-pointer opacity-90 hover:opacity-100 transition"
              >
                {language === 'en' ? 'Terms' : 'Vigezo'}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('rights');
                  setShowLegalModal(true);
                  playAppChime('pop');
                }}
                className="hover:underline cursor-pointer opacity-90 hover:opacity-100 transition"
              >
                {language === 'en' ? 'Data Rights' : 'Haki za Data'}
              </button>
            </div>
          </footer>

          {/* ==================== SHARE APP / BOOK MODAL ==================== */}
          {showShareModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-none">
              <div className={`rounded-3xl border-4 p-4 sm:p-5 w-[90vw] sm:w-[70vw] md:w-[45vw] max-w-sm max-h-[80vh] md:max-h-[60vh] flex flex-col shadow-2xl relative animate-scale-up transition-colors duration-300 ${
                theme === 'night'
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-amber-300 text-slate-900'
              }`}>
                
                <button
                  type="button"
                  onClick={() => { setShowShareModal(false); playChime('bubble'); }}
                  className={`absolute top-4 right-4 font-bold font-mono text-base cursor-pointer p-1 transition ${
                    theme === 'night' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>

                <div className="text-center mb-4">
                  <span className="text-4xl">📢</span>
                  <h3 className={`font-display font-bold text-base mt-2 ${
                    theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                  }`}>
                    {shareTarget.type === 'app'
                      ? (language === 'en' ? "Share PictureBook Library!" : "Gawanya PictureBook Library!")
                      : (language === 'en' ? `Share "${shareTarget.book?.title}"` : `Gawanya "${shareTarget.book?.title}"`)}
                  </h3>
                  <p className={`text-[11px] mt-1 font-medium ${
                    theme === 'night' ? 'text-slate-300' : 'text-amber-850'
                  }`}>
                    {language === 'en'
                      ? "Spread the joy of art-integrated picture storybooks with parents, teachers, and friends!"
                      : "Eneza furaha ya vitabu vya picha na sanaa kwa wazazi, walimu, na marafiki!"}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className={`p-3 rounded-2xl border text-xs break-all font-mono text-[11px] flex items-center justify-between gap-2 transition-colors ${
                    theme === 'night'
                      ? 'bg-slate-800 border-slate-700 text-amber-200'
                      : 'bg-amber-50 border-orange-200 text-amber-955'
                  }`}>
                    <span className="truncate">{window.location.href}</span>
                    <button
                      onClick={handleCopyShareLink}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-[10px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{shareCopied ? "Copied! ✨" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-display font-bold">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this picture book app: ${window.location.href}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <span>💬 WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent("Explore interactive picture storybooks on PictureBook!")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <span>🐦 Twitter / X</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <span>📘 Facebook</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <span>📌 Pinterest</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== DIRECT MESSAGE TO ARTIST MODAL ==================== */}
          <SendMessageModal
            isOpen={showDirectMessageModal}
            onClose={() => setShowDirectMessageModal(false)}
            artistName={dmArtistName}
            bookTitle={dmBookTitle}
            theme={theme}
            language={language}
            currentUser={auth?.currentUser}
            userAccount={userAccount}
            userProfile={userProfile}
            onMessageSent={(newDM) => {
              setDirectMessages((prev) => [newDM, ...prev]);
            }}
            playChime={playChime}
            setDbNotification={setDbNotification}
          />

          {/* ==================== REVIEWS AND STAR RATINGS MODAL ==================== */}
          {showReviewsModal && reviewingBook && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-none">
              <div className={`rounded-3xl border-4 p-4 sm:p-5 w-[90vw] sm:w-[75vw] md:w-[50vw] max-w-md max-h-[85vh] md:max-h-[70vh] shadow-2xl relative animate-scale-up overflow-y-auto flex flex-col transition-colors duration-300 ${
                theme === 'night'
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-amber-300 text-slate-900'
              }`}>
                
                <button
                  type="button"
                  onClick={() => { setShowReviewsModal(false); playChime('bubble'); }}
                  className={`absolute top-4 right-4 font-bold font-mono text-base cursor-pointer p-1 transition ${
                    theme === 'night' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>

                <div className="text-center mb-4">
                  <span className="text-4xl">⭐</span>
                  <h3 className={`font-display font-bold text-base mt-2 ${
                    theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                  }`}>
                    {language === 'en' ? `Reviews for "${reviewingBook.title}"` : `Tathmini za "${reviewingBook.title}"`}
                  </h3>
                  <p className={`text-[11px] mt-1 font-medium ${
                    theme === 'night' ? 'text-slate-300' : 'text-amber-850'
                  }`}>
                    {language === 'en' ? `By ${reviewingBook.author}` : `Na ${reviewingBook.author}`}
                  </p>
                </div>

                {/* Submit New Review Form */}
                <form onSubmit={handleSubmitReview} className={`p-3.5 rounded-2xl border space-y-3 mb-4 text-left transition-colors ${
                  theme === 'night'
                    ? 'bg-slate-800/80 border-slate-700 text-slate-100'
                    : 'bg-amber-50/60 border-orange-200 text-slate-900'
                }`}>
                  <h4 className={`font-display font-bold text-xs ${
                    theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                  }`}>
                    {language === 'en' ? "Leave a Star Rating & Review:" : "Toa Nyota na Tathmini:"}
                  </h4>

                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="p-1 cursor-pointer transition transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReviewRating
                              ? 'fill-amber-400 text-amber-500'
                              : (theme === 'night' ? 'text-slate-600 fill-slate-700' : 'text-gray-300 fill-gray-100')
                          }`}
                        />
                      </button>
                    ))}
                    <span className={`text-xs font-display font-bold ml-2 ${
                      theme === 'night' ? 'text-amber-300' : 'text-amber-900'
                    }`}>
                      {newReviewRating} / 5 Stars
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newReviewerName}
                      onChange={(e) => setNewReviewerName(e.target.value)}
                      placeholder="Your name..."
                      className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-400'
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-400'
                      }`}
                    />
                    <select
                      value={newReviewerRole}
                      onChange={(e) => setNewReviewerRole(e.target.value as any)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-900 border border-slate-700 text-slate-100 focus:border-amber-400'
                          : 'bg-white border border-gray-300 text-gray-900 focus:border-amber-400'
                      }`}
                    >
                      <option value="Student" className={theme === 'night' ? 'bg-slate-900 text-slate-100' : ''}>{language === 'en' ? "Student / Child" : "Mwanafunzi"}</option>
                      <option value="Parent" className={theme === 'night' ? 'bg-slate-900 text-slate-100' : ''}>{language === 'en' ? "Parent / Guardian" : "Mzazi"}</option>
                      <option value="Teacher" className={theme === 'night' ? 'bg-slate-900 text-slate-100' : ''}>{language === 'en' ? "Teacher" : "Mwalimu"}</option>
                    </select>
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder={language === 'en' ? "What did you love about this story?" : "Ulipenda nini kuhusu hadithi hii?"}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none font-sans transition-colors ${
                      theme === 'night'
                        ? 'bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-400'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-400'
                    }`}
                  />

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display font-bold text-xs rounded-xl shadow border-b-2 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition"
                  >
                    {language === 'en' ? "Submit Review ✨" : "Wasilisha Tathmini ✨"}
                  </button>
                </form>

                {/* List Past Reviews */}
                <div className="space-y-2 text-left">
                  <h4 className={`font-display font-bold text-xs ${
                    theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                  }`}>
                    {language === 'en' ? "Reader Reviews:" : "Tathmini za Wasomaji:"}
                  </h4>

                  {(bookReviews[reviewingBook.id] || []).length === 0 ? (
                    <p className={`text-xs italic p-3 text-center rounded-xl border transition-colors ${
                      theme === 'night'
                        ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}>
                      {language === 'en' ? "No reviews written yet. Be the first to review!" : "Bado hakuna tathmini zilizowekwa. Kuwa wa kwanza!"}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {(bookReviews[reviewingBook.id] || []).map((rev) => (
                        <div key={rev.id} className={`p-3 rounded-2xl border text-xs space-y-1 transition-colors ${
                          theme === 'night'
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <strong className={`font-display font-bold ${
                              theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                            }`}>
                              {rev.reviewerName} ({rev.reviewerRole})
                            </strong>
                            <div className="flex items-center gap-0.5">
                              {[...Array(rev.rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className={`font-sans italic ${
                            theme === 'night' ? 'text-slate-200' : 'text-gray-700'
                          }`}>"{rev.comment}"</p>
                          <span className={`text-[9px] block font-mono ${
                            theme === 'night' ? 'text-slate-400' : 'text-gray-400'
                          }`}>
                            {new Date(rev.date || rev.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ==================== PARENT REPORT BOOK MODAL ==================== */}
          {showReportModal && reportingBook && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-none">
              <div className={`rounded-3xl border-4 p-4 sm:p-5 w-[90vw] sm:w-[75vw] md:w-[50vw] max-w-md max-h-[85vh] md:max-h-[70vh] shadow-2xl relative animate-scale-up overflow-y-auto flex flex-col transition-colors duration-300 ${
                theme === 'night'
                  ? 'bg-slate-900 border-red-900/80 text-slate-100'
                  : 'bg-white border-red-300 text-slate-900'
              }`}>
                
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); playChime('bubble'); }}
                  className={`absolute top-4 right-4 font-bold font-mono text-base cursor-pointer p-1 transition ${
                    theme === 'night' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  ✕
                </button>

                <div className="text-center mb-4">
                  <span className="text-4xl">🚩</span>
                  <h3 className={`font-display font-bold text-base mt-2 ${
                    theme === 'night' ? 'text-rose-400' : 'text-red-950'
                  }`}>
                    {language === 'en' ? 'Report Inappropriate Content' : 'Ripoti Kitabu Yasiyofaa'}
                  </h3>
                  <p className={`text-[11px] mt-1 font-medium ${
                    theme === 'night' ? 'text-slate-300' : 'text-gray-600'
                  }`}>
                    {language === 'en'
                      ? `Reporting "${reportingBook.title}" by ${reportingBook.author}`
                      : `Kuripoti "${reportingBook.title}" na ${reportingBook.author}`}
                  </p>
                </div>

                <form onSubmit={handleSubmitReport} className="space-y-3.5 text-left">
                  <div className={`p-3 rounded-2xl border text-xs leading-snug font-medium transition-colors ${
                    theme === 'night'
                      ? 'bg-red-950/60 border-red-900/80 text-rose-200'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    ✨ <strong>Automated Protection:</strong> Submitting a report will instantly flag this book and automatically remove it from the public children's shelf pending review!
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[11px] font-display font-bold mb-1 ${
                        theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? "Your Name:" : "Jina Lako:"}
                      </label>
                      <input
                        type="text"
                        required
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                          theme === 'night'
                            ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-red-400'
                            : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-display font-bold mb-1 ${
                        theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? "Role:" : "Wadhifa:"}
                      </label>
                      <select
                        value={reporterRole}
                        onChange={(e) => setReporterRole(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                          theme === 'night'
                            ? 'bg-slate-800 border border-slate-700 text-slate-100 focus:border-red-400'
                            : 'bg-gray-50 border border-gray-300 text-gray-900 focus:border-red-400'
                        }`}
                      >
                        <option value="Parent" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Parent / Guardian" : "Mzazi / Mlezi"}</option>
                        <option value="Teacher" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Teacher / Educator" : "Mwalimu"}</option>
                        <option value="Artist" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Fellow Artist" : "Msanii Mwenzake"}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-display font-bold mb-1 ${
                      theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? "Email for Follow-up:" : "Barua Pepe:"}
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      name="no-autofill-reporter-email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-red-400'
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-display font-bold mb-1 ${
                      theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? "Reason for Reporting:" : "Sababu ya Kuripoti:"}
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 focus:border-red-400'
                          : 'bg-gray-50 border border-gray-300 text-gray-900 focus:border-orange-400'
                      }`}
                    >
                      <option value="Inappropriate Content or Language" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Inappropriate Content or Language" : "Maudhui au Lugha Yasiyofaa"}</option>
                      <option value="Unvetted / Unsafe Artwork" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Unvetted / Unsafe Artwork" : "Picha Zisizo Salama"}</option>
                      <option value="Copyright Violation" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Copyright Violation" : "Ukiukaji wa Hakimiliki"}</option>
                      <option value="Other Safety Issue" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>{language === 'en' ? "Other Safety Concern" : "Wasiwasi Mwingine wa Usalama"}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-display font-bold mb-1 ${
                      theme === 'night' ? 'text-slate-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? "Details / Specific Scene:" : "Maelezo:"}
                    </label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder={language === 'en' ? "Please describe what was seen on which page..." : "Tafadhali eleza kilichoonekana..."}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-red-400'
                          : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400'
                      }`}
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowReportModal(false); playChime('bubble'); }}
                      className={`flex-1 py-2.5 font-display font-semibold text-xs rounded-xl border transition cursor-pointer ${
                        theme === 'night'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                      }`}
                    >
                      {language === 'en' ? "Cancel" : "Ghairi"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-display font-bold text-xs rounded-xl shadow border-b-4 border-red-800 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center justify-center gap-1"
                    >
                      🚩 {language === 'en' ? "Submit & Flag Book" : "Wasilisha na Zuia"}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          )}

          {/* ==================== ARTIST PROFILE DIALOG BOX (BIO, NAME, EMAIL, NUMBER) ==================== */}
          <ArtistProfileModal
            isOpen={showArtistProfileModal && !!profileArtistDetails}
            onClose={() => setShowArtistProfileModal(false)}
            artistName={profileArtistDetails?.name}
            artistUid={profileArtistDetails?.uid}
            artistEmail={profileArtistDetails?.email}
            booksCount={profileArtistDetails?.booksCount}
            onSendMessage={(name) => handleOpenDirectMessageModal(name)}
            theme={theme}
            language={language}
            playChime={playChime}
          />

          {/* ==================== GUIDED ONBOARDING TUTORIAL MODAL ==================== */}
          {showTutorial && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
              <div className={`rounded-3xl w-[92vw] sm:w-[80vw] md:w-[50vw] max-w-lg max-h-[85vh] md:max-h-[70vh] border-4 shadow-2xl overflow-hidden flex flex-col animate-scale-up transition-colors duration-300 ${
                theme === 'night' ? 'bg-slate-900 border-amber-500 text-slate-100' : 'bg-white border-amber-300 text-gray-800'
              }`}>
                
                {/* Audience Context Header (Guest/Student Guide vs Artist Guide based on logged in role) */}
                <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-1.5 select-none ${
                  theme === 'night' ? 'bg-slate-800/90 border-slate-700 text-slate-100' : 'bg-amber-100/80 border-amber-200 text-gray-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-xl font-display font-bold text-xs shadow-2xs flex items-center gap-1.5 ${
                      userAccount.role === 'artist'
                        ? 'bg-orange-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      <span>{userAccount.role === 'artist' ? '👩‍🎨' : '📖'}</span>
                      <span>
                        {userAccount.role === 'artist'
                          ? (language === 'en' ? 'Artist / Creator Guide' : 'Mwongozo wa Msanii')
                          : (language === 'en' ? 'Student / Reader Guide' : 'Mwongozo wa Msomaji')
                        }
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowTutorial(false);
                      try { localStorage.setItem('picturebook_tutorial_completed', 'true'); } catch (e) { console.error(e); }
                      playChime('pop');
                    }}
                    className={`text-xs font-display font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      theme === 'night' ? 'bg-slate-700 hover:bg-slate-600 text-amber-200' : 'bg-black/10 hover:bg-black/20 text-gray-700'
                    }`}
                  >
                    {language === 'en' ? 'Skip Tour ✕' : 'Acha ✕'}
                  </button>
                </div>

                {/* Tutorial Step Header */}
                <div className={`bg-gradient-to-r ${
                  tutorialAudience === 'reader'
                    ? (tutorialStep === 0 ? 'from-amber-400 to-orange-400 text-amber-955' :
                       tutorialStep === 1 ? 'from-orange-400 to-amber-500 text-white' :
                       tutorialStep === 2 ? 'from-amber-500 to-emerald-500 text-white' :
                       tutorialStep === 3 ? 'from-emerald-500 to-teal-500 text-white' :
                       'from-teal-500 to-cyan-500 text-white')
                    : (tutorialStep === 0 ? 'from-orange-500 to-amber-500 text-white' :
                       tutorialStep === 1 ? 'from-amber-500 to-orange-600 text-white' :
                       tutorialStep === 2 ? 'from-orange-600 to-amber-600 text-white' :
                       tutorialStep === 3 ? 'from-amber-600 to-emerald-600 text-white' :
                       'from-emerald-600 to-teal-600 text-white')
                } p-5 relative transition-all duration-300`}>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold px-2.5 py-1 bg-black/20 rounded-full text-white">
                      {language === 'en' ? `Step ${tutorialStep + 1} of 5` : `Hatua ${tutorialStep + 1} ya 5`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                      {tutorialAudience === 'reader' ? (
                        tutorialStep === 0 ? '🎨' : tutorialStep === 1 ? '🧭' : tutorialStep === 2 ? '📖' : tutorialStep === 3 ? '🗿' : '💌'
                      ) : (
                        tutorialStep === 0 ? '👩‍🎨' : tutorialStep === 1 ? '✉️' : tutorialStep === 2 ? '📚' : tutorialStep === 3 ? '🚀' : '📜'
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base sm:text-lg leading-tight">
                        {tutorialAudience === 'reader' ? (
                          tutorialStep === 0 ? (language === 'en' ? 'Welcome to PictureBook Studio! 🎨' : 'Karibu PictureBook Studio! 🎨') :
                          tutorialStep === 1 ? (language === 'en' ? 'Navigating the Header & Toolbar 🧭' : 'Kuelekeza Sehemu za App 🧭') :
                          tutorialStep === 2 ? (language === 'en' ? 'Reading Storybooks & Page Controls 📖' : 'Kusoma Vitabu na Kurasa 📖') :
                          tutorialStep === 3 ? (language === 'en' ? 'Interactive 3D Art & Painting Viewers 🗿' : 'Sanaa za 3D Udongo na Uchoraji 🗿') :
                          (language === 'en' ? 'Artist Profiles, Messages & Reviews 💌' : 'Wasifu wa Msanii na Maoni 💌')
                        ) : (
                          tutorialStep === 0 ? (language === 'en' ? 'Welcome to the Artist Workbench! 👩‍🎨' : 'Karibu Studio ya Msanii! 👩‍🎨') :
                          tutorialStep === 1 ? (language === 'en' ? 'Artist Registration & Instant Studio Entry 🎨' : 'Usajili wa Msanii na Kuangazia Studio 🎨') :
                          tutorialStep === 2 ? (language === 'en' ? 'Drafting Storybooks & Adding Pages 📚' : 'Kuandika Vitabu na Kurasa 📚') :
                          tutorialStep === 3 ? (language === 'en' ? 'Publishing Books Live to Readers 🚀' : 'Kuchapisha Vitabu Mtandaoni 🚀') :
                          (language === 'en' ? 'Artist Bio, Direct Inbox & Subscribers 📜' : 'Wasifu wa Msanii na Ujumbe 📜')
                        )}
                      </h3>
                      <p className="text-xs opacity-95 font-medium mt-0.5">
                        {tutorialAudience === 'reader' ? (
                          tutorialStep === 0 ? (language === 'en' ? 'Explore interactive children storybooks & fine art mediums' : 'Gundua vitabu vya picha vya watoto na sanaa') :
                          tutorialStep === 1 ? (language === 'en' ? 'Search stories, switch languages, theme & sound controls' : 'Tafuta vitabu, badili lugha, mada na sauti') :
                          tutorialStep === 2 ? (language === 'en' ? 'Turn pages, listen to audio narration & save bookmarks' : 'Geuza kurasa, sikiliza sauti na hifadhi kurasa') :
                          tutorialStep === 3 ? (language === 'en' ? 'Rotate 3D clay sculptures, canvas painter & crafts' : 'Zungusha vinyago vya 3D udongo na kuchora') :
                          (language === 'en' ? 'View artist bios, send direct notes & leave star ratings' : 'Angalia wasifu wa msanii, tuma ujumbe na utoe nyota')
                        ) : (
                          tutorialStep === 0 ? (language === 'en' ? 'Your personal workbench to create and manage picture books' : 'Studio yako ya kuunda na kuhariri vitabu vya picha') :
                          tutorialStep === 1 ? (language === 'en' ? 'Sign up as an artist with your first name and last name' : 'Sajili akaunti ya msanii kwa majina yako') :
                          tutorialStep === 2 ? (language === 'en' ? 'Write story text in 2 languages and upload illustrations' : 'Andika maelezo kwa lugha 2 na uweke picha') :
                          tutorialStep === 3 ? (language === 'en' ? 'Publish completed stories live to the library shelf' : 'Chapisha vitabu vyako viandikwe kwenye maktaba') :
                          (language === 'en' ? 'Update your artist bio, check inbox & view subscribers' : 'Hariri wasifu wako, angalia jumbe na wasomaji')
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step Body Content */}
                <div className="p-5 space-y-3.5 max-h-[55vh] overflow-y-auto">
                  <p className={`text-xs font-sans leading-relaxed ${
                    theme === 'night' ? 'text-slate-200' : 'text-gray-700'
                  }`}>
                    {tutorialAudience === 'reader' ? (
                      tutorialStep === 0 ? (language === 'en'
                        ? "Browse and enjoy interactive children's picture books as a Guest Explorer! You can read stories, listen to audio narrations, and play with 3D art without any sign-in."
                        : "Soma na ufurahie vitabu vya picha vya watoto kama Mgeni! Unaweza kusoma, kusikiliza sauti na kucheza na vinyago vya 3D bila haja ya kuingia.") :
                      tutorialStep === 1 ? (language === 'en'
                        ? "Use the top header navigation toolbar! Click 'Search' to filter books by title or medium (Clay, Painting, Craft, Animation), toggle 🇬🇧/🇰🇪 language, change 🔊 sound or 🌙 theme, or click 'Tour' 💡 anytime to re-open this guide."
                        : "Tumia zana zilizo juu ya skrini! Bofya 'Tafuta' kuchuja vitabu, badili lugha kati ya Kiingereza na Kiswahili, washa au zima sauti, au bofya 'Mwongozo' 💡 kurudia ziara hii.") :
                      tutorialStep === 2 ? (language === 'en'
                        ? "Click any picture book on the shelf to enter the flipbook reader! Click 'Next Page' or 'Previous Page' to read, click 'Auto Play' for clear sentence audio narration, or click 'Bookmark' 🔖 to save your page."
                        : "Bofya kitabu chochote kufungua msomaji! Bofya 'Kurasa Inayofuata' kusoma, washa 'Cheza Sauti' kusikiliza maelezo, au hifadhi kurasa unayopenda.") :
                      tutorialStep === 3 ? (language === 'en'
                        ? "On the left side of the story reader, interact with fine art mediums! Click and drag your mouse or touch screen to spin real 3D clay sculptures 360°, examine papercraft collages, or paint on the canvas."
                        : "Kwenye upande wa kushoto wa kitabu, zungusha vinyago vya 3D vya udongo kwa mkono wako, tazama sanaa za karatasi na origami, au chora kwenye turubai.") :
                        (language === 'en'
                          ? "Click the author's name on any storybook or click 'Artist Profile' to view their bio, email address, and contact number. You can also click 'Send Message' to message the author, or leave a 5-star review!"
                          : "Bofya jina la msanii au 'Wasifu' kuona maelezo yake, barua pepe na nambari ya simu. Pia unaweza kumtumia ujumbe wa moja kwa moja au kutoa tathmini ya nyota!")
                    ) : (
                      tutorialStep === 0 ? (language === 'en'
                        ? "Switch to Artist Mode from the top toolbar anytime! You get a private Artist Workbench where you can write storybooks, organize your drafts, and showcase your profile."
                        : "Badili hadi Hali ya Msanii kutoka juu wakati wowote! Unapata studio yako mwenyewe kuandika vitabu, kupanga rasimu na kuonyesha kazi zako.") :
                      tutorialStep === 1 ? (language === 'en'
                        ? "To register an artist account, enter your First Name, Last Name, Email, and Password. Your account is activated immediately so you can start creating storybooks right away!"
                        : "Kusajili akaunti ya msanii, ingiza Jina la Kwanza, Jina la Mwisho, Barua Pepe na Nenosiri. Akaunti yako inawashwa mara moja ili uanze kuunda vitabu!") :
                      tutorialStep === 2 ? (language === 'en'
                        ? "Inside your Artist Workbench, click 'Create New Book'! Add titles, cover artwork, and story pages with English and Kiswahili sentences. Tag your art as Clay Sculpture 🗿, Watercolor 🎨, Craft ✂️, or Animation 🎬."
                        : "Ndani ya Studio ya Msanii, bofya 'Unda Kitabu Kipya'! Weka kichwa cha habari, picha ya jalada, na kurasa za hadithi kwa Kiswahili na Kiingereza.") :
                      tutorialStep === 3 ? (language === 'en'
                        ? "When your storybook draft is complete, click 'Publish Book'! Your storybook will appear live on the library shelf for students and children around the world to read and enjoy."
                        : "Wakati rasimu yako imekamilika, bofya 'Chapisha Kitabu'! Kitabu chako kitaonekana kwenye maktaba ili watoto na wanafunzi wasome.") :
                        (language === 'en'
                          ? "Manage your artist profile bio right from your dashboard banner! You can also check your 'Inbox' for direct notes from parents/students and see your student subscribers."
                          : "Hariri wasifu wako wa msanii kutoka kwenye bango lako! Pia unaweza kuangalia Meseji za wanafunzi na wazazi zilizotumwa kwako.")
                    )}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {tutorialAudience === 'reader' ? (
                      tutorialStep === 0 ? (
                        <>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🐣</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950">{language === 'en' ? 'Guest Explorer' : 'Anza Kama Mgeni'}</h4>
                              <p className="text-[11px] text-amber-800">{language === 'en' ? 'Instant access to all books' : 'Soma vitabu vyote bila kujiandikisha'}</p>
                            </div>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🗣️</span>
                            <div>
                              <h4 className="text-xs font-bold text-orange-950">{language === 'en' ? 'Voice Narration' : 'Usomaji wa Sauti'}</h4>
                              <p className="text-[11px] text-orange-800">{language === 'en' ? 'Listen in English & Kiswahili' : 'Sikiliza sauti kwa lugha 2'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 1 ? (
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🔎</span>
                            <div>
                              <h4 className="text-xs font-bold text-blue-950">{language === 'en' ? 'Search & Medium Filters' : 'Tafuta Vitabu'}</h4>
                              <p className="text-[11px] text-blue-800">{language === 'en' ? 'Filter by Clay, Painting or Craft' : 'Chuja kwa Aina ya Sanaa'}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🌍</span>
                            <div>
                              <h4 className="text-xs font-bold text-purple-950">{language === 'en' ? 'Language & Theme' : 'Lugha na Mada'}</h4>
                              <p className="text-[11px] text-purple-800">{language === 'en' ? 'Switch 🇬🇧/🇰🇪 or 🌙 Night Mode' : 'Badili lugha na Hali ya Usiku'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 2 ? (
                        <>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">📖</span>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950">{language === 'en' ? 'Page Controls' : 'Geuza Kurasa'}</h4>
                              <p className="text-[11px] text-emerald-800">{language === 'en' ? 'Flip pages, adjust text size (A+)' : 'Geuza kurasa na unyooshe maandishi'}</p>
                            </div>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🔖</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950">{language === 'en' ? 'Bookmarks' : 'Hifadhi Kurasa'}</h4>
                              <p className="text-[11px] text-amber-800">{language === 'en' ? 'Save progress to resume anytime' : 'Hifadhi pale ulipoachia'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 3 ? (
                        <>
                          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🗿</span>
                            <div>
                              <h4 className="text-xs font-bold text-teal-950">{language === 'en' ? '3D Clay Rotation' : 'Zungusha Vinyago'}</h4>
                              <p className="text-[11px] text-teal-800">{language === 'en' ? 'Spin sculptures 360 degrees' : 'Zungusha sanaa za udongo'}</p>
                            </div>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🎨</span>
                            <div>
                              <h4 className="text-xs font-bold text-orange-950">{language === 'en' ? 'Canvas & Crafts' : 'Uchoraji na Karatasi'}</h4>
                              <p className="text-[11px] text-orange-800">{language === 'en' ? 'Draw pictures & inspect collages' : 'Chora na utazame origami'}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">👤</span>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950">{language === 'en' ? 'Artist Profile Box' : 'Wasifu wa Msanii'}</h4>
                              <p className="text-[11px] text-emerald-800">{language === 'en' ? 'View Bio, Email & Phone Number' : 'Angalia Wasifu, Baruapepe na Simu'}</p>
                            </div>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">✉️</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950">{language === 'en' ? 'Notes & Ratings' : 'Tuma Ujumbe'}</h4>
                              <p className="text-[11px] text-amber-800">{language === 'en' ? 'Send direct message or 5-star review' : 'Tuma ujumbe au toa tathmini'}</p>
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      tutorialStep === 0 ? (
                        <>
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">👩‍🎨</span>
                            <div>
                              <h4 className="text-xs font-bold text-orange-950">{language === 'en' ? 'Artist Mode' : 'Hali ya Msanii'}</h4>
                              <p className="text-[11px] text-orange-800">{language === 'en' ? 'Access your private story workbench' : 'Pata studio yako ya vitabu'}</p>
                            </div>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🔒</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950">{language === 'en' ? 'Protected Work' : 'Kazi Salama'}</h4>
                              <p className="text-[11px] text-amber-800">{language === 'en' ? 'Only you can edit your storybooks' : 'Ni wewe tu unaweza kuhariri'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 1 ? (
                        <>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">📝</span>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950">{language === 'en' ? 'Sign Up Form' : 'Fomu ya Usajili'}</h4>
                              <p className="text-[11px] text-emerald-800">{language === 'en' ? 'First Name, Last Name & Email' : 'Jina la Kwanza, Mwisho na Barua Pepe'}</p>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🚀</span>
                            <div>
                              <h4 className="text-xs font-bold text-blue-950">{language === 'en' ? 'Instant Activation' : 'Uamsho wa Moja kwa Moja'}</h4>
                              <p className="text-[11px] text-blue-800">{language === 'en' ? 'Start creating books immediately' : 'Anza kuunda vitabu mara moja'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 2 ? (
                        <>
                          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">📚</span>
                            <div>
                              <h4 className="text-xs font-bold text-teal-950">{language === 'en' ? 'Drafting Engine' : 'Kuandika Hadithi'}</h4>
                              <p className="text-[11px] text-teal-800">{language === 'en' ? 'Add pages, text & illustrations' : 'Weka kurasa, maandishi na picha'}</p>
                            </div>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🎨</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950">{language === 'en' ? 'Art Mediums' : 'Aina za Sanaa'}</h4>
                              <p className="text-[11px] text-amber-800">{language === 'en' ? 'Tag Clay 🗿, Painting 🎨 or Craft ✂️' : 'Weka lebo ya aina ya sanaa'}</p>
                            </div>
                          </div>
                        </>
                      ) : tutorialStep === 3 ? (
                        <>
                          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">🚀</span>
                            <div>
                              <h4 className="text-xs font-bold text-cyan-950">{language === 'en' ? 'Publish Live' : 'Chapisha Mtandaoni'}</h4>
                              <p className="text-[11px] text-cyan-800">{language === 'en' ? 'Showcase stories on library shelf' : 'Onyesha vitabu kwenye maktaba'}</p>
                            </div>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">✏️</span>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950">{language === 'en' ? 'Edit & Update' : 'Hariri Wakati Wowote'}</h4>
                              <p className="text-[11px] text-emerald-800">{language === 'en' ? 'Update text or cover image anytime' : 'Hariri au ongeza kurasa mpya'}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">📜</span>
                            <div>
                              <h4 className="text-xs font-bold text-orange-950">{language === 'en' ? 'Artist Bio' : 'Wasifu wa Msanii'}</h4>
                              <p className="text-[11px] text-orange-800">{language === 'en' ? 'Edit bio displayed to readers' : 'Hariri wasifu wako wa msanii'}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-2.5 flex items-start gap-2">
                            <span className="text-lg">📬</span>
                            <div>
                              <h4 className="text-xs font-bold text-purple-950">{language === 'en' ? 'Direct Messages' : 'Sanduku la Ujumbe'}</h4>
                              <p className="text-[11px] text-purple-800">{language === 'en' ? 'Receive student notes & feedback' : 'Soma meseji za wanafunzi na wazazi'}</p>
                            </div>
                          </div>
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Step Indicators & Navigation Footer */}
                <div className={`p-4 border-t flex items-center justify-between gap-2 ${
                  theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'
                }`}>
                  
                  {/* Step dots */}
                  <div className="flex items-center gap-1.5 pl-2">
                    {[0, 1, 2, 3, 4].map((stepIdx) => (
                      <button
                        key={stepIdx}
                        onClick={() => { setTutorialStep(stepIdx); playChime('pop'); }}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${
                          tutorialStep === stepIdx
                            ? 'w-6 bg-orange-500'
                            : (theme === 'night' ? 'w-2.5 bg-slate-700 hover:bg-slate-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400')
                        }`}
                        title={`Go to step ${stepIdx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    {tutorialStep > 0 && (
                      <button
                        onClick={() => { setTutorialStep(prev => prev - 1); playChime('pop'); }}
                        className={`px-4 py-2 font-display font-bold text-xs rounded-xl transition cursor-pointer ${
                          theme === 'night' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {language === 'en' ? 'Back' : 'Nyuma'}
                      </button>
                    )}

                    {tutorialStep < 4 ? (
                      <button
                        onClick={() => { setTutorialStep(prev => prev + 1); playChime('bubble'); }}
                        className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold text-xs rounded-xl shadow border-b-2 border-orange-700 active:translate-y-0.5 active:border-b-0 transition cursor-pointer flex items-center gap-1"
                      >
                        {language === 'en' ? 'Next Step →' : 'Hatua Inayofuata →'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowTutorial(false);
                          try { localStorage.setItem('picturebook_tutorial_completed', 'true'); } catch (e) { console.error(e); }
                          playChime('sparkle');
                        }}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-display font-bold text-xs rounded-xl shadow border-b-2 border-teal-700 active:translate-y-0.5 active:border-b-0 transition cursor-pointer flex items-center gap-1"
                      >
                        {language === 'en' ? 'Start Exploring! 🚀' : 'Anza Kutumia! 🚀'}
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================== DIGITAL STAMP REWARD CELEBRATION MODAL ==================== */}
      {showRewardModal && recentReward && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white border-4 border-amber-400 rounded-3xl w-[90vw] sm:w-[75vw] md:w-[50vw] max-w-md max-h-[85vh] md:max-h-[70vh] p-4 sm:p-5 text-center shadow-2xl relative overflow-y-auto flex flex-col">
            {/* Background Glow */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-300/40 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-orange-400/40 rounded-full blur-2xl pointer-events-none" />

            {/* Confetti Header Badges */}
            <div className="flex justify-center mb-3">
              <span className="text-4xl animate-bounce">🎉</span>
              <span className="text-5xl -mx-2 animate-pulse">🏆</span>
              <span className="text-4xl animate-bounce">✨</span>
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 flex items-center justify-center gap-1 mx-auto">
              <Lock className="w-3 h-3" />
              <span>{language === 'en' ? 'Private Stamp Unlocked!' : 'Muhuri Binafsi Umefunguliwa!'}</span>
            </span>

            <h2 className="font-display font-black text-xl sm:text-2xl text-amber-955 mt-2">
              {language === 'en' ? 'CONGRATULATIONS!' : 'HONGERA SANA!'}
            </h2>

            <p className="text-xs text-amber-900 font-medium mt-1">
              {language === 'en'
                ? `You collected a new scene stamp for "${recentReward.bookTitle}"! It is saved to your private passport.`
                : `Umepata muhuri mpya wa mandhari kwa "${recentReward.bookTitle}"! Umehifadhiwa kwenye pasipoti yako binafsi.`}
            </p>

            {/* High-contrast Digital Stamp Seal Card */}
            <div className="my-5 p-5 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 rounded-3xl border-3 border-amber-400 shadow-md relative flex flex-col items-center justify-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-4 border-white shadow-lg flex items-center justify-center text-4xl animate-pulse">
                {recentReward.stampIcon}
              </div>

              <div className="text-center">
                <span className="text-[9px] font-mono font-bold text-amber-800 uppercase tracking-widest">
                  ★ PICTUREBOOK SEAL OF DISCOVERY ★
                </span>
                <h3 className="font-display font-bold text-base text-amber-955 mt-0.5">
                  {recentReward.stampTitle}
                </h3>
                <p className="text-[11px] font-bold text-orange-850 mt-0.5">
                  {recentReward.bookTitle}
                </p>
                <p className="text-[9px] text-amber-900 italic mt-0.5">
                  {language === 'en' ? `By ${recentReward.author}` : `Kazi ya ${recentReward.author}`}
                </p>
              </div>

              <div className="mt-1 px-3 py-0.5 bg-amber-400 text-amber-950 font-extrabold text-[9px] rounded-full uppercase border border-amber-500/60 shadow-2xs">
                {language === 'en' ? `Earned: ${recentReward.unlockedAt}` : `Imepatikana: ${recentReward.unlockedAt}`}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowRewardModal(false);
                  setShowBadgesPassportModal(true);
                  playAppChime('sparkle');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-display font-bold text-xs rounded-2xl shadow-md border-b-3 border-amber-700 active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎖️</span>
                <span>{language === 'en' ? 'View Stamp Passport' : 'Angalia Pasi ya Mahuri'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRewardModal(false);
                  playAppChime('pop');
                }}
                className="w-full py-3 px-4 bg-orange-100 hover:bg-orange-200 text-amber-955 font-display font-bold text-xs rounded-2xl border border-orange-300 transition cursor-pointer"
              >
                {language === 'en' ? 'Continue Exploring 🚀' : 'Endelea Kusoma 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DIGITAL STAMPS & BADGES PASSPORT MODAL ==================== */}
      {showBadgesPassportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in">
          <div className={`rounded-3xl w-[94vw] sm:w-[85vw] md:w-[65vw] max-w-2xl max-h-[88vh] md:max-h-[75vh] p-4 sm:p-6 border-4 shadow-2xl relative flex flex-col overflow-y-auto transition-colors duration-300 ${
            theme === 'night' ? 'bg-slate-900 border-amber-500 text-slate-100' : 'bg-white border-amber-300 text-gray-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
              theme === 'night' ? 'border-slate-800' : 'border-orange-150'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-955 flex items-center justify-center text-2xl font-bold shadow-xs border border-amber-500/40">
                  🎖️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`font-display font-bold text-base sm:text-lg leading-tight ${
                      theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'My Digital Stamps & Badges Passport' : 'Pasipoti Yangu ya Mahuri na Beji'}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{language === 'en' ? 'Private' : 'Binafsi'}</span>
                    </span>
                  </div>
                  <p className={`text-[11px] ${
                    theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                  }`}>
                    {language === 'en'
                      ? `Exclusive to ${userAccount.name || 'Reader'} • Stamps and badges are private and visible only to you.`
                      : `Binafsi ya ${userAccount.name || 'Msomaji'} • Mahuri na beji zinaonekana na wewe pekee.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowBadgesPassportModal(false); playAppChime('pop'); }}
                className={`p-2 rounded-full transition cursor-pointer ${
                  theme === 'night' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-orange-100 text-amber-950 hover:bg-orange-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passport Statistics Banner */}
            <div className={`rounded-2xl p-3.5 border flex flex-col sm:flex-row items-center justify-between gap-3 mb-3.5 ${
              theme === 'night'
                ? 'bg-gradient-to-r from-slate-800 via-amber-950/40 to-slate-800 border-amber-500/40 text-slate-100'
                : 'bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-amber-250'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className={`text-xs font-bold ${
                    theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                  }`}>
                    {language === 'en' ? 'Collector Level' : 'Kiwango cha Mkusanyaji'}: {Object.keys(userBadges).length > 1 || Object.keys(userStamps).length >= 5 ? (language === 'en' ? 'Master Explorer 🌟' : 'Mtafiti Mkuu 🌟') : Object.keys(userStamps).length > 0 ? (language === 'en' ? 'Art Collector 🎨' : 'Mkusanyaji wa Sanaa 🎨') : (language === 'en' ? 'Beginner Reader 🌱' : 'Msomaji Mpya 🌱')}
                  </div>
                  <p className={`text-[10px] ${
                    theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                  }`}>
                    {Object.keys(userStamps).length} {language === 'en' ? 'Scene Stamps Collected' : 'Mahuri ya Kurasa'} • {Object.keys(userBadges).length} {language === 'en' ? 'Milestone Badges Earned' : 'Beji za Ushindi'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-amber-955 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-500/50 shadow-xs">
                  {Object.keys(userStamps).length} {language === 'en' ? 'Stamps Total' : 'Jumla ya Mahuri'}
                </span>
              </div>
            </div>

            {/* Passport Tabs: Stamps vs Badges */}
            <div className="flex items-center gap-2 mb-3 select-none">
              <button
                type="button"
                onClick={() => { setPassportActiveTab('stamps'); playAppChime('pop'); }}
                className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  passportActiveTab === 'stamps'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : (theme === 'night' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-orange-100/70 text-amber-900 hover:bg-orange-200/60')
                }`}
              >
                <span>🏷️</span>
                <span>{language === 'en' ? 'Collected Scene Stamps' : 'Mahuri ya Kurasa'}</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full">
                  {Object.keys(userStamps).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setPassportActiveTab('badges'); playAppChime('pop'); }}
                className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  passportActiveTab === 'badges'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : (theme === 'night' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-orange-100/70 text-amber-900 hover:bg-orange-200/60')
                }`}
              >
                <span>🎖️</span>
                <span>{language === 'en' ? 'Earned Achievement Badges' : 'Beji za Ushindi'}</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full">
                  {Object.keys(userBadges).length}
                </span>
              </button>
            </div>

            {/* Tab 1: Collected Scene Stamps */}
            {passportActiveTab === 'stamps' && (
              <div className="flex-1 overflow-y-auto pr-1">
                {Object.keys(userStamps).length === 0 ? (
                  <div className={`p-8 text-center rounded-3xl border-2 border-dashed select-none flex flex-col items-center justify-center my-2 ${
                    theme === 'night'
                      ? 'bg-slate-800/60 border-amber-500/40 text-slate-200'
                      : 'bg-amber-50/50 border-amber-200 text-amber-955'
                  }`}>
                    <span className="text-5xl mb-3 animate-bounce">🏷️</span>
                    <h4 className={`font-display font-bold text-sm ${
                      theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'No Scene Stamps Collected Yet!' : 'Hujaweka Mahuri Bado!'}
                    </h4>
                    <p className={`text-xs mt-1 max-w-sm leading-relaxed ${
                      theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                    }`}>
                      {language === 'en'
                        ? 'Open any picture book and tap the "Stamp Scene & Collect Badge" button on any page to collect stamps in your private passport!'
                        : 'Fungua kitabu chochote cha picha na ubonyeze kitufe cha "Piga Muhuri & Kusanya Beji" kwenye ukurasa wowote ili kukusanya mahuri yako binafsi!'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(userStamps).map((stamp) => (
                      <div
                        key={stamp.id}
                        className={`p-3.5 rounded-2xl border-2 shadow-xs flex items-center gap-3 transition hover:shadow-md ${
                          theme === 'night'
                            ? 'bg-slate-800 border-amber-500/40 text-slate-100'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50/80 border-amber-350 text-amber-955'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl border-2 border-amber-500 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-955 shadow-xs">
                          {stamp.stampIcon}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <h4 className={`font-display font-bold text-xs truncate ${
                            theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                          }`}>
                            {stamp.stampTitle}
                          </h4>
                          <p className={`text-[10px] truncate ${
                            theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                          }`}>
                            {stamp.bookTitle} (p. {stamp.pageNumber})
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-md border border-emerald-300 flex items-center gap-0.5">
                              <span>✓</span>
                              <span>{language === 'en' ? 'Stamped' : 'Imepigwa'}</span>
                            </span>
                            <span className={`text-[9px] font-mono ${
                              theme === 'night' ? 'text-amber-300' : 'text-amber-900'
                            }`}>
                              {stamp.stampedAt}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Earned Achievement Badges */}
            {passportActiveTab === 'badges' && (
              <div className="flex-1 overflow-y-auto pr-1">
                {Object.keys(userBadges).length === 0 ? (
                  <div className={`p-8 text-center rounded-3xl border-2 border-dashed select-none flex flex-col items-center justify-center my-2 ${
                    theme === 'night'
                      ? 'bg-slate-800/60 border-amber-500/40 text-slate-200'
                      : 'bg-amber-50/50 border-amber-200 text-amber-955'
                  }`}>
                    <span className="text-5xl mb-3 animate-bounce">🎖️</span>
                    <h4 className={`font-display font-bold text-sm ${
                      theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'No Badges Earned Yet!' : 'Hujapata Beji Bado!'}
                    </h4>
                    <p className={`text-xs mt-1 max-w-sm leading-relaxed ${
                      theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                    }`}>
                      {language === 'en'
                        ? 'Stamp scenes, complete entire picture books, and collect stamps to unlock special achievement badges!'
                        : 'Piga mahuri ya kurasa, maliza vitabu vyote vya hadithi ili ufungue beji za kipekee za ushindi!'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(userBadges).map((badge) => (
                      <div
                        key={badge.id}
                        className={`p-3.5 rounded-2xl border-2 shadow-xs flex items-center gap-3 transition hover:shadow-md ${
                          theme === 'night'
                            ? 'bg-slate-800 border-amber-500/40 text-slate-100'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50/80 border-amber-350 text-amber-955'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl border-2 border-amber-500 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-955 shadow-xs animate-pulse">
                          {badge.badgeIcon}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <h4 className={`font-display font-bold text-xs truncate ${
                            theme === 'night' ? 'text-amber-200' : 'text-amber-955'
                          }`}>
                            {badge.badgeTitle}
                          </h4>
                          <p className={`text-[10px] leading-tight mt-0.5 line-clamp-2 ${
                            theme === 'night' ? 'text-slate-300' : 'text-amber-900'
                          }`}>
                            {badge.description}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.2 rounded-md border border-amber-300 flex items-center gap-0.5">
                              <span>🏆</span>
                              <span>{language === 'en' ? 'Unlocked' : 'Imefunguliwa'}</span>
                            </span>
                            <span className={`text-[9px] font-mono ${
                              theme === 'night' ? 'text-amber-300' : 'text-amber-900'
                            }`}>
                              {badge.unlockedAt}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
              theme === 'night' ? 'border-slate-800' : 'border-orange-100'
            }`}>
              <span className={`text-[11px] font-medium flex items-center gap-1 ${
                theme === 'night' ? 'text-amber-200' : 'text-amber-900'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'en' ? 'Your stamps are unique and stored privately.' : 'Mahuri yako ni ya kipekee na yamehifadhiwa kwa usiri.'}</span>
              </span>

              <button
                type="button"
                onClick={() => { setShowBadgesPassportModal(false); playAppChime('pop'); }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold rounded-xl transition cursor-pointer"
              >
                {language === 'en' ? 'Close Passport' : 'Funga Pasi'}
              </button>
            </div>

          </div>
        </div>
      )}

      <LegalComplianceModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        language={language}
        defaultTab={legalModalTab}
        theme={theme}
      />

      <OTAUpdateNotification language={language} />

    </div>
  );
}
